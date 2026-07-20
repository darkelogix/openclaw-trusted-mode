# ClawHub discovery for DexGate OpenClaw Adapter

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine
- `CI`: Continuous Integration
- `CLI`: Command Line Interface
- `PDP`: Policy Decision Point

ClawHub is OpenClaw's public plugin discovery surface (`openclaw plugins search`,
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
openclaw plugins install npm:@dexgate/openclaw-trusted-mode

openclaw plugins enable openclaw-trusted-mode
openclaw plugins inspect openclaw-trusted-mode
npx openclaw-local-hardening-check
```

Free path remains local hard gate only (no Passport). Paid path still requires a
licensed DexGate (Strategic Decision Engine (SDE) / Policy Decision Point (PDP))
runtime plus configure step (see `START_HERE.md`).

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
2. Auth: `clawhub login` (device flow) or `CLAWHUB_TOKEN` in Continuous Integration (CI).
3. Git checkout with clean source commit metadata preferred.

```bash
clawhub login
clawhub whoami
clawhub package publish . \
  --owner dexgate \
  --name @dexgate/openclaw-trusted-mode \
  --display-name "DexGate OpenClaw Adapter" \
  --changelog "ClawHub discovery metadata and install hints for public pilot." \
  --tags latest \
  --categories security,governance \
  --topics openclaw,trusted-mode,local-hardening,dexgate \
  --source-repo darkelogix/openclaw-trusted-mode
```

Notes:

- New releases may stay out of public install surfaces until ClawHub automated
  security review finishes.
- npm remains the durable artifact store; ClawHub is discovery plus scan metadata.
- Do not claim official OpenClaw first-party catalog listing (`@openclaw/*`)
  unless OpenClaw maintainers add it.

## Claims discipline

When describing ClawHub listing:

- Say: "listed on ClawHub / installable via `clawhub:` or `npm:`".
- Do not say: "official OpenClaw certified plugin" or "OpenClaw-endorsed".
- Free install still does not mint Passports or grant SDE runtime access.
