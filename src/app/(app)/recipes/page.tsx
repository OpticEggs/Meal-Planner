import { RecipesScreen } from "@/ui/Recipes";

/** `?tab=links` opens the Saved links tab (More → Saved links). The key remounts the screen when it changes. */
export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { tab } = await searchParams;
  const initial = tab === "links" ? "links" : "all";
  return <RecipesScreen key={initial} initialFilter={initial} />;
}
