# MEDviz Product Roadmap: Telemedicine Feature Enhancements

This roadmap covers product/telemedicine capabilities that move MEDviz from a working
prototype to a launchable, competitive platform. It is grounded in the current codebase:
a MERN stack with patient/doctor/admin portals, appointment booking
(`backend/models/Appointment.js`), prescriptions rendered as PDFs via pdfkit
(`backend/routes/prescriptions.js`), an AI symptom-triage chatbot (`backend/bot.js`,
`backend/routes/chat.js`), an in-app + email notification system
(`backend/models/Notification.js`, `backend/utils/email.js`), and polling jobs under
`backend/jobs/`.

Effort key: S = days, M = 1-3 weeks, L = 1-2 months (one engineer, rough order of magnitude).

---

## 1. Must-have for a real launch

These are blocking gaps. Without them MEDviz cannot run a real telemedicine visit, get
paid, or operate within the law.

### 1.1 In-app video consultation (Daily.co or Twilio Video)
- **What:** Replace the manual `meeting_link` field (`Appointment.js:41`, set by the doctor
  in `appointments.js:460-474`) with a real, embedded video room. On approval, the backend
  provisions a room via the Daily/Twilio API, stores its URL/token on the appointment, and
  both portals render an in-app call screen (waiting room, mic/camera controls, screen share,
  in-call chat). The `Video Consultation` service type in the `service_type` enum already
  anticipates this.
- **Why:** The product is a telemedicine platform that currently has no telemedicine.
  Pasting external links by hand is error-prone, insecure, and not a product. This is the
  single most important gap.
- **Effort:** L
- **Dependencies:** Daily.co or Twilio account; per-appointment token generation tied to
  auth; a "join" window enforced against `appointment_date`/`appointment_time`.

### 1.2 Payments and billing (Stripe)
- **What:** Charge for consultations. Add a `Payment` model (amount, currency, status,
  Stripe `payment_intent_id`, refund state), a per-doctor/per-service-type fee, a checkout
  step in the booking flow (`FindDoctorPage`, `appointments.js` create route), Stripe webhook
  handling for confirmation/refunds, and receipts. Gate room provisioning (1.1) on a paid or
  authorized appointment. Add a doctor earnings/payout view and admin revenue reporting
  alongside `AdminAnalytics`.
- **Why:** There is no revenue path today. Payments also reduce no-shows and are a
  prerequisite for doctor payouts and insurance (2.1).
- **Effort:** L
- **Dependencies:** Stripe account; refund policy tied to the existing cancellation flow
  (`cancellation_reason` on `Appointment.js`); video (1.1) for paywall gating.

### 1.3 Legally valid e-prescriptions
- **What:** The current PDF (`prescriptions.js:318+`) is visually formatted but not
  cryptographically signed and carries no verifiable provenance. Add: a real digital
  signature (e.g. PAdES/PKI or an e-sign provider), a unique verification code + QR on each
  prescription resolving to a public verify endpoint, an immutable issued-at timestamp, and a
  tamper-evident audit trail (extend the existing `AuditLog` model). Capture prescriber
  identifiers (registration/DEA-equivalent) on the `Doctor` model.
- **Why:** An unsigned, unverifiable PDF has no legal standing and pharmacies will reject it.
  Required for any real prescribing workflow and for pharmacy fulfillment (2.3).
- **Effort:** M
- **Dependencies:** Doctor verification (1.4) so the signing identity is trustworthy;
  jurisdiction rules on controlled substances.

### 1.4 Doctor license/credential verification
- **What:** The `Doctor` model has a `status` enum (`pending`/`approved`/`rejected`) and a
  `cert_docs` file path, but approval is manual with no real verification. Add structured
  credential fields (license number, issuing authority, expiry, specialty board), document
  upload + admin review queue with audit logging, optional primary-source/registry
  verification, and automatic re-verification on license expiry. Surface a "verified"
  badge on doctor profiles.
- **Why:** Patient safety and platform liability. Unverified prescribers are a legal and
  reputational non-starter and undermine e-prescription validity (1.3).
- **Effort:** M
- **Dependencies:** Admin portal (`AdminDoctors`) extension; ties into 1.3.

### 1.5 Working, delivered reminders (SMS/WhatsApp/push)
- **What:** Today reminders are in-app notifications plus email, driven by polling jobs
  (`jobs/appointmentAlerts.js` using `setInterval`). Add SMS (Twilio) and/or WhatsApp
  reminders, web/mobile push, confirmable reminders (reply/tap to confirm or cancel), and
  delivery-status tracking so a reminder is provably *delivered*, not just queued. Move the
  `setInterval` schedulers to a proper job runner (node-cron or a queue) for reliability.
- **Why:** Email-only reminders have poor open rates; no-shows are the top operational cost
  in telemedicine. Delivered, confirmable reminders directly protect revenue (1.2).
- **Effort:** M
- **Dependencies:** Twilio (shared with 1.1/1.5); patient phone is already captured on the
  `Patient` model; reliable scheduling infra.

### 1.6 Patient-side reschedule and cancel UI
- **What:** The backend already models rescheduling (`rescheduled` status, `original_date`,
  `original_time` on `Appointment.js`) and double-booking is guarded by the unique partial
  index. Expose a patient-facing reschedule/cancel flow in `MyAppointments` that picks a new
  slot from the doctor's `availability_schedule`, respecting cancellation/refund policy (1.2).
- **Why:** Patients currently cannot self-serve a reschedule, forcing cancel-and-rebook or
  manual support. The data model is ready; only the product surface is missing.
- **Effort:** S
- **Dependencies:** Availability data already on `Doctor.js`; refund rules from 1.2.

