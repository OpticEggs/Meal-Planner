# Authoring script for holdout-v3 (private workspace only). Builds work/holdout-v3.jsonl from the
# hand-written cases below. Labels are written from CONTRACT-v1 §7, §12 and §12.A and the labelling guide;
# no parser or engine is imported or run. The only computation is my own arithmetic check of the §12.6
# restatement test and of compound sums, and the deterministic id assignment.
import json, random, sys
from fractions import Fraction as F
from decimal import Decimal as D

AUTHOR = "evaluation worker (Phase 2B)"
PROV = ("Written for holdout-v3 by the evaluation worker (Phase 2B), 2026-10-10, from CONTRACT-v1 §7 and §12 "
        "(incl. §12.A) and the labelling guide; no parser or engine was run on it")

CASES = []


def c(inp, con, fam, cat, r, *, s="ready", n=None, q=None, u=None, pk=None, eq=(), f=None, nt=None, alt=(),
      opt=False, apx=False, au=None, an=None, anote=None, aalt=None, sev=None, sc=None, c12=(), new=False,
      deb=False):
    if sev is None:
        if s == "ready":
            sev = "high" if q is not None else "low"
        elif s == "unsupported":
            sev = "medium"
        else:
            raise SystemExit(f"needs_review case needs an explicit severity: {inp!r}")
    accept = {}
    if an is not None:
        accept["name"] = an
    if anote is not None:
        accept["note"] = anote
    if aalt is not None:
        accept["alternatives"] = aalt
    CASES.append({
        "categories": list(cat),
        "input": inp,
        "expect": {
            "status": s, "name": n, "quantity": q, "unit": u,
            "packageSize": None if pk is None else {"quantity": pk[0], "unit": pk[1]},
            "equivalents": [{"quantity": a, "unit": b} for a, b in eq],
            "form": f, "note": nt, "alternatives": list(alt), "optional": opt, "approximate": apx,
            "amountUnstated": au,
        },
        "accept": accept,
        "severity": sev,
        "seasoningClass": sc,
        "construction": con,
        "rationale": r,
        "family": fam,
        "contract12": list(c12),
        "reliesOnNewReading": new,
        "debatable": deb,
    })


# --- my own arithmetic check of the §12.6 restatement test (registry base values, CONTRACT §12.6) ---
BASE = {"g": D("1"), "kg": D("1000"), "oz": D("28.349523125"), "lb": D("453.59237"), "ml": D("1"),
        "l": D("1000"), "dl": D("100"), "tsp": D("4.92892159375"), "tbsp": D("14.78676478125"),
        "fl_oz": D("29.5735295625"), "cup": D("236.5882365"), "pint": D("473.176473"),
        "quart": D("946.352946"), "gallon": D("3785.411784")}
MASS = {"g", "kg", "oz", "lb"}


def restates(q1, u1, q2, u2):
    """True when q2 u2 restates q1 u1 under §12.6 (7 % test, or the ml/g / lb-for-kg half-up allowance, A2)."""
    if (u1 in MASS) != (u2 in MASS):
        return True  # mass <-> volume is not checked
    a = D(F(q1).numerator) / D(F(q1).denominator) * BASE[u1]
    b = D(F(q2).numerator) / D(F(q2).denominator) * BASE[u2]
    if abs(b - a) <= D("0.07") * a:
        return True
    smaller = BASE[u2] < BASE[u1]
    if smaller and (u2 in ("ml", "g") or (u2 == "lb" and u1 == "kg")):
        exact = a / BASE[u2]
        rounded = int(exact + D("0.5"))  # half up (positive values)
        return F(q2) == rounded
    return False


