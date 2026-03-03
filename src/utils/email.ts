import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Create transporter immediately if SMTP configured
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: parseInt(env.SMTP_PORT || '587'),
          secure: parseInt(env.SMTP_PORT || '587') === 465,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });
        this.isInitialized = true;
        logger.info('✅ Email service initialized with SMTP configuration');
      } catch (error) {
        logger.error('❌ Failed to initialize SMTP transporter:', error);
        this.createFailsafeTransporter();
      }
    } else {
      // Use failsafe mode (development without SMTP)
      logger.warn('⚠️  SMTP not configured. Using failsafe email mode (emails logged only)');
      this.createFailsafeTransporter();
    }
  }

  private createFailsafeTransporter(): void {
    // Failsafe transporter that logs emails without sending
    this.transporter = nodemailer.createTransport({
      streamTransport: true,
      logger: true,
      debug: true,
    } as any);
    this.isInitialized = true;
    logger.info('✅ Email service initialized in failsafe mode (logging only)');
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized && this.transporter) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      // Give initialization 500ms to complete
      setTimeout(() => {
        resolve();
      }, 500);
    });

    await this.initPromise;
  }

  async sendUserInvitation(
    email: string,
    firstName: string,
    resetToken: string,
    tenantName: string
  ): Promise<boolean> {
    try {
      await this.ensureInitialized();

      if (!this.transporter) {
        logger.warn(`📧 Email mode: Failsafe - Invitation would be sent to ${email}`);
        return true; // Return true to not block user creation
      }

      const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to ${tenantName}!</h1>
              </div>
              <div class="content">
                <p>Hi ${firstName},</p>
                <p>You have been invited to join <strong>${tenantName}</strong> on our Stock Inventory Management System.</p>
                <p>Please click the button below to set your password and log in:</p>
                <a href="${resetUrl}" class="button">Set Password & Login</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you have any questions, please contact your administrator.</p>
                <hr>
                <p style="font-size: 12px; color: #6b7280;">If the button doesn't work, copy and paste this link in your browser:<br>${resetUrl}</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 Stock Inventory System. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions: EmailOptions = {
        to: email,
        subject: `Invitation to join ${tenantName}`,
        html,
      };

      // Send email asynchronously without blocking
      this.transporter
        .sendMail({
          from: env.EMAIL_FROM || 'noreply@stockinventory.com',
          ...mailOptions,
        })
        .then((info) => {
          logger.info(`✅ Invitation email sent to ${email}`, {
            messageId: info.messageId,
          });
        })
        .catch((error) => {
          logger.error(`❌ Failed to send invitation email to ${email}:`, error);
        });

      return true; // Return success even if email fails (async)
    } catch (error) {
      logger.error(`❌ Error in sendUserInvitation: ${error}`);
      return true; // Don't block user creation if email service fails
    }
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<boolean> {
    try {
      await this.ensureInitialized();

      if (!this.transporter) {
        logger.warn(`📧 Email mode: Failsafe - Password reset email would be sent to ${email}`);
        return true; // Return true to not block password reset
      }

      const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 5px 5px; }
              .button { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hi ${firstName},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <a href="${resetUrl}" class="button">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p><strong>If you didn't request this, please ignore this email or contact support.</strong></p>
                <hr>
                <p style="font-size: 12px; color: #6b7280;">If the button doesn't work, copy and paste this link in your browser:<br>${resetUrl}</p>
              </div>
              <div class="footer">
                <p>&copy; 2026 Stock Inventory System. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions: EmailOptions = {
        to: email,
        subject: 'Password Reset Request',
        html,
      };

      // Send email asynchronously without blocking
      this.transporter
        .sendMail({
          from: env.EMAIL_FROM || 'noreply@stockinventory.com',
          ...mailOptions,
        })
        .then((info) => {
          logger.info(`✅ Password reset email sent to ${email}`, {
            messageId: info.messageId,
          });
        })
        .catch((error) => {
          logger.error(`❌ Failed to send password reset email to ${email}:`, error);
        });

      return true; // Return success even if email fails (async)
    } catch (error) {
      logger.error(`❌ Error in sendPasswordResetEmail: ${error}`);
      return true; // Don't block password reset if email service fails
    }
  }
}

export const emailService = new EmailService();
