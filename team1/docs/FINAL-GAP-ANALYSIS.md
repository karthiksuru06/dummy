# MEDviz — Final Gap Analysis

Honest scoring against the 10/10 target. I will **not** print a row of 10s. Several categories are capped by work that code alone cannot do (legal, contractual, human-process, and — critically — work that needs a running environment to verify). Where a 10 is not yet earned, the reason is stated.

> Baseline this session: `node_modules` not installed → nothing was runtime-tested. All "implemented" items are syntax-verified only. That single fact caps every code category below 9 until CI runs green.

## Scorecard

| Category | Before | Now | Realistic ceiling this codebase can reach | Why not 10 yet |
|---|---:|---:|---:|---|
| **Security** | 2 | **6** | 9 (code) | RBAC, audit log, secure files, rate-limit, helmet, CSPRNG OTP, no forgeable secret — all done. Remaining: per-record ownership (IDOR), refresh tokens, secret rotation, **purge PHI/.env from git history**, dependency audit, and a third-party pen-test. The last is non-code; true "10" needs an external audit + HIPAA BAAs. |
| **Reliability** | 2 | **4** | 9 | Added: listen-after-DB-connect, pool config, graceful shutdown, process guards, health/readiness endpoints. Remaining: move cron to BullMQ (no duplicate work), retries/circuit-breaker on the LLM, no tests yet, no staging soak. |
| **Scalability** | 1 | **3** | 8 | Still single-instance-bound: in-memory chat state + local-disk uploads + per-replica cron. Needs Redis (sessions/cache) + S3 (files) + BullMQ (jobs). Designed in `docs/architecture`, not built. |
| **Product completeness** | 3 | **3** | 9 | No code shipped here for the product gaps. Video/payments/reminders/signed-Rx/cancel-reschedule remain. ADRs 003/004 specify the path. |
| **UX/UI** | 4 | **6** | 9 | Token foundation, fixed-header offset, override declaw, focus restore, z-index scale done. Remaining: full token migration, admin double-theme, mobile nav, responsive tables, contrast/tap-target sweep. |
| **Accessibility** | 3 | **5** | 9 | Global `:focus-visible`, restored admin focus, AA contrast tokens defined. Remaining: 44px targets, aria labels, keyboard traps in modals, an actual axe/screen-reader audit (needs a running app). |
| **Performance** | 4 | **5** | 9 | Appointment indexes + unique slot index added. Remaining: rewrite N+1/analytics as aggregations, pagination everywhere, caching. P95<200ms is **unmeasurable without a running env + load test** — cannot claim it. |
| **Observability** | 1 | **4** | 9 | Request-id correlation, structured error logs, health/readiness done. Remaining: pino everywhere (replace console.*), Sentry, metrics, log shipping, alerting. |
| **Developer Experience** | 3 | **6** | 9 | Centralized errors + asyncHandler + validation + middleware structure + full `/docs` + ADRs. Remaining: tests, CI, lint config, CRA→Vite, env documentation. |
| **AI healthcare workflow** | 8 | **8** | 9 | Already the strongest asset; preserved (didn't touch the safe deterministic engine). Architecture doc specifies Copilot/summary/Rx-explanation extensions under the same deterministic-safety contract. Not built this pass. |

**Overall: ~3.5 → ~5.0 / 10**, with security (the launch blocker) moving the most.

## Why no category is 10 (the honest part)
1. **Nothing was runtime-tested.** No `node_modules`, no Mongo, no browser. Code is syntax-clean; that's not the same as working. A 9+ requires green CI (Jest/Supertest/Playwright) which needs an environment.
2. **Several 10s are non-code.** Security 10 = external pen-test + HIPAA BAAs with every subprocessor (Daily, email/SMS, S3) + a risk assessment + staff training. Product 10 = legally valid e-prescriptions in your jurisdiction + a payment processor contract. These are organizational, not commits.
3. **Performance 10 (P95<200ms) is a measurement claim.** You cannot honestly assert a latency target without load-testing a deployed instance. The indexes + aggregation plan make it *achievable*, not *proven*.

## The exact path to "as close to 10 as code gets"
1. `cd backend && npm install` → run; `cd frontend && npm install && npm run build`. Fix anything that surfaces. **(unblocks all verification)**
2. Wire `requireOwnership` into every mutating handler (ADR-002) — closes the last IDOR.
3. **Purge `uploads/` + `frontend/.env` from git history**, rotate secrets, fix `.gitignore`. **(active leak)**
4. Add Jest+Supertest (API/auth/RBAC) and Playwright (core journeys) → CI gate at 80% meaningful coverage.
5. Build the product features (ADR-003 video, ADR-004 reminders/outbox, signed-PDF Rx, cancel/reschedule).
6. Stand up infra (Docker, GitHub Actions, Redis, S3, Sentry, pino) per `docs/architecture`.
7. Load-test → confirm/deny P95<200ms. External pen-test + accessibility audit.

Until steps 1–7 are done and *verified*, claiming 10/10 would be exactly the "AI slop" the brief said to avoid.
