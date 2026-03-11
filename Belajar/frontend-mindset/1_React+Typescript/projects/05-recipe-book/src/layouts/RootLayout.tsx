// src/layouts/RootLayout.tsx
import { Outlet, Link, useNavigation } from "react-router-dom";
import LoadingBar from "../components/LoadingBar";

export default function RootLayout() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Bar */}
      {isLoading && <LoadingBar />}

      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <Link to="/" className="text-2xl font-bold text-blue-600">
              🍳 Recipe Book
            </Link>

            {/* Navigation Links */}
            <div className="flex gap-6">
              <Link
                to="/"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/recipes"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                All Recipes
              </Link>
              <Link
                to="/recipes/new"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                + New Recipe
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600">
          <p>© 2024 Recipe Book. Built with React Router v6.4+ Data API</p>
        </div>
      </footer>
    </div>
  );
}
