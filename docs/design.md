# Flock Me

**Status:** Concept design  
**Started:** 2026-08-17  
**Project location:** `~/IdeaProjects/flock-me`

## Strongest Current Concept

Flock Me is a satirical, functional Agent Skill for Codex, Claude Code, Grok Build, and Gemini CLI. It recognizes evidence of a user's movement outside the home and checks public, FOIA-derived Flock Safety audit records for the user's enrolled household vehicles.

The skill treats movement as a bounded mobility episode. It checks once per episode and surfaces a result when a newly discovered public record is relevant to the conversation.

## Origin

The project began with a joke about connecting OpenAI Computer History to Flock Safety cameras. The functional version generalizes that ironic symmetry: an AI agent remembers the user's digital context while Flock Me brings public records of institutional attention toward the user's vehicle into the conversation.

## Product Positioning

**Know when your household's vehicles have been searched through the Flock surveillance network.**

Flock Me connects supported agent harnesses directly to public, FOIA-derived Flock Safety audit records. The user enrolls household license plates once, and the agent checks whether a Flock user searched for one of those vehicles.

When records are available, Flock Me reveals the institutional trail: the searching agency, operator, date, stated reason, case number, search type, and network reach.

Contextual travel detection makes the integration effortless. When conversations or computer activity indicate that someone in the household traveled, Flock Me recognizes the opportunity and checks the enrolled vehicles. The user receives relevant findings without repeatedly entering plates, visiting a separate website, or remembering to perform manual searches.

Each result answers a precise question:

> Has someone using Flock searched for one of our vehicles?

Flock Me turns scattered public surveillance records into persistent personal awareness inside the agent the user already uses.

**They built a network to search your movements. Flock Me gives you a window into who searched.**

## Verified Data Meaning

Have I Been Flocked aggregates audit logs released through FOIA and public-records requests. A matching record establishes that a Flock customer searched for a plate. The record provides no proof that a camera photographed the vehicle, that the vehicle traveled through a specific location, or that the vehicle owner was investigated.

The collection is incomplete and delayed. New records depend on public-records releases and can arrive months or years after the underlying search.

## Travel Inference Direction

Once the household registry contains one or more vehicles, the automatic new-session review looks for any credible indication that the user or another household member traveled outside the home. The agent reasons about the recent history and memory available from the host rather than matching a fixed phrase list.

The travel indication can describe preparation, current movement, arrival, or a completed outing. The evidence families below are examples for reasoning and testing. They are not an exhaustive trigger vocabulary.

Strong trigger families include:

- explicit departure, arrival, commuting, or trip language;
- route planning, navigation, traffic, or travel-time activity;
- appointments, reservations, events, and other physical destinations;
- parking, toll, fuel, charging, lodging, and travel receipts;
- calendar entries containing physical locations or travel time;
- environmental requests such as nearby places, local weather, or parking;
- vehicle interactions such as towing, tickets, breakdowns, accidents, and traffic stops;
- geographic changes inferred from multiple independent context signals;
- retrospective requests to reconstruct a day, outing, or trip.

Related signals contribute to one mobility episode. They do not cause repeated lookups during the same episode.

### Trigger Architecture

Flock Me has exactly two activation paths:

1. a new-session review of available recent history and memory for household travel;
2. explicit invocation through Flock Me's enabled skill command.

Each harness implementation packages the Flock Me skill with:

1. the harness's documented new-session lifecycle hook or equivalent;
2. a persistent state store containing the household registry, last evaluation checkpoint, and previously seen result identifiers;
3. the narrowest documented activation policy that preserves explicit use.

The `SessionStart` hook adds compact developer context to the first ordinary model request. That context instructs the agent to review the context available since the last checkpoint, reason about whether household travel occurred, and invoke the skill when appropriate. This reuses a model turn that is already happening and avoids a continuously running inference process.

Ordinary mid-session travel remarks do not activate the skill. All activation outside the new-session review is explicit.

Lifecycle context and transcript access differ by harness. Direct transcript parsing remains a constrained implementation detail. The preferred hook output is a short reasoning instruction for the agent rather than a second transcript-analysis subsystem.

### Activation Levels

1. **Possible outing:** One weak contextual cue. Accumulate context.
2. **Probable outing:** Two independent mobility cues. Prepare a lookup opportunity.
3. **Confirmed outing:** An explicit travel statement or direct travel artifact. Open the mobility episode.
4. **Relevant finding:** A previously unseen audit record overlaps with or is otherwise relevant to the episode. Surface the record with exact limits.

## Vehicle Enrollment and Persistence

License plate is the sole user-facing enrollment input. The skill maintains a persistent local registry so enrollment survives future agent sessions. A household can enroll one or more vehicles.

The enrollment flow is:

1. Ask for explicit permission to enable vehicle audit checks.
2. Receive one license plate.
3. Normalize it locally.
4. Compute the first eight hexadecimal characters of its SHA-256 hash.
5. Add the derived identifier as one vehicle in the persistent registry.
6. Discard the raw plate.
7. Offer enrollment of another household vehicle.
8. Use the registry for future checks without requesting the plate again.

The registry stores one entry per vehicle. The derived identifier is the lookup key and the uniqueness key. Re-enrolling the same normalized plate leaves one registry entry.

The minimum registry operations are:

- enroll a vehicle from a license plate;
- recognize an already-enrolled vehicle;
- list enrolled vehicles using non-sensitive local labels;
- remove a vehicle that was sold, returned, or entered incorrectly;
- clear the entire household registry.

An optional local nickname such as `My car`, `Partner's car`, or `Work truck` can make multiple entries understandable. The nickname has no role in the web-service query.

