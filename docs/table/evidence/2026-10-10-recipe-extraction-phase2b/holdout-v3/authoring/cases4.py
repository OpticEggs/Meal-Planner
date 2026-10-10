# Round 4: restructured lines so that no mechanical construction shape (shape.py; food words collapse) is used
# more than twice. Each line here replaces a line whose shape was over-used; the replaced lines were pruned.

# plain: "INT UNIT W , NOTE"
c("1½ lb fingerling potatoes, halved lengthwise", "INT+VULG unit food, prep", "plain", ["mixed_vulgar", "prep_note"],
  "§7.1: '1½' = 3/2; comma remark → note.", n="fingerling potatoes", q="1 1/2", u="lb", nt="halved lengthwise")
c("200g paneer, cubed", "INTunit(glued) food, prep", "plain", ["integer_decimal", "prep_note"],
  "Glued metric amount; comma remark → note.", n="paneer", q="200", u="g", nt="cubed")
c("2 tsp instant espresso powder (optional but recommended)", "INT unit food (optional remark)", "plain", ["optional", "integer_decimal"],
  "§7.9: 'optional' is a flag; the rest of the remark is note (null accepted).",
  n="instant espresso powder", q="2", u="tsp", opt=True, nt="but recommended", anote=[None])
c("1 pound lamb merguez links, casings removed", "INT unit food count-noun(plural) (unit stated), prep", "plain", ["integer_decimal", "prep_note"],
  "§12.4: with another unit stated (pound) 'links' stays in name.", n="lamb merguez links", q="1", u="lb", nt="casings removed", c12=["12.4"])
c("1 cup heavy cream, chilled, whipped to soft peaks", "INT unit food, prep, prep", "plain", ["integer_decimal", "prep_note"],
  "Two comma remarks → note, in order.", n="heavy cream", q="1", u="cup", nt="chilled; whipped to soft peaks")
c("1 cup toor dal (split pigeon peas), rinsed", "INT unit food (gloss), prep", "plain", ["integer_decimal", "prep_note"],
  "Bracket gloss and comma remark → note in order.", n="toor dal", q="1", u="cup", nt="split pigeon peas; rinsed")
c("1.25 lb tomatillos, husked and rinsed", "DEC unit food, prep and prep", "plain", ["integer_decimal", "prep_note"],
  "§7.1: 1.25 = 5/4 exactly.", n="tomatillos", q="1 1/4", u="lb", nt="husked and rinsed")
c("¾ lb andouille sausage, sliced into coins", "VULG unit food, prep phrase", "plain", ["fraction", "unicode_text", "prep_note"],
  "§7.1: ¾.", n="andouille sausage", q="3/4", u="lb", nt="sliced into coins")
c("1 large bunch collard greens, stems removed and leaves sliced", "INT size count-unit food, prep", "plain", ["count_unit", "size_word", "integer_decimal", "prep_note"],
  "§12.10 / §12.15: a size word before the unit → note; 1 bunch.", n="collard greens", q="1", u="bunch", nt="large; stems removed and leaves sliced", c12=["12.10"])
c("1 tsp kasuri methi (dried fenugreek leaves), crushed between your palms", "INT unit food (gloss), prep phrase", "plain", ["integer_decimal", "prep_note"],
  "Bracket gloss and comma remark → note.", n="kasuri methi", q="1", u="tsp", nt="dried fenugreek leaves; crushed between your palms")

# plain: "INT UNIT CAP W"
c("3½ cups Rice Krispies cereal", "INT+VULG unit brand food", "plain", ["mixed_vulgar"],
  "§7.1: '3½' = 7/2; brand kept.", n="Rice Krispies cereal", q="3 1/2", u="cup")
c("2 heaping tbsp Bisto gravy granules", "INT degree-word unit brand food", "plain", ["integer_decimal"],
  "§12.15: degree words before the unit ('heaping') → note; the amount is 2 tbsp.", n="Bisto gravy granules", q="2", u="tbsp", nt="heaping")
c("1½ tsp Calabrian chili paste", "INT+VULG unit-abbr regional food", "plain", ["mixed_vulgar"],
  "§7.1: '1½'.", n="Calabrian chili paste", q="1 1/2", u="tsp")
