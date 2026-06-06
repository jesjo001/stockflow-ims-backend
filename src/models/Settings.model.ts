import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISettingsDocument extends Document {
  tenantId: Types.ObjectId;
  // Company
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
  timezone?: string;
  logo?: string;
  // Tax
  taxRate?: number;
  taxId?: string;
  taxInclusive?: boolean;
  // Invoice
  invoiceHeader?: string;
  invoiceFooter?: string;
  invoiceAccentColor?: string;
  invoiceShowLogo?: boolean;
  invoiceAutoSendEmail?: boolean;
  // Notifications
  notifyLowStock?: boolean;
  notifyNewOrder?: boolean;
  notifyDailySummary?: boolean;
  notifyExpiry?: boolean;
  // Backup
  autoBackup?: boolean;
}

const settingsSchema = new Schema<ISettingsDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    companyName: String,
    email: String,
    phone: String,
    address: String,
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'America/Los_Angeles' },
    logo: String,
    taxRate: { type: Number, default: 10 },
    taxId: String,
    taxInclusive: { type: Boolean, default: true },
    invoiceHeader: { type: String, default: 'INVOICE' },
    invoiceFooter: { type: String, default: 'Thank you for your business!' },
    invoiceAccentColor: { type: String, default: '#6366F1' },
    invoiceShowLogo: { type: Boolean, default: true },
    invoiceAutoSendEmail: { type: Boolean, default: false },
    notifyLowStock: { type: Boolean, default: true },
    notifyNewOrder: { type: Boolean, default: true },
    notifyDailySummary: { type: Boolean, default: false },
    notifyExpiry: { type: Boolean, default: true },
    autoBackup: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_: unknown, ret: Record<string, unknown>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const Settings = mongoose.model<ISettingsDocument>('Settings', settingsSchema);
