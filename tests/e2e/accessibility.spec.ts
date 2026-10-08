/**
 * B14 — accessibility and focus management, checked by real keyboard input and by reading
 * document.activeElement, not only by looking for ARIA attributes.
 */
import { expect, test, type Page } from "@playwright/test";
import { NIGHT } from "../fixtures/household";
import { background, foreground, member, nightTitle, previewReplace, protectedRows, q, seed } from "./helpers";

/** What has focus right now, described well enough to assert on. */
async function focused(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector('[role="dialog"]');
    return {
      testid: a?.getAttribute("data-testid") ?? null,
      role: a?.getAttribute("role") ?? null,
      tag: a?.tagName ?? null,
      id: a?.id ?? null,
      name: a?.getAttribute("aria-label") ?? a?.textContent?.trim().slice(0, 60) ?? null,
      inDialog: !!(dialog && a && dialog.contains(a)),
      inert: !!a?.closest("[inert]"),
      isBody: a === document.body,
    };
  });
}

/** Record every non-empty text the polite announcer is given (installed before the app loads). */
function recordAnnouncements() {
  (window as any).__announced = [];
  new MutationObserver(() => {
    const el = document.querySelector('[data-testid="announcer"]');
    const t = el?.textContent?.trim();
    const log = (window as any).__announced as string[];
    if (t && log[log.length - 1] !== t) log.push(t);
  }).observe(document, { subtree: true, childList: true, characterData: true });
}
const announced = (page: Page) => page.evaluate(() => ((window as any).__announced as string[]).slice());

async function tabTo(page: Page, testid: string, max = 80) {
  for (let i = 0; i < max; i++) {
    if ((await focused(page)).testid === testid) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`could not reach ${testid} with Tab`);
}

test("B14 keyboard only: Change opens a modal with focus inside, Tab is trapped, the page behind is inert, Escape closes without applying and focus returns", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon");
  const page = jon.page;
  const before = await protectedRows(fx.weekId);

  // Reach Friday's Change control with the keyboard alone and open it.
  await page.getByTestId("week-title").focus();
  await tabTo(page, `change-${NIGHT.fri}`);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Change Friday dinner" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  let f = await focused(page);
  expect(f).toMatchObject({ role: "tab", inDialog: true });
  expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-selected"))).toBe("true");
  await expect(page.getByTestId(`change-${NIGHT.fri}`)).toHaveAttribute("aria-expanded", "true");

  // Tab and Shift+Tab never leave the sheet, in either direction, past both ends.
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press(key);
      f = await focused(page);
      expect(f.inDialog, `${key} #${i} left the sheet: ${JSON.stringify(f)}`).toBe(true);
    }
  }

  // The page behind cannot take focus or clicks while the sheet is open.
  expect(await page.evaluate(() => !!document.querySelector(".app")?.hasAttribute("inert"))).toBe(true);
  const stolen = await page.evaluate((id) => {
    const b = document.querySelector<HTMLElement>(`[data-testid="change-${id}"]`)!;
    b.focus();
    return document.activeElement === b;
  }, NIGHT.mon);
  expect(stolen).toBe(false);
  const hit = await page.getByTestId(`lock-${NIGHT.mon}`).evaluate((b) => {
    const r = b.getBoundingClientRect();
    return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  });
  expect(hit).toBe(false);

  // Arrow keys move between the sheet's tabs (roving focus) and select them.
  await page.getByRole("tab", { name: "Replace" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Move" })).toHaveAttribute("aria-selected", "true");
  expect((await focused(page)).name).toBe("Move");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Replace" })).toHaveAttribute("aria-selected", "true");

  // Choose a replacement with the keyboard: the new preview takes focus so it is read next.
  await tabTo(page, "option-Fixture: Chicken penne");
  await page.keyboard.press("Enter");
  await expect(dialog.getByTestId("preview")).toBeVisible();
  await expect.poll(async () => (await focused(page)).id).toMatch(/^preview-h-/);
  expect((await focused(page)).inDialog).toBe(true);

  // Escape closes. Nothing is applied; the draft stays a draft; focus is back on the opener.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await focused(page)).testid).toBe(`change-${NIGHT.fri}`);
  expect((await focused(page)).inert).toBe(false);
  await expect(page.getByTestId(`change-${NIGHT.fri}`)).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.querySelector(".app")?.hasAttribute("inert"))).toBe(false);
  expect(await protectedRows(fx.weekId)).toEqual(before);
  expect((await q("SELECT status FROM previews WHERE created_by=$1", [fx.members.jon])).map((r: any) => r.status)).toEqual(["open"]);
  await expect(page.getByTestId("preview")).toBeVisible(); // shown with the open drafts, unapplied
  await expect(page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Salmon rice bowls");
  await jon.context.close();
});

