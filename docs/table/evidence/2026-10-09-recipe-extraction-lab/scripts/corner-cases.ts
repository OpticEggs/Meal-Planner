// Census: actual baseline (cb7b56e) behaviour of Table's parseIngredientLine on the plan's corner cases.
import { parseIngredientLine } from "@/server/integrations/recipe-import/ingredient-line";
const lines = [
  "1/3 cup pesto (homemade (or store-bought))", "⅓ cup sugar", "1 1/3 cups flour", "1⅓ cups rolled oats", "1-1/2 cups milk", "1⁄2 cup broth",
  "2 (15 oz) cans black beans, drained", "1 can (14.5 oz) diced tomatoes", "3 cloves garlic", "salt and pepper to taste", "salt and pepper, to taste",
  "2-3 cups broth", "2 eggs", "1 jalapeño, minced", "1 Tbsp olive oil ($0.16)", "8 oz milk", "8 fl oz milk", "2 oz cheese", "2 fl oz broth",
  "3 cups cooked rice", "1 cup 2% milk", "1 cup milk or cream", "1 red bell pepper, diced", "1 cup flour (packed)", "1 lb 4 oz beef", "a pinch of salt",
  "1 tsp vanilla (optional)", "For the sauce:",
];
const rows = lines.map((l) => { const r = parseIngredientLine(l); return { line: l, status: r.status, quantity: r.quantity, unit: r.unit, name: r.name, note: r.note, reasons: r.reasons.join("; "), suggestion: r.suggestion && r.suggestion.use ? `${r.suggestion.quantity} ${r.suggestion.unit} ${r.suggestion.name}` : r.suggestion ? "leave out" : null }; });
console.log(JSON.stringify(rows, null, 1));
