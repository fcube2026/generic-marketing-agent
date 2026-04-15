#!/usr/bin/env bash
# Script to create GitHub issues for the Video Consultation feature.
# Run from the repository root: bash scripts/create-video-consultation-issues.sh
#
# Prerequisites:
#   - gh CLI installed and authenticated
#   - Token must have issues:write permission
#
# Usage:
#   bash scripts/create-video-consultation-issues.sh              # Create all issues
#   bash scripts/create-video-consultation-issues.sh --dry-run    # Preview without creating

set -uo pipefail

REPO="fcube2026/curex24"
DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "=== DRY RUN MODE — no issues will be created ==="
  echo ""
fi

create_issue() {
  local title="$1"
  local labels="$2"
  local body="$3"

  if $DRY_RUN; then
    echo "Would create: $title"
    echo "  Labels: $labels"
    echo ""
    return
  fi

  echo "Creating: $title"
  if gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --label "$labels" \
    --body "$body"; then
    echo "  ✅ Created successfully"
  else
    echo "  ❌ Failed to create issue. Check gh auth permissions (needs issues:write)."
  fi
  echo ""
  sleep 1  # Rate limit buffer
}

echo "=============================================="
echo " Video Consultation Feature — Issue Creation"
echo "=============================================="
echo ""

# ─── Phase 1: MVP ───

create_issue \
  "[Video Consultation] Phase 1: Database schema — Add VideoSession model and VIDEO_CONSULTATION booking mode" \
  "type: feature,area: database,phase: v2,priority: high" \
  "## Summary

Add database schema changes required for the video consultation feature.

## Background

Per the [video consultation feature proposal](docs/feature-proposals/01-video-consultation.md), the platform needs to support real-time audio/video consultations as a third booking mode.

## Changes Required

