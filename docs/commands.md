# Commands

Every explicit Flock Me action goes through the TypeScript CLI. From the
repository root (Node 22+):

```
node --experimental-strip-types runtime/src/cli.ts <command>
```

The CLI prints one JSON object to stdout. Show the `message` field to the user.
Do not reimplement these commands in a harness skill.

State lives at `$FLOCK_ME_STATE` or `~/.flock-me/state.json`. Raw plates never
appear in JSON output or persistent state.

| Command | Expected result |
| --- | --- |
| `setup` | `status: setup-offer`. `message` is the first-session offer. `consent` is the enrollment-consent language. Marks setup as offered. |
| `add --plate PLATE --consent [--label LABEL]` | `status: enrolled` or `duplicate`. Returns the local label. Discards the plate. Exit 1 without `--consent` or with an invalid plate, without echoing the plate. |
| `list` | `status: listed` with non-sensitive labels, or `empty` when none are enrolled. |
| `rename --from LABEL --to LABEL` | `status: renamed`. Exit 1 if the source label is missing or ambiguous. |
| `remove --label LABEL` | `status: removed`. Exit 1 if the label is missing or ambiguous. |
| `clear --confirm` | `status: cleared`. Registry, seen-record ids, and episode state are removed. Setup-offered timestamp is kept. Exit 1 without `--confirm`. |
| `check` | Explicit check of every enrolled vehicle. No travel evidence required. See statuses below. |
| `check --label LABEL` | Explicit check of one enrolled vehicle. |
| `check --mode session` | Automatic-path check: silent when there is no fresh match. |
| `check --fixture PATH` | Rehearsal only. Uses `FixtureAdapter` with the JSON file. |
| `session-start [--format FORMAT] [--source SOURCE] [--hook]` | Startup-only hook entry. Injects the review instruction. Skips resume/compact/clear/fork. Does not lookup. `--format` prints harness JSON on stdout. |
| `checkpoint` | Shows the stored session-review checkpoint. |
| `checkpoint --mark` | Sets the checkpoint to now. |
| `review --verdict VERDICT [--label LABEL]` | New-session travel review. `absent`/`possible`/`probable` update the checkpoint and stay silent. `confirmed` opens or reuses a mobility episode and runs a session-mode check. |
| `inspect` | Labels, seen-record count, checkpoint, episode, and consent timestamps. No derived identifiers. |
| `inspect --show-ids` | Same as `inspect`, plus derived identifiers. Treat the output as sensitive. |
| `delete-data --confirm` | Deletes the state file. `status: deleted`. |
| `help` | Prints command usage. |

## `check` statuses

| Status | Exit | Meaning |
| --- | --- | --- |
| `setup-required` | 0 | No vehicles enrolled. `message` is the setup offer. |
| `unavailable` | 2 | Production adapter. Have I Been Flocked does not permit automated access. |
| `malformed` | 2 | Fixture or parser rejected the payload. |
| `rate-limited` | 2 | Adapter reported HTTP 429 semantics. |
| `no-match` | 0 | The available public dataset contains no matching record for the selected vehicles. |
| `matches` | 0 | `fresh` and/or `previouslySeen` records, reported by local label. Dataset limits are included. |
| `silent` | 0 | Session-mode check with no fresh match. `message` is empty. Do not mention Flock Me. |
| `already-checked` | 0 | This mobility episode already had a successful lookup. Do not mention Flock Me. |
| `instruct` | 0 | `session-start` on `startup`. Inject `instruction`; do not lookup from the hook. |
| `skipped` | 0 | `session-start` for a non-startup source. |
| `marked` | 0 | Checkpoint written. |

A matching record means a Flock user searched the plate. It is not a camera
sighting, a location, an investigation, or a link to the trip that triggered
the check.

Harness invocation:

| Harness | Explicit invocation |
| --- | --- |
| Codex | `$flock-me` |
| Claude Code | `/flock-me` |
| Grok Build | `/flock-me` |
| Gemini CLI | Ask Gemini to use Flock Me and approve activation |
