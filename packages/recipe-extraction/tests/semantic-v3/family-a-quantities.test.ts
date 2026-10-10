/**
 * semantic-v2 · family A: quantity syntax and complete token accounting (CONTRACT §7.1–§7.5, §12.1, §12.2, §12.6,
 * §12.9, §12.11–§12.14). Each rule has positive cases and nearby negative controls; the general final guard
 * (`nameLeftoverGuard`) is tested on its own in safeguards.test.ts.
 */
import { describe, expect, it } from "vitest";
import { amountText, core, qText, read } from "./helpers";

describe("fraction word joined to a unit (§12.1)", () => {
  it.each([
    ["a half-cup milk", "1/2", "cup", "milk"], ["a quarter-cup sugar", "1/4", "cup", "sugar"], ["a quarter-pound beef", "1/4", "lb", "beef"],
    ["a half-pound ground beef", "1/2", "lb", "ground beef"], ["1 half-cup butter", "1/2", "cup", "butter"], ["a half-cup of milk", "1/2", "cup", "milk"],
    ["a half-gallon milk", "1/2", "gallon", "milk"], ["a quarter-teaspoon salt", "1/4", "tsp", "salt"], ["half-cup sugar", "1/2", "cup", "sugar"],
    ["three-quarter-cup flour", "3/4", "cup", "flour"], ["1 half cup milk", "1/2", "cup", "milk"], ["2 half-cups milk", "1", "cup", "milk"],
    ["2 half cups milk", "1", "cup", "milk"], ["a third-cup oil", "1/3", "cup", "oil"],
  ])("%s → %s %s %s", (line, q, unit, name) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit });
  });

  it("a fraction-unit that sizes counted items is a note; before a container it is the package size", () => {
    expect(read("2 quarter-pound beef patties")).toMatchObject({ status: "ready", quantity: { numerator: "2" }, unit: { canonical: "each" }, name: "beef patties", note: "quarter-pound" });
    expect(read("a half-gallon carton milk")).toMatchObject({ status: "ready", quantity: { numerator: "1" }, unit: { canonical: "carton" }, packageSize: { quantity: { numerator: "1", denominator: "2" }, unit: { canonical: "gallon" } } });
  });

  it("negative controls: half-and-half, half-dozen, and an unclear fraction of a compound", () => {
    expect(read("1 cup half-and-half")).toMatchObject({ status: "ready", name: "half-and-half" });
    expect(core(read("a half-dozen eggs"))).toEqual({ status: "ready", name: "eggs", quantity: "6", unit: "each" });
    expect(read("1/2 half-cup milk").status).toBe("needs_review");
    expect(read("2 half cup milk").status).toBe("needs_review"); // a count before a singular unit
  });
});

describe("multiplier x / × (§12.2)", () => {
  it.each([
    ["1x cup milk", "1", "cup", "milk"], ["1x can chickpeas", "1", "can", "chickpeas"], ["2x cans chickpeas", "2", "can", "chickpeas"],
    ["1 x can chickpeas", "1", "can", "chickpeas"], ["3x eggs", "3", "each", "eggs"], ["eggs x 3", "3", "each", "eggs"], ["eggs x3", "3", "each", "eggs"],
    ["eggs (x3)", "3", "each", "eggs"], ["Eggs ×2, beaten", "2", "each", "Eggs"],
  ])("%s → %s %s %s", (line, q, unit, name) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit });
  });

  it("with a package size it is the package count; before a plural food a dimension counts it", () => {
    expect(read("2 x 400 g tins tomatoes")).toMatchObject({ status: "ready", unit: { canonical: "tin" }, packageSize: { quantity: { numerator: "400" } } });
    expect(read("2 x 13-inch pizza bases")).toMatchObject({ status: "ready", quantity: { numerator: "2" }, name: "pizza bases", note: "13-inch" });
  });

  it("negative controls: dimensions, sugar grades, scaling controls; x never stays in a name", () => {
    expect(read("9 x 13 inch pan").status).toBe("unsupported");
    expect(read("1/2 cup 10X sugar")).toMatchObject({ status: "ready", name: "10X sugar" });
    expect(read("10X sugar")).toMatchObject({ status: "needs_review", name: "10X sugar", quantity: null });
    expect(read("1x 2x 3x").status).toBe("unsupported");
    expect(read("2 x 400g chopped walnuts").status).toBe("needs_review"); // two packages of what? never a per-piece weight
    for (const line of ["1 cup x cup milk", "2 x x eggs"]) expect(read(line).status, line).toBe("needs_review");
  });
});

