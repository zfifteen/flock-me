import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveLookupId,
  deriveSearchLookupIds,
  isLookupId,
  lookalikeVariants,
  normalizePlate,
  validatePlateInput,
} from "../plate.mjs";

const VECTORS = [
  { input: "2GAT123", normalized: "2gat123", lookupId: "dabe815c" },
  { input: "2gat123", normalized: "2gat123", lookupId: "dabe815c" },
  { input: "  2GAT123  ", normalized: "2gat123", lookupId: "dabe815c" },
  { input: "2-GAT-123", normalized: "2-gat-123", lookupId: "bd0635de" },
  { input: "TESTPLATE", normalized: "testplate", lookupId: "d2097ce6" },
  { input: "ABC1234", normalized: "abc1234", lookupId: "36f583dd" },
  { input: "abc-123", normalized: "abc-123", lookupId: "5942d94f" },
  { input: "CA12345", normalized: "ca12345", lookupId: "4b7f922f" },
  { input: "NY12345", normalized: "ny12345", lookupId: "7aedd6ff" },
];

test("trim + lowercase is the observed HIBF normalization", () => {
  for (const vector of VECTORS) {
    assert.equal(normalizePlate(vector.input), vector.normalized);
  }
});

test("SHA-256 first 8 hex characters match published vectors", async () => {
  for (const vector of VECTORS) {
    assert.equal(await deriveLookupId(vector.input), vector.lookupId);
  }
});

test("hyphens are kept and change the identifier", async () => {
  assert.notEqual(await deriveLookupId("2GAT123"), await deriveLookupId("2-GAT-123"));
});

test("internal spaces are not stripped", async () => {
  assert.equal(validatePlateInput("2 GAT 123").ok, false);
});

test("identical plate strings from different jurisdictions collide", async () => {
  assert.equal(await deriveLookupId("ABC1234"), await deriveLookupId("abc1234"));
  assert.notEqual(await deriveLookupId("CA12345"), await deriveLookupId("NY12345"));
});

test("an 8-character hex string is treated as an already-derived identifier", async () => {
  assert.equal(isLookupId("dabe815c"), true);
  assert.equal(await deriveLookupId("DABE815C"), "dabe815c");
});

test("redaction markers are rejected", () => {
  assert.equal(validatePlateInput("REDACTED").ok, false);
  assert.equal(validatePlateInput("***").ok, false);
  assert.equal(validatePlateInput("b68919af").ok, false);
});

test("lookalike expansion covers O/0 and I/1 up to 10 variants", () => {
  const variants = lookalikeVariants("O00I11");
  assert.ok(variants.includes("O00I11"));
  assert.ok(variants.length <= 10);
  assert.ok(lookalikeVariants("2GAT123").includes("2GATI23"));
});

test("search derivation hashes each lookalike", async () => {
  const ids = await deriveSearchLookupIds("2GAT123");
  assert.ok(ids.includes("dabe815c"));
  assert.equal(new Set(ids).size, ids.length);
});
