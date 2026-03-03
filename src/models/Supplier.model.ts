import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface ISupplierDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  paymentTerms: number;
  leadTime: number;
  taxId?: string;
  bankDetails?: any;
  isActive: boolean;
  totalPurchases: number;
  totalPayable: number;
}

const supplierSchema = new Schema<ISupplierDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  contactPerson: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  paymentTerms: { type: Number, default: 0 },
  leadTime: { type: Number, default: 0 },
  taxId: String,
  bankDetails: Schema.Types.Mixed,
  isActive: { type: Boolean, default: true },
  totalPurchases: { type: Number, default: 0 },
  totalPayable: { type: Number, default: 0 },
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

supplierSchema.plugin(paginate);

export const Supplier = mongoose.model<ISupplierDocument, mongoose.PaginateModel<ISupplierDocument>>('Supplier', supplierSchema);
