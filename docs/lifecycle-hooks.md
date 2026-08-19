# Lifecycle hooks and host context

**Research date:** 2026-08-19

Flock Me's automatic path is a new-session review. A `SKILL.md` file cannot schedule that review. Each harness needs a **startup-only** `SessionStart` hook that injects a compact instruction into the first ordinary model turn. The hook does not parse transcripts, classify travel, or call Have I Been Flocked.

Packages live in [`hooks/`](../hooks/). Installation is in [`AGENTS.md`](../AGENTS.md). The product contract is [`session-review.md`](session-review.md).

## Comparison

| | Codex | Claude Code | Grok Build | Gemini CLI |
| --- | --- | --- | --- | --- |
| Event | `SessionStart` | `SessionStart` | `SessionStart` | `SessionStart` |
| Config | `hooks.json` or `[hooks]` in `config.toml` | `hooks` in `settings.json` | `~/.grok/hooks/*.json` or project `.grok/hooks/` | `hooks` in `settings.json` |
| User file | `~/.codex/hooks.json` | `~/.claude/settings.json` | `~/.grok/hooks/` | `~/.gemini/settings.json` |
| Project file | `<repo>/.codex/hooks.json` | `<repo>/.claude/settings.json` | `<repo>/.grok/hooks/` (`/hooks-trust`) | `<repo>/.gemini/settings.json` |
| Startup matcher | `startup` on `source` | `startup` on `source` | none documented; script skips non-startup | `startup` (exact string) |
| Context injection | stdout text or `hookSpecificOutput.additionalContext` | `hookSpecificOutput.additionalContext` or plain stdout | **Native SessionStart stdout is ignored** (passive events). Claude-format JSON is still emitted because Grok reads `.claude/settings.json`. | `hookSpecificOutput.additionalContext` (JSON-only stdout) |
| Transcript at start | `transcript_path` (often null on `startup`) | `transcript_path` JSONL | not documented | not documented on the hook payload |
| Memory | none comparable to Claude `MEMORY.md` | `CLAUDE.md`, auto memory `MEMORY.md` | `AGENTS.md` / Claude-compat files | `GEMINI.md`, `/memory`, session transcripts on disk |
| Skill auto-invoke | `allow_implicit_invocation: false` | `disable-model-invocation: true` | `disable-model-invocation: true` | no manual-only field; `activate_skill` asks for consent |
| Min version | Codex hooks since rust-v0.114 (2026-03); require SessionStart | Claude Code with SessionStart hooks | Grok Build with documented hooks | Gemini CLI ≥ 0.26.0 (hooks on by default); SessionStart `additionalContext` documented 2026-04 |

## Codex

