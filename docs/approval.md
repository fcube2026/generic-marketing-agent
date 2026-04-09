# Curex24 — Government Approvals & Regulatory Guide

> A structured plan for securing the necessary government approvals, licenses, and industry support to legally operate Curex24 as a healthcare marketplace in India.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Business Registration & Entity Setup](#2-business-registration--entity-setup)
3. [Healthcare & Telemedicine Regulations](#3-healthcare--telemedicine-regulations)
4. [Data Protection & IT Compliance](#4-data-protection--it-compliance)
5. [Payment & Financial Compliance](#5-payment--financial-compliance)
6. [Mobile App Store Compliance](#6-mobile-app-store-compliance)
7. [State-Level Approvals & Health Department Liaison](#7-state-level-approvals--health-department-liaison)
8. [Industry Associations & Support Networks](#8-industry-associations--support-networks)
9. [Approval Timeline & Sequence](#9-approval-timeline--sequence)
10. [Contacts & Entities to Approach](#10-contacts--entities-to-approach)
11. [Approval Checklist](#11-approval-checklist)

---

## 1. Overview

Curex24 operates as a **healthcare marketplace platform** that:
- Connects patients with verified healthcare providers
- Facilitates home visits and clinic consultations
- Processes payments for healthcare services
- Stores health records (consultation summaries, prescriptions, diagnostics)
- Handles sensitive personal and health data

This places Curex24 at the intersection of **healthcare regulation**, **data protection law**, **financial compliance**, and **technology regulation**. While India does not currently require a specific license to operate a healthcare aggregator/marketplace, multiple regulatory frameworks apply.

### Regulatory Landscape Summary

| Regulation | Status | Applicability to Curex24 |
|-----------|--------|------------------------|
| **Companies Act, 2013** | Active | Business incorporation |
| **Telemedicine Practice Guidelines (2020)** | Active | Applicable if video/tele-consultation added |
| **Digital Personal Data Protection Act (DPDPA), 2023** | Active (rules pending) | Patient data handling |
| **DISHA (Digital Information Security in Healthcare Act)** | Draft / Proposed | Health data security framework |
| **IT Act, 2000 + IT Rules, 2021** | Active | Platform intermediary obligations |
| **Payment and Settlement Systems Act (RBI)** | Active | Payment processing |
| **GST Act** | Active | Tax compliance |
| **Clinical Establishments Act, 2010** | Active (state-dependent) | Provider verification reference |
| **National Medical Commission Act, 2019** | Active | Provider credential verification |
| **Consumer Protection Act, 2019** | Active | Patient rights, dispute resolution |
| **Drugs & Cosmetics Act, 1940** | Active | If pharmacy integration is added |

---

## 2. Business Registration & Entity Setup

### 2.1 Company Incorporation

| Requirement | Details | Authority | Priority |
|------------|---------|-----------|----------|
| **Company Registration** | Register as Private Limited Company (Pvt Ltd) under Companies Act, 2013 | Ministry of Corporate Affairs (MCA) via [mca.gov.in](https://www.mca.gov.in) | 🔴 Critical |
| **PAN & TAN** | Permanent Account Number and Tax Deduction Account Number | Income Tax Department | 🔴 Critical |
| **GST Registration** | Required for interstate supply of services and if turnover > ₹20 lakh | GST Portal ([gst.gov.in](https://www.gst.gov.in)) | 🔴 Critical |
| **MSME Registration** (Udyam) | Optional but beneficial for government schemes, subsidies | Udyam Portal ([udyamregistration.gov.in](https://udyamregistration.gov.in)) | 🟡 Recommended |
| **Startup India Registration** | Tax benefits (80IAC), simplified compliance, self-certification | DPIIT ([startupindia.gov.in](https://www.startupindia.gov.in)) | 🟡 Recommended |
| **Shop & Establishment Act** | State-level registration for office premises | Respective State Labour Department | 🟡 Required (state-specific) |

### 2.2 Steps for Incorporation

1. Choose company name (check availability on MCA portal)
2. Obtain Digital Signature Certificate (DSC) for directors
3. Obtain Director Identification Number (DIN)
4. File SPICe+ form (incorporation, PAN, TAN, GST, EPFO, ESIC in one form)
5. Draft Memorandum & Articles of Association (MOA & AOA) — include "health technology" in objects clause
6. Receive Certificate of Incorporation (CIN)
7. Open company bank account
8. Register for GST
9. Register on Startup India portal (for benefits)

### 2.3 Intellectual Property

| IP Asset | Filing Type | Authority |
|----------|-----------|-----------|
| **Curex24 name** | Trademark (Class 44: Medical services, Class 42: Software) | Controller General of Patents, Designs & Trademarks ([ipindia.gov.in](https://ipindia.gov.in)) |
| **Curex24 logo** | Trademark (logo mark) | Same as above |
| **curex24.com** | Domain registration | Domain registrar |
| **App name on stores** | Reserved via Apple/Google developer accounts | App Store Connect / Google Play Console |

---

## 3. Healthcare & Telemedicine Regulations

### 3.1 Current Regulatory Position

As a **healthcare marketplace/aggregator** (not directly providing medical services), Curex24 is classified as an **intermediary platform**. The providers listed on the platform are the regulated entities (licensed medical practitioners), not the platform itself.

**Key distinction:**
- Curex24 does NOT practice medicine — providers do
- Curex24 facilitates connections, payments, and record-keeping
- Providers are independently responsible for their medical licenses and practice standards

### 3.2 Telemedicine Practice Guidelines (2020)

Issued by: **Board of Governors (BoG) in supersession of MCI** (now NMC)

These guidelines apply if Curex24 adds **video/audio consultation** features:

| Requirement | Details | Current Status |
|------------|---------|---------------|
| Registered Medical Practitioner (RMP) only | Only NMC-registered doctors can provide teleconsultation | ✅ KYC verification checks this |
| Patient consent | Explicit consent required before teleconsultation | ⚠️ Need to add consent flow |
| Prescription restrictions | First consultation via telemedicine cannot prescribe Schedule H drugs | ⚠️ Need prescription rules engine |
| Record retention | Teleconsultation records must be maintained for 3 years | ✅ Database stores consultation records |
| Technology platform requirements | Platform must ensure patient data security and confidentiality | ⚠️ Needs encryption audit |

**Action items:**
- [ ] Add explicit patient consent capture before consultation
- [ ] Implement prescription drug category restrictions (if teleconsultation is added)
- [ ] Ensure 3-year data retention policy
- [ ] Document technology security measures for compliance

### 3.3 National Medical Commission (NMC) — Provider Verification

| Requirement | Details | How to Approach |
|------------|---------|----------------|
| Verify provider registration | All doctors must have valid NMC/State Medical Council registration | Query NMC registry at [nmc.org.in](https://www.nmc.org.in) |
| Verify qualification | MBBS/BDS/equivalent from recognized institution | Cross-reference with NMC recognized colleges list |
| Verify allied health professionals | Physiotherapists, nurses, etc. under respective councils | State-level allied health councils |
| Re-verification | Annual re-check of provider credentials | Automate via NMC API (if available) or manual annual audit |

**Action items:**
- [ ] Integrate NMC registration verification (manual initially, API when available)
- [ ] Create provider credential re-verification annual process
- [ ] Maintain audit trail of all verification actions (already in admin module)

### 3.4 Clinical Establishments Act, 2010

This act governs registration of clinical establishments (hospitals, clinics). While Curex24 is NOT a clinical establishment, it should:

- [ ] Verify that providers operating from clinics (DOCTOR_PLACE mode) have valid clinical establishment registration
- [ ] Add clinic registration number as optional field in provider onboarding
- [ ] Display clinic registration status to patients

---

## 4. Data Protection & IT Compliance

### 4.1 Digital Personal Data Protection Act (DPDPA), 2023

The DPDPA is India's primary data protection law. As a platform handling personal and health data, Curex24 must comply.

| Obligation | Details | Action Required |
|-----------|---------|----------------|
| **Consent** | Obtain free, specific, informed consent before processing personal data | Add consent capture at registration, before health data collection |
| **Purpose limitation** | Process data only for stated purpose | Document data processing purposes; don't repurpose health data |
| **Data minimization** | Collect only necessary data | ✅ Already follows this principle (per PRD) |
| **Accuracy** | Keep personal data accurate and updated | Allow users to edit profile; periodic data review |
| **Storage limitation** | Don't retain data longer than necessary | Define retention periods; implement data deletion |
| **Security safeguards** | Reasonable security measures to protect data | Encryption, access control, audit logs |
| **Data breach notification** | Notify Data Protection Board within 72 hours of breach | Create incident response plan |
| **Right to access** | Users can request access to their data | Build data export feature |
| **Right to correction** | Users can request correction of their data | ✅ Profile edit exists |
| **Right to erasure** | Users can request deletion of their data | Build account deletion feature |
| **Right to grievance** | Appoint Data Protection Officer, provide grievance mechanism | Designate DPO; add in-app grievance form |
| **Children's data** | Additional protections for data of persons under 18 | Add age verification; parental consent for minors |
| **Cross-border transfer** | Data transfer restrictions to certain countries | Host data in India (AWS Mumbai region) |

**Action items:**
- [ ] Appoint a Data Protection Officer (DPO)
- [ ] Create and publish a DPDPA-compliant Privacy Policy
- [ ] Implement consent management (granular opt-in for data processing)
- [ ] Build data export feature (downloadable user data)
- [ ] Build account deletion feature (right to erasure)
- [ ] Create data breach notification process
- [ ] Define and document data retention periods
- [ ] Ensure data hosting in India (AWS ap-south-1)

### 4.2 IT Act, 2000 & IT Rules, 2021

As an **intermediary** (platform connecting users and providers), Curex24 must comply with IT intermediary guidelines:

| Obligation | Details |
|-----------|---------|
| **Due diligence** | Publish Terms of Service, Privacy Policy, user grievance redressal |
| **Grievance Officer** | Appoint and publish details of a Grievance Officer |
| **Content takedown** | Respond to government/court takedown orders within 36 hours |
| **User information** | Provide user data to authorized government agencies on lawful request |
| **Significant Social Media Intermediary (SSMI)** | If >5 million users: additional compliance (CCO, monthly reports) — not applicable at launch |

**Action items:**
- [ ] Publish Terms of Service with intermediary disclaimer
- [ ] Appoint and publish Grievance Officer details (name, email, response time)
- [ ] Create internal process for handling government data requests
- [ ] Add compliance statements in app and website footer

### 4.3 Health Data Security (DISHA — Draft)

While DISHA is not yet enacted, Curex24's [PRIVACY.md](./PRIVACY.md) already adopts its principles. Continue to:

- [ ] Monitor DISHA legislation progress
- [ ] Maintain health data audit trail
- [ ] Implement health data access logging
- [ ] Segregate health data from general platform data in architecture

---

## 5. Payment & Financial Compliance

### 5.1 Payment Gateway Compliance

| Requirement | Details | Authority |
|------------|---------|-----------|
| **PCI DSS Compliance** | Handled by payment gateway (Razorpay/Stripe) — Curex24 does NOT store card data | PCI Security Standards Council |
| **UPI Compliance** | UPI merchant onboarding via payment gateway | NPCI (via gateway partner) |
| **RBI Guidelines** | Payment aggregator registration may be required if Curex24 handles/pools funds | Reserve Bank of India |
| **Escrow/Nodal Account** | If holding funds before payout to providers, need nodal account | RBI |

**Key Decision:** Curex24's current architecture processes payments via gateway and calculates payouts. If using Razorpay Route (split payments), Razorpay handles compliance. If Curex24 pools funds and then pays providers, additional RBI compliance is needed.

**Recommended approach:** Use **Razorpay Route** or **linked accounts** so payments go directly to providers (minus platform commission), avoiding the need for Curex24 to hold funds.

**Action items:**
- [ ] Confirm payment flow architecture (split payment vs. pool-and-pay)
- [ ] If split payment: Set up Razorpay Route with linked provider accounts
- [ ] If pooling funds: Consult RBI PA/PG guidelines and apply for PA license
- [ ] Set up provider payout mechanism (bank transfer via NEFT/IMPS)
- [ ] Implement GST invoicing for platform fee

### 5.2 Tax Compliance

| Tax | Applicability | Rate | Action |
|-----|--------------|------|--------|
| **GST on platform fee** | Curex24 charges 20% platform commission — GST applies on this | 18% on technology services | Register for GST; issue tax invoices |
| **TDS on provider payouts** | If paying providers as independent contractors | 10% TDS under Section 194J (professional fees) | Deduct TDS; file quarterly TDS returns |
| **Income Tax** | Company income tax | 25% (for turnover < ₹400 Cr) or 22% (new regime) | File annual returns |
| **Equalization Levy** | Only if foreign e-commerce operator | N/A (India-based company) | Not applicable |

**Action items:**
- [ ] Register for GST (if not already done)
- [ ] Implement GST calculation in payment flow (18% on platform commission)
- [ ] Set up TDS deduction for provider payouts (if applicable)
- [ ] Engage a CA (Chartered Accountant) for tax compliance
- [ ] Set up invoicing system (patient receipts, provider earnings statements)

---

## 6. Mobile App Store Compliance

### 6.1 Apple App Store (iOS)

| Guideline | Requirement | Action |
|-----------|------------|--------|
| **4.2 Minimum Functionality** | App must be fully functional, not a web wrapper | ✅ Native Expo/RN app |
| **5.1.1 Data Collection** | Privacy nutrition labels required | Complete App Store privacy questionnaire |
| **5.1.2 Data Use and Sharing** | Must describe data practices | Include privacy policy URL |
| **1.2 User Generated Content** | If users create content, need reporting mechanism | Add report button for provider profiles |
| **3.1.1 In-App Purchase** | Physical services (home visits) exempt from 30% commission | Document as physical service, not digital |
| **5.1.1(v) Health & Fitness** | Health apps must have privacy policy, accurate medical info disclaimer | Add medical disclaimer |
| **2.5.6 Apps that browse the web** | Not applicable | N/A |

**Action items:**
- [ ] Complete Apple privacy nutrition labels
- [ ] Add medical disclaimer ("Curex24 is not a substitute for emergency medical services")
- [ ] Include privacy policy URL in app and App Store listing
- [ ] Prepare App Store Review notes explaining healthcare marketplace model
- [ ] Set up Apple Developer account ($99/year)

### 6.2 Google Play Store (Android)

| Policy | Requirement | Action |
|--------|------------|--------|
| **Health Apps** | Must not make misleading health claims | Add appropriate disclaimers |
| **Permissions** | Request only necessary permissions (location, camera, storage) | ✅ Already follows this |
| **Data Safety** | Complete Data Safety form | Fill out data types collected/shared |
| **Target API Level** | Must target recent Android API level | ✅ Expo handles this |
| **Content Rating** | Complete IARC content rating questionnaire | Submit questionnaire |
| **Sensitive event claims** | Cannot claim to cure/treat diseases | Ensure marketing does not overclaim |

**Action items:**
- [ ] Complete Google Play Data Safety form
- [ ] Submit IARC content rating questionnaire
- [ ] Add health disclaimer in app and Play Store listing
- [ ] Set up Google Play Developer account ($25 one-time)

---

## 7. State-Level Approvals & Health Department Liaison

### 7.1 State Health Department Engagement

While not legally required for a marketplace platform, engaging state health departments is **strategically valuable** for credibility and access.

| Level | Entity | Purpose | How to Approach |
|-------|--------|---------|----------------|
| **State** | Directorate of Health Services | Awareness and support for digital health initiative | Formal letter + meeting request to Director |
| **District** | Chief District Medical Officer (CDMO) | Local health ecosystem access, PHC partnerships | Meeting request through district administration |
| **Block** | Block Medical Officer (BMO) | Community health worker coordination | Introduction through CDMO |
| **Community** | ASHA Workers, ANMs | Ground-level health awareness and referrals | Through BMO and PHC in-charges |

### 7.2 State Medical Council Registration (For Reference)

Each state has a State Medical Council that registers doctors. Curex24 should:

- [ ] Obtain list of recognized State Medical Councils
- [ ] Verify provider registrations against state council databases
- [ ] Contact state councils to explore API/database access for verification
- [ ] Build relationships for dispute resolution support

**State Medical Councils to contact (based on pilot geography):**

| State | Council | Website |
|-------|---------|---------|
| Maharashtra | Maharashtra Medical Council | [mmc.org.in](https://www.mmc.org.in) |
| Karnataka | Karnataka Medical Council | [kmc.gov.in](https://kmc.gov.in) |
| Tamil Nadu | Tamil Nadu Medical Council | [tnmc.org.in](https://tnmc.org.in) |
| Kerala | Travancore-Cochin Medical Council | [tcmc.kerala.gov.in](https://tcmc.kerala.gov.in) |
| Rajasthan | Rajasthan Medical Council | [rajmedicalcouncil.com](http://rajmedicalcouncil.com) |
| Uttar Pradesh | UP State Medical Council | N/A — visit in person |

*(Add relevant state council based on actual pilot geography)*

---

## 8. Industry Associations & Support Networks

### 8.1 Medical & Healthcare Associations

These associations can provide credibility, provider access, regulatory guidance, and advocacy support.

| Association | Full Name | Relevance | How to Engage |
|------------|-----------|-----------|--------------|
| **IMA** | Indian Medical Association | Largest doctors' body; local chapters in every district | Present at local chapter meetings; seek endorsement |
| **IPHA** | Indian Public Health Association | Public health community | Attend conferences; share rural health mission |
| **FICCI Health** | Federation of Indian Chambers (Health Committee) | Industry body for health-tech companies | Membership; attend Health Summit; network |
| **NATHEALTH** | Healthcare Federation of India | Health industry advocacy | Membership; policy engagement |
| **IAP** | Indian Academy of Pediatrics | If targeting pediatric services | Partner for child health content |
| **IPA** | Indian Physiotherapy Association | Physiotherapist network | Source provider leads; co-branding |
| **ISSP** | Indian Speech & Hearing Association | Speech therapist network | Provider recruitment channel |
| **TNAI** | Trained Nurses Association of India | Nursing community | Home nursing provider pipeline |

### 8.2 Technology & Startup Associations

| Association | Relevance | How to Engage |
|------------|-----------|--------------|
| **NASSCOM** | IT industry body; health-tech SIG | Membership; attend events; product showcases |
| **iSPIRT** | Product-focused Indian tech community | Apply for membership; attend PlaybookRTs |
| **TiE** | Entrepreneurship network; mentors, investors | Join local chapter; attend TiECon |
| **Startup India** | Government startup ecosystem | Register for benefits; apply for Seed Fund |
| **Atal Innovation Mission** | Government innovation support | Apply for grants; Atal Incubation Centre partnerships |
| **STPI** | Software Technology Parks of India | Tax benefits; infrastructure support |

### 8.3 Government Health Programs & Initiatives

Aligning with government health programs can provide strategic support and credibility.

| Program | Ministry/Agency | Relevance | How to Leverage |
|---------|----------------|-----------|----------------|
| **Ayushman Bharat Digital Mission (ABDM)** | NHA (National Health Authority) | Digital health ID, health records interoperability | Integrate ABHA (Ayushman Bharat Health Account) for patient IDs |
| **Ayushman Bharat – PMJAY** | NHA | Health insurance for 50 Cr beneficiaries | Explore empanelment for insured patients |
| **National Digital Health Mission** | Ministry of Health | Digital health infrastructure | Align architecture with NDHM standards |
| **e-Sanjeevani** | Ministry of Health | Government telemedicine platform | Reference model; complementary service |
| **National Health Mission (NHM)** | Ministry of Health | Rural health infrastructure, ASHA workers | Partner with NHM for community outreach |
| **Digital India** | MeitY | Digital literacy, connectivity | Leverage Digital India branding in rural areas |

**Action items:**
- [ ] Register on ABDM and explore ABHA ID integration
- [ ] Apply for Startup India recognition
- [ ] Join IMA local chapter in pilot geography
- [ ] Join NASSCOM / FICCI as health-tech member
- [ ] Contact local TiE chapter for mentorship
- [ ] Explore PMJAY empanelment (if applicable to service model)

---

## 9. Approval Timeline & Sequence

### 9.1 Recommended Sequence

```
Month 1–2: Entity & Basic Registrations
├── Company incorporation (Pvt Ltd)
├── PAN, TAN, GST registration
├── Trademark filing (Curex24)
├── MSME / Startup India registration
├── Open company bank account
└── Apple/Google developer accounts

Month 2–3: Compliance Foundations
├── Privacy Policy & Terms of Service
├── DPDPA compliance review
├── Grievance Officer appointment
├── Data Protection Officer appointment
├── Payment gateway merchant KYC
└── CA engagement for tax compliance

Month 3–4: Healthcare & Industry
├── NMC provider verification process
├── State Medical Council liaison
├── IMA local chapter engagement
├── ABDM registration exploration
├── Clinical Establishments Act awareness
└── Telemedicine guidelines review (if adding video consult)

Month 4–5: State & Local Engagement
├── State Health Directorate meeting
├── District health officer briefing
├── PHC partnership discussions
├── ASHA worker coordination
└── Community outreach preparation

Month 5–6: Pre-Launch Compliance
├── App Store submission (with all compliance docs)
├── Play Store submission
├── Final security audit
├── Insurance procurement
├── GST invoicing system
└── TDS setup for provider payouts
```

### 9.2 Critical Path Items

| Item | Dependency | Lead Time | Risk if Delayed |
|------|-----------|-----------|----------------|
| Company incorporation | — | 1–2 weeks (via SPICe+) | Cannot open bank accounts, sign contracts |
| GST registration | Incorporation | 1 week | Cannot collect/remit GST |
| Payment gateway KYC | Incorporation + bank account | 1–3 weeks | Cannot process payments |
| Trademark filing | Incorporation | 1 week to file; 4–6 months to register | Risk of name conflict |
| App Store approval | Privacy policy + all compliance | 1–2 weeks review | Cannot launch on iOS |
| Play Store approval | Data safety form + compliance | 1–3 days review | Cannot launch on Android |
| IMA endorsement | Local chapter engagement | 1–3 months of relationship building | Missed credibility opportunity |
| ABDM integration | Technical + registration | 2–4 months | Missed government health ecosystem |

---

## 10. Contacts & Entities to Approach

### 10.1 Government Bodies

| Entity | Contact Method | Purpose |
|--------|---------------|---------|
| **MCA (Ministry of Corporate Affairs)** | [mca.gov.in](https://www.mca.gov.in) — online portal | Company incorporation |
| **Income Tax Department** | [incometax.gov.in](https://www.incometax.gov.in) | PAN, TAN, ITR |
| **GST Portal** | [gst.gov.in](https://www.gst.gov.in) | GST registration |
| **DPIIT (Startup India)** | [startupindia.gov.in](https://www.startupindia.gov.in) | Startup recognition |
| **NMC** | [nmc.org.in](https://www.nmc.org.in) | Provider verification |
| **NHA** | [nha.gov.in](https://nha.gov.in) | ABDM integration |
| **MeitY** | [meity.gov.in](https://www.meity.gov.in) | IT Act compliance guidance |
| **State Health Directorate** | Visit in person or via state government portal | Local health department engagement |
| **District Collector's Office** | Visit in person | District-level support and awareness |
| **Trademark Office** | [ipindia.gov.in](https://ipindia.gov.in) | Trademark registration |

### 10.2 Industry Contacts

| Entity | Contact Method | Purpose |
|--------|---------------|---------|
| **IMA (Indian Medical Association)** | [ima-india.org](https://www.ima-india.org) — local branch meetings | Provider network, credibility |
| **NASSCOM** | [nasscom.in](https://nasscom.in) — apply for membership | Health-tech community |
| **FICCI Health** | [ficci.in/sector/health](https://www.ficci.in) | Industry advocacy |
| **TiE** | [tie.org](https://tie.org) — local chapter | Mentorship, investor access |
| **iSPIRT** | [ispirt.in](https://ispirt.in) | Product community |
| **Razorpay** | [razorpay.com](https://razorpay.com) — dashboard registration | Payment gateway |

### 10.3 Professional Service Providers

| Service | Type | How to Find |
|---------|------|-------------|
| **Company Secretary (CS)** | Incorporation, compliance | ICSI member directory |
| **Chartered Accountant (CA)** | Tax, GST, TDS, audit | ICAI member directory |
| **Healthcare Lawyer** | Regulatory advice, contracts | Legal directories (Bar Council) |
| **IP Attorney** | Trademark, copyright | Trademark agents registered with IP Office |
| **Insurance Broker** | Professional liability, cyber insurance | IRDAI registered brokers |
| **Compliance Consultant** | DPDPA, IT Act compliance | Data privacy consultancies |

### 10.4 Key People to Identify (Per Pilot Geography)

For each pilot town/district, identify and build relationships with:

- [ ] **District Medical Officer / Chief Medical Officer** — key health authority
- [ ] **IMA District Branch President** — doctor community leader
- [ ] **Leading local doctors (2–3)** — early provider champions
- [ ] **PHC Medical Officer** — community health access point
- [ ] **Block Development Officer** — local governance support
- [ ] **Local pharmacy owners (2–3)** — referral and awareness partners
- [ ] **Community health workers (ASHA/ANM)** — ground-level outreach
- [ ] **Local journalist (health beat)** — PR and awareness
- [ ] **District Collector (if possible)** — highest local administration support

---

## 11. Approval Checklist

### 📋 Business Registration

- [ ] Company incorporated (Pvt Ltd / LLP)
- [ ] Certificate of Incorporation (CIN) received
- [ ] PAN obtained
- [ ] TAN obtained
- [ ] GST registration completed
- [ ] Company bank account opened
- [ ] MSME (Udyam) registration completed
- [ ] Startup India recognition obtained
- [ ] Shop & Establishment registration (state-level)

### 🏥 Healthcare Compliance

- [ ] Provider verification process aligned with NMC requirements
- [ ] State Medical Council verification process established
- [ ] Telemedicine Practice Guidelines reviewed (if video consult planned)
- [ ] Medical disclaimer added to app and marketing materials
- [ ] Patient consent mechanism implemented
- [ ] Clinical Establishments Act verification (for DOCTOR_PLACE providers)
- [ ] Provider Agreement / Terms drafted and published
- [ ] ABDM registration explored (ABHA integration roadmap)

### 🔐 Data Protection & IT Compliance

- [ ] DPDPA compliance audit completed
- [ ] Privacy Policy published (DPDPA-compliant)
- [ ] Terms of Service published (IT Act intermediary compliant)
- [ ] Data Protection Officer (DPO) appointed
- [ ] Grievance Officer appointed and details published
- [ ] Data breach notification process documented
- [ ] Data retention and deletion policy defined
- [ ] Data export feature available (right to access)
- [ ] Account deletion feature available (right to erasure)
- [ ] Consent management system implemented
- [ ] Data hosted in India
- [ ] DISHA monitoring in place (for when enacted)

### 💳 Financial & Payment Compliance

- [ ] Payment gateway merchant account activated
- [ ] PCI DSS compliance confirmed (via gateway)
- [ ] GST invoicing implemented
- [ ] TDS deduction process set up (if applicable)
- [ ] Chartered Accountant engaged
- [ ] Payment flow architecture confirmed (split payment vs. pool)
- [ ] Provider payout mechanism operational
- [ ] Financial record-keeping system in place

### 📱 App Store Compliance

- [ ] Apple Developer Account created ($99/year)
- [ ] Google Play Developer Account created ($25)
- [ ] Apple privacy nutrition labels completed
- [ ] Google Play Data Safety form completed
- [ ] IARC content rating questionnaire submitted
- [ ] Medical disclaimers added to app
- [ ] Privacy Policy URL added to store listings
- [ ] App Store Review notes prepared
- [ ] Both store submissions approved

### ™️ Intellectual Property

- [ ] Trademark application filed (Curex24 — Class 44, Class 42)
- [ ] Logo trademark filed
- [ ] Domain name secured (curex24.com + variants)
- [ ] App name reserved on stores

### 🛡️ Insurance

- [ ] Professional liability insurance obtained
- [ ] Cyber liability insurance obtained
- [ ] Directors & Officers (D&O) insurance obtained
- [ ] General commercial liability insurance obtained

### 🤝 Industry Relationships

- [ ] IMA local chapter membership / partnership established
- [ ] NASSCOM or FICCI membership applied
- [ ] TiE local chapter engagement initiated
- [ ] Startup India benefits activated
- [ ] ABDM registration initiated
- [ ] State Health Directorate meeting conducted
- [ ] District Health Officer briefed
- [ ] Local PHC partnerships established
- [ ] Key local doctors identified and engaged (provider champions)
- [ ] Community health workers connected (ASHA/ANM network)

### 📄 Legal Documents

- [ ] Terms of Service (finalized by healthcare lawyer)
- [ ] Privacy Policy (DPDPA-compliant, reviewed by data privacy expert)
- [ ] Provider Agreement (terms, commission, liability, termination)
- [ ] Patient Consent Forms (data processing, health data)
- [ ] Indemnification Clauses (platform liability limitations)
- [ ] Dispute Resolution Policy (arbitration, jurisdiction)
- [ ] Refund & Cancellation Policy
- [ ] Non-Disclosure Agreement (for team, contractors)
- [ ] Employee/Contractor Agreements

---

*Document created: April 2026*
*Last updated: April 2026*
*Owner: Curex24 Legal, Compliance & Operations Team*
