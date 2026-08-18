/**
 * Have I Been Flocked service adapter.
 *
 * Observed contract (2026-08-17 frontend):
 *   POST /api/search/text
 *   body: { plates: string[], cursor?: string }
 *   200: { results, nextCursor, hasMore, total }
 *   404: treat as empty results
 *   429: rate limited
 *
 * Automated access is not confirmed. Live HTTP is therefore disabled.
 * Checks use fixtures so enrollment, batching, and dedup can be tested
 * without sending identifiers to a third party.
 */

import { auditRecordId, assertAuditRecordMeaning } from "./audit.mjs";

export const SERVICE_STATUS = {
  FIXTURE: "fixture",
  UNAVAILABLE: "unavailable",
  MALFORMED: "malformed",
};

export const LIVE_LOOKUP_ENABLED = false;

export const OBSERVED_CONTRACT = {
  method: "POST",
  path: "/api/search/text",
  origin: "https://haveibeenflocked.com",
  request: {
    plates: "array of 8-character hex lookup ids (not raw plates)",
    cursor: "optional opaque pagination cursor",
  },
  success: {
    results: "array of audit records",
    nextCursor: "string | null",
    hasMore: "boolean",
    total: "number | null",
  },
  errors: {
    429: "rate limit — retry later",
    404: "empty result set",
    other: "{ error: string }",
  },
  batching: "one request per mobility episode; all selected household ids in `plates`",
  automatedAccess: "unconfirmed — do not call the live endpoint",
};

const FIXTURES = {
  dabe815c: [
    {
      orgId: "fixture-oakridge-pd",
      orgName: "Oakridge Police Department",
      operator: "J. Hale",
      searchTimeUtc: "2025-11-02T14:18:00.000Z",
      reason: "stolen vehicle",
      caseNumber: "25-4419",
      searchType: "search",
      devicesSearched: 184,
      networksSearched: 12,
      license_plate_hash: "dabe815c",
    },
  ],
  d2097ce6: [
    {
      orgId: "fixture-statewide",
      orgName: "Statewide Fusion Desk",
      operator: "REDACTED",
      searchTimeUtc: "2026-03-14T09:02:11.000Z",
      reason: "investigation",
      caseNumber: "",
      searchType: "lookup",
      devicesSearched: 2401,
      networksSearched: 88,
      license_plate_hash: "d2097ce6",
      redacted: true,
    },
    {
      orgId: "fixture-county-so",
      orgName: "County Sheriff",
      operator: "M. Ortiz",
      searchTimeUtc: "2026-01-09T21:44:03.000Z",
      reason: "missing person",
      caseNumber: "26-1102",
      searchType: "search",
      devicesSearched: 56,
      networksSearched: 3,
      license_plate_hash: "d2097ce6",
    },
  ],
};

export const MALFORMED_FIXTURE = { not: "an audit record" };

export function listFixtureLookupIds() {
  return Object.keys(FIXTURES);
}

export function normalizeAdapterRecord(raw, lookupId) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, code: "malformed", message: "Record was not an object." };
  }
  const hasShape =
    raw.license_plate_hash ||
    raw.lookupId ||
    raw.orgId ||
    raw.org_id ||
    raw.orgName ||
    raw.org_name ||
    raw.searchTimeUtc ||
    raw.search_time_utc;
  if (!hasShape) {
    return { ok: false, code: "malformed", message: "Record is missing audit fields." };
  }
  const id = String(raw.license_plate_hash ?? raw.lookupId ?? lookupId ?? "").toLowerCase();
  if (!/^[0-9a-f]{8}$/.test(id)) {
    return { ok: false, code: "malformed", message: "Record is missing a lookup identifier." };
  }
  const record = {
    lookupId: id,
    orgId: raw.orgId ?? raw.org_id ?? null,
    orgName: raw.orgName ?? raw.org_name ?? "Unknown agency",
    operator: raw.operator ?? raw.name ?? null,
    searchTimeUtc: raw.searchTimeUtc ?? raw.search_time_utc ?? null,
    reason: raw.reason ?? null,
    caseNumber: raw.caseNumber ?? raw.case_number ?? null,
    searchType: raw.searchType ?? raw.search_type ?? null,
    devicesSearched: raw.devicesSearched ?? raw.total_devices_searched ?? null,
    networksSearched: raw.networksSearched ?? raw.total_networks_searched ?? null,
    redacted: Boolean(raw.redacted),
  };
  record.recordId = auditRecordId(record);
  record.meaning = assertAuditRecordMeaning(record);
  return { ok: true, record };
}

export function searchFixtures(lookupIds) {
  if (!Array.isArray(lookupIds) || lookupIds.length === 0) {
    return {
      status: SERVICE_STATUS.FIXTURE,
      results: [],
      total: 0,
      hasMore: false,
      nextCursor: null,
      note: "No lookup identifiers were provided.",
    };
  }
  const results = [];
  const malformed = [];
  for (const id of lookupIds) {
    const rows = FIXTURES[id] ?? [];
    for (const raw of rows) {
      const parsed = normalizeAdapterRecord(raw, id);
      if (parsed.ok) results.push(parsed.record);
      else malformed.push({ lookupId: id, code: parsed.code, message: parsed.message });
    }
  }
  return {
    status: SERVICE_STATUS.FIXTURE,
    results,
    malformed,
    total: results.length,
    hasMore: false,
    nextCursor: null,
    liveLookupEnabled: LIVE_LOOKUP_ENABLED,
    note: "Fixture records only. Live Have I Been Flocked lookups are disabled until automated access is permitted.",
  };
}

export function unavailableResponse(reason = "Live Have I Been Flocked access is not permitted yet.") {
  return {
    status: SERVICE_STATUS.UNAVAILABLE,
    results: [],
    total: 0,
    hasMore: false,
    nextCursor: null,
    liveLookupEnabled: LIVE_LOOKUP_ENABLED,
    reason,
  };
}

export function checkVehicles(lookupIds, { allowLive = false } = {}) {
  if (allowLive && LIVE_LOOKUP_ENABLED) {
    return unavailableResponse("Live adapter is flagged on but no permitted transport is configured.");
  }
  return searchFixtures(lookupIds);
}
