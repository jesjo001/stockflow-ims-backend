import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface IAuditLogDocument extends Document {
  tenantId: Types.ObjectId;
  user: Types.ObjectId;
  action: string;
  targetModel: string;
  documentId: Types.ObjectId;
  before?: any;
  after?: any;
  ipAddress: string;
  userAgent: string;
}

const auditLogSchema = new Schema<IAuditLogDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetModel: { type: String, required: true },
  documentId: { type: Schema.Types.ObjectId, required: true },
  before: Schema.Types.Mixed,
  after: Schema.Types.Mixed,
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
}, { 
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: {
    transform: (_: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

auditLogSchema.plugin(paginate);

export const AuditLog = mongoose.model<IAuditLogDocument, mongoose.PaginateModel<IAuditLogDocument>>('AuditLog', auditLogSchema);
