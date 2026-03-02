# SDE Merge Governor — Build Plan (Detailed)

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `PEP`: Policy Enforcement Point
- `CI`: Continuous Integration
- `SIEM`: Security Information and Event Management

## Deterministic PR Merge Governance (PEP/PDP, Signed Artifacts, Policy Packs)

**Intent:** tool-agnostic enterprise governance for AI-assisted code (Copilot, Codex, Cursor, Claude Code, refactor bots) by enforcing at the PR merge point.

---

## 1) Non-Negotiables (Product Shape)

- **Merge is the control point**: all AI tools converge into PRs and merges.
- **Deterministic pass/fail**: only SDE decides; no probabilistic gating.
- **Signed decision artifacts**: every decision produces a sealed, auditable JSON record.
- **No false claims**: enforcement is only claimed when the required check is provably active.
- **LLMs are optional**: explanation/triage only, never a pass/fail dependency.

---

## 2) Architecture Overview

### 2.1 Components

1) **Git Provider Integration (PEP)**
- GitHub App first (webhooks + check runs + PR comments).
- Required status check blocks merge when failing.

2) **Governor Service**
- Stateless evaluation orchestrator.
- Fetches PR metadata and diffs.
- Produces normalized `ChangeManifest`.
- Collects Evidence Bundle (scanner results, CI summaries, approvals).
- Calls SDE-PDP for decision.
- Publishes results back to provider (check + comment + artifact link).

3) **SDE-PDP**
- Deterministic policy evaluation of `ChangeManifest` + evidence.
- Outputs: decision + stable reason codes + axis scores + remediation steps.
- Signs `DecisionArtifact` with version + policy pack stamp.

4) **Artifact Store**
- MVP: attach artifact to check run / CI logs.
- Pro: object store with immutable links and retention controls.
- Enterprise: customer-managed storage + customer-managed keys.

5) **(Optional) Explain Layer**
- Converts artifact into concise guidance for engineers and reviewers.
- Must be safe to disable without changing enforcement results.

---

## 3) Core Data Contracts

### 3.1 ChangeManifest (normalized PR description)
Key fields:
- repo, pr_id, base/head, author, labels
- file list, diff stats, language types
- sensitive path flags (`/infra`, `/auth`, `/payments`, `/db/migrations`, etc.)
- dependency delta (lockfiles, manifests)
- test delta (tests touched, evidence presence)
- CI evidence references (links/ids, not raw secrets)
- approvals / codeowners signals (if available)

### 3.2 DecisionArtifact (signed, audit-grade)
- decision: PASS | REQUIRE_FIX | BLOCK
- policy_pack_id + version
- reason_codes (stable taxonomy)
- axis scores (blast radius, security, compliance, evidence completeness, etc.)
- input hashes (manifest hash, diff hash, evidence hash)
- trace_id
- signature block
- remediation guidance (structured)

**Rule:** identical inputs must yield identical artifacts.

---

## 4) Policy Packs (What We Ship and Sell)

### 4.1 Core (free)
- blast radius scoring
- sensitive path gating
- basic secret indicators
- dependency delta detection (new deps)
- test evidence rules for risky changes

### 4.2 Security+ (paid)
- stronger secret heuristics
- risky pattern library (deterministic signatures)
- mandatory SAST evidence gates for sensitive paths
- approval requirements for auth/crypto/infra boundaries

### 4.3 Compliance (paid)
- change-management artifacts (ticket links, approvals, attestations)
- exportable audit bundles (signed logs)
- retention + immutability profiles

### 4.4 Enterprise Custom (paid)
- custom invariants and org-specific critical path maps
- VPC/on-prem deployment
- customer-managed keys + storage
- SIEM/GRC integrations

---

## 5) Delivery Plan (Efficient Phases)

### Phase A — “Merge Blocking + Signed Artifact” (MVP)
Goal: working GitHub integration that blocks merges and emits signed artifacts.

Deliverables:
- GitHub App skeleton (webhook receiver, check runs, comments)
- Governor service that:
  - fetches PR diff + metadata
  - builds ChangeManifest
  - calls PDP + policy pack v0
  - writes DecisionArtifact + posts results
- Policy pack v0:
  - blast radius by file/path categories
  - block common secret patterns
  - require approvals for critical paths (optional on day 1)
- Local demo fixtures: “good PR” and “bad PR” with expected outcomes

Acceptance:
- PR open + push triggers evaluation
- Required check blocks on REQUIRE_FIX/BLOCK
- Artifact is stable + signed
- “No enforcement” is declared if required check is not configured

### Phase B — Enterprise-Defensible Governance
Goal: “security review ready” with evidence handling and policy pinning.

Add:
- `.sde/governor.yaml` repo config:
  - critical path mapping
  - required evidence per path category
  - allowlists/denylists
- CODEOWNERS + approval rules integrated into decisions
- Evidence ingestion:
  - CI test results presence
  - coverage summary presence
  - SAST summary presence (from declared sources)
- Policy pack version pinning (per repo / org)

Acceptance:
- A sensitive PR can be blocked for missing required evidence
- A non-sensitive PR passes with minimal friction
- Audit reviewer can verify policy/version and hashes

### Phase C — Monetizable Differentiators
Goal: features people pay for immediately.

Add:
- Dashboards:
  - blocked PR reasons
  - risk trends
  - time-to-fix
  - AI-generated PR tracking (heuristic tags)
- Export bundles:
  - signed logs + decision artifacts for audit
- Policy pack distribution:
  - signed update channel
  - regression proofs per update
- Org-wide controls:
  - mandatory pack versions
  - exception workflow (logged, signed)

Acceptance:
- A customer can demonstrate “governed AI code” in audit language

### Phase D — Expansion
- GitLab / Bitbucket
- On-prem/VPC packaging
- Optional IDE egress controls (Cursor/Claude) as an add-on

---

## 6) Monetization Path (Built-In)

### 6.1 Free wedge
- Core policy pack
- limited repos
- limited retention
- branded PR comment and check (“Governed by SDE Merge Governor”)

### 6.2 Pro (SMB)
- Security+ pack
- longer retention
- policy pinning
- dashboards + alerts
Pricing axis: per active developer or per repo.

### 6.3 Enterprise
- Compliance pack
- audit exports
- SSO/SAML
- VPC/on-prem
- customer-managed keys
- SIEM integration
Annual contract.

### 6.4 Usage-based add-ons (high-margin)
- large-diff evaluations (refactor/migration bots)
- deep dependency + license checks
- premium attestation bundles for major releases

---

## 7) Metrics (Instrument From Day 1)

- PRs evaluated/day
- evaluation latency and failure rates
- PASS/REQUIRE_FIX/BLOCK rates
- top reason codes and time-to-fix
- repos with required check enabled (activation metric)
- conversions: install → required-check enabled → paid pack enabled
- audit exports generated / consumed

---

## 8) Build Checklist (Tight Execution)

- deterministic JSON canonicalization
- schema validation (manifest + artifact)
- stable reason code taxonomy shared with OpenClaw Trusted Mode
- signing + verification tooling
- “no evidence, no claim” enforcement truth rules
- provider compatibility matrix (GitHub versions, Actions runners, webhook behavior)

---

## 9) How It Aligns With DarkeLogix

- Same PDP authority, different PEP (Git merge gate vs runtime tool gate)
- Same monetization engine (signed policy packs + certified compatibility)
- Same release discipline (Governed Release Framework + compatibility declarations)

**Bottom line:** Merge Governor turns governance into a supply chain primitive enterprises can audit and buy.
