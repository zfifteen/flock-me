import { nextDefaultLabel } from "./copy.ts";
import { identifierFromPlate } from "./normalize.ts";
import type { HouseholdState, VehicleRecord } from "./types.ts";
import { emptyState } from "./types.ts";

export type EnrollInput = {
  plate: string;
  label?: string;
  consented: boolean;
  now?: string;
};

export type EnrollResult =
  | { status: "enrolled"; vehicle: VehicleRecord; discardedPlate: true }
  | { status: "duplicate"; vehicle: VehicleRecord; discardedPlate: true };

export class RegistryError extends Error {
  readonly code:
    | "CONSENT_REQUIRED"
    | "NOT_FOUND"
    | "EMPTY"
    | "INVALID_LABEL"
    | "MISSING_STATE";

  constructor(
    code:
      | "CONSENT_REQUIRED"
      | "NOT_FOUND"
      | "EMPTY"
      | "INVALID_LABEL"
      | "MISSING_STATE",
    message: string,
  ) {
    super(message);
    this.name = "RegistryError";
    this.code = code;
  }
}

export function listVehicles(state: HouseholdState): VehicleRecord[] {
  return [...state.vehicles].sort((a, b) => a.enrolledAt.localeCompare(b.enrolledAt));
}

export function enrollVehicle(
  state: HouseholdState,
  input: EnrollInput,
): { state: HouseholdState; result: EnrollResult } {
  if (!input.consented) {
    throw new RegistryError(
      "CONSENT_REQUIRED",
      "Explicit enrollment consent is required before a plate can be accepted.",
    );
  }

  const derivedId = identifierFromPlate(input.plate);
  const existing = state.vehicles.find((vehicle) => vehicle.derivedId === derivedId);
  if (existing) {
    return {
      state,
      result: { status: "duplicate", vehicle: existing, discardedPlate: true },
    };
  }

  const label = sanitizeLabel(
    input.label?.trim() || nextDefaultLabel(state.vehicles.map((v) => v.label)),
  );
  const vehicle: VehicleRecord = {
    derivedId,
    label,
    enrolledAt: input.now ?? new Date().toISOString(),
  };

  return {
    state: {
      ...state,
      consentAt: state.consentAt ?? vehicle.enrolledAt,
      vehicles: [...state.vehicles, vehicle],
    },
    result: { status: "enrolled", vehicle, discardedPlate: true },
  };
}

export function renameVehicle(
  state: HouseholdState,
  derivedId: string,
  label: string,
): HouseholdState {
  const nextLabel = sanitizeLabel(label);
  let found = false;
  const vehicles = state.vehicles.map((vehicle) => {
    if (vehicle.derivedId !== derivedId) return vehicle;
    found = true;
    return { ...vehicle, label: nextLabel };
  });
  if (!found) {
    throw new RegistryError("NOT_FOUND", "No enrolled vehicle matches that identifier.");
  }
  return { ...state, vehicles };
}

export function removeVehicle(state: HouseholdState, derivedId: string): HouseholdState {
  const vehicles = state.vehicles.filter((vehicle) => vehicle.derivedId !== derivedId);
  if (vehicles.length === state.vehicles.length) {
    throw new RegistryError("NOT_FOUND", "No enrolled vehicle matches that identifier.");
  }
  return { ...state, vehicles };
}

export function clearRegistry(state: HouseholdState): HouseholdState {
  return {
    ...emptyState(),
    setupOfferedAt: state.setupOfferedAt,
  };
}

export function markSetupOffered(state: HouseholdState, at = new Date().toISOString()): HouseholdState {
  return { ...state, setupOfferedAt: state.setupOfferedAt ?? at };
}

function sanitizeLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new RegistryError("INVALID_LABEL", "A vehicle label cannot be empty.");
  }
  if (trimmed.length > 48) {
    throw new RegistryError("INVALID_LABEL", "A vehicle label may be at most 48 characters.");
  }
  return trimmed;
}
