# Contributing to Flock Me

Outside contributions are welcome once the first operational release lands and a permitted Have I Been Flocked contract exists.

## Before you start

- Read [AGENTS.md](AGENTS.md), [docs/architecture.md](docs/architecture.md), and [docs/roadmap.md](docs/roadmap.md).
- Live HTTP to Have I Been Flocked remains forbidden unless the roadmap explicitly opens it.
- Raw license plates must never be logged or persisted. The runtime discards them after deriving the eight-character identifier.

## How to contribute

1. Open an issue describing the change before large work.
2. Fork, branch from `main`, keep changes small and focused.
3. Run the repository checks:
   - `node scripts/check-skill-sync.mjs`
   - `node scripts/check-hooks.mjs`
   - `node scripts/check-discovery.mjs`
   - Runtime tests under `runtime/` (see `runtime/package.json`).
4. Update [docs/roadmap.md](docs/roadmap.md): mark completed items with `[x]` and strikethrough.
5. Open a PR against `main`. Prefer squash-merge.

## Style and boundaries

- Keep skill behavior sections synchronized with `skills/behavior.md`.
- Prefer first-principles, minimal surface area. Best part is no part.
- Do not introduce marketplace/plugin wrappers until a permitted lookup contract exists.
- Security and privacy notes live in [docs/threat-model.md](docs/threat-model.md).

Thank you for helping make personal awareness of public Flock audit records practical inside the agents people already use.
