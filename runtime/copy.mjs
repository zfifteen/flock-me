export const SETUP_OFFER = {
  title: "Watch public Flock searches for your household",
  body: [
    "Flock Me can check public, FOIA-derived Flock Safety audit records for vehicles you enroll.",
    "You provide a license plate once. Flock Me normalizes it locally, keeps the first eight hex characters of its SHA-256 hash, and discards the plate.",
    "Setup is available now, even though live Have I Been Flocked lookups are not enabled yet. Fixture records let you rehearse the workflow with documented test plates.",
  ],
  cta: "Enable household checks",
  decline: "Not now",
};

export const ENROLLMENT_CONSENT = {
  version: 1,
  summary: "I authorize Flock Me to derive and store a lookup token for this household vehicle.",
  clauses: [
    "The only enrollment input is a license plate. The raw plate is discarded after a local lookup token is derived.",
    "The stored token is the first eight hex characters of SHA-256 of the trimmed, lowercased plate. It is a lookup key, not a privacy boundary.",
    "An optional local label (for example “My car”) is stored so multiple vehicles stay distinguishable. Labels are never sent to a search service.",
    "A matching public record means a Flock user searched for the plate. It does not prove a camera photographed the vehicle, a location, an investigation, or a link to a specific trip.",
    "The public dataset is incomplete and delayed. Records can arrive months or years after the search.",
    "I can list, rename, remove, or delete all Flock Me data at any time.",
  ],
};

export const DEFAULT_LABELS = ["My car", "Partner's car", "Work truck", "Household van"];

export const RESULT_DISCLAIMER =
  "A match means someone using Flock searched for the plate. It is not a camera sighting, a location, or proof you were investigated. The public dataset is incomplete and delayed.";
