# Flock Me runtime

Two aligned implementations of the same contract: plate normalization, household
registry, fixture / unavailable adapter, atomic JSON state, and explicit checks.
Harness skill packages invoke the TypeScript CLI. Startup-only `SessionStart`
hooks call `session-start` and inject a review instruction. They do not lookup.

| Surface | Use | Test |
| --- | --- | --- |
| `src/` TypeScript | CLI / harness (`node --experimental-strip-types`, Node 22+) | `cd runtime && npm test` |
| `*.mjs` ESM | Node 18+ and browsers via `crypto.subtle`, no build | `node --test runtime/test/*.test.mjs` |

## Explicit-check CLI

From the repository root:

```
node --experimental-strip-types runtime/src/cli.ts <command>
./runtime/flock-me <command>
```

`check` is the default command. It selects every enrolled household vehicle and
does not require travel evidence. Production uses `UnavailableAdapter`. Rehearsal
uses `--fixture runtime/fixtures/rehearsal.json`. Commands are documented in
[`docs/commands.md`](../docs/commands.md).

## TypeScript modules (`src/`)

| File | Role |
| --- | --- |
| `cli.ts` | Harness CLI: setup, add, list, rename, remove, clear, check, review, checkpoint, session-start, inspect, delete-data |
| `check.ts` | Explicit and session-mode lookup workflow |
| `session.ts` | Startup-only source gating, checkpoints, mobility episodes, hook output |
| `travel.ts` | Semantic travel rubric used by fixtures |
| `normalize.ts` | Observed HIBF normalization + SHA-256 lookup tokens |
| `registry.ts` | Enroll / list / rename / remove / clear, consent, labels |
| `state.ts` | `~/.flock-me/state.json` or `$FLOCK_ME_STATE`, `0600`, atomic rename |
| `adapter.ts` | `UnavailableAdapter` (production) + `FixtureAdapter` |
| `audit-id.ts` / `seen.ts` | Stable record ids and previously-seen tracking |
| `copy.ts` | Setup offer, consent, default labels |

## ESM modules

| File | Role |
| --- | --- |
| `plate.mjs` | Same normalization + lookup tokens |
| `registry.mjs` | Enroll / list / rename / remove / clear, labels, duplicates |
| `state.mjs` | XDG JSON store, `0600`, atomic rename, exclusive lock |
| `adapter.mjs` | Observed `/api/search/text` contract + fixtures; live HTTP off |
| `audit.mjs` | Stable record ids and meaning disclaimers |
| `copy.mjs` | Setup offer, consent, default labels |

## Persistence

TypeScript runtime: `$FLOCK_ME_STATE` or `~/.flock-me/state.json`.

ESM runtime:

1. `$FLOCK_ME_STATE`
2. `$XDG_CONFIG_HOME/flock-me/state.json`
3. `~/.config/flock-me/state.json`

No raw plates. No encryption of 8-character tokens — they are lookup keys.
Directory `0700`, file `0600`. A second ESM writer fails with `concurrent-session`.
