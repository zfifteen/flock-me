# Roadmap

Flock Me currently has product requirements, architecture boundaries, harness-specific skill packages, installation routing, project documentation, a TypeScript runtime, a dependency-free ESM runtime for plate normalization, household enrollment, state, and an explicit-fail service adapter, an explicit-check CLI wired through every harness, and startup-only SessionStart hooks that inject a new-session travel review. Live Have I Been Flocked lookups remain unavailable until a permitted contract exists.

## Critical path

- [x] ~~Confirm whether Have I Been Flocked permits automated access.~~
- [x] ~~Identify a supported API, downloadable dataset, or obtain permission to use the observed internal endpoint.~~
- [x] ~~Verify the exact plate-normalization algorithm with deterministic test vectors.~~
- [x] ~~Determine how identical plate strings from different jurisdictions are handled.~~
- [x] ~~Establish request limits, batching limits, and the response schema.~~
- [x] ~~Choose the shared implementation runtime.~~
- [x] ~~Choose the portable persistent-state location and format.~~
- [x] ~~Decide whether derived plate identifiers require encryption or restrictive file permissions.~~

## Core implementation

- [x] ~~Implement deterministic plate normalization and identifier derivation.~~
- [x] ~~Implement household vehicle enrollment.~~
- [x] ~~Implement multiple-vehicle labels and duplicate detection.~~
- [x] ~~Implement list, add, rename, remove, and clear operations.~~
- [x] ~~Implement the Have I Been Flocked service adapter.~~
- [x] ~~Define stable audit-record identifiers for deduplication.~~
- [x] ~~Implement previously seen result tracking.~~
- [x] ~~Implement atomic state writes and protect against concurrent harness sessions.~~
- [x] ~~Implement explicit check behavior for every harness.~~
- [x] ~~Handle unavailable services, malformed responses, and missing state explicitly.~~
- [x] ~~Ensure raw license plates never enter logs or persistent storage.~~

## Session-start behavior

- [x] ~~Research lifecycle-hook specifications for Codex, Claude Code, Grok Build, and Gemini CLI.~~
- [x] ~~Implement startup-only hooks for all four harnesses.~~
- [x] ~~Determine what history, transcripts, and memory each harness exposes.~~
- [x] ~~Define the session-review checkpoint.~~
- [x] ~~Define deterministic mobility-episode boundaries.~~
- [x] ~~Create the semantic travel-detection rubric.~~
- [x] ~~Decide the confidence threshold for triggering a lookup.~~
- [x] ~~Decide which vehicle to check when context is ambiguous.~~
- [x] ~~Prevent repeated checks for one travel episode.~~
- [x] ~~Define when an automatic result should interrupt the current conversation.~~
- [x] ~~Resolve Gemini's activation-consent limitation for passive checks.~~

## Onboarding and privacy

- [x] ~~Write the first-session setup offer.~~
- [x] ~~Define explicit enrollment-consent language.~~
- [x] ~~Define default vehicle labels.~~
- [x] ~~Provide a way to inspect and delete all locally stored Flock Me data.~~
- [x] ~~Write the local-data and threat-model document.~~
- [x] ~~Establish secure file permissions and log-redaction rules.~~
- [x] ~~Decide whether setup remains available before the service integration is operational.~~

## Testing

- [x] ~~Add normalization and hashing test vectors.~~
- [x] ~~Add registry and state-migration tests.~~
- [x] ~~Add adapter fixtures for matches, no matches, redactions, and malformed records.~~
- [x] ~~Test multiple-vehicle batching.~~
- [x] ~~Test audit-record deduplication.~~
- [x] ~~Create travel-context fixtures covering direct, indirect, ambiguous, and absent travel.~~
- [x] ~~Test session checkpoints and repeated-session behavior.~~
- [ ] Add harness-specific discovery and invocation tests.
- [ ] Add complete end-to-end tests using non-sensitive test plates.
- [x] ~~Verify that every result preserves the exact audit-record meaning and dataset limitations.~~

## Packaging and installation

- [x] ~~Extend `AGENTS.md` to install hooks and runtime components after they exist.~~
- [x] ~~Add a synchronization check so the four `SKILL.md` behavior sections cannot drift.~~
- [x] ~~Add harness-specific hook configuration packages.~~
- [ ] Test user-level and project-level installation for every harness.
- [x] ~~Define uninstall and upgrade behavior.~~
- [x] ~~Add compatibility requirements and minimum harness versions.~~
- [x] ~~Decide whether distribution remains repository-based or uses vendor plugin and marketplace formats.~~

## Documentation and release

- [ ] Replace draft installation language after the integration works.
- [x] ~~Add setup and usage examples.~~
- [x] ~~Document every command and expected result.~~
- [x] ~~Add a security and privacy section to the README.~~
- [x] ~~Add troubleshooting instructions.~~
- [x] ~~Choose an open-source license and add `LICENSE`.~~
- [ ] Add contribution guidance when outside contributions are desired.
- [x] ~~Add continuous integration for validation and cross-package consistency.~~
- [ ] Create the release checklist and versioning policy.
- [ ] Perform a clean-machine installation test.
- [ ] Publish and tag the first operational release.

## Recommended next milestone

Add harness-specific discovery and invocation tests, then a clean-machine installation test of the skill plus startup-only hooks. Live lookups remain blocked on a permitted Have I Been Flocked contract.
