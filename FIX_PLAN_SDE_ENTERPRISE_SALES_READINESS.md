# Fix Plan: SDE-Enterprise Sales Readiness
**Goal:** Make it safe, credible, and low-drama to sell SDE-Enterprise licenses from dexgate.ai, using the free MIT adapters as a healthy on-ramp.

**Date:** 2026-05-29 (based on live verification of `C:\dev\` trees)  
**Scope:** All four repositories.

This document exists in all four repositories for cross-team visibility.

---

## P0 Blockers (Gate for Paid GA / Broad Self-Serve Sales)

These six issues must be resolved before confidently driving paid traffic.

### 1. Free Adapter PDP Authentication
**Problem:** Both adapters send unauthenticated requests to the PDP.

**Impact:** Paid governed deployments are insecure. Enterprise prospects will (correctly) reject the solution.

**Suggested Approach:**
- Add support for `Authorization: Bearer <token>` (or configurable header map) in the PDP client configuration.
- Update both `pdpClient.js` (Codex) and the two clients in OpenClaw (`index.ts` + `cliPdpClient.ts`).
- Make the token configurable via the existing config mechanism (or environment variable for starters).
- Add tests that assert the header is sent when configured.

**Key Files:**
- `codex-trusted-mode/src/pdpClient.js`
- `openclaw-trusted-mode/src/index.ts`
- `openclaw-trusted-mode/src/cliPdpClient.ts`
- Related config / types files

**Owner Suggestion:** Adapter team (with input from SDE runtime team on expected auth scheme).

---

### 2. OpenClaw Attestation (Self-Hash)
**Problem:** `attestation.ts` performs a pure self-hash comparison.

**Impact:** Destroys trust in all "provable" / "trusted mode" / "signed" claims for paying customers.

**Suggested Approach (choose one):**
- **Option A (Recommended short-term):** Relabel everywhere as "Local Integrity Check" or "Tamper Detection" instead of "Attestation". Update README, plugin.json, docs, CLI output, and marketing site copy.
- **Option B (Better long-term):** Replace with real detached signatures (minisign, signify, or cosign) using a key that can be rotated and pinned.

**Key Files:**
- `openclaw-trusted-mode/src/attestation.ts`
- `openclaw-trusted-mode/attestation/trusted_mode_attest_v1.json` + `.sig`
- README, START_HERE, plugin.json, SECURITY.md, marketing site pages

---

### 3. Site Checkout & Org Provisioning Robustness
**Problem:** Duplicate orgs and missing idempotency on ProvisioningEvent.

**Impact:** Customers pay successfully then hit broken or duplicate provisioning. High support + refund risk.

**Suggested Approach:**
- In `_get_or_create_checkout_org`: Add pre-check by Stripe customer ID or verified email before falling back to slugified company name.
- Make `provision_checkout_success` transactional.
- Add uniqueness constraint or pre-lookup on `(organization, external_reference)` for `ProvisioningEvent`.
- Consider using Stripe's `idempotency_key` more aggressively.

**Key Files:**
- `darkelogix-ai-site/darkeweb/stripe_service.py` (especially `_get_or_create_checkout_org` and `provision_checkout_success`)
- Related models and views

---

### 4. Keygen Duplicate License Handling
**Problem:** `sync_license` creates new licenses via POST when no local ID exists, with no conflict resolution.

**Impact:** License sprawl and incorrect entitlements, difficult reconciliation between site and runtime.

**Suggested Approach:**
- Before POST, attempt a lookup using metadata (tenant + plan + slug) or other stable identifier.
- On 409 conflict from Keygen, fetch the existing license and return it.
- Add a unique constraint / upsert path at the application level for `(organization, slug)`.

**Key Files:**
- `darkelogix-ai-site/darkeweb/keygen_client.py` (`sync_license` method)
- `darkelogix-ai-site/darkeweb/keygen_service.py`

---

### 5. Atomic Quota Enforcement on Machine Activation
**Problem:** Activation calls Keygen `create_machine` without strong local pre-check against purchased quotas.

**Impact:** Customers can exceed "Production / Team / Business" limits. Tier differentiation becomes meaningless.

**Suggested Approach:**
- Before calling `create_machine`, perform an atomic check + increment on `Organization.gateway_used` / `environment_used` inside a transaction (`select_for_update` + F expressions).
- Only proceed to Keygen if the local quota allows it.
- Return a clear "quota exceeded" error to the runtime if the check fails.
- Consider moving more quota logic into the signed runtime license token.

**Key Files:**
- `darkelogix-ai-site/darkeweb/views.py` (`runtime_activate_machine`)
- `darkelogix-ai-site/darkeweb/runtime_secret_service.py`
- `darkelogix-ai-site/darkeweb/models.py` (Organization quotas)

---

### 6. Branding & Terminology Cutover
**Problem:** Mixed "Guard Pro", "dexgate", "SDE-Enterprise", and legacy darkelogix references.

**Impact:** Customer confusion and unprofessional appearance during the critical sales and onboarding experience.

**Suggested Approach:**
- Audit and replace/alias all remaining `guard-pro` route names and view functions.
- Update `settings.py` ALLOWED_HOSTS and any legacy host lists.
- Run a full string search for "Guard Pro", "guard-pro", "darkelogix" (case-insensitive) across templates, docs, and code.
- Decide on clear naming: "dexgate" for self-serve paid tiers, "SDE-Enterprise" for the underlying platform / enterprise contracts.
- Update the branding transition matrix and add a pre-deploy linter step.

**Key Files (starting points):**
- `darkelogix-ai-site/darkelogixProject/urls.py`
- `darkelogix-ai-site/darkelogixProject/settings.py`
- `darkelogix-ai-site/darkeweb/console_data.py`
- All `templates/` and `static/resources/` containing old names
- Marketing copy on pricing.html, comparison.html, etc.

---

## P1 Items (Strongly Recommended Before Broad Enterprise Sales)

- Add provenance / watermark fields on successful PDP decisions (especially from any demo or mock path).
- Improve error messaging and failure surfaces in activation and secret download flows.
- Make default-permissive entitlement paths in SDE-Enterprise impossible in production (fail-closed when config is missing).
- Add cross-repo decision equivalence tests between free engine logic and paid pack shims.
- Publish auditable hardened Dockerfiles + SBOM + key rotation procedures with runtime bundles.
- Expand customer console with secret rotation and usage reporting (leveraging existing observability primitives).

---

## Cross-Repo Coordination Notes

- The free adapters (P0 #1 and #2) must align with expectations from the SDE runtime team.
- Site provisioning and quota work (P0 #3, #4, #5) must be coordinated with how `runtime-license.json` and the PDP consume the data.
- Branding (P0 #6) affects the entire customer journey from the marketing site through console and docs.

**Recommended Tracking:**
- Create one epic with six child tickets (one per P0).
- Link this FIX_PLAN and the CURRENT_VERIFIED_STATE document in each ticket.
- Require sign-off on each P0 before removing the "paid sales gate" label.

---

## Success Criteria

- A new paying customer can complete checkout on dexgate.ai and successfully activate a governed runtime without manual intervention or duplicate artifacts.
- Tier limits (gateways / environments / decisions) are actually enforced.
- PDP calls from the free adapters are authenticated when talking to real paid infrastructure.
- "dexgate" branding is consistent and professional across the entire experience.
- No customer can reasonably claim they exceeded their purchased tier without hitting a clear error.

---

*This document is intentionally duplicated across all four repositories for maximum visibility.*
