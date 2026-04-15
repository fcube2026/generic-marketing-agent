import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsTemplate {
  type: string;
  template: (params: Record<string, string>) => string;
}

// SMS Templates for different notification scenarios
export const SMS_TEMPLATES: Record<
  string,
  (params: Record<string, string>) => string
> = {
  // OTP
  OTP: (p) =>
    `Your Curex24 verification code is: ${p.otp}. Valid for 10 minutes.`,

  // Patient notifications
  BOOKING_ACCEPTED: (p) =>
    `Your booking has been accepted by Dr. ${p.providerName}. Scheduled: ${p.scheduledTime}. - Curex24`,
  BOOKING_DECLINED: (p) =>
    `Your booking request was declined${p.reason ? `: ${p.reason}` : ''}. Please try another provider. - Curex24`,
  PROVIDER_ON_THE_WAY: (p) =>
    `Dr. ${p.providerName} is on the way to your location. ETA: ~${p.eta || '30'} mins. - Curex24`,
  PROVIDER_ARRIVED: (p) =>
    `Dr. ${p.providerName} has arrived at your location. - Curex24`,
  CONSULTATION_COMPLETED: (p) =>
    `Your consultation with Dr. ${p.providerName} is complete. View summary in the app. - Curex24`,
  LAB_RESULT_READY: (p) =>
    `Your lab results for "${p.testType}" are now available. Check the Curex24 app. - Curex24`,
  PAYMENT_SUCCESS: (p) =>
    `Payment of ₹${p.amount} received for your booking. Thank you! - Curex24`,
  REFUND_PROCESSED: (p) =>
    `Refund of ₹${p.amount} has been processed for your cancelled booking. - Curex24`,
  APPOINTMENT_REMINDER: (p) =>
    `Reminder: Your appointment with Dr. ${p.providerName} is scheduled for ${p.scheduledTime}. - Curex24`,

  // Provider notifications
  NEW_BOOKING_REQUEST: (p) =>
    `New ${p.mode} booking request from ${p.patientName}. Scheduled: ${p.scheduledTime}. Review in app. - Curex24`,
  BOOKING_CANCELLED_BY_PATIENT: (p) =>
    `Booking cancelled by patient ${p.patientName}. Scheduled: ${p.scheduledTime}. - Curex24`,
  PAYOUT_PROCESSED: (p) =>
    `Payout of ₹${p.amount} has been processed to your account. - Curex24`,
  PROVIDER_APPOINTMENT_REMINDER: (p) =>
    `Reminder: You have an appointment with ${p.patientName} at ${p.scheduledTime}. - Curex24`,

  // Admin-triggered notifications
  PROVIDER_APPROVED: (_p) =>
    `Congratulations! Your Curex24 provider account has been approved. You can now accept bookings. - Curex24`,
  PROVIDER_REJECTED: (p) =>
    `Your Curex24 provider verification was not approved${p.reason ? `: ${p.reason}` : ''}. Contact support for help. - Curex24`,
  PROVIDER_DEACTIVATED: (p) =>
    `Your Curex24 provider account has been deactivated${p.reason ? `: ${p.reason}` : ''}. Contact support for assistance. - Curex24`,
  NMC_VERIFICATION_SUCCESS: (p) =>
    `Your medical registration (${p.registrationNumber}) has been verified successfully. - Curex24`,
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    this.accountSid =
      this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.fromNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';
    this.enabled = !!(this.accountSid && this.authToken && this.fromNumber);

    if (!this.enabled) {
      this.logger.warn(
        'Twilio credentials not configured. SMS sending is disabled. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.',
      );
    }
  }

  /**
   * Send an SMS message using Twilio
   */
  async sendSms(
    message: SmsMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled) {
      this.logger.log(`[SMS MOCK] To: ${message.to}, Body: ${message.body}`);
      return { success: true, messageId: `mock_${Date.now()}` };
    }

    try {
      // Using fetch to call Twilio API directly (avoiding additional dependencies)
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const credentials = Buffer.from(
        `${this.accountSid}:${this.authToken}`,
      ).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: message.to,
          From: this.fromNumber,
          Body: message.body,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Twilio API error: ${JSON.stringify(data)}`);
        return { success: false, error: data.message || 'Failed to send SMS' };
      }

      this.logger.log(
        `SMS sent successfully to ${message.to}, SID: ${data.sid}`,
      );
      return { success: true, messageId: data.sid };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send SMS using a predefined template
   */
  async sendTemplatedSms(
    to: string,
    templateKey: string,
    params: Record<string, string>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = SMS_TEMPLATES[templateKey];
    if (!template) {
      this.logger.error(`SMS template not found: ${templateKey}`);
      return { success: false, error: `Template not found: ${templateKey}` };
    }

    const body = template(params);
    return this.sendSms({ to, body });
  }

  /**
   * Send OTP via SMS
   */
  async sendOtp(
    phone: string,
    otp: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendTemplatedSms(phone, 'OTP', { otp });
  }

  /**
   * Check if SMS service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
