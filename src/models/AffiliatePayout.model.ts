import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAffiliatePayoutDocument extends Document {
  affiliateId: Types.ObjectId;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  bankName: string;
  accountName: string;
  accountNumber: string;
  processedBy?: Types.ObjectId;
  processedAt?: Date;
  rejectionReason?: string;
  transactionProof?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const affiliatePayoutSchema = new Schema<IAffiliatePayoutDocument>(
  {
    affiliateId: { type: Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'paid', 'rejected'], 
      default: 'pending',
      index: true 
    },
    bankName: { type: String, required: true },
    accountName: { type: String, required: true },
    accountNumber: { type: String, required: true },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: Date,
    rejectionReason: String,
    transactionProof: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_: unknown, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

affiliatePayoutSchema.index({ affiliateId: 1, createdAt: -1 });

export const AffiliatePayout = mongoose.model<IAffiliatePayoutDocument>('AffiliatePayout', affiliatePayoutSchema);