c("2 tbsp Kewpie mayo, for drizzling", "INT unit brand food, purpose", "plain", ["integer_decimal"],
  "§7.10: with an amount the purpose remark is note and amountUnstated stays null.", n="Kewpie mayo", q="2", u="tbsp", nt="for drizzling")
c("1 heaped tbsp Branston pickle", "INT degree-word(UK) unit brand food", "plain", ["integer_decimal"],
  "§12.15: degree word 'heaped' → note.", n="Branston pickle", q="1", u="tbsp", nt="heaped")
c("2 tbsp Lao Gan Ma chili crisp, plus more to serve", "INT unit brand food, plus more to serve", "plain", ["integer_decimal"],
  "§7.10: amount stated → the 'plus more' remark is note.", n="Lao Gan Ma chili crisp", q="2", u="tbsp", nt="plus more to serve")
c("0.25 cup Bragg liquid aminos", "DEC(leading 0) unit brand food", "plain", ["integer_decimal"],
  "§7.1: 0.25 = 1/4 exactly.", n="Bragg liquid aminos", q="1/4", u="cup")
c("1 1/2 tbsp Better Than Bouillon chicken base", "MIXED unit brand food", "plain", ["fraction"],
  "§7.1 mixed number.", n="Better Than Bouillon chicken base", q="1 1/2", u="tbsp")
c("⅓ cup Steen's cane syrup", "VULG3 unit brand food", "plain", ["fraction_third", "unicode_text"],
  "§7.1: ⅓ exact.", n="Steen's cane syrup", q="1/3", u="cup")
c("3 tbsp Hellmann's mayonnaise (Best Foods west of the Rockies)", "INT unit brand food (remark)", "plain", ["integer_decimal"],
  "Bracket remark → note.", n="Hellmann's mayonnaise", q="3", u="tbsp", nt="Best Foods west of the Rockies")
c("1/4 cup Patak's mild curry paste", "FRAC unit brand heat-grade food", "plain", ["fraction"],
  "§12.10: 'mild' states a heat grade → name.", n="Patak's mild curry paste", q="1/4", u="cup", c12=["12.10"])

# plain: "INT UNIT W"
c("¾ lb extra-wide egg noodles", "VULG unit food", "plain", ["fraction", "unicode_text"],
  "§7.1: ¾.", n="extra-wide egg noodles", q="3/4", u="lb")
c("1½ qt low-sodium chicken stock", "INT+VULG qt food", "plain", ["mixed_vulgar", "quart_pint_gallon"],
  "§7.3: quart stays quart.", n="low-sodium chicken stock", q="1 1/2", u="quart")
c("1 1/4 cups glutinous rice flour", "MIXED unit food", "plain", ["fraction"],
  "§7.1 mixed number.", n="glutinous rice flour", q="1 1/4", u="cup")
c("1 qt. fresh blackberries (about 4 cups)", "INT qt. food (about INT unit)", "A", ["quart_pint_gallon", "equivalent_quantity", "integer_decimal"],
  "§12.6: 4 cups = 1 quart exactly → restatement in equivalents, ready; 'about' qualifies only the restatement (guide).",
  n="fresh blackberries", q="1", u="quart", eq=[("4", "cup")], c12=["12.6"])

# plain: other over-used shapes
c("1½ cups Rainier cherries, pitted and halved", "INT+VULG unit brand-variety food, prep and prep", "plain", ["mixed_vulgar", "prep_note"],
  "§7.1: '1½'.", n="Rainier cherries", q="1 1/2", u="cup", nt="pitted and halved")
c("2 cups crushed Utz potato chips", "INT unit prep brand food", "plain", ["integer_decimal", "prep_note"],
  "Leading participle accepted without (§7.6).", n="crushed Utz potato chips", q="2", u="cup", an=["Utz potato chips"], anote=["crushed"])
c("1 tbsp whole Sichuan peppercorns, toasted and ground", "INT unit whole origin food, prep and prep", "plain", ["integer_decimal", "prep_note", "seasoning_lookalike"],
  "'whole' peppercorns is the product form; remarks → note; lookalike.", n="whole Sichuan peppercorns", q="1", u="tbsp", nt="toasted and ground", sc="lookalike")
