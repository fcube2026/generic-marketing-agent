# Pharmacy Regulatory & Compliance Guide (India)

> **Scope:** Internal engineering and product reference for the curex24 pharmacy feature.

---

## 1. Drugs and Cosmetics Act, 1940

### Key Compliance Requirements

- Prescription drugs (Schedule H, H1, and X) must only be sold with a valid prescription from a registered medical practitioner.
- These drugs cannot be sold over-the-counter (OTC).
- Pharmacies must operate under a valid drug license and comply with regulatory standards.
- Sale must occur under regulated conditions that ensure drug safety and quality.

### Record-Keeping

- Schedule H1 drugs require maintenance of prescription records including patient, prescribing doctor, and drug details.
- Retention of such records is required for up to **3 years** for Schedule H1 drugs.

> ⚠️ Broader record-keeping obligations across all drug schedules and specific rule references should be validated with legal counsel.

### Labeling Requirements

Medicines must include:

- "Rx" marking on prescription-only products.
- Warning labels indicating prescription-only usage.
- Labeling and packaging must otherwise comply with the rules framed under the Act.

> ⚠️ Specific labeling rule references should be validated with legal counsel.

---

## 2. Pharmacy Act, 1948

### Key Compliance Requirements

- Medicines must be dispensed under the supervision of a **registered pharmacist**.
- Pharmacists must be registered with the relevant **State Pharmacy Council**.
- Pharmacies must hold a **valid license** under applicable licensing frameworks.

> These requirements are foundational for lawful dispensing of medicines in India and are enforced alongside the Drugs and Cosmetics Act, 1940.

---

## 3. E-Pharmacy Rules (Draft, 2018)

> 🚨 **These are draft rules and are NOT fully notified into enforceable law.**
> India does not yet have fully enacted e-pharmacy-specific legislation. Online pharmacy operations currently rely on the Drugs and Cosmetics Act (1940), the Pharmacy Act (1948), and the Information Technology Act (2000).

All provisions listed below are **based on draft rules and are subject to change**.

### Key Provisions *(Draft — not enforceable)*

- **Registration:** Mandatory registration of e-pharmacy entities with the Central Licensing Authority. *(Based on draft rules — subject to change)*
- **Record Retention:** Proposed requirement to retain prescription and transaction records for up to 3 years. *(Based on draft rules — subject to change)*
- **Drug Restrictions:** Sale of certain drugs (e.g., narcotics, psychotropics) proposed to be restricted or prohibited on e-pharmacy platforms. *(Based on draft rules — subject to change)*
- **Data Privacy:** Proposed requirement for data privacy and confidentiality of prescription data. *(Based on draft rules — subject to change)*
- **Geographic Compliance:** Proposed compliance with state-level regulations applicable to the delivery geography. *(Based on draft rules — subject to change)*
- **Grievance Redressal:** Proposed requirement for a customer grievance redressal mechanism. *(Based on draft rules — subject to change)*

> ⚠️ Legal validation is required before relying on draft provisions for production implementation.

---

## 4. Digital Personal Data Protection Act, 2023

### Key Compliance Requirements

- Personal data must be processed based on **user consent**.
- Organizations must ensure lawful processing of personal data.
- Organizations must implement **security safeguards** to prevent data breaches.

### User Rights *(High-level)*

- **Access** — Users have the right to access their personal data.
- **Correction** — Users have the right to correct inaccurate personal data.
- **Erasure** — Users may request deletion of personal data, subject to legal limitations.

> ⚠️ Health-related data is sensitive in nature. Specific classifications of sensitive personal data, applicable timelines, and exact enforcement provisions should be validated with legal counsel.

---

## 5. FSSAI Compliance

### Applicability

Applies to:

- Health supplements
- Nutraceuticals
- OTC wellness products sold through the platform

### Requirements

- Products must be manufactured under a **valid FSSAI license**.
- Products must follow **prescribed labeling standards**.

> ⚠️ Exact labeling rules and product categorization should be verified against current FSSAI regulations.

---

## 6. GST Compliance

### Key Requirements

- Pharmacies must issue **valid GST invoices** for all sales.
- Invoices must display the **price with GST breakdown**.
- **Pricing transparency** is required for consumers.

> ⚠️ Applicable GST rates vary by product category (e.g., medicines vs. supplements) and must be verified against current GST schedules.

---

## 🧾 Compliance Checklist (Engineering & Product)

| # | Requirement | Status |
|---|---|---|
| 1 | Prescription validation enforced for Schedule H/H1/X drugs | ☐ |
| 2 | Pharmacy license verification process in place | ☐ |
| 3 | Registered pharmacist requirement ensured before dispensing | ☐ |
| 4 | Secure storage of prescriptions and patient data | ☐ |
| 5 | User consent captured before data processing | ☐ |
| 6 | Audit logs enabled for all transactions | ☐ |
| 7 | Role-based access control implemented for sensitive health data | ☐ |
| 8 | GST-compliant invoice generation | ☐ |
| 9 | Drug sale restricted based on prescription requirements | ☐ |

---

## 🗂 Data Retention Policy

- Prescription and order data must be retained for compliance and audit purposes.
- **Suggested retention: up to 3 years** — based on Schedule H1 record-keeping obligations and draft e-pharmacy norms (2018). This figure is consistent across both sources but **must be validated with legal counsel before enforcement**.
- Users may request deletion of personal data subject to legal and regulatory obligations that may restrict erasure.

> ⚠️ Final retention durations must be confirmed with legal counsel prior to production use.

---

## 🔐 Privacy Policy Addendum (Pharmacy Data)

### Data Collected

- Prescription documents
- Order details
- Contact information

### Purpose of Collection

- Order fulfillment
- Regulatory compliance
- Record maintenance

### User Rights

- Access personal data
- Request correction of inaccurate data
- Request deletion (subject to applicable legal requirements and retention obligations)

---

## ⚠️ Legal Disclaimer

> **This document is intended for internal engineering and product guidance only and does not constitute legal advice. All regulatory interpretations must be validated by a qualified legal professional before production deployment.**

---

*Last updated: April 2026*
