import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAffiliateCommissionDocument extends Document {
  affiliateId: Types.ObjectId;
  tenantId: Types.ObjectId;
  paymentId: Types.ObjectId;
  subscriptionAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  status: 'pending' | 'paid';
  paidAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const affiliateCommissionSchema = new Schema<IAffiliateCommissionDocument>(
  {
    affiliateId: { type: Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, unique: true },
    subscriptionAmount: { type: Number, required: true, min: 0 },
    commissionPercentage: { type: Number, required: true, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'paid'], default: 'pending', index: true },
    paidAt: Date,
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

affiliateCommissionSchema.index({ affiliateId: 1, createdAt: -1 });
affiliateCommissionSchema.index({ tenantId: 1, createdAt: -1 });

export const AffiliateCommission = mongoose.model<IAffiliateCommissionDocument>('AffiliateCommission', affiliateCommissionSchema);
