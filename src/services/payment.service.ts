import axios from 'axios';
import { Payment, IPaymentDocument } from '../models/Payment.model';
import { Sale } from '../models/Sale.model';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env';
import crypto from 'crypto';

// Flutterwave API configuration
const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';
const FLUTTERWAVE_SECRET_KEY = env.NODE_ENV === 'production' 
  ? env.FLUTTERWAVE_SECRET_KEY 
  : env.FLUTTERWAVE_SECRET_TEST_KEY;

interface InitializePaymentInput {
  amount: number;
  currency?: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  redirectUrl?: string;
  paymentMethod?: 'card' | 'bank_transfer' | 'ussd' | 'mobile_money' | 'qr' | 'payattitude';
  meta?: Record<string, any>;
}

interface FlutterwaveResponse {
  status: string;
  message: string;
  data: {
    link?: string;
    id?: number;
    tx_ref?: string;
    flw_ref?: string;
    amount?: number;
    currency?: string;
    charged_amount?: number;
    app_fee?: number;
    merchant_fee?: number;
    processor_response?: string;
    auth_model?: string;
    ip?: string;
    narration?: string;
    status?: string;
    payment_type?: string;
    created_at?: string;
    account_id?: number;
    customer?: {
      id?: number;
      phone_number?: string;
      name?: string;
      email?: string;
      created_at?: string;
    };
  };
}

