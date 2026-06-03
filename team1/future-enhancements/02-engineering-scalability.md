# MEDviz — Engineering & Scalability Roadmap

Status of the platform as of this writing: the backend (Express + Mongoose) has been hardened with JWT + refresh tokens, RBAC and ownership middleware, helmet, rate limiting, pino structured logging, centralized error handling, real `/healthz` + `/readyz` probes, graceful shutdown, an `app.js` / `server.js` split, 23 passing Jest + Supertest integration tests, and Dockerfiles + docker-compose + GitHub Actions CI.

That work makes a *single* instance production-grade. It does **not** make the platform horizontally scalable. Several pieces of state and scheduling are bound to one process and will break or double-fire the moment a second replica starts. This document is the concrete plan to remove those limits, in priority order.

Effort key: **S** = ≤2 days, **M** = ≤1 week, **L** = ≥2 weeks. Each item lists what, why, effort, and dependencies.

---

## 1. Multi-instance readiness (highest priority)

The platform cannot run more than one replica today. These four items are the blockers. `docker-compose.yml` already provisions a `redis:7-alpine` service that nothing currently uses — it exists for exactly this phase.

### 1.1 Move chatbot session state to Redis
- **What:** `backend/bot.js:41` holds all live triage conversations in a process-local object (`const conversations = {}`), keyed by `userId`, with a `setInterval` sweeper at `bot.js:482`. Replace this with a Redis hash/JSON per conversation, TTL set to `SESSION_TIMEOUT_MS` (30 min) so Redis expiry replaces the manual sweeper entirely. Keep the same `getOrCreateConvo` / `resetConversation` API so `handleMessage` is unchanged.
- **Why:** With two replicas behind a load balancer, a patient's follow-up message can land on a different instance than the one that created the conversation, losing all triage state mid-case. For a medical triage flow that escalates to "Critical," silently dropping context is a safety issue, not just a UX one.
- **Effort:** M
- **Dependencies:** Redis client (ioredis); wire `REDIS_URL` into `server.js` config validation alongside the existing `JWT_SECRET` / `MONGODB_URI` checks.

### 1.2 Shared rate-limit store
- **What:** `backend/middleware/security.js` configures `globalLimiter` and `authLimiter` with the default **in-memory** `express-rate-limit` store. Swap to `rate-limit-redis` backed by the same Redis.
- **Why:** In-memory counters mean the effective limit multiplies by replica count — `authLimiter` (max 10 / 15 min, the brute-force guard on `/api/auth` and `/api/chat`) becomes 10×N, defeating its purpose.
- **Effort:** S
- **Dependencies:** 1.1 (same Redis connection).

### 1.3 Object storage for uploads (S3 + signed URLs)
- **What:** Uploads use `multer.diskStorage` writing to local `uploads/` (`routes/patient.js:18`, `routes/auth.js:34`), and `routes/files.js` streams them back via `res.sendFile` from a local dir. Move to S3-compatible object storage (AWS S3 / MinIO). Use `multer-s3` or presigned `PUT` for upload; replace the `files.js` read path with presigned, short-TTL `GET` URLs. Keep the existing authenticate + ownership checks (per ADR-002, ownership stays in `routes/patient.js` report endpoints) — issue the signed URL only after those pass.
- **Why:** Local disk is per-instance: a file uploaded to replica A is 404 on replica B. It also blocks autoscaling and ephemeral containers (every redeploy loses PHI documents). Signed URLs additionally offload large-file streaming off Node and let a CDN cache them.
- **Effort:** L
- **Dependencies:** Bucket + IAM/credentials; migration script to copy existing `uploads/` into the bucket; update the `/uploads/...` path strings still emitted in `routes/doctor.js:93`.

