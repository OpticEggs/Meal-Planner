#!/usr/bin/env python3
"""Build the Phase 2C exposed regression corpus (coordinator).

All sources are previously published, EXPOSED development material (never fresh evidence):
  1. the Phase 2B corpus `tests/regressions/exposed-regressions-2b.jsonl` (1 173 entries; its labels as reviewed in 2B);
  2. coordinator-labels-2c.tsv: the PHASE-2C-PLAN finding-ledger rows and their controls (CONTRACT-v1 §12, §13);
  3. reviewer R1's published probe files with R1's own labels: round 4 new probes (`probes-r4-new.tsv`), every
     earlier round (`probes-prior-round4.tsv`, which carries rounds 1, 1-supplement, 2 and 3), and the Phase 2C review
     rounds (`review-r1-round1/probes-r6-new.tsv`; labels written from §7/§12/§13 before any engine run).
Deduplicated by normalized input. Priority: coordinator 2C > Phase 2B corpus > R1 round 4 new > R1 earlier rounds.

Prospective relabels (CONTRACT-v1 §13.1, applied mechanically and logged to relabels-13-1.tsv): a label whose unit is
`container` or `block` while the line writes no declared container/block word but one of `src/unit-aliases.ts` NOT_ALIASES (tub, pot,
bar, rasher, punnet and plurals) becomes needs_review with no amount (§12.14). No frozen fixture label is changed.

`noAmount: true` (owner requirement 2, CONTRACT §13.2): the engine reading must carry no quantity, unit or package —
coordinator rows flagged N, §13.1 relabels, and R1's status-only needs_review rows of the unknown-measure groups that
write no declared unit word (a qualified declared unit, `1 UK pint stout`, may keep its amount as a review pre-fill).
The required harness (`tests/regressions/semantic-v3-regressions.test.ts`) accepts, for an `unsupported` label, a safe
abstention (needs_review with no amount, unit, package or options); it reports it separately.

Output: packages/recipe-extraction/tests/regressions/exposed-regressions-2c.jsonl
Usage: python3 -I build_corpus_2c.py <repo-root>
"""
import json, os, re, sys, unicodedata
root = sys.argv[1]
here = os.path.join(root, "docs/table/evidence/2026-10-10-recipe-extraction-phase2c/regressions")
probes = os.path.join(root, "docs/table/evidence/2026-10-10-recipe-extraction-phase2b/candidate-review-probes/review5")
pkg = os.path.join(root, "packages/recipe-extraction")

def key(s): return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s)).strip().lower()

NOT_ALIASES = {"tub", "tubs", "pot", "pots", "bar", "bars", "rasher", "rashers", "punnet", "punnets"}  # = src/unit-aliases.ts (checked below)
src = open(os.path.join(pkg, "src/unit-aliases.ts"), encoding="utf-8").read()
declared = set(re.findall(r"^\s+(\w+): \"", src.split("NOT_ALIASES")[1].split("});")[0], re.M))
assert declared == NOT_ALIASES, (declared, NOT_ALIASES)
UNKNOWN_MEASURE_GROUPS = {"A-unknown", "F-unknown", "S-unknown", "U-unknown", "U-unknown4", "F-measurefood"}
# Declared unit words (src/unit-aliases.ts UNIT_ALIASES), one-letter abbreviations excluded: a line that writes one of them
# ("1 UK pint stout", "3 dashes of") has a declared unit, so the noAmount rule (an UNDECLARED measure word) does not apply.
_alias_block = src.split("export const UNIT_ALIASES")[1].split("export const CASED_UNIT_ALIASES")[0]
DECLARED_WORDS = {w for chunk in re.findall(r'words\("([^"]*)"\)', _alias_block) for w in chunk.split() if len(w) > 1}
assert {"pint", "tablespoons", "dashes", "container"} <= DECLARED_WORDS and "tub" not in DECLARED_WORDS

def family_of_group(g):
    if g in ("plain",): return "plain"
    head = g.split("-")[0]
    return {"A": "A", "A5": "A", "A6": "C", "B": "B", "C": "C", "D": "D", "E": "D", "F": "-", "O": "C", "P": "C", "S": "-", "U": "C"}.get(head, "-")

def parse_row(cols):
    inp, status, name, qty, unit, pkg_, alts = cols[:7]
    flags = cols[7] if len(cols) > 7 else "-"
    def opt(v): return None if v == "-" else v
    names = [] if name in ("-", "*") else name.split("|")
    altsets = [] if alts in ("-", "*") else [s.split(";") for s in alts.split("||")]
    status_only = "S" in flags
    exp = {"status": status,
           "name": "*" if (status_only or name == "*") else (names[0] if names else None), "acceptNames": names[1:],
           "quantity": "*" if (status_only or qty == "*") else opt(qty), "unit": "*" if (status_only or unit == "*") else opt(unit),
           "packageSize": "*" if (status_only or pkg_ == "*") else opt(pkg_),
           "alternatives": "*" if (status_only or alts == "*") else (altsets[0] if altsets else []), "acceptAlternatives": altsets[1:]}
    inp = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), inp).replace("\\t", "\t")
    return inp, exp, flags

