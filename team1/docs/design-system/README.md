# MEDviz Design System

Status: **v0.1 — foundation shipped** (`frontend/src/styles/tokens.css`), migration in progress.
Target: WCAG 2.1 AA minimum, mobile-first, keyboard-accessible, one coherent system across patient / doctor / admin / landing.

## Why this exists

The pre-audit UI ran **5 font stacks and 5 competing blues**, per-page guessed spacing, and a global override file (`doctorColorOverride.css`) that repainted the whole app with `!important`. Individual screens looked fine; the product felt broken because nothing agreed. A design system is the single source of truth that makes styles cascade instead of fight.

## Tokens (source: `frontend/src/styles/tokens.css`)

### Color
One blue scale (brand) + one teal accent (vitality) + semantic status colors. No more ad-hoc hex.

| Role | Token | Value |
|---|---|---|
| Primary action | `--color-primary` (`--c-blue-600`) | `#2C5F9F` |
| Primary hover | `--color-primary-hover` (`--c-blue-700`) | `#1E4270` |
| Deep surface / headers | `--c-navy-900` | `#0B264C` |
| Primary tint (bg) | `--color-primary-tint` (`--c-blue-100`) | `#E0E9F8` |
| Accent | `--color-accent` (`--c-teal-500`) | `#14B8A6` |
| Text primary | `--c-ink` | `#0f172a` |
| Text secondary | `--c-ink-soft` | `#475569` (≥4.5:1 on white) |
| Border | `--c-line` | `#e2e8f0` |
| Success / Warning / Danger | `--c-success` / `--c-warning` / `--c-danger` | `#1f9d62` / `#d97706` / `#dc2626` |

**Contrast rule:** body text must hit 4.5:1, large text 3:1. The old `#94a3b8`/`#999`/`#666` greys fail — replace with `--c-ink-soft`/`--c-ink-muted`.

### Typography
One family: **Plus Jakarta Sans** (`--font-body`, `--font-display`). Drop `Inter`, `Segoe UI`, `Outfit` one-offs.
Scale (recommend): 12 / 14 / 16 (base) / 20 / 24 / 32 / 40, weights 400/500/600/700.

### Spacing — strict 4px grid
`--space-1..8` = 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px. No more `0.15rem` / `27px` magic numbers.

### Radius / Elevation
`--radius-sm..xl` (8/12/16/24) + `--radius-pill`. Shadows: `--shadow-sm/md/lg` (one ramp, navy-tinted).

### Layout primitives
- `--app-header-h` (64px desktop / 58px mobile) — every page offsets the fixed header with this, not a guess.
- `--content-max` (1200px) — shared content width.
- Helper classes `.app-page` / `.app-container` for new pages.

### Z-index scale
`--z-sticky 100` < `--z-dropdown 200` < `--z-overlay 1000` < `--z-modal 1100` < `--z-toast 1200`. Ends the 999/1000/2000/9999 chaos; modals now always sit above the header and below toasts.

## Accessibility standards (AA)
- Global `:focus-visible` ring in tokens.css; never `outline:none` without a visible replacement (the admin nav regression is fixed).
- Interactive targets ≥ 44×44px (doctor approve/reject 32px buttons are below — fix in migration).
- All form inputs need associated `<label>`; all icon-only buttons need `aria-label`; decorative emoji need `aria-hidden`.
- Keyboard: full tab order, Esc closes modals/dropdowns, focus trap in modals.
- Respect `prefers-reduced-motion` for any added animation.

## Component library (target)
Buttons (primary/secondary/ghost/danger), Input/Select/Textarea, Card, Badge/StatusPill, Modal, Toast, Table (responsive → stacked cards < 768px), Avatar, Tabs, EmptyState, Skeleton/Loader. Each: tokenized, AA-compliant, documented states (default/hover/focus/active/disabled/loading).

## Migration status
- ✅ Token foundation, fixed-header offset, override declaw, focus restore, z-index scale.
- ⬜ Replace remaining hardcoded hex/fonts/spacing across all components with tokens.
- ⬜ Resolve admin double-theme (`AdminTheme.css` vs `AdminLayout.css`).
- ⬜ Mobile nav for landing header (currently `display:none` with no menu).
- ⬜ Responsive tables; contrast sweep; 44px tap targets.

> Tailwind/shadcn decision: see `docs/decisions/ADR-005-frontend-styling-strategy.md`.
