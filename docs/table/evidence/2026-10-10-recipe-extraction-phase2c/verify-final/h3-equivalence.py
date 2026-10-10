#!/usr/bin/env python3
"""Numerical equivalence of a holdout-v3 rerun with the HISTORICAL scored report (whose bytes are preserved).
Every field must be equal except the provenance pins listed, which later commits legitimately changed. Not a claim
that the files are byte-identical. Usage: python3 -I h3-equivalence.py <historical.json> <rerun.json>"""
import json, sys
a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
diffs = []
def walk(x, y, p):
    if type(x) != type(y): diffs.append(p); return
    if isinstance(x, dict):
        for k in sorted(set(x) | set(y)): walk(x.get(k), y.get(k), f"{p}.{k}")
    elif isinstance(x, list):
        if len(x) != len(y): diffs.append(p + " (length)"); return
        for i, (u, v) in enumerate(zip(x, y)): walk(u, v, f"{p}[{i}]")
    elif x != y: diffs.append(f"{p}: {json.dumps(x)[:80]} -> {json.dumps(y)[:80]}")
# the historical run scored four engines; semantic-v3 is registered later, so restrict the rerun to the same engines
ids = [e["engine"]["id"] for e in a["outcomes"]["engines"]]
for sec in ("ingredientEngines",):
    b[sec] = [e for e in b[sec] if e["engine"]["id"] in ids]
b["outcomes"]["engines"] = [e for e in b["outcomes"]["engines"] if e["engine"]["id"] in ids]
walk(a, b, "")
allowed = (".pins.", ".package", ".selection")
print("differences", len(diffs)); [print(" ", d) for d in diffs]
other = [d for d in diffs if not d.startswith(allowed)]
print("differences outside provenance pins / package identity / engine selection:", len(other))
sys.exit(1 if other else 0)
