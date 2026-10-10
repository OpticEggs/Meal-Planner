import json, collections, sys
sys.path.insert(0, "/home/user/rx-eval-v3/work")
cs = [json.loads(l) for l in open("/home/user/rx-eval-v3/work/holdout-v3.jsonl", encoding="utf-8")]
CATS = ["integer_decimal","fraction","fraction_third","mixed_vulgar","nested_parens","prep_note","source_choice","ingredient_alternatives","range","optional","unstated_amount","quantity_missing","count_unit","package_size","oz_vs_floz","compound_quantity","equivalent_quantity","percentage","price_annotation","form_cooked_raw","number_word","approximate","imprecise_unit","heading_non_ingredient","empty","unicode_text","ambiguous_number_format","size_word","seasoning_lookalike","seasoning_ordinary","quart_pint_gallon","long_line","quantity_after_name"]
print("total", len(cs), dict(collections.Counter(c["expect"]["status"] for c in cs)))
fam = collections.Counter(c["family"] for c in cs); print("family", dict(fam), "plain%", round(100*fam["plain"]/len(cs),1))
cat = collections.Counter(x for c in cs for x in c["categories"]); print("categories", {k: cat.get(k,0) for k in CATS})
c12 = collections.Counter(x for c in cs for x in c["contract12"]); print("contract12", dict(sorted(c12.items(), key=lambda kv: float(kv[0][3:]))))
print("new", sum(c["reliesOnNewReading"] for c in cs), "debatable", sum(c["debatable"] for c in cs))
con = collections.Counter(c["construction"] for c in cs); print("constructions", len(con), "over2", [k for k,v in con.items() if v>2])
