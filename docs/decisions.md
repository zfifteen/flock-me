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
| 2026-08-18 | Normalize plates with `trim` + `toLowerCase` before SHA-256. | Matches the Have I Been Flocked frontend observed on 2026-08-17. Hyphens stay; internal spaces are invalid. |
| 2026-08-18 | Do not mix jurisdiction into the lookup token. | The source hash is plate-string-only, so identical strings from different states collide. |
| 2026-08-18 | Implement the shared runtime as dependency-free ESM. | Node 18+ and browsers share `crypto.subtle`; harnesses can invoke it without a build step. |
| 2026-08-18 | Persist portable state as versioned JSON under XDG config. | `$FLOCK_ME_STATE` or `~/.config/flock-me/state.json` is writable across Codex, Claude Code, Grok Build, and Gemini CLI. |
| 2026-08-18 | Protect derived identifiers with `0700`/`0600` permissions, not encryption. | Eight hex characters are enumerable; encryption would imply a privacy boundary the token does not provide. |
| 2026-08-18 | Keep live HIBF HTTP off until automated access is permitted. | The observed `POST /api/search/text` contract is documented; fixtures cover match, miss, redaction, and malformed records. |
| 2026-08-18 | Keep setup available before the live service works. | Enrollment, consent, and inspect/delete do not depend on a permitted network lookup. |
| 2026-08-18 | Default labels are `My car`, `Partner's car`, `Work truck`, `Household van`. | Multiple vehicles need non-sensitive local names; labels never leave the registry. |
