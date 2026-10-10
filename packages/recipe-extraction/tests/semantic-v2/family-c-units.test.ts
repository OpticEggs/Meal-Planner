/**
 * semantic-v2 · family C: count units after the food, package semantics and qualifiers (CONTRACT §7.3, §7.4, §12.3,
 * §12.4, §12.5, §12.10). Positive cases and nearby negative controls for each rule.
 */
import { describe, expect, it } from "vitest";
import { amountText, core, read } from "./helpers";

describe("count noun after the food (§12.4)", () => {
  it.each([
    ["eight cardamom pods", "8", "pod", "cardamom"], ["2 celery ribs, diced", "2", "rib", "celery"], ["2 star anise pods", "2", "pod", "star anise"],
    ["4 lemon wedges", "4", "wedge", "lemon"], ["2 cinnamon sticks", "2", "stick", "cinnamon"], ["2 bacon strips", "2", "strip", "bacon"],
    ["2 lettuce heads", "2", "head", "lettuce"], ["3 garlic cloves", "3", "clove", "garlic"], ["6 anchovy fillets", "6", "fillet", "anchovy"],
    ["4 sausage links", "4", "link", "sausage"], ["2 kale bunches", "2", "bunch", "kale"], ["10 basil leaves", "10", "leaf", "basil"], ["1 fennel bulb", "1", "bulb", "fennel"],
  ])("%s → %s %s %s", (line, q, unit, name) => {
    expect(core(read(line))).toEqual({ status: "ready", name, quantity: q, unit });
  });

  it.each([
    ["2 fish sticks", "fish sticks"], ["4 mozzarella sticks", "mozzarella sticks"], ["6 breadsticks", "breadsticks"], ["3 bay leaves", "bay leaves"],
    ["8 curry leaves", "curry leaves"], ["4 kaffir lime leaves", "kaffir lime leaves"], ["4 pandan leaves", "pandan leaves"], ["6 lasagna sheets", "lasagna sheets"],
    ["2 bouillon cubes", "bouillon cubes"], ["6 whole cloves", "whole cloves"], ["2 cloves", "cloves"], ["4 short ribs", "short ribs"],
  ])("identity exception: %s → each, %s", (line, name) => {
    expect(read(line)).toMatchObject({ status: "ready", name, unit: { canonical: "each" } });
  });

  it("negative controls: another unit stated, no amount, or a post-food noun that is not a portion", () => {
    expect(read("1 cup basil leaves")).toMatchObject({ name: "basil leaves", unit: { canonical: "cup" } });
    expect(read("lime wedges, to serve")).toMatchObject({ status: "ready", name: "lime wedges", quantity: null });
    expect(read("4 chicken thighs")).toMatchObject({ name: "chicken thighs", unit: { canonical: "each" } });
    expect(read("2 pork chops")).toMatchObject({ name: "pork chops", unit: { canonical: "each" } });
    expect(read("2 granola bars")).toMatchObject({ name: "granola bars", unit: { canonical: "each" } });
  });
});

