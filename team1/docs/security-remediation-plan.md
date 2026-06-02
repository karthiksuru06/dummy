# MEDviz Security Remediation Plan

Phased plan mapping each audit finding to an action, owner discipline, and verification step. Status reflects this session.

## Phase 0 — Stop the bleeding (DONE this session, code-level)

| Action | Files | Verification (to run) |
|---|---|---|
| Auth middleware (JWT → `req.user`) | `middleware/auth.js` | Unit: valid/expired/missing/malformed token |
| RBAC at router boundary | `server.js` | Integration: each role hits each router, expect 401/403/200 matrix |
| Per-record ownership (IDOR) | `routes/appointments.js`, `routes/prescriptions.js` | Integration: patient A cannot read/mutate patient B's resource (expect 403) |
| Secure file serving | `routes/files.js`, `server.js` | Integration: unauth → 401; `../` name → 400; valid → 200 |
| Helmet + rate limiting | `middleware/security.js`, `server.js` | Manual: headers present; 11th auth attempt in window → 429 |
| Audit logging | `middleware/audit.js`, `models/AuditLog.js` | Integration: file access writes an AuditLog row |
| Centralized errors + validation | `middleware/errorHandler.js`, `middleware/validate.js` | Unit: invalid ObjectId → 400, not 500; 5xx body has no stack |
| Admin-register lockdown | `routes/auth.js` | Integration: no/incorrect bootstrap header → 403 |
| CSPRNG OTP, JWT fallback removal, path-traversal fix, multer hardening, chat identity binding | `utils/otpService.js`, `routes/patients.js`, `routes/patient.js`, `routes/auth.js`, `routes/chat.js` | Unit + integration per item |

**Caveat:** all of the above is syntax-verified only. The first real verification gate is: `cd backend && npm install && npm start` (boots with a valid `JWT_SECRET`≥32 + `MONGODB_URI`), then the test suite below.

## Phase 1 — Verify (REQUIRED before trusting Phase 0)
1. `npm install` (adds helmet, express-rate-limit, multer@2). 
2. `npm audit --omit=dev` → fix high/critical.
3. Add Jest + Supertest. Minimum suite:
   - Auth: token lifecycle, role gate matrix.
   - IDOR: cross-tenant access returns 403 on every guarded route.
   - Files: auth required, traversal blocked.
   - Admin register: locked.
4. Wire into CI (GitHub Actions) as a merge gate.

## Phase 2 — Close remaining code gaps
| Item | Action |
|---|---|
| Refresh tokens (#17) | Short access token + rotating refresh token; revoke list in Redis |
| Extend audit (#16) | Add `audit()` to all PHI read/write routes, not just files |
| Wire validation schemas (#15-ish) | `validateBody` on create/update bodies (appointment, prescription, profile) |
| Secrets management | Move secrets to a vault/secret manager; enforce `JWT_SECRET` rotation |
| File access hardening (ADR-002) | Signed short-lived URLs instead of "any authenticated user" on `/api/files` |
| Security headers on frontend host | CSP, HSTS at the static/edge layer |

## Phase 3 — Non-code (organizational, cannot be done in code)
1. **Purge git history** of `backend/uploads/*` and `frontend/.env`:
   ```bash
   git filter-repo --path backend/uploads --path frontend/.env --invert-paths
   ```
   Then rotate every credential that was in `frontend/.env`, add both to `.gitignore`, and coordinate a force-push with the team.
2. Sign **BAAs** with every PHI subprocessor (DB host, Daily, email/SMS, S3).
3. Third-party **penetration test** + a HIPAA security risk assessment.
4. Data retention & breach-response policy; access reviews using the new audit log.

## Definition of done (security ≥ 9/10 code-side)
- All Phase 0 items pass the Phase 1 test suite in green CI.
- Phase 2 complete.
- Phase 3 is tracked and owned (it gates *launch*, not *code merge*).
