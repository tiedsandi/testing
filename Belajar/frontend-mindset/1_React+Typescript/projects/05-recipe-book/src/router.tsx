// src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import ErrorBoundary from "./layouts/ErrorBoundary";
import HomePage from "./pages/HomePage";
import RecipeListPage from "./pages/RecipeListPage";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import CreateRecipePage from "./pages/CreateRecipePage";
import EditRecipePage from "./pages/EditRecipePage";

// Import loaders
import { recipeListLoader } from "./loaders/recipeListLoader";
import { recipeDetailLoader } from "./loaders/recipeDetailLoader";
import { editRecipeLoader } from "./loaders/editRecipeLoader";

// Import actions
import { createRecipeAction } from "./actions/createRecipeAction";
import { editRecipeAction } from "./actions/editRecipeAction";
import { deleteRecipeAction } from "./actions/deleteRecipeAction";
import { toggleFavoriteAction } from "./actions/toggleFavoriteAction";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "recipes",
        element: <RecipeListPage />,
        loader: recipeListLoader,
      },
      {
        path: "recipes/new",
        element: <CreateRecipePage />,
        action: createRecipeAction,
      },
      {
        path: "recipes/:id",
        element: <RecipeDetailPage />,
        loader: recipeDetailLoader,
      },
      {
        path: "recipes/:id/edit",
        element: <EditRecipePage />,
        loader: editRecipeLoader,
        action: editRecipeAction,
      },
      {
        path: "recipes/:id/delete",
        action: deleteRecipeAction,
      },
      {
        path: "recipes/:id/favorite",
        action: toggleFavoriteAction,
      },
    ],
  },
]);
