# MEDviz — Product & Engineering Dossier

*A complete, professional reference to the MEDviz telemedicine platform: what it is, how it is built, how it is secured, how it is operated, and where it is going.*

**Version:** 1.0 (release candidate) · **Stack:** MERN (MongoDB · Express · React · Node) · **Status:** Engineering-ready; pre-clinical gates outstanding (see §13).

---

## 1. Executive summary

MEDviz is a telemedicine platform that connects patients, doctors, and administrators in a single system. A patient can register, talk to an AI symptom-triage assistant, find and book a doctor, attend a consultation, and receive a prescription as a signed PDF. A doctor reviews and approves requests, runs consultations, and issues prescriptions. An administrator verifies doctors and monitors the practice through real analytics.

Its defining asset is a **deterministic AI triage engine**: severity is decided by a rule-based scoring system, and the language model is used only to phrase questions and explanations — never to make a medical decision. The system fails safe when the model is unavailable.

The platform is built to production engineering standards: role-based access control enforced server-side, per-record ownership checks, audit logging, rate limiting, structured logging, health/readiness probes, graceful shutdown, containerized deployment, CI, and an integration test suite that runs against a real database. Twenty-three integration tests pass green, proving the security and core flows at runtime.

---

## 2. The problem & the audience

Patients struggle to bridge the gap between *“I have a symptom”* and *“a clinician has a plan for me.”* MEDviz compresses that gap for three users:

- **Patients** — self-service triage, doctor discovery, booking, consultations, prescriptions, and records.
- **Doctors** — a pre-sorted inbox of requests, an appointment lifecycle, prescription authoring, and settings.
- **Administrators** — doctor verification/approval, patient and record oversight, and practice analytics.

---

## 3. Feature catalog

| Capability | Patient | Doctor | Admin |
|---|:--:|:--:|:--:|
| Registration & login (JWT + refresh tokens) | ✅ | ✅ (approval-gated) | ✅ |
| Password reset via OTP (CSPRNG, hashed) | ✅ | ✅ | ✅ |
| AI symptom triage (deterministic + LLM phrasing) | ✅ | — | — |
| Doctor discovery & booking (slot-conflict checked) | ✅ | — | — |
| Appointment lifecycle (approve/reject/reschedule/cancel) | cancel/reschedule | approve/reject/reschedule | — |
| Prescriptions (authoring + signed PDF download) | view/PDF | create | view |
| Notifications (in-app + email delivery) | ✅ | ✅ | — |
| Appointment reminders (24h / 1h / starting-soon, emailed) | ✅ | — | — |
| Medical records / report upload (secure, authenticated) | ✅ | — | view |
| Practice analytics (aggregated) | — | dashboard | ✅ |
| Doctor verification / approval | — | — | ✅ |

---

## 4. The AI triage engine (differentiator)

**Design contract: rules decide severity; the LLM only phrases; every model call has a fallback.**

Pipeline (`backend/bot.js` + `backend/services/ai.js`):

1. **Pre-validation** — reject greetings/nonsense; respond empathetically to pure fear.
2. **Symptom extraction** — regex extraction of severity, duration, frequency.
3. **Contradiction detection** — e.g. “mild” + “unbearable” triggers a clarifying question.
4. **Deterministic scoring** — a weighted sum (symptom weight + severity word + duration + emergency keywords + critical-symptom combinations + multi-symptom) maps to Neutral / Moderate / Critical.
5. **Emergency short-circuit** — two emergency keywords (or one plus a critical word) immediately locks to *Critical* and directs the user to emergency services. No model is consulted.
6. **State machine** — `WAITING_FOR_PROBLEM → CLARIFYING (≤3 follow-ups, auto-skipping answered items) → FINAL (locked)`.
7. **Finalize** — the LLM words the explanation over the rule-decided severity; a hard-coded per-tier message is the fallback.

The local model (Ollama, `llama3.2:3b`) is used for input validation, follow-up phrasing, and explanation wording. If it is slow or down, the heuristic/fallback path still produces a safe, rule-based result. **The model can never escalate or de-escalate a medical decision.**

---

## 5. System architecture

```
                 ┌────────────────────────────┐
   Browser  ───▶ │  React SPA (CRA)           │   patient / doctor / admin portals
                 │  axios → /api              │
                 └──────────────┬─────────────┘
                                │ HTTPS (JWT access + refresh)
                 ┌──────────────▼─────────────┐
                 │  Express app (app.js)      │  helmet · requestId · pino-http
                 │  ├ rate limiting           │  · CORS · JSON
                 │  ├ authenticate (JWT)      │
                 │  ├ requireRole (RBAC)      │
                 │  ├ ownership guards (IDOR) │
                 │  ├ validation              │
                 │  ├ routes → services       │
                 │  └ centralized errors      │
                 └───┬───────────┬────────┬───┘
                     │           │        │
              ┌──────▼───┐  ┌────▼────┐  ┌▼──────────┐
              │ MongoDB  │  │ Ollama  │  │ SMTP / S3 │   (LLM local; email/storage external)
              │ (Mongoose)│ │  LLM    │  │  (opt.)   │
              └──────────┘  └─────────┘  └───────────┘

   Boot (server.js): validate env → connect Mongo → start cron jobs → listen → graceful shutdown
```

**Layering** is deliberate: `app.js` is a pure, I/O-free Express app (importable by tests); `server.js` owns environment validation, the database connection, scheduled jobs, the listener, and shutdown.

---

## 6. Data model (MongoDB collections)

