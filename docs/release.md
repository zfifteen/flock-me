# Release checklist and versioning policy

Flock Me stays repository-distributed until a permitted Have I Been Flocked contract exists. This document defines how versions are chosen and what must be true before a tag.

## Versioning policy

- **Scheme:** Semantic Versioning 2.0.0 (`MAJOR.MINOR.PATCH`).
- **Pre-operational:** While live lookups are blocked, tags use the `0.y.z` series. The runtime `package.json` currently reports `0.1.0`; bump it only when the tagged release changes runtime behavior or the public skill contract.
- **MAJOR (x.0.0):** Incompatible change to the skill behavior contract, CLI command surface, state schema that cannot be migrated automatically, or removal of a supported harness.
- **MINOR (0.y.0 or x.y.0):** New backward-compatible capability (new command, new harness package, expanded fixtures, improved travel rubric) that does not break existing installs.
- **PATCH (x.y.z):** Bug fixes, documentation, test-only changes, hook text clarifications that do not alter activation semantics.
- **Tags:** Annotated tags of the form `v0.1.0`. The tag message must name the roadmap items closed by the release.
- **Changelog:** Maintain a short `CHANGELOG.md` entry per tagged release. Prefer “what the user notices” over internal refactors.
- **No marketplace/plugin packages** until the service contract is open and the first operational (non-0.x or explicitly marked operational) release lands.

## Release checklist

Run every item before creating a tag. Check the box only when the evidence is in the repo or CI log.

### Pre-tag validation

- [ ] `node scripts/check-skill-sync.mjs` passes.
- [ ] `node scripts/check-hooks.mjs` passes.
- [ ] `node scripts/check-discovery.mjs` passes.
- [ ] Runtime tests pass: `cd runtime && npm test` (Node ≥ 22, `--experimental-strip-types`).
- [ ] CI workflow on the release candidate commit is green.
- [ ] `docs/roadmap.md` reflects completed work with `[x]` and strikethrough; remaining items are accurate.
- [ ] No live HTTP calls to Have I Been Flocked appear in code paths that can run in normal operation.
- [ ] Raw plates are never logged or written to state (spot-check enroll / check / inspect paths).

### Documentation and packaging

- [ ] README status paragraph matches reality (live lookups still blocked until contract exists).
- [ ] `AGENTS.md` install / upgrade / uninstall steps match the current skill and hook packages.
- [ ] `docs/commands.md` and `docs/usage.md` cover every CLI command that ships.
- [ ] Compatibility table in `AGENTS.md` lists minimum harness versions that are still accurate.
- [ ] LICENSE and CONTRIBUTING.md are present and current.

### Installation smoke (clean machine or clean home)

- [ ] User-level install of skill + SessionStart hook succeeds for at least one harness (prefer the harness under active development).
- [ ] Discovery / invocation check from `AGENTS.md` succeeds after install.
- [ ] Uninstall removes only the Flock Me skill directory and the Flock Me SessionStart matcher; other hooks remain.
- [ ] `delete-data --confirm` removes local state when requested; default path is never wiped without confirmation.

### Tag and publish

- [ ] Bump `runtime/package.json` version if the release changes runtime behavior.
- [ ] Write the CHANGELOG entry.
- [ ] Create annotated tag `vX.Y.Z` on the merge commit that lands the release.
- [ ] Push the tag.
- [ ] Open a short GitHub release note pointing at the tag, CHANGELOG, and any remaining blockers (especially the service contract).

### After the first operational release

- [ ] Revisit distribution: keep repository-only or add vendor plugin / marketplace packages only after the permitted lookup contract is documented in the roadmap.
- [ ] Update CONTRIBUTING.md if outside contributions are invited.

## Notes

Clean-machine installation tests and full end-to-end tests with non-sensitive plates remain separate roadmap items. This checklist is the gate for any tagged release; it does not replace those tests.