describe("same-dimension additions and subtractions (§7.5, §12.12)", () => {
  it.each([
    ["2 tsp + ½ tsp sea salt", "5/2", "tsp"], ["1 cup plus 1/3 cup sugar", "4/3", "cup"], ["1 Tbsp + 1 tsp (20 ml) lemon juice", "4", "tsp"],
    ["1 lb. 2 oz. (510 g) flour", "18", "oz"], ["1 cup minus 2 tbsp flour", "14", "tbsp"], ["1 cup less 2 tbsp sugar", "14", "tbsp"],
    ["2 cups plus 1 cup flour", "3", "cup"], ["1 cup flour, plus 2 tablespoons for dusting", "18", "tbsp"],
  ])("%s → %s %s", (line, q, unit) => {
    const r = read(line);
    expect(r.status).toBe("ready");
    expect(r.quantity).toMatchObject({ numerator: q.split("/")[0], denominator: q.split("/")[1] ?? "1" });
    expect(r.unit?.canonical).toBe(unit);
  });

  it("the restatement after a sum is compared with the sum and kept as an equivalent", () => {
    expect(read("1 Tbsp + 1 tsp (20 ml) lemon juice").equivalents.map(amountText)).toEqual(["20 ml"]);
    expect(read("1 lb. 2 oz. (510 g) flour").equivalents.map(amountText)).toEqual(["510 g"]);
  });

  it("negative controls: different foods or dimensions are never summed and no food is privileged", () => {
    for (const line of ["2 eggs + 1 yolk", "3 eggs plus 1 egg yolk", "1 cup flour, plus 2 tbsp sugar"]) {
      const r = read(line);
      expect(r, line).toMatchObject({ status: "needs_review", name: null });
    }
    expect(read("1 (8 oz) package cream cheese, plus 2 oz").status).toBe("needs_review");
    expect(read("2 tbsp minus 1 cup sugar").status).toBe("needs_review"); // never a negative amount
    expect(read("2 cups flour, plus more for dusting")).toMatchObject({ status: "ready", quantity: { numerator: "2" }, note: "plus more for dusting" });
  });
});

describe("ranges", () => {
  it.each([["between 2 and 3 cups water", "2..3", "cup", "water"], ["between 1 and 2 tbsp sugar", "1..2", "tbsp", "sugar"]])("%s is a range", (line, q, unit, name) => {
    expect(core(read(line))).toEqual({ status: "needs_review", name, quantity: q, unit });
  });
});

describe("numbers that name the food (§12.9)", () => {
  it.each([
    ["1/2 tsp 5-spice powder", "5-spice powder"], ["500 g 00 flour", "00 flour"], ["1 cup 00 pizza flour", "00 pizza flour"], ["2 tbsp A1 sauce", "A1 sauce"],
    ["1 cup 7-Up", "7-Up"], ["1 cup 7 grain cereal", "7 grain cereal"], ["1 tsp Chinese 5 spice", "Chinese 5 spice"], ["1 cup 2 percent milk", "2 percent milk"],
    ["1 lb 80/20 ground beef", "80/20 ground beef"], ["93/7 ground turkey, 1 lb", "93/7 ground turkey"], ["7-Up soda, 1 can", "7-Up soda"],
    ["Three cheese blend, 1 cup", "Three cheese blend"], ["2 tsp five spice powder", "five spice powder"],
  ])("%s → name %s, ready", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name });
  });

  it.each(["Five spice powder", "Seven spice blend", "Three cheese blend", "Four cheese pizza", "Three-bean salad", "5 spice powder"])("%s → the full name, no amount", (line) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: line, quantity: null, unit: null });
  });

  it("negative controls: a plural head makes the number a count; other singular nouns are not components", () => {
    expect(core(read("Twelve cherry tomatoes"))).toEqual({ status: "ready", name: "cherry tomatoes", quantity: "12", unit: "each" });
    expect(core(read("2 cheese pizzas"))).toEqual({ status: "ready", name: "cheese pizzas", quantity: "2", unit: "each" });
    // semantic-v3: a counted food written without a plural is counted as written (only a food bought by weight or volume
    // makes a count unclear: "2 milk")
    expect(core(read("2 chicken breast"))).toEqual({ status: "ready", name: "chicken breast", quantity: "2", unit: "each" });
    expect(read("2 milk")).toMatchObject({ status: "needs_review", name: "milk", quantity: { numerator: "2" } });
    expect(read("1 cup 3 eggs")).toMatchObject({ status: "needs_review", name: null });
    expect(read("0 g sugar").reasons).toContain("quantity_not_positive");
  });
});

