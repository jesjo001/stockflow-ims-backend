import { Sale } from '../models/Sale.model';
import { Product } from '../models/Product.model';
import { StockLevel } from '../models/StockLevel.model';
import { StockMovement } from '../models/StockMovement.model';
import { Customer } from '../models/Customer.model';
import { Settings } from '../models/Settings.model';
import { emailService } from '../utils/email';
import { generateInvoiceNumber } from '../utils/generateInvoiceNumber';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import { startTransactionSession } from '../utils/mongoTransaction';

export class SaleService {
  // Helper to conditionally apply session to queries
  private static withSession(query: any, session: any): any {
    return session ? query.session(session) : query;
  }

  static async createSale(data: any, userId: string, branchId: string, tenantId: string) {
    let session: mongoose.ClientSession | null = null;
    try {
      session = await startTransactionSession();
      const { customer, items, discountType, discountValue, paymentMethod, amountPaid } = data;
      
      let subtotal = 0;
      let taxAmount = 0;
      
      // 1. Validate all products and stock
      for (const item of items) {
        const product = await this.withSession(Product.findById(item.product), session);
        if (!product) throw new ApiError(StatusCodes.NOT_FOUND, `Product not found: ${item.product}`);

        // Validate product has required price info
        if (!product.sellingPrice || product.sellingPrice <= 0) {
          throw new ApiError(StatusCodes.BAD_REQUEST, `Product ${product.name} does not have a valid selling price set`);
        }

        // Get stock level - try exact branch match first, then fallback to any branch for the product
        let stock = await this.withSession(
          StockLevel.findOne({ product: item.product, branch: branchId, tenantId }),
          session
        );
        
        // Fallback: if no stock for this branch, check if product stock exists in any branch
        if (!stock) {
          stock = await this.withSession(
            StockLevel.findOne({ product: item.product, tenantId }),
            session
          );
          
          // If still no stock, create one for this branch with 0 quantity
          if (!stock) {
            const [newStock] = await StockLevel.create([{
              product: item.product,
              branch: branchId,
              tenantId,
              quantity: 0,
            }], session ? { session } : {});
            stock = newStock;
          }
        }
        
        // Final check - stock should never be null at this point
        if (!stock) {
          throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Failed to acquire stock record for product ${item.product}`);
        }
        
        // Check if sufficient stock
        if (stock.quantity < item.quantity) {
          throw new ApiError(StatusCodes.BAD_REQUEST, `Insufficient stock for product ${product.name}. Available: ${stock.quantity}, Requested: ${item.quantity}`);
        }

        item.unitPrice = product.sellingPrice;
        item.taxAmount = (product.sellingPrice * (product.taxRate / 100)) * item.quantity;
        item.subtotal = (product.sellingPrice * item.quantity) + item.taxAmount;
        
        subtotal += (product.sellingPrice * item.quantity);
        taxAmount += item.taxAmount;
        
        // 2. Deduct stock from the stock level that was found
        const previousQty = stock.quantity;
        stock.quantity -= item.quantity;
        stock.lastUpdated = new Date();
        await stock.save(session ? { session } : {});
        
        // 3. Create stock movement - use the branch from the stock record found
        const stockBranchId = stock.branch;
        await StockMovement.create([{
          product: item.product,
          branch: stockBranchId,
          tenantId,
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
      if (discountType === 'percentage' && discountValue) {
        discountAmount = (subtotal * (discountValue / 100));
      } else if (discountValue) {
        discountAmount = discountValue;
      }

      const total = subtotal + taxAmount - discountAmount;
      const change = Math.max(0, amountPaid - total);
      
      // Validate calculations - ensure no NaN or Infinity values
      if (!isFinite(total) || !isFinite(change) || isNaN(total) || isNaN(change)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid sale calculation. Total: ${total}, Change: ${change}. Please verify all product prices are set correctly.`);
      }

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
        customerName: data.customerName,
        customerEmail: data.customerEmail,
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

      // 7. Auto-send email if enabled
      const settings = await Settings.findOne({ tenantId });
      if (settings?.invoiceAutoSendEmail && (customer || data.customerEmail)) {
        this.sendInvoice(sale[0]._id.toString(), tenantId, data.customerEmail).catch(err => {
          logger.error(`❌ Failed to auto-send invoice email: ${err}`);
        });
      }

      return sale[0];
    } catch (error) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
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

  /**
   * Send invoice via email to customer
   */
  static async sendInvoice(saleId: string, tenantId: string, customEmail?: string) {
    const sale = await Sale.findOne({ _id: saleId, tenantId })
      .populate('customer')
      .populate('items.product');
    
    if (!sale) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Sale not found');
    }

    const email = customEmail || (sale.customer as any)?.email;
    if (!email) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Customer email not found. Please provide an email address.');
    }

    const settings = await Settings.findOne({ tenantId });
    const tenantName = settings?.companyName || 'Our Business';

    // Build invoice HTML
    const itemsHtml = sale.items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6;">${item.product?.name || 'Item'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">${(settings?.currency || 'USD')} ${item.unitPrice.toLocaleString()}</td>
        <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right;">${(settings?.currency || 'USD')} ${((item.quantity * item.unitPrice) + (item.taxAmount || 0)).toLocaleString()}</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <div style="font-family: sans-serif; color: #1f2937;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0; color: ${settings?.invoiceAccentColor || '#6366f1'};">${settings?.invoiceHeader || 'INVOICE'}</h2>
            <p style="margin: 5px 0; font-size: 14px; color: #6b7280;"># ${sale.invoiceNumber}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: bold;">${tenantName}</p>
            <p style="margin: 5px 0; font-size: 12px; color: #6b7280;">${new Date(sale.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f9fafb; font-size: 12px; text-transform: uppercase; color: #6b7280;">
              <th style="padding: 10px; text-align: left;">Description</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
              <th style="padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="margin-left: auto; width: 250px; font-size: 14px;">
          <div style="display: flex; justify-content: space-between; padding: 5px 0;">
            <span style="color: #6b7280;">Subtotal</span>
            <span>${(settings?.currency || 'USD')} ${sale.subtotal.toLocaleString()}</span>
          </div>
          ${sale.taxAmount ? `
            <div style="display: flex; justify-content: space-between; padding: 5px 0;">
              <span style="color: #6b7280;">Tax</span>
              <span>${(settings?.currency || 'USD')} ${sale.taxAmount.toLocaleString()}</span>
            </div>
          ` : ''}
          ${sale.discountAmount ? `
            <div style="display: flex; justify-content: space-between; padding: 5px 0;">
              <span style="color: #6b7280;">Discount</span>
              <span>-${(settings?.currency || 'USD')} ${sale.discountAmount.toLocaleString()}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #f3f4f6; margin-top: 10px; font-weight: bold; font-size: 16px;">
            <span>Total</span>
            <span>${(settings?.currency || 'USD')} ${sale.total.toLocaleString()}</span>
          </div>
        </div>
        
        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; font-style: italic;">
          ${settings?.invoiceFooter || 'Thank you for your business!'}
        </div>
      </div>
    `;

    return await emailService.sendInvoiceEmail(
      email,
      (sale.customer as any)?.name || 'Customer',
      sale.invoiceNumber,
      invoiceHtml,
      tenantName
    );
  }
}
