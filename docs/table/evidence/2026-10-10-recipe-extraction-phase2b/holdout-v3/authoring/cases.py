# Hand-written holdout-v3 cases (executed by author.py). c(input, construction, family, categories, rationale, **label)
# Defaults: status ready, every other field null/empty/false; severity from the labelling guide unless given.

# ======================================================================================================
# Family A — quantity syntax
# ======================================================================================================

# §12.1 fraction words before a unit
c("a quarter-teaspoon cayenne pepper", "a FRACWORD-unit(hyphenated) food", "A", ["number_word", "fraction", "seasoning_lookalike"],
  "§12.1: hyphenated or not, with a leading 'a', the fraction word is the amount → 1/4 tsp; the unit never stays in name. Cayenne is a lookalike (labelling guide).",
  n="cayenne pepper", q="1/4", u="tsp", sc="lookalike", c12=["12.1"], new=True)
c("1 quarter cup grated Parmesan", "1 FRACWORD unit prep-participle food", "A", ["number_word", "fraction", "prep_note"],
  "§12.1: a leading '1' does not multiply the fraction word → 1/4 cup. Leading participle 'grated' stays in name with the bare food accepted (§7.6).",
  n="grated Parmesan", q="1/4", u="cup", an=["Parmesan"], anote=["grated"], c12=["12.1"], new=True)
c("2 quarter-cups chicken stock", "INT FRACWORD-unit(plural) food", "A", ["number_word", "fraction", "integer_decimal"],
  "§12.1: a count ≥ 2 before a plural fraction-unit multiplies it: 2 × 1/4 cup = 1/2 cup.",
  n="chicken stock", q="1/2", u="cup", c12=["12.1"], new=True)
c("3 half-pound pork tenderloins", "INT FRACWORD-massunit plural-food", "A", ["number_word", "integer_decimal"],
  "§12.1: when the fraction-unit sizes a counted item, the count is the quantity (3 each) and the size is a note ('half-pound').",
  n="pork tenderloins", q="3", u="each", nt="half-pound", c12=["12.1"], new=True)
c("1 half-pint container grape tomatoes", "1 FRACWORD-volunit container food", "A", ["number_word", "package_size", "quart_pint_gallon", "count_unit"],
  "§12.1: before a container the fraction-unit is the packageSize → 1 container, packageSize 1/2 pint (pint stays pint, §7.3).",
  n="grape tomatoes", q="1", u="container", pk=("1/2", "pint"), c12=["12.1"], new=True)
c("a quarter pound sliced deli turkey", "a FRACWORD massunit prep-participle food", "A", ["number_word", "fraction", "prep_note"],
  "§12.1: 'a quarter pound' = 1/4 lb (article does not multiply). Leading participle stays in name, bare food accepted (§7.6).",
  n="sliced deli turkey", q="1/4", u="lb", an=["deli turkey"], anote=["sliced"], c12=["12.1"], new=True)
c("a half cup half-and-half", "a FRACWORD unit compound-food", "A", ["number_word", "fraction"],
  "§12.1: 'a half cup' = 1/2 cup; 'half-and-half' is a food, not an amount (§12.1 last sentence, §7.6 compounds).",
  n="half-and-half", q="1/2", u="cup", c12=["12.1"], new=True)

# §12.2 multiplier x
c("1 x 400g tin black beans, drained", "1 x SIZE(glued) container food, prep", "A", ["package_size", "count_unit", "prep_note"],
  "§12.2 package form with a count of one: 1 tin, packageSize 400 g; 'drained' after the comma is note (§7.7).",
  n="black beans", q="1", u="tin", pk=("400", "g"), nt="drained", c12=["12.2"])

# §12.6 restatement test (and A2)
c("4 oz (125 g) feta, crumbled", "INT massunit (INT metric-mass) food, prep", "A", ["equivalent_quantity", "integer_decimal", "prep_note"],
  "§12.6: 4 oz = 113.40 g; 125 g differs by 10.2 % and the rounding allowance gives 113 ≠ 125 → a second amount, needs_review; the remark goes to note (§12.11), with 'crumbled' after it.",
  s="needs_review", n="feta", q="4", u="oz", nt="125 g; crumbled", sev="medium", c12=["12.6"], new=True)
c("1/8 tsp (1 mL) ground cloves", "FRAC unit (INT mL) food", "A", ["equivalent_quantity", "fraction"],
  "§12.6 rounding allowance (A2): 1/8 tsp = 0.616 ml, rounded half up to a whole ml = 1 → restatement (the 7 % test alone fails). Ready, equivalent 1 ml. 'ground cloves' after 'ground' is the spice (§12.4).",
  n="ground cloves", q="1/8", u="tsp", eq=[("1", "ml")], c12=["12.6"])
c("1 tbsp (4 tsp) fish sauce", "INT unit (INT smaller-unit) food", "A", ["equivalent_quantity", "integer_decimal"],
  "§12.6: 1 tbsp = 3 tsp, so 4 tsp is 33 % off; tsp is a coarse unit with no rounding allowance → second amount, needs_review, remark in note.",
  s="needs_review", n="fish sauce", q="1", u="tbsp", nt="4 tsp", sev="medium", c12=["12.6"], new=True)
