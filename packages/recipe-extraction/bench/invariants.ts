/**
 * Rights and source invariants of `fixtures/` (CONTRACT-v1 §8–§9). Reads local files only.
 *
 * - MANIFEST.json lists every fixture file (except itself) and nothing that is missing.
 * - Every http(s) host anywhere in the fixtures is reserved: example.com/.org/.net (and subdomains) or
 *   *.example. The only exception is the schema.org vocabulary identifiers that structured data needs
 *   (`https://schema.org`, `https://schema.org/Recipe` — a bare origin or one path segment of letters),
 *   which are identifiers, not links to content. Anything else fails, including localhost and IPs.
 * - No fixture file is larger than 1 MiB; only text formats (.jsonl, .json, .md, .html); no symlinks.
 * - Every ingredient case and page label has provenance.
 * - FREEZE.json matches the holdout files; once FREEZE-v2.json exists it matches holdout-v2.jsonl.
 * - holdout-v2.jsonl and FREEZE-v2.json, like every file, must be listed in MANIFEST.json (split `holdout2`
 *   is a valid manifest split).
 */
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { verifyFreeze, verifyFreezeV2 } from "./freeze";
import { PROVENANCE_KINDS, SPLITS } from "./types";

export const MANIFEST_FILE = "MANIFEST.json";
export const MAX_FIXTURE_BYTES = 1024 * 1024;
export const FIXTURE_RIGHTS = "synthetic — written for this repository; no third-party content; redistributable with the repository";
const ALLOWED_EXTENSIONS = new Set([".jsonl", ".json", ".md", ".html"]);
const MANIFEST_KINDS = new Set(["ingredient_labels", "page_labels", "page_html", "freeze_record", "documentation", "label_change_log"]);

export interface InvariantResult {
  ok: boolean;
  problems: string[];
}

/** True for example.com / example.org / example.net and their subdomains, and for *.example. */
export function isReservedHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (h === "example" || h.endsWith(".example")) return h !== ".example";
  return ["example.com", "example.org", "example.net"].some((d) => h === d || h.endsWith(`.${d}`));
}

/** A schema.org vocabulary identifier (origin or one alphabetic term), not a content link. */
export const isVocabularyIri = (url: string) => /^https?:\/\/schema\.org(?:\/[A-Za-z]+)?\/?$/.test(url);

export interface FoundUrl {
  url: string;
  host: string;
}