### 1.4 Replace per-instance `setInterval` cron with BullMQ + single scheduler
- **What:** `server.js:35-36` starts `startAutoCompleteJob()` and `startAppointmentAlertJob()` on **every** process via `setInterval` (`jobs/appointmentAlerts.js:212`, `jobs/appointmentAutoComplete.js:114`). Move both to BullMQ repeatable jobs on Redis. A single BullMQ scheduler enqueues, and any worker processes one job exactly once.
- **Why:** With N replicas, the alert job runs N times concurrently. The alert job's dedup (`Notification.findOne({ ... $regex: '24 hours' })` at `appointmentAlerts.js:82`) is a read-then-write race with no unique constraint, so concurrent runs **will** send duplicate reminder emails and create duplicate notifications. The auto-complete job double-writes `status = 'completed'`. This is the most visible multi-instance bug.
- **Effort:** M
- **Dependencies:** Redis; 1.5 (leader election is the alternative if BullMQ is deferred). Add a unique compound index on `Notification` (appointment_id + tier) as a belt-and-suspenders dedup regardless.

### 1.5 Leader election (fallback / interim)
- **What:** If BullMQ is too large a step for the first pass, gate the existing `setInterval` jobs behind a Redis lock (`SET key NX PX`) renewed on a heartbeat, so only the lock-holder runs cron.
- **Why:** Stops duplicate cron firing in hours instead of a week, without rewriting the job code.
- **Effort:** S
- **Dependencies:** Redis. Treat as a stepping stone; 1.4 supersedes it.

---

## 2. Performance

### 2.1 DB indexing review
- **What:** Indexes already exist on the hot paths (`Appointment` has a `{ status, appointment_date }` index explicitly commented "cron jobs" at `models/Appointment.js:72`; `Notification`, `Prescription`, `Report`, `Task` are covered). Audit the remaining query shapes: the alert job's `Notification.findOne({ appointment_id, type, message: $regex })` is **unindexed on that shape** and does a regex scan — add a proper index or, better, a structured `tier` field. Verify admin aggregations (`routes/admin.js:36-78`) hit indexes via `explain()`.
- **Why:** Regex-on-message dedup inside an O(appointments) loop is the slowest part of the alert job and gets worse linearly.
- **Effort:** S
- **Dependencies:** none.

### 2.2 Caching layer
- **What:** Cache read-heavy, low-churn responses in Redis: the public doctor browse (`GET /api/doctors/available`), admin analytics aggregations (`routes/admin.js`), and doctor settings. Short TTL (30–120s) with explicit invalidation on the corresponding writes.
- **Why:** Admin dashboards re-run 6+ `aggregate()` pipelines per load (`admin.js:36,40,51,66,78,519,524`); these are pure reads over the whole collection and are ideal cache candidates.
- **Effort:** M
- **Dependencies:** Redis (1.1).

### 2.3 Pagination everywhere
- **What:** Some endpoints cap results (`routes/notifications.js:9` uses `limit`), but many `.find()` calls return unbounded sets. Standardize cursor or page/limit pagination across list endpoints (admin patient/doctor lists, prescriptions, appointments).
- **Why:** Unbounded `find()` grows with the database and will eventually blow the `express.json` response and client memory. Pagination is cheap now, expensive to retrofit after clients depend on full arrays.
- **Effort:** M
- **Dependencies:** Coordinated frontend change to consume paged responses.

