import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { StatusCodes } from 'http-status-codes';

export class PaymentController {
  /**
   * Initialize a new payment
   */
  static initializePayment = asyncHandler(async (req: Request, res: Response) => {
    const { amount, currency, customerEmail, customerPhone, customerName, redirectUrl, paymentMethod, meta, saleId } = req.body;
    const tenantId = req.tenantId!;
    const branchId = req.user?.branch || req.body.branchId;
    const userId = req.user!._id.toString();

    const payment = await PaymentService.initializePayment(
      {
        amount,
        currency,
        customerEmail,
        customerPhone,
        customerName,
        redirectUrl,
        paymentMethod,
        meta,
      },
      tenantId,
      branchId,
      userId,
      saleId
    );

    return res.status(StatusCodes.CREATED).json(
      ApiResponse.success(payment, 'Payment initialized successfully', StatusCodes.CREATED)
    );
  });

  /**
   * Verify a payment transaction
   */
  static verifyPayment = asyncHandler(async (req: Request, res: Response) => {
    const { transactionId } = req.params;
    const payment = await PaymentService.verifyPayment(transactionId as string);

    return res.status(StatusCodes.OK).json(
      ApiResponse.success(payment, 'Payment verified successfully')
    );
  });

  /**
   * Verify payment by transaction reference
   */
  static verifyPaymentByRef = asyncHandler(async (req: Request, res: Response) => {
    const { txRef } = req.params;
    const payment = await PaymentService.verifyPaymentByRef(txRef as string);

    return res.status(StatusCodes.OK).json(
      ApiResponse.success(payment, 'Payment verified successfully')
    );
  });

  /**
   * Process a refund
   */
  static processRefund = asyncHandler(async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await PaymentService.processRefund(paymentId as string, amount, reason);

    return res.status(StatusCodes.OK).json(
      ApiResponse.success(payment, 'Refund processed successfully')
    );
  });

  /**
   * Get all payments for a tenant
   */
  static getPayments = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const { page, limit, status, startDate, endDate } = req.query;

    const payments = await PaymentService.getPayments(tenantId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    return res.status(StatusCodes.OK).json(
      ApiResponse.paginated(payments.docs, {
        totalDocs: payments.totalDocs,
        limit: payments.limit,
        totalPages: payments.totalPages,
        page: payments.page,
        hasPrevPage: payments.hasPrevPage,
        hasNextPage: payments.hasNextPage,
        prevPage: payments.prevPage,
        nextPage: payments.nextPage,
      }, 'Payments retrieved successfully')
    );
  });

  /**
   * Get payment by ID
   */
  static getPaymentById = asyncHandler(async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const tenantId = req.tenantId!;

    const payment = await PaymentService.getPaymentById(paymentId, tenantId);

    return res.status(StatusCodes.OK).json(
      ApiResponse.success(payment, 'Payment retrieved successfully')
    );
  });

  /**
   * Handle Flutterwave webhook
   */
  static handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['verif-hash'] as string;
    
    await PaymentService.handleWebhook(req.body, signature);

    // Always return 200 to Flutterwave to prevent retries
    return res.status(StatusCodes.OK).json({ received: true });
  });

  /**
   * Get payment link for a pending payment
   */
  static getPaymentLink = asyncHandler(async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const tenantId = req.tenantId!;

    const paymentLink = await PaymentService.getPaymentLink(paymentId, tenantId);

    return res.status(StatusCodes.OK).json(
      ApiResponse.success({ paymentLink }, 'Payment link generated successfully')
    );
  });

  /**
   * Handle payment callback/redirect
   */
  static handleCallback = asyncHandler(async (req: Request, res: Response) => {
    const { status, tx_ref, transaction_id } = req.query;

    if (status === 'successful' && transaction_id) {
      await PaymentService.verifyPayment(transaction_id as string);
    } else if (status === 'cancelled' && tx_ref) {
      // Handle cancelled payment - the service will handle updates
      try {
        await PaymentService.verifyPaymentByRef(tx_ref as string);
      } catch (error) {
        // Silent catch - payment might not exist yet
      }
    }

    // Redirect to frontend with status
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/payment/callback?status=${status}&tx_ref=${tx_ref}`);
  });
}
