import json,subprocess,re
H="/home/user/Meal-Planner/.claude/worktrees/agent-a368bb9f7d41d396b/packages/recipe-extraction/fixtures/ingredients/holdout-v2.jsonl"
G="/home/user/Meal-Planner"
rows=[json.loads(l) for l in open(H)]
cache={}
def show(c,f):
    k=(c,f)
    if k not in cache:
        p=subprocess.run(["git","-C",G,"show","%s:%s"%(c,f)],capture_output=True,text=True)
        cache[k]=p.stdout if p.returncode==0 else None
    return cache[k]
def variants(s):
    v={s, json.dumps(s,ensure_ascii=False)[1:-1], json.dumps(s)[1:-1]}
    v.add(s.replace("'", "\\'"))
    return v
for r in rows:
    s=r["source"]
    if s["kind"]!="repo_test_input": continue
    new=show("8e6bd6e",s["file"]); old=show("cb7b56e",s["file"])
    line=new.split("\n")[s["line"]-1] if new else None
    inl=any(("\"%s\""%v in line) or ("'%s'"%v in line) or ("`%s`"%v in line) for v in variants(r["input"])) if line else False
    sub=any(v in line for v in variants(r["input"])) if line else False
    inold=None if old is None else any(("\"%s\""%v in old) or ("'%s'"%v in old) or ("`%s`"%v in old) for v in variants(r["input"]))
    inold_sub=None if old is None else any(v in old for v in variants(r["input"]))
    provline=r["provenance"]["source"]
    m=re.match(r"(\S+):(\d+) at (\w+)",provline)
    pm = m and m.group(1)==s["file"] and int(m.group(2))==s["line"] and m.group(3)==s["commit"]
    flag="" if (inl and not inold and pm) else "  <-- CHECK"
    print(r["id"], s["file"].split("/")[-1], s["line"], "quoted-in-line=%s substr=%s"%(inl,sub), "old-file=%s"%("absent" if old is None else ("quoted" if inold else ("substr" if inold_sub else "no"))), "prov-match=%s"%bool(pm), json.dumps(r["input"],ensure_ascii=False), flag)
