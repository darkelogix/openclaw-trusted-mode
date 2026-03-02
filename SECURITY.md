# Security Policy

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `PDP`: Policy Decision Point

## Supported Versions

Security fixes are applied to the latest released plugin version.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately first.

Preferred report contents:
- impact summary
- reproduction steps
- affected version(s)
- logs/screenshots (sanitized)

## Scope Priorities

High-priority security classes for this project:

1. Enforcement bypass
- Any path where denied actions can execute while system claims enforced governance.

2. Signature bypass
- Any ability to load or apply unsigned/tampered policy packs as trusted.

3. Fail-closed failure
- Cases where PDP unreachable/invalid responses do not block under configured fail-closed posture.

## Disclosure Process

1. Acknowledge report.
2. Reproduce and triage severity.
3. Prepare fix and validation evidence.
4. Publish release note with mitigation guidance.

## Hardening Baseline

- Keep `failClosed=true` in production.
- Restrict plugin allowlist (`plugins.allow`) to trusted IDs.
- Keep PDP network exposure minimal (prefer internal/private access).
- Protect policy pack/signature files and entitlement configs with strict permissions.
