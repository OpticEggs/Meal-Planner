import json,re,unicodedata
from fractions import Fraction
from collections import Counter,defaultdict
H="/home/user/Meal-Planner/.claude/worktrees/agent-a368bb9f7d41d396b/packages/recipe-extraction/fixtures/ingredients/holdout-v2.jsonl"
rows=[json.loads(l) for l in open(H)]
UNITS={"mg":"mass","g":"mass","kg":"mass","oz":"mass","lb":"mass","ml":"volume","dl":"volume","l":"volume","tsp":"volume","tbsp":"volume","fl_oz":"volume","cup":"volume","pint":"volume","quart":"volume","gallon":"volume"}
for u in "each bag ball block bottle box bulb bunch can carton clove container cube ear envelope fillet head jar leaf link loaf package packet piece pod rib sheet slice sprig stalk stick strip tin tube wedge".split(): UNITS[u]="count"
for u in "dash drop handful inch knob pinch scoop splash sprinkle".split(): UNITS[u]="imprecise"
def q(s):
    m=re.fullmatch(r"(\d+)",s) or re.fullmatch(r"(\d+)/(\d+)",s) or re.fullmatch(r"(\d+) (\d+)/(\d+)",s)
    if not m: raise ValueError("bad qty "+s)
    g=[int(x) for x in m.groups()]
    if len(g)==1: return Fraction(g[0])
    if len(g)==2:
        f=Fraction(g[0],g[1]); 
        if f.numerator!=g[0] or g[0]>=g[1] and False: pass
        if Fraction(g[0],g[1]).denominator!=g[1]: raise ValueError("unreduced "+s)
        return f
    if g[1]>=g[2] or Fraction(g[1],g[2]).denominator!=g[2]: raise ValueError("bad mixed "+s)
    return g[0]+Fraction(g[1],g[2])
def qq(s):
    if ".." in s:
        a,b=s.split(".."); return (q(a),q(b))
    return q(s)
probs=[]
ids=[r["id"] for r in rows]
assert len(ids)==len(set(ids))==359
st=Counter()
for r in rows:
    e=r["expect"]; i=r["id"]; S=e["status"]; st[S]+=1
    def P(m): probs.append((i,m))
    try:
        Q=qq(e["quantity"]) if e["quantity"] else None
        if isinstance(Q,tuple):
            if not Q[0]<Q[1]: P("range not increasing")
            for x in Q:
                if x<=0 or x>10000: P("bound")
        elif Q is not None and (Q<=0 or Q>10000): P("bound")
        # improper fraction style
        if e["quantity"] and re.fullmatch(r"\d+/\d+",e["quantity"]) and Fraction(e["quantity"])>=1: P("improper fraction format "+e["quantity"])
    except Exception as ex: P(str(ex))
    if e["unit"] and e["unit"] not in UNITS: P("bad unit "+e["unit"])
    for x in ([e["packageSize"]] if e["packageSize"] else [])+e["equivalents"]:
        if x["unit"] not in UNITS: P("bad unit in pkg/eq "+x["unit"])
        try: q(x["quantity"])
        except Exception as ex: P("pkg/eq "+str(ex))
    if e["packageSize"] and UNITS.get(e["packageSize"]["unit"]) not in ("mass","volume"): P("pkg not mass/vol")
    if len(e["alternatives"])==1: P("1 alt")
    if S=="ready":
        if e["name"] is None: P("ready no name")
        if e["quantity"] and ".." in e["quantity"]: P("ready range")
        if e["quantity"] and not e["unit"]: P("ready q no unit")
        if not e["quantity"] and not e["amountUnstated"]: P("ready no q no AU")
        if e["alternatives"]: P("ready alts")
        if e["quantity"] and r["severity"]!="high": P("ready+qty sev "+r["severity"])
        if not e["quantity"] and r["severity"]!="low": P("ready noqty sev "+r["severity"])
        if e["quantity"] and e["amountUnstated"]: P("ready q and AU")
    elif S=="needs_review":
        pass
    elif S=="unsupported":
        if any(e[k] is not None for k in ["name","quantity","unit","packageSize"]): P("unsup fields")
    else: P("bad status")
    if e["alternatives"] and e["name"] is not None: P("alts with name")
    if e["form"] not in (None,"raw","cooked"): P("bad form")
    if e["amountUnstated"] not in (None,"to_taste","as_needed","for_serving","for_garnish","other"): P("bad AU")
    acc=r.get("accept") or {}
    for k in acc:
        if k not in ("name","note","alternatives"): P("accept key "+k)
    if e["quantity"] and not e["unit"] and S!="unsupported": P("qty without unit")
    if e["unit"] and not e["quantity"]: P("unit without qty (status %s)"%S)
    if len(r["input"])>500: P("len>500")
    if r["provenance"]["kind"]!=r["source"]["kind"]: P("prov/source mismatch")
print(st)
for p in probs: print(p)
# character checks
for i in ["ing-h2-0020","ing-h2-0098","ing-h2-0300","ing-h2-0301","ing-h2-0019","ing-h2-0027","ing-h2-0026","ing-h2-0034","ing-h2-0035","ing-h2-0273","ing-h2-0276","ing-h2-0110","ing-h2-0111","ing-h2-0250","ing-h2-0200","ing-h2-0298","ing-h2-0264","ing-h2-0275","ing-h2-0269","ing-h2-0270","ing-h2-0271","ing-h2-0309","ing-h2-0341","ing-h2-0181"]:
    r=next(x for x in rows if x["id"]==i)
    print(i, [ (c, "U+%04X"%ord(c), unicodedata.name(c,"?")) for c in r["input"] if ord(c)>126 or c in "\t-"])
print("lens", [(r["id"],len(r["input"])) for r in rows if len(r["input"])>150])
