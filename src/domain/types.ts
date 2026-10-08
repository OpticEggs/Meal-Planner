// Shared domain types. Quantities are decimal strings; money is integer minor units.

export type NightKind = "cook" | "leftover" | "out" | "open";
export type EffortLevel = "easy" | "medium" | "involved";

export interface RecipeComponent {
  key: string;
  name: string;
  sort: number;
}

export interface RecipeIngredient {
  componentKey: string;
  ingredientKey: string;
  quantity: string; // per one portion of the component
  unit: string;
  form: string;
  note?: string | null;
}

export interface RecipeVersion {
  id: string;
  recipeId: string;
  versionNo: number;
  title: string;
  cuisine: string | null;
  summary: string | null;
  effortMinutes: number | null;
  effortLevel: EffortLevel | null;
  leftoverFriendly: boolean;
  instructions: string;
  reheatInstructions: string;
  provenance: "fixture" | "sample" | "manual";
  sourceLabel: string | null;
  estimate: boolean;
  components: RecipeComponent[];
  ingredients: RecipeIngredient[];
}

export interface Ingredient {
  key: string;
  name: string;
  tags: string[];
  allergenInfoKnown: boolean;
}

export interface NutritionFacts {
  ingredientKey: string;
  basisQty: string;
  basisUnit: string;
  calories: string | null;
  proteinG: string | null;
  carbsG: string | null;
  fatG: string | null;
  source: string;
  synthetic: boolean;
}

export interface Assignment {
  id: string;
  night: string;
  kind: NightKind;
  cookingEventId: string | null;
  locked: boolean;
  revision: number;
  reason: string | null;
}

export interface CookingEvent {
  id: string;
  recipeVersionId: string;
  status: "scheduled" | "deferred" | "retired";
  cookNight: string | null;
  revision: number;
}

export interface Allocation {
  cookingEventId: string;
  memberId: string;
  kind: "dinner" | "lunch";
  night: string;
  componentPortions: Record<string, string>;
}

export interface LeftoverObservation {
  cookingEventId: string;
  portionsRemaining: string;
  observedAt: string; // ISO instant
  observedNight: string; // first household dinner date the observation applies to
}

export interface PlanState {
  weekId: string;
  weekStart: string;
  acceptedChoiceRevision: number;
  assignments: Assignment[];
  events: CookingEvent[];
  allocations: Allocation[];
}

export interface Exclusion {
  id: string;
  memberId: string | null;
  term: string;
}

export interface Member {
  id: string;
  displayName: string;
}
