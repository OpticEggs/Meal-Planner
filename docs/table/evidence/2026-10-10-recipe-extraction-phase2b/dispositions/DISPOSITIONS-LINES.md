## Firm regression cases by origin

| Group | firm cases | legacy-table-import-2 exact / abstain / FAIL | semantic-v1 exact / abstain / FAIL | semantic-v2 exact / abstain / FAIL |
|---|---|---|---|---|
| candidate-review-r1 | 152 | 3 / 12 / 137 | 20 / 0 / 132 | 152 / 0 / 0 |
| candidate-review-r1-round2 | 90 | 13 / 2 / 75 | 30 / 0 / 60 | 59 / 31 / 0 |
| candidate-review-r1-round3 | 63 | 18 / 0 / 45 | 21 / 0 / 42 | 56 / 7 / 0 |
| coordinator:FH-SF1 | 4 | 0 / 0 / 4 | 0 / 0 / 4 | 4 / 0 / 0 |
| coordinator:FH-SF1-control | 2 | 0 / 0 / 2 | 2 / 0 / 0 | 2 / 0 / 0 |
| coordinator:FH-SF2 | 8 | 0 / 8 / 0 | 0 / 0 / 8 | 8 / 0 / 0 |
| coordinator:FH-SF2-control | 2 | 0 / 2 / 0 | 2 / 0 / 0 | 2 / 0 / 0 |
| coordinator:FH-SF2-food-control | 5 | 3 / 0 / 2 | 5 / 0 / 0 | 5 / 0 / 0 |
| coordinator:FH-SF3 | 4 | 0 / 0 / 4 | 0 / 0 / 4 | 4 / 0 / 0 |
| coordinator:FH-SF3-control | 3 | 1 / 0 / 2 | 3 / 0 / 0 | 3 / 0 / 0 |
| coordinator:FH-SF3-identity-control | 4 | 4 / 0 / 0 | 4 / 0 / 0 | 4 / 0 / 0 |
| coordinator:FH-SF4 | 7 | 0 / 0 / 7 | 0 / 0 / 7 | 7 / 0 / 0 |
| coordinator:FH-SF4-control | 1 | 0 / 0 / 1 | 1 / 0 / 0 | 1 / 0 / 0 |
| coordinator:K1 | 5 | 0 / 0 / 5 | 0 / 0 / 5 | 5 / 0 / 0 |
| coordinator:K2 | 11 | 0 / 0 / 11 | 0 / 0 / 11 | 11 / 0 / 0 |
| coordinator:K2-control | 3 | 0 / 0 / 3 | 1 / 0 / 2 | 3 / 0 / 0 |
| coordinator:K3 | 7 | 0 / 7 / 0 | 0 / 0 / 7 | 7 / 0 / 0 |
| coordinator:K3-control | 4 | 0 / 4 / 0 | 4 / 0 / 0 | 4 / 0 / 0 |
| coordinator:K4 | 6 | 4 / 2 / 0 | 0 / 0 / 6 | 6 / 0 / 0 |
| coordinator:R1-MEDIUM | 4 | 0 / 0 / 4 | 2 / 0 / 2 | 4 / 0 / 0 |
| coordinator:R1R2-REPORTED | 1 | 0 / 0 / 1 | 1 / 0 / 0 | 1 / 0 / 0 |
| coordinator:R3-S1 | 32 | 0 / 0 / 32 | 4 / 0 / 28 | 32 / 0 / 0 |
| coordinator:R3-S2 | 4 | 0 / 0 / 4 | 0 / 0 / 4 | 4 / 0 / 0 |
| coordinator:R3-S2-control | 2 | 2 / 0 / 0 | 2 / 0 / 0 | 2 / 0 / 0 |
| coordinator:R3-S3 | 2 | 1 / 0 / 1 | 0 / 0 / 2 | 2 / 0 / 0 |
| final-head-probe | 660 | 161 / 82 / 417 | 593 / 19 / 48 | 660 / 0 / 0 |
| holdout-v1:holdout-v1 | 2 | 0 / 0 / 2 | 0 / 0 / 2 | 2 / 0 / 0 |
| holdout-v2:holdout-v2 | 26 | 1 / 3 / 22 | 0 / 3 / 23 | 26 / 0 / 0 |

