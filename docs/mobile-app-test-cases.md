# Curex24 Mobile App Test Cases

## Auth

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| AUTH-001 | Login screen loads from cold launch | App installed; user logged out | 1. Launch app. 2. Open Auth flow. | Login UI renders without broken state. | Functional | High | Not Run |
| AUTH-002 | Phone field accepts digits only | Login screen open | 1. Enter `98ab76-54@32`. | Field keeps numeric digits only. | Edge | High | Not Run |
| AUTH-003 | Send OTP disabled for incomplete number | Login screen open | 1. Enter fewer than required digits. | Send OTP remains disabled. | Validation | High | Not Run |
| AUTH-004 | Send OTP enabled for valid number | Login screen open | 1. Enter valid phone number. | Send OTP becomes enabled. | Functional | High | Not Run |
| AUTH-005 | OTP verification success logs user in | Valid OTP available | 1. Request OTP. 2. Enter correct OTP. 3. Tap Verify. | User is authenticated and routed to correct home screen. | Functional | High | Not Run |
| AUTH-006 | Wrong OTP shows error and keeps user on OTP screen | OTP screen open | 1. Enter invalid OTP. 2. Tap Verify. | Error message shown; user stays on OTP screen. | Negative | High | Not Run |
| AUTH-007 | Expired OTP requires resend | OTP screen with expired code | 1. Enter expired OTP. 2. Verify. | Expired OTP error shown with resend option. | Edge | High | Not Run |
| AUTH-008 | Resend OTP blocked until timer completes | OTP screen open immediately after request | 1. Try tapping Resend before timer ends. | Resend action is unavailable until timer reaches zero. | Validation | Medium | Not Run |
| AUTH-009 | Resend OTP retry succeeds after transient network failure | OTP screen; unstable network | 1. Disable network and tap Resend. 2. Re-enable network. 3. Tap Resend again. | First attempt fails gracefully; second succeeds without app restart. | Retry | High | Not Run |
| AUTH-010 | Double tap Verify OTP does not create duplicate requests | OTP entered; Verify enabled | 1. Tap Verify rapidly 2–3 times. | Only one verification attempt is processed; no duplicate toasts/navigation. | Race Condition | High | Not Run |
| AUTH-011 | Session persists after app relaunch | User already logged in | 1. Force close app. 2. Reopen app. | User remains logged in and lands on authenticated flow. | Persistence | High | Not Run |
| AUTH-012 | Logout clears session and returns to Auth flow | User logged in | 1. Tap Logout. 2. Relaunch app. | User is logged out and must authenticate again. | Functional | High | Not Run |

## Booking

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| BOOK-001 | Create new booking with valid inputs | Logged-in patient; serviceable location | 1. Fill booking form. 2. Submit. | Booking is created and confirmation screen appears. | Functional | High | Not Run |
| BOOK-002 | Required fields validation on booking form | Booking form open | 1. Leave mandatory field empty. 2. Submit. | Inline validation shown; booking not submitted. | Validation | High | Not Run |
| BOOK-003 | Past date/time is blocked | Booking form open | 1. Select past slot. 2. Submit. | Past slot cannot be submitted. | Edge | High | Not Run |
| BOOK-004 | Unavailable slot is rejected gracefully | Slot already taken | 1. Select slot. 2. Submit booking. | User sees slot unavailable message and can pick another slot. | Negative | High | Not Run |
| BOOK-005 | Booking confirmation survives slow network | Slow 3G simulation | 1. Submit booking on slow network. | Loader persists; app does not freeze/crash; result eventually shown. | Network | Medium | Not Run |
| BOOK-006 | Booking submit failure supports retry | Network disconnected during submit | 1. Submit booking offline. 2. Reconnect. 3. Tap Retry. | First attempt fails with clear message; retry completes booking. | Retry | High | Not Run |
| BOOK-007 | Double tap Confirm does not create duplicate booking | Valid form ready | 1. Tap Confirm rapidly multiple times. | Single booking created; duplicate prevention works. | Race Condition | High | Not Run |
| BOOK-008 | Cancel booking from booking detail before provider assignment | Existing upcoming booking | 1. Open booking detail. 2. Tap Cancel. | Status changes to cancelled with timestamp. | Functional | High | Not Run |
| BOOK-009 | Cancel booking blocked after completion | Completed booking exists | 1. Open completed booking. 2. Attempt cancel. | Cancel action unavailable or blocked with message. | Validation | Medium | Not Run |
| BOOK-010 | Refresh booking list after creating booking | Booking created successfully | 1. Return to booking list. 2. Pull to refresh. | Newly created booking appears once with correct status. | Sync | High | Not Run |
| BOOK-011 | Booking list handles empty state | No bookings for account | 1. Open My Bookings. | Empty state illustration/text shown with no UI break. | UX | Medium | Not Run |
| BOOK-012 | Rapid open/close booking details does not show stale data | Multiple bookings present | 1. Open booking A. 2. Quickly go back and open booking B. | Booking B details are accurate; no stale data from booking A. | Race Condition | High | Not Run |
| BOOK-013 | Booking status badge updates after manual refresh | Booking status changed externally | 1. Pull to refresh in bookings list. | Latest status badge is displayed correctly. | Sync | High | Not Run |
| BOOK-014 | Offline mode shows actionable message on booking screens | Device offline | 1. Open booking list/detail offline. | Clear offline message and retry action shown; app remains usable. | Network | High | Not Run |

