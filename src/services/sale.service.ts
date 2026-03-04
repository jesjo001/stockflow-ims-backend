import { Sale, ISaleDocument } from '../models/Sale.model';
import { Product } from '../models/Product.model';
import { StockLevel } from '../models/StockLevel.model';
import { StockMovement } from '../models/StockMovement.model';
import { Customer } from '../models/Customer.model';
import { generateInvoiceNumber } from '../utils/generateInvoiceNumber';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

export class SaleService {
  // Helper to conditionally apply session to queries
  private static withSession<T>(query: any, session: any): any {
    return session ? query.session(session) : query;
  }

  static async createSale(data: any, userId: string, branchId: string, tenantId: string) {
    let session: mongoose.ClientSession | null = null;
    try {
      // Try to create a session for transaction support
      try {
        session = await mongoose.startSession();
        await session.startTransaction();
      } catch (txError) {
        // Transactions not supported (standalone MongoDB), continue without session
        session = null;
        console.log('⚠️  Transactions not available (standalone MongoDB), using fallback mode');
      }
      const { customer, items, discountType, discountValue, paymentMethod, amountPaid } = data;
      
      console.log('Creating sale with data:', data);
      let subtotal = 0;
      let taxAmount = 0;
      
      // 1. Validate all products and stock
      for (const item of items) {
        const product = await this.withSession(Product.findById(item.product), session);
        if (!product) throw new ApiError(StatusCodes.NOT_FOUND, `Product not found: ${item.product}`);

        const stock = await this.withSession(StockLevel.findOne({ product: item.product, branch: branchId }), session);
        if (!stock || stock.quantity < item.quantity) {
          throw new ApiError(StatusCodes.BAD_REQUEST, `Insufficient stock for product ${item.product}`);
        }

        item.unitPrice = product.sellingPrice;
        item.taxAmount = (product.sellingPrice * (product.taxRate / 100)) * item.quantity;
        item.subtotal = (product.sellingPrice * item.quantity) + item.taxAmount;
        
        subtotal += (product.sellingPrice * item.quantity);
        taxAmount += item.taxAmount;
        
        // 2. Deduct stock
        const previousQty = stock.quantity;
        stock.quantity -= item.quantity;
        await stock.save(session ? { session } : {});
        
        // 3. Create stock movement
        await StockMovement.create([{
          product: item.product,
          branch: branchId,
          type: 'sale',
          quantity: -item.quantity,
          previousQty,
          newQty: stock.quantity,
          reference: 'SALE',
          createdBy: userId
        }], session ? { session } : {});
      }

      // 4. Calculate final totals
      let discountAmount = 0;
      if (discountType === 'percentage') {
        discountAmount = (subtotal * (discountValue / 100));
      } else {
        discountAmount = discountValue;
      }

      const total = subtotal + taxAmount - discountAmount;
      const change = Math.max(0, amountPaid - total);
      const paymentStatus = amountPaid >= total ? 'paid' : (amountPaid > 0 ? 'partial' : 'credit');

      // 5. Update Customer if credit sale
      if (customer && paymentStatus !== 'paid') {
        const cust = await this.withSession(Customer.findById(customer), session);
        if (cust) {
          cust.creditBalance += (total - amountPaid);
          cust.totalPurchases += total;
          await cust.save(session ? { session } : {});
        }
      }

      // 6. Create sale record
      const invoiceNumber = generateInvoiceNumber();
      const sale = await Sale.create([{
        invoiceNumber,
        customer,
        branch: branchId,
        tenantId,
        items,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        taxAmount,
        total,
        amountPaid,
        change,
        paymentMethod,
        paymentStatus,
        soldBy: userId
      }], session ? { session } : {});

      if (session) {
        await session.commitTransaction();
      }
      return sale[0];
    } catch (error) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch (abortError) {
          // Ignore abort errors
        }
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  static async getSales(filters: any, options: any, tenantId: string) {
    return await (Sale as any).paginate({ ...filters, tenantId }, {
      ...options,
      populate: ['customer', 'branch', 'soldBy', 'items.product'],
      sort: { createdAt: -1 }
    });
  }
}
