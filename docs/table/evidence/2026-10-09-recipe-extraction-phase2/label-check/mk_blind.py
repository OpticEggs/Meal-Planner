import json
def e(status,name,q,u,pkg=None,eq=None,form=None,note=None,alts=None,opt=False,approx=False,au=None):
    return {"status":status,"name":name,"quantity":q,"unit":u,"packageSize":pkg,"equivalents":eq or [],"form":form,"note":note,"alternatives":alts or [],"optional":opt,"approximate":approx,"amountUnstated":au}
P=lambda q,u:{"quantity":q,"unit":u}
B={
"ing-h2-0005":e("ready","ground allspice","1/4","tsp"),
"ing-h2-0014":e("ready","Yukon Gold potatoes","2","lb",note="scrubbed"),
"ing-h2-0023":e("ready","whole milk","1 1/4","cup"),
"ing-h2-0032":e("ready","tamari","2 2/3","tbsp"),
"ing-h2-0041":e("ready","00 flour","500","g"),
"ing-h2-0050":e("ready","ground turmeric","1/2","tsp"),
"ing-h2-0059":e("ready","extra-firm tofu","1","block",pkg=P("14","oz")),
"ing-h2-0068":e("ready","celery","3","rib"),
"ing-h2-0077":e("ready","romaine lettuce","1","head",note="chopped"),
"ing-h2-0086":e("ready","Belgian ale","1","bottle",pkg=P("11 1/5","oz")),
"ing-h2-0095":e("ready","fire-roasted diced tomatoes","1","can",pkg=P("14 1/2","oz"),note="undrained"),
"ing-h2-0104":e("ready","salt and vinegar potato chips","1","bag",pkg=P("5","oz"),note="crushed"),
"ing-h2-0113":e("ready","fresh lime juice","1 1/2","oz",note="strained"),
"ing-h2-0122":e("ready","pork belly","40","oz"),
"ing-h2-0131":e("ready","coconut milk","1","cup",eq=[P("240","ml")]),
"ing-h2-0140":e("ready","chicken stock","3","cup",eq=[P("750","ml"),P("25","fl_oz")]),
"ing-h2-0149":e("ready","whole milk","1","cup",note="3.25%"),
"ing-h2-0158":e("needs_review","salt",None,None),
"ing-h2-0167":e("ready","chicken thighs","500","g",approx=True),
"ing-h2-0176":e("ready","flaky salt","2","pinch"),
"ing-h2-0185":e("ready","chipotle powder","1","tsp",note="for heat",opt=True),
"ing-h2-0194":e("ready","flour",None,None,au="other"),
"ing-h2-0203":e("ready","sugar","1","tbsp",note="or more, to taste"),
"ing-h2-0212":e("ready","limes","2","each",note="juice"),
"ing-h2-0221":e("needs_review",None,"3","tbsp",alts=["butter","ghee"]),
"ing-h2-0230":e("ready","chicken broth","1","cup",note="homemade or boxed"),
"ing-h2-0239":e("ready","zucchini","2","each",note="medium; cut into half-moons"),
"ing-h2-0248":e("ready","corn tortillas","12","each",note="warmed"),
"ing-h2-0257":e("ready","jamón serrano","100","g",note="torn"),
"ing-h2-0266":e("ready","chopped fresh chives","1","tbsp"),
"ing-h2-0275":e("needs_review","sriracha","1..2","tsp"),
"ing-h2-0284":e("unsupported",None,None,None),
"ing-h2-0293":e("unsupported",None,None,None),
"ing-h2-0302":e("unsupported",None,None,None),
"ing-h2-0311":e("ready","cherry tomatoes","1","pint",note="halved"),
"ing-h2-0320":e("ready","red pepper flakes","1","pinch"),
"ing-h2-0329":e("ready","jalapeño peppers","2","each"),
"ing-h2-0338":e("needs_review","rice","1","cup",note="1 cup dry makes 3 cooked"),
"ing-h2-0347":e("needs_review","Salt and black pepper",None,None),
"ing-h2-0356":e("needs_review","pepperoni",None,None),
}
with open("blind-sample.jsonl","w") as f:
    for k in sorted(B):
        f.write(json.dumps({"id":k,"expect":B[k]},ensure_ascii=False)+"\n")
print(len(B))
