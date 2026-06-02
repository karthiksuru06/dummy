# ADR-005: Frontend styling strategy — Tailwind/shadcn vs tokenized plain CSS

**Status:** Accepted (staged adoption)
**Date:** 2026-06-03
**Context:** `/advisor` request — evaluate adopting Tailwind + shadcn/ui in the MEDviz frontend.

## Context

The frontend is **Create-React-App (CRA) + craco + React 19**, styled with hand-written per-component CSS. There is no Tailwind, no `cn()` util, no Radix. A token foundation (`src/styles/tokens.css`) now exists. shadcn/ui is **not a component dependency** — it's a generator that copies Radix-based components into your repo, and those components are written in **Tailwind classes**. So "add shadcn" implicitly means "adopt Tailwind."

## Decision

**Do not do a big-bang migration. Adopt in three gated stages, and only proceed past the pilot if it clears explicit exit criteria.**

1. **Stage 0 (done): tokenize.** Keep plain CSS, drive everything from `tokens.css`. This captures ~70% of the consistency win at near-zero risk and is reversible.
2. **Stage 1 (pilot): Tailwind + shadcn on ONE new, isolated surface** — recommend the **patient Settings page** or a brand-new **Doctor Copilot panel**. New code, low blast radius, real evaluation.
3. **Stage 2 (decision gate): adopt or revert** based on the pilot's measured outcomes.

The bigger latent decision is **CRA itself** — it's effectively unmaintained, and the `craco.config.js` polyfill stack is a symptom. Tailwind v4 + shadcn are markedly smoother on **Vite**. Sequencing matters: a CRA→Vite move should be evaluated alongside, because doing Tailwind twice (once on CRA, once after a Vite move) is wasted effort.

## Risks & mitigations (the step-by-step plan)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Tailwind on CRA is friction-heavy** (PostCSS via craco, Tailwind v4's Vite-first tooling) | High | Med | Pin **Tailwind v3.4** for CRA (v4 assumes Vite). Wire via `craco.config.js` PostCSS. Or decide CRA→Vite first (see risk 7). |
| 2 | **Two styling systems coexist** during migration (plain CSS + Tailwind) → confusion, double-loading | High | Med | Map `tokens.css` variables into `tailwind.config.js` `theme.extend` so both reference the SAME tokens. One source of truth, two syntaxes. |
| 3 | **shadcn components clash with existing global CSS** (the `!important` legacy, `doctorColorOverride.css`) | High | High | Pilot on an **isolated route** that doesn't import the legacy theme files. The override declaw (already done) reduces this. Namespace if needed. |
| 4 | **Bundle size balloons** (Radix + Tailwind + existing CSS all shipped) | Med | Med | Tailwind purges unused classes; measure bundle before/after. Delete the per-component CSS for any component you fully migrate — don't leave both. |
| 5 | **Team unfamiliarity** → inconsistent Tailwind usage, utility soup | Med | Med | Pilot first; write a 1-page Tailwind convention guide; enforce with `eslint-plugin-tailwindcss` + Prettier plugin for class sorting. |
| 6 | **Accessibility regressions** swapping hand-rolled components for shadcn | Low | High | shadcn/Radix is *more* accessible than the current hand-rolled controls — net win — but re-test keyboard/focus on migrated components. |
| 7 | **CRA is the real bottleneck** and Tailwind-on-CRA work is throwaway | Med | High | Spike a **Vite migration** in parallel (1-2 days). If it's clean, do Vite → then Tailwind v4 + shadcn on Vite. Avoids doing Tailwind setup twice. |
| 8 | **Scope creep** — "migrate everything" stalls feature work | High | High | Hard rule: **new surfaces use shadcn; existing screens migrate only when already being touched.** No dedicated "migrate the whole app" sprint. |

## Suggested pilot path (concrete)

1. **Spike Vite (1-2 days, separate branch).** If the app boots clean on Vite, that becomes the foundation and you skip Tailwind-on-CRA entirely. If it's messy, stay on CRA + Tailwind v3.4 for the pilot.
2. **Install on the chosen base:** `tailwindcss` (v3.4 for CRA / v4 for Vite), `postcss`, `autoprefixer`; init `tailwind.config.js`.
3. **Bridge tokens:** populate `theme.extend.colors/spacing/borderRadius/boxShadow/fontFamily` from `tokens.css` values so Tailwind classes resolve to the same design tokens. (Long-term, generate one from the other.)
4. **`npx shadcn@latest init`**, then add 3-4 primitives: `button`, `input`, `card`, `dialog`.
5. **Build ONE surface** with them (patient Settings or Doctor Copilot). Do not touch other screens.
6. **Measure exit criteria** (below).

## Exit criteria (the gate — adopt only if ALL pass)
- Bundle size delta acceptable (< ~40KB gzip net after purge).
- The pilot surface is visibly more consistent and faster to build than the plain-CSS equivalent.
- No accessibility regression (keyboard + screen reader pass).
- No `!important` battles with legacy CSS on the isolated route.
- The team finds the Tailwind workflow net-positive after one real screen.

If it clears the gate: adopt the "new code uses shadcn, old code migrates opportunistically" rule. If not: revert the pilot, keep the tokenized plain-CSS system (which is already a large improvement). Either outcome is a win — the foundation work is not wasted.

## Consequences
- Worst case (revert): a few days spent on a spike, foundation intact.
- Best case: a maintained, accessible component library + a clear path off CRA.
- The decision is deliberately reversible at the gate, which is the whole point of staging it.
