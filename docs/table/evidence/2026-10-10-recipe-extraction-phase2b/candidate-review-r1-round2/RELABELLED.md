# Round-1 probes relabelled for CONTRACT §12.6 (A2) and §12.A A1/A3/A4 at a8b76db

| input | old label (status name qty unit pkg alts flags) | new label | rule |
|---|---|---|---|
| `2 lbs (1 kg) chicken wings` | needs_review · chicken wings · 2 · lb · - · - · D | needs_review · chicken wings · 2 · lb · - · - · - | A2 (policy now consistent) |
| `100 g (4 oz) butter` | ready · butter · 100 · g · - · - · D | needs_review · butter · 100 · g · - · - · - | A2: larger restated unit -> 7% test only |
| `500 g (1 lb) beef mince` | ready · beef mince · 500 · g · - · - · D | needs_review · beef mince · 500 · g · - · - · - | A2 |
| `1 kg (2 lb) brown onions` | ready · brown onions · 1 · kg · - · - · D | ready · brown onions · 1 · kg · - · - · - | A2: lb restating kg, half-up |
| `1 cup grated carrot (2 medium carrots)` | needs_review · grated carrot|carrot · 1 · cup · - · - · - | ready · grated carrot|carrot · 1 · cup · - · - · - | A3: prepared same food |
| `1 large onion (about 2 cups chopped)` | needs_review · onion · 1 · each · - · - · - | ready · onion · 1 · each · - · - · - | A3 |
| `6 stick pretzels` | ready · stick pretzels · 6 · each · - · - · D | ready · stick pretzels · 6 · each · - · - · - | A1 (was D) |
| `3 cube rolls` | ready · cube rolls · 3 · each · - · - · D | ready · cube rolls · 3 · each · - · - · - | A1 (was D) |
| `2 slice cheesecake` | ready · cheesecake · 2 · slice · - · - · D | ready · cheesecake · 2 · slice · - · - · - | A1: sloppy plural before uncounted food (was D) |
| `4 leaf lettuce leaves` | ready · leaf lettuce · 4 · leaf · - · - · - | ready · leaf lettuce leaves · 4 · each · - · - · D | A1 read literally gives each "leaf lettuce leaves", but §12.4 (post-food count noun after "leaf lettuce") gives 4 leaf "leaf lettuce" — the two rules conflict; marked debatable |
| `4 link sausages` | ready · link sausages · 4 · each · - · - · D | ready · link sausages · 4 · each · - · - · - | A1 (was D) |
| `4 cups broccoli and cauliflower florets` | needs_review · - · - · - · - · - · S | ready · broccoli and cauliflower florets · 4 · cup · - · - · D | A4 (debatable) |
| `1/4 cup sesame and flax seeds` | needs_review · - · - · - · - · - · S | ready · sesame and flax seeds · 1/4 · cup · - · - · D | A4: modifiers before one head? (debatable) |
| `1 cup chopped onion (1 medium onion)` | needs_review · chopped onion|onion · 1 · cup · - · - · - | ready · chopped onion|onion · 1 · cup · - · - · - | A3 |
| `2 cups diced tomatoes (about 3 tomatoes)` | needs_review · diced tomatoes|tomatoes · 2 · cup · - · - · - | ready · diced tomatoes|tomatoes · 2 · cup · - · - · - | A3 |
| `1 tbsp minced garlic (3 cloves)` | needs_review · minced garlic|garlic · 1 · tbsp · - · - · D | ready · minced garlic|garlic · 1 · tbsp · - · - · - | A3 (was D) |
| `1 cup mashed banana (2 ripe bananas)` | needs_review · mashed banana|banana · 1 · cup · - · - · - | ready · mashed banana|banana · 1 · cup · - · - · - | A3 |
| `1 cup shredded zucchini (about 1 medium)` | needs_review · shredded zucchini|zucchini · 1 · cup · - · - · - | ready · shredded zucchini|zucchini · 1 · cup · - · - · - | A3 |
