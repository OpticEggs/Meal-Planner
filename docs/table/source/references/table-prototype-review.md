# Table prototype review

## Scope and status

Reviewed the supplied `index.html` against the dinner-planning requirements in this conversation. The original upload was not modified. A separate `table-syntax-repaired.html` removes exactly one extra double quote at original line 512. It is a startup repair, not a functional completion. All other behavior, including simulated cart outcomes and placeholder household settings, is unchanged.

The file is a client-side interface prototype. It has six embedded demonstration recipes, manually authored groceries, transient state, and simulated grocery transfer. It is not connected to Kroger, a nutrition service, a household database, or an authentication service.

## Verification

The original embedded script fails `node --check` with `SyntaxError: missing ) after argument list`. Chromium reproduces that error and renders zero child elements in the Week screen. After the one-character repair, the script passes syntax checking and all five tabs render without startup JavaScript errors.

UI interactions were tested with Playwright and Chromium at a 390 by 844 viewport, with HTML loaded directly into browser memory. File and localhost navigation were blocked by the browser environment. External requests were blocked during these tests. This was not a deployed-app, Safari, live-store, authentication, or Kroger API test.

All six referenced local recipe image files are absent from the uploaded files: images/fajitas.jpg, images/greek.jpg, images/salmon.jpg, images/skillet.jpg, images/stirfry.jpg, and images/pasta.jpg. No replacement images were invented or fetched.

## Reproduced findings

### 1. Startup fails — original line 512

The Explore search template contains `state.query.replace(/"/g,""")`, which prevents the entire inline script from parsing. The repaired copy changes it to `state.query.replace(/"/g,"")`.

### 2. A selected recipe can open the wrong dinner — lines 428–429 and 470–472

Open Friday's Salmon rice bowls, then select Open recipe. The cooking sheet opens Greek chicken bowls, because `openCook()` always resolves the day marked `tonight`, not the selected meal.

### 3. A meal swap leaves dependent information stale — lines 363–398 and 432–450

Replace Wednesday with Chicken vegetable linguine. Wednesday's meal changes, but the hero still shows Greek chicken bowls, Thursday remains Bowl leftovers linked to the Greek recipe, and the grocery total remains $63.01. Duration text also stays unchanged. The hero is hard-coded to `meals.greek`; the swap modifies only the day's meal and name.

### 4. Grocery totals and transfer ignore pantry changes — lines 332–342, 358–361, 579–593

Mark chicken Have enough. Dinner spending remains $41.53, and chicken is still included in the transfer sheet. The pantry control changes state and redraws the screen, but prices and transfer lines come from separate fixed data. Meal objects do not contain structured ingredient records from which to derive shopping quantities.

### 5. Cart outcomes and checkout are simulated — lines 585–613

Add approved items assigns the same preset success, failure, and uncertain outcomes every time. No cart network request is made. Open Kroger to pick a time only displays a toast; it opens neither a new page nor a checkout URL. The duplicate guard is a transient Boolean and cannot protect real transactions across reloads or devices.

### 6. Shortlist, ratings, and saved notes are incomplete — lines 490–496 and 526–528

Save to shortlist changes no application state; it only displays a toast. Selecting a five-star rating stores `state.rating = 5`, but the Greek recipe retains `rating = 4`. Entering an unsaved cooking note and then selecting a star clears the input, because the whole sheet is rerendered. Saving a note mutates the in-memory recipe only; reopening the app loses it. There is no persistent storage, two-person login, or shared household sync in this file.

### 7. Search loses focus; advertised cost sorting is absent — lines 432–444 and 500–528

Typing "beef" normally into Explore produces only "b": the input is replaced after the first character, losing focus. The replacement sheet claims to be sorted by additional grocery cost but uses a fixed order with costs $9.10, $2.40, $14.40, $7.40, $4.10, $6.80. Queries containing "protein" bypass the ordinary text mismatch test; they do not enforce a protein target.

### 8. Portion controls do not represent component quantities — lines 346–348, 478–479, 620–641

The slider labeled Chicken portion scales every stored macro and calorie total by one multiplier. It does not calculate the chicken component separately from rice, vegetables, or sauce. Targets and displayed component instructions are hard-coded. The Week hero's calorie text is also fixed. These are not ingredient-derived nutrition calculations.

### 9. Plan settings and household rules are placeholders — lines 454–467 and 616–641

The planning selectors have no saving or replanning behavior: Keep this week only closes the sheet and displays a toast. Household targets, $120/$180 budgets, store and brand choices, dietary preferences, and the tree-nut allergy are embedded demonstration text. They are not confirmed user-provided settings, and the displayed allergy is not backed by an ingredient exclusion validator. No household health preference should be inferred from this prototype.

## Implementation order

Retain the five-screen organization, but first establish structured recipes and ingredients, saved household profiles and plans, and explicit leftover links. Derive quantities, pantry deductions, package requirements, and costs from that shared data. Repair recipe routing, search focus, ratings, and functional favorites. Add shared persistence. Build nutrition from ingredient/component data with user-confirmed targets. Only then replace the simulated cart adapter with authenticated, tested grocery integration and a truthful checkout handoff.

A repaired UI is not a completed product: choosing meals, changing portions, and confirming pantry stock must change the same underlying shopping and nutrition records before this becomes reliable for household use.

## File identities

- `index.html` SHA-256: `a2a71355bf55426b878f8b8f7a1eb36d8b67ecc8e68daf26c6e9dea0905ef076`
- `table-syntax-repaired.html` SHA-256: `c4cd026f90f2a7d484137e7672b9d8833553829156e90c898ede897e9e5309fc`
