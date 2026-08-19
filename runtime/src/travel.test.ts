import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { evaluateTravel, parseTravelFixture } from "./travel.ts";

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), "../fixtures/travel");

describe("travel rubric", () => {
  it("loads every fixture and matches the documented verdict", async () => {
    const names = (await readdir(FIXTURE_DIR)).filter((name) => name.endsWith(".json")).sort();
    assert.deepEqual(names, [
      "absent.json",
      "ambiguous.json",
      "direct.json",
      "indirect.json",
    ]);
    const seen = new Set<string>();
    for (const name of names) {
      const fixture = parseTravelFixture(
        JSON.parse(await readFile(join(FIXTURE_DIR, name), "utf8")),
      );
      seen.add(fixture.category);
      assert.equal(evaluateTravel(fixture.signals), fixture.expectedVerdict, fixture.id);
      assert.doesNotMatch(fixture.context, /[A-Z0-9]{5,8}/);
    }
    assert.deepEqual([...seen].sort(), ["absent", "ambiguous", "direct", "indirect"]);
  });
});
