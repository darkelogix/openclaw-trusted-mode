# DarkeLogix Plan  

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `PEP`: Policy Enforcement Point
- `CLI`: Command Line Interface
- `SLA`: Service Level Agreement
- `CI`: Continuous Integration
- `SIEM`: Security Information and Event Management

## OpenClaw Trusted Mode + SDE-PDP Governance Control Plane  
### (v1 → v3, Governed Release Model Integrated)

**Status:** Active baseline plan (updated March 1, 2026; v1 governance closure items partially completed)  
**Primary wedge:** OpenClaw governance + proof-of-enforcement  
**Paid moat:** Sealed SDE Policy Decision Point (PDP) + signed policy pack updates + certified compatibility + audit-grade evidence  
**Release discipline:** Governed Release Framework (mandatory for every version)

## Status Summary

| Area | Status |
|---|---|
| P3C.1–P3C.6 core delivery | Complete |
| P3C.7 governance closure quick items | Complete |
| Runtime certified/lockdown gating | Complete |
| Compatibility matrix CI auto-certification | Complete |
| `trusted_mode_attest` signed pack implementation | Complete |
| Security evidence CI gate scaffolding | Complete (technical) |
| Enterprise hardening controls (plugin-side) | Partial |

---

# 0. Executive Summary

We are not shipping a plugin.

We are shipping a governance authority layer that:

- Deterministically authorizes agent tool actions  
- Proves enforcement is actually active  
- Refuses to claim enforcement when it cannot verify it  
- Ships as a sealed PDP deployed inside the customer environment  
- Monetizes through signed Guard Pro policy pack updates  
- Publishes a living compatibility matrix as both engineering discipline and marketing  

Every release must strengthen at least one of:

1. Enforcement credibility  
2. Monetization differentiation  
3. Compatibility trust  
4. Audit evidence  

## 0.1 Current Implementation Snapshot (as of March 1, 2026)

Completed now:
- Plugin interception + PDP authorization + fail-closed blocking behavior
- Signed policy-pack verification in SDE-PDP
- Trusted Mode Check CLI with attestation-style status outputs:
  - `ENFORCED_OK`
  - `LOCKDOWN_ONLY`
  - `UNSAFE`
- Governance artifacts in public repo:
  - `SECURITY.md`
  - `RELEASE_v1.0.0.md`
  - `COMPATIBILITY_MATRIX.md`
- CI release discipline gates:
  - required release artifacts check
  - changelog-version consistency check

Still open (future phase work):
- Support/SLA finalization and real contact/on-call ownership
- Security/legal evidence bundle final sign-off (automation + templates + CI gates in place; manual/legal approval pending)
- Enterprise hardening follow-on items from roadmap phases

---

# 1. Competitive Reality

Multiple OpenClaw guardrail projects exist.

We differentiate through:

## 1.1 Proof of Enforcement (Non-Negotiable)

- SDE-native Trusted Mode Check  
- Active verification of interception  
- Enforced Mode only when proven  
- Lockdown Mode when not provable  

## 1.2 Sealed PDP + Signed Policy Pack Updates

The open-source plugin is not the product.

The product is:

- The sealed SDE-PDP container  
- The signed Guard Pro update stream  
- Regression-tested compatibility certification  

## 1.3 Compatibility Certification

- Public matrix  
- Updated with every tested OpenClaw version  
- Enforced Mode only on certified builds  

## 1.4 Audit-Grade Evidence

- Stable reason codes  
- Trace IDs  
- Policy pack version stamps  
- SIEM-ready exports (v2)  

---

# 2. Product Structure

## Platform Spine

- SDE-PDP (sealed)  
- Signed policy packs  
- Trusted Mode plugin (PEP)  

## Marketed Products

- OpenClaw Trusted Mode  
- Guard Pro (subscription)  
- Hardening Assessment  
- **(Follow-on)** SDE Merge Governor (PR merge enforcement + audit artifacts)  

Each release must clarify:

- Free tier impact  
- Guard Pro impact  
- Enterprise differentiation  

---

# 3. Architecture (Option 1)

## Deployment Topology

- OpenClaw Gateway (PEP)  
- OpenClaw Sandbox runners  
- SDE-PDP (internal-only policy plane)  

## Network Posture

- PDP internal-only (compose network / k8s ClusterIP)  
- Only Gateway can reach PDP  
- Fail-closed defaults for high-risk actions  

---

# 4. Contract Freeze (Versioned)

Before v1 release:

- `ActionRequest`  
- `ActionDecision`  
- Stable reason codes  
- Blast radius schema  
- Trace ID format  
- Policy pack version stamping  

No breaking change without version increment + migration path.

**Alignment note:** reason codes, trace IDs, and signing conventions must be reusable across follow-on enforcement surfaces (Git/PR governance included).

---

# 5. Enforcement Modes