## Payment

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| PAY-001 | Payment screen shows correct payable amount | Booking ready for payment | 1. Open payment screen. | Amount displayed matches booking total. | Functional | High | Not Run |
| PAY-002 | User can switch payment method | Payment screen open | 1. Select each payment method option. | Selected method updates correctly. | Functional | Medium | Not Run |
| PAY-003 | Pay action disabled while processing | Valid payment details present | 1. Tap Pay once. | Button enters loading/disabled state until response completes. | UX | High | Not Run |
| PAY-004 | Successful payment shows confirmation state | Payment gateway success | 1. Complete payment flow. | Success message shown with transaction reference. | Functional | High | Not Run |
| PAY-005 | Failed payment shows recoverable error | Payment gateway decline | 1. Attempt payment with declined method. | Failure message shown with option to retry or change method. | Negative | High | Not Run |
| PAY-006 | Payment retry succeeds after temporary gateway timeout | Gateway timeout on first attempt | 1. Tap Pay (timeout). 2. Retry payment. | Retry completes successfully without duplicate charge. | Retry | High | Not Run |
| PAY-007 | Double tap Pay does not trigger multiple charge requests | Pay button enabled | 1. Tap Pay rapidly several times. | Single transaction request is sent. | Race Condition | Critical | Not Run |
| PAY-008 | User exits and reopens payment screen during processing | Payment in progress | 1. Start payment. 2. Navigate back. 3. Reopen booking/payment. | Final payment state is consistent; no stuck spinner. | Edge | High | Not Run |
| PAY-009 | Payment success updates booking status in app | Payment successful | 1. Complete payment. 2. Open booking detail/list. | Booking status reflects paid/confirmed state. | Sync | High | Not Run |
| PAY-010 | Offline payment attempt fails gracefully | Device offline | 1. Open payment screen. 2. Tap Pay. | Offline error shown; no crash; retry available after reconnect. | Network | High | Not Run |

## Provider

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| PROV-001 | Provider onboarding form submits with valid data | New provider account | 1. Fill all required onboarding fields. 2. Submit. | Onboarding submission succeeds and next state appears. | Functional | High | Not Run |
| PROV-002 | Onboarding mandatory field validation | Onboarding screen open | 1. Leave required field empty. 2. Submit. | Inline validation shown; submit blocked. | Validation | High | Not Run |
| PROV-003 | Invalid document format upload blocked | Document upload step open | 1. Try unsupported file type. | File rejected with clear format guidance. | Negative | Medium | Not Run |
| PROV-004 | Large document upload failure is recoverable | Upload step; oversized file | 1. Upload oversized file. 2. Retry with valid size. | Oversize error shown; retry with valid file succeeds. | Edge | Medium | Not Run |
| PROV-005 | Provider can accept new booking request | Provider has pending request | 1. Open request. 2. Tap Accept. | Request moves to accepted state. | Functional | High | Not Run |
| PROV-006 | Provider can reject request with reason | Pending request exists | 1. Tap Reject. 2. Enter reason. 3. Confirm. | Request marked rejected with reason stored/displayed. | Functional | Medium | Not Run |
| PROV-007 | Status progression follows allowed order only | Accepted booking exists | 1. Attempt status transitions in app. | Only valid next action is enabled at each step. | Workflow | High | Not Run |
| PROV-008 | Duplicate status updates prevented on rapid taps | Status action enabled | 1. Tap status button rapidly. | Single status change applied; no duplicate updates. | Race Condition | High | Not Run |
| PROV-009 | Consultation summary submit handles temporary failure | In-progress consultation | 1. Submit summary with network drop. 2. Reconnect. 3. Retry. | First attempt fails safely; retry succeeds once. | Retry | High | Not Run |
| PROV-010 | Provider home handles no assigned bookings state | Logged-in provider with no bookings | 1. Open provider dashboard. | Empty state displayed with clear next action guidance. | UX | Medium | Not Run |
| PROV-011 | Pull-to-refresh updates provider queue | Provider queue open | 1. Pull to refresh. | Latest request list appears without duplicates. | Sync | High | Not Run |
| PROV-012 | App resumes to latest provider task after backgrounding | Active provider task exists | 1. Send app to background. 2. Return to app. | Current task state is accurate and actionable. | State | High | Not Run |

