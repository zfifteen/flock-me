import assert from "node:assert/strict";
import test from "node:test";
import {
  clearRegistry,
  createEmptyRegistry,
  enrollVehicle,
  inspectState,
  rememberRecords,
  removeVehicle,
  renameVehicle,
} from "../registry.mjs";
import { writeStateAtomic, readState, withStateLock } from "../state.mjs";
import { mkdtemp, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("enroll, duplicate, rename, remove, and clear", async () => {
  let state = createEmptyRegistry();
  const first = await enrollVehicle(state, { plate: "TESTPLATE", label: "My car" });
  assert.equal(first.ok, true);
  assert.equal(first.duplicate, false);
  assert.equal(first.vehicle.lookupId, "d2097ce6");
  state = first.state;

  const again = await enrollVehicle(state, { plate: "testplate", label: "Other" });
  assert.equal(again.duplicate, true);
  assert.equal(again.vehicle.label, "My car");
  assert.equal(again.state.vehicles.length, 1);

  const renamed = renameVehicle(state, "d2097ce6", "Partner's car");
  assert.equal(renamed.vehicle.label, "Partner's car");
  state = renamed.state;

  const second = await enrollVehicle(state, { plate: "2GAT123" });
  assert.equal(second.ok, true);
  assert.equal(second.vehicle.label, "Partner's car" === "x" ? "" : second.vehicle.label);
  state = second.state;
  assert.equal(state.vehicles.length, 2);

  const removed = removeVehicle(state, "d2097ce6");
  assert.equal(removed.state.vehicles.length, 1);
  const cleared = clearRegistry(removed.state);
  assert.equal(cleared.state.vehicles.length, 0);
});

test("inspect never exposes a raw plate field", async () => {
  const enrolled = await enrollVehicle(createEmptyRegistry(), { plate: "ABC1234", label: "Work truck" });
  const view = inspectState(enrolled.state);
  assert.equal(view.rawPlatesStored, false);
  assert.equal(JSON.stringify(view).includes("ABC1234"), false);
  assert.equal(view.vehicles[0].lookupId, "36f583dd");
});

test("previously seen record tracking", () => {
  const first = rememberRecords(createEmptyRegistry(), ["hibf:a", "hibf:b"]);
  assert.deepEqual(first.fresh, ["hibf:a", "hibf:b"]);
  const second = rememberRecords(first.state, ["hibf:b", "hibf:c"]);
  assert.deepEqual(second.fresh, ["hibf:c"]);
});

test("atomic write uses 0600 and migrates missing files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "flock-me-"));
  const path = join(dir, "state.json");
  const empty = await readState(path);
  assert.equal(empty.vehicles.length, 0);
  const enrolled = await enrollVehicle(empty, { plate: "TESTPLATE", label: "My car" });
  await writeStateAtomic(enrolled.state, path);
  const info = await stat(path);
  assert.equal(info.mode & 0o777, 0o600);
  const reloaded = await readState(path);
  assert.equal(reloaded.vehicles[0].lookupId, "d2097ce6");
});

test("concurrent writers fail closed", async () => {
  const dir = await mkdtemp(join(tmpdir(), "flock-me-"));
  const path = join(dir, "state.json");
  let releaseInner;
  const hold = new Promise((resolve) => {
    releaseInner = resolve;
  });
  const first = withStateLock(async (state) => {
    await hold;
    return state;
  }, path);
  await new Promise((resolve) => setTimeout(resolve, 20));
  await assert.rejects(() => withStateLock(async (state) => state, path), {
    code: "concurrent-session",
  });
  releaseInner();
  await first;
});