## Enforced Mode (Certified)

Criteria:

- Interception proven active  
- PDP reachable  
- Signed policy pack valid  
- Negative tests confirm deny blocks execution  
- OpenClaw version certified in matrix  

Behavior:

- All tool calls authorized by PDP  
- Deny blocks execution  
- Constraints applied  
- Fail-closed for high-risk categories  

## Lockdown Mode (Truthful Fallback)

Triggered when:

- Interception not provable  
- OpenClaw version not certified  

Behavior:

- No enforcement claims  
- Conservative OpenClaw-native config templates  
- Clear remediation steps  

Rule:

We never claim enforcement unless we can prove it.

---

# 6. Trusted Mode Check (SDE-Native Attestation)

## 6.1 Versioned Policy Pack

`trusted_mode_attest`

- Signed  
- CI-tested  
- Versioned like all packs  

## 6.2 Inputs

- OpenClaw version  
- Plugin load status  
- PDP reachability  
- Signature validation  
- Controlled negative tests  

## 6.3 Outputs

- Status: ENFORCED_OK | LOCKDOWN_ONLY | UNSAFE  
- Axis scores:
  - interception proof  
  - fail-safe posture  
  - integrity  
  - certified compatibility  
- Remediation guidance  
- Trace ID + pack version stamp  

This becomes:

- Engineering gate  
- Sales artifact  
- Audit artifact  
- Marketing asset  

---

# 7. Blast Radius Axis

Purpose:

Quantify potential impact of an action.

Deterministic inputs:

- Tool category  
- Argument paths/domains  
- Sensitive allowlists  
- Recent-access map  

Output:

- Score (0..1)  
- Band (LOW|MED|HIGH|CRITICAL)  
- Reasons  

Every release must document blast radius changes.

---

# 8. Compatibility Matrix

Published in `openclaw-trusted-mode`.

## Matrix Columns

- OpenClaw version  
- Plugin version  
- Status:
  - CERTIFIED_ENFORCED  
  - LOCKDOWN_ONLY  
  - UNSUPPORTED  
- Notes  

## Automation

CI:

- Tests latest OpenClaw  
- Tests prior minor version  
- Runs Trusted Mode Check  
- Updates matrix page  

Policy:

We only claim Enforced Mode on certified versions.

---

# 9. GOVERNED RELEASE FRAMEWORK (Mandatory)

Every version must include:

`RELEASE_vX.Y.Z.md`

Contents:

1. Release Thesis  
2. Enforcement Changes  
3. Compatibility Declaration  
4. Blast Radius Changes  
5. Guard Pro Impact  
6. Rollback Plan  
7. Validation Summary  
8. Adversarial Results  
9. Performance Metrics  
10. Post-Release Monitoring Plan  

No release without this file.

**Alignment note:** the same framework applies to SDE Merge Governor releases, with the “Compatibility Declaration” replaced/extended by a “Provider + CI Compatibility Declaration” (e.g., GitHub App + Actions runner matrix).

---

# 10. RELEASE CYCLE

## Phase 0 — Strategic Lock

- What risk is reduced?  
- What authority is strengthened?  
- What monetization vector increases?  

## Phase 1 — Code Freeze

- Branch cut  
- Version bump  
- Contract freeze  
- Compatibility declaration  

## Phase 2 — Enforcement Audit

- Interception proof  
- Deny test validation  
- Fail-closed validation  
- Signature validation  
- Trusted Mode Check  

## Phase 3 — Adversarial Testing

- Prompt injection  
- Tool misuse  
- Schema tampering  
- PDP unreachable scenario  
- Version mismatch  

## Phase 4 — Performance Envelope

Measure:

- PDP latency  
- Blast radius compute time  
- Interception overhead  
- Memory footprint  

## Phase 5 — Commercial Readiness

Confirm:

- Tier gating clarity  
- Guard Pro differentiation  
- Update channel integrity  
- Sample attestation report updated  

## Phase 6 — Soft Launch (48 hours)

Silent release.  
Monitor:

- Install failures  
- Enforcement regressions  
- Compatibility issues  

## Phase 7 — Public Launch

Publish:

- Release notes  
- Compatibility update  
- Technical blog  
- Plain-language risk elimination post  

## Phase 8 — Post-Release Intelligence (2 weeks)

Track:

- Guard Pro conversions  
- Assessment bookings  
- Support friction  
- Enforcement anomalies  

Adjust before next version.

---

# 11. Roadmap (v1 → v3)

## v1 — Proof-of-Governance MVP

Deliver:

- Plugin interception  
- PDP `/authorize`  
- Signed baseline pack  
- Trusted Mode Check  
- Compatibility matrix  
- Reference deployment  

Exit Criteria:

- Passing Trusted Mode Check on certified build  
- Deny blocks execution  
- Fail-closed confirmed  
- Signed pack enforced  
- RELEASE_v1.0.0.md complete  

