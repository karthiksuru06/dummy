# MEDviz Deployment Runbook

This is the operational runbook for deploying MEDviz. It is deliberately honest:
the code is in good shape, but several production gates are organizational and
cannot be closed by deploying alone. See the
[NOT production-ready until](#not-production-ready-until) section and
`docs/FINAL-GAP-ANALYSIS.md`.

## Prerequisites

- **Docker** and the Docker Compose plugin (`docker compose`).
- **MongoDB** — either the bundled `mongo` service or a managed instance
  (e.g. Atlas). A connection string is required.
- **Redis** (optional locally, **required for production scale**) — for chatbot
  session state and BullMQ background jobs. Bundled as the `redis` service.
- **Ollama** (optional) — local or remote LLM host for the AI chatbot. Bundled
  as the `ollama` service; you must pull a model after first start.

## Environment setup

Copy the sample and fill in real values. **Never commit the resulting `.env`.**

```bash
cp backend/.env.sample backend/.env
```

| Variable | Required | Notes |
|---|---|---|
| `PORT` | yes | HTTP port Express listens on (default `5000`). |
| `MONGODB_URI` | **yes** | MongoDB connection string. Boot refuses to start if unset. |
| `JWT_SECRET` | **yes** | Auth signing secret. **MUST be >= 32 chars** of strong random — boot refuses to start otherwise. Generate with `openssl rand -hex 32`. |
| `CORS_ORIGIN` | yes (prod) | Exact browser origin allowed for CORS. Defaults to `http://localhost:3000`; **set this to your real frontend origin in production.** |
| `OLLAMA_URL` | if chat used | Base URL of the LLM server. Point at your model host in production. |
| `OLLAMA_MODEL` | if chat used | Model name (must be pulled first, e.g. `llama3`). |
| `CHAT_TIMEOUT_MS` | no | Per-request LLM timeout (ms). |
| `CHAT_RETRIES` | no | Retry attempts for failed LLM calls. |
| `OTP_EXPIRY` | no | One-time-password validity window (seconds). |
| `SMTP_EMAIL` | yes (mail) | SMTP/Gmail account used to send mail. |
| `SMTP_PASSWORD` | yes (mail) | SMTP app password — keep secret. |
| `ADMIN_REGISTRATION_SECRET` | seeding only | Shared secret required to register an admin. **Set it only to seed the first admin, then remove it** so no further self-service admin registration is possible. |

Frontend config (`frontend/.env`, copy from `frontend/.env.sample`):

| Variable | Notes |
|---|---|
| `REACT_APP_API_BASE` | Backend API base URL. **Baked into the public JS bundle at build time** — never put secrets in any `REACT_APP_*` var. |

## Docker deploy

```bash
docker compose up --build
```

Services in `docker-compose.yml`:

- **mongo** — MongoDB 7, persisted to the `mongo-data` volume, with a ping
  healthcheck. Other services wait on it via `condition: service_healthy`.
- **redis** — Redis 7, healthchecked. Intended for chat session state + BullMQ.
- **backend** — the Express API. Reads `backend/.env`; `MONGODB_URI`,
  `CORS_ORIGIN`, `OLLAMA_URL`, `OLLAMA_MODEL` have compose-level defaults, but
  `JWT_SECRET`, `ADMIN_REGISTRATION_SECRET`, and SMTP creds come only from
  `backend/.env`. Published on `:5000`.
- **frontend** — static React bundle (Nginx) on `:3000`. `REACT_APP_API_BASE`
  is baked at build time via the `args` block.
- **ollama** — optional local LLM on `:11434`. After first start, pull a model:
  `docker compose exec ollama ollama pull llama3`.

### Reaching health endpoints

- **Liveness** — `GET /healthz` → `200 {"status":"ok"}` (process is up).
- **Readiness** — `GET /readyz` → `200 {"status":"ready","db":true}` when Mongo
  is connected, else `503 {"status":"degraded","db":false}`.

```bash
curl http://localhost:5000/healthz
curl http://localhost:5000/readyz
```

## Health checks & graceful shutdown

These are already implemented in `backend/server.js` and `backend/app.js`:

- The server **listens only after a successful Mongo connect**, and refuses to
  start on missing/weak `JWT_SECRET` or missing `MONGODB_URI` (fail-fast).
- On `SIGTERM`/`SIGINT` it **drains in-flight HTTP, closes the Mongo connection,
  then exits**, with a 10s hard-stop fallback. Process guards log unhandled
  rejections and exit on uncaught exceptions.

**Load balancer guidance:** point liveness probes at `/healthz` and route only
instances whose `/readyz` returns `200` into the pool. During rolling deploys,
send `SIGTERM` and allow the drain window (~10s) before force-killing so
in-flight requests complete.

## Production checklist

Tie each item to `docs/FINAL-GAP-ANALYSIS.md`.

- [ ] **Tests green in CI** — `cd backend && npm test` passes; CI gates on it.
- [ ] **Secrets in a vault, not `.env`** — load `JWT_SECRET`, SMTP creds, etc.
      from a secret manager; do not bake secrets into images or the frontend
      bundle.
- [ ] **CRITICAL pre-launch — purge leaked data from git history.**
      `backend/uploads/` contains real patient PHI and `frontend/.env` may
      contain config that was committed. Use
      [`git filter-repo`](https://github.com/newren/git-filter-repo) to remove
      `backend/uploads/` and `frontend/.env` from **all** history, force-push,
      have every collaborator re-clone, and **rotate every secret** that ever
      touched the repo (JWT secret, SMTP password, admin registration secret).
      Fix `.gitignore` so they can never be re-committed. This is an active leak;
      do it before any public exposure.
- [ ] **Move uploads to S3** — replace local-disk uploads with object storage so
      the backend can scale horizontally and PHI is not on instance disks.
- [ ] **Redis for chatbot session state + BullMQ jobs** — move in-memory chat
      state to Redis and per-replica cron to BullMQ so multiple replicas don't
      duplicate work.
- [ ] **Point `OLLAMA_URL` at the real model host** and confirm the model is
      pulled and reachable.
- [ ] **Set `CORS_ORIGIN`** to the exact production frontend origin.
- [ ] **Enable HTTPS/HSTS at the edge** — terminate TLS at the load balancer/CDN
      and set HSTS; the app already trusts one proxy hop (`trust proxy`).

## NOT production-ready until

These are **non-code gates** — deploying does not satisfy them, and claiming
"production-ready" before they are met would be dishonest:

- **Runtime load test for P95** — latency targets (e.g. P95 < 200ms) are
  unmeasurable without load-testing a deployed instance. The indexes and
  aggregation plan make it *achievable*, not *proven*.
- **External penetration test** — an independent security review of the running
  system, not just code/syntax checks.
- **HIPAA BAAs with every subprocessor** — signed Business Associate Agreements
  with each vendor that touches PHI (hosting, email/SMS, S3, video, LLM host).
- **Legally valid e-prescriptions** — prescription issuance must satisfy the
  e-prescribing regulations of your jurisdiction before real clinical use.

Until these are met and verified, treat any deployment as staging/pre-launch.
