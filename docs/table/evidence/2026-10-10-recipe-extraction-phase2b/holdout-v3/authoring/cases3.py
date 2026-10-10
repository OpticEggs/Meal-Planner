# Round 3 (after the second dedup pass).

# ======================================================================================================
# plain
# ======================================================================================================
c("6 tbsp Kerrygold salted butter, softened", "INT unit brand salted-butter, prep", "plain", ["integer_decimal", "prep_note", "seasoning_lookalike"],
  "Brand kept in name; salted butter is a lookalike.", n="Kerrygold salted butter", q="6", u="tbsp", nt="softened", sc="lookalike")
c("3 cups loosely packed watercress, thick stems trimmed", "INT unit adverb-participle greens, prep", "plain", ["integer_decimal", "prep_note"],
  "§7.6: 'loosely packed' is a leading measuring participle; the bare food is accepted with it as note.",
  n="loosely packed watercress", q="3", u="cup", nt="thick stems trimmed", an=["watercress"], anote=["loosely packed; thick stems trimmed"])
c("1/4 cup dried currants, plumped in warm brandy", "FRAC unit dried fruit, prep phrase", "plain", ["fraction", "prep_note"],
  "Comma remark → note.", n="dried currants", q="1/4", u="cup", nt="plumped in warm brandy")
c("1 lb skin-on Arctic char fillet", "INT unit hyphen-modifier fish fillet(singular)", "plain", ["integer_decimal"],
  "§12.4: with another unit stated (lb) the noun stays in name; §12.3: a size before a non-container is the amount.",
  n="skin-on Arctic char fillet", q="1", u="lb", c12=["12.4"])
c("8 oz hot-smoked trout, flaked, skin discarded", "INT oz hyphen-form fish, prep, prep", "plain", ["integer_decimal", "prep_note"],
  "Remarks joined in order.", n="hot-smoked trout", q="8", u="oz", nt="flaked; skin discarded")
c("2 tsp Urfa biber", "INT unit regional chile", "plain", ["integer_decimal", "seasoning_lookalike"],
  "Turkish chile flakes (pepper-flake lookalike).", n="Urfa biber", q="2", u="tsp", sc="lookalike")
c("1 cup Cheerwine, chilled", "INT unit regional-brand soda, prep", "plain", ["integer_decimal", "prep_note"],
  "Brand drink; note.", n="Cheerwine", q="1", u="cup", nt="chilled")
c("4 slices Texas toast", "INT count-unit(plural) regional bread", "plain", ["count_unit", "integer_decimal"],
  "§7.3: slice is a count unit.", n="Texas toast", q="4", u="slice")
c("12 oz raw crawfish tail meat, thawed", "INT oz raw shellfish, prep", "plain", ["form_cooked_raw", "integer_decimal", "prep_note"],
  "§7.6: 'raw' → form.", n="crawfish tail meat", q="12", u="oz", f="raw", nt="thawed")
c("1/3 cup Crystal hot sauce", "FRAC3 unit brand hot sauce", "plain", ["fraction_third", "seasoning_lookalike"],
  "Pepper-sauce lookalike.", n="Crystal hot sauce", q="1/3", u="cup", sc="lookalike")
c("4 oz Chinese sausage (lap cheong), sliced on the diagonal", "INT oz origin sausage (local name), prep phrase", "plain", ["integer_decimal", "prep_note"],
  "Bracket text and comma remark → note in source order.", n="Chinese sausage", q="4", u="oz", nt="lap cheong; sliced on the diagonal")
c("1 cup Oaxaca cheese, pulled into strings", "INT unit regional cheese, prep phrase", "plain", ["integer_decimal", "prep_note"],
  "§7.7 note.", n="Oaxaca cheese", q="1", u="cup", nt="pulled into strings")
c("3 cups cooked pinto beans, with some of their broth", "INT unit cooked food, with remark", "plain", ["form_cooked_raw", "integer_decimal", "prep_note"],
  "§7.6: cooked → form; remark → note.", n="pinto beans", q="3", u="cup", f="cooked", nt="with some of their broth")
c("2 cups basmati rice, soaked for 30 minutes", "INT unit rice, prep with time", "plain", ["integer_decimal", "prep_note"],
  "The time in the remark is not an amount → note.", n="basmati rice", q="2", u="cup", nt="soaked for 30 minutes")
