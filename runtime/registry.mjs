/**
 * Household vehicle registry.
 *
 * Stores derived lookup identifiers + local labels only. Raw plates never
 * enter the registry. Re-enrolling the same normalized plate is a no-op
 * duplicate (the existing label is kept unless a rename is requested).
 */

import { deriveLookupId, validatePlateInput } from "./plate.mjs";

export const DEFAULT_LABELS = ["My car", "Partner's car", "Work truck", "Household van"];

export function defaultLabelForIndex(index) {
  return DEFAULT_LABELS[index] ?? `Vehicle ${index + 1}`;
}

export function sanitizeLabel(label, fallback) {
  const trimmed = typeof label === "string" ? label.trim() : "";
  if (!trimmed) return fallback;
  return trimmed.slice(0, 48);
}

export function createEmptyRegistry() {
  return {
    version: 1,
    consent: null,
    setupOfferedAt: null,
    vehicles: [],
    seenRecordIds: [],
  };
}

export function listVehicles(state) {
  return [...(state.vehicles ?? [])].sort((a, b) => a.enrolledAt.localeCompare(b.enrolledAt));
}

export async function enrollVehicle(state, { plate, label }) {
  const check = validatePlateInput(plate);
  if (!check.ok) {
    return { ok: false, code: check.code, message: check.message, state };
  }
  const lookupId = await deriveLookupId(plate);
  const existing = state.vehicles.find((vehicle) => vehicle.lookupId === lookupId);
  if (existing) {
    return {
      ok: true,
      duplicate: true,
      vehicle: existing,
      message: `Already enrolled as “${existing.label}”.`,
      state,
    };
  }
  const nextLabel = sanitizeLabel(label, defaultLabelForIndex(state.vehicles.length));
  const vehicle = {
    lookupId,
    label: nextLabel,
    enrolledAt: new Date().toISOString(),
  };
  return {
    ok: true,
    duplicate: false,
    vehicle,
    state: { ...state, vehicles: [...state.vehicles, vehicle] },
  };
}

export function renameVehicle(state, lookupId, label) {
  const vehicles = state.vehicles.map((vehicle) =>
    vehicle.lookupId === lookupId
      ? { ...vehicle, label: sanitizeLabel(label, vehicle.label) }
      : vehicle,
  );
  const vehicle = vehicles.find((item) => item.lookupId === lookupId);
  if (!vehicle) {
    return { ok: false, code: "missing", message: "That vehicle is not enrolled.", state };
  }
  return { ok: true, vehicle, state: { ...state, vehicles } };
}

export function removeVehicle(state, lookupId) {
  const exists = state.vehicles.some((vehicle) => vehicle.lookupId === lookupId);
  if (!exists) {
    return { ok: false, code: "missing", message: "That vehicle is not enrolled.", state };
  }
  return {
    ok: true,
    state: {
      ...state,
      vehicles: state.vehicles.filter((vehicle) => vehicle.lookupId !== lookupId),
    },
  };
}

export function clearRegistry(state) {
  return {
    ok: true,
    state: {
      ...state,
      vehicles: [],
      seenRecordIds: [],
    },
  };
}

export function grantConsent(state) {
  return {
    ...state,
    consent: {
      grantedAt: new Date().toISOString(),
      version: 1,
    },
  };
}

export function markSetupOffered(state) {
  return {
    ...state,
    setupOfferedAt: state.setupOfferedAt ?? new Date().toISOString(),
  };
}

export function rememberRecords(state, recordIds) {
  const seen = new Set(state.seenRecordIds);
  const fresh = [];
  for (const id of recordIds) {
    if (!seen.has(id)) {
      seen.add(id);
      fresh.push(id);
    }
  }
  return {
    fresh,
    state: { ...state, seenRecordIds: [...seen] },
  };
}

export function inspectState(state) {
  return {
    consent: state.consent,
    setupOfferedAt: state.setupOfferedAt,
    vehicles: listVehicles(state).map(({ lookupId, label, enrolledAt }) => ({
      lookupId,
      label,
      enrolledAt,
    })),
    seenRecordIds: [...state.seenRecordIds],
    rawPlatesStored: false,
  };
}

export function wipeState() {
  return createEmptyRegistry();
}
