// src/pages/CreateRecipePage.tsx
import { useActionData, useNavigation } from "react-router-dom";
import type { ActionData } from "../types/recipe";
import RecipeForm from "../components/RecipeForm";

export default function CreateRecipePage() {
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Create New Recipe
        </h1>
        <p className="text-gray-600">
          Fill in the details below to add a new recipe to your collection
        </p>
      </div>

      {/* Form */}
      <RecipeForm actionData={actionData} isSubmitting={isSubmitting} />
    </div>
  );
}