c("2 kg (4 lb) beef brisket", "INT kg (INT lb) food", "A", ["equivalent_quantity", "integer_decimal"],
  "§12.6 / A2: lb restating kg may use the half-up allowance: 2 kg = 4.409 lb → 4 → restatement although the 7 % test fails. Ready, equivalent 4 lb.",
  n="beef brisket", q="2", u="kg", eq=[("4", "lb")], c12=["12.6"])
c("1 cup (225 g) caster sugar", "INT unit (INT g) food (volume-to-mass)", "A", ["equivalent_quantity", "integer_decimal"],
  "§12.6: mass↔volume restatements are not checked → 225 g is an equivalent, ready (§7.5, no densities).",
  n="caster sugar", q="1", u="cup", eq=[("225", "g")], c12=["12.6"])
c("1.5 lb (750 g) beef chuck, cubed", "DEC lb (INT g) food, prep", "A", ["equivalent_quantity", "integer_decimal", "prep_note"],
  "§12.6: 1.5 lb = 680.4 g; 750 g is 10.2 % off and the half-up gram value is 680 → not a restatement → needs_review (policy: rounded metric outside both tests).",
  s="needs_review", n="beef chuck", q="1 1/2", u="lb", nt="750 g; cubed", sev="medium", c12=["12.6"], new=True)
c("3/4 cup / 175 ml plain yogurt", "FRAC unit / INT ml food", "A", ["equivalent_quantity", "fraction"],
  "§7.5 / §12.6: an amount after '/' restates when within tolerance: 3/4 cup = 177.4 ml, 175 ml is within 7 % → equivalent, ready.",
  n="plain yogurt", q="3/4", u="cup", eq=[("175", "ml")], c12=["12.6"])

# §12.12 same-dimension compounds
c("1/4 cup + 2 tsp soy sauce", "FRAC unit + INT unit food", "A", ["compound_quantity", "fraction"],
  "§12.12: 1/4 cup = 12 tsp, + 2 = 14 tsp.",
  n="soy sauce", q="14", u="tsp", c12=["12.12"])
c("1 cup less 1 tbsp whole milk", "INT unit less INT unit food", "A", ["compound_quantity", "integer_decimal"],
  "§12.12: 'less' subtracts: 16 tbsp − 1 = 15 tbsp.",
  n="whole milk", q="15", u="tbsp", c12=["12.12"])
c("2 tbsp + 2 tsp (40 ml) rice vinegar", "INT unit + INT unit (INT ml) food", "A", ["compound_quantity", "equivalent_quantity", "integer_decimal"],
  "§12.12: 6 + 2 = 8 tsp = 39.4 ml; 40 ml is within 7 % (§12.6) → equivalent 40 ml, ready.",
  n="rice vinegar", q="8", u="tsp", eq=[("40", "ml")], c12=["12.12", "12.6"])

# §12.13 decoration and spacing
c("3. 2 tbsp agave nectar", "ENUM. INT unit food", "A", ["integer_decimal"],
  "§12.13 (new): an enumerator 'N.' followed by a space is decoration → 2 tbsp agave nectar (not 3 or 32).",
  n="agave nectar", q="2", u="tbsp", c12=["12.13"], new=True)
c("3 410 g tins baked beans", "INT SIZE container(plural) food", "A", ["package_size", "count_unit", "integer_decimal"],
  "§12.13 exception / §7.4: a container after the unit makes '3 410 g tins' the package form count-size-container → 3 tin, packageSize 410 g.",
  n="baked beans", q="3", u="tin", pk=("410", "g"), c12=["12.13"])

# §12.14 unknown or foreign units

# §12.15 unit with no number (cannot be recorded in contract12: the frozen vocabulary ends at 12.14)
c("Few dashes of Tabasco", "vague plural-imprecise-unit of food", "A", ["imprecise_unit", "quantity_missing", "seasoning_lookalike"],
  "§12.15: a plural or vague imprecise unit has no quantity → needs_review (quantity_missing); unit as read.",
  s="needs_review", n="Tabasco", q=None, u="dash", sev="low", sc="lookalike")

# ranges and unreadable formats (§7.1–7.2)
c("1 to 1 1/2 pounds ground turkey", "INT to MIXED unit-word food", "A", ["range", "fraction"],
  "§7.2: 'to' between amounts is a range 1..1 1/2 lb, needs_review; main ingredient → high.",
  s="needs_review", n="ground turkey", q="1..1 1/2", u="lb", sev="high")
c("1 or 2 serrano chiles, minced", "INT or INT food, prep", "A", ["range", "integer_decimal", "prep_note"],
  "§7.2 / §7.8: 'or' between amounts is a range → '1..2' each, needs_review.",
  s="needs_review", n="serrano chiles", q="1..2", u="each", nt="minced", sev="medium")
c("2,5 dl whipping cream", "INT,INT dl food", "A", ["ambiguous_number_format"],
  "§7.1: decimal-comma '2,5' is ambiguous → needs_review; decilitre is a registry unit, recorded as read.",
  s="needs_review", n="whipping cream", q=None, u="dl", sev="high")
c("1,200 ml vegetable stock", "INT,3DIGIT unit food", "A", ["ambiguous_number_format"],
  "§7.1: '1,200' is ambiguous like '1,000' → needs_review.",
  s="needs_review", n="vegetable stock", q=None, u="ml", sev="high")
