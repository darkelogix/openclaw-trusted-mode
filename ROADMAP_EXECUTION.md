# Roadmap Execution Board

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface
- `SLA`: Service Level Agreement
- `CI`: Continuous Integration

## Now (Release-Critical)

### 1) Runtime certification gating in plugin
- Status: `[x]`
- Owner: `Plugin Engineering Lead`
- Target date: `2026-03-12`
- Priority: P0
- Deliverables:
  - Explicit certified vs lockdown runtime behavior
  - Enforcement claims restricted to certified state
  - Tests for certified/uncertified transitions
- Acceptance criteria:
  - Plugin enters lockdown behavior when uncertified
  - CI tests pass for both certified and uncertified paths
  - Docs updated with runtime behavior contract

### 2) Compatibility certification automation in CI
- Status: `[x]`
- Owner: `DevEx / CI Owner`
- Target date: `2026-03-15`
- Priority: P0
- Deliverables:
  - CI job matrix across latest + prior minor OpenClaw versions
  - Trusted Mode Check run per matrix target
  - Compatibility matrix auto-update workflow
- Acceptance criteria:
  - CI blocks release on failed certification run
  - `COMPATIBILITY_MATRIX.md` reflects latest certified results
  - Release PR contains matrix update evidence

### 3) `trusted_mode_attest` signed pack implementation
- Status: `[x]`
- Owner: `SDE Policy/PDP Lead`
- Target date: `2026-03-18`
- Priority: P0
- Deliverables:
  - Signed attestation pack
  - Output contract: `ENFORCED_OK | LOCKDOWN_ONLY | UNSAFE`
  - CLI integration to consume standardized attestation output
- Acceptance criteria:
  - Pack signature verification enforced
  - Attestation output schema documented + tested
  - Trusted Mode Check artifacts include attestation status and remediation

---

## Next (Public-Launch Readiness)

### 4) Support/SLA finalization
- Status: `[ ]`
- Owner: `Operations Manager`
- Target date: `2026-03-20`
- Priority: P1
- Deliverables:
  - Real support contacts in docs
  - On-call schedule + escalation policy
  - SLA targets approved
- Acceptance criteria:
  - No placeholder contacts remain in release docs
  - Public support channel and response expectations published

### 5) Security/legal evidence bundle
- Status: `[-]`
- Owner: `Security + Compliance Lead`
- Target date: `2026-03-22`
- Priority: P1
- Deliverables:
  - Dependency scan report + triage log
  - Threat model summary
  - Third-party notices completeness review
- Acceptance criteria:
  - Security artifacts attached to release record
  - Open issues are triaged with severity + remediation owners
  - Public release checklist security/legal section signed off

### 6) Release operations hardening
- Status: `[x]`
- Owner: `Release Manager`
- Target date: `2026-03-24`
- Priority: P1
- Deliverables:
  - Release tags and artifact publication process
  - Artifact checksum/signature publication
  - Dry-run release execution
- Acceptance criteria:
  - Reproducible release pipeline demonstrated end-to-end
  - Rollback drill completed and documented

---

## Later (Scale/Maturity)

### 7) Performance envelope publication
- Status: `[x]`
- Owner: `Platform Performance Owner`
- Target date: `2026-03-27`
- Priority: P2
- Deliverables:
  - PDP latency baseline (p50/p95)
  - Interception overhead benchmark
  - Capacity guidance for operators
- Acceptance criteria:
  - Performance section included in next governed release file
  - Timeout defaults reviewed against measured data

### 8) Adversarial regression suite expansion
- Status: `[x]`
- Owner: `Security Engineering`
- Target date: `2026-03-28`
- Priority: P2
- Deliverables:
  - Automated adversarial scenarios in CI
  - Version mismatch, prompt/tool misuse, schema tampering tests
- Acceptance criteria:
  - Release gate includes adversarial suite pass/fail signal
  - Regressions surfaced before merge

### 9) Enterprise hardening closure
- Status: `[-]`
- Owner: `Enterprise Platform Lead`
- Target date: `2026-03-29`
- Priority: P2
- Deliverables:
  - Multi-tenant isolation hardening from partial -> complete
  - Distribution/anti-tamper gaps closed
- Acceptance criteria:
  - `PROJECT_STATUS.md` updated from partial to complete for these items
  - Evidence-based validation documented

---

## Milestone Gate Checklist

### Gate A (Release-Critical Complete)
- [x] Items 1-3 complete
- [x] Public enforcement claims match certified runtime behavior
- [x] Compatibility automation active

### Gate B (Public Launch Complete)
- [ ] Items 4-6 complete
- [ ] Public release checklist fully signed off
- [ ] On-call + support readiness active

### Gate C (Scale Baseline Complete)
- [ ] Items 7-9 complete
- [ ] Performance + adversarial + enterprise hardening evidence published

---

## RACI (Assign Names Before Execution)

Replace placeholders with actual names/teams.

| Workstream | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) |
|---|---|---|---|---|
| 1) Runtime certification gating | `<Plugin Engineer>` | `<Engineering Lead>` | `<Security Lead>`, `<SRE>` | `<Product>`, `<Support>` |
| 2) Compatibility CI automation | `<CI Engineer>` | `<DevEx Lead>` | `<Plugin Engineer>`, `<QA Lead>` | `<Engineering Lead>` |
| 3) `trusted_mode_attest` pack | `<PDP Engineer>` | `<SDE/PDP Lead>` | `<Security Lead>`, `<Policy Owner>` | `<Engineering Lead>`, `<Product>` |
| 4) Support/SLA finalization | `<Operations Manager>` | `<Head of Operations>` | `<Support Lead>`, `<Product>` | `<All stakeholders>` |
| 5) Security/legal evidence bundle | `<Security Engineer>` | `<Security + Compliance Lead>` | `<Legal>`, `<Release Manager>` | `<Leadership>`, `<Support>` |
| 6) Release operations hardening | `<Release Engineer>` | `<Release Manager>` | `<DevEx>`, `<Security>` | `<Engineering>`, `<Support>` |
| 7) Performance envelope | `<Performance Engineer>` | `<Platform Lead>` | `<SRE>`, `<QA>` | `<Product>`, `<Support>` |
| 8) Adversarial regression suite | `<Security Engineer>` | `<Security Lead>` | `<QA Lead>`, `<Plugin Engineer>` | `<Engineering Lead>` |
| 9) Enterprise hardening closure | `<Enterprise Engineer>` | `<Enterprise Platform Lead>` | `<Security>`, `<SRE>` | `<Leadership>`, `<Support>` |

RACI rules:
- Exactly one `A` per workstream.
- `R` can be one person or small team.
- Gate sign-off requires `A` approval and evidence links.

---

## Change Log (Roadmap Board)

| Date | Change | By |
|---|---|---|
| 2026-03-01 | Initial execution board created | Codex |
| 2026-03-01 | Added tentative 4-week owners and target dates | Codex |
| 2026-03-01 | Marked items 1-3 complete: runtime cert gating, signed attestation pack, compatibility CI automation | Codex |
| 2026-03-01 | Marked item 6 complete (release operations hardening); item 5 moved to in-progress with automated evidence scaffolding | Codex |
| 2026-03-01 | Marked item 8 complete with adversarial CI gate and regression automation | Codex |
| 2026-03-01 | Marked item 7 complete with benchmark automation, CI artifact publication, and timeout review evidence | Codex |
| 2026-03-01 | Added security gate automation (audit thresholds + triage checks + security release index) and plugin-side enterprise hardening controls | Codex |
| 2026-03-01 | Added schema/runtime contract guardrails and consolidated release evidence bundle automation | Codex |
