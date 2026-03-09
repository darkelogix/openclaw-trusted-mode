# Third-Party Notices Review

Terminology and acronyms: [`GLOSSARY.md`](./GLOSSARY.md).

## Source Artifacts

- `THIRD_PARTY_NOTICES.md` (generated from `package-lock.json`)
- `package-lock.json`

## Review Checklist

- [ ] Notices regenerated for release candidate (`npm run generate-third-party-notices`)
- [ ] All listed dependencies reviewed for license metadata completeness
- [ ] `UNKNOWN` license entries triaged and resolved/waived
- [ ] Public license obligations validated by legal/compliance owner
- [ ] Final notices approved for public release bundle

## Open Items

| Package | Issue | Owner | Due Date | Status |
|---|---|---|---|---|
| Multiple packages in `THIRD_PARTY_NOTICES.md` | `UNKNOWN` license metadata remains unresolved and must be triaged before public release. | Compliance | Before next public release | Open |
