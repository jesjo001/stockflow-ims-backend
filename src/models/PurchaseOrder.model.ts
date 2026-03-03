import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface IPOItem {
  product: Types.ObjectId;
  orderQuantity: number;
  receivedQuantity: number;
  costPrice: number;
  taxAmount: number;
  subtotal: number;
}

export interface IPurchaseOrderDocument extends Document {
  tenantId: Types.ObjectId;
  poNumber: string;
  supplier: Types.ObjectId;
  branch: Types.ObjectId;
  items: IPOItem[];
  status: 'draft' | 'submitted' | 'approved' | 'partially_received' | 'received' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  total: number;
  amountPaid: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  expectedDelivery?: Date;
  receivedDate?: Date;
  notes?: string;
  approvedBy?: Types.ObjectId;
  createdBy: Types.ObjectId;
  statusHistory: { status: string, updatedBy: Types.ObjectId, updatedAt: Date, reason?: string }[];
}

const purchaseOrderSchema = new Schema<IPurchaseOrderDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  poNumber: { type: String, required: true, unique: true },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    orderQuantity: { type: Number, required: true },
    receivedQuantity: { type: Number, default: 0 },
    costPrice: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
  }],
  status: { 
    type: String, 
    enum: ['draft', 'submitted', 'approved', 'partially_received', 'received', 'cancelled'],
    default: 'draft'
  },
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  total: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  paymentStatus: { 
    type: String, 
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  expectedDelivery: Date,
  receivedDate: Date,
  notes: String,
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  statusHistory: [{
    status: String,
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now },
    reason: String
  }]
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

purchaseOrderSchema.plugin(paginate);

export const PurchaseOrder = mongoose.model<IPurchaseOrderDocument, mongoose.PaginateModel<IPurchaseOrderDocument>>('PurchaseOrder', purchaseOrderSchema);