/** Every absolute http(s) URL (also JSON-escaped `https:\/\/…`) and protocol-relative `//host/…` reference in a text. */
export function findUrls(text: string): FoundUrl[] {
  const out: FoundUrl[] = [];
  for (const m of text.matchAll(/https?:(?:\\?\/){2}[^\s"'<>`)\]}|,]*/gi)) {
    const url = m[0].replace(/\\\//g, "/");
    out.push({ url, host: hostOf(url.replace(/^https?:\/\//i, "")) });
  }
  for (const m of text.matchAll(/(?:^|["'=(\s])\/\/([A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z0-9-]+)(?=[/"'?#:\s]|$)/g)) {
    out.push({ url: `//${m[1]}`, host: hostOf(m[1]) });
  }
  return out;
}

function hostOf(rest: string): string {
  let h = rest.split(/[/?#\\]/)[0];
  if (h.includes("@")) h = h.slice(h.lastIndexOf("@") + 1);
  if (h.startsWith("[")) return h; // IPv6 literal: never reserved
  return h.replace(/:\d*$/, "").toLowerCase();
}

function listFiles(dir: string, rel = ""): { rel: string; abs: string }[] {
  const out: { rel: string; abs: string }[] = [];
  for (const name of readdirSync(dir).sort()) {
    const abs = path.join(dir, name);
    const r = rel ? `${rel}/${name}` : name;
    const st = lstatSync(abs);
    if (st.isDirectory()) out.push(...listFiles(abs, r));
    else out.push({ rel: r, abs });
  }
  return out;
}

function manifestProblems(fixturesDir: string, files: string[]): string[] {
  const problems: string[] = [];
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(path.join(fixturesDir, MANIFEST_FILE), "utf8"));
  } catch (err) {
    return [`${MANIFEST_FILE}: cannot be read (${(err as Error).message})`];
  }
  const entries = (manifest as { files?: unknown })?.files;
  if (!Array.isArray(entries)) return [`${MANIFEST_FILE}: 'files' must be an array`];
  const listed = new Set<string>();
  entries.forEach((e: Record<string, unknown>, i) => {
    const where = `${MANIFEST_FILE} files[${i}]${typeof e?.path === "string" ? ` (${e.path})` : ""}`;
    if (typeof e !== "object" || e === null) return void problems.push(`${where}: not an object`);
    if (typeof e.path !== "string" || e.path === "") return void problems.push(`${where}: path missing`);
    if (listed.has(e.path)) problems.push(`${where}: listed twice`);
    listed.add(e.path);
    if (typeof e.kind !== "string" || !MANIFEST_KINDS.has(e.kind)) problems.push(`${where}: kind must be one of ${[...MANIFEST_KINDS].join(", ")}`);
    if (e.split !== undefined && !(SPLITS as readonly unknown[]).includes(e.split)) problems.push(`${where}: split must be one of ${SPLITS.join(", ")}`);
    for (const k of ["provenance", "created", "author", "reviewer"]) if (typeof e[k] !== "string" || (e[k] as string).trim() === "") problems.push(`${where}: ${k} missing`);
    if (e.rights !== FIXTURE_RIGHTS) problems.push(`${where}: rights must be "${FIXTURE_RIGHTS}"`);
  });
  for (const f of files) if (f !== MANIFEST_FILE && !listed.has(f)) problems.push(`${f}: not listed in ${MANIFEST_FILE}`);
  for (const f of listed) if (!files.includes(f)) problems.push(`${MANIFEST_FILE}: lists ${f}, which does not exist`);
  if (listed.has(MANIFEST_FILE)) problems.push(`${MANIFEST_FILE}: must not list itself`);
  return problems;
}

function provenanceOk(p: unknown): boolean {
  if (typeof p !== "object" || p === null) return false;
  const { kind, source } = p as { kind?: unknown; source?: unknown };
  return (PROVENANCE_KINDS as readonly unknown[]).includes(kind) && typeof source === "string" && source.trim() !== "";
}

function provenanceProblems(fixturesDir: string, files: string[]): string[] {
  const problems: string[] = [];
  for (const f of files.filter((x) => x.startsWith("ingredients/") && x.endsWith(".jsonl"))) {
    readFileSync(path.join(fixturesDir, f), "utf8").split("\n").forEach((line, i) => {
      if (line.trim() === "") return;
      let c: Record<string, unknown>;
      try {
        c = JSON.parse(line);
      } catch {
        return void problems.push(`${f}:${i + 1}: invalid JSON`);
      }
      if (!provenanceOk(c?.provenance)) problems.push(`${f}:${i + 1} (${String(c?.id)}): provenance missing or incomplete`);
    });
  }
  if (files.includes("pages/labels.json")) {
    try {
      const pages = JSON.parse(readFileSync(path.join(fixturesDir, "pages/labels.json"), "utf8"));
      (Array.isArray(pages) ? pages : []).forEach((p: Record<string, unknown>, i: number) => {
        if (!provenanceOk(p?.provenance)) problems.push(`pages/labels.json[${i}] (${String(p?.id)}): provenance missing or incomplete`);
      });
    } catch {
      problems.push("pages/labels.json: invalid JSON");
    }
  }
  return problems;
}

/** Check every fixture invariant; `problems` lists each violation (empty when ok). */
export function checkInvariants(fixturesDir: string): InvariantResult {
  const problems: string[] = [];
  const all = listFiles(fixturesDir);
  const files = all.map((f) => f.rel);
  for (const f of all) {
    const st = lstatSync(f.abs);
    if (st.isSymbolicLink()) problems.push(`${f.rel}: symbolic links are not allowed`);
    else if (st.size > MAX_FIXTURE_BYTES) problems.push(`${f.rel}: ${st.size} bytes is over the 1 MiB limit`);
    if (!ALLOWED_EXTENSIONS.has(path.extname(f.rel))) problems.push(`${f.rel}: only .jsonl, .json, .md and .html fixtures are allowed`);
    if (st.isSymbolicLink() || st.size > MAX_FIXTURE_BYTES) continue;
    const text = readFileSync(f.abs, "utf8");
    for (const u of findUrls(text)) {
      if (isVocabularyIri(u.url)) continue;
      if (!isReservedHost(u.host)) problems.push(`${f.rel}: host '${u.host}' is not a reserved example host (${u.url})`);
    }
  }
  problems.push(...manifestProblems(fixturesDir, files));
  problems.push(...provenanceProblems(fixturesDir, files));
  problems.push(...verifyFreeze(fixturesDir));
  problems.push(...verifyFreezeV2(fixturesDir));
  return { ok: problems.length === 0, problems };
}
