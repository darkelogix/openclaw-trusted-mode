# Changelog

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `PDP`: Policy Decision Point
- `PEP`: Policy Enforcement Point
- `CLI`: Command Line Interface
- `CI`: Continuous Integration

## Unreleased
- No unreleased changes recorded.

## v1.0.5
- Add `openclaw-trusted-mode-configure`, a dedicated guided config writer for governed OpenClaw hosts that updates `~/.openclaw/openclaw.json` with `plugins.allow`, tenant, gateway, environment, PDP URL, and fail-closed settings.
- Remove the remaining manual-JSON ambiguity from the package docs by documenting the new configure command for governed mode.
- Keep the package contract explicit by publishing the new configure CLI and its config-writer module in the npm tarball.

## v1.0.4
- Make the public npm package install-safe for current OpenClaw builds by separating Trusted Mode Check environment reads from PDP network calls in the shipped CLI entrypoint.
- Align `openclaw.plugin.json` with the published package version and keep the required helper CLI modules in the npm tarball.
- Preserve current compatibility posture by publishing the installer fix without claiming certification for rolling OpenClaw builds.

## v1.0.3
- Include the signed attestation pack files in the public npm package so Trusted Mode Check can verify local attestation out of the box.

## v1.0.2
- Publish the gateway/environment-aware Trusted Mode Check flow so governed runtime validation uses the same tenant, gateway, and environment context as the customer runtime.

- Add governed release artifacts (`SECURITY.md`, `RELEASE_v1.0.0.md`, compatibility matrix).
- Add Trusted Mode Check attestation status contract (`ENFORCED_OK`, `LOCKDOWN_ONLY`, `UNSAFE`) with JSON output.
- Add CI gates for release artifact and changelog version discipline.
- Add runtime certification gating (`CERTIFIED_ENFORCED` vs `LOCKDOWN_ONLY`/`UNSUPPORTED`) in plugin.
- Add signed `trusted_mode_attest` pack verification and trace/axis metadata in Trusted Mode Check output.
- Add compatibility certification workflow and matrix sync script.
- Add release operations hardening workflow with reproducible artifact checksum/manifest generation.
- Add security evidence workflow, threat model summary, triage log, and third-party notices generation/review templates.
- Add adversarial regression suite script and CI gate (tampered attestation, malformed PDP schema, unreachable PDP, uncertified runtime).
- Add unified startup health verification script for plugin/PDP/attestation/certification checks.
- Add performance benchmark automation (PDP p50/p95 + interception overhead), CI workflow, and published baseline report.
- Add security gate automation (`verify-security-gates`) with vulnerability threshold enforcement and triage log validation.
- Add generated `SECURITY_RELEASE_INDEX.md` artifact and workflow integration for release evidence traceability.
- Add enterprise hardening options in plugin config (`toolPolicyMode`, `allowedTools`, `requireTenantId`, `allowedTenantIds`) with fail-closed validation behavior.
- Add plugin schema/runtime contract check (`verify-plugin-schema-contract`) and CI enforcement.
- Add consolidated release evidence bundling command (`bundle-release-evidence`) and release workflow artifact publication.
- Add enterprise TCTP/EVTP validation matrix runner (`npm run test-pack-matrix`) against live PDP.
- Add release documentation for deterministic certification proof (`decision_proof`) vs timestamped operational `outcome_event`.

## v1.0.0
- Add Trusted Mode Check CLI (Node) with mock PDP for CI.
- Add CI workflow to run build, tests, and CLI against mock PDP.
- Enforce PDP timeout/fail-closed behavior and constraint checks in PEP.
