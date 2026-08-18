# Plate normalization

Verified 2026-08-18 against the Have I Been Flocked production frontend (`async function f1` in `/assets/chunk.CC18R3VA.js`) and the public footnote that the identifier is the first eight characters of the plate's SHA-256 hash.

## Algorithm

1. Reject empty input.
2. Reject an eight-character hex string. Enrollment accepts a plate, not an identifier.
3. Reject any character outside `[A-Za-z0-9-]`. Internal spaces are invalid. Hyphens are allowed and significant.
4. Reject plates longer than 10 characters (HIBF input `maxlength`).
5. Normalize: `toLowerCase()` then `trim()`.
6. Derive: SHA-256 of the UTF-8 bytes, lowercase hex, first 8 characters.

```ts
const normalized = plate.toLowerCase().trim();
const identifier = sha256(normalized).slice(0, 8);
```

## Deterministic vectors

These plates are synthetic and non-sensitive.

| Input | Normalized | Identifier |
| --- | --- | --- |
| `TESTPLATE` | `testplate` | `d2097ce6` |
| `  TESTPLATE  ` | `testplate` | `d2097ce6` |
| `ABC-123` | `abc-123` | `5942d94f` |
| `ABC123` | `abc123` | `6ca13d52` |
| `SAMPLE1` | `sample1` | `e8513079` |
| `ZZZ9999` | `zzz9999` | `0aff44a7` |

`ABC-123` and `ABC123` are different identities.

## Jurisdictions

HIBF does not include a state, country, or issuing-authority prefix. Identical normalized plate strings from different jurisdictions produce the same identifier and cannot be disambiguated.

## Lookup-time lookalikes

HIBF expands `O`/`0` and `I`/`1` into up to 10 variants (`m1`) and hashes each before `POST /api/search/text`. Enrollment stores only the identifier of the plate the user typed. `confusionVariants()` reproduces the search-time expansion for a future permitted adapter.

## Implementation

`runtime/src/normalize.ts`
