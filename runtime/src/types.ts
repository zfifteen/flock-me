export type VehicleRecord = {
  derivedId: string;
  label: string;
  enrolledAt: string;
};

export type MobilityEpisode = {
  id: string;
  openedAt: string;
  vehicleDerivedIds: string[];
  checkedAt: string | null;
};

export type SeenAuditRecord = {
  recordId: string;
  firstSeenAt: string;
};

export type HouseholdState = {
  version: 1;
  vehicles: VehicleRecord[];
  checkpoint: string | null;
  episode: MobilityEpisode | null;
  seenRecords: SeenAuditRecord[];
  consentAt: string | null;
  setupOfferedAt: string | null;
};

export type AuditRecord = {
  sourceId?: string;
  derivedId: string;
  agency?: string;
  operator?: string;
  searchTime?: string;
  reason?: string;
  caseNumber?: string;
  searchType?: string;
  devicesSearched?: number;
  networksSearched?: number;
  textPrompt?: string;
  redacted?: boolean;
};

export type LookupRequest = {
  derivedIds: string[];
  cursor?: string;
};

export type LookupResponse = {
  records: AuditRecord[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number | null;
};

export type LookupFailure = {
  code:
    | "SERVICE_UNAVAILABLE"
    | "RATE_LIMITED"
    | "MALFORMED_RESPONSE"
    | "MISSING_STATE"
    | "EMPTY_REGISTRY";
  message: string;
};

export const STATE_VERSION = 1 as const;

export function emptyState(): HouseholdState {
  return {
    version: STATE_VERSION,
    vehicles: [],
    checkpoint: null,
    episode: null,
    seenRecords: [],
    consentAt: null,
    setupOfferedAt: null,
  };
}