Target:

3–5 paying Enforced Mode customers within 90 days.

---

## v2 — Subscription Moat

Deliver:

- Guard Pro update stream  
- Regression proofs per update  
- Audit export pack  
- Compatibility certification gating  

Exit Criteria:

- Safe signed updates delivered  
- Audit exports usable in review  
- RELEASE_v2.0.0.md complete  

---

## v3 — Control Plane Expansion

Deliver:

- Multi-agent governance  
- Budgets + routing + kill switch  
- Mission-control surfaces  

Exit Criteria:

- Deterministic enforcement across ≥3 profiles  
- Kill switch auditable  
- RELEASE_v3.0.0.md complete  

---

# 12. Monetization

1. Hardening Assessments  
2. Guard Pro subscription  
3. Deployment services  
4. Support/SLA tiers  
5. Compatibility certification service  

Every release must strengthen at least one.

---

# 13. Security & Disclosure

- SECURITY.md  
- Narrow bug bounty:
  - enforcement bypass  
  - signature bypass  
  - fail-closed failure  

---

# 14. Strategic Continuity

Running SDE-PDP in production environments creates:

- Enforcement credibility  
- Deterministic audit trails  
- Foundation for Copilot/Codex governance  
- Cross-runtime expansion path  

The release framework is reusable across:

- OpenClaw Trusted Mode  
- Governed Copilot (future)  
- **SDE Merge Governor** (follow-on)  
- Future integrations  

**Principle:** the PDP stays the deterministic authority. Only the PEP changes (agent runtime vs Git merge gate).

---

# 15. Immediate Build Order

1. Freeze v1 contracts  
2. Implement PDP authorize + signature validation  
3. Implement interception + fail-closed  
4. Implement Trusted Mode Check pack  
5. Build compatibility harness  
6. Publish repo + matrix page  
7. Draft Hardening Assessment offer  
8. Create RELEASE_v1.0.0.md template  
9. **Prep shared governance primitives for follow-ons:** reason codes taxonomy, signing conventions, artifact schema discipline  

---

# Appendix A — SDE Merge Governor (Follow-on Continuation)

## A0. Purpose

Extend the same SDE governance authority to the software supply chain by making **PR merges** provably governed.

- OpenClaw Trusted Mode governs **runtime tool actions**.  
- SDE Merge Governor governs **code landing into repos**.  
- Both rely on the same PDP principles:
  - deterministic decisioning  
  - signed artifacts  
  - refusal to claim enforcement without proof  
  - versioned policy packs  
  - compatibility certification  

## A1. Product Definition

**SDE Merge Governor** is a Git provider integration that:

- Evaluates every PR with deterministic policy packs  
- Emits a **signed DecisionArtifact** (JSON) suitable for audit  
- Enforces via a **required status check** (fail = no merge)  
- Treats LLMs as optional explain/triage only (never pass/fail)  

## A2. Enforcement Model

- **PEP:** Git provider checks (e.g., GitHub Check Run) configured as *required* for merge  
- **PDP:** SDE policy engine evaluating a normalized `ChangeManifest`  
- **Evidence bundle:** scanner outputs + repo metadata + diffs (only what is available/declared)  
- **Fail-closed posture:** for high-risk categories or missing evidence required by policy  

## A3. MVP (Fastest Monetizable Slice)

Start with GitHub.

Minimum capabilities:

- PR triggers on open + synchronize  
- ChangeManifest generation (diff + file classification + dependency delta)  
- Signed DecisionArtifact v1: PASS | REQUIRE_FIX | BLOCK  
- PR comment summary + check-run details  
- `.sde/governor.yaml` repo config (critical paths, required evidence, approvals)  

Minimum policy axes:

- Blast radius (paths, modules touched, sensitive boundaries crossed)  
- Security indicators (secrets patterns, dangerous file/path categories)  
- Dependency/license delta (new deps + license class)  
- Test evidence rules (required tests for risky changes)  

## A4. Monetization Path (Built-In)

- **Free wedge:** 1–3 repos, Core policy pack, short retention  
- **Pro:** Security+ pack, dashboards, longer retention, policy pinning  
- **Enterprise:** Compliance pack, audit exports, SSO, VPC/on-prem, customer-managed keys, SIEM integrations  
- **High-margin add-ons:** large-diff evaluations, migration/refactor attestations, premium policy packs  

## A5. Alignment With DarkeLogix Strategy

SDE Merge Governor strengthens the core thesis:

- We are a governance authority layer, not a plugin vendor.  
- We produce provable enforcement and audit-grade evidence.  
- We monetize through signed policy packs and compatibility certification.  

It also expands the addressable market beyond agent runtimes into enterprise change-management and supply chain governance.

---

# Operating Principle

We do not ship features.

We ship provable governance.

Every version must compound credibility.
