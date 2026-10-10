import json,re
from fractions import Fraction
H="/home/user/Meal-Planner/.claude/worktrees/agent-a368bb9f7d41d396b/packages/recipe-extraction/fixtures/ingredients/holdout-v2.jsonl"
rows={json.loads(l)["id"]:json.loads(l) for l in open(H)}
mine={json.loads(l)["id"]:json.loads(l)["expect"] for l in open("blind-sample.jsonl")}
def fr(s):
    if s is None: return None
    s=s.strip()
    if ".." in s: a,b=s.split(".."); return ("R",fr(a),fr(b))
    parts=s.split()
    return sum(Fraction(p) for p in parts)
def nm(s): return None if s is None else " ".join(s.lower().split())
def pk(p): return None if p is None else (fr(p["quantity"]),p["unit"])
fields=["status","name","quantity","unit","packageSize","alternatives"]
cnt={f:0 for f in fields}; dis=[]
for i,m in mine.items():
    w=rows[i]["expect"]
    for f in fields:
        if f=="name": ok=nm(m[f])==nm(w[f])
        elif f=="quantity": ok=fr(m[f])==fr(w[f])
        elif f=="packageSize": ok=pk(m[f])==pk(w[f])
        elif f=="alternatives": ok=[nm(x) for x in m[f]]==[nm(x) for x in w[f]]
        else: ok=m[f]==w[f]
        if ok: cnt[f]+=1
        else: dis.append((i,rows[i]["input"],f,m[f],w[f],rows[i].get("accept",{}).get(f)))
for f in fields: print(f, cnt[f],"/40")
# also other fields
for f in ["equivalents","form","note","optional","approximate","amountUnstated"]:
    c=0
    for i,m in mine.items():
        w=rows[i]["expect"]
        if f=="equivalents": ok=[pk(x) for x in m[f]]==[pk(x) for x in w[f]]
        elif f=="note": ok=nm(m[f])==nm(w[f])
        else: ok=m[f]==w[f]
        if ok: c+=1
        else: dis.append((i,rows[i]["input"],f,m[f],w[f],rows[i].get("accept",{}).get(f)))
    print(f,c,"/40")
for d in dis: print(json.dumps(d,ensure_ascii=False,default=str))
