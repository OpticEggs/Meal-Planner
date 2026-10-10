# Round 2 (after the first dedup pass removed exact and near copies of exposed inputs).

# ======================================================================================================
# plain
# ======================================================================================================
c("3 cups day-old jasmine rice, clumps broken up", "INT unit hyphen-age food, prep phrase", "plain", ["integer_decimal", "prep_note"],
  "§7.7: comma remark → note.", n="day-old jasmine rice", q="3", u="cup", nt="clumps broken up")
c("1/2 cup Castelvetrano olives, smashed and pitted", "FRAC unit variety food, prep and prep", "plain", ["fraction", "prep_note"],
  "§7.7 note.", n="Castelvetrano olives", q="1/2", u="cup", nt="smashed and pitted")
c("1/2 cup Marcona almonds, roughly chopped", "FRAC unit variety nuts, adverb prep", "plain", ["fraction", "prep_note"],
  "§7.7 note.", n="Marcona almonds", q="1/2", u="cup", nt="roughly chopped")
c("2 cups cooked black lentils (beluga)", "INT unit cooked food (variety)", "plain", ["form_cooked_raw", "integer_decimal"],
  "§7.6: 'cooked' → form; bracket text → note.", n="black lentils", q="2", u="cup", f="cooked", nt="beluga")
c("8 oz uncooked orzo", "INT oz uncooked pasta", "plain", ["form_cooked_raw", "integer_decimal"],
  "§7.6: 'uncooked' → form raw.", n="orzo", q="8", u="oz", f="raw")
c("1 lb raw shelled peanuts", "INT unit raw form-word food", "plain", ["form_cooked_raw", "integer_decimal"],
  "§7.6: 'raw' → form; 'shelled' is the product form.", n="shelled peanuts", q="1", u="lb", f="raw")
c("1⅔ cups coconut sugar", "INT+VULG(2/3) unit food", "plain", ["mixed_vulgar", "fraction_third"],
  "§7.1: '1⅔' = 5/3.", n="coconut sugar", q="1 2/3", u="cup")
c("⅓ cup tamarind concentrate", "VULG(1/3) unit food", "plain", ["fraction_third", "unicode_text"],
  "§7.1: '⅓' = 1/3 exactly.", n="tamarind concentrate", q="1/3", u="cup")
c("a 2-inch knob of fresh ginger", "a INT-inch knob of fresh food", "plain", ["imprecise_unit", "number_word", "size_word"],
  "Registry imprecise unit knob; 'a' = 1; the size → note.", n="fresh ginger", q="1", u="knob", nt="2-inch")
c("1 inch fresh turmeric root, grated", "INT inch fresh root, prep", "plain", ["imprecise_unit", "integer_decimal", "prep_note"],
  "'inch' is a registry imprecise unit → 1 inch, ready (§7.3).", n="fresh turmeric root", q="1", u="inch", nt="grated")
c("2 cups shelled pistachios (unsalted)", "INT unit form nuts (salt remark)", "plain", ["integer_decimal", "seasoning_lookalike"],
  "Bracket text → note.", n="shelled pistachios", q="2", u="cup", nt="unsalted", sc="lookalike")
c("1 tsp Tajín, plus more for the rims", "INT unit accented brand, plus more for purpose", "plain", ["integer_decimal", "unicode_text", "prep_note"],
  "§7.10: with an amount the 'plus more' remark is note.", n="Tajín", q="1", u="tsp", nt="plus more for the rims")
c("1 lb sushi-grade ahi tuna, cut into 1/2-inch cubes", "INT unit grade fish, cut into size", "plain", ["integer_decimal", "prep_note"],
  "The fraction inside the cutting note is a size, not an amount → note.", n="sushi-grade ahi tuna", q="1", u="lb", nt="cut into 1/2-inch cubes")
