import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  FixtureAdapter,
  UnavailableAdapter,
  type FlockServiceAdapter,
} from "./adapter.ts";
import { runCheck, type CheckOutcome } from "./check.ts";
import {
  DATASET_LIMITS,
  ENROLLMENT_CONSENT,
  FIRST_SESSION_SETUP_OFFER,
} from "./copy.ts";
import { assertNoRawPlate } from "./log.ts";
import { PlateValidationError } from "./normalize.ts";
import {
  RegistryError,
  clearRegistry,
  enrollVehicle,
  listVehicles,
  markSetupOffered,
  removeVehicleByLabel,
  renameVehicleByLabel,
} from "./registry.ts";
import {
  detectHookFormat,
  formatHookOutput,
  isStartupOnly,
  markCheckpoint,
  markEpisodeChecked,
  planReview,
  sessionStartInstruction,
  sourceFromHookInput,
  type HookFormat,
  type SessionSource,
  type TravelVerdict,
} from "./session.ts";
import {
  defaultStatePath,
  deleteState,
  readState,
  writeStateAtomic,
} from "./state.ts";
import type { HouseholdState } from "./types.ts";

export const CLI_USAGE = `Usage: flock-me <command> [options]

Commands:
  setup                              Show the setup offer and consent language
  add --plate PLATE [--label LABEL] --consent
  list
  rename --from LABEL --to LABEL
  remove --label LABEL
  clear --confirm
  check [--label LABEL] [--mode explicit|session] [--fixture PATH]
  review --verdict absent|possible|probable|confirmed [--label LABEL] [--fixture PATH]
  checkpoint [--mark]
  session-start [--format claude|codex|gemini|grok|plain] [--source SOURCE] [--hook]
  inspect [--show-ids]
  delete-data --confirm
  help

Default command is check: every enrolled household vehicle, no travel evidence
required. Production lookups use UnavailableAdapter. --fixture is rehearsal only.
session-start is the startup-only hook entry. review is the new-session travel path.

State: $FLOCK_ME_STATE or ~/.flock-me/state.json
`;

export type CliFlags = Record<string, string | boolean | string[]>;

export type CliPayload = {
  ok: boolean;
  command: string;
  status: string;
  message: string;
  [key: string]: unknown;
};

export type CliResult = {
  exitCode: number;
  payload: CliPayload;
  stdout?: string;
};

type ParsedArgs = {
  command: string;
  flags: CliFlags;
};

export function parseArgv(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const command = args[0] && !args[0].startsWith("--") ? args[0] : "check";
  const start = args[0] && !args[0].startsWith("--") ? 1 : 0;
  const flags: CliFlags = {};
  for (let i = start; i < args.length; i++) {
    const token = args[i];
    if (!token || !token.startsWith("--")) {
      throw new UsageError(`Unexpected argument: ${token ?? ""}`);
    }
    const key = token.slice(2);
    if (!key) throw new UsageError("Empty flag.");
    const next = args[i + 1];
    if (!next || next.startsWith("--")) {
      setFlag(flags, key, true);
      continue;
    }
    setFlag(flags, key, next);
    i += 1;
  }
  return { command, flags };
}

function setFlag(flags: CliFlags, key: string, value: string | boolean): void {
  const existing = flags[key];
  if (existing === undefined) {
    flags[key] = value;
    return;
  }
  if (typeof value === "boolean" || typeof existing === "boolean") {
    flags[key] = value;
    return;
  }
  const list = Array.isArray(existing) ? existing : [existing];
  list.push(value);
  flags[key] = list;
}

class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

function flagString(flags: CliFlags, key: string): string | undefined {
  const value = flags[key];
  if (typeof value === "string") return value;
  return undefined;
}

function flagStrings(flags: CliFlags, key: string): string[] | undefined {
  const value = flags[key];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return undefined;
}

function flagBool(flags: CliFlags, key: string): boolean {
  return flags[key] === true;
}

function publicVehicle(vehicle: { label: string; enrolledAt: string; derivedId: string }, showIds: boolean) {
  return showIds
    ? { label: vehicle.label, enrolledAt: vehicle.enrolledAt, derivedId: vehicle.derivedId }
    : { label: vehicle.label, enrolledAt: vehicle.enrolledAt };
}

function fromCheck(command: string, outcome: CheckOutcome): CliResult {
  const exitCode =
    outcome.status === "unavailable" ||
    outcome.status === "malformed" ||
    outcome.status === "rate-limited"
      ? 2
      : 0;
  return {
    exitCode,
    payload: {
      ok: exitCode === 0,
      command,
      status: outcome.status,
      message: outcome.message,
      vehicles: outcome.vehicles,
      fresh: outcome.fresh,
      previouslySeen: outcome.previouslySeen,
      datasetLimits: outcome.datasetLimits,
      ...(outcome.code ? { code: outcome.code } : {}),
    },
  };
}

