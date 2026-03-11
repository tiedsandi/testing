// src/components/RecipeForm.tsx
import { Form } from "react-router-dom";
import type { ActionData, Recipe, RecipeCategory } from "../types/recipe";

const categories: RecipeCategory[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Dessert",
  "Snack",
  "Drink",
];

interface RecipeFormProps {
  recipe?: Recipe; // For edit mode
  actionData?: ActionData;
  isSubmitting: boolean;
}

export default function RecipeForm({
  recipe,
  actionData,
  isSubmitting,
}: RecipeFormProps) {
  // Helper to get error message for a field
  const getError = (field: string): string | undefined => {
    return actionData?.errors?.find((e) => e.field === field)?.message;
  };

  // Helper to convert array to newline-separated string for textarea
  const arrayToText = (arr: string[] | undefined): string => {
    return arr ? arr.join("\n") : "";
  };

  return (
    <Form method="post" className="max-w-2xl mx-auto space-y-6">
      {/* Success Message */}
      {actionData?.success && (
        <div className="p-4 bg-green-100 text-green-800 rounded-lg">
          {actionData.message || "Recipe saved successfully!"}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2">
          Recipe Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={recipe?.title}
          required
          minLength={3}
          maxLength={100}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            getError("title")
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {getError("title") && (
          <p className="mt-1 text-sm text-red-600">{getError("title")}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2">
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={recipe?.description}
          required
          minLength={10}
          rows={3}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            getError("description")
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {getError("description") && (
          <p className="mt-1 text-sm text-red-600">{getError("description")}</p>
        )}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium mb-2">
          Category *
        </label>
        <select
          id="category"
          name="category"
          defaultValue={recipe?.category}
          required
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            getError("category")
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {getError("category") && (
          <p className="mt-1 text-sm text-red-600">{getError("category")}</p>
        )}
      </div>

      {/* Cooking Time & Servings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="cookingTime"
            className="block text-sm font-medium mb-2"
          >
            Cooking Time (minutes) *
          </label>
          <input
            type="number"
            id="cookingTime"
            name="cookingTime"
            defaultValue={recipe?.cookingTime}
            required
            min={1}
            max={1440}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              getError("cookingTime")
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {getError("cookingTime") && (
            <p className="mt-1 text-sm text-red-600">
              {getError("cookingTime")}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="servings" className="block text-sm font-medium mb-2">
            Servings *
          </label>
          <input
            type="number"
            id="servings"
            name="servings"
            defaultValue={recipe?.servings}
            required
            min={1}
            max={100}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              getError("servings")
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:ring-blue-500"
            }`}
          />
          {getError("servings") && (
            <p className="mt-1 text-sm text-red-600">{getError("servings")}</p>
          )}
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <label htmlFor="ingredients" className="block text-sm font-medium mb-2">
          Ingredients (one per line) *
        </label>
        <textarea
          id="ingredients"
          name="ingredients"
          defaultValue={arrayToText(recipe?.ingredients)}
          required
          rows={6}
          placeholder="2 cups flour&#10;1 tsp salt&#10;3 eggs"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            getError("ingredients")
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {getError("ingredients") && (
          <p className="mt-1 text-sm text-red-600">{getError("ingredients")}</p>
        )}
      </div>

      {/* Instructions */}
      <div>
        <label
          htmlFor="instructions"
          className="block text-sm font-medium mb-2"
        >
          Instructions (one step per line) *
        </label>
        <textarea
          id="instructions"
          name="instructions"
          defaultValue={arrayToText(recipe?.instructions)}
          required
          rows={8}
          placeholder="Preheat oven to 350°F&#10;Mix dry ingredients&#10;Add wet ingredients"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            getError("instructions")
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {getError("instructions") && (
          <p className="mt-1 text-sm text-red-600">
            {getError("instructions")}
          </p>
        )}
      </div>

      {/* Image URL */}
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium mb-2">
          Image URL *
        </label>
        <input
          type="url"
          id="imageUrl"
          name="imageUrl"
          defaultValue={recipe?.imageUrl}
          required
          placeholder="https://example.com/image.jpg"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
            getError("imageUrl")
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {getError("imageUrl") && (
          <p className="mt-1 text-sm text-red-600">{getError("imageUrl")}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting
            ? "Saving..."
            : recipe
              ? "Update Recipe"
              : "Create Recipe"}
        </button>
      </div>
    </Form>
  );
}
