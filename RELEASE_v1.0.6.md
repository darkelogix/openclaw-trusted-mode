# RELEASE_v1.0.6

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `PDP`: Policy Decision Point
- `CLI`: Command Line Interface

## 1) Release Thesis

Fix the current OpenClaw hook-only runtime path where the plugin loads successfully but the gateway does not inject the configured plugin entry into `api.config`.

## 2) Enforcement Changes

- Add a runtime fallback that reads `plugins.entries.openclaw-trusted-mode.config` from `OPENCLAW_CONFIG_PATH` or `~/.openclaw/openclaw.json`.
- Merge that fallback config with any values OpenClaw does provide in `api.config`, without overwriting defined in-memory values.
- Publish the fallback module in the npm tarball and cover it with adapter tests.

## 3) Compatibility Declaration

See `COMPATIBILITY_MATRIX.md` for current declared status.

This release does not newly certify rolling OpenClaw builds. It fixes a runtime config-handoff defect on the current hook-only path.

## 4) Blast Radius Changes

Low functional blast radius. Policy semantics remain unchanged after configuration is loaded; the release changes how the plugin resolves its runtime config when OpenClaw fails to pass it directly.

## 5) Guard Pro Impact

- Restores governed-mode startup on the current Windows VM path after `openclaw-trusted-mode-configure` writes the host config.
- Removes the false `ALLOWLIST_ONLY requires non-empty allowedTools` startup error when the actual `openclaw.json` entry is already governed-mode.
- Keeps the helper-driven config flow usable on current OpenClaw builds while the upstream hook-only config behavior remains inconsistent.

## 6) Rollback Plan

1. Reinstall `@darkelogix/openclaw-trusted-mode@1.0.5` if the runtime fallback must be backed out.
2. Use manual OpenClaw debugging only as a temporary workaround.
3. Reapply `1.0.6` once gateway startup confirms the governed config is being read correctly.

## 7) Validation Summary

Validated in current environment:
- TypeScript build passes
- local test suite passes
- plugin schema contract check passes
- dry-run npm pack includes the runtime fallback module

## 8) Adversarial Results

No new policy semantics added. Existing allow/deny behavior remains unchanged.

## 9) Performance Metrics

Negligible startup-only overhead from reading the local OpenClaw config file when `api.config` is incomplete. No expected runtime decision-path performance change.

## 10) Post-Release Monitoring Plan

First 48 hours:
- confirm the current Windows VM stops logging the false `ALLOWLIST_ONLY` hardening error after reinstall and restart
- confirm `openclaw-trusted-mode-check` still reaches `LOCKDOWN_ONLY` on uncertified OpenClaw builds
- confirm the fallback respects `OPENCLAW_CONFIG_PATH` for non-default profiles