c("¼ tsp mixed spice", "VULG unit spice-blend", "plain", ["fraction", "unicode_text"],
  "UK 'mixed spice'.", n="mixed spice", q="1/4", u="tsp")
c("1 cup desiccated coconut (unsweetened)", "INT unit form food (remark)", "plain", ["integer_decimal"],
  "Bracket remark → note.", n="desiccated coconut", q="1", u="cup", nt="unsweetened")
c("two plantains, very ripe (mostly black)", "WORD food, remark (remark)", "plain", ["number_word", "prep_note"],
  "§7.1 'two' = 2; remarks → note.", n="plantains", q="2", u="each", nt="very ripe; mostly black")
c("1/2 cup sliced pimento-stuffed green olives", "FRAC unit prep hyphen-compound food", "plain", ["fraction", "prep_note"],
  "Leading participle accepted without (§7.6).", n="sliced pimento-stuffed green olives", q="1/2", u="cup",
  an=["pimento-stuffed green olives"], anote=["sliced"])
c("1/2 cup dry white wine (such as Pinot Grigio)", "FRAC unit food (such as example)", "plain", ["fraction"],
  "Bracket remark → note.", n="dry white wine", q="1/2", u="cup", nt="such as Pinot Grigio")
c("1/2 cup unsweetened Dutch-process cocoa powder, sifted", "FRAC unit modifier proper-process food, prep", "plain", ["fraction", "prep_note"],
  "Descriptors kept in name.", n="unsweetened Dutch-process cocoa powder", q="1/2", u="cup", nt="sifted")
c("1/4 lb Mexican-style chorizo (casings removed)", "FRAC unit proper-style food (prep)", "plain", ["fraction", "prep_note"],
  "Bracket text → note.", n="Mexican-style chorizo", q="1/4", u="lb", nt="casings removed")
c("1/2 lb Velveeta, cubed", "FRAC unit brand, prep", "plain", ["fraction", "prep_note"],
  "Brand product.", n="Velveeta", q="1/2", u="lb", nt="cubed")
c("Ice water (as needed)", "food (as needed)", "plain", ["unstated_amount"],
  "§7.10: 'as needed' in brackets → as_needed, ready.", n="Ice water", au="as_needed")
c("1 small head romaine, chopped", "INT size count-unit food, prep", "plain", ["count_unit", "size_word", "integer_decimal", "prep_note"],
  "§12.A A1 / §12.10: a size word between number and unit changes nothing → 1 head; 'small' → note.",
  n="romaine", q="1", u="head", nt="small; chopped", c12=["12.10"])
c("3 Tbsp. Calvados (apple brandy)", "INT Unit-abbr. proper-food (gloss)", "plain", ["integer_decimal"],
  "Bracket gloss → note.", n="Calvados", q="3", u="tbsp", nt="apple brandy")
c("2 roasted Hatch green chiles, peeled", "INT prep regional food, prep", "plain", ["integer_decimal", "prep_note"],
  "Leading participle accepted without (§7.6).", n="roasted Hatch green chiles", q="2", u="each", nt="peeled",
  an=["Hatch green chiles"], anote=["roasted; peeled"])

# C family
c("4 prosciutto di Parma slices", "INT food(proper multiword) slices", "C", ["count_unit", "integer_decimal"],
  "§12.4: prosciutto by the slice → 4 slice 'prosciutto di Parma'.", n="prosciutto di Parma", q="4", u="slice", c12=["12.4"])
c("4 bacon strips (thick-cut), chopped", "INT food count-noun(plural) (cut), prep", "C", ["count_unit", "integer_decimal", "prep_note"],
  "§12.4: bacon by the strip → 4 strip; bracket and comma remarks → note.", n="bacon", q="4", u="strip", nt="thick-cut; chopped", c12=["12.4"])
c("2 small escarole heads", "INT size food heads", "C", ["count_unit", "size_word", "integer_decimal"],
  "§12.4: escarole by the head → 2 head; 'small' → note (§12.10).", n="escarole", q="2", u="head", nt="small", c12=["12.4", "12.10"])
c("2 med. sweet onions", "INT size-abbr. food (no note)", "C", ["size_word", "integer_decimal"],
  "§12.10: 'med.' → note.", n="sweet onions", q="2", u="each", nt="med.", c12=["12.10"])
