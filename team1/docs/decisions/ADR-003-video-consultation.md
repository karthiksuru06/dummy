# ADR-003: Video consultation provider

**Status:** Proposed (not yet implemented)
**Date:** 2026-06-03

## Context
"Video Consultation" is the headline feature and **does not exist** — `meeting_link` is a free-text string a doctor pastes by hand; the patient `window.open`s it. No room lifecycle, no presence, no waiting room.

## Decision
**Adopt Daily.co.** Rooms are created server-side when an appointment is approved, the link is stored on the appointment, and join tokens are minted per participant at join time.

## Options evaluated

| | Daily.co | Twilio Video | Jitsi (self-host) |
|---|---|---|---|
| Implementation effort | **Low** (prebuilt iframe + REST room API) | Medium (build UI on SDK) | High (run your own infra) |
| Reliability | High (managed) | High (managed) | Depends on your ops |
| Cost | Usage-based, generous free tier | Usage-based, pricier | Infra cost only, but you own uptime |
| HIPAA | **BAA available** | BAA available | You're fully responsible |
| Healthcare fit | Strong, fast to ship | Strong, more work | Risky for a small team |

## Rationale
For a small team that needs a *reliable, HIPAA-capable* video call shipped fast, Daily's prebuilt component + room API is the best effort/reliability balance. Twilio is comparable on reliability but more build effort. Jitsi self-host shifts uptime and compliance burden onto a team that (per the AIOps audit) has no observability or deploy infra yet — wrong time to own real-time media infrastructure.

## Design
- On `approve`: `POST` Daily room with an expiry tied to the appointment window; store `room_url` on the appointment.
- On join: backend mints a **short-lived meeting token** scoped to that room for the authenticated participant (replaces the plaintext shared link → no link-sharing leak).
- Waiting room + "doctor has joined" presence via Daily events.
- Service type "Video Consultation" stays hidden/disabled until this ships (don't advertise vaporware).

## Scaling limits / tradeoffs
- Vendor lock-in to Daily's API shape — acceptable; wrap it in a `videoService` so the provider is swappable.
- Recording/transcription (for the AI consult-summary feature, ADR-future) is a Daily add-on with extra cost + consent requirements.
