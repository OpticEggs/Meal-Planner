import json,sys
H="/home/user/Meal-Planner/.claude/worktrees/agent-a368bb9f7d41d396b/packages/recipe-extraction/fixtures/ingredients/holdout-v2.jsonl"
rows=[json.loads(l) for l in open(H)]
a,b=int(sys.argv[1]),int(sys.argv[2])
for r in rows[a:b]:
    e=r["expect"]
    s=[e["status"][:5], "N="+repr(e["name"]), "Q="+str(e["quantity"]), "U="+str(e["unit"])]
    if e["packageSize"]: s.append("PKG=%s %s"%(e["packageSize"]["quantity"],e["packageSize"]["unit"]))
    if e["equivalents"]: s.append("EQ="+";".join("%s %s"%(x["quantity"],x["unit"]) for x in e["equivalents"]))
    if e["form"]: s.append("F="+e["form"])
    if e["note"] is not None: s.append("NOTE="+repr(e["note"]))
    if e["alternatives"]: s.append("ALT="+repr(e["alternatives"]))
    if e["optional"]: s.append("OPT")
    if e["approximate"]: s.append("APPROX")
    if e["amountUnstated"]: s.append("AU="+e["amountUnstated"])
    extra=set(e)-{"status","name","quantity","unit","packageSize","equivalents","form","note","alternatives","optional","approximate","amountUnstated"}
    if extra: s.append("EXTRA="+str(extra))
    print(r["id"], json.dumps(r["input"],ensure_ascii=False))
    print("   ", " | ".join(s))
    acc=r.get("accept") or {}
    print("    acc=%s sev=%s sc=%s src=%s con=%r"%(json.dumps(acc,ensure_ascii=False) if acc else "-", r["severity"], r["seasoningClass"], r["source"].get("kind") if isinstance(r.get("source"),dict) else r.get("source"), r.get("construction")))
    print("    R:", r.get("rationale"))
