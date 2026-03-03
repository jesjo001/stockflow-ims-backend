import { StockLevel } from '../models/StockLevel.model';
import { StockMovement } from '../models/StockMovement.model';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

export class StockService {
  static async adjustStock(data: any, userId: string, tenantId: string) {
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
      const { product, branch, quantity, type, note, reference } = data;
      
      let stockLevel = await StockLevel.findOne({ product, branch }).session(session || undefined);
      
      if (!stockLevel) {
        stockLevel = new StockLevel({ product, branch, quantity: 0 });
      }

      const previousQty = stockLevel.quantity;
      stockLevel.quantity += quantity;
      
      if (stockLevel.quantity < 0) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Insufficient stock');
      }

      stockLevel.lastUpdated = new Date();
      await stockLevel.save(session ? { session } : {});

      const movement = await StockMovement.create([{
        product,
        branch,
        tenantId,
        type,
        quantity,
        previousQty,
        newQty: stockLevel.quantity,
        note,
        reference,
        createdBy: userId
      }], session ? { session } : {});

      if (session) {
        await session.commitTransaction();
      }
      return movement[0];
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

  static async getStockLevel(productId: string, branchId: string, tenantId: string) {
    return await StockLevel.findOne({ product: productId, branch: branchId, tenantId });
  }

  static async getAllStockLevels(branchId: string, tenantId: string, filters: any = {}) {
    return await StockLevel.find({ branch: branchId, tenantId, ...filters }).populate('product');
  }
}
