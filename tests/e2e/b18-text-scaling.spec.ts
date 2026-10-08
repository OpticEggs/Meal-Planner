/**
 * B18 — text-scaling sweep across every screen. A signed-in member on a 320 × 640 phone with
 * text at 150% and 200% (`html { font-size }`, the way browser text-size settings and zoom-text
 * extensions scale rem-based pages). Every route, and the dialogs on it, is checked for:
 *   1. text that actually scales (computed font-size measured with and without the scaling);
 *   2. no sideways scrolling, on the page or inside an open dialog;
 *   3. no clipped or off-screen text;
 *   4. keyboard order: Tab through the screen (or the dialog's trap) and every focused control is
 *      visible, inside the viewport after the browser scrolls it there, and is what a pointer at
 *      its centre would hit (not the sticky header, the fixed nav or a dialog's sticky title);
 *   5. hit targets of at least 24 × 24 CSS px (WCAG 2.2 AA 2.5.8) that are not covered.
 * Long content (a long recipe title, product name, exclusion term and staple name) is inserted
 * so wrapping is exercised, not only the fixture's short names. Findings are collected per state
 * with expect.soft, so one run reports every failing state.
 */
import { expect, test, type Browser, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { NIGHT } from "../fixtures/household";
import { member, q, seed } from "./helpers";
import type { Fixture } from "../fixtures/household";

const VIEWPORT = { width: 320, height: 640 };
const SCALES = [150, 200] as const;
const MIN_RATIO: Record<number, number> = { 150: 1.45, 200: 1.9 };
const TAB_CAP = 80;

const LONG_RECIPE = "Fixture: Grandmother’s slow-braised chicken thighs with preserved lemon, green olives and herbed rice — Rindfleischsuppentopf-style Sunday version";
const LONG_PRODUCT = "Private Selection organic broccoli florets, family-size steamable microwave bag 32 oz (item 0001111098765432)";
const LONG_YOGURT = "Plain unsweetened whole-milk Greek-style strained yogurt, family-size 32 oz tub (item 0001111041234567)";
const LONG_TERM = "extraordinarily_long_ingredient_or_tag_name_for_wrapping";
const LONG_STAPLE = "Breakfast yogurt: the big plain unsweetened tub (not the vanilla one) for Alex"; // ≤ 80 characters

const scaleCss = (pct: number) => `html { font-size: ${pct}% !important; }`;

// ---------------------------------------------------------------------------------------------
// Setup helpers

async function insertRecipe(fx: Fixture, title: string) {
  const recipeId = randomUUID();
  const versionId = randomUUID();
  await q("INSERT INTO recipes(id, household_id, created_by) VALUES ($1,$2,$3)", [recipeId, fx.householdId, fx.members.jon]);
  await q(
    `INSERT INTO recipe_versions(id, recipe_id, household_id, version_no, title, cuisine, summary, effort_minutes, effort_level, leftover_friendly,
       instructions, reheat_instructions, provenance, source_label, estimate, created_by)
     VALUES ($1,$2,$3,1,$4,'North African-inspired home cooking','Test fixture recipe with a long title (B18).',55,'involved',true,$5,$6,'fixture','Test fixture — not a verified recipe',true,$7)`,
    [
      versionId, recipeId, fx.householdId, title,
      "1. Brown the chicken thighs well on both sides in a wide heavy pan.\n2. Add preserved lemon, olives and stock; braise covered until tender.\n3. Plate each person's portions over the herbed rice.",
      "Reheat covered at 350°F for 20 minutes, or microwave 3 minutes, until hot throughout.",
      fx.members.jon,
    ],
  );
  const components: [string, string, [string, string, string][]][] = [
    ["protein", "Chicken thighs braised with preserved lemon and olives", [["chicken_thigh", "5", "oz"], ["olive_oil", "1", "tbsp"]]],
    ["base", "Herbed rice", [["rice", "75", "g"]]],
  ];
  let sort = 0;
  for (const [ck, cn, ings] of components) {
    await q("INSERT INTO recipe_components(recipe_version_id, key, name, sort) VALUES ($1,$2,$3,$4)", [versionId, ck, cn, sort++]);
    for (const [ik, qty, unit] of ings) {
      await q("INSERT INTO recipe_ingredients(recipe_version_id, component_key, ingredient_key, quantity, unit, sort) VALUES ($1,$2,$3,$4,$5,$6)", [versionId, ck, ik, qty, unit, sort++]);
    }
  }
  await q("UPDATE recipes SET current_version_id=$2 WHERE id=$1", [recipeId, versionId]);
  return recipeId;
}

async function insertProduct(fx: Fixture, key: string, name: string, qty = "1", unit = "lb") {
  const id = randomUUID();
  await q("INSERT INTO products(id, household_id, retailer, product_ref, name, ingredient_key, package_qty, package_unit) VALUES ($1,$2,'simulated',$3,$4,$5,$6,$7)", [
    id, fx.householdId, `b18:${id}`, name, key, qty, unit,
  ]);
  await q("INSERT INTO price_observations(household_id, product_id, amount_minor, source, observed_at) VALUES ($1,$2,399,'manual','2026-10-12T18:00:00Z')", [fx.householdId, id]);
  return id;
}

/** A member whose every page loads with scaled text (client-side navigation keeps the style tag). */
async function scaledMember(browser: Browser, who: "jon" | "alex", scale: number) {
  const m = await member(browser, who, { viewport: VIEWPORT });
  const install = `(() => {
    const add = () => {
      if (document.getElementById("b18-scale")) return;
      const s = document.createElement("style");
      s.id = "b18-scale";
      s.textContent = ${JSON.stringify(scaleCss(scale))};
      (document.head || document.documentElement).appendChild(s);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
  })();`;
  await m.context.addInitScript({ content: install });
  await m.page.evaluate(install);
  return m;
}

async function go(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByTestId("currency")).toHaveAttribute("data-currency", "current");
  await expect(page.locator("#b18-scale")).toHaveCount(1);
  // Hydrated (a click before hydration would be lost): React has attached to the app shell.
  await page.waitForFunction(() => Object.keys(document.querySelector(".app") ?? {}).some((k) => k.startsWith("__reactFiber")));
}

