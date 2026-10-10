#!/usr/bin/env bash
# Phase 2B boundary checks at the tested commit, against the merged main (coordinator). Usage: boundary-checks.sh <commit> <main>
# Replaces three checks of run-root.sh whose first version compared against the pre-merge base 8c9fd8c and grepped
# for a string literal (DEFAULT_ENGINE_ID is assigned from LEGACY_ENGINE_ID); see README.md in this folder.
set -u
C=$1; M=$2; P=packages/recipe-extraction
cd /home/user/Meal-Planner

echo "== default engine"
(cd $P && npx tsx -e 'import("./src/index.ts").then((m) => { console.log("DEFAULT_ENGINE_ID =", m.DEFAULT_ENGINE_ID); process.exit(m.DEFAULT_ENGINE_ID === "legacy-table-import-2" ? 0 : 1); })')
d1=$?
n=$(git diff 8131fe0fa79791c1a0403bb191e12193cc3d9d7d "$C" -- $P/src/ingredient/engines.ts | grep -cE '^[-+].*DEFAULT_ENGINE_ID')
echo "lines changing DEFAULT_ENGINE_ID since the Phase 2 lab head 8131fe0 (main has never contained the package): $n"
[ $d1 -eq 0 ] && [ "$n" -eq 0 ] && echo "PASS default engine is legacy-table-import-2 and unchanged" || { echo "FAIL default engine"; exit 1; }

echo "== app code equals main $M"
s=$(git diff --stat "$M" "$C" -- src migrations scripts deploy tests public package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts playwright.config.ts .env.example)
echo "$s"
[ -z "$s" ] && echo "PASS app code, migrations, scripts, deploy templates, public assets, tests and root config identical to main" || { echo "FAIL app code differs"; exit 1; }

echo "== changed paths vs main $M"
git diff --name-only "$M" "$C" | awk -F/ '{print ($1=="packages"?$1"/"$2:($1=="docs"?$1"/"$2"/"$3:$1))}' | sort | uniq -c
other=$(git diff --name-only "$M" "$C" | grep -v -E '^(packages/recipe-extraction/|docs/table/|CLAUDE\.md$)')
echo "paths outside packages/recipe-extraction/, docs/table/ and CLAUDE.md: ${other:-none}"
echo "-- CLAUDE.md lines that differ from main:"
git diff "$M" "$C" -- CLAUDE.md | grep -E '^[-+][^-+]' | cut -c1-200
[ -z "$other" ] && echo "PASS every changed path is under packages/recipe-extraction/ or docs/table/, plus CLAUDE.md's package sentence" || { echo "FAIL other paths changed"; exit 1; }
