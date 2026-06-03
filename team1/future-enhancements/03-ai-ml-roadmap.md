# MEDviz AI/ML Enhancement Roadmap

## Purpose

MEDviz's strongest asset is its AI symptom-triage engine (`backend/bot.js`,
`backend/services/ai.js`). This document plans how to extend the platform's AI
capabilities without weakening the property that makes the current engine
trustworthy.

## The Safety Contract (non-negotiable)

Every item below must preserve four invariants already enforced in the codebase:

1. **Rules decide, LLM phrases.** Severity is set by `calculateWeightedScore`
   (`ai.js:298`), never by the model. The LLM in `finalizeCase` is explicitly
   told "DO NOT change the classification" and only writes prose.
2. **Emergencies short-circuit before any model call.** `countEmergencyMatches`
   (`ai.js:412`) and the emergency block in `bot.js:305` finalize to Critical
   with no LLM in the path.
3. **Always fall back.** Every `callOllama` site has a deterministic heuristic
   fallback (`validateInput:447`, `askFollowUp:500`, `finalizeCase:608`,
   `doFinalize:425`). An Ollama outage degrades quality, never safety.
4. **Never autonomous medical decisions.** No AI output reaches a patient as a
   diagnosis or prescription without a human (doctor) in the loop or a
   deterministic gate.

For each enhancement below: **What**, **Why**, **Effort** (S/M/L), and
**How it preserves the contract**.

---

## 1. Doctor Copilot

**What.** A doctor-facing assistant that, during/after a consultation,
generates: (a) a consultation summary from the triage `ChatHistory` plus
appointment notes, (b) suggested clarifying questions the doctor may want to
ask, and (c) a *draft* prescription pre-filled into the existing
`Prescription` schema (`medicine_name`, `dosage`, `duration`, `diagnosis`).

**Why.** The triage transcript and structured `caseData` already exist; doctors
re-type much of it. Drafting saves time and reduces transcription error. This is
the highest-leverage reuse of data MEDviz already captures.

**Effort.** L (new route, doctor UI, drafting service, approval workflow).

**Contract.** Every Copilot output is a *draft in a pending state*. The draft
prescription is never persisted to `Prescription` or shown to the patient until
the doctor explicitly approves (mirrors the existing `appointment.approve`
pattern in `AuditLog`). The LLM phrases; the doctor decides. Drug fields are
validated against the interaction DB from item 3 before the approve button
enables. Add a `status: 'draft' | 'approved'` field and require
`approved_by: doctor_id`.

---

## 2. Consultation Summary + Structured SOAP Notes

**What.** Convert each completed consultation into a structured SOAP note
(Subjective, Objective, Assessment, Plan). Subjective/Objective are populated
deterministically from `buildCaseData` output (symptoms, duration, frequency,
severityWord) and triage scoring; Assessment/Plan are doctor-authored with an
LLM draft.

**Why.** SOAP is the clinical lingua franca; structured notes make records
searchable and feed items 1 and 5. MEDviz already has the structured `caseData`
object — most of S and O is free.

**Effort.** M (new `ConsultationNote` model, deterministic mapper, LLM drafter).

**Contract.** S and O come from the deterministic `caseData`/scoring objects,
not the LLM, so the factual record is rules-derived. The LLM only drafts the
narrative wording of A and P, which the doctor edits and signs. Store the
`scoring.score`, `severity`, and `reasons` verbatim alongside the note so the
triage rationale is auditable.

---

## 3. Prescription Explanation for Patients

