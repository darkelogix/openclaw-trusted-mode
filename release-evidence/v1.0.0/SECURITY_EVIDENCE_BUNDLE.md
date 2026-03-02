# Security Evidence Bundle

This file indexes evidence required for public release security/compliance sign-off.

## Automated Evidence

- Workflow: `.github/workflows/security-evidence.yml`
- Outputs:
  - `security-artifacts/npm-audit.json`
  - `security-artifacts/security-summary.json`
  - `security-artifacts/SECURITY_RELEASE_INDEX.md`
  - Security gate validation via `npm run verify-security-gates`
  - `THIRD_PARTY_NOTICES.md`

## Manual Review Evidence

- `THREAT_MODEL_SUMMARY.md`
- `SECURITY_TRIAGE_LOG.md`
- `THIRD_PARTY_NOTICES_REVIEW.md`

## Sign-off Gates

- [ ] No untriaged `critical` findings
- [ ] No untriaged `high` findings without owner and due date
- [ ] Threat model reviewed for current release scope
- [ ] Third-party notices reviewed and approved
- [ ] Evidence links attached to release record
