# OpenClaw Trusted Mode Compatibility Matrix

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions
- `CLI`: Command Line Interface

## Current Matrix

| OpenClaw Version | Plugin Version | Status | Trusted Mode Check | Notes |
|---|---|---|---|---|
| 2026.2.15 | 1.0.0 | CERTIFIED_ENFORCED | Not run | Verified in current release cycle. |
| 2026.2.16 | 1.0.0 | LOCKDOWN_ONLY | Not run | Config-writer version warning observed; certify before enforced claims. |
| latest (rolling) | 1.0.0 | UNSUPPORTED | Not run | Treat as uncertified until CI certification completes. |

## Certification Rule

Enforced claims are permitted only for rows marked `CERTIFIED_ENFORCED`.

## Update Process (per release)

1. Run Trusted Mode Check against target OpenClaw versions.
2. Record results and status in this matrix.
3. Publish matrix update with release notes.
4. If certification fails, keep status at `LOCKDOWN_ONLY` or `UNSUPPORTED`.
