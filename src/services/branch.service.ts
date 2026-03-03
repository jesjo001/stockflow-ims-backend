import { Branch, IBranchDocument } from '../models/Branch.model';
import { ApiError } from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';

export class BranchService {
  static async createBranch(data: any, tenantId: string) {
    const payload = { ...data };

    if (payload.manager === '') {
      delete payload.manager;
    }

    // Auto-generate branch code if not provided
    if (!payload.code) {
      const timestamp = Date.now().toString().slice(-6);
      const branchPrefix = payload.name.slice(0, 3).toUpperCase();
      payload.code = `${branchPrefix}_${timestamp}`;
    }

    return await Branch.create({ ...payload, tenantId });
  }

  static async updateBranch(id: string, data: any, tenantId: string) {
    const branch = await Branch.findOne({ _id: id, tenantId });
    if (!branch) throw new ApiError(StatusCodes.NOT_FOUND, 'Branch not found');
    Object.assign(branch, data);
    await branch.save();
    return branch;
  }

  static async getBranches(filters: any = {}, tenantId: string) {
    return await Branch.find({ ...filters, tenantId });
  }

  static async getBranchById(id: string, tenantId: string) {
    const branch = await Branch.findOne({ _id: id, tenantId });
    if (!branch) throw new ApiError(StatusCodes.NOT_FOUND, 'Branch not found');
    return branch;
  }
}
