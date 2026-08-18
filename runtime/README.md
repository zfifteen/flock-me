# Flock Me runtime

Portable TypeScript-compatible ESM for Node 18+ and browsers (`crypto.subtle`).

This is the shared implementation language for the household registry, plate
normalization, fixture adapter, and atomic JSON state. Harness skill packages
stay documentation-only until their hooks exist.

```sh
node --test runtime/test/*.test.mjs
```

## Modules

| File | Role |
| --- | --- |
| `plate.mjs` | Observed HIBF normalization + SHA-256 lookup tokens |
| `registry.mjs` | Enroll / list / rename / remove / clear, labels, duplicates |
| `state.mjs` | XDG JSON store, `0600`, atomic rename, exclusive lock |
| `adapter.mjs` | Observed `/api/search/text` contract + fixtures; live HTTP off |
| `audit.mjs` | Stable record ids and meaning disclaimers |
| `copy.mjs` | Setup offer, consent, default labels |

## Persistence

1. `$FLOCK_ME_STATE`
2. `$XDG_CONFIG_HOME/flock-me/state.json`
3. `~/.config/flock-me/state.json`

No raw plates. No encryption of 8-character tokens — they are lookup keys.
Directory `0700`, file `0600`. A second writer fails with `concurrent-session`.
