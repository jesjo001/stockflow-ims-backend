import { StatusCodes } from 'http-status-codes';
import { Tenant } from '../models/Tenant.model';
import { ApiError } from './ApiError';

type PlanName = 'free' | 'starter' | 'professional' | 'enterprise';

type PlanLimit = {
  maxProducts: number;
  maxUsers: number;
  maxBranches: number;
};

const PLAN_LIMITS: Record<PlanName, PlanLimit> = {
  free: {
    maxProducts: 100,
    maxUsers: 1,
    maxBranches: 1,
  },
  starter: {
    maxProducts: 3000,
    maxUsers: 3,
    maxBranches: 2,
  },
  professional: {
    maxProducts: 5000,
    maxUsers: 10,
    maxBranches: 5,
  },
  enterprise: {
    maxProducts: Number.POSITIVE_INFINITY,
    maxUsers: Number.POSITIVE_INFINITY,
    maxBranches: Number.POSITIVE_INFINITY,
  },
};

export const getTenantPlanLimits = async (tenantId: string): Promise<PlanLimit> => {
  const tenant = await Tenant.findById(tenantId).select('billingPlan');
  if (!tenant) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tenant not found');
  }

  return PLAN_LIMITS[(tenant.billingPlan || 'free') as PlanName] || PLAN_LIMITS.free;
};

export const enforceTenantResourceLimit = (
  currentCount: number,
  limit: number,
  resourceLabel: string
) => {
  if (Number.isFinite(limit) && currentCount >= limit) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Your current plan limit for ${resourceLabel} has been reached (${limit}). Upgrade your plan to continue.`
    );
  }
};
