export {
  AdapterError,
  FixtureAdapter,
  OBSERVED_HIBF_CONTRACT,
  UnavailableAdapter,
  parseLookupResponse,
  type FlockServiceAdapter,
} from "./adapter.ts";
export { auditRecordId } from "./audit-id.ts";
export {
  formatRecord,
  runCheck,
  type CheckMode,
  type CheckOptions,
  type CheckOutcome,
  type ReportedRecord,
} from "./check.ts";
export { CLI_USAGE, dispatch, parseArgv, run, type CliPayload, type CliResult } from "./cli.ts";
export {
  DATASET_LIMITS,
  DEFAULT_VEHICLE_LABELS,
  ENROLLMENT_CONSENT,
  FIRST_SESSION_SETUP_OFFER,
  SERVICE_UNAVAILABLE_MESSAGE,
  nextDefaultLabel,
} from "./copy.ts";
export { assertNoRawPlate, redactLog } from "./log.ts";
export {
  IDENTIFIER_LENGTH,
  IDENTIFIER_PATTERN,
  MAX_PLATE_LENGTH,
  PLATE_PATTERN,
  PlateValidationError,
  confusionVariants,
  deriveIdentifier,
  identifierFromPlate,
  isIdentifier,
  lookupIdentifiersFromPlate,
  normalizePlate,
  validatePlate,
} from "./normalize.ts";
export {
  RegistryError,
  clearRegistry,
  enrollVehicle,
  findVehiclesByLabel,
  listVehicles,
  markSetupOffered,
  removeVehicle,
  removeVehicleByLabel,
  renameVehicle,
  renameVehicleByLabel,
  requireVehicleByLabel,
  selectVehicles,
} from "./registry.ts";
export { classifyAndRemember } from "./seen.ts";
export {
  STATE_DIR_MODE,
  STATE_FILE_MODE,
  defaultStatePath,
  deleteState,
  migrateOrEmpty,
  parseState,
  readState,
  writeStateAtomic,
} from "./state.ts";
export {
  detectHookFormat,
  episodeId,
  formatHookOutput,
  isEpisodeOpen,
  isStartupOnly,
  markCheckpoint,
  markEpisodeChecked,
  openOrReuseEpisode,
  planReview,
  sessionStartInstruction,
  sourceFromHookInput,
  type HookFormat,
  type ReviewPlan,
  type SessionSource,
  type TravelVerdict,
} from "./session.ts";
export { evaluateTravel, parseTravelFixture, type TravelFixture, type TravelSignal } from "./travel.ts";
export {
  STATE_VERSION,
  emptyState,
  type AuditRecord,
  type HouseholdState,
  type LookupRequest,
  type LookupResponse,
  type MobilityEpisode,
  type VehicleRecord,
} from "./types.ts";
