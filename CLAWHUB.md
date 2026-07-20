# ClawHub discovery for DexGate OpenClaw Adapter

ClawHub is OpenClawΓÇÖs public plugin discovery surface (`openclaw plugins search`,
Control UI **Discover**, and `clawhub:` installs). Public npm already ships this
package; ClawHub listing improves findability for users who do not already know
`@dexgate/openclaw-trusted-mode`.

## User install (after ClawHub listing is live)

```bash
# Search
openclaw plugins search "dexgate"
openclaw plugins search "trusted mode"

# Prefer explicit source prefixes
openclaw plugins install clawhub:@dexgate/openclaw-trusted-mode
# or npm directly
openclaw plugins install npm:@dexgate/openclaw-trusted-mode@1.0.8

openclaw plugins enable openclaw-trusted-mode
openclaw plugins inspect openclaw-trusted-mode
npx openclaw-local-hardening-check
```

Free path remains local hard gate only (no Passport). Paid path still requires a
licensed DexGate runtime + configure step (see `START_HERE.md`).

## Maintainer: validate before publish

```bash
npm i -g clawhub
npm run build
clawhub package validate .
clawhub package publish . --dry-run --owner dexgate
```

## Maintainer: publish to ClawHub

Prerequisites:

1. ClawHub publisher/owner handle **`dexgate`** (scope must match `@dexgate/...`).
2. Auth: `clawhub login` (device flow) or `CLAWHUB_TOKEN` in CI.
3. Git checkout with clean source commit metadata preferred.

```bash
clawhub login
clawhub whoami
clawhub package publish . \
  --owner dexgate \
  --name @dexgate/openclaw-trusted-mode \
  --display-name "DexGate OpenClaw Adapter" \
  --version 1.0.8 \
  --changelog "ClawHub discovery metadata and install hints for public pilot." \
  --tags latest \
  --categories security,governance \
  --topics openclaw,trusted-mode,local-hardening,dexgate \
  --source-repo darkelogix/openclaw-trusted-mode
```

Notes:

- New releases may stay out of public install surfaces until ClawHub automated
  security review finishes.
- npm remain the durable artifact store; ClawHub is discovery + scan metadata.
- Do not claim official OpenClaw first-party catalog listing (`@openclaw/*`)
  unless OpenClaw maintainers add it.

## Claims discipline

When describing ClawHub listing:

- Say: ΓÇ£listed on ClawHub / installable via `clawhub:` or `npm:`ΓÇ¥.
- Do not say: ΓÇ£official OpenClaw certified pluginΓÇ¥ or ΓÇ£OpenClaw-endorsedΓÇ¥.
- Free install still does not mint Passports or grant SDE runtime access.
