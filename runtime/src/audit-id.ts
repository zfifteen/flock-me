import { createHash } from "node:crypto";
import type { AuditRecord } from "./types.ts";

const FIELD_SEP = "\u001f";

function field(value: string | number | boolean | undefined): string {
  if (value === undefined) return "";
  return String(value).trim();
}

export function auditRecordId(record: AuditRecord): string {
  const source = record.sourceId?.trim();
  if (source) return `src:${source}`;

  const canonical = [
    field(record.derivedId),
    field(record.agency),
    field(record.operator),
    field(record.searchTime),
    field(record.reason),
    field(record.caseNumber),
    field(record.searchType),
    field(record.devicesSearched),
    field(record.networksSearched),
    field(record.textPrompt),
    record.redacted ? "1" : "0",
  ].join(FIELD_SEP);

  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `tup:${digest.slice(0, 16)}`;
}
