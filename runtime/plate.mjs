/**
 * Have I Been Flocked plate normalization + identifier derivation.
 *
 * Observed 2026-08-17 from haveibeenflocked.com frontend (`f1`):
 *   1. trim
 *   2. toLowerCase
 *   3. SHA-256 over UTF-8 bytes
 *   4. first 8 hex characters
 *
 * Hyphens are kept. Internal spaces are NOT stripped. No jurisdiction is mixed
 * into the hash, so identical plate strings from different states collide.
 * O/0 and I/1 lookalikes are expanded only at search time, never at enrollment.
 */

const PLATE_PATTERN = /^[A-Za-z0-9-]+$/;
const LOOKUP_ID_PATTERN = /^[0-9a-f]{8}$/i;
const REDACTED_PLATES = new Set(["redacted", "***"]);
const REDACTED_LOOKUP_IDS = new Set(["b68919af", "596f4162"]);
export const MAX_PLATE_LENGTH = 10;
export const LOOKUP_ID_LENGTH = 8;
export const MAX_LOOKALIKE_VARIANTS = 10;

export function normalizePlate(raw) {
  if (typeof raw !== "string") {
    throw new TypeError("plate must be a string");
  }
  return raw.trim().toLowerCase();
}

export function isLookupId(value) {
  return typeof value === "string" && LOOKUP_ID_PATTERN.test(value.trim());
}

export function isRedactedPlate(raw) {
  const normalized = normalizePlate(raw);
  return REDACTED_PLATES.has(normalized) || REDACTED_LOOKUP_IDS.has(normalized);
}

export function validatePlateInput(raw) {
  if (typeof raw !== "string") {
    return { ok: false, code: "invalid-type", message: "License plate must be a string." };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, code: "empty", message: "Enter a license plate." };
  }
  if (isRedactedPlate(trimmed)) {
    return { ok: false, code: "redacted", message: "That value is a redaction marker, not a plate." };
  }
  if (isLookupId(trimmed)) {
    return { ok: true, kind: "lookup-id", value: trimmed.toLowerCase() };
  }
  if (trimmed.length > MAX_PLATE_LENGTH) {
    return {
      ok: false,
      code: "too-long",
      message: `License plates are at most ${MAX_PLATE_LENGTH} characters.`,
    };
  }
  if (!PLATE_PATTERN.test(trimmed)) {
    return {
      ok: false,
      code: "charset",
      message: "License plate can only contain letters, numbers, and hyphens.",
    };
  }
  return { ok: true, kind: "plate", value: normalizePlate(trimmed) };
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function deriveLookupId(raw) {
  const check = validatePlateInput(raw);
  if (!check.ok) {
    const error = new Error(check.message);
    error.code = check.code;
    throw error;
  }
  if (check.kind === "lookup-id") {
    return check.value;
  }
  const hex = await sha256Hex(check.value);
  return hex.slice(0, LOOKUP_ID_LENGTH);
}

/**
 * HIBF search expands O/0 and I/1 lookalikes (max 10 variants) before hashing.
 * Enrollment stores only the exact normalized plate's identifier.
 */
export function lookalikeVariants(raw, limit = MAX_LOOKALIKE_VARIANTS) {
  const upper = raw.trim().toUpperCase();
  const slots = [];
  for (let i = 0; i < upper.length; i += 1) {
    const ch = upper[i];
    if (ch === "O" || ch === "0") slots.push({ index: i, chars: ["O", "0"] });
    else if (ch === "I" || ch === "1") slots.push({ index: i, chars: ["I", "1"] });
  }
  const seen = new Set([upper]);
  if (slots.length === 0) return [upper];
  const chars = upper.split("");
  const walk = (slotIndex) => {
    if (slotIndex === slots.length) {
      seen.add(chars.join(""));
      return;
    }
    const slot = slots[slotIndex];
    for (const option of slot.chars) {
      chars[slot.index] = option;
      walk(slotIndex + 1);
    }
  };
  walk(0);
  const others = [...seen].filter((item) => item !== upper);
  return [upper, ...others].slice(0, limit);
}

export async function deriveSearchLookupIds(raw) {
  const check = validatePlateInput(raw);
  if (!check.ok) {
    const error = new Error(check.message);
    error.code = check.code;
    throw error;
  }
  if (check.kind === "lookup-id") {
    return [check.value];
  }
  const variants = lookalikeVariants(raw);
  return Promise.all(variants.map((variant) => deriveLookupId(variant)));
}
