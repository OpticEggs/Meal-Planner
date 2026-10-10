// Coordinator-owned (Phase 2B): the non-ingredient shapes semantic-v2 is designed to RECOGNISE must be rejected
// exactly (`unsupported`), not merely sent to review. The required harness accepts a safe abstention (C8) as G2 does;
// this file keeps correct rejections distinguishable from safe abstentions (owner requirement 4) and pins the named
// rejection safeguards (headings, nutrition facts, nutrition panels, equipment, ratings, steps, metadata).
import { describe, expect, it } from "vitest";
import type { ParsedIngredientV1 } from "../../src/contract";
import { getEngine } from "../../src/ingredient/engines";

const engine = getEngine("semantic-v2");
const CASES: Record<string, string[]> = {
  "section headings (componentHeading)": ["SAUCE", "Cake Layers", "Topping"],
  "nutrition facts (nutrient label + mass)": ["Vitamin C: 15 mg", "Protein: 20 grams", "Sat. fat: 3 g", "Vit. C 12 mg"],
  "one-line nutrition panels (nutritionPanel)": [
    "Calories: 412kcal | Carbohydrates: 52g | Protein: 18g",
    "Calories 250 | Fat 10g | Carbs 30g",
    "Protein 20g • Fat 9g • Carbs 41g",
    "Calories: 320; Protein: 12 g; Fat: 8 g",
  ],
  "equipment (equipmentShape)": ["1 rolling pin", "1 roll kitchen twine", "6 popsicle sticks", "1 box toothpicks"],
  "ratings, steps, metadata": ["4.8 stars (120 reviews)", "Step 2", "Course: dinner"],
};

describe("exact rejections of recognised non-ingredient shapes (semantic-v2)", () => {
  for (const [group, lines] of Object.entries(CASES)) {
    for (const line of lines) {
      it(`${group}: ${JSON.stringify(line)} → unsupported, no amount`, () => {
        const got = engine.parse(line) as ParsedIngredientV1;
        expect(got.status).toBe("unsupported");
        expect(got.quantity ?? null).toBeNull();
      });
    }
  }
});
