# Curex24 Mobile App Test Cases

## Summary

| Section | Test Cases |
|---|---|
| Auth | 15 |
| Booking | 13 |
| Payment | 11 |
| Provider | 15 |
| Tracking | 11 |
| Sync | 11 |
| UX | 8 |
| Staging Integration Validation | 11 |
| **Total** | **95** |

## Auth

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| AUTH-001 | Auth entry flow loads correctly from cold launch | App installed; user logged out | 1. Launch app. 2. Wait for splash transition. | Splash screen transitions to role selection without blank/frozen UI. | Functional | High | Not Run |
| AUTH-002 | Role selection routes to correct login context | Role selection screen is open | 1. Tap Patient. 2. Go back. 3. Tap Doctor. | Login screen opens both times with role-specific context. | Functional | High | Not Run |
| AUTH-003 | Phone input accepts digits only and enforces max length | Login screen is open | 1. Enter mixed characters and more than 10 digits. | Field stores only digits and caps at 10 digits. | Validation | High | Not Run |
| AUTH-004 | Send OTP button state follows phone validity | Login screen is open | 1. Enter fewer than 10 digits. 2. Enter 10 valid digits. | Send OTP is disabled for invalid input and enabled for valid input. | Validation | High | Not Run |
| AUTH-005 | OTP verification success authenticates and routes user | Valid OTP available | 1. Request OTP. 2. Enter correct 6-digit OTP. 3. Tap Verify OTP. | User is authenticated and navigated to role-appropriate app flow. | Functional | Critical | Not Run |
| AUTH-006 | Invalid OTP keeps user in OTP flow with error alert | OTP screen open | 1. Enter incorrect OTP. 2. Tap Verify OTP. | Error alert appears and user stays on OTP screen. | Negative | High | Not Run |
| AUTH-007 | Resend OTP remains locked until countdown completes | OTP just requested | 1. Observe resend area before timer reaches zero. 2. Wait for countdown completion. | Resend action is unavailable during countdown and appears only after timer ends. | Validation | Medium | Not Run |
| AUTH-008 | Resend OTP recovers after transient network failure | OTP screen open; unstable network | 1. Disable network and tap Resend OTP. 2. Re-enable network. 3. Tap Resend OTP again. | First resend fails gracefully; second resend succeeds without app restart. | Retry | High | Not Run |
| AUTH-009 | Rapid taps on Verify OTP do not cause duplicate submissions | OTP entered; Verify OTP enabled | 1. Tap Verify OTP rapidly multiple times. | Single verification flow is processed (no duplicate navigation or repeated success state). | Race Condition | High | Not Run |
| AUTH-010 | Session persists across app relaunch when auth data is valid | User already logged in | 1. Force close app. 2. Relaunch app. | User returns to authenticated flow without re-login. | Persistence | High | Not Run |
| AUTH-011 | Explicit sign out clears session and returns to auth flow | User logged in (patient or provider) | 1. Open profile. 2. Tap Sign Out/Logout and confirm (if prompted). | User is returned to auth flow and protected screens are no longer accessible. | Functional | High | Not Run |
| AUTH-012 | Expired OTP is rejected and requires requesting a new OTP | OTP was requested and allowed to expire | 1. Wait until OTP validity window ends. 2. Enter expired OTP. 3. Tap Verify OTP. | OTP verification fails with recoverable error and user can request/resend a new OTP. | Security | High | Not Run |
| AUTH-013 | Previously used OTP cannot be reused after successful verification | First OTP verification already succeeded once | 1. Return to OTP verification state for same phone/session context. 2. Re-enter the previously used OTP. 3. Tap Verify OTP. | Reused OTP is rejected and no duplicate authenticated transition occurs. | Security | Critical | Not Run |
| AUTH-014 | Switching role mid-auth does not leak OTP/auth state across roles | User started OTP flow for one role | 1. Start OTP flow as Patient (request OTP). 2. Navigate back to role selection. 3. Switch to Doctor and continue auth. | Role context resets cleanly; OTP/session state from prior role is not applied to the new role flow. | Workflow | High | Not Run |
| AUTH-015 | Network drop during OTP verification is recoverable without restart | OTP entered; unstable network | 1. Tap Verify OTP. 2. Disable network before response returns. 3. Re-enable network and retry verification. | Failed attempt is handled safely; user can retry verification successfully after reconnect. | Network | High | Not Run |

