# Startup-only hook packages

These packages inject a compact Flock Me session-review instruction at **new session start**. They do not parse transcripts, classify travel, or call Have I Been Flocked.

Install only through [`AGENTS.md`](../AGENTS.md). Replace `{{FLOCK_ME_ROOT}}` with the absolute path to this clone before writing the harness file.

| Harness | Package | Target | Matcher | Trust |
| --- | --- | --- | --- | --- |
| Codex | `hooks/codex/hooks.json` | `~/.codex/hooks.json` or `<repo>/.codex/hooks.json` | `startup` | Review via `/hooks` |
| Claude Code | `hooks/claude/settings.json` | merge into `~/.claude/settings.json` or `<repo>/.claude/settings.json` | `startup` | First-run hook approval |
| Grok Build | `hooks/grok/flock-me-session-start.json` | `~/.grok/hooks/flock-me-session-start.json` or `<repo>/.grok/hooks/` | omitted (script uses `--source startup`) | `/hooks-trust` for project hooks |
| Gemini CLI | `hooks/gemini/settings.json` | merge into `~/.gemini/settings.json` or `<repo>/.gemini/settings.json` | `startup` | Fingerprint prompt if the command changes |

The command is always:

```
node --experimental-strip-types <root>/runtime/src/cli.ts session-start --format <harness> --hook
```

Stdout is harness JSON with `hookSpecificOutput.additionalContext`. The hook never looks up plates. After the model reasons about travel, it runs `review` or `checkpoint --mark`.

Grok's native SessionStart documentation currently ignores stdout on passive events. The Grok package still emits Claude-compatible JSON because Grok also reads `.claude/settings.json`. Installing the Claude package alongside the Grok package is the supported context-injection path until Grok documents `additionalContext` for SessionStart.

Uninstall by removing only the Flock Me `SessionStart` matcher group. Leave unrelated hooks in place.
