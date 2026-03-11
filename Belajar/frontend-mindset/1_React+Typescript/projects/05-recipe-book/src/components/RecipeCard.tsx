// src/components/RecipeCard.tsx
import { Link } from "react-router-dom";
import type { Recipe } from "../types/recipe";
import FavoriteButton from "./FavoriteButton";

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-white">
      {/* Image */}
      <div className="relative w-full h-48 bg-gray-200">
        <img
          src={recipe.imageUrl}
          alt={recipe.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <FavoriteButton recipeId={recipe.id} isFavorite={recipe.isFavorite} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category Badge */}
        <span className="inline-block px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full mb-2">
          {recipe.category}
        </span>

        {/* Title */}
        <h3 className="text-xl font-bold mb-2 line-clamp-1">{recipe.title}</h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {recipe.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>⏱️ {recipe.cookingTime} min</span>
          <span>🍽️ {recipe.servings} servings</span>
        </div>

        {/* View Detail Link */}
        <Link
          to={`/recipes/${recipe.id}`}
          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          View Recipe
        </Link>
      </div>
    </div>
  );
}
