import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface ICategoryDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  parentId?: Types.ObjectId;
  isActive: boolean;
  branch: Types.ObjectId;
}

const categorySchema = new Schema<ICategoryDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  parentId: { type: Schema.Types.ObjectId, ref: 'Category' },
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

categorySchema.plugin(paginate);

export const Category = mongoose.model<ICategoryDocument, mongoose.PaginateModel<ICategoryDocument>>('Category', categorySchema);