1. **Update \`BookingMode\` enum** — Add \`VIDEO_CONSULTATION\`
2. **Create \`VideoSession\` model** — Fields: id, bookingId (unique), roomId (unique), sessionToken, status, startedAt, endedAt, duration (seconds), recordingUrl, recordingConsent, timestamps
3. **Create \`VideoSessionStatus\` enum** — Values: CREATED, WAITING, IN_PROGRESS, COMPLETED, FAILED, EXPIRED
4. **Add relation on \`Booking\` model** — \`videoSession VideoSession?\`
5. **Add provider fields** — \`videoConsultationEnabled\` (Boolean) and \`consultationFeeVideoConsultation\` (Float) to \`ProviderProfile\`
6. **Generate and apply migration**

## Acceptance Criteria

- [ ] \`VIDEO_CONSULTATION\` added to \`BookingMode\` enum
- [ ] \`VideoSession\` model created with all required fields
- [ ] \`VideoSessionStatus\` enum created
- [ ] \`Booking\` model has \`videoSession\` relation
- [ ] \`ProviderProfile\` has video consultation fee and toggle fields
- [ ] Prisma migration generated and committed
- [ ] \`pnpm --filter @curex24/database db:generate\` runs without errors

## Dependencies
None — this is the foundational issue.

## Effort
~1 day"


create_issue \
  "[Video Consultation] Phase 1: API — Create VideoConsultationModule with room creation and token generation" \
  "type: feature,area: api,phase: v2,priority: high" \
  "## Summary

Create a new \`VideoConsultationModule\` in the NestJS backend with endpoints for creating video rooms and generating join tokens via the 100ms Server SDK.

## Changes Required

1. **Install 100ms Server SDK** — \`@100mslive/server-sdk\`
2. **Create module structure** at \`apps/api/src/modules/video-consultation/\`:
   - \`video-consultation.module.ts\`
   - \`video-consultation.controller.ts\`
   - \`video-consultation.service.ts\`
   - DTOs for request/response
3. **Implement endpoints:**
   - \`POST /api/v1/video-sessions/:bookingId/create\` — Create 100ms room and VideoSession record
   - \`GET /api/v1/video-sessions/:bookingId/token\` — Generate short-lived join token
   - \`GET /api/v1/video-sessions/:bookingId\` — Get session details
   - \`PATCH /api/v1/video-sessions/:bookingId/end\` — End the session
4. **Environment variables:** \`HMS_ACCESS_KEY\`, \`HMS_SECRET\`, \`HMS_TEMPLATE_ID\`
5. **Auth guards** — Only booking participants can access

## Acceptance Criteria

- [ ] \`VideoConsultationModule\` registered in \`AppModule\`
- [ ] Room creation creates 100ms room and persists \`VideoSession\`
- [ ] Token generation returns valid join token
- [ ] Only the patient and provider of a booking can access endpoints
- [ ] Proper error handling
- [ ] Unit tests for service methods

## Dependencies
Issue: Database schema (VideoSession model)

## Effort
~3–4 days"


create_issue \
  "[Video Consultation] Phase 1: API — Implement video session lifecycle webhooks" \
  "type: feature,area: api,phase: v2,priority: high" \
  "## Summary

Implement a webhook endpoint to receive 100ms session lifecycle events and update VideoSession status accordingly.

## Changes Required

1. **Webhook endpoint** — \`POST /api/v1/video-sessions/webhook\` (validated via 100ms signature)
2. **Handle events:**
   - \`session.open\` → Status to WAITING
   - \`peer.join.success\` → Track join, status to IN_PROGRESS when both joined
   - \`peer.leave.success\` → Track leave
   - \`session.close\` → Status to COMPLETED, calculate duration
   - \`recording.success\` → Store recording URL
3. **Signature verification** — Validate \`x-100ms-signature\` header
4. **Update booking status** — Sync booking state with video session state

## Acceptance Criteria

- [ ] Webhook endpoint processes 100ms events
- [ ] Webhook signature validated
- [ ] VideoSession status transitions correctly
- [ ] Booking status updated on session start/end
- [ ] Failed/expired sessions handled gracefully
- [ ] Integration tests with mock webhook payloads

## Dependencies
Issue: VideoConsultationModule

## Effort
~2 days"


create_issue \
  "[Video Consultation] Phase 1: API — Add pre-session reminder notifications" \
  "type: feature,area: api,phase: v2,priority: medium" \
  "## Summary

Add scheduled reminder notifications for upcoming video consultations using BullMQ jobs.

## Changes Required

1. **Reminder jobs** — Push notifications at 5 min and 1 min before session
2. **Job scheduling** — Schedule on booking acceptance, cancel on booking cancellation
3. **Notification content:**
   - 5-min: \"Your video consultation with Dr. {name} starts in 5 minutes.\"
   - 1-min: \"Your video consultation is about to start. Tap to join.\"
4. **Deep link** — Notification tap opens video lobby screen

## Acceptance Criteria

- [ ] Reminder jobs scheduled on booking acceptance
- [ ] 5-min and 1-min reminders sent as push notifications
- [ ] Reminders cancelled when booking is cancelled
- [ ] Integrates with existing push notification system
- [ ] Unit tests for scheduling logic

## Dependencies
Issue: VideoConsultationModule, existing notification system

## Effort
~1–2 days"


create_issue \
  "[Video Consultation] Phase 1: Mobile — Build VideoCallScreen with 100ms SDK" \
  "type: feature,area: mobile,phase: v2,priority: high" \
  "## Summary

Build the core video call screen in the mobile app using the \`@100mslive/react-native-hms\` SDK.

## Changes Required

1. **Install 100ms RN SDK** — \`@100mslive/react-native-hms\`
2. **Create \`VideoCallScreen.tsx\`** at \`apps/mobile/src/screens/common/\`
3. **UI features:**
   - Local and remote video tiles
   - Mute/unmute microphone
   - Camera on/off toggle
   - Front/back camera switch
   - End call button
   - Connection quality indicator
   - Session timer
4. **SDK integration:**
   - Fetch join token from API
   - Join/leave 100ms room
   - Handle peer events
5. **Permissions** — Camera + microphone on Android and iOS
6. **Navigation** — Add to both Patient and Provider navigators

## Acceptance Criteria

- [ ] Video call screen renders local and remote video
- [ ] Mute, camera toggle, switch, and end call controls work
- [ ] Permissions requested and handled
- [ ] Graceful network disconnection handling
- [ ] Registered in navigation for both roles
- [ ] Manual testing on Android and iOS

## Dependencies
Issue: API token endpoint

## Effort
~4–5 days"


create_issue \
  "[Video Consultation] Phase 1: Mobile — Build VideoLobbyScreen with device preview" \
  "type: feature,area: mobile,phase: v2,priority: high" \
  "## Summary

Build a pre-call lobby screen for camera/mic preview before joining the video consultation.

## Changes Required

1. **Create \`VideoLobbyScreen.tsx\`** at \`apps/mobile/src/screens/common/\`
2. **UI features:**
   - Camera preview (local video)
   - Mic level indicator
   - Camera/mic toggles (pre-join)
   - \"Join Call\" button
   - Provider/patient name and booking details
   - Waiting status indicator
3. **Pre-join checks:** Permissions, connectivity, network quality
4. **Navigation:** Lobby → VideoCallScreen, Lobby → back to booking

## Acceptance Criteria

- [ ] Camera preview shows local video
- [ ] Mic and camera toggleable before joining
- [ ] Permissions checked and requested
- [ ] \"Join Call\" navigates to VideoCallScreen
- [ ] Booking details displayed
- [ ] Works on Android and iOS

## Dependencies
Issue: VideoCallScreen

## Effort
~2–3 days"


create_issue \
  "[Video Consultation] Phase 1: Mobile — Integrate VIDEO_CONSULTATION mode into booking flow" \
  "type: feature,area: mobile,phase: v2,priority: high" \
  "## Summary

Add VIDEO_CONSULTATION as a third booking mode in the patient booking flow.

## Changes Required

1. **RecommendationScreen** — Show \"Video Consultation\" mode option
2. **BookingConfirmScreen** — Display video details (no address needed)
3. **ProviderListScreen** — Filter providers supporting video
4. **Provider screens:**
   - IncomingBookingScreen — Show video booking type, \"Start Video Call\" action
   - BookingDetailScreen — Show session status, \"Join Call\" button
5. **Patient screens:**
   - Show video session status and \"Join Waiting Room\" button
   - HistoryScreen — Display video bookings with duration
6. **Update \`@curex24/types\`** — Add VIDEO_CONSULTATION to shared BookingMode
7. **API calls** — Handle addressId being optional for video

## Acceptance Criteria

- [ ] Patient can select \"Video Consultation\" during booking
- [ ] Address selection skipped for video consultations
- [ ] Provider sees video bookings and can start/join calls
- [ ] Patient can join video lobby from booking details
- [ ] Booking history displays video entries correctly
- [ ] Video consultation fee displayed correctly

## Dependencies
Issues: Database schema, VideoConsultationModule, VideoCallScreen, VideoLobbyScreen

## Effort
~3–4 days"


# ─── Phase 2: Polish ───

create_issue \
  "[Video Consultation] Phase 2: Mobile — Network quality indicator and audio-only fallback" \
  "type: feature,area: mobile,phase: v2,priority: medium" \
  "## Summary

Add network quality monitoring with automatic audio-only fallback for poor connections.

## Changes Required

1. **Network quality indicator** — Connection quality bars on video call screen
2. **Audio-only fallback:**
   - Prompt to switch when quality drops
   - Auto-switch after 10s of instability
   - Manual toggle between video and audio-only
3. **Pre-call network check** — Speed test on lobby screen
4. **Reconnection handling** — \"Reconnecting...\" overlay

## Acceptance Criteria

- [ ] Network quality indicator visible during call
- [ ] Auto-fallback to audio-only on poor connection
- [ ] Manual video/audio-only toggle
- [ ] Pre-call quality displayed in lobby
- [ ] Reconnection UI shown during disconnections

## Dependencies
Issue: VideoCallScreen

## Effort
~3 days"


create_issue \
  "[Video Consultation] Phase 2: Mobile — Session timer, call controls polish, and post-call screen" \
  "type: feature,area: mobile,phase: v2,priority: medium" \
  "## Summary

Polish video call UX with session timer, improved controls, and a post-call summary screen.

## Changes Required

1. **Session timer** — Elapsed time (MM:SS) on call screen
2. **Controls polish:**
   - Animated toggle states
   - Speaker/earpiece toggle
   - Haptic feedback
3. **Post-call screen (\`VideoCallEndScreen.tsx\`):**
   - Call duration display
   - Quality rating (1–5 stars)
   - \"View/Write Consultation Summary\" buttons
4. **Auto-end** — End session after 60s with single participant

## Acceptance Criteria

- [ ] Timer updates every second
- [ ] Speaker/earpiece toggle works
- [ ] Post-call screen shows duration and rating
- [ ] Auto-end after 60s timeout
- [ ] Smooth call → end screen transitions

## Dependencies
Issue: VideoCallScreen

## Effort
~2–3 days"


create_issue \
  "[Video Consultation] Phase 2: Mobile — In-call chat feature" \
  "type: feature,area: mobile,phase: v2,priority: low" \
  "## Summary

Add text chat to the video call screen for sharing medication names, dosages, or when audio is unclear.

## Changes Required

1. **Chat panel** — Slide-up panel or bottom sheet on VideoCallScreen
2. **Message types:** Text messages, system messages (join/leave)
3. **100ms chat** — Use SDK built-in messaging
4. **Unread indicator** — Badge on chat icon
5. **Persistence** — Store messages in VideoSession record

## Acceptance Criteria

- [ ] Chat panel accessible from video call screen
- [ ] Real-time message delivery
- [ ] Unread message indicator
- [ ] Chat history persisted
- [ ] System messages for join/leave

## Dependencies
Issue: VideoCallScreen

## Effort
~2 days"


# ─── Phase 3: Advanced ───

create_issue \
  "[Video Consultation] Phase 3: API/Mobile — Cloud recording with consent" \
  "type: feature,area: api,area: mobile,phase: v2,priority: medium" \
  "## Summary

Implement cloud recording with explicit patient consent, compliant with Indian Telemedicine Guidelines and DPDP Act 2023.

## Changes Required

### API
1. **Consent endpoint** — \`POST /api/v1/video-sessions/:bookingId/recording-consent\`
2. **Start/stop recording** — Trigger 100ms cloud recording when both consent
3. **Recording webhook** — Handle \`recording.success\`, store URL
4. **Audit logging** — Log consent in AuditLog table
5. **Auto-delete policy** — Configurable recording retention (default 90 days)

### Mobile
1. **Consent dialog** — Show to patient before call
2. **Recording indicator** — Red \"REC\" dot when active
3. **Stop recording button** — Either participant can stop

## Acceptance Criteria

- [ ] Patient explicitly consents before recording
- [ ] Consent stored in database and audit log
- [ ] Recording only starts with mutual consent
- [ ] Recording URL stored on completion
- [ ] Recording indicator visible
- [ ] Either party can stop recording
- [ ] Auto-delete configurable via env var

## Dependencies
Issues: VideoConsultationModule, Webhooks, VideoCallScreen

## Effort
~3–4 days"


create_issue \
  "[Video Consultation] Phase 3: Mobile — Picture-in-Picture (PiP) and CallKeep integration" \
  "type: feature,area: mobile,phase: v2,priority: low" \
  "## Summary

Add PiP for multitasking during calls and CallKeep for native incoming call UI.

## Changes Required

1. **PiP mode:**
   - Activate when leaving call screen
   - Show remote video in PiP window
   - Return to full screen on tap
   - Android + iOS support
2. **CallKeep:**
   - Native incoming call UI for video consultation notifications
   - Answer/decline from lock screen
   - \`react-native-callkeep\` integration

## Acceptance Criteria

- [ ] PiP activates on screen leave
- [ ] PiP shows remote video
- [ ] Tap PiP returns to full screen
- [ ] Incoming calls show native UI
- [ ] Answer/decline from notification/lock screen
- [ ] Works on Android and iOS

## Dependencies
Issue: VideoCallScreen

## Effort
~4–5 days"


create_issue \
  "[Video Consultation] Phase 3: Mobile — Screen sharing and virtual backgrounds" \
  "type: feature,area: mobile,phase: v2,priority: low" \
  "## Summary

Add screen sharing for providers (share medical images/reports) and virtual backgrounds for privacy.

## Changes Required

1. **Screen sharing:**
   - Provider can share screen during consultation
   - Patient sees shared content full-screen
   - Toggle on call controls
   - Uses 100ms screen share API
2. **Virtual backgrounds:**
   - Predefined options (clinic, neutral, blur)
   - Background blur
   - Selectable from lobby or during call
   - Uses 100ms virtual background plugin

## Acceptance Criteria

- [ ] Provider can start/stop screen sharing
- [ ] Shared screen visible to other participant
- [ ] Virtual backgrounds available in lobby and call
- [ ] Background blur works smoothly
- [ ] Acceptable performance with virtual backgrounds

## Dependencies
Issues: VideoCallScreen, VideoLobbyScreen

## Effort
~3–4 days"


# ─── Phase 4: Analytics ───

create_issue \
  "[Video Consultation] Phase 4: API/Admin — Video consultation analytics dashboard" \
  "type: feature,area: api,area: admin,phase: v2,priority: low" \
  "## Summary

Build analytics endpoints and admin dashboard for video consultation metrics.

## Changes Required

### API
1. **Analytics endpoints:**
   - \`GET /api/v1/admin/video-sessions/stats\` — Aggregate stats
   - \`GET /api/v1/admin/video-sessions\` — List sessions with filters
2. **Metrics:** Total sessions, avg duration, completion rate, drop-off rate, peak hours, audio-only fallback rate, avg quality rating, revenue

### Admin Dashboard
1. **Video Consultation tab** on admin dashboard
2. **Stats cards** — Total sessions, avg duration, completion rate, revenue
3. **Charts** — Sessions over time, peak hours heatmap
4. **Session list** — Filterable table with details

## Acceptance Criteria

- [ ] Analytics API returns accurate metrics
- [ ] Admin dashboard displays video stats
- [ ] Sessions filterable by date, status, provider
- [ ] Charts render correctly
- [ ] Performant with large datasets

## Dependencies
Issues: Database schema, VideoConsultationModule, Webhooks

## Effort
~3–4 days"


echo "=============================================="
echo " Done! All issues created."
echo "=============================================="
