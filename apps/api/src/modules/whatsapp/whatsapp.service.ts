import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppMessage {
  to: string;
  body: string;
  templateName?: string;
  templateParams?: Record<string, string>;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

/**
 * WhatsApp message templates mapped to notification types.
 * These should match pre-approved Twilio WhatsApp templates.
 * Template names use Twilio's content template format.
 */
export const WHATSAPP_TEMPLATES: Record<
  string,
  {
    templateSid?: string; // Twilio Content Template SID (optional for sandbox)
    body: (params: Record<string, string>) => string;
  }
> = {
  // OTP
  OTP: {
    body: (p) =>
      `🔐 Your Curex24 verification code is: *${p.otp}*\n\nValid for 10 minutes. Do not share this code.`,
  },

  // Patient notifications
  BOOKING_ACCEPTED: {
    body: (p) =>
      `✅ *Booking Confirmed!*\n\nYour booking with *Dr. ${p.providerName}* has been accepted.\n\n📅 Scheduled: ${p.scheduledTime}\n\nOpen the Curex24 app for more details.`,
  },
  BOOKING_DECLINED: {
    body: (p) =>
      `❌ *Booking Update*\n\nYour booking request was declined${p.reason ? `: ${p.reason}` : ''}.\n\nPlease try another provider on the Curex24 app.`,
  },
  PROVIDER_ON_THE_WAY: {
    body: (p) =>
      `🚗 *Doctor On The Way!*\n\n*Dr. ${p.providerName}* is heading to your location.\n\n⏱️ ETA: ~${p.eta || '30'} minutes\n\nTrack in the Curex24 app.`,
  },
  PROVIDER_ARRIVED: {
    body: (p) =>
      `📍 *Doctor Arrived!*\n\n*Dr. ${p.providerName}* has arrived at your location.`,
  },
  CONSULTATION_COMPLETED: {
    body: (p) =>
      `✅ *Consultation Complete*\n\nYour consultation with *Dr. ${p.providerName}* has been completed.\n\nView your consultation summary and prescription in the Curex24 app.`,
  },
  LAB_RESULT_READY: {
    body: (p) =>
      `🔬 *Lab Results Ready*\n\nYour lab results for "*${p.testType}*" are now available.\n\nView in the Curex24 app.`,
  },
  PAYMENT_SUCCESS: {
    body: (p) =>
      `💰 *Payment Received*\n\nWe've received your payment of *₹${p.amount}* for your booking.\n\nThank you for using Curex24!`,
  },
  REFUND_PROCESSED: {
    body: (p) =>
      `💸 *Refund Processed*\n\nA refund of *₹${p.amount}* has been processed for your cancelled booking.\n\nPlease allow 5-7 business days for the amount to reflect.`,
  },
  APPOINTMENT_REMINDER: {
    body: (p) =>
      `⏰ *Appointment Reminder*\n\nYou have an upcoming appointment with *Dr. ${p.providerName}*.\n\n📅 Scheduled: ${p.scheduledTime}\n\nOpen the Curex24 app for details.`,
  },
  PRESCRIPTION_UPLOADED: {
    body: (p) =>
      `💊 *Prescription Available*\n\nYour prescription from *Dr. ${p.providerName}* is now available.\n\nView and download in the Curex24 app.`,
  },
  DIAGNOSTIC_BOOKED: {
    body: (p) =>
      `🔬 *Diagnostic Test Booked*\n\nYour *${p.testType}* test has been scheduled${p.scheduledTime ? ` for ${p.scheduledTime}` : ''}.\n\nCheck the Curex24 app for details.`,
  },

  // Provider notifications
  NEW_BOOKING_REQUEST: {
    body: (p) =>
      `📋 *New Booking Request*\n\nYou have a new *${p.mode}* booking from *${p.patientName}*.\n\n📅 Scheduled: ${p.scheduledTime}\n\nReview and accept in the Curex24 app.`,
  },
  BOOKING_CANCELLED_BY_PATIENT: {
    body: (p) =>
      `❌ *Booking Cancelled*\n\nPatient *${p.patientName}* has cancelled their booking.\n\n📅 Was scheduled: ${p.scheduledTime}`,
  },
  PAYOUT_PROCESSED: {
    body: (p) =>
      `💰 *Payout Processed*\n\nYour payout of *₹${p.amount}* has been processed to your bank account.`,
  },
  PROVIDER_APPOINTMENT_REMINDER: {
    body: (p) =>
      `⏰ *Upcoming Appointment*\n\nYou have an appointment with *${p.patientName}*.\n\n📅 Scheduled: ${p.scheduledTime}\n\nOpen the Curex24 app for details.`,
  },

  // Admin-triggered notifications
  PROVIDER_APPROVED: {
    body: () =>
      `🎉 *Congratulations!*\n\nYour Curex24 provider account has been *approved*.\n\nYou can now start accepting bookings!`,
  },
  PROVIDER_REJECTED: {
    body: (p) =>
      `❌ *Verification Update*\n\nYour provider verification was not approved${p.reason ? `: ${p.reason}` : ''}.\n\nPlease contact support for assistance.`,
  },
  NMC_VERIFICATION_SUCCESS: {
    body: (p) =>
      `✅ *Verification Complete*\n\nYour medical registration (*${p.registrationNumber}*) has been verified successfully.`,
  },
};

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly enabled: boolean;
  private readonly useSandbox: boolean;

  constructor(private configService: ConfigService) {
    this.accountSid =
      this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
    // WhatsApp number format: whatsapp:+14155238886 (Twilio sandbox) or your approved number
    this.fromNumber =
      this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') ||
      'whatsapp:+14155238886'; // Default to Twilio sandbox
    this.useSandbox = this.fromNumber.includes('+14155238886');
    this.enabled = !!(this.accountSid && this.authToken);

    if (!this.enabled) {
      this.logger.warn(
        'Twilio credentials not configured. WhatsApp sending is disabled. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.',
      );
    } else if (this.useSandbox) {
      this.logger.warn(
        'Using Twilio WhatsApp sandbox. For production, configure TWILIO_WHATSAPP_NUMBER with your approved WhatsApp number.',
      );
    }
  }

  /**
   * Normalize phone number for WhatsApp
   * Twilio WhatsApp requires format: whatsapp:+91XXXXXXXXXX
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove any existing whatsapp: prefix
    let normalized = phone.replace(/^whatsapp:/, '');

    // Ensure it has country code (default to India +91)
    if (!normalized.startsWith('+')) {
      if (normalized.startsWith('91')) {
        normalized = '+' + normalized;
      } else if (normalized.length === 10) {
        normalized = '+91' + normalized;
      } else {
        normalized = '+' + normalized;
      }
    }

    return `whatsapp:${normalized}`;
  }

  /**
   * Send a WhatsApp message using Twilio
   */
  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResult> {
    if (!this.enabled) {
      this.logger.log(
        `[WHATSAPP MOCK] To: ${message.to}, Body: ${message.body}`,
      );
      return {
        success: true,
        messageId: `mock_wa_${Date.now()}`,
        status: 'queued',
      };
    }

    try {
      const toNumber = this.normalizePhoneNumber(message.to);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const credentials = Buffer.from(
        `${this.accountSid}:${this.authToken}`,
      ).toString('base64');

      const body: Record<string, string> = {
        To: toNumber,
        From: this.fromNumber,
        Body: message.body,
      };

      // Add status callback URL if configured
      const callbackUrl = this.configService.get<string>(
        'WHATSAPP_STATUS_CALLBACK_URL',
      );
      if (callbackUrl) {
        body.StatusCallback = callbackUrl;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Twilio WhatsApp API error: ${JSON.stringify(data)}`);
        return {
          success: false,
          error: data.message || 'Failed to send WhatsApp message',
        };
      }

      this.logger.log(
        `WhatsApp message sent to ${message.to}, SID: ${data.sid}, Status: ${data.status}`,
      );
      return { success: true, messageId: data.sid, status: data.status };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message: ${error}`);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send WhatsApp message using a predefined template
   */
  async sendTemplatedMessage(
    to: string,
    templateKey: string,
    params: Record<string, string>,
  ): Promise<WhatsAppResult> {
    const template = WHATSAPP_TEMPLATES[templateKey];
    if (!template) {
      this.logger.error(`WhatsApp template not found: ${templateKey}`);
      return {
        success: false,
        error: `Template not found: ${templateKey}`,
      };
    }

    const body = template.body(params);
    return this.sendMessage({
      to,
      body,
      templateName: templateKey,
      templateParams: params,
    });
  }

  /**
   * Check if WhatsApp service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if using sandbox mode
   */
  isSandbox(): boolean {
    return this.useSandbox;
  }

  /**
   * Process a status callback from Twilio
   * Status values: queued, failed, sent, delivered, undelivered, read
   */
  parseStatusCallback(body: Record<string, string>): {
    messageId: string;
    status: string;
    errorCode?: string;
    errorMessage?: string;
  } | null {
    if (!body.MessageSid || !body.MessageStatus) {
      return null;
    }

    return {
      messageId: body.MessageSid,
      status: body.MessageStatus,
      errorCode: body.ErrorCode,
      errorMessage: body.ErrorMessage,
    };
  }
}
