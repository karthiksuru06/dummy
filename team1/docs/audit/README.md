# MEDviz — Repository Audit

Six-discipline audit (Principal Eng · Healthcare Architect · Product · Security · DevOps/SRE · UX). Findings are evidence-based with `file:line` references. Detailed remediation lives in `team1/DEVELOPMENT_PLAN.md`; target state in `docs/architecture/`.

## 1. Executive Summary
MEDviz is a MERN telemedicine app (patient/doctor/admin portals, appointments, prescriptions, an AI symptom-triage chatbot, notifications). It compiles and runs. The **AI triage engine is genuinely well-engineered** (deterministic severity, LLM only for phrasing, safe fallbacks). Everything around it is a prototype with a fake floor: most backend routes had no authentication, several UI features are fake or dead, and the headline "video consultation" doesn't exist. Pre-mitigation product score ≈ **3.5/10**; security ≈ **2/10**. This pass implemented the security P0 (see §10) and a UI design-system foundation.

## 2. Security Findings (was the worst category)
- **No auth middleware** on appointments/prescriptions/doctor/admin/tasks/notifications routes. *(fixed: ADR-001)*
- **Open `POST /api/auth/admin/register`** — anyone could self-grant admin. *(fixed: gated)*
- **Public PHI files** via `express.static('/uploads')`, guessable epoch names. *(fixed: ADR-002)*
- **`JWT_SECRET || 'secret'`** forgeable fallback (`patients.js`). *(fixed)*
- **Client-only authorization** (`localStorage.userRole`). *(fixed: server-side RBAC)*
- **`Math.random()` OTPs**, no rate limiting on auth/OTP/chat. *(fixed: CSPRNG + limiters)*
- **Path-traversal guard** scoped to `backend/` not `uploads/`. *(fixed)*
- **Chat `userId` from body** (impersonation), PHI in logs. *(fixed)*
- **Still open (P0):** per-record ownership (IDOR) in handlers — ADR-002. Dependency CVEs (`multer@1`→2 done in manifest; run `npm audit`). 1h JWT, no refresh.

## 3. Architecture Findings
Clean route/model separation, but: no service layer, no centralized error handling *(fixed)*, no validation layer *(fixed: zero-dep validator)*, in-memory chatbot session state (`bot.js`) breaks multi-instance, cron via `setInterval` on every replica *(ADR-004)*, local-disk uploads *(ADR-002)*.

## 4. Product Gaps
No real video (manual pasted URL); no payments/billing; no real doctor license verification; reminders never delivered; no patient-side cancel/reschedule; e-prescription has no legal validity (PDF is a JSON stub); no consent/privacy capture.

## 5. UX Findings
5 fonts, 5 blues, per-page guessed padding, content rendered *behind* the fixed header (`FindDoctorPage`), a global override file mangling gradients + bleeding `!important` app-wide, removed focus states, sub-44px targets, landing nav vanishes on mobile. *(foundation fixed: tokens.css + offset + declaw + focus; rest tracked in design-system doc.)* Pre-fix UI ≈ **4/10**.

## 6. Performance Findings
N+1 queries (`patients.js` doctor view = 3N+2 queries), `admin.js` analytics = 24 sequential queries + in-memory age bucketing, **zero Mongoose indexes** *(fixed: Appointment indexes added)*, unbounded list endpoints (no pagination), sequential awaits that should be `Promise.all`.

## 7. Scalability Findings
Single-instance-bound: in-memory chat state, per-replica cron, local-disk uploads. No connection pooling config *(fixed: maxPoolSize)*, server listened before DB connect *(fixed)*.

## 8. Technical Debt Findings
Swapped route mounts (`/api/patients`→`patient.js`, `/api/patient`→`patients.js`), dead service methods, `temp_fix.js`, stray files (`abc.txt`, `log.txt`, `test-auth.js`), CRA (unmaintained) + craco polyfill stack.

## 9. Missing Features
Video, payments, delivered reminders, signed-PDF prescriptions, patient cancel/reschedule, doctor verification, refresh tokens, tests (none exist), Docker/CI, observability.

## 10. Launch Blockers (ranked)
1. ~~No server-side auth / open admin~~ → **fixed this pass** (ADR-001).
2. ~~Public PHI file serving~~ → **fixed** (ADR-002); **but** per-record ownership still required, and PHI/`.env` already in git history must be purged.
3. No real video (ADR-003).
4. Reminders not delivered (ADR-004).
5. No tests / no CI / no observability.
6. e-Prescription legal validity.

> Status legend: *(fixed)* = implemented + syntax-verified this pass, **not runtime-tested** (no `node_modules`/DB available in-session).
