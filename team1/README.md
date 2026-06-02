# MEDviz

MEDviz is a MERN telemedicine platform. It provides patient, doctor, and admin
portals backed by AI triage (deterministic symptom engine with an optional LLM
assist), appointment scheduling, and prescription management.

## What it does

- **Patient portal** — register, browse available doctors, book/cancel
  appointments, run AI triage, view prescriptions and notifications.
- **Doctor portal** — manage availability, review assigned patients, complete
  appointments, issue prescriptions, configure settings.
- **Admin portal** — user and platform administration (admin registration is
  gated behind a shared secret used only for initial seeding).
- **AI triage** — a safe, deterministic symptom-assessment engine, with an
  optional Ollama-backed chatbot for conversational triage.

## Stack

- **Backend** — Node.js, Express 4, Mongoose 7 (MongoDB), JWT auth, Helmet,
  rate limiting, Pino structured logging, Multer uploads, PDFKit, Nodemailer.
- **Frontend** — React (Create React App), served as a static bundle.
- **AI** — Ollama LLM server (optional) behind a deterministic safety layer.
- **Tests** — Jest + Supertest + mongodb-memory-server.

## Repo layout

```
team1/
├── backend/      Express API (app.js = pure app, server.js = boot)
├── frontend/     React SPA
├── docs/         architecture, ADRs, security audit, gap analysis
├── docker-compose.yml
├── README.md
└── DEPLOYMENT.md
```

The backend is split deliberately: `app.js` is an I/O-free Express app (no env
validation, DB connection, or `listen`), so the test suite can import it;
`server.js` is the boot layer that validates config, connects Mongo, starts
jobs, listens, and handles graceful shutdown.

## Local dev quickstart

**Backend**

```bash
cd backend
npm install
cp .env.sample .env        # then fill in real values (see DEPLOYMENT.md)
npm run dev                 # nodemon on http://localhost:5000
```

`server.js` fails fast if `JWT_SECRET` is unset or shorter than 32 characters,
or if `MONGODB_URI` is unset — so set those before starting.

**Frontend**

```bash
cd frontend
npm install
cp .env.sample .env        # REACT_APP_API_BASE defaults to http://localhost:5000
npm start                   # http://localhost:3000
```

## Running tests

```bash
cd backend && npm test
```

The backend suite (Jest + Supertest + mongodb-memory-server) spins up an
in-memory MongoDB, so no external database is required. This is the gate CI runs
on every push and pull request.

## Documentation

- `docs/architecture/` — system architecture and the target scalable design.
- `docs/decisions/` — ADRs (auth, secure files/ownership, video, eventing/jobs,
  frontend styling).
- `docs/security-audit.md` and `docs/security-remediation-plan.md` — security
  posture and remediation steps.
- `docs/FINAL-GAP-ANALYSIS.md` — honest scoring of what is done vs. what remains
  before production.
- `DEPLOYMENT.md` — deployment runbook, environment setup, and the production
  readiness checklist.