---

## 2. High-value next

Once launchable, these expand reach, reduce friction, and close the care loop.

### 2.1 Insurance eligibility and claims
- **What:** Capture patient insurance (payer, member ID, plan) on the `Patient` model,
  run real-time eligibility checks at booking, compute copay vs. cash price in the payment
  step (1.2), and support claim submission/superbill generation post-visit.
- **Why:** Insurance coverage is decisive for adoption in many markets and materially
  lifts conversion. Directly extends the billing system.
- **Effort:** L
- **Dependencies:** Payments (1.2); a clearinghouse/eligibility API; verified providers (1.4).

### 2.2 Lab ordering and results integration
- **What:** The prescription already has a free-text `tests_recommended` field. Turn it into
  structured lab orders sent to partner labs/HL7-FHIR endpoints, then ingest results back
  into the patient's `Reports`/medical records with abnormal-value flags and doctor review.
- **Why:** Closes the diagnostic loop without sending patients off-platform, and feeds
  follow-up (2.4) and chronic-disease management (3.3).
- **Effort:** L
- **Dependencies:** FHIR/lab partner integrations; structured records; verified providers.

### 2.3 Pharmacy fulfillment / e-prescription routing
- **What:** Route legally valid prescriptions (1.3) directly to a patient-selected pharmacy
  or a delivery partner, with fill-status tracking surfaced as notifications.
- **Why:** Removes the last manual step between consult and medication; a major convenience
  differentiator and a potential revenue share.
- **Effort:** M
- **Dependencies:** Hard dependency on signed e-prescriptions (1.3); pharmacy network/API.

### 2.4 Patient follow-up and recovery tracking
- **What:** After a `completed` appointment, schedule automated check-ins (symptom
  questionnaires, medication-adherence prompts) over the recovery window, summarized for
  the doctor and auto-escalated on red-flag responses. Reuses the notification pipeline
  and the existing `Follow-up` service type.
- **Why:** Drives outcomes, repeat visits, and engagement — the platform currently has no
  loop after a visit ends. High retention value.
- **Effort:** M
- **Dependencies:** Reliable scheduling (1.5); structured records.

### 2.5 Family / dependent accounts
- **What:** Let one account manage multiple patient profiles (children, elderly dependents)
  with a guardian relationship and per-profile records, bookings, and prescriptions.
- **Why:** Households book together; this raises booking volume per account and is expected
  in consumer health apps.
- **Effort:** M
- **Dependencies:** Auth/role model changes; record access controls; audit logging.

### 2.6 Multi-language support (i18n)
- **What:** Internationalize patient/doctor UI strings, localize prescription PDFs and
  notification templates, and let patients filter doctors by spoken language (add a
  `languages` field to `Doctor.js`).
- **Why:** Expands the addressable market and improves comprehension and safety for
  non-native speakers. The symptom-triage chatbot benefits especially.
- **Effort:** M
- **Dependencies:** UI string extraction; translated content; chatbot localization.

---

## 3. Differentiators

Capabilities that move MEDviz from transactional visits toward longitudinal care.

### 3.1 Wearables and vitals ingestion
- **What:** The `Patient` model already has `height`, `weight`, `bpm` as static strings.
  Replace with a time-series vitals store fed by Apple Health / Google Fit / Fitbit (BP,
  heart rate, glucose, SpO2, steps), charted in the patient dashboard and visible to the
  doctor during a consult.
- **Why:** Continuous data makes remote care genuinely better than a single snapshot and is
  the foundation for chronic-disease management (3.3).
- **Effort:** L
- **Dependencies:** Wearable APIs; time-series storage; consent management.

### 3.2 Structured care plans
- **What:** A doctor-authored care plan attached to a patient: goals, tasks, medication
  schedule, milestones, and progress tracking — distinct from the internal staff `Task`
  model. Drives patient-facing to-dos and adherence prompts.
- **Why:** Turns one-off advice into a trackable program, improving outcomes and giving
  patients a reason to stay engaged between visits.
- **Effort:** M
- **Dependencies:** Follow-up (2.4); notifications; structured records.

### 3.3 Chronic-disease management programs
- **What:** Condition-specific programs (diabetes, hypertension, asthma) combining vitals
  ingestion (3.1), care plans (3.2), scheduled check-ins, and threshold-based alerting to
  the care team. Optionally enrollment-based / subscription-billed (1.2).
- **Why:** Chronic care is recurring, high-value, and where telemedicine delivers the
  clearest ROI. Strong retention and revenue, and a clear market differentiator.
- **Effort:** L
- **Dependencies:** 3.1, 3.2, reliable scheduling (1.5), payments (1.2).

### 3.4 Specialist referrals and group/care-team visits
- **What:** Let a treating doctor refer a patient to an in-network specialist with shared
  context (records, prescriptions, notes), and support multi-party video sessions
  (specialist + GP + patient, or patient + family member) on the video infrastructure (1.1).
- **Why:** Keeps complex cases inside MEDviz instead of leaking to outside providers, and
  enables coordinated care that single-doctor platforms cannot offer.
- **Effort:** L
- **Dependencies:** Video (1.1) with multi-participant rooms; verified specialist network
  (1.4); shared records access.

---

## Suggested sequencing

1. **Launch gate:** 1.1 → 1.2 → 1.4 → 1.3 → 1.5 → 1.6. Video, payments, and verification
   unlock the legal/operational basics; reschedule UI is a quick win on existing data.
2. **Growth:** 2.1 and 2.3 monetize and remove friction; 2.4 and 2.6 drive retention and reach.
3. **Moat:** 3.1 → 3.3 builds the longitudinal-care platform; 3.4 extends the network effect.
