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
  listVehicles,
  markSetupOffered,
  removeVehicle,
  renameVehicle,
} from "./registry.ts";
export { classifyAndRemember } from "./seen.ts";
export {
  STATE_DIR_MODE,
  STATE_FILE_MODE,
  defaultStatePath,
  migrateOrEmpty,
  parseState,
  writeStateAtomic,
} from "./state.ts";
export {
  STATE_VERSION,
  emptyState,
  type AuditRecord,
  type HouseholdState,
  type LookupRequest,
  type LookupResponse,
  type VehicleRecord,
} from "./types.ts";
