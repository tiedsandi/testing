import type { ActionFunctionArgs } from "react-router-dom";
import { redirect } from "react-router-dom";
import { recipeApi } from "../api/recipeApi";

export async function deleteRecipeAction({ params }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Recipe ID is required", { status: 400 });

  await recipeApi.deleteRecipe(id);

  // Redirect ke list page
  return redirect("/recipes");
}
