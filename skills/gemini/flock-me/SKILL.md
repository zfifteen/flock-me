---
name: flock-me
description: Check enrolled household vehicle identifiers against public, FOIA-derived Flock Safety audit records and manage household vehicle enrollment. Activate only when the user explicitly asks Gemini to use Flock Me or when trusted lifecycle context requests the Flock Me new-session household-travel review. Do not activate from an ordinary travel remark.
---

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

### Explicit invocation

Enter through this path when the user explicitly asks Gemini to use Flock Me and approves skill activation.

- With no additional instruction, check every enrolled household vehicle immediately. Do not require travel evidence.
- With `setup` or `add`, begin vehicle enrollment.
- With `list`, show the non-sensitive labels for enrolled vehicles.
- With `remove`, remove the vehicle selected by its local label.
- With `clear`, request confirmation and then clear the household registry.
- With no enrolled vehicles, offer setup instead of attempting a lookup.

Do not activate from an ordinary mid-session travel remark. Travel inference occurs during the new-session review. All other activation is explicit.

## Enroll household vehicles

Use a license plate as the sole enrollment input. Support more than one household vehicle.

1. Explain that Flock Me will derive and retain a lookup identifier for future audit checks.
2. Obtain explicit permission before accepting the plate for enrollment.
3. Normalize the plate locally using the verified Have I Been Flocked normalization algorithm.
4. Compute the first eight hexadecimal characters of the normalized plate's SHA-256 hash.
5. Store the derived identifier with an optional non-sensitive local label.
6. Discard the raw plate immediately after derivation.
7. Offer to enroll another household vehicle.

Treat the eight-character identifier as sensitive. It is a lookup token, not a cryptographic privacy boundary.

Do not guess the normalization algorithm. If the project does not yet provide a verified implementation, stop enrollment and explain that normalization remains unimplemented.

## Perform a lookup

1. Load the enrolled identifiers selected by the entry-point workflow.
2. Submit the identifiers together through the project-provided Have I Been Flocked adapter.
3. Compare returned records with the stored seen-record identifiers.
4. Persist newly observed record identifiers before reporting them.
5. Associate the lookup with the mobility episode or explicit invocation that caused it.

One mobility episode produces at most one service request. Never send a raw plate to the service.

If the project-provided service adapter or persistent state store is absent, stop and state which component is unavailable. Do not invent results, substitute an unrelated search method, or silently degrade the check.

## Report results

For a newly discovered matching record, report the fields actually present, such as:

- enrolled vehicle label;
- searching agency;
- operator;
- search date;
- stated reason;
- case number;
- search type; and
- network reach.

Distinguish absent fields from negative findings. Explain that the match records a plate search and that the dataset is incomplete and delayed.

During an automatic new-session check, surface only previously unseen matches. During an explicit check, also report when the available public dataset contains no matching record.

Never imply that the travel evidence and audit record describe the same event unless the record itself establishes that relationship.

## Maintain state

Persist the minimum state required across sessions:

- enrolled vehicle identifiers and optional labels;
- the last session-review checkpoint;
- bounded mobility-episode state; and
- identifiers for previously seen audit records.

Keep raw plates out of persistent state. Use deterministic identifiers and checkpoint rules so the same context does not cause repeated checks.

## Respect the implementation boundary

This draft defines agent behavior. It does not provide the lifecycle hook, persistence implementation, normalization code, or service adapter. Treat each missing component as unimplemented until the project supplies it.