out, seen, relabels = [], {}, []
def add(entry):
    k = key(entry["input"])
    if k in seen:
        seen[k]["alsoIn"].append(entry["origin"]); return
    entry.setdefault("alsoIn", [])
    seen[k] = entry; out.append(entry)

def relabel_13_1(entry):
    e = entry["expect"]
    toks = [t.lower() for t in re.findall(r"[A-Za-zÀ-ÿ'-]+", entry["input"])]
    w = next((t for t in toks if t in NOT_ALIASES), None)
    declared_word = any(t in ("container", "containers", "block", "blocks") for t in toks)
    if e.get("unit") in ("container", "block") and w is not None and not declared_word:
        old = dict(e)
        entry["expect"] = {"status": "needs_review", "name": "*", "acceptNames": [], "quantity": "*", "unit": "*", "packageSize": "*", "alternatives": "*", "acceptAlternatives": []}
        entry["noAmount"] = True
        entry.setdefault("labelChanged", "CONTRACT-v1 §13.1: '%s' is not a declared unit word (§12.14)" % w)
        relabels.append((entry["input"], json.dumps(old, ensure_ascii=False), "needs_review, no amount", w))

# 1. coordinator 2C rows (highest priority)
for line in open(os.path.join(here, "coordinator-labels-2c.tsv"), encoding="utf-8"):
    if line.startswith("#") or not line.strip(): continue
    cols = line.rstrip("\n").split("\t")
    inp, exp, flags = parse_row(cols[:8])
    entry = {"input": inp, "origin": {"kind": "coordinator-2c", "ref": cols[8]}, "family": cols[9], "firm": "D" not in flags, "expect": exp}
    if "N" in flags:
        entry["noAmount"] = True
        exp.update({"quantity": "*", "unit": "*", "packageSize": "*"})
    add(entry)

# 2. Phase 2B corpus
for line in open(os.path.join(pkg, "tests/regressions/exposed-regressions-2b.jsonl"), encoding="utf-8"):
    c = json.loads(line)
    prev = c.pop("id"); c["origin"] = {**c["origin"], "phase2b": prev}
    relabel_13_1(c)
    add(c)

# 3. R1 probes: round 4 new, then the earlier rounds
r1c = os.path.join(root, "docs/table/evidence/2026-10-10-recipe-extraction-phase2c")
for fdir, fname, kind in ((probes, "probes-r4-new.tsv", "candidate-review-r1-round4"), (probes, "probes-prior-round4.tsv", "candidate-review-r1-earlier"),
                          (os.path.join(r1c, "review-r1-round1"), "probes-r6-new.tsv", "phase2c-review-r1-round1")):
    for n, line in enumerate(open(os.path.join(fdir, fname), encoding="utf-8"), start=1):
        if line.startswith("#") or not line.strip(): continue
        cols = line.rstrip("\n").split("\t")
        inp, exp, flags = parse_row(cols)
        group = cols[8]
        entry = {"input": inp, "origin": {"kind": kind, "ref": f"{fname}:{n}", "group": group, **({"set": cols[9], "seen": cols[10]} if len(cols) > 10 else {})},
                 "family": family_of_group(group), "firm": "D" not in flags, "expect": exp}
        writes_declared = any(t.lower() in DECLARED_WORDS for t in re.findall(r"[A-Za-z]+", inp))
        if group in UNKNOWN_MEASURE_GROUPS and exp["status"] == "needs_review" and "S" in flags and not writes_declared:
            entry["noAmount"] = True
        # Phase 2C round 1 (R1 labels follow §13.1/§13.2: name = the food, quantity/unit/package null)
        if group in ("C-measure6", "D-alias6") and exp["status"] == "needs_review" and exp["quantity"] is None and exp["unit"] is None:
            entry["noAmount"] = True
        relabel_13_1(entry)
        add(entry)

dest = os.path.join(pkg, "tests/regressions/exposed-regressions-2c.jsonl")
with open(dest, "w", encoding="utf-8") as fh:
    for i, e in enumerate(out, start=1):
        fh.write(json.dumps({"id": f"rx2c-{i:04d}", **e}, ensure_ascii=False) + "\n")
with open(os.path.join(here, "relabels-13-1.tsv"), "w", encoding="utf-8") as fh:
    fh.write("# input\told label\tnew label\tunit-slot word (CONTRACT-v1 §13.1)\n")
    for r in relabels: fh.write("\t".join(r) + "\n")
from collections import Counter
print("entries", len(out), "firm", sum(e["firm"] for e in out), "noAmount", sum(bool(e.get("noAmount")) for e in out),
      "relabels", len(relabels), "by origin", dict(Counter(e["origin"]["kind"] for e in out)))
