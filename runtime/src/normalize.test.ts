import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  confusionVariants,
  deriveIdentifier,
  identifierFromPlate,
  lookupIdentifiersFromPlate,
  normalizePlate,
  validatePlate,
} from "./normalize.ts";

const VECTORS: Array<{ raw: string; normalized: string; identifier: string }> = [
  { raw: "TESTPLATE", normalized: "testplate", identifier: "d2097ce6" },
  { raw: "testplate", normalized: "testplate", identifier: "d2097ce6" },
  { raw: "  TESTPLATE  ", normalized: "testplate", identifier: "d2097ce6" },
  { raw: "ABC-123", normalized: "abc-123", identifier: "5942d94f" },
  { raw: "abc-123", normalized: "abc-123", identifier: "5942d94f" },
  { raw: "ABC123", normalized: "abc123", identifier: "6ca13d52" },
  { raw: "SAMPLE1", normalized: "sample1", identifier: "e8513079" },
  { raw: "ZZZ9999", normalized: "zzz9999", identifier: "0aff44a7" },
];

describe("normalizePlate", () => {
  it("lowercases and trims without stripping hyphens", () => {
    assert.equal(normalizePlate("  ABC-123  "), "abc-123");
  });
});

describe("identifier vectors", () => {
  for (const vector of VECTORS) {
    it(`hashes ${JSON.stringify(vector.raw)} to ${vector.identifier}`, () => {
      assert.equal(normalizePlate(vector.raw), vector.normalized);
      assert.equal(deriveIdentifier(vector.normalized), vector.identifier);
      assert.equal(identifierFromPlate(vector.raw), vector.identifier);
    });
  }

  it("treats hyphenated and unhyphenated plates as different identities", () => {
    assert.notEqual(identifierFromPlate("ABC-123"), identifierFromPlate("ABC123"));
  });
});

describe("validatePlate", () => {
  it("rejects empty, spaced, punctuated, oversized, and identifier-shaped input", () => {
    assert.equal(validatePlate("").ok, false);
    assert.equal(validatePlate("ABC 123").ok, false);
    assert.equal(validatePlate("TEST!").ok, false);
    assert.equal(validatePlate("ABCDEFGHIJK").ok, false);
    assert.equal(validatePlate("d2097ce6").ok, false);
  });
});

describe("confusionVariants", () => {
  it("expands O/0 and I/1 lookalikes the way HIBF does", () => {
    const variants = confusionVariants("O1");
    assert.ok(variants.includes("O1"));
    assert.ok(variants.includes("01"));
    assert.ok(variants.includes("OI"));
    assert.ok(variants.includes("0I"));
    assert.equal(variants.length, 4);
  });

  it("hashes each lookup variant independently", () => {
    const ids = lookupIdentifiersFromPlate("SAMPLE1");
    assert.ok(ids.includes("e8513079"));
    assert.ok(ids.length >= 2);
  });
});
