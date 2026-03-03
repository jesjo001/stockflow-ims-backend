import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface IProductDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  barcode?: string;
  description?: string;
  category: Types.ObjectId;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number;
  images: string[];
  hasVariants: boolean;
  variants: any[];
  hasBatchTracking: boolean;
  reorderPoint: number;
  reorderQuantity: number;
  isActive: boolean;
  tags: string[];
  branch: Types.ObjectId;
  createdBy: Types.ObjectId;
  profitMargin: number;
}

const productSchema = new Schema<IProductDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true },
  barcode: { type: String, unique: true, sparse: true },
  description: String,
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  unit: { type: String, required: true },
  costPrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  taxRate: { type: Number, default: 0 },
  mainImage: { type: String },
  images: [String],
  hasVariants: { type: Boolean, default: false },
  variants: [Schema.Types.Mixed],
  hasBatchTracking: { type: Boolean, default: false },
  reorderPoint: { type: Number, default: 10 },
  reorderQuantity: { type: Number, default: 50 },
  isActive: { type: Boolean, default: true },
  tags: [String],
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

// Text search index (sku and barcode indexes are created by unique: true)
productSchema.index({ name: 'text', description: 'text' });

productSchema.virtual('profitMargin').get(function() {
  if (this.sellingPrice && this.costPrice) {
    return ((this.sellingPrice - this.costPrice) / this.sellingPrice) * 100;
  }
  return 0;
});

productSchema.plugin(paginate);

export const Product = mongoose.model<IProductDocument, mongoose.PaginateModel<IProductDocument>>('Product', productSchema);