describe("restatements (§12.6) and remark amounts (§12.11)", () => {
  it.each([
    ["1/3 cup (5 tbsp) butter", "5 tbsp"], ["2/3 cup (10 tbsp) sugar", "10 tbsp"], ["1 cup (250 ml) milk", "250 ml"], ["14 oz (400 g) tomatoes", "400 g"],
    ["1/4 tsp (1 ml) vanilla", "1 ml"], ["3/4 tsp (4 ml) salt", "4 ml"], ["1 lb (454 g) beef", "454 g"], ["1 lb (15 oz) beef", "15 oz"],
  ])("%s → equivalent %s", (line, eq) => {
    const r = read(line);
    expect(r.status).toBe("ready");
    expect(r.equivalents.map(amountText)).toContain(eq);
  });

  it("several restatements in one line are each checked", () => {
    expect(read("2 cups (500 ml / 17 fl oz) stock").status).toBe("ready");
    expect(read("1 cup (250 ml) (8.5 fl oz) milk").status).toBe("ready");
    expect(read("3 cups (750 ml) / 25 fl oz chicken stock").status).toBe("ready");
  });

  it.each(["1 lb (14 oz) ground beef", "1 lb (12 oz) ground beef", "8 oz (250 g) cheese", "1 lb (500 g) beef", "2 lb (1 kg) potatoes", "4 oz (100 g) butter", "1 1/2 cups (about 2 cups) milk"])(
    "beyond both tests: %s → a second amount",
    (line) => {
      const r = read(line);
      expect(r.status).toBe("needs_review");
      expect(r.reasons).toContain("quantity_unassigned");
    },
  );

  it.each(["1 cup cooked quinoa (from 1/3 cup dry)", "1 cup rice (1 cup dry makes 3 cooked)", "2 tbsp lime juice (from 1 lime)", "2 tsp kosher salt (such as Diamond Crystal; use half for table salt)"])(
    "an amount of a source, another state or a substitute in a remark: %s → needs review, remark kept",
    (line) => {
      const r = read(line);
      expect(r.status).toBe("needs_review");
      expect(r.reasons).toContain("quantity_unassigned");
      expect(r.note).not.toBeNull();
    },
  );

  it.each(["1 cup chopped onion (1 medium)", "1 lb carrots (about 6 medium)", "3 cloves garlic (1 tbsp minced)", "6 tbsp butter, cut into 6 pieces"])("negative control, a describing remark: %s → ready", (line) => {
    expect(read(line).status).toBe("ready");
  });
});