## Booking

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| BOOK-001 | Patient can start booking from service selection | Logged-in patient; service categories loaded | 1. Open a service category. 2. Enter optional symptoms. 3. Tap Find Providers. | App proceeds to provider discovery flow when location is available. | Functional | High | Not Run |
| BOOK-002 | Location-required guard blocks provider search when location unavailable | Logged-in patient; location disabled/denied | 1. Open a service category. 2. Tap Find Providers. | Location-required alert appears and user remains on current screen. | Edge | High | Not Run |
| BOOK-003 | Provider list supports distance and fee sorting without data corruption | Provider list contains multiple items | 1. Toggle Distance and Fee sorting repeatedly. | List reorders correctly without missing/duplicated cards. | Functional | Medium | Not Run |
| BOOK-004 | Empty provider search returns usable empty state | No providers available for selected criteria | 1. Open provider list for such criteria. | Empty state is shown with stable UI and no crash. | UX | Medium | Not Run |
| BOOK-005 | Booking confirmation screen shows selected provider, mode, and fee | Provider selected from list | 1. Select provider. 2. Open confirm screen. | Summary reflects chosen provider details and payable consultation fee. | Functional | High | Not Run |
| BOOK-006 | Home-visit booking blocks confirmation when required address is missing | Home-visit mode selected; address not set | 1. Tap Confirm & Proceed to Payment. | Booking is not created and error state is shown on confirmation screen. | Validation | High | Not Run |
| BOOK-007 | Booking creation success shows confirmation state and booking ID | Valid booking details | 1. Tap Confirm & Proceed to Payment. | Success state appears with booking ID and navigation options. | Functional | Critical | Not Run |
| BOOK-008 | Booking creation failure is recoverable from in-screen error state | Force booking create API failure | 1. Submit booking. 2. Dismiss shown error. 3. Retry submit. | Error is visible and dismissible; user can retry without restarting app. | Retry | High | Not Run |
| BOOK-009 | Rapid taps on booking confirm do not create duplicate bookings | Confirm button enabled | 1. Tap Confirm action rapidly multiple times. | Only one booking is created for the attempt. | Race Condition | Critical | Not Run |
| BOOK-010 | Booking cancellation is available only for cancellable states | Existing booking in REQUESTED or ACCEPTED | 1. Open tracking screen. 2. Tap Cancel Booking and confirm. | Cancellation succeeds for allowed states and state refreshes correctly. | Workflow | High | Not Run |
| BOOK-011 | Provider unavailability after selection blocks stale booking confirmation | Provider selected on confirmation screen | 1. Keep confirmation screen open. 2. Simulate provider becoming unavailable. 3. Tap Confirm & Proceed to Payment. | Booking creation is prevented with clear recoverable error and user can select another provider. | Edge | High | Not Run |
| BOOK-012 | Duplicate booking is prevented across rapid actions and second device/session | Same patient account logged in on two devices/sessions | 1. Submit same booking intent near-simultaneously from both sessions (or rapid repeated confirms). | System results in a single active booking intent; duplicate creation is blocked or deduplicated safely. | Race Condition | Critical | Not Run |
| BOOK-013 | Interrupted booking submission resumes to consistent state after app recovery | Booking submission in progress | 1. Tap Confirm & Proceed to Payment. 2. Immediately background/kill app before response completes. 3. Reopen app and check booking history/status. | App restores consistent booking state (created or not created) without duplicate/ghost bookings. | Recovery | High | Not Run |