## Tracking

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| TRACK-001 | Live tracking starts for active booking | Active provider trip status | 1. Open tracking screen. | Current location marker and route are rendered. | Functional | High | Not Run |
| TRACK-002 | Tracking updates as provider moves | Live tracking active | 1. Simulate provider location changes. | Marker updates smoothly with latest position. | Functional | High | Not Run |
| TRACK-003 | GPS permission denied flow is handled | Location permission denied | 1. Open tracking. | Permission prompt/message shown with recovery guidance. | Negative | High | Not Run |
| TRACK-004 | Temporary GPS signal loss shows fallback state | Tracking active; signal lost | 1. Simulate GPS loss. | Last known location retained with reconnecting indicator. | Edge | Medium | Not Run |
| TRACK-005 | Network disconnect pauses updates without crash | Tracking active; network off | 1. Disable network during tracking. | Update attempts fail gracefully; UI remains stable. | Network | High | Not Run |
| TRACK-006 | Tracking recovers automatically after reconnect | Tracking paused due to no network | 1. Re-enable network. | Auto-refresh resumes and latest position syncs. | Retry | High | Not Run |
| TRACK-007 | Rapid navigation in/out of tracking does not leak stale markers | Multiple quick screen transitions | 1. Enter/exit tracking repeatedly. | Correct booking map state shown; no stale or duplicated markers. | Race Condition | Medium | Not Run |
| TRACK-008 | Tracking stops after booking completion | Booking moved to completed | 1. Complete booking. 2. Open tracking view. | Live updates stop; completed status shown. | Workflow | High | Not Run |

## Sync

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| SYNC-001 | Pull-to-refresh reconciles local list with server | Existing bookings in app | 1. Pull to refresh on bookings list. | List matches latest server state. | Sync | High | Not Run |
| SYNC-002 | App restart preserves latest known booking states | Existing bookings and statuses | 1. Close app. 2. Reopen app. | Last synced statuses load correctly on startup. | Persistence | High | Not Run |
| SYNC-003 | Offline changes are queued and retried when online | Offline during mutable action | 1. Perform supported action offline. 2. Reconnect network. | Queued action retries automatically or via retry CTA and syncs once. | Retry | High | Not Run |
| SYNC-004 | Duplicate records are not created after retry | Prior request timed out client-side | 1. Trigger timeout. 2. Retry same action. | Single final record exists in app state. | Edge | High | Not Run |
| SYNC-005 | Conflicting status update resolves to latest valid state | Same booking updated from two clients | 1. Trigger status update from another device. 2. Refresh current app. | App reflects latest authoritative status without crash. | Conflict | High | Not Run |
| SYNC-006 | Background to foreground triggers data revalidation | App backgrounded for several minutes | 1. Return app to foreground. | Critical data auto-refreshes and stale badges clear. | Lifecycle | Medium | Not Run |
| SYNC-007 | Timeouts show non-blocking sync error banner | Slow backend response | 1. Trigger sync on slow network. | User sees timeout message with retry; app remains interactive. | Network | Medium | Not Run |
| SYNC-008 | Manual retry after sync failure succeeds | Previous sync failed | 1. Tap Retry from error state. | Sync completes and error banner clears. | Retry | High | Not Run |
| SYNC-009 | Notification-triggered refresh opens correct booking state | Push notification received for booking update | 1. Tap notification. | Correct booking opens with latest status. | Integration | High | Not Run |
| SYNC-010 | Fast repeated refresh gestures do not break list state | Booking list open | 1. Pull to refresh repeatedly/quickly. | One coherent refresh cycle; no duplicate loaders/items. | Race Condition | Medium | Not Run |

