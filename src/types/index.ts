import { Types } from 'mongoose';

export type Role = 'super_admin' | 'admin' | 'manager' | 'cashier' | 'stock_clerk' | 'viewer';

export interface IUser {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  tenantId: Types.ObjectId;
  branch?: Types.ObjectId;
  isActive: boolean;
}

export interface PaginationMeta {
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}
