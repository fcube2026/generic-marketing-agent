# Pharmacy Feature Legal & Compliance Guide (India)

**Document Version:** 1.0  
**Effective Date:** April 2026  
**Applicable Jurisdiction:** India  
**Prepared for:** Curex24 — Development, Legal, and Founding Teams

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Governing Laws in India](#2-governing-laws-in-india)
3. [Medicine Classification](#3-medicine-classification)
4. [Model A — Integration with E-Pharmacy (PharmEasy)](#4-model-a--integration-with-e-pharmacy-pharmeasy)
5. [Model B — Own Pharmacy System](#5-model-b--own-pharmacy-system)
6. [Technical Compliance Requirements](#6-technical-compliance-requirements)
7. [Illegal Scenarios to Avoid](#7-illegal-scenarios-to-avoid)
8. [Comparison Table](#8-comparison-table)
9. [Recommended Approach](#9-recommended-approach)
10. [Conclusion](#10-conclusion)

---

## 1. Introduction

### Purpose of This Document

This document provides a structured reference for the legal, licensing, and technical compliance obligations associated with pharmacy-related features in the Curex24 platform. It covers two operational models:

- **Model A:** Integrating with a third-party e-pharmacy such as PharmEasy (aggregator model)
- **Model B:** Operating a proprietary pharmacy system (direct pharmacy model)

This guide is intended for founders, developers, product managers, and legal counsel who need to understand what is permitted, what is required, and what risks exist when dispensing or facilitating the dispensing of medicines through a digital healthcare platform.

### Why Compliance Is Critical

Pharmacy operations in India fall under some of the most tightly regulated domains in the country. Non-compliance can result in:

- Criminal prosecution under the Drugs and Cosmetics Act, 1940
- Immediate shutdown of platform operations
- Heavy financial penalties
- Loss of user trust and reputational damage
- Liability for patient harm caused by incorrect or unverified dispensing

Healthcare apps that facilitate medicine procurement — even indirectly — carry both regulatory and moral responsibility. This document exists to ensure the team makes informed, legally sound decisions at every stage of development.

---

## 2. Governing Laws in India

### 2.1 Drugs and Cosmetics Act, 1940

**What it governs:**  
The Drugs and Cosmetics Act is the primary legislation regulating the import, manufacture, distribution, and sale of drugs and cosmetics in India. It defines what constitutes a drug, classifies drugs by risk level, and sets the framework for licensing.

**Why it matters for this system:**  
Any platform that directly or indirectly facilitates the sale or dispensing of medicines is subject to this Act. The Act requires that drugs be sold only through licensed retailers, and prescription-only drugs be dispensed only against a valid prescription verified by a registered pharmacist.

Key provisions:
- Section 18: Prohibits the sale, stocking, or distribution of drugs without a valid license
- Section 27: Prescribes penalties for manufacture or sale of spurious or misbranded drugs
- Schedule H, H1, and X: Defines drug categories requiring prescriptions

---

### 2.2 Drugs and Cosmetics Rules, 1945

**What it governs:**  
These rules operationalize the Drugs and Cosmetics Act. They specify the forms for applying for drug licenses, the record-keeping requirements, storage conditions, and the procedures for prescription verification and record maintenance.

**Why it matters for this system:**  
The Rules mandate that:
- A retail drug license (Form 20 and 21) is required to sell allopathic medicines
- A licensed pharmacist must be present and responsible for all dispensing activity
- Prescription records must be maintained for a minimum of 2 years
- Storage conditions (temperature, humidity) must comply with drug-specific requirements

For an e-pharmacy, the Rules also require maintaining digital prescription logs and ensuring that no Schedule H, H1, or X drug is dispatched without a valid prescription.

---

### 2.3 Pharmacy Act, 1948

**What it governs:**  
The Pharmacy Act establishes the Pharmacy Council of India and State Pharmacy Councils. It regulates the education, training, and registration of pharmacists in India.

**Why it matters for this system:**  
Only a pharmacist registered under this Act is legally authorized to compound, dispense, or distribute drugs. If Curex24 operates its own pharmacy, at least one registered pharmacist must be employed at every dispensing location. The pharmacist is also personally liable for dispensing errors.

Key requirements:
- Pharmacist must hold a valid registration certificate issued by the State Pharmacy Council
- Name and registration number of the responsible pharmacist must appear on every prescription record
- The pharmacist must physically oversee dispensing operations

---

### 2.4 Information Technology Act, 2000

**What it governs:**  
The IT Act governs electronic records, digital signatures, data protection, and cybercrimes in India. It provides the legal basis for electronic prescriptions and digital health records.

**Why it matters for this system:**  
Since Curex24 is a digital platform, all prescription uploads, patient records, order confirmations, and audit logs must comply with the IT Act. Relevant provisions include:

- Section 43A: Mandates protection of sensitive personal data (which includes health records)
- Section 72A: Imposes penalties for unauthorized disclosure of personal information
- Rules under the IT Act (SPDI Rules, 2011): Require a published privacy policy, user consent for data collection, and data security safeguards

Prescriptions received digitally must be treated as sensitive data and stored with appropriate encryption and access controls.

---

### 2.5 Draft E-Pharmacy Rules, 2018

**What it governs:**  
The Ministry of Health and Family Welfare released draft rules in 2018 specifically for e-pharmacies. While these rules have not yet been formally enacted into law, they represent the regulatory direction and are widely referenced by enforcement authorities.

**Why it matters for this system:**  
Compliance with the Draft E-Pharmacy Rules reduces regulatory risk and positions the platform favorably when these rules are eventually finalized. Key provisions include:

- E-pharmacy operators must register with the Central Drugs Standard Control Organisation (CDSCO)
- Only OTC and Schedule H drugs (with valid prescription) may be sold online; Schedule X drugs cannot be sold through e-pharmacies
- Prescriptions must be verified before dispensing
- Digital prescriptions must be retained for a minimum of 3 years
- A registered pharmacist must review every prescription before an order is processed
- Delivery of medicines must include proper packaging and cold chain compliance where applicable
- E-pharmacies must display the name and registration number of the pharmacist on the platform

---

## 3. Medicine Classification

Understanding how drugs are classified under Indian law is essential for determining what rules apply to each transaction.

### 3.1 Non-Prescription (OTC-Like) Medicines

These are drugs that do not require a prescription. They are generally available across pharmacy counters without any requirement to verify a doctor's order.

**Examples:**
- Paracetamol (basic fever and pain relief)
- Antacids (e.g., Digene, Gelusil)
- Basic vitamin and mineral supplements
- Antiseptic solutions (e.g., Dettol, Savlon)
- ORS (Oral Rehydration Salts)

**Legal requirements:**
- No prescription is required
- Must still be sold only through a licensed pharmacist or licensed pharmacy
- Packaging and labeling must comply with the Drugs and Cosmetics Act

**Allowed vs. not allowed:**
- ✅ May be sold online without a prescription
- ✅ May be sold by a licensed retail pharmacy or an e-pharmacy
- ❌ Cannot be sold by unlicensed entities (e.g., grocery apps without a drug license)

---

### 3.2 Schedule H — Prescription-Required Drugs

Schedule H drugs require a valid prescription from a registered medical practitioner before they can be dispensed.

**Examples:**
- Antibiotics (Amoxicillin, Azithromycin)
- Antihypertensives (Amlodipine, Atenolol)
- Antidiabetics (Metformin, Glipizide)
- Antihistamines (Cetirizine, Loratadine in higher doses)

**Legal requirements:**
- Prescription must be provided by a registered and qualified doctor
- Prescription must be verified by a licensed pharmacist before dispensing
- Records of each transaction must be maintained for a minimum of 2 years

**Allowed vs. not allowed:**
- ✅ May be dispensed against a valid prescription (physical or digital)
- ✅ May be sold through a licensed e-pharmacy with prescription verification
- ❌ Cannot be dispensed without a valid and verified prescription
- ❌ Repeat dispensing without a new prescription is not permitted

---

### 3.3 Schedule H1 — High-Risk Prescription Drugs

Schedule H1 is a subset of Schedule H covering drugs with a higher potential for misuse, antimicrobial resistance, or serious side effects.

**Examples:**
- Third and fourth-generation antibiotics (e.g., Meropenem, Linezolid)
- Antituberculosis drugs
- Certain antifungals and antiretrovirals

**Legal requirements:**
- Strict prescription requirements same as Schedule H
- Additional record-keeping: the prescription must be retained and a special register (Form 19A) maintained
- The name, address, and registration number of the prescribing doctor must be recorded
- Pharmacist must make a specific entry in the Schedule H1 register before dispensing

**Allowed vs. not allowed:**
- ✅ May be dispensed only by a licensed pharmacist against a valid prescription
- ❌ Cannot be sold or dispatched by an e-pharmacy (as per Draft E-Pharmacy Rules, 2018)
- ❌ Repeat dispensing or self-dispensing is strictly prohibited

---

### 3.4 Schedule X — Controlled Substances

Schedule X covers narcotic and psychotropic drugs that carry the highest risk of misuse and dependency.

**Examples:**
- Codeine-containing cough syrups (above threshold)
- Tramadol, Alprazolam, Diazepam
- Morphine, Buprenorphine

**Legal requirements:**
- Requires a special prescription from a licensed practitioner
- Dispensing requires a special permit from the State Drug Controller
- Every transaction must be recorded in a dedicated Register (Form 65)
- Records must be maintained for 7 years
- Premises must be specially licensed for Schedule X drug storage

**Allowed vs. not allowed:**
- ✅ May be dispensed only by specially licensed pharmacies with Schedule X authorization
- ❌ Cannot be sold online through any e-pharmacy platform
- ❌ Cannot be stocked or dispensed without a dedicated Schedule X license

---

## 4. Model A — Integration with E-Pharmacy (PharmEasy)

### 4.1 Business Model Explanation

Under this model, Curex24 acts as a **referral and aggregation layer**. When a user needs to order medicines, the platform directs them to a licensed third-party e-pharmacy (such as PharmEasy, Tata 1mg, or Netmeds) via an API integration or a deep link.

**Aggregator vs. Seller:**

| Role | Description |
|---|---|
| **Curex24 (Aggregator)** | Displays pharmacy search results, connects users to partners, may earn a referral fee |
| **PharmEasy (Seller/Licensed E-Pharmacy)** | Holds the drug license, employs pharmacists, verifies prescriptions, stocks and dispatches medicines |

**Responsibility boundaries:**
- PharmEasy is responsible for prescription verification, dispensing, storage, and delivery compliance
- Curex24 is responsible for not encouraging illegal purchases, transmitting user data lawfully, and ensuring its UI does not bypass PharmEasy's prescription checks
- Curex24 must not display or suggest drugs that require prescriptions without clearly directing users to upload their prescription

---

### 4.2 Required Legal Documents

The following documents must be in place before the integration goes live.

#### API Integration Agreement

| Field | Detail |
|---|---|
| **Document Name** | API Integration Agreement |
| **Purpose** | Governs the technical terms of the API connection between Curex24 and PharmEasy |
| **Why required** | Defines usage rights, rate limits, data formats, uptime obligations, and liability in case of API failure or data breach |

#### Commercial Partnership Agreement

| Field | Detail |
|---|---|
| **Document Name** | Commercial Partnership Agreement |
| **Purpose** | Defines the business relationship, revenue sharing, referral fees, exclusivity clauses, and termination rights |
| **Why required** | Without this, there is no enforceable legal basis for the commercial arrangement; either party can exit or change terms without notice |

#### Data Processing Agreement (DPA)

| Field | Detail |
|---|---|
| **Document Name** | Data Processing Agreement |
| **Purpose** | Governs how PharmEasy processes personal and health data transmitted from Curex24 users |
| **Why required** | Mandatory under IT Act (SPDI Rules, 2011) when sharing sensitive personal data (including prescriptions and health records) with a third party. PharmEasy acts as a data processor on behalf of Curex24's users. |

#### Privacy Policy

| Field | Detail |
|---|---|
| **Document Name** | Privacy Policy |
| **Purpose** | Discloses to users what data Curex24 collects, how it is used, what is shared with PharmEasy, and how users can withdraw consent |
| **Why required** | Legally required under IT (SPDI) Rules, 2011. Without a published Privacy Policy, the platform is non-compliant and user consent for data sharing is legally invalid. |

#### Terms & Conditions

| Field | Detail |
|---|---|
| **Document Name** | Terms & Conditions |
| **Purpose** | Sets user expectations, defines Curex24's role as an aggregator (not a pharmacy), limits liability for incorrect dispensing by PharmEasy, and governs acceptable use |
| **Why required** | Protects Curex24 from legal liability for PharmEasy's actions. Must clearly state that Curex24 does not sell, stock, or dispense medicines. |

#### User Consent Mechanism

| Field | Detail |
|---|---|
| **Document Name** | User Consent Mechanism |
| **Purpose** | Explicit, recorded consent from the user before their health data (prescriptions, medical history) is shared with PharmEasy |
| **Why required** | Mandatory under IT (SPDI) Rules, 2011. Consent must be informed, specific, and revocable. Passive acceptance (e.g., continued use of the app) does not constitute valid consent for health data sharing. |

---

### 4.3 Compliance Responsibilities

Even though Curex24 is not the pharmacy in this model, the platform retains certain compliance obligations:

- **Prescription gate:** The Curex24 UI must not allow users to proceed with ordering Schedule H, H1, or X drugs without first uploading a valid prescription
- **No price manipulation:** Curex24 must not incentivize users to purchase unnecessary or higher quantities of prescription drugs
- **Accurate drug information:** Any drug information displayed must come from verified sources and must not constitute medical advice
- **User data protection:** All prescriptions uploaded by users must be encrypted in transit and at rest; access must be limited to authorized roles
- **Transparency:** Curex24 must clearly disclose on the platform that orders are fulfilled by PharmEasy, not by Curex24
- **Grievance redressal:** A named Grievance Officer must be reachable for complaints related to data privacy and service quality

---

### 4.4 What Is NOT Required

Under the aggregator model (no direct dispensing), the following licenses and approvals are **not required** for Curex24:

- Retail Drug License (Form 20 / 21)
- Schedule X drug license
- Drug Storage Compliance approval
- Employment of a registered pharmacist on Curex24's own payroll
- Prescription verification capability on Curex24's own systems
- CDSCO e-pharmacy registration (applicable to the operator, i.e., PharmEasy)

---

### 4.5 Risks

Violations in this model can still carry consequences for Curex24:

| Risk | Consequence |
|---|---|
| Transmitting user health data to PharmEasy without valid user consent | Violation of IT (SPDI) Rules; financial penalty and civil liability |
| UI that allows ordering of prescription drugs without prescription upload | Platform held liable as an enabler of unlicensed dispensing |
| No DPA in place with PharmEasy | Both parties equally liable for any data breach involving user prescriptions |
| No Terms & Conditions clearly stating aggregator role | Users may sue Curex24 directly for dispensing errors made by PharmEasy |
| API integration that bypasses PharmEasy's prescription check | Criminal liability under Drugs and Cosmetics Act, Section 18/27 |

---

## 5. Model B — Own Pharmacy System

### 5.1 Business Model Explanation

Under this model, Curex24 operates as the pharmacy directly. The platform stocks medicines, employs registered pharmacists, verifies prescriptions, and dispatches orders to users. This provides full control over the user experience and margins but carries significantly higher regulatory and operational complexity.

Curex24 would act as a licensed retail pharmacist and, if operating online, as a registered e-pharmacy. All compliance obligations rest entirely with the company.

---

### 5.2 Required Licenses & Documents

#### Retail Drug License — Form 20 (Non-Scheduled Drugs)

| Field | Detail |
|---|---|
| **Name** | Retail Drug License — Form 20 |
| **Issuing Authority** | State Drug Controller / State Food and Drug Administration |
| **Purpose** | Authorizes the retail sale of non-scheduled allopathic drugs from a fixed premises |

#### Retail Drug License — Form 21 (Scheduled Drugs)

| Field | Detail |
|---|---|
| **Name** | Retail Drug License — Form 21 |
| **Issuing Authority** | State Drug Controller / State Food and Drug Administration |
| **Purpose** | Authorizes the retail sale of Schedule H and H1 drugs; requires a registered pharmacist on-site during all business hours |

#### Pharmacist Registration Certificate

| Field | Detail |
|---|---|
| **Name** | Pharmacist Registration Certificate |
| **Issuing Authority** | State Pharmacy Council |
| **Purpose** | Confirms that the individual responsible for dispensing is a qualified and registered pharmacist under the Pharmacy Act, 1948. The license holder must employ at least one such pharmacist at every dispensing location. |

#### Shop & Establishment License

| Field | Detail |
|---|---|
| **Name** | Shop & Establishment License |
| **Issuing Authority** | Municipal Corporation / Local Authority |
| **Purpose** | Mandatory for any commercial premises operating in India. Required before a drug license can be granted. Covers employee welfare obligations and working hours compliance. |

#### GST Registration

| Field | Detail |
|---|---|
| **Name** | Goods and Services Tax (GST) Registration |
| **Issuing Authority** | GST Council / GSTN Portal |
| **Purpose** | Required for all businesses with annual turnover above ₹20 lakhs (₹10 lakhs in special category states). All medicine sales must be invoiced with proper GST as applicable. |

#### Prescription Record Register

| Field | Detail |
|---|---|
| **Name** | Prescription Record Register |
| **Issuing Authority** | Internal compliance document per Drugs and Cosmetics Rules, 1945 |
| **Purpose** | A register (physical or digital) that records every Schedule H and H1 prescription received, the details of the prescribing doctor, and the medicines dispensed against it. Must be retained for a minimum of 2 years and made available for inspection by drug authorities. |

#### Storage Compliance Certification

| Field | Detail |
|---|---|
| **Name** | Drug Storage Compliance |
| **Issuing Authority** | State Drug Controller (verified during premises inspection) |
| **Purpose** | Confirms that the premises meet conditions for temperature control, humidity control, light protection, and segregation required for pharmaceutical storage. Cold chain compliance is required for vaccines, insulin, and specific biologics. |

#### Pharmacovigilance Compliance

| Field | Detail |
|---|---|
| **Name** | Pharmacovigilance Program Compliance |
| **Issuing Authority** | CDSCO (Central Drugs Standard Control Organisation) |
| **Purpose** | Requires reporting of Adverse Drug Reactions (ADRs) to the national pharmacovigilance database. Any pharmacy dispensing medicines must have a system to collect and report ADR events from patients. |

#### E-Pharmacy Registration

| Field | Detail |
|---|---|
| **Name** | E-Pharmacy Registration (when Draft Rules are finalized) |
| **Issuing Authority** | CDSCO |
| **Purpose** | Authorizes the operation of an online pharmacy. Required under the Draft E-Pharmacy Rules, 2018. Applicant must hold a valid Retail Drug License and employ a registered pharmacist. Registration is state-specific and must be renewed periodically. |

#### Prescription Verification SOP

| Field | Detail |
|---|---|
| **Name** | Prescription Verification Standard Operating Procedure |
| **Issuing Authority** | Internal document (required by Drugs and Cosmetics Rules) |
| **Purpose** | Documents the step-by-step process by which the platform's pharmacist verifies the authenticity and completeness of a prescription before an order is processed. Must cover: doctor registration check, drug-dose validity, duplicate prescription detection, and escalation procedures. |

#### Delivery Compliance SOP

| Field | Detail |
|---|---|
| **Name** | Delivery Compliance Standard Operating Procedure |
| **Issuing Authority** | Internal document |
| **Purpose** | Covers packaging standards, temperature-controlled delivery requirements, labeling of dispatched medicines, chain of custody documentation, and return/disposal procedures for undelivered Schedule H and H1 drugs. |

---

## 6. Technical Compliance Requirements

The following system-level controls must be in place regardless of which model is adopted. They form the minimum viable compliance architecture for a healthcare pharmacy platform.

### 6.1 Prescription Enforcement Logic

- The system must block any order for a Schedule H, H1, or X drug from proceeding if no valid prescription has been uploaded and verified
- Prescription validation must happen server-side — client-side UI checks alone are insufficient and legally inadmissible
- The system must detect and reject duplicate prescriptions (same prescription used to fulfill more than one order)
- Prescription validity period must be enforced: generally 30 days from the date of issue unless otherwise specified

### 6.2 Prescription Storage

- All prescription images and records must be stored in encrypted form (AES-256 or equivalent) at rest
- Access must be restricted to authorized roles only (pharmacist, compliance officer, support — not general staff)
- Prescriptions must be retained for a minimum of 2 years (Schedule H) or 3 years (Draft E-Pharmacy Rules)
- Deletion must be logged and must not occur before the minimum retention period

### 6.3 Audit Logs

- Every dispensing event must generate an immutable audit log entry containing: timestamp, user ID, medicine name, quantity, prescription ID, pharmacist ID
- Audit logs must be tamper-proof (append-only; no update or delete operations permitted)
- Logs must be available for inspection by regulatory authorities within 24 hours of a request
- System access logs must also be maintained to detect unauthorized access to prescription records

### 6.4 Role-Based Access Control

- The system must implement strict role-based access control (RBAC) for all pharmacy-related functions
- Roles required: `pharmacist`, `pharmacy_admin`, `support`, `compliance_officer`
- Only the `pharmacist` role may approve or reject a prescription for dispensing
- Support staff must not have access to raw prescription images unless escalated by a pharmacist
- All role assignments must be logged

### 6.5 Data Security

- All data in transit must be encrypted using TLS 1.2 or higher
- Health data must not be transmitted to third-party analytics tools (e.g., Google Analytics, Mixpanel) without explicit user consent and contractual data processing safeguards
- A named Data Protection Officer (DPO) or Grievance Officer must be appointed and their contact details published on the platform
- Penetration testing must be conducted at least annually on systems that store or process prescription or patient data
- In the event of a data breach involving health records, affected users must be notified as soon as reasonably possible

---

## 7. Illegal Scenarios to Avoid

The following actions constitute violations under Indian law and must be technically and procedurally prevented.

### 7.1 Selling Prescription Drugs Without a Prescription

Dispensing Schedule H, H1, or X drugs without a valid, verified prescription is a criminal offence under Section 18 of the Drugs and Cosmetics Act. This applies both to the platform operator and to any pharmacist who approves the transaction.

### 7.2 Accepting or Processing Fake Prescriptions

Knowingly accepting a fraudulent, altered, or reused prescription is an offence under the IT Act and the Drugs and Cosmetics Act. Platforms must implement detection controls (e.g., prescription hash verification, duplicate detection) and must not create technical pathways that make it easy to bypass prescription checks.

### 7.3 Operating Without an Audit Trail

Failure to maintain records of dispensing transactions is a standalone violation of the Drugs and Cosmetics Rules, independent of whether harm was caused. Drug inspectors may request transaction records at any time. An inability to produce them results in immediate suspension of the drug license.

### 7.4 Dispensing Without Pharmacist Involvement

No medicine from Schedule H, H1, or the retail drug schedule may be dispensed without the direct oversight of a registered pharmacist. A system that processes orders and dispatches drugs without routing them through a pharmacist review step is in direct violation of the Pharmacy Act, 1948 and the Drugs and Cosmetics Rules.

### 7.5 Selling Schedule X Drugs Online

Schedule X (controlled substances) cannot be sold through any e-pharmacy channel regardless of prescription status. Any system that enables this — even for users with valid prescriptions — is subject to prosecution.

### 7.6 Sharing Patient Data Without Consent

Sharing prescription data, medical history, or any personally identifiable health information with PharmEasy or any third party without the explicit, recorded consent of the user violates the IT (SPDI) Rules, 2011. This includes passing user data through analytics or marketing tools.

### 7.7 Displaying Drugs Without Licensing Context

Displaying medicines or facilitating purchases without clearly disclosing the licensed entity responsible for dispensing is a deceptive trade practice and creates liability for the platform under the Consumer Protection Act, 2019.

---

## 8. Comparison Table

| Feature | Model A: PharmEasy Integration | Model B: Own Pharmacy System |
|---|---|---|
| **Drug License Required** | No (PharmEasy holds the license) | Yes — Retail Drug License (Form 20 & 21) mandatory |
| **Pharmacist Required** | No (PharmEasy employs pharmacists) | Yes — minimum one registered pharmacist per dispensing location |
| **Prescription Verification** | Handled by PharmEasy; Curex24 must gate the UI | Handled entirely by Curex24's own pharmacist team |
| **E-Pharmacy Registration** | Not required for Curex24 | Required when Draft Rules are finalized |
| **Data Agreements Required** | DPA, Privacy Policy, User Consent | Internal data policy; DPA if storage is outsourced |
| **Revenue Control** | Limited — dependent on PharmEasy's pricing and margin structure | Full control over pricing, margins, and offers |
| **Operational Complexity** | Low — API integration only | High — premises, staff, SOPs, licenses, inspections |
| **Time to Launch** | Weeks (API onboarding) | Months (licensing, hiring, infrastructure setup) |
| **Regulatory Risk to Curex24** | Low — primary liability rests with PharmEasy | High — Curex24 bears full regulatory and legal liability |
| **User Experience Control** | Moderate — limited to what PharmEasy's API exposes | Full — end-to-end control of ordering and delivery experience |
| **Scalability** | Dependent on PharmEasy's coverage | Scalable but requires per-state licensing and warehousing |
| **Schedule X Drug Capability** | Not applicable — PharmEasy cannot sell these online either | Possible with a special license, but high-risk and not recommended |
| **Cost** | Revenue share or referral fee model | High upfront capital: licensing, storage, staffing, technology |

---

## 9. Recommended Approach

### Phased Strategy

#### Phase 1 — Launch with PharmEasy Integration (Months 1–12)

This is the lowest-risk path to shipping a pharmacy feature quickly.

- Integrate with PharmEasy (or an equivalent licensed partner) via their commercial API
- Implement prescription upload gate in the UI for all Schedule H/H1 drugs before handing off to PharmEasy
- Execute the DPA, Partnership Agreement, and API Integration Agreement before going live
- Publish a compliant Privacy Policy and Terms & Conditions that accurately describe Curex24's role as an aggregator
- Implement user consent flows for prescription data sharing
- Ensure audit logs capture every order referral and prescription upload event

**Outcome:** Pharmacy feature live, compliant, low overhead, no drug license required.

---

#### Phase 2 — Build Proprietary Pharmacy Capability (Months 12–24, optional)

Once the platform has validated demand and has the operational capacity:

- Apply for Retail Drug License in the states with highest order volume
- Hire registered pharmacists and set up a compliant dispensing workflow
- Build or extend the Curex24 backend to support prescription verification, dispensing records, and pharmacist dashboards
- Implement storage compliance at warehouse/fulfillment centers
- Register as an e-pharmacy with CDSCO once the Draft Rules are finalized
- Transition high-margin or frequently ordered medicines to the proprietary model while retaining the PharmEasy integration as a fallback

**Outcome:** Full control over the pharmacy experience, higher margins, stronger brand ownership — at significantly higher operational and regulatory cost.

---

#### Key Decision Criteria for Phase 2

| Criterion | Threshold |
|---|---|
| Monthly prescription order volume | >5,000 orders/month in a single geography |
| Customer complaints about PharmEasy fulfillment | >5% of orders with service issues |
| Margin improvement opportunity | Own pharmacy margin improvement >15% vs referral model |
| Regulatory clarity | Draft E-Pharmacy Rules formally enacted |

---

## 10. Conclusion

Pharmacy operations represent one of the most regulated and highest-liability areas of any digital health platform. Both the aggregator and the direct pharmacy model come with distinct legal obligations, and the consequences of non-compliance are not theoretical — they include criminal prosecution, license revocation, and serious risk to patients.

Curex24 must treat compliance not as a checkbox but as a core product requirement. The right legal agreements, the right technical controls, and the right operational processes are not optional additions — they are prerequisites for operating in this domain.

The recommended path is to begin with a compliant third-party integration (Model A) and build institutional knowledge of the regulatory environment before assuming the full obligations of a licensed pharmacy operator (Model B). This approach minimizes risk while enabling the team to ship, learn, and grow responsibly.

Every member of the team — developers, product managers, and founders — shares responsibility for ensuring that no medicine is dispensed, no health data is shared, and no prescription is processed in a manner that violates the laws described in this document.

---

*This document is intended for internal guidance and planning purposes. It does not constitute legal advice. Curex24 should engage qualified healthcare and pharmaceutical law practitioners in India before implementing any pharmacy-related features in a production environment.*