test("B14 closing never applies: Escape, Close and the backdrop discard typed facts; Apply and Cancel put focus somewhere sensible", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon", { init: recordAnnouncements });
  const page = jon.page;
  const before = await protectedRows(fx.weekId);
  const facts = async () => (await q("SELECT count(*)::int n FROM leftover_observations"))[0].n;
  const factsBefore = await facts();

  // A typed "less left" amount is not recorded by any way of closing.
  for (const how of ["Escape", "Close", "backdrop"] as const) {
    await page.getByTestId(`change-${NIGHT.wed}`).click();
    const dialog = page.getByRole("dialog", { name: "Change Wednesday dinner" });
    await dialog.getByRole("tab", { name: "Less left" }).click();
    await expect(dialog.getByLabel("Portions left now")).toHaveValue("");
    await dialog.getByLabel("Portions left now").fill("1");
    if (how === "Escape") await page.keyboard.press("Escape");
    else if (how === "Close") await dialog.getByRole("button", { name: "Close Wednesday changes" }).click();
    else await page.mouse.click(5, 5); // the dimmed page above the sheet
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await focused(page)).testid, { message: how }).toBe(`change-${NIGHT.wed}`);
  }
  expect(await facts()).toBe(factsBefore);
  expect(await protectedRows(fx.weekId)).toEqual(before);
  await expect(page.getByTestId(`night-${NIGHT.thu}`)).not.toContainText("Unresolved");

  // Cancel inside the sheet: the sheet stays, focus goes to its selected tab, nothing changes.
  await previewReplace(page, NIGHT.fri, "Fixture: Chicken penne");
  const fri = page.getByRole("dialog", { name: "Change Friday dinner" });
  await fri.getByRole("button", { name: "Cancel Friday preview" }).click();
  await expect(fri.getByTestId("preview")).toHaveCount(0);
  await expect.poll(async () => (await focused(page)).name).toBe("Replace");
  expect((await focused(page)).inDialog).toBe(true);
  expect(await protectedRows(fx.weekId)).toEqual(before);

  // Apply (keyboard): the sheet closes, focus returns to the opener, the result is announced.
  await fri.getByTestId("option-Fixture: Chicken penne").focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await focused(page)).id).toMatch(/^preview-h-/);
  await page.keyboard.press("Tab"); // the next stop after the preview's heading is its Apply
  expect((await focused(page)).name).toBe("Apply Friday preview");
  await page.keyboard.press("Enter");
  await expect(fri).toHaveCount(0);
  await expect(page.getByTestId(`night-title-${NIGHT.fri}`)).toHaveText("Fixture: Chicken penne");
  await expect.poll(async () => (await focused(page)).testid).toBe(`change-${NIGHT.fri}`);
  await expect.poll(async () => (await announced(page)).join(" | ")).toContain("Applied.");
  expect((await nightTitle(fx.weekId, NIGHT.fri)).title).toBe("Fixture: Chicken penne");
  await jon.context.close();
});

test("B14 if the opener is gone when the sheet closes, focus lands on a surviving control, never on <body>", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon");
  const page = jon.page;
  await page.getByTestId(`change-${NIGHT.fri}`).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.evaluate((id) => document.querySelector(`[data-testid="change-${id}"]`)!.remove(), NIGHT.fri);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(async () => (await focused(page)).testid).toMatch(/^change-/);
  const f = await focused(page);
  expect(f.isBody).toBe(false);
  expect(f.testid).not.toBe(`change-${NIGHT.fri}`);
  expect(await page.evaluate(() => document.activeElement!.isConnected)).toBe(true);
  await jon.context.close();
});