c("0.33 cup molasses", "DEC(0.33) unit food", "A", ["integer_decimal"],
  "§7.1 / §5: a decimal converts exactly: 0.33 = 33/100 (never snapped to 1/3, which the line does not state).",
  n="molasses", q="33/100", u="cup")

# §12.9 numbers that name the food
c("1 tsp Lebanese seven spice", "INT unit origin NUMWORD-component food", "A", ["number_word", "integer_decimal"],
  "§12.9 (new): a number word before a singular/mass head that names the product by counting components stays in name; the amount is 1 tsp.",
  n="Lebanese seven spice", q="1", u="tsp", c12=["12.9"], new=True)
c("Seven grain hot cereal", "NUMWORD-component food (no amount)", "A", ["number_word", "quantity_missing"],
  "§12.9 (new): 'seven grain' names the cereal; with no other amount → needs_review (quantity_missing), full name kept (not 7 each).",
  s="needs_review", n="Seven grain hot cereal", q=None, sev="medium", c12=["12.9"], new=True)
c("1 bag shredded four cheese Mexican blend", "INT container prep NUMWORD-component food", "A", ["number_word", "count_unit", "integer_decimal"],
  "§12.9 (new): 'four cheese ... blend' names the product; the amount is 1 bag. 'shredded' is a product form kept in name (labelling guide).",
  n="shredded four cheese Mexican blend", q="1", u="bag", c12=["12.9"], new=True)

# ======================================================================================================
# Family B — alternatives and notes
# ======================================================================================================

c("2 tbsp light or dark brown sugar", "INT unit M1 or M2 shared-head", "B", ["ingredient_alternatives", "integer_decimal"],
  "§12.7(b): 'light' alone is not a product of the kind → [light brown sugar, dark brown sugar], needs_review.",
  s="needs_review", alt=["light brown sugar", "dark brown sugar"], q="2", u="tbsp", sev="medium", c12=["12.7"])
c("1 1/2 lbs smoked ham or turkey, diced", "MIXED unit modifier A or B, prep", "B", ["ingredient_alternatives", "fraction", "prep_note"],
  "§12.7(c): 'smoked' is shared by a bare food of the same kind → strict [smoked ham, smoked turkey], [smoked ham, turkey] accepted; 'diced' is note.",
  s="needs_review", alt=["smoked ham", "smoked turkey"], aalt=[["smoked ham", "turkey"]], q="1 1/2", u="lb", nt="diced", sev="medium", c12=["12.7"], new=True)
c("1/2 cup light coconut milk or full-fat", "FRAC unit A-phrase or modifier", "B", ["ingredient_alternatives", "fraction"],
  "§12.7(d): a trailing bare modifier takes A's head → [light coconut milk, full-fat coconut milk].",
  s="needs_review", alt=["light coconut milk", "full-fat coconut milk"], q="1/2", u="cup", sev="medium", c12=["12.7"], new=True)
c("2 tbsp tahini, peanut butter or almond butter", "INT unit A, B or C", "B", ["ingredient_alternatives", "integer_decimal"],
  "§12.7(e): 'A, B or C' is a list of options, not a comma note → [tahini, peanut butter, almond butter].",
  s="needs_review", alt=["tahini", "peanut butter", "almond butter"], q="2", u="tbsp", sev="medium", c12=["12.7"], new=True)
c("1 cup cashews/almonds", "INT unit A/B", "B", ["ingredient_alternatives", "integer_decimal"],
  "§12.7(e): 'A/B' offers a choice → [cashews, almonds], needs_review.",
  s="needs_review", alt=["cashews", "almonds"], q="1", u="cup", sev="medium", c12=["12.7"], new=True)
c("1 head lettuce, romaine or green leaf", "INT count-unit X, variety or variety", "B", ["ingredient_alternatives", "count_unit", "integer_decimal"],
  "§12.7(f): varieties of lettuce → [romaine lettuce, green leaf lettuce]; 1 head.",
  s="needs_review", alt=["romaine lettuce", "green leaf lettuce"], q="1", u="head", sev="medium", c12=["12.7"], new=True)
c("2 cups pumpkin puree (canned or homemade)", "INT unit food (sourcing or sourcing)", "B", ["source_choice", "integer_decimal"],
  "§7.8: a sourcing 'or' in brackets is a note, not an alternative; ready.",
  n="pumpkin puree", q="2", u="cup", nt="canned or homemade", c12=["12.7"])
c("2 tbsp fresh dill or 2 tsp dried dill", "INT unit A or INT unit B", "B", ["ingredient_alternatives", "integer_decimal"],
  "§12.7(g): options with their own amounts → quantity and unit of the first option; both options in alternatives; needs_review.",
  s="needs_review", alt=["fresh dill", "dried dill"], q="2", u="tbsp", sev="medium", c12=["12.7"], new=True)
c("1 egg or 3 tbsp aquafaba", "INT food or INT unit food", "B", ["ingredient_alternatives", "integer_decimal"],
  "§12.7(g): first option's amount (1 each); options [egg, aquafaba].",
  s="needs_review", alt=["egg", "aquafaba"], q="1", u="each", sev="medium", c12=["12.7"], new=True)