c("6 large cabbage leaves, blanched", "INT size food leaves (stays in name), prep", "C", ["size_word", "integer_decimal", "prep_note"],
  "§12.4 (new): 'cabbage' alone names a different product → 'cabbage leaves' stays in name, each; 'large' → note.",
  n="cabbage leaves", q="6", u="each", nt="large; blanched", c12=["12.4", "12.10"], new=True)

# A family
c("12 oz/350 g spaghetti", "INT unit/INT metric-unit food", "A", ["equivalent_quantity", "integer_decimal"],
  "§12.6: an amount after '/' restates: 12 oz = 340.2 g, 350 g within 7 % → equivalent, ready.",
  n="spaghetti", q="12", u="oz", eq=[("350", "g")], c12=["12.6"])
c("1 cup half-and-half (240 ml / 8 fl oz)", "INT unit food (INT ml / INT fl oz)", "A", ["equivalent_quantity", "integer_decimal", "oz_vs_floz"],
  "§12.6: each restatement is checked separately (240 ml within 7 %; 8 fl oz = 1 cup exactly) → both equivalents, ready.",
  n="half-and-half", q="1", u="cup", eq=[("240", "ml"), ("8", "fl_oz")], c12=["12.6"])
c("2 half-gallons of buttermilk", "INT FRACWORD-unit(plural) of food", "A", ["number_word", "quart_pint_gallon", "integer_decimal"],
  "§12.1: a count ≥ 2 before a plural fraction-unit multiplies it: 2 × 1/2 gallon = 1 gallon; 'of' removed.",
  n="buttermilk", q="1", u="gallon", c12=["12.1"], new=True)

# B family
c("2 Roma tomatoes, chopped (about 1 cup)", "INT variety food, prep (about INT unit)", "B", ["equivalent_quantity", "integer_decimal", "prep_note"],
  "§12.A A3: a prepared amount of the same food restates the count ('1 large onion (about 2 cups chopped)') → equivalent 1 cup, ready; approximate false (guide).",
  n="Roma tomatoes", q="2", u="each", eq=[("1", "cup")], nt="chopped", c12=["12.11"])
c("1 lb strawberries, hulled and quartered (a few left whole for garnish)", "INT unit food, prep (remark)", "B", ["integer_decimal", "prep_note"],
  "§7.7: the comma remark including its bracket → note; 'a few' is not an amount.",
  n="strawberries", q="1", u="lb", nt="hulled and quartered; a few left whole for garnish")

# D family
c("12 paper cupcake liners", "INT non-food item(plural)", "D", ["heading_non_ingredient", "integer_decimal"],
  "§12.8: liners are a non-food item even with a count → unsupported.", s="unsupported", c12=["12.8"], new=True)

# Round 5: second shape/dedup pass
c("225g (1 cup) golden caster sugar", "INTunit(glued) (INT unit) food", "A", ["equivalent_quantity", "integer_decimal"],
  "§12.6: mass↔volume restatements are not checked → 1 cup is an equivalent, ready.", n="golden caster sugar", q="225", u="g", eq=[("1", "cup")], c12=["12.6"])
c("1 lamb backstrap (about 500 g), trimmed", "INT food (about SIZE), prep", "C", ["equivalent_quantity", "integer_decimal", "prep_note"],
  "§12.3: a single item's weight restates the amount → 1 each, equivalent 500 g; 'about' qualifies only the restatement (guide).",
  n="lamb backstrap", q="1", u="each", eq=[("500", "g")], nt="trimmed", c12=["12.3"], new=True)
c("1 lb. boudin links (casings removed)", "INT unit. food count-noun(plural, unit stated) (prep)", "plain", ["integer_decimal", "prep_note"],
  "§12.4: with another unit stated, 'links' stays in name; bracket → note.", n="boudin links", q="1", u="lb", nt="casings removed", c12=["12.4"])
c("3 tbsp hemp hearts (shelled hemp seeds), plus extra for sprinkling", "INT unit food (gloss), plus extra for purpose", "plain", ["integer_decimal", "prep_note"],
  "§7.7 / §7.10: bracket gloss and 'plus extra' remark → note.", n="hemp hearts", q="3", u="tbsp", nt="shelled hemp seeds; plus extra for sprinkling")
