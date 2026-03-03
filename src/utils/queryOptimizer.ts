/**
 * Query Optimization Utilities for MongoDB Performance
 * Use for read-heavy operations in cPanel/VPS environments
 */

import { Document, Query } from 'mongoose';

/**
 * Optimize query for faster execution (read-only operations)
 * @param query - Mongoose query to optimize
 * @param useLean - Use lean() for minimal document objects (default: true for query optimization)
 * @returns Optimized query
 */
export const optimizeQuery = <T extends Document>(
  query: Query<any, T>,
  useLean: boolean = true,
): Query<any, T> => {
  if (useLean) {
    query = query.lean() as Query<any, T>;
  }
  // Exclude unnecessary fields by default (can be overridden with select())
  return query.select({ __v: 0 }); // Remove version field
};

/**
 * Batch optimize query with lean + select + limit
 * Best for list endpoints
 */
export const optimizeListQuery = <T extends Document>(
  query: Query<any, T>,
  limit: number = 50,
  fields?: string[],
): Query<any, T> => {
  let optimized = query.lean() as Query<any, T>;
  
  if (fields && fields.length > 0) {
    optimized = optimized.select(fields.join(' '));
  } else {
    optimized = optimized.select({ __v: 0 });
  }
  
  return optimized.limit(limit);
};

/**
 * Count query optimization (bypass document instantiation)
 */
export const optimizeCountQuery = <T extends Document>(
  query: Query<any, T>,
) => {
  return query.countDocuments();
};

/**
 * Pagination helper with optimized queries
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  fields?: string[];
}

export const createPaginatedQuery = <T extends Document>(
  query: Query<any, T>,
  options: PaginationOptions,
) => {
  const { page = 1, limit = 20, fields } = options;
  const skip = (page - 1) * limit;

  let optimized = query.lean() as Query<any, T>;
  
  if (fields && fields.length > 0) {
    optimized = optimized.select(fields.join(' '));
  }
  
  return optimized
    .skip(skip)
    .limit(Math.min(limit, 100)); // Cap limit at 100 to prevent abuse
};