c("1 tsp each cumin, coriander and turmeric", "INT unit each A, B and C", "B", ["integer_decimal"],
  "§12.7(g): different foods sharing one amount ('each') → needs_review, name null; no choice is offered, so no alternatives.",
  s="needs_review", q="1", u="tsp", sev="medium", c12=["12.7"], new=True)
c("1 cup Greek yogurt (or sour cream)", "INT unit food (or food)", "B", ["ingredient_alternatives", "integer_decimal"],
  "Labelling-guide convention (h2): a parenthetical naming another ingredient is a choice → [Greek yogurt, sour cream], needs_review.",
  s="needs_review", alt=["Greek yogurt", "sour cream"], q="1", u="cup", sev="medium", c12=["12.7"])
c("1 cup salsa verde (homemade (see note) or jarred)", "INT unit food (sourcing (aside) or sourcing)", "B", ["nested_parens", "source_choice", "integer_decimal"],
  "§7.7: nested parentheses flattened into one note; a sourcing 'or' is a note (§7.8). Ready.",
  n="salsa verde", q="1", u="cup", nt="homemade see note or jarred")
c("1 cup whole-milk Greek yogurt (full-fat (5%) works best)", "INT unit food (remark (PERCENT) remark)", "B", ["nested_parens", "percentage", "integer_decimal"],
  "§7.7: nested bracket text flattened into the note; the bracketed percentage is remark text, not an amount.",
  n="whole-milk Greek yogurt", q="1", u="cup", nt="full-fat 5% works best")
c("1 cup heavy cream, cold, plus more as needed", "INT unit food, temp, plus more as needed", "B", ["prep_note", "integer_decimal"],
  "§7.7 / §7.10: with an amount, the 'plus more as needed' remark is note and amountUnstated stays null; 'cold' after the comma is note.",
  n="heavy cream", q="1", u="cup", nt="cold; plus more as needed")
c("2 tbsp butter, softened, plus more for the pan", "INT unit food, prep, plus more for purpose", "B", ["prep_note", "integer_decimal"],
  "§7.7 / §7.10: comma remarks joined in source order; amountUnstated null because an amount is stated.",
  n="butter", q="2", u="tbsp", nt="softened; plus more for the pan")

# §12.11 remark amounts (and A3)
c("1 cup diced celery (about 2 ribs)", "INT unit prep food (about INT count-unit)", "B", ["equivalent_quantity", "count_unit", "prep_note"],
  "§12.11 / A3: a count of whole items restates a prepared amount of the same food → equivalent 2 rib, ready; 'about' inside the restatement qualifies only it (guide), so approximate stays false.",
  n="diced celery", q="1", u="cup", eq=[("2", "rib")], an=["celery"], anote=["diced"], c12=["12.11"])
c("2 cups mashed ripe bananas (about 4 bananas)", "INT unit prep adj food (about INT food)", "B", ["equivalent_quantity", "prep_note"],
  "§12.A A3: mashing does not change the food → equivalent 4 each, ready; approximate false (guide).",
  n="mashed ripe bananas", q="2", u="cup", eq=[("4", "each")], an=["ripe bananas"], anote=["mashed"], c12=["12.11"])
c("2 cups packed cilantro leaves (from 2 bunches)", "INT unit prep food leaves (from INT count-unit(plural))", "B", ["equivalent_quantity", "count_unit", "prep_note"],
  "§12.A A3: leaves taken whole from the plant restate the bunches → equivalent 2 bunch, ready ('from' does not change this); 'cilantro leaves' stays one name with another unit stated (§12.4); participle accepted without.",
  n="packed cilantro leaves", q="2", u="cup", eq=[("2", "bunch")], an=["cilantro leaves"], anote=["packed"], c12=["12.11", "12.4"], new=True)
c("1 tbsp Diamond Crystal kosher salt (use half if using Morton)", "INT unit brand food (substitution remark)", "B", ["seasoning_ordinary", "integer_decimal"],
  "§12.11: a substitution remark ('use half for table salt' type) is a second amount → needs_review; seasoning → low.",
  s="needs_review", n="Diamond Crystal kosher salt", q="1", u="tbsp", nt="use half if using Morton", sev="low", sc="ordinary_salt", c12=["12.11"], new=True)
c("2 tbsp olive oil + 1 tsp for the pan", "INT unit food + INT unit purpose", "B", ["compound_quantity", "integer_decimal"],
  "§12.11: same food after '+' is summed: 6 + 1 = 7 tsp; purpose words in note.",
  n="olive oil", q="7", u="tsp", nt="for the pan", c12=["12.11", "12.12"], new=True)
c("2 lbs boneless chicken thighs (about 6 thighs)", "INT unit food (about INT food)", "B", ["equivalent_quantity", "integer_decimal"],
  "§12.11 / §11.1: a count of the same food restates the weight → equivalent 6 each, ready; approximate false (guide).",
  n="boneless chicken thighs", q="2", u="lb", eq=[("6", "each")], c12=["12.11"])

# price annotations and other notes
c("2 avocados ($2.50), diced", "INT food (PRICE), prep", "B", ["price_annotation", "integer_decimal", "prep_note"],
  "§7.7: price annotations are dropped, not noted; 'diced' is note.",
  n="avocados", q="2", u="each", nt="diced")
c("1 lb carrots ($0.89)", "INT unit food (PRICE)", "B", ["price_annotation", "integer_decimal"],
  "§7.7: the price is dropped → note null.",
  n="carrots", q="1", u="lb")
