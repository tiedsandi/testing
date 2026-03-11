// src/pages/EditRecipePage.tsx
import { useLoaderData, useActionData, useNavigation } from "react-router-dom";
import type { Recipe, ActionData } from "../types/recipe";
import RecipeForm from "../components/RecipeForm";

export default function EditRecipePage() {
  const recipe = useLoaderData() as Recipe;
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Edit Recipe</h1>
        <p className="text-gray-600">Update the details for "{recipe.title}"</p>
      </div>

      {/* Form */}
      <RecipeForm
        recipe={recipe}
        actionData={actionData}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
