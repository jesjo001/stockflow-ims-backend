import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface ITenantDocument extends Document {
  name: string;
  code: string;
  superAdminId?: Types.ObjectId; // Optional - set after user creation
  email?: string;
  phone?: string;
  logo?: string;
  address?: string;
  city?: string;
  country?: string;
  billingPlan: 'starter' | 'professional' | 'enterprise';
  isActive: boolean;
  maxUsers: number;
  maxBranches: number;
}

const tenantSchema = new Schema<ITenantDocument>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, trim: true },
  superAdminId: { type: Schema.Types.ObjectId, ref: 'User' }, // Optional - set after user creation
  email: String,
  phone: String,
  logo: String,
  address: String,
  city: String,
  country: String,
  billingPlan: { 
    type: String, 
    enum: ['starter', 'professional', 'enterprise'],
    default: 'starter'
  },
  isActive: { type: Boolean, default: true },
  maxUsers: { type: Number, default: 10 },
  maxBranches: { type: Number, default: 1 },
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

tenantSchema.plugin(paginate);

export const Tenant = mongoose.model<ITenantDocument, mongoose.PaginateModel<ITenantDocument>>('Tenant', tenantSchema);
