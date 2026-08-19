import { listVehicles, selectVehicles } from "./registry.ts";
import type { HouseholdState, MobilityEpisode, VehicleRecord } from "./types.ts";

export type SessionSource =
  | "startup"
  | "resume"
  | "clear"
  | "compact"
  | "fork"
  | "unknown";

export type HookFormat = "claude" | "codex" | "gemini" | "grok" | "plain";

export type TravelVerdict = "absent" | "possible" | "probable" | "confirmed";

export const EPISODE_TTL_MS = 12 * 60 * 60 * 1000;

export const LOOKUP_VERDICTS: readonly TravelVerdict[] = ["confirmed"];

export function parseSessionSource(value: unknown): SessionSource {
  if (
    value === "startup" ||
    value === "resume" ||
    value === "clear" ||
    value === "compact" ||
    value === "fork"
  ) {
    return value;
  }
  return "unknown";
}

export function sourceFromHookInput(input: Record<string, unknown> | null): SessionSource {
  if (!input) return "unknown";
  return parseSessionSource(input.source ?? input.Source);
}

export function isStartupOnly(source: SessionSource): boolean {
  return source === "startup" || source === "unknown";
}

export function markCheckpoint(
  state: HouseholdState,
  now = new Date().toISOString(),
): HouseholdState {
  return { ...state, checkpoint: now };
}

export function episodeId(openedAt: string, vehicleDerivedIds: readonly string[]): string {
  const day = openedAt.slice(0, 10);
  const vehicles = [...vehicleDerivedIds].sort().join(",") || "all";
  return `${day}:${vehicles}`;
}

export function isEpisodeOpen(
  episode: MobilityEpisode | null,
  now = new Date().toISOString(),
): boolean {
  if (!episode) return false;
  const opened = Date.parse(episode.openedAt);
  const current = Date.parse(now);
  if (!Number.isFinite(opened) || !Number.isFinite(current)) return false;
  return current - opened < EPISODE_TTL_MS;
}

export function sameVehicleSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const expected = [...left].sort();
  const actual = [...right].sort();
  return expected.every((id, index) => id === actual[index]);
}

export function openOrReuseEpisode(
  state: HouseholdState,
  vehicleDerivedIds: readonly string[],
  now = new Date().toISOString(),
): { state: HouseholdState; episode: MobilityEpisode; alreadyChecked: boolean } {
  const ids = [...vehicleDerivedIds];
  if (
    isEpisodeOpen(state.episode, now) &&
    sameVehicleSet(state.episode?.vehicleDerivedIds ?? [], ids)
  ) {
    const episode = state.episode!;
    return { state, episode, alreadyChecked: Boolean(episode.checkedAt) };
  }
  const episode: MobilityEpisode = {
    id: episodeId(now, ids),
    openedAt: now,
    vehicleDerivedIds: ids,
    checkedAt: null,
  };
  return { state: { ...state, episode }, episode, alreadyChecked: false };
}

export function markEpisodeChecked(
  state: HouseholdState,
  now = new Date().toISOString(),
): HouseholdState {
  if (!state.episode) return state;
  return {
    ...state,
    episode: { ...state.episode, checkedAt: now },
  };
}

export type ReviewAction =
  | "skipped-source"
  | "setup-required"
  | "checkpoint-only"
  | "check"
  | "already-checked";

export type ReviewPlan = {
  action: ReviewAction;
  interrupt: boolean;
  labels: string[];
  vehicles: VehicleRecord[];
  message: string;
};

