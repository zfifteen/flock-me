import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "./cli.ts";

const FIXTURE = fileURLToPath(new URL("../fixtures/rehearsal.json", import.meta.url));

async function withState(fn: (statePath: string, env: NodeJS.ProcessEnv) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "flock-me-cli-"));
  const statePath = join(dir, "state.json");
  const env = { ...process.env, FLOCK_ME_STATE: statePath };
  try {
    await fn(statePath, env);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function argv(...args: string[]) {
  return ["node", "cli.ts", ...args];
}

describe("explicit-check CLI", () => {
  it("checks every enrolled vehicle and does not require travel evidence", async () => {
    await withState(async (_statePath, env) => {
      const empty = await run(argv("check"), env);
      assert.equal(empty.payload.status, "setup-required");
      assert.match(String(empty.payload.message), /Enable Flock Me/);

      const denied = await run(argv("add", "--plate", "TESTPLATE"), env);
      assert.equal(denied.exitCode, 1);
      assert.match(String(denied.payload.message), /consent/i);

      const added = await run(
        argv("add", "--plate", "TESTPLATE", "--consent", "--label", "My car"),
        env,
      );
      assert.equal(added.payload.status, "enrolled");
      assert.equal(JSON.stringify(added.payload).includes("TESTPLATE"), false);
      assert.equal(JSON.stringify(added.payload).includes("d2097ce6"), false);

      const partner = await run(argv("add", "--plate", "ABC-123", "--consent"), env);
      assert.equal(partner.payload.status, "enrolled");

      const listed = await run(argv("list"), env);
      assert.deepEqual(
        (listed.payload.vehicles as { label: string }[]).map((vehicle) => vehicle.label),
        ["My car", "Partner's car"],
      );

      const unavailable = await run(argv("check"), env);
      assert.equal(unavailable.exitCode, 2);
      assert.equal(unavailable.payload.status, "unavailable");
      assert.match(String(unavailable.payload.message), /does not permit automated access/);

      const matched = await run(argv("check", "--fixture", FIXTURE), env);
      assert.equal(matched.payload.status, "matches");
      assert.equal((matched.payload.fresh as { label: string }[])[0]?.label, "My car");
      assert.match(String(matched.payload.message), /My car/);
      assert.equal(JSON.stringify(matched.payload).includes("TESTPLATE"), false);

      const again = await run(argv("check", "--fixture", FIXTURE), env);
      assert.equal((again.payload.fresh as unknown[]).length, 0);
      assert.equal((again.payload.previouslySeen as unknown[]).length, 1);

      const named = await run(
        argv("check", "--label", "Partner's car", "--fixture", FIXTURE),
        env,
      );
      assert.equal(named.payload.status, "no-match");
      assert.match(String(named.payload.message), /Partner's car/);
    });
  });

  it("renames, removes, inspects, and deletes local data", async () => {
    await withState(async (statePath, env) => {
      await run(argv("add", "--plate", "TESTPLATE", "--consent"), env);
      const renamed = await run(argv("rename", "--from", "My car", "--to", "Work truck"), env);
      assert.equal(renamed.payload.status, "renamed");

      const inspected = await run(argv("inspect"), env);
      assert.equal(inspected.payload.status, "inspected");
      assert.equal(JSON.stringify(inspected.payload).includes("d2097ce6"), false);

      const withIds = await run(argv("inspect", "--show-ids"), env);
      assert.match(JSON.stringify(withIds.payload), /d2097ce6/);

      const removed = await run(argv("remove", "--label", "Work truck"), env);
      assert.equal(removed.payload.status, "removed");

      await run(argv("add", "--plate", "TESTPLATE", "--consent"), env);
      const cleared = await run(argv("clear", "--confirm"), env);
      assert.equal(cleared.payload.status, "cleared");
      const listed = await run(argv("list"), env);
      assert.equal(listed.payload.status, "empty");

      await run(argv("add", "--plate", "TESTPLATE", "--consent"), env);
      await run(argv("delete-data", "--confirm"), env);
      await assert.rejects(readFile(statePath, "utf8"), { code: "ENOENT" });
    });
  });
});
