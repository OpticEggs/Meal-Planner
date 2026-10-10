# Applies ADJUDICATION-v3.md (coordinator, 2026-10-10) to work/holdout-v3.jsonl, exactly and nothing else.
# The draft (c31382a3…, commit 57de3fb) is rewritten in place with the same serialization; every untouched line
# stays byte-identical (asserted). From here on the JSONL is authoritative; author.py reproduces only the draft.
import hashlib, json, sys

PATH = "/home/user/rx-eval-v3/work/holdout-v3.jsonl"
DRAFT_SHA = "c31382a33d9a998f40ecfe5f5d91f553bff53e059bacd0bba447c4cd1a48ec93"

raw = open(PATH, "rb").read()
assert hashlib.sha256(raw).hexdigest() == DRAFT_SHA, "not the adjudicated draft"
lines = raw.decode("utf-8").split("\n")
assert lines[-1] == ""
lines = lines[:-1]
cases = [json.loads(l) for l in lines]
assert all(json.dumps(c, ensure_ascii=False) == l for c, l in zip(cases, lines)), "serialization would not round-trip"
by = {c["id"]: c for c in cases}
H = lambda n: by[f"ing-h3-{n}"]
changed = set()


def touch(n):
    changed.add(f"ing-h3-{n}")
    return H(n)


# 1. ing-h3-0091: definite error corrected (§12.4)
c = touch("0091")
assert c["input"] == "6 large cabbage leaves, blanched" and c["expect"]["name"] == "cabbage leaves" and c["expect"]["unit"] == "each"
c["expect"]["name"] = "cabbage"
c["expect"]["quantity"] = "6"
c["expect"]["unit"] = "leaf"
c["expect"]["note"] = "large; blanched"
c["accept"] = {}
c["rationale"] = (
    "§12.4: 'leaf' is a registry count unit that can follow a food, and such a noun is the unit when the words before it, "
    "bought by that unit, are the product meant; as in the listed cases (garlic by the clove, celery by the rib, lemon by "
    "the wedge), 'bought by' names the product, not the retail unit. The product meant is cabbage. The noun stays in the "
    "name only when the words before it alone name a different product or none, and the listed exceptions (bay, curry, "
    "banana, grape, makrut/kaffir lime, pandan leaves) are leaf products sold separately, which cabbage leaves are not "
    "→ 6 leaf cabbage. 'large' sizes the counted leaves → note (§12.10), then 'blanched' (§7.7)."
)

# 2. debatable, pre-registered; labels unchanged
c = touch("0104")
assert c["input"] == "For garnish: pomegranate arils"
c["debatable"] = True
c["rationale"] += (
    " DEBATABLE — PRE-REGISTERED (coordinator adjudication 2026-10-10): unsupported (a heading) — §12.8 also makes a line "
    "with no amount that starts with 'For (the)' a heading, and the two §12.8 sentences are not ranked; sensitivity (a) "
    "reports A1–A5 without this case (informational)."
)
c = touch("0211")
assert c["input"] == "Topping (optional)"
c["debatable"] = True
c["rationale"] += (
    " DEBATABLE — PRE-REGISTERED (coordinator adjudication 2026-10-10): needs_review — §12.8's heading clause needs a line "
    "of only generic component words and '(optional)' is not one, the line neither ends with ':' nor starts with 'For', "
    "and 'uncertain lines go to needs_review'; sensitivity (a) reports A1–A5 without this case (informational)."
)

# 3. ing-h3-0180: kept firm; accept added, rationale extended
c = touch("0180")
assert c["input"] == "1 inch fresh turmeric root, grated" and c["expect"]["unit"] == "inch" and c["accept"] == {}
c["accept"] = {"name": ["turmeric root", "turmeric"], "note": ["fresh; grated"]}
c["rationale"] += (
    " The registry applies by reference: §2 gives the unit 'from UNIT_REGISTRY' and the §12 preamble says unit lists refer "
    "to UNIT_REGISTRY, where inch is an imprecise unit, so §12.14 (a token that is neither a registry unit nor part of the "
    "food) does not apply; §7.3's five imprecise names are examples (frozen h2-0073 reads the registry's 'knob' the same "
    "way). §7.13 covers an inch that sizes a counted item; nothing is counted here. Accepted as in frozen h2-0083 and "
    "h2-0073: name 'turmeric root' or 'turmeric' with note 'fresh; grated'."
)

# 4. accepted values
c = touch("0034")
assert c["input"] == "1 cup mint leaves, packed" and c["accept"] == {}
c["accept"] = {"name": ["mint"]}
c = touch("0077")
assert c["accept"] == {"name": ["cilantro leaves"], "note": ["packed"]}
c["accept"] = {"name": ["cilantro leaves", "cilantro"], "note": ["packed"]}
c = touch("0226")
assert c["input"] == "Cracked black pepper, as needed" and c["accept"] == {}
c["accept"] = {"name": ["black pepper"], "note": ["cracked"]}
c = touch("0281")
assert c["input"] == "a 2-inch knob of fresh ginger" and c["accept"] == {}
c["accept"] = {"name": ["ginger"], "note": ["2-inch; fresh"]}
c = touch("0352")
assert c["input"] == "3-4 tbsp ice-cold water" and c["accept"] == {}
c["accept"] = {"name": ["water"], "note": ["ice-cold"]}
c = touch("0225")
assert c["accept"] == {"name": ["red peppers"], "note": ["roasted; patted dry"]}
c["accept"] = {}
assert "bare peppers accepted" in c["rationale"]
c["rationale"] = (
    "§12.13 (new): leading ✓ is decoration. 'roasted red peppers' is a jarred product: a product-form word written "
    "before the food stays in name with no alternative (§7.6)."
)

# 5. reliesOnNewReading → true (contract12 unchanged; each already lists a non-restated item)
for n in ["0001", "0014", "0022", "0039", "0111", "0125", "0146", "0167", "0177", "0207", "0209", "0215", "0229", "0258", "0303", "0313", "0350"]:
    c = touch(n)
    assert c["reliesOnNewReading"] is False and any(x not in ("12.5", "12.12") for x in c["contract12"]), n
    c["reliesOnNewReading"] = True
for n in ["0017", "0290", "0102", "0129", "0277", "0285", "0345"]:
    assert H(n)["reliesOnNewReading"] is False, n  # left false; pre-registered as the supplementary (c') list

# 6. seasoningClass
for n in ["0082", "0322"]:
    c = touch(n)
    assert c["seasoningClass"] == "ordinary_salt", n
    c["seasoningClass"] = "lookalike"

out = [json.dumps(c, ensure_ascii=False) for c in cases]
for c, old, new in zip(cases, lines, out):
    if c["id"] not in changed:
        assert old == new, c["id"]
    else:
        assert old != new, c["id"]
data = ("\n".join(out) + "\n").encode("utf-8")
open(PATH, "wb").write(data)
print(f"changed {len(changed)} cases; new SHA-256 {hashlib.sha256(data).hexdigest()}", file=sys.stderr)
