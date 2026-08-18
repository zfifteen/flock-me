![Flock Me propaganda-style goose operating a surveillance camera](assets/hero.png)

# Flock Me

**Know when your household's vehicles have been searched through the Flock surveillance network.**

Flock Me connects Codex directly to public, FOIA-derived Flock Safety audit records. Enroll your household's license plates once, and Flock Me checks whether someone using Flock searched for one of those vehicles.

When records are available, Flock Me reveals the institutional trail: the searching agency, operator, date, stated reason, case number, search type, and network reach.

The integration fits into the way you already use Codex. At the beginning of a new session, Flock Me reviews the available recent context for signs that someone in your household traveled and checks the enrolled vehicles. You can also invoke it directly whenever you want an immediate answer. There is no plate to re-enter, no separate website to visit, and no manual search to remember.

Each result answers one precise question:

> Has someone using Flock searched for one of our vehicles?

Flock Me turns scattered public surveillance records into persistent personal awareness inside Codex.

**They built a network to search your movements. Flock Me gives you a window into who searched.**

---

## Technical overview

### Status

Flock Me is in design and scaffolding. The skill behavior and packaging metadata have first drafts. The lifecycle hook, persistent state store, plate normalization implementation, service adapter, and tests do not exist yet. The project is not installed or operational.

### Activation contract

Flock Me has exactly two entry points:

1. **New-session review:** Review the recent history and memory available from the host for signs that the user or another household member traveled. Check the relevant enrolled vehicle, or all enrolled vehicles when the context is ambiguous.
2. **Explicit invocation:** Run Flock Me directly through `$flock-me` or its enabled skill command entry. An explicit check does not require evidence of travel.

Ordinary mid-session travel remarks do not activate the skill. Skill metadata sets `allow_implicit_invocation: false`.

### Vehicle enrollment and privacy

License plate is the sole enrollment input. A household can enroll multiple vehicles.

For each plate, the planned implementation will:

1. normalize the plate locally using the verified service algorithm;
2. derive the first eight hexadecimal characters of its SHA-256 hash;
3. persist the derived identifier with an optional local vehicle label;
4. discard the raw plate immediately.

The shortened identifier remains sensitive because it is a lookup token rather than a cryptographic privacy boundary.

### Record semantics

A matching audit record establishes that a Flock user searched for a plate. It does not establish that a camera photographed the vehicle, that the vehicle passed through a particular location, that the owner was investigated, or that the search was connected to the trip that triggered the check.

The public dataset is incomplete and delayed because it is assembled from public-records releases. Flock Me must preserve those limits in every result.

### Repository layout

- [`SKILL.md`](SKILL.md) defines the agent behavior.
- [`agents/openai.yaml`](agents/openai.yaml) defines the Codex skill-list metadata and requires explicit invocation.
- [`docs/design.md`](docs/design.md) preserves the evolving product requirements and research notes.
- [`docs/architecture.md`](docs/architecture.md) defines the component boundaries and execution flows.
- [`docs/decisions.md`](docs/decisions.md) records accepted design decisions.
- [`assets/hero.png`](assets/hero.png) is the selected project banner.
- [`assets/hero-candidates/`](assets/hero-candidates/) preserves the original banner explorations.

Implementation directories will be added when the runtime language and supported service interface are chosen. This keeps the current repository free of placeholder code and speculative abstractions.

### Implementation sequence

1. Verify the plate normalization algorithm.
2. Choose the supported local persistence mechanism.
3. Establish a permitted service integration contract.
4. Implement and test enrollment, lookup, deduplication, and checkpoint state.
5. Implement the new-session lifecycle hook.
6. Validate the complete skill without installing it globally.

### Primary public source

- [Have I Been Flocked](https://haveibeenflocked.com/)
