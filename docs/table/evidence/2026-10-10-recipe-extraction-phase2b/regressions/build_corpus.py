#!/usr/bin/env python3
"""Build the Phase 2B exposed regression corpus (coordinator).

Sources (all previously published, all EXPOSED development material — none is fresh evidence):
  1. holdout-v2 / holdout-v1 cases that semantic-v1 got wrong in the single Phase 2 evaluation
     (labels: the frozen evaluation-worker labels; origin severity: the evaluation report).
  2. coordinator-labels.tsv: K1-K4 (round-3 review), round-3 should-fix shapes, final-head SF-1..SF-4
     counterexamples and controls (labels written by the coordinator from CONTRACT-v1 + §12).
  3. final-head review probes.tsv (748 lines, the independent reviewer's own labels; D = debatable).
Deduplicated by normalized input (priority: holdout label > coordinator > reviewer probe).
Output: packages/recipe-extraction/tests/regressions/exposed-regressions-2b.jsonl
Usage: python3 -I build_corpus.py <repo-root>
"""
import json, sys, unicodedata, re, os
root = sys.argv[1]
ev2 = os.path.join(root, "docs/table/evidence/2026-10-09-recipe-extraction-phase2")
here = os.path.join(root, "docs/table/evidence/2026-10-10-recipe-extraction-phase2b/regressions")
fx = os.path.join(root, "packages/recipe-extraction/fixtures/ingredients")

def key(s): return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s)).strip().lower()

GROUP_FAMILY = {
  **{g: "A" for g in ["fraction","numword","compound","range","b3-glued","b4-x","b2-digits","remark-amount","restate","b3-restate","b2-restate","b3-marker","b2-range","b2-compound","ozfloz","b3-ozfloz"]},
  **{g: "B" for g in ["alt","b2-alt","b4-alt3","sourcing","b3-alt","nested"]},
  **{g: "C" for g in ["count","b3-count","package","b2-package","qualifier","b2-qualifier","b2-size","form","b3-K2"]},
  **{g: "D" for g in ["nonfood","b2-nonfood","b3-nonfood","b3-nutrition"]},
}

def amount_label(a):  # {"quantity": "14.5", "unit": "oz"} -> "14.5 oz"
    return None if a is None else f'{a["quantity"]} {a["unit"]}'

out, seen = [], {}
def add(entry):
    k = key(entry["input"])
    if k in seen:
        seen[k]["alsoIn"].append(entry["origin"])
        return
    entry["alsoIn"] = []
    seen[k] = entry
    out.append(entry)

# 1. holdout failures of semantic-v1 (from the evaluation report of 56eafe4)
rep = json.load(open(os.path.join(ev2, "evaluation-56eafe4/benchmark-report.json")))
sem = [e for e in rep["outcomes"]["engines"] if e["engine"]["id"] == "semantic-v1"][0]
mism = [e for e in rep["ingredientEngines"] if e["engine"]["id"] == "semantic-v1"][0]["mismatches"]
fail_ids = {}
for split in ("holdout", "holdout2"):
    ci = sem["sets"][split]["caseIds"]
    for cls in ("C2High","C2Medium","C3a","C3b","C3c","C3x","C4","C5b","C5c","C5x","C6","C8","S1","S2","S3","S4","S5","S6","S7","S8"):
        for cid in ci.get(cls, []) or []:
            fail_ids.setdefault(cid, []).append(cls)
for m in mism:  # any core/alternatives field not accepted (e.g. invented options on review lines)
    if m["split"] in ("holdout","holdout2") and any(not f["accepted"] for f in m["fields"] if f["field"] in ("status","name","quantity","unit","packageSize","alternatives")):
        fail_ids.setdefault(m["id"], []).append("field-mismatch")
labels = {}
for f in ("holdout.jsonl", "holdout-v2.jsonl"):
    for l in open(os.path.join(fx, f)):
        c = json.loads(l); labels[c["id"]] = c
