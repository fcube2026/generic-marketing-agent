# Video Consultation Feature — GitHub Issues

> These issues break down the [video consultation feature proposal](01-video-consultation.md) into actionable, trackable work items organized by implementation phase.
>
> **To create these issues in GitHub**, use the companion script: `scripts/create-video-consultation-issues.sh`

---

## Phase 1: MVP (P0) — Weeks 1–4

### Issue 1: Database schema — Add VideoSession model and VIDEO_CONSULTATION booking mode

**Labels:** `type: feature`, `area: database`, `phase: v2`, `priority: high`

**Description:**

Add database schema changes required for the video consultation feature, including a new `VideoSession` model and `VIDEO_CONSULTATION` booking mode.

**Changes Required:**

1. **Update `BookingMode` enum** — Add `VIDEO_CONSULTATION` to the existing enum in `packages/database/prisma/schema.prisma`
2. **Create `VideoSession` model** — Fields: `id`, `bookingId` (unique), `roomId` (unique, 100ms room ID), `sessionToken`, `status` (VideoSessionStatus), `startedAt`, `endedAt`, `duration` (seconds), `recordingUrl`, `recordingConsent`, `createdAt`, `updatedAt`, booking relation
3. **Create `VideoSessionStatus` enum** — Values: `CREATED`, `WAITING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `EXPIRED`
4. **Add relation on `Booking` model** — Add `videoSession VideoSession?` relation
5. **Add provider video consultation fields** — Add `videoConsultationEnabled` (Boolean, default false) and `consultationFeeVideoConsultation` (Float, default 0) to `ProviderProfile`
6. **Generate and apply migration**

**Acceptance Criteria:**

- [ ] `VIDEO_CONSULTATION` added to `BookingMode` enum
- [ ] `VideoSession` model created with all required fields
- [ ] `VideoSessionStatus` enum created
- [ ] `Booking` model has `videoSession` relation
- [ ] `ProviderProfile` has video consultation fee and toggle fields
- [ ] Prisma migration generated and committed
- [ ] `pnpm --filter @curex24/database db:generate` runs without errors

**Dependencies:** None — this is the foundational issue.

**Effort:** ~1 day

---

### Issue 2: API — Create VideoConsultationModule with room creation and token generation

**Labels:** `type: feature`, `area: api`, `phase: v2`, `priority: high`

**Description:**

Create a new `VideoConsultationModule` in the NestJS backend (`apps/api/src/modules/video-consultation/`) with endpoints for creating video rooms and generating join tokens via the 100ms Server SDK.

**Changes Required:**

1. **Install 100ms Server SDK** — Add `@100mslive/server-sdk` dependency to `apps/api`
2. **Create module structure:**
   - `video-consultation.module.ts`
   - `video-consultation.controller.ts`
   - `video-consultation.service.ts`
   - `dto/create-video-session.dto.ts`
   - `dto/video-session-response.dto.ts`
3. **Implement endpoints:**
   - `POST /api/v1/video-sessions/:bookingId/create` — Create a 100ms room and `VideoSession` record (provider only, booking must be ACCEPTED)
   - `GET /api/v1/video-sessions/:bookingId/token` — Generate a short-lived join token for the authenticated user (patient or provider)
   - `GET /api/v1/video-sessions/:bookingId` — Get video session details
   - `PATCH /api/v1/video-sessions/:bookingId/end` — End the video session, update duration
4. **Add environment variables:** `HMS_ACCESS_KEY`, `HMS_SECRET`, `HMS_TEMPLATE_ID`
5. **Guard with `JwtAuthGuard` and `RolesGuard`** — Only booking participants can access

**Acceptance Criteria:**

- [ ] `VideoConsultationModule` registered in `AppModule`
- [ ] Room creation endpoint creates 100ms room and persists `VideoSession`
- [ ] Token generation returns valid join token
- [ ] Only the patient and provider of a booking can access endpoints
- [ ] Proper error handling (booking not found, wrong status, etc.)
- [ ] Unit tests for service methods
- [ ] API documented in OpenAPI spec

**Dependencies:** Issue 1 (Database schema)

**Effort:** ~3–4 days

---

### Issue 3: API — Implement video session lifecycle webhooks

**Labels:** `type: feature`, `area: api`, `phase: v2`, `priority: high`

**Description:**

Implement a webhook endpoint to receive 100ms session lifecycle events and update `VideoSession` status accordingly.

**Changes Required:**

1. **Create webhook endpoint** — `POST /api/v1/video-sessions/webhook` (no auth, validated via 100ms webhook signature)
2. **Handle events:**
   - `session.open` → Update status to `WAITING`
   - `peer.join.success` → Track participant join, update status to `IN_PROGRESS` when both parties joined
   - `peer.leave.success` → Track participant leave
   - `session.close` → Update status to `COMPLETED`, calculate and store duration
   - `recording.success` → Store recording URL
3. **Webhook signature verification** — Validate `x-100ms-signature` header
4. **Update booking status** — When video session starts/ends, update the associated booking status (IN_PROGRESS / COMPLETED)

**Acceptance Criteria:**

- [ ] Webhook endpoint receives and processes 100ms events
- [ ] Webhook signature is validated to prevent spoofing
- [ ] `VideoSession` status transitions correctly based on events
- [ ] Booking status updated when session starts and ends
- [ ] Failed/expired sessions handled gracefully
- [ ] Integration tests with mock webhook payloads

**Dependencies:** Issue 2 (VideoConsultationModule)

**Effort:** ~2 days

---

### Issue 4: API — Add pre-session reminder notifications

**Labels:** `type: feature`, `area: api`, `phase: v2`, `priority: medium`

**Description:**

Add scheduled reminder notifications for upcoming video consultations using BullMQ jobs, integrating with the existing notification system.

**Changes Required:**

1. **Create reminder jobs** — Schedule push notifications at 5 minutes and 1 minute before the session
2. **Job scheduling** — When a video consultation booking is accepted, schedule reminder jobs
3. **Job cancellation** — Cancel reminder jobs if the booking is cancelled
4. **Notification content:**
   - 5-min reminder: "Your video consultation with Dr. {name} starts in 5 minutes. Make sure you have a stable internet connection."
   - 1-min reminder: "Your video consultation is about to start. Tap to join the waiting room."
5. **Deep link** — Notification tap opens the video lobby screen

**Acceptance Criteria:**

- [ ] Reminder jobs scheduled on booking acceptance
- [ ] 5-minute and 1-minute reminders sent as push notifications
- [ ] Reminders cancelled when booking is cancelled
- [ ] Notifications integrate with existing push notification system (`apps/api/src/modules/push-notifications/`)
- [ ] Unit tests for job scheduling logic

**Dependencies:** Issue 2 (VideoConsultationModule), existing notification system

**Effort:** ~1–2 days

---

### Issue 5: Mobile — Build VideoCallScreen with 100ms SDK

**Labels:** `type: feature`, `area: mobile`, `phase: v2`, `priority: high`

**Description:**

Build the core video call screen in the unified mobile app using the `@100mslive/react-native-hms` SDK.

**Changes Required:**

1. **Install 100ms React Native SDK** — Add `@100mslive/react-native-hms` to `apps/mobile`
2. **Create `VideoCallScreen.tsx`** at `apps/mobile/src/screens/common/VideoCallScreen.tsx`
3. **Core UI features:**
   - Local and remote video tiles (participant view)
   - Mute/unmute microphone button
   - Camera on/off toggle
   - Front/back camera switch
   - End call button
   - Connection quality indicator
   - Session timer (elapsed time)
4. **SDK integration:**
   - Fetch join token from API (`GET /video-sessions/:bookingId/token`)
   - Join 100ms room with the token
   - Handle peer join/leave events to show/hide remote video
   - Handle room state changes
5. **Permissions** — Request camera and microphone permissions on Android and iOS
6. **Navigation** — Add to both Patient and Provider navigators

**Acceptance Criteria:**

- [ ] Video call screen renders local and remote video feeds
- [ ] Mute, camera toggle, camera switch, and end call controls work
- [ ] Camera/microphone permissions requested and handled
- [ ] Graceful handling of network disconnection
- [ ] Screen registered in navigation for both patient and provider roles
- [ ] Basic manual testing on Android and iOS

**Dependencies:** Issue 2 (API token endpoint)

**Effort:** ~4–5 days

---

### Issue 6: Mobile — Build VideoLobbyScreen with device preview

**Labels:** `type: feature`, `area: mobile`, `phase: v2`, `priority: high`

**Description:**

Build a pre-call lobby screen where users can preview their camera, check microphone, and join the video consultation when ready.

**Changes Required:**

1. **Create `VideoLobbyScreen.tsx`** at `apps/mobile/src/screens/common/VideoLobbyScreen.tsx`
2. **UI features:**
   - Camera preview (local video feed)
   - Microphone level indicator
   - Camera on/off toggle (pre-join)
   - Microphone on/off toggle (pre-join)
   - "Join Call" button
   - Provider/patient name and booking details display
   - Waiting status ("Waiting for Dr. {name} to join...")
3. **Pre-join checks:**
   - Verify camera and microphone permissions
   - Check internet connectivity
   - Display estimated network quality
4. **Navigation flow:**
   - Lobby → VideoCallScreen (on "Join Call" tap)
   - Lobby → back to booking detail (on cancel)

**Acceptance Criteria:**

- [ ] Camera preview shows local video feed
- [ ] Microphone and camera can be toggled before joining
- [ ] Permissions are checked and requested if needed
- [ ] "Join Call" button navigates to VideoCallScreen with correct booking context
- [ ] Booking details (provider name, service, time) displayed
- [ ] Works on both Android and iOS

**Dependencies:** Issue 5 (VideoCallScreen)

**Effort:** ~2–3 days

---

### Issue 7: Mobile — Integrate VIDEO_CONSULTATION mode into booking flow

**Labels:** `type: feature`, `area: mobile`, `phase: v2`, `priority: high`

**Description:**

Add `VIDEO_CONSULTATION` as a third booking mode option in the patient booking flow alongside HOME_VISIT and DOCTOR_PLACE.

**Changes Required:**

1. **Update `RecommendationScreen.tsx`** — Show "Video Consultation" as a mode option when provider supports it
2. **Update `BookingConfirmScreen.tsx`** — Display video consultation details (no address needed)
3. **Update `ProviderListScreen.tsx`** — Filter/show providers that support video consultation
4. **Update provider screens:**
   - `IncomingBookingScreen.tsx` — Show video consultation booking type, add "Start Video Call" action
   - `BookingDetailScreen.tsx` — Show video session status and "Join Call" button
5. **Update patient screens:**
   - `TrackingScreen.tsx` or new equivalent — Show video session status and "Join Waiting Room" button
   - `HistoryScreen.tsx` — Display video consultation bookings with session duration
6. **Update `@curex24/types`** — Add `VIDEO_CONSULTATION` to shared `BookingMode` type if applicable
7. **Update API service calls** — Handle `addressId` being optional for video consultations

**Acceptance Criteria:**

- [ ] Patient can select "Video Consultation" mode during booking
- [ ] Address selection is skipped for video consultations
- [ ] Provider sees video consultation bookings and can start/join calls
- [ ] Patient can join the video lobby from booking details
- [ ] Booking history displays video consultation entries correctly
- [ ] Video consultation fee displayed correctly

**Dependencies:** Issues 1, 2, 5, 6

**Effort:** ~3–4 days

---

## Phase 2: Polish (P1) — Weeks 5–7

### Issue 8: Mobile — Network quality indicator and audio-only fallback

**Labels:** `type: feature`, `area: mobile`, `phase: v2`, `priority: medium`

**Description:**

Add network quality monitoring to the video call screen with automatic fallback to audio-only mode when the connection is poor.

**Changes Required:**

1. **Network quality indicator** — Display connection quality bars (excellent/good/fair/poor) on the video call screen using 100ms SDK network quality stats
2. **Audio-only fallback:**
   - When network quality drops below threshold, prompt user to switch to audio-only
   - Auto-switch to audio-only if video becomes unstable for >10 seconds
   - Allow manual toggle between video and audio-only modes
3. **Pre-call network check** — Add network speed test to VideoLobbyScreen
4. **Reconnection handling** — Show "Reconnecting..." overlay when connection is temporarily lost

**Acceptance Criteria:**

- [ ] Network quality indicator visible during call
- [ ] Automatic fallback to audio-only on poor connection
- [ ] User can manually switch between video and audio-only
- [ ] Pre-call network quality displayed in lobby
- [ ] Reconnection UI shown during temporary disconnections

**Dependencies:** Issue 5 (VideoCallScreen)

**Effort:** ~3 days

---

### Issue 9: Mobile — Session timer and call controls polish

**Labels:** `type: feature`, `area: mobile`, `phase: v2`, `priority: medium`

**Description:**

Polish the video call experience with a session timer, improved call controls, and a post-call summary screen.

**Changes Required:**

1. **Session timer** — Display elapsed call time (MM:SS format) on the video call screen
2. **Call controls polish:**
   - Animated toggle states for mute/camera buttons
   - Speaker/earpiece toggle
   - Haptic feedback on control taps
3. **Post-call screen (`VideoCallEndScreen.tsx`):**
   - Display call duration
   - Call quality rating (1–5 stars)
   - "View Consultation Summary" button (for patients)
   - "Write Consultation Summary" button (for providers)
4. **Auto-end handling** — If one participant leaves and doesn't return within 60 seconds, end the session

**Acceptance Criteria:**

- [ ] Session timer displayed and updates every second
- [ ] Speaker/earpiece toggle works
- [ ] Post-call screen shows duration and rating prompt
- [ ] Auto-end triggers after 60-second single-participant timeout
- [ ] Smooth transitions between call → end screen

**Dependencies:** Issue 5 (VideoCallScreen)

**Effort:** ~2–3 days

---

### Issue 10: Mobile — In-call chat feature

**Labels:** `type: feature`, `area: mobile`, `phase: v2`, `priority: low`

**Description:**

Add a text chat panel to the video call screen so participants can share text messages during the consultation (useful for sharing medication names, dosages, or when audio is unclear).

**Changes Required:**

1. **Chat panel** — Slide-up panel or bottom sheet on the VideoCallScreen
2. **Message types:**
   - Text messages
   - System messages (participant joined/left)
3. **100ms chat integration** — Use 100ms SDK's built-in messaging for real-time chat
4. **Unread indicator** — Badge on chat icon when new messages arrive while panel is closed
5. **Chat persistence** — Store chat messages in the VideoSession record for post-call reference

**Acceptance Criteria:**

- [ ] Chat panel accessible from video call screen
- [ ] Real-time message delivery between participants
- [ ] Unread message indicator on chat icon
- [ ] Chat history persisted to database
- [ ] System messages for join/leave events

**Dependencies:** Issue 5 (VideoCallScreen)

**Effort:** ~2 days

---

## Phase 3: Advanced (P2) — Weeks 8–10

### Issue 11: API/Mobile — Cloud recording with consent

**Labels:** `type: feature`, `area: api`, `area: mobile`, `phase: v2`, `priority: medium`

**Description:**

Implement cloud recording of video consultations with explicit patient consent, compliant with Indian Telemedicine Practice Guidelines 2020 and DPDP Act 2023.

**Changes Required:**

### API
1. **Recording consent endpoint** — `POST /api/v1/video-sessions/:bookingId/recording-consent` (patient grants/denies consent)
2. **Start/stop recording** — API triggers 100ms cloud recording via server SDK when both parties consent
3. **Recording webhook** — Handle `recording.success` event, store recording URL in `VideoSession`
4. **Audit logging** — Log consent grant/revoke in `AuditLog` table
5. **Auto-delete policy** — Mark recordings for deletion after 90 days (configurable)

### Mobile
1. **Consent prompt** — Show recording consent dialog to patient before call starts
2. **Recording indicator** — Display red "REC" dot when recording is active
3. **Stop recording button** — Either participant can stop recording at any time

**Acceptance Criteria:**

- [ ] Patient explicitly consents before recording starts
- [ ] Recording consent stored in database and audit log
- [ ] Recording starts only when both parties have consented
- [ ] Recording URL stored on session completion
- [ ] Recording indicator visible during active recording
- [ ] Either party can stop recording
- [ ] Auto-delete policy configurable via environment variable

**Dependencies:** Issues 2, 3, 5

**Effort:** ~3–4 days

---

### Issue 12: Mobile — Picture-in-Picture (PiP) and CallKeep integration

**Labels:** `type: feature`, `area: mobile`, `phase: v2`, `priority: low`

**Description:**

Add Picture-in-Picture support so users can multitask during video calls, and CallKeep integration for native call UI on iOS/Android.

**Changes Required:**

1. **PiP mode:**
   - Enable PiP when user navigates away from call screen
   - Show remote video in PiP window
   - Return to full call screen on PiP tap
   - Android: `react-native-pip` or native PiP API
   - iOS: AVPictureInPictureController via native module
2. **CallKeep integration:**
   - Show incoming call UI for incoming video consultation notifications
   - Display native call screen (iOS CallKit / Android ConnectionService)
   - Answer/decline actions from lock screen
   - Use `react-native-callkeep` package

**Acceptance Criteria:**

- [ ] PiP activates when leaving call screen
- [ ] PiP shows remote video feed
- [ ] Tapping PiP returns to full call screen
- [ ] Incoming video consultation shows native call UI
- [ ] Answer/decline from notification or lock screen
- [ ] Works on both Android and iOS

**Dependencies:** Issue 5 (VideoCallScreen)

**Effort:** ~4–5 days

---

### Issue 13: Mobile — Screen sharing and virtual backgrounds

**Labels:** `type: feature`, `area: mobile`, `phase: v2`, `priority: low`

**Description:**

Add screen sharing capability (useful for providers sharing medical images/reports) and virtual background options for privacy.

**Changes Required:**

1. **Screen sharing:**
   - Provider can share screen during consultation
   - Patient sees shared screen in full-screen mode
   - Toggle button on call controls
   - Uses 100ms SDK screen share API
2. **Virtual backgrounds:**
   - Predefined background options (clinic, neutral, blur)
   - Background blur option
   - Selectable from lobby or during call
   - Uses 100ms virtual background plugin

**Acceptance Criteria:**

- [ ] Provider can start/stop screen sharing
- [ ] Shared screen visible to other participant
- [ ] Virtual background options available in lobby and call
- [ ] Background blur works smoothly
- [ ] Performance remains acceptable with virtual backgrounds enabled

**Dependencies:** Issue 5 (VideoCallScreen), Issue 6 (VideoLobbyScreen)

**Effort:** ~3–4 days

---

## Phase 4: Analytics (P2) — Weeks 10–12

### Issue 14: API/Admin — Video consultation analytics dashboard

**Labels:** `type: feature`, `area: api`, `area: admin`, `phase: v2`, `priority: low`

**Description:**

Build analytics endpoints and admin dashboard views for video consultation metrics.

**Changes Required:**

### API
1. **Analytics endpoints:**
   - `GET /api/v1/admin/video-sessions/stats` — Aggregate stats (total sessions, avg duration, completion rate, etc.)
   - `GET /api/v1/admin/video-sessions` — List all video sessions with filters (status, date range, provider)
2. **Metrics to track:**
   - Total video consultations (daily/weekly/monthly)
   - Average session duration
   - Completion rate (completed vs failed/expired)
   - Drop-off rate (sessions where a participant left early)
   - Peak usage hours
   - Audio-only fallback rate
   - Average call quality rating
   - Revenue from video consultations

### Admin Dashboard
1. **Video Consultation tab** on admin dashboard
2. **Stats cards** — Total sessions, avg duration, completion rate, revenue
3. **Charts** — Sessions over time, peak hours heatmap
4. **Session list** — Filterable table with session details, status, duration, recording availability

**Acceptance Criteria:**

- [ ] Analytics API returns accurate aggregated metrics
- [ ] Admin dashboard displays video consultation stats
- [ ] Sessions filterable by date, status, provider
- [ ] Charts render correctly with real data
- [ ] Performance acceptable for large datasets (pagination, date range limits)

**Dependencies:** Issues 1, 2, 3

**Effort:** ~3–4 days

---

## Summary

| # | Issue | Phase | Priority | Labels | Effort |
|---|-------|-------|----------|--------|--------|
| 1 | Database schema — VideoSession + VIDEO_CONSULTATION mode | Phase 1 | High | database | ~1 day |
| 2 | API — VideoConsultationModule (room creation + token) | Phase 1 | High | api | ~3–4 days |
| 3 | API — Video session lifecycle webhooks | Phase 1 | High | api | ~2 days |
| 4 | API — Pre-session reminder notifications | Phase 1 | Medium | api | ~1–2 days |
| 5 | Mobile — VideoCallScreen with 100ms SDK | Phase 1 | High | mobile | ~4–5 days |
| 6 | Mobile — VideoLobbyScreen with device preview | Phase 1 | High | mobile | ~2–3 days |
| 7 | Mobile — Integrate VIDEO_CONSULTATION into booking flow | Phase 1 | High | mobile | ~3–4 days |
| 8 | Mobile — Network quality + audio-only fallback | Phase 2 | Medium | mobile | ~3 days |
| 9 | Mobile — Session timer + call controls polish | Phase 2 | Medium | mobile | ~2–3 days |
| 10 | Mobile — In-call chat | Phase 2 | Low | mobile | ~2 days |
| 11 | API/Mobile — Cloud recording with consent | Phase 3 | Medium | api, mobile | ~3–4 days |
| 12 | Mobile — PiP + CallKeep integration | Phase 3 | Low | mobile | ~4–5 days |
| 13 | Mobile — Screen sharing + virtual backgrounds | Phase 3 | Low | mobile | ~3–4 days |
| 14 | API/Admin — Video consultation analytics dashboard | Phase 4 | Low | api, admin | ~3–4 days |

**Total estimated effort:** ~35–45 days (~7–10 weeks)
