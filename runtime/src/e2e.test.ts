import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(new URL(".", import.meta.url)));
const CLI = join(ROOT, "src", "cli.ts");
const HOUSEHOLD = join(ROOT, "fixtures", "e2e-household.json");

const TEST_PLATES = ["TESTPLATE", "ABC-123", "SAMPLE1"] as const;

type CliJson = {
  ok: boolean;
  command: string;
  status: string;
  message: string;
  [key: string]: unknown;
};

function spawnCli(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ code: number; stdout: string; stderr: string; payload: CliJson | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", CLI, ...args],
      {
        env,
        cwd: ROOT,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const trimmed = stdout.trim();
      const payload = trimmed.startsWith("{")
        ? (JSON.parse(trimmed) as CliJson)
        : null;
      resolve({ code: code ?? 1, stdout, stderr, payload });
    });
  });
}

function requirePayload(
  result: { payload: CliJson | null; stdout: string; stderr: string; code: number },
): CliJson {
  assert.ok(
    result.payload,
    `CLI did not print JSON.\nexit=${result.code}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
  );
  return result.payload;
}

function assertNoPlateLeak(text: string, plates: readonly string[] = TEST_PLATES): void {
  const lower = text.toLowerCase();
  for (const plate of plates) {
    assert.equal(text.includes(plate), false, `raw plate leaked: ${plate}`);
    assert.equal(lower.includes(plate.toLowerCase()), false, `raw plate leaked: ${plate}`);
  }
}

describe("end-to-end CLI (spawned process, non-sensitive plates)", () => {
  it("walks setup, enroll, check, review, inspect, and delete without live HTTP", async () => {
    const dir = await mkdtemp(join(tmpdir(), "flock-me-e2e-"));
    const statePath = join(dir, "state.json");
    const env = {
      ...process.env,
      FLOCK_ME_STATE: statePath,
      HOME: dir,
    };

    try {
      const setup = await spawnCli(["setup"], env);
      assert.equal(setup.code, 0);
      assert.equal(requirePayload(setup).status, "setup-offer");
      assert.match(requirePayload(setup).message, /Enable Flock Me|enroll/i);

      const noConsent = await spawnCli(["add", "--plate", "TESTPLATE"], env);
      assert.equal(noConsent.code, 1);
      assertNoPlateLeak(noConsent.stdout);
      assertNoPlateLeak(noConsent.stderr);

      const first = await spawnCli(
        ["add", "--plate", "TESTPLATE", "--consent", "--label", "Daily driver"],
        env,
      );
      assert.equal(first.code, 0);
      assert.equal(requirePayload(first).status, "enrolled");
      assertNoPlateLeak(first.stdout);

      const second = await spawnCli(
        ["add", "--plate", "ABC-123", "--consent", "--label", "Partner car"],
        env,
      );
      assert.equal(second.code, 0);

      const third = await spawnCli(
        ["add", "--plate", "SAMPLE1", "--consent", "--label", "Spare"],
        env,
      );
      assert.equal(third.code, 0);

      const listed = await spawnCli(["list"], env);
      const listedPayload = requirePayload(listed);
      assert.equal(listedPayload.status, "listed");
      const labels = (listedPayload.vehicles as { label: string }[]).map(
        (vehicle) => vehicle.label,
      );
      assert.deepEqual(labels, ["Daily driver", "Partner car", "Spare"]);
      assertNoPlateLeak(listed.stdout);

      const live = await spawnCli(["check"], env);
      assert.equal(live.code, 2);
      assert.equal(requirePayload(live).status, "unavailable");
      assert.match(String(requirePayload(live).message), /does not permit automated access/);

      const matched = await spawnCli(["check", "--fixture", HOUSEHOLD], env);
      const matchedPayload = requirePayload(matched);
      assert.equal(matched.code, 0);
      assert.equal(matchedPayload.status, "matches");
      const fresh = matchedPayload.fresh as { label: string; agency: string }[];
      assert.equal(fresh.length, 2);
      assert.deepEqual(
        fresh.map((row) => row.label).sort(),
        ["Daily driver", "Spare"],
      );
      assert.match(matchedPayload.message, /Daily driver/);
      assert.match(matchedPayload.message, /Spare/);
      assert.match(matchedPayload.message, /incomplete and delayed/);
      assertNoPlateLeak(matched.stdout);
      assert.equal(JSON.stringify(matchedPayload).includes("d2097ce6"), false);

      const again = await spawnCli(["check", "--fixture", HOUSEHOLD], env);
      const againPayload = requirePayload(again);
      assert.equal(again.code, 0);
      assert.equal((againPayload.fresh as unknown[]).length, 0);
      assert.equal((againPayload.previouslySeen as unknown[]).length, 2);

      const partner = await spawnCli(
        ["check", "--label", "Partner car", "--fixture", HOUSEHOLD],
        env,
      );
      const partnerPayload = requirePayload(partner);
      assert.equal(partnerPayload.status, "no-match");
      assert.match(String(partnerPayload.message), /Partner car/);

      const start = await spawnCli(
        ["session-start", "--format", "plain", "--source", "startup"],
        env,
      );
      assert.equal(start.code, 0);
      assert.match(start.stdout, /travel|review|Flock Me/i);
      assertNoPlateLeak(start.stdout);

      const absent = await spawnCli(["review", "--verdict", "absent"], env);
      const absentPayload = requirePayload(absent);
      assert.equal(absentPayload.status, "silent");
      assert.equal(absentPayload.interrupt, false);

      const confirmed = await spawnCli(
        ["review", "--verdict", "confirmed", "--fixture", HOUSEHOLD],
        env,
      );
      const confirmedPayload = requirePayload(confirmed);
      assert.ok(
        confirmedPayload.status === "already-checked" ||
          confirmedPayload.status === "silent",
        `confirmed review should stay quiet after an explicit check, got ${confirmedPayload.status}`,
      );
      assert.equal(confirmedPayload.interrupt, false);

      const inspected = await spawnCli(["inspect"], env);
      const inspectedPayload = requirePayload(inspected);
      assert.equal(inspectedPayload.status, "inspected");
      assertNoPlateLeak(inspected.stdout);
      assert.equal(JSON.stringify(inspectedPayload).includes("d2097ce6"), false);
      assert.equal(JSON.stringify(inspectedPayload).includes("e8513079"), false);

      const rawState = await readFile(statePath, "utf8");
      assertNoPlateLeak(rawState);
      assert.equal(rawState.includes('"plate"'), false);
      const parsed = JSON.parse(rawState) as {
        vehicles: Array<Record<string, unknown>>;
      };
      assert.equal(parsed.vehicles.length, 3);
      for (const vehicle of parsed.vehicles) {
        assert.equal("plate" in vehicle, false);
        assert.equal(typeof vehicle.derivedId, "string");
      }

      const wiped = await spawnCli(["delete-data", "--confirm"], env);
      assert.equal(wiped.code, 0);
      assert.equal(wiped.payload.status, "deleted");
      await assert.rejects(readFile(statePath, "utf8"), { code: "ENOENT" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