describe("package size with no count; restated package sizes (§12.3)", () => {
  it.each([
    ["28 oz can tomatoes", "can", "28 oz", null], ["400 g can chickpeas", "can", "400 g", null], ["8-ounce package cream cheese", "package", "8 oz", null],
    ["400ml can coconut milk", "can", "400 ml", null], ["400g (14oz) can chopped tomatoes", "can", "400 g", "14oz"], ["400 g / 14 oz can tomatoes", "can", "400 g", "14 oz"],
    ["14 oz (400 g) can tomatoes", "can", "14 oz", "400 g"], ["16 oz (1 lb) bag frozen peas", "bag", "16 oz", "1 lb"], ["400 g can (14 oz) tomatoes", "can", "400 g", "14 oz"],
    ["1 (15 oz / 425 g) can chickpeas", "can", "15 oz", "425 g"], ["1 large (28 oz) can tomatoes", "can", "28 oz", "large"], ["6 oz cup yogurt", "container", "6 oz", null],
  ])("%s → 1 %s, package %s, note %s", (line, unit, pkg, note) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "ready", quantity: { numerator: "1", denominator: "1" }, unit: { canonical: unit }, note });
    expect(amountText(r.packageSize)).toBe(pkg);
    expect(r.equivalents).toEqual([]);
  });

  it("negative controls: a plural container has no count; a restated size that disagrees is a second amount; product-form words are no containers", () => {
    expect(read("15 oz cans beans")).toMatchObject({ status: "needs_review", quantity: null, unit: { canonical: "can" } });
    expect(read("400 g (12 oz) can tomatoes").reasons).toContain("quantity_unassigned");
    expect(core(read("28 oz canned tomatoes"))).toEqual({ status: "ready", name: "canned tomatoes", quantity: "28", unit: "oz" });
    expect(core(read("6 oz salmon fillet"))).toEqual({ status: "ready", name: "salmon fillet", quantity: "6", unit: "oz" });
  });

  it("per-piece weights are notes (several) or equivalents (one), never package sizes", () => {
    expect(read("4 (6-oz) salmon fillets")).toMatchObject({ status: "ready", unit: { canonical: "fillet" }, packageSize: null, note: "6-oz" });
    expect(read("2 (6 oz) boneless skinless chicken breasts")).toMatchObject({ status: "ready", unit: { canonical: "each" }, packageSize: null, note: "6 oz" });
    expect(read("a 3-pound whole chicken")).toMatchObject({ status: "ready", quantity: { numerator: "1" }, packageSize: null, equivalents: [{ unit: { canonical: "lb" } }] });
    expect(read("1 (1 lb) loaf French bread")).toMatchObject({ status: "ready", unit: { canonical: "loaf" }, packageSize: { unit: { canonical: "lb" } } });
    expect(read("2 (about 1 lb) potatoes").status).toBe("needs_review"); // each, or in all?
  });
});

describe("container cups (§12.5)", () => {
  it.each(["3 (5.3 oz) cups vanilla Greek yogurt", "3 cups (5.3 oz each) Greek yogurt", "3 5.3-oz cups yogurt"])("%s → 3 container, package 5.3 oz", (line) => {
    const r = read(line);
    expect(r).toMatchObject({ status: "ready", quantity: { numerator: "3" }, unit: { canonical: "container" } });
    expect(amountText(r.packageSize)).toBe("5 3/10 oz");
  });

  it("negative controls: a measuring cup never carries a package size", () => {
    expect(read("1 cup (8 oz) sour cream")).toMatchObject({ status: "ready", unit: { canonical: "cup" }, packageSize: null, equivalents: [{ unit: { canonical: "oz" } }] });
    expect(read("1 cup cup noodles")).toMatchObject({ status: "ready", name: "cup noodles", unit: { canonical: "cup" } });
    expect(read("½ (2 cups) cups milk").unit?.canonical).not.toBe("container");
  });
});

describe("size words (§12.10)", () => {
  it.each([
    ["1 lb large raw shrimp, peeled, tails on", "shrimp", "large; peeled, tails on"], ["2 lbs medium potatoes", "potatoes", "medium"], ["1 lb small red potatoes", "red potatoes", "small"],
    ["1 lb jumbo sea scallops", "sea scallops", "jumbo"], ["3 small zucchini", "zucchini", "small"], ["2 medium zucchini, cut into half-moons", "zucchini", "medium; cut into half-moons"],
    ["3 colossal shrimp", "shrimp", "colossal"],
  ])("%s → %s, note %s", (line, name, note) => {
    expect(read(line)).toMatchObject({ status: "ready", name, note });
  });

  it.each([["1 cup small curd cottage cheese", "small curd cottage cheese"], ["1 lb jumbo shells", "jumbo shells"], ["1 cup medium salsa", "medium salsa"], ["1 cup medium-grain rice", "medium-grain rice"], ["2 cups mini marshmallows", "mini marshmallows"], ["1 cup baby spinach", "baby spinach"]])(
    "negative control, a product term keeps its size word: %s",
    (line, name) => {
      expect(read(line)).toMatchObject({ status: "ready", name, note: null });
    },
  );
});
