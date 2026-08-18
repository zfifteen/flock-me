# Local data and threat model

## Assets

- Derived eight-character plate identifiers (lookup tokens).
- Optional non-sensitive vehicle nicknames.
- Previously seen audit-record identifiers.
- Consent and setup-offer timestamps.
- Session-review checkpoint and mobility-episode metadata.

Raw license plates are not assets in persistent state. They exist only in working memory during derivation.

## Not a cryptographic privacy boundary

The identifier is `sha256(utf8(lowercase(trim(plate))))[:8]`. Plate space is small enough to enumerate. Anyone who can read an identifier can test candidate plates against it. Treat identifiers as sensitive. Do not encrypt them as if they were a privacy boundary.

## Storage

Portable CLI / harness runtimes (versioned JSON, atomic temp-file + rename, no encryption at rest):

| Runtime | Path | Permissions |
| --- | --- | --- |
| TypeScript (`runtime/src`) | `~/.flock-me/state.json` | directory `0700`, file `0600` |
| ESM (`runtime/*.mjs`) | `$FLOCK_ME_STATE` or `$XDG_CONFIG_HOME/flock-me/state.json` | directory `0700`, file `0600`; exclusive lock file |

Web household store (companion app): rows are scoped to the authenticated `user_id`. Server functions reject signed-out callers. The client never supplies the user id.

## Threats

| Threat | Mitigation |
| --- | --- |
| Disk read of state | `0700` / `0600`. Identifiers remain sensitive if the home directory is copied. |
| Concurrent writers | Exclusive lock (ESM) or atomic rename. A second writer fails closed. |
| Log leakage of a plate | Never log enrollment input, the normalized plate, or the lookup token. `redactLog()` is a last-line defense. User-facing errors may mention format, not the submitted value. |
| Accidental plate persistence | Parser rejects `plate` / `licensePlate` / `rawPlate` fields. Atomic writer refuses those keys. |
| Duplicate enrollment | Derived identifier is the uniqueness key. |
| Fabricated lookup results | Missing or unpermitted service fails explicitly. No degraded fallback search. |

## User control

The user can list, rename, remove, inspect, and clear every locally stored Flock Me record. Setup remains available before the service integration is operational so a household can enroll now and delete later.
