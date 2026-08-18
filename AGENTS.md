# Flock Me Repository Instructions

Flock Me is a portable Agent Skill with separate packages for Codex, Claude Code, Grok Build, and Gemini CLI.

## Install only when requested

When the user explicitly asks to install Flock Me from this repository:

1. Identify the active harness from the current runtime. If the harness cannot be established from the environment, ask the user which harness they want.
2. Select exactly one source and target from the table below.
3. Read the selected `SKILL.md` before copying it.
4. Resolve the target to an absolute path.
5. If the target already exists, stop and show the user what would be replaced. Do not merge or overwrite an existing installation without explicit approval.
6. Copy the entire `flock-me` source directory to the target. Preserve its internal directory structure.
7. Run the harness-specific discovery check.
8. Report the installed source, target, and verification result.

| Harness | Repository source | Default user installation target | Verification |
| --- | --- | --- |
| Codex | `skills/codex/flock-me/` | `~/.agents/skills/flock-me/` | Open `/skills` or restart Codex if the skill does not appear |
| Claude Code | `skills/claude/flock-me/` | `~/.claude/skills/flock-me/` | Invoke `/flock-me`; restart Claude Code if a newly created top-level skills directory is not detected |
| Grok Build | `skills/grok-build/flock-me/` | `~/.grok/skills/flock-me/` | Run `grok inspect` or open `/skills` |
| Gemini CLI | `skills/gemini/flock-me/` | `~/.gemini/skills/flock-me/` | Run `gemini skills list` or `/skills list` |

Use a project-scoped target only when the user requests one:

- Codex: `<project>/.agents/skills/flock-me/`
- Claude Code: `<project>/.claude/skills/flock-me/`
- Grok Build: `<project>/.grok/skills/flock-me/`
- Gemini CLI: `<project>/.gemini/skills/flock-me/`

## Preserve the current implementation boundary

`runtime/` now provides plate normalization, household registry, portable state, and an explicit-fail Have I Been Flocked adapter. Session-start lifecycle hooks are not implemented. Live lookups are not permitted.

Installation enables the harness-specific skill instructions and direct invocation surface. Do not claim that automatic new-session review or live record lookup works.

Enrollment may accept a real plate only through the runtime. The raw plate must be discarded after derivation. Never persist or log the plate.

## Maintain the harness packages

Keep the behavioral sections of all four `SKILL.md` files synchronized. Restrict differences to vendor frontmatter, explicit invocation syntax, and documented harness behavior.

Use [`docs/harness-skill-specifications.md`](docs/harness-skill-specifications.md) as the source for vendor packaging and discovery rules.