export async function createAdapter(flags: CliFlags): Promise<FlockServiceAdapter> {
  const fixturePath = flagString(flags, "fixture");
  if (fixturePath) {
    const raw = JSON.parse(await readFile(fixturePath, "utf8")) as unknown;
    return new FixtureAdapter(raw);
  }
  return new UnavailableAdapter();
}

function parseVerdict(value: string | undefined): TravelVerdict | undefined {
  if (
    value === "absent" ||
    value === "possible" ||
    value === "probable" ||
    value === "confirmed"
  ) {
    return value;
  }
  return undefined;
}

function parseFormat(value: string | undefined, env: NodeJS.ProcessEnv): HookFormat {
  if (
    value === "claude" ||
    value === "codex" ||
    value === "gemini" ||
    value === "grok" ||
    value === "plain"
  ) {
    return value;
  }
  return detectHookFormat(env);
}

function parseSourceFlag(value: string | undefined): SessionSource | undefined {
  if (!value) return undefined;
  if (
    value === "startup" ||
    value === "resume" ||
    value === "clear" ||
    value === "compact" ||
    value === "fork" ||
    value === "unknown"
  ) {
    return value;
  }
  throw new UsageError("source must be startup, resume, clear, compact, fork, or unknown.");
}

export async function readHookInput(flags: CliFlags): Promise<Record<string, unknown> | null> {
  if (!flagBool(flags, "hook")) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  return null;
}

function sessionStartResult(
  state: HouseholdState,
  flags: CliFlags,
  now: string,
  hookInput: Record<string, unknown> | null = null,
  env: NodeJS.ProcessEnv = process.env,
): { result: CliResult; nextState: HouseholdState; deleteFile: boolean } {
  const source =
    parseSourceFlag(flagString(flags, "source")) ?? sourceFromHookInput(hookInput);
  const format = parseFormat(flagString(flags, "format"), env);
  const startup = isStartupOnly(source);
  const instruction = startup
    ? sessionStartInstruction({
        source,
        checkpoint: state.checkpoint,
        labels: listVehicles(state).map((vehicle) => vehicle.label),
        setupOffered: Boolean(state.setupOfferedAt),
        episodeOpen: Boolean(state.episode),
      })
    : "";
  const payload: CliPayload = {
    ok: true,
    command: "session-start",
    status: startup ? "instruct" : "skipped",
    message: startup
      ? "Inject the session-start review instruction. Do not lookup from the hook."
      : `Skipping Flock Me session review for source=${source}.`,
    source,
    format,
    checkpoint: state.checkpoint,
    labels: listVehicles(state).map((vehicle) => vehicle.label),
    instruction,
  };
  const hookMode = flagBool(flags, "hook") || Boolean(flagString(flags, "format"));
  return {
    result: {
      exitCode: 0,
      payload,
      stdout: hookMode ? formatHookOutput(format, instruction) : undefined,
    },
    nextState: state,
    deleteFile: false,
  };
}

