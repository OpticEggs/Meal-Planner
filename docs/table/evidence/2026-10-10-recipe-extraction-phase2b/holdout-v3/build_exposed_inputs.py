#!/usr/bin/env python3
"""Collect every ingredient-line input that is EXPOSED before holdout-v3 is written (coordinator).

Used twice: (1) the evaluator deduplicates holdout-v3 against the 'dedup' list (strings only — no engine, no output, no
label); (2) the post-freeze exposure audit matches holdout-v3 inputs against the 'audit' list, which adds the
implementation worker's scratch probes and the candidate reviewer's probe files.
Normalization: NFKC, lowercase, whitespace collapsed, trimmed.
Usage: python3 -I build_exposed_inputs.py <repo-root> <out-dir>
"""
import json, os, re, sys, glob, unicodedata
root, out = sys.argv[1], sys.argv[2]
pkg = os.path.join(root, "packages/recipe-extraction")
ev = os.path.join(root, "docs/table/evidence")
def norm(s): return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s)).strip().lower()
dedup, audit = {}, {}
def add(target, s, src):
    s = s.strip()
    if not s or len(s) > 300 or any(0xD800 <= ord(ch) <= 0xDFFF for ch in s): return  # lone surrogates (hostile tests)
    target.setdefault(norm(s), (s.replace("\t", " ").replace("\n", " "), src))
def jsonl_inputs(path, src, targets):
    for l in open(path, encoding="utf-8"):
        if l.strip():
            o = json.loads(l)
            for t in targets: add(t, o.get("input", o.get("line", "")), src)
def tsv_inputs(path, src, targets):
    for l in open(path, encoding="utf-8"):
        if l.startswith("#") or not l.strip(): continue
        inp = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), l.split("\t")[0]).replace("\\t", "\t")
        for t in targets: add(t, inp, src)
def lines_file(path, src, targets):
    for l in open(path, encoding="utf-8", errors="replace"):
        if l.strip() and not l.startswith("#"):
            for t in targets: add(t, l.rstrip("\n"), src)
def ts_literals(path, src, targets):
    text = open(path, encoding="utf-8").read()
    for m in re.finditer(r'"((?:[^"\\\n]|\\.){2,200})"|`([^`\n$]{2,200})`|\'((?:[^\'\\\n]|\\.){2,200})\'', text):
        s = next(g for g in m.groups() if g is not None)
        if re.search(r"\d|\b(cup|tbsp|tsp|oz|lb|g|ml|can|clove|pinch|or|and)\b", s, re.I) and " " in s:
            for t in targets: add(t, s.encode().decode("unicode_escape", errors="ignore") if "\\u" in s else s, src)
both = (dedup, audit)
for f in ("dev.jsonl", "holdout.jsonl", "holdout-v2.jsonl"): jsonl_inputs(os.path.join(pkg, "fixtures/ingredients", f), f"fixtures/{f}", both)
jsonl_inputs(os.path.join(pkg, "tests/regressions/exposed-regressions-2b.jsonl"), "regression-corpus", both)
for p in glob.glob(os.path.join(pkg, "tests/semantic-v2/data/*.jsonl")): jsonl_inputs(p, "semantic-v2 test data", both)
for p in glob.glob(os.path.join(pkg, "tests/**/*.ts"), recursive=True): ts_literals(p, "test literals " + os.path.relpath(p, pkg), both)
tsv_inputs(os.path.join(ev, "2026-10-09-recipe-extraction-phase2/review/final-head-0c0c60f/probes.tsv"), "final-head probes", both)
for p in glob.glob(os.path.join(ev, "2026-10-09-recipe-extraction-phase2/review/probes/*.txt")): lines_file(p, "phase2 review probes", both)
for p in glob.glob(os.path.join(ev, "2026-10-09-recipe-extraction-phase2/isolation-audit/*.txt")): lines_file(p, "phase2 author probes", both)
# reviewer R1 probe files (all rounds) — audit and dedup (they are published or will be)
for p in glob.glob("/home/user/rx2b-r1/review*/probes*.tsv"): tsv_inputs(p, "R1 probes " + os.path.basename(os.path.dirname(p)), both)
# audit only: the implementation worker's scratch probe files (Phase 2B and Phase 2)
for base in ("/home/user/rx2b-impl-scratch", "/home/user/rx-author-scratch"):
    for p in glob.glob(os.path.join(base, "**/*"), recursive=True):
        if os.path.isfile(p) and p.endswith((".txt", ".tsv", ".jsonl", ".json", ".ts", ".mts")) and os.path.getsize(p) < 5_000_000:
            try:
                if p.endswith((".ts", ".mts")): ts_literals(p, "author scratch", (audit,))
                elif p.endswith(".jsonl"):
                    for l in open(p, encoding="utf-8", errors="replace"):
                        try: add(audit, json.loads(l).get("input", ""), "author scratch")
                        except Exception: pass
                else: lines_file(p, "author scratch", (audit,))
            except Exception: pass
os.makedirs(out, exist_ok=True)
for name, d in (("exposed-inputs-dedup.tsv", dedup), ("exposed-inputs-audit.tsv", audit)):
    with open(os.path.join(out, name), "w", encoding="utf-8") as fh:
        fh.write("# normalized\toriginal\tsource\n")
        for k in sorted(d): fh.write(f"{k}\t{d[k][0]}\t{d[k][1]}\n")
print("dedup", len(dedup), "audit", len(audit))