c("1 pkg. (8 oz) tempeh, crumbled", "INT pkg. (INT unit) food, prep", "plain", ["package_size", "count_unit", "prep_note"],
  "'pkg.' = package; §7.4 packageSize 8 oz.", n="tempeh", q="1", u="package", pk=("8", "oz"), nt="crumbled")
c("4 Persian cucumbers, thinly sliced on the bias", "INT origin food(plural), prep phrase", "plain", ["integer_decimal", "prep_note"],
  "Bare count each.", n="Persian cucumbers", q="4", u="each", nt="thinly sliced on the bias")
c("1/4 cup Kikkoman ponzu", "FRAC unit brand citrus sauce", "plain", ["fraction"],
  "Plain line.", n="Kikkoman ponzu", q="1/4", u="cup")
c("3 cups Frosted Flakes, lightly crushed", "INT unit brand cereal, adverb prep", "plain", ["integer_decimal", "prep_note"],
  "Brand kept.", n="Frosted Flakes", q="3", u="cup", nt="lightly crushed")
c("2 Honeycrisp apples, cored and cut into matchsticks", "INT variety fruit, prep and prep phrase", "plain", ["integer_decimal", "prep_note"],
  "Bare count each.", n="Honeycrisp apples", q="2", u="each", nt="cored and cut into matchsticks")
c("200g Tenderstem broccoli, ends trimmed", "INTg brand-veg, prep", "plain", ["integer_decimal", "prep_note"],
  "UK brand of broccolini; 200 g.", n="Tenderstem broccoli", q="200", u="g", nt="ends trimmed")
c("1 tbsp Marmite", "INT unit brand spread", "plain", ["integer_decimal"],
  "Plain line.", n="Marmite", q="1", u="tbsp")
c("75g unsalted butter, cubed and chilled", "INTg butter, prep and prep", "plain", ["integer_decimal", "prep_note", "seasoning_lookalike"],
  "Metric butter line; lookalike.", n="unsalted butter", q="75", u="g", nt="cubed and chilled", sc="lookalike")
c("1/2 cup pepitas, toasted in a dry skillet", "FRAC unit seeds, prep phrase", "plain", ["fraction", "prep_note"],
  "§7.7 note.", n="pepitas", q="1/2", u="cup", nt="toasted in a dry skillet")
c("1/2 lb thick-sliced pastrami", "FRAC unit hyphen-cut deli meat", "plain", ["fraction"],
  "'thick-sliced' is the product cut.", n="thick-sliced pastrami", q="1/2", u="lb")
c("1 (6.7 oz) jar oil-packed tuna, drained", "INT (DEC unit) jar hyphen-form food, prep", "plain", ["package_size", "count_unit", "prep_note"],
  "§7.4: 1 jar, packageSize 6.7 oz.", n="oil-packed tuna", q="1", u="jar", pk=("6.7", "oz"), nt="drained")
c("1 cup self-rising flour (such as White Lily)", "INT unit hyphen-type flour (such as brand)", "plain", ["integer_decimal"],
  "Bracket text → note.", n="self-rising flour", q="1", u="cup", nt="such as White Lily")
c("1 lb Brussels sprouts, trimmed and halved", "INT unit proper-noun veg, prep and prep", "plain", ["integer_decimal", "prep_note"],
  "Plain weight line.", n="Brussels sprouts", q="1", u="lb", nt="trimmed and halved")
c("1/3 cup crème de cassis", "FRAC3 unit accented liqueur", "plain", ["fraction_third", "unicode_text"],
  "§7.14 Unicode kept.", n="crème de cassis", q="1/3", u="cup")
c("1 1/2 cups plus 2 tbsp buttermilk, shaken", "MIXED unit plus INT unit food, prep", "A", ["compound_quantity", "fraction", "prep_note"],
  "§12.12: 1 1/2 cups = 24 tbsp, + 2 = 26 tbsp.", n="buttermilk", q="26", u="tbsp", nt="shaken", c12=["12.12"])
