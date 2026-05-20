import mongoose, { Schema, Document, Types } from 'mongoose';
import paginate from 'mongoose-paginate-v2';

export interface IFeedbackDocument extends Document {
  tenantId: Types.ObjectId;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: 'bug' | 'feature' | 'improvement' | 'other';
  status: 'new' | 'read' | 'responded' | 'closed';
  rating?: number; // 1-5 star rating
  response?: string;
  respondedBy?: Types.ObjectId; // User who responded
  respondedAt?: Date;
  attachments?: string[]; // URLs to attached files
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedbackDocument>(
  {
    tenantId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Tenant', 
      required: true, 
      index: true 
    },
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      lowercase: true,
      trim: true,
      match: /.+\@.+\..+/ // Basic email validation
    },
    subject: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 200
    },
    message: { 
      type: String, 
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 5000
    },
    category: { 
      type: String, 
      enum: ['bug', 'feature', 'improvement', 'other'],
      default: 'other',
      index: true
    },
    status: { 
      type: String, 
      enum: ['new', 'read', 'responded', 'closed'],
      default: 'new',
      index: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    response: {
      type: String,
      trim: true,
      maxlength: 5000
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date,
    attachments: [String]
  },
  { 
    timestamps: true,
    toJSON: {
      transform: (_: any, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      }
    }
  }
);

feedbackSchema.plugin(paginate);

export const Feedback = mongoose.model<IFeedbackDocument, any>('Feedback', feedbackSchema);