c("8 oz shiitake mushrooms, stems removed, caps thinly sliced", "INT unit food, prep, prep", "B", ["prep_note", "integer_decimal"],
  "§7.7: comma remarks joined in source order.",
  n="shiitake mushrooms", q="8", u="oz", nt="stems removed; caps thinly sliced")
# ======================================================================================================
# Family C — count units, packages, qualifiers
# ======================================================================================================

# §12.3 package size with no count, restated package sizes, per-piece weights, A6
c("1-lb. bag frozen shelled edamame", "INT-unit. singular-container food", "C", ["package_size", "count_unit"],
  "§12.3 (new): the hyphenated size before a singular container is one bag, packageSize 1 lb.",
  n="frozen shelled edamame", q="1", u="bag", pk=("1", "lb"), c12=["12.3"], new=True)
c("1 (500 g / 1 lb) bag dried chickpeas", "INT (SIZE / SIZE-larger) container food", "C", ["package_size", "count_unit", "integer_decimal"],
  "§12.3 / A2: 1 lb = 453.6 g fails the 7 % test and no allowance for a larger unit → not a restatement → needs_review; package as read.",
  s="needs_review", n="dried chickpeas", q="1", u="bag", pk=("500", "g"), nt="1 lb", sev="medium", c12=["12.3", "12.6"], new=True)
c("2 (8 oz) boneless pork chops", "INT (SIZE) plural-food", "C", ["integer_decimal"],
  "§12.3: per-piece weight → note, never packageSize; chops stay in name with each (§12.4).",
  n="boneless pork chops", q="2", u="each", nt="8 oz", c12=["12.3", "12.4"], new=True)
c("1 jar marinara sauce (24 oz, any brand)", "INT container food (SIZE, remark)", "C", ["package_size", "count_unit", "integer_decimal"],
  "§12.A A6: a size in brackets after the food on a container line is the packageSize whatever else the bracket holds; the rest is note.",
  n="marinara sauce", q="1", u="jar", pk=("24", "oz"), nt="any brand", c12=["12.3"], new=True)
c("an 8-oz block sharp cheddar", "an SIZE singular-container food", "C", ["package_size", "count_unit", "number_word"],
  "§12.3 (new): a size before a singular container (block is sold by weight) → 1 block, packageSize 8 oz.",
  n="sharp cheddar", q="1", u="block", pk=("8", "oz"), c12=["12.3"], new=True)
c("1 (12 oz) can Dr Pepper", "INT (SIZE) container brand-drink", "C", ["package_size", "count_unit", "seasoning_lookalike"],
  "§7.4: 1 can, packageSize 12 oz; the brand name is the food (a pepper lookalike for the household exclusion).",
  n="Dr Pepper", q="1", u="can", pk=("12", "oz"), sc="lookalike")

# §12.4 count noun after the food (A1, A5)
c("1 vegetable stock cube", "INT food cube (stays in name)", "C", ["integer_decimal"],
  "§12.4 (new): stock cubes stay in name, unit each.",
  n="vegetable stock cube", q="1", u="each", c12=["12.4"], new=True)
c("6 chorizo links", "INT sausage links", "C", ["count_unit", "integer_decimal"],
  "§12.4: sausage by the link (h2-0071) → 6 link chorizo.",
  n="chorizo", q="6", u="link", c12=["12.4"])
c("20 cloves, for studding the ham", "INT cloves(spice), purpose", "C", ["integer_decimal", "prep_note"],
  "§12.4 (new): 'cloves' with no food word before it is the spice → 20 each 'cloves'; the purpose remark is note.",
  n="cloves", q="20", u="each", nt="for studding the ham", c12=["12.4"], new=True)
c("1 cup mint leaves, packed", "INT unit food leaves, prep", "C", ["integer_decimal", "prep_note"],
  "§12.4: with another unit stated the noun stays in name.",
  n="mint leaves", q="1", u="cup", nt="packed", c12=["12.4"])
c("Orange wedges, for garnish", "food count-noun, for garnish", "C", ["unstated_amount"],
  "§12.4: with no amount the noun stays in name; §7.10 'for garnish' → ready, for_garnish.",
  n="Orange wedges", au="for_garnish", c12=["12.4"])
c("3 strip steaks (about 12 oz each)", "INT singular-count-word plural-food (about SIZE each)", "C", ["integer_decimal", "approximate"],
  "§12.A A1: 'strip' + plural countable food begins the name → 3 each; §12.3 per-piece weight → note; 'about' qualifies only the per-piece weight, so approximate stays false (guide).",
  n="strip steaks", q="3", u="each", nt="about 12 oz each", c12=["12.4", "12.3"], new=True)
c("2 jar artichoke hearts, drained", "INT singular-container plural-food, prep", "C", ["count_unit", "integer_decimal", "prep_note"],
  "§12.A A1: containers are always the unit → 2 jar.",
  n="artichoke hearts", q="2", u="jar", nt="drained", c12=["12.4"])
c("3 pound chuck roast", "INT singular-massunit food", "C", ["integer_decimal"],
  "§12.A A5: mass words are excluded from number agreement — a sloppy '3 pound' stays 3 lb.",
  n="chuck roast", q="3", u="lb", c12=["12.4"])
