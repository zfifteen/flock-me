/**
 * Stable audit-record identifiers for previously-seen deduplication.
 *
 * A record is the same institutional search when the searching organization,
 * search timestamp, plate lookup token, case number, and reason match.
 * This is independent of Have I Been Flocked's import fingerprint (MD5 of the
 * entire source row), which they use to collapse duplicate FOIA dumps.
 */

const EMPTY = "";

export function auditRecordId(record) {
  const org = String(record.orgId ?? record.org_id ?? EMPTY);
  const time = String(record.searchTimeUtc ?? record.search_time_utc ?? EMPTY);
  const plate = String(record.lookupId ?? record.license_plate_hash ?? EMPTY);
  const caseNumber = String(record.caseNumber ?? record.case_number ?? EMPTY);
  const reason = String(record.reason ?? EMPTY);
  return ["hibf", org, time, plate, caseNumber, reason].join(":");
}

export function assertAuditRecordMeaning(record) {
  return {
    means: "A Flock user searched for this plate.",
    doesNotMean: [
      "A camera photographed the vehicle.",
      "The vehicle was at a specific location.",
      "The owner was investigated.",
      "The search relates to a specific trip.",
    ],
    dataset: {
      incomplete: true,
      delayed: true,
      note: "Public records arrive months or years after the search and cover only agencies that released logs.",
    },
    lookupId: record.lookupId ?? record.license_plate_hash ?? null,
  };
}
