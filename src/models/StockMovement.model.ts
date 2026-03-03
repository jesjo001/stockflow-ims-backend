import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface IStockMovementDocument extends Document {
  tenantId: Types.ObjectId;
  product: Types.ObjectId;
  branch: Types.ObjectId;
  type: 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return' | 'damage' | 'opening';
  quantity: number;
  previousQty: number;
  newQty: number;
  reference?: string;
  batchNumber?: string;
  expiryDate?: Date;
  note?: string;
  createdBy: Types.ObjectId;
}

const stockMovementSchema = new Schema<IStockMovementDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  type: { 
    type: String, 
    enum: ['purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'damage', 'opening'],
    required: true
  },
  quantity: { type: Number, required: true },
  previousQty: { type: Number, required: true },
  newQty: { type: Number, required: true },
  reference: String,
  batchNumber: String,
  expiryDate: Date,
  note: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { 
  timestamps: true,
  toJSON: {
    transform: (_: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

stockMovementSchema.index({ product: 1, branch: 1, createdAt: -1 });

stockMovementSchema.plugin(paginate);

export const StockMovement = mongoose.model<IStockMovementDocument, mongoose.PaginateModel<IStockMovementDocument>>('StockMovement', stockMovementSchema);
