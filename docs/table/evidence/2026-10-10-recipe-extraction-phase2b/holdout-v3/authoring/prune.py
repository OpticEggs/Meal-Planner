# Remove cases whose input is in a removal list (dedup), deleting their c(...) calls from the case files.
import ast, json, os, sys
ROOT = "/home/user/rx-eval-v3/work"
remove = set(json.load(open(sys.argv[1], encoding="utf-8")))
found = set()
total = 0
for part in ("cases.py", "cases2.py", "cases3.py", "cases4.py"):
    fp = f"{ROOT}/{part}"
    if not os.path.exists(fp):
        continue
    src = open(fp, encoding="utf-8").read()
    lines = src.split("\n")
    spans = []
    for node in ast.parse(src).body:
        if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call) and getattr(node.value.func, "id", "") == "c":
            inp = node.value.args[0].value
            if inp in remove:
                spans.append((node.lineno - 1, node.end_lineno))
                found.add(inp)
    for a, b in sorted(spans, reverse=True):
        del lines[a:b]
    open(fp, "w", encoding="utf-8").write("\n".join(lines))
    total += len(spans)
missing = remove - found
assert not missing, f"not found: {len(missing)}"
print("removed", total)
