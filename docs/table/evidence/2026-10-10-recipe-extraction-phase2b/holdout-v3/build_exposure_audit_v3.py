#!/usr/bin/env python3
"""Post-freeze exposure audit of holdout-v3 (EVALUATION-PLAN-v3 §9.4; coordinator).

Run after holdout-v3 is frozen and before it is scored. It answers two questions:

1. **Exact (primary; feeds sensitivity (d)).** Is a holdout-v3 input, normalized, exactly equal to a string that the
   implementation worker or the candidate reviewer could have seen or written? The sources are:
   - the audit list of `build_exposed_inputs.py`: the exposed sets, the regression corpus, the semantic-v2 test data
     and test literals, the Phase 2 and Phase 2B review probes, and the implementation workers' scratch probes;
   - (added here) the backtick spans and lines of the package and lab documentation and of the Phase 2 / 2B evidence
     markdown (the contract examples included);
   - every text file of the reviewer R1 (all rounds, outputs included).

   The ids of the matches go to `fixtures/EXPOSURE-AUDIT-v3.json`.
2. **Containment (supplementary, informational).** Does a holdout-v3 input, normalized, occur as a whole-word
   substring of anything in the transcripts of the agents that wrote or reviewed the candidate engines? The
   transcripts are those of the Phase 2 and Phase 2B implementation workers and the three candidate reviewers. Every
   string value is decoded from the transcript JSON. This is computed before the reviewer R1 sees any holdout-v3 case
   (its recomputation comes later).

Normalization: NFKC, lowercase, whitespace collapsed, trimmed (the same as `build_exposed_inputs.py`).
Usage: python3 -I build_exposure_audit_v3.py <repo-root> <holdout-v3.jsonl> <transcripts-dir> <out-dir> <audited-at>
"""
import glob, json, os, re, subprocess, sys, unicodedata

root, holdout, transcripts, out, audited_at = sys.argv[1:6]
here = os.path.dirname(os.path.abspath(__file__))
def norm(s): return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s)).strip().lower()

# 1. The audit list, rebuilt now from the current sources.
os.makedirs(out, exist_ok=True)
subprocess.run([sys.executable, "-I", os.path.join(here, "build_exposed_inputs.py"), root, os.path.join(out, "lists")], check=True)
exposed = {}
for l in open(os.path.join(out, "lists", "exposed-inputs-audit.tsv"), encoding="utf-8"):
    if l.startswith("#") or not l.strip(): continue
    k, _orig, src = l.rstrip("\n").split("\t")[:3]
    exposed.setdefault(k, src)
base_count = len(exposed)

def add(s, src):
    s = s.strip()
    if not s or len(s) > 300 or any(0xD800 <= ord(ch) <= 0xDFFF for ch in s): return
    exposed.setdefault(norm(s), src)

def md_file(p, src):
    text = open(p, encoding="utf-8", errors="replace").read()
    for m in re.finditer(r"`([^`\n]{2,300})`", text): add(m.group(1), src)
    for line in text.splitlines():
        add(line, src)
        for cell in line.split("|"): add(cell, src)

def plain_file(p, src):
    for line in open(p, encoding="utf-8", errors="replace"):
        add(line, src)
        for cell in line.rstrip("\n").split("\t"): add(cell, src)

# Documentation and evidence markdown (never holdout-v3 files: they are not in the repository before this audit).
pkg = os.path.join(root, "packages/recipe-extraction")
md = [os.path.join(pkg, f) for f in ("CONTRACT-v1.md", "README.md", "fixtures/README.md")]
md += glob.glob(os.path.join(root, "docs/table/recipe-extraction/**/*.md"), recursive=True)
for ev in ("2026-10-09-recipe-extraction-phase2", "2026-10-10-recipe-extraction-phase2b"):
    md += glob.glob(os.path.join(root, "docs/table/evidence", ev, "**/*.md"), recursive=True)
for p in sorted(set(md)):
    if "holdout-v3" in os.path.basename(p).lower(): continue
    md_file(p, "docs " + os.path.relpath(p, root))
