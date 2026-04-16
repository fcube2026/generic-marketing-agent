# Push Notifications and SMS Testing Guide

This guide covers testing push notifications and SMS functionality in Curex24.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Backend Configuration](#backend-configuration)
3. [Mobile App Setup](#mobile-app-setup)
4. [Testing Scenarios](#testing-scenarios)
5. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### Required Environment Variables

Add the following to your `.env` file:

```env
# SMS (Twilio) - Optional for development
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications (Expo) - Optional but recommended
EXPO_ACCESS_TOKEN=your_expo_access_token
```

### Development Mode

When Twilio credentials are not configured:
- SMS messages are logged to console instead of being sent
- All SMS functions return mock success responses

When Expo access token is not configured:
- Push notifications still work but with lower rate limits
- Recommended to use for production

---

## Backend Configuration

### Database Migration

Ensure the migration for device tokens and notification preferences is applied:

```bash
pnpm --filter @curex24/database db:generate
# In staging/production:
pnpm --filter @curex24/database exec prisma migrate deploy
```

### Verifying Backend Setup

1. Start the API server:
   ```bash
   pnpm --filter @curex24/api dev
   ```

2. Test device token registration endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/v1/notifications/device-token \
     -H "Authorization: Bearer <your_token>" \
     -H "Content-Type: application/json" \
     -d '{"token": "ExponentPushToken[test123]", "platform": "android"}'
   ```

3. Test notification preferences endpoint:
   ```bash
   curl http://localhost:3000/api/v1/notifications/me/preferences \
     -H "Authorization: Bearer <your_token>"
   ```

---

## Mobile App Setup

### Installing Dependencies

```bash
pnpm install
```

### Running the App

1. Start Metro bundler:
   ```bash
   pnpm --filter @curex24/mobile start
   ```

2. Run on physical device (required for push notifications):
   - Scan QR code with Expo Go app
   - Or run `pnpm --filter @curex24/mobile android` / `ios`

### Building for Testing

#### Development Build (Expo Go)
```bash
pnpm --filter @curex24/mobile start
```

#### Staging Build
```bash
cd apps/mobile
eas build --profile staging --platform android
```

#### Production Build
```bash
cd apps/mobile
eas build --profile production --platform android
```

---

## Testing Scenarios

### 1. Push Notification Registration

**Test Case:** App registers for push notifications on login

1. Log in to the mobile app on a physical device
2. Accept notification permission prompt
3. Verify in backend logs: "Device token registered for user..."
4. Check database: `SELECT * FROM device_tokens WHERE user_id = '...'`

### 2. Booking Flow Notifications

**Patient receives notifications when:**

| Action | Expected Notification |
|--------|----------------------|
| Provider accepts booking | Push + SMS: "Your booking has been accepted by Dr. X" |
| Provider declines booking | Push + SMS: "Your booking was declined" |
| Provider starts journey | Push + SMS: "Dr. X is on the way" |
| Provider arrives | Push + SMS: "Dr. X has arrived" |
| Consultation starts | Push: "Your consultation is now in progress" |
| Consultation completes | Push + SMS: "Consultation completed" |

**Provider receives notifications when:**

| Action | Expected Notification |
|--------|----------------------|
| Patient creates booking | Push + SMS: "New booking request" |
| Patient cancels booking | Push + SMS: "Booking cancelled by patient" |
| Payment received | Push: "Payment received" |

**Test Steps:**

1. As Patient: Create a new booking
2. Verify Provider receives push notification
3. As Provider: Accept the booking
4. Verify Patient receives push + SMS
5. Continue through booking flow, verifying each notification

### 3. Admin Actions

**Provider notifications from admin portal:**

| Admin Action | Expected Notification |
|-------------|----------------------|
| Approve provider | Push + SMS: "Account approved" |
| Reject provider | Push + SMS: "Account rejected" |
| Deactivate provider | Push + SMS: "Account deactivated" |
| Process payout | Push + SMS: "Payout processed" |
| NMC verification success | Push + SMS: "Registration verified" |

**Test Steps:**

1. Log in to admin portal
2. Navigate to Providers → select pending provider
3. Approve the provider
4. Verify provider receives notification on mobile

### 4. Payment Notifications

| Event | Target | Channels |
|-------|--------|----------|
| Payment successful | Patient | Push + SMS |
| Payment successful | Provider | Push only |
| Refund processed | Patient | Push + SMS |
| Payout processed | Provider | Push + SMS |

### 5. Lab Results

1. As Provider: Upload lab result for a patient
2. Verify Patient receives Push + SMS: "Lab results ready"

### 6. Notification Preferences

**Test disabling notifications:**

1. Go to Settings → Notification Settings
2. Disable "Push Notifications"
3. Trigger a notification scenario
4. Verify push is NOT received, but in-app notification exists
5. Re-enable and verify pushes resume

**Test category preferences:**

1. Disable "Booking Updates" in settings
2. Create/accept a booking
3. Verify no push/SMS for booking updates
4. Verify payment updates still work

### 7. Deep Linking

**Test notification tap actions:**

1. Receive a booking notification
2. Tap on it (when app is background/killed)
3. Verify app opens to correct booking detail screen

---

## Troubleshooting

### Push Notifications Not Working

1. **Physical device required**: Expo push tokens only work on physical devices
2. **Check permissions**: Verify app has notification permission
3. **Token registration**: Check backend logs for registration
4. **Expo project ID**: Ensure `eas.projectId` is set in app.config.ts

### SMS Not Sending

1. **Check credentials**: Verify TWILIO_* env vars are set
2. **Check logs**: Look for "SMS sent" or error messages
3. **Phone format**: Ensure phone number includes country code (+91...)
4. **Twilio balance**: Check Twilio console for account status

### Notifications Going to Wrong User

1. Check device token userId mapping in database
2. Verify user is logged in with correct account
3. Clear app data and re-login to re-register token

### Badge Count Not Updating

1. Check `getUnreadCount` API response
2. Verify `setBadgeCount` is called after notification
3. On Android, badge count requires launcher support

---

## API Reference

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /notifications/me | Get user's notifications |
| GET | /notifications/me/unread-count | Get unread count |
| PUT | /notifications/:id/read | Mark as read |
| PUT | /notifications/me/read-all | Mark all as read |
| POST | /notifications/device-token | Register device token |
| PUT | /notifications/device-token/unregister | Unregister token |
| GET | /notifications/me/preferences | Get preferences |
| PUT | /notifications/me/preferences | Update preferences |

### Notification Types

```typescript
type NotificationType =
  | 'BOOKING_REQUEST'
  | 'BOOKING_ACCEPTED'
  | 'BOOKING_DECLINED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_STATUS_UPDATE'
  | 'PROVIDER_ON_THE_WAY'
  | 'PROVIDER_ARRIVED'
  | 'CONSULTATION_STARTED'
  | 'CONSULTATION_COMPLETED'
  | 'LAB_RESULT_READY'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_REFUNDED'
  | 'PROVIDER_APPROVED'
  | 'PROVIDER_REJECTED'
  | 'PROVIDER_DEACTIVATED'
  | 'NMC_VERIFICATION_SUCCESS'
  | 'PAYOUT_PROCESSED'
  | 'APPOINTMENT_REMINDER';
```

---

## Checklist

### Push Notification Testing
- [ ] App requests notification permission on login
- [ ] Device token is registered with backend
- [ ] Patient receives push when booking accepted
- [ ] Patient receives push when provider is on the way
- [ ] Patient receives push when provider arrived
- [ ] Provider receives push for new booking request
- [ ] Deep linking opens correct screen
- [ ] Badge count updates correctly
- [ ] Notification sound plays
- [ ] Disabled notifications are not sent

### SMS Testing
- [ ] OTP SMS sent during login (production only)
- [ ] Booking confirmation SMS received
- [ ] Provider notification SMS received
- [ ] Admin action SMS received
- [ ] SMS not sent when user opts out
- [ ] SMS templates render correctly

### Admin Portal Triggers
- [ ] Provider approval sends notification
- [ ] Provider rejection sends notification
- [ ] Provider deactivation sends notification
- [ ] Payout processing sends notification
- [ ] NMC verification success sends notification
