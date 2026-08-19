# Session-review contract

Accepted 2026-08-19. Vendor facts live in [`lifecycle-hooks.md`](lifecycle-hooks.md). Travel fixtures live in [`runtime/fixtures/travel/`](../runtime/fixtures/travel/).

## Checkpoint

`HouseholdState.checkpoint` is an ISO-8601 timestamp of the last **completed** session-start review.

- Empty / `null` means the household has never finished a review. The agent may use any host-provided recent context.
- After every review (`absent` through `confirmed`, including setup-required), the CLI writes `checkpoint` to now.
- The agent may consider only host context that is newer than the checkpoint.
- The hook never writes the checkpoint. `session-start` is read-only. `checkpoint --mark` and `review` persist it.
- Resume, compact, and clear do not create a new checkpoint window; those sources are skipped.

Checkpoints prevent re-evaluating the same memory files and the same prior chat on every new session.

## Mobility-episode boundaries

One bounded mobility episode produces **at most one** service request.

- An episode opens when the travel verdict is `confirmed` and no open episode covers the same vehicle set.
- Identity: `YYYY-MM-DD` (UTC date of `openedAt`) plus the sorted derived vehicle identifiers. Example: `2026-08-19:5942d94f,d2097ce6`.
- An episode stays open for **12 hours** from `openedAt`. After that, a new confirmed outing is a new episode.
- `checkedAt` is set only after a successful session-mode lookup (`matches`, `no-match`, or `silent`). Unavailable, malformed, and rate-limited results do not consume the episode, so a later permitted contract can still be tried.
- A later confirmed review that sees `checkedAt` on the open episode returns `already-checked` and stays silent.

Related signals during the same outing (leaving, traffic, arrival, the receipt) belong to that episode. They do not create another request.

## Travel rubric

Travel is classified **semantically** by the model from host-provided context. There is no production phrase list. Fixtures encode the rubric for tests.

| Verdict | Evidence | Automatic lookup |
| --- | --- | --- |
| `absent` | No mobility cues | No. `checkpoint --mark`. Silent. |
| `possible` | Exactly one weak-cue family | No. Accumulate. Silent. |
| `probable` | Two or more independent families, still no explicit trip | No. Prepare only. Silent. |
| `confirmed` | An explicit travel statement **or** a direct travel artifact | Yes, unless the episode was already checked. |

Evidence families (examples, not an exhaustive vocabulary):

- departure / arrival / commute language
- route planning, navigation, travel time
- appointments, reservations, physical destinations
- parking, toll, fuel, charging, lodging receipts
- calendar entries with a physical location
- local-environment asks (nearby places, local weather, parking)
- vehicle interactions (tow, ticket, breakdown, stop)
- geographic shift from multiple independent signals
- retrospective reconstruction of a day or outing

Weak cues are contextual hints in those families. Explicit statements are first-person travel claims ("I just got home", "we're leaving in ten minutes"). Direct artifacts are travel documents the host actually provided (a receipt, ticket, or navigation result in the current context).

The deterministic helper `evaluateTravel()` in `runtime/src/travel.ts` implements the table above for fixtures. Production classification remains the model's job, constrained by this table.

## Confidence threshold

Automatic lookup requires **`confirmed`**.

`probable` is not enough. Two weak cues often appear in coding sessions (a calendar note, a downtown path in a README) without anyone leaving the house. False-positive lookups would send derived identifiers toward a sensitive public-records service and, once a contract exists, could notify on an unrelated outing.

Explicit `$flock-me` / `/flock-me` still bypasses travel inference.

## Vehicle selection

- If the context names one enrolled label (case-insensitive exact match), check that vehicle: `review --verdict confirmed --label "My car"`.
- If the vehicle is unnamed, ambiguous, or not in the registry, omit `--label` and check every enrolled vehicle in one batch.
- Never ask the user which car during the automatic path.

## When to interrupt

On the automatic path, speak only when `review` returns `status: matches` **and** `fresh` is non-empty. Show the CLI `message`.

Stay silent (continue the user's ordinary request, do not mention Flock Me) when status is:

- `silent`
- `already-checked`
- `no-match`
- `unavailable`
- `rate-limited`
- `malformed`

`setup-required` interrupts **once**, when `setupOfferedAt` is empty, so the first post-install session can offer enrollment. Later empty-registry startups stay silent.

Unavailable is silent on the automatic path because Have I Been Flocked currently permits no automated access. The same status still surfaces on explicit invocation.

## Gemini activation consent

Gemini asks the user to approve `activate_skill`. There is no documented way to disable that prompt per skill.

The SessionStart hook injects additional context **without** activating the skill. The instruction tells Gemini to run the CLI directly and not to call `activate_skill` for the automatic review. Explicit "use Flock Me" still requires the user's activation approval.

## Commands

```
session-start [--format claude|codex|gemini|grok|plain] [--source SOURCE] [--hook]
checkpoint [--mark]
review --verdict absent|possible|probable|confirmed [--label LABEL] [--fixture PATH]
check --mode session [--label LABEL] [--fixture PATH]
```

`session-start` is for harness hooks. Agents performing the review call `review` or `checkpoint --mark`.