### 2.4 N+1 and populate audit
- **What:** Audit `.populate()` chains (e.g. `admin.js:121-122,304`, alert job's `.populate('doctor_id', ...)`). Add `.lean()` to read-only queries to skip Mongoose hydration. The alert job loads **all** scheduled appointments every run then filters in JS (`appointmentAutoComplete.js:35`, `appointmentAlerts.js:46`) — push the time-window filter into the query.
- **Why:** Loading the full scheduled set per run is O(all appointments) when only the ~next-24h slice matters.
- **Effort:** M
- **Dependencies:** 2.1.

### 2.5 Connection pooling tuning
- **What:** `server.js:32` sets `maxPoolSize: 20`. Re-tune per replica once horizontal scaling lands (N replicas × poolSize must stay under the Atlas/Mongo connection ceiling). Make it env-driven.
- **Effort:** S
- **Dependencies:** decided after 1.x replica count is known.

### 2.6 CDN
- **What:** Front the static frontend bundle and (post-1.3) signed-URL object reads with a CDN.
- **Why:** Offloads static and PHI-document delivery from origin; pairs naturally with signed URLs.
- **Effort:** S
- **Dependencies:** 1.3 for the upload path.

---

## 3. Codebase modernization

### 3.1 CRA → Vite
- **What:** Frontend is Create-React-App via `@craco/craco` (`frontend/package.json`) on `react-scripts@5` with React 19. `react-scripts` is effectively unmaintained. Migrate to Vite; `craco.config.js` and `tailwind.config.js` port cleanly.
- **Why:** Faster dev server and builds, active maintenance, removes the craco shim layer that only exists to patch CRA's sealed webpack config.
- **Effort:** M
- **Dependencies:** none; do before TypeScript adoption since Vite's TS support is first-class.

### 3.2 Incremental TypeScript
- **What:** No TypeScript anywhere today (neither package.json lists it). Adopt incrementally: `allowJs` + `checkJs`, convert shared models and the API client first.
- **Why:** The backend response shapes (e.g. the bot's documented response object in `bot.js:12-22`) are conventions enforced nowhere; typing them catches drift between front and back.
- **Effort:** L
- **Dependencies:** 3.1, 3.4.

### 3.3 OpenAPI / Swagger contract
- **What:** Document the REST surface (routes registered in `app.js:58-76`) as an OpenAPI spec; serve Swagger UI in non-prod.
- **Why:** Single source of truth for the contract; enables generated, typed API clients (feeds 3.4).
- **Effort:** M
- **Dependencies:** none (can lag actual routes — add contract tests to keep honest).

### 3.4 Typed API client
- **What:** Generate a typed client from the OpenAPI spec and replace ad-hoc `fetch`/axios calls in the frontend.
- **Why:** Compile-time safety on every endpoint call; eliminates a class of path/param/shape bugs.
- **Effort:** M
- **Dependencies:** 3.2, 3.3.

### 3.5 Monorepo tooling
- **What:** `frontend/` and `backend/` are sibling dirs with independent installs. Introduce a workspace tool (npm workspaces / pnpm / Turborepo) to share types (the OpenAPI-generated types) and run unified CI.
- **Why:** Lets the typed contract live in one shared package consumed by both sides.
- **Effort:** M
- **Dependencies:** 3.3, 3.4.

---

## 4. Reliability

### 4.1 Circuit breaker on Ollama LLM calls
- **What:** `services/ai.js:38` (`callOllama`) hits Ollama (`OLLAMA_URL`, defaults to a local instance / the `ollama` compose service). It already has axios-retry + a 120s timeout (`ai.js:22-33`). Add a circuit breaker (e.g. opossum) so that when Ollama is down, calls fail fast and short-circuit to the existing heuristic fallbacks instead of every request blocking up to 120s × retries.
- **Why:** The triage pipeline is deliberately "deterministic first, LLM last" — `validateInput` already has a `heuristicIsMedical` fast path (`ai.js:429`) and `finalizeCase` has a full heuristic fallback message. A breaker makes degradation **fast** under outage rather than tying up Node event-loop time and exhausting the request pool on a slow LLM.
- **Effort:** S
- **Dependencies:** none.

### 4.2 Tighter timeouts and retry budget
- **What:** 120s is very long for a synchronous request path. Lower the per-call timeout, cap total retry time, and surface a clear degraded response. Make these env-driven (already partly are: `CHAT_TIMEOUT_MS`, `CHAT_RETRIES`).
- **Why:** Long synchronous LLM waits behind `/api/chat` (rate-limited but still synchronous) hold connections and degrade throughput.
- **Effort:** S
- **Dependencies:** 4.1.

### 4.3 Idempotency keys on mutating endpoints
- **What:** Accept an `Idempotency-Key` header on appointment booking and prescription creation; dedupe via a Redis key.
- **Why:** Retries and double-clicks currently create duplicate appointments/prescriptions. The system already has the duplicate-write problem in the alert job (section 1.4) — the request layer has the same exposure.
- **Effort:** M
- **Dependencies:** Redis (1.1).

### 4.4 Transactional outbox for notifications
- **What:** Today notifications and their emails are written inline in the same flow that mutates the appointment (e.g. alert job saves a `Notification` then calls `sendAlertEmail`, `appointmentAlerts.js:101-106`). Adopt an outbox: write the notification intent in the same Mongo transaction as the state change, then a worker (BullMQ from 1.4) delivers the email and marks it sent.
- **Why:** Decouples delivery from the request/cron path, gives at-least-once delivery with retry, and removes the read-then-write dedup race by making delivery a queued, idempotent step.
- **Effort:** L
- **Dependencies:** 1.4 (BullMQ workers), Mongo transactions (replica set — Atlas provides this).

---

## 5. Scaling architecture

### 5.1 Horizontal scaling of the API
- **What:** Once sections 1.1–1.4 land, the Express app is stateless and can run N replicas behind a load balancer.
- **Why:** This is the payoff of phase 1 — it is explicitly blocked until session state, rate limiting, uploads, and cron are externalized.
- **Effort:** M
- **Dependencies:** all of section 1.

### 5.2 Kubernetes
- **What:** Move from docker-compose to k8s once multiple replicas are needed: Deployment for the API, a separate Deployment for BullMQ workers, the existing `/readyz` (`app.js:52`) as the readiness probe and `/healthz` as liveness, HPA on CPU/latency. The graceful-shutdown handlers in `server.js:40-46` already cooperate with k8s SIGTERM draining.
- **Why:** The hardening work (probes, graceful shutdown, app/server split) was done with this in mind; k8s gives rolling deploys, self-healing, and autoscaling.
- **Effort:** L
- **Dependencies:** 5.1, plus 1.3 (no local disk state) and 1.4 (workers as their own deployment).

### 5.3 Managed Mongo / Atlas, read replicas, sharding
- **What:** Move to MongoDB Atlas (or a managed replica set). Route admin analytics aggregations (`routes/admin.js`) to a **secondary read preference** so reporting load doesn't compete with transactional writes. Defer sharding until a single collection's working set genuinely exceeds one node — choose shard keys then (likely `patient_id` / `doctor_id`-based).
- **Why:** A replica set is also a prerequisite for Mongo multi-document transactions (needed by 4.4). Read replicas are the cheapest win for the read-heavy admin dashboards. Sharding is real operational cost and should not precede actual data-volume pressure.
- **Effort:** M (Atlas + read routing), L (sharding)
- **Dependencies:** 4.4 depends on the replica set; sharding depends on observed data growth.

### 5.4 When to split services
- **What:** Keep the monolith until specific seams hurt. The first candidate to extract is the **LLM/triage worker** (`bot.js` + `services/ai.js`), because its resource profile (slow, CPU/GPU-bound Ollama calls) is the opposite of the CRUD API's. The notification/outbox worker (4.4) is the second natural service.
- **Why:** Splitting earlier adds network, deploy, and observability overhead for no benefit. Split when a component needs independent scaling (the LLM worker) or independent failure isolation, not before.
- **Effort:** L
- **Dependencies:** 5.1, 5.2, 4.4.

---

## Suggested sequencing

1. **Unblock multi-instance:** 1.5 (interim leader lock) → 1.1 → 1.2 → 1.4 → 1.3. After this, 5.1 (run N replicas) is available.
2. **Reliability quick wins in parallel:** 4.1 + 4.2 (circuit breaker / timeouts) are S-effort and independent.
3. **Performance pass:** 2.1 → 2.4 → 2.2 → 2.3.
4. **Hardening for scale:** 4.3, 4.4 (needs Atlas replica set, 5.3).
5. **Platform:** 5.2 (k8s) once stateless; 5.3 read replicas alongside.
6. **Modernization track (independent of all above):** 3.1 → 3.3 → 3.2/3.4 → 3.5.

The dividing line throughout is the same: anything that pins state or scheduling to a single process (sections 1 and 4.4) must be removed before scaling out; everything else is optimization and quality of life that can proceed in parallel.
