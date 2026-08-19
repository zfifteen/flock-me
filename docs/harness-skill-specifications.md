# Harness Skill Specifications

**Research date:** 2026-08-17

This document records the official skill format, discovery locations, activation behavior, and installation surface for Codex, Claude Code, Grok Build, and Gemini CLI.

## Shared foundation

All four harnesses use the Agent Skills model: a skill is a directory whose required entry point is `SKILL.md`. The file begins with YAML frontmatter and continues with Markdown instructions. Supporting scripts, references, and assets can live beside it.

The portable minimum is:

```text
flock-me/
└── SKILL.md
```

```yaml
---
name: flock-me
description: What Flock Me does and the exact conditions under which it should activate.
---
```

The shared file shape does not make activation, discovery, or installation identical. Each harness adds its own locations, controls, and commands.

## Comparison

| Harness | Project skill location | User skill location | Direct invocation | Implicit activation control | Verification |
| --- | --- | --- | --- | --- | --- |
| Codex | `.agents/skills/flock-me/` | `~/.agents/skills/flock-me/` | `$flock-me`; `/skills` opens selection | `agents/openai.yaml` with `allow_implicit_invocation: false` | Open `/skills`; restart if a new skill is not detected |
| Claude Code | `.claude/skills/flock-me/` | `~/.claude/skills/flock-me/` | `/flock-me` | `disable-model-invocation: true` in `SKILL.md` | Invoke `/flock-me`; restart only when a new top-level skill directory was created after session start |
| Grok Build | `.grok/skills/flock-me/` | `~/.grok/skills/flock-me/` | `/flock-me` | `disable-model-invocation: true` in `SKILL.md` | Run `grok inspect` or open `/skills` |
| Gemini CLI | `.gemini/skills/flock-me/` or `.agents/skills/flock-me/` | `~/.gemini/skills/flock-me/` or `~/.agents/skills/flock-me/` | Ask Gemini to use Flock Me, then approve activation | No documented per-skill manual-only field | Run `gemini skills list` or `/skills list`; use `/skills reload` after changes |

## Codex

### Definition

Codex requires `SKILL.md` with `name` and `description` frontmatter. The optional `agents/openai.yaml` file defines UI metadata, dependencies, and invocation policy.

```text
flock-me/
├── SKILL.md
└── agents/
    └── openai.yaml
```

Codex scans `.agents/skills` from the current working directory through the repository root. It also scans `$HOME/.agents/skills` for user-level skills and supports symlinked skill directories.

### Activation

Codex supports explicit `$skill-name` invocation and implicit matching against the skill description. Setting `policy.allow_implicit_invocation` to `false` preserves Flock Me's manual entry point while allowing a separate lifecycle hook to request the new-session workflow.

### Flock Me package decision

Store the Codex version under `skills/codex/flock-me/`. Include `agents/openai.yaml` with implicit invocation disabled.

### Official source

- [OpenAI: Build skills](https://learn.chatgpt.com/docs/build-skills)

## Claude Code

### Definition

Claude Code requires `SKILL.md` inside a named skill directory. `description` is recommended and `name` is optional because the directory name supplies the command name for personal and project skills.

Claude supports additional frontmatter, including:

- `when_to_use` for additional activation context;
- `argument-hint` and named `arguments`;
- `disable-model-invocation` for manual-only skills;
- `user-invocable` for hiding a model-only skill from the command menu;
- tool, model, subagent, hook, and path controls.

Project skills live under `.claude/skills/<skill-name>/`. Personal skills live under `~/.claude/skills/<skill-name>/`. The directory name creates the slash command.

### Activation

Claude can choose a skill from its description or the user can invoke `/flock-me`. `disable-model-invocation: true` disables model-selected activation while retaining the slash command.

### Flock Me package decision

Store the Claude version under `skills/claude/flock-me/`. Mark it manual-only. A future Claude `SessionStart` hook must deliberately load the skill for the automatic review path.

### Official source

- [Anthropic: Extend Claude with skills](https://code.claude.com/docs/en/slash-commands)

## Grok Build

### Definition

Grok Build discovers native skills from project `.grok/skills/`, user `~/.grok/skills/`, enabled plugins, and extra configured paths. It also reads Claude Code skills and user-level `.agents/skills` for compatibility.

Grok reads YAML frontmatter from `SKILL.md`. Its documented fields include:

- `name` and `description`;
- `when-to-use` or `when_to_use`;
- `paths`;
- `argument-hint`;
- `user-invocable`;
- `disable-model-invocation`;
- `allowed-tools` as descriptive compatibility metadata;
- `metadata` for values such as author and short description.

### Activation

User-invocable skills appear as slash commands. `disable-model-invocation: true` makes the skill slash-command only.

### Flock Me package decision

Store a native Grok version under `skills/grok-build/flock-me/` even though Grok can read the Claude version. The native package makes installation intent explicit and leaves room for Grok-specific hook integration.

### Official sources

- [xAI: Skills, Plugins and Marketplaces](https://docs.x.ai/build/features/skills-plugins-marketplaces)
- [xAI: Modes and Commands](https://docs.x.ai/build/modes-and-commands)

## Gemini CLI

### Definition

Gemini CLI requires `name` and `description` frontmatter at the beginning of `SKILL.md`. The recommended directory includes optional `scripts/`, `references/`, and `assets/` beside the skill file.

Gemini discovers workspace and user skills from both `.gemini/skills` and the cross-harness `.agents/skills` alias. Workspace skills require a trusted folder. A skill must sit at the root of the skills directory or exactly one directory below it.

### Activation

Gemini compares the request with the skill description, calls its internal `activate_skill` tool, and asks the user to approve activation. Official documentation states that users cannot call `activate_skill` manually. No documented per-skill field disables implicit activation while retaining a direct slash command.

For Flock Me, the description must narrowly match either an explicit request to use Flock Me or lifecycle context requesting the new-session review. This is the closest documented mapping to the two-entry activation contract.

### Installation and verification

Gemini provides `gemini skills install <source>` and `gemini skills link <path>`. Use `gemini skills list` or `/skills list` to verify discovery and `/skills reload` after file changes.

### Flock Me package decision

Store the Gemini version under `skills/gemini/flock-me/`. Keep only the portable `name` and `description` frontmatter because Gemini does not document the vendor-specific invocation fields used by Claude and Grok.

### Official sources

- [Google: Creating Agent Skills](https://geminicli.com/docs/cli/creating-skills/)
- [Google: Managing Agent Skills](https://geminicli.com/docs/cli/using-agent-skills/)
- [Google: Activate skill tool](https://geminicli.com/docs/tools/activate-skill/)

## Session-start boundary

The Flock Me product contract includes a new-session review for recent signs of household travel. A skill file does not schedule that review. Each harness uses a separate startup-only `SessionStart` hook that injects a compact instruction. Research and per-harness history/memory notes are in [`lifecycle-hooks.md`](lifecycle-hooks.md). Hook packages are in [`hooks/`](../hooks/).

Installation may claim that automatic session review is wired through those hooks. It must not claim that live Have I Been Flocked lookup works. Grok's native SessionStart stdout is currently ignored; install the Claude hook file as well.