// ---------------------------------------------------------------------------------------------
// The sweep

/** Installed in the page: element helpers shared by the checks below. */
function installHelpers() {
  const w = window as any;
  const hidden = (el: Element) => !!el.closest(".sr-only") || el.getClientRects().length === 0 || getComputedStyle(el).visibility === "hidden";
  const name = (el: Element | null) => {
    if (!el) return "(nothing)";
    const id = el.id ? `#${el.id}` : "";
    const tid = el.getAttribute("data-testid") ? `[${el.getAttribute("data-testid")}]` : "";
    const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).join(".")}` : "";
    const text = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48);
    return `${el.tagName.toLowerCase()}${id}${tid}${cls} "${text}"`;
  };
  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
  const regions = (): HTMLElement[] => {
    const d = dialog();
    return d ? [d] : [...document.querySelectorAll<HTMLElement>("header.top, main, nav.nav")];
  };
  const SKIP = new Set(["OPTION", "SCRIPT", "STYLE", "DATALIST", "SELECT", "TEXTAREA", "INPUT"]);
  const textEls = () =>
    regions()
      .flatMap((r) => [r, ...r.querySelectorAll<HTMLElement>("*")])
      .filter((el) => !SKIP.has(el.tagName) && [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim()) && !hidden(el));
  const controls = () =>
    regions()
      .flatMap((r) => [...r.querySelectorAll<HTMLElement>('a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="tab"]')])
      .filter((el) => !hidden(el) && !el.closest("[inert]"));
  w.__b18 = { hidden, name, dialog, regions, textEls, controls };
}

/** Check 1: computed font-size with and without the scaling, for a representative body text
 *  element and for every visible text element in scope. */
function measureScaling({ css, min }: { css: string; min: number }) {
  const h = (window as any).__b18;
  const style = document.getElementById("b18-scale")!;
  const els: HTMLElement[] = h.textEls();
  style.textContent = "";
  const before = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
  style.textContent = css;
  const after = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
  const d = h.dialog();
  const probeIndex = Math.max(0, els.findIndex((e) => e.matches(d ? ".sheet-body p, .sheet-body label, .sheet-body li, .sheet-body legend" : "main p, main li")));
  return {
    probe: els.length ? { name: h.name(els[probeIndex]), before: before[probeIndex], after: after[probeIndex] } : null,
    notScaling: els.flatMap((e, i) => (after[i] / before[i] < min ? [`text does not scale: ${h.name(e)} ${before[i]}px → ${after[i]}px`] : [])),
  };
}

/** Checks 2, 3 and 5: sideways scrolling, clipped text, and hit targets. */
function layoutFindings() {
  const h = (window as any).__b18;
  const out: string[] = [];
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth) out.push(`page scrolls sideways: scrollWidth ${de.scrollWidth} > clientWidth ${de.clientWidth}`);
  const d: HTMLElement | null = h.dialog();
  if (d) {
    if (d.scrollWidth > d.clientWidth) out.push(`dialog scrolls sideways: scrollWidth ${d.scrollWidth} > clientWidth ${d.clientWidth}`);
    const r = d.getBoundingClientRect();
    if (r.left < -0.5 || r.right > innerWidth + 0.5 || r.top < -0.5 || r.bottom > innerHeight + 0.5) out.push(`dialog outside the viewport: ${JSON.stringify(r)}`);
  }
  // Clipped or off-screen text.
  for (const el of h.textEls() as HTMLElement[]) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (!cs.display.startsWith("inline") && el.scrollWidth > el.clientWidth + 1 && !["auto", "scroll"].includes(cs.overflowX)) {
      out.push(`text overflows its box: ${h.name(el)} scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`);
    }
    if (r.left < -1 || r.right > innerWidth + 1) out.push(`text off-screen: ${h.name(el)} x ${Math.round(r.left)}–${Math.round(r.right)} of ${innerWidth}`);
    for (let a = el.parentElement; a && a !== document.body && a !== de; a = a.parentElement) {
      const acs = getComputedStyle(a);
      const ar = a.getBoundingClientRect();
      if (["hidden", "clip"].includes(acs.overflowX) && (r.right > ar.right + 1 || r.left < ar.left - 1)) {
        out.push(`text clipped sideways by ${h.name(a)}: ${h.name(el)}`);
        break;
      }
      if (["hidden", "clip"].includes(acs.overflowY) && (r.bottom > ar.bottom + 1 || r.top < ar.top - 1)) {
        out.push(`text clipped vertically by ${h.name(a)}: ${h.name(el)}`);
        break;
      }
    }
  }
  // Hit targets: ≥ 24 × 24 (inline targets inside a sentence are exempt from size, as in WCAG
  // 2.5.8) and not covered once scrolled into view the way the browser would scroll them.
  for (const c of h.controls() as HTMLElement[]) {
    const label = c.matches('input[type="checkbox"], input[type="radio"]') ? c.closest("label") : null;
    const target = label ?? c;
    c.scrollIntoView({ block: "nearest", inline: "nearest" });
    const tr = target.getBoundingClientRect();
    const cs = getComputedStyle(c);
    const inSentence = cs.display.startsWith("inline") && !label && [...(c.parentElement?.childNodes ?? [])].some((n) => n !== c && n.nodeType === 3 && (n.textContent ?? "").trim());
    if (!inSentence && (tr.height < 24 || tr.width < 24)) out.push(`target smaller than 24×24: ${h.name(c)} ${Math.round(tr.width)}×${Math.round(tr.height)}`);
    const cr = c.getBoundingClientRect();
    const x = cr.left + cr.width / 2;
    const y = cr.top + cr.height / 2;
    if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) {
      out.push(`target centre off-screen after scrolling into view: ${h.name(c)} at ${Math.round(x)},${Math.round(y)}`);
      continue;
    }
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(c.contains(hit) || (label && label.contains(hit)))) out.push(`target covered: ${h.name(c)} — the point hits ${h.name(hit)}`);
  }
  return out;
}

/** Check 4 (one step): the focused element after a key press. */
function focusStep() {
  const h = (window as any).__b18;
  const w = window as any;
  const a = document.activeElement as HTMLElement | null;
  if (!a || a === document.body || a === document.documentElement) return { end: true as const };
  w.__b18seen ??= new WeakSet();
  const again = w.__b18seen.has(a);
  w.__b18seen.add(a);
  const r = a.getBoundingClientRect();
  const cs = getComputedStyle(a);
  const visible = r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && !a.closest(".sr-only");
  const across = r.left >= -1 && r.right <= innerWidth + 1;
  // Fully inside the viewport — except where the browser deliberately scrolls only part into view:
  // a textarea (Chrome scrolls its caret line in, so its top must show) and a control taller than
  // most of the screen (a very long wrapped title at 200%, which cannot fit between the bars: at
  // least half the screen of it must show). The part that shows must be hittable.
  const textarea = a.tagName === "TEXTAREA";
  const tall = r.height > innerHeight * 0.6;
  const partial = textarea || tall;
  const overlap = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
  const inView = across && (textarea ? r.top >= -1 && r.top <= innerHeight - 24 : tall ? overlap >= innerHeight * 0.5 : r.top >= -1 && r.bottom <= innerHeight + 1);
  const yMid = partial ? (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2 : r.top + r.height / 2;
  const hit = document.elementFromPoint(r.left + r.width / 2, yMid);
  // The last tabbable control in the document: pressing Tab there would move focus out of the
  // page into the browser itself, which later clicks and focus() calls then have to win back.
  const tabbable = [...document.querySelectorAll<HTMLElement>('a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]')]
    .filter((el) => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && !h.hidden(el) && !el.closest("[inert]"));
  return {
    end: false as const, again, last: tabbable[tabbable.length - 1] === a, visible, inView, hits: !!hit && a.contains(hit), name: h.name(a), hit: h.name(hit),
    rect: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`,
    inDialog: !!a.closest('[role="dialog"]'),
  };
}