test("B14 names and states: each night's controls are distinct; plan status, stale previews, conflicts and outstanding groceries are identifiable", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon", { init: recordAnnouncements });
  const alex = await member(browser, "alex");
  const p = jon.page;
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (const d of days) {
    await expect(p.getByRole("button", { name: `Change ${d} dinner`, exact: true })).toHaveCount(1);
    await expect(p.getByRole("button", { name: `Lock ${d}`, exact: true })).toHaveCount(1);
  }
  await p.getByRole("button", { name: "Lock Thursday", exact: true }).click();
  await expect(p.getByRole("button", { name: "Unlock Thursday", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await announced(p)).join(" | ")).toContain("Thursday locked.");

  // Accepted-plan status is under its own heading.
  await expect(p.getByRole("heading", { name: "Accepted plan status" })).toHaveCount(1);
  await expect(p.getByTestId("status-sentence")).toContainText("Every dinner is covered.");
  // Outstanding grocery work is part of the Groceries link's name, not only a colored count.
  await expect(p.getByRole("link", { name: /^Groceries, \d+ lines? needs? attention$/ })).toHaveCount(1);

  // A stale preview is identified by name and text (not color), and announced once.
  await previewReplace(p, NIGHT.fri, "Fixture: Chicken penne");
  await expect(p.getByRole("region", { name: "Preview · Friday — draft, not applied" })).toBeVisible();
  await previewReplace(alex.page, NIGHT.fri, "Fixture: Turkey chili");
  await alex.page.getByTestId("apply").click();
  await expect(p.getByRole("region", { name: "Preview · Friday — out of date" })).toBeVisible();
  await expect(p.getByTestId("stale-badge")).toHaveText(/Out of date/);
  await expect.poll(async () => (await announced(p)).join(" | ")).toContain("Your Friday preview is now out of date and can't be applied.");
  expect((await announced(p)).filter((t) => t.includes("Friday preview is now out of date"))).toHaveLength(1);
  await expect(p.getByRole("button", { name: "Apply Friday preview" })).toBeDisabled();

  // Closed, the stale draft stays listed with an explicit, per-night Discard.
  await p.keyboard.press("Escape");
  await expect(p.getByRole("button", { name: "Discard Friday preview" })).toBeVisible();
  await jon.context.close();
  await alex.context.close();
  void fx;
});

test("B14 announcements: one per real change; routine refetches, polls and own reads announce nothing; only one live region", async ({ browser }) => {
  await seed();
  const jon = await member(browser, "jon", { init: recordAnnouncements });
  const alex = await member(browser, "alex");
  const p = jon.page;
  // Exactly one ambient live region (the polite announcer); the currency badge is not live. (Next.js adds its own route announcer for page
  // navigations; it is outside the app's markup and says nothing on a refetch.)
  expect(await p.evaluate(() => [...document.querySelectorAll("[aria-live]")].map((e) => e.getAttribute("data-testid")))).toEqual(["announcer"]);
  await expect(p.getByTestId("announcer")).toHaveAttribute("aria-live", "polite");
  await expect(p.getByTestId("currency")).not.toHaveAttribute("aria-live", /.*/);
  await expect(p.getByTestId("currency")).not.toHaveAttribute("role", /.*/);
  // At rest nothing in the app is a live region or alert (own-action feedback appears only after an action).
  await expect(p.locator('.app [role="alert"], .app [role="status"], .app [aria-live]')).toHaveCount(0);
  // Refetch triggers (focus, online) and a full poll interval bring nothing new: silence.
  for (let i = 0; i < 3; i++) await p.evaluate(() => window.dispatchEvent(new Event("focus")));
  await p.evaluate(() => window.dispatchEvent(new Event("online")));
  await p.waitForTimeout(16_000);
  expect(await announced(p)).toEqual([]);
  // Another member's decision: announced once, by name.
  await previewReplace(alex.page, NIGHT.fri, "Fixture: Turkey chili");
  await alex.page.getByTestId("apply").click();
  await expect.poll(async () => (await announced(p)).length).toBe(1);
  expect((await announced(p))[0]).toContain("Alex");
  for (let i = 0; i < 3; i++) await p.evaluate(() => window.dispatchEvent(new Event("focus")));
  await p.waitForTimeout(2_000);
  expect(await announced(p)).toHaveLength(1);
  await jon.context.close();
  await alex.context.close();
});

test("B14 background and return with a stale preview open in the sheet: focus stays in the sheet, Apply stays disabled, discarding returns focus", async ({ browser }) => {
  const fx = await seed();
  const jon = await member(browser, "jon", { init: recordAnnouncements });
  const alex = await member(browser, "alex");
  const p = jon.page;
  await previewReplace(p, NIGHT.fri, "Fixture: Chicken penne");
  const sheet = p.getByRole("dialog", { name: "Change Friday dinner" });
  await sheet.getByRole("button", { name: "Apply Friday preview" }).focus();
  await background(jon.context, p);
  await expect(sheet.getByTestId("apply")).toBeDisabled();
  await previewReplace(alex.page, NIGHT.fri, "Fixture: Turkey chili");
  await alex.page.getByTestId("apply").click();
  await foreground(jon.context, p);
  await expect(p.getByTestId("currency")).toHaveAttribute("data-currency", "current");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId("preview")).toHaveAttribute("data-stale", "true");
  await expect(sheet.getByTestId("apply")).toBeDisabled();
  expect((await focused(p)).inDialog || (await focused(p)).isBody).toBe(true);
  await p.keyboard.press("Tab"); // even from a disabled control, the next stop is in the sheet
  expect((await focused(p)).inDialog).toBe(true);
  await expect.poll(async () => (await announced(p)).join(" | ")).toContain("Your Friday preview is now out of date");
  await sheet.getByRole("button", { name: "Discard Friday preview" }).click();
  await expect(sheet.getByTestId("preview")).toHaveCount(0);
  expect((await focused(p)).inDialog).toBe(true);
  await p.keyboard.press("Escape");
  await expect.poll(async () => (await focused(p)).testid).toBe(`change-${NIGHT.fri}`);
  expect((await nightTitle(fx.weekId, NIGHT.fri)).title).toBe("Fixture: Turkey chili");
  await jon.context.close();
  await alex.context.close();
});

