# Flock Me runtime

Two aligned implementations of the same contract: plate normalization, household
registry, fixture / unavailable adapter, and atomic JSON state. Harness skill
packages stay documentation-only until their hooks exist.

| Surface | Use | Test |
| --- | --- | --- |
| `src/` TypeScript | CLI / harness (`node --experimental-strip-types`, Node 22+) | `cd runtime && npm test` |
| `*.mjs` ESM | Node 18+ and browsers via `crypto.subtle`, no build | `node --test runtime/test/*.test.mjs` |

## TypeScript modules (`src/`)

| File | Role |
| --- | --- |
| `normalize.ts` | Observed HIBF normalization + SHA-256 lookup tokens |
| `registry.ts` | Enroll / list / rename / remove / clear, consent, labels |
| `state.ts` | `~/.flock-me/state.json`, `0600`, atomic rename |
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

TypeScript runtime: `~/.flock-me/state.json`.

ESM runtime:

1. `$FLOCK_ME_STATE`
2. `$XDG_CONFIG_HOME/flock-me/state.json`
3. `~/.config/flock-me/state.json`

No raw plates. No encryption of 8-character tokens — they are lookup keys.
Directory `0700`, file `0600`. A second ESM writer fails with `concurrent-session`.