c("1 tbsp tamarind paste, dissolved in 3 tbsp hot water", "INT unit paste, dissolved in INT unit food", "B", ["integer_decimal", "prep_note"],
  "§7.5 / §12.11: a remark amount measuring another food (the water) is a second amount → needs_review; first amount and food as read, the remark in note.",
  s="needs_review", n="tamarind paste", q="1", u="tbsp", nt="dissolved in 3 tbsp hot water", sev="medium", c12=["12.11"])
c("1/3 cup preserved lemon, rind only, finely chopped", "FRAC3 unit preserved food, part only, prep", "plain", ["fraction_third", "prep_note"],
  "Remarks joined in order.", n="preserved lemon", q="1/3", u="cup", nt="rind only; finely chopped")
c("150g Lancashire cheese, crumbled", "INTg regional cheese, prep", "plain", ["integer_decimal", "prep_note"],
  "UK cheese; metric weight.", n="Lancashire cheese", q="150", u="g", nt="crumbled")
c("4 Cumberland sausages", "INT regional sausages", "plain", ["integer_decimal"],
  "Bare count each; 'sausages' stays in name (§12.4: link is the count noun, not 'sausage').", n="Cumberland sausages", q="4", u="each")
c("300g puy lentils, rinsed", "INTg regional lentils, prep", "plain", ["integer_decimal", "prep_note"],
  "Metric weight.", n="puy lentils", q="300", u="g", nt="rinsed")
c("1 litre semi-skimmed milk", "INT litre-word UK milk", "plain", ["integer_decimal"],
  "'litre' = l.", n="semi-skimmed milk", q="1", u="l")
c("1 bunch silverbeet, stalks removed", "INT count-unit regional greens, prep", "plain", ["count_unit", "integer_decimal", "prep_note"],
  "Australian silverbeet (chard), by the bunch.", n="silverbeet", q="1", u="bunch", nt="stalks removed")
c("2 tbsp Lyle's black treacle", "INT unit brand treacle", "plain", ["integer_decimal"],
  "Brand product.", n="Lyle's black treacle", q="2", u="tbsp")
c("1 envelope Lipton onion soup mix", "INT envelope brand mix", "plain", ["count_unit", "integer_decimal"],
  "§7.3: envelope is a count unit.", n="Lipton onion soup mix", q="1", u="envelope")
c("1 can Campbell's condensed cream of mushroom soup", "INT container brand condensed soup", "plain", ["count_unit", "integer_decimal"],
  "§7.3: can is a count unit; 'cream of mushroom soup' is the product.", n="Campbell's condensed cream of mushroom soup", q="1", u="can")
c("1 cup French's crispy fried onions", "INT unit brand fried onions", "plain", ["integer_decimal"],
  "Brand product.", n="French's crispy fried onions", q="1", u="cup")
c("1 tsp MSG (Ac'cent)", "INT unit abbreviation (brand)", "plain", ["integer_decimal"],
  "Bracket text → note.", n="MSG", q="1", u="tsp", nt="Ac'cent")
c("1 lb mixed wild mushrooms (such as chanterelle, maitake and oyster), cleaned and torn into bite-size pieces",
  "INT unit mixed food (such as A, B and C), prep (long)", "plain", ["long_line", "integer_decimal", "prep_note"],
  "§7.6–7.7: the bracketed examples and the comma remark are note; the commas inside brackets are not top level.",
  n="mixed wild mushrooms", q="1", u="lb", nt="such as chanterelle, maitake and oyster; cleaned and torn into bite-size pieces")
c("2 1/2 cups low-sodium chicken stock, heated until steaming, plus more as needed to loosen the risotto at the end",
  "MIXED unit modifier stock, prep, plus more as needed (long)", "plain", ["long_line", "fraction", "prep_note"],
  "§7.7 / §7.10: comma remarks → note; an amount is stated, so amountUnstated stays null.",
  n="low-sodium chicken stock", q="2 1/2", u="cup", nt="heated until steaming; plus more as needed to loosen the risotto at the end")
c("1/4 cup toasted coconut flakes (optional, for topping)", "FRAC unit prep food (optional, purpose)", "plain", ["optional", "fraction", "prep_note"],
  "§7.9: 'optional' is a flag; the purpose stays note; participle accepted without.",
  n="toasted coconut flakes", q="1/4", u="cup", opt=True, nt="for topping", an=["coconut flakes"], anote=["toasted; for topping"])
c("1 lb wild-caught shrimp, fresh or frozen and thawed", "INT unit modifier food, sourcing or sourcing and prep", "plain", ["source_choice", "integer_decimal"],
  "§7.8 / §12.7(f): fresh-or-frozen after a comma is a note.", n="wild-caught shrimp", q="1", u="lb", nt="fresh or frozen and thawed", c12=["12.7"])
