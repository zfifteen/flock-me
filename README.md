![Flock Me propaganda-style goose operating a surveillance camera](assets/hero.png)

# Flock Me

Flock Me lets users know when public records show that someone using the Flock surveillance network searched for an enrolled household vehicle.

The project connects Codex to public, FOIA-derived Flock Safety audit records. A household enrolls one or more license plates once. Flock Me derives the service lookup identifiers, discards the raw plates, and checks the public records when either:

1. a new Codex session finds evidence of household travel in the recent history and memory available to it; or
2. the user explicitly invokes Flock Me.

## Status

Flock Me is in design and scaffolding. The skill behavior has a first draft, but the lifecycle hook, persistent state store, plate normalization implementation, service adapter, and tests do not exist yet. The project is not installed.

## Data boundary

A matching audit record establishes that a Flock user searched for a plate. It does not establish that a camera photographed the vehicle, that the vehicle passed through a particular location, or that the owner was investigated.

The public dataset is incomplete and delayed because it is assembled from public-records releases.

## Repository

- [`SKILL.md`](SKILL.md) defines the agent behavior.
- [`agents/openai.yaml`](agents/openai.yaml) defines the Codex skill-list metadata and requires explicit invocation.
- [`docs/design.md`](docs/design.md) preserves the evolving product requirements and research notes.
- [`docs/architecture.md`](docs/architecture.md) defines the component boundaries and execution flows.
- [`docs/decisions.md`](docs/decisions.md) records accepted design decisions.

Implementation directories will be added when the runtime language and supported service interface are chosen. This keeps the current repository free of placeholder code and speculative abstractions.

## Current implementation sequence

1. Verify the plate normalization algorithm.
2. Choose the supported local persistence mechanism.
3. Establish a permitted service integration contract.
4. Implement and test enrollment, lookup, deduplication, and checkpoint state.
5. Implement the new-session lifecycle hook.
6. Validate the complete skill without installing it globally.

## Primary public source

- [Have I Been Flocked](https://haveibeenflocked.com/)