c("1 qt + 1 cup chicken stock", "INT qt + INT unit food", "A", ["compound_quantity", "quart_pint_gallon", "integer_decimal"],
  "§12.12: 1 quart = 4 cups, + 1 = 5 cups.", n="chicken stock", q="5", u="cup", c12=["12.12"])

# ======================================================================================================
# Family A
# ======================================================================================================
c("a half-cup of pomegranate arils", "a FRACWORD-unit of food", "A", ["number_word", "fraction"],
  "§12.1: 'a half-cup of' = 1/2 cup; 'of' after the unit is removed.", n="pomegranate arils", q="1/2", u="cup", c12=["12.1"], new=True)
c("4x free-range eggs", "INTx hyphen-modifier food", "A", ["integer_decimal"],
  "§12.2 (new): a count before 'x' and a food → 4 each; 'x' never stays in name.", n="free-range eggs", q="4", u="each", c12=["12.2"], new=True)
c("1x pinch saffron", "1x imprecise-unit food", "A", ["imprecise_unit", "integer_decimal"],
  "§12.2 (new): a count before 'x' and a unit → 1 pinch, ready (§7.3 imprecise).", n="saffron", q="1", u="pinch", c12=["12.2"], new=True)
c("☐ 1/4 cup golden raisins", "BALLOT-BOX FRAC unit food", "A", ["unicode_text", "fraction"],
  "§12.13 (new): leading ☐ is decoration.", n="golden raisins", q="1/4", u="cup", c12=["12.13"], new=True)
c("a. 2 cups shredded carrots", "letter. INT unit product-form food", "A", ["integer_decimal"],
  "§12.13 (new): 'a.' enumerator is decoration; 'a' is not read as one.", n="shredded carrots", q="2", u="cup", c12=["12.13"], new=True)
c("✔ 1 tsp fennel seeds", "HEAVY-CHECK INT unit food", "A", ["unicode_text", "integer_decimal"],
  "§12.13 (new): leading ✔ is decoration.", n="fennel seeds", q="1", u="tsp", c12=["12.13"], new=True)
c("* 1/2 cup toasted walnuts, chopped", "STAR FRAC unit prep food, prep", "A", ["fraction", "prep_note"],
  "§12.13 restated (hold-0005): leading '*' is decoration; participle accepted without.",
  n="toasted walnuts", q="1/2", u="cup", nt="chopped", an=["walnuts"], anote=["toasted; chopped"], c12=["12.13"])
c("1 200 g lamb mince", "INT-space-3DIGIT g food", "A", ["ambiguous_number_format"],
  "§12.13 (new): '1 200' is a thousands-separated number → ambiguous, needs_review; unit and food as read.",
  s="needs_review", n="lamb mince", q=None, u="g", sev="high", c12=["12.13"], new=True)
c("6 to 8 small new potatoes", "INT to INT size food", "A", ["range", "size_word", "integer_decimal"],
  "§7.2: range 6..8 each, needs_review; 'small' → note.", s="needs_review", n="new potatoes", q="6..8", u="each", nt="small", sev="high")
c("1/2-3/4 cup whole milk", "FRAC-FRAC unit food", "A", ["range", "fraction"],
  "§7.2: '1/2-3/4' is a range → '1/2..3/4' cup, needs_review.", s="needs_review", n="whole milk", q="1/2..3/4", u="cup", sev="medium")
c("seven or eight cremini mushrooms", "WORD or WORD food", "A", ["range", "number_word"],
  "§7.1–7.2: number words joined by 'or' are a range 7..8 each, needs_review.", s="needs_review", n="cremini mushrooms", q="7..8", u="each", sev="medium")
c("several sprigs fresh oregano", "vague-word count-unit(plural) fresh herb", "A", ["quantity_missing", "count_unit"],
  "§12.15: a plural count unit with a vague word has no quantity → needs_review; unit as read; 'fresh' herb accepted as note.",
  s="needs_review", n="fresh oregano", q=None, u="sprig", an=["oregano"], anote=["fresh"], sev="low")
