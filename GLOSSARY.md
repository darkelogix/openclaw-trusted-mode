# Glossary

This glossary defines terms used across the OpenClaw adapter package and related SDE runtime docs.

## Capability Kernel (adapter role)

This package is a **PEP adapter**, not the SDE kernel runtime.

```text
PROPOSE → OBSERVE → UPDATE → BOUND → DECIDE → ACT → LEARN
```

- **Capability Kernel**: Shared SDE architecture (Graph, Belief, Passport + control loop).
- **Proposal**: Normalized tool-call request submitted for evaluation.
- **Passport schema**: Decision contract / Decision SKU rules used by the PDP.
- **Passport**: Scoped authorization semantics; PEPs enforce decisions before side effects.
- **Free path**: Local hard gate (allowlist). **Paid path**: PDP-backed evaluation.

## Core architecture terms

- **SDE**: Strategic Decision Engine. Capability Kernel decision runtime used to evaluate governance rules.
- **PDP**: Policy Decision Point. Service that evaluates Proposals against passport schemas and returns allow/deny/constrain decisions.
- **PEP**: Policy Enforcement Point. The runtime component that enforces PDP (or local free-tier) decisions before side effects.
  In this project, the OpenClaw plugin is the PEP.
- **OpenClaw plugin**: The adapter extension that can forward selected tool-call metadata to a configured PDP.
- **Policy pack**: Versioned JSON rule bundle loaded by the PDP (passport schema content).
- **Policy variant**: A named policy pack version (for example `guard-pro.v2026.02`).
- **Entitlement**: Tenant-level authorization to use a decision capability (`decision_sku`).
- **Tenant**: Logical customer/environment boundary for policy and entitlement isolation.

## Decision and evidence terms

- **Decision SKU**: Canonical identifier for a passport schema / decision contract
  (for example `openclaw.trusted_mode.authorize.v1`).
- **Allow path**: Expected decision flow where a low-risk request returns `decision=allow`.
- **Deny path**: Expected decision flow where a blocked request returns `decision=deny`.
- **Fail-closed**: If PDP is unavailable, block tool execution for safety (recommended for protected actions).
- **Fail-open**: If PDP is unavailable, allow execution for availability.
- **`decision_hash`**: Deterministic hash of decision output used for traceability.
- **`decision_proof`**: Deterministic proof artifact (optionally signed) tied to a decision.
- **`outcome_event`**: Operational event artifact emitted with decision context (LEARN inputs).
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