# Reviewer R1: every text file it wrote or read as output (repo clones and node_modules excluded).
for p in sorted(glob.glob("/home/user/rx2b-r1/**/*", recursive=True)):
    if "/repo/" in p or "/node_modules/" in p or not os.path.isfile(p) or os.path.getsize(p) > 20_000_000: continue
    if p.endswith(".md"): md_file(p, "R1 " + os.path.relpath(p, "/home/user/rx2b-r1"))
    elif p.endswith((".txt", ".tsv", ".json", ".jsonl", ".log", ".err", ".ts", ".mjs", ".mts")) or "/out" in p:
        plain_file(p, "R1 " + os.path.relpath(p, "/home/user/rx2b-r1"))

cases = [json.loads(l) for l in open(holdout, encoding="utf-8") if l.strip()]
exact = [(c["id"], c["input"], exposed[norm(c["input"])]) for c in cases if norm(c["input"]) in exposed]

# 2. Containment in the transcripts of the agents that built or reviewed the candidate engines.
AGENTS = {
    "a82c80dc6be685db2": "Phase 2B implementation worker (semantic-v2)",
    "a2582ca2e4729c25d": "Phase 2 implementation worker (semantic-v1, the base of semantic-v2)",
    "ab8145f44653ce309": "reviewer R1 (oracle check, candidate reviews rounds 1-4), before it saw holdout-v3",
    "ab16000f941f8231e": "Phase 2 reviewer of semantic-v1",
    "aa537718fb2c48c2f": "Phase 2 final-head reviewer",
}
def strings(o, acc):
    if isinstance(o, str): acc.append(o)
    elif isinstance(o, list):
        for x in o: strings(x, acc)
    elif isinstance(o, dict):
        for x in o.values(): strings(x, acc)
contain = {}
for aid, who in AGENTS.items():
    acc = []
    for l in open(os.path.join(transcripts, f"agent-{aid}.jsonl"), encoding="utf-8", errors="replace"):
        try: strings(json.loads(l), acc)
        except Exception: acc.append(l)
    text = "\n" + norm("\n".join(acc).replace("\\n", "\n").replace("\\t", "\t")) + "\n"
    for c in cases:
        k = norm(c["input"])
        if re.search(r"(?<![0-9a-z])" + re.escape(k) + r"(?![0-9a-z])", text): contain.setdefault(c["id"], []).append(aid)

audit = {
    "matchedCaseIds": sorted(i for i, _, _ in exact),
    "method": ("Exact match after NFKC, lower case, whitespace collapse and trim, of every holdout-v3 input against "
               f"{len(exposed)} exposed strings: the audit list of build_exposed_inputs.py ({base_count}: exposed fixture sets, "
               "regression corpus, semantic-v2 test data and literals, Phase 2/2B review probes, implementation scratch probes) "
               "plus documentation/evidence markdown spans, lines and cells and every reviewer-R1 text file; run after the "
               "holdout-v3 freeze and before scoring (EVALUATION-PLAN-v3 §9.4; docs/table/evidence/2026-10-10-recipe-extraction-"
               "phase2b/holdout-v3/build_exposure_audit_v3.py)"),
    "auditedAt": audited_at,
}
json.dump(audit, open(os.path.join(out, "EXPOSURE-AUDIT-v3.json"), "w", encoding="utf-8"), indent=2, ensure_ascii=False)
with open(os.path.join(out, "EXPOSURE-AUDIT-v3-details.md"), "w", encoding="utf-8") as fh:
    fh.write(f"# Holdout-v3 exposure audit — details ({audited_at})\n\n")
    fh.write(f"Holdout-v3 cases: {len(cases)}. Exposed strings: {len(exposed)} ({base_count} from build_exposed_inputs.py).\n\n")
    fh.write(f"## Exact matches (primary; sensitivity (d)): {len(exact)}\n\n| case | input | first source |\n|---|---|---|\n")
    for i, inp, src in sorted(exact): fh.write(f"| {i} | `{inp}` | {src} |\n")
    fh.write(f"\n## Whole-word containment in implementation and reviewer transcripts (supplementary): {len(contain)}\n\n")
    fh.write("Agents: " + "; ".join(f"`{a}` {w}" for a, w in AGENTS.items()) + ".\n\n")
    fh.write("| case | input | input length | agents |\n|---|---|---|---|\n")
    byid = {c["id"]: c["input"] for c in cases}
    for i in sorted(contain): fh.write(f"| {i} | `{byid[i]}` | {len(byid[i])} | {', '.join(contain[i])} |\n")
print("exposed", len(exposed), "base", base_count, "exact", len(exact), "containment", len(contain))
