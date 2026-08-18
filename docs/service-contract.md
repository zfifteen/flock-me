# Observed Have I Been Flocked contract

Observed 2026-08-17. Not a supported third-party API. Automated access is unconfirmed.

## Search

```
POST https://haveibeenflocked.com/api/search/text
Content-Type: application/json

{ "plates": ["dabe815c"], "cursor": null }
```

`plates` is an array of 8-character hex lookup ids. A raw plate is rejected.

### Responses

| Status | Meaning |
| --- | --- |
| 200 | `{ results, nextCursor, hasMore, total }` |
| 404 | Treat as an empty result set |
| 429 | Rate limited. Body is a plain-text retry message |
| other | `{ error: string }` |

Batching: one request per mobility episode, containing every selected household identifier.

## Flock Me adapter policy

`LIVE_LOOKUP_ENABLED` is `false`. Checks use fixtures so enrollment and
deduplication can be exercised without sending tokens to a third party.
Unavailable, malformed, and missing-registry states fail explicitly.