describe("decoration, unknown and foreign units (§12.13, §12.14)", () => {
  it.each([["▢ 1 cup sugar", "sugar"], ["☐ 2 tbsp butter", "butter"], ["✓ 1 egg", "egg"], ["10. 1 tsp vanilla", "vanilla"]])("%s → decoration removed", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name });
  });

  it("a combining accent is read as its composed letter", () => {
    expect(read("2 jalapeños")).toMatchObject({ status: "ready", name: "jalapeños" });
  });

  it.each(["1 m sausage", "2 k sugar", "1 pint milk (UK)", "1 UK pint milk", "2 cups flour (metric)", "-1 cup sugar"])("%s → needs review", (line) => {
    expect(read(line).status).toBe("needs_review");
  });

  // R1 H2 (CONTRACT §12.14): a measure word outside the registry — a household vessel or spoon, an archaic or foreign
  // unit, an informal lump, a "-ful" measure, a vessel named by its use, or any noun between the number and "of"
  it.each([
    "1 gill single cream", "2 drams vanilla essence", "1 tumbler orange juice", "2 ladles chicken stock", "1 teacup caster sugar", "1 dessert spoon cocoa powder",
    "1 thumb fresh ginger", "1 coffee cup plain flour", "1 wine glass red wine", "2 soup spoons sugar", "1 bowl cooked rice", "2 fistfuls spinach", "1 pottle cream",
    "1 hunk Parmesan", "1 chunk fresh ginger", "1 slab tofu", "1 tub-full yogurt", "1 can-ful water", "1 stone potatoes", "1 crate oranges", "1 bucket ice",
    "1 hunk of Parmesan", "1 large pot of salted water", "2 mugfuls milk", "1 yogurt pot sugar", "1 roll refrigerated pie dough", "1 jigger rum",
    "1 tea-cup milk", "1 measure gin", "2 fingers whiskey", "1 rack baby back ribs", "1 wheel brie",
  ])("unknown measure: %s → needs review, no amount, the measure in the note", (line) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", quantity: null, unit: null });
    expect(r.reasons).toContain("unit_unknown");
    expect(r.name ?? "").not.toMatch(/\b(?:gill|dram|tumbler|ladle|teacup|spoon|thumb|cup|glass|bowl|fistful|pottle|hunk|chunk|slab|stone|crate|bucket|pot|roll|jigger)s?\b/i);
  });

  it.each([
    ["2 heads of garlic", "head"], ["1 thumb-sized piece ginger", "piece"], ["1 can pineapple chunks", "can"], ["4 dinner rolls", "each"], ["1 cup cup noodles", "cup"],
    ["1 lb pineapple chunks", "lb"], ["1 egg yolk", "each"],
  ])("negative control, a registry unit or a food: %s → %s", (line, unit) => {
    expect(read(line)).toMatchObject({ status: "ready", unit: { canonical: unit } });
  });

  it("negative controls: single letters that are units or names", () => {
    expect(core(read("1 c sugar"))).toEqual({ status: "ready", name: "sugar", quantity: "1", unit: "cup" });
    expect(read("2 tbsp vitamin C powder")).toMatchObject({ status: "ready", name: "vitamin C powder" });
    expect(qText(read("1 pint milk").quantity)).toBe("1");
  });
});

describe("implied one and fruit parts", () => {
  it.each([["Pinch of salt", "pinch"], ["Small pinch of salt", "pinch"], ["Dash hot sauce", "dash"]])("%s → 1 %s", (line, unit) => {
    expect(read(line)).toMatchObject({ status: "ready", quantity: { numerator: "1" }, unit: { canonical: unit } });
  });

  // (CONTRACT §12.15 revised: a singular count unit is one — "Clove of garlic" → 1 clove; "Bunch of cilantro" moved there)
  it("negative controls: a plural or vague measure or a measuring unit gets no invented amount", () => {
    expect(read("Pinches of salt")).toMatchObject({ status: "needs_review", quantity: null });
    expect(read("Dashes of bitters")).toMatchObject({ status: "needs_review", quantity: null });
    expect(read("a few drops of vanilla")).toMatchObject({ status: "needs_review", quantity: null });
    expect(read("Cloves of garlic")).toMatchObject({ status: "needs_review", quantity: null });
    expect(read("Cup flour")).toMatchObject({ status: "needs_review", quantity: null });
    expect(read("Tablespoon olive oil")).toMatchObject({ status: "needs_review", quantity: null });
  });

  it("a singular count unit with no number is one (§12.15)", () => {
    expect(read("Clove of garlic")).toMatchObject({ status: "ready", quantity: { numerator: "1" }, unit: { canonical: "clove" }, name: "garlic" });
    expect(read("Bunch of cilantro")).toMatchObject({ status: "ready", quantity: { numerator: "1" }, unit: { canonical: "bunch" }, name: "cilantro" });
    expect(read("Heaping tablespoon of flour")).toMatchObject({ status: "needs_review", quantity: null, note: "Heaping" });
  });

  it("Juice of 2 limes, Zest of ½ orange → the fruit counted, the part is the note", () => {
    expect(read("Juice of 2 limes")).toMatchObject({ status: "ready", name: "limes", quantity: { numerator: "2" }, note: "Juice" });
    expect(read("Zest of ½ orange")).toMatchObject({ status: "ready", name: "orange", note: "Zest" });
    expect(read("Leaves of 2 sprigs thyme").status).toBe("needs_review");
  });
});

