# Local data and threat model

## Assets

- Derived eight-character plate identifiers (lookup tokens).
- Optional non-sensitive vehicle nicknames.
- Previously seen audit-record identifiers.
- Session-review checkpoint and mobility-episode metadata.

Raw license plates are not assets in persistent state. They exist only in working memory during derivation.

## Not a cryptographic privacy boundary

The identifier is `sha256(lowercase(trim(plate)))[:8]`. US plate space is small enough to enumerate. Anyone who can read an identifier can test candidate plates against it. Treat identifiers as sensitive.

## Storage

Portable CLI / harness runtime:

- Path: `~/.flock-me/state.json`
- Format: versioned JSON (`version: 1`)
- Directory mode: `0700`
- File mode: `0600`
- Writes are atomic (temp file + rename)
- No encryption at rest in v1. Restrictive file permissions are the control.

## Threats

| Threat | Mitigation |
| --- | --- |
| Disk read of `state.json` | `0700` / `0600`. Identifiers remain sensitive if the home directory is copied. |
| Log leakage of a plate | Never log enrollment input. `redactLog()` is a last-line defense. |
| Accidental plate persistence | Parser rejects `plate` / `licensePlate` fields. Atomic writer refuses those keys. |
| Duplicate enrollment | Derived identifier is the uniqueness key. |
| Fabricated lookup results | Missing or unpermitted service fails explicitly. No degraded fallback search. |

## User control

The user can list, rename, remove, inspect, and clear every locally stored Flock Me record. Setup remains available before the service integration is operational so a household can enroll now and delete later.
