import { parseIngredientLine } from "@/server/integrations/recipe-import/ingredient-line";
import { initialDecision, suggestedDecision, type ParsedLine } from "@/domain/recipes/import";
const lines = ["1/3 cup pesto (homemade (or store-bought))", "1/3 cup pesto (homemade or store-bought)", "1/2 cup pesto (homemade (or store-bought))"];
for (const raw of lines) {
  const parsed = parseIngredientLine(raw);
  const p: ParsedLine = { quantity: parsed.quantity, unit: parsed.unit, name: parsed.name, form: parsed.form, status: parsed.status, reasons: parsed.reasons, note: parsed.note ?? null, suggestion: parsed.status === "requires_review" ? (parsed.suggestion ?? null) : null, suggestionNote: parsed.suggestionNote ?? null };
  const sug = suggestedDecision(p);
  // What ImportReview.LineRow pre-fills when the member presses "Use" on an undecided line (ImportReview.tsx:200,214)
  const proposal = sug?.use ? sug : { name: p.name, quantity: p.quantity ?? "", unit: p.unit ?? "", form: p.form ?? "raw" };
  console.log(JSON.stringify({ raw, parseIngredientLine: parsed, initialDecision: initialDecision(p), suggestedDecision: sug, uiUsePrefill: proposal }, null, 2));
}