## Payment

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| PAY-001 | Payment screen shows booking total from route params | Booking created and Payment screen opened | 1. Open Payment screen. | Displayed amount matches booking fee passed from booking confirmation flow. | Functional | High | Not Run |
| PAY-002 | User can switch payment method selection | Payment screen open | 1. Tap each payment method option. | Selected method highlight/check updates correctly. | Functional | Medium | Not Run |
| PAY-003 | Pay action enters loading state and blocks repeated taps | Payment screen open | 1. Tap Pay once. | Pay control shows loading and becomes temporarily non-interactive. | UX | High | Not Run |
| PAY-004 | Successful payment transitions to success state and tracking CTA | Payment API success path available | 1. Complete payment. | Success state is shown with option to navigate to provider tracking. | Functional | Critical | Not Run |
| PAY-005 | Failed payment keeps user on payment screen with recoverable alert | Simulate payment failure | 1. Attempt payment. | Failure alert appears and user can attempt payment again. | Negative | High | Not Run |
| PAY-006 | Payment retry after transient failure completes without duplicate success records | First attempt fails transiently | 1. Trigger a temporary failure. 2. Retry payment after recovery. | Retry succeeds and app reaches a single consistent payment success state. | Retry | High | Not Run |
| PAY-007 | Offline payment attempt fails gracefully and supports retry after reconnect | Device offline | 1. Attempt payment offline. 2. Reconnect network. 3. Retry payment. | Offline attempt fails safely; retry after reconnect can succeed. | Network | High | Not Run |
| PAY-008 | Rapid taps on Pay do not trigger duplicate charge attempts | Pay enabled | 1. Tap Pay rapidly multiple times. | Single payment flow is processed by the app UI. | Race Condition | Critical | Not Run |
| PAY-009 | App closed or crashed during payment recovers to correct payment state on reopen | Payment initiated for existing booking | 1. Start payment flow. 2. Close/kill app before callback/response completes. 3. Reopen app and inspect booking/payment status. | App reconciles payment state correctly on reopen and avoids duplicate charge attempts. | Recovery | Critical | Not Run |
| PAY-010 | Payment success with delayed UI refresh self-heals from backend truth | Backend marks payment successful but client UI remains pending temporarily | 1. Complete payment. 2. Simulate stale client state where success UI does not update immediately. 3. Trigger refresh/reopen booking. | UI reconciles to successful paid state from backend without requiring manual data correction. | Sync | High | Not Run |
| PAY-011 | Delayed payment callback keeps flow safe and resolves consistently when callback arrives | Payment provider callback delayed | 1. Initiate payment. 2. Hold callback/confirmation for extended period. 3. Resume normal callback delivery. | App maintains non-duplicate pending state and transitions correctly once callback is received. | Edge | High | Not Run |

## Provider

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| PROV-001 | Provider without profile sees onboarding prompt | Logged-in provider with no profile | 1. Open provider home. | Onboarding prompt appears with navigation to setup flow. | Functional | High | Not Run |
| PROV-002 | Onboarding step progression enforces required core fields | Onboarding screen open | 1. Leave name/specialization empty. 2. Try proceeding from step 1. | Progress is blocked until required fields are provided. | Validation | High | Not Run |
| PROV-003 | Service mode toggles control fee input visibility in onboarding | Onboarding step 2 open | 1. Toggle Home Visit/Clinic Visit on and off. | Related fee inputs appear/disappear according to selected modes. | Functional | Medium | Not Run |
| PROV-004 | Onboarding submission success updates flow without app restart | Valid onboarding data filled | 1. Complete steps and submit. | Success feedback appears and provider can continue in normal app flow. | Functional | High | Not Run |
| PROV-005 | Availability toggle handles update failures safely | Provider profile exists | 1. Toggle availability during simulated API failure. | Error is shown and app remains stable for retry. | Negative | High | Not Run |
| PROV-006 | Incoming booking accept action removes request and opens booking detail | Incoming request exists | 1. Open incoming requests. 2. Tap Accept. | Request is removed from queue and booking detail screen opens. | Functional | High | Not Run |
| PROV-007 | Incoming booking decline requires confirmation and updates queue | Incoming request exists | 1. Tap Decline. 2. Confirm decline. | Request is removed only after confirmation; queue remains consistent. | Workflow | Medium | Not Run |
| PROV-008 | Booking status action progresses through allowed next step only | Provider booking in active lifecycle | 1. Open booking detail. 2. Trigger next action button repeatedly across stages. | Only valid next transition is available at each stage. | Workflow | High | Not Run |
| PROV-009 | Entering consultation stage opens mandatory consultation summary form | Booking reaches IN_PROGRESS trigger | 1. Progress booking to consultation start action. | App navigates to consultation form screen. | Functional | High | Not Run |
| PROV-010 | Consultation summary blocks submit when required fields are missing | Consultation form open | 1. Leave symptoms/diagnosis empty. 2. Tap submit. | Validation alert appears and summary is not submitted. | Validation | High | Not Run |
| PROV-011 | Consultation summary submit failure is recoverable by retry | Consultation form filled; unstable network | 1. Submit during network/API failure. 2. Retry after recovery. | Failure alert appears; retry can complete submission. | Retry | High | Not Run |
| PROV-012 | KYC form validates year and shows verification attempt history updates | Provider opens KYC screen | 1. Enter invalid year. 2. Submit valid details. 3. Reopen/refresh logs. | Invalid year is blocked; valid request submits; verification history updates. | Functional | High | Not Run |
| PROV-013 | Concurrent provider acceptance race resolves to single booking owner | Same incoming booking visible to two providers | 1. Both providers attempt Accept at nearly same time. | Only one provider successfully acquires booking; other provider sees conflict-safe failure/update. | Race Condition | Critical | Not Run |
| PROV-014 | Network loss during provider status update preserves consistent recoverable state | Active provider booking with next status action available | 1. Tap status transition action. 2. Drop network before response returns. 3. Reconnect and refresh/retry. | App does not show false transition; status remains consistent and recoverable after reconnect. | Network | High | Not Run |
| PROV-015 | Failed status transition supports retry without invalid intermediate lifecycle state | Backend rejects one status transition attempt | 1. Trigger status transition failure. 2. Retry transition from booking detail. | Retry path works and booking lifecycle remains valid without skipped/duplicated statuses. | Retry | High | Not Run |

