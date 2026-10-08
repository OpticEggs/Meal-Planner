import { RecipeDetail } from "@/ui/Recipes";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecipeDetail recipeId={id} />;
}