export class PaymentService {
  private static generateTransactionRef(): string {
    return `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private static getFlutterwaveHeaders() {
    if (!FLUTTERWAVE_SECRET_KEY) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Flutterwave secret key not configured');
    }
    return {
      Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initialize a payment with Flutterwave
   */
  static async initializePayment(
    input: InitializePaymentInput,
    tenantId: string,
    branchId: string,
    userId: string,
    saleId?: string
  ): Promise<IPaymentDocument> {
    const transactionRef = this.generateTransactionRef();

    // Create payment record
    const payment = await Payment.create({
      tenantId,
      sale: saleId,
      branch: branchId,
      amount: input.amount,
      currency: input.currency || 'NGN',
      paymentMethod: input.paymentMethod || 'card',
      status: 'pending',
      transactionRef,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      customerName: input.customerName,
      redirectUrl: input.redirectUrl,
      meta: input.meta,
      createdBy: userId,
    });

    try {
      // Initialize payment with Flutterwave
      const response = await axios.post<FlutterwaveResponse>(
        `${FLUTTERWAVE_BASE_URL}/payments`,
        {
          tx_ref: transactionRef,
          amount: input.amount,
          currency: input.currency || 'NGN',
          redirect_url: input.redirectUrl,
          customer: {
            email: input.customerEmail,
            phonenumber: input.customerPhone,
            name: input.customerName || input.customerEmail,
          },
          customizations: {
            title: 'StockFlow Payment',
            description: 'Payment for products/services',
            logo: 'https://stockflow.com/logo.png',
          },
          payment_options: this.mapPaymentMethod(input.paymentMethod),
          meta: {
            tenantId,
            branchId,
            saleId,
            ...input.meta,
          },
        },
        { headers: this.getFlutterwaveHeaders() }
      );

      if (response.data.status === 'success') {
        payment.flutterwaveRef = response.data.data.flw_ref;
        await payment.save();

        return {
          ...payment.toObject(),
          paymentLink: response.data.data.link,
        } as unknown as IPaymentDocument & { paymentLink: string };
      } else {
        payment.status = 'failed';
        await payment.save();
        throw new ApiError(StatusCodes.BAD_REQUEST, response.data.message || 'Payment initialization failed');
      }
    } catch (error: any) {
      payment.status = 'failed';
      await payment.save();
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new ApiError(StatusCodes.BAD_REQUEST, `Flutterwave error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Verify a payment transaction
   */
  static async verifyPayment(transactionId: string): Promise<IPaymentDocument> {
    try {
      const response = await axios.get<FlutterwaveResponse>(
        `${FLUTTERWAVE_BASE_URL}/transactions/${transactionId}/verify`,
        { headers: this.getFlutterwaveHeaders() }
      );

      const { data } = response.data;
      const payment = await Payment.findOne({ transactionRef: data.tx_ref });

      if (!payment) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Payment record not found');
      }

      // Update payment status based on Flutterwave response
      const flwStatus = data.status?.toLowerCase();
      if (flwStatus === 'successful') {
        payment.status = 'success';
      } else if (flwStatus === 'failed') {
        payment.status = 'failed';
      } else if (flwStatus === 'cancelled') {
        payment.status = 'cancelled';
      }

      payment.flutterwaveTransactionId = transactionId.toString();
      payment.processorResponse = data.processor_response;
      await payment.save();

      // Update associated sale payment status if payment is successful
      if (payment.status === 'success' && payment.sale) {
        await Sale.findByIdAndUpdate(payment.sale, {
          paymentStatus: 'paid',
          amountPaid: payment.amount,
        });
      }

      return payment;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new ApiError(StatusCodes.BAD_REQUEST, `Verification error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Verify payment by transaction reference
   */
  static async verifyPaymentByRef(transactionRef: string): Promise<IPaymentDocument> {
    try {
      const response = await axios.get<FlutterwaveResponse>(
        `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${transactionRef}`,
        { headers: this.getFlutterwaveHeaders() }
      );

      const { data } = response.data;
      const payment = await Payment.findOne({ transactionRef });

      if (!payment) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Payment record not found');
      }

      const flwStatus = data.status?.toLowerCase();
      if (flwStatus === 'successful') {
        payment.status = 'success';
      } else if (flwStatus === 'failed') {
        payment.status = 'failed';
      } else if (flwStatus === 'cancelled') {
        payment.status = 'cancelled';
      }

      payment.flutterwaveTransactionId = data.id?.toString();
      payment.flutterwaveRef = data.flw_ref;
      payment.processorResponse = data.processor_response;
      await payment.save();

      // Update associated sale payment status if payment is successful
      if (payment.status === 'success' && payment.sale) {
        await Sale.findByIdAndUpdate(payment.sale, {
          paymentStatus: 'paid',
          amountPaid: payment.amount,
        });
      }

      return payment;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new ApiError(StatusCodes.BAD_REQUEST, `Verification error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Process a refund
   */
  static async processRefund(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<IPaymentDocument> {
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found');
    }

    if (payment.status !== 'success') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Only successful payments can be refunded');
    }

    if (!payment.flutterwaveTransactionId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Transaction ID not available for refund');
    }

    const refundAmount = amount || payment.amount;

    try {
      const response = await axios.post<FlutterwaveResponse>(
        `${FLUTTERWAVE_BASE_URL}/transactions/${payment.flutterwaveTransactionId}/refund`,
        {
          amount: refundAmount,
          comments: reason || 'Customer refund',
        },
        { headers: this.getFlutterwaveHeaders() }
      );

      if (response.data.status === 'success') {
        payment.status = 'refunded';
        payment.refundAmount = refundAmount;
        payment.refundReason = reason;
        payment.refundedAt = new Date();
        await payment.save();

        // Update associated sale
        if (payment.sale) {
          await Sale.findByIdAndUpdate(payment.sale, {
            paymentStatus: 'refunded',
          });
        }

        return payment;
      } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, response.data.message || 'Refund failed');
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new ApiError(StatusCodes.BAD_REQUEST, `Refund error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get all payments for a tenant
   */
  static async getPayments(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const { page = 1, limit = 10, status, startDate, endDate } = query;

    const filter: any = { tenantId };
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const payments = await Payment.paginate(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'sale', select: 'invoiceNumber total' },
        { path: 'customer', select: 'firstName lastName email' },
        { path: 'createdBy', select: 'firstName lastName' },
      ],
    });

    return payments;
  }

  /**
   * Get payment by ID
   */
  static async getPaymentById(paymentId: string, tenantId: string): Promise<IPaymentDocument> {
    const payment = await Payment.findOne({ _id: paymentId, tenantId }).populate([
      { path: 'sale', select: 'invoiceNumber total items' },
      { path: 'customer', select: 'firstName lastName email phone' },
      { path: 'createdBy', select: 'firstName lastName' },
    ]);

    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found');
    }

    return payment;
  }

  /**
   * Handle webhook events from Flutterwave
   */
  static async handleWebhook(payload: any, signature: string): Promise<void> {
    // Verify webhook signature
    const secretHash = env.FLUTTERWAVE_WEBHOOK_SECRET;
    if (secretHash) {
      const hash = crypto.createHmac('sha256', secretHash).update(JSON.stringify(payload)).digest('hex');
      if (hash !== signature) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid webhook signature');
      }
    }

    const { event, data } = payload;

    if (event === 'charge.completed') {
      const payment = await Payment.findOne({ transactionRef: data.tx_ref });
      if (payment) {
        payment.flutterwaveTransactionId = data.id?.toString();
        payment.flutterwaveRef = data.flw_ref;
        payment.processorResponse = data.processor_response;

        if (data.status === 'successful') {
          payment.status = 'success';
          // Update sale if associated
          if (payment.sale) {
            await Sale.findByIdAndUpdate(payment.sale, {
              paymentStatus: 'paid',
              amountPaid: data.amount,
            });
          }
        } else if (data.status === 'failed') {
          payment.status = 'failed';
        }

        await payment.save();
      }
    }
  }

  /**
   * Get payment link for a pending payment
   */
  static async getPaymentLink(paymentId: string, tenantId: string): Promise<string> {
    const payment = await Payment.findOne({ _id: paymentId, tenantId, status: 'pending' });

    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Pending payment not found');
    }

    try {
      const response = await axios.post<FlutterwaveResponse>(
        `${FLUTTERWAVE_BASE_URL}/payments`,
        {
          tx_ref: payment.transactionRef,
          amount: payment.amount,
          currency: payment.currency,
          redirect_url: payment.redirectUrl,
          customer: {
            email: payment.customerEmail,
            phonenumber: payment.customerPhone,
            name: payment.customerName || payment.customerEmail,
          },
          customizations: {
            title: 'StockFlow Payment',
            description: 'Payment for products/services',
            logo: 'https://stockflow.com/logo.png',
          },
          payment_options: this.mapPaymentMethod(payment.paymentMethod),
        },
        { headers: this.getFlutterwaveHeaders() }
      );

      if (response.data.status === 'success' && response.data.data.link) {
        return response.data.data.link;
      }

      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to generate payment link');
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new ApiError(StatusCodes.BAD_REQUEST, `Flutterwave error: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Map internal payment method to Flutterwave format
   */
  private static mapPaymentMethod(method?: string): string {
    const methodMap: Record<string, string> = {
      card: 'card',
      bank_transfer: 'banktransfer',
      ussd: 'ussd',
      mobile_money: 'mobilemoney',
      qr: 'qr',
      payattitude: 'payattitude',
    };
    return methodMap[method || 'card'] || 'card';
  }
}
