# MEDviz — Audit Verdict, Ratings & Development Plan

Synthesis of a 6-discipline audit (Principal Eng · Product Architecture · UI/UX · QA · Security · AIOps) of `team1`, plus the UI fixes applied in this pass.

---

## 1. Brutal Ratings (out of 10)

| Dimension | Score | One-line verdict |
|---|---:|---|
| **UI/UX (visual)** | **4 → ~6** | Individual screens are polished; cross-app it was 5 fonts / 5 blues / content hidden behind the navbar. Foundational token + offset fixes done this pass lift it; full migration needed to truly land. |
| **Product completeness** | **3** | Looks like a telemedicine app; the headline feature (video) doesn't exist, several buttons are fake, reminders never get delivered. |
| **Security** | **2** | Most backend routes have no auth. Open admin self-registration + public PHI files = trivial full compromise. Hard blocker. |
| **Backend / system design** | **4** | Clean structure, but N+1 queries, zero indexes, a route-ordering bug that kills profile endpoints, double-booking race. |
| **Code/QA honesty** | **3** | Fake dashboard data, dead buttons, broken settings page, contract mismatches between frontend services and backend routes. |
| **AIOps / prod-readiness** | **1.5** | No Docker/CI/health endpoint, console.log only, in-memory state + local-disk uploads break past one instance. |
| **AI triage engine** | **8** | The genuine standout. Deterministic severity, LLM only for phrasing, safe fallbacks. Keep as-is. |
| **Overall product** | **3.5 / 10** | A beautiful, ambitious prototype with a fake floor in the rooms that matter. Strong bones, missing wiring exactly where stakes are highest. |

**Why the UI was a 4, bluntly:** the token files prove the team knew what to build; the execution was four parallel design systems wearing a trench coat, and real functional breakage (content behind the fixed header, a mobile nav that renders nothing, a global override mangling every gradient) made it feel broken rather than merely inconsistent.

---

## 2. The Top Gaps That Hurt Efficiency / Trust (ranked)

1. **No server-side authorization** on appointments, prescriptions, doctor, admin routes — and open `POST /api/auth/admin/register`. (`routes/admin.js`, `routes/auth.js:290`) — *the single most dangerous issue.*
2. **Public PHI file serving** — `app.use('/uploads', express.static(...))` with guessable epoch filenames. (`server.js:34`)
3. **Dead approve/reject buttons** on DoctorHome — UI lies, backend never told. (`DoctorHome.js:96-109`)
4. **Doctor Settings entirely broken** — calls `getDoctorSettings`/`updateDoctorSettings` which don't exist (real: `getSettings`/`updateSettings`). (`DoctorSettings.js:31,63`)
5. **No real video consultation** — the product's whole premise is a manually-pasted URL.
6. **Reminders never delivered** — alert job writes DB rows only, and its ±30-min poll window silently misses alerts. (`jobs/appointmentAlerts.js:66,93`)
7. **Route-ordering bug** makes `/profile` and `/changePassword` unreachable (matched as `:patientId`). (`routes/patients.js`)
8. **N+1 queries + zero indexes** — `patients.js:79` does 3N+2 queries; `admin.js` analytics does 24 sequential queries + in-memory age bucketing; no Mongoose indexes anywhere.
9. **Fake data shown as real** — hardcoded 4.5 ratings, 124 consultations, invented charts. Erodes trust on discovery.
10. **Not deployable** — no Docker/CI/health endpoint, console-only logging, single-instance-only state.

---

## 3. What I Changed in This Pass (UI foundation)

All low-risk, additive CSS + one class wire-up. No behavior changed.

- **`src/styles/tokens.css` (new)** — one design system: single blue scale + one teal accent, 4px spacing grid, radius/shadow ramps, z-index scale, `--app-header-h`, `--content-max`, and an app-wide accessible `:focus-visible`. Imported first in `index.css`.
- **Fixed-navbar offset unified** across patient pages — `FindDoctorPage` (was `padding-top:0`, content hidden behind header), `Notifications` (96px), `MyAppointments` (30px), `Chatbot` (68px) now all key off `--app-header-h`.
- **Notifications container** capped to `--content-max` (was full-bleed `width:100%`).
- **`doctorColorOverride.css` declawed** — removed the malformed global gradient (`linear-gradient(135deg,#0B264C 0%)`), and scoped the global `a` / `h1-h6` / `*:hover` / `*:focus` / broad `svg` / `div[class*=bg]` rules to `.doctor-portal` so they stop bleeding into patient/admin/landing. Wired `doctor-portal` class onto `DoctorLayout`.
- **Restored keyboard focus** in `AdminLayout.css` (was `outline:none !important` on nav).
- **Z-index sanity** — patient header → `--z-sticky`, dropdown `9999` → `--z-dropdown`, so modals/toasts layer predictably.

