import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface IStockLevelDocument extends Document {
  tenantId: Types.ObjectId;
  product: Types.ObjectId;
  branch: Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  lastUpdated: Date;
  availableQuantity: number;
}

const stockLevelSchema = new Schema<IStockLevelDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  quantity: { type: Number, default: 0 },
  reservedQuantity: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

stockLevelSchema.index({ product: 1, branch: 1 }, { unique: true });

stockLevelSchema.virtual('availableQuantity').get(function() {
  return this.quantity - this.reservedQuantity;
});

stockLevelSchema.plugin(paginate);

export const StockLevel = mongoose.model<IStockLevelDocument, mongoose.PaginateModel<IStockLevelDocument>>('StockLevel', stockLevelSchema);