CHECKS = [
    ("1", "cup", "250", "ml", True), ("12", "oz", "350", "g", True), ("4", "oz", "125", "g", False),
    ("2", "tbsp", "30", "ml", True), ("1/8", "tsp", "1", "ml", True), ("1/8", "tsp", "1/2", "ml", False),
    ("3/2", "tsp", "7", "ml", True), ("1", "tbsp", "4", "tsp", False), ("250", "g", "1/2", "lb", False),
    ("2", "kg", "4", "lb", True), ("1", "lb", "450", "g", True), ("200", "ml", "1", "cup", False),
    ("1", "cup", "240", "ml", True), ("1", "cup", "8", "fl_oz", True), ("100", "g", "7/2", "oz", True),
    ("8", "oz", "225", "g", True), ("3/2", "lb", "750", "g", False), ("400", "g", "14", "oz", True),
    ("500", "g", "1", "lb", False), ("8", "tsp", "40", "ml", True), ("3/4", "cup", "175", "ml", True),
    ("2", "lb", "900", "g", True), ("1", "kg", "2", "lb", True), ("3", "tbsp", "45", "ml", True),
    ("16", "fl_oz", "500", "ml", True), ("2", "cup", "1/2", "l", True), ("1/3", "cup", "75", "ml", True),
    ("1", "quart", "1", "l", True), ("1", "lb", "500", "g", False), ("6", "oz", "170", "g", True),
]
for q1, u1, q2, u2, want in CHECKS:
    got = restates(q1, u1, q2, u2)
    assert got == want, (q1, u1, q2, u2, got)

# compound sums (§7.5 / §12.12), smallest stated unit
TSP_PER = {"tsp": 1, "tbsp": 3, "cup": 48}
assert 2 * 16 + 3 == 35 and 12 + 2 == 14 and 16 - 1 == 15 and 6 + 2 == 8 and 12 + 1 == 13 and 6 + 1 == 7
assert 16 + 6 == 22 and 32 + 2 == 34

for part in ("cases.py", "cases2.py", "cases3.py", "cases4.py"):
    import os
    fp = __file__.replace("author.py", part)
    if os.path.exists(fp):
        exec(open(fp, encoding="utf-8").read())

# construction = mechanical surface shape (shape.py: food words and unit spellings collapse, so swapping a food word
# never makes a new construction) + the reading the line tests (family, status, §12 items, new reading). The
# hand-written labels in the c(...) calls stay in the case sources as authoring notes.
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from shape import shape as _shape
for case in CASES:
    r = case
    tag = f'{r["family"]} {r["expect"]["status"]}' + (f' {"+".join(r["contract12"])}' if r["contract12"] else "") + (" new" if r["reliesOnNewReading"] else "")
    case["construction"] = f"{_shape(r['input'])} | {tag}"
_cc = {}
for case in CASES:
    _cc[case["construction"]] = _cc.get(case["construction"], 0) + 1
assert max(_cc.values()) <= 2, [k for k, v in _cc.items() if v > 2]
assert max(len(k) for k in _cc) <= 120

# deterministic interleaving, then ids
order = list(range(len(CASES)))
random.Random(20261010).shuffle(order)
out = []
for i, k in enumerate(order, start=1):
    case = CASES[k]
    rec = {
        "id": f"ing-h3-{i:04d}", "split": "holdout3", "categories": case["categories"], "input": case["input"],
        "expect": case["expect"], "accept": case["accept"], "severity": case["severity"],
        "seasoningClass": case["seasoningClass"],
        "provenance": {"kind": "synthetic_pattern", "source": PROV},
        "source": {"kind": "synthetic_pattern", "author": AUTHOR},
        "construction": case["construction"], "rationale": case["rationale"], "family": case["family"],
        "contract12": case["contract12"], "reliesOnNewReading": case["reliesOnNewReading"],
        "debatable": case["debatable"],
    }
    out.append(json.dumps(rec, ensure_ascii=False))
with open(__file__.replace("author.py", "holdout-v3.jsonl"), "w", encoding="utf-8") as fh:
    fh.write("\n".join(out) + "\n")
print(f"wrote {len(out)} cases", file=sys.stderr)
