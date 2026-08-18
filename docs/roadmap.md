# Roadmap

Flock Me currently has product requirements, architecture boundaries, harness-specific skill packages, installation routing, and project documentation. The runtime integration is not operational.

## Critical path

- [ ] Confirm whether Have I Been Flocked permits automated access.
- [ ] Identify a supported API, downloadable dataset, or obtain permission to use the observed internal endpoint.
- [ ] Verify the exact plate-normalization algorithm with deterministic test vectors.
- [ ] Determine how identical plate strings from different jurisdictions are handled.
- [ ] Establish request limits, batching limits, and the response schema.
- [ ] Choose the shared implementation runtime.
- [ ] Choose the portable persistent-state location and format.
- [ ] Decide whether derived plate identifiers require encryption or restrictive file permissions.

## Core implementation

- [ ] Implement deterministic plate normalization and identifier derivation.
- [ ] Implement household vehicle enrollment.
- [ ] Implement multiple-vehicle labels and duplicate detection.
- [ ] Implement list, add, rename, remove, and clear operations.
- [ ] Implement the Have I Been Flocked service adapter.
- [ ] Define stable audit-record identifiers for deduplication.
- [ ] Implement previously seen result tracking.
- [ ] Implement atomic state writes and protect against concurrent harness sessions.
- [ ] Implement explicit check behavior for every harness.
- [ ] Handle unavailable services, malformed responses, and missing state explicitly.
- [ ] Ensure raw license plates never enter logs or persistent storage.

## Session-start behavior

- [ ] Research lifecycle-hook specifications for Codex, Claude Code, Grok Build, and Gemini CLI.
- [ ] Implement startup-only hooks for all four harnesses.
- [ ] Determine what history, transcripts, and memory each harness exposes.
- [ ] Define the session-review checkpoint.
- [ ] Define deterministic mobility-episode boundaries.
- [ ] Create the semantic travel-detection rubric.
- [ ] Decide the confidence threshold for triggering a lookup.
- [ ] Decide which vehicle to check when context is ambiguous.
- [ ] Prevent repeated checks for one travel episode.
- [ ] Define when an automatic result should interrupt the current conversation.
- [ ] Resolve Gemini's activation-consent limitation for passive checks.

## Onboarding and privacy

- [ ] Write the first-session setup offer.
- [ ] Define explicit enrollment-consent language.
- [ ] Define default vehicle labels.
- [ ] Provide a way to inspect and delete all locally stored Flock Me data.
- [ ] Write the local-data and threat-model document.
- [ ] Establish secure file permissions and log-redaction rules.
- [ ] Decide whether setup remains available before the service integration is operational.

## Testing

- [ ] Add normalization and hashing test vectors.
- [ ] Add registry and state-migration tests.
- [ ] Add adapter fixtures for matches, no matches, redactions, and malformed records.
- [ ] Test multiple-vehicle batching.
- [ ] Test audit-record deduplication.
- [ ] Create travel-context fixtures covering direct, indirect, ambiguous, and absent travel.
- [ ] Test session checkpoints and repeated-session behavior.
- [ ] Add harness-specific discovery and invocation tests.
- [ ] Add complete end-to-end tests using non-sensitive test plates.
- [ ] Verify that every result preserves the exact audit-record meaning and dataset limitations.

## Packaging and installation

- [ ] Extend `AGENTS.md` to install hooks and runtime components after they exist.
- [ ] Add a synchronization check so the four `SKILL.md` behavior sections cannot drift.
- [ ] Add harness-specific hook configuration packages.
- [ ] Test user-level and project-level installation for every harness.
- [ ] Define uninstall and upgrade behavior.
- [ ] Add compatibility requirements and minimum harness versions.
- [ ] Decide whether distribution remains repository-based or uses vendor plugin and marketplace formats.

## Documentation and release

- [ ] Replace draft installation language after the integration works.
- [ ] Add setup and usage examples.
- [ ] Document every command and expected result.
- [ ] Add a security and privacy section to the README.
- [ ] Add troubleshooting instructions.
- [ ] Choose an open-source license and add `LICENSE`.
- [ ] Add contribution guidance when outside contributions are desired.
- [ ] Add continuous integration for validation and cross-package consistency.
- [ ] Create the release checklist and versioning policy.
- [ ] Perform a clean-machine installation test.
- [ ] Publish and tag the first operational release.

## Recommended next milestone

Resolve the service integration contract and plate-normalization algorithm together. Every operational workflow depends on knowing how a plate becomes a valid, permitted lookup.
