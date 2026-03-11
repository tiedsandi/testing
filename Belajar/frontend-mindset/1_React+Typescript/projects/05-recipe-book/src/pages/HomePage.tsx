// src/pages/HomePage.tsx
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="text-center max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Welcome to Recipe Book
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Discover, create, and share your favorite recipes. Built with React
          Router v6.4+ Data API for a seamless experience.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/recipes"
            className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Recipes
          </Link>
          <Link
            to="/recipes/new"
            className="px-8 py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Create Recipe
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 mt-16">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="text-4xl mb-4">📖</div>
          <h3 className="text-xl font-semibold mb-2">Browse Recipes</h3>
          <p className="text-gray-600">
            Search and filter through our collection of delicious recipes.
          </p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="text-4xl mb-4">✍️</div>
          <h3 className="text-xl font-semibold mb-2">Create & Edit</h3>
          <p className="text-gray-600">
            Add your own recipes with full CRUD operations support.
          </p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="text-4xl mb-4">❤️</div>
          <h3 className="text-xl font-semibold mb-2">Save Favorites</h3>
          <p className="text-gray-600">
            Mark recipes as favorites with optimistic UI updates.
          </p>
        </div>
      </div>

      {/* Tech Stack Info */}
      <div className="mt-16 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-2xl font-semibold mb-4">Built With Modern Tech</h3>
        <div className="flex flex-wrap gap-3 justify-center">
          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium">
            React + TypeScript
          </span>
          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium">
            React Router v6.4+
          </span>
          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium">
            Loader & Action API
          </span>
          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium">
            Optimistic UI
          </span>
          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium">
            Form Validation
          </span>
          <span className="px-4 py-2 bg-white rounded-full text-sm font-medium">
            Error Boundaries
          </span>
        </div>
      </div>
    </div>
  );
}