export async function dispatch(
  command: string,
  flags: CliFlags,
  state: HouseholdState,
  adapter: FlockServiceAdapter,
  now = new Date().toISOString(),
  hookInput: Record<string, unknown> | null = null,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ result: CliResult; nextState: HouseholdState; deleteFile: boolean }> {
  switch (command) {
    case "help":
    case "--help":
      return {
        result: {
          exitCode: 0,
          payload: {
            ok: true,
            command: "help",
            status: "help",
            message: CLI_USAGE.trim(),
          },
        },
        nextState: state,
        deleteFile: false,
      };
    case "setup":
      return {
        result: {
          exitCode: 0,
          payload: {
            ok: true,
            command: "setup",
            status: "setup-offer",
            message: FIRST_SESSION_SETUP_OFFER,
            consent: ENROLLMENT_CONSENT,
          },
        },
        nextState: markSetupOffered(state, now),
        deleteFile: false,
      };
    case "add": {
      const plate = flagString(flags, "plate");
      if (!plate) throw new UsageError("add requires --plate.");
      const enrolled = enrollVehicle(state, {
        plate,
        label: flagString(flags, "label"),
        consented: flagBool(flags, "consent"),
        now,
      });
      assertNoRawPlate(JSON.stringify(enrolled.result.vehicle), plate);
      return {
        result: {
          exitCode: 0,
          payload: {
            ok: true,
            command: "add",
            status: enrolled.result.status,
            message:
              enrolled.result.status === "duplicate"
                ? `Already enrolled as “${enrolled.result.vehicle.label}”.`
                : `Enrolled “${enrolled.result.vehicle.label}”. The plate was discarded.`,
            vehicle: publicVehicle(enrolled.result.vehicle, false),
            discardedPlate: true,
          },
        },
        nextState: enrolled.state,
        deleteFile: false,
      };
    }
    case "list": {
      const vehicles = listVehicles(state).map((vehicle) => publicVehicle(vehicle, false));
      return {
        result: {
          exitCode: 0,
          payload: {
            ok: true,
            command: "list",
            status: vehicles.length === 0 ? "empty" : "listed",
            message:
              vehicles.length === 0
                ? "No household vehicles are enrolled."
                : vehicles.map((vehicle) => vehicle.label).join("\n"),
            vehicles,
          },
        },
        nextState: state,
        deleteFile: false,
      };
    }
    case "rename": {
      const from = flagString(flags, "from");
      const to = flagString(flags, "to");
      if (!from || !to) throw new UsageError("rename requires --from and --to.");
      const nextState = renameVehicleByLabel(state, from, to);
      return {
        result: {
          exitCode: 0,
          payload: {
            ok: true,
            command: "rename",
            status: "renamed",
            message: `Renamed “${from}” to “${to}”.`,
          },
        },
        nextState,
        deleteFile: false,
      };
    }
    case "remove": {
      const label = flagString(flags, "label");
      if (!label) throw new UsageError("remove requires --label.");
      const nextState = removeVehicleByLabel(state, label);
      return {
        result: {
          exitCode: 0,
          payload: {
            ok: true,
            command: "remove",
            status: "removed",
            message: `Removed “${label}”.`,
          },
        },
        nextState,
        deleteFile: false,
      };
    }
    case "clear": {
      if (!flagBool(flags, "confirm")) {
        throw new UsageError("clear requires --confirm.");
      }
      return {
        result: {
          exitCode: 0,
          payload: {
            ok: true,
            command: "clear",
            status: "cleared",
            message: "Cleared the household registry.",
          },
        },
        nextState: clearRegistry(state),
        deleteFile: false,
      };
    }
    case "check": {
      const mode = flagString(flags, "mode") === "session" ? "session" : "explicit";
      const outcome = await runCheck(state, {
        adapter,
        labels: flagStrings(flags, "label"),
        now,
        mode,
      });
      return {
        result: fromCheck("check", outcome),
        nextState:
          outcome.status === "setup-required" ? markSetupOffered(state, now) : outcome.state,
        deleteFile: false,
      };
    }
    case "checkpoint": {
      if (flagBool(flags, "mark")) {
        const nextState = markCheckpoint(state, now);
        return {
          result: {
            exitCode: 0,
            payload: {
              ok: true,
              command: "checkpoint",
              status: "marked",
              message: `Checkpoint set to ${now}.`,
              checkpoint: now,
            },
          },
          nextState,
          deleteFile: false,
        };
      }
      return {
        result: {
          exitCode: 0,
          payload: {
            ok: true,
            command: "checkpoint",
            status: state.checkpoint ? "current" : "none",
            message: state.checkpoint
              ? `Last session-review checkpoint: ${state.checkpoint}.`
              : "No session-review checkpoint is stored.",
            checkpoint: state.checkpoint,
          },
        },
        nextState: state,
        deleteFile: false,
      };
    }
    case "review": {
      const verdict = parseVerdict(flagString(flags, "verdict"));
      if (!verdict) throw new UsageError("review requires --verdict absent|possible|probable|confirmed.");
      const planned = planReview(state, {
        verdict,
        labels: flagStrings(flags, "label"),
        now,
      });
      if (planned.plan.action !== "check") {
        const status =
          planned.plan.action === "setup-required"
            ? "setup-required"
            : planned.plan.action === "already-checked"
              ? "already-checked"
              : "silent";
        const nextState =
          planned.plan.action === "setup-required"
            ? markSetupOffered(planned.state, now)
            : planned.state;
        return {
          result: {
            exitCode: 0,
            payload: {
              ok: true,
              command: "review",
              status:
                planned.plan.action === "setup-required" && !state.setupOfferedAt
                  ? "setup-required"
                  : status,
              message:
                planned.plan.action === "setup-required" && !state.setupOfferedAt
                  ? FIRST_SESSION_SETUP_OFFER
                  : planned.plan.message,
              verdict,
              interrupt: planned.plan.interrupt,
              labels: planned.plan.labels,
            },
          },
          nextState,
          deleteFile: false,
        };
      }
      const outcome = await runCheck(planned.state, {
        adapter,
        labels: flagStrings(flags, "label"),
        now,
        mode: "session",
      });
      const lookedUp =
        outcome.status === "matches" ||
        outcome.status === "no-match" ||
        outcome.status === "silent";
      const checkedState = markCheckpoint(
        lookedUp ? markEpisodeChecked(outcome.state, now) : outcome.state,
        now,
      );
      const result = fromCheck("review", outcome);
      result.payload.verdict = verdict;
      result.payload.interrupt = outcome.status === "matches" && outcome.fresh.length > 0;
      return {
        result,
        nextState:
          outcome.status === "setup-required" ? markSetupOffered(planned.state, now) : checkedState,
        deleteFile: false,
      };
    }
    case "session-start": {
      return sessionStartResult(state, flags, now, hookInput, env);
    }
    case "inspect": {
      const showIds = flagBool(flags, "show-ids");
      const vehicles = listVehicles(state).map((vehicle) => publicVehicle(vehicle, showIds));
      return {
        result: {
          exitCode: 0,
          payload: {
            ok: true,
            command: "inspect",
            status: "inspected",
            message: vehicles.length
              ? `Enrolled vehicles: ${vehicles.map((vehicle) => vehicle.label).join(", ")}.`
              : "No Flock Me data is stored.",
            vehicles,
            seenRecordCount: state.seenRecords.length,
            checkpoint: state.checkpoint,
            episode: state.episode
              ? { id: state.episode.id, openedAt: state.episode.openedAt, checkedAt: state.episode.checkedAt }
              : null,
            consentAt: state.consentAt,
            setupOfferedAt: state.setupOfferedAt,
            datasetLimits: DATASET_LIMITS,
          },
        },
        nextState: state,
        deleteFile: false,
      };
    }
    case "delete-data": {
      if (!flagBool(flags, "confirm")) {
        throw new UsageError("delete-data requires --confirm.");
      }
      return {
        result: {
          exitCode: 0,
          payload: {
            ok: true,
            command: "delete-data",
            status: "deleted",
            message: "Deleted all locally stored Flock Me data.",
          },
        },
        nextState: state,
        deleteFile: true,
      };
    }
    default:
      throw new UsageError(`Unknown command: ${command}`);
  }
}

