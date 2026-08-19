# Troubleshooting

## The skill is not listed

- Confirm the harness package was copied to the path in [`AGENTS.md`](../AGENTS.md).
- Codex: open `/skills` or restart.
- Claude Code: invoke `/flock-me`. Restart if the skills directory was created after the session started.
- Grok Build: `grok inspect` or `/skills`.
- Gemini CLI: `gemini skills list` or `/skills list`, then `/skills reload`.

## Session-start review never runs

- The hook package must be installed and `{{FLOCK_ME_ROOT}}` replaced with this clone's absolute path.
- Codex: review the hook in `/hooks`. Untrusted hooks do not run.
- Claude Code: approve hooks on first run.
- Grok Build: project hooks need `/hooks-trust`. Native SessionStart stdout is ignored; also install `hooks/claude/settings.json`.
- Gemini CLI: lifecycle matcher is the exact string `startup`. If the command fingerprint changed, re-approve the hook. Stdout must be JSON only.
- Resume, `/clear`, and compact do not trigger Flock Me. Start a new session.

## `session-start` prints JSON that is not the usual CLI payload

That is intended for `--format` / `--hook`. Harnesses parse `hookSpecificOutput.additionalContext`. Debug without `--format` to see the normal payload.

## `status: unavailable`

Have I Been Flocked does not permit automated access. Explicit checks report this. Automatic reviews stay silent. Do not open haveibeenflocked.com as a fallback.

## `status: usage` or exit 1 on `add`

`--consent` is required. Invalid plates fail without echoing the plate. Internal spaces are invalid; hyphens are kept.

## Duplicate vehicle

Re-enrolling the same normalized plate returns `status: duplicate` and keeps one registry row.

## Raw plate in output or logs

Stop. File a bug. Enrollment must discard the plate. `inspect` without `--show-ids` must not print derived identifiers.

## Concurrent sessions

State writes are atomic (temp file + rename). Last writer wins. Derived identifiers are the uniqueness key.

## Uninstall leftovers

Remove the skill directory and the Flock Me `SessionStart` matcher group only. Then `delete-data --confirm` if the household wants local data gone. `~/.flock-me/state.json` is not removed by copying a skill out.
