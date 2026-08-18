export const FIRST_SESSION_SETUP_OFFER = [
  "Flock Me can check public Flock Safety audit records for searches involving your household's vehicles.",
  "Setup stores a derived eight-character identifier, not the plate itself. The raw plate is discarded immediately after derivation.",
  "Live lookups are not available until Have I Been Flocked publishes a permitted integration. You can still enroll vehicles now and inspect or delete the local registry at any time.",
  "Enable Flock Me for this household?",
].join(" ");

export const ENROLLMENT_CONSENT = [
  "I authorize Flock Me to derive an eight-character lookup identifier from this license plate, store that identifier with a local nickname, and discard the plate.",
  "The identifier is a lookup token, not a cryptographic secret. It can be used later to query public Flock audit records if a permitted service contract exists.",
  "A matching record means someone using Flock searched the plate. It does not mean a camera photographed the vehicle, recorded a location, or opened an investigation.",
].join(" ");

export const DEFAULT_VEHICLE_LABELS = [
  "My car",
  "Partner's car",
  "Work truck",
] as const;

export function nextDefaultLabel(existingLabels: readonly string[]): string {
  const used = new Set(existingLabels.map((label) => label.trim().toLowerCase()));
  for (const label of DEFAULT_VEHICLE_LABELS) {
    if (!used.has(label.toLowerCase())) return label;
  }
  return `Household vehicle ${existingLabels.length + 1}`;
}

export const DATASET_LIMITS =
  "The public dataset is incomplete and delayed. New records depend on public-records releases and can arrive months or years after the search.";

export const SERVICE_UNAVAILABLE_MESSAGE =
  "Have I Been Flocked does not permit automated access. Its robots.txt disallows /api/, and no supported third-party API or downloadable dataset has been published. Flock Me will not call the observed internal endpoint.";