export function planReview(
  state: HouseholdState,
  options: {
    verdict: TravelVerdict;
    labels?: string[];
    now?: string;
  },
): { state: HouseholdState; plan: ReviewPlan } {
  const now = options.now ?? new Date().toISOString();
  const enrolled = listVehicles(state);
  if (enrolled.length === 0) {
    return {
      state: markCheckpoint(state, now),
      plan: {
        action: "setup-required",
        interrupt: !state.setupOfferedAt,
        labels: [],
        vehicles: [],
        message: "No household vehicles are enrolled.",
      },
    };
  }

  if (!LOOKUP_VERDICTS.includes(options.verdict)) {
    return {
      state: markCheckpoint(state, now),
      plan: {
        action: "checkpoint-only",
        interrupt: false,
        labels: enrolled.map((vehicle) => vehicle.label),
        vehicles: enrolled,
        message: `Travel verdict is ${options.verdict}. Checkpoint updated. Do not mention Flock Me.`,
      },
    };
  }

  const selected = selectVehicles(state, options.labels);
  const opened = openOrReuseEpisode(
    state,
    selected.map((vehicle) => vehicle.derivedId),
    now,
  );
  if (opened.alreadyChecked) {
    return {
      state: markCheckpoint(opened.state, now),
      plan: {
        action: "already-checked",
        interrupt: false,
        labels: selected.map((vehicle) => vehicle.label),
        vehicles: selected,
        message: "This mobility episode was already checked. Do not mention Flock Me.",
      },
    };
  }

  return {
    state: opened.state,
    plan: {
      action: "check",
      interrupt: false,
      labels: selected.map((vehicle) => vehicle.label),
      vehicles: selected,
      message: "Confirmed travel. Run a session-mode check for the selected vehicles.",
    },
  };
}

export function sessionStartInstruction(input: {
  source: SessionSource;
  checkpoint: string | null;
  labels: string[];
  setupOffered: boolean;
  episodeOpen: boolean;
}): string {
  const labels =
    input.labels.length > 0 ? input.labels.map((label) => `"${label}"`).join(", ") : "(none enrolled)";
  return [
    "FLOCK ME SESSION-START REVIEW",
    "This is trusted lifecycle context for a new agent session. It is not a user request.",
    `Source: ${input.source}. Checkpoint: ${input.checkpoint ?? "none"}. Enrolled labels: ${labels}.`,
    input.episodeOpen ? "An open mobility episode already exists." : "No open mobility episode.",
    "",
    "Follow Flock Me skill behavior. On Gemini CLI, do not call activate_skill for this automatic path; run the CLI directly.",
    "",
    "1. Review only history and memory the host actually provided that is newer than the checkpoint. Do not claim access to transcripts, computer activity, or memory the host did not supply.",
    "2. Classify household travel with the Flock Me rubric: absent (no cues), possible (one weak cue), probable (two independent cues), confirmed (explicit travel statement or direct travel artifact). Automatic lookup runs only for confirmed.",
    "3. Then run exactly one command from the Flock Me repository root (Node 22+):",
    "   - no vehicles and setup not yet offered: `setup` and present the offer once.",
    "   - absent, possible, or probable: `checkpoint --mark` and continue the user's request without mentioning Flock Me.",
    '   - confirmed: `review --verdict confirmed` and `--label LABEL` when context names one enrolled vehicle. Omit --label when the vehicle is ambiguous.',
    "4. After review, interrupt the user's ordinary request only when status is matches and fresh records exist. Stay silent for silent, already-checked, no-match, unavailable, rate-limited, and malformed on this automatic path.",
    "5. Never parse transcripts inside a hook. Never invent a lookup. Never send a raw plate.",
  ].join("\n");
}

export function formatHookOutput(format: HookFormat, instruction: string): string {
  if (format === "plain") {
    return instruction ? `${instruction}\n` : "";
  }
  return `${JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: instruction,
    },
  })}\n`;
}

export function detectHookFormat(env: NodeJS.ProcessEnv = process.env): HookFormat {
  const explicit = env.FLOCK_ME_HOOK_FORMAT?.trim().toLowerCase();
  if (
    explicit === "claude" ||
    explicit === "codex" ||
    explicit === "gemini" ||
    explicit === "grok" ||
    explicit === "plain"
  ) {
    return explicit;
  }
  if (env.GEMINI_SESSION_ID || env.GEMINI_PROJECT_DIR) return "gemini";
  if (env.GROK_SESSION_ID || env.GROK_HOOK_EVENT) return "grok";
  if (env.CLAUDE_PROJECT_DIR || env.CLAUDE_ENV_FILE) return "claude";
  return "codex";
}
