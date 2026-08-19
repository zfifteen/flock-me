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
7. Install the matching **startup-only** hook package from the hook table. Replace `{{FLOCK_ME_ROOT}}` with the absolute path to this repository clone. Merge into the destination file; do not drop unrelated hooks.
8. Tell the user how to trust hooks for that harness. Do not bypass trust.
9. Run the harness-specific discovery check.
10. Report the installed skill source, skill target, hook target, and verification result.

| Harness | Repository source | Default user installation target | Verification |
| --- | --- | --- | --- |
| Codex | `skills/codex/flock-me/` | `~/.agents/skills/flock-me/` | Open `/skills` or restart Codex if the skill does not appear |
| Claude Code | `skills/claude/flock-me/` | `~/.claude/skills/flock-me/` | Invoke `/flock-me`; restart Claude Code if a newly created top-level skills directory is not detected |
| Grok Build | `skills/grok-build/flock-me/` | `~/.grok/skills/flock-me/` | Run `grok inspect` or open `/skills` |
| Gemini CLI | `skills/gemini/flock-me/` | `~/.gemini/skills/flock-me/` | Run `gemini skills list` or `/skills list` |

| Harness | Hook package | Default user hook target | Trust |
| --- | --- | --- | --- |
| Codex | `hooks/codex/hooks.json` | merge `SessionStart` into `~/.codex/hooks.json` | `/hooks` review |
| Claude Code | `hooks/claude/settings.json` | merge `hooks.SessionStart` into `~/.claude/settings.json` | first-run approval |
| Grok Build | `hooks/grok/flock-me-session-start.json` | `~/.grok/hooks/flock-me-session-start.json` **and** merge the Claude hook file (Grok native SessionStart stdout is ignored) | `/hooks-trust` for project hooks |
| Gemini CLI | `hooks/gemini/settings.json` | merge `hooks.SessionStart` into `~/.gemini/settings.json` | fingerprint prompt if the command changes |

Use a project-scoped target only when the user requests one:

- Codex: `<project>/.agents/skills/flock-me/` and `<project>/.codex/hooks.json`
- Claude Code: `<project>/.claude/skills/flock-me/` and `<project>/.claude/settings.json`
- Grok Build: `<project>/.grok/skills/flock-me/` and `<project>/.grok/hooks/` (then `/hooks-trust`)
- Gemini CLI: `<project>/.gemini/skills/flock-me/` and `<project>/.gemini/settings.json`

## Upgrade

Re-copy the skill directory after showing the user the current target. Re-merge the hook command so `{{FLOCK_ME_ROOT}}` still points at this clone. Do not reset `~/.flock-me/state.json`.

## Uninstall

1. Remove the installed `flock-me` skill directory.
2. Remove only the Flock Me `SessionStart` matcher group from the harness hook file. Leave other hooks intact.
3. Ask whether to delete local data (`delete-data --confirm`). Do not delete it unless the user agrees.

## Preserve the current implementation boundary

`runtime/` provides plate normalization, household registry, portable state, an explicit-fail Have I Been Flocked adapter, the explicit-check CLI (`runtime/src/cli.ts`), and session-start / review commands. Startup-only `SessionStart` hooks inject a compact instruction; they do not lookup. Live lookups are not permitted.

Every explicit Flock Me action must go through the CLI:

```
node --experimental-strip-types runtime/src/cli.ts <command>
```

Commands and expected results are in [`docs/commands.md`](docs/commands.md). Setup examples are in [`docs/usage.md`](docs/usage.md). Hook research is in [`docs/lifecycle-hooks.md`](docs/lifecycle-hooks.md). The review contract is in [`docs/session-review.md`](docs/session-review.md).

Enrollment may accept a real plate only through the runtime. The raw plate must be discarded after derivation. Never persist or log the plate.

## Compatibility

| Harness | Minimum |
| --- | --- |
| Codex | Build that documents `SessionStart` hooks (hooks shipped rust-v0.114, 2026-03) |
| Claude Code | Build that documents `SessionStart` hooks and `disable-model-invocation` |
| Grok Build | Build that documents `~/.grok/hooks/` and Claude-compat settings |
| Gemini CLI | ≥ 0.26.0, with SessionStart `additionalContext` (documented 2026-04) |
| Runtime | Node 22+ (`node --experimental-strip-types`) |

Distribution remains this repository. Do not publish marketplace/plugin wrappers until a permitted lookup contract exists.

## Maintain the harness packages

Keep the behavioral sections of all four `SKILL.md` files synchronized with [`skills/behavior.md`](skills/behavior.md). Restrict differences to vendor frontmatter and the `{{INVOKE}}` token. Run `node scripts/check-skill-sync.mjs` after editing skill packages. Run `node scripts/check-hooks.mjs` after editing hook packages.

Use [`docs/harness-skill-specifications.md`](docs/harness-skill-specifications.md) as the source for vendor packaging and discovery rules.