## Tracking

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| TRACK-001 | Home-visit tracking map renders when booking is in trackable status | Home-visit booking in ON_THE_WAY/ARRIVED/IN_PROGRESS with provider coordinates | 1. Open tracking screen. | Provider map and markers are rendered for trackable home-visit states. | Functional | High | Not Run |
| TRACK-002 | Booking status timeline refreshes on polling cycle | Tracking screen open for active booking | 1. Keep screen open while status changes externally. | Timeline/badge updates after refresh cycle without manual restart. | Sync | High | Not Run |
| TRACK-003 | Provider location updates propagate approximately every 10 seconds during active trip | Active home-visit booking with provider tracking enabled | 1. Observe Last updated values over time. | Location refresh reflects backend updates at roughly 10-second tracking cadence. | Functional | High | Not Run |
| TRACK-004 | Doctor-place bookings show clinic map and external navigation action | Doctor-place booking with clinic coordinates | 1. Open tracking screen. 2. Tap Navigate to Clinic. | Clinic map/details render and navigation handoff is triggered. | Functional | Medium | Not Run |
| TRACK-005 | Tracking screen remains stable when provider location is temporarily unavailable | Active booking with intermittent location feed | 1. Open tracking while location feed is missing or delayed. | Screen remains usable without crash or corrupted UI state. | Edge | Medium | Not Run |
| TRACK-006 | Rapid open/close of tracking for different bookings does not leak stale data | Multiple bookings available | 1. Open tracking for booking A. 2. Go back. 3. Open tracking for booking B quickly. | Booking B data is shown correctly without stale markers/details from booking A. | Race Condition | High | Not Run |
| TRACK-007 | Cancel booking action from tracking requires confirmation | Booking in cancellable state | 1. Tap Cancel Booking. 2. Dismiss prompt. 3. Repeat and confirm. | Prompt appears; cancel runs only after confirmation. | Workflow | High | Not Run |
| TRACK-008 | Completed consultation exposes summary view entry point | Booking status is COMPLETED or SUMMARY_SUBMITTED | 1. Open tracking screen. 2. Tap View Consultation Summary. | Consultation summary screen opens for that booking. | Functional | Medium | Not Run |
| TRACK-009 | Revoking GPS permission during active tracking is handled without crash | Active trackable booking with previously granted location permission | 1. Open tracking screen. 2. Revoke location permission from OS settings while app is active. 3. Return to app. | Tracking UI remains stable, shows recoverable location-permission state, and does not crash. | Edge | High | Not Run |
| TRACK-010 | Temporary backend location feed gap keeps tracking screen usable | Active tracked booking with intermittent backend location updates | 1. Pause backend location updates temporarily. 2. Observe tracking screen. 3. Resume updates. | UI remains stable during gap and resumes fresh location updates when feed recovers. | Resilience | Medium | Not Run |
| TRACK-011 | Rapid switching among multiple booking tracking views isolates each booking state | User has multiple active/recent bookings | 1. Alternate quickly between tracking views for booking A/B/C. | Each view shows correct booking-specific map/timeline without cross-booking data bleed. | Race Condition | High | Not Run |

