# MEDviz Security Audit

Scope: backend (Express/Mongoose) + frontend auth handling. Lens: OWASP Top 10 + healthcare PHI sensitivity. Each finding carries a status as of this session.

> Verification note: fixes are **syntax-verified** (`node --check`) only. No `node_modules`, DB, or runtime this session — nothing is runtime-tested. Treat "Fixed" as "implemented, pending CI verification."

## Severity summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Open `POST /api/auth/admin/register` — anyone self-grants admin | CRITICAL | **Fixed** — gated behind `ADMIN_REGISTRATION_SECRET` bootstrap header |
| 2 | Public PHI files via `express.static('/uploads')`, guessable epoch names | CRITICAL | **Fixed** — removed; `routes/files.js` authenticated + traversal-safe; UUID filenames |
| 3 | No auth on appointments/prescriptions/doctor/admin/tasks/notifications | HIGH | **Fixed** — `authenticate` + `requireRole` at router boundary (`server.js`) |
| 4 | IDOR — handlers trust client-supplied ids (cross-patient access) | HIGH | **Fixed** — ownership guards on all appointment mutations/reads + all prescription routes |
| 5 | `JWT_SECRET || 'secret'` forgeable fallback (`patients.js` ×3) | HIGH | **Fixed** — fallback removed; secret required + min-length at boot |
| 6 | Client-only authorization (`localStorage.userRole`) | HIGH | **Fixed server-side** (client guard remains as UX only) |
| 7 | Doctor profile/availability/profile-picture unauthenticated (takeover) | HIGH | **Fixed** — self-or-admin guard |
| 8 | `Math.random()` OTP generation | MED | **Fixed** — `crypto.randomInt` |
| 9 | No rate limiting on auth/OTP/login/chat (brute force, email bomb, LLM DoS) | MED | **Fixed** — global + strict limiters (`express-rate-limit`) |
| 10 | Path-traversal guard scoped to `backend/`, not `uploads/` | MED | **Fixed** — constrained to uploads dir + `path.sep` |
| 11 | Chat `userId` from request body (impersonation) | MED | **Fixed** — bound to JWT identity |
| 12 | PHI (clinical messages, file paths) logged to stdout | MED | **Fixed** — chat content no longer logged; structured error logs |
| 13 | No security headers | MED | **Fixed** — `helmet` |
| 14 | No centralized error handling / stack-trace leakage | MED | **Fixed** — `errorHandler` returns generic 5xx, logs server-side |
| 15 | Unrestricted multer (type/size) on public registration upload | MED | **Fixed** — type allowlist + 10MB/5-file limits |
| 16 | No audit trail for PHI access | MED | **Fixed (foundation)** — `AuditLog` model + `audit()` middleware (wired on file access; extend to all PHI routes) |
| 17 | 1h JWT, no refresh token | LOW-MED | **Open** — silent mid-session logout; add refresh tokens |
| 18 | Dependency CVEs (`multer@1`, transitive) | MED | **Partially** — manifest bumped to `multer@2`, `helmet`, `express-rate-limit`; run `npm audit` after install |
| 19 | bcrypt cost factor 10 | INFO | Acceptable; 12 recommended for PHI |
| 20 | **PHI + `frontend/.env` already committed to GitHub history** | CRITICAL | **Open (non-code)** — requires history purge + secret rotation; see remediation plan |

## Notes on the AI/chat surface
The triage engine sanitizes input (`services/ai.js` strips backticks/`$`/braces) and severity is rule-based, not LLM-controlled — no prompt-injection path to an unsafe medical decision. Good as-is.

## Single most dangerous remaining item
**#20 — the data already on GitHub.** Code changes cannot undo git history. Until the repo history is purged and secrets rotated, real patient files remain retrievable by anyone who has (or clones) the repo.
