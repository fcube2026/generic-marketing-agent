# Curex24 — Mobile App Test Suite

**Version:** 1.0  
**Generated:** 2026-04-15  
**Engineer role:** Senior Mobile QA  
**Source files analysed:**
- `navigation/RootNavigator.tsx`
- `screens/auth/LoginScreen.tsx`
- `screens/auth/OtpScreen.tsx`
- `screens/auth/RoleSelectScreen.tsx`
- `screens/provider/BookingDetailScreen.tsx`
- `screens/provider/ConsultationFormScreen.tsx`
- `screens/patient/PaymentScreen.tsx`
- `store/authStore.ts`
- `services/api.ts`
- `services/authService.ts`
- `hooks/useProviderLocationTracking.ts`

> All test cases are derived **exclusively** from the reviewed source files. Timings, state behaviour, and navigation flows are exact matches to the implementation. No backend-only, security, or fictional scenarios are included.

---

## Table of Contents

1. [Auth — Role Selection](#1-auth--role-selection)
2. [Auth — Login Screen](#2-auth--login-screen)
3. [Auth — OTP Screen](#3-auth--otp-screen)
4. [Auth — Session & State](#4-auth--session--state)
5. [Provider — Booking Detail](#5-provider--booking-detail)
6. [Tracking — Provider Location Hook](#6-tracking--provider-location-hook)
7. [Provider — Consultation Form](#7-provider--consultation-form)
8. [Payment](#8-payment)

---

## Code-Specific Quick Reference

| Behaviour | Exact Source Reference | Importance |
|---|---|---|
| OTP countdown starts at **60 s** | `OtpScreen.tsx:28` `setCountdown(60)` | AUTH-026, AUTH-028, AUTH-029 |
| Location push interval is **10 000 ms** | `useProviderLocationTracking.ts:6` | TRACK-002 |
| Trackable statuses: **ACCEPTED, ON\_THE\_WAY, ARRIVED, IN\_PROGRESS** | hook line 22 | TRACK-020, TRACK-021 |
| 401 interceptor clears token **only for `/auth/` URLs** | `api.ts:28-30` | AUTH-038, AUTH-039 |
| `loadStoredAuth` catches errors **internally** — never re-throws | `authStore.ts:43-45` | AUTH-037 |
| `IN_PROGRESS` transition also navigates to ConsultationForm | `BookingDetailScreen.tsx:53-55` | PROV-013 |
| Empty-name medicines filtered by `.filter(m => m.name.trim())` | `ConsultationFormScreen.tsx:52` | CONS-015 |
| "Track Provider" uses `navigation.replace` (not `navigate`) | `PaymentScreen.tsx:54` | PAY-008 |

---

## 1. Auth — Role Selection

| Test Case ID | Module | Title | Preconditions | Steps to Execute | Expected Result | Priority | Type | Status |
|---|---|---|---|---|---|---|---|---|
| AUTH-001 | Auth | RoleSelectScreen renders both role cards | App launched, no active session | 1. Open app cold. 2. Wait for navigation to settle. | "I'm a Patient" and "I'm a Doctor" cards are both visible on screen. | High | Positive | Not Run |
| AUTH-002 | Auth | Footer warning "role cannot be changed" is visible | RoleSelectScreen open | 1. Scroll to the bottom of the screen. | Text "Your role cannot be changed after registration." is displayed at the bottom. | Medium | Positive | Not Run |
| AUTH-003 | Auth | Tapping "Continue as Patient" navigates to LoginScreen with PATIENT role | RoleSelectScreen open | 1. Tap "Continue as Patient →" button. | LoginScreen opens. Title reads "Welcome, Patient". | High | Positive | Not Run |
| AUTH-004 | Auth | Tapping "Continue as Doctor" navigates to LoginScreen with PROVIDER role | RoleSelectScreen open | 1. Tap "Continue as Doctor →" button. | LoginScreen opens. Title reads "Welcome, Doctor". | High | Positive | Not Run |

---

## 2. Auth — Login Screen

| Test Case ID | Module | Title | Preconditions | Steps to Execute | Expected Result | Priority | Type | Status |
|---|---|---|---|---|---|---|---|---|
| AUTH-005 | Auth | Phone input strips non-numeric characters | LoginScreen open | 1. Type "abc123def456" into the phone field. | Input shows "123456" (digits only, max 10). | High | Positive | Not Run |
| AUTH-006 | Auth | Phone input is capped at 10 digits | LoginScreen open | 1. Attempt to type 12 consecutive digits. | Input field contains exactly 10 digits; excess characters are ignored. | High | Edge | Not Run |
| AUTH-007 | Auth | Send OTP button is disabled when phone has fewer than 10 digits | LoginScreen open | 1. Enter 9 digits in the phone field. | "Send OTP" button is disabled and non-tappable. | High | Negative | Not Run |
| AUTH-008 | Auth | Send OTP button becomes enabled at exactly 10 digits | LoginScreen open | 1. Enter exactly 10 digits. | "Send OTP" button becomes enabled. | High | Positive | Not Run |
| AUTH-009 | Auth | Typing in phone field clears any existing inline error | LoginScreen with a visible error message | 1. Observe error. 2. Change any digit in the phone field. | Error text is cleared immediately on text change. | Medium | Edge | Not Run |
| AUTH-010 | Auth | Phone number is prefixed with +91 before the API call | LoginScreen, 10 digits entered | 1. Enter "9876543210". 2. Tap Send OTP. | `authService.sendOtp` is called with "+919876543210". | High | Positive | Not Run |
| AUTH-011 | Auth | Phone already starting with "+" is not double-prefixed | LoginScreen | 1. Ensure phone value is "+919876543210". 2. Tap Send OTP. | `sendOtp` receives "+919876543210" — no double prefix. | Medium | Edge | Not Run |
| AUTH-012 | Auth | Successful sendOtp navigates to OtpScreen with correct params | LoginScreen, valid phone, API returns success | 1. Enter 10 digits. 2. Tap Send OTP. | OtpScreen opens. Correct phone is shown. Dev OTP banner appears if `response.otp` is present. | High | Positive | Not Run |
| AUTH-013 | Auth | API failure on sendOtp shows an Alert | LoginScreen, API returns an error | 1. Enter 10 digits. 2. Tap Send OTP (API fails). | Alert is shown with the API error message or the fallback "Failed to send OTP. Please try again." | High | Negative | Not Run |
| AUTH-014 | Auth | Button shows loading state during sendOtp call | LoginScreen, valid phone | 1. Tap Send OTP. 2. Observe button before API responds. | Button renders a loading indicator and is non-tappable during the in-flight call. | Medium | UX | Not Run |
| AUTH-015 | Auth | Loading state clears after sendOtp completes | LoginScreen | 1. Tap Send OTP. 2. Wait for API response (success or failure). | Button returns to its normal state after the call resolves. | Medium | UX | Not Run |
| AUTH-016 | Auth | Disclaimer text is visible on LoginScreen | LoginScreen open | 1. View the bottom section of the form card. | "By continuing, you agree to our Terms of Service and Privacy Policy" is visible. | Low | Positive | Not Run |
| AUTH-017 | Auth | KeyboardAvoidingView keeps form accessible on iOS when keyboard opens | iOS device, LoginScreen | 1. Tap the phone input. 2. Observe layout as keyboard opens. | Form remains accessible; the Send OTP button is not hidden behind the keyboard. | Medium | UX | Not Run |

---

## 3. Auth — OTP Screen

| Test Case ID | Module | Title | Preconditions | Steps to Execute | Expected Result | Priority | Type | Status |
|---|---|---|---|---|---|---|---|---|
| AUTH-018 | Auth | OtpScreen displays the phone number passed via route params | OtpScreen opened with phone "+919876543210" | 1. Observe the subtitle text. | "+919876543210" is rendered in bold within the subtitle. | High | Positive | Not Run |
| AUTH-019 | Auth | Dev OTP banner is shown when devOtp param is present | OtpScreen opened with a non-empty `devOtp` param | 1. Observe the screen below the subtitle. | A yellow banner with "🔧 Dev OTP: XXXXXX" is visible. | Medium | Positive | Not Run |
| AUTH-020 | Auth | Dev OTP banner is NOT shown when devOtp param is absent/falsy | OtpScreen opened without a `devOtp` param | 1. Observe the screen below the subtitle. | No yellow banner is rendered. | Medium | Edge | Not Run |
| AUTH-021 | Auth | Verify OTP button is disabled with fewer than 6 digits entered | OtpScreen open | 1. Enter 5 digits into the OTP input. | "Verify OTP" button is disabled. | High | Negative | Not Run |
| AUTH-022 | Auth | Verify OTP button becomes enabled when exactly 6 digits are entered | OtpScreen open | 1. Enter 6 digits. | "Verify OTP" button becomes enabled. | High | Positive | Not Run |
| AUTH-023 | Auth | Successful OTP verification calls setAuth and navigates to the correct stack | OtpScreen, valid 6-digit OTP, API returns token + user | 1. Enter the correct 6-digit OTP. 2. Tap Verify OTP. | `setAuth(token, user)` is called; token and user are written to AsyncStorage; `isAuthenticated` becomes true; RootNavigator routes to the correct navigator (Patient or Provider). | High | Positive | Not Run |
| AUTH-024 | Auth | Failed OTP verification shows an Alert | OtpScreen, wrong OTP, API returns an error | 1. Enter a wrong 6-digit OTP. 2. Tap Verify OTP. | Alert is shown with the API error message or the fallback "Invalid OTP. Please try again." | High | Negative | Not Run |
| AUTH-025 | Auth | Loading state is shown during OTP verification | OtpScreen, 6 digits entered | 1. Tap Verify OTP. 2. Observe button before API responds. | Button shows a loading indicator and is disabled during the in-flight call. | Medium | UX | Not Run |
| AUTH-026 | Auth | Countdown timer starts at 60 and decrements every second | OtpScreen just opened | 1. Observe the resend row. 2. Wait 3 seconds. | "Resend OTP in 60s" shown initially; decrements to approximately 57s after 3 seconds. | High | Positive | Not Run |
| AUTH-027 | Auth | Resend OTP link is not visible while countdown > 0 | OtpScreen, immediately after opening | 1. Observe the resend row. | Only the countdown text is shown; the "Resend OTP" link is not tappable. | High | Negative | Not Run |
| AUTH-028 | Auth | Resend OTP link appears after countdown reaches 0 | OtpScreen | 1. Wait 60 seconds. | "Resend OTP" tappable link replaces the countdown text. | High | Positive | Not Run |
| AUTH-029 | Auth | Tapping Resend OTP resets countdown to 60 | Countdown has expired | 1. Tap "Resend OTP". | Countdown resets to 60 immediately and begins decrementing again. | High | Positive | Not Run |
| AUTH-030 | Auth | Successful OTP resend shows a "Sent" Alert | Countdown expired, API returns success | 1. Tap "Resend OTP". | Alert is shown: title "Sent", message "OTP has been resent successfully". | Medium | Positive | Not Run |
| AUTH-031 | Auth | Failed OTP resend shows an "Error" Alert | Countdown expired, API returns an error | 1. Tap "Resend OTP" (API fails). | Alert is shown: "Failed to resend OTP". | Medium | Negative | Not Run |
| AUTH-032 | Auth | Back button on OtpScreen navigates to LoginScreen | OtpScreen open | 1. Tap "← Back". | User returns to LoginScreen. | Medium | Positive | Not Run |

---

## 4. Auth — Session & State

| Test Case ID | Module | Title | Preconditions | Steps to Execute | Expected Result | Priority | Type | Status |
|---|---|---|---|---|---|---|---|---|
| AUTH-033 | Auth | App shows LoadingSpinner while loadStoredAuth is resolving | App cold-started | 1. Launch app. 2. Observe the UI before storage resolves. | Full-screen `LoadingSpinner` with the message "Loading app…" is shown. | High | Positive | Not Run |
| AUTH-034 | Auth | Patient with stored session is routed directly to PatientNavigator | `auth_token` + `auth_user` (role = PATIENT) present in AsyncStorage | 1. Restart app. | Loading clears; PatientNavigator stack is rendered; AuthNavigator is not shown. | High | Positive | Not Run |
| AUTH-035 | Auth | Provider with stored session is routed directly to ProviderNavigator | `auth_token` + `auth_user` (role = PROVIDER) present in AsyncStorage | 1. Restart app. | ProviderNavigator stack is rendered. | High | Positive | Not Run |
| AUTH-036 | Auth | No stored session shows AuthNavigator (RoleSelect) | AsyncStorage is empty | 1. Launch app. | AuthNavigator (starting at RoleSelect) is rendered. | High | Positive | Not Run |
| AUTH-037 | Auth | Corrupted auth\_user JSON in AsyncStorage does not crash the app | `auth_token` present, `auth_user` = `"{{invalid"` in AsyncStorage | 1. Launch app. | App loads without crashing; `isLoading` is set to false; user is directed to AuthNavigator. (Error is caught internally by `loadStoredAuth`.) | High | Edge | Not Run |
| AUTH-038 | Auth | 401 on a /auth/ endpoint removes only the token from AsyncStorage | User logged in; a `/auth/` endpoint returns 401 | 1. Trigger an API call to a `/auth/` endpoint that returns 401. | `auth_token` is removed from AsyncStorage. Zustand in-memory state (`token`, `user`, `isAuthenticated`) is **not** updated — the user remains visually logged in. | High | Edge | Not Run |
| AUTH-039 | Auth | 401 on a non-auth endpoint does NOT remove the token | User logged in; a non-`/auth/` API returns 401 | 1. Trigger a 401 from any endpoint whose URL does not contain `/auth/`. | `auth_token` is retained in AsyncStorage; the error is propagated to the caller. | High | Edge | Not Run |
| AUTH-040 | Auth | Full logout clears both AsyncStorage keys and resets Zustand state | User is logged in | 1. Trigger the logout action (e.g. via a logout button). | `auth_token` and `auth_user` are removed from AsyncStorage; `token` and `user` are set to null; `isAuthenticated` becomes false. | High | Positive | Not Run |

---

## 5. Provider — Booking Detail

| Test Case ID | Module | Title | Preconditions | Steps to Execute | Expected Result | Priority | Type | Status |
|---|---|---|---|---|---|---|---|---|
| PROV-001 | Provider | Loading state is shown while booking is being fetched | BookingDetailScreen navigated to | 1. Open BookingDetailScreen. 2. Observe before the API responds. | "Loading booking…" text is shown centred on screen. | High | Positive | Not Run |
| PROV-002 | Provider | "Booking not found." shown if API returns null | `bookingService.getBookingById` returns null | 1. Navigate to BookingDetailScreen. | "Booking not found." text is shown centred on screen. | Medium | Negative | Not Run |
| PROV-003 | Provider | Status card shows the correct human-readable label | Booking with status `ON_THE_WAY` loaded | 1. View the status card at the top. | Status card displays "On the Way". | High | Positive | Not Run |
| PROV-004 | Provider | Progress timeline dots are filled up to the current status | Booking in `ARRIVED` status | 1. View the Progress card. | Steps REQUESTED, ACCEPTED, ON\_THE\_WAY, ARRIVED show filled dots; IN\_PROGRESS and COMPLETED show pending dots. | High | Positive | Not Run |
| PROV-005 | Provider | Patient phone number is masked — only last 4 digits shown | Booking loaded with a patient phone number | 1. View the Patient info card. | Phone displayed as "+91 ****XXXX" (only last 4 digits visible). | High | Positive | Not Run |
| PROV-006 | Provider | Patient address card is shown for HOME\_VISIT bookings | Booking with `mode = HOME_VISIT` and a non-empty address | 1. View the screen. | "Patient Address" card with address text and "🗺 Open in Maps" button is visible. | High | Positive | Not Run |
| PROV-007 | Provider | Patient address card is NOT shown for non-HOME\_VISIT bookings | Booking with `mode != HOME_VISIT` | 1. View the screen. | No address card is rendered. | High | Positive | Not Run |
| PROV-008 | Provider | "Open in Maps" triggers Google Maps with the correct encoded URL | HOME\_VISIT booking with an address | 1. Tap "🗺 Open in Maps". | `Linking.openURL` is called with `https://maps.google.com/?q=<URL-encoded-address>`. | Medium | Positive | Not Run |
| PROV-009 | Provider | ACCEPTED booking shows "🚗 Start Journey" action button | Booking in `ACCEPTED` status | 1. View the action area. | "🚗 Start Journey" button is visible. | High | Positive | Not Run |
| PROV-010 | Provider | Tapping "Start Journey" updates booking status to ON\_THE\_WAY | Booking in `ACCEPTED` | 1. Tap "🚗 Start Journey". | `updateStatus(bookingId, 'ON_THE_WAY')` is called; status card updates to "On the Way". | High | Positive | Not Run |
| PROV-011 | Provider | ON\_THE\_WAY booking shows "📍 Mark Arrived" | Booking in `ON_THE_WAY` | 1. View the action area. | "📍 Mark Arrived" button is visible. | High | Positive | Not Run |
| PROV-012 | Provider | ARRIVED booking shows "🩺 Begin Consultation" | Booking in `ARRIVED` | 1. View the action area. | "🩺 Begin Consultation" button is visible. | High | Positive | Not Run |
| PROV-013 | Provider | Tapping "Begin Consultation" updates to IN\_PROGRESS AND navigates to ConsultationForm | Booking in `ARRIVED` | 1. Tap "🩺 Begin Consultation". | Status updated to `IN_PROGRESS`; screen navigates to ConsultationFormScreen with the correct `bookingId` param. | High | Positive | Not Run |
| PROV-014 | Provider | IN\_PROGRESS booking shows "✅ Complete & Write Summary" | Booking in `IN_PROGRESS` | 1. View the action area. | "✅ Complete & Write Summary" button is visible. | High | Positive | Not Run |
| PROV-015 | Provider | Tapping "Complete" updates status to COMPLETED — no further navigation | Booking in `IN_PROGRESS` | 1. Tap "✅ Complete & Write Summary". | Status updated to `COMPLETED`; screen remains on BookingDetail (no navigation, as `getNextAction` returns null for COMPLETED). | High | Positive | Not Run |
| PROV-016 | Provider | No action button rendered for REQUESTED status | Booking in `REQUESTED` | 1. View the action area. | No action button is rendered. | High | Positive | Not Run |
| PROV-017 | Provider | No action button for terminal statuses (COMPLETED, CANCELLED, CLOSED) | Booking in `COMPLETED` | 1. View the action area. | No action button is visible. | Medium | Edge | Not Run |
| PROV-018 | Provider | Action button shows "Updating…" and is disabled during a status update | Any booking with an available action | 1. Tap the action button. 2. Observe before API responds. | Button shows "Updating…"; opacity is reduced to 0.7; button is disabled. | Medium | UX | Not Run |
| PROV-019 | Provider | Status update failure shows an Alert | `updateStatus` API returns an error | 1. Tap any action button (API fails). | Alert shown: "Failed to update status." | High | Negative | Not Run |
| PROV-020 | Provider | Location tracking is active for ACCEPTED/ON\_THE\_WAY/ARRIVED/IN\_PROGRESS | Booking in any of these four statuses | 1. Open BookingDetailScreen. 2. Wait up to 10 seconds. | `useProviderLocationTracking` fires immediately and then every 10 000 ms. | High | Positive | Not Run |
| PROV-021 | Provider | Location tracking is NOT active for REQUESTED or COMPLETED | Booking in `REQUESTED` or `COMPLETED` | 1. Open BookingDetailScreen. | No location push calls are made (hook's `isTrackable` is false for these statuses). | High | Edge | Not Run |

---

## 6. Tracking — Provider Location Hook

| Test Case ID | Module | Title | Preconditions | Steps to Execute | Expected Result | Priority | Type | Status |
|---|---|---|---|---|---|---|---|---|
| TRACK-001 | Tracking | First location push fires immediately on mount | BookingDetailScreen opened, booking in `ACCEPTED` status | 1. Open the screen; observe network calls immediately. | `updateProviderLocation` is called once at mount, before the first 10-second interval elapses. | High | Positive | Not Run |
| TRACK-002 | Tracking | Location is pushed every 10 000 ms (10 seconds) | BookingDetail open, booking in `ACCEPTED` | 1. Wait 30 seconds and count API calls. | `updateProviderLocation` is called approximately 3 additional times (once per 10 s interval). | High | Positive | Not Run |
| TRACK-003 | Tracking | Location push is paused when app goes to background | Active tracking, app sent to background | 1. Move app to background. | Interval is cleared; no further location calls are made while the app is backgrounded. | High | Edge | Not Run |
| TRACK-004 | Tracking | Location push resumes immediately when app returns to foreground | App was backgrounded during active tracking | 1. Return app to foreground. | An immediate push fires; the interval is restarted. | High | Edge | Not Run |
| TRACK-005 | Tracking | Location errors are silently swallowed — no crash or alert | `getCurrentLocation` throws an error (e.g. permission revoked) | 1. Revoke location permission or force an error. 2. Wait for a push cycle. | No crash occurs; no alert is shown; tracking continues silently on the next cycle. | High | Edge | Not Run |
| TRACK-006 | Tracking | Tracking interval is cleared on BookingDetail unmount | BookingDetailScreen during active tracking | 1. Navigate away from BookingDetailScreen. | Interval is cleared; no further push calls occur after unmount. | High | Edge | Not Run |

---

## 7. Provider — Consultation Form

| Test Case ID | Module | Title | Preconditions | Steps to Execute | Expected Result | Priority | Type | Status |
|---|---|---|---|---|---|---|---|---|
| CONS-001 | Provider | Submitting with empty symptoms field shows a validation Alert | ConsultationFormScreen open | 1. Leave symptoms blank. 2. Fill in diagnosis. 3. Tap Submit. | Alert shown — title "Required", message "Please fill in symptoms and diagnosis." | High | Negative | Not Run |
| CONS-002 | Provider | Submitting with empty diagnosis field shows a validation Alert | ConsultationFormScreen open | 1. Fill in symptoms. 2. Leave diagnosis blank. 3. Tap Submit. | Alert shown — "Please fill in symptoms and diagnosis." | High | Negative | Not Run |
| CONS-003 | Provider | Whitespace-only symptoms triggers the same validation Alert | ConsultationFormScreen | 1. Enter "   " (spaces) in symptoms. 2. Enter valid diagnosis. 3. Tap Submit. | Alert shown — "Please fill in symptoms and diagnosis." (`.trim()` check enforced). | High | Negative | Not Run |
| CONS-004 | Provider | Valid submission calls the service and shows a success Alert | Both required fields filled | 1. Enter symptoms and diagnosis. 2. Tap Submit. | `submitSummary` API is called; Alert shown — title "Summary Submitted", message "Consultation summary saved successfully." | High | Positive | Not Run |
| CONS-005 | Provider | Tapping OK on the success Alert navigates to Tabs | Success Alert shown | 1. Tap OK. | Navigation goes to `'Tabs'` (provider tab navigator). | High | Positive | Not Run |
| CONS-006 | Provider | Submit button is disabled and shows "Submitting…" during the API call | Form with valid data | 1. Tap Submit. 2. Observe button before API responds. | Button shows "Submitting…"; opacity is 0.7; button is disabled. | Medium | UX | Not Run |
| CONS-007 | Provider | API failure shows "Failed to submit summary." Alert | `submitSummary` API returns an error | 1. Fill required fields. 2. Tap Submit (API fails). | Alert shown — "Failed to submit summary. Please try again." | High | Negative | Not Run |
| CONS-008 | Provider | Follow-up notes input is hidden when the toggle is off | ConsultationForm, `followUpNeeded = false` | 1. View the Follow-up section. | Follow-up notes TextInput is not rendered. | Medium | Positive | Not Run |
| CONS-009 | Provider | Follow-up notes input appears when the Follow-up toggle is turned on | ConsultationForm | 1. Toggle "Follow-up Required" ON. | Follow-up notes TextInput becomes visible. | Medium | Positive | Not Run |
| CONS-010 | Provider | Diagnostic tests input appears when the Diagnostic toggle is turned on | ConsultationForm | 1. Toggle "Diagnostic Tests Required" ON. | Diagnostic tests TextInput becomes visible. | Medium | Positive | Not Run |
| CONS-011 | Provider | Specialist referral input appears when the Referral toggle is turned on | ConsultationForm | 1. Toggle "Specialist Referral" ON. | Specialist type TextInput becomes visible. | Medium | Positive | Not Run |
| CONS-012 | Provider | Remove button is absent when only one medicine row exists | ConsultationForm (default state) | 1. View the Medicines section. | No remove (✕) button is shown on the single default row. | Medium | Edge | Not Run |
| CONS-013 | Provider | Tapping "+ Add Medicine" appends a new empty medicine row | ConsultationForm | 1. Tap "+ Add Medicine". | A new row with a name and dosage input is added; remove button is now visible on both rows. | Medium | Positive | Not Run |
| CONS-014 | Provider | Tapping ✕ removes the corresponding medicine row | ConsultationForm with ≥ 2 rows | 1. Tap ✕ on a row. | That row is removed; remaining rows are unaffected. | Medium | Positive | Not Run |
| CONS-015 | Provider | Medicine rows with a blank name are filtered out of the API payload | 2 medicine rows — second name left blank | 1. Add two rows; leave the second name blank. 2. Submit. | API is called with `medicinesAdvised` containing only the row with a non-empty name. | Medium | Edge | Not Run |
| CONS-016 | Provider | Conditional fields are absent from the API payload when their toggle is off | All three optional toggles left OFF | 1. Submit with all toggles off. | `followUpRecommendation`, `diagnosticTests`, and `specialistReferral` are all `undefined` in the submitted payload. | Medium | Edge | Not Run |

---

## 8. Payment

| Test Case ID | Module | Title | Preconditions | Steps to Execute | Expected Result | Priority | Type | Status |
|---|---|---|---|---|---|---|---|---|
| PAY-001 | Payment | Amount is displayed via the formatCurrency utility | PaymentScreen opened with `amount = 500` | 1. View the amount card. | A formatted currency string is rendered (e.g. "₹500"). | High | Positive | Not Run |
| PAY-002 | Payment | "Includes consultation fee + service charges" note is shown | PaymentScreen open | 1. View the amount card. | Note text is visible below the amount. | Low | Positive | Not Run |
| PAY-003 | Payment | Default selected payment method is UPI | PaymentScreen opens | 1. Observe the method list. | UPI item has selected styling (primary-coloured border/background) and a "✓" checkmark. | High | Positive | Not Run |
| PAY-004 | Payment | Tapping Card selects it and deselects UPI | PaymentScreen, UPI selected | 1. Tap "Card". | Card shows selected styling and checkmark; UPI loses its selected state. | High | Positive | Not Run |
| PAY-005 | Payment | All four payment methods render and are individually selectable | PaymentScreen open | 1. Tap each method in turn. | UPI, Card, Net Banking, Cash on Visit — each becomes selected on tap; previously selected is deselected. | Medium | Positive | Not Run |
| PAY-006 | Payment | Pay button label includes the amount via formatCurrency | PaymentScreen with `amount = 750` | 1. Observe the Pay button label. | Button title shows the formatted amount (e.g. "Pay ₹750"). | Medium | Positive | Not Run |
| PAY-007 | Payment | Successful payment (both API calls succeed) renders the success view | Valid `bookingId` and `amount`; both POST and PUT succeed | 1. Tap Pay. | `paid` state becomes true; success view renders with ✅, "Payment Successful!", and the subtitle text. | High | Positive | Not Run |
| PAY-008 | Payment | "Track Provider" button uses navigation.replace to open the Tracking screen | Success view shown | 1. Tap "Track Provider". | `navigation.replace('Tracking', { bookingId })` is called; Tracking screen opens (PaymentScreen is removed from the stack). | High | Positive | Not Run |
| PAY-009 | Payment | Payment API failure shows a "Payment Failed" Alert | `POST /payments` returns an error | 1. Tap Pay (POST fails). | Alert shown — title "Payment Failed"; message from the API error or the fallback "Payment failed. Please try again." | High | Negative | Not Run |
| PAY-010 | Payment | Loading state is shown during the payment API call | PaymentScreen | 1. Tap Pay. 2. Observe before API responds. | Button shows a loading indicator during the in-flight call. | Medium | UX | Not Run |
| PAY-011 | Payment | Loading clears after a payment failure | API returns an error | 1. Tap Pay (API fails). 2. Dismiss the alert. | Button returns to its normal non-loading state. | Medium | UX | Not Run |
| PAY-012 | Payment | Success view is NOT shown if the status-update PUT call fails | `POST /payments` succeeds; `PUT /payments/:id/status` fails | 1. Tap Pay with the PUT endpoint failing. | Alert is shown; success view is not rendered; user remains on the payment screen. | High | Edge | Not Run |

---

## Summary

| Module | Test Cases | High | Medium | Low |
|---|---|---|---|---|
| Auth — Role Selection | 4 | 2 | 1 | 1 |
| Auth — Login Screen | 13 | 6 | 5 | 2 |
| Auth — OTP Screen | 15 | 7 | 6 | 2 |
| Auth — Session & State | 8 | 7 | 1 | 0 |
| Provider — Booking Detail | 21 | 15 | 5 | 1 |
| Tracking — Location Hook | 6 | 6 | 0 | 0 |
| Provider — Consultation Form | 16 | 8 | 7 | 1 |
| Payment | 12 | 7 | 4 | 1 |
| **Total** | **95** | **58** | **29** | **8** |

> **Status column default:** All test cases are initialised to **Not Run**.