## Sync

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| SYNC-001 | Patient pull-to-refresh updates services/bookings view consistently | Logged-in patient with network access | 1. Pull to refresh on patient home/history. | Fresh data loads without duplicated cards or stuck refresh indicator. | Sync | High | Not Run |
| SYNC-002 | Provider pull-to-refresh updates dashboard without inconsistent cards | Logged-in provider with profile | 1. Pull to refresh on provider home. | Latest data appears and card counts/statuses remain consistent. | Sync | High | Not Run |
| SYNC-003 | Incoming booking queue auto-refreshes every 10 seconds | Provider incoming queue screen open | 1. Keep queue screen open for >20 seconds while new request appears. | New request appears via periodic refresh without manual action. | Sync | High | Not Run |
| SYNC-004 | Repeated fast refresh gestures do not break list state | Any list screen with pull-to-refresh | 1. Trigger pull-to-refresh rapidly multiple times. | UI remains coherent with one stable final dataset. | Race Condition | Medium | Not Run |
| SYNC-005 | App restart preserves authenticated session when both token and user are present | User logged in | 1. Force close app. 2. Relaunch. | User stays in authenticated navigator. | Persistence | High | Not Run |
| SYNC-006 | Non-auth endpoint 401 does not force immediate full logout | Logged-in user; simulate 401 on non-auth API call | 1. Trigger protected non-auth request returning 401. | App does not perform full logout flow automatically. | Edge | High | Not Run |
| SYNC-007 | Auth endpoint 401 clears token only; re-auth is required after relaunch | Auth call can be forced to return 401 with stored session | 1. Trigger auth-endpoint 401 scenario. 2. Relaunch app. | Session is not treated as fully valid on relaunch because token is cleared; user must authenticate again. | Security | High | Not Run |
| SYNC-008 | Failed network actions can be retried from the same UI flow | Trigger failure on booking/payment/consultation submission | 1. Submit action during outage. 2. Restore network. 3. Retry in same screen. | Action can be retried successfully without app restart or data corruption. | Retry | High | Not Run |
| SYNC-009 | App resume after long inactivity refreshes stale state before critical actions | Logged-in user with app backgrounded for extended period | 1. Background app for long duration. 2. Reopen app. 3. Navigate to booking/payment screens. | Stale cached state is refreshed and critical actions use current backend data. | Sync | High | Not Run |
| SYNC-010 | Background-to-foreground transition triggers safe data synchronization | Logged-in user with data changes happening while app is backgrounded | 1. Send app to background. 2. Change related data externally. 3. Bring app to foreground. | Relevant lists/details reconcile with backend without duplicate entries or stale statuses. | Sync | High | Not Run |
| SYNC-011 | Multiple rapid refresh triggers converge to one consistent final dataset | Any refreshable screen | 1. Trigger refresh repeatedly via gesture/button/navigation in quick succession. | Concurrent refreshes are handled safely and final visible state is consistent and non-duplicated. | Race Condition | Medium | Not Run |

## UX

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| UX-001 | Loading indicators are shown during long-running actions | Any action invoking network request | 1. Trigger a long-running action (OTP send, booking confirm, payment, submit summary). | Visible loading state appears and clears when request finishes. | UX | High | Not Run |
| UX-002 | Critical CTAs are keyboard-safe on auth and form screens | Login/consultation forms open | 1. Focus low-position input fields. 2. Open keyboard. | Fields and primary action remain reachable without broken layout. | Layout | High | Not Run |
| UX-003 | Empty states are user-friendly and non-blocking | Open a list screen with no data | 1. Visit patient history or incoming queue with empty dataset. | Empty-state content appears cleanly with no blank or overlapping UI. | UX | Medium | Not Run |
| UX-004 | Back navigation across booking/payment/tracking remains stable | Active booking flow available | 1. Move through booking → payment/tracking screens. 2. Navigate back repeatedly. | Navigation stack behaves predictably without dead-end or blank screens. | Navigation | High | Not Run |
| UX-005 | Rapid tab switching does not freeze app UI | Logged-in user on tabbed navigator | 1. Switch tabs quickly for 20–30 seconds. | UI remains responsive without freeze or stuck loaders. | Stress | Medium | Not Run |
| UX-006 | Multi-line text fields remain usable with long content | Consultation or symptoms text input open | 1. Enter very long multi-line text. 2. Scroll and edit. | Text remains editable/readable; layout does not break. | Edge | Medium | Not Run |
| UX-007 | Button loading state prevents accidental duplicate submit on critical actions | Any screen using shared Button with loading | 1. Trigger submit action and tap repeatedly while loading. | Additional taps are ignored while loading state is active. | Race Condition | High | Not Run |
| UX-008 | Error states are recoverable without forcing app restart | Any recoverable API failure path | 1. Trigger error. 2. Dismiss/resolve alert or in-screen error. 3. Continue flow. | User can continue or retry in-app without crash/relaunch. | Recovery | High | Not Run |

