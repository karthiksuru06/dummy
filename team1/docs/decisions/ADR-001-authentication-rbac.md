# ADR-001: Authentication & RBAC at the router boundary

**Status:** Implemented (this pass)
**Date:** 2026-06-03

## Context
The audit found most backend routes had **no authentication** and the admin API was fully open, including a public `POST /api/auth/admin/register`. JWTs were verified inline in some files with a `process.env.JWT_SECRET || 'secret'` fallback (forgeable tokens). Authorization existed only client-side (`localStorage.userRole`), trivially bypassable.

## Decision
Centralize auth in `backend/middleware/auth.js` and enforce RBAC at the **router mount boundary** in `server.js`.

- `authenticate` — extract Bearer token, `jwt.verify` with **no fallback secret**, attach `req.user = { id, role }`. Matches the existing token payload `{ id, role }`.
- `requireRole(...roles)` — role gate.
- `loadAccount` / `requireOwnership(getOwnerId)` — for per-record checks (see ADR-002).
- Wiring: `/api/admin` → `requireRole('admin')`; `/api/doctor-settings` → `requireRole('doctor')`; `/api/appointments|prescriptions|tasks|notifications|patient` → `authenticate`; `/api/chat` → `authenticate` + rate limit. Doctor mutation routes guarded self-or-admin.
- `JWT_SECRET` is now required at boot **and must be ≥32 chars** (fail-fast in `server.js`).
- Admin registration gated behind `ADMIN_REGISTRATION_SECRET` bootstrap header.

## Alternatives considered
- **Per-route middleware everywhere** — more granular but error-prone (easy to forget one). Router-boundary default + per-route exceptions is safer (secure-by-default).
- **Session cookies instead of JWT** — better for revocation, but the app is already JWT-based; revisit with refresh tokens (token expiry is 1h with no refresh today — a known gap).
- **Casbin/oso policy engine** — overkill for 3 roles; revisit if permissions get attribute-based.

## Tradeoffs / limits
- Router-boundary auth stops *anonymous* and *cross-role* access immediately, but does **not** by itself stop a same-role IDOR (patient A passing patient B's id). That requires handler-level ownership — ADR-002.
- 1h JWT with no refresh = silent logouts mid-session. Add refresh tokens before launch.

## Status of implementation
Done + syntax-verified. **Not runtime-tested** (no `node_modules`/Mongo this session). Needs: `npm install`, then integration tests (ADR references Jest+Supertest).