async function tabSweep(page: Page, label: string, from: string | null, findings: string[]) {
  await page.evaluate(() => { (window as any).__b18seen = new WeakSet(); });
  const inDialog = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
  if (from) {
    await page.evaluate((sel) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) throw new Error(`no tab anchor ${sel}`);
      el.focus();
    }, from);
  } else if (!inDialog) {
    // From the top of the page: the first control in the document.
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      const first = (window as any).__b18.controls().find((c: HTMLElement) => c.tabIndex >= 0 && !(c as HTMLButtonElement).disabled);
      first?.focus();
    });
  }
  // (In a dialog: start where the dialog put focus when it opened.)
  for (let i = 0; i <= TAB_CAP; i++) {
    if (i > 0) await page.keyboard.press("Tab");
    const f = await page.evaluate(focusStep);
    if (f.end) {
      if (inDialog || i === 0) findings.push(`${label}: Tab #${i} left focus on <body>`);
      break;
    }
    if (f.again && i > 0) break; // the whole cycle has been seen
    const where = `${label}: Tab #${i} ${f.name} (${f.rect})`;
    if (inDialog && !f.inDialog) findings.push(`${where} left the dialog`);
    if (!f.visible) findings.push(`${where} is not visible`);
    // #0 in a dialog is where focus already was (not scrolled to by a key press or focus()); a live
    // update may have moved it — every control the keyboard reaches from there is checked.
    if (i === 0 && inDialog && !from) continue;
    if (!f.inView) findings.push(`${where} is outside the viewport`);
    if (f.inView && !f.hits) findings.push(`${where} is covered by ${f.hit}`);
    if (f.last && !inDialog) break;
  }
}

