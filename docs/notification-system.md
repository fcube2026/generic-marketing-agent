# Notification System Documentation

## Overview

The Curex24 notification system supports multi-channel notifications with the following channels:
- **Push Notifications** - Mobile app notifications via Expo Push Service
- **WhatsApp** - Primary messaging channel via Twilio WhatsApp Business API
- **SMS** - Fallback messaging channel via Twilio SMS
- **In-App** - Persistent notifications stored in database

## Architecture

### Queue-Based Processing

Notifications are processed asynchronously using BullMQ with Redis:
- `NOTIFICATION_QUEUE` - Main queue for processing notifications
- `FALLBACK_QUEUE` - Queue for WhatsApp→SMS fallback after 5-minute timeout

### Feature Flags

Control notification channels via environment variables:
- `FEATURE_PUSH_NOTIFICATIONS` - Enable/disable push notifications (default: true)
- `FEATURE_WHATSAPP_NOTIFICATIONS` - Enable/disable WhatsApp (default: true)
- `FEATURE_SMS_NOTIFICATIONS` - Enable/disable SMS (default: true)
- `FEATURE_NOTIFICATION_QUEUE` - Enable/disable async queue processing (default: true)
- `FEATURE_APPOINTMENT_REMINDERS` - Enable/disable scheduled reminders (default: true)

## Environment Variables

