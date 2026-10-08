/**
 * Screens of the main views at phone widths, in the light and the dark theme, for the visual-update
 * evidence (before/after). Each view must fit its width: no horizontal page scroll. Screenshots go to
 * TABLE_SCREENS_DIR when set (evidence runs), otherwise to the test's output folder.
 */
import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { member, seed } from "./helpers";

const WIDTHS = [
  { width: 390, height: 844 },
  { width: 320, height: 640 },
];
const SCHEMES = (process.env.TABLE_SCREENS_SCHEMES ?? "light,dark").split(",") as ("light" | "dark")[];

async function settled(page: Page) {
  await expect(page.getByTestId("currency")).toHaveAttribute("data-currency", "current");
  await page.evaluate(() => document.fonts.ready);
}

for (const scheme of SCHEMES) {
  for (const vp of WIDTHS) {
    test(`main views at ${vp.width} px, ${scheme} theme`, async ({ browser }, info) => {
      await seed();
      const { context, page } = await member(browser, "jon", { viewport: vp, reducedMotion: "reduce" });
      await page.emulateMedia({ colorScheme: scheme });
      const shot = async (name: string) => {
        await settled(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect.soft(overflow, `${name}: no horizontal page scroll`).toBeLessThanOrEqual(0);
        const dir = process.env.TABLE_SCREENS_DIR;
        // What the phone shows on arrival, and the whole page (the fixed header and tab bar appear once,
        // at the scroll position, in a full-page capture).
        for (const fullPage of [false, true]) {
          const file = `${vp.width}-${scheme}-${name}-${fullPage ? "full" : "top"}.png`;
          await page.screenshot({ path: dir ? path.join(dir, file) : info.outputPath(file), fullPage });
        }
      };

      await expect(page.getByTestId("status-sentence")).toBeVisible();
      await shot("1-week");
      await page.getByTestId("cook-link").first().click();
      await expect(page.getByTestId("cook-title")).toBeVisible();
      await shot("2-cook");
      await page.getByRole("link", { name: "Groceries" }).click();
      await expect(page.getByTestId("still-to-buy")).toBeVisible();
      await shot("3-groceries");
      await page.getByRole("link", { name: "Recipes" }).click();
      await expect(page.getByTestId("recipe-row").first()).toBeVisible();
      await shot("4-recipes");
      await page.getByRole("tab", { name: "Saved links" }).click();
      await shot("4b-saved-links");
      await page.getByRole("tab", { name: "All" }).click();
      await page.getByTestId("recipe-row").first().getByRole("link").first().click();
      await expect(page.getByTestId("recipe-title")).toBeVisible();
      await shot("5-recipe");
      await page.getByRole("link", { name: "Explore" }).click();
      await expect(page.getByTestId("recipe-card").first()).toBeVisible();
      await shot("6-explore");
      await page.getByRole("link", { name: "Week" }).click();
      await page.getByRole("button", { name: "Next week" }).click();
      await page.getByRole("button", { name: "Propose a week" }).click();
      await expect(page.getByTestId("proposal")).toBeVisible();
      await shot("7-proposal");
      await context.close();
    });
  }
}
