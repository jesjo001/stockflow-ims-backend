import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface IPaymentDocument extends Document {
  tenantId: Types.ObjectId;
  sale?: Types.ObjectId;
  customer?: Types.ObjectId;
  branch: Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: 'card' | 'bank_transfer' | 'ussd' | 'mobile_money' | 'qr' | 'payattitude';
  provider: 'flutterwave';
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'refunded';
  transactionRef: string;
  flutterwaveTransactionId?: string;
  flutterwaveRef?: string;
  processorResponse?: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  redirectUrl?: string;
  meta?: Record<string, any>;
  refundedAt?: Date;
  refundAmount?: number;
  refundReason?: string;
  createdBy: Types.ObjectId;
  updatedAt?: Date;
  createdAt?: Date;
}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    sale: { type: Schema.Types.ObjectId, ref: 'Sale', index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'NGN' },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank_transfer', 'ussd', 'mobile_money', 'qr', 'payattitude'],
      required: true,
    },
    provider: { type: String, default: 'flutterwave' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
      index: true,
    },
    transactionRef: { type: String, required: true, unique: true, index: true },
    flutterwaveTransactionId: { type: String },
    flutterwaveRef: { type: String },
    processorResponse: { type: String },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String },
    customerName: { type: String },
    redirectUrl: { type: String },
    meta: { type: Schema.Types.Mixed },
    refundedAt: { type: Date },
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Indexes for performance
paymentSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ tenantId: 1, createdAt: -1 });
paymentSchema.index({ flutterwaveTransactionId: 1 });

// Plugin for pagination
paymentSchema.plugin(paginate);

export const Payment = mongoose.model<IPaymentDocument, mongoose.PaginateModel<IPaymentDocument>>('Payment', paymentSchema);
