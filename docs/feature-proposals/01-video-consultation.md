# Feature: Video Consultation

## 1. Feature Overview

**Description:** Enable real-time audio/video consultations between patients and providers directly within the curex24 mobile app, alongside the existing home-visit and doctor-place visit modes.

### Key Use Cases & User Flows

1. **Patient books a video consultation** → Selects "Video Consultation" mode → Chooses provider & time slot → Makes payment → Receives notification when session is ready
2. **Provider accepts & starts session** → Gets notified of booking → Joins video room at scheduled time → Conducts consultation → Submits consultation summary & prescription
3. **In-session features** → Screen sharing (optional), chat, mute/unmute, camera toggle, session recording (with consent), poor-network fallback to audio-only
4. **Post-consultation** → Summary & prescription shared → Patient can rate/review → Recording available (if enabled)

---

## 2. Recommended Tools / Platforms / Partners

| Platform | Type | Pros | Cons | Pricing | Indian Market Fit |
|---|---|---|---|---|---|
| **100ms** | CPaaS | Built for India, competitive pricing, HIPAA path, excellent RN SDK, recording, virtual backgrounds | Newer platform | Free 10K min/month, ~$0.36/1K participant-min | ✅ Best – Indian company, INR billing |
| **Agora.io** | CPaaS | Ultra-low latency, strong Asia infra, RN SDK, cloud recording | Complex pricing | ~$0.99/1K min (audio), $3.99/1K min (video) | ✅ Excellent |
| **Twilio Video** | CPaaS | Mature API, HIPAA BAA, excellent docs, RN SDK | Higher cost at scale | ~$0.004/participant/min | ✅ Good |
| **Dyte** | CPaaS | Indian company, plugin architecture, RN SDK, UI Kit included | Smaller community | Free tier, custom pricing | ✅ Excellent |
| **Daily.co** | CPaaS | Simple API, prebuilt UI, HIPAA BAA | Limited mobile SDK | From $0.04/participant/min | ⚠️ Moderate |
| **Jitsi** | Open Source | Free, full control | High DevOps burden, no SLA | Free (infra costs only) | ⚠️ Requires own infra |

**🏆 Recommended:** **100ms** (primary) or **Agora** (alternative)

### Documentation Links

- 100ms: https://www.100ms.live/docs
- Agora: https://docs.agora.io/en
- Twilio Video: https://www.twilio.com/docs/video
- Dyte: https://docs.dyte.io

---

## 3. Tech Stack & Architecture

### Backend (NestJS API)

- New `VideoConsultationModule` with controller, service, gateway
- WebSocket gateway for signaling and session state
- Integration with 100ms Server-side SDK (`@100mslive/server-sdk`)
- New Prisma models: `VideoSession`, `VideoSessionRecording`
- BullMQ job for session reminders (5-min & 1-min before)

### Frontend (React Native/Expo)

- `@100mslive/react-native-hms` SDK
- New screens: `VideoLobbyScreen`, `VideoCallScreen`, `VideoCallEndScreen`
- PiP support, CallKeep integration

### Database Changes

- Add `VIDEO_CONSULTATION` to `BookingMode` enum
- New `VideoSession` model (roomId, sessionToken, status, startedAt, endedAt, duration, recordingUrl)
- Add `videoSessionId` relation on `Booking`

### Security

- End-to-end encryption (100ms built-in)
- Consent-based recording with audit trail
- HIPAA-eligible architecture (BAA with 100ms)
- Short-lived session tokens (JWT, 24hr expiry)

---

## 4. Implementation Plan

| Phase | Tasks | Effort | Priority |
|---|---|---|---|
| **Phase 1: MVP** | Schema changes, room creation API, token generation, basic video call screen, mute/camera controls | 3–4 weeks | P0 |
| **Phase 2: Polish** | Lobby/waiting room, network quality, audio-only fallback, session timer, in-call chat | 2–3 weeks | P1 |
| **Phase 3: Advanced** | Cloud recording with consent, PiP, CallKeep, screen sharing, virtual backgrounds | 2–3 weeks | P2 |
| **Phase 4: Analytics** | Call quality metrics, drop-off tracking, session duration analytics | 1–2 weeks | P2 |

### Step-by-step (Phase 1 – MVP)

1. Add `VIDEO_CONSULTATION` to `BookingMode` enum + `VideoSession` model in Prisma schema
2. Create `VideoConsultationModule` (controller + service) in NestJS
3. Implement room creation endpoint (`POST /video-sessions/:bookingId/create`)
4. Implement token generation endpoint (`GET /video-sessions/:bookingId/token`)
5. Add session lifecycle webhooks (session.open, peer.join, peer.leave, session.close)
6. Build `VideoCallScreen` in React Native with 100ms SDK
7. Build `VideoLobbyScreen` with device preview (camera/mic check)
8. Integrate with existing booking flow (add VIDEO_CONSULTATION mode option)
9. Add BullMQ job for pre-session reminders
10. End-to-end testing + UAT

### Testing Approach

- **Unit tests:** Room creation, token generation, session state management
- **Integration tests:** Full booking → video session lifecycle
- **E2E:** Manual testing on Android + iOS with real video
- **Load testing:** Concurrent session simulation

---

## 5. Regulatory & Compliance

- **Telemedicine Practice Guidelines 2020 (India):** Patient identity verification, documented consent, prescription format compliance
- **HIPAA (US users):** BAA with video provider, encrypted transmission, access logging
- **Indian IT Act & DPDP Act 2023:** Data localization, consent management, data retention
- **Recording consent:** Must be explicit, stored in audit log, patient can opt-out
- **Prescription validity:** Digital prescriptions via video must follow NMC guidelines

---

## 6. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Poor network quality in rural India | High | Audio-only fallback, adaptive bitrate, pre-call network check |
| SDK compatibility with Expo | Medium | 100ms has Expo support; pin SDK versions |
| Recording storage costs | Medium | Auto-delete after 90 days, compress, tiered storage |
| Vendor lock-in | Medium | Abstract video service behind interface |
| Regulatory changes | Low–Medium | Monitor NMC guidelines, maintain compliance checklist |

---

## 7. Timeline

- **MVP (Phase 1):** Weeks 1–4
- **Polish (Phase 2):** Weeks 5–7
- **Advanced (Phase 3):** Weeks 8–10
- **Total:** ~10 weeks for full feature
