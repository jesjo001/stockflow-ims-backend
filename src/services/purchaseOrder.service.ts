import { PurchaseOrder, IPurchaseOrderDocument } from '../models/PurchaseOrder.model';
import { Product } from '../models/Product.model';
import { StockLevel } from '../models/StockLevel.model';
import { StockMovement } from '../models/StockMovement.model';
import { generatePONumber } from '../utils/generatePONumber';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

export class PurchaseOrderService {
  static async createPurchaseOrder(data: any, userId: string, tenantId: string) {
    const { supplier, branch, items, expectedDelivery, notes } = data;
    
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) throw new ApiError(StatusCodes.NOT_FOUND, `Product not found: ${item.product}`);
      
      item.costPrice = product.costPrice;
      item.taxAmount = (product.costPrice * (product.taxRate / 100)) * item.orderQuantity;
      item.subtotal = (product.costPrice * item.orderQuantity) + item.taxAmount;
      
      subtotal += (product.costPrice * item.orderQuantity);
      taxAmount += item.taxAmount;
    }

    const total = subtotal + taxAmount;
    const poNumber = generatePONumber();

    const po = await PurchaseOrder.create({
      poNumber,
      supplier,
      branch,
      tenantId,
      items,
      subtotal,
      taxAmount,
      total,
      expectedDelivery,
      notes,
      createdBy: userId,
      statusHistory: [{ status: 'draft', updatedBy: userId, updatedAt: new Date() }]
    });

    return po;
  }

  static async receiveGoods(poId: string, receivedItems: any[], userId: string, tenantId: string) {
    let session: any = null;
    try {
      // Try to create a session for transaction support
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch (txError) {
        // Transactions not supported (standalone MongoDB), continue without session
        session = null;
        console.warn('⚠️  Transactions not available (standalone MongoDB), using fallback mode');
      }
      const po = await PurchaseOrder.findById(poId).session(session || undefined);
      if (!po) throw new ApiError(StatusCodes.NOT_FOUND, 'Purchase Order not found');

      for (const rItem of receivedItems) {
        const item = po.items.find(i => i.product.toString() === rItem.product);
        if (item) {
          const qtyDiff = rItem.quantity;
          item.receivedQuantity += qtyDiff;
          
          let stock = await StockLevel.findOne({ product: item.product, branch: po.branch }).session(session || undefined);
          if (!stock) {
            stock = new StockLevel({ product: item.product, branch: po.branch, quantity: 0 });
          }

          const previousQty = stock.quantity;
          stock.quantity += qtyDiff;
          await stock.save(session ? { session } : {});

          await StockMovement.create([{
            product: item.product,
            branch: po.branch,
            tenantId,
            type: 'purchase',
            quantity: qtyDiff,
            previousQty,
            newQty: stock.quantity,
            reference: po.poNumber,
            createdBy: userId
          }], session ? { session } : {});
        }
      }

      const allReceived = po.items.every(i => i.receivedQuantity >= i.orderQuantity);
      po.status = allReceived ? 'received' : 'partially_received';
      po.statusHistory.push({ status: po.status, updatedBy: (userId as any), updatedAt: new Date() });
      po.receivedDate = new Date();
      
      await po.save(session ? { session } : {});
      if (session) {
        await session.commitTransaction();
      }
      return po;
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
}
