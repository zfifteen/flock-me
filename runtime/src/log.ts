const PLATE_LIKE = /\b[A-Za-z0-9-]{2,10}\b/g;
const IDENTIFIER_LIKE = /\b[0-9a-f]{8}\b/gi;

/**
 * Redact plate-shaped tokens and eight-character identifiers from log lines.
 * Callers must still never pass a raw plate into a logger. This is a last-line
 * defense, not a license to log enrollment input.
 */
export function redactLog(message: string): string {
  return message
    .replace(IDENTIFIER_LIKE, "[id]")
    .replace(PLATE_LIKE, "[redacted]");
}

export function assertNoRawPlate(
  value: unknown,
  originalPlate: string,
): void {
  if (typeof value !== "string") return;
  const needle = originalPlate.trim();
  if (!needle) return;
  if (value.includes(needle) || value.includes(needle.toLowerCase()) || value.includes(needle.toUpperCase())) {
    throw new Error("Raw license plate leaked into persistent or logged state.");
  }
}
