import { SERVICE_UNAVAILABLE_MESSAGE } from "./copy.ts";
import type { AuditRecord, LookupRequest, LookupResponse } from "./types.ts";

export class AdapterError extends Error {
  readonly code:
    | "SERVICE_UNAVAILABLE"
    | "RATE_LIMITED"
    | "MALFORMED_RESPONSE"
    | "EMPTY_REGISTRY";

  constructor(
    code:
      | "SERVICE_UNAVAILABLE"
      | "RATE_LIMITED"
      | "MALFORMED_RESPONSE"
      | "EMPTY_REGISTRY",
    message: string,
  ) {
    super(message);
    this.name = "AdapterError";
    this.code = code;
  }
}

export interface FlockServiceAdapter {
  readonly name: string;
  lookup(request: LookupRequest): Promise<LookupResponse>;
}

export class UnavailableAdapter implements FlockServiceAdapter {
  readonly name = "hibf-unavailable";

  async lookup(request: LookupRequest): Promise<LookupResponse> {
    if (request.derivedIds.length === 0) {
      throw new AdapterError(
        "EMPTY_REGISTRY",
        "No enrolled vehicle identifiers were supplied.",
      );
    }
    throw new AdapterError("SERVICE_UNAVAILABLE", SERVICE_UNAVAILABLE_MESSAGE);
  }
}

export class FixtureAdapter implements FlockServiceAdapter {
  readonly name = "hibf-fixture";
  private readonly fixture: unknown;

  constructor(fixture: unknown) {
    this.fixture = fixture;
  }

  async lookup(request: LookupRequest): Promise<LookupResponse> {
    if (request.derivedIds.length === 0) {
      throw new AdapterError(
        "EMPTY_REGISTRY",
        "No enrolled vehicle identifiers were supplied.",
      );
    }
    return parseLookupResponse(this.fixture, request.derivedIds);
  }
}

export function parseLookupResponse(
  payload: unknown,
  requestedIds: string[],
): LookupResponse {
  if (payload === null || typeof payload !== "object") {
    throw new AdapterError("MALFORMED_RESPONSE", "Lookup response was not an object.");
  }
  const body = payload as Record<string, unknown>;
  if (!Array.isArray(body.results) && !Array.isArray(body.records)) {
    throw new AdapterError(
      "MALFORMED_RESPONSE",
      "Lookup response is missing a results array.",
    );
  }
  const rawRecords = (body.results ?? body.records) as unknown[];
  const allowed = new Set(requestedIds);
  const records: AuditRecord[] = [];
  for (const item of rawRecords) {
    const record = parseAuditRecord(item);
    if (!allowed.has(record.derivedId)) continue;
    records.push(record);
  }
  return {
    records,
    nextCursor: typeof body.nextCursor === "string" ? body.nextCursor : null,
    hasMore: Boolean(body.hasMore),
    total: typeof body.total === "number" ? body.total : null,
  };
}

function parseAuditRecord(item: unknown): AuditRecord {
  if (item === null || typeof item !== "object") {
    throw new AdapterError("MALFORMED_RESPONSE", "Audit record was not an object.");
  }
  const row = item as Record<string, unknown>;
  const derivedId = pickString(row, ["derivedId", "identifier", "plate"]);
  if (!derivedId) {
    throw new AdapterError(
      "MALFORMED_RESPONSE",
      "Audit record is missing a derived identifier.",
    );
  }
  return {
    sourceId: pickString(row, ["sourceId", "id"]),
    derivedId,
    agency: pickString(row, ["agency", "organization", "orgName"]),
    operator: pickString(row, ["operator", "name"]),
    searchTime: pickString(row, ["searchTime", "date"]),
    reason: pickString(row, ["reason"]),
    caseNumber: pickString(row, ["caseNumber", "case_number", "case"]),
    searchType: pickString(row, ["searchType"]),
    devicesSearched: pickNumber(row, ["devicesSearched"]),
    networksSearched: pickNumber(row, ["networksSearched"]),
    textPrompt: pickString(row, ["textPrompt"]),
    redacted: Boolean(row.redacted),
  };
}

function pickString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

export const OBSERVED_HIBF_CONTRACT = {
  method: "POST",
  path: "/api/search/text",
  request: { plates: "string[] /* eight-char identifiers */", cursor: "string?" },
  response: {
    results: "AuditRecord[]",
    nextCursor: "string | null",
    hasMore: "boolean",
    total: "number | null",
  },
  rateLimitStatus: 429,
  emptyStatus: 404,
  robots: "Disallow: /api/",
  permitted: false,
  batching: "One request per mobility episode or explicit check, containing every selected household identifier.",
} as const;
