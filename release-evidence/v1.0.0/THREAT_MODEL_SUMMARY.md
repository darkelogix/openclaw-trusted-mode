# Threat Model Summary

## Scope

Components:
- OpenClaw Trusted Mode plugin (PEP)
- SDE-PDP authorization service (PDP)
- Signed policy packs and attestation pack artifacts

## Trust Boundaries

1. OpenClaw runtime -> PDP API (`/v1/authorize`)
2. PDP -> policy pack/signature files
3. Operator workflows -> release and configuration artifacts

## High-Risk Threats

1. Enforcement bypass:
   - Plugin interception disabled or bypassed.
   - Mitigation: Trusted Mode Check + lock-down certification behavior.
2. Policy integrity compromise:
   - Unsigned or tampered policy/attestation pack accepted.
   - Mitigation: signature verification + fail-closed behavior.
3. PDP availability failure:
   - Fetch failures lead to decision gaps.
   - Mitigation: fail-closed default, explicit remediation paths.
4. Tenant entitlement abuse:
   - Unauthorized tenant invokes governed SKU.
   - Mitigation: entitlement deny logic in PDP.
5. Artifact tampering:
   - Release files modified after build.
   - Mitigation: checksums + release manifest publication.

## Residual Risks

- Insider access to signing pipeline.
- Misconfigured deployment network exposing PDP publicly.
- Incomplete third-party license metadata in dependencies with unknown license field.

## Next Hardening Actions

- Add stronger cryptographic signing for release artifacts (beyond checksum).
- Add adversarial regression automation for schema tampering and version mismatch.
- Add periodic threat model review at each major release.