test("B14 grocery review during a dinner change: the reviewer keeps focus, sees the delta, and hears it once", async ({ browser }) => {
  await seed();
  const alex = await member(browser, "alex", { init: recordAnnouncements });
  const jon = await member(browser, "jon");
  await alex.page.getByRole("link", { name: "Groceries" }).click();
  await alex.page.getByTestId("approve-all").click();
  await expect(alex.page.getByTestId("readiness")).toContainText("Groceries ready to send.");
  const input = alex.page.locator("#an-groceries");
  await input.focus();
  await input.pressSequentially("lemons");
  await previewReplace(jon.page, NIGHT.fri, "Fixture: Chicken penne");
  await jon.page.getByTestId("apply").click();
  await expect(alex.page.getByTestId("grocery-delta")).toContainText("Chicken thighs increased");
  // Focus and the half-typed entry are untouched by the update.
  expect(await alex.page.evaluate(() => document.activeElement?.id)).toBe("an-groceries");
  await expect(input).toHaveValue("lemons");
  await expect.poll(async () => (await announced(alex.page)).join(" | ")).toMatch(/Jon: Friday.*approved grocery lines? needs? review again/);
  await alex.page.waitForTimeout(1500);
  expect(await announced(alex.page)).toHaveLength(1);
  await expect(alex.page.getByRole("link", { name: /^Groceries, \d+ lines? needs? attention$/ })).toHaveCount(1);
  await alex.context.close();
  await jon.context.close();
});

for (const width of [320, 390]) {
  test(`B14 sheet at ${width}px with 150% text: fits, scrolls inside itself, never under the nav or header`, async ({ browser }, info) => {
    await seed();
    const jon = await member(browser, "jon", { viewport: { width, height: 640 } });
    const p = jon.page;
    await p.addStyleTag({ content: "html { font-size: 150% !important; }" });
    await p.getByTestId(`change-${NIGHT.sun}`).scrollIntoViewIfNeeded();
    await previewReplace(p, NIGHT.sun, "Fixture: Chicken penne");
    const sheet = p.getByRole("dialog", { name: "Change Sunday dinner" });
    const box = await sheet.evaluate((d) => {
      const r = d.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, sw: d.scrollWidth, cw: d.clientWidth, vw: innerWidth, vh: innerHeight };
    });
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(box.vw + 0.5);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(box.vh + 0.5);
    expect(box.sw, "no sideways scrolling inside the sheet").toBeLessThanOrEqual(box.cw);
    expect(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    // Every control is hittable where it is drawn (not under the nav, the header, or the sticky sheet header).
    for (const name of ["Close Sunday changes", "Apply Sunday preview", "Cancel Sunday preview"]) {
      const el = sheet.getByRole("button", { name });
      await el.scrollIntoViewIfNeeded();
      const ok = await el.evaluate((b) => {
        const r = b.getBoundingClientRect();
        return b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) && r.right <= innerWidth;
      });
      expect(ok, name).toBe(true);
      await el.click({ trial: true });
    }
    await p.screenshot({ path: info.outputPath(`sheet-${width}.png`) });
    await jon.context.close();
  });
}

test("B14 reduced motion: the sheet does not animate when the member asks for reduced motion", async ({ browser }) => {
  await seed();
  for (const [pref, expected] of [["reduce", "none"], ["no-preference", "sheet-in"]] as const) {
    const jon = await member(browser, "jon", { reducedMotion: pref });
    await jon.page.getByTestId(`change-${NIGHT.fri}`).click();
    const anim = await jon.page.getByRole("dialog").evaluate((d) => getComputedStyle(d).animationName);
    expect(anim, pref).toBe(expected);
    await jon.context.close();
  }
});
