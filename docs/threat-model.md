# Local data and threat model

## Stored locally

- Consent timestamp and setup-offer timestamp
- Vehicle lookup tokens (8 hex chars) and local labels
- Previously seen audit-record identifiers

Raw license plates are discarded after derivation and must never appear in
logs or persistent state.

## What a token is not

The 8-character SHA-256 prefix is a lookup key. Plate space is enumerable.
Treat tokens as sensitive. Do not encrypt them as if they were a privacy
boundary. Use restrictive permissions instead.

## Portable file store

- Path: `$FLOCK_ME_STATE` or `$XDG_CONFIG_HOME/flock-me/state.json`
- Directory mode `0700`, file mode `0600`
- Atomic write: temp file + rename
- Concurrent writers fail closed via an exclusive lock file

## Web household store

Rows are scoped to the authenticated `user_id`. Server functions reject
signed-out callers. The client never supplies the user id.

## Log redaction

Never log the enrollment input, the normalized plate, or the lookup token.
User-facing validation errors may mention format, not the submitted value.

## Live network

Have I Been Flocked automated access is unconfirmed. The adapter does not
perform live HTTP. Fixture checks stay local.
