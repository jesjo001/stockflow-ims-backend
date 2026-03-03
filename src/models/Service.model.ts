import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface IServiceDocument extends Document {
  tenantId: Types.ObjectId;
  type: string;
  category: 'medical' | 'electronics' | 'other';
  customer: string;
  description?: string;
  charge: number;
  status: 'completed' | 'in-progress' | 'pending';
  attendedBy: string;
  date: Date;
  branch: Types.ObjectId;
}

const serviceSchema = new Schema<IServiceDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  type: { type: String, required: true },
  category: { type: String, enum: ['medical', 'electronics', 'other'], default: 'other' },
  customer: { type: String, required: true },
  description: String,
  charge: { type: Number, required: true },
  status: { type: String, enum: ['completed', 'in-progress', 'pending'], default: 'pending' },
  attendedBy: { type: String, required: true },
  date: { type: Date, default: Date.now },
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

serviceSchema.plugin(paginate);

export const Service = mongoose.model<IServiceDocument, mongoose.PaginateModel<IServiceDocument>>('Service', serviceSchema);
