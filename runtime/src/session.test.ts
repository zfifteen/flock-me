import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enrollVehicle } from "./registry.ts";
import {
  episodeId,
  isStartupOnly,
  markCheckpoint,
  openOrReuseEpisode,
  planReview,
  sessionStartInstruction,
  sourceFromHookInput,
} from "./session.ts";
import { emptyState } from "./types.ts";

const NOW = "2026-08-19T12:00:00.000Z";
const LATER = "2026-08-19T18:00:00.000Z";
const NEXT_DAY = "2026-08-20T01:00:00.000Z";

function enrolled() {
  let state = emptyState();
  state = enrollVehicle(state, { plate: "TESTPLATE", consented: true, now: NOW }).state;
  state = enrollVehicle(state, { plate: "ABC-123", consented: true, now: NOW }).state;
  return state;
}

describe("session-start source gating", () => {
  it("treats missing source as startup-only and skips resume/compact/clear/fork", () => {
    assert.equal(isStartupOnly(sourceFromHookInput(null)), true);
    assert.equal(isStartupOnly(sourceFromHookInput({ source: "startup" })), true);
    assert.equal(isStartupOnly(sourceFromHookInput({ source: "resume" })), false);
    assert.equal(isStartupOnly(sourceFromHookInput({ source: "compact" })), false);
    assert.equal(isStartupOnly(sourceFromHookInput({ source: "clear" })), false);
    assert.equal(isStartupOnly(sourceFromHookInput({ source: "fork" })), false);
  });
});

describe("checkpoint and mobility episodes", () => {
  it("records a checkpoint without touching vehicles", () => {
    const next = markCheckpoint(enrolled(), NOW);
    assert.equal(next.checkpoint, NOW);
    assert.equal(next.vehicles.length, 2);
  });

  it("reuses an open episode for the same vehicles and reports already-checked after a lookup", () => {
    const state = enrolled();
    const ids = state.vehicles.map((vehicle) => vehicle.derivedId);
    const opened = openOrReuseEpisode(state, ids, NOW);
    assert.equal(opened.alreadyChecked, false);
    assert.equal(opened.episode.id, episodeId(NOW, ids));

    const checked = {
      ...opened.state,
      episode: { ...opened.episode, checkedAt: LATER },
    };
    const again = openOrReuseEpisode(checked, ids, LATER);
    assert.equal(again.alreadyChecked, true);
    assert.equal(again.episode.id, opened.episode.id);
  });

  it("opens a new episode after the 12-hour bound", () => {
    const state = enrolled();
    const ids = state.vehicles.map((vehicle) => vehicle.derivedId);
    const opened = openOrReuseEpisode(state, ids, NOW);
    const expired = openOrReuseEpisode(opened.state, ids, NEXT_DAY);
    assert.equal(expired.alreadyChecked, false);
    assert.equal(expired.episode.openedAt, NEXT_DAY);
    assert.notEqual(expired.episode.id, opened.episode.id);
  });
});

describe("review plan", () => {
  it("does not lookup for absent, possible, or probable verdicts", () => {
    for (const verdict of ["absent", "possible", "probable"] as const) {
      const planned = planReview(enrolled(), { verdict, now: NOW });
      assert.equal(planned.plan.action, "checkpoint-only");
      assert.equal(planned.plan.interrupt, false);
      assert.equal(planned.state.checkpoint, NOW);
    }
  });

  it("checks all vehicles when confirmed travel is ambiguous", () => {
    const planned = planReview(enrolled(), { verdict: "confirmed", now: NOW });
    assert.equal(planned.plan.action, "check");
    assert.deepEqual(planned.plan.labels, ["My car", "Partner's car"]);
  });

  it("checks the named vehicle when context identifies one label", () => {
    const planned = planReview(enrolled(), {
      verdict: "confirmed",
      labels: ["My car"],
      now: NOW,
    });
    assert.equal(planned.plan.action, "check");
    assert.deepEqual(planned.plan.labels, ["My car"]);
  });

  it("prevents a second lookup in the same episode", () => {
    const first = planReview(enrolled(), { verdict: "confirmed", now: NOW });
    const afterCheck = {
      ...first.state,
      episode: { ...first.state.episode!, checkedAt: LATER },
    };
    const second = planReview(afterCheck, { verdict: "confirmed", now: LATER });
    assert.equal(second.plan.action, "already-checked");
    assert.equal(second.plan.interrupt, false);
  });

  it("asks for setup when nothing is enrolled", () => {
    const planned = planReview(emptyState(), { verdict: "confirmed", now: NOW });
    assert.equal(planned.plan.action, "setup-required");
    assert.equal(planned.plan.interrupt, true);
  });
});

describe("session-start instruction", () => {
  it("asks Gemini not to call activate_skill and names the checkpoint", () => {
    const text = sessionStartInstruction({
      source: "startup",
      checkpoint: NOW,
      labels: ["My car"],
      setupOffered: true,
      episodeOpen: false,
    });
    assert.match(text, /do not call activate_skill/i);
    assert.match(text, /My car/);
    assert.match(text, /2026-08-19T12:00:00.000Z/);
    assert.match(text, /review --verdict confirmed/);
  });
});
