# Notification System - Manual QA Checklist

## Prerequisites

- [ ] Twilio account configured with SMS and WhatsApp
- [ ] Redis running (for queue processing)
- [ ] Mobile app with Expo push tokens registered
- [ ] Test user accounts (patient and provider)

## Test Environment Setup

1. Set environment variables:
```bash
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Sandbox
REDIS_URL=redis://localhost:6379
FEATURE_PUSH_NOTIFICATIONS=true
FEATURE_WHATSAPP_NOTIFICATIONS=true
FEATURE_SMS_NOTIFICATIONS=true
```

2. For WhatsApp sandbox testing, users must first message the sandbox number.

---

## Test Scenarios

### 1. Push Notifications

#### 1.1 Push - Booking Accepted
- [ ] Create a booking as patient
- [ ] Provider accepts the booking
- [ ] Verify push notification received on patient device
- [ ] Verify notification title: "Booking Accepted"
- [ ] Verify notification appears in in-app notifications list
- [ ] Verify badge count increments

#### 1.2 Push - Deep Links
- [ ] Receive push notification
- [ ] Tap notification
- [ ] Verify app opens to correct screen (booking details)

#### 1.3 Push - User Preferences
- [ ] Disable push notifications in user preferences
- [ ] Trigger a notification
- [ ] Verify no push notification received
- [ ] Verify in-app notification still created

---

### 2. WhatsApp Notifications

#### 2.1 WhatsApp - Basic Message
- [ ] Trigger BOOKING_ACCEPTED notification
- [ ] Verify WhatsApp message received
- [ ] Verify message formatting (emoji, bold text)
- [ ] Verify message contains correct booking details

#### 2.2 WhatsApp - All Templates
Test each template renders correctly:
- [ ] OTP
- [ ] BOOKING_ACCEPTED
- [ ] BOOKING_DECLINED
- [ ] PROVIDER_ON_THE_WAY
- [ ] PROVIDER_ARRIVED
- [ ] CONSULTATION_COMPLETED
- [ ] LAB_RESULT_READY
- [ ] PAYMENT_SUCCESS
- [ ] APPOINTMENT_REMINDER
- [ ] PRESCRIPTION_UPLOADED
- [ ] DIAGNOSTIC_BOOKED

#### 2.3 WhatsApp - User Preferences
- [ ] Disable WhatsApp in user preferences
- [ ] Trigger notification with WhatsApp enabled
- [ ] Verify SMS is sent instead (immediate fallback)

---

### 3. SMS Fallback

#### 3.1 Fallback - Timeout
- [ ] Send WhatsApp notification
- [ ] Wait 5+ minutes without delivery confirmation
- [ ] Verify SMS fallback is sent
- [ ] Verify NotificationLog shows FALLBACK_TRIGGERED status

#### 3.2 Fallback - WhatsApp Failure
- [ ] Simulate WhatsApp API failure (invalid number)
- [ ] Verify immediate SMS fallback
- [ ] Verify error logged in NotificationLog

#### 3.3 Fallback - Idempotency
- [ ] Send notification with idempotency key
- [ ] Trigger SMS fallback
- [ ] Try to trigger another fallback for same key
- [ ] Verify duplicate is prevented

---

### 4. Webhook Status Updates

#### 4.1 Webhook - Delivered Status
- [ ] Send WhatsApp message
- [ ] Verify webhook receives "sent" status
- [ ] Verify webhook receives "delivered" status
- [ ] Verify NotificationLog.deliveredAt is set

#### 4.2 Webhook - Failed Status
- [ ] Send to invalid number
- [ ] Verify webhook receives "failed" status
- [ ] Verify NotificationLog.failedAt is set
- [ ] Verify NotificationLog.errorMessage is set

#### 4.3 Webhook - Read Status
- [ ] Send WhatsApp message
- [ ] Mark message as read in WhatsApp
- [ ] Verify webhook receives "read" status

---

### 5. Appointment Reminders

#### 5.1 Reminder - 24 Hour
- [ ] Create booking for tomorrow
- [ ] Wait for scheduled job to run (hourly)
- [ ] Verify patient receives reminder
- [ ] Verify provider receives reminder
- [ ] Verify idempotency (no duplicate on next run)

