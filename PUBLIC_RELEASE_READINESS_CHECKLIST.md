# Public Release Readiness Checklist (Plugin + SDE Offering)

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `SLA`: Service Level Agreement
- `CI`: Continuous Integration

## 0) Release Definition and Scope

- [ ] Release scope frozen (features, known exclusions)
- [ ] Target audience defined (self-hosted users, enterprise pilots, etc.)
- [ ] Supported deployment modes defined:
  - [ ] Plugin-only
  - [ ] Plugin + PDP (recommended)
  - [ ] Reference stack
- [ ] Product naming/versioning finalized

---

## 1) Packaging and Distribution

### 1.1 Artifacts

- [ ] Plugin artifact/package reproducible from source
- [ ] SDE-PDP container image reproducible from source
- [ ] Checksums/signatures published for release artifacts (recommended)
- [ ] Release notes generated with upgrade + rollback notes

### 1.2 Repository hygiene

- [ ] No dev-only or unrelated files in distributable artifact
- [ ] `.gitignore` / package allowlist reviewed
- [ ] README quickstart tested from clean environment
- [ ] Example config files included and valid

---

## 2) Documentation Completeness

- [ ] Quickstart for first-time user (<=10 minutes to first success)
- [ ] Full operator guide available
- [ ] Non-technical runbook available
- [ ] Production checklist available
- [ ] Public release checklist available (this file)
- [ ] Troubleshooting section includes top failure cases:
  - [ ] PDP unreachable / fetch failed
  - [ ] plugin not found / config invalid
  - [ ] unexpected allow/deny
  - [ ] signature failure

---

## 3) Compatibility and Support Policy

- [ ] Supported OS matrix declared (Linux/macOS/Windows)
- [ ] Supported OpenClaw version range documented
- [ ] Supported Node version range documented
- [ ] Supported Docker/Compose baseline documented
- [ ] Deprecation policy documented
- [ ] Backward compatibility expectations documented

---

## 4) Security, Privacy, and Legal

### 4.1 Security baseline

- [ ] Security review completed for public release
- [ ] Threat model updated (at least high-level)
- [ ] Hardening defaults documented (`failClosed`, allowlists, network exposure)
- [ ] Secrets handling documented (no secrets in repo/docs examples)
- [ ] Dependency scan completed and findings triaged
- [ ] Security CI gate passed (`verify-security-gates`)
- [ ] Security release index generated (`security-artifacts/SECURITY_RELEASE_INDEX.md`)

### 4.2 Privacy and data handling

- [ ] Data flow documented (what is sent from plugin to PDP)
- [ ] Logging/audit guidance includes redaction expectations
- [ ] Any telemetry behavior documented and opt-out controls stated (if applicable)

### 4.3 Legal/compliance

- [ ] License file present and correct
- [ ] Third-party notices complete
- [ ] Export/compliance constraints reviewed (if applicable)
- [ ] Trademark/name usage reviewed

---

## 5) Quality Gates (Release Candidate)

- [ ] Clean install test passed
- [ ] Upgrade test passed
- [ ] Reinstall test passed
- [ ] Uninstall test passed
- [ ] Fail-closed behavior verified when PDP unavailable
- [ ] Allow/deny policy behavior verified
- [ ] Multi-tenant entitlement behavior verified
- [ ] Docs command snippets validated on clean environment

---

## 6) Release Operations

- [ ] Version tags created
- [ ] Changelog updated
- [ ] Release artifacts published
- [ ] Announcement copy prepared
- [ ] Rollback plan prepared for bad release
- [ ] On-call coverage scheduled for launch window

---

## 7) Support Readiness

- [ ] Support channels published (issues/email/chat)
- [ ] SLA/response expectations published
- [ ] Incident triage template prepared
- [ ] Escalation ownership assigned
- [ ] FAQ seeded with common issues

---

## 8) Post-Release Monitoring Plan

- [ ] First 24h watch plan defined
- [ ] Error signals and thresholds defined
- [ ] First-week review checkpoint scheduled
- [ ] Hotfix process validated

---

## 9) Public Launch Go / No-Go

- [ ] Sections 0-8 complete
- [ ] No open release-blocking security issues
- [ ] No open release-blocking functional regressions
- [ ] Support/on-call coverage confirmed

Decision:
- [ ] GO
- [ ] NO-GO

Approver:
- Name: __________________
- Role: __________________
- Timestamp: __________________

---

## Appendix A: Minimum Public Release Bundle

- [ ] `README.md`
- [ ] `OPERATIONS_GUIDE.md`
- [ ] `RUNBOOK_NON_TECHNICAL.md`
- [ ] `PRODUCTION_READINESS_CHECKLIST.md`
- [ ] `PRODUCTION_READINESS_CHECKLIST_EXAMPLE.md`
- [ ] `PRODUCTION_READINESS_CHECKLIST_EXAMPLE_ALT_PORTS.md`
- [ ] `PUBLIC_RELEASE_READINESS_CHECKLIST.md`
- [ ] `openclaw.plugin.json`
- [ ] `CHANGELOG.md`
- [ ] `RELEASE_OPERATIONS.md`
- [ ] `ROLLBACK_DRILL_RECORD.md`
- [ ] `SECURITY_EVIDENCE_BUNDLE.md`
- [ ] `THREAT_MODEL_SUMMARY.md`
- [ ] `SECURITY_TRIAGE_LOG.md`
- [ ] `THIRD_PARTY_NOTICES.md`
- [ ] `THIRD_PARTY_NOTICES_REVIEW.md`
- [ ] `PERFORMANCE_BASELINE.md`
- [ ] `security-artifacts/SECURITY_RELEASE_INDEX.md`
