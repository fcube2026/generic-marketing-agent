# Curex24 — Health Data Privacy & Compliance

## 1. Overview

Curex24 is an on-demand healthcare platform that handles sensitive personal and health information. We are committed to protecting user privacy and handling health data responsibly, in alignment with Indian regulatory frameworks including the **Digital Information Security in Healthcare Act (DISHA)** and the **Digital Personal Data Protection Act, 2023 (DPDPA)**.

This document outlines our intended data handling practices and compliance approach. It serves as a living reference for the development team, QA reviewers, and future audits.

---

## 2. Privacy Promise

- **Minimal data collection** — We collect only the personal and health data necessary to deliver care services (e.g. name, contact, location, consultation history).
- **Purpose limitation** — Health data is used exclusively for providing and improving healthcare services. It is never sold or shared for unrelated marketing.
- **User control** — Users can view, update, and request deletion of their personal data through the application.
- **Transparency** — Users are informed about what data is collected and why, before or at the point of collection.

---

## 3. Key Data Handling Practices

| Practice | Description |
|----------|-------------|
| **Authentication** | OTP-based phone verification + JWT tokens; no plaintext password storage |
| **Transport encryption** | All API communication over HTTPS/TLS |
| **Data at rest** | PostgreSQL database; encryption at rest should be enabled in production deployments |
| **Access control** | Role-based access (Patient, Provider, Admin) enforced via server-side guards |
| **Data minimisation** | Only fields required for service delivery are collected and stored |
| **Audit readiness** | Structured data model with timestamps on all records for traceability |
| **Third-party sharing** | No health data shared with third parties without explicit user consent |
| **Data retention** | Health records retained only as long as required for service delivery and legal obligations; deletion available on request |

---

## 4. DISHA Compliance Notes

The **Digital Information Security in Healthcare Act (DISHA)** is India's proposed framework for protecting digital health data. While DISHA is not yet enacted into law, Curex24 adopts its principles as a best-practice baseline:

- **Ownership** — Health data belongs to the patient. Providers and the platform act as custodians, not owners.
- **Consent** — Collection and processing of health data requires informed, explicit consent from the user.
- **Purpose limitation** — Health data is used only for the stated purpose (care delivery, diagnostics coordination, payment processing).
- **Security safeguards** — Technical and organisational measures (encryption, access control, audit logging) are applied to protect health data.
- **Breach notification** — In the event of a data breach involving health information, affected users and relevant authorities will be notified promptly.
- **Right to access & correction** — Patients can access their health records and request corrections.
- **Right to erasure** — Patients can request deletion of their data, subject to legal retention requirements.

---

## 5. DPDPA Alignment

The **Digital Personal Data Protection Act, 2023 (DPDPA)** applies to all personal data processed within India. Key alignment points:

- Lawful purpose and consent as the basis for processing personal data
- Appointment of a Data Protection Officer (DPO) for production operations
- Data Processing Impact Assessments before introducing new data flows
- Cross-border data transfer restrictions respected in infrastructure choices

---

## 6. Relevant Standards & References

- [DISHA — Digital Information Security in Healthcare Act (Draft)](https://www.nhp.gov.in/NHPfiles/DISHA.pdf)
- [Digital Personal Data Protection Act, 2023 (DPDPA)](https://www.meity.gov.in/data-protection-framework)
- [ABDM Health Data Management Policy](https://abdm.gov.in/publications/health_data_management_policy)
- [ISO/IEC 27001 — Information Security Management](https://www.iso.org/standard/27001)
- [OWASP Top 10 — Web Application Security](https://owasp.org/www-project-top-ten/)

---

## 7. Implementation Status

> **Note:** This document describes the *intended* privacy posture. Some items are aspirational and will be implemented progressively as the platform matures toward production readiness.

| Area | Status |
|------|--------|
| HTTPS / TLS in production | 🔲 Planned |
| Database encryption at rest | 🔲 Planned |
| Role-based access control | ✅ Implemented |
| OTP + JWT authentication | ✅ Implemented |
| Consent capture UI | 🔲 Planned |
| Data export / deletion API | 🔲 Planned |
| Audit logging | 🔲 Planned |
| Breach notification process | 🔲 Planned |
| Data Protection Officer appointment | 🔲 Planned |

---

*Last updated: April 2026*
