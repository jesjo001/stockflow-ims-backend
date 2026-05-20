import mongoose, { Document, Schema } from 'mongoose';

export interface IPlatformSettingDocument extends Document {
  key: 'global';
  defaultAffiliatePercentage: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const platformSettingSchema = new Schema<IPlatformSettingDocument>(
  {
    key: { type: String, default: 'global', unique: true },
    defaultAffiliatePercentage: { type: Number, default: 10, min: 0, max: 100 },
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

export const PlatformSetting = mongoose.model<IPlatformSettingDocument>('PlatformSetting', platformSettingSchema);
