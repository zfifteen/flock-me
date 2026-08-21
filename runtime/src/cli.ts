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
