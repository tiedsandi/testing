import type { LoaderFunctionArgs } from "react-router-dom";
import { recipeApi } from "../api/recipeApi";

export async function editRecipeLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Recipe ID is required", { status: 400 });

  const recipe = await recipeApi.getRecipeById(id);
  return recipe;
}
