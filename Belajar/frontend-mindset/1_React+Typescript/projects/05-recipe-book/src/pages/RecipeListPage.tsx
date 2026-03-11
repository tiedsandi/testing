// src/pages/RecipeListPage.tsx
import { useLoaderData, Link } from "react-router-dom";
import type { Recipe } from "../types/recipe";
import RecipeCard from "../components/RecipeCard";
import SearchBar from "../components/SearchBar";
import CategoryFilter from "../components/CategoryFilter";

export default function RecipeListPage() {
  const { recipes, search, category } = useLoaderData() as {
    recipes: Recipe[];
    search?: string;
    category?: string;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Recipes</h1>
          <p className="text-gray-600">
            {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link
          to="/recipes/new"
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Recipe
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <SearchBar defaultValue={search} />
        <CategoryFilter defaultValue={category} />
      </div>

      {/* Recipe Grid */}
      {recipes.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-xl text-gray-600 mb-4">No recipes found</p>
          <p className="text-gray-500 mb-8">
            {search || category
              ? "Try adjusting your search or filter"
              : "Start by creating your first recipe"}
          </p>
          <Link
            to="/recipes/new"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Recipe
          </Link>
        </div>
      )}
    </div>
  );
}