## UX

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| UX-001 | Global loading indicators appear for long-running actions | Any action with server latency | 1. Trigger long-running action. | Visible loader indicates progress until completion/failure. | UX | High | Not Run |
| UX-002 | Error messages are human-readable and actionable | Trigger any known error | 1. Cause failure scenario. | Message avoids technical jargon and provides next step. | Content | Medium | Not Run |
| UX-003 | Primary CTA stays disabled when form invalid | Any form with required fields | 1. Leave invalid values. | CTA disabled with clear validation hints. | Validation | High | Not Run |
| UX-004 | Keyboard does not block critical CTAs | Form screen on mobile keyboard | 1. Focus lower input fields. | Screen adjusts so submit CTA remains reachable. | Layout | High | Not Run |
| UX-005 | Back navigation never lands on broken/blank screen | Multi-step flow active | 1. Navigate through 3+ screens. 2. Use Back repeatedly. | Back stack behaves predictably with valid screen states. | Navigation | High | Not Run |
| UX-006 | Tap throttling prevents accidental double-submit in critical forms | Submit-ready form | 1. Tap submit rapidly. | Only one submission is processed. | Race Condition | High | Not Run |
| UX-007 | Offline banner appears and clears correctly | Toggle connectivity while on app | 1. Disable internet. 2. Re-enable internet. | Offline indicator appears when offline and disappears after reconnect. | Network | Medium | Not Run |
| UX-008 | UI remains responsive under rapid tab switching | Tabbed home available | 1. Switch tabs quickly for 20–30 seconds. | No freeze, no visual corruption, no stuck loaders. | Stress | Medium | Not Run |

## Staging Integration Validation

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| STG-001 | Booking created in mobile appears in staging admin dashboard | Staging mobile + staging admin access | 1. Create booking in mobile app. 2. Open admin dashboard bookings. | New booking appears with matching patient, service, and timestamp. | E2E Integration | Critical | Not Run |
| STG-002 | Booking status updates in mobile sync to admin timeline | Existing staging booking | 1. Progress booking status in mobile flow. 2. Check admin booking detail. | Admin timeline reflects each status change in correct order. | E2E Integration | Critical | Not Run |
| STG-003 | Provider onboarding submission appears in admin verification queue | New provider submits onboarding in mobile | 1. Complete onboarding from mobile. 2. Open admin verification queue. | Provider record appears with correct submitted details/documents. | E2E Integration | Critical | Not Run |
| STG-004 | Admin approval/rejection reflects back in provider mobile state | Provider pending review in staging | 1. Approve/reject in admin. 2. Refresh provider mobile app. | Provider app shows updated verification status accurately. | E2E Integration | High | Not Run |
| STG-005 | Successful mobile payment appears in admin earnings/revenue views | Payable booking in staging | 1. Complete payment in mobile. 2. Open admin earnings/reports. | Payment entry appears with matching amount, booking reference, and status. | E2E Integration | Critical | Not Run |
| STG-006 | Payment failure in mobile does not create false positive earnings entry | Simulate declined/failed payment | 1. Attempt payment and force failure. 2. Check admin earnings. | No successful earnings entry created for failed payment. | E2E Integration | High | Not Run |
| STG-007 | Diagnostics requested from mobile consultation appear in admin diagnostics module | Provider creates diagnostics request in mobile | 1. Submit consultation with diagnostics required. 2. Check admin diagnostics list. | Diagnostics request appears with correct patient/booking linkage. | E2E Integration | High | Not Run |
| STG-008 | Specialist referral created in mobile appears in admin referral module | Provider creates referral in mobile | 1. Submit consultation with referral. 2. Check admin referrals module. | Referral record appears with correct specialty and booking context. | E2E Integration | High | Not Run |
| STG-009 | Admin-side booking edits sync back to mobile app after refresh | Existing booking visible in both systems | 1. Update booking attribute/status in admin. 2. Pull to refresh in mobile. | Mobile reflects admin-side change without duplication/inconsistency. | E2E Integration | High | Not Run |
| STG-010 | Cross-system consistency under rapid sequential updates | Booking open in mobile and admin | 1. Apply rapid valid updates from mobile then admin. 2. Refresh both ends. | Final state converges consistently across mobile and admin. | E2E Integration | Critical | Not Run |