function fail(command: string, status: string, message: string, exitCode: number): CliResult {
  return {
    exitCode,
    payload: { ok: false, command, status, message },
  };
}

export async function run(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<CliResult> {
  let command = "help";
  try {
    const parsed = parseArgv(argv);
    command = parsed.command;
    if (parsed.flags.help === true || command === "--help") {
      const helped = await dispatch("help", {}, await readState(defaultStatePath(env)), new UnavailableAdapter());
      return helped.result;
    }
    const statePath = flagString(parsed.flags, "state") ?? defaultStatePath(env);
    const state = await readState(statePath);
    const adapter = await createAdapter(parsed.flags);
    const hookInput =
      parsed.command === "session-start" ? await readHookInput(parsed.flags) : null;
    const { result, nextState, deleteFile } = await dispatch(
      parsed.command,
      parsed.flags,
      state,
      adapter,
      new Date().toISOString(),
      hookInput,
      env,
    );
    if (deleteFile) {
      await deleteState(statePath);
    } else if (nextState !== state) {
      await writeStateAtomic(statePath, nextState);
    }
    const serialized = JSON.stringify(result.payload);
    const plate = flagString(parsed.flags, "plate");
    if (plate) assertNoRawPlate(serialized, plate);
    return result;
  } catch (error) {
    if (error instanceof UsageError) {
      return fail(command, "usage", `${error.message}\n\n${CLI_USAGE.trim()}`, 1);
    }
    if (error instanceof RegistryError || error instanceof PlateValidationError) {
      return fail(command, "error", error.message, 1);
    }
    const message = error instanceof Error ? error.message : "Unexpected failure.";
    return fail(command, "error", message, 1);
  }
}

export async function main(argv: string[] = process.argv): Promise<number> {
  const result = await run(argv);
  process.stdout.write(
    result.stdout !== undefined ? result.stdout : `${JSON.stringify(result.payload, null, 2)}\n`,
  );
  return result.exitCode;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(resolve(entry)).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main().then(
    (code) => process.exit(code),
    (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected failure.";
      process.stderr.write(`${JSON.stringify({ ok: false, status: "error", message })}\n`);
      process.exit(1);
    },
  );
}
