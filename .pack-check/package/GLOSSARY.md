# Glossary

This glossary defines terms used across the OpenClaw Trusted Mode plugin and related SDE runtime docs.

## Core architecture terms

- **SDE**: Strategic Decision Engine. The policy/decision platform used to evaluate governance rules.
- **PDP**: Policy Decision Point. The service endpoint that returns allow/deny decisions.
- **PEP**: Policy Enforcement Point. The runtime component that enforces PDP decisions.
  In this project, the OpenClaw plugin is the PEP.
- **OpenClaw plugin**: The `openclaw-trusted-mode` extension that intercepts tool calls and queries PDP.
- **Policy pack**: Versioned JSON rule bundle used by PDP to decide allow/deny outcomes.
- **Policy variant**: A named policy pack version (for example `guard-pro.v2026.02`).
- **Entitlement**: Tenant-level authorization to use a decision capability (`decision_sku`).
- **Tenant**: Logical customer/environment boundary for policy and entitlement isolation.

## Decision and evidence terms

- **Decision SKU**: Canonical identifier for a governed decision contract
  (for example `openclaw.trusted_mode.authorize.v1`).
- **Allow path**: Expected decision flow where a low-risk request returns `decision=allow`.
- **Deny path**: Expected decision flow where a blocked request returns `decision=deny`.
- **Fail-closed**: If PDP is unavailable, block tool execution for safety.
- **Fail-open**: If PDP is unavailable, allow execution for availability.
- **`decision_hash`**: Deterministic hash of decision output used for traceability.
- **`decision_proof`**: Deterministic proof artifact (optionally signed) tied to a decision.
- **`outcome_event`**: Operational event artifact emitted with decision context.
- **Audit export**: JSON Lines (`.jsonl`) records for downstream audit/SIEM processing.

## Packaging and deployment terms

- **Reference stack**: Compose deployment including PDP, hardening service, and license service.
- **Air-gapped deployment**: Installation with no outbound internet dependency at runtime.
- **FQDN**: Fully Qualified Domain Name (for example `license.example.com`).

## Tooling and operations terms

- **CLI**: Command Line Interface.
- **OpenClaw CLI**: `openclaw` command used to install/manage plugins and gateway state.
- **`sde-cli`**: SDE command-line tool from `core/sde-core`.
- **WSL**: Windows Subsystem for Linux.
- **CI**: Continuous Integration pipeline automation.
- **SLA**: Service Level Agreement (support response/mitigation targets).
- **MTTD**: Mean Time To Detect.
- **MTTR**: Mean Time To Resolve.

## Severity shorthand used in operations

- **P1**: Highest-priority incident (critical governance bypass or full outage risk).
- **P2**: High-priority incident (major partial impact).
- **P3**: Lower-priority incident (non-critical degradation or documentation/tooling issue).
