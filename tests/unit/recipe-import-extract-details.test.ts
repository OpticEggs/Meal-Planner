/**
 * Recipe details beyond ingredients: method steps, description, images, site name, category and
 * cuisine from JSON-LD (with @id references), the microdata fallback, and Open Graph page meta.
 * Fixtures are synthetic (tests/fixtures/recipe-pages, see its README).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractRecipes, JSONLD_LIMITS, pageMeta, type RecipeCandidate } from "@/server/integrations/recipe-import/jsonld";

const fixture = (name: string) => readFileSync(path.join(__dirname, "../fixtures/recipe-pages", name), "utf8");
// "</" is written "<\/" (valid JSON) so a value can never close the script element early.
const ld = (data: unknown) => `<script type="application/ld+json">${typeof data === "string" ? data : JSON.stringify(data).replace(/<\//g, "<\\/")}</script>`;
const BASE = "https://www.example.com/recipes/page/";
const one = (html: string, baseUrl?: string): RecipeCandidate => {
  const { candidates } = extractRecipes(html, { baseUrl });
  expect(candidates).toHaveLength(1);
  return candidates[0];
};
const recipe = (fields: Record<string, unknown>, baseUrl?: string) => one(ld({ "@type": "Recipe", name: "R", ...fields }), baseUrl);

/** Text fields are plain text within limits; every image is an absolute http(s) link. */
function expectSafe(c: RecipeCandidate) {
  const texts = [c.name, c.yield, c.author, c.description, c.siteName, c.category, c.cuisine, ...c.ingredients, ...c.instructions.flatMap((i) => [i.section, i.text])];
  for (const s of texts) {
    if (s === null) continue;
    expect(s).not.toMatch(/<[A-Za-z/!?]/);
    expect(s).not.toMatch(/[\u0000-\u001f‪-‮⁦-⁩]/);
    expect(s.length).toBeLessThanOrEqual(JSONLD_LIMITS.maxString * 2);
  }
  expect(c.instructions.length).toBeLessThanOrEqual(JSONLD_LIMITS.maxSteps);
  for (const i of c.instructions) expect(i.text.length).toBeLessThanOrEqual(JSONLD_LIMITS.maxStepChars);
  expect(c.images.length).toBeLessThanOrEqual(JSONLD_LIMITS.maxImages);
  expect(new Set(c.images).size).toBe(c.images.length);
  for (const u of c.images) expect(u).toMatch(/^https?:\/\/[a-z0-9.-]+\//);
  for (const s of [c.category, c.cuisine]) if (s) expect(s.length).toBeLessThanOrEqual(JSONLD_LIMITS.maxShortText);
}

describe("WordPress / Yoast @graph page", () => {
  it("reads the Recipe node with its linked Person, WebSite and ImageObject nodes", () => {
    const { candidates, problems, meta, stats } = extractRecipes(fixture("wordpress-graph.html"), { baseUrl: "https://www.example.com/smoky-pantry-beans/" });
    expect(problems).toEqual([]);
    expect(stats).toEqual({ jsonLdBlocks: 1, recipeNodes: 1, microdata: false });
    expect(meta).toEqual({
      title: "Synthetic Smoky Pantry Beans",
      siteName: "Synthetic Kitchen Notes (OG)",
      image: "https://www.example.com/wp-content/uploads/2026/01/smoky-beans-og.jpg",
    });
    expect(candidates).toHaveLength(1);
    const c = candidates[0];
    expectSafe(c);
    expect(c).toMatchObject({
      name: "Synthetic Smoky Pantry Beans",
      author: "Sam Synthetic", // {"@id"} → the Person node
      description: "An invented weeknight skillet of beans & tomatoes, with smoky paprika.",
      siteName: "Synthetic Kitchen Notes", // the WebSite node beats the Organization and og:site_name
      category: "Main Course",
      cuisine: "Synthetic Fusion",
      source: "json_ld",
      sourceUrl: "https://www.example.com/smoky-pantry-beans/", // from @id, fragment dropped
      servings: 4,
      prepMinutes: 10,
      cookMinutes: 25,
      totalMinutes: 35,
      hasInstructions: true,
      hasNutrition: true,
    });
    expect(c.ingredients).toHaveLength(8);
    expect(c.ingredients[0]).toBe("1 Tbsp olive oil ($0.16)"); // price annotations stay in the raw line
    expect(c.instructions).toEqual([
      { section: "Start the base", text: "Warm the olive oil in a deep skillet over medium heat." },
      { section: "Start the base", text: "Cook the onion and garlic until soft, about 5 minutes." },
      { section: "Simmer", text: "Add the beans, tomatoes, paprika and salt." },
      { section: "Simmer", text: "Simmer for 20 minutes, then top with parsley." }, // a step with only a name
    ]);
    // widest first; the {"@id"} reference resolves to an image already listed, so it is not repeated
    expect(c.images).toEqual([
      "https://www.example.com/wp-content/uploads/2026/01/smoky-beans-1.jpg",
      "https://www.example.com/wp-content/uploads/2026/01/smoky-beans-1-500x500.jpg",
      "https://www.example.com/wp-content/uploads/2026/01/smoky-beans-1-225x225.jpg",
    ]);
    expect(JSON.stringify(candidates)).not.toMatch(/321 kcal|Not this one|LLC/);
  });

  it("gives the same result without a base URL (all links are absolute)", () => {
    const withBase = extractRecipes(fixture("wordpress-graph.html"), { baseUrl: "https://www.example.com/smoky-pantry-beans/" });
    expect(extractRecipes(fixture("wordpress-graph.html"))).toEqual(withBase);
  });
});

describe("microdata fallback", () => {
  it("reads a microdata-only page: nested items skipped, author name nested, scope ends with the Recipe element", () => {
    const { candidates, problems, meta, stats } = extractRecipes(fixture("microdata.html"), { baseUrl: "https://www.example.com/bars/" });
    expect(problems).toEqual([]);
    expect(stats).toEqual({ jsonLdBlocks: 0, recipeNodes: 0, microdata: true });
    expect(meta).toEqual({ title: "Synthetic Oat Crumble Bars", siteName: "Example Synthetic Bakes", image: null });
    expect(candidates).toEqual([
      {
        name: "Synthetic Oat Crumble Bars",
        ingredients: ["2 cups rolled oats", "1 cup flour", "1/2 cup butter, melted", "1/3 cup brown sugar", "1 pinch salt"],
        yield: "16 bars",
        servings: null,
        prepMinutes: 15,
        cookMinutes: 30,
        totalMinutes: 45,
        hasInstructions: true,
        hasNutrition: true,
        sourceUrl: null,
        author: "Robin Invented",
        description: "Invented bars with a crumbly top & a soft middle.",
        instructions: [
          { section: null, text: "Heat the oven to 350°F and line a pan." },
          { section: null, text: "Mix the oats, flour, sugar and salt; stir in the butter." },
          { section: null, text: "Press into the pan and bake for 30 minutes." },
          { section: null, text: "Cool before cutting into 16 bars." },
        ],
        images: ["https://www.example.com/images/oat-bars.jpg?w=800&h=600", "https://cdn.example.org/oat-bars-square.jpg"],
        siteName: "Example Synthetic Bakes",
        category: "Dessert",
        cuisine: "Synthetic",
        source: "microdata",
      },
    ]);
    expect(JSON.stringify(candidates)).not.toMatch(/review title|Reviewer Nobody|Pan Product|outside the recipe|111 calories|header outside|Not from a script/);
  });

  it("is used only when JSON-LD gave no Recipe", () => {
    const md = `<div itemscope itemtype="https://schema.org/Recipe"><span itemprop="name">From microdata</span><span itemprop="recipeIngredient">1 cup rice</span></div>`;
    expect(extractRecipes(ld({ "@type": "Recipe", name: "From JSON-LD" }) + md).candidates.map((c) => [c.name, c.source])).toEqual([["From JSON-LD", "json_ld"]]);
    const r = extractRecipes(ld({ "@type": "WebSite", name: "Site" }) + md);
    expect(r.candidates.map((c) => [c.name, c.source, c.ingredients])).toEqual([["From microdata", "microdata", ["1 cup rice"]]]);
    expect(r.stats).toEqual({ jsonLdBlocks: 1, recipeNodes: 0, microdata: true });
    expect(extractRecipes("<p>nothing here</p>").stats.microdata).toBe(false);
  });

  it.each([
    'itemtype="https://schema.org/Recipe"',
    'itemtype="http://schema.org/Recipe"',
    "itemtype='HTTP://SCHEMA.ORG/RECIPE'",
    'itemtype="https://schema.org/Recipe/"',
    'itemtype="https://schema.org/Thing https://schema.org/Recipe"',
    "ITEMTYPE=https://schema.org/recipe",
  ])("finds the Recipe element by %s", (attr) => {
    expect(one(`<article itemscope ${attr}><h1 itemprop="name">Found</h1></article>`).name).toBe("Found");
  });

  it.each([
    'itemtype="https://schema.org/RecipeCollection"',
    'itemtype="https://example.com/schema.org/Recipe"',
    'data-itemtype="https://schema.org/Recipe"',
    'itemtype="schema.org/Recipe"',
  ])("ignores %s", (attr) => {
    expect(extractRecipes(`<article itemscope ${attr}><h1 itemprop="name">No</h1></article>`).candidates).toEqual([]);
  });

  it("reads attributes, nested same-name tags, void elements and li steps", () => {
    const c = one(`
      <div itemscope itemtype="https://schema.org/Recipe">
        <meta itemprop="name" content="Meta &amp; Name">
        <h1 itemprop="name">Second name is ignored</h1>
        <meta itemprop="recipeYield" content="4"><span itemprop="recipeYield">4 servings</span>
        <span itemprop="prepTime">PT5M</span>
        <time itemprop="cookTime" datetime="PT1H">an hour</time>
        <meta itemprop="totalTime" content="nonsense">
        <div itemprop="recipeIngredient"><div>2</div> <div>cups <div>water</div></div></div>
        <img itemprop="recipeIngredient" src="x.png">
        <meta itemprop="image" content="https://cdn.example.org/a.jpg">
        <img itemprop="image" src="javascript:alert(1)">
        <span itemprop="author">Plain Author</span>
        <span itemprop="author">Second author ignored</span>
        <ul itemprop="recipeInstructions"><li>One.</li><li>Two <b>bold</b>.</li><li> </li></ul>
        <p itemprop="recipeInstructions">Three.<br>Four.</p>
        <meta itemprop="recipeCategory" content="Soup">
        <span itemprop="recipeCuisine">Invented, Other</span>
      </div>`);
    expect(c).toMatchObject({
      name: "Meta & Name",
      yield: "4 servings",
      servings: 4,
      prepMinutes: 5,
      cookMinutes: 60,
      totalMinutes: null,
      ingredients: ["2 cups water"],
      images: ["https://cdn.example.org/a.jpg"],
      author: "Plain Author",
      category: "Soup",
      cuisine: "Invented",
      hasNutrition: false,
      source: "microdata",
      siteName: null,
    });
    expect(c.instructions.map((i) => i.text)).toEqual(["One.", "Two bold .", "Three.", "Four."]);
  });

  it("an unclosed property element has no text; a script inside the recipe is not read", () => {
    const c = one(`<section itemscope itemtype="https://schema.org/Recipe">
      <script>var x = '<span itemprop="name">Script name</span>';</script>
      <span itemprop="description">never closed
      <b itemprop="name">Real</b>
    </section>`);
    expect(c.name).toBe("Real");
    expect(c.description).toBeNull();
  });

  it("caps itemprop elements and reports it", () => {
    const html = `<div itemscope itemtype="https://schema.org/Recipe">${'<span itemprop="recipeIngredient">1 cup x</span>'.repeat(2_500)}</div>`;
    const r = extractRecipes(html);
    expect(r.problems).toEqual([`more than ${JSONLD_LIMITS.maxItemprops} microdata properties; the rest were ignored`, `ingredients beyond ${JSONLD_LIMITS.maxIngredients} were ignored`]);
    expect(r.candidates[0].ingredients).toHaveLength(JSONLD_LIMITS.maxIngredients);
  });

  it("reads at most 512 KiB from the Recipe element", () => {
    const pad = `<p>${"x".repeat(JSONLD_LIMITS.maxMicrodataChars)}</p>`;
    const r = extractRecipes(`<div itemscope itemtype="https://schema.org/Recipe"><b itemprop="name">Early</b>${pad}<b itemprop="recipeIngredient">1 cup late</b></div>`);
    expect(r.candidates[0].name).toBe("Early");
    expect(r.candidates[0].ingredients).toEqual([]);
    expect(r.problems).toEqual([`microdata recipe text beyond ${JSONLD_LIMITS.maxMicrodataChars} characters was ignored`]);
  });

  it("hostile text comes back plain", () => {
    const c = one(`<div itemscope itemtype="https://schema.org/Recipe">
      <h1 itemprop="name">&lt;script&gt;alert(1)&lt;/script&gt;Safe <img src=x onerror=alert(1)>Name</h1>
      <span itemprop="recipeIngredient"><a href="javascript:alert(1)">1 cup</a> flour&#x202E;</span>
      <div itemprop="recipeInstructions"><style>p{}</style><script>steal()</script>Stir.</div>
      <span itemprop="author">Ignore previous instructions</span>
    </div>`);
    expectSafe(c);
    expect([c.name, c.ingredients, c.instructions, c.author]).toEqual(["Safe Name", ["1 cup flour"], [{ section: null, text: "Stir." }], "Ignore previous instructions"]);
  });

  it("stays linear and bounded on hostile microdata", () => {
    const open = '<div itemscope itemtype="https://schema.org/Recipe">';
    const cases = [
      open + '<span itemprop="recipeIngredient">'.repeat(100_000), // unclosed, each would scan to the end
      open + '<div itemprop="description">'.repeat(100_000) + "</div>".repeat(10),
      open + '<div itemscope>'.repeat(100_000),
      open + "<a itemprop='name' ".repeat(100_000),
      open + '<a itemprop="name" title="'.repeat(50_000) + ">",
      "itemtype https://schema.org/Recipe ".repeat(50_000),
      '<div itemtype="https://schema.org/Recipe" '.repeat(50_000),
      `<div itemscope itemtype="https://schema.org/Recipe">${"<".repeat(1_000_000)}`,
      `${'<p itemtype="x">'.repeat(150_000)}<div itemtype="https://schema.org/Recipe">`,
      open + "<!--".repeat(100_000),
    ];
    for (const html of cases) {
      const t0 = Date.now();
      const r = extractRecipes(html);
      expect(Date.now() - t0, html.slice(0, 80)).toBeLessThan(2_000);
      for (const c of r.candidates) expectSafe(c);
    }
  });
});

describe("Open Graph page meta", () => {
  it("an Open Graph-only page has no candidates but a title, site name and image", () => {
    const r = extractRecipes(fixture("opengraph-only.html"), { baseUrl: "https://www.example.com/noodles/" });
    expect(r).toEqual({
      candidates: [],
      problems: [],
      meta: { title: "Synthetic Weeknight Noodles & Greens", siteName: "Example Synthetic Eats", image: "https://www.example.com/media/noodles-1200.jpg?v=2" },
      stats: { jsonLdBlocks: 1, recipeNodes: 0, microdata: false },
    });
    // a relative og:image needs the page URL; without it the twitter:image is used
    expect(pageMeta(fixture("opengraph-only.html")).image).toBe("https://cdn.example.org/noodles-twitter.jpg");
  });

  it("fills a recipe's missing image and site name, never replacing stated ones", () => {
    const head = '<meta property="og:image" content="https://cdn.example.org/og.jpg"><meta property="og:site_name" content="OG Site">';
    expect(one(head + ld({ "@type": "Recipe", name: "A" }))).toMatchObject({ images: ["https://cdn.example.org/og.jpg"], siteName: "OG Site" });
    const stated = one(head + ld({ "@type": "Recipe", name: "B", image: "https://cdn.example.org/own.jpg", publisher: { "@type": "Organization", name: "Own" } }));
    expect(stated).toMatchObject({ images: ["https://cdn.example.org/own.jpg"], siteName: "Own" });
  });

  it("reads property or name, any attribute order and case; the first value wins", () => {
    expect(
      pageMeta(`<meta content="T1" property="og:title"><META NAME="OG:TITLE" CONTENT="T2"><meta name="og:site_name" content=" S  1 "><meta property="og:site_name" content="S2">`),
    ).toEqual({ title: "T1", siteName: "S 1", image: null });
  });

  it("ignores meta-like text inside comments and scripts, and tags with no content", () => {
    const html = `<!-- <meta property="og:title" content="comment"> --><script>'<meta property="og:title" content="script">'</script>
      <meta property="og:title"><meta property="og:title" content="Real">`;
    expect(pageMeta(html).title).toBe("Real");
    expect(pageMeta(`<!-- <meta property="og:title" content="never closed">`).title).toBeNull();
    expect(pageMeta(`<script><meta property="og:title" content="x">`).title).toBeNull();
    expect(pageMeta(`<metadata property="og:title" content="x"><meta/property="og:title" content="slash">`).title).toBe("slash");
  });

  it("cleans text and validates the image link", () => {
    const meta = (image: string, baseUrl?: string) => pageMeta(`<meta property="og:image" content="${image}">`, baseUrl).image;
    expect(pageMeta(`<meta property="og:title" content="&lt;b&gt;Bold&lt;/b&gt; &amp; plain&#x202E;">`).title).toBe("Bold & plain");
    expect(meta("javascript:alert(1)")).toBeNull();
    expect(meta("data:image/png;base64,AAAA")).toBeNull();
    expect(meta("http://localhost/a.jpg")).toBeNull();
    expect(meta("http://192.168.0.1/a.jpg")).toBeNull();
    expect(meta("/a.jpg")).toBeNull();
    expect(meta("/a.jpg?utm_medium=x#frag", BASE)).toBe("https://www.example.com/a.jpg");
    expect(meta("//cdn.example.org/a.jpg", BASE)).toBe("https://cdn.example.org/a.jpg");
    expect(meta(`https://cdn.example.org/${"a".repeat(3000)}.jpg`)).toBeNull();
  });

  it("reads at most 500 meta tags", () => {
    const filler = '<meta name="x" content="y">'.repeat(JSONLD_LIMITS.maxMetaTags);
    expect(pageMeta(`${filler}<meta property="og:title" content="Late">`).title).toBeNull();
    expect(pageMeta(`${filler.slice(27)}<meta property="og:title" content="Just in time">`).title).toBe("Just in time");
  });

  it("is linear on hostile markup and tolerates non-string input", () => {
    const t0 = Date.now();
    pageMeta("<meta".repeat(300_000));
    pageMeta(`<meta content="${"x".repeat(1_000_000)}`);
    pageMeta("<script>".repeat(200_000) + '<meta property="og:title" content="x">');
    pageMeta("<!--".repeat(200_000));
    pageMeta(`${"<script></script>".repeat(100_000)}${'<meta name="a" content="b">'.repeat(400)}`);
    expect(Date.now() - t0).toBeLessThan(2_000);
    expect(pageMeta(undefined as unknown as string)).toEqual({ title: null, siteName: null, image: null });
  });
});

describe("method steps (recipeInstructions)", () => {
  const steps = (recipeInstructions: unknown) => recipe({ recipeInstructions }).instructions;
  const texts = (recipeInstructions: unknown) => steps(recipeInstructions).map((s) => s.text);

  it("splits a string on newlines, <br>, <li>, </p>", () => {
    expect(texts("Mix.\nBake.\r\nCool.")).toEqual(["Mix.", "Bake.", "Cool."]);
    expect(texts("<ol><li>Mix.</li><li>Bake.<li>Cool.</ol>")).toEqual(["Mix.", "Bake.", "Cool."]);
    expect(texts("<p>Mix.</p><p>Bake.</p>Cool.<br/>Serve.<BR>Eat.")).toEqual(["Mix.", "Bake.", "Cool.", "Serve.", "Eat."]);
    expect(texts("  \n\n <p> </p>")).toEqual([]);
  });

  it("reads arrays of strings, HowToStep text before name, and a step's own list", () => {
    expect(texts(["One.", "Two.\nThree."])).toEqual(["One.", "Two.", "Three."]);
    expect(texts([{ "@type": "HowToStep", text: "Text wins.", name: "Name loses." }, { "@type": "HowToStep", name: "Only a name." }, { "@type": "HowToStep", text: "   ", name: "Blank text falls back." }])).toEqual([
      "Text wins.", "Only a name.", "Blank text falls back.",
    ]);
    expect(texts({ "@type": "HowToStep", text: "A step's text\nis one step." })).toEqual(["A step's text is one step."]);
    expect(texts([{ "@type": "HowToStep", itemListElement: [{ "@type": "HowToDirection", text: "Direction one." }, { "@type": "HowToTip", text: "A tip." }] }])).toEqual([
      "Direction one.", "A tip.",
    ]);
    expect(texts({ "@type": "ItemList", itemListElement: [{ "@type": "ListItem", text: "Listed." }, "Plain."] })).toEqual(["Listed.", "Plain."]);
    expect(texts(["https://schema.org/HowToStep"].map((t) => ({ "@type": t, text: "IRI type." })))).toEqual(["IRI type."]);
  });

  it("keeps HowToSection names as the section, including untyped name + list nodes", () => {
    expect(
      steps([
        "Before any section.",
        { "@type": "HowToSection", name: "<b>Dough</b>", itemListElement: [{ "@type": "HowToStep", text: "Knead." }] },
        { name: "Untyped section", itemListElement: ["Rest."] },
        { "@type": "HowToSection", itemListElement: [{ "@type": "HowToStep", text: "Unnamed section keeps the outer one." }] },
      ]),
    ).toEqual([
      { section: null, text: "Before any section." },
      { section: "Dough", text: "Knead." },
      { section: "Untyped section", text: "Rest." },
      { section: null, text: "Unnamed section keeps the outer one." },
    ]);
  });

  it("walks at most 3 levels of nesting", () => {
    const nest = (levels: number): unknown => (levels === 0 ? { "@type": "HowToStep", text: "Deep." } : { "@type": "HowToSection", name: `L${levels}`, itemListElement: [nest(levels - 1)] });
    expect(texts([nest(3)])).toEqual(["Deep."]);
    expect(texts([nest(4)])).toEqual([]);
    expect(texts([[[["Three arrays down."]]]])).toEqual(["Three arrays down."]);
    expect(texts([[[[["Four arrays down."]]]]])).toEqual([]);
  });

  it("caps steps at 60 and each step at 1000 characters", () => {
    const r = extractRecipes(ld({ "@type": "Recipe", recipeInstructions: Array.from({ length: 80 }, (_, i) => `Step ${i + 1}.`) }));
    expect(r.candidates[0].instructions).toHaveLength(JSONLD_LIMITS.maxSteps);
    expect(r.candidates[0].instructions.at(-1)?.text).toBe("Step 60.");
    expect(r.problems).toEqual([`instruction steps beyond ${JSONLD_LIMITS.maxSteps} were ignored`]);
    expect(texts("Line.\n".repeat(200))).toHaveLength(JSONLD_LIMITS.maxSteps);
    const long = steps(["s".repeat(5_000)]);
    expect(long[0].text).toHaveLength(JSONLD_LIMITS.maxStepChars);
  });

  it("ignores junk and strips markup", () => {
    expect(texts([null, 7, true, {}, { "@type": "HowToStep" }, { "@type": "HowToStep", text: 5 }, [], "<script>evil()</script>", "<img src=x onerror=alert(1)>"])).toEqual([]);
    expect(texts("&lt;b&gt;Stir&lt;/b&gt; &amp; serve&#8238;")).toEqual(["Stir & serve"]);
    const c = recipe({ recipeInstructions: [{ "@type": "HowToSection", name: "x".repeat(400), itemListElement: ["Go."] }] });
    expectSafe(c);
    expect(c.instructions[0].section).toHaveLength(JSONLD_LIMITS.maxSiteName);
  });

  it("counts against the shared node budget", () => {
    const empty = Array.from({ length: 50 }, () => ({ "@type": "HowToStep" }));
    const wide = { "@type": "HowToSection", name: "S", itemListElement: Array.from({ length: 240 }, () => ({ "@type": "HowToSection", itemListElement: empty })) };
    const t0 = Date.now();
    const r = extractRecipes(ld({ "@type": "Recipe", recipeInstructions: [wide] }));
    expect(Date.now() - t0).toBeLessThan(2_000);
    expect(r.candidates[0].instructions).toEqual([]);
    expect(r.problems).toEqual([`more than ${JSONLD_LIMITS.maxNodes} JSON-LD nodes; the rest were ignored`]);
  });

  it("hasInstructions follows the steps found", () => {
    expect(recipe({ recipeInstructions: ["Go."] }).hasInstructions).toBe(true);
    expect(recipe({ recipeInstructions: "<script>x</script>" }).hasInstructions).toBe(false);
    expect(recipe({}).hasInstructions).toBe(false);
  });
});

describe("images", () => {
  const images = (image: unknown, baseUrl?: string, extra: object[] = []) =>
    one(ld({ "@graph": [{ "@type": "Recipe", name: "R", image }, ...extra] }), baseUrl).images;

  it("reads strings, ImageObjects and arrays; deduplicates; keeps document order without widths", () => {
    expect(images("https://cdn.example.org/a.jpg")).toEqual(["https://cdn.example.org/a.jpg"]);
    expect(images({ "@type": "ImageObject", contentUrl: "https://cdn.example.org/c.jpg" })).toEqual(["https://cdn.example.org/c.jpg"]);
    expect(images({ "@type": "ImageObject", url: "https://cdn.example.org/u.jpg", contentUrl: "https://cdn.example.org/c.jpg" })).toEqual(["https://cdn.example.org/u.jpg"]);
    expect(images(["https://cdn.example.org/b.jpg", "https://cdn.example.org/a.jpg", "https://cdn.example.org/b.jpg#x", "https://cdn.example.org/a.jpg?utm_source=y"])).toEqual([
      "https://cdn.example.org/b.jpg", "https://cdn.example.org/a.jpg",
    ]);
    // one width unknown: document order
    expect(images([{ url: "https://cdn.example.org/s.jpg", width: 100 }, "https://cdn.example.org/n.jpg", { url: "https://cdn.example.org/l.jpg", width: 900 }])).toEqual([
      "https://cdn.example.org/s.jpg", "https://cdn.example.org/n.jpg", "https://cdn.example.org/l.jpg",
    ]);
  });

  it("orders by width (numbers, numeric strings, QuantitativeValue) when every width is known, and keeps at most 5", () => {
    const img = (n: string, width: unknown) => ({ "@type": "ImageObject", url: `https://cdn.example.org/${n}.jpg`, width });
    expect(images([img("a", 300), img("b", "1200"), img("c", { "@type": "QuantitativeValue", value: 800 }), img("d", "640px"), img("e", 300)])).toEqual(
      ["b", "c", "d", "a", "e"].map((n) => `https://cdn.example.org/${n}.jpg`),
    );
    expect(images(Array.from({ length: 12 }, (_, i) => img(`w${i}`, (i + 1) * 100)))).toEqual([1200, 1100, 1000, 900, 800].map((w) => `https://cdn.example.org/w${w / 100 - 1}.jpg`));
    expect(images(Array.from({ length: 30 }, (_, i) => `https://cdn.example.org/${i}.jpg`))).toHaveLength(JSONLD_LIMITS.maxImages);
  });

  it("resolves {\"@id\"} references to ImageObject nodes in the same block, one hop only", () => {
    const node = { "@type": "ImageObject", "@id": "https://www.example.com/#img", url: "https://cdn.example.org/ref.jpg", width: 10 };
    expect(images({ "@id": "https://www.example.com/#img" }, undefined, [node])).toEqual(["https://cdn.example.org/ref.jpg"]);
    expect(images([{ "@id": "https://www.example.com/#missing" }])).toEqual([]);
    // a reference to a reference is not followed
    const hop = { "@id": "https://www.example.com/#hop", "@type": "ImageObject" };
    expect(images({ "@id": "https://www.example.com/#hop" }, undefined, [hop, node])).toEqual([]);
    // another block's node is not visible
    expect(one(ld({ "@type": "Recipe", name: "R", image: { "@id": "https://www.example.com/#img" } }) + ld(node)).images).toEqual([]);
  });

  it("resolves relative links against the page and drops unsafe ones", () => {
    expect(images(["/a.jpg", "b.jpg", "//cdn.example.org/c.jpg"], BASE)).toEqual([
      "https://www.example.com/a.jpg", "https://www.example.com/recipes/page/b.jpg", "https://cdn.example.org/c.jpg",
    ]);
    expect(images(["/a.jpg", "javascript:alert(1)", "data:image/png;base64,AA", "http://localhost/x.jpg", "http://127.0.0.1/x.jpg", "ftp://cdn.example.org/x.jpg", "https://user:pw@cdn.example.org/x.jpg", 5, null, { url: 5 }])).toEqual([]);
  });
});

describe("author, site name, category, cuisine, description", () => {
  const graph = (recipe: object, ...nodes: object[]) => one(ld({ "@context": "https://schema.org", "@graph": [{ "@type": "Recipe", name: "R", ...recipe }, ...nodes] }));
  const person = { "@type": "Person", "@id": "https://www.example.com/#me", name: "Ref Person" };

  it("author resolves an @id to a Person (or Organization) node; other targets and misses are dropped", () => {
    expect(graph({ author: { "@id": "https://www.example.com/#me" } }, person).author).toBe("Ref Person");
    expect(graph({ author: [{ "@id": "https://www.example.com/#me" }, { "@type": "Person", name: "Inline" }, "Text"] }, person).author).toBe("Ref Person, Inline, Text");
    expect(graph({ author: { "@id": "https://www.example.com/#org" } }, { "@type": "Organization", "@id": "https://www.example.com/#org", name: "Org Author" }).author).toBe("Org Author");
    expect(graph({ author: { "@id": "https://www.example.com/#page" } }, { "@type": "WebPage", "@id": "https://www.example.com/#page", name: "A page" }).author).toBeNull();
    expect(graph({ author: { "@id": "https://www.example.com/#nobody" } }).author).toBeNull();
    // an object with data besides @id is not a reference
    expect(graph({ author: { "@id": "https://www.example.com/#me", name: "Inline wins" } }, person).author).toBe("Inline wins");
  });

  it("site name: publisher (inline or @id), then WebSite, then Organization, then og:site_name", () => {
    const site = { "@type": "WebSite", "@id": "https://www.example.com/#site", name: "Web Site" };
    const org = { "@type": "Organization", "@id": "https://www.example.com/#org", name: "The Org" };
    expect(graph({ publisher: { "@type": "Organization", name: "Inline Pub" } }, site, org).siteName).toBe("Inline Pub");
    expect(graph({ publisher: { "@id": "https://www.example.com/#org" } }, site, org).siteName).toBe("The Org");
    expect(graph({ publisher: { "@id": "https://www.example.com/#none" } }, org, site).siteName).toBe("Web Site");
    expect(graph({}, org).siteName).toBe("The Org");
    expect(graph({}, { "@type": "https://schema.org/WebSite", name: "IRI Site" }).siteName).toBe("IRI Site");
    expect(graph({}).siteName).toBeNull();
    expect(one(`<meta property="og:site_name" content="OG Name">${ld({ "@type": "Recipe" })}`).siteName).toBe("OG Name");
    // WebSite in another block does not count
    expect(one(ld({ "@type": "Recipe" }) + ld({ "@type": "WebSite", name: "Other Block" })).siteName).toBeNull();
    expect(graph({ publisher: { name: "x".repeat(400) } }).siteName).toHaveLength(JSONLD_LIMITS.maxSiteName);
  });

  it.each([
    ["Dinner", "Dinner"],
    [["Dinner", "Lunch"], "Dinner"],
    [["", null, 3, "  ", "Second"], "Second"],
    ["Breakfast, Brunch", "Breakfast"],
    ["<b>Bold</b> &amp; Co", "Bold & Co"],
    [{ name: "obj" }, null],
    [[], null],
    [undefined, null],
  ])("recipeCategory / recipeCuisine %j → %j", (v, expected) => {
    const c = recipe({ recipeCategory: v, recipeCuisine: v });
    expect([c.category, c.cuisine]).toEqual([expected, expected]);
  });

  it("caps category, cuisine and description", () => {
    const c = recipe({ recipeCategory: "c".repeat(300), recipeCuisine: ["k".repeat(300)], description: `<p>${"d".repeat(3_000)}</p>` });
    expect([c.category?.length, c.cuisine?.length, c.description?.length]).toEqual([JSONLD_LIMITS.maxShortText, JSONLD_LIMITS.maxShortText, JSONLD_LIMITS.maxString]);
    expect(recipe({ description: { "@value": "x" } }).description).toBeNull();
  });
});

describe("stats", () => {
  it("counts JSON-LD blocks and Recipe nodes read", () => {
    expect(extractRecipes("<p>no data</p>").stats).toEqual({ jsonLdBlocks: 0, recipeNodes: 0, microdata: false });
    expect(extractRecipes(ld("not json") + ld({ "@type": "Recipe" }) + ld({ "@type": "WebSite" })).stats).toEqual({ jsonLdBlocks: 3, recipeNodes: 1, microdata: false });
    const capped = extractRecipes(ld({ "@graph": Array.from({ length: 30 }, () => ({ "@type": "Recipe" })) }));
    expect(capped.stats.recipeNodes).toBe(JSONLD_LIMITS.maxCandidates);
  });
});
