# MEDviz — *The Waiting Room That Never Closes*

> A cinematic dossier of the project: where it came from, what it's trying to be, what it actually is today, and what it could become. Written straight, no marketing gloss.

---

## I. THE PROBLEM — *cold open*

A small town, 9 p.m. A mother holds a feverish kid and a phone. The nearest clinic closed at six. The next slot at the family doctor is Thursday. Google offers her ten thousand answers and zero reassurance. She doesn't need WebMD telling her it might be cancer. She needs one calm voice to say *this can wait until morning* — or *go now*.

That's the gap MEDviz was built into. Not "healthcare is broken" in the abstract. The specific, ordinary failure: the distance between *I have a symptom* and *a real clinician has a plan for me* is measured in days and car rides, when it should be measured in minutes.

Three people are stuck on opposite sides of that gap:

- **The patient** who can't tell panic from prudence at midnight.
- **The doctor** drowning in low-acuity questions that eat the hours real cases need.
- **The clinic admin** flying blind on who's coming, who's verified, what's actually happening across the practice.

MEDviz is the attempt to put all three in the same room without anyone leaving the house.

---

## II. THE PURPOSE — *the thesis*

Compress that gap. Give the patient a triage conversation that's honest about urgency, a way to find and book a real doctor, and a record that follows them. Give the doctor an inbox that's already been pre-sorted by an AI that knows the difference between "stubbed toe" and "chest pain radiating to the left arm." Give the admin a control tower.

The non-negotiable belief underneath it: **the machine triages, the human decides.** The AI is allowed to ask questions and rank urgency. It is never allowed to be the doctor. That single line in the sand is the most important design decision in the whole product, and it's the thing the codebase actually got right.

---

## III. THE SOLUTION — *what got built*

Three portals on one spine.

**Patient.** Register, talk to the symptom-checker, find a doctor, book a slot, collect prescriptions and reports, get notified.

**Doctor.** Log in (after admin approval), see incoming requests as tasks and notifications, approve or reject, hold the consult, write the prescription, mark it done.

**Admin.** Approve doctors, watch metrics and analytics, browse patients and records.

Under the hood it's a straight MERN build. React (Create-React-App via craco) on the front, Express and Mongoose on the back, MongoDB for state, JWT for auth, an OTP flow for password resets, and a local LLM (Ollama, `llama3.2:3b`) wired into a triage engine. Two cron jobs quietly run in the background, one auto-completing stale appointments, one trying to fire appointment reminders.

It compiles. It runs. The screens are real and several of them are genuinely nice to look at. This is not a slide deck pretending to be software.

---

## IV. THE DEVELOPMENT — *the honest middle act*

Here's where the story stops being a trailer and becomes a director's commentary.

The build has the unmistakable fingerprint of a team that moved fast and divided work by screen. You can almost see the seams: the doctor portal speaks indigo, the admin portal speaks one blue in its theme file and a different blue in its layout file, the patient pages each picked their own font and their own guess at how far down the page should start. Five fonts. Five blues. A `doctorColorOverride.css` file that tried to staple a brand color onto everything with `!important` and a malformed gradient rule that quietly flattened every gradient in the app. The team *knew* what a design system was — there are real token files sitting right there — they just never got the pass where everything bows to them.

And there's a harder truth the audit surfaced. A lot of the most confident-looking parts are hollow. The doctor's "Approve" button on the home dashboard removes the row from the screen and shows a satisfying toast and **never tells the backend anything**. The doctor's settings page is wired to service methods that don't exist, so it fails silently every time. The dashboard greets a brand-new doctor with 124 fake consultations and a chart of invented activity. "Video Consultation" is the headline feature and there is no video anywhere; it's a text box where a doctor pastes a link by hand. The prescription "download" returns JSON instead of a PDF. Reminders get written to the database and never actually reach a human who isn't already staring at the app.

The most serious finding has nothing to do with looks. Most of the backend has **no authentication middleware at all**. Anyone who can reach the server can register themselves an admin account in one request, then read every patient's medical history, approve doctors, and delete prescriptions. Medical files are served from a public folder with guessable names. For a product holding health data, that's not a bug, that's the whole foundation needing rebar.

