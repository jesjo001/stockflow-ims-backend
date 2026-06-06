import { Affiliate } from '../models/Affiliate.model';
import { AffiliateCommission } from '../models/AffiliateCommission.model';
import { AffiliatePayout } from '../models/AffiliatePayout.model';
import { PlatformSetting } from '../models/PlatformSetting.model';
import { Payment } from '../models/Payment.model';
import { Tenant } from '../models/Tenant.model';
import { User } from '../models/User.model';
import { emailService } from '../utils/email';
import { generatePasswordResetToken, getPasswordResetExpiry } from '../utils/passwordReset';
import { startTransactionSession } from '../utils/mongoTransaction';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';

export class AffiliateService {
  /**
   * Get or create platform default affiliate percentage
   */
  static async getDefaultAffiliatePercentage(): Promise<number> {
    let settings = await PlatformSetting.findOne({ key: 'global' });
    if (!settings) {
      settings = await PlatformSetting.create({ key: 'global', defaultAffiliatePercentage: 10 });
    }
    return settings.defaultAffiliatePercentage;
  }

  /**
   * Set default affiliate percentage (super admin only)
   */
  static async setDefaultAffiliatePercentage(percentage: number): Promise<number> {
    if (percentage < 0 || percentage > 100) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Percentage must be between 0 and 100');
    }
    let settings = await PlatformSetting.findOne({ key: 'global' });
    if (!settings) {
      settings = await PlatformSetting.create({ key: 'global', defaultAffiliatePercentage: percentage });
    } else {
      settings.defaultAffiliatePercentage = percentage;
      await settings.save();
    }
    return settings.defaultAffiliatePercentage;
  }

  /**
   * Create affiliate account
   */
  static async createAffiliate(data: {
    name: string;
    email: string;
    commissionPercentage: number;
  }, createdBy: string, session?: any): Promise<any> {
    // Validate commission percentage
    if (data.commissionPercentage < 0 || data.commissionPercentage > 100) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Commission percentage must be between 0 and 100');
    }

    // Generate unique code from name
    const baseCode = data.name
      .toUpperCase()
      .replace(/\s+/g, '')
      .substring(0, 20);
    let code = baseCode;
    let counter = 1;
    const maxAttempts = 100;
    
    while (counter <= maxAttempts && await Affiliate.findOne({ code }).session(session)) {
      code = `${baseCode}${counter}`;
      counter++;
    }

    if (counter > maxAttempts) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to generate unique affiliate code');
    }

    const affiliate = await Affiliate.create([{
      name: data.name,
      email: data.email,
      code,
      commissionPercentage: data.commissionPercentage,
      createdBy,
    }], session ? { session } : {}).then(res => res[0]);

    return affiliate;
  }

  /**
   * Get all affiliates
   */
  static async getAllAffiliates(query: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 50 } = query;
    return Affiliate.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  /**
   * Get affiliate by ID with dashboard stats
   */
  static async getAffiliateDashboard(affiliateId: string): Promise<any> {
    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Affiliate not found');
    }

    // Get commission stats using aggregation
    const allCommissions = await AffiliateCommission.find({ affiliateId }).lean();
    
    const paidEarnings = allCommissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0);
      
    const pendingEarnings = allCommissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    // Get recent referrals
    const referrals = await Tenant.find({ referredByAffiliate: affiliateId })
      .select('name email createdAt superAdminId isActive billingPlan')
      .populate('superAdminId', 'lastLogin')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get recent commissions
    const recentCommissions = await AffiliateCommission.find({ affiliateId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('tenantId', 'name')
      .lean();

    // Get recent payouts
    const recentPayouts = await AffiliatePayout.find({ affiliateId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      affiliate: affiliate.toJSON(),
      stats: {
        totalEarnings: affiliate.totalEarnings,
        paidEarnings: affiliate.totalPaid, // Actual amount paid out
        availableBalance: affiliate.totalEarnings - affiliate.totalPaid,
        pendingEarnings, // Commissions not yet approved/processed
        totalReferrals: affiliate.totalReferrals,
        totalCommissions: allCommissions.length,
      },
      recentReferrals: referrals,
      commissions: recentCommissions,
      recentPayouts,
    };
  }

  /**
   * Update affiliate bank details
   */
  static async updateBankDetails(affiliateId: string, details: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  }) {
    const affiliate = await Affiliate.findByIdAndUpdate(
      affiliateId,
      {
        bankName: details.bankName,
        accountName: details.accountName,
        accountNumber: details.accountNumber,
      },
      { new: true }
    );

    if (!affiliate) throw new ApiError(StatusCodes.NOT_FOUND, 'Affiliate not found');
    return affiliate;
  }

  /**
   * Request a payout
   */
  static async requestPayout(affiliateId: string, amount: number) {
    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate) throw new ApiError(StatusCodes.NOT_FOUND, 'Affiliate not found');

    const availableBalance = affiliate.totalEarnings - affiliate.totalPaid;
    if (amount > availableBalance) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Insufficient balance. Available: ${availableBalance}`);
    }

    if (!affiliate.bankName || !affiliate.accountNumber) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Please set your bank details before requesting a payout');
    }

    // Check for pending payouts
    const pendingPayout = await AffiliatePayout.findOne({ affiliateId, status: 'pending' });
    if (pendingPayout) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'You already have a pending payout request');
    }

    const payout = await AffiliatePayout.create({
      affiliateId,
      amount,
      bankName: affiliate.bankName,
      accountName: affiliate.accountName,
      accountNumber: affiliate.accountNumber,
      status: 'pending',
    });

    return payout;
  }

  /**
   * Get payout history
   */
  static async getPayoutHistory(affiliateId: string, query: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = query;
    const payouts = await AffiliatePayout.find({ affiliateId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    const total = await AffiliatePayout.countDocuments({ affiliateId });
    return { payouts, total, page, limit };
  }

  /**
   * Process payout (Admin only)
   */
  static async processPayout(payoutId: string, status: 'approved' | 'paid' | 'rejected', adminId: string, data?: any) {
    const payout = await AffiliatePayout.findById(payoutId);
    if (!payout) throw new ApiError(StatusCodes.NOT_FOUND, 'Payout request not found');

    if (payout.status === 'paid') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Payout already paid');
    }

    payout.status = status;
    payout.processedBy = adminId as any;
    payout.processedAt = new Date();

    if (status === 'rejected' && data?.reason) {
      payout.rejectionReason = data.reason;
    }

    if (status === 'paid') {
      payout.transactionProof = data?.proof;
      // Update affiliate totalPaid
      await Affiliate.findByIdAndUpdate(payout.affiliateId, {
        $inc: { totalPaid: payout.amount }
      });
      
      // Update related commissions to paid status
      // Note: In a real system, we might want to link payouts to specific commissions.
      // For now, we'll just mark the oldest pending commissions as paid up to the payout amount.
      const pendingCommissions = await AffiliateCommission.find({
        affiliateId: payout.affiliateId,
        status: 'pending'
      }).sort({ createdAt: 1 });

      let remainingAmount = payout.amount;
      for (const commission of pendingCommissions) {
        if (remainingAmount >= commission.commissionAmount) {
          commission.status = 'paid';
          commission.paidAt = new Date();
          await commission.save();
          remainingAmount -= commission.commissionAmount;
        } else {
          break; // Stop if we can't fully pay the next commission
        }
      }
    }

    await payout.save();
    return payout;
  }

  /**
   * Process subscription commission for new tenant payment
   */
  static async processSubscriptionCommission(payment: any): Promise<void> {
    try {
      // Find the tenant for this payment
      const tenant = await Tenant.findById(payment.tenantId);
      if (!tenant || !tenant.referredByAffiliate) {
        return; // No affiliate referral, skip
      }

      const affiliate = await Affiliate.findById(tenant.referredByAffiliate);
      if (!affiliate) {
        return; // Affiliate not found
      }

      // Get commission percentage (use tenant's stored percentage or affiliate's percentage)
      const commissionPercentage = tenant.affiliateCommissionPercentage || affiliate.commissionPercentage;
      const commissionAmount = (payment.amount * commissionPercentage) / 100;

      // Create commission record
      const commission = await AffiliateCommission.create({
        affiliateId: affiliate._id,
        tenantId: payment.tenantId,
        paymentId: payment._id,
        subscriptionAmount: payment.amount,
        commissionPercentage,
        commissionAmount,
        status: 'pending',
      });

      // Update affiliate earnings
      await Affiliate.findByIdAndUpdate(affiliate._id, {
        $inc: { totalEarnings: commissionAmount },
      });

      return;
    } catch (error) {
      // Don't throw - payment should succeed even if commission processing fails
    }
  }

  /**
   * Get affiliate referrals list with commission info
   */
  static async getAffiliateReferrals(affiliateId: string, query: { page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20 } = query;

    const referrals = await Tenant.find({ referredByAffiliate: affiliateId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get commissions for these referrals
    const commissionsByTenantId: Record<string, any> = {};
    const allCommissions = await AffiliateCommission.find({
      affiliateId,
      tenantId: { $in: referrals.map(r => r._id) },
    }).lean();

    allCommissions.forEach(c => {
      commissionsByTenantId[c.tenantId.toString()] = c;
    });

    return referrals.map(referral => ({
      ...referral,
      commission: commissionsByTenantId[referral._id.toString()] || null,
    }));
  }

  /**
   * Update affiliate commission percentage
   */
  static async updateAffiliateCommission(affiliateId: string, percentage: number): Promise<any> {
    if (percentage < 0 || percentage > 100) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Percentage must be between 0 and 100');
    }

    const affiliate = await Affiliate.findByIdAndUpdate(
      affiliateId,
      { commissionPercentage: percentage },
      { new: true }
    );

    if (!affiliate) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Affiliate not found');
    }

    return affiliate;
  }

  /**
   * Deactivate affiliate
   */
  static async deactivateAffiliate(affiliateId: string): Promise<any> {
    const affiliate = await Affiliate.findByIdAndUpdate(
      affiliateId,
      { isActive: false },
      { new: true }
    );

    if (!affiliate) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Affiliate not found');
    }

    return affiliate;
  }

  /**
   * Get commission history for affiliate
   */
  static async getCommissionHistory(
    affiliateId: string,
    query: { page?: number; limit?: number; status?: string } = {}
  ) {
    const { page = 1, limit = 20, status } = query;

    const filter: any = { affiliateId };
    if (status) filter.status = status;

    const commissions = await AffiliateCommission.find(filter)
      .populate('tenantId', 'name')
      .populate('paymentId', 'amount transactionRef')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await AffiliateCommission.countDocuments(filter);

    return { commissions, total, page, limit };
  }

  /**
   * Invite a new user (tenant owner) via email
   */
  static async inviteUser(affiliateId: string, email: string) {
    let session: any = null;
    try {
      session = await startTransactionSession();

      // 1. Check if user already exists
      const existingUser = await User.findOne({ email }).session(session);
      if (existingUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'User with this email already exists');
      }

      const affiliate = await Affiliate.findById(affiliateId).session(session);
      if (!affiliate) throw new ApiError(StatusCodes.NOT_FOUND, 'Affiliate not found');

      // 2. Create a placeholder tenant
      const tenantCode = `INVITE_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const tenant = await Tenant.create([{
        name: 'New Business (Pending Setup)',
        code: tenantCode,
        referredByAffiliate: affiliateId,
        isActive: false, // Inactive until profile updated
      }], session ? { session } : {}).then(res => res[0]);

      // 3. Create the user
      const { hashedToken, plainToken } = generatePasswordResetToken();
      const resetExpiry = getPasswordResetExpiry();

      const user = await User.create([{
        firstName: 'Business',
        lastName: 'Owner',
        email,
        password: Math.random().toString(36).substring(2, 15), // Random temp password
        role: 'super_admin',
        tenantId: tenant._id,
        isActive: true,
        passwordResetToken: hashedToken,
        passwordResetExpires: resetExpiry,
        isEmailVerified: false,
      }], session ? { session } : {}).then(res => res[0]);

      // 4. Update tenant with superAdminId
      tenant.superAdminId = user._id;
      await tenant.save(session ? { session } : {});

      if (session) {
        await session.commitTransaction();
      }

      // 5. Send invitation email
      logger.info(`📧 Sending invitation to ${email} (Token: ${plainToken})`);
      emailService.sendUserInvitation(
        email,
        'Business Owner',
        plainToken,
        'Your New Business'
      ).catch(err => logger.error(`❌ Failed to send invitation email: ${err}`));

      return { message: 'Invitation sent successfully' };
    } catch (error) {
      if (session) await session.abortTransaction();
      throw error;
    } finally {
      if (session) session.endSession();
    }
  }
}
