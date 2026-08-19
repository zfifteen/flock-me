import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FixtureAdapter, UnavailableAdapter } from "./adapter.ts";
import { runCheck } from "./check.ts";
import { FIRST_SESSION_SETUP_OFFER, SERVICE_UNAVAILABLE_MESSAGE } from "./copy.ts";
import { enrollVehicle } from "./registry.ts";
import { emptyState } from "./types.ts";

const NOW = "2026-08-19T00:00:00.000Z";
const MATCH_FIXTURE = {
  results: [
    {
      id: "rec-1",
      identifier: "d2097ce6",
      agency: "Example PD",
      operator: "J. Doe",
      searchTime: NOW,
      reason: "investigation",
      caseNumber: "24-100",
      searchType: "Lookup",
      devicesSearched: 12,
      networksSearched: 2,
    },
  ],
  nextCursor: null,
  hasMore: false,
  total: 1,
};

function enrolled(plates: string[]) {
  let state = emptyState();
  for (const plate of plates) {
    state = enrollVehicle(state, { plate, consented: true, now: NOW }).state;
  }
  return state;
}

describe("explicit check", () => {
  it("offers setup when no vehicles are enrolled", async () => {
    const outcome = await runCheck(emptyState(), {
      adapter: new UnavailableAdapter(),
      mode: "explicit",
    });
    assert.equal(outcome.status, "setup-required");
    assert.equal(outcome.message, FIRST_SESSION_SETUP_OFFER);
    assert.equal(outcome.persist, false);
  });

  it("fails explicitly when the service is unavailable", async () => {
    const outcome = await runCheck(enrolled(["TESTPLATE"]), {
      adapter: new UnavailableAdapter(),
      mode: "explicit",
    });
    assert.equal(outcome.status, "unavailable");
    assert.equal(outcome.message, SERVICE_UNAVAILABLE_MESSAGE);
    assert.equal(outcome.persist, false);
    assert.equal(outcome.code, "SERVICE_UNAVAILABLE");
  });

  it("batches every enrolled identifier and reports a match by label", async () => {
    const requested: string[][] = [];
    const inner = new FixtureAdapter(MATCH_FIXTURE);
    const adapter = {
      name: "capture",
      async lookup(request: { derivedIds: string[] }) {
        requested.push(request.derivedIds);
        return inner.lookup(request);
      },
    };
    const outcome = await runCheck(enrolled(["TESTPLATE", "ABC-123"]), {
      adapter,
      mode: "explicit",
      now: NOW,
    });
    assert.deepEqual(requested, [["d2097ce6", "5942d94f"]]);
    assert.equal(outcome.status, "matches");
    assert.equal(outcome.fresh[0]?.label, "My car");
    assert.equal(outcome.fresh[0]?.agency, "Example PD");
    assert.match(outcome.message, /My car/);
    assert.doesNotMatch(outcome.message, /d2097ce6/);
    assert.doesNotMatch(outcome.message, /TESTPLATE/i);
    assert.equal(outcome.persist, true);
    assert.equal(outcome.state.seenRecords.length, 1);
  });

  it("reports no match without claiming a live empty search of the world", async () => {
    const outcome = await runCheck(enrolled(["ABC-123"]), {
      adapter: new FixtureAdapter(MATCH_FIXTURE),
      mode: "explicit",
      now: NOW,
    });
    assert.equal(outcome.status, "no-match");
    assert.match(outcome.message, /no matching record/);
    assert.match(outcome.message, /My car/);
    assert.match(outcome.message, /incomplete and delayed/);
  });

  it("keeps previously seen records on a second explicit check", async () => {
    const first = await runCheck(enrolled(["TESTPLATE"]), {
      adapter: new FixtureAdapter(MATCH_FIXTURE),
      mode: "explicit",
      now: NOW,
    });
    const second = await runCheck(first.state, {
      adapter: new FixtureAdapter(MATCH_FIXTURE),
      mode: "explicit",
      now: NOW,
    });
    assert.equal(second.fresh.length, 0);
    assert.equal(second.previouslySeen.length, 1);
    assert.match(second.message, /Previously reported/);
    assert.equal(second.status, "matches");
  });

  it("stays silent in session mode when there is no fresh match", async () => {
    const first = await runCheck(enrolled(["TESTPLATE"]), {
      adapter: new FixtureAdapter(MATCH_FIXTURE),
      mode: "session",
      now: NOW,
    });
    const second = await runCheck(first.state, {
      adapter: new FixtureAdapter(MATCH_FIXTURE),
      mode: "session",
      now: NOW,
    });
    assert.equal(second.status, "silent");
    assert.equal(second.message, "");
  });
});
