import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface INotificationDocument extends Document {
  tenantId: Types.ObjectId;
  type: 'low_stock' | 'expiry' | 'new_order' | 'system' | 'payment';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  isRead: boolean;
  targetUser?: Types.ObjectId;
  targetBranch?: Types.ObjectId;
  relatedId?: Types.ObjectId;
  relatedModel?: string;
}

const notificationSchema = new Schema<INotificationDocument>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  type: { 
    type: String, 
    enum: ['low_stock', 'expiry', 'new_order', 'system', 'payment'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  severity: { 
    type: String, 
    enum: ['info', 'warning', 'error'],
    default: 'info'
  },
  isRead: { type: Boolean, default: false },
  targetUser: { type: Schema.Types.ObjectId, ref: 'User' },
  targetBranch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  relatedId: Schema.Types.ObjectId,
  relatedModel: String,
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

notificationSchema.index({ targetUser: 1, isRead: 1 });
notificationSchema.index({ targetBranch: 1, isRead: 1 });

notificationSchema.plugin(paginate);

export const Notification = mongoose.model<INotificationDocument, mongoose.PaginateModel<INotificationDocument>>('Notification', notificationSchema);