// --- fix round 1 (R1 H3, M5; CONTRACT §12.A A3, §12.1, §12.9, §12.12) -------------------------------------------------------

describe("remark amounts: extracted parts vs prepared food (§12.A A3, R1 H3)", () => {
  it.each([
    "2 tbsp lime juice (1 lime)", "3 tablespoons lemon juice (about 1 lemon)", "2 tbsp lime juice (juice of 1 lime)", "3 tbsp orange juice (1 orange)",
    "1 tbsp zest (from 2 oranges)", "2 tsp grated lemon zest (1 lemon)", "1/2 cup egg whites (from 4 eggs)", "1 cup breadcrumbs (from 2 slices bread)",
    "3 cups cooked rice (1 cup uncooked)", "2 tbsp lime juice, from 1 lime",
  ])("the source, another state or another food: %s → needs review, remark kept", (line) => {
    const r = read(line);
    expect(r.status).toBe("needs_review");
    expect(r.reasons).toContain("quantity_unassigned");
    expect(r.note).not.toBeNull();
  });

  it.each([
    ["1 cup chopped onion (1 medium onion)", "1 each", "medium"], ["1 cup grated carrot (2 medium carrots)", "2 each", "medium"],
    ["2 cups diced tomatoes (about 3 tomatoes)", "3 each", null], ["1 large onion (about 2 cups chopped)", "2 cup", "large; chopped"],
    ["1 cup mashed banana (2 ripe bananas)", "2 each", "ripe"], ["1 cup chopped onion (from 1 large onion)", "1 each", "large"],
    ["2 cups corn kernels (from 3 ears)", "3 ear", null], ["1 cup basil leaves (from 1 bunch)", "1 bunch", null], ["1 lb carrots (about 6 medium)", "6 each", "medium"],
  ])("the same food, whole or prepared: %s → ready, equivalent %s, note %s", (line, eq, note) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "ready", note });
    expect(r.equivalents.map(amountText)).toEqual([eq]);
  });

  it.each(["6 tbsp butter, cut into 6 pieces", "1 lb chicken, 2 cm cubes", "1 cup water (110°F)", "1 lb ground beef (80/20)", "1 cup rice, rinsed until water runs clear (about 3 times)"])(
    "negative control, a describing remark with a number: %s → ready, no equivalent",
    (line) => {
      const r = read(line);
      expect(r.status).toBe("ready");
      expect(r.equivalents).toEqual([]);
    },
  );
});

describe("unnecessary reviews removed (R1 M5)", () => {
  it.each([
    ["2 cups minus 1/4 cup sugar", "sugar", "1 3/4", "cup"], ["2 three cheese pizzas", "three cheese pizzas", "2", "each"],
    ["1 tbsp Heinz 57 sauce", "Heinz 57 sauce", "1", "tbsp"], ["a half-inch piece fresh ginger", "fresh ginger", "1", "piece"],
  ])("%s → %s", (line, name, q, unit) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit });
  });

  it.each(["1 cup minus 1 cup sugar", "1 cup Flour 2 eggs", "1 cup Parmesan 1 egg"])("negative control: %s → needs review", (line) => {
    expect(read(line).status).toBe("needs_review");
  });
});

describe("parts taken whole restate; extracted parts do not (§12.A A3)", () => {
  it.each([["3 ears corn (about 2 cups kernels)", "2 cup"], ["1 head cauliflower (about 4 cups florets)", "4 cup"], ["1 bunch cilantro (about 1 cup leaves)", "1 cup"]])(
    "%s → ready, equivalent %s",
    (line, eq) => {
      const r = read(line);
      expect(r.status).toBe("ready");
      expect(r.equivalents.map(amountText)).toEqual([eq]);
    },
  );

  it.each(["1 cup pomegranate arils (1 pomegranate)", "2 lemons (1/4 cup juice)", "1 cup egg whites (about 8 eggs)"])("%s → needs review", (line) => {
    expect(read(line).reasons).toContain("quantity_unassigned");
  });
});
