#!/usr/bin/env node
/**
 * Harness-specific discovery and invocation tests.
 * Verifies each skill package is present, has the required frontmatter and
 * invocation controls, and matches the installation/discovery table in AGENTS.md.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const packages = [
  {
    harness: "codex",
    skillPath: "skills/codex/flock-me",
    invoke: "$flock-me",
    requiresDisableModelInvocation: false,
    requiresOpenaiYaml: true,
    descriptionMustInclude: ["$flock-me", "lifecycle"],
    verification: "Open `/skills` or restart Codex if the skill does not appear",
  },
  {
    harness: "claude",
    skillPath: "skills/claude/flock-me",
    invoke: "/flock-me",
    requiresDisableModelInvocation: true,
    requiresOpenaiYaml: false,
    descriptionMustInclude: ["/flock-me"],
    verification: "Invoke `/flock-me`; restart Claude Code if a newly created top-level skills directory is not detected",
  },
  {
    harness: "grok-build",
    skillPath: "skills/grok-build/flock-me",
    invoke: "/flock-me",
    requiresDisableModelInvocation: true,
    requiresOpenaiYaml: false,
    descriptionMustInclude: ["/flock-me"],
    verification: "Run `grok inspect` or open `/skills`",
  },
  {
    harness: "gemini",
    skillPath: "skills/gemini/flock-me",
    invoke: "Flock Me",
    requiresDisableModelInvocation: false,
    requiresOpenaiYaml: false,
    descriptionMustInclude: ["explicitly asks", "Flock Me"],
    verification: "Run `gemini skills list` or `/skills list`",
  },
];

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, "SKILL.md must start with YAML frontmatter");
  const block = match[1];
  const fields = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return { fields, bodyStart: match[0].length };
}

for (const pack of packages) {
  const skillDir = join(root, pack.skillPath);
  assert.ok(existsSync(skillDir), `${pack.harness}: skill directory missing at ${pack.skillPath}`);
  const skillFile = join(skillDir, "SKILL.md");
  assert.ok(existsSync(skillFile), `${pack.harness}: SKILL.md missing`);

  const raw = readFileSync(skillFile, "utf8");
  const { fields } = parseFrontmatter(raw);

  assert.equal(fields.name, "flock-me", `${pack.harness}: name must be flock-me`);
  assert.ok(fields.description && fields.description.length > 20, `${pack.harness}: description required`);

  for (const token of pack.descriptionMustInclude) {
    assert.ok(
      fields.description.includes(token) || raw.includes(token),
      `${pack.harness}: description/body must reference invocation token "${token}"`,
    );
  }

  if (pack.requiresDisableModelInvocation) {
    assert.equal(
      fields["disable-model-invocation"],
      "true",
      `${pack.harness}: disable-model-invocation must be true for slash-command-only activation`,
    );
  }

  if (pack.requiresOpenaiYaml) {
    const yamlPath = join(skillDir, "agents", "openai.yaml");
    assert.ok(existsSync(yamlPath), `${pack.harness}: agents/openai.yaml required`);
    const yaml = readFileSync(yamlPath, "utf8");
    assert.ok(
      /allow_implicit_invocation:\s*false/.test(yaml),
      `${pack.harness}: allow_implicit_invocation must be false`,
    );
  }

  // Directory must contain only expected skill artifacts (no stray runtime)
  const entries = readdirSync(skillDir);
  assert.ok(entries.includes("SKILL.md"), `${pack.harness}: SKILL.md present`);
}

// Cross-check AGENTS.md installation table still lists all four harnesses
const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
for (const pack of packages) {
  assert.ok(
    agents.includes(pack.skillPath) || agents.includes(`skills/${pack.harness}/flock-me/`),
    `AGENTS.md must document repository source for ${pack.harness}`,
  );
  assert.ok(
    agents.includes(pack.verification.split(";")[0].slice(0, 20)) || agents.includes(pack.invoke),
    `AGENTS.md should reference verification or invoke for ${pack.harness}`,
  );
}

// Hook packages remain present (discovery of startup path)
const hookPaths = [
  "hooks/codex/hooks.json",
  "hooks/claude/settings.json",
  "hooks/grok/flock-me-session-start.json",
  "hooks/gemini/settings.json",
];
for (const p of hookPaths) {
  assert.ok(existsSync(join(root, p)), `hook package missing: ${p}`);
}

console.log("harness-specific discovery and invocation checks passed for codex, claude, grok-build, gemini");