c("1 bunch radishes, trimmed", "INT count-unit plural-food, prep", "C", ["count_unit", "integer_decimal", "prep_note"],
  "§12.A A1: a count of one keeps the unit before any food (h2-0066) → 1 bunch.",
  n="radishes", q="1", u="bunch", nt="trimmed", c12=["12.4"])
c("4 green cardamom pods, lightly crushed", "INT colour food count-noun(plural), prep", "C", ["count_unit", "integer_decimal", "prep_note"],
  "§12.4 restated (h2-0054): cardamom by the pod → 4 pod 'green cardamom'.",
  n="green cardamom", q="4", u="pod", nt="lightly crushed", c12=["12.4"])

# §12.10 size words
c("1 1/2 lb small red potatoes, halved", "MIXED unit size food, prep", "C", ["size_word", "fraction", "prep_note"],
  "§12.10: 'small' → note; 'red potatoes' is the product.",
  n="red potatoes", q="1 1/2", u="lb", nt="small; halved", c12=["12.10"])

# ======================================================================================================
# Family D — non-ingredient lines
# ======================================================================================================

c("Iron 2.1mg (12% DV)", "Mineral DECmg (PERCENT DV)", "D", ["heading_non_ingredient", "percentage"],
  "§12.8: mineral + mg → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("★★★★★ (38 reviews)", "STAR-glyphs (INT reviews)", "D", ["heading_non_ingredient", "unicode_text"],
  "§12.8: a star rating with a review count → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("Cuisine: Korean", "Cuisine: word", "D", ["heading_non_ingredient"],
  "§12.8: recipe metadata → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("Kitchen twine", "non-food item", "D", ["heading_non_ingredient"],
  "§12.8: twine is a non-food item → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("Wooden skewers, soaked in water for 30 minutes", "non-food item, prep with time", "D", ["heading_non_ingredient"],
  "§12.8: skewers are a non-food item → unsupported (the time is not an amount).", s="unsupported", c12=["12.8"], new=True)
c("9 x 13-inch baking dish, greased", "N x M-inch equipment, prep", "D", ["heading_non_ingredient"],
  "§12.2(ii): 'N x M-inch' before a singular noun is a size; §12.8: a baking dish is equipment → unsupported.",
  s="unsupported", c12=["12.2", "12.8"], new=True)
c("You will need: a 10-inch cast-iron skillet", "You will need: equipment", "D", ["heading_non_ingredient"],
  "§12.8: non-food items with 'You will need:' → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("½x 1x 2x", "scaling controls", "D", ["heading_non_ingredient", "unicode_text"],
  "§12.2(iii) / §12.8: a line of only scaling controls is page furniture → unsupported.", s="unsupported", c12=["12.2", "12.8"], new=True)
c("Step 4: Fold in the whipped egg whites.", "Step N: instruction", "D", ["heading_non_ingredient"],
  "§7.12 / §12.8: a method step → unsupported.", s="unsupported", c12=["12.8"])
c("Quick Pickled Onions:", "specific-food heading with colon", "D", ["heading_non_ingredient"],
  "§12.8: a line with no amount that ends with ':' is a heading → unsupported.", s="unsupported", c12=["12.8"])
c("STREUSEL TOPPING", "DISH-WORD COMPONENT (caps)", "D", ["heading_non_ingredient"],
  "§12.8: a dish word plus a generic component word, in any case → heading.", s="unsupported", c12=["12.8"])
c("Equipment", "page-section word", "D", ["heading_non_ingredient"],
  "§12.8: a page section label (page furniture) → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("Garnish: thinly sliced scallions", "Role-label: prep food", "D", ["unstated_amount", "prep_note"],
  "§12.8: a role label followed by a food is an ingredient with for_garnish; leading participle accepted without (§7.6).",
  n="thinly sliced scallions", au="for_garnish", an=["scallions"], anote=["thinly sliced"], c12=["12.8"], new=True)
c("To serve: warm pita bread", "Role-label: temp food", "D", ["unstated_amount"],
  "§12.8: role label + food → for_serving; temperature word kept in name with the bare food accepted (h2 convention).",
  n="warm pita bread", au="for_serving", an=["pita bread"], anote=["warm"], c12=["12.8"], new=True)
c("2 scoops vanilla whey protein", "INT imprecise-unit(plural) flavour nutrient-word food", "D", ["imprecise_unit", "integer_decimal"],
  "§12.8: a food whose name contains a nutrition word stays an ingredient → 2 scoop, ready.",
  n="vanilla whey protein", q="2", u="scoop", c12=["12.8"])
c("https://www.example.com/recipes/homemade-ricotta", "link", "D", ["heading_non_ingredient"],
  "§7.12: links → unsupported.", s="unsupported", c12=["12.8"])
c(" ​ ", "whitespace and zero-width marks only", "D", ["empty", "unicode_text"],
  "§7.12: normalizes to an empty line (NBSP → space; a zero-width mark not between letters → space, §11.2) → unsupported, low.",
  s="unsupported", sev="low")

# ======================================================================================================
# plain — ordinary lines
# ======================================================================================================

c("1/2 cup tahini, well stirred", "FRAC unit food, adverb prep", "plain", ["fraction", "prep_note"],
  "§7.7: text after the comma is note.", n="tahini", q="1/2", u="cup", nt="well stirred")