c("1 cup 4% milkfat cottage cheese", "INT unit PERCENT-milkfat food", "plain", ["percentage", "integer_decimal"],
  "§7.13: percentage is part of the product.", n="4% milkfat cottage cheese", q="1", u="cup")
c("Heavy cream – 1 1/4 cups", "Food – MIXED unit", "plain", ["quantity_after_name", "fraction", "unicode_text"],
  "Labelling guide: an amount after the food is the quantity.", n="Heavy cream", q="1 1/4", u="cup")
c("Eggs: 3 (large)", "Food: INT (size)", "plain", ["quantity_after_name", "integer_decimal", "size_word"],
  "Amount after the food is the quantity; the bracketed size word → note.", n="Eggs", q="3", u="each", nt="large")
c("Unsalted butter (cold), 6 tbsp", "Food (temp), INT unit", "plain", ["quantity_after_name", "integer_decimal", "seasoning_lookalike"],
  "Amount after the food is the quantity (a note never holds the line's amount); bracket text → note.",
  n="Unsalted butter", q="6", u="tbsp", nt="cold", sc="lookalike")
c("1 1/4 cups graham cracker crumbs (about 10 sheets)", "MIXED unit food crumbs (about INT count-unit)", "B", ["equivalent_quantity", "count_unit", "fraction"],
  "§12.A A3: crushing does not change the food; a count of whole crackers restates the prepared amount → equivalent 10 sheet, ready (approximate false, guide).",
  n="graham cracker crumbs", q="1 1/4", u="cup", eq=[("10", "sheet")], c12=["12.11"])
c("3 Roma tomatoes ($0.42 each), cored", "INT variety food (PRICE each), prep", "plain", ["price_annotation", "integer_decimal", "prep_note"],
  "§7.7: price dropped.", n="Roma tomatoes", q="3", u="each", nt="cored")
c("1 tbsp gochujang (Korean chili paste (see note))", "INT unit food (gloss (aside))", "plain", ["nested_parens", "integer_decimal"],
  "§7.7: nested brackets flattened into the note.", n="gochujang", q="1", u="tbsp", nt="Korean chili paste see note")

# ======================================================================================================
# Family A
# ======================================================================================================
c("two-thirds of a cup grated coconut", "hyphenated-FRACWORD of a unit food", "A", ["number_word", "fraction_third"],
  "§12.1: the fraction word before a unit is the amount → 2/3 cup ('of a' read like 'a'); leading participle accepted without (§7.6).",
  n="grated coconut", q="2/3", u="cup", an=["coconut"], anote=["grated"], c12=["12.1"], new=True)
c("one quarter pound ground lamb", "one FRACWORD massunit food", "A", ["number_word", "fraction"],
  "§12.1: 'one' does not multiply the fraction word → 1/4 lb.", n="ground lamb", q="1/4", u="lb", c12=["12.1"], new=True)
c("1 x large aubergine, cut into rounds", "1 x size food, prep", "A", ["integer_decimal", "size_word", "prep_note"],
  "§12.2 (new): count before 'x' and a food → 1 each; size word → note.", n="aubergine", q="1", u="each", nt="large; cut into rounds", c12=["12.2", "12.10"], new=True)
c("trout fillets (x4), pin bones removed", "food count-noun (xINT), prep", "A", ["quantity_after_name", "count_unit", "integer_decimal", "prep_note"],
  "§12.2 (new): '(xN)' after the food = x 4; §12.4: trout by the fillet → 4 fillet trout.",
  n="trout", q="4", u="fillet", nt="pin bones removed", c12=["12.2", "12.4"], new=True)
c("2 to 2½ cups vegetable stock, warm", "INT to INT+VULG unit food, temp", "A", ["range", "mixed_vulgar", "prep_note"],
  "§7.2: range 2..2 1/2 cup, needs_review.", s="needs_review", n="vegetable stock", q="2..2 1/2", u="cup", nt="warm", sev="medium")
c("3-4 tbsp ice-cold water", "INT-INT unit hyphen-temp food", "A", ["range", "integer_decimal"],
  "§7.2: '3-4' is a range → needs_review.", s="needs_review", n="ice-cold water", q="3..4", u="tbsp", sev="low")
