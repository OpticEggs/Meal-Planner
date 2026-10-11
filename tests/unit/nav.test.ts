/** Q4 (2026-10-11): the four primary tabs and which one is current for each screen. */
import { describe, expect, it } from "vitest";
import { isActiveTab } from "@/ui/nav";

const TABS = ["/recipes", "/selected", "/groceries", "/more"];
const current = (path: string) => TABS.filter((t) => isActiveTab(t, path));

describe("primary navigation: exactly one current tab per screen", () => {
  it.each([
    ["/recipes", "/recipes"],
    ["/recipes/abc", "/recipes"],
    ["/selected", "/selected"],
    ["/groceries", "/groceries"],
    ["/more", "/more"],
    ["/", "/more"],
    ["/cook/mon", "/more"],
    ["/explore", "/more"],
    ["/household", "/more"],
    ["/week/groceries", "/more"],
  ])("%s → %s", (path, tab) => {
    expect(current(path)).toEqual([tab]);
  });
  it("matches whole path segments only", () => {
    expect(current("/recipesx")).toEqual([]);
    expect(current("/weekly")).toEqual([]);
  });
});
