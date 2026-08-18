import { auditRecordId } from "./audit-id.ts";
import type { AuditRecord, HouseholdState, SeenAuditRecord } from "./types.ts";

export type ClassifiedRecords = {
  fresh: AuditRecord[];
  previouslySeen: AuditRecord[];
  state: HouseholdState;
};

export function classifyAndRemember(
  state: HouseholdState,
  records: AuditRecord[],
  now = new Date().toISOString(),
): ClassifiedRecords {
  const known = new Set(state.seenRecords.map((entry) => entry.recordId));
  const fresh: AuditRecord[] = [];
  const previouslySeen: AuditRecord[] = [];
  const additions: SeenAuditRecord[] = [];

  for (const record of records) {
    const recordId = auditRecordId(record);
    if (known.has(recordId)) {
      previouslySeen.push(record);
      continue;
    }
    known.add(recordId);
    fresh.push(record);
    additions.push({ recordId, firstSeenAt: now });
  }

  return {
    fresh,
    previouslySeen,
    state: {
      ...state,
      seenRecords: [...state.seenRecords, ...additions],
    },
  };
}
