# Flock Me

Let the user know when public records show that someone using the Flock network searched for an enrolled household vehicle.

Treat travel detection as supporting functionality. The product's primary function is the Flock audit-record lookup.

## Preserve the data meaning

A matching audit record establishes that a Flock user searched for the plate. It does not establish that:

- a camera photographed the vehicle;
- the vehicle passed through a particular location;
- the vehicle owner was investigated; or
- a recent trip caused the search.

State that the public dataset is incomplete and delayed. Never describe a lookup result as live vehicle tracking.

## Accept only two entry points

### New-session review

Enter through this path only when lifecycle context explicitly requests the Flock Me session-start evaluation.

1. Confirm that the household registry contains at least one vehicle.
2. Review only the recent history and memory made available by the host since the stored checkpoint.
3. Reason semantically about whether the context indicates that the user or another household member traveled outside the home.
4. Treat preparation, departure, movement, arrival, and a completed outing as valid forms of travel evidence.
5. Group related evidence into one bounded mobility episode.
6. If credible travel evidence exists, check the enrolled vehicle identified by context. Check all enrolled vehicles when the vehicle is ambiguous.
7. If no credible travel evidence exists, update the checkpoint and continue the user's ordinary request without mentioning Flock Me.

Do not rely on a fixed trigger-phrase list. Do not claim access to conversations, computer activity, or memory that the host did not provide.

Session-start lifecycle hooks are not implemented. Do not invent a hook. If this path is entered, still perform the lookup by running the explicit-check CLI after travel inference, using `--label` when the vehicle is known.

### Explicit invocation

Enter through this path when the user invokes {{INVOKE}} or selects Flock Me from the skill command list.

Route every explicit action through the repository CLI. Do not reimplement normalization, enrollment, or lookup in the conversation.

From the Flock Me repository root (Node 22+):

```
node --experimental-strip-types runtime/src/cli.ts <command>
```

If `runtime/src/cli.ts` is not on disk, stop and say the Flock Me runtime is not installed in this workspace.

| User intent | Command |
| --- | --- |
| Check every enrolled vehicle | `check` |
| Check one vehicle | `check --label "My car"` |
| First-session setup offer | `setup` |
| Enroll a vehicle | `add --plate PLATE --consent [--label LABEL]` |
| List vehicles | `list` |
| Rename a vehicle | `rename --from LABEL --to LABEL` |
| Remove a vehicle | `remove --label LABEL` |
| Clear the registry | `clear --confirm` |
| Inspect local data | `inspect` |
| Delete all local data | `delete-data --confirm` |

- With no additional instruction, run `check`. Do not require travel evidence.
- With no enrolled vehicles, `check` returns the setup offer. Present it instead of attempting a lookup.
- Obtain explicit permission before `add --consent`. Use the `consent` field from `setup`.
- Never pass a raw plate to any command other than `add`.
- Never log the plate, the command line containing the plate, or the derived identifier.
- Pass `--fixture runtime/fixtures/rehearsal.json` only for documented rehearsal. Production checks use the default unavailable adapter.

Do not activate from an ordinary mid-session travel remark. Travel inference occurs during the new-session review. All other activation is explicit.

## Enroll household vehicles

Use a license plate as the sole enrollment input. Support more than one household vehicle.

1. Run `setup` and show the offer plus consent language.
2. Obtain explicit permission before accepting the plate for enrollment.
3. Run `add --plate <plate> --consent` and an optional `--label`.
4. Confirm enrollment from the CLI JSON (`status: enrolled` or `duplicate`). The CLI discards the plate.
5. Offer to enroll another household vehicle.

Treat the eight-character identifier as sensitive. It is a lookup token, not a cryptographic privacy boundary.

Do not invent a second hash. Do not send a raw plate anywhere. Do not compute the identifier in the conversation.

## Perform a lookup

1. Run `check` or `check --label LABEL`.
2. Read the JSON object on stdout. Show the `message` field to the user.
3. If `status` is `unavailable`, `malformed`, or `rate-limited`, stop. State which component failed. Do not invent results.
4. If `status` is `setup-required`, offer setup.
5. If `status` is `no-match` or `matches`, preserve the dataset-limits sentence from `message`.

Never send a raw plate to the service. Never open haveibeenflocked.com on the user's behalf.

## Report results

Present the CLI `message` without adding camera-sighting, location, investigation, or live-tracking claims.

Distinguish absent fields from negative findings — the CLI already marks missing fields as `not present in this record`.

During an automatic new-session check, surface only previously unseen matches (`fresh`). During an explicit check, the CLI also reports previously seen records and no-match outcomes.

Never imply that the travel evidence and audit record describe the same event unless the record itself establishes that relationship.

## Maintain state

The CLI persists household state in `~/.flock-me/state.json` (or `$FLOCK_ME_STATE`):

- enrolled vehicle identifiers and optional labels;
- the last session-review checkpoint;
- bounded mobility-episode state; and
- identifiers for previously seen audit records.

Keep raw plates out of persistent state. Do not write state files yourself.

## Respect the implementation boundary

Normalization, household registry, portable state, the explicit-fail service adapter, and the explicit-check CLI live in `runtime/`. Session-start lifecycle hooks are still unimplemented. Live Have I Been Flocked lookups are not permitted. If the CLI reports `SERVICE_UNAVAILABLE`, say so.