`Patient`, `Doctor`, `Admin` — accounts (bcrypt-hashed passwords). `Appointment` — the consultation lifecycle (indexed on doctor/patient/status/date; a unique partial index prevents double-booking). `Prescription` — diagnosis + medicines (one per appointment). `Report` — uploaded medical documents. `Notification` — in-app messages (receiver-typed). `Task` — doctor to-dos. `ChatHistory` — triage transcripts. `DoctorSettings` — per-doctor configuration. `AuditLog` — append-only PHI access trail. `RefreshToken` — hashed, TTL-expiring refresh tokens.

---

## 7. API surface (grouped)

- `/api/auth` — register, login (returns access + refresh token), `refresh`, `logout`, forgot/verify/reset password. *Rate-limited.*
- `/api/appointments` — book, list, approve, reject, reschedule, cancel, slots. *Auth + ownership.*
- `/api/prescriptions` — create, get, by-patient, by-appointment, PDF download. *Auth + ownership.*
- `/api/doctors` — public browse; self-guarded profile/availability mutations.
- `/api/patient[s]` — patient profile/records; doctor-dashboard patient views.
- `/api/admin` — metrics, analytics, patients, doctors, approvals. *Admin only.*
- `/api/notifications`, `/api/tasks`, `/api/doctor-settings` — *Auth.*
- `/api/chat` — AI triage. *Auth + rate-limited; identity from JWT.*
- `/api/files/:name` — authenticated, traversal-safe file serving.
- `/healthz`, `/readyz` — liveness / readiness probes.

---

## 8. Security model

Defense in depth, all enforced **server-side**:

1. **Authentication** — JWT (`{id, role}`), no fallback secret; boot refuses a secret < 32 chars. 15-minute access tokens with rotating 7-day refresh tokens.
2. **Authorization (RBAC)** — role gates at each router boundary (e.g. `/api/admin` → admin only).
3. **Ownership (anti-IDOR)** — resource-aware guards load the record and verify the caller owns it; identity on create paths is bound to the token (a patient can only book as themselves; a doctor can only prescribe as themselves, and only for a patient they have an appointment with).
4. **Audit logging** — append-only trail of who accessed/changed which record.
5. **Hardening** — helmet headers, layered rate limiting (global + strict on auth/OTP/chat), boundary input validation (400 not 500), centralized error handling that never leaks stack traces, CSPRNG OTPs, type/size-limited uploads with random filenames, authenticated traversal-safe file serving (replacing a previously public PHI directory), and a locked-down admin-registration endpoint.

Every one of these guarantees is exercised by the integration test suite (§9).

---

## 9. Quality & testing

- **23 integration tests** (Jest + Supertest) run against an ephemeral in-memory MongoDB — real HTTP, real database, no mocks.
- Coverage includes: the auth boundary (401), invalid-id → 400 (not 500), RBAC (patient → admin 403), IDOR (cross-patient read 403, non-owner-doctor approve 403, wrong-role 403), anti-impersonation identity binding, admin-registration lockdown, prescription RBAC/ownership, the duplicate-prescription 409, secure-file auth, and the refresh-token lifecycle (issue/refresh/rotate/logout).
- **CI** (GitHub Actions) gates the backend on `npm test` plus a syntax sweep, and builds the frontend.
- The frontend compiles cleanly (`npm run build`).

---

## 10. Observability & operations

- **Structured logging** (pino + pino-http) with per-request correlation IDs; health checks excluded from log noise.
- **Health/readiness** endpoints for load balancers; `/readyz` reports database connectivity.
- **Resilience** — the server listens only after a successful DB connect, uses a connection pool, handles `SIGTERM`/`SIGINT` with graceful drain, and guards against unhandled rejections/exceptions.
- **Scheduled jobs** — appointment auto-complete and tiered reminders (with email delivery).

---

## 11. Deployment

Containerized: backend `Dockerfile` (non-root, healthcheck), frontend `Dockerfile` (built then served by nginx with SPA fallback), and a `docker-compose.yml` provisioning MongoDB, Redis, backend, frontend, and an optional Ollama service. Environment is documented in `.env.sample` files; `JWT_SECRET` must be ≥ 32 characters and `ADMIN_REGISTRATION_SECRET` should be set only for initial seeding. Full runbook in `DEPLOYMENT.md`.

---

## 12. Technology stack

**Frontend:** React 18 (CRA + craco), React Router, axios, hand-authored CSS unified by a design-token layer (`styles/tokens.css`). **Backend:** Node + Express, Mongoose, JWT, bcrypt, helmet, express-rate-limit, multer, pdfkit, nodemailer, pino. **AI:** Ollama (local LLM) behind a deterministic scoring engine. **Testing:** Jest, Supertest, mongodb-memory-server. **Ops:** Docker, GitHub Actions.

---

## 13. Roadmap & remaining gates

**Engineering follow-ups:** real embedded video (Daily/Twilio/Jitsi — currently a meeting link), payments/billing, S3-backed uploads and Redis-backed chatbot session state for multi-instance scale, moving cron to a single-scheduler/queue (BullMQ), and a full design-token migration across all UI components.

**Pre-clinical gates (not code — organizational/legal):** purge of historical PHI from version control and secret rotation; a third-party penetration test; HIPAA risk assessment and Business Associate Agreements with every subprocessor; legally valid e-prescription routing for the target jurisdiction; and a production load test to certify latency targets.

MEDviz today is a coherent, tested, deployable telemedicine platform. The remaining items are about clinical, legal, and scale readiness — not about whether the software works.

---

*Companion documents: `RELEASE-READINESS.md` (sign-off), `architecture/README.md` (target architecture), `security-audit.md`, `decisions/ADR-*` (decision records), `FINAL-GAP-ANALYSIS.md` (scored gaps), `DEPLOYMENT.md` (runbook).*
