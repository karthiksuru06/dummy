# MEDviz — Chatbot Internals & Project-Wide Logic Review

## Part 1 — How the triage chatbot actually works

Files: `backend/bot.js` (state machine) + `backend/services/ai.js` (scoring + LLM) + `backend/routes/chat.js` (HTTP) + `frontend/src/components/patient/Chatbot/Chatbot.js` (UI).

**The core design principle (and it's a good one): the LLM never decides how sick you are.** Severity is decided by a deterministic rule/scoring engine. The local LLM (Ollama `llama3.2:3b`) is used only to (a) phrase follow-up questions, (b) word the final explanation, and (c) a weak input-validity check — each with a non-LLM fallback. If Ollama is down or slow, triage still produces a safe, rule-based answer.

### The pipeline per message
```
HTTP POST /api/chat {message}  (userId now bound to JWT, not the body)
  → bot.handleMessage(userId, message)
     1. getOrCreateConvo: in-memory session keyed by userId (30-min TTL)
     2. If state == FINAL → return the locked result, do nothing else
     3. preValidateInput: reject too-short / greetings / pure-emotional text
        (emotional phrases like "I'm scared" get an empathetic reprompt)
     4. push user message to history
     5. extractSymptomDetails: regex out severity / duration / frequency
     6. detectContradictions: e.g. "mild" + "unbearable" → ask to clarify
     7. runScoringEngine:
          buildCaseData(history, extractedDetails, symptomHistory)
          countEmergencyMatches(all user text)
          calculateWeightedScore(caseData, emergencyCount)
     8. EMERGENCY SHORT-CIRCUIT: if ≥2 emergency keywords, or 1 + a
        "critical" severity word → lock to Critical FINAL immediately,
        return "call 112 / go to hospital". No LLM involved.
     9. State machine:
          WAITING_FOR_PROBLEM → validateInput() → CLARIFYING
          CLARIFYING → ask up to 3 follow-ups (askFollowUp, LLM-phrased,
                        auto-skipping answers already extracted)
                     → when enough info or 3 Qs asked → doFinalize()
    10. doFinalize: finalizeCase() (LLM wording over the rule-decided
        severity) with a hard-coded fallback message per severity tier.
```

### The scoring engine (`services/ai.js`)
A weighted sum over the case: symptom weight + severity word (Neutral/Moderate/Critical) + long-duration bonus + emergency-keyword bonus + critical-symptom-combo bonus + multi-symptom bonus. Thresholds map the score to a category (Neutral / Moderate / Critical). Emergency keyword sets and critical combinations (e.g. "chest pain" + "shortness of breath") are hard-coded rules that bypass the LLM. `certainty = score / 12` (capped at 1).

### State & persistence
- Sessions live in a module-level `conversations = {}` object (in-memory) with a 30-min TTL and a periodic sweep.
- `ChatHistory` (Mongo) persists only the **message transcript** + severity + status — **not** the `extractedDetails`/`state`/`finalResult`. So a server restart mid-conversation loses the triage state (see logic issue L-08).

### Why this architecture is the product's best asset
Deterministic safety + LLM-for-language + emergency short-circuit + everywhere-fallback is exactly how you'd want a medical triage bot built: the model can improve the wording but can never talk the system into calling a heart attack "mild." Keep this contract when extending it (Doctor Copilot, consult summary, Rx explanation).

---

## Part 2 — Project-wide logic-error register

Status: **[FIXED]** this session, **[OPEN]** remaining. Severity in brackets.

### Backend — FIXED this session
- **[HIGH][FIXED] Dead notifications.** `prescriptions.js` and `appointmentAlerts.js` created `Notification`s without the schema-required `receiver_id`/`receiver_type` → every prescription + reminder notification threw ValidationError. Prescription create even 500'd *after* saving the prescription. Fixed: added receiver fields, made prescription-notify best-effort, collapsed the redundant prescription/alert pair.
- **[HIGH][FIXED] Alert window miss.** 15-min reminder window was 10–20 min (10 min wide) against a 30-min run interval → almost never fired. Widened to the final 30 min.
- **[HIGH][FIXED] approve wipes meeting link.** `appointment.meeting_link = meeting_link` set it to `undefined` whenever approve was called without a link. Now only assigns when provided.
- **[MED][FIXED] /book trusts client status.** A caller could pass `status:'completed'` to dodge the conflict check + unique index and double-book. Forced to `'pending'`.
- **[MED][FIXED] /upcoming hides today.** Filtered `appointment_date >= now` against midnight-stored dates, hiding today's later appointments. Anchored to start-of-day.
- **[MED][FIXED] auto-complete ignores rescheduled.** Job + 2 route copies queried only `status:'scheduled'`; rescheduled appointments never completed. Now `{$in:['scheduled','rescheduled']}`.
- (From earlier passes) route-ordering bug, double-booking race (unique index), identity-binding on create, OTP CSPRNG — all FIXED.

### Backend — OPEN (recommended next)
- **[HIGH][OPEN] `validateInput` prompt is truncated** (`ai.js`): the LLM validator prompt's ruleset is literally `"..."`, so the model gets no criteria; the `.includes("true")` check is near-random. Restore a real prompt or drop the LLM branch and trust the heuristic.
- **[HIGH][OPEN] Rejected input poisons triage** (`bot.js`): on invalid input, `history.pop()` removes the message but the already-applied `extractedDetails`/`symptomHistory` mutations are not rolled back, polluting later scoring. Validate before mutating, or snapshot/restore.
- **[MED][OPEN] In-memory session state** (`bot.js`): breaks across restarts/multiple instances; `ChatHistory` doesn't persist triage state. Move to Redis/Mongo (ADR-004 infra).
- **[MED][OPEN] Prescription force-completes appointment** (`prescriptions.js`): writing a prescription sets the appointment to `completed` regardless of prior status (even pending/cancelled).
- **[LOW][OPEN] tasks priority sort**: DB `.sort({priority:1})` sorts the string values alphabetically (wrong); a JS re-sort fixes the final order, so the DB sort is dead/misleading.

### Frontend — OPEN (need a frontend build to verify; flagged, not yet fixed)
- **[HIGH][OPEN] Prescription medicine field-name desync.** `DoctorAppointments.js` submits `medicine_name`/`notes`; the patient view (`MyAppointments.js`) reads `medicine.name`/`medicine.instructions`. Patient sees blank medicine fields. (The PDF correctly uses `medicine_name`.) Align the field names.
- **[MED][OPEN] `hasPrescription` hardcoded false** (`DoctorAppointments.js`): completed appointments always show "Give Prescription," enabling duplicate prescriptions.
- **[MED][OPEN] View Report always empty** (`MyAppointments.js`): reads `appointment.prescription`, which the appointments API never returns. Fetch via `/prescriptions/appointment/:id` on open.
- **[MED][OPEN] Reschedule prompt has no validation** (`DoctorAppointments.js`): free-text date/time; a malformed value breaks the parse-dependent jobs forever.

> Note: the previously-suspected "all chatbot actions route to find-doctors" bug is NOT present — `Chatbot.js` correctly routes emergencies to `tel:112` and only doctor-facing actions to `/finddoctors`.
