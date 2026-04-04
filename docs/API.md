# Curex24 — API Reference

**Base URL:** `http://localhost:3000` (development)

**Authentication:** Bearer JWT token in `Authorization` header

---

## Authentication

### POST /auth/send-otp

Send OTP to a phone number.

**Request:**
```json
{
  "phone": "+919876543210"
}
```

**Response (200):**
```json
{
  "message": "OTP sent successfully",
  "otp": "123456"  // Only in development mode
}
```

### POST /auth/verify-otp

Verify OTP and receive JWT token.

**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1abc123...",
    "phone": "+919876543210",
    "role": "PATIENT"
  }
}
```

---

## Patients

### GET /patients/me
Get current patient profile. **Auth required.**

**Response (200):**
```json
{
  "id": "clx...",
  "userId": "clx...",
  "name": "Rahul Kumar",
  "dateOfBirth": "1990-05-15T00:00:00Z",
  "gender": "male",
  "emergencyContact": "+919876000000"
}
```

### PUT /patients/me
Update patient profile. **Auth required.**

**Request:**
```json
{
  "name": "Rahul Kumar",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "emergencyContact": "+919876000000"
}
```

### GET /patients/me/addresses
Get patient addresses. **Auth required.**

### POST /patients/me/addresses
Add new address. **Auth required.**

**Request:**
```json
{
  "label": "Home",
  "addressLine": "123 Main Street, Village Road",
  "city": "Jaipur",
  "state": "Rajasthan",
  "pincode": "302001",
  "lat": 26.9124,
  "lng": 75.7873,
  "isDefault": true
}
```

### GET /patients/me/bookings
Get patient booking history. **Auth required.**

---

## Providers

### POST /providers/onboard
Create provider profile. **Auth required (PROVIDER role).**

**Request:**
```json
{
  "name": "Dr. Priya Sharma",
  "specialization": "General Physician",
  "bio": "10 years of experience in primary care",
  "homeVisitEnabled": true,
  "doctorPlaceVisitEnabled": true,
  "consultationFeeHomeVisit": 500,
  "consultationFeeDoctorPlace": 300,
  "serviceRadius": 15,
  "serviceCategoryIds": ["clx_doctor_id"]
}
```

### GET /providers/me
Get provider profile. **Auth required (PROVIDER role).**

### PUT /providers/me
Update provider profile. **Auth required (PROVIDER role).**

### PUT /providers/me/availability
Toggle availability. **Auth required (PROVIDER role).**

**Request:**
```json
{
  "isAvailable": true,
  "currentLat": 26.9124,
  "currentLng": 75.7873
}
```

### GET /providers/me/bookings
Get provider's bookings. **Auth required (PROVIDER role).**

### GET /providers/nearby
Find nearby providers. **Auth required.**

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| lat | number | Patient latitude |
| lng | number | Patient longitude |
| serviceCategory | string | Service category slug |
| mode | string | HOME_VISIT or DOCTOR_PLACE (optional) |

---

## Services

### GET /services
List all service categories.

**Response (200):**
```json
[
  { "id": "clx...", "name": "Doctor Consultation", "slug": "doctor", "description": "...", "iconUrl": null },
  { "id": "clx...", "name": "Physiotherapy", "slug": "physiotherapy", "description": "...", "iconUrl": null },
  { "id": "clx...", "name": "Nursing", "slug": "nursing", "description": "...", "iconUrl": null },
  { "id": "clx...", "name": "Speech Therapy", "slug": "speech-therapy", "description": "...", "iconUrl": null }
]
```

---

## Recommendation

### POST /recommendation
Get smart recommendation. **Auth required.**

**Request:**
```json
{
  "lat": 26.9124,
  "lng": 75.7873,
  "serviceCategory": "doctor",
  "urgency": "HIGH"
}
```

**Response (200):**
```json
{
  "homeVisit": {
    "provider": { "id": "...", "name": "Dr. Priya Sharma", "specialization": "General Physician" },
    "distance": 4.2,
    "eta": 13,
    "fee": 500,
    "score": 87.5
  },
  "doctorPlace": {
    "provider": { "id": "...", "name": "Dr. Amit Patel", "specialization": "General Physician" },
    "distance": 2.1,
    "eta": 4,
    "fee": 300,
    "score": 82.3
  },
  "recommended": "HOME_VISIT",
  "reason": "For urgent care, a home visit provides the fastest response."
}
```

---

## Bookings

### POST /bookings
Create a booking. **Auth required (PATIENT role).**

**Request:**
```json
{
  "providerId": "clx...",
  "serviceCategoryId": "clx...",
  "mode": "HOME_VISIT",
  "scheduledAt": "2026-04-04T22:00:00Z",
  "symptoms": "High fever since morning, body ache",
  "addressId": "clx..."
}
```

### GET /bookings/:id
Get booking details. **Auth required.**

### PUT /bookings/:id/status
Update booking status. **Auth required (PROVIDER role).**

**Request:**
```json
{
  "status": "ACCEPTED"
}
```

### POST /bookings/:id/accept
Provider accepts booking. **Auth required (PROVIDER role).**

### POST /bookings/:id/cancel
Cancel booking. **Auth required.**

---

## Consultation

### POST /consultation/:bookingId/summary
Submit consultation summary. **Auth required (PROVIDER role).**

**Request:**
```json
{
  "symptoms": "High fever 102°F, body ache, headache",
  "observations": "Throat slightly red, BP normal 120/80",
  "diagnosis": "Viral fever",
  "medicinesAdvised": [
    { "name": "Paracetamol 650mg", "dosage": "1 tablet", "frequency": "3 times/day", "duration": "3 days" },
    { "name": "Cetirizine 10mg", "dosage": "1 tablet", "frequency": "Once at night", "duration": "5 days" }
  ],
  "nextSteps": "Rest, drink fluids, monitor temperature",
  "followUpRecommendation": "Follow up in 3 days if fever persists"
}
```

### GET /consultation/:bookingId/summary
Get consultation summary. **Auth required.**

---

## Diagnostics

### POST /diagnostics
Request diagnostic tests. **Auth required (PROVIDER role).**

**Request:**
```json
{
  "bookingId": "clx...",
  "testType": "Complete Blood Count (CBC)",
  "notes": "Check for infection markers"
}
```

### PUT /diagnostics/:id
Update diagnostic status. **Auth required (ADMIN role).**

**Request:**
```json
{
  "status": "SCHEDULED",
  "scheduledAt": "2026-04-05T08:00:00Z"
}
```

### POST /diagnostics/:id/result
Upload lab result. **Auth required (ADMIN role).**

**Request:**
```json
{
  "resultFileUrl": "https://storage.example.com/results/abc123.pdf",
  "notes": "All values within normal range"
}
```

---

## Payments

### POST /payments
Initiate payment. **Auth required.**

**Request:**
```json
{
  "bookingId": "clx..."
}
```

### GET /payments/:bookingId
Get payment status. **Auth required.**

### PUT /payments/:id/status
Update payment status (webhook). **Internal.**

---

## Admin

### GET /admin/dashboard
Get dashboard statistics. **Auth required (ADMIN role).**

**Response (200):**
```json
{
  "totalBookings": 150,
  "activeProviders": 23,
  "pendingVerification": 5,
  "totalPatients": 320
}
```

### GET /admin/providers/pending
Get providers awaiting verification. **Auth required (ADMIN role).**

### PUT /admin/providers/:id/verify
Approve provider. **Auth required (ADMIN role).**

### PUT /admin/providers/:id/deactivate
Deactivate provider. **Auth required (ADMIN role).**

### GET /admin/bookings
Get all bookings (paginated). **Auth required (ADMIN role).**

**Query params:** `page`, `limit`, `status`

**Response (200):**
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

### GET /admin/diagnostics
Get pending diagnostic requests. **Auth required (ADMIN role).**

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Descriptive error message",
  "error": "Bad Request"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — missing/invalid token |
| 403 | Forbidden — insufficient role |
| 404 | Not Found |
| 409 | Conflict — duplicate/invalid state |
| 500 | Internal Server Error |

---

*Document Version: 1.0 (MVP)*
*Last Updated: April 2026*