Official: [Hooks](https://learn.chatgpt.com/docs/hooks)

Discovery order: `~/.codex/hooks.json`, `~/.codex/config.toml`, `<repo>/.codex/hooks.json`, `<repo>/.codex/config.toml`. Plugin bundles may add `hooks/hooks.json`. Non-managed hooks must be reviewed (`/hooks`). `features.hooks = false` disables them.

`SessionStart` matchers: `startup`, `resume`, `clear`, `compact`. Flock Me uses **`startup` only**. Resume already had a review; compact and clear are mid-session or reset events, not a new household-travel window.

Input includes `session_id`, `transcript_path` (nullable), `cwd`, `hook_event_name`, `model`, and `source`. Plain stdout becomes developer context. JSON `additionalContext` is also supported, capped by `additionalContextLimit` (default 2500).

**History:** a brand-new `startup` session has no prior transcript (`transcript_path` may be null). Resume restores the previous thread. Compact shrinks history, then fires `SessionStart` with `source=compact` — Flock Me ignores that. Codex does not document a Claude-style auto-memory file. The review may use only the current turn's host-provided context plus whatever the user or `AGENTS.md` already loaded.

## Claude Code

Official: [Hooks](https://code.claude.com/docs/en/hooks), [Memory](https://code.claude.com/docs/en/memory)

Config: `~/.claude/settings.json`, project `.claude/settings.json`, `.claude/settings.local.json`, plugin `hooks/hooks.json`. Skill-frontmatter hooks run only **after** the skill is invoked, so they cannot start the review.

`SessionStart` sources: `startup`, `resume`, `clear`, `compact`, `fork`. Matcher `startup`. Input includes `transcript_path` to the session JSONL, `cwd`, `session_id`, `source`, and optional `model`.

Output: `hookSpecificOutput.additionalContext` is added before the first prompt. Plain stdout is also treated as context. `continue` is not used to block startup.

**History and memory on a new session:**

- Conversation history is empty unless the user resumed.
- `CLAUDE.md` / `CLAUDE.local.md` / `.claude/rules/` load as instruction memory.
- Auto memory: `~/.claude/projects/<project>/memory/MEMORY.md` (first 200 lines / 25KB) plus on-demand topic files.
- Session summaries may be recalled as "Recalled N memories".
- Transcripts exist on disk for the current session and are deleted after `cleanupPeriodDays`. The hook must **not** read `transcript_path`. The model may use memory files the host already injected.

## Grok Build

Official: [Hooks](https://docs.x.ai/build/features/hooks), [Skills, Plugins and Marketplaces](https://docs.x.ai/build/features/skills-plugins-marketplaces)

Discovery: `~/.grok/hooks/`, extra roots via `~/.grok/hooks-paths`, project `.grok/hooks/` (requires `/hooks-trust` or `--trust`), enabled plugins. Grok also reads Claude `.claude/settings.json` and Cursor `.cursor/hooks.json`.

Events include `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse` (only blocking event), `PostToolUse`, `Stop`, `Notification`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PostCompact`.

Stdin JSON: `hookEventName`, `sessionId`, `cwd`, `workspaceRoot`. Env: `GROK_HOOK_EVENT`, `GROK_HOOK_NAME`, `GROK_SESSION_ID`, `GROK_WORKSPACE_ROOT`.

**Limitation:** documented behavior is "for passive events, stdout is ignored; exit 0 on success." Native Grok SessionStart therefore cannot be relied on to inject model context. Flock Me still ships a Grok SessionStart package that emits Claude-compatible `additionalContext` JSON and exits 0. The supported injection path is to **also install the Claude hook file**, which Grok reads. Until Grok documents SessionStart `additionalContext`, automatic review on Grok is best-effort; explicit `/flock-me` remains the guaranteed entry.

**History:** Grok loads `AGENTS.md` and Claude-compat instruction files. No transcript path is documented on the hook payload. The review may use only context the host already placed in the first turn.

## Gemini CLI

Official: [Hooks](https://geminicli.com/docs/hooks/), [Hooks reference](https://geminicli.com/docs/hooks/reference/), [Creating skills](https://geminicli.com/docs/cli/creating-skills/), [Activate skill](https://geminicli.com/docs/tools/activate-skill/), [GEMINI.md](https://geminicli.com/docs/cli/gemini-md/), [Session management](https://geminicli.com/docs/cli/session-management/)

Config merge (high to low): project `.gemini/settings.json`, `~/.gemini/settings.json`, `/etc/gemini-cli/settings.json`, extensions. Timeout is **milliseconds** (default 60000). Matchers for lifecycle events are exact strings (`startup`).

Stdout must be **only JSON**. Plain text breaks parsing. `SessionStart` output:

```json
{
  "hookSpecificOutput": {
    "additionalContext": "…"
  }
}
```

`continue` and `decision` are ignored. `additionalContext` is injected as the first history turn (interactive) or prepended to the prompt (non-interactive). Sources: `startup`, `resume`, `clear`.

**Activation consent:** when a user query matches a skill description, Gemini calls `activate_skill` and asks the user to approve. There is no per-skill manual-only flag. Users cannot invoke `activate_skill` themselves.

**Resolution:** the SessionStart hook injects the review instruction **without activating the skill**. The model follows that instruction and runs the CLI. It must not call `activate_skill` on the automatic path. Explicit "use Flock Me" still goes through `activate_skill` and user approval. The Gemini skill description stays narrow so ordinary travel remarks do not prompt activation.

**History and memory:** new sessions load hierarchical `GEMINI.md` and saved memories (`/memory show`). Conversations are saved as local transcripts and can be resumed (`gemini --resume`). Auto Memory may mine past transcripts into durable notes. The hook does not read those files. The model may use whatever the host already loaded.

## Shared implementation rules

1. One event: `SessionStart`. No `UserPromptSubmit`, `PreToolUse`, or `Stop` hooks.
2. Matcher `startup` wherever the vendor documents a source matcher.
3. Command: `runtime/src/cli.ts session-start --format <harness> --hook`.
4. The hook prints instruction JSON and exits 0. It never looks up identifiers.
5. `resume`, `compact`, `clear`, and `fork` do not run Flock Me.
6. Missing `source` (Grok) is treated as startup so a first session still gets the instruction.
7. Distribution remains **repository-based**. Vendor plugin/marketplace wrappers can reuse these files later; they are not required for v1.

## Official sources

- [OpenAI Codex hooks](https://learn.chatgpt.com/docs/hooks)
- [Anthropic Claude Code hooks](https://code.claude.com/docs/en/hooks)
- [Anthropic Claude Code memory](https://code.claude.com/docs/en/memory)
- [xAI Grok Build hooks](https://docs.x.ai/build/features/hooks)
- [Google Gemini CLI hooks](https://geminicli.com/docs/hooks/)
- [Google Gemini CLI hooks reference](https://geminicli.com/docs/hooks/reference/)
- [Google Gemini activate_skill](https://geminicli.com/docs/tools/activate-skill/)
