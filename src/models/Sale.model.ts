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
  customerUserId?: Types.ObjectId;
  customerName?: string;
  customerEmail?: string;
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
  paymentMethod: 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'credit' | 'mixed';
  paymentStatus: 'paid' | 'partial' | 'credit' | 'refunded';
  status: 'completed' | 'draft' | 'cancelled' | 'returned';
  source: 'pos' | 'shop';
  note?: string;
  soldBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const saleSchema = new Schema<ISaleDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  invoiceNumber: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customerUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  customerName: { type: String },
  customerEmail: { type: String, lowercase: true, trim: true },
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
    enum: ['cash', 'card', 'mobile_money', 'bank_transfer', 'credit', 'mixed'],
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
  source: {
    type: String,
    enum: ['pos', 'shop'],
    default: 'pos',
    index: true,
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
saleSchema.index({ tenantId: 1, source: 1, createdAt: -1 });

saleSchema.plugin(paginate);

export const Sale = mongoose.model<ISaleDocument, mongoose.PaginateModel<ISaleDocument>>('Sale', saleSchema);
