import { reviewDigest, type Candidate, type FdcDataType, type ProvenanceKind } from "@/domain/nutrition/fdc";
import { fdcApiKey, fdcStatus, nowInstant } from "../../env";
import { createFdcClient, type DetailOutcome, type FdcClient, type SearchOutcome } from "./client";
import { fixtureTransport } from "./fixture-transport";
import { httpTransport } from "./transport";

export { createFdcClient, type FdcClient, type DetailOutcome, type SearchOutcome } from "./client";
export { httpTransport, redactKey, DETAIL_URL_TEMPLATE, FDC_BASE_URL } from "./transport";
export { fixtureTransport } from "./fixture-transport";

/** The server's client: live (server-side key), the labeled fixture transport (test only), or
 *  not configured (nothing is ever attempted). */
export function defaultFdcClient(): FdcClient {
  const status = fdcStatus();
  if (status === "fixture") return createFdcClient(fixtureTransport(), { now: nowInstant });
  const key = fdcApiKey();
  return createFdcClient(key ? httpTransport(key) : null, { now: nowInstant });
}

export type SearchView =
  | { outcome: "ok"; totalHits: number; results: { fdcId: number; description: string; dataType: FdcDataType; publicationDate: string | null; brandOwner: string | null }[]; provenance: ProvenanceKind }
  | { outcome: Exclude<SearchOutcome["kind"], "ok"> };

export async function searchView(query: string, dataTypes: FdcDataType[] | undefined, client: FdcClient = defaultFdcClient()): Promise<SearchView> {
  const r = await client.search(query, { dataTypes, pageSize: 10 });
  if (r.kind !== "ok") return { outcome: r.kind };
  return { outcome: "ok", totalHits: r.totalHits, results: r.items, provenance: r.meta.provenance };
}

export type CandidateView =
  | { outcome: "ok"; candidate: Candidate; provenance: ProvenanceKind; retrievedAt: string; reviewDigest: string }
  | { outcome: Exclude<DetailOutcome["kind"], "ok"> };

/** One candidate as the member reviews it, with the digest of exactly those values. */
export async function candidateView(fdcId: number, client: FdcClient = defaultFdcClient()): Promise<CandidateView> {
  const r = await client.detail(fdcId);
  if (r.kind !== "ok") return { outcome: r.kind };
  return { outcome: "ok", candidate: r.candidate, provenance: r.meta.provenance, retrievedAt: r.meta.retrievedAt, reviewDigest: reviewDigest(r.candidate, r.meta.provenance) };
}