c("▢ 3 tbsp gochujang mayo", "BOX-glyph INT unit compound condiment", "A", ["unicode_text", "integer_decimal"],
  "§12.13 (new): leading ▢ and a space are decoration.", n="gochujang mayo", q="3", u="tbsp", c12=["12.13"], new=True)
c("✓ 1 cup roasted red peppers, patted dry", "CHECK-glyph INT unit prep food, prep", "A", ["unicode_text", "integer_decimal", "prep_note", "seasoning_lookalike"],
  "§12.13 (new): leading ✓ is decoration. 'roasted red peppers' is a jarred product (kept whole; bare peppers accepted).",
  n="roasted red peppers", q="1", u="cup", nt="patted dry", an=["red peppers"], anote=["roasted; patted dry"], sc="lookalike", c12=["12.13"], new=True)
c("c) 2 tbsp Shaoxing rice wine", "letter) INT unit regional wine", "A", ["integer_decimal"],
  "§12.13 (new): 'c)' is an enumerator, not a unit (not 'cup').", n="Shaoxing rice wine", q="2", u="tbsp", c12=["12.13"], new=True)
c("1 kg plum tomatoes, quartered", "INT NNBSP kg food, prep", "A", ["unicode_text", "integer_decimal", "prep_note"],
  "§12.13: a narrow no-break space between amount and unit is a space → 1 kg.", n="plum tomatoes", q="1", u="kg", nt="quartered", c12=["12.13"])
c("-2 cups loosely packed arugula", "glued-hyphen INT unit adverb-participle food", "A", ["integer_decimal"],
  "§12.13: a hyphen glued to the leading number is a negative amount → no quantity, needs_review; unit and food as read.",
  s="needs_review", n="loosely packed arugula", q=None, u="cup", an=["arugula"], anote=["loosely packed"], sev="medium", c12=["12.13"], new=True)
c("1 small tub crème fraîche", "INT size unknown-container accented food", "A", ["integer_decimal", "unicode_text", "size_word"],
  "§12.14: 'tub' is not a registry unit → needs_review; the size word → note.",
  s="needs_review", n="crème fraîche", q="1", u=None, nt="small", anote=["small; tub", "small tub"], sev="medium", c12=["12.14"], new=True)
c("Scoop of vanilla gelato, to serve", "Imprecise-unit(scoop) of food (no number), to serve", "A", ["imprecise_unit"],
  "§12.15: singular imprecise unit = 1 scoop; with an amount the serving remark is note (§7.10).",
  n="vanilla gelato", q="1", u="scoop", nt="to serve")
c("2 slices twelve grain bread", "INT count-unit(plural) NUMWORD-component food", "A", ["number_word", "count_unit", "integer_decimal"],
  "§12.9 (new): 'twelve grain' names the bread by counting its grains → in name; 2 slice.", n="twelve grain bread", q="2", u="slice", c12=["12.9"], new=True)

# ======================================================================================================
# Family B
# ======================================================================================================
c("1/2 cup mascarpone or cream cheese, softened", "FRAC unit A or B, prep", "B", ["ingredient_alternatives", "fraction", "prep_note"],
  "§7.8: choice → [mascarpone, cream cheese]; 'softened' note.", s="needs_review", alt=["mascarpone", "cream cheese"], q="1/2", u="cup", nt="softened", sev="medium", c12=["12.7"])
c("1/4 cup fresh basil or parsley, chopped", "FRAC unit fresh A or B, prep", "B", ["ingredient_alternatives", "fraction", "prep_note"],
  "§12.7(c): 'fresh' shared → strict [fresh basil, fresh parsley]; [fresh basil, parsley] accepted; 'chopped' note.",
  s="needs_review", alt=["fresh basil", "fresh parsley"], aalt=[["fresh basil", "parsley"], ["basil", "parsley"]], q="1/4", u="cup", nt="chopped", sev="low", c12=["12.7"], new=True)
c("1 lb fresh spinach or 10 oz frozen", "INT unit form food or INT unit form", "B", ["ingredient_alternatives", "integer_decimal"],
  "§12.7(g)+(d): options with their own amounts → first option's 1 lb; the bare 'frozen' takes the head → [fresh spinach, frozen spinach].",
  s="needs_review", alt=["fresh spinach", "frozen spinach"], q="1", u="lb", sev="medium", c12=["12.7"], new=True)
c("1 cup fresh peas and fava beans", "INT unit fresh A and B", "B", ["integer_decimal"],
  "§12.A A4: two foods joined by 'and' after one amount → list → needs_review, name null.", s="needs_review", q="1", u="cup", sev="medium", c12=["12.7"], new=True)
