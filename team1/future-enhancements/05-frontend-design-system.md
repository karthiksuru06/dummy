# Frontend & Design-System Roadmap

Owner: Frontend / Design Systems
Status: Proposed
Stack today: Create-React-App + craco + React 18, framer-motion, react-icons + lucide-react, Tailwind v3 (preflight OFF), token system, shadcn-style `cn()`.

## Where we are

The design foundation is in place but only half-applied:

- **Tokens exist and are canonical.** `frontend/tailwind.config.js` defines the brand blue scale (`#2C5F9F` / navy `#0B264C`), `teal` accent (`#0FB5A6`), Fraunces display + Plus Jakarta Sans body, shadow ramp, and `tailwindcss-animate`. The same values are mirrored as CSS variables in `frontend/src/styles/tokens.css` (semantic roles, 4px spacing grid, radius scale, z-index scale, app-wide `:focus-visible` ring) and the reusable component layer (`.tw-btn-*`, `.tw-card`, `.tw-eyebrow`, `.tw-mesh`) lives in `frontend/src/styles/tailwind.css`.
- **Preflight is OFF on purpose** so Tailwind utilities coexist with ~49 hand-written per-component CSS files without the global reset breaking unmigrated screens.
- **The landing page is fully rebuilt in Tailwind** and is our quality bar. See `frontend/src/components/landingpage/herohomepage/home.js`: token classes (`text-brand-900`, `text-teal-600`, `font-display`), `cn()`-ready structure, lucide icons with `aria-hidden`, real `alt` text, framer-motion stagger, `shadow-card`/`shadow-lift`.
- **Dashboards are retheme'd but NOT rebuilt.** `frontend/src/components/patient/PatientDashboard/PatientDashboard.js` still imports `./PatientDashboard.css`, which redefines a *local* `:root` with off-palette hex (`--accent-blue: #3b82f6`, `--dashboard-bg: #f8fafc`, `--text-primary: #1e293b`) that bypass the token system entirely. It also ships emoji-as-icons in headings (🩸 ⚖️ 📏 ❤️ 📅 ⏰), inline styles, `console.log` debug spam, and "Loading…" text instead of skeletons. The doctor and admin dashboards follow the same legacy pattern.

The gap between the landing page and the dashboards is the core problem this roadmap closes.

## Guiding principles

1. **The landing page is the quality bar.** Every migrated surface should match its polish: token classes only, no raw hex, lucide icons (never emoji), real `alt`/ARIA, motion that respects `prefers-reduced-motion`.
2. **Tokens are the single source of truth.** No component may define a local `:root` palette. Delete `--accent-blue` style overrides as screens migrate.
3. **Migrate portal-by-portal, leaf-component-first**, so preflight can be flipped on per-surface only when a portal is fully Tailwind.
4. **No new legacy CSS.** New work ships as Tailwind + the component library from day one.

---

## 1. Complete the Tailwind migration of all dashboards

**What.** Rebuild patient, doctor, and admin portals in Tailwind on the token system, deleting the matching per-component `.css` files and their local `:root` overrides. Sequence: leaf components (cards, stat tiles, list rows) -> page shells -> portal-wide layout.

**Why.** Today two visual languages ship in one app. The dashboards use `#3b82f6` blue and `#1e293b` ink that drift from the canonical `#2C5F9F` / `#0B264C`. Unifying onto tokens is what makes the product feel like one product, and it lets us eventually turn preflight back on.

**Sequencing.**

- **1a. Patient portal (M).** Highest user volume, simplest layouts. Rebuild `PatientDashboard.js` first as the reference migration: bento grid -> Tailwind `grid`, `.dashboard-card` -> `.tw-card`/`<Card>`, hardcoded hex -> `brand-*`/`teal-*`/`ink-*`, emoji stat icons -> lucide (`Droplet`, `Scale`, `Ruler`, `HeartPulse`). Delete `PatientDashboard.css` and strip the `console.log` debug block (lines ~21-113) and inline `style={{}}`. Then migrate Calendar, FindDoctors, Chatbot, Profile.
- **1b. Doctor portal (M).** Appointments, patient list, schedule, consultation views. Reuse `<Table>`, `<Badge>`, `<Tabs>` from section 2.
- **1c. Admin portal (L).** Data-dense: user management, verification queues, analytics. Most table/dialog surface area; do last so the component library is mature.
- **1d. Shared shell (S).** Migrate `components/layouts/*` and `components/shared/*` headers/sidebars/nav onto `--app-header-h`, `--content-max`, `.app-page`, `.app-container` (already in tokens.css). Flip preflight ON per portal once its tree is 100% Tailwind.