c("2 1/4 tsp active dry yeast", "MIXED unit-abbr food", "plain", ["fraction"],
  "§7.1 mixed number.", n="active dry yeast", q="2 1/4", u="tsp")
c("2¼ cups cake flour, sifted", "INT+VULG unit food, prep", "plain", ["mixed_vulgar", "prep_note"],
  "§7.1 '2¼' = 9/4; 'sifted' note.", n="cake flour", q="2 1/4", u="cup", nt="sifted")
c("1 ½ tsp ground coriander", "INT space VULG unit food", "plain", ["mixed_vulgar"],
  "§7.1: '1 ½' is a mixed number.", n="ground coriander", q="1 1/2", u="tsp")
c("2 ⅔ cups whole-wheat pastry flour", "INT space VULG3 unit food", "plain", ["mixed_vulgar", "fraction_third"],
  "§7.1: '2 ⅔' = 8/3.", n="whole-wheat pastry flour", q="2 2/3", u="cup")
c("1⁄4 cup pine nuts, toasted", "FRACTION-SLASH unit food, prep", "plain", ["fraction", "unicode_text", "prep_note"],
  "§7.1: fraction slash 1⁄4 = 1/4.", n="pine nuts", q="1/4", u="cup", nt="toasted")
c(".75 cup orange marmalade", "DEC(leading dot) unit food", "plain", ["integer_decimal"],
  "§7.1: '.75' = 3/4.", n="orange marmalade", q="3/4", u="cup")
c("2 tbsp Frank's RedHot", "INT unit brand-sauce", "plain", ["integer_decimal", "seasoning_lookalike"],
  "Brand name is the food; a pepper sauce lookalike.", n="Frank's RedHot", q="2", u="tbsp", sc="lookalike")
c("Fine sea salt to taste", "food to taste (no comma)", "plain", ["unstated_amount", "seasoning_ordinary"],
  "§7.10: to taste, no amount → ready.", n="Fine sea salt", au="to_taste", sc="ordinary_salt")
c("Cracked black pepper, as needed", "food, as needed", "plain", ["unstated_amount", "seasoning_ordinary"],
  "§7.10: 'as needed' → as_needed.", n="Cracked black pepper", au="as_needed", sc="ordinary_black_pepper")
c("1 cup extra-virgin olive oil, preferably a fruity Spanish one, plus more for drizzling over the finished dish",
  "INT unit food, preference remark, plus more for purpose (long)", "plain", ["long_line", "integer_decimal", "prep_note"],
  "§7.7: every comma remark to note in order; an amount is stated, so amountUnstated stays null (§7.10).",
  n="extra-virgin olive oil", q="1", u="cup", nt="preferably a fruity Spanish one; plus more for drizzling over the finished dish")
c("8 fl. oz. tomato juice", "INT fl. oz. food", "plain", ["oz_vs_floz", "integer_decimal"],
  "§7.3: fluid ounce → fl_oz (volume).", n="tomato juice", q="8", u="fl_oz")
c("12 ounces lager", "INT ounces liquid", "plain", ["oz_vs_floz", "integer_decimal"],
  "§7.3: 'ounces' = oz (mass) even for a liquid.", n="lager", q="12", u="oz")
c("one cup ricotta", "WORD unit food", "plain", ["number_word"],
  "§7.1: 'one' = 1.", n="ricotta", q="1", u="cup")
c("about 2 cups day-old bread cubes", "about INT unit food", "plain", ["approximate", "integer_decimal"],
  "§7.11: about → approximate; with a unit stated, 'cubes' stays in name (§12.4).",
  n="day-old bread cubes", q="2", u="cup", apx=True)
c("~1 cup reserved pasta water", "~INT unit prep food", "plain", ["approximate", "integer_decimal", "prep_note"],
  "§7.11: '~' → approximate; 'reserved' participle accepted as note (§7.6).",
  n="reserved pasta water", q="1", u="cup", apx=True, an=["pasta water"], anote=["reserved"])
c("Butter: 4 tbsp", "Food: INT unit", "plain", ["quantity_after_name", "integer_decimal"],
  "Labelling guide: an amount after the food is the quantity, ready.", n="Butter", q="4", u="tbsp")
c("2 cups cubed butternut squash", "INT unit prep-participle food", "plain", ["prep_note", "integer_decimal"],
  "§7.6: leading participle accepted without.", n="cubed butternut squash", q="2", u="cup", an=["butternut squash"], anote=["cubed"])
c("1 lb dried rigatoni", "INT unit form food", "plain", ["integer_decimal"],
  "'dried' is a product form (guide).", n="dried rigatoni", q="1", u="lb")
c("1 tube Pillsbury crescent rolls", "INT tube brand food", "plain", ["count_unit", "integer_decimal"],
  "§7.3: tube is a count unit.", n="Pillsbury crescent rolls", q="1", u="tube")
c("3 strips orange peel", "INT strips food", "plain", ["count_unit", "integer_decimal"],
  "§7.3: strip is a count unit.", n="orange peel", q="3", u="strip")
c("2 slices brioche, toasted", "INT slices food, prep", "plain", ["count_unit", "integer_decimal", "prep_note"],
  "§7.3 slice.", n="brioche", q="2", u="slice", nt="toasted")
