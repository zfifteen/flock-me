#!/usr/bin/env node
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const canonical = readFileSync(join(root, "skills/behavior.md"), "utf8").trim();

const invokeByHarness = {
  claude: "/flock-me",
  codex: "$flock-me",
  gemini: "Flock Me",
  "grok-build": "/flock-me",
};

const skillsDir = join(root, "skills");
const harnesses = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

assert.deepEqual(harnesses, ["claude", "codex", "gemini", "grok-build"]);

for (const harness of harnesses) {
  const invoke = invokeByHarness[harness];
  assert.ok(invoke, `missing invocation token for ${harness}`);
  const raw = readFileSync(join(skillsDir, harness, "flock-me", "SKILL.md"), "utf8");
  const match = raw.match(/^---\n[\s\S]*?\n---\n\n([\s\S]*)$/);
  assert.ok(match, `${harness} SKILL.md must start with YAML frontmatter`);
  const body = match[1].trim();
  const expected = canonical.replaceAll("{{INVOKE}}", invoke);
  assert.equal(
    body,
    expected,
    `${harness} SKILL.md behavior drifted from skills/behavior.md`,
  );
}

console.log("skill behavior sections match skills/behavior.md");
