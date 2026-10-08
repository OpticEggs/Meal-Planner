/** Plain sentences for every non-ok outcome (shown to members; no internals, no key). */
export function outcomeSentence(o: { kind: string; afterMs?: number; retryAfterSeconds?: number | null }): string {
  switch (o.kind) {
    case "not_configured":
      return "Nutrition lookup is not configured on this server (there is no FoodData Central API key), so nothing was searched.";
    case "invalid_key":
      return "FoodData Central did not accept this server's API key, so nothing was looked up. The key needs to be replaced.";
    case "rate_limited":
      return "FoodData Central is limiting requests from this server right now. Nothing was changed; try again later.";
    case "timeout":
      return "FoodData Central did not answer in time. Nothing was changed; try again.";
    case "unavailable":
      return "FoodData Central could not be reached. Nothing was changed; try again later.";
    case "malformed":
      return "FoodData Central sent a response Table could not read, so it was not used. Nothing was changed.";
    case "no_matches":
      return "Nothing found. Try different words.";
    default:
      return "Lookup failed. Nothing was changed.";
  }
}
