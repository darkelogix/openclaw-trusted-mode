# OpenClaw Trusted Mode Compatibility Matrix

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions
- `CLI`: Command Line Interface
- `CI`: Continuous Integration

## Current Matrix

Adapter availability is not the same as paid Passport enforcement. Public
wording still requires separate counsel/CEO approval.

| OpenClaw Version | Plugin Version | Adapter Install | PDP / Passport Evidence | Public Claim Status | Notes |
|---|---|---|---|---|---|
| 2026.2.15 | 1.0.7 | Available | Internal evidence only; requires configured paid PDP, tenant entitlement, PDP auth token, and scoped Passport response | Do not claim certified/enforced | Use local hardening wording unless the specific customer deployment is separately reviewed. |
| 2026.2.16 | 1.0.7 | Available | Not promoted | Do not claim certified/enforced | Config-writer version warning observed; keep as local hardening until refreshed evidence exists. |
| latest (rolling) | 1.0.7 | Unverified | Not promoted | Do not claim certified/enforced | Treat as unsupported for public deployment wording until exact-version evidence exists. |