c("3 rashers smoked streaky bacon", "INT unknown-count-word food", "A", ["integer_decimal"],
  "§12.14: 'rashers' is not a registry unit nor part of the food → needs_review; amount and food as read, the word accepted in note.",
  s="needs_review", n="smoked streaky bacon", q="3", u=None, anote=["rashers"], sev="medium", c12=["12.14"], new=True)
c("1 pint (568ml) semi-skimmed milk", "INT pint (INTml) food", "A", ["quart_pint_gallon", "equivalent_quantity", "integer_decimal"],
  "§12.6: a US pint is 473.2 ml; 568 ml is 20 % more (an imperial pint) → not a restatement → needs_review; remark in note.",
  s="needs_review", n="semi-skimmed milk", q="1", u="pint", nt="568ml", sev="medium", c12=["12.6"], new=True)
c("2 imperial pints chicken stock", "INT imperial unit(plural) food", "A", ["quart_pint_gallon", "integer_decimal"],
  "§12.14: a pint qualified as imperial differs from the registry pint → needs_review.",
  s="needs_review", n="chicken stock", q="2", u="pint", nt="imperial", anote=[None], sev="medium", c12=["12.14"], new=True)
c("Handful of pea shoots", "Imprecise-unit(handful) of food (no number)", "A", ["imprecise_unit"],
  "§12.15: singular imprecise unit → 1 handful, ready.", n="pea shoots", q="1", u="handful")
c("Drop of rose water", "Imprecise-unit(drop) of food (no number)", "A", ["imprecise_unit"],
  "§12.15: singular imprecise unit → 1 drop, ready.", n="rose water", q="1", u="drop")
c("Splashes of heavy cream", "plural-imprecise-unit of food (no number)", "A", ["imprecise_unit", "quantity_missing"],
  "§12.15: a plural imprecise unit has no quantity → needs_review.", s="needs_review", n="heavy cream", q=None, u="splash", sev="low")
c("Cup of jasmine rice, rinsed", "Measuring-unit of food (no number), prep", "A", ["quantity_missing", "prep_note"],
  "§12.15: a measuring unit with no number → needs_review (the number may have been lost).",
  s="needs_review", n="jasmine rice", q=None, u="cup", nt="rinsed", sev="high")
c("Head of radicchio, cored", "Count-unit(head) of food (no number), prep", "A", ["count_unit", "prep_note"],
  "§12.15 (new): a singular count unit with no number reads as one → 1 head radicchio. Relies on §12.15 (new), not recordable in contract12.",
  n="radicchio", q="1", u="head", nt="cored")
c("Small sprig of tarragon", "size count-unit of herb (no number)", "A", ["count_unit", "size_word"],
  "§12.15 (new): singular count unit → 1 sprig; size word before the unit → note. Relies on §12.15 (new), not recordable in contract12.",
  n="tarragon", q="1", u="sprig", nt="small")
c("1 (9 oz) package three cheese tortellini", "INT (INT unit) container NUMWORD-component food", "A", ["package_size", "count_unit", "number_word"],
  "§12.9 (new): 'three cheese' names the tortellini by its components → in name; §7.4 → 1 package, packageSize 9 oz.",
  n="three cheese tortellini", q="1", u="package", pk=("9", "oz"), c12=["12.9"], new=True)
c("3 cheese quesadillas", "INT food(plural) counted", "A", ["integer_decimal"],
  "§12.9: a plural head makes the number a count → 3 each 'cheese quesadillas'.", n="cheese quesadillas", q="3", u="each", c12=["12.9"])
c("2 tbsp 5 spice seasoning", "INT unit DIGIT spice-blend", "A", ["integer_decimal"],
  "§12.9 (new): a digit with no unit before a singular head that counts the components names the product → in name; amount 2 tbsp.",
  n="5 spice seasoning", q="2", u="tbsp", c12=["12.9"], new=True)
