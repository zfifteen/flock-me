import type { TravelVerdict } from "./session.ts";

export type TravelSignalKind = "explicit-statement" | "direct-artifact" | "weak-cue";

export type TravelEvidenceFamily =
  | "departure-arrival"
  | "route-navigation"
  | "appointment-destination"
  | "travel-receipt"
  | "calendar-location"
  | "local-environment"
  | "vehicle-interaction"
  | "geographic-shift"
  | "retrospective-trip";

export type TravelSignal = {
  kind: TravelSignalKind;
  family: TravelEvidenceFamily;
  summary: string;
};

export type TravelFixture = {
  id: string;
  title: string;
  category: "direct" | "indirect" | "ambiguous" | "absent";
  context: string;
  signals: TravelSignal[];
  expectedVerdict: TravelVerdict;
  expectedVehicle: "named" | "all" | "none";
  namedLabel?: string;
  notes: string;
};

export function evaluateTravel(signals: readonly TravelSignal[]): TravelVerdict {
  if (
    signals.some(
      (signal) => signal.kind === "explicit-statement" || signal.kind === "direct-artifact",
    )
  ) {
    return "confirmed";
  }
  const families = new Set(signals.map((signal) => signal.family));
  if (families.size >= 2) return "probable";
  if (families.size === 1) return "possible";
  return "absent";
}

export function parseTravelFixture(raw: unknown): TravelFixture {
  if (!raw || typeof raw !== "object") {
    throw new Error("Travel fixture is malformed.");
  }
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.title !== "string") {
    throw new Error("Travel fixture is missing id or title.");
  }
  if (
    row.category !== "direct" &&
    row.category !== "indirect" &&
    row.category !== "ambiguous" &&
    row.category !== "absent"
  ) {
    throw new Error(`Travel fixture ${row.id} has an invalid category.`);
  }
  if (typeof row.context !== "string" || typeof row.notes !== "string") {
    throw new Error(`Travel fixture ${row.id} is missing context or notes.`);
  }
  if (
    row.expectedVerdict !== "absent" &&
    row.expectedVerdict !== "possible" &&
    row.expectedVerdict !== "probable" &&
    row.expectedVerdict !== "confirmed"
  ) {
    throw new Error(`Travel fixture ${row.id} has an invalid expectedVerdict.`);
  }
  if (
    row.expectedVehicle !== "named" &&
    row.expectedVehicle !== "all" &&
    row.expectedVehicle !== "none"
  ) {
    throw new Error(`Travel fixture ${row.id} has an invalid expectedVehicle.`);
  }
  if (!Array.isArray(row.signals)) {
    throw new Error(`Travel fixture ${row.id} is missing signals.`);
  }
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    context: row.context,
    signals: row.signals.map((signal, index) => parseSignal(signal, row.id, index)),
    expectedVerdict: row.expectedVerdict,
    expectedVehicle: row.expectedVehicle,
    namedLabel: typeof row.namedLabel === "string" ? row.namedLabel : undefined,
    notes: row.notes,
  };
}

function parseSignal(value: unknown, fixtureId: string, index: number): TravelSignal {
  if (!value || typeof value !== "object") {
    throw new Error(`Travel fixture ${fixtureId} signal ${index} is malformed.`);
  }
  const row = value as Record<string, unknown>;
  if (
    row.kind !== "explicit-statement" &&
    row.kind !== "direct-artifact" &&
    row.kind !== "weak-cue"
  ) {
    throw new Error(`Travel fixture ${fixtureId} signal ${index} has an invalid kind.`);
  }
  if (typeof row.family !== "string" || typeof row.summary !== "string") {
    throw new Error(`Travel fixture ${fixtureId} signal ${index} is missing family or summary.`);
  }
  return {
    kind: row.kind,
    family: row.family as TravelEvidenceFamily,
    summary: row.summary,
  };
}