## Staging Integration Validation

| Test Case ID | Title | Preconditions | Steps | Expected Result | Type | Priority | Status |
|---|---|---|---|---|---|---|---|
| STG-001 | Mobile booking creation propagates to admin booking records | Mobile and backend point to staging; admin data access available | 1. Create booking from mobile app. 2. Query/inspect staging admin booking records. | Same booking ID, patient, provider, mode, and timestamps are present across systems. | E2E Integration | Critical | Not Run |
| STG-002 | Booking lifecycle updates from provider mobile reflect in admin booking timeline | Existing staging booking visible in mobile | 1. Progress booking statuses in provider mobile flow. 2. Check staging admin booking data. | Admin-side booking timeline reflects status transitions in correct sequence. | E2E Integration | Critical | Not Run |
| STG-003 | Provider onboarding submission appears in admin provider pipeline | New provider account in staging | 1. Submit onboarding from provider mobile. 2. Check staging admin provider records/queue. | Provider profile data is available for admin review with matching submitted fields. | E2E Integration | Critical | Not Run |
| STG-004 | KYC/NMC verification submissions from mobile appear in admin verification queue | Provider in staging with KYC access | 1. Submit NMC verification from mobile. 2. Check staging admin verification queue data. | Verification request appears with matching registration details and status. | E2E Integration | High | Not Run |
| STG-005 | Successful mobile payment propagates to admin payout/earnings data | Payable booking in staging | 1. Complete payment in mobile. 2. Inspect staging admin financial records. | Payment is recorded with matching booking reference, amount, and paid state. | E2E Integration | Critical | Not Run |
| STG-006 | Failed mobile payment does not create false successful earnings entries | Staging payment failure scenario available | 1. Trigger payment failure in mobile. 2. Inspect staging admin financial records. | No successful earning/payout entry is created for failed payment. | E2E Integration | High | Not Run |
| STG-007 | Consultation diagnostics from mobile summary propagate to admin diagnostics data | Provider can submit consultation summary in staging | 1. Submit summary with diagnostic tests enabled in mobile. 2. Check staging admin diagnostics records. | Diagnostic request record appears with correct booking/provider linkage. | E2E Integration | High | Not Run |
| STG-008 | Specialist referral from mobile consultation propagates to admin referral data | Provider can submit referral in staging | 1. Submit summary with specialist referral in mobile. 2. Check staging admin referral records. | Referral record appears with expected patient/booking/specialist details. | E2E Integration | High | Not Run |
| STG-009 | Partial sync failure is detectable when booking exists but payment record is missing | Staging environment with ability to simulate partial pipeline failure | 1. Create booking and complete payment flow from mobile. 2. Validate booking and payment records in backend and admin portal. | Inconsistency (booking present but payment missing) is surfaced clearly and can be traced for reconciliation. | E2E Integration | Critical | Not Run |
| STG-010 | Delayed propagation between mobile, backend, and admin eventually converges without data loss | Staging systems connected with observable timestamps | 1. Trigger booking/status/payment update in mobile. 2. Check backend immediately. 3. Check admin portal over delayed intervals. | Data propagates with delay but converges to matching final state across mobile, backend, and admin portal. | E2E Integration | High | Not Run |
| STG-011 | Cross-system ID/timestamp/status consistency is validated end-to-end for same transaction | Staging mobile and admin access available | 1. Perform booking → payment → status progression in mobile. 2. Capture corresponding backend and admin records. 3. Compare booking/payment IDs, timestamps, and statuses across systems. | Mobile-origin transaction maps to consistent backend and admin records with no mismatched IDs, timestamps, or lifecycle status. | E2E Integration | Critical | Not Run |