## Line by line: K1–K4, final-head SF-1–SF-4 and the holdout-v2 failures

| Finding | Input | Label | semantic-v1 | semantic-v2 |
|---|---|---|---|---|
| FH-SF1  | `1x cup milk` | ready "milk" | FAIL: ready 1/1 each "x cup milk" | **exact**: ready 1/1 cup "milk" |
| FH-SF1  | `1x can chickpeas` | ready "chickpeas" | FAIL: ready 1/1 each "x can chickpeas" | **exact**: ready 1/1 can "chickpeas" |
| FH-SF1  | `2x cans chickpeas` | ready "chickpeas" | FAIL: ready 2/1 each "x cans chickpeas" | **exact**: ready 2/1 can "chickpeas" |
| FH-SF1  | `1 x can chickpeas` | ready "chickpeas" | FAIL: ready 1/1 each "x can chickpeas" | **exact**: ready 1/1 can "chickpeas" |
| FH-SF1-control  | `2x 400g tins tomatoes` | ready "tomatoes" | exact: ready 2/1 tin "tomatoes" | **exact**: ready 2/1 tin "tomatoes" |
| FH-SF1-control  | `2 x 15 oz cans beans` | ready "beans" | exact: ready 2/1 can "beans" | **exact**: ready 2/1 can "beans" |
| FH-SF2  | `Vitamin C: 15 mg` | unsupported | FAIL: ready 15/1 mg "Vitamin C" | **exact**: unsupported |
| FH-SF2  | `Magnesium: 40 mg` | unsupported | FAIL: ready 40/1 mg "Magnesium" | **exact**: unsupported |
| FH-SF2  | `Zinc 1 mg` | unsupported | FAIL: ready 1/1 mg "Zinc" | **exact**: unsupported |
| FH-SF2  | `Caffeine: 95 mg` | unsupported | FAIL: ready 95/1 mg "Caffeine" | **exact**: unsupported |
| FH-SF2  | `4.8 stars (120 reviews)` | unsupported | FAIL: ready 24/5 each "stars" | **exact**: unsupported |
| FH-SF2  | `Vitamin D: 2 mcg` | unsupported | FAIL: needs_review 2/1 each "mcg" | **exact**: unsupported |
| FH-SF2  | `Serving size: 2 cookies` | unsupported | FAIL: needs_review 2/1 each "cookies" | **exact**: unsupported |
| FH-SF2  | `5 from 3 votes` | unsupported | FAIL: needs_review 5/1 each "from" | **exact**: unsupported |
| FH-SF2-control  | `Protein: 20 g` | unsupported | exact: unsupported | **exact**: unsupported |
| FH-SF2-control  | `Iron: 2 mg` | unsupported | exact: unsupported | **exact**: unsupported |
| FH-SF2-food-control  | `1 scoop protein powder` | ready "protein powder" | exact: ready 1/1 scoop "protein powder" | **exact**: ready 1/1 scoop "protein powder" |
| FH-SF2-food-control  | `2 tbsp vitamin C powder` | ready "vitamin C powder" | exact: ready 2/1 tbsp "vitamin C powder" | **exact**: ready 2/1 tbsp "vitamin C powder" |
| FH-SF2-food-control  | `1 tsp sodium bicarbonate` | ready "sodium bicarbonate" | exact: ready 1/1 tsp "sodium bicarbonate" | **exact**: ready 1/1 tsp "sodium bicarbonate" |
| FH-SF2-food-control  | `2 tbsp low-sodium soy sauce` | ready "low-sodium soy sauce" | exact: ready 2/1 tbsp "low-sodium soy sauce" | **exact**: ready 2/1 tbsp "low-sodium soy sauce" |
| FH-SF2-food-control  | `1 bottle vitamin water` | ready "vitamin water" | exact: ready 1/1 bottle "vitamin water" | **exact**: ready 1/1 bottle "vitamin water" |
| FH-SF3  | `4 lemon wedges` | ready "lemon" | FAIL: ready 4/1 each "lemon wedges" | **exact**: ready 4/1 wedge "lemon" |
| FH-SF3  | `2 cinnamon sticks` | ready "cinnamon" | FAIL: ready 2/1 each "cinnamon sticks" | **exact**: ready 2/1 stick "cinnamon" |
| FH-SF3  | `2 bacon strips` | ready "bacon" | FAIL: ready 2/1 each "bacon strips" | **exact**: ready 2/1 strip "bacon" |
| FH-SF3  | `2 lettuce heads` | ready "lettuce" | FAIL: ready 2/1 each "lettuce heads" | **exact**: ready 2/1 head "lettuce" |
| FH-SF3-control  | `1 cup torn basil leaves` | ready "torn basil leaves" | exact: ready 1/1 cup "torn basil leaves" | **exact**: ready 1/1 cup "torn basil leaves" |
| FH-SF3-control  | `lime wedges, to serve` | ready "lime wedges" | exact: ready "lime wedges" | **exact**: ready "lime wedges" |
| FH-SF3-control  | `3 garlic cloves` | ready "garlic" | exact: ready 3/1 clove "garlic" | **exact**: ready 3/1 clove "garlic" |
| FH-SF3-identity-control  | `2 fish sticks` | ready "fish sticks" | exact: ready 2/1 each "fish sticks" | **exact**: ready 2/1 each "fish sticks" |
| FH-SF3-identity-control  | `4 mozzarella sticks` | ready "mozzarella sticks" | exact: ready 4/1 each "mozzarella sticks" | **exact**: ready 4/1 each "mozzarella sticks" |
| FH-SF3-identity-control  | `3 bay leaves` | ready "bay leaves" | exact: ready 3/1 each "bay leaves" | **exact**: ready 3/1 each "bay leaves" |
| FH-SF3-identity-control  | `6 breadsticks` | ready "breadsticks" | exact: ready 6/1 each "breadsticks" | **exact**: ready 6/1 each "breadsticks" |
| FH-SF4  | `2 cups spinach, kale, or chard` | needs_review | FAIL: needs_review 2/1 cup "spinach" | **exact**: needs_review 2/1 cup [spinach | kale | chard] |
| FH-SF4  | `1 tsp thyme, rosemary, or oregano` | needs_review | FAIL: needs_review 1/1 tsp "thyme" | **exact**: needs_review 1/1 tsp [thyme | rosemary | oregano] |
| FH-SF4  | `2 tbsp butter, ghee, or oil` | needs_review | FAIL: needs_review 2/1 tbsp "butter" | **exact**: needs_review 2/1 tbsp [butter | ghee | oil] |
| FH-SF4  | `1 lb chicken, pork, or tofu` | needs_review | FAIL: needs_review 1/1 lb "chicken" | **exact**: needs_review 1/1 lb [chicken | pork | tofu] |
| FH-SF4  | `1 cup milk, cream, or half-and-half` | needs_review | FAIL: needs_review 1/1 cup "milk" | **exact**: needs_review 1/1 cup [milk | cream | half-and-half] |
| FH-SF4  | `1 cup pecans, walnuts, or almonds` | needs_review | FAIL: needs_review 1/1 cup [walnuts | almonds] | **exact**: needs_review 1/1 cup [pecans | walnuts | almonds] |
| FH-SF4  | `1/2 cup raisins, cranberries or cherries` | needs_review | FAIL: needs_review 1/2 cup [cranberries | cherries] | **exact**: needs_review 1/2 cup [raisins | cranberries | cherries] |
| FH-SF4-control  | `1 cup pecans or walnuts or almonds` | needs_review | exact: needs_review 1/1 cup [pecans | walnuts | almonds] | **exact**: needs_review 1/1 cup [pecans | walnuts | almonds] |
| K1  | `a half-cup milk` | ready "milk" | FAIL: ready 1/1 each "half-cup milk" | **exact**: ready 1/2 cup "milk" |
| K1  | `a quarter-cup sugar` | ready "sugar" | FAIL: ready 1/1 each "quarter-cup sugar" | **exact**: ready 1/4 cup "sugar" |
| K1  | `a quarter-pound beef` | ready "beef" | FAIL: ready 1/1 each "quarter-pound beef" | **exact**: ready 1/4 lb "beef" |
| K1  | `a half-pound ground beef` | ready "ground beef" | FAIL: ready 1/1 each "half-pound ground beef" | **exact**: ready 1/2 lb "ground beef" |
| K1  | `a half-cup of milk` | ready "milk" | FAIL: needs_review "milk" | **exact**: ready 1/2 cup "milk" |
| K2  | `400g (14oz) can chopped tomatoes` | ready "chopped tomatoes" | FAIL: needs_review 400/1 g "chopped tomatoes" | **exact**: ready 1/1 can "chopped tomatoes" |
| K2  | `400 g (14 oz) can tomatoes` | ready "tomatoes" | FAIL: needs_review 400/1 g "tomatoes" | **exact**: ready 1/1 can "tomatoes" |
| K2  | `400g/14oz can chopped tomatoes` | ready "chopped tomatoes" | FAIL: needs_review 400/1 g "chopped tomatoes" | **exact**: ready 1/1 can "chopped tomatoes" |
| K2  | `400 g / 14 oz can tomatoes` | ready "tomatoes" | FAIL: needs_review 400/1 g "tomatoes" | **exact**: ready 1/1 can "tomatoes" |
| K2  | `14 oz (400 g) can tomatoes` | ready "tomatoes" | FAIL: needs_review 14/1 oz "tomatoes" | **exact**: ready 1/1 can "tomatoes" |
| K2  | `15 oz (425 g) can black beans` | ready "black beans" | FAIL: needs_review 15/1 oz "black beans" | **exact**: ready 1/1 can "black beans" |
| K2  | `400ml (14fl oz) can coconut milk` | ready "coconut milk" | FAIL: needs_review 400/1 ml "coconut milk" | **exact**: ready 1/1 can "coconut milk" |
| K2  | `28 oz (794 g) can whole tomatoes` | ready "whole tomatoes" | FAIL: needs_review 28/1 oz "whole tomatoes" | **exact**: ready 1/1 can "whole tomatoes" |
| K2  | `8 oz (225 g) package cream cheese` | ready "cream cheese" | FAIL: needs_review 8/1 oz "cream cheese" | **exact**: ready 1/1 package "cream cheese" |
| K2  | `8-oz (225 g) package cream cheese` | ready "cream cheese" | FAIL: needs_review 8/1 oz "cream cheese" | **exact**: ready 1/1 package "cream cheese" |
| K2  | `16 oz (1 lb) bag frozen peas` | ready "frozen peas" | FAIL: needs_review 16/1 oz "frozen peas" | **exact**: ready 1/1 bag "frozen peas" |
| K2-control  | `400ml can coconut milk` | ready "coconut milk" | FAIL: needs_review can "coconut milk" | **exact**: ready 1/1 can "coconut milk" |
| K2-control  | `1 x 400g (14oz) can tomatoes` | ready "tomatoes" | exact: ready 1/1 can "tomatoes" | **exact**: ready 1/1 can "tomatoes" |
| K2-control  | `400 g can (14 oz) tomatoes` | ready "tomatoes" | FAIL: needs_review can "tomatoes" | **exact**: ready 1/1 can "tomatoes" |
| K3  | `Protein: 20 grams` | unsupported | FAIL: ready 20/1 g "Protein" | **exact**: unsupported |
| K3  | `Fat: 10 grams` | unsupported | FAIL: ready 10/1 g "Fat" | **exact**: unsupported |
| K3  | `Sodium: 300 milligrams` | unsupported | FAIL: ready 300/1 mg "Sodium" | **exact**: unsupported |
| K3  | `Carbohydrates: 30 grams` | unsupported | FAIL: ready 30/1 g "Carbohydrates" | **exact**: unsupported |
| K3  | `Serving size: 1 cup (240 ml)` | unsupported | FAIL: ready 1/1 cup "Serving size" | **exact**: unsupported |
| K3  | `Points: 5` | unsupported | FAIL: ready 5/1 each "Points" | **exact**: unsupported |
| K3  | `Weight Watchers points: 5` | unsupported | FAIL: ready 5/1 each "Weight Watchers points" | **exact**: unsupported |
| K3-control  | `Protein 20g` | unsupported | exact: unsupported | **exact**: unsupported |
| K3-control  | `Calories: 250 kcal` | unsupported | exact: unsupported | **exact**: unsupported |
| K3-control  | `Total Fat 10g` | unsupported | exact: unsupported | **exact**: unsupported |
| K3-control  | `Serving size: 1 cup` | unsupported | exact: unsupported | **exact**: unsupported |
| K4  | `Five spice powder` | needs_review "Five spice powder" | FAIL: needs_review 5/1 each "spice powder" | **exact**: needs_review "Five spice powder" |
| K4  | `Seven spice blend` | needs_review "Seven spice blend" | FAIL: needs_review 7/1 each "spice blend" | **exact**: needs_review "Seven spice blend" |
| K4  | `Three cheese blend` | needs_review "Three cheese blend" | FAIL: needs_review 3/1 each "cheese blend" | **exact**: needs_review "Three cheese blend" |
| K4  | `Four cheese pizza` | needs_review "Four cheese pizza" | FAIL: needs_review 4/1 each "cheese pizza" | **exact**: needs_review "Four cheese pizza" |
| K4  | `You will need: 2 baking sheets` | unsupported | FAIL: needs_review 2/1 each "baking sheets" | **exact**: unsupported |
| K4  | `You'll need: 1 piping bag` | unsupported | FAIL: needs_review 1/1 each "piping bag" | **exact**: unsupported |
| holdout-v2:holdout-v2 ing-h2-0040 | `1/2 tsp 5-spice powder` | ready "5-spice powder" | FAIL: needs_review 1/2 tsp | **exact**: ready 1/2 tsp "5-spice powder" |
| holdout-v2:holdout-v2 ing-h2-0041 | `500 g 00 flour` | ready "00 flour" | FAIL: needs_review 500/1 g | **exact**: ready 500/1 g "00 flour" |
| holdout-v2:holdout-v2 ing-h2-0054 | `eight cardamom pods` | ready "cardamom" | FAIL: ready 8/1 each "cardamom pods" | **exact**: ready 8/1 pod "cardamom" |
| holdout-v2:holdout-v2 ing-h2-0061 | `Pinch of salt` | ready "salt" | FAIL: needs_review pinch "salt" | **exact**: ready 1/1 pinch "salt" |
| holdout-v2:holdout-v2 ing-h2-0065 | `2 celery ribs, diced` | ready "celery" | FAIL: ready 2/1 each "celery ribs" | **exact**: ready 2/1 rib "celery" |
| holdout-v2:holdout-v2 ing-h2-0072 | `2 star anise pods` | ready "star anise" | FAIL: ready 2/1 each "star anise pods" | **exact**: ready 2/1 pod "star anise" |
| holdout-v2:holdout-v2 ing-h2-0087 | `3 (5.3 oz) cups vanilla Greek yogurt` | ready "vanilla Greek yogurt" | FAIL: needs_review 3/1 cup "vanilla Greek yogurt" | **exact**: ready 3/1 container "vanilla Greek yogurt" |
| holdout-v2:holdout-v2 ing-h2-0129 | `2 tsp + ½ tsp sea salt` | ready "sea salt" | FAIL: needs_review 2/1 tsp | **exact**: ready 5/2 tsp "sea salt" |
| holdout-v2:holdout-v2 ing-h2-0130 | `1 cup plus 1/3 cup sugar` | ready "sugar" | FAIL: needs_review 1/1 cup | **exact**: ready 4/3 cup "sugar" |
| holdout-v2:holdout-v2 ing-h2-0140 | `3 cups (750 ml) / 25 fl oz chicken stock` | ready "chicken stock" | FAIL: needs_review 3/1 cup "chicken stock" | **exact**: ready 3/1 cup "chicken stock" |
| holdout-v2:holdout-v2 ing-h2-0151 | `93/7 ground turkey, 1 lb` | ready "93/7 ground turkey" | FAIL: needs_review "ground turkey" | **exact**: ready 1/1 lb "93/7 ground turkey" |
| holdout-v2:holdout-v2 ing-h2-0164 | `1 lb large raw shrimp, peeled, tails on` | ready "shrimp" | FAIL: ready 1/1 lb "large shrimp" | **exact**: ready 1/1 lb "shrimp" |
| holdout-v2:holdout-v2 ing-h2-0165 | `1 cup cooked quinoa (from 1/3 cup dry)` | needs_review "quinoa" | FAIL: ready 1/1 cup "quinoa" | **exact**: needs_review 1/1 cup "quinoa" |
| holdout-v2:holdout-v2 ing-h2-0212 | `Juice of 2 limes` | ready "limes" | FAIL: needs_review 2/1 each "limes" | **exact**: ready 2/1 each "limes" |
| holdout-v2:holdout-v2 ing-h2-0213 | `Zest of ½ orange` | ready "orange" | FAIL: needs_review 1/2 each "orange" | **exact**: ready 1/2 each "orange" |
| holdout-v2:holdout-v2 ing-h2-0218 | `4 cups kale or Swiss chard (stems removed)` | needs_review | FAIL: needs_review 4/1 cup [kale chard | Swiss chard] | **exact**: needs_review 4/1 cup [kale | Swiss chard] |
| holdout-v2:holdout-v2 ing-h2-0219 | `1 tbsp maple syrup, honey, or agave` | needs_review | FAIL: needs_review 1/1 tbsp "maple syrup" | **exact**: needs_review 1/1 tbsp [maple syrup | honey | agave] |
| holdout-v2:holdout-v2 ing-h2-0220 | `1 (15 oz) can chickpeas or white beans, drained` | needs_review | FAIL: needs_review 1/1 can [chickpeas beans | white beans] | **exact**: needs_review 1/1 can [chickpeas | white beans] |
| holdout-v2:holdout-v2 ing-h2-0232 | `⅔ cup hummus (store-bought (or see recipe))` | ready "hummus" | FAIL: needs_review 2/3 cup [hummus | see recipe] | **exact**: ready 2/3 cup "hummus" |
| holdout-v2:holdout-v2 ing-h2-0239 | `2 medium zucchini, cut into half-moons` | ready "zucchini" | FAIL: needs_review 2/1 each "zucchini" | **exact**: ready 2/1 each "zucchini" |
| holdout-v2:holdout-v2 ing-h2-0253 | `eggs x 3` | ready "eggs" | FAIL: needs_review "eggs x" | **exact**: ready 3/1 each "eggs" |
| holdout-v2:holdout-v2 ing-h2-0277 | `between 2 and 3 cups water` | needs_review "water" | FAIL: needs_review "between" | **exact**: needs_review 2/1.. cup "water" |
| holdout-v2:holdout-v2 ing-h2-0286 | `SAUCE` | unsupported | abstain: needs_review "SAUCE" | **exact**: unsupported |
| holdout-v2:holdout-v2 ing-h2-0288 | `Cake Layers` | unsupported | abstain: needs_review "Cake Layers" | **exact**: unsupported |
| holdout-v2:holdout-v2 ing-h2-0297 | `Step 2` | unsupported | abstain: needs_review "Step" | **exact**: unsupported |
| holdout-v2:holdout-v2 ing-h2-0338 | `1 cup rice (1 cup dry makes 3 cooked)` | needs_review "rice" | FAIL: ready 1/1 cup "rice" | **exact**: needs_review 1/1 cup "rice" |
