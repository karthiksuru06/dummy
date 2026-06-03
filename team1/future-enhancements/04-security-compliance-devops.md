# MEDviz — Security, Compliance & DevOps Roadmap

MEDviz is a telemedicine platform handling Protected Health Information (PHI): patient
records, clinical chat, prescriptions, and uploaded reports. The code-level security
baseline is strong (see `docs/security-audit.md`): server-side RBAC and per-record
ownership (`backend/middleware/auth.js`), JWT auth with a `RefreshToken` model
(`backend/models/RefreshToken.js`), an append-only `AuditLog` (`backend/models/AuditLog.js`,
`backend/middleware/audit.js`), `helmet` + rate limiting (`backend/middleware/security.js`),
CSPRNG OTP, traversal-safe authenticated file serving (`backend/routes/files.js`),
locked admin registration (`backend/routes/auth.js`), centralized errors
(`backend/middleware/errorHandler.js`), 23 passing security integration tests gated in
CI (`.github/workflows/ci.yml`), and a Dockerized stack (`docker-compose.yml`,
`backend/Dockerfile`).

This roadmap covers what remains: organizational, infrastructure, and operational
maturity that code merges alone cannot deliver. Effort is sized S (< 1 day), M (1–5 days),
L (1–3+ weeks). Priority is P0 (do now / blocks launch), P1 (next), P2 (maturity).

---

## 1. Immediate Security Debt

