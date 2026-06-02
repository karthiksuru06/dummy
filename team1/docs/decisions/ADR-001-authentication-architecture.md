# ADR-001: Authentication & Authorization Architecture

**Status:** Implemented (code), pending runtime verification
**Date:** 2026-06-03
**Supersedes:** the earlier `ADR-001-authentication-rbac.md` stub.

## Context
MEDviz handles PHI across three roles (patient/doctor/admin). The pre-audit state: most routes had no authentication; the admin API and admin self-registration were public; JWTs were verified ad-hoc inline with a forgeable `|| 'secret'` fallback; authorization existed only client-side (`localStorage.userRole`). This is a complete authZ failure for a healthcare system.

## Decision

A four-layer model, secure-by-default, enforced server-side.

### Layer 1 — Identity (authentication)
`middleware/auth.js#authenticate`: extract `Authorization: Bearer <jwt>`, `jwt.verify` against `process.env.JWT_SECRET` (**no fallback**), attach `req.user = { id, role }`. Token payload is the existing `{ id, role }` minted in `routes/auth.js`. `JWT_SECRET` is required and must be ≥32 chars — `server.js` refuses to boot otherwise.

### Layer 2 — Role (coarse authorization)
`requireRole(...roles)` applied at the **router mount boundary** in `server.js`:
- `/api/admin` → `requireRole('admin')`
- `/api/doctor-settings` → `requireRole('doctor')`
- `/api/appointments|prescriptions|tasks|notifications|patient|chat` → `authenticate` (any logged-in role)
- `/api/doctors` → public browse stays open; mutations guarded per-route (`doctorSelf`)
- `/api/auth` → public, rate-limited

Secure-by-default: the boundary blocks anonymous + wrong-role access without relying on each handler remembering to check.

### Layer 3 — Ownership (fine authorization / anti-IDOR)
Role alone doesn't stop patient A acting on patient B. Resource-aware guards load the record and compare its real owner to `req.user.id`:
- Appointments: `loadAppointment` + `apptDoctorOrAdmin` (approve/reject/reschedule) or `apptParticipantOrAdmin` (cancel/get).
- Prescriptions: `loadPrescription` + `rxParticipantOrAdmin`; `patientParamSelfOrStaff`; `apptParamParticipantOrAdmin`.
- Doctors: `ensureSelfOrAdmin` on profile/availability/picture.
A generic `requireOwnership(getOwnerId)` also exists for future routes.

### Layer 4 — Auditing
`middleware/audit.js` + `models/AuditLog` record actor/action/resource/status for sensitive operations (append-only). Wired on file access; to be extended to all PHI routes.

## Request lifecycle
```
Request → helmet → requestId → cors → json → globalLimiter
        → [authenticate] → [requireRole] → [load+ownership guard]
        → [validate] → handler → (audit on finish) → errorHandler
```

## Alternatives considered
- **Per-route auth everywhere** — rejected as default (easy to forget one → silent hole). Used only for the mixed-access `/api/doctors`.
- **Session cookies** — better revocation, but the app is JWT-native; revisit with refresh tokens.
- **Policy engine (Casbin/oso)** — overkill for 3 roles; reconsider if rules become attribute-based.
- **Generic `requireOwnership` for everything** — its `allowRoles` bypass is too coarse for appointments (any doctor ≠ the owning doctor), so resource-aware guards are used for those.

## Tradeoffs & limits
- 1h access token, **no refresh** → silent mid-session logout. Add refresh tokens (Phase 2).
- Ownership guards add one extra DB read per guarded request; negligible with the new indexes, and correctness > a single indexed lookup.
- Client-side `ProtectedRoute` remains for UX routing only; it is explicitly **not** a security control now that the server enforces authZ.

## Consequences
- Anonymous and cross-tenant access are closed across the sensitive surface.
- The pattern is uniform and copy-pasteable for new routes.
- **Verification owed:** integration tests proving the 401/403/200 matrix per role and the IDOR-403 behavior. Not run this session (no runtime).
