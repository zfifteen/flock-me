import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditRecordId } from "./audit-id.ts";
import { FixtureAdapter, UnavailableAdapter } from "./adapter.ts";
import { classifyAndRemember } from "./seen.ts";
import {
  clearRegistry,
  enrollVehicle,
  listVehicles,
  removeVehicle,
  removeVehicleByLabel,
  renameVehicle,
  renameVehicleByLabel,
  requireVehicleByLabel,
} from "./registry.ts";
import { parseState } from "./state.ts";
import { emptyState, type AuditRecord } from "./types.ts";

const NOW = "2026-08-18T00:00:00.000Z";

describe("household registry", () => {
  it("enrolls, deduplicates, lists, renames, removes, and clears", () => {
    let state = emptyState();
    const first = enrollVehicle(state, {
      plate: "TESTPLATE",
      consented: true,
      now: NOW,
    });
    assert.equal(first.result.status, "enrolled");
    assert.equal(first.result.vehicle.derivedId, "d2097ce6");
    assert.equal(first.result.vehicle.label, "My car");
    assert.equal(first.result.discardedPlate, true);
    state = first.state;

    const again = enrollVehicle(state, {
      plate: "  testplate  ",
      consented: true,
      now: NOW,
    });
    assert.equal(again.result.status, "duplicate");
    assert.equal(again.state.vehicles.length, 1);

    const second = enrollVehicle(state, {
      plate: "ABC-123",
      label: "Partner's car",
      consented: true,
      now: NOW,
    });
    state = second.state;
    assert.equal(listVehicles(state).length, 2);

    state = renameVehicle(state, "d2097ce6", "Work truck");
    assert.equal(state.vehicles[0]?.label, "Work truck");

    state = removeVehicle(state, "5942d94f");
    assert.equal(state.vehicles.length, 1);

    state = clearRegistry(state);
    assert.equal(state.vehicles.length, 0);
    assert.equal(state.seenRecords.length, 0);
  });

  it("selects, renames, and removes vehicles by label", () => {
    let state = emptyState();
    state = enrollVehicle(state, {
      plate: "TESTPLATE",
      consented: true,
      now: NOW,
    }).state;
    state = enrollVehicle(state, {
      plate: "ABC-123",
      consented: true,
      now: NOW,
    }).state;
    assert.equal(requireVehicleByLabel(state, "my car").derivedId, "d2097ce6");
    state = renameVehicleByLabel(state, "My car", "Work truck");
    assert.equal(state.vehicles[0]?.label, "Work truck");
    state = removeVehicleByLabel(state, "Partner's car");
    assert.equal(state.vehicles.length, 1);
    assert.throws(() => requireVehicleByLabel(state, "Partner's car"), /No enrolled vehicle/);
  });

  it("refuses enrollment without consent", () => {
    assert.throws(
      () =>
        enrollVehicle(emptyState(), {
          plate: "TESTPLATE",
          consented: false,
        }),
      /consent/i,
    );
  });
});

describe("state migration", () => {
  it("parses version 1 state and rejects plate fields", () => {
    const parsed = parseState({
      version: 1,
      vehicles: [{ derivedId: "d2097ce6", label: "My car", enrolledAt: NOW }],
      checkpoint: null,
      episode: null,
      seenRecords: [],
      consentAt: NOW,
      setupOfferedAt: NOW,
    });
    assert.equal(parsed.vehicles[0]?.derivedId, "d2097ce6");
    assert.throws(
      () =>
        parseState({
          version: 1,
          vehicles: [{ derivedId: "d2097ce6", label: "My car", plate: "TESTPLATE" }],
        }),
      /raw plate/i,
    );
  });
});

describe("adapter fixtures", () => {
  it("fails explicitly when the service is unavailable", async () => {
    await assert.rejects(
      () => new UnavailableAdapter().lookup({ derivedIds: ["d2097ce6"] }),
      /does not permit automated access/i,
    );
  });

  it("parses matches, empty results, redactions, and malformed records", async () => {
    const match = await new FixtureAdapter({
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
    }).lookup({ derivedIds: ["d2097ce6", "5942d94f"] });
    assert.equal(match.records.length, 1);
    assert.equal(match.records[0]?.agency, "Example PD");

    const empty = await new FixtureAdapter({
      results: [],
      hasMore: false,
      total: 0,
    }).lookup({ derivedIds: ["d2097ce6"] });
    assert.equal(empty.records.length, 0);

    const redacted = await new FixtureAdapter({
      results: [
        {
          identifier: "d2097ce6",
          agency: "Example PD",
          operator: "***",
          redacted: true,
        },
      ],
    }).lookup({ derivedIds: ["d2097ce6"] });
    assert.equal(redacted.records[0]?.redacted, true);

    await assert.rejects(
      () => new FixtureAdapter({ oops: true }).lookup({ derivedIds: ["d2097ce6"] }),
      /missing a results array/i,
    );
  });

  it("batches every supplied household identifier in one request", async () => {
    const seen: string[][] = [];
    const adapter = {
      name: "capture",
      async lookup(request: { derivedIds: string[] }) {
        seen.push(request.derivedIds);
        return { records: [], nextCursor: null, hasMore: false, total: 0 };
      },
    };
    await adapter.lookup({ derivedIds: ["d2097ce6", "5942d94f"] });
    assert.deepEqual(seen, [["d2097ce6", "5942d94f"]]);
  });
});

describe("audit-record deduplication", () => {
  it("remembers source ids and derived field tuples", () => {
    const record: AuditRecord = {
      sourceId: "rec-1",
      derivedId: "d2097ce6",
      agency: "Example PD",
      searchTime: NOW,
    };
    assert.equal(auditRecordId(record), "src:rec-1");
    const untitled: AuditRecord = {
      derivedId: "d2097ce6",
      agency: "Example PD",
      searchTime: NOW,
    };
    const first = classifyAndRemember(emptyState(), [record, untitled], NOW);
    assert.equal(first.fresh.length, 2);
    const second = classifyAndRemember(first.state, [record, untitled], NOW);
    assert.equal(second.fresh.length, 0);
    assert.equal(second.previouslySeen.length, 2);
  });
});
