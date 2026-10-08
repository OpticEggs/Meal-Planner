# Synthetic recipe pages (test fixtures)

Every file here is **synthetic**, written by hand for the recipe-import unit tests
(`tests/unit/recipe-import-jsonld.test.ts`). None is copied from a real site: the recipes, names,
authors and URLs are invented (hosts use the reserved `example.com` / `example.org` names). They
exist to exercise the JSON-LD scanner and walker — layouts, malformed blocks, hostile nesting and
hostile text — not to describe real food.
