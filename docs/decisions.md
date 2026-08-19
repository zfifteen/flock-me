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
| 2026-08-18 | Do not call Have I Been Flocked until a permitted contract exists. | `robots.txt` disallows `/api/`. No supported third-party API or downloadable dataset is published. The observed `POST /api/search/text` endpoint is an implementation detail. |
| 2026-08-18 | Normalize plates as HIBF does: lowercase, trim, SHA-256, first 8 hex chars. | Verified against the production frontend. Hyphens stay. Internal spaces are invalid. Jurisdiction is not part of the key, so identical strings from different states collide. |
| 2026-08-18 | Ship a TypeScript Node runtime and a dependency-free ESM runtime. | `runtime/src/` is the typed CLI surface (`node --experimental-strip-types`). `runtime/*.mjs` runs in Node 18+ and browsers via `crypto.subtle` with no build step. Behavior must stay aligned. |
| 2026-08-18 | Persist portable state as versioned JSON with `0700` / `0600`, not encryption. | Eight hex characters are enumerable. File permissions are the v1 control. TypeScript runtime: `~/.flock-me/state.json`. ESM runtime: `$FLOCK_ME_STATE` or `$XDG_CONFIG_HOME/flock-me/state.json`. |
| 2026-08-18 | Keep live HIBF HTTP off; fail explicitly or use fixtures. | Production is `UnavailableAdapter`. Tests and rehearsal use `FixtureAdapter`. No degraded fallback search. |
| 2026-08-18 | Keep setup available before live lookups work. | Enrollment, inspection, and deletion are useful without a service contract. |
| 2026-08-18 | Default labels are `My car`, `Partner's car`, `Work truck`, then `Household van`. | Non-sensitive local nicknames that distinguish household vehicles without retaining plates. |
| 2026-08-19 | Explicit checks go through `runtime/src/cli.ts` for every harness. | Skills must not reimplement lookup. Production adapter remains `UnavailableAdapter`. `--fixture` is rehearsal-only. |
| 2026-08-19 | Keep one `skills/behavior.md` and fail CI if a `SKILL.md` body drifts. | Vendor differences belong in frontmatter and the `{{INVOKE}}` token. `scripts/check-skill-sync.mjs` is the synchronization check. |
| 2026-08-19 | Use startup-only `SessionStart` hooks on Codex, Claude Code, Grok Build, and Gemini CLI. | The hook injects a compact instruction and does no transcript parsing or lookup. Matcher is `startup` wherever the vendor documents a source. |
| 2026-08-19 | Treat Grok native SessionStart stdout as non-injecting; also install the Claude hook file. | Grok documents that passive-event stdout is ignored. Grok reads `.claude/settings.json`. |
| 2026-08-19 | Gemini automatic review must not call `activate_skill`. | Gemini has no manual-only skill field and prompts for activation consent. The SessionStart hook supplies additionalContext instead. |
| 2026-08-19 | Automatic lookup requires a `confirmed` travel verdict. | `probable` (two weak cues) is too noisy for a sensitive public-records query. Explicit invocation still bypasses travel inference. |
| 2026-08-19 | One mobility episode lasts 12 hours and allows one successful lookup for a vehicle set. | Related outing signals must not create repeated requests. Unavailable results do not consume the episode. |
| 2026-08-19 | Automatic results interrupt only for previously unseen matches, plus a one-time empty-registry setup offer. | Unavailable, no-match, and repeats stay silent so a coding session is not hijacked. |
| 2026-08-19 | Distribution remains this repository. | Marketplace/plugin wrappers can reuse the hook files later. A permitted lookup contract is the release gate. |

