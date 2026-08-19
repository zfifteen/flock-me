import { AdapterError, type FlockServiceAdapter } from "./adapter.ts";
import {
  DATASET_LIMITS,
  FIRST_SESSION_SETUP_OFFER,
  SERVICE_UNAVAILABLE_MESSAGE,
} from "./copy.ts";
import { listVehicles, selectVehicles } from "./registry.ts";
import { classifyAndRemember } from "./seen.ts";
import type { AuditRecord, HouseholdState, VehicleRecord } from "./types.ts";

export type CheckMode = "explicit" | "session";

export type ReportedRecord = {
  label: string;
  agency?: string;
  operator?: string;
  searchTime?: string;
  reason?: string;
  caseNumber?: string;
  searchType?: string;
  devicesSearched?: number;
  networksSearched?: number;
  textPrompt?: string;
  redacted?: boolean;
};

export type CheckOutcome = {
  state: HouseholdState;
  status:
    | "setup-required"
    | "unavailable"
    | "malformed"
    | "rate-limited"
    | "empty-registry"
    | "no-match"
    | "matches"
    | "silent";
  message: string;
  vehicles: { label: string }[];
  fresh: ReportedRecord[];
  previouslySeen: ReportedRecord[];
  datasetLimits: string;
  code?: string;
  persist: boolean;
};

export type CheckOptions = {
  adapter: FlockServiceAdapter;
  labels?: string[];
  now?: string;
  mode?: CheckMode;
};

export async function runCheck(
  state: HouseholdState,
  options: CheckOptions,
): Promise<CheckOutcome> {
  const enrolled = listVehicles(state);
  if (enrolled.length === 0) {
    return {
      state,
      status: "setup-required",
      message: FIRST_SESSION_SETUP_OFFER,
      vehicles: [],
      fresh: [],
      previouslySeen: [],
      datasetLimits: DATASET_LIMITS,
      persist: false,
    };
  }

  const selected = selectVehicles(state, options.labels);
  const vehicles = selected.map((vehicle) => ({ label: vehicle.label }));
  const derivedIds = selected.map((vehicle) => vehicle.derivedId);

  try {
    const response = await options.adapter.lookup({ derivedIds });
    const classified = classifyAndRemember(state, response.records, options.now);
    const fresh = classified.fresh.map((record) => reportRecord(record, selected));
    const previouslySeen = classified.previouslySeen.map((record) =>
      reportRecord(record, selected),
    );

    if (options.mode === "session") {
      if (fresh.length === 0) {
        return {
          state: classified.state,
          status: "silent",
          message: "",
          vehicles,
          fresh,
          previouslySeen,
          datasetLimits: DATASET_LIMITS,
          persist: true,
        };
      }
      return {
        state: classified.state,
        status: "matches",
        message: formatSessionMatches(fresh),
        vehicles,
        fresh,
        previouslySeen,
        datasetLimits: DATASET_LIMITS,
        persist: true,
      };
    }

    if (fresh.length === 0 && previouslySeen.length === 0) {
      return {
        state: classified.state,
        status: "no-match",
        message: formatNoMatch(vehicles),
        vehicles,
        fresh,
        previouslySeen,
        datasetLimits: DATASET_LIMITS,
        persist: true,
      };
    }

    return {
      state: classified.state,
      status: "matches",
      message: formatExplicitMatches(fresh, previouslySeen),
      vehicles,
      fresh,
      previouslySeen,
      datasetLimits: DATASET_LIMITS,
      persist: true,
    };
  } catch (error) {
    if (error instanceof AdapterError) {
      return adapterFailure(state, vehicles, error);
    }
    throw error;
  }
}

function adapterFailure(
  state: HouseholdState,
  vehicles: { label: string }[],
  error: AdapterError,
): CheckOutcome {
  const status =
    error.code === "SERVICE_UNAVAILABLE"
      ? "unavailable"
      : error.code === "RATE_LIMITED"
        ? "rate-limited"
        : error.code === "EMPTY_REGISTRY"
          ? "empty-registry"
          : "malformed";
  const message =
    error.code === "SERVICE_UNAVAILABLE" ? SERVICE_UNAVAILABLE_MESSAGE : error.message;
  return {
    state,
    status,
    message,
    vehicles,
    fresh: [],
    previouslySeen: [],
    datasetLimits: DATASET_LIMITS,
    code: error.code,
    persist: false,
  };
}

function reportRecord(record: AuditRecord, vehicles: VehicleRecord[]): ReportedRecord {
  const vehicle = vehicles.find((entry) => entry.derivedId === record.derivedId);
  return {
    label: vehicle?.label ?? "Unknown vehicle",
    agency: emptyToUndefined(record.agency),
    operator: emptyToUndefined(record.operator),
    searchTime: emptyToUndefined(record.searchTime),
    reason: emptyToUndefined(record.reason),
    caseNumber: emptyToUndefined(record.caseNumber),
    searchType: emptyToUndefined(record.searchType),
    devicesSearched: record.devicesSearched,
    networksSearched: record.networksSearched,
    textPrompt: emptyToUndefined(record.textPrompt),
    redacted: record.redacted,
  };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value || !value.trim()) return undefined;
  return value.trim();
}

function fieldLine(name: string, value: string | number | undefined): string {
  if (value === undefined) return `- ${name}: not present in this record`;
  return `- ${name}: ${value}`;
}

function networkReach(record: ReportedRecord): string | undefined {
  if (record.devicesSearched == null && record.networksSearched == null) return undefined;
  const parts: string[] = [];
  if (record.devicesSearched != null) parts.push(`${record.devicesSearched} devices`);
  if (record.networksSearched != null) parts.push(`${record.networksSearched} networks`);
  return parts.join(", ");
}

export function formatRecord(record: ReportedRecord): string {
  const lines = [
    `${record.label}: a Flock user searched this plate.`,
    fieldLine("searching agency", record.agency),
    fieldLine("operator", record.operator),
    fieldLine("search date", record.searchTime),
    fieldLine("stated reason", record.reason),
    fieldLine("case number", record.caseNumber),
    fieldLine("search type", record.searchType),
    fieldLine("network reach", networkReach(record)),
  ];
  if (record.redacted) {
    lines.push("- some fields in this record are redacted");
  }
  return lines.join("\n");
}

const MEANING =
  "A matching record means someone using Flock searched for the plate. It does not mean a camera photographed the vehicle, recorded a location, or opened an investigation.";

function formatExplicitMatches(
  fresh: ReportedRecord[],
  previouslySeen: ReportedRecord[],
): string {
  const parts: string[] = [];
  if (fresh.length > 0) {
    parts.push("New matching public records:", fresh.map(formatRecord).join("\n\n"));
  } else {
    parts.push("No new matching public records.");
  }
  if (previouslySeen.length > 0) {
    parts.push("Previously reported:", previouslySeen.map(formatRecord).join("\n\n"));
  }
  parts.push(MEANING, DATASET_LIMITS);
  return parts.join("\n\n");
}

function formatSessionMatches(fresh: ReportedRecord[]): string {
  return ["New matching public records:", fresh.map(formatRecord).join("\n\n"), MEANING, DATASET_LIMITS].join(
    "\n\n",
  );
}

function formatNoMatch(vehicles: { label: string }[]): string {
  const labels = vehicles.map((vehicle) => vehicle.label).join(", ");
  return `The available public dataset contains no matching record for: ${labels}.\n\n${DATASET_LIMITS}`;
}
