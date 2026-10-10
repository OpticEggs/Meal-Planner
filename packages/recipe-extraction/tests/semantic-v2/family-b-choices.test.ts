/**
 * semantic-v2 · family B: choices of ingredients (CONTRACT §7.8, §12.7). Every option is kept, in order; an option is
 * never dropped, merged or invented; the only words added are words written in the line and shared by the grammar.
 * Sourcing and form remarks stay notes.
 */
import { describe, expect, it } from "vitest";
import { andJoinsTwoFoods } from "../../src/ingredient/semantic-v2/alternatives";
import { read } from "./helpers";

const choice = (line: string) => {
  const r = read(line);
  expect(r.status, line).toBe("needs_review");
  expect(r.name, line).toBeNull();
  expect(r.reasons, line).toContain("ingredient_alternatives");
  return r.alternatives;
};

describe("(a) as written when the first option names a food on its own", () => {
  it.each([
    ["1 cup kale or Swiss chard", ["kale", "Swiss chard"]], ["1 lb ham or smoked turkey", ["ham", "smoked turkey"]], ["1 cup tea or apple juice", ["tea", "apple juice"]],
    ["1 cup buttermilk or plain yogurt", ["buttermilk", "plain yogurt"]], ["1 (15 oz) can chickpeas or white beans", ["chickpeas", "white beans"]],
    ["2 tbsp tahini or peanut butter", ["tahini", "peanut butter"]], ["1 tbsp sriracha or hot sauce", ["sriracha", "hot sauce"]], ["1 cup feta or goat cheese", ["feta", "goat cheese"]],
    ["1 tsp cumin or chili powder", ["cumin", "chili powder"]], ["1 tbsp Dijon or whole grain mustard", ["Dijon", "whole grain mustard"]],
    ["2 tbsp butter or olive oil", ["butter", "olive oil"]], ["1/4 cup honey or maple syrup", ["honey", "maple syrup"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });
});

describe("(b) a shared trailing head", () => {
  it.each([
    ["1 tbsp lemon or lime juice", ["lemon juice", "lime juice"]], ["4 cups chicken or vegetable broth", ["chicken broth", "vegetable broth"]],
    ["3 cups beef or chicken stock", ["beef stock", "chicken stock"]], ["2 tbsp white or yellow miso", ["white miso", "yellow miso"]],
    ["4 hamburger or hot dog buns", ["hamburger buns", "hot dog buns"]], ["1/2 cup red or white wine", ["red wine", "white wine"]],
    ["1 red or yellow bell pepper", ["red bell pepper", "yellow bell pepper"]], ["1 tsp garlic or onion powder", ["garlic powder", "onion powder"]],
    ["1 cup frozen or fresh green beans", ["frozen green beans", "fresh green beans"]], ["1/4 cup red or white wine vinegar", ["red wine vinegar", "white wine vinegar"]],
    ["2 tbsp white or apple cider vinegar", ["white vinegar", "apple cider vinegar"]], ["1 can black or pinto beans", ["black beans", "pinto beans"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });
});

describe("(c) a shared leading modifier, (d) a forward head", () => {
  it.each([
    ["1 lb ground beef or turkey", ["ground beef", "ground turkey"]], ["1 tsp dried oregano or thyme", ["dried oregano", "dried thyme"]],
    ["1 tbsp chopped parsley or cilantro", ["chopped parsley", "chopped cilantro"]], ["1 cup shredded cheddar or Monterey Jack", ["shredded cheddar", "shredded Monterey Jack"]],
    ["1 cup whole milk or 2%", ["whole milk", "2% milk"]], ["1 tbsp fresh thyme (or 1 tsp dried)", ["fresh thyme", "dried thyme"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });

  it("negative control: a last option with its own modifier is not given the first option's", () => {
    expect(choice("1 lb ground beef or smoked turkey")).toEqual(["ground beef", "smoked turkey"]);
  });
});

describe("(e) lists, (f) 'X, A or B'", () => {
  it.each([
    ["1 tbsp maple syrup, honey, or agave", ["maple syrup", "honey", "agave"]], ["1 cup pecans, walnuts, or almonds", ["pecans", "walnuts", "almonds"]],
    ["1/2 cup raisins, cranberries or cherries", ["raisins", "cranberries", "cherries"]], ["2 cups spinach, kale, or chard", ["spinach", "kale", "chard"]],
    ["1 cup milk, cream, or half-and-half", ["milk", "cream", "half-and-half"]], ["1 cup chicken, beef, or vegetable stock", ["chicken stock", "beef stock", "vegetable stock"]],
    ["1 cup beef, chicken, or vegetable stock", ["beef stock", "chicken stock", "vegetable stock"]], ["1 cup pecans or walnuts or almonds", ["pecans", "walnuts", "almonds"]],
    ["1 cup milk/cream", ["milk", "cream"]], ["2 tbsp butter and/or oil", ["butter", "oil"]],
    ["1 cup broth, chicken or vegetable", ["chicken broth", "vegetable broth"]], ["1 cup flour, all-purpose or bread", ["all-purpose flour", "bread flour"]],
    ["1 cup sugar, white or brown", ["white sugar", "brown sugar"]], ["4 slices bread, white or wheat", ["white bread", "wheat bread"]],
    ["1 cup nuts, pecans or walnuts", ["pecans", "walnuts"]], ["1 cup cheese, cheddar or Swiss", ["cheddar", "Swiss"]],
    ["1 tbsp oil (vegetable or canola)", ["vegetable oil", "canola oil"]], ["1 cup cream (heavy or whipping)", ["heavy cream", "whipping cream"]],
    ["1/2 cup chopped nuts (pecans or walnuts)", ["pecans", "walnuts"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });

  it("every option written is kept: the alternatives contain each option's own words", () => {
    for (const line of ["1 cup pecans, walnuts, or almonds", "1 tbsp maple syrup, honey, or agave", "1 lb chicken, pork, or tofu"]) {
      const alts = choice(line).join(" ");
      for (const w of line.replace(/^[\d/ ]+(?:cup|tbsp|lb)\s+/, "").split(/[ ,]+/).filter((x) => x !== "or" && x !== "")) expect(alts, `${line}: ${w}`).toContain(w);
    }
  });
});

describe("sourcing and form remarks stay notes (§7.8, §12.7 f)", () => {
  it.each([
    ["1/3 cup pesto (homemade (or store-bought))", "pesto"], ["⅔ cup hummus (store-bought (or see recipe))", "hummus"],
    ["1 1/3 cups chicken stock (homemade (or low-sodium boxed))", "chicken stock"], ["2 cups spinach, fresh or frozen", "spinach"],
    ["1 cup tomato sauce (jarred or homemade)", "tomato sauce"], ["1 tbsp oil (such as canola or vegetable)", "oil"],
  ])("%s → ready, %s", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name, alternatives: [] });
  });

  it("negative control: 'fresh or frozen' before the food is a choice (§12.7 c)", () => {
    expect(choice("1 lb fresh or frozen cranberries")).toEqual(["fresh cranberries", "frozen cranberries"]);
  });
});

describe("(g) options with their own amounts; foods sharing one amount", () => {
  it("the first option's amount is the line's", () => {
    const r = read("1 tsp dried thyme or 1 tbsp fresh thyme");
    expect(r).toMatchObject({ status: "needs_review", name: null, quantity: { numerator: "1" }, unit: { canonical: "tsp" }, alternatives: ["dried thyme", "fresh thyme"] });
  });

  it.each(["1/2 tsp each salt and pepper", "1 cup carrots, celery and onion", "1 lb. each ground beef and ground pork"])("%s → needs review, no name", (line) => {
    expect(read(line)).toMatchObject({ status: "needs_review", name: null, alternatives: [] });
  });
});

// --- fix round 1 (R1 M1–M3, H4, H5; CONTRACT §12.7, §12.A A4) ----------------------------------------------------------

describe("(b) shared heads by source classes and version words (R1 M1)", () => {
  it.each([
    ["1 cup almond or cashew butter", ["almond butter", "cashew butter"]], ["1 lb pork or chicken sausage", ["pork sausage", "chicken sausage"]],
    ["1 pint cherry or grape tomatoes", ["cherry tomatoes", "grape tomatoes"]], ["1 tsp onion or garlic salt", ["onion salt", "garlic salt"]],
    ["1 lb beef or pork tenderloin", ["beef tenderloin", "pork tenderloin"]], ["1 cup coconut or brown sugar", ["coconut sugar", "brown sugar"]],
    ["1 cup macadamia or cashew nuts", ["macadamia nuts", "cashew nuts"]], ["4 slider or dinner rolls", ["slider rolls", "dinner rolls"]],
    ["1 tbsp yellow or Dijon mustard", ["yellow mustard", "Dijon mustard"]], ["2 cups apple or pear cider", ["apple cider", "pear cider"]],
    ["4 oz dark or milk chocolate", ["dark chocolate", "milk chocolate"]], ["1 cup white or whole wheat flour", ["white flour", "whole wheat flour"]],
    ["1 cup oat or almond milk", ["oat milk", "almond milk"]], ["1 cup pistachio or hazelnut butter", ["pistachio butter", "hazelnut butter"]],
    ["1 lb lamb or beef sausage", ["lamb sausage", "beef sausage"]], ["2 tbsp sesame or peanut oil", ["sesame oil", "peanut oil"]],
    ["1/4 cup red or white wine vinegar", ["red wine vinegar", "white wine vinegar"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });

  it.each([
    ["1 cup kale or Swiss chard", ["kale", "Swiss chard"]], ["1 cup peas or green beans", ["peas", "green beans"]], ["1 cup tea or apple juice", ["tea", "apple juice"]],
    ["2 tbsp butter or olive oil", ["butter", "olive oil"]], ["1/4 cup honey or maple syrup", ["honey", "maple syrup"]], ["2 tbsp tahini or peanut butter", ["tahini", "peanut butter"]],
    ["1 cup flour or almond flour", ["flour", "almond flour"]],
  ])("negative control, a first option that is a food of its own stays as written: %s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });
});

describe("lists never invent strings; varieties after a comma or in brackets (R1 M2, M3)", () => {
  it.each([
    ["1 cup red, yellow, or orange bell pepper, diced", ["red bell pepper", "yellow bell pepper", "orange bell pepper"]],
    ["2 cups red, yellow or orange peppers", ["red peppers", "yellow peppers", "orange peppers"]],
    ["1 cup flour (all-purpose or whole wheat)", ["all-purpose flour", "whole wheat flour"]], ["2 apples, Granny Smith or Honeycrisp", ["Granny Smith apples", "Honeycrisp apples"]],
    ["2 lb potatoes, Yukon Gold or russet", ["Yukon Gold potatoes", "russet potatoes"]], ["1 lb Yukon Gold potatoes or red", ["Yukon Gold potatoes", "red potatoes"]],
    ["1 cup cheese, Cheddar or Swiss", ["Cheddar", "Swiss"]],
  ])("%s", (line, options) => {
    const alts = choice(line);
    expect(alts).toEqual(options);
    for (const a of alts) for (const w of a.split(" ")) expect(line.toLowerCase(), `${a}: ${w}`).toContain(w.toLowerCase());
  });
});

describe("a choice of forms with no comma or bracket (§12.7 d, R1 H4)", () => {
  it.each([
    ["2 tbsp fresh oregano or dried", ["fresh oregano", "dried oregano"]], ["1 tbsp dried dill or fresh", ["dried dill", "fresh dill"]],
    ["2 cups fresh cherries or frozen", ["fresh cherries", "frozen cherries"]], ["1 lb fresh green beans or frozen", ["fresh green beans", "frozen green beans"]],
    ["1 tbsp chopped fresh parsley or dried", ["chopped fresh parsley", "dried parsley"]], ["1 cup whole milk or skim", ["whole milk", "skim milk"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });

  it.each([["1 tbsp fresh parsley (or dried)", "fresh parsley"], ["1 cup salsa homemade or store-bought", "salsa homemade"], ["1 cup grated cheese or more", "grated cheese"]])(
    "negative control, a bracket, a sourcing remark after the food, or an amount remark stays a note: %s",
    (line, name) => {
      expect(read(line)).toMatchObject({ name, alternatives: [] });
    },
  );
});

describe("two foods joined by 'and' after one amount (§12.A A4, R1 H5)", () => {
  it.each([
    "2 cups strawberries and blueberries", "2 cups chopped celery and carrots", "1 cup onion and bell pepper, diced", "2 tbsp butter and oil", "1 lb shrimp and scallops",
    "4 cups broccoli and cauliflower florets", "1/4 cup sesame and flax seeds", "1/2 tsp garlic and onion powder", "2 cups lettuce & tomato",
  ])("%s → needs review, no name, the foods kept in the note", (line) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "needs_review", name: null, alternatives: [] });
    expect(r.note ?? "").toMatch(/ and | & /);
  });

  it.each([
    ["1 tsp salt and pepper", "salt and pepper"], ["1 tsp kosher salt and freshly ground black pepper", "kosher salt and freshly ground black pepper"],
    ["1 cup macaroni and cheese", "macaroni and cheese"], ["1 jar sweet and sour sauce", "sweet and sour sauce"], ["1/4 cup oil and vinegar dressing", "oil and vinegar dressing"],
    ["1 bag salt and vinegar potato chips", "salt and vinegar potato chips"], ["3 red and yellow bell peppers", "red and yellow bell peppers"],
    ["2 cups peeled and diced potatoes", "peeled and diced potatoes"], ["1 can pork and beans", "pork and beans"], ["1 cup spinach and artichoke dip", "spinach and artichoke dip"],
    ["1 cup half and half", "half and half"],
  ])("negative control, one food: %s", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name });
  });

  it("andJoinsTwoFoods decides on the name", () => {
    expect(andJoinsTwoFoods("strawberries and blueberries")).toBe(true);
    expect(andJoinsTwoFoods("red and yellow bell peppers")).toBe(false);
    expect(andJoinsTwoFoods("salt and vinegar potato chips")).toBe(false);
    expect(andJoinsTwoFoods("macaroni and cheese")).toBe(false);
  });
});

describe("(b) a part or a product of a source shares its last word (R1 M1)", () => {
  it.each([
    ["1 cup walnut or pecan halves", ["walnut halves", "pecan halves"]], ["1 cup broccoli or cauliflower florets", ["broccoli florets", "cauliflower florets"]],
    ["1 lb salmon or cod fillets", ["salmon fillets", "cod fillets"]], ["1 cup apple or white grape juice", ["apple juice", "white grape juice"]],
    ["1 cup cottage or ricotta cheese", ["cottage cheese", "ricotta cheese"]], ["1 cup strawberry or raspberry jam", ["strawberry jam", "raspberry jam"]],
  ])("%s", (line, options) => {
    expect(choice(line)).toEqual(options);
  });

  it.each([["1 cup ricotta or cottage cheese", ["ricotta", "cottage cheese"]], ["1 tbsp hoisin or oyster sauce", ["hoisin", "oyster sauce"]]])(
    "negative control, a product of the head's kind stays as written: %s",
    (line, options) => {
      expect(choice(line)).toEqual(options);
    },
  );
});
