# npm Publishing Checklist

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Acronym Expansions

- `SDE`: Strategic Decision Engine

## Package

- npm package name: `@darkelogix/openclaw-trusted-mode`
- license: `MIT`
- proprietary SDE runtime: not included

## Before Publish

1. Build the package:

```bash
npm run build
```

2. Verify the changelog/version pairing:

```bash
npm run verify-changelog-version
```

3. Verify the plugin schema contract:

```bash
npm run verify-plugin-schema-contract
```

4. Run the release/security checks you want to gate publication on:

```bash
npm test
npm run verify-release-artifacts
npm run verify-security-gates
```

5. Inspect the tarball contents:

```bash
npm pack --dry-run
```

## Publish Notes

- Publish only the MIT adapter/plugin package to npm.
- Do not imply that npm installation grants rights to the proprietary `sde-enterprise` runtime.
- Keep the OpenClaw plugin install docs explicit: npm is a distribution channel for the package contents, while governed operation still depends on configuration and optional SDE runtime access.

## Publish Command

```bash
npm publish --access public
```
