# OpenClaw Trusted Mode Compatibility Matrix

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions
- `CLI`: Command Line Interface
- `CI`: Continuous Integration

## Current Matrix

| OpenClaw Version | Plugin Version | Status | Trusted Mode Check | Notes |
|---|---|---|---|---|
| 2026.2.15 | 1.0.7 | CERTIFIED_ENFORCED | Not run | Verified in current release cycle. |
| 2026.2.16 | 1.0.7 | LOCKDOWN_ONLY | Not run | Config-writer version warning observed; certify before enforced claims. |
| latest (rolling) | 1.0.7 | UNSUPPORTED | Not run | Treat as uncertified until CI certification completes. |