c("2 cups black beans and rice", "INT unit A and B (product-or-list)", "B", ["integer_decimal"],
  "§12.A A4: a product-or-list pair (like 'peas and carrots') is debatable. Labelled as a list (needs_review, name null); pre-registered debatable.",
  s="needs_review", q="2", u="cup", sev="medium", c12=["12.7"], new=True, deb=True)
c("2 cups chopped kale (from about 1/2 bunch)", "INT unit prep greens (from about FRAC count-unit)", "B", ["equivalent_quantity", "count_unit", "prep_note"],
  "§12.A A3: leaves taken from the plant restate the bunch → equivalent 1/2 bunch, ready; approximate false (guide).",
  n="chopped kale", q="2", u="cup", eq=[("1/2", "bunch")], an=["kale"], anote=["chopped"], c12=["12.11"], new=True)
c("3/4 cup pitted dates (about 12 dates)", "FRAC unit prep food (about INT food)", "B", ["equivalent_quantity", "fraction", "prep_note"],
  "§12.11 / A3: a count of the same food restates the amount → equivalent 12 each, ready; participle accepted without.",
  n="pitted dates", q="3/4", u="cup", eq=[("12", "each")], an=["dates"], anote=["pitted"], c12=["12.11"])
c("1 lb ground beef (or 1 lb ground turkey)", "INT unit food (or INT unit food)", "B", ["ingredient_alternatives", "integer_decimal"],
  "Guide convention (h2) and §12.7(g): a parenthetical naming another ingredient is a choice; options with own amounts → first option's 1 lb.",
  s="needs_review", alt=["ground beef", "ground turkey"], q="1", u="lb", sev="medium", c12=["12.7"])
c("1 cup long-grain rice (makes about 3 cups cooked)", "INT unit food (makes about INT unit state)", "B", ["integer_decimal"],
  "§12.11: an amount of another state ('makes ... cooked') is a second amount → needs_review, remark in note.",
  s="needs_review", n="long-grain rice", q="1", u="cup", nt="makes about 3 cups cooked", sev="medium", c12=["12.11"])

# ======================================================================================================
# Family C
# ======================================================================================================
c("4 (6 oz) cups Siggi's skyr", "INT (INT unit) cups brand food", "C", ["package_size", "count_unit", "integer_decimal"],
  "§12.5 restated: count + package size + cups → 4 container, packageSize 6 oz.", n="Siggi's skyr", q="4", u="container", pk=("6", "oz"), c12=["12.5"])
c("4 cups (4 oz each) mandarin oranges in juice", "INT cups (INT unit each) food", "C", ["package_size", "count_unit", "integer_decimal"],
  "§12.5 restated: cups with a per-cup size are containers → 4 container, packageSize 4 oz.", n="mandarin oranges in juice", q="4", u="container", pk=("4", "oz"), c12=["12.5"])
c("1 bag frozen butternut squash cubes (10 oz)", "INT container frozen food (SIZE)", "C", ["package_size", "count_unit", "integer_decimal"],
  "§12.A A6: bracketed size after the food → packageSize 10 oz; 'cubes' stays in name (no bare count).",
  n="frozen butternut squash cubes", q="1", u="bag", pk=("10", "oz"), c12=["12.3"], new=True)
c("1 container whole-milk ricotta (15 oz), drained", "INT container food (SIZE), prep", "C", ["package_size", "count_unit", "integer_decimal", "prep_note"],
  "§12.A A6: bracketed size after the food → packageSize 15 oz; 'drained' note.", n="whole-milk ricotta", q="1", u="container", pk=("15", "oz"), nt="drained", c12=["12.3"], new=True)
c("1 carton liquid egg whites (16 fl oz)", "INT container food (SIZE fl oz)", "C", ["package_size", "count_unit", "oz_vs_floz", "integer_decimal"],
  "§12.A A6: packageSize 16 fl_oz.", n="liquid egg whites", q="1", u="carton", pk=("16", "fl_oz"), c12=["12.3"], new=True)
c("8.8 oz package Italian ladyfingers", "DEC oz singular-container food", "C", ["package_size", "count_unit"],
  "§12.3 (new): size before a singular container → 1 package, packageSize 8.8 oz.", n="Italian ladyfingers", q="1", u="package", pk=("8.8", "oz"), c12=["12.3"], new=True)
c("2 (1 1/2-inch-thick) bone-in rib-eyes", "INT (thickness) plural-cut", "C", ["integer_decimal", "size_word"],
  "§7.13: a bracketed size of the item → note; 2 each.", n="bone-in rib-eyes", q="2", u="each", nt="1 1/2-inch-thick")
