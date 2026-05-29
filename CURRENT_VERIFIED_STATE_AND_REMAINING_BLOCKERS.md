# Current Verified State & Remaining Blockers
**Date of Verification:** 2026-05-29 (live inspection of `C:\dev\` trees)  
**Scope:** Free adapters (codex-trusted-mode, openclaw-trusted-mode) + Sales site (darkelogix-ai-site) + Paid core (sde-enterprise)  
**Purpose:** Accurate, current snapshot for the SDE-Enterprise sales motion via dexgate.ai.

This document exists in all four repositories for cross-team visibility.

---

## Executive Summary

The conceptual architecture (Free MIT local-hardening adapters → dexgate.ai self-serve checkout → SDE-Enterprise governed PDP runtime) is sound.

**Packaging, badges, and basic SDE hot-path tier enforcement have improved** since earlier reviews.

**However, the system is not yet ready for reliable paid SDE-Enterprise license sales.** The remaining high-severity blockers are concentrated in fulfillment robustness, adapter-to-PDP trust, provenance claims, quota enforcement, and branding hygiene.

Six confirmed blockers remain that directly threaten post-purchase experience, tier credibility, and support load.

---

## Confirmed Remaining High-Priority Blockers

### 1. Free Adapter PDP Authentication Missing
- **Impact:** Any non-local PDP (i.e., real paid governed usage) is unauthenticated. Requests can be spoofed or MITM'd. Blocks credible enterprise deployments.
- **Locations:**
  - `C:\dev\codex-trusted-mode\src\pdpClient.js:20-22`
  - `C:\dev\openclaw-trusted-mode\src\index.ts:121-123`
  - `C:\dev\openclaw-trusted-mode\src\cliPdpClient.ts:17-20`
- **Current State:** Only `content-type` header. No `Authorization`, no configurable header support.

### 2. OpenClaw "Attestation" is Self-Hash Only
- **Impact:** Undermines all "provable enforcement", "trusted mode", and "signed" marketing claims for paid customers.
- **Location:** `C:\dev\openclaw-trusted-mode\src\attestation.ts:68`
- **Current State:** `expected = `sha256:${sha256Hex(packRaw)}``; direct string comparison against sibling `.sig`. Anyone who can write both files can fake it.

### 3. Checkout / Org Provisioning Fragility
- **Impact:** Duplicate organizations, failed or duplicate license provisioning, billing confusion, high support load after successful Stripe payment.
- **Locations:**
  - `C:\dev\darkelogix-ai-site\darkeweb\stripe_service.py:448-451` (`_get_or_create_checkout_org` uses `slugify(company)[:48]` for `get_or_create`)
  - `C:\dev\darkelogix-ai-site\darkeweb\stripe_service.py:192` (`provision_checkout_success` creates `ProvisioningEvent` without prior idempotency lookup)

### 4. Keygen Duplicate License Risk
- **Impact:** License sprawl, incorrect entitlements, difficult reconciliation between site and runtime.
- **Location:** `C:\dev\darkelogix-ai-site\darkeweb\keygen_client.py:263-284`
- **Current State:** When `existing_keygen_license_id` is absent, code goes straight to `POST /licenses`. No pre-lookup or conflict handling on the create path.

### 5. Activation Does Not Atomically Enforce Gateway / Environment Quotas
- **Impact:** Customers can exceed purchased tier limits. Destroys credibility of "Production / Team / Business" differentiation.
- **Locations:**
  - `C:\dev\darkelogix-ai-site\darkeweb\views.py:1124` (`runtime_activate_machine` calls `create_machine` directly)
  - `C:\dev\darkelogix-ai-site\darkeweb\runtime_secret_service.py:145` (token generation has limits, but enforcement is weak)
- **Current State:** Only special-cases Keygen machine-limit errors after the fact. No strong local pre-check against `Organization.gateway_quota` / `environment_quota`.

### 6. Branding / Terminology Cutover Incomplete
- **Impact:** Customer confusion ("Is this dexgate or Guard Pro or SDE-Enterprise?"), broken links, mixed messaging on the sales site.
- **Locations (examples):**
  - `C:\dev\darkelogix-ai-site\darkelogixProject\urls.py:23-30` (multiple `docs_guard_pro_*` route names still active)
  - `C:\dev\darkelogix-ai-site\darkelogixProject\settings.py:128` (QA slot still references `darkelogix-ai-qa.azurewebsites.net`)
  - `C:\dev\darkelogix-ai-site\darkeweb\console_data.py` and multiple templates (Guard Pro migration labels and legacy strings remain)

---

## Verified Improvements (Good Progress)

- Both free packages now publish with `"access": "public"` (`package.json` in both repos).
- OpenClaw `files` array now includes required dist artifacts.
- Both READMEs now have proper npm / MIT / CI badges at the top.
- SDE PDP now has decision volume, gateway, and environment limit enforcement in `ops/pdp_server.py` (around lines 1023, 1094, 1343).
- Commercial sync endpoint exists: `POST /v1/admin/commercial/sync` in `ops/pdp_server.py:1766`.

---

## Residual Risk (Not Yet Addressed)

**SDE Entitlements Default-Permissive Behavior**  
`C:\dev\sde-enterprise\core\sde-core\src\sde\runtime\entitlements.py`  
Module docstring explicitly states the goal is "Safe-by-default for *unconfigured* deployments: allow."  
`SDE_ENTITLEMENT_MODE` defaults to `allow_all`. Missing config or blank subject → ALLOW.  
This is a production footgun for any paid tier enforcement.

---

## Overall Assessment

**Directionally the previous synthesis was correct.**  
Packaging and basic SDE enforcement have improved.  
The remaining six blockers are real, live, and high-impact on the ability to sell and fulfill SDE-Enterprise licenses from dexgate.ai without creating significant customer pain or support burden.

**Recommendation:** Treat these six items as the new P0 gate for paid GA / broad self-serve sales.

---

*This document is intentionally duplicated across all four repositories for maximum visibility.*