**Exit criteria.** Zero per-component `:root` palette overrides; `grep -rn "#3b82f6\|#1e293b\|#f8fafc" src/components` returns nothing; emoji removed from all headings.

## 2. Build a real component library + Storybook

**What.** A `src/components/ui/` library of shadcn-style primitives built on the existing `cn()` (`frontend/src/lib/utils.js`) and tokens: **Button, Input, Card, Dialog, Table, Badge, Toast, Tabs, Skeleton**. Promote the ad-hoc `.tw-btn-*`/`.tw-card` classes in `tailwind.css` into typed `<Button variant>` / `<Card>` components. Add **Storybook** with a story per primitive and per state (default/hover/focus/disabled/loading).

**Why.** There is no component library today, so every screen reinvents buttons and cards (`.doctor-view-profile-btn`, `.chat-widget-btn`, `.tw-btn-primary` all solve the same problem). Primitives give the dashboard migration (section 1) something concrete to assemble from, and Storybook becomes the contract surface for design review and the visual-regression baseline (section 4).

**Sequencing.**

- **2a (S).** Scaffold `src/components/ui/`, port `.tw-btn-*` -> `<Button>` (variants: `primary`, `accent`, `ghost`; sizes incl. a 44px-min default), `.tw-card` -> `<Card>`. These two unblock 1a.
- **2b (M).** Stand up Storybook (CRA-compatible build now; swap to Vite builder in section 4). Document Button + Card first.
- **2c (M).** Build the data primitives the dashboards need: `<Table>`, `<Badge>` (status: success/warning/danger from token bg pairs), `<Tabs>`, `<Skeleton>`, `<Input>`.
- **2d (M).** `<Dialog>` (focus-trapped, see section 3) and `<Toast>` — wrap the already-installed `react-toastify` so the API is owned by us. Each ships with a story.

## 3. Accessibility to WCAG AA

**What.** Bring the product to WCAG 2.1 AA: audit, focus management, ARIA, 44px touch targets, contrast, keyboard nav, screen-reader passes, and removal of emoji-as-icons.

**Why.** Accessibility is currently partial. The token layer already does the right things (app-wide `:focus-visible` ring in tokens.css, `aria-hidden` on decorative icons in the landing hero, darkened `--c-ink-muted` for contrast), but the dashboards undo it: emoji glyphs (🩸/❤️) are announced as "drop of blood"/"red heart" by screen readers, clickable `<div>`s (the chat widget card in `PatientDashboard.js`) aren't keyboard reachable, and `style={{ opacity: 0.6 }}` text fails contrast.

**Sequencing.**

- **3a. Audit (S).** Run axe-core + Lighthouse a11y across landing + each portal; log issues. Add `eslint-plugin-jsx-a11y` (lands with section 4).
- **3b. Semantics & emoji removal (M).** Replace every emoji-as-icon with a labeled lucide icon (`<HeartPulse aria-hidden />` + visible text). Convert clickable `<div>`s (chat widget) to `<button>`. Add landmarks (`<main>`, `<nav>`), heading order, and `<th scope>` in tables.
- **3c. Focus & keyboard (M).** Focus trap + restore in `<Dialog>`, skip-to-content link, visible focus everywhere (the token ring already exists — ensure no `outline:none` hacks survive migration), full keyboard nav for menus/tabs.
- **3d. Targets & contrast (S).** Enforce 44x44px min hit area on all interactive primitives (bake into `<Button>` default size). Verify every token pairing hits 4.5:1 (3:1 large); fix low-opacity text.
- **3e. Screen-reader pass (M).** Manual VoiceOver + NVDA walkthrough of the three core flows (book appointment, view records, admin verify). Encode findings as Storybook a11y addon checks so they don't regress.

## 4. Build tooling: Vite, TypeScript, lint, visual regression, budgets

**What.** Migrate **CRA -> Vite**, adopt **TypeScript** incrementally, standardize **ESLint + Prettier**, add **Playwright visual-regression tests**, and enforce a **bundle budget**.

**Why.** CRA/react-scripts is effectively unmaintained; cold start and HMR are slow and `craco` only patches around it. Vite fixes dev speed and gives Storybook/Playwright a faster shared build. TS catches the prop-shape bugs that the untyped dashboards are full of (e.g. `apt.doctor_id?.full_name` guesswork in `PatientDashboard.js`).

**Sequencing.**