/** All five checks on the current state; anchors add Tab sweeps starting further down a long page. */
async function sweep(page: Page, scale: number, label: string, anchors: (string | null)[] = [null]) {
  const full = `${label} @ ${scale}%`;
  await page.waitForTimeout(150); // let a just-opened sheet finish laying out
  await page.evaluate(installHelpers);
  const findings: string[] = [];
  const s = await page.evaluate(measureScaling, { css: scaleCss(scale), min: MIN_RATIO[scale] });
  expect(s.probe, `${full}: a body text element to measure`).not.toBeNull();
  const ratio = s.probe!.after / s.probe!.before;
  if (ratio < MIN_RATIO[scale]) findings.push(`representative text ${s.probe!.name} scaled only ×${ratio.toFixed(2)}`);
  findings.push(...s.notScaling);
  // Keyboard first: the hit-target pass scrolls every control into view, which would move the
  // dialog's initially focused control away from where the member sees it.
  for (const a of anchors) await tabSweep(page, a ? `from ${a}` : "Tab", a, findings);
  findings.push(...(await page.evaluate(layoutFindings)));
  expect.soft([...new Set(findings)], `${full}: probe ${s.probe!.name} ${s.probe!.before}px → ${s.probe!.after}px`).toEqual([]);
}

async function cmd(page: Page, name: string, payload: unknown) {
  return page.evaluate(async ({ name, payload }) => {
    const r = await fetch(`/api/commands/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operationId: `b18-${crypto.randomUUID()}`, payload }) });
    return r.json();
  }, { name, payload });
}

// ---------------------------------------------------------------------------------------------

for (const scale of SCALES) {
  test.describe(`B18 at 320 px with ${scale}% text`, () => {
    test.describe.configure({ timeout: 300_000 });
    // A control covered by the sticky header makes a click retry forever; fail it fast instead.
    test.use({ actionTimeout: 15_000 });

    test(`login, signed out (${scale}%)`, async ({ browser }) => {
      await seed();
      const context = await browser.newContext({ viewport: VIEWPORT });
      await context.addInitScript({ content: `document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.id = "b18-scale"; s.textContent = ${JSON.stringify(scaleCss(scale))}; document.head.appendChild(s); });` });
      const page = await context.newPage();
      await page.goto("/login");
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
      await sweep(page, scale, "login");
      await page.getByLabel("Email").fill("nobody@fixture.table.test");
      await page.getByLabel("Password").fill("wrong-password");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("alert")).toBeVisible();
      await sweep(page, scale, "login with an error");
      await context.close();
    });

    test(`Week, Change sheet, proposal, Cook and Reheat (${scale}%)`, async ({ browser }) => {
      const fx = await seed();
      await insertRecipe(fx, LONG_RECIPE);
      const { page, context } = await scaledMember(browser, "jon", scale);
      // Saturday becomes the long-titled dinner (applied through the sheet, at this text size).
      await page.getByTestId(`change-${NIGHT.sat}`).click();
      await page.getByTestId(`option-${LONG_RECIPE}`).click();
      await expect(page.getByTestId("preview")).toBeVisible();
      await page.getByTestId("apply").click();
      await expect(page.getByTestId(`night-title-${NIGHT.sat}`)).toHaveText(LONG_RECIPE);
      await sweep(page, scale, "Week (adopted)");

      await page.getByTestId(`change-${NIGHT.fri}`).click();
      await page.getByTestId(`option-${LONG_RECIPE}`).click();
      const sheet = page.getByTestId(`sheet-${NIGHT.fri}`);
      await expect(sheet.getByTestId("preview")).toBeVisible();
      await sweep(page, scale, "Change sheet with a preview");
      await sheet.getByRole("tab", { name: "Move" }).click();
      await sweep(page, scale, "Change sheet, Move tab");
      await sheet.getByRole("tab", { name: "Plates" }).click();
      await sweep(page, scale, "Change sheet, Plates tab");
      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
      await sweep(page, scale, "Week with an open draft");

      await go(page, `/cook/${NIGHT.sat}`);
      await expect(page.getByTestId("cook-title")).toHaveText(LONG_RECIPE);
      await sweep(page, scale, "Cook");
      await go(page, `/cook/${NIGHT.thu}`);
      await expect(page.getByTestId("reheat-instructions")).toBeVisible();
      await sweep(page, scale, "Reheat");

      await go(page, "/");
      await page.getByRole("button", { name: "Next week" }).click();
      await page.getByRole("button", { name: "Propose a week" }).click();
      await expect(page.getByTestId("proposal")).toBeVisible();
      await sweep(page, scale, "Proposal (next week)");
      await context.close();
    });

    test(`Explore, Our Recipes and recipe detail (${scale}%)`, async ({ browser }) => {
      const fx = await seed();
      const longId = await insertRecipe(fx, LONG_RECIPE);
      const { page, context } = await scaledMember(browser, "jon", scale);
      await page.getByRole("link", { name: "Explore" }).click();
      await expect(page.getByTestId("recipe-card").first()).toBeVisible();
      await page.getByRole("button", { name: `Sounds good: ${LONG_RECIPE}` }).click();
      await expect(page.locator('section[aria-label="Explore"] [role="status"]')).toContainText("Saved");
      await sweep(page, scale, "Explore");
      await page.getByTestId("explore-sort").selectOption("calories");
      await expect(page.getByTestId("unknown-group")).toBeVisible();
      await sweep(page, scale, "Explore sorted, with an unknown group");

      await page.getByRole("link", { name: "Our Recipes" }).click();
      await expect(page.getByTestId("recipe-row").first()).toBeVisible();
      await page.getByRole("button", { name: `Favorite ${LONG_RECIPE}` }).click();
      await expect(page.getByRole("button", { name: `Favorite ${LONG_RECIPE}` })).toHaveAttribute("aria-pressed", "true");
      await sweep(page, scale, "Our Recipes — All");
      await page.getByRole("tab", { name: "My favorites" }).click();
      await expect(page.getByTestId("recipe-row")).toHaveCount(1);
      await sweep(page, scale, "Our Recipes — My favorites");
      await page.getByRole("tab", { name: "Sounds good" }).click();
      await expect(page.getByTestId("recipe-row")).toHaveCount(1);
      await sweep(page, scale, "Our Recipes — Sounds good");

      await go(page, `/recipes/${longId}`);
      await expect(page.getByTestId("recipe-title")).toHaveText(LONG_RECIPE);
      await page.getByRole("button", { name: "Save note" }).click();
      await expect(page.locator("#new-note-error")).toBeVisible();
      await sweep(page, scale, "Recipe detail (with a note error)");
      await context.close();
    });

    test(`recipe editor dialog, plain state (${scale}%)`, async ({ browser }) => {
      await seed();
      const { page, context } = await scaledMember(browser, "jon", scale);
      await page.getByRole("link", { name: "Our Recipes" }).click();
      await page.getByTestId("new-recipe").click();
      await expect(page.getByRole("dialog", { name: "New recipe" })).toBeVisible();
      await sweep(page, scale, "New recipe dialog");
      await context.close();
    });

    test(`Groceries: lines, product, removal, order, receipts (${scale}%)`, async ({ browser }) => {
      const fx = await seed();
      await insertProduct(fx, "broccoli", LONG_PRODUCT);
      const { page, context } = await scaledMember(browser, "alex", scale);
      await page.getByRole("link", { name: "Groceries" }).click();
      await expect(page.getByTestId("line-broccoli")).toBeVisible();

      await page.getByRole("button", { name: "Change product for Broccoli" }).click();
      const pd = page.getByRole("dialog", { name: "Product for Broccoli" });
      await expect(pd).toBeVisible();
      await sweep(page, scale, "Product dialog");
      await pd.getByRole("radio", { name: new RegExp(LONG_PRODUCT.slice(0, 30)) }).check();
      await pd.getByRole("button", { name: "Use for this pickup" }).click();
      await expect(pd).toHaveCount(0);
      await expect(page.getByTestId("line-broccoli")).toContainText(LONG_PRODUCT);

      const an = page.getByTestId("alsoneed-groceries");
      await an.getByPlaceholder(/Also need/).fill("Plain Greek yogurt");
      await an.getByRole("button", { name: "Add", exact: true }).click();
      await expect(page.getByTestId("line-greek_yogurt")).toContainText("Usual amount");
      await sweep(page, scale, "Groceries lines", [null, '[data-testid="line-greek_yogurt"] button:not([disabled])']);

      await page.getByRole("button", { name: "Remove usual request for Plain Greek yogurt" }).click();
      const rm = page.getByRole("dialog", { name: "Remove the usual request for Plain Greek yogurt?" });
      await expect(rm).toBeVisible();
      await sweep(page, scale, "Remove-request confirmation");
      await rm.getByRole("button", { name: "Keep it" }).click();
      await expect(rm).toHaveCount(0);

      await page.getByTestId("approve-all").click();
      await expect(page.getByTestId("send")).toBeEnabled();
      await page.getByTestId("send").click();
      await expect(page.getByTestId("batch")).toHaveAttribute("data-status", "acknowledged");
      await sweep(page, scale, "Groceries after sending", [null, '[data-testid="after-checkout"] button:not([disabled])']);

      await page.getByRole("button", { name: "Confirm order contents…" }).click();
      const co = page.getByRole("dialog", { name: "Confirm order contents" });
      await expect(co).toBeVisible();
      await sweep(page, scale, "Confirm-order dialog (edit)");
      await co.getByRole("button", { name: "Confirm order…" }).click();
      await expect(co.getByTestId("confirm-order-review")).toBeVisible();
      await sweep(page, scale, "Confirm-order dialog (review)");
      await co.getByRole("button", { name: "Yes, record this order" }).click();
      await expect(co).toHaveCount(0);
      await expect(page.getByTestId("order")).toBeVisible();

      await page.getByRole("button", { name: "Substituted Salmon fillet…" }).click();
      const sub = page.getByRole("dialog", { name: "Record a substitute for Salmon fillet" });
      await expect(sub).toBeVisible();
      await sub.getByRole("button", { name: "Record substitute" }).click();
      await expect(sub.getByLabel("What arrived instead")).toHaveAttribute("aria-invalid", "true");
      await sweep(page, scale, "Substitute dialog (with an error)");
      await sub.getByLabel("What arrived instead").fill("Arctic char 12 oz");
      await sub.getByRole("button", { name: "Record substitute" }).click();
      await expect(sub).toHaveCount(0);

      await page.getByRole("button", { name: "Does Arctic char 12 oz work for Salmon fillet?" }).click();
      const val = page.getByRole("dialog", { name: "Does Arctic char 12 oz (for Salmon fillet) work?" });
      await expect(val).toBeVisible();
      await sweep(page, scale, "Does-it-work dialog");
      await page.keyboard.press("Escape");
      await expect(val).toHaveCount(0);

      await page.getByTestId("order-line-chicken_thigh").getByRole("button", { name: "Received Chicken thighs" }).click();
      await page.getByRole("button", { name: /^Correct the receipt for Chicken thighs/ }).click();
      const cr = page.getByRole("dialog", { name: "Correct the receipt for Chicken thighs" });
      await expect(cr).toBeVisible();
      await sweep(page, scale, "Correct-receipt dialog");
      await page.keyboard.press("Escape");
      await expect(cr).toHaveCount(0);
      await sweep(page, scale, "Groceries with a confirmed order", [null, '[data-testid="order"] button:not([disabled])']);
      await context.close();
    });

    test(`Groceries: uncertain transfer and the cart check (${scale}%)`, async ({ browser }) => {
      const fx = await seed();
      await q("INSERT INTO fake_retailer_script(household_id, behavior) VALUES ($1,'accept_then_timeout')", [fx.householdId]);
      const { page, context } = await scaledMember(browser, "alex", scale);
      await page.getByRole("link", { name: "Groceries" }).click();
      await page.getByTestId("approve-all").click();
      await expect(page.getByTestId("send")).toBeEnabled();
      await page.getByTestId("send").click();
      await expect(page.getByTestId("batch")).toHaveAttribute("data-status", "uncertain");
      await sweep(page, scale, "Groceries with an uncertain transfer", [null, '[data-testid="transfers"] button:not([disabled])']);
      await page.getByRole("button", { name: "Check the cart for transfer 1" }).click();
      const dialog = page.getByRole("dialog", { name: "What is in the store cart?" });
      await expect(dialog).toBeVisible();
      await sweep(page, scale, "Cart-check dialog");
      await dialog.getByRole("radio", { name: "The items are not in the cart" }).check();
      await expect(dialog).toContainText("sending again would add them twice");
      await sweep(page, scale, "Cart-check dialog with the warning");
      await page.keyboard.press("Escape");
      await context.close();
    });

    test(`Household: settings, conflict, targets, exclusions, ingredient review (${scale}%)`, async ({ browser }) => {
      const fx = await seed();
      await q("INSERT INTO exclusions(household_id, member_id, term, created_by) VALUES ($1,$2,$3,$4)", [fx.householdId, fx.members.alex, LONG_TERM, fx.members.alex]);
      const { page, context } = await scaledMember(browser, "jon", scale);
      await page.getByRole("link", { name: "Household" }).click();
      await expect(page.getByTestId("settings")).toBeVisible();
      const anchors = [null, '[data-testid="targets"] input', '[data-testid="exclusions"] button:not([disabled])', '[data-testid="ingredient-review"] input', '[data-testid="staples"] button:not([disabled])'];
      await sweep(page, scale, "Household", anchors);

      const form = page.getByTestId("settings");
      await form.getByLabel("Budget ($)").fill("12.345");
      await form.getByLabel("Cooking sessions / week").fill("9");
      await form.getByRole("button", { name: "Save household inputs" }).click();
      await expect(form.getByLabel("Budget ($)")).toHaveAttribute("aria-invalid", "true");
      const t = page.getByTestId("targets");
      await t.getByLabel("Dinner calories (kcal)").fill("x");
      await t.getByRole("button", { name: "Save dinner targets" }).click();
      await expect(t.getByLabel("Dinner calories (kcal)")).toHaveAttribute("aria-invalid", "true");
      const ex = page.getByTestId("exclusions");
      await ex.getByRole("button", { name: "Add exclusion" }).click();
      await expect(ex.getByLabel("Exclusion", { exact: true })).toHaveAttribute("aria-invalid", "true");
      await page.getByRole("button", { name: "Mark Basil pesto (store-bought) reviewed" }).click();
      await expect(page.getByLabel("Tags for Basil pesto (store-bought)")).toHaveAttribute("aria-invalid", "true");
      await sweep(page, scale, "Household with field errors", anchors);

      // Settings conflict: Jon is editing when Alex saves.
      await go(page, "/household");
      await form.getByLabel("Budget ($)").fill("80");
      const alex = await member(browser, "alex");
      await alex.page.getByRole("link", { name: "Household" }).click();
      await alex.page.getByTestId("settings").getByLabel("Store (label)").fill("Alex’s neighbourhood market on the long road out of town");
      await alex.page.getByTestId("settings").getByRole("button", { name: "Save household inputs" }).click();
      await expect(page.getByTestId("settings-conflict")).toBeVisible();
      await sweep(page, scale, "Household settings conflict", [null]);
      await alex.context.close();

      await page.getByRole("button", { name: new RegExp(`^Remove exclusion ${LONG_TERM}`) }).click();
      const dialog = page.getByRole("dialog", { name: new RegExp(`^Remove the exclusion ${LONG_TERM}`) });
      await expect(dialog).toBeVisible();
      await sweep(page, scale, "Exclusion removal dialog");
      await dialog.getByRole("button", { name: "Keep it" }).click();
      await expect(dialog).toHaveCount(0);
      await context.close();
    });

    test(`Household: usual items and their dialogs, with a staple conflict (${scale}%)`, async ({ browser }) => {
      const fx = await seed();
      await insertProduct(fx, "greek_yogurt", LONG_YOGURT, "32", "oz");
      expect(LONG_STAPLE.length).toBeLessThanOrEqual(80);
      const { page, context } = await scaledMember(browser, "jon", scale);
      await page.getByRole("link", { name: "Household" }).click();
      await page.getByTestId("add-staple").click();
      const add = page.getByRole("dialog", { name: "Add a usual item" });
      await expect(add).toBeVisible();
      await add.getByRole("button", { name: "Add usual item" }).click();
      await expect(add.getByLabel("Item")).toHaveAttribute("aria-invalid", "true");
      await sweep(page, scale, "Add usual item dialog (with an error)");
      await add.getByLabel("Item").selectOption({ label: "Plain Greek yogurt" });
      await add.getByLabel("Name on the shortcut (optional)").fill(LONG_STAPLE);
      await add.getByRole("button", { name: "Add usual item" }).click();
      await expect(add).toHaveCount(0);
      const row = page.getByTestId("staple-row-greek_yogurt");
      await expect(row).toContainText(LONG_STAPLE);
      await sweep(page, scale, "Usual items", ['[data-testid="staples"] button:not([disabled])']);

      await row.getByRole("button", { name: `Edit ${LONG_STAPLE}` }).click();
      const ed = page.getByRole("dialog", { name: `Edit ${LONG_STAPLE}` });
      await expect(ed).toBeVisible();
      await sweep(page, scale, "Edit usual item dialog");
      // Alex saves the same staple meanwhile: Jon's dialog shows the conflict.
      const alex = await member(browser, "alex");
      await alex.page.getByRole("link", { name: "Household" }).click();
      await alex.page.getByRole("button", { name: `Edit ${LONG_STAPLE}` }).click();
      const aed = alex.page.getByRole("dialog", { name: `Edit ${LONG_STAPLE}` });
      await aed.getByLabel("Usual amount").fill("2");
      await aed.getByRole("button", { name: "Save" }).click();
      await expect(aed).toHaveCount(0);
      await expect(ed.getByTestId("staple-conflict")).toBeVisible();
      await sweep(page, scale, "Edit usual item dialog with a conflict");
      await alex.context.close();
      await page.keyboard.press("Escape");
      await expect(ed).toHaveCount(0);

      await row.getByRole("button", { name: `Change product for ${LONG_STAPLE}` }).click();
      const pd = page.getByRole("dialog", { name: `Remembered product for ${LONG_STAPLE}` });
      await expect(pd).toBeVisible();
      await sweep(page, scale, "Usual item product dialog");
      await page.keyboard.press("Escape");
      await expect(pd).toHaveCount(0);

      await row.getByRole("button", { name: `Remove ${LONG_STAPLE} from usual items` }).click();
      const rm = page.getByRole("dialog", { name: `Remove ${LONG_STAPLE} from usual items?` });
      await expect(rm).toBeVisible();
      await sweep(page, scale, "Remove usual item dialog");
      await rm.getByRole("button", { name: "Keep it" }).click();
      await expect(rm).toHaveCount(0);
      await context.close();
    });
  });
}