FAMILY_OF = {"0054":"C","0065":"C","0072":"C","0087":"C","0164":"C","0165":"A","0338":"A","0219":"B","0218":"B","0220":"B","0277":"A",
             "0129":"A","0130":"A","0140":"A","0040":"A","0041":"A","0151":"A","0061":"A","0212":"A","0213":"A","0253":"A","0239":"C","0232":"B",
             "0286":"D","0288":"D","0297":"D","0021":"B","0031":"B"}
for cid in sorted(fail_ids):
    c = labels[cid]; e = c["expect"]; a = c.get("accept", {})
    add({"input": c["input"], "origin": {"kind": "holdout-v2" if cid.startswith("ing-h2") else "holdout-v1", "ref": cid,
         "severityOnSemanticV1": sorted(set(fail_ids[cid]))},
         "family": FAMILY_OF.get(cid[-4:], "-"), "firm": True,
         "expect": {"status": e["status"], "name": e["name"], "acceptNames": a.get("name", []), "quantity": e["quantity"], "unit": e["unit"],
                    "packageSize": amount_label(e["packageSize"]), "alternatives": e["alternatives"], "acceptAlternatives": a.get("alternatives", [])}})

def parse_tsv_row(cols):
    inp, status, name, qty, unit, pkg, alts = cols[:7]
    def opt(v): return None if v == "-" else v
    names = [] if name in ("-", "*") else name.split("|")
    altsets = [] if alts in ("-", "*") else [s.split(";") for s in alts.split("||")]
    return inp, {"status": status, "name": "*" if name == "*" else (names[0] if names else None), "acceptNames": names[1:],
                 "quantity": "*" if qty == "*" else opt(qty), "unit": "*" if unit == "*" else opt(unit), "packageSize": "*" if pkg == "*" else opt(pkg),
                 "alternatives": "*" if alts == "*" else (altsets[0] if altsets else []), "acceptAlternatives": altsets[1:]}

# 2. coordinator labels
for line in open(os.path.join(here, "coordinator-labels.tsv")):
    if line.startswith("#") or not line.strip(): continue
    cols = line.rstrip("\n").split("\t")
    inp, expect = parse_tsv_row(cols)
    add({"input": inp, "origin": {"kind": "coordinator", "ref": cols[8]}, "family": cols[9], "firm": "D" not in cols[7], "expect": expect})

# 3. final-head review probes (reviewer's labels); origin severity from the reviewer's semantic-v1 run
probe_out = {p["input"]: p for p in json.load(open(os.path.join(here, "final-head-probes-out-semantic-v1.json")))["probes"]}
for n, line in enumerate(open(os.path.join(ev2, "review/final-head-0c0c60f/probes.tsv")), start=1):
    if line.startswith("#") or not line.strip(): continue
    cols = line.rstrip("\n").split("\t")
    inp, expect = parse_tsv_row(cols)
    po = probe_out.get(inp, {})
    # the reviewer's probe.ts decodes \uXXXX and \t escapes in the input column before parsing (probe.ts:48)
    inp = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), inp).replace("\\t", "\t")
    sev = [x for x in [po.get("cls"), (po.get("cls","") + po["partial"]) if po.get("partial") else None, po.get("sev")] if x] + po.get("S", [])
    add({"input": inp, "origin": {"kind": "final-head-probe", "ref": f"probes.tsv:{n}", "group": cols[8], "severityOnSemanticV1": sev},
         "family": GROUP_FAMILY.get(cols[8], "-"), "firm": "D" not in cols[7], "expect": expect})

dest = os.path.join(root, "packages/recipe-extraction/tests/regressions/exposed-regressions-2b.jsonl")
os.makedirs(os.path.dirname(dest), exist_ok=True)
with open(dest, "w") as fh:
    for i, e in enumerate(out, start=1):
        e = {"id": f"rx2b-{i:04d}", **e}
        fh.write(json.dumps(e, ensure_ascii=False, sort_keys=False) + "\n")
from collections import Counter
print("entries", len(out), "firm", sum(e["firm"] for e in out), "by origin", dict(Counter(e["origin"]["kind"] for e in out)),
      "by family", dict(Counter(e["family"] for e in out)), "dedup-merged", sum(len(e["alsoIn"]) for e in out))
