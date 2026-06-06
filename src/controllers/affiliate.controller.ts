import { Request, Response } from 'express';
import { AffiliateService } from '../services/affiliate.service';
import { Affiliate } from '../models/Affiliate.model';
import { User } from '../models/User.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';

export class AffiliateController {
  /**
   * Get default affiliate percentage (super admin only)
   */
  static getDefaultPercentage = asyncHandler(async (req: Request, res: Response) => {
    const percentage = await AffiliateService.getDefaultAffiliatePercentage();
    res.status(StatusCodes.OK).json(
      ApiResponse.success({ percentage }, 'Default affiliate percentage retrieved')
    );
  });

  /**
   * Set default affiliate percentage (super admin only)
   */
  static setDefaultPercentage = asyncHandler(async (req: Request, res: Response) => {
    const { percentage } = req.body;
    if (typeof percentage !== 'number') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Percentage must be a number');
    }

    const newPercentage = await AffiliateService.setDefaultAffiliatePercentage(percentage);
    res.status(StatusCodes.OK).json(
      ApiResponse.success({ percentage: newPercentage }, 'Default affiliate percentage updated')
    );
  });

  /**
   * Create new affiliate (super admin only)
   */
  static create = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, commissionPercentage } = req.body;

    if (!name || !email) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Name and email are required');
    }

    if (typeof commissionPercentage !== 'number' || commissionPercentage < 0 || commissionPercentage > 100) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Commission percentage must be between 0 and 100');
    }

    const affiliate = await AffiliateService.createAffiliate(
      { name, email, commissionPercentage },
      req.user._id.toString()
    );

    res.status(StatusCodes.CREATED).json(
      ApiResponse.success(affiliate, 'Affiliate created successfully', StatusCodes.CREATED)
    );
  });

  /**
   * Get all affiliates (super admin only)
   */
  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 50 } = req.query;
    const affiliates = await AffiliateService.getAllAffiliates({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.status(StatusCodes.OK).json(
      ApiResponse.success(affiliates, 'Affiliates retrieved successfully')
    );
  });

  /**
   * Get current affiliate's dashboard (requires user to have affiliateId)
   */
  static getMyDashboard = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user.affiliateId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You are not an affiliate');
    }

    const dashboard = await AffiliateService.getAffiliateDashboard((req.user.affiliateId as any).toString());
    res.status(StatusCodes.OK).json(
      ApiResponse.success(dashboard, 'Your affiliate dashboard retrieved successfully')
    );
  });

  /**
   * Get affiliate dashboard by ID (super admin can view any, affiliate can view own)
   */
  static getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    // Check authorization - affiliate can only view if it's their ID, super admin can view any
    if (req.user.role !== 'super_admin') {
      if (!req.user.affiliateId || String(req.user.affiliateId) !== String(id)) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to view this dashboard');
      }
    }

    const dashboard = await AffiliateService.getAffiliateDashboard(id);
    res.status(StatusCodes.OK).json(
      ApiResponse.success(dashboard, 'Affiliate dashboard retrieved successfully')
    );
  });

  /**
   * Get current affiliate's referrals (requires user to have affiliateId)
   */
  static getMyReferrals = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user.affiliateId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You are not an affiliate');
    }

    const { page = 1, limit = 20 } = req.query;
    const referrals = await AffiliateService.getAffiliateReferrals((req.user.affiliateId as any).toString(), {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.status(StatusCodes.OK).json(
      ApiResponse.success(referrals, 'Your referrals retrieved successfully')
    );
  });

  /**
   * Get affiliate referrals by ID (super admin can view any, affiliate can view own)
   */
  static getReferrals = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    // Check authorization
    if (req.user.role !== 'super_admin') {
      if (!req.user.affiliateId || String(req.user.affiliateId) !== String(id)) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to view these referrals');
      }
    }

    const { page = 1, limit = 20 } = req.query;
    const referrals = await AffiliateService.getAffiliateReferrals(id, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.status(StatusCodes.OK).json(
      ApiResponse.success(referrals, 'Affiliate referrals retrieved successfully')
    );
  });

  /**
   * Get current affiliate's commission history
   */
  static getMyCommissionHistory = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user.affiliateId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You are not an affiliate');
    }

    const { page = 1, limit = 20, status } = req.query;
    const result = await AffiliateService.getCommissionHistory((req.user.affiliateId as any).toString(), {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as string,
    });

    res.status(StatusCodes.OK).json(
      ApiResponse.success(result, 'Your commission history retrieved successfully')
    );
  });

  /**
   * Get commission history by affiliate ID (super admin can view any, affiliate can view own)
   */
  static getCommissionHistory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    // Check authorization
    if (req.user.role !== 'super_admin') {
      if (!req.user.affiliateId || String(req.user.affiliateId) !== String(id)) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to view this history');
      }
    }

    const { page = 1, limit = 20, status } = req.query;
    const result = await AffiliateService.getCommissionHistory(id, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as string,
    });

    res.status(StatusCodes.OK).json(
      ApiResponse.success(result, 'Commission history retrieved successfully')
    );
  });

  /**
   * Update affiliate commission percentage (super admin only)
   */
  static updateCommission = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { commissionPercentage } = req.body;

    if (typeof commissionPercentage !== 'number') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Commission percentage must be a number');
    }

    const affiliate = await AffiliateService.updateAffiliateCommission(id, commissionPercentage);
    res.status(StatusCodes.OK).json(
      ApiResponse.success(affiliate, 'Affiliate commission updated successfully')
    );
  });

  /**
   * Deactivate affiliate (super admin only)
   */
  static deactivate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const affiliate = await AffiliateService.deactivateAffiliate(id);

    res.status(StatusCodes.OK).json(
      ApiResponse.success(affiliate, 'Affiliate deactivated successfully')
    );
  });

  /**
   * Assign affiliate to user (super admin only)
   */
  static assignAffiliateToUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId, affiliateId } = req.body;

    if (!userId || !affiliateId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'userId and affiliateId are required');
    }

    // Verify affiliate exists
    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Affiliate not found');
    }

    // Update user with affiliateId
    const user = await User.findByIdAndUpdate(
      userId,
      { affiliateId },
      { new: true }
    );

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    res.status(StatusCodes.OK).json(
      ApiResponse.success({ user, affiliate: affiliate.name }, 'Affiliate assigned to user successfully')
    );
  });

  /**
   * Invite a new business (tenant owner) via email
   */
  static inviteUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user.affiliateId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You are not an affiliate');
    }

    const { email } = req.body;
    if (!email) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email is required');
    }

    const result = await AffiliateService.inviteUser((req.user.affiliateId as any).toString(), email);
    res.status(StatusCodes.OK).json(
      ApiResponse.success(result, 'Invitation sent successfully')
    );
  });

  /**
   * Update bank details
   */
  static updateBankDetails = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user.affiliateId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You are not an affiliate');
    }

    const { bankName, accountName, accountNumber } = req.body;
    if (!bankName || !accountName || !accountNumber) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'All bank details are required');
    }

    const affiliate = await AffiliateService.updateBankDetails(
      (req.user.affiliateId as any).toString(),
      { bankName, accountName, accountNumber }
    );

    res.status(StatusCodes.OK).json(
      ApiResponse.success(affiliate, 'Bank details updated successfully')
    );
  });

  /**
   * Request payout
   */
  static requestPayout = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user.affiliateId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You are not an affiliate');
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Valid payout amount is required');
    }

    const payout = await AffiliateService.requestPayout(
      (req.user.affiliateId as any).toString(),
      amount
    );

    res.status(StatusCodes.CREATED).json(
      ApiResponse.success(payout, 'Payout requested successfully', StatusCodes.CREATED)
    );
  });

  /**
   * Get my payout history
   */
  static getMyPayoutHistory = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user.affiliateId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You are not an affiliate');
    }

    const { page = 1, limit = 20 } = req.query;
    const result = await AffiliateService.getPayoutHistory(
      (req.user.affiliateId as any).toString(),
      { page: parseInt(page as string), limit: parseInt(limit as string) }
    );

    res.status(StatusCodes.OK).json(
      ApiResponse.success(result, 'Payout history retrieved successfully')
    );
  });

  /**
   * Process payout (Super Admin only)
   */
  static processPayout = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { status, reason, proof } = req.body;

    if (!['approved', 'paid', 'rejected'].includes(status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid status');
    }

    const payout = await AffiliateService.processPayout(
      id,
      status,
      req.user._id.toString(),
      { reason, proof }
    );

    res.status(StatusCodes.OK).json(
      ApiResponse.success(payout, `Payout ${status} successfully`)
    );
  });
}

