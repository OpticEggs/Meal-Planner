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
  provenance: "fixture" | "sample" | "manual" | "imported";
  sourceLabel: string | null;
  /** The page an imported recipe came from (kept on later versions); null for manual/fixture recipes. */
  sourceUrl?: string | null;
  /** Attribution read from the page (kept on later versions). */
  sourceAuthor?: string | null;
  sourceSiteName?: string | null;
  /** A photo kept under a recorded content permission (served only to the household). */
  imageId?: string | null;
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
  /** The form the values describe (raw / cooked / as_sold). A recipe that uses the ingredient in a
   *  different form gets "not applicable" (unknown) for it — yields are never converted (B7). */
  form?: string;
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
