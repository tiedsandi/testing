import type { ActionFunctionArgs } from "react-router-dom";
import { recipeApi } from "../api/recipeApi";

export async function toggleFavoriteAction({ params }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Recipe ID is required", { status: 400 });

  const updatedRecipe = await recipeApi.toggleFavorite(id);
  return updatedRecipe;
}