The single most dangerous open item: real PHI and `frontend/.env` are in **git history**
(audit finding #20). No code change undoes this — purge plus rotation is mandatory.

### 1.1 Purge PHI and secrets from git history — P0, M
**What:** Remove `backend/uploads/` and `frontend/.env` from all history with `git filter-repo`.
**Why:** Anyone who has cloned the repo can recover patient files and the leaked frontend
secrets. This is a reportable exposure under HIPAA until remediated.
**Procedure:**
1. Freeze merges; announce a coordinated force-push window to the team.
2. Mirror-clone a fresh copy: `git clone --mirror <remote> medviz-purge && cd medviz-purge`.
3. Purge:
   ```bash
   git filter-repo --path backend/uploads --path frontend/.env --invert-paths
   ```
4. Add `backend/uploads/` and `frontend/.env` to `.gitignore` (verify they are not tracked).
5. Force-push the rewritten history: `git push --force --all && git push --force --tags`.
6. Every collaborator re-clones (old clones still contain the data — treat as compromised).
7. Contact GitHub Support to expire cached views/forks; rotate the repo if a fork exists.

### 1.2 Rotate every leaked credential — P0, S
**What:** Rotate all secrets that ever lived in `frontend/.env` and any value committed in
`backend/.env`-like files (`JWT_SECRET`, `MONGODB_URI` password, `SMTP_PASSWORD`,
`ADMIN_REGISTRATION_SECRET`, any API keys).
**Why:** History purge does not invalidate a leaked secret; only rotation does. A leaked
`JWT_SECRET` lets an attacker forge any user/admin token (see `backend/middleware/auth.js`).
**Note:** Rotating `JWT_SECRET` invalidates all live sessions — schedule and communicate.

### 1.3 Move secrets into a manager/vault — P0, M
**What:** Replace plaintext `backend/.env` and `env_file` in `docker-compose.yml` with a
secrets manager (AWS/GCP Secrets Manager, HashiCorp Vault, or Doppler) injected at runtime.
**Why:** `.env` files leak (this exact incident). A manager gives versioned rotation, access
control, and an audit trail. `backend/server.js` already fails fast on missing/weak
`JWT_SECRET` — keep that guard and source the value from the manager.

### 1.4 Dependency + SAST scanning in CI — P0, M
**What:** Add to `.github/workflows/ci.yml`: `npm audit --omit=dev` (fail on high/critical),
Dependabot or `npm audit` weekly, and a SAST step (CodeQL or Semgrep `javascript`/`nodejs`
rulesets) on every PR.
**Why:** Audit finding #18 flagged `multer@1` CVEs; nothing currently re-checks for new ones.
SAST catches injection/auth regressions that the 23 integration tests do not.

### 1.5 Container image scanning — P1, S
**What:** Add Trivy (or Grype) scanning of the built backend image (`backend/Dockerfile`,
`node:20-alpine`) in CI; fail on high/critical OS/library CVEs. Pin base image by digest.
**Why:** The runtime ships whatever the base image carries; Alpine CVEs accrue silently.
The Dockerfile already runs as non-root `node` user — scanning closes the remaining gap.

---

## 2. HIPAA / Compliance Path

Technical safeguards are largely in place; the administrative and organizational layer
is not. These gate **launch**, not code merge.

### 2.1 Sign BAAs with every PHI subprocessor — P0, M
**What:** Business Associate Agreements with each vendor that touches PHI: the MongoDB host
(`MONGODB_URI`), email provider (`SMTP_*`), any video/telehealth and SMS provider, and the
cloud/object-store host. Use a HIPAA-eligible service tier for each.
**Why:** HIPAA requires a BAA with every subprocessor handling PHI; without one, each vendor
is an unmanaged breach exposure. Note: the local Ollama LLM in `docker-compose.yml` keeps
chat PHI in-house — if it is ever swapped for a hosted LLM, that vendor needs a BAA too.

### 2.2 Security risk assessment — P0, L
**What:** A formal HIPAA Security Rule risk assessment (administrative, physical, technical
safeguards) plus a documented remediation register. Reuse `docs/security-audit.md` as the
technical input.
**Why:** Required by the Security Rule (45 CFR §164.308). It is also the artifact auditors,
enterprise customers, and insurers ask for first.

### 2.3 Access reviews driven by the audit log — P1, M
**What:** Quarterly review of who accessed which PHI, built on the existing `AuditLog`
(`backend/middleware/audit.js` already records actor, role, action, resource, IP, request id).
Extend `audit()` coverage from file access to **all** PHI read/write routes
(`appointments.js`, `prescriptions.js`, `patient.js`, `chat.js`), then build a review query/report.
**Why:** "Minimum necessary" access and periodic review are HIPAA requirements; the log is
the evidence. The plumbing exists — it needs full coverage and a review cadence.

### 2.4 Data retention & breach-response policy — P0, M
**What:** Written retention schedule (how long appointments, prescriptions, chat, uploads are
kept, then purged) and a breach-response runbook (detect → contain → assess → notify within
the HIPAA 60-day window → document).
**Why:** Required by HIPAA. The retention policy also bounds the blast radius of any future leak.

### 2.5 Encryption at rest and in transit — P0, M
**What:** TLS everywhere (terminate HTTPS at the edge/load balancer in front of the backend);
encryption at rest for MongoDB (`mongo-data` volume in `docker-compose.yml`), the object/file
store, and backups. Document key management.
**Why:** Encryption at rest/in transit is the addressable-but-expected HIPAA technical safeguard.
Today the compose stack speaks plaintext HTTP between services and stores data unencrypted.

### 2.6 Audit-log immutability — P1, M
**What:** Enforce append-only at the storage layer: a write-only DB role for `AuditLog`,
periodic export to immutable/WORM storage, and tamper-evidence (e.g. hash-chained entries).
**Why:** An audit log an attacker can edit is not evidence. The model is append-only by
convention today; make it append-only by enforcement.

---

## 3. Observability

There is currently no centralized error tracking, metrics, or alerting — logs go to stdout
(`backend/utils/logger.js`). Operators cannot see incidents until users report them.

### 3.1 Error tracking (Sentry) — P0, S
**What:** Sentry on backend (Express) and frontend (React). Hook into the existing
`errorHandler` (`backend/middleware/errorHandler.js`) and the `unhandledRejection`/
`uncaughtException` guards in `backend/server.js`.
**Why:** Centralized exceptions with stack traces and the `X-Request-Id` already set in
`backend/middleware/security.js` for correlation. **Scrub PHI** before sending to Sentry.

### 3.2 Metrics (Prometheus/Grafana or hosted) — P1, M
**What:** Expose `prom-client` metrics (request rate, latency, error rate, event-loop lag)
next to the existing `/healthz` endpoint; scrape with Prometheus + Grafana, or use a hosted
APM (Datadog/Grafana Cloud).
**Why:** Health checks (`Dockerfile` HEALTHCHECK) say up/down; metrics show degradation and
capacity trends before an outage.

### 3.3 Log aggregation — P1, M
**What:** Ship structured logs (the logger already emits JSON) to a central store (Loki, ELK,
or a hosted equivalent) with PHI redaction at the shipping layer.
**Why:** `docker compose` stdout is not searchable across services or restarts; incident
investigation and access review (2.3) need queryable, retained logs.

### 3.4 Alerting — P1, S
**What:** Alerts on error-rate spikes, elevated 401/403/429 (auth abuse via the rate limiters
in `backend/middleware/security.js`), latency, and health-check failures, routed to
Slack/PagerDuty.
**Why:** Detection is a HIPAA expectation and the trigger for breach response (2.4).

### 3.5 Uptime monitoring — P1, S
**What:** External uptime check (UptimeRobot/Better Stack) against `/healthz`.
**Why:** Independent confirmation the service is reachable from outside the network.

### 3.6 Distributed tracing — P2, M
**What:** OpenTelemetry tracing across frontend → backend → Mongo/Ollama, propagating
`X-Request-Id`.
**Why:** Pinpoints latency in multi-hop flows (e.g. chat → LLM). Lower priority until metrics
and error tracking are in place.

---

## 4. DevOps Maturity

The stack is Dockerized and CI gates tests, but there is no staging, no IaC, and deploys are
implicitly manual (`DEPLOYMENT.md`).

### 4.1 Staging environment — P0, M
**What:** A production-like staging env (own DB, own secrets, seeded non-PHI data) deployed on
every merge to `main`.
**Why:** No safe place to validate migrations, refresh-token rotation, or releases before they
touch real PHI. This is the foundation the rest of section 4 builds on.

### 4.2 Infrastructure as Code (Terraform) — P1, L
**What:** Codify infra (compute, MongoDB, networking, secrets manager, edge/WAF) in Terraform.
Today only `docker-compose.yml` exists — fine for local, not for reproducible cloud infra.
**Why:** Reproducible, reviewable, versioned infra; eliminates undocumented click-ops drift and
makes the risk assessment (2.2) accurate.

### 4.3 Blue/green or canary deploys — P1, M
**What:** Deploy to an idle slot, health-check it, then shift traffic — or canary a percentage
first. Builds on the `Dockerfile` HEALTHCHECK and staging (4.1).
**Why:** Zero-downtime releases; bad builds never serve patients at full traffic.

### 4.4 Automated rollback — P1, M
**What:** Auto-revert to the last-good image when post-deploy health checks or error-rate
alerts (3.4) fail.
**Why:** Cuts time-to-recovery from manual minutes to automatic seconds.

### 4.5 Secrets in CI — P0, S
**What:** Source CI/CD secrets from GitHub Actions encrypted secrets (or OIDC into the cloud
secrets manager from 1.3); never echo or commit them. Wire into `.github/workflows/ci.yml`.
**Why:** Closes the loop with 1.1/1.3 so the rotated secrets never re-enter the repo or logs.

### 4.6 Preview environments — P2, M
**What:** Ephemeral per-PR environments seeded with synthetic data only.
**Why:** Faster review and QA. **Never** seed previews with PHI.

---

## 5. AppSec Hardening

Strong app-layer controls exist; these add depth and close the items audit findings #17,
#13, and the CSP/HSTS gap left open in `backend/middleware/security.js`.

### 5.1 WAF at the edge — P1, M
**What:** A managed WAF (Cloudflare/AWS WAF) in front of the backend: OWASP rules, bot
mitigation, IP reputation, edge rate limiting.
**Why:** Defense in depth ahead of the in-app `express-rate-limit`; blocks layer-7 attacks
before they reach Node.

### 5.2 CSP & HSTS at the edge — P1, S
**What:** Enforce a strict Content-Security-Policy and HSTS on the static frontend host.
`backend/middleware/security.js` deliberately sets `contentSecurityPolicy: false` on the API,
noting CSP belongs on the frontend host — that host must now actually enforce it.
**Why:** CSP is the primary XSS mitigation for a PHI-handling SPA; HSTS forces HTTPS. Currently
neither is enforced anywhere.

### 5.3 Refresh-token reuse detection + rotation — P0, M
**What:** Rotate refresh tokens on every use and detect reuse of an already-rotated token; on
reuse, revoke the entire token family (likely theft). The `RefreshToken` model
(`backend/models/RefreshToken.js`) and Redis (`docker-compose.yml`) are already present —
add rotation + a revocation/reuse check in `backend/routes/auth.js`.
**Why:** Closes audit finding #17 properly. Without reuse detection, a stolen refresh token is
a durable account takeover. The building blocks exist; the logic does not yet.

### 5.4 Multi-factor authentication — P1, M
**What:** TOTP-based MFA for clinical staff (doctor/admin) at minimum; the OTP-over-email
infrastructure (`utils/otpService.js`, `SMTP_*`) is a stepping stone, not a substitute.
**Why:** Staff accounts reach the most PHI; password-only auth is the weakest link for the
highest-privilege roles.

### 5.5 Account lockout — P1, S
**What:** Lock an account after N failed logins (with a `RefreshToken`/Redis-backed counter and
exponential backoff), distinct from the IP-based `authLimiter` in
`backend/middleware/security.js`.
**Why:** Rate limiting throttles per IP; lockout protects a *specific account* from distributed
or low-and-slow credential stuffing.

### 5.6 Security-headers audit — P2, S
**What:** Run the deployed app through a headers scanner (e.g. Mozilla Observatory) and close
gaps in `helmet` config and the edge layer (CSP, HSTS, Referrer-Policy, Permissions-Policy).
**Why:** Cheap, objective verification that 5.1/5.2 are actually live in production.

---

## Sequencing Summary

**P0 — do now / blocks launch:** 1.1–1.4 (history purge, rotation, secrets manager, CI scanning),
2.1, 2.2, 2.4, 2.5 (BAAs, risk assessment, retention/breach, encryption), 3.1 (Sentry),
4.1, 4.5 (staging, CI secrets), 5.3 (refresh-token reuse).

**P1 — next:** 1.5, 2.3, 2.6, 3.2–3.5, 4.2–4.4, 5.1, 5.2, 5.4, 5.5.

**P2 — maturity:** 3.6, 4.6, 5.6.

The P0 set turns a code-secure prototype into a launchable, HIPAA-defensible service. The
gating risk remains the git-history PHI exposure (1.1/1.2) — until that is purged and every
secret rotated, the platform is not safe to operate on real patient data.
