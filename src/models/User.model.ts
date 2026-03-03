import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import paginate from 'mongoose-paginate-v2';

export interface IUserDocument extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'super_admin' | 'admin' | 'manager' | 'cashier' | 'stock_clerk' | 'viewer';
  tenantId: Types.ObjectId;
  branch?: Types.ObjectId;
  avatar?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: Date;
  refreshToken?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  comparePassword(password: string): Promise<boolean>;
  changedPasswordAfter(JWTTimestamp: number): boolean;
}

const userSchema = new Schema<IUserDocument>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { 
    type: String, 
    enum: ['super_admin', 'admin', 'manager', 'cashier', 'stock_clerk', 'viewer'],
    default: 'viewer'
  },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
  avatar: String,
  phone: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  refreshToken: { type: String, select: false },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
}, { 
  timestamps: true,
  toJSON: {
    transform: (_: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
    }
  }
});

userSchema.plugin(paginate);

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp: number): boolean {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt((this.passwordChangedAt.getTime() / 1000).toString(), 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

export const User = mongoose.model<IUserDocument, mongoose.PaginateModel<IUserDocument>>('User', userSchema);
