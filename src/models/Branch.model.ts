import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface IBranchDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  code: string;
  address: string;
  phone?: string;
  email?: string;
  manager?: Types.ObjectId;
  isActive: boolean;
  isHeadOffice: boolean;
  currency: string;
  timezone: string;
}

const branchSchema = new Schema<IBranchDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  phone: String,
  email: String,
  manager: { type: Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  isHeadOffice: { type: Boolean, default: false },
  currency: { type: String, default: 'USD' },
  timezone: { type: String, default: 'UTC' },
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

branchSchema.plugin(paginate);

export const Branch = mongoose.model<IBranchDocument, mongoose.PaginateModel<IBranchDocument>>('Branch', branchSchema);
