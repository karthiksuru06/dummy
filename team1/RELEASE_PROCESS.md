# MediConnect Release Candidate Process

## 1. Pre-Release Checklist
- [ ] All feature branches merged into `main`.
- [ ] CI/CD pipeline passes (Lint, Test, Build).
- [ ] Test coverage meets minimum thresholds (>80% backend).
- [ ] No critical or high-severity vulnerabilities in `npm audit`.
- [ ] Database migrations applied and backed up.
- [ ] `.env` variables updated in production environment.

## 2. Versioning
Follow Semantic Versioning (SemVer): `vMAJOR.MINOR.PATCH`
- Current Release: `v1.0.0` (Initial Production Release)

## 3. Release Commands
Execute the following commands from the repository root:

```bash
# 1. Ensure working directory is clean
git status

# 2. Pull latest changes
git pull origin main

# 3. Create annotated release tag
git tag -a v1.0.0 -m "Release v1.0.0: Initial Production Release - Features: Appointments, Reports, Chatbot NLU, Real-time Notifications"

# 4. Push tag to remote repository
git push origin v1.0.0

# 5. (Optional) Push main branch if not already pushed
git push origin main
```

## 4. Post-Release Verification
- [ ] Verify GitHub Actions created the release artifact.
- [ ] Verify PM2 restarted successfully on production server (`pm2 status`).
- [ ] Verify frontend is serving the new build (`curl -I https://app.mediconnect.com`).
- [ ] Monitor Sentry/Grafana for immediate error spikes for 1 hour.

## 5. Rollback Plan
If critical failure occurs:
```bash
# 1. Revert backend to previous commit
git checkout <previous-stable-commit-hash>
git push origin main --force

# 2. Reload PM2
pm2 reload ecosystem.config.js --env production

# 3. Revert frontend build (via previous artifact or git checkout)
```