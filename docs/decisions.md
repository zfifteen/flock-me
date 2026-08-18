# Design Decisions

This record contains accepted product and architecture decisions. Open questions remain in [`design.md`](design.md).

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-17 | Lead with surveillance awareness and the public-record integration. | Travel detection supports the product instead of defining it. |
| 2026-08-17 | Use license plate as the sole enrollment input. | The service lookup is plate-derived; names, addresses, and vehicle descriptions do not identify the household vehicle reliably. |
| 2026-08-17 | Support multiple household vehicles. | A household can contain more than one vehicle, and travel context can leave the specific vehicle ambiguous. |
| 2026-08-17 | Persist derived vehicle identifiers across sessions. | The user should enroll each vehicle once. |
| 2026-08-17 | Discard each raw plate after local identifier derivation. | The service requires a derived lookup token, while the raw plate is unnecessary persistent data. |
| 2026-08-17 | Treat derived identifiers as sensitive. | The shortened hash is a lookup token rather than a cryptographic privacy boundary. |
| 2026-08-17 | Use exactly two activation paths. | Flock Me runs during a new-session travel review or through explicit invocation. |
| 2026-08-17 | Do not use ordinary mid-session implicit invocation. | Session-start evaluation bounds the passive reasoning overhead; the user retains direct control through the explicit command. |
| 2026-08-17 | Infer travel semantically at session start. | Household travel has many forms and cannot be represented by a reliable fixed phrase list. |
| 2026-08-17 | Limit one mobility episode to one batched service request. | Related travel evidence should not create repeated lookups. |
| 2026-08-17 | Report a match as a plate search. | Audit logs do not prove a camera sighting, location, investigation, or connection to the trip that triggered the check. |
| 2026-08-17 | Fail explicitly when an integration component is absent. | A missing adapter, state store, or verified normalization algorithm must never produce a fabricated or degraded result. |
| 2026-08-17 | Support Codex, Claude Code, Grok Build, and Gemini CLI with separate packages. | The vendors share the Agent Skills format but differ in discovery paths, invocation controls, and lifecycle integration. |
| 2026-08-17 | Keep one behavior contract across harness packages. | Vendor differences belong in frontmatter, invocation syntax, installation, and lifecycle adapters rather than product semantics. |
