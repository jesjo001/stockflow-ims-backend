import crypto from 'crypto';

/**
 * Generate a password reset token
 * Returns: hashed token (to be saved to DB), plain token (to be sent to user)
 */
export const generatePasswordResetToken = (): { hashedToken: string; plainToken: string } => {
  const plainToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(plainToken).digest('hex');
  
  return {
    plainToken,
    hashedToken,
  };
};

/**
 * Hash a password reset token
 */
export const hashPasswordResetToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate password reset expiry time (1 hour from now)
 */
export const getPasswordResetExpiry = (): Date => {
  return new Date(Date.now() + 60 * 60 * 1000); // 1 hour
};
