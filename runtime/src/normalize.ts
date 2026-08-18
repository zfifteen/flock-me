/**
 * Have I Been Flocked plate normalization and identifier derivation.
 *
 * Verified 2026-08-18 against the published HIBF frontend
 * (`async function f1` in the production bundle):
 *
 *   1. lowercase
 *   2. trim leading/trailing whitespace
 *   3. SHA-256 of the UTF-8 bytes
 *   4. first eight lowercase hex characters
 *
 * Hyphens are significant. Internal spaces are rejected. Jurisdiction is not
 * part of the identifier — identical plate strings from different states collide.
 */

import { createHash } from "node:crypto";

export const PLATE_PATTERN = /^[A-Za-z0-9-]+$/;
export const IDENTIFIER_PATTERN = /^[0-9a-f]{8}$/;
export const MAX_PLATE_LENGTH = 10;
export const IDENTIFIER_LENGTH = 8;

export class PlateValidationError extends Error {
  readonly code = "INVALID_PLATE" as const;
  constructor(message: string) {
    super(message);
    this.name = "PlateValidationError";
  }
}

export type PlateValidation =
  | { ok: true; normalized: string }
  | { ok: false; reason: string };

/** HIBF `f1` step 1–2: lowercase + trim. Does not strip hyphens. */
export function normalizePlate(raw: string): string {
  return raw.toLowerCase().trim();
}

export function isIdentifier(value: string): boolean {
  return IDENTIFIER_PATTERN.test(value.trim().toLowerCase());
}

export function validatePlate(raw: string): PlateValidation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, reason: "Enter a license plate." };
  }
  if (isIdentifier(trimmed)) {
    return {
      ok: false,
      reason: "Enter the plate itself, not an eight-character identifier.",
    };
  }
  if (!PLATE_PATTERN.test(trimmed)) {
    return {
      ok: false,
      reason: "A plate may contain only letters, numbers, and hyphens.",
    };
  }
  if (trimmed.length > MAX_PLATE_LENGTH) {
    return { ok: false, reason: "A plate may be at most 10 characters." };
  }
  return { ok: true, normalized: normalizePlate(trimmed) };
}

/** HIBF `f1` steps 3–4. Input must already be normalized. */
export function deriveIdentifier(normalized: string): string {
  return createHash("sha256")
    .update(normalized, "utf8")
    .digest("hex")
    .slice(0, IDENTIFIER_LENGTH);
}

export function identifierFromPlate(raw: string): string {
  const result = validatePlate(raw);
  if (!result.ok) {
    throw new PlateValidationError(result.reason);
  }
  return deriveIdentifier(result.normalized);
}

export function confusionVariants(raw: string, limit = 10): string[] {
  const upper = raw.toUpperCase();
  const slots: { index: number; chars: string[] }[] = [];
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    if (ch === "O" || ch === "0") slots.push({ index: i, chars: ["O", "0"] });
    else if (ch === "I" || ch === "1") slots.push({ index: i, chars: ["I", "1"] });
  }
  const seen = new Set<string>([upper]);
  if (slots.length === 0) return [upper];
  const chars = upper.split("");
  const walk = (slot: number) => {
    if (slot === slots.length) {
      seen.add(chars.join(""));
      return;
    }
    const current = slots[slot];
    if (!current) return;
    for (const option of current.chars) {
      chars[current.index] = option;
      walk(slot + 1);
    }
  };
  walk(0);
  const extras = [...seen].filter((value) => value !== upper);
  return [upper, ...extras].slice(0, limit);
}

export function lookupIdentifiersFromPlate(raw: string, limit = 10): string[] {
  const result = validatePlate(raw);
  if (!result.ok) {
    throw new PlateValidationError(result.reason);
  }
  return confusionVariants(result.normalized, limit).map((variant) =>
    deriveIdentifier(normalizePlate(variant)),
  );
}
