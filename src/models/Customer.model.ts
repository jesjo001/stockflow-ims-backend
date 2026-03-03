import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface ICustomerDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  creditLimit: number;
  creditBalance: number;
  totalPurchases: number;
  isActive: boolean;
  branch: Types.ObjectId;
}

const customerSchema = new Schema<ICustomerDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, required: true },
  address: String,
  creditLimit: { type: Number, default: 0 },
  creditBalance: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
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

customerSchema.plugin(paginate);

export const Customer = mongoose.model<ICustomerDocument, mongoose.PaginateModel<ICustomerDocument>>('Customer', customerSchema);
