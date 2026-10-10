# Dedup check of work/holdout-v3.jsonl against reference/exposed-inputs-dedup.tsv (private workspace only).
# Exact: NFKC + lowercase + collapsed whitespace (the TSV's own normalization). Near: difflib ratio on the
# normalized strings, and a digit-free skeleton match, for manual review of same-construction near-copies.
import json, re, sys, unicodedata
from difflib import SequenceMatcher

ROOT = "/home/user/rx-eval-v3"


def norm(s):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", s).lower())


def skeleton(s):
    return re.sub(r"[0-9¼-¾⅐-⅞/.,]+", "#", norm(s)).strip()


rows = [l.rstrip("\n").split("\t") for l in open(f"{ROOT}/reference/exposed-inputs-dedup.tsv", encoding="utf-8")][1:]
exposed = sorted({r[0] for r in rows})
exp_set = set(exposed)
exp_skel = {}
for e in exposed:
    exp_skel.setdefault(skeleton(e), e)

threshold = float(sys.argv[1]) if len(sys.argv) > 1 else 0.85
cases = [json.loads(l) for l in open(f"{ROOT}/work/holdout-v3.jsonl", encoding="utf-8")]
exact, near = [], []
for c in cases:
    n = norm(c["input"])
    if n in exp_set:
        exact.append((c["id"], c["input"]))
        continue
    best, best_r = None, 0.0
    sm = SequenceMatcher(None, b=n, autojunk=False)
    for e in exposed:
        sm.set_seq1(e)
        if sm.real_quick_ratio() < threshold or sm.quick_ratio() < threshold:
            continue
        r = sm.ratio()
        if r > best_r:
            best, best_r = e, r
    sk = skeleton(c["input"])
    if best_r >= threshold or sk in exp_skel:
        near.append((c["id"], c["input"], round(best_r, 3), best, exp_skel.get(sk)))
print(f"cases {len(cases)}; exact normalized matches {len(exact)}; near (ratio>={threshold} or skeleton) {len(near)}")
for i, inp in exact:
    print("EXACT", i, repr(inp))
for i, inp, r, best, skm in near:
    print("NEAR ", i, repr(inp), "| ratio", r, repr(best), "| skeleton", repr(skm))