c("a sprinkle of flaky salt", "a sprinkle of food", "plain", ["imprecise_unit", "number_word", "seasoning_ordinary"],
  "Registry imprecise unit sprinkle; 'a' = 1.", n="flaky salt", q="1", u="sprinkle", sc="ordinary_salt")
c("2 courgettes, coarsely grated", "INT regional-food, adverb prep", "plain", ["integer_decimal", "prep_note"],
  "UK courgettes; bare count each.", n="courgettes", q="2", u="each", nt="coarsely grated")
c("1 aubergine, cut into 2cm chunks", "INT food, cut into size pieces", "plain", ["integer_decimal", "prep_note"],
  "The size inside the preparation remark is not an amount → note.", n="aubergine", q="1", u="each", nt="cut into 2cm chunks")
c("3 spring onions, finely sliced", "INT two-word regional food, adverb prep", "plain", ["integer_decimal", "prep_note"],
  "UK spring onions.", n="spring onions", q="3", u="each", nt="finely sliced")
c("50g rocket", "INTg leafy food", "plain", ["integer_decimal"],
  "UK rocket (arugula).", n="rocket", q="50", u="g")
c("500g lean beef mince", "INTg modifier regional food", "plain", ["integer_decimal"],
  "UK mince.", n="lean beef mince", q="500", u="g")
c("1 tsp bicarbonate of soda", "INT unit food of food", "plain", ["integer_decimal"],
  "'of' inside the food name stays (it is not after the unit).", n="bicarbonate of soda", q="1", u="tsp")
c("2 cups atta (whole wheat flour)", "INT unit food (gloss)", "plain", ["integer_decimal"],
  "§7.6: text in parentheses → note.", n="atta", q="2", u="cup", nt="whole wheat flour")
c("3 dried guajillo chiles, stemmed and seeded", "INT form food, prep and prep", "plain", ["integer_decimal", "prep_note"],
  "'dried' is a product form.", n="dried guajillo chiles", q="3", u="each", nt="stemmed and seeded")
c("6 dried shiitake mushrooms, soaked in hot water", "INT form food, prep phrase", "plain", ["integer_decimal", "prep_note"],
  "Bare count each; product form in name.", n="dried shiitake mushrooms", q="6", u="each", nt="soaked in hot water")
c("Nonstick cooking spray, for greasing", "food, for greasing", "plain", ["unstated_amount"],
  "§7.10: for greasing → other.", n="Nonstick cooking spray", au="other")
c("Grated Parmesan", "prep cheese (no amount)", "plain", ["quantity_missing", "prep_note"],
  "§7.10: no amount → needs_review; participle accepted without.",
  s="needs_review", n="Grated Parmesan", an=["Parmesan"], anote=["grated"], sev="medium")
c("Optional: 2 tbsp toasted pine nuts", "Optional: INT unit prep food", "plain", ["optional", "integer_decimal", "prep_note"],
  "§7.9: 'optional:' prefix → flag.", n="toasted pine nuts", q="2", u="tbsp", opt=True, an=["pine nuts"], anote=["toasted"])
c("Ten saltine crackers, crushed", "WORD(10) food, prep", "plain", ["number_word", "prep_note"],
  "§7.1: 'Ten' = 10.", n="saltine crackers", q="10", u="each", nt="crushed")
c("half a lemon, juiced", "half a food, prep", "plain", ["number_word", "prep_note"],
  "§7.1: 'half a' = 1/2 each.", n="lemon", q="1/2", u="each", nt="juiced")
c("approx. 2 lbs pork belly, skin scored", "approx. INT unit food, prep", "plain", ["approximate", "integer_decimal", "prep_note"],
  "§7.11: 'approx.' → approximate.", n="pork belly", q="2", u="lb", apx=True, nt="skin scored")
c("roughly 3 cups torn kale", "roughly INT unit prep food", "plain", ["approximate", "integer_decimal", "prep_note"],
  "§7.11: roughly → approximate; participle accepted without.", n="torn kale", q="3", u="cup", apx=True, an=["kale"], anote=["torn"])
c("1 cup frozen shelled peas, thawed", "INT unit form prep food, prep", "plain", ["integer_decimal", "prep_note"],
  "'frozen' product form kept; 'shelled' part of the product.", n="frozen shelled peas", q="1", u="cup", nt="thawed")
c("1 cup chopped fresh flat-leaf parsley (from about 1 bunch), plus extra leaves for garnish", "INT unit prep fresh herb (from about INT count-unit), plus extra for garnish (long)",
  "B", ["long_line", "prep_note", "equivalent_quantity", "count_unit"],
  "§12.A A3: leaves taken from the plant restate the bunch → equivalent 1 bunch; the 'plus extra' remark is note (§7.10); participles accepted without.",
  n="chopped fresh flat-leaf parsley", q="1", u="cup", eq=[("1", "bunch")], nt="plus extra leaves for garnish",
  an=["flat-leaf parsley", "fresh flat-leaf parsley"], anote=["chopped; fresh; plus extra leaves for garnish", "chopped; plus extra leaves for garnish"],
  c12=["12.11"], new=True)
c("1 lb skirt steak, trimmed", "INT unit cut, prep", "plain", ["integer_decimal", "prep_note"],
  "Plain weight line.", n="skirt steak", q="1", u="lb", nt="trimmed")
