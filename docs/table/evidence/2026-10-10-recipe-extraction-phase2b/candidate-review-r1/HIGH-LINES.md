# semantic-v2 — every HIGH line (C2 high, or any S1/S3/S4/S5/S6) on R1 probes

Columns: set · group · flags · input · R1 label · semantic-v2 reading · semantic-v1 class.

## Firm labels (129)

| set | group | input | label | v2 | v1 |
|---|---|---|---|---|---|
| main | A-fracword | `2 half-pound strip steaks` | ready name="strip steaks" q=2 u=each pkg=- alts=[] | C2 high [S7] — ready name="steaks" q=2 u=strip pkg=- alts=[] note="half-pound" | C2 medium [] |
| main | A-remark | `3 tablespoons lemon juice (about 1 lemon)` | needs_review name="lemon juice" q=3 u=tbsp pkg=- alts=[] | C2 high [S4] — ready name="lemon juice" q=3 u=tbsp pkg=- alts=[] note="about 1 lemon" | C2 high [S4] |
| main | A-remark | `1 cup grated carrot (2 medium carrots)` | needs_review name="grated carrot\|carrot" q=1 u=cup pkg=- alts=[] | C2 high [S4] — ready name="grated carrot" q=1 u=cup pkg=- alts=[] note="2 medium carrots" | C2 high [S4] |
| main | A-remark | `1 large onion (about 2 cups chopped)` | needs_review name="onion" q=1 u=each pkg=- alts=[] | C2 high [S4] — ready name="onion" q=1 u=each pkg=- alts=[] note="large; about 2 cups chopped" | C2 high [S4] |
| main | A-unknown S | `1 gill single cream` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="gill single cream" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| main | A-unknown S | `2 drams vanilla essence` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="drams vanilla essence" q=2 u=each pkg=- alts=[] note=null | C2 high [S4] |
| main | A-unknown S | `1 tumbler orange juice` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="tumbler orange juice" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| main | A-unknown S | `2 ladles chicken stock` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="ladles chicken stock" q=2 u=each pkg=- alts=[] note=null | C2 high [S4] |
| main | A-unknown S | `1 teacup caster sugar` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="teacup caster sugar" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| main | A-unknown S | `1 dessert spoon cocoa powder` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="dessert spoon cocoa powder" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| main | A-unknown S | `1 thumb fresh ginger` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="thumb fresh ginger" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| main | B-forward | `2 tbsp fresh oregano or dried` | needs_review name=null q=2 u=tbsp pkg=- alts="fresh oregano;dried oregano" | C2 high [S4 S5] — ready name="fresh oregano" q=2 u=tbsp pkg=- alts=[] note="or dried" | C2 high [S4 S5] |
| main | B-and S | `2 cups chopped celery and carrots` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="chopped celery and carrots" q=2 u=cup pkg=- alts=[] note=null | C2 high [S4] |
| main | B-and S | `1 cup onion and bell pepper, diced` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="onion and bell pepper" q=1 u=cup pkg=- alts=[] note="diced" | C2 high [S4] |
| main | B-and S | `1/4 cup chopped parsley and mint` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="chopped parsley and mint" q=1/4 u=cup pkg=- alts=[] note=null | C2 high [S4] |
| main | B-and S | `2 cups strawberries and blueberries` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="strawberries and blueberries" q=2 u=cup pkg=- alts=[] note=null | C2 high [S4] |
| main | C-identity | `2 strip steaks` | ready name="strip steaks" q=2 u=each pkg=- alts=[] | C2 high [S7] — ready name="steaks" q=2 u=strip pkg=- alts=[] note=null | C2 high [S7] |
| main | C-identity | `4 cube steaks` | ready name="cube steaks" q=4 u=each pkg=- alts=[] | C2 high [S7] — ready name="steaks" q=4 u=cube pkg=- alts=[] note=null | C2 high [S7] |
| main | C-identity | `2 sheet cakes` | ready name="sheet cakes" q=2 u=each pkg=- alts=[] | C2 high [S7] — ready name="cakes" q=2 u=sheet pkg=- alts=[] note=null | C2 high [S7] |
| main | D-nutrition | `Serving size 2 cookies (40 g)` | unsupported name=null q=- u=- pkg=- alts=[] | C8 [S1] — needs_review name="Serving size" q=40 u=g pkg=- alts=[] note="2 cookies" | C8 [S1] |
| main | D-nutrition | `Calories: 412kcal \| Carbohydrates: 52g \| Protein: 18g` | unsupported name=null q=- u=- pkg=- alts=[] | C8 [S1] — needs_review name="Carbohydrates" q=412 u=each pkg=- alts=[] note="Calories; kcal; 52g \| Protein: 18g" | C8 [S1] |
| main | D-nutrition | `Sat. fat: 3 g` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="Sat. fat" q=3 u=g pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-rating | `★★★★★ (212)` | unsupported name=null q=- u=- pkg=- alts=[] | C8 [S1] — needs_review name=null q=212 u=each pkg=- alts=[] note=null | C8 [S1] |
| main | D-equipment | `1 rolling pin` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="rolling pin" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 (9-inch) pie plate` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="pie plate" q=1 u=each pkg=- alts=[] note="9-inch" | C2 high [S1 S8] |
| main | D-equipment | `1 large Dutch oven` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="Dutch oven" q=1 u=each pkg=- alts=[] note="large" | C2 high [S1 S8] |
| main | D-equipment | `1 12-cup Bundt pan` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="Bundt pan" q=1 u=each pkg=- alts=[] note=null | C8 [S1] |
| main | D-equipment | `1 4-quart slow cooker` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="slow cooker" q=1 u=each pkg=- alts=[] note=null | C8 [S1] |
| main | D-equipment | `1 2-quart baking dish` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="baking dish" q=1 u=each pkg=- alts=[] note=null | C8 [S1] |
| main | D-equipment | `6 popsicle sticks` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="popsicle" q=6 u=stick pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 roll kitchen twine` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="roll kitchen twine" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 box toothpicks` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="toothpicks" q=1 u=box pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `12 paper baking cups` | unsupported name=null q=- u=- pkg=- alts=[] | C8 [S1] — needs_review name="paper baking cups" q=12 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `24 mini cupcake liners` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="mini cupcake liners" q=24 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `2 sheets aluminum foil` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="aluminum foil" q=2 u=sheet pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 gallon-size zip-top bag` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="gallon-size zip-top bag" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 kitchen scale` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="kitchen scale" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 pastry brush` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="pastry brush" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 instant-read thermometer` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="instant-read thermometer" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 pizza stone` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="pizza stone" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 piping bag fitted with a star tip` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="piping bag fitted with a star tip" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 spice grinder` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="spice grinder" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `2 mason jars` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="mason jars" q=2 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 cocktail shaker` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="cocktail shaker" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 cast iron skillet` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="cast iron skillet" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 wok` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="wok" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 candy thermometer` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="candy thermometer" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `6 lollipop sticks` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="lollipop" q=6 u=stick pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-equipment | `1 egg slicer` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="egg slicer" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-foodlike | `1 package wooden skewers` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="wooden skewers" q=1 u=package pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 baking stone` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="baking stone" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 stockpot` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="stockpot" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 large saucepan` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="saucepan" q=1 u=each pkg=- alts=[] note="large" | C2 high [S1 S8] |
| supplement | S-equipment | `1 ice cream maker` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="ice cream maker" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 waffle iron` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="waffle iron" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 immersion blender` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="immersion blender" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 box grater` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="grater" q=1 u=box pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 grill pan` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="grill pan" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 meat mallet` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="meat mallet" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 mortar and pestle` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="mortar and pestle" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 microplane` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="microplane" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 salad spinner` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="salad spinner" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 bench scraper` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="bench scraper" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 kitchen torch` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="kitchen torch" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `6 canning jars with lids` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="canning jars with lids" q=6 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 heavy-bottomed pot` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="heavy-bottomed pot" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 sheet of wax paper` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="wax paper" q=1 u=sheet pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 roll plastic wrap` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="roll plastic wrap" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `2 pieces kitchen string` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="kitchen string" q=2 u=piece pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `12 cupcake wrappers` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="cupcake wrappers" q=12 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 package paper towels` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="paper towels" q=1 u=package pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 bag ice pop molds` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="ice pop molds" q=1 u=bag pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 tart ring` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="tart ring" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 baking steel` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="baking steel" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 rubber spatula` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="rubber spatula" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 offset spatula` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="offset spatula" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 vegetable peeler` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="vegetable peeler" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 garlic press` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="garlic press" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 citrus juicer` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="citrus juicer" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 deep-fry thermometer` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="deep-fry thermometer" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 trussing needle` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="trussing needle" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `2 oven mitts` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="oven mitts" q=2 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 kitchen timer` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="kitchen timer" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 sushi mat` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="sushi mat" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-equipment | `1 potato masher` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="potato masher" q=1 u=each pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-countnoun-compound | `4 rib eye steaks` | ready name="rib eye steaks" q=4 u=each pkg=- alts=[] | C2 high [S7] — ready name="eye steaks" q=4 u=rib pkg=- alts=[] note=null | C2 high [S7] |
| supplement | S-countnoun-compound | `4 strip loin steaks` | ready name="strip loin steaks" q=4 u=each pkg=- alts=[] | C2 high [S7] — ready name="loin steaks" q=4 u=strip pkg=- alts=[] note=null | C2 high [S7] |
| supplement | S-countnoun-compound | `2 wedge salads` | ready name="wedge salads" q=2 u=each pkg=- alts=[] | C2 high [S7] — ready name="salads" q=2 u=wedge pkg=- alts=[] note=null | C2 high [S7] |
| supplement | S-unknown S | `1 coffee cup plain flour` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="coffee cup plain flour" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 wine glass red wine` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="wine glass red wine" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `2 soup spoons sugar` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="soup spoons sugar" q=2 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 bowl cooked rice` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="bowl rice" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `2 fistfuls spinach` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="fistfuls spinach" q=2 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 pottle cream` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="pottle cream" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 hunk Parmesan` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="hunk Parmesan" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 chunk fresh ginger` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="chunk fresh ginger" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 slab tofu` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="slab tofu" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 tub-full yogurt` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="tub-full yogurt" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 can-ful water` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="can-ful water" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 stone potatoes` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="stone potatoes" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 crate oranges` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="crate oranges" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 carafe white wine` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="carafe white wine" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 bucket ice` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="bucket ice" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-unknown S | `1 saucer milk` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="saucer milk" q=1 u=each pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-fresh-or-dried | `2 tsp fresh rosemary or dried` | needs_review name=null q=2 u=tsp pkg=- alts="fresh rosemary;dried rosemary" | C2 high [S4 S5] — ready name="fresh rosemary" q=2 u=tsp pkg=- alts=[] note="or dried" | C2 high [S4 S5] |
| supplement | S-fresh-or-dried | `1/4 cup fresh basil or dried` | needs_review name=null q=1/4 u=cup pkg=- alts="fresh basil;dried basil" | C2 high [S4 S5] — ready name="fresh basil" q=1/4 u=cup pkg=- alts=[] note="or dried" | C2 high [S4 S5] |
| supplement | S-fresh-or-dried | `1 tbsp fresh sage or dried` | needs_review name=null q=1 u=tbsp pkg=- alts="fresh sage;dried sage" | C2 high [S4 S5] — ready name="fresh sage" q=1 u=tbsp pkg=- alts=[] note="or dried" | C2 high [S4 S5] |
| supplement | S-fresh-or-dried | `2 cups fresh cherries or frozen` | needs_review name=null q=2 u=cup pkg=- alts="fresh cherries;frozen cherries" | C2 high [S4 S5] — ready name="fresh cherries" q=2 u=cup pkg=- alts=[] note="or frozen" | C2 high [S4 S5] |
| supplement | S-fresh-or-dried | `1 lb fresh green beans or frozen` | needs_review name=null q=1 u=lb pkg=- alts="fresh green beans;frozen green beans" | C2 high [S4 S5] — ready name="fresh green beans" q=1 u=lb pkg=- alts=[] note="or frozen" | C2 high [S4 S5] |
| supplement | S-fresh-or-dried | `1 tbsp dried dill or fresh` | needs_review name=null q=1 u=tbsp pkg=- alts="dried dill;fresh dill" | C2 high [S4 S5] — ready name="dried dill" q=1 u=tbsp pkg=- alts=[] note="or fresh" | C2 high [S4 S5] |
| supplement | S-and S | `1/2 cup raisins and cranberries` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="raisins and cranberries" q=1/2 u=cup pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-and S | `1 cup diced onion and celery` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="diced onion and celery" q=1 u=cup pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-and S | `2 tbsp butter and oil` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="butter and oil" q=2 u=tbsp pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-and S | `1 cup chopped carrots and parsnips` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="chopped carrots and parsnips" q=1 u=cup pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-and S | `4 cups broccoli and cauliflower florets` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="broccoli and cauliflower florets" q=4 u=cup pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-and S | `1 lb shrimp and scallops` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="shrimp and scallops" q=1 u=lb pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-and S | `2 cups spinach and kale` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="spinach and kale" q=2 u=cup pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-and S | `1/4 cup sesame and flax seeds` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="sesame and flax seeds" q=1/4 u=cup pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-and S | `1 cup sliced peppers and onions` | needs_review name=null q=- u=- pkg=- alts=[] flags=S | C2 high [S4] — ready name="sliced peppers and onions" q=1 u=cup pkg=- alts=[] note=null | C2 high [S4] |
| supplement | S-remark | `2 tbsp lime juice (juice of 1 lime)` | needs_review name="lime juice" q=2 u=tbsp pkg=- alts=[] | C2 high [S4] — ready name="lime juice" q=2 u=tbsp pkg=- alts=[] note="juice of 1 lime" | C2 high [S4] |
| supplement | S-remark | `3 tbsp orange juice (1 orange)` | needs_review name="orange juice" q=3 u=tbsp pkg=- alts=[] | C2 high [S4] — ready name="orange juice" q=3 u=tbsp pkg=- alts=[] note="1 orange" | C2 high [S4] |
| supplement | S-remark | `1 cup chopped onion (1 medium onion)` | needs_review name="chopped onion\|onion" q=1 u=cup pkg=- alts=[] | C2 high [S4] — ready name="chopped onion" q=1 u=cup pkg=- alts=[] note="1 medium onion" | C2 high [S4] |
| supplement | S-remark | `2 cups diced tomatoes (about 3 tomatoes)` | needs_review name="diced tomatoes\|tomatoes" q=2 u=cup pkg=- alts=[] | C2 high [S4] — ready name="diced tomatoes" q=2 u=cup pkg=- alts=[] note="about 3 tomatoes" | C2 high [S4] |
| supplement | S-remark | `1 cup mashed banana (2 ripe bananas)` | needs_review name="mashed banana\|banana" q=1 u=cup pkg=- alts=[] | C2 high [S4] — ready name="mashed banana" q=1 u=cup pkg=- alts=[] note="2 ripe bananas" | C2 high [S4] |
| supplement | S-remark | `1 cup shredded zucchini (about 1 medium)` | needs_review name="shredded zucchini\|zucchini" q=1 u=cup pkg=- alts=[] | C2 high [S4] — ready name="shredded zucchini" q=1 u=cup pkg=- alts=[] note="about 1 medium" | C2 high [S4] |
| supplement | S-nutrition-abbrev | `Carb 30g` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="Carb" q=30 u=g pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-nutrition-abbrev | `Prot 20 g` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="Prot" q=20 u=g pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-nutrition-abbrev | `Sat Fat 2g` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="Sat Fat" q=2 u=g pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-nutrition-abbrev | `Sugar alcohols 4 g` | unsupported name=null q=- u=- pkg=- alts=[] | C2 high [S1 S8] — ready name="Sugar alcohols" q=4 u=g pkg=- alts=[] note=null | C2 high [S1 S8] |

## Debatable labels (D) — not counted (13)

| set | group | input | label | v2 | v1 |
|---|---|---|---|---|---|
| main | C-postnoun D | `6 shiso leaves` | ready name="shiso" q=6 u=leaf pkg=- alts=[] flags=D | C2 high [] — ready name="shiso leaves" q=6 u=each pkg=- alts=[] note=null | C2 high [] |
| main | C-identity D | `6 sugar cubes` | ready name="sugar cubes" q=6 u=each pkg=- alts=[] flags=D | C2 high [S7] — ready name="sugar" q=6 u=cube pkg=- alts=[] note=null | C1 [] |
| main | D-nutrition D | `18 g protein` | unsupported name=null q=- u=- pkg=- alts=[] flags=D | C2 high [S1 S8] — ready name="protein" q=18 u=g pkg=- alts=[] note=null | C2 high [S1 S8] |
| main | D-nutrition D | `12 g fat` | unsupported name=null q=- u=- pkg=- alts=[] flags=D | C2 high [S1 S8] — ready name="fat" q=12 u=g pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-countnoun-compound D | `6 stick pretzels` | ready name="stick pretzels" q=6 u=each pkg=- alts=[] flags=D | C2 high [S7] — ready name="pretzels" q=6 u=stick pkg=- alts=[] note=null | C2 high [S7] |
| supplement | S-countnoun-compound D | `1 head cheese` | ready name="head cheese" q=1 u=each pkg=- alts=[] flags=D | C2 high [S7] — ready name="cheese" q=1 u=head pkg=- alts=[] note=null | C2 high [S7] |
| supplement | S-countnoun-compound D | `2 sheet pans of roasted vegetables` | unsupported name=null q=- u=- pkg=- alts=[] flags=D | C2 high [S1 S8] — ready name="pans of roasted vegetables" q=2 u=sheet pkg=- alts=[] note=null | C2 high [S1 S8] |
| supplement | S-countnoun-compound D | `1 sheet cake` | ready name="sheet cake" q=1 u=each pkg=- alts=[] flags=D | C2 high [S7] — ready name="cake" q=1 u=sheet pkg=- alts=[] note=null | C2 high [S7] |
| supplement | S-countnoun-compound D | `3 cube rolls` | ready name="cube rolls" q=3 u=each pkg=- alts=[] flags=D | C2 high [S7] — ready name="rolls" q=3 u=cube pkg=- alts=[] note=null | C2 high [S7] |
| supplement | S-countnoun-compound D | `4 link sausages` | ready name="link sausages" q=4 u=each pkg=- alts=[] flags=D | C2 high [S7] — ready name="sausages" q=4 u=link pkg=- alts=[] note=null | C2 high [S7] |
| supplement | S-fresh-or-dried D | `1 tbsp fresh thyme leaves or dried` | needs_review name=null q=1 u=tbsp pkg=- alts="fresh thyme leaves;dried thyme leaves" flags=D | C2 high [S4 S5] — ready name="fresh thyme leaves" q=1 u=tbsp pkg=- alts=[] note="or dried" | C2 high [S4 S5] |
| supplement | S-fresh-or-dried D | `1 tbsp fresh parsley (or dried)` | needs_review name=null q=1 u=tbsp pkg=- alts="fresh parsley;dried parsley" flags=D | C2 high [S4 S5] — ready name="fresh parsley" q=1 u=tbsp pkg=- alts=[] note="or dried" | C2 high [S4 S5] |
| supplement | S-remark D | `1 tbsp minced garlic (3 cloves)` | needs_review name="minced garlic\|garlic" q=1 u=tbsp pkg=- alts=[] flags=D | C2 high [S4] — ready name="minced garlic" q=1 u=tbsp pkg=- alts=[] note=null | C2 high [S4] |