None of this is said to dunk on the work. It's said because the brief was "make sure it's not half-baked," and the only useful answer is the true one: **right now it's a beautiful, ambitious prototype with a fake floor in several rooms.** The bones are good. The wiring is missing in exactly the places that matter most.

What changed in this pass: the UI got its spine straightened. One token file now owns the palette, the type, the spacing grid, the z-index order, and the header height. The content that was hiding *behind* the fixed navbar on the Find-a-Doctor page now sits where it should. The four patient pages that each guessed a different top padding now agree. The global override file got its claws retracted so it stops repainting the entire app, and keyboard users can finally see where their focus is. Foundational, not cosmetic. The kind of fix that makes the next hundred fixes easier instead of harder.

---

## V. THE SPECIAL FEATURES — *what's actually worth bragging about*

The triage engine. Genuinely. Strip away the half-built screens and there's one piece of real engineering here worth keeping verbatim: the symptom checker decides severity with a **deterministic scoring system**, not the LLM. Emergency phrases short-circuit before any model call. The language model is used only to phrase follow-up questions and soften explanations, and every one of those calls has a heuristic fallback for when the model is slow or down. So if Ollama falls over, triage still works and still fails *safe*. That's the design instinct of someone who understood the stakes. It's the soul of the product.

The appointment state machine and the task/notification fan-out are also solidly modeled. The admin analytics are real aggregates, not theater.

---

## VI. THE FEATURE SCOPE — *the map as it stands*

**Real and working:** registration and login, OTP password reset, doctor search and booking, the AI triage conversation, prescription creation and viewing, file upload for reports, admin metrics and analytics, in-app notifications.

**Built but broken or fake:** the doctor home approve/reject buttons, the doctor settings page, the "saved" memo, dashboard stats, doctor ratings (hardcoded 4.5 for everyone), prescription PDF download, the "Coming Soon" stub routes.

**Promised but absent:** actual video consultation, payments and billing, real reminder delivery (email/SMS/push), patient-side cancel and reschedule, doctor license verification, e-prescription legal validity, and server-side authorization on most routes.

A coherent v1 isn't about adding more. It's about picking the spine — *verified doctors, real video, working reminders, downloadable prescriptions, and auth on every route* — finishing those five, and cutting or hiding everything that's currently faking it.

---

## VII. THE FUTURE — *the sequel hook*

If this gets a second act, the order writes itself.

**Act one, make it safe.** Auth middleware on every route, kill the open admin registration, put medical files behind authenticated access. Nothing ships near a real patient until this is done. This isn't a feature, it's the price of entry.

**Act two, make it true.** Delete the fake data. Wire the buttons that lie. Make the doctor's "approve" actually approve. A product that tells small lies on the dashboard loses trust the first time a user catches it.

**Act three, make it whole.** Drop in a real video provider (Daily, Jitsi, Twilio) that auto-generates a room on approval. Send reminders that actually leave the building. Generate prescriptions as signed PDFs with a number and a date. Let patients cancel their own appointments.

**Act four, make it a business.** Payments, consultation fees, refunds on cancellation. License verification for doctors so "approved" means something. Then the operational layer the AIOps review begged for: real logging, a health endpoint, graceful shutdown, moving the chatbot's in-memory session state and the local-disk uploads somewhere that survives a second server instance.

**The stretch.** Pharmacy integration so a prescription becomes a fillable order. Wearable and lab-result ingestion so triage reasons over real data, not just what the patient types. Multi-language, because the mother at 9 p.m. doesn't always think in English.

The name fits the ambition: a waiting room that never closes. The work left to do is making sure that when someone finally walks through the door, there's an actual doctor on the other side, and the lights are really on.

---

*Compiled from a six-discipline audit (principal engineering, product architecture, UI/UX, QA, security, AIOps) of the `team1` codebase. The flattering parts and the brutal parts are both true.*
