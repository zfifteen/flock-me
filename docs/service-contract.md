# Have I Been Flocked service contract

Research date: 2026-08-18.

## Automated access

Have I Been Flocked does **not** permit automated access to its lookup API.

- `https://haveibeenflocked.com/robots.txt` includes `Disallow: /api/` and `Crawl-delay: 1`.
- No published third-party API, SDK, or downloadable plate-search dataset was found.
- The privacy policy describes visitor logging. It does not grant programmatic search rights.
- The observed internal endpoint is an implementation detail, not a supported contract.

Flock Me therefore **must not** call `haveibeenflocked.com`. The production adapter is `UnavailableAdapter`, which fails explicitly.

## Observed internal interface (not to be used)

Frontend search, observed 2026-08-18:

```
POST /api/search/text
Content-Type: application/json

{ "plates": ["d2097ce6"], "cursor": null }
```

- `plates` is an array of eight-character hexadecimal identifiers. A raw plate is rejected.
- Success body: `{ results, nextCursor, hasMore, total }`.
- HTTP 429: rate limited. Body text is shown to the user.
- HTTP 404: treated as an empty result set.
- HTTP 200 with `results: []`: no match in the available public dataset.

Result columns used by the site include search time, searching agency, operator, identifier, devices searched, networks searched, reason, case number, search type, text prompt, and redaction markers.

## Batching policy (Flock Me)

- One request per mobility episode or explicit check.
- That request contains every selected household identifier.
- Do not issue a second request for the same episode.
- Never send a raw plate.

## Adapter

| Adapter | Role |
| --- | --- |
| `UnavailableAdapter` | Production. Throws `SERVICE_UNAVAILABLE`. |
| `FixtureAdapter` | Tests. Parses matches, empty sets, redactions, and malformed payloads. |

A live adapter may be added only after written permission, a documented public API, or a downloadable dataset with a stable schema.