c("1 cup V8 vegetable juice", "INT unit CODE-brand food", "A", ["integer_decimal"],
  "§12.9 restated: a code-like product number (V8) stays in name.", n="V8 vegetable juice", q="1", u="cup", c12=["12.9"])

# ======================================================================================================
# Family B
# ======================================================================================================
c("1/4 cup tamari or coconut aminos", "FRAC unit A or B (different products)", "B", ["ingredient_alternatives", "fraction"],
  "§7.8: a choice of ingredients → [tamari, coconut aminos], name null, needs_review.",
  s="needs_review", alt=["tamari", "coconut aminos"], q="1/4", u="cup", sev="medium", c12=["12.7"])
c("3 tbsp ghee or neutral oil", "INT unit A or modifier B", "B", ["ingredient_alternatives", "integer_decimal"],
  "§7.8 / §12.7(a): options as written → [ghee, neutral oil].",
  s="needs_review", alt=["ghee", "neutral oil"], q="3", u="tbsp", sev="medium", c12=["12.7"])
c("1 lb ground chicken, turkey, or pork", "INT unit modifier A, B, or C", "B", ["ingredient_alternatives", "integer_decimal"],
  "§12.7(c)+(e): the leading 'ground' is shared across a list of bare foods → strict [ground chicken, ground turkey, ground pork]; [ground chicken, turkey, pork] accepted.",
  s="needs_review", alt=["ground chicken", "ground turkey", "ground pork"], aalt=[["ground chicken", "turkey", "pork"]], q="1", u="lb", sev="medium", c12=["12.7"], new=True)
c("1/2 cup chimichurri (see recipe (page 12))", "FRAC unit sauce (see recipe (page ref))", "B", ["nested_parens", "fraction"],
  "§7.7: nested brackets flattened into one note; the page number is not an amount.", n="chimichurri", q="1/2", u="cup", nt="see recipe page 12")
c("1 cup walnuts (optional), toasted", "INT unit food (optional), prep", "B", ["optional", "integer_decimal", "prep_note"],
  "§7.9: '(optional)' is a flag, not note; 'toasted' after the comma is note.", n="walnuts", q="1", u="cup", opt=True, nt="toasted")
c("1 bunch lacinato kale ($1.99/bunch)", "INT count-unit variety greens (PRICE/unit)", "B", ["price_annotation", "count_unit", "integer_decimal"],
  "§7.7: price annotations are dropped.", n="lacinato kale", q="1", u="bunch")
c("4 oz fresh goat cheese ($3.49), crumbled", "INT oz fresh cheese (PRICE), prep", "B", ["price_annotation", "integer_decimal", "prep_note"],
  "§7.7: price dropped; 'crumbled' note.", n="fresh goat cheese", q="4", u="oz", nt="crumbled")
c("1/2 cup sun-dried tomatoes and kalamata olives, chopped", "FRAC unit A and B, prep", "B", ["fraction", "prep_note"],
  "§12.A A4: list of two foods → needs_review, name null.", s="needs_review", q="1/2", u="cup", nt="chopped", sev="medium", c12=["12.7"], new=True)
c("1 bunch Tuscan kale (about 8 oz)", "INT count-unit food (about INT oz)", "B", ["equivalent_quantity", "count_unit", "integer_decimal"],
  "§12.11: a weight of the same food in the same state restates the bunch → equivalent 8 oz, ready.",
  n="Tuscan kale", q="1", u="bunch", eq=[("8", "oz")], c12=["12.11"])
c("4 tbsp ghee, plus 1 tsp for the skillet", "INT unit food, plus INT unit for purpose", "B", ["compound_quantity", "integer_decimal"],
  "§12.11: same food after 'plus' (even after a comma) is summed: 12 + 1 = 13 tsp; purpose words in note.",
  n="ghee", q="13", u="tsp", nt="for the skillet", c12=["12.11", "12.12"], new=True)
c("1 cup flour, plus extra for the board", "INT unit food, plus extra for purpose", "B", ["integer_decimal"],
  "§7.10: with an amount, 'plus extra' (no amount) is note.", n="flour", q="1", u="cup", nt="plus extra for the board")