When a mobility episode identifies a particular enrolled vehicle, the skill checks that vehicle. When the context establishes travel but leaves the vehicle ambiguous, the skill checks all enrolled household vehicles together. One mobility episode still produces at most one service request.

Natural enrollment opportunities include user-provided registrations, insurance documents, parking or toll notices, traffic citations, repair invoices, or intentional vehicle photographs. The agent should identify the presence of a plate-like value and request permission before using it. Silent extraction or enrollment is outside the current design.

### Setup Entrypoints

The skill supports two setup paths:

1. **First post-install session:** The harness lifecycle hook finds an empty household registry and instructs the agent to offer Flock Me setup once.
2. **Explicit setup command:** The user invokes Flock Me through the harness-specific command with a setup request to enroll, list, rename, or remove household vehicles.

The first post-install session provides the installation-adjacent setup experience through the selected harness's lifecycle integration.

## Input Decision and Service Findings

The product accepts license plate as its only lookup enrollment input. Names, addresses, vehicle descriptions, agencies, operators, reasons, and case numbers do not identify the user's vehicle reliably.

The public Reason Search covers reason, case number, operator name, license plate, and text-prompt fields. Those fields support investigation after a plate match. Operator names identify people performing Flock searches. Civilian names and vehicle descriptions can occur incidentally.

## Observed Service Interface

Current frontend behavior observed on 2026-08-17:

- The homepage accepts a plate string.
- The frontend derives an eight-character hexadecimal plate identifier.
- The internal endpoint `POST /api/search/text` accepts an array of eight-character hexadecimal identifiers.
- A raw plate sent directly to that endpoint is rejected.
- No published, supported third-party API documentation has been identified.

The internal endpoint is an observed implementation detail and may change. A stable integration contract or permission from the service operator remains unresolved.

## Privacy Facts

Have I Been Flocked states that it does not log search terms or perform third-party lookups. Its server retains 24 hours of application logs containing hashed or partial IP addresses, sanitized slow-query logs, and a hash of browser user-agent plus IP for visitor analytics. Security incidents can produce longer retention.

Local Flock Me storage must retain the household vehicle registry and the smallest practical result state across sessions. Each registry entry contains the derived identifier and optional local nickname. The raw plate leaves working state after derivation.

The eight-character identifier is a lookup token rather than a cryptographic privacy boundary. License-plate values occupy a small enough search space for enumeration, so the identifier remains sensitive local data.

Persistent harness memory behavior remains a separate design decision because the supported writable interfaces differ across vendors.

## Design Invariants

- Explicit enrollment authorizes use of a vehicle identifier.
- Enrollment accepts license plate as the sole lookup identity.
- The local registry supports multiple household vehicles across sessions.
- Each normalized plate maps to one registry entry.
- The new-session review evaluates credible household travel indications.
- Travel detection uses semantic reasoning rather than a fixed trigger phrase list.
- Session-start evaluation occurs inside the first ordinary model turn.
- Ordinary mid-session travel remarks do not activate the skill.
- Explicit invocation bypasses travel inference.
- Mobility context activates relevance assessment.
- One bounded mobility episode produces at most one service request, containing one or more enrolled identifiers.
- A result states exactly that an operator searched the plate.
- Every surfaced result includes the dataset's incompleteness and delay where relevant.
- Previously seen records remain distinguishable from newly discovered records.
- Raw plates leave local working state after identifier derivation.

## Unresolved Questions

1. What exact normalization algorithm does the current site apply before hashing?
2. How does the source data handle identical plate strings registered in different jurisdictions?
3. Does the service operator permit automated use of the internal endpoint?
4. Is there a stable supported API or downloadable dataset suited to this use?
5. Which portable local mechanism should persist the household vehicle registry and previously seen record identifiers across harnesses?
6. Can a skill write supported persistent memory, or should the project use repo-local state?
7. What confidence threshold should open a mobility episode?
8. What wording should the first post-install setup offer use?
9. Which result conditions justify interrupting an unrelated conversation?
10. What default labels should distinguish multiple vehicles without retaining raw plates?
11. What context does each harness make available to its new-session lifecycle hook across separate chats and projects?
12. How should the checkpoint record prevent repeated evaluation of the same context?
13. How should each supported harness present and verify the explicit Flock Me invocation?

## Next Design Step

Choose the supported local persistence mechanism for the household vehicle registry and checkpoint state. Then prototype the `SessionStart` reasoning instruction and test it against representative session openings containing direct, indirect, and absent household-travel evidence.

## Primary Sources

- [Have I Been Flocked homepage and FAQ](https://haveibeenflocked.com/)
- [Reason Search](https://haveibeenflocked.com/search)
- [Audit-log documentation](https://haveibeenflocked.com/about/audit-logs)
- [Identifier explanation](https://haveibeenflocked.com/news/footage-sharing)
- [Surveillance details and identifier use](https://haveibeenflocked.com/news/longterm-tracking)
- [Data redaction policy](https://haveibeenflocked.com/about/privacy)
- [Visitor privacy policy](https://haveibeenflocked.com/about/privacy-policy)
- [OpenAI skill invocation and packaging](https://learn.chatgpt.com/docs/build-skills)
- [OpenAI Codex lifecycle hooks](https://learn.chatgpt.com/docs/hooks)
- [OpenAI scheduled tasks](https://learn.chatgpt.com/docs/automations)
- [Anthropic Claude Code skills](https://code.claude.com/docs/en/slash-commands)
- [xAI Grok Build skills](https://docs.x.ai/build/features/skills-plugins-marketplaces)
- [Google Gemini CLI skills](https://geminicli.com/docs/cli/creating-skills/)
