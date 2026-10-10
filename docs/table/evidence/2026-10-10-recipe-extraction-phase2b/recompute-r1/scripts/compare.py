"""Step 2: compare R1's recomputation (recompute-results.json) with the committed report (fdbcfd1)."""
import json, sys
ROOT = "/home/user/rx2b-r1/recompute-v3"
REP = ROOT + "/repo/docs/table/evidence/2026-10-10-recipe-extraction-phase2b/evaluation-holdout-v3/benchmark-report-holdout3.json"
mine = json.load(open(ROOT + "/recompute-results.json"))["engines"]
rep = json.load(open(REP))
out = []
P = out.append
total_disc = 0
for e in rep["outcomes"]["engines"]:
    eid = e["engine"]["id"]; s = e["sets"]["holdout3"]; ci = s["caseIds"]
    rows = {r["id"]: r for r in mine[eid]["perCase"]}
    # my per-case → the report's caseIds keys
    def my_keys(r):
        k = set()
        o = r["outcome"]
        if o == "C1":
            k.add("C1")
            if r["c1plus"]: k.add("C1plus")
            if r["detailMismatch"]: k.add("detailMismatchLow")
        elif o == "C2": k.add("C2High" if r["falseCertainty"] == "high" else "C2Medium")
        elif o in ("C3", "C5"): k.add(o + r["partial"])
        elif o == "CE":
            k.add("CE")
            if r["ce"]["engineError"]: k.add("CEEngineError")
            if r["ce"]["invalid"]: k.add("CEInvalidOutput")
            if r["ce"]["nondeterministic"]: k.add("CENondeterministic")
        else: k.add(o)
        for sc in r["severe"]: k.add(sc)
        if r["droppedOption"]: k.add("droppedOption")
        if r["inventedOption"]: k.add("inventedOption")
        if r["strict"]["outcome"] != r["outcome"] or r["strict"]["c1plus"] != r["c1plus"]: k.add("strictDiffers")
        return k
    rep_keys = {}
    for key, ids in ci.items():
        for i in ids: rep_keys.setdefault(i, set()).add(key)
    disc = []
    for i, r in rows.items():
        a = my_keys(r); b = rep_keys.get(i, set()) & set(ci.keys())
        if a != b: disc.append((i, sorted(a - b), sorted(b - a)))
    extra = [i for i in rep_keys if i not in rows]
    total_disc += len(disc) + len(extra)
    P(f"## {eid}: per-case class keys compared on {len(rows)} cases ({len(ci)} report keys): {len(disc)} discrepancies" + (f", ids only in report: {extra}" if extra else ""))
    for i, a, b in disc: P(f"- {i}: mine-only {a}; report-only {b}")
    # invented options are not in caseIds; compare from reviewPrefill if present
    agg = s["aggregate"]; ma = mine[eid]["aggregate"]
    P(f"- report aggregate.outcomes: {json.dumps(agg.get('outcomes'))[:600]}")
    P(f"- report fieldAccuracyOnReady: {json.dumps(agg.get('fieldAccuracyOnReady'))[:600]}")
    P(f"- mine fieldsOnR: {ma['fieldsOnR']} (R {ma['R']})")
    P(f"- report strict: {json.dumps(agg.get('strict'))[:400]}")
    P(f"- mine strict C1 {ma['strictC1']}, strict C1+ {ma['strictC1plus']}")
    P(f"- report reviewPrefill: {json.dumps(agg.get('reviewPrefill'))[:400]}")
    P(f"- mine invented {ma['invented']}, dropped {ma['dropped']}")
    P(f"- report validity: {json.dumps(agg.get('validity'))[:300]}")
    acc = s["acceptance"]
    P(f"- report acceptance: {json.dumps(acc)[:1800]}")
    P(f"- mine G2: {json.dumps(ma['G2'])[:1200]}")
    if eid == "semantic-v2":
        sens = s["sensitivity"]; msens = mine[eid]["sensitivities"]
        for rk, mk in [("excludingDebatable", "a_withoutDebatable"), ("excludingNewReadings", "c_withoutNewReading"), ("excludingExposureAudit", "d_withoutExposureMatches")]:
            rc = {c["id"]: (c["status"], {k: (v["num"], v["den"]) for k, v in c["evidence"].items() if isinstance(v, dict) and "num" in v}) for c in sens[rk]["acceptance"]["criteria"]}
            mg = msens[mk]["G2"]
            mineview = {"A1": (mg["A1"]["met"], mg["A1"]["value"]), "A2": (mg["A2"]["met"], mg["A2"]["name"]["value"], mg["A2"]["quantity"]["value"], mg["A2"]["unit"]["value"]),
                        "A3": (mg["A3"]["met"], mg["A3"]["highC2"]), "A4": (mg["A4"]["met"], {k: mg["A4"][k] for k in ("S1", "S3", "S4", "S5", "S6")}), "A5": (mg["A5"]["met"], mg["A5"]["value"])}
            P(f"- sensitivity {rk}: report {json.dumps({k: v for k, v in rc.items() if k in ('A1','A2','A3','A4','A5')})}")
            P(f"  mine {mineview}")
        P(f"- report sensitivity keys: {list(sens.keys())}; note: {json.dumps(sens.get('note'))[:600]}")
        nb = sens.get("needsReviewExcludingBareNoAmount")
        P(f"- report needsReviewExcludingBareNoAmount: {json.dumps(nb)[:700]}")
P(f"\nTOTAL per-case discrepancies over all engines: {total_disc}")
open(ROOT + "/compare-raw.txt", "w").write("\n".join(out) + "\n")
print("\n".join(out))