#### 5.2 Reminder - 1 Hour
- [ ] Create booking for ~1 hour from now
- [ ] Wait for scheduled job to run (every 30 min)
- [ ] Verify patient receives reminder
- [ ] Verify provider receives reminder

#### 5.3 Reminder - Feature Flag
- [ ] Set FEATURE_APPOINTMENT_REMINDERS=false
- [ ] Restart server
- [ ] Verify no reminders sent

---

### 6. Notification Preferences

#### 6.1 Preferences - Get Default
- [ ] Create new user
- [ ] Get notification preferences
- [ ] Verify defaults: push=true, sms=true, whatsapp=true

#### 6.2 Preferences - Update
- [ ] Update preferences via API
- [ ] Get preferences
- [ ] Verify updates persisted

#### 6.3 Preferences - Category Filtering
- [ ] Disable bookingUpdates
- [ ] Trigger BOOKING_ACCEPTED notification
- [ ] Verify no push/WhatsApp sent (in-app still created)

---

### 7. Feature Flags

#### 7.1 Feature Flag - Push Disabled
- [ ] Set FEATURE_PUSH_NOTIFICATIONS=false
- [ ] Trigger notification
- [ ] Verify no push sent
- [ ] Verify WhatsApp still sent

#### 7.2 Feature Flag - WhatsApp Disabled
- [ ] Set FEATURE_WHATSAPP_NOTIFICATIONS=false
- [ ] Trigger notification with whatsapp: true
- [ ] Verify no WhatsApp sent
- [ ] Verify SMS sent if sms: true

#### 7.3 Feature Flag - Queue Disabled
- [ ] Set FEATURE_NOTIFICATION_QUEUE=false
- [ ] Trigger notification
- [ ] Verify synchronous processing (no queue)

---

### 8. Notification Logs

#### 8.1 Logs - View User Logs
- [ ] Send multiple notifications
- [ ] GET /notifications/me/logs
- [ ] Verify all channels logged
- [ ] Verify status updates visible

#### 8.2 Logs - Filter by Channel
- [ ] GET /notifications/me/logs with channel=WHATSAPP
- [ ] Verify only WhatsApp logs returned

---

### 9. Error Handling

#### 9.1 Error - Invalid Phone Number
- [ ] Set invalid phone number for user
- [ ] Trigger WhatsApp notification
- [ ] Verify graceful failure
- [ ] Verify error logged
- [ ] Verify no crash

#### 9.2 Error - Redis Unavailable
- [ ] Stop Redis
- [ ] Trigger notification
- [ ] Verify synchronous fallback works
- [ ] Verify no crash

#### 9.3 Error - Twilio API Error
- [ ] Use invalid Twilio credentials
- [ ] Trigger notification
- [ ] Verify error logged
- [ ] Verify graceful degradation

---

### 10. Specific Notification Scenarios

#### 10.1 Prescription Uploaded
- [ ] Provider adds prescription to consultation
- [ ] Verify patient receives notification
- [ ] Verify notification type: PRESCRIPTION_UPLOADED
- [ ] Verify deep link to prescription

#### 10.2 Diagnostic Booked
- [ ] Provider requests diagnostic test
- [ ] Verify patient receives notification
- [ ] Verify notification type: DIAGNOSTIC_BOOKED
- [ ] Verify test type in message

#### 10.3 Lab Result Ready
- [ ] Upload lab result
- [ ] Verify patient receives notification
- [ ] Verify notification type: LAB_RESULT_READY
- [ ] Verify test type in message

---

## Performance Testing

- [ ] Send 100 notifications in quick succession
- [ ] Verify all notifications delivered
- [ ] Verify queue processes efficiently
- [ ] Verify no memory leaks

## Security Testing

- [ ] Verify webhook endpoint validates Twilio signature
- [ ] Verify notification logs only accessible by owner
- [ ] Verify preferences only editable by owner
- [ ] Verify no sensitive data in notification metadata

---

## Sign-Off

| Tester | Date | Environment | Pass/Fail |
|--------|------|-------------|-----------|
|        |      | Staging     |           |
|        |      | Production  |           |
