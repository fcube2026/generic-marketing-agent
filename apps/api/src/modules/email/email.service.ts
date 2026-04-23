import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email service ready (${host}:${port}, user=${user})`);
    } else {
      this.logger.warn(
        'SMTP_HOST / SMTP_USER / SMTP_PASS not set — emails will be logged only (no mail sent)',
      );
    }
  }

  async sendPasswordResetEmail(
    toEmail: string,
    toName: string,
    resetUrl: string,
  ): Promise<void> {
    const from =
      process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@curex24.com';
    const subject = 'Reset your Curex24 Admin password';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;background:#f9fafb;border-radius:8px;">
        <h2 style="color:#0d9488;margin-bottom:4px;">Curex24 Admin Portal</h2>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:24px;"/>
        <p style="font-size:15px;color:#374151;">Hi <strong>${toName}</strong>,</p>
        <p style="font-size:15px;color:#374151;">
          We received a request to reset the password for your Curex24 Admin account
          (<strong>${toEmail}</strong>).
        </p>
        <p style="font-size:15px;color:#374151;">Click the button below to set a new password.
          This link expires in <strong>1 hour</strong>.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}"
             style="background:#0d9488;color:#fff;padding:14px 32px;border-radius:6px;
                    text-decoration:none;font-size:15px;font-weight:600;">
            Reset Password
          </a>
        </div>
        <p style="font-size:13px;color:#6b7280;">
          If you didn't request a password reset, you can safely ignore this email —
          your password will not be changed.
        </p>
        <p style="font-size:13px;color:#6b7280;margin-top:24px;">
          — The Curex24 Team
        </p>
      </div>
    `;

    if (!this.transporter) {
      // Dev / staging without SMTP configured: just log the link
      this.logger.warn(
        `[EMAIL NOT SENT] Password reset link for ${toEmail}: ${resetUrl}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({ from, to: toEmail, subject, html });
      this.logger.log(`Password reset email sent to ${toEmail}`);
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${toEmail}: ${err.message}`,
      );
      throw err;
    }
  }
}