c("one 4-pound boneless pork loin roast", "WORD SIZE singular-food", "C", ["number_word", "equivalent_quantity"],
  "§12.3: a single item's weight restates the amount → 1 each, equivalent 4 lb.", n="boneless pork loin roast", q="1", u="each", eq=[("4", "lb")], c12=["12.3"], new=True)
c("2 dill sprigs, for garnish", "INT herb count-noun(plural), purpose", "C", ["count_unit", "integer_decimal"],
  "§12.4: dill by the sprig → 2 sprig; with an amount the garnish remark is note (§7.10).", n="dill", q="2", u="sprig", nt="for garnish", c12=["12.4"])
c("10 rib tips", "INT singular-count-word plural-food (BBQ cut)", "C", ["integer_decimal"],
  "§12.A A1 (new): singular count word 'rib' after a count above one, before a plural countable food, begins the name → 10 each 'rib tips'.",
  n="rib tips", q="10", u="each", c12=["12.4"], new=True)
c("2 large heads broccoli, cut into florets", "INT size count-unit(plural) food, prep", "C", ["count_unit", "size_word", "integer_decimal", "prep_note"],
  "§12.A A1: a size word between number and unit changes nothing → 2 head; 'large' → note.",
  n="broccoli", q="2", u="head", nt="large; cut into florets", c12=["12.4", "12.10"])
c("6 jumbo sea scallops, side muscle removed", "INT size food, prep", "C", ["size_word", "integer_decimal", "prep_note"],
  "§12.10: 'jumbo' sizes the counted scallops → note.", n="sea scallops", q="6", u="each", nt="jumbo; side muscle removed", c12=["12.10"])

# ======================================================================================================
# Family D
# ======================================================================================================
c("Equipment: stand mixer with paddle attachment", "Equipment: tool phrase", "D", ["heading_non_ingredient"],
  "§12.8: non-food item → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("Freezer-safe zip-top bags", "non-food item (plural)", "D", ["heading_non_ingredient"],
  "§12.8: non-food item → unsupported.", s="unsupported", c12=["12.8"], new=True)
c("Chocolate Ganache:", "food-heading with colon", "D", ["heading_non_ingredient"],
  "§12.8: a line with no amount ending in ':' is a heading.", s="unsupported", c12=["12.8"])
c("For the shortbread base", "For the dish-word component", "D", ["heading_non_ingredient"],
  "§12.8: starts with 'For the', no amount → heading.", s="unsupported", c12=["12.8"])
c("Topping (optional)", "generic component (optional)", "D", ["heading_non_ingredient", "optional"],
  "§12.8: a generic component word with no amount is a heading; the '(optional)' does not make it an ingredient.", s="unsupported", c12=["12.8"], new=True)
c("Romesco", "specific food (no amount)", "D", ["quantity_missing"],
  "§12.8: a specific food with no amount → needs_review (quantity_missing).", s="needs_review", n="Romesco", sev="medium", c12=["12.8"])
c("Garnish (optional): microgreens", "Role-label (optional): food", "D", ["unstated_amount", "optional"],
  "§12.8: role label + food → for_garnish; '(optional)' → flag (§7.9).", n="microgreens", au="for_garnish", opt=True, c12=["12.8"], new=True)
c("1 tsp sodium-free baking powder", "INT unit nutrient-word food", "D", ["integer_decimal"],
  "§12.8: a food whose name contains a nutrition word stays an ingredient.", n="sodium-free baking powder", q="1", u="tsp", c12=["12.8"])

# round 3b: §12.A A5 positive case and A4 modifiers before one head
c("12 drop dumplings", "INT singular-imprecise-word plural-food (dumplings)", "C", ["integer_decimal"],
  "§12.A A5 (new): a singular imprecise-unit word ('drop') after a count above one, before a plural countable food, begins the name → 12 each 'drop dumplings'.",
  n="drop dumplings", q="12", u="each", c12=["12.4"], new=True)
c("1 pint yellow and red cherry tomatoes, halved", "INT pint colour and colour head, prep", "B", ["quart_pint_gallon", "integer_decimal", "prep_note"],
  "§12.A A4: modifiers joined by 'and' before one head are one food (cf. 'red and yellow bell peppers') → ready; pint stays pint (§7.3).",
  n="yellow and red cherry tomatoes", q="1", u="pint", nt="halved", c12=["12.7"])
