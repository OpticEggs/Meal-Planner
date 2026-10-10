# Mechanical structural signature of an input line (private workspace only), used to check the
# "each construction at most twice" rule independently of the hand-written construction labels:
# food words collapse to W, so swapping a food word never makes a new shape.
import json, re, sys, collections

UNIT = r"(?:cups?|c\.|tbsps?\.?|tbs\.|tablespoons?|tsps?\.?|teaspoons?|oz\.?|ounces?|fl\.? ?oz\.?|fluid ounces?|lbs?\.?|pounds?|g|grams?|kg|ml|mL|l|litres?|liters?|dl|qts?\.?|quarts?|pints?|gallons?|gal\.)"
CUNIT = r"(?:cloves?|bunch(?:es)?|heads?|slices?|sprigs?|stalks?|sticks?|strips?|ribs?|pods?|links?|leaf|leaves|sheets?|fillets?|wedges?|bulbs?|ears?|pieces?|cubes?|balls?|blocks?|loaf|loaves)"
CONT = r"(?:cans?|jars?|bags?|box(?:es)?|bottles?|cartons?|containers?|envelopes?|packages?|pkg\.|packets?|tins?|tubes?)"
IMP = r"(?:pinch(?:es)?|dash(?:es)?|splash(?:es)?|handfuls?|drops?|knobs?|scoops?|sprinkles?|inch(?:es)?)"
SIZE = r"(?:small|medium|large|extra-large|jumbo|colossal|big|little|giant|lg\.|med\.|sm\.)"
NUMWORD = r"(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|several|few|couple)"
FRACWORD = r"(?:half|third|quarter|quarters|three-quarters?|two-thirds|one-half|one-quarter)"
VULG = "¼½¾⅐-⅞"


