# ADR-004: Eventing, scheduled jobs & notification delivery

**Status:** Proposed (not yet implemented)
**Date:** 2026-06-03

## Context
- Two cron jobs (`appointmentAutoComplete`, `appointmentAlerts`) run via `setInterval` on **every** server instance → duplicate work and duplicate patient reminders under >1 replica. Both run a full-collection scan loaded into memory.
- Reminder dedupe is a non-atomic `findOne`-then-`save` race.
- Reminders/notifications are **in-app DB rows only** — nothing is ever delivered to email/SMS/push, so the patient who isn't logged in never hears about their appointment.
- The appointment `approve` handler does several independent `save()`s with no atomicity (partial-write risk).

## Decision
1. **BullMQ + Redis** for scheduled and async work. On appointment approval, enqueue a **delayed reminder job** scheduled for (appointment_time − 1h) instead of polling. Auto-complete becomes a single scheduled sweep on one worker.
2. **Transactional outbox** for notifications: write the domain change and an `outbox` row in one Mongo transaction; a worker drains the outbox and delivers via providers. Guarantees "notification sent iff the action committed."
3. **Delivery providers:** email (Resend or SES) now; SMS (Twilio) and web push as fast-follows. In-app rows remain as the read model.

## Alternatives
- **agenda** (Mongo-backed scheduler): no extra infra, but weaker than BullMQ for retries/concurrency/observability. Redis is wanted anyway for caching + rate-limit store + session state (chatbot), so BullMQ reuses it.
- **External cron (k8s CronJob / cloud scheduler)** hitting an internal endpoint: fine for the sweep, but doesn't solve per-appointment delayed reminders or the outbox.
- Keep `setInterval` + a leader-election lock: cheapest, but fragile; doesn't fix delivery.

## Tradeoffs / limits
- Adds Redis as a dependency (justified — it's needed for cache, rate-limit store, and moving the chatbot's in-memory session state off-process).
- BullMQ scales to high throughput but is single-Redis bound; fine well past this app's scale.

## Fixes this unblocks
- No duplicate reminders across replicas; reminders that actually reach patients; atomic approve; the alert job's silent ±30-min window-miss bug disappears (jobs are scheduled, not polled).
