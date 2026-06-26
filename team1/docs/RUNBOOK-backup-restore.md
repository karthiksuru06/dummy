# MEDviz — Backup & Restore Runbook

Operational procedures for protecting patient data (PHI). This is a required
artifact for handling real medical records — back it with the vendor BAAs noted
at the bottom.

## What must be backed up

| Data store | Contents | Backup mechanism | RPO target |
|---|---|---|---|
| MongoDB Atlas | All PHI: patients, doctors, appointments, prescriptions, reports metadata, chat history, audit logs | Atlas Cloud Backups (continuous) | ≤ 1 hour |
| Cloudinary (`medviz_uploads`, `type:authenticated`) | Uploaded report/credential files | Cloudinary is the system of record; enable account backup/auto-backup add-on or periodic export | ≤ 24 hours |
| Secrets (env vars) | DB URI, JWT secret, API keys | Stored in host secret manager (Render/Vercel), NOT in git | n/a (re-issue) |

## MongoDB Atlas — backups

**Enable (one-time):**
1. Atlas → Cluster → **Backup** → enable **Cloud Backups**.
2. Set the policy: continuous (point-in-time) for the prod tier, plus daily snapshots retained ≥ 30 days, weekly ≥ 3 months. Adjust to your compliance retention requirement.
3. Enable snapshot **download** so you have an off-Atlas copy.

**Verify (monthly — a backup you have never restored is not a backup):**
1. Atlas → Backup → **Restore** → restore the latest snapshot into a NEW temporary cluster (never overwrite prod to test).
2. Connect with a read-only user; confirm collection counts are sane (`patients`, `appointments`, `prescriptions`, `auditlogs`).
3. Delete the temporary cluster. Record the date/result in the ops log.

**Manual export (ad hoc / pre-migration):**
```bash
# Requires MONGODB_URI in the environment (never inline the credential).
mongodump --uri "$MONGODB_URI" --archive=medviz-$(date +%Y%m%d).gz --gzip
```

## Restore procedures

### Full disaster recovery (cluster lost / corrupted)
1. Declare incident; put the app in maintenance (scale backend to 0 or return 503).
2. Atlas → Backup → restore the chosen point-in-time/snapshot to the prod cluster (or a fresh cluster — then repoint `MONGODB_URI`).
3. Validate with the smoke test against the restored DB:
   ```bash
   cd backend && node scripts/smoke.js   # boots the app against an ephemeral DB
   ```
   For a real restored cluster, run a read-only sanity check of record counts and a known patient login.
4. Restore Cloudinary assets if any were lost (Cloudinary rarely loses data; re-link by `cloudinaryPublicId` if needed).
5. Lift maintenance; monitor error tracker (Sentry) for spikes.

### Point-in-time recovery (bad migration / mass delete)
1. Identify the timestamp just before the bad change (use the **AuditLog** collection — every PHI mutation is recorded with actor + time — to pinpoint it).
2. Restore to a temporary cluster at that timestamp.
3. Export only the affected collection(s) from the temp cluster and re-import into prod, OR cut over if the blast radius is large.

### Manual archive restore
```bash
mongorestore --uri "$MONGODB_URI" --archive=medviz-YYYYMMDD.gz --gzip --drop
```
`--drop` replaces collections — only on an empty/temp target unless you intend a full overwrite.

## Restore drill schedule
- **Monthly:** Atlas snapshot restore to temp cluster + count verification.
- **Quarterly:** full DR rehearsal (restore + smoke test + known-user login).
- Log every drill (date, snapshot, result, who ran it).

## Compliance prerequisites (handling real PHI)
- **Signed BAAs** with MongoDB Atlas and Cloudinary (and your email provider) before storing real patient data — without a BAA you cannot lawfully store US PHI with that vendor.
- Atlas: enable **encryption at rest** (default on dedicated tiers) and require TLS (default).
- Restrict Atlas network access to the backend's egress IPs; rotate the DB user password on the schedule in your security policy.
- Retain **AuditLog** per your regulatory retention requirement (typically ≥ 6 years for HIPAA); never delete it in normal operation.
