# Setup and usage examples

Commands print one JSON object. Show the `message` field. From the repository root, Node 22+:

```
node --experimental-strip-types runtime/src/cli.ts <command>
```

Live Have I Been Flocked lookups are not permitted. `--fixture` is rehearsal only.

## First-session setup

```
node --experimental-strip-types runtime/src/cli.ts setup
```

Read `message` (the offer) and `consent`. Ask the user to agree before accepting a plate.

```
node --experimental-strip-types runtime/src/cli.ts add --plate TESTPLATE --consent --label "My car"
```

Expected: `status: enrolled`, `discardedPlate: true`. The plate must not appear in the JSON. Repeat with another plate to enroll a second vehicle. Default labels are `My car`, `Partner's car`, then `Work truck`.

## Everyday explicit check

```
node --experimental-strip-types runtime/src/cli.ts check
```

No travel evidence required. Production returns `status: unavailable` until a permitted contract exists.

Rehearsal with the checked-in fixture:

```
node --experimental-strip-types runtime/src/cli.ts check --fixture runtime/fixtures/rehearsal.json
```

Expected: `status: matches` for `My car` if that plate's identifier is in the fixture.

One vehicle:

```
node --experimental-strip-types runtime/src/cli.ts check --label "My car"
```

## Inspect and delete

```
node --experimental-strip-types runtime/src/cli.ts list
node --experimental-strip-types runtime/src/cli.ts inspect
node --experimental-strip-types runtime/src/cli.ts delete-data --confirm
```

`inspect` shows labels, checkpoint, and seen-record count, not plates. `inspect --show-ids` adds derived identifiers and is sensitive.

## New-session review (after hooks are installed)

The harness `SessionStart` hook runs `session-start` and injects an instruction. The agent then:

```
node --experimental-strip-types runtime/src/cli.ts review --verdict absent
node --experimental-strip-types runtime/src/cli.ts review --verdict confirmed --label "My car"
node --experimental-strip-types runtime/src/cli.ts review --verdict confirmed
```

Use `confirmed` only for an explicit travel statement or a direct travel artifact. Omit `--label` when the vehicle is unclear.

## Harness invocation

| Harness | Explicit | Automatic |
| --- | --- | --- |
| Codex | `$flock-me` | SessionStart `startup` hook |
| Claude Code | `/flock-me` | SessionStart `startup` hook |
| Grok Build | `/flock-me` | SessionStart hook (best-effort; install the Claude hook file too) |
| Gemini CLI | Ask to use Flock Me, then approve activation | SessionStart hook injects context; do not call `activate_skill` |