### Required for Twilio (SMS & WhatsApp)

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890          # For SMS
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890  # For WhatsApp (or use sandbox: whatsapp:+14155238886)
```

### Required for Queue Processing

```bash
REDIS_URL=redis://localhost:6379
```

### Optional Configuration

```bash
WHATSAPP_STATUS_CALLBACK_URL=https://your-api.com/api/v1/notifications/webhook/twilio
```

## API Endpoints

### User Notifications

```
GET  /api/v1/notifications/me                 - Get user's notifications
GET  /api/v1/notifications/me/unread-count    - Get unread count
PUT  /api/v1/notifications/:id/read           - Mark notification as read
PUT  /api/v1/notifications/me/read-all        - Mark all as read
```

### Device Tokens

```
POST /api/v1/notifications/device-token       - Register device token
PUT  /api/v1/notifications/device-token/unregister - Unregister token
```

### Preferences

```
GET  /api/v1/notifications/me/preferences     - Get notification preferences
PUT  /api/v1/notifications/me/preferences     - Update preferences
```

Preference fields:
- `pushEnabled` - Enable push notifications
- `smsEnabled` - Enable SMS notifications
- `whatsappEnabled` - Enable WhatsApp notifications
- `emailEnabled` - Enable email notifications (future)
- `bookingUpdates` - Enable booking-related notifications
- `paymentUpdates` - Enable payment-related notifications
- `reminderEnabled` - Enable appointment reminders
- `marketingEnabled` - Enable marketing notifications

### Notification Logs

```
GET  /api/v1/notifications/me/logs            - Get delivery logs
```

### Webhooks

```
POST /api/v1/notifications/webhook/twilio     - Twilio status callback (public)
```

## Notification Types

### Patient Notifications

| Type | Push | WhatsApp | SMS Fallback |
|------|------|----------|--------------|
| BOOKING_ACCEPTED | ✓ | ✓ | ✓ |
| BOOKING_DECLINED | ✓ | ✓ | ✓ |
| BOOKING_CANCELLED | ✓ | ✓ | ✓ |
| PROVIDER_ON_THE_WAY | ✓ | ✓ | ✓ |
| PROVIDER_ARRIVED | ✓ | ✓ | ✓ |
| CONSULTATION_COMPLETED | ✓ | ✓ | ✓ |
| LAB_RESULT_READY | ✓ | ✓ | ✓ |
| PAYMENT_SUCCESS | ✓ | ✓ | ✓ |
| PAYMENT_REFUNDED | ✓ | ✓ | ✓ |
| APPOINTMENT_REMINDER | ✓ | ✓ | ✓ |
| PRESCRIPTION_UPLOADED | ✓ | ✓ | ✓ |
| DIAGNOSTIC_BOOKED | ✓ | ✓ | ✓ |

### Provider Notifications

| Type | Push | WhatsApp | SMS Fallback |
|------|------|----------|--------------|
| BOOKING_REQUEST | ✓ | ✓ | ✓ |
| BOOKING_CANCELLED_BY_PATIENT | ✓ | ✓ | ✓ |
| PAYOUT_PROCESSED | ✓ | ✓ | ✓ |
| PROVIDER_APPOINTMENT_REMINDER | ✓ | ✓ | ✓ |
| PROVIDER_APPROVED | ✓ | ✓ | ✓ |
| PROVIDER_REJECTED | ✓ | ✓ | ✓ |
| NMC_VERIFICATION_SUCCESS | ✓ | ✓ | ✓ |

## WhatsApp→SMS Fallback

The system implements an intelligent fallback mechanism:

1. **WhatsApp First**: Notifications are sent via WhatsApp as the primary channel
2. **5-Minute Timeout**: A fallback job is scheduled for 5 minutes later
3. **Status Check**: The fallback job checks WhatsApp delivery status
4. **SMS Fallback**: If WhatsApp status is not "delivered", SMS is sent

### Fallback Triggers

- WhatsApp message still "pending" after 5 minutes
- WhatsApp message still "sent" (not delivered) after 5 minutes
- WhatsApp message "failed" or "undelivered"

### Immediate SMS Triggers

- User has WhatsApp disabled in preferences
- WhatsApp API error during send

## Idempotency

Prevent duplicate notifications using idempotency keys:

```typescript
await notificationsService.sendNotification(payload, {
  idempotencyKey: `booking_${bookingId}`,
  // ... other options
});
```

Idempotency window: 24 hours

## Scheduled Jobs

### Appointment Reminders

- **24-hour reminder**: Sent hourly for appointments in the next 24-25 hours
- **1-hour reminder**: Sent every 30 minutes for appointments in the next 1-1.5 hours

Both reminders are sent to patients and providers.

## Database Schema

### NotificationLog Model

Tracks delivery status for all notification channels:

```prisma
model NotificationLog {
  id                String                    @id @default(cuid())
  userId            String
  eventType         String
  channel           NotificationChannel       // PUSH, SMS, WHATSAPP, EMAIL
  status            NotificationDeliveryStatus // PENDING, SENT, DELIVERED, FAILED, FALLBACK_TRIGGERED
  providerMessageId String?                   // Twilio SID
  idempotencyKey    String?
  metadata          Json?
  errorMessage      String?
  retryCount        Int
  sentAt            DateTime?
  deliveredAt       DateTime?
  failedAt          DateTime?
  createdAt         DateTime
  updatedAt         DateTime
}
```

### NotificationPreference Model

```prisma
model NotificationPreference {
  id               String  @id @default(cuid())
  userId           String  @unique
  pushEnabled      Boolean @default(true)
  smsEnabled       Boolean @default(true)
  whatsappEnabled  Boolean @default(true)
  emailEnabled     Boolean @default(false)
  bookingUpdates   Boolean @default(true)
  paymentUpdates   Boolean @default(true)
  reminderEnabled  Boolean @default(true)
  marketingEnabled Boolean @default(false)
}
```

## Usage Examples

### Send Multi-Channel Notification

```typescript
await this.notificationsService.sendNotification(
  {
    userId: 'user-123',
    title: 'Booking Accepted',
    message: 'Your booking has been accepted by Dr. Smith',
    type: 'BOOKING_ACCEPTED',
    metadata: { bookingId: 'booking-456' },
  },
  {
    inApp: true,
    push: true,
    whatsapp: true,
    sms: false, // WhatsApp will fallback to SMS if needed
    whatsappTemplate: 'BOOKING_ACCEPTED',
    templateParams: {
      providerName: 'Dr. Smith',
      scheduledTime: 'Apr 15, 10:00 AM',
    },
    idempotencyKey: `booking_accepted_${bookingId}`,
  },
);
```

### Check Feature Flags

```typescript
if (this.featureFlags.isWhatsappNotificationsEnabled()) {
  // Send WhatsApp
}
```

### Update Delivery Status (Webhook)

```typescript
await this.notificationsService.updateDeliveryStatus(
  messageId,
  'delivered', // or 'failed', 'read'
  errorMessage,
);
```
