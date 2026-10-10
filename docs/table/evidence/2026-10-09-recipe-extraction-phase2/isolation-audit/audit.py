"""Isolation audit (coordinator, 2026-10-09): do the implementation worker's probe files and committed
changes contain holdout inputs? Exact (normalized) matches and >=0.85 similar strings vs holdout-v1/v2.
Usage: python3 -I audit.py <scratchpad> <author-repo> <fixtures/ingredients dir>"""
import json, sys, re, difflib, subprocess, os
SP, AUTHOR, FX = sys.argv[1:4]
norm = lambda s: re.sub(r"\s+", " ", s).strip().lower()
def inputs(f): return [json.loads(l)["input"] for l in open(os.path.join(FX, f), encoding="utf-8") if l.strip()]
v1, v2, dev = inputs("holdout.jsonl"), inputs("holdout-v2.jsonl"), inputs("dev.jsonl")
diff = subprocess.run(["git", "-C", AUTHOR, "diff", "be28101..c3c7595"], capture_output=True, text=True).stdout
added = "\n".join(l[1:] for l in diff.split("\n") if l.startswith("+") and not l.startswith("+++"))
probe_lines = []
for i in range(1, 10):
    p = os.path.join(SP, f"lines{i}.txt")
    if os.path.exists(p): probe_lines += [l.strip() for l in open(p, encoding="utf-8") if l.strip()]
strings = set(norm(x) for x in probe_lines) | set(norm(m) for m in re.findall(r'"((?:[^"\\]|\\.){4,300})"', added))
print(f"author probe lines: {len(probe_lines)}; author strings (probes + quoted strings in its diff): {len(strings)}")
for name, s in (("holdout-v1", v1), ("holdout-v2", v2), ("dev", dev)):
    hits = sorted(set(norm(x) for x in s) & strings)
    print(f"exact matches with {name} ({len(s)} lines): {len(hits)}" + ("" if name == "dev" else f" -> {hits}"))
near = []
for x in v2:
    t = norm(x)
    if len(t) < 12: continue
    r, p = max(((difflib.SequenceMatcher(None, t, q).ratio(), q) for q in strings), default=(0, ""))
    if 0.85 <= r < 1: near.append((round(r, 3), t, p))
print(f"holdout-v2 lines (>=12 chars) with a 0.85-0.99 similar author string: {len(near)}")
for n in sorted(near, reverse=True): print("  ", n)
