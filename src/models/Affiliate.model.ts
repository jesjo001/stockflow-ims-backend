import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAffiliateDocument extends Document {
  name: string;
  email: string;
  code: string;
  commissionPercentage: number;
  isActive: boolean;
  totalEarnings: number;
  totalReferrals: number;
  totalPaid: number;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const affiliateSchema = new Schema<IAffiliateDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    code: { 
      type: String, 
      required: true, 
      trim: true, 
      unique: true, 
      index: true,
      set: (value: string) => value?.toUpperCase()
    },
    commissionPercentage: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    totalEarnings: { type: Number, default: 0 },
    totalReferrals: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    bankName: String,
    accountName: String,
    accountNumber: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
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

export const Affiliate = mongoose.model<IAffiliateDocument>('Affiliate', affiliateSchema);
