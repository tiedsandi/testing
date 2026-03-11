// src/pages/RecipeDetailPage.tsx
import { useLoaderData, Link, useNavigate } from "react-router-dom";
import type { Recipe } from "../types/recipe";
import FavoriteButton from "../components/FavoriteButton";
import DeleteButton from "../components/DeleteButton";

export default function RecipeDetailPage() {
  const recipe = useLoaderData() as Recipe;
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 text-blue-600 hover:text-blue-700 flex items-center gap-2"
      >
        ← Back
      </button>

      {/* Recipe Header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        {/* Image */}
        <div className="relative w-full h-96 bg-gray-200">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Title & Favorite */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full mb-3">
                {recipe.category}
              </span>
              <h1 className="text-4xl font-bold text-gray-900">
                {recipe.title}
              </h1>
            </div>
            <FavoriteButton
              recipeId={recipe.id}
              isFavorite={recipe.isFavorite}
            />
          </div>

          {/* Description */}
          <p className="text-lg text-gray-700 mb-6">{recipe.description}</p>

          {/* Meta Info */}
          <div className="flex gap-6 text-gray-600 pb-6 border-b">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏱️</span>
              <div>
                <p className="text-sm text-gray-500">Cooking Time</p>
                <p className="font-semibold">{recipe.cookingTime} minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <div>
                <p className="text-sm text-gray-500">Servings</p>
                <p className="font-semibold">
                  {recipe.servings}{" "}
                  {recipe.servings === 1 ? "person" : "people"}
                </p>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="pt-6 pb-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ingredients
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="text-gray-700">{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="pt-6 pb-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Instructions
            </h2>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-4">
                  <span className="shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 pt-1">{instruction}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <Link
              to={`/recipes/${recipe.id}/edit`}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Recipe
            </Link>
            <DeleteButton recipeId={recipe.id} recipeName={recipe.title} />
          </div>

          {/* Metadata */}
          <div className="mt-8 pt-6 border-t text-sm text-gray-500">
            <p>Created: {new Date(recipe.createdAt).toLocaleDateString()}</p>
            <p>
              Last Updated: {new Date(recipe.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
