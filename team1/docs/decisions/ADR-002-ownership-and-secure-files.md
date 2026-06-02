# ADR-002: Per-record ownership & secure file serving

**Status:** Partially implemented — **handler-level ownership is the #1 remaining P0**
**Date:** 2026-06-03

## Context
Two distinct gaps beyond authentication (ADR-001):
1. **IDOR:** handlers in `appointments.js` / `prescriptions.js` / `patients.js` read the target id from params/body and `findById` + mutate, trusting the caller. A logged-in patient could still act on another patient's resource.
2. **Public PHI files:** `app.use('/uploads', express.static(...))` served every medical document publicly under guessable `Date.now()` filenames.

## Decision
- **Files (done):** removed the public static mount; added `routes/files.js` — authenticated, `path.basename` + resolved-path-prefix check constrained to the uploads dir (traversal-safe), audit-logged. Upload filenames are now `crypto.randomUUID()` (collision-free, unguessable). The traversal guards in `patient.js` were tightened from `backend/` to `backend/uploads/`.
- **Ownership (to do — provided, not yet wired):** `requireOwnership(getOwnerId)` exists in `middleware/auth.js`. It must be applied in each mutating handler, deriving the owner from the DB record and comparing to `req.user.id` (staff bypass with their own scoping). Example for `appointments`:
  ```js
  router.post('/:id/approve', validateObjectIdParam('id'),
    requireRole('doctor','admin'),
    requireOwnership(async (req) => (await Appointment.findById(req.params.id))?.doctor_id),
    audit('appointment.approve','Appointment'), handler)
  ```

## Tradeoff: file access vs `<img src>`
Removing public `/uploads` means images can't be loaded via a plain `<img src>` with a Bearer header. Options: (a) **short-lived signed URL tokens** issued by an ownership-checked endpoint (recommended), or (b) fetch as blob with the auth header and `URL.createObjectURL`. Frontend must migrate file URLs to `/api/files/:name` (or signed URLs). **This will break existing inline image/report links until migrated** — tracked, intentional (security > broken thumbnails).

## Scaling limit
Local-disk uploads break under multiple instances / ephemeral containers. Target: move to **S3** with server-side encryption + signed URLs (see architecture doc). Files on disk today are also a backup/retention problem.

## Pre-existing leak (urgent, separate)
`backend/uploads/` (4 real patient files) and `frontend/.env` are **already committed to the GitHub repo**. Code changes can't undo history. Required: purge with `git filter-repo`, rotate any secrets, add `uploads/` + `frontend/.env` to `.gitignore`, force-push (coordinate with the team). See FINAL-GAP-ANALYSIS.
