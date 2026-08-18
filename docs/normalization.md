# Plate normalization

Observed 2026-08-17 from the Have I Been Flocked frontend (`f1` / `crypto.subtle`).

```
identifier = sha256(utf8(trim(plate).toLowerCase())).hex()[0:8]
```

- Hyphens are kept.
- Internal spaces are invalid (not stripped).
- Maximum length is 10 characters; allowed charset is `A–Z a–z 0–9 -`.
- An 8-character hex string is treated as an already-derived identifier.
- Values `redacted`, `***`, `b68919af`, and `596f4162` are redaction markers.
- Search-time only: `O`/`0` and `I`/`1` lookalikes, capped at 10 variants, each hashed.
- No jurisdiction is mixed into the hash. Identical plate strings from different states collide.

Deterministic vectors live in `runtime/test/plate.test.mjs`.
