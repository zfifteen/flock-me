#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const packages = [
  {
    harness: "codex",
    path: "hooks/codex/hooks.json",
    events: ["SessionStart"],
    matcher: "startup",
    format: "codex",
  },
  {
    harness: "claude",
    path: "hooks/claude/settings.json",
    events: ["SessionStart"],
    matcher: "startup",
    format: "claude",
  },
  {
    harness: "grok",
    path: "hooks/grok/flock-me-session-start.json",
    events: ["SessionStart"],
    matcher: null,
    format: "grok",
  },
  {
    harness: "gemini",
    path: "hooks/gemini/settings.json",
    events: ["SessionStart"],
    matcher: "startup",
    format: "gemini",
  },
];

for (const pack of packages) {
  const raw = JSON.parse(readFileSync(join(root, pack.path), "utf8"));
  const hooks = raw.hooks;
  assert.ok(hooks, `${pack.harness} is missing hooks`);
  assert.deepEqual(Object.keys(hooks).sort(), pack.events, `${pack.harness} must be SessionStart-only`);
  const groups = hooks.SessionStart;
  assert.ok(Array.isArray(groups) && groups.length === 1, `${pack.harness} needs one SessionStart group`);
  if (pack.matcher) {
    assert.equal(groups[0].matcher, pack.matcher, `${pack.harness} matcher must be startup`);
  }
  const command = groups[0].hooks[0].command;
  assert.match(command, /session-start/, `${pack.harness} must call session-start`);
  assert.match(command, /--hook/, `${pack.harness} must pass --hook`);
  assert.match(command, new RegExp(`--format ${pack.format}`), `${pack.harness} format`);
  assert.match(command, /\{\{FLOCK_ME_ROOT\}\}/, `${pack.harness} must keep the root placeholder`);
  assert.doesNotMatch(command, /check(?!point)/, `${pack.harness} must not lookup from the hook`);
}

console.log("hook packages are startup-only and call session-start");
