import type { ActionFunctionArgs } from "react-router-dom";
import { redirect } from "react-router-dom";
import type {
  RecipeFormData,
  RecipeCategory,
  ActionData,
} from "../types/recipe";
import { recipeApi } from "../api/recipeApi";
import { validateRecipeForm } from "../utils/validators";

export async function editRecipeAction({
  request,
  params,
}: ActionFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Recipe ID is required", { status: 400 });

  const formData = await request.formData();

  const recipeData: RecipeFormData = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    category: formData.get("category") as RecipeCategory,
    cookingTime: Number(formData.get("cookingTime")),
    servings: Number(formData.get("servings")),
    ingredients: formData.get("ingredients") as string,
    instructions: formData.get("instructions") as string,
    imageUrl: formData.get("imageUrl") as string,
  };

  // Validate
  const errors = validateRecipeForm(recipeData);
  if (errors.length > 0) {
    return { success: false, errors } as ActionData;
  }

  // Update recipe
  try {
    await recipeApi.updateRecipe(id, recipeData);
    return redirect(`/recipes/${id}`);
  } catch {
    return {
      success: false,
      errors: [{ field: "general", message: "Failed to update recipe" }],
    } as ActionData;
  }
}
