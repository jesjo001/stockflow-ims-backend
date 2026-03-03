import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface ISaleItem {
  product: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  discountAmount: number;
  subtotal: number;
}

export interface ISaleDocument extends Document {
  tenantId: Types.ObjectId;
  invoiceNumber: string;
  customer?: Types.ObjectId;
  branch: Types.ObjectId;
  items: ISaleItem[];
  subtotal: number;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: 'cash' | 'card' | 'mobile_money' | 'credit' | 'mixed';
  paymentStatus: 'paid' | 'partial' | 'credit' | 'refunded';
  status: 'completed' | 'draft' | 'cancelled' | 'returned';
  note?: string;
  soldBy: Types.ObjectId;
}

const saleSchema = new Schema<ISaleDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  invoiceNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
  }],
  subtotal: { type: Number, required: true },
  discountType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
  discountValue: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  change: { type: Number, default: 0 },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'card', 'mobile_money', 'credit', 'mixed'],
    required: true
  },
  paymentStatus: { 
    type: String, 
    enum: ['paid', 'partial', 'credit', 'refunded'],
    required: true
  },
  status: { 
    type: String, 
    enum: ['completed', 'draft', 'cancelled', 'returned'],
    default: 'completed'
  },
  note: String,
  soldBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

saleSchema.index({ branch: 1, createdAt: -1 });

saleSchema.plugin(paginate);

export const Sale = mongoose.model<ISaleDocument, mongoose.PaginateModel<ISaleDocument>>('Sale', saleSchema);
