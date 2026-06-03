# MEDviz — Future Enhancements

Modern, necessary improvements for MEDviz, organized by domain. Each document is grounded in the actual codebase with what / why / effort (S/M/L) / sequencing. Read alongside `../docs/PROJECT-RATING.md` (current scores) and `../docs/FINAL-GAP-ANALYSIS.md`.

| # | Domain | Covers |
|---|---|---|
| [01](01-product-roadmap.md) | **Product roadmap** | Video consults, payments (Stripe), valid e-prescriptions, doctor verification, delivered reminders, insurance/labs/pharmacy, wearables, care plans |
| [02](02-engineering-scalability.md) | **Engineering & scalability** | Redis sessions, S3 uploads, BullMQ jobs, caching, CRA→Vite, TypeScript, reliability (circuit breakers, outbox), scaling architecture |
| [03](03-ai-ml-roadmap.md) | **AI / ML** | Doctor Copilot, consult summaries/SOAP, Rx explanations, follow-up assistant, RAG over guidelines + records, eval harness — all under the deterministic-safety contract |
| [04](04-security-compliance-devops.md) | **Security, compliance & DevOps** | PHI git-history purge, secrets manager, SAST/scanning, HIPAA/BAAs, Sentry + metrics, staging + IaC, WAF/MFA |
| [05](05-frontend-design-system.md) | **Frontend & design system** | Finish the Tailwind dashboard migration, shadcn component library + Storybook, WCAG AA, Vite/TS/Playwright, PWA/React Native |

## The three things that gate a real launch

1. **Security debt (P0):** purge `backend/uploads/` (real PHI) + `frontend/.env` from git history and rotate secrets. Code can't undo history — see `04`.
2. **The product's headline feature:** real video consultation. Today it's a manually pasted link — see `01`.
3. **Scale beyond one instance:** session state, uploads, and cron all break on the second replica — see `02`.

Everything else is additive. These three are the difference between "deployable demo" and "serving real patients."