- **4a. ESLint + Prettier (S).** Do first — establishes the format before mass-migrating files. Add `jsx-a11y` (feeds section 3) and a `no-console` rule to kill the debug spam.
- **4b. CRA -> Vite (M).** Replace react-scripts/craco with Vite + `@vitejs/plugin-react`; migrate env vars (`REACT_APP_` -> `VITE_`), `public/` handling, and the Tailwind/PostCSS pipeline. Verify token CSS import order (tokens.css first, tailwind.css last) is preserved.
- **4c. TypeScript (M, incremental).** `allowJs: true`, type the `ui/` library first (props are the public contract), then `src/api/` response shapes, then convert per file during the portal migrations.
- **4d. Playwright visual regression (M).** Snapshot every Storybook story + key full pages (landing as the golden reference). Gate PRs on pixel diffs so the dashboard migration can't regress the look.
- **4e. Bundle budget (S).** Set a size-limit in CI. Audit `recharts`, `framer-motion`, both `react-icons` **and** `lucide-react` (standardize on lucide, drop react-icons + FontAwesome) and route-level code-split the three portals.

## 5. UX polish

**What.** Loading skeletons, empty/error states, optimistic updates, a mobile-first responsive pass, and motion guidelines.

**Why.** The dashboards currently render bare `"Loading schedules..."` / `"Curating list..."` text and a thin empty state, with no error UI at all (fetch failures in `PatientDashboard.js` are swallowed into `console.error`). Real states are the difference between "themed" and "finished."

**Sequencing.**

- **5a. Skeletons (S).** Swap loading text for `<Skeleton>` (section 2c) matching each card's shape — appointment rows, stat tiles, doctor cards.
- **5b. Empty & error states (M).** Standard `<EmptyState>` / `<ErrorState>` (illustration + message + action) for every data surface; wire the swallowed `catch` blocks to real error UI + retry.
- **5c. Optimistic updates (M).** For booking/cancel/profile-edit: update UI immediately, roll back + toast on failure.
- **5d. Responsive mobile-first pass (M).** The landing hero is already responsive; audit dashboards at 360/768/1024. The patient bento collapses at 1100px — re-derive breakpoints mobile-first from Tailwind defaults.
- **5e. Motion guidelines (S).** Codify the landing page's easing/stagger (`cubic-bezier(0.22, 1, 0.36, 1)`, the `fade-up`/`float` keyframes in tailwind.config.js) into a documented motion scale, and gate all of it behind `prefers-reduced-motion`.

## 6. Native / mobile

**What.** Ship a mobile experience — **PWA first**, then evaluate a **React Native patient app**.

**Why.** Patients are the highest-volume, most mobile audience. A PWA is reachable from the existing Vite build for near-zero marginal cost; native is a larger bet justified only by push notifications and device integration (camera for document upload, health-kit vitals).

**Sequencing.**

- **6a. PWA (M).** After Vite (4b): add `vite-plugin-pwa`, manifest, offline shell for read-only record viewing, installable patient portal. Depends on the responsive pass (5d).
- **6b. React Native evaluation (L).** Spike a patient-only RN app sharing the token values (export tokens.css palette as a JSON theme consumable by both web and RN) and the `src/api/` layer. Decide build-vs-PWA based on push-notification and native-integration demand. Largest effort; sequence last.

---

## Suggested order of execution

1. Tooling foundation: **4a** (lint/prettier) -> **2a** (Button/Card) -> **2b** (Storybook).
2. Reference migration: **1a patient** + **3b/3d** (emoji removal, targets) + **5a** (skeletons), with the landing page as the bar.
3. Library depth: **2c/2d** (Table/Badge/Tabs/Dialog/Toast) to unblock **1b doctor**.
4. Platform: **4b Vite** -> **4c TS** -> **4d Playwright VR** -> **4e budget**.
5. Finish portals: **1c admin**, then **3** a11y completion and **5** UX polish across all three.
6. Reach: **6a PWA**, then evaluate **6b React Native**.

## Effort summary

| Item | Effort |
|------|--------|
| 1a Patient migration | M |
| 1b Doctor migration | M |
| 1c Admin migration | L |
| 1d Shared shell + preflight flip | S |
| 2 Component library + Storybook | M (S+M+M+M) |
| 3 Accessibility to AA | M (across 3a–3e) |
| 4 Vite / TS / lint / VR / budget | M (S+M+M+M+S) |
| 5 UX polish | M (across 5a–5e) |
| 6a PWA | M |
| 6b React Native | L |