# ======================================================================================================
# Family C
# ======================================================================================================
c("16.9 fl oz bottle sparkling water", "SIZE(fl oz) singular-container drink", "C", ["package_size", "count_unit", "oz_vs_floz"],
  "§12.3 (new): 1 bottle, packageSize 16.9 fl_oz (volume, §7.3).", n="sparkling water", q="1", u="bottle", pk=("16.9", "fl_oz"), c12=["12.3"], new=True)
c("32 oz carton low-sodium beef broth", "SIZE carton modifier food", "C", ["package_size", "count_unit"],
  "§12.3 (new): 1 carton, packageSize 32 oz.", n="low-sodium beef broth", q="1", u="carton", pk=("32", "oz"), c12=["12.3"], new=True)
c("a 750-ml bottle of Lambrusco", "a SIZE singular-container of food", "C", ["package_size", "count_unit", "number_word"],
  "§12.3 (new): size before a singular container → 1 bottle, packageSize 750 ml; 'of' removed.", n="Lambrusco", q="1", u="bottle", pk=("750", "ml"), c12=["12.3"], new=True)
c("6 (4-ounce) chicken cutlets", "INT (INT-unit) plural-food", "C", ["integer_decimal"],
  "§12.3: per-piece weight → note, never packageSize.", n="chicken cutlets", q="6", u="each", nt="4-ounce", c12=["12.3"], new=True)
c("a 5-lb bone-in ham", "a SIZE singular-food", "C", ["number_word", "equivalent_quantity"],
  "§12.3: single item → its weight restates the amount → 1 each, equivalent 5 lb.", n="bone-in ham", q="1", u="each", eq=[("5", "lb")], c12=["12.3"], new=True)
c("1 (2-pound) beef tenderloin roast, trimmed", "INT (INT-unit-word) singular-food, prep", "C", ["integer_decimal", "equivalent_quantity", "prep_note"],
  "§12.3: single item → 1 each, equivalent 2 lb.", n="beef tenderloin roast", q="1", u="each", eq=[("2", "lb")], nt="trimmed", c12=["12.3"], new=True)
c("1 box frozen phyllo dough (16 oz), thawed", "INT container frozen food (SIZE), prep", "C", ["package_size", "count_unit", "integer_decimal", "prep_note"],
  "§12.A A6: bracketed size after the food → packageSize 16 oz.", n="frozen phyllo dough", q="1", u="box", pk=("16", "oz"), nt="thawed", c12=["12.3"], new=True)
c("1 bottle Thai sweet chili sauce (10 fl oz)", "INT container origin food (SIZE fl oz)", "C", ["package_size", "count_unit", "oz_vs_floz", "integer_decimal"],
  "§12.A A6: bracketed size after the food → packageSize 10 fl_oz.", n="Thai sweet chili sauce", q="1", u="bottle", pk=("10", "fl_oz"), c12=["12.3"], new=True)
c("1 celery rib, finely diced", "INT food count-noun(rib), prep", "C", ["count_unit", "integer_decimal", "prep_note"],
  "§12.4: celery by the rib (h2-0065) → 1 rib celery.", n="celery", q="1", u="rib", nt="finely diced", c12=["12.4"])
c("2 pandan leaves, tied in a knot", "INT food leaves (stays in name), prep phrase", "C", ["integer_decimal", "prep_note"],
  "§12.4 (new): pandan leaves stay in name, unit each.", n="pandan leaves", q="2", u="each", nt="tied in a knot", c12=["12.4"], new=True)
c("1 chicken bouillon cube, crumbled", "INT food bouillon cube, prep", "C", ["integer_decimal", "prep_note"],
  "§12.4 (new): bouillon cubes stay in name, unit each.", n="chicken bouillon cube", q="1", u="each", nt="crumbled", c12=["12.4"], new=True)
