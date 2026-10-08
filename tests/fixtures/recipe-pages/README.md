# Synthetic recipe pages (test fixtures)

Every file here is **synthetic**, written by hand for the recipe-import unit tests
(`tests/unit/recipe-import-jsonld.test.ts`, `tests/unit/recipe-import-extract-details.test.ts`). None is
copied from a real site: the recipes, names, authors, prices, image paths and URLs are invented (hosts use
the reserved `example.com` / `example.org` names), and no file contains or links to a real photo. They
exist to exercise the JSON-LD scanner and walker, the microdata fallback and the Open Graph reader —
layouts, malformed blocks, hostile nesting and hostile text — not to describe real food.

Some files are shaped like common real-world page layouts, still with invented content:

- `wordpress-graph.html` — a WordPress recipe-plugin page: a Yoast-style `@graph` with Article, WebPage,
  ImageObject, BreadcrumbList, WebSite, Organization, Person and Recipe nodes linked by `@id`;
  `HowToSection`s holding `HowToStep`s; `ImageObject`s with width/height; Open Graph meta tags; and an
  ingredient list with budget-style price annotations such as `1 Tbsp olive oil ($0.16)`.
- `microdata.html` — a microdata-only page (`itemscope itemtype="https://schema.org/Recipe"` with
  `itemprop` attributes, no JSON-LD), with nested Review / Person / NutritionInformation items and an
  unrelated item after the recipe.
- `opengraph-only.html` — a page with Open Graph / Twitter meta tags and no recipe data at all.
