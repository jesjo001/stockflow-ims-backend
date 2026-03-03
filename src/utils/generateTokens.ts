import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const generateAccessToken = (userId: string, tenantId: string) => {
  const expiresIn = env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'];
  return jwt.sign({ id: userId, tenantId }, env.JWT_ACCESS_SECRET, {
    expiresIn,
  });
};

export const generateRefreshToken = (userId: string, tenantId: string) => {
  const expiresIn = env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn'];
  return jwt.sign({ id: userId, tenantId }, env.JWT_REFRESH_SECRET, {
    expiresIn,
  });
};
