# Aligns three category tags with the adjudicated labels (coordinator, 2026-10-10), on top of the adjudicated file
# 2c179344…; every other line stays byte-identical (asserted). The loader checks category membership and uniqueness
# only (no order); count_unit is placed before size_word as on the file's other count-unit lines.
import hashlib, json, sys

PATH = "/home/user/rx-eval-v3/work/holdout-v3.jsonl"
PREV = "2c1793447a317f789055a73ac4169d66bb51f54848c527b098975dea7a744caa"
raw = open(PATH, "rb").read()
assert hashlib.sha256(raw).hexdigest() == PREV
lines = raw.decode("utf-8").split("\n")[:-1]
cases = [json.loads(l) for l in lines]
by = {c["id"]: c for c in cases}

c = by["ing-h3-0091"]
assert c["categories"] == ["size_word", "integer_decimal", "prep_note"] and c["expect"]["unit"] == "leaf"
c["categories"] = ["count_unit", "size_word", "integer_decimal", "prep_note"]
for i in ("ing-h3-0082", "ing-h3-0322"):
    c = by[i]
    assert "seasoning_ordinary" in c["categories"] and "seasoning_lookalike" not in c["categories"] and c["seasoningClass"] == "lookalike"
    c["categories"] = ["seasoning_lookalike" if x == "seasoning_ordinary" else x for x in c["categories"]]

changed = {"ing-h3-0091", "ing-h3-0082", "ing-h3-0322"}
out = [json.dumps(c, ensure_ascii=False) for c in cases]
for c, old, new in zip(cases, lines, out):
    assert (old != new) == (c["id"] in changed), c["id"]
data = ("\n".join(out) + "\n").encode("utf-8")
open(PATH, "wb").write(data)
print("new SHA-256", hashlib.sha256(data).hexdigest(), file=sys.stderr)