c("½ lb. dried linguine", "VULG unit. form food", "plain", ["fraction", "unicode_text"],
  "§7.1: ½; 'dried' product form.", n="dried linguine", q="1/2", u="lb")
c("1½ cups frozen pearl onions (thawed and patted dry)", "INT+VULG unit form food (prep)", "plain", ["mixed_vulgar", "prep_note"],
  "§7.1: '1½'; bracket text → note.", n="frozen pearl onions", q="1 1/2", u="cup", nt="thawed and patted dry")
c("2½ Tbs. tahini (sesame paste)", "INT+VULG Tbs. food (gloss)", "plain", ["mixed_vulgar"],
  "'Tbs.' = tablespoon; bracket gloss → note.", n="tahini", q="2 1/2", u="tbsp", nt="sesame paste")
c("1 Scotch bonnet or habanero chile", "INT PRODUCT or M2 head", "B", ["ingredient_alternatives", "integer_decimal", "seasoning_lookalike"],
  "§12.7(b): 'Scotch bonnet' alone already names a chile → strict as written; [Scotch bonnet chile, habanero chile] accepted; needs_review.",
  s="needs_review", alt=["Scotch bonnet", "habanero chile"], aalt=[["Scotch bonnet chile", "habanero chile"]], q="1", u="each", sev="medium", sc="lookalike", c12=["12.7"])
c("3 stalk celery (inner, pale ribs)", "INT singular-count-word uncounted-food (remark)", "C", ["count_unit", "integer_decimal"],
  "§12.A A1: sloppy plural before an uncounted food stays the unit → 3 stalk; bracket → note.", n="celery", q="3", u="stalk", nt="inner, pale ribs", c12=["12.4"])
c("¼ cup unsalted butter (½ stick), at room temperature", "VULG unit food (VULG count-unit), prep", "plain", ["fraction", "equivalent_quantity", "unicode_text", "prep_note", "seasoning_lookalike"],
  "§11.1 / labelling guide: a restatement in a count unit is an equivalent (½ stick); comma remark → note.",
  n="unsalted butter", q="1/4", u="cup", eq=[("1/2", "stick")], nt="at room temperature", sc="lookalike")

# Round 6: replacements for review-band near copies
c("8 árbol chiles (dried)", "INT accented food (form)", "plain", ["integer_decimal", "unicode_text"],
  "§7.6: bracket text → note; Unicode kept (§7.14).", n="árbol chiles", q="8", u="each", nt="dried")
c("0.5 cup cold-brew coffee concentrate", "DEC unit hyphen-compound food", "plain", ["integer_decimal"],
  "§7.1: 0.5 = 1/2.", n="cold-brew coffee concentrate", q="1/2", u="cup")
c("1 giant sweet potato (about 1½ lb)", "INT size food (about INT+VULG unit)", "C", ["size_word", "equivalent_quantity", "integer_decimal"],
  "§12.10: 'giant' → note; §12.3: a single item's weight restates the amount → equivalent 1 1/2 lb ('about' qualifies only the restatement).",
  n="sweet potato", q="1", u="each", eq=[("1 1/2", "lb")], nt="giant", c12=["12.10", "12.3"], new=True)
c("1 medium Spanish onion, thinly sliced into half-moons", "INT size proper food, prep phrase", "plain", ["size_word", "integer_decimal", "prep_note"],
  "§12.10: 'medium' → note.", n="Spanish onion", q="1", u="each", nt="medium; thinly sliced into half-moons", c12=["12.10"])
c("a big pinch of Maldon salt", "a size imprecise-unit of brand salt", "plain", ["imprecise_unit", "size_word", "number_word", "seasoning_ordinary"],
  "§7.1 'a' = 1; §12.15: size word before the unit → note; ordinary salt.", n="Maldon salt", q="1", u="pinch", nt="big", sc="ordinary_salt")
c("1 green capsicum, seeds removed, cut into strips", "INT colour regional-food, prep, prep", "plain", ["integer_decimal", "prep_note", "seasoning_lookalike"],
  "Australian capsicum (bell pepper, a lookalike); remarks → note.", n="green capsicum", q="1", u="each", nt="seeds removed; cut into strips", sc="lookalike")
