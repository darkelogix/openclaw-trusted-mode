# RELEASE_v1.0.7

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface

## 1) Release Thesis

Make blocked high-risk actions easier to understand in the OpenClaw UI without changing the underlying Guard Pro policy posture.

## 2) Enforcement Changes

- Replace the terse `LOCKDOWN_ONLY` / `UNSUPPORTED` certification block text with a clearer message.
- Explain that readonly governed validation is working and that shell/write/delete actions remain intentionally disabled on uncertified or unsupported runtimes.
- Leave the actual certification gate behavior unchanged.

## 3) Compatibility Declaration

See `COMPATIBILITY_MATRIX.md` for current declared status.

This release does not newly certify rolling OpenClaw builds. It improves user-facing denial clarity only.

## 4) Blast Radius Changes

No policy behavior change. Only the text surfaced after a certification-based block is updated.

## 5) Guard Pro Impact

- Makes the OpenClaw UI denial easier to understand during governed validation.
- Reduces confusion after a blocked delete/shell/write attempt on `LOCKDOWN_ONLY`.
- Keeps the readonly-vs-high-risk posture explicit for admins and end users.

## 6) Rollback Plan

1. Reinstall `@darkelogix/openclaw-trusted-mode@1.0.6` if the messaging change must be backed out.
2. Continue using the existing runtime validation path; policy behavior is unchanged either way.
3. Reapply `1.0.7` once the updated UX text is confirmed.

## 7) Validation Summary

Validated in current environment:
- local test suite passes
- runtime certification messaging tests pass

## 8) Adversarial Results

No new policy semantics added. Existing allow/deny behavior remains unchanged.

## 9) Performance Metrics

No performance impact expected. This release changes response text only.

## 10) Post-Release Monitoring Plan

First 48 hours:
- confirm blocked high-risk UI actions show the clearer `LOCKDOWN_ONLY` explanation
- confirm no regressions in readonly governed validation or certification gate behavior