> Honest note on tooling: the brief mentioned shadcn / 21st-magic / framer-motion. This is a **Create-React-App + plain-CSS** project — shadcn needs Tailwind + a `cn()` util, so adding it is a build-system migration, not a drop-in. I did **not** fake-install it. The token foundation above is the correct first move; a Tailwind/shadcn migration is a deliberate Workstream E decision, not something to smuggle in.
> Build not run: `frontend/node_modules` isn't installed, so I couldn't execute `npm run build` to verify. Changes are pure CSS variables + scoping (low risk). Run `npm i && npm run build` to confirm.

---

## 4. Divided Development Plan (5 parallel workstreams)

Designed so 4–5 people can work without colliding. **A blocks launch; everything else is parallel after A starts.**

### Workstream A — Security & Auth (BLOCKER, do first)
- Build one `auth` middleware (verify JWT → `req.user`) + a `requireRole(role)` guard. The pattern already exists in `patient.js` — generalize it.
- Apply to **every** mutating/PII route in `appointments`, `prescriptions`, `doctor`, `admin`, `tasks`, `notifications`, `chat`.
- Delete or gate `POST /api/auth/admin/register`; seed admins via script.
- Remove `app.use('/uploads', express.static)`; serve files only through ownership-checked endpoints.
- Fix `JWT_SECRET || 'secret'` fallbacks; add `crypto.randomInt` OTPs; rate-limit auth/OTP/chat (`express-rate-limit`); add `helmet`.
- Fix the path-traversal base (`patients.js:363`) and bind `chat` `userId` to the token.

### Workstream B — Make It True (kill the fakes)
- Wire DoctorHome approve/reject to `approveAppointment`/`rejectAppointment`.
- Fix DoctorSettings method names (`getSettings`/`updateSettings`); persist the missing toggles.
- Remove hardcoded ratings (`doctor.js:81`), dummy dashboard stats (`DoctorHome.js:44-86`), the "Verified" prescription label, the `'2m ago'` timestamps.
- Delete "Coming Soon" stub routes (`App.js:142-151`) and the broken nav targets (`/patient/login`, patient→`/doctor/:id`).
- Persist patient `symptoms` as a first-class appointment field (currently lost into `reason`).

### Workstream C — Core Telemedicine Features
- Real video: integrate Daily/Jitsi/Twilio; auto-create a room on approval.
- Reminder delivery: email at minimum (booking confirm, approval, reminder); fix the alert job's missed-window logic.
- Prescription as a signed PDF with an Rx number + date.
- Patient-side cancel/reschedule endpoint + UI.

### Workstream D — Backend Performance & Correctness
- Add Mongoose indexes: `Appointment {doctor_id,patient_id,status,appointment_date}`, plus FK indexes on `Prescription`/`Task`/`Report`.
- Unique compound index on appointment slot → fixes the double-booking race.
- Fix the route-ordering bug in `patients.js` (literal routes above `:patientId`).
- Rewrite N+1 / full-scan endpoints as aggregations (`patients.js:79`, `admin.js` metrics + analytics); paginate unbounded lists; validate ObjectIds → return 400 not 500.

### Workstream E — UI System & AIOps
- Finish the token migration started this pass: replace remaining hardcoded hex/fonts/spacing across all components with `tokens.css` vars; settle the admin double-theme; add a working mobile nav to the landing header; make data tables responsive.
- Decide on shadcn/Tailwind migration *or* commit to the current plain-CSS + tokens approach (don't do both half-way).
- AIOps: Dockerfile + CI, `/healthz` endpoint, structured logging (pino), `unhandledRejection`/SIGTERM handlers, move chatbot session state + uploads off local memory/disk (Redis + S3), don't `listen()` before Mongo connects.

---

## 5. Design Review (heuristic)

A live `/design-review` needs a running browser + built app; `node_modules` is absent and no browser session is attached, so this is a static-evidence review rather than a rendered one.

- **Hierarchy:** decent within screens, incoherent across them. Fix = the token pass.
- **Consistency:** the core failure. One palette, one font, one spacing scale (now seeded in `tokens.css`).
- **Accessibility:** focus states were deliberately removed (now restored on admin nav + global `:focus-visible`); several low-contrast greys (`#94a3b8`, `#999`) and sub-44px tap targets remain — worth a sweep in Workstream E.
- **Responsiveness:** thin media-query coverage; landing nav vanishes on mobile with no replacement; tables overflow. All Workstream E.
- **Verdict:** the foundation laid this pass is the right move; the remaining work is mechanical migration, not redesign.

To run the real thing later: `cd frontend && npm i && npm start`, then a browser-based design review against the live app.