c("4 bulb onions, sliced into rings", "INT singular-count-word plural-food, prep", "C", ["integer_decimal", "prep_note"],
  "§12.A A1 (new): a singular count word after a count above one, before a plural countable food, begins the name → 4 each 'bulb onions'.",
  n="bulb onions", q="4", u="each", nt="sliced into rings", c12=["12.4"], new=True)
c("6 sheets leaf gelatin", "INT count-unit(plural) food", "C", ["count_unit", "integer_decimal"],
  "§12.A A1: a plural count word agreeing with the count is the unit → 6 sheet 'leaf gelatin'.", n="leaf gelatin", q="6", u="sheet", c12=["12.4"])
c("2 head garlic, cloves separated", "INT singular-count-word uncounted-food, prep", "C", ["count_unit", "integer_decimal", "prep_note"],
  "§12.A A1: a singular count word before an uncounted food is a sloppy plural → 2 head.", n="garlic", q="2", u="head", nt="cloves separated", c12=["12.4"])
c("4 small shallots, peeled", "INT size food(plural), prep", "C", ["size_word", "integer_decimal", "prep_note"],
  "§12.10: 'small' → note.", n="shallots", q="4", u="each", nt="small; peeled", c12=["12.10"])
c("1 colossal Vidalia onion", "INT size variety food", "C", ["size_word", "integer_decimal"],
  "§12.10: 'colossal' sizes the onion → note.", n="Vidalia onion", q="1", u="each", nt="colossal", c12=["12.10"])
c("3 big handfuls arugula", "INT size imprecise-unit(plural) food", "C", ["size_word", "imprecise_unit", "integer_decimal"],
  "§12.10 / §12.15: size word before the unit → note; 3 handful, ready.", n="arugula", q="3", u="handful", nt="big", c12=["12.10"])
c("1 strip steak, about 14 oz", "1 count-word-cut steak, about SIZE (debatable)", "C", ["integer_decimal", "equivalent_quantity"],
  "§12.A A1: with a count of one and a cut ('strip steak') both readings are defensible — pre-registered debatable. Labelled as one steak; the single item's weight restates it (§12.3), 'about' qualifying only the restatement.",
  n="strip steak", q="1", u="each", eq=[("14", "oz")], c12=["12.4", "12.3"], new=True, deb=True)

# ======================================================================================================
# Family D
# ======================================================================================================
c("Rated 4.9 out of 5 by 63 readers", "rating sentence", "D", ["heading_non_ingredient"],
  "§12.8: ratings → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("Resting time: overnight", "time label: word", "D", ["heading_non_ingredient"],
  "§12.8: times → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("Category: Dessert", "Category: word", "D", ["heading_non_ingredient"],
  "§12.8: recipe metadata → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("Two 9-inch round cake pans, buttered and floured", "WORD INT-inch equipment(plural), prep", "D", ["heading_non_ingredient", "number_word"],
  "§12.8: pans are non-food items even with a count → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("For the Pickled Shallots", "For the food-heading (no colon)", "D", ["heading_non_ingredient"],
  "§12.8: no amount and starts with 'For the' → heading.", s="unsupported", c12=["12.8"])
c("Salsa macha", "specific food (no amount)", "D", ["quantity_missing"],
  "§12.8: a specific food with no amount is an ingredient → needs_review (quantity_missing).", s="needs_review", n="Salsa macha", sev="medium", c12=["12.8"])
c("For garnish: pomegranate arils", "For-role-label: food", "D", ["unstated_amount"],
  "§12.8: a role label followed by a food is an ingredient → for_garnish, ready.", n="pomegranate arils", au="for_garnish", c12=["12.8"], new=True)
c("Salt (2.5 g)", "Salt (DEC g)", "D", ["quantity_after_name", "seasoning_ordinary"],
  "§12.8: 'Salt' followed by a mass in g → needs_review; seasoning → low.", s="needs_review", n="Salt", q="2 1/2", u="g", sev="low", sc="ordinary_salt", c12=["12.8"], new=True)