def shape(s):
    t = s.strip().replace(" ", " ").replace(" ", " ").replace(" ", " ").replace("\t", " ")
    t = re.sub(r"\s+", " ", t)
    out = []
    m = re.match(r"^([▢☐◦▪–✓✔•*]) ", t)
    if m:
        out.append("DECO"); t = t[m.end():]
    m = re.match(r"^(\d+[.)]|[a-z][.)]) ", t)
    if m:
        out.append("ENUM"); t = t[m.end():]
    # split off top-level comma segments
    depth, segs, cur = 0, [], ""
    for ch in t:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            segs.append(cur); cur = ""
        else:
            cur += ch
    segs.append(cur)
    head, rest = segs[0], segs[1:]

    def paren(p):
        p = p.lower()
        if "$" in p: return "(PRICE)"
        if "optional" in p: return "(OPT)"
        if re.search(r"\d", p): return "(AMT)"
        if re.search(r"\bor\b", p): return "(OR)"
        if "(" in p: return "(NEST)"
        return "(P)"

    head = re.sub(r"\(((?:[^()]|\([^()]*\))*)\)", lambda m: " " + paren(m.group(1)) + " ", head)
    toks = re.findall(r"\([A-Z]+\)|\d+(?:-\d+)?/\d+|[\w'À-ɏ̀-ͯ⅐-⅞¼-¾⁄µ#.%-]+|[/+:~–★]", head)
    for i, w in enumerate(toks):
        lw = w.lower()
        if re.fullmatch(r"\([A-Z]+\)", w): k = w
        elif re.fullmatch(r"-\d.*", w): k = "NEGNUM"
        elif re.fullmatch(r"\d+(?:[.,]\d+)?[-–]\d+(?:[./]\d+)?", w): k = "RANGE"
        elif re.fullmatch(r"\d+-\d+/\d+", w): k = "MIXEDHY"
        elif re.fullmatch(r"\d+/\d+", w): k = "FRAC"
        elif re.fullmatch(r"\d+⁄\d+", w): k = "FSLASH"
        elif re.fullmatch(rf"\d+[{VULG}]", w): k = "INTVULG"
        elif re.fullmatch(rf"[{VULG}]", w): k = "VULG"
        elif re.fullmatch(r"\d+,\d+", w): k = "DCOMMA"
        elif re.fullmatch(r"\d*\.\d+", w): k = "DEC"
        elif re.fullmatch(r"\d+", w): k = "INT"
        elif re.fullmatch(r"\d+(?:\.\d+)?x", lw) or lw in ("x", "×"): k = "X"
        elif re.fullmatch(r"\(?x\d+\)?", lw): k = "XN"
        elif re.fullmatch(rf"\d+(?:\.\d+)?{UNIT}", w): k = "INTUNIT"
        elif re.fullmatch(rf"\d+(?:\.\d+)?-{UNIT}\.?", lw): k = "SIZEUNIT"
        elif re.fullmatch(r"\d+(?:\.\d+)?%", w): k = "PCT"
        elif re.fullmatch(rf"{FRACWORD}(?:-{UNIT}|-{CONT})?", lw): k = "FRACWORD"
        elif re.fullmatch(rf"{FRACWORD}-\w+", lw): k = "FRACWORD-W"
        elif re.fullmatch(NUMWORD, lw): k = "NUMWORD"
        elif re.fullmatch(UNIT, w) or re.fullmatch(UNIT, lw): k = "UNIT"
        elif re.fullmatch(CONT, lw): k = "CONT"
        elif re.fullmatch(CUNIT, lw): k = "CUNIT"
        elif re.fullmatch(IMP, lw): k = "IMP"
        elif re.fullmatch(SIZE, lw): k = "SIZE"
        elif lw in ("cooked", "uncooked", "raw"): k = "FORM"
        elif lw in ("or", "and/or"): k = "OR"
        elif lw in ("and", "&"): k = "AND"
        elif lw in ("plus", "+"): k = "PLUS"
        elif lw in ("minus", "less"): k = "MINUS"
        elif lw in ("of",): k = "OF"
        elif lw in ("to",) and i > 0 and i + 1 < len(toks) and re.match(r"\d", toks[i + 1]): k = "TO"
        elif lw in ("about", "approx.", "approximately", "roughly", "~"): k = "ABOUT"
        elif lw == "/": k = "SLASH"
        elif lw == ":": k = "COLON"
        elif re.search(r"\d", w): k = "NUMW"
        elif i > 0 and w[:1].isupper(): k = "CAP"
        elif re.fullmatch(r"[a-z]+ed", lw) and lw not in ("red", "shred", "seed", "need", "bed") and i > 0: k = "PART"
        else: k = "W"
        if out and out[-1] == k and k in ("W", "CAP"):
            continue
        out.append(k)
    sig = " ".join(out)
    for r in rest:
        lr = r.strip().lower()
        if re.fullmatch(r"(?:to taste|as needed|as desired|if needed|for serving|to serve|for garnish|to garnish|for (?:dusting|greasing|frying|deep-frying|drizzling))", lr):
            sig += " , FLAG"
        elif lr == "optional":
            sig += " , OPT"
        elif lr.startswith("plus"):
            sig += " , PLUS-REMARK"
        elif re.search(r"\bor\b", lr):
            sig += " , OR-REMARK"
        elif re.search(r"\d", lr):
            sig += " , AMT-REMARK"
        else:
            sig += " , NOTE"
    return sig


def tag(c):
    return f'{c["family"]} {c["expect"]["status"]} {"+".join(c["contract12"]) or "-"}{" new" if c["reliesOnNewReading"] else ""}'


def signature(c):
    return f"{shape(c['input'])} | {tag(c)}"


if __name__ == "__main__":
    cs = [json.loads(l) for l in open("/home/user/rx-eval-v3/work/holdout-v3.jsonl", encoding="utf-8")]
    groups = collections.defaultdict(list)
    for c in cs:
        groups[signature(c)].append(c)
    over = {k: v for k, v in groups.items() if len(v) > 2}
    print(f"cases {len(cs)}; distinct mechanical shapes {len(groups)}; shapes used more than twice {len(over)} (covering {sum(len(v) for v in over.values())} cases)")
    if len(sys.argv) > 1:
        for k, v in sorted(over.items(), key=lambda kv: -len(kv[1])):
            print(f"{len(v):3}  {k}")
            for c in v:
                print(f"       {c['family']:5} {c['input']}")