**What.** After a doctor approves a prescription, generate a plain-language
explanation per medicine ("what it's for, how to take it, common side
effects"), plus interaction/contraindication warnings computed from a local
drug database (e.g. an offline RxNorm/DrugBank-derived table).

**Why.** Patients understand prescriptions poorly; clear explanations improve
adherence. Interaction checks add a real safety net for poly-pharmacy.

**Effort.** M (drug DB ingestion + lookup service; S for the LLM phrasing
layer).

**Contract.** **Interaction warnings are computed by the deterministic drug-DB
lookup, never by the LLM** — the LLM only translates the lookup result into
plain language. This mirrors "rules decide, LLM phrases." If the LLM is
unavailable, show the structured warning verbatim from the DB (the fallback).
The explanation never alters dosage and always carries the disclaimer from item
8. Only triggered on `status: 'approved'` prescriptions (human-in-the-loop
already satisfied).

---

## 4. Follow-up & Recovery-Tracking Assistant

**What.** A scheduled, opt-in check-in flow (e.g. day 2 / day 5 after a
Moderate triage or a consultation) that re-runs the existing triage pipeline on
the patient's update and flags deterioration. Reuses the `jobs/` scheduler and
`Notification` model.

**Why.** Triage is a single snapshot today. Recovery tracking catches the
patient whose "mild, 2 days" becomes "bad, 6 days" — exactly the case the
duration-gating logic in `calculateWeightedScore` (`ai.js:321`) is built to
escalate.

**Effort.** M (scheduler job, check-in conversation reusing `handleMessage`,
deterioration delta logic).

**Contract.** Each check-in runs the *same* deterministic scoring engine and
emergency short-circuit — no new severity path. Escalation is a rules
comparison of two `scoring.score` values, not an LLM judgment. The LLM only
phrases the check-in question (reuse `askFollowUp`'s fallback pattern). A new
Critical score in a check-in fires the existing emergency response.

---

## 5. RAG over Medical Guidelines and the Patient's Own Records

**What.** Retrieval-augmented generation so explanations and the Doctor Copilot
can cite vetted sources: (a) a curated, versioned guideline corpus
(e.g. WHO/national triage and condition guidelines), and (b) the patient's own
prior `ChatHistory`, `ConsultationNote`, and `Prescription` records. Every
generated sentence carries a citation to a retrieved chunk.

**Why.** Grounding reduces hallucination and gives doctors traceable provenance.
The patient-records side enables continuity of care without the model
fabricating history.

**Effort.** L (vector store, embedding pipeline, chunking, citation rendering,
PHI access controls).

**Contract.** RAG is **retrieval and phrasing only — it never feeds the triage
scoring engine and never sets severity.** Guardrails: (1) the corpus is curated
and versioned, not open web; (2) responses must cite a retrieved chunk or the
system refuses and falls back to the deterministic message; (3) patient-record
retrieval is scoped by the same authz used elsewhere and every retrieval is
written to `AuditLog` (`resource_type`, `resource_id`, `actor_id`). No citation
→ no claim.

---

## 6. Triage Engine Improvements

**What.**
- **Wider symptom coverage.** Extend `detectSymptomsList` synonym map and
  `SYMPTOM_CATEGORIES` (`ai.js:110`); add genitourinary, dermatologic,
  pediatric, and mental-health categories with new combo rules.
- **Calibration / eval harness.** A labeled dataset of triage transcripts with
  expert-assigned severity; a harness that runs `calculateWeightedScore` over it
  and reports confusion matrix, false-negative rate on Critical (the metric that
  matters), and per-rule contribution. Use it to tune `SCORING_WEIGHTS` and the
  score thresholds (`>=8` Critical, `>=4` Moderate, `ai.js:375`).
- **Multilingual.** Detect language; translate input to English for the
  keyword/category engine (or maintain localized keyword maps), keep scoring
  language-agnostic, and phrase the response in the patient's language.
- **Confidence scoring.** The engine already emits `certainty` (`ai.js:371`) as
  a *relative signal indicator*. Surface it honestly in the UI and add a "low
  signal → ask another question" loop instead of finalizing on thin data.
- **Known hardening (done).** `validateInput` fast-path + fallback and prompt
  sanitization / injection-poisoning fixes (`sanitizeInput:57`,
  `parseJSON:69`) are already in place; keep them under regression test.

**Why.** Coverage and calibration directly raise triage accuracy — the core
product value. Multilingual widens reach. Honest confidence prevents
over-claiming.

**Effort.** Coverage S–M, eval harness M, multilingual M, confidence S.

**Contract.** All of this stays *inside the deterministic engine* — wider
keyword maps, more rules, tuned weights, and a translation step before scoring.
The eval harness measures the rules, not an LLM. Critical false-negative rate is
the gating metric for any weight change. Multilingual translation must never
let the LLM reclassify; it translates input/output around an unchanged scoring
core. Emergency keyword matching must be validated in every supported language
before launch.

---

## 7. Model & Infrastructure Options

**What.** Decide where inference runs as load grows.

| Option | Cost | Privacy / PHI | Latency | Notes |
|---|---|---|---|---|
| Self-hosted Ollama `llama3.2:3b` (current) | Fixed infra; no per-call cost | PHI never leaves infra | High on CPU | Already integrated, ret<br>retries + fallback proven |
| Larger self-hosted model (8B–70B) | GPU cost | Same privacy win | Better quality, more VRAM | For Copilot/SOAP drafting |
| Hosted API (e.g. managed LLM) | Per-token | PHI leaves boundary — needs BAA, redaction | Low, scalable | Only for de-identified tasks |
| On-device / edge | None at runtime | Maximal privacy | Device-limited | Patient-side explanation only |

**Why.** The phrasing tasks (validate, follow-up, finalize) are small and
latency-tolerant with fallbacks; richer tasks (Copilot, SOAP, RAG) may justify a
bigger model. Cost and PHI exposure differ sharply by route.

**Effort.** M (an inference router abstraction over the current
`createOllamaClient`).

**Contract.** Because severity is deterministic and every call has a fallback,
the model is swappable without touching the safety core — this is a key benefit
of the existing design. **Default to self-hosted for any PHI-bearing prompt.**
Hosted APIs only for de-identified or non-PHI tasks, behind a BAA, with a
redaction pass. Route selection is config, not in the decision path.

---

## 8. Safety, Governance & Human-in-the-Loop

**What.**
- **Eval datasets.** Maintain the labeled triage set (item 6) plus a separate
  red-team set of adversarial/edge inputs as a release gate.
- **Red-teaming.** Routine adversarial testing: prompt injection via symptom
  text, emergency-keyword evasion, contradiction exploits, multilingual
  bypasses. Track that emergencies still short-circuit and `sanitizeInput`
  holds.
- **Audit logging of AI outputs.** Extend `AuditLog` to record every
  AI-generated artifact (triage result, Copilot draft, SOAP draft, explanation,
  RAG citations) with the model, prompt version, `scoring.score`, and
  `reasons`. Append-only, per the existing schema's design.
- **Disclaimers.** Every patient-facing AI output carries a standing "not a
  substitute for professional medical advice; in an emergency call 112"
  disclaimer (the emergency message at `bot.js:313` is the template).
- **Human-in-the-loop.** Codify it: prescriptions, SOAP Assessment/Plan, and
  any treatment-bearing output require explicit doctor approval before
  patient visibility.

**Why.** Healthcare AI must be auditable, defensible, and conservative. These
controls make every claim reconstructable and keep a clinician accountable for
clinical decisions.

**Effort.** Eval/red-team M (ongoing), audit logging S, disclaimers S,
HITL workflow M.

**Contract.** This section *is* the contract, operationalized. Audit logging
makes "rules decide, LLM phrases" verifiable after the fact. The release gate
enforces that no model change regresses the Critical false-negative rate or the
emergency short-circuit. HITL enforces "never autonomous medical decisions" at
the workflow layer.

---

## Sequencing

1. **Foundation (now):** item 6 eval harness + audit logging (item 8). Measure
   before extending; make AI outputs auditable first.
2. **Near term:** item 6 coverage/confidence; item 2 SOAP (reuses `caseData`);
   item 4 follow-up (reuses the engine).
3. **Mid term:** item 1 Doctor Copilot; item 3 prescription explanation + drug
   DB; item 7 inference router.
4. **Longer term:** item 5 RAG with citations and PHI guardrails; multilingual
   (item 6); red-teaming as a standing practice (item 8).

Each phase ships behind the same four invariants. If a feature cannot preserve
them, it does not ship.
