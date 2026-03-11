import type { LoaderFunctionArgs } from "react-router-dom";
import type { RecipeCategory } from "../types/recipe";
import { recipeApi } from "../api/recipeApi";

export async function recipeListLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const category = url.searchParams.get("category") || undefined;

  const recipes = await recipeApi.getRecipes({
    search,
    category: category as RecipeCategory | undefined,
  });

  return { recipes, search, category };
}
