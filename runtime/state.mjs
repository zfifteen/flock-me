/**
 * Portable persistent state.
 *
 * Location (first existing / first writable):
 *   1. $FLOCK_ME_STATE
 *   2. $XDG_CONFIG_HOME/flock-me/state.json
 *   3. ~/.config/flock-me/state.json
 *
 * Format: versioned JSON. Atomic replace via temp file + rename.
 * Permissions: directory 0o700, file 0o600. No encryption — 8-char lookup
 * tokens are not a cryptographic privacy boundary; restrictive permissions
 * are the control.
 *
 * Concurrent sessions: exclusive lock file next to the state file. A second
 * writer fails closed instead of interleaving JSON.
 */

import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { createEmptyRegistry } from "./registry.mjs";

export const STATE_VERSION = 1;
export const FILE_MODE = 0o600;
export const DIR_MODE = 0o700;

export function resolveStatePath(env = process.env) {
  if (env.FLOCK_ME_STATE) return env.FLOCK_ME_STATE;
  const xdg = env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(xdg, "flock-me", "state.json");
}

export function lockPathFor(statePath) {
  return `${statePath}.lock`;
}

async function acquireLock(statePath) {
  const lockPath = lockPathFor(statePath);
  await mkdir(dirname(statePath), { recursive: true, mode: DIR_MODE });
  try {
    const handle = await open(lockPath, "wx");
    await handle.writeFile(String(process.pid));
    await handle.chmod(FILE_MODE);
    return {
      async release() {
        await handle.close();
        await rm(lockPath, { force: true });
      },
    };
  } catch (error) {
    if (error && error.code === "EEXIST") {
      const locked = new Error("Another Flock Me session is writing state.");
      locked.code = "concurrent-session";
      throw locked;
    }
    throw error;
  }
}

function migrate(raw) {
  if (!raw || typeof raw !== "object") return createEmptyRegistry();
  if (raw.version === STATE_VERSION) {
    return {
      version: STATE_VERSION,
      consent: raw.consent ?? null,
      setupOfferedAt: raw.setupOfferedAt ?? null,
      vehicles: Array.isArray(raw.vehicles) ? raw.vehicles : [],
      seenRecordIds: Array.isArray(raw.seenRecordIds) ? raw.seenRecordIds : [],
    };
  }
  return {
    ...createEmptyRegistry(),
    vehicles: Array.isArray(raw.vehicles) ? raw.vehicles : [],
    seenRecordIds: Array.isArray(raw.seenRecordIds) ? raw.seenRecordIds : [],
  };
}

export async function readState(statePath = resolveStatePath()) {
  try {
    const text = await readFile(statePath, "utf8");
    return migrate(JSON.parse(text));
  } catch (error) {
    if (error && (error.code === "ENOENT" || error.name === "SyntaxError")) {
      return createEmptyRegistry();
    }
    throw error;
  }
}

export async function writeStateAtomic(nextState, statePath = resolveStatePath()) {
  const lock = await acquireLock(statePath);
  try {
    await mkdir(dirname(statePath), { recursive: true, mode: DIR_MODE });
    const tempPath = `${statePath}.${process.pid}.tmp`;
    const payload = `${JSON.stringify({ ...nextState, version: STATE_VERSION }, null, 2)}\n`;
    await writeFile(tempPath, payload, { mode: FILE_MODE });
    await rename(tempPath, statePath);
    try {
      await stat(statePath);
    } catch {
      /* rename already replaced the file */
    }
    return nextState;
  } finally {
    await lock.release();
  }
}

export async function withStateLock(mutator, statePath = resolveStatePath()) {
  const lock = await acquireLock(statePath);
  try {
    const current = await readState(statePath);
    const next = await mutator(current);
    await mkdir(dirname(statePath), { recursive: true, mode: DIR_MODE });
    const tempPath = `${statePath}.${process.pid}.tmp`;
    const payload = `${JSON.stringify({ ...next, version: STATE_VERSION }, null, 2)}\n`;
    await writeFile(tempPath, payload, { mode: FILE_MODE });
    await rename(tempPath, statePath);
    return next;
  } finally {
    await lock.release();
  }
}

export function assertNoRawPlates(state) {
  const blob = JSON.stringify(state);
  if (/"plate"\s*:/.test(blob) || /"rawPlate"\s*:/.test(blob)) {
    throw new Error("State must never persist a raw license plate.");
  }
}
