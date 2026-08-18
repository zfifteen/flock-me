import assert from "node:assert/strict";
import test from "node:test";
import {
  LIVE_LOOKUP_ENABLED,
  MALFORMED_FIXTURE,
  checkVehicles,
  normalizeAdapterRecord,
  searchFixtures,
  unavailableResponse,
} from "../adapter.mjs";
import { auditRecordId } from "../audit.mjs";
import { deriveLookupId } from "../plate.mjs";

test("fixture match, no-match, and redaction", async () => {
  const hit = searchFixtures([await deriveLookupId("2GAT123")]);
  assert.equal(hit.status, "fixture");
  assert.equal(hit.results.length, 1);
  assert.equal(hit.results[0].orgName, "Oakridge Police Department");
  assert.equal(hit.results[0].meaning.means.includes("searched"), true);

  const miss = searchFixtures([await deriveLookupId("ABC1234")]);
  assert.equal(miss.results.length, 0);

  const redacted = searchFixtures([await deriveLookupId("TESTPLATE")]);
  assert.equal(redacted.results.length, 2);
  assert.equal(redacted.results.some((row) => row.redacted), true);
});

test("multiple-vehicle batching is a single fixture query", async () => {
  const ids = [await deriveLookupId("2GAT123"), await deriveLookupId("TESTPLATE")];
  const batch = searchFixtures(ids);
  assert.equal(batch.results.length, 3);
});

test("malformed records are rejected", () => {
  const parsed = normalizeAdapterRecord(MALFORMED_FIXTURE, "dabe815c");
  assert.equal(parsed.ok, false);
  assert.equal(parsed.code, "malformed");
});

test("audit identifiers are stable and collapse duplicates", () => {
  const record = {
    orgId: "fixture-oakridge-pd",
    searchTimeUtc: "2025-11-02T14:18:00.000Z",
    lookupId: "dabe815c",
    caseNumber: "25-4419",
    reason: "stolen vehicle",
  };
  const first = auditRecordId(record);
  const second = auditRecordId({ ...record, org_id: record.orgId });
  assert.equal(first, second);
  const changed = auditRecordId({ ...record, caseNumber: "other" });
  assert.notEqual(first, changed);
});

test("live lookup stays disabled and unavailable is explicit", () => {
  assert.equal(LIVE_LOOKUP_ENABLED, false);
  const down = unavailableResponse();
  assert.equal(down.status, "unavailable");
  assert.equal(down.results.length, 0);
  const checked = checkVehicles(["dabe815c"]);
  assert.equal(checked.status, "fixture");
});
