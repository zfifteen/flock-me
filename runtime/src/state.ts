import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { HouseholdState } from "./types.ts";
import { emptyState, STATE_VERSION } from "./types.ts";

export const STATE_DIR_MODE = 0o700;
export const STATE_FILE_MODE = 0o600;

export function defaultStatePath(env: NodeJS.ProcessEnv = process.env): string {
  if (env.FLOCK_ME_STATE) return env.FLOCK_ME_STATE;
  return join(homedir(), ".flock-me", "state.json");
}

export function parseState(raw: unknown): HouseholdState {
  if (raw === null || raw === undefined) {
    throw new Error("Household state is missing.");
  }
  if (typeof raw !== "object") {
    throw new Error("Household state is malformed.");
  }
  const body = raw as Record<string, unknown>;
  if (body.version !== STATE_VERSION) {
    throw new Error(`Unsupported household state version: ${String(body.version)}`);
  }
  if (!Array.isArray(body.vehicles)) {
    throw new Error("Household state is missing vehicles.");
  }
  return {
    version: STATE_VERSION,
    vehicles: body.vehicles.map(parseVehicle),
    checkpoint: typeof body.checkpoint === "string" ? body.checkpoint : null,
    episode: parseEpisode(body.episode),
    seenRecords: Array.isArray(body.seenRecords)
      ? body.seenRecords.map(parseSeen)
      : [],
    consentAt: typeof body.consentAt === "string" ? body.consentAt : null,
    setupOfferedAt: typeof body.setupOfferedAt === "string" ? body.setupOfferedAt : null,
  };
}

function parseVehicle(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("Vehicle record is malformed.");
  }
  const row = value as Record<string, unknown>;
  if (typeof row.derivedId !== "string" || typeof row.label !== "string") {
    throw new Error("Vehicle record is missing derivedId or label.");
  }
  if ("plate" in row || "rawPlate" in row || "licensePlate" in row) {
    throw new Error("Vehicle record contains a raw plate field.");
  }
  return {
    derivedId: row.derivedId,
    label: row.label,
    enrolledAt: typeof row.enrolledAt === "string" ? row.enrolledAt : new Date(0).toISOString(),
  };
}

function parseEpisode(value: unknown): HouseholdState["episode"] {
  if (!value) return null;
  if (typeof value !== "object") throw new Error("Mobility episode is malformed.");
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.openedAt !== "string") {
    throw new Error("Mobility episode is missing id or openedAt.");
  }
  if (!Array.isArray(row.vehicleDerivedIds)) {
    throw new Error("Mobility episode is missing vehicleDerivedIds.");
  }
  return {
    id: row.id,
    openedAt: row.openedAt,
    vehicleDerivedIds: row.vehicleDerivedIds.filter((id): id is string => typeof id === "string"),
  };
}

function parseSeen(value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error("Seen-record entry is malformed.");
  }
  const row = value as Record<string, unknown>;
  if (typeof row.recordId !== "string") {
    throw new Error("Seen-record entry is missing recordId.");
  }
  return {
    recordId: row.recordId,
    firstSeenAt: typeof row.firstSeenAt === "string" ? row.firstSeenAt : new Date(0).toISOString(),
  };
}

export async function readState(path = defaultStatePath()): Promise<HouseholdState> {
  try {
    const text = await readFile(path, "utf8");
    return parseState(JSON.parse(text));
  } catch (error) {
    if (isEnoent(error)) return emptyState();
    throw error;
  }
}

export async function writeStateAtomic(
  path: string,
  state: HouseholdState,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: STATE_DIR_MODE });
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  const payload = `${JSON.stringify(state, null, 2)}\n`;
  if (/"plate"\s*:/.test(payload) || /"licensePlate"\s*:/.test(payload)) {
    throw new Error("Refusing to persist state that contains a raw plate field.");
  }
  await writeFile(tempPath, payload, { encoding: "utf8", mode: STATE_FILE_MODE });
  await rename(tempPath, path);
}

export async function deleteState(path = defaultStatePath()): Promise<boolean> {
  try {
    await unlink(path);
    return true;
  } catch (error) {
    if (isEnoent(error)) return false;
    throw error;
  }
}

export function migrateOrEmpty(raw: unknown): HouseholdState {
  if (raw === null || raw === undefined) return emptyState();
  return parseState(raw);
}

function isEnoent(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
