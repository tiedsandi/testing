# Membangun Recipe Book App: React Router Loader & Action

> **Prerequisite:** Sudah baca:
>
> - [06_react-router-loader-action.md](./06_react-router-loader-action.md) — loader, action, Form, useNavigation, useFetcher
> - [05_react-router-folder-structure.md](./05_react-router-folder-structure.md) — routing dasar, useNavigate, useParams
> - [C_weather-app-project.md](./C_weather-app-project.md) — custom hooks & API fetching

---

## Daftar Isi

1. [Overview & Tujuan Belajar](#1-overview--tujuan-belajar)
2. [Struktur Folder Project](#2-struktur-folder-project)
3. [Setup Project & Dependencies](#3-setup-project--dependencies)
4. [Typing: Interface & Types](#4-typing-interface--types)
5. [Mock API Service](#5-mock-api-service)
6. [Router Setup dengan createBrowserRouter](#6-router-setup-dengan-createbrowserrouter)
7. [Layouts: RootLayout & ErrorBoundary](#7-layouts-rootlayout--errorboundary)
8. [Page: RecipeListPage dengan Loader](#8-page-recipelistpage-dengan-loader)
9. [Page: RecipeDetailPage dengan Loader](#9-page-recipedetailpage-dengan-loader)
10. [Page: CreateRecipePage dengan Action](#10-page-createrecipepage-dengan-action)
11. [Page: EditRecipePage dengan Loader + Action](#11-page-editrecipepage-dengan-loader--action)
12. [Delete Recipe dengan useFetcher](#12-delete-recipe-dengan-usefetcher)
13. [Search & Filter dengan URL Search Params](#13-search--filter-dengan-url-search-params)
14. [Favorite Recipe dengan Optimistic UI](#14-favorite-recipe-dengan-optimistic-ui)
15. [Global Loading State dengan useNavigation](#15-global-loading-state-dengan-usenavigation)
16. [Form Validation & Error Handling](#16-form-validation--error-handling)
17. [Checklist Akhir & Ide Pengembangan](#17-checklist-akhir--ide-pengembangan)

---

## 1. Overview & Tujuan Belajar

### Apa yang Akan Kita Bangun?

Sebuah **Recipe Book App** yang mengimplementasikan full CRUD operations menggunakan **React Router v6.4+ Data API**. Ini adalah project yang dirancang khusus untuk melatih **loader** dan **action** — cara modern untuk handle data fetching dan mutations di React Router.

Berbeda dari project sebelumnya yang pakai `useEffect` untuk fetching, di sini kita akan pakai pendekatan yang lebih deklaratif dan type-safe: data di-fetch **sebelum** component render, form submit di-handle dengan **action**, dan error handling dengan **errorElement**.

### Fitur yang Kita Bangun

#### Core Features (CRUD)

- ✅ **List Recipes** — loader fetch semua resep dari API
- ✅ **View Recipe Detail** — loader fetch detail resep dengan params
- ✅ **Create Recipe** — action handle form submit untuk tambah resep baru
- ✅ **Edit Recipe** — loader + action untuk update resep existing
- ✅ **Delete Recipe** — action dengan useFetcher tanpa navigasi

#### Advanced Features

- ✅ **Search & Filter** — loader dengan URL search params
- ✅ **Favorite Recipe** — toggle favorite dengan optimistic UI
- ✅ **Global Loading Bar** — useNavigation untuk loading indicator
- ✅ **Form Validation** — client-side & server-side validation
- ✅ **Error Boundary** — handle 404, 500, network error

### Yang Akan Kamu Pelajari

| Konsep                | Pelajaran di Project Ini                                        |
| --------------------- | --------------------------------------------------------------- |
| **loader**            | Fetch data sebelum render — no more useEffect di component      |
| **action**            | Handle form submit & mutations — POST, PUT, DELETE              |
| **useLoaderData**     | Akses data yang di-return loader dengan type-safe               |
| **useActionData**     | Akses hasil action (validation errors, success message)         |
| **Form component**    | Pengganti `<form>` HTML yang trigger action otomatis            |
| **redirect**          | Navigasi setelah action success (e.g., redirect ke list)        |
| **useNavigation**     | Global loading state — tau kapan app sedang fetch/submit        |
| **useFetcher**        | Submit form tanpa navigasi — good for delete, toggle, etc.      |
| **errorElement**      | Centralized error handling — no manual try-catch di component   |
| **URL Search Params** | Filter/search dengan query string — shareable & bookmarkable    |
| **Optimistic UI**     | Update UI sebelum server response untuk UX yang lebih responsif |

---

## 2. Struktur Folder Project

```
recipe-book/
├── public/
├── src/
│   ├── api/
│   │   └── recipeApi.ts           # Mock API service (simulasi backend)
│   ├── components/
│   │   ├── RecipeCard.tsx          # Card untuk list item
│   │   ├── RecipeForm.tsx          # Reusable form untuk create/edit
│   │   ├── SearchBar.tsx           # Search input dengan debounce
│   │   ├── CategoryFilter.tsx      # Filter by category
│   │   ├── LoadingBar.tsx          # Global loading indicator
│   │   └── FavoriteButton.tsx      # Toggle favorite dengan useFetcher
│   ├── layouts/
│   │   ├── RootLayout.tsx          # Layout dengan navbar + Outlet
│   │   └── ErrorBoundary.tsx       # Error page untuk semua routes
│   ├── pages/
│   │   ├── HomePage.tsx            # Landing page sederhana
│   │   ├── RecipeListPage.tsx      # List + loader + search params
│   │   ├── RecipeDetailPage.tsx    # Detail + loader dengan params
│   │   ├── CreateRecipePage.tsx    # Form + action untuk POST
│   │   └── EditRecipePage.tsx      # Form + loader + action untuk PUT
│   ├── types/
│   │   └── recipe.ts               # Type definitions
│   ├── utils/
│   │   └── validators.ts           # Form validation functions
│   ├── router.tsx                  # Route config dengan createBrowserRouter
│   ├── App.tsx                     # Hanya return RouterProvider
│   └── main.tsx                    # Entry point
├── package.json
└── tsconfig.json
```

**Kenapa Struktur Ini?**

- **`api/`** — Simulasi backend dengan localStorage. Di production, ganti dengan axios/fetch ke real API.
- **`components/`** — Reusable UI components.
- **`layouts/`** — Wrapper untuk shared layout (navbar, footer, dll).
- **`pages/`** — Route-specific components yang export loader/action.
- **`types/`** — TypeScript types untuk Recipe, FormData, etc.
- **`utils/`** — Helper functions untuk validation.
- **`router.tsx`** — Centralized route config — mudah dibaca & maintain.

---

## 3. Setup Project & Dependencies

### 3.1 Inisialisasi Project

```bash
npm create vite@latest recipe-book -- --template react-ts
cd recipe-book
npm install
```

### 3.2 Install React Router v6.4+

```bash
npm install react-router-dom
```

Pastikan version minimal **6.4.0** (cek di `package.json`). Versi ini yang support loader/action.

### 3.3 Jalankan Dev Server

```bash
npm run dev
```

Buka browser di `http://localhost:5173`

---

## 4. Typing: Interface & Types

### 4.1 Type Definitions

```tsx
// src/types/recipe.ts

export type RecipeCategory =
  | "Breakfast"
  | "Lunch"
  | "Dinner"
  | "Dessert"
  | "Snack"
  | "Drink";

export interface Recipe {
  id: string;
  title: string;
  description: string;
  category: RecipeCategory;
  cookingTime: number; // dalam menit
  servings: number;
  ingredients: string[]; // Array of ingredient strings
  instructions: string[]; // Array of step strings
  imageUrl: string;
  isFavorite: boolean;
  createdAt: string; // ISO date string
  updatedAt: string;
}

export interface RecipeFormData {
  title: string;
  description: string;
  category: RecipeCategory;
  cookingTime: number;
  servings: number;
  ingredients: string; // Textarea input — split by newline
  instructions: string; // Textarea input — split by newline
  imageUrl: string;
}

export interface RecipeApiResponse {
  success: boolean;
  data?: Recipe | Recipe[];
  error?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ActionData {
  success?: boolean;
  errors?: ValidationError[];
  message?: string;
}
```

**Kenapa Terpisah?**

- `Recipe` — shape data yang kita store dan display
- `RecipeFormData` — shape data dari form input (sebelum di-transform)
- `ActionData` — response dari action (bisa success atau validation errors)
- `ValidationError` — untuk display error per field

---

## 5. Mock API Service

Di real app, kamu akan fetch ke backend API. Di project ini, kita simulasi dengan **localStorage** + async function untuk mimic network delay.

### 5.1 Storage Helper

```tsx
// src/api/recipeApi.ts
import type { Recipe, RecipeFormData } from "../types/recipe";

const STORAGE_KEY = "recipes";
const DELAY_MS = 300; // Simulasi network delay

// Helper: delay untuk simulasi async
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: ambil semua recipes dari localStorage
function getRecipesFromStorage(): Recipe[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Helper: simpan recipes ke localStorage
function saveRecipesToStorage(recipes: Recipe[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

// Helper: generate unique ID
function generateId(): string {
  return `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: seed data awal (kalau localStorage masih kosong)
function seedInitialData(): void {
  const existing = getRecipesFromStorage();
  if (existing.length > 0) return;

  const initialRecipes: Recipe[] = [
    {
      id: "1",
      title: "Nasi Goreng Special",
      description:
        "Nasi goreng dengan bumbu rahasia dan topping telur mata sapi",
      category: "Lunch",
      cookingTime: 20,
      servings: 2,
      ingredients: [
        "2 piring nasi putih",
        "2 butir telur",
        "3 siung bawang putih",
        "2 siung bawang merah",
        "2 sdm kecap manis",
        "1 sdm saus tiram",
        "Garam dan merica secukupnya",
        "Daun bawang untuk taburan",
      ],
      instructions: [
        "Cincang halus bawang putih dan bawang merah",
        "Panaskan minyak, tumis bumbu hingga harum",
        "Masukkan nasi, aduk rata",
        "Tambahkan kecap manis dan saus tiram",
        "Ceplok telur di atas nasi goreng",
        "Taburi daun bawang, sajikan hangat",
      ],
      imageUrl:
        "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "Chocolate Lava Cake",
      description: "Kue cokelat dengan isian lava cokelat meleleh di tengah",
      category: "Dessert",
      cookingTime: 45,
      servings: 4,
      ingredients: [
        "150g dark chocolate",
        "100g butter",
        "2 butir telur",
        "50g gula pasir",
        "30g tepung terigu",
        "1 sdt vanilla extract",
      ],
      instructions: [
        "Lelehkan cokelat dan butter dengan double boiler",
        "Kocok telur dan gula hingga mengembang",
        "Campurkan cokelat leleh ke adonan telur",
        "Masukkan tepung terigu, aduk perlahan",
        "Tuang ke ramekin yang sudah diolesi butter",
        "Panggang 200°C selama 12 menit",
        "Sajikan hangat dengan es krim vanilla",
      ],
      imageUrl:
        "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=800",
      isFavorite: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: "Green Smoothie Bowl",
      description: "Smoothie bowl sehat dengan topping buah segar dan granola",
      category: "Breakfast",
      cookingTime: 10,
      servings: 1,
      ingredients: [
        "1 buah pisang beku",
        "1 cup bayam segar",
        "1/2 cup mangga beku",
        "1/2 cup susu almond",
        "1 sdm chia seeds",
        "Topping: granola, blueberry, kiwi",
      ],
      instructions: [
        "Blend pisang, bayam, mangga, dan susu hingga smooth",
        "Tuang ke bowl",
        "Tata topping granola, blueberry, dan kiwi di atas",
        "Taburi chia seeds",
        "Sajikan segera",
      ],
      imageUrl:
        "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800",
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  saveRecipesToStorage(initialRecipes);
}

// Initialize seed data saat module di-import
seedInitialData();
```

### 5.2 API Functions

```tsx
// src/api/recipeApi.ts (lanjutan)

export const recipeApi = {
  // GET /recipes — dengan optional search & filter
  async getRecipes(params?: {
    search?: string;
    category?: RecipeCategory;
  }): Promise<Recipe[]> {
    await delay(DELAY_MS);
    let recipes = getRecipesFromStorage();

    // Filter by search query (case insensitive)
    if (params?.search) {
      const query = params.search.toLowerCase();
      recipes = recipes.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query),
      );
    }

    // Filter by category
    if (params?.category) {
      recipes = recipes.filter((r) => r.category === params.category);
    }

    return recipes;
  },

  // GET /recipes/:id
  async getRecipeById(id: string): Promise<Recipe> {
    await delay(DELAY_MS);
    const recipes = getRecipesFromStorage();
    const recipe = recipes.find((r) => r.id === id);

    if (!recipe) {
      throw new Response("Recipe not found", { status: 404 });
    }

    return recipe;
  },

  // POST /recipes
  async createRecipe(formData: RecipeFormData): Promise<Recipe> {
    await delay(DELAY_MS);

    const newRecipe: Recipe = {
      id: generateId(),
      title: formData.title,
      description: formData.description,
      category: formData.category,
      cookingTime: formData.cookingTime,
      servings: formData.servings,
      ingredients: formData.ingredients
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      instructions: formData.instructions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      imageUrl: formData.imageUrl,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const recipes = getRecipesFromStorage();
    recipes.unshift(newRecipe); // Tambah di awal array
    saveRecipesToStorage(recipes);

    return newRecipe;
  },

  // PUT /recipes/:id
  async updateRecipe(id: string, formData: RecipeFormData): Promise<Recipe> {
    await delay(DELAY_MS);

    const recipes = getRecipesFromStorage();
    const index = recipes.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Response("Recipe not found", { status: 404 });
    }

    const updatedRecipe: Recipe = {
      ...recipes[index],
      title: formData.title,
      description: formData.description,
      category: formData.category,
      cookingTime: formData.cookingTime,
      servings: formData.servings,
      ingredients: formData.ingredients
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      instructions: formData.instructions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      imageUrl: formData.imageUrl,
      updatedAt: new Date().toISOString(),
    };

    recipes[index] = updatedRecipe;
    saveRecipesToStorage(recipes);

    return updatedRecipe;
  },

  // DELETE /recipes/:id
  async deleteRecipe(id: string): Promise<void> {
    await delay(DELAY_MS);

    const recipes = getRecipesFromStorage();
    const filtered = recipes.filter((r) => r.id !== id);

    if (filtered.length === recipes.length) {
      throw new Response("Recipe not found", { status: 404 });
    }

    saveRecipesToStorage(filtered);
  },

  // PATCH /recipes/:id/favorite
  async toggleFavorite(id: string): Promise<Recipe> {
    await delay(DELAY_MS);

    const recipes = getRecipesFromStorage();
    const index = recipes.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Response("Recipe not found", { status: 404 });
    }

    recipes[index].isFavorite = !recipes[index].isFavorite;
    recipes[index].updatedAt = new Date().toISOString();

    saveRecipesToStorage(recipes);

    return recipes[index];
  },
};
```

**Notes:**

- Semua function `async` untuk simulasi network request
- `delay()` biar kamu bisa lihat loading state
- Error handling dengan `throw new Response()` — akan di-catch sama errorElement
- Di production, ganti localStorage dengan `fetch()` atau `axios` ke backend

---

## 6. Router Setup dengan createBrowserRouter

### 6.1 Router Configuration

```tsx
// src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import RootLayout from "./layouts/RootLayout";
import ErrorBoundary from "./layouts/ErrorBoundary";
import HomePage from "./pages/HomePage";
import RecipeListPage, { recipeListLoader } from "./pages/RecipeListPage";
import RecipeDetailPage, { recipeDetailLoader } from "./pages/RecipeDetailPage";
import CreateRecipePage, { createRecipeAction } from "./pages/CreateRecipePage";
import EditRecipePage, {
  editRecipeLoader,
  editRecipeAction,
} from "./pages/EditRecipePage";

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
        path: "recipes/:id",
        element: <RecipeDetailPage />,
        loader: recipeDetailLoader,
      },
      {
        path: "recipes/new",
        element: <CreateRecipePage />,
        action: createRecipeAction,
      },
      {
        path: "recipes/:id/edit",
        element: <EditRecipePage />,
        loader: editRecipeLoader,
        action: editRecipeAction,
      },
    ],
  },
]);
```

**Penjelasan:**

- `errorElement` di root — catch semua error dari child routes
- `loader` — fetch data sebelum render
- `action` — handle form submit
- Bisa punya `loader` + `action` di route yang sama (contoh: edit page)

### 6.2 App.tsx

```tsx
// src/App.tsx
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

export default function App() {
  return <RouterProvider router={router} />;
}
```

Super simple — hanya render `RouterProvider`.

### 6.3 main.tsx

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

---

## 7. Layouts: RootLayout & ErrorBoundary

### 7.1 RootLayout

```tsx
// src/layouts/RootLayout.tsx
import { Outlet, Link, useNavigation } from "react-router-dom";
import LoadingBar from "../components/LoadingBar";

export default function RootLayout() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Loading Bar */}
      {isLoading && <LoadingBar />}

      {/* Header / Navbar */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-orange-600">
              🍳 Recipe Book
            </Link>
            <div className="flex gap-6">
              <Link
                to="/recipes"
                className="text-gray-700 hover:text-orange-600 transition"
              >
                Browse Recipes
              </Link>
              <Link
                to="/recipes/new"
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
              >
                + Add Recipe
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-600">
          <p>© 2026 Recipe Book. Built with React Router v6.4+</p>
        </div>
      </footer>
    </div>
  );
}
```

**Key Points:**

- `<Outlet />` — tempat child routes di-render
- `useNavigation()` — detect loading state global
- `<LoadingBar />` muncul saat navigasi/fetching

### 7.2 ErrorBoundary

```tsx
// src/layouts/ErrorBoundary.tsx
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

export default function ErrorBoundary() {
  const error = useRouteError();

  // Handle Response errors (404, 500, dll)
  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-orange-600 mb-4">
            {error.status}
          </h1>
          <p className="text-2xl font-semibold text-gray-800 mb-2">
            {error.status === 404
              ? "Recipe Not Found"
              : "Oops! Something went wrong"}
          </p>
          <p className="text-gray-600 mb-8">{error.statusText || error.data}</p>
          <Link
            to="/recipes"
            className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition"
          >
            Browse All Recipes
          </Link>
        </div>
      </div>
    );
  }

  // Handle unexpected errors
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-2xl font-semibold text-gray-800 mb-2">
          Unexpected Error Occurred
        </p>
        <p className="text-gray-600 mb-8">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <Link
          to="/"
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
```

**Key Points:**

- `useRouteError()` — ambil error yang di-throw dari loader/action
- `isRouteErrorResponse()` — check apakah error dari `throw new Response()`
- UI berbeda untuk 404 vs error unexpected

---

## 8. Page: RecipeListPage dengan Loader

### 8.1 Loader Function

```tsx
// src/pages/RecipeListPage.tsx
import { useLoaderData, Link, useSearchParams, Form } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import type { Recipe } from "../types/recipe";
import { recipeApi } from "../api/recipeApi";
import RecipeCard from "../components/RecipeCard";
import SearchBar from "../components/SearchBar";
import CategoryFilter from "../components/CategoryFilter";

// Loader: fetch recipes dengan search & filter
export async function recipeListLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || undefined;
  const category = url.searchParams.get("category") || undefined;

  const recipes = await recipeApi.getRecipes({
    search,
    category: category as any,
  });

  return { recipes, search, category };
}

export default function RecipeListPage() {
  const { recipes, search, category } = useLoaderData() as {
    recipes: Recipe[];
    search?: string;
    category?: string;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {search || category ? "Search Results" : "All Recipes"}
        </h1>
        <Link
          to="/recipes/new"
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
        >
          + Add New Recipe
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <div className="grid md:grid-cols-2 gap-4">
          <SearchBar defaultValue={search} />
          <CategoryFilter defaultValue={category} />
        </div>
      </div>

      {/* Results Count */}
      <p className="text-gray-600 mb-4">
        Showing {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
      </p>

      {/* Recipe Grid */}
      {recipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No recipes found</p>
          <Link
            to="/recipes"
            className="text-orange-600 hover:underline mt-2 inline-block"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Key Points:**

- `request.url` dari loader berisi URL lengkap dengan search params
- `URLSearchParams` untuk parsing query string
- `useLoaderData()` — data sudah ready, no loading state needed di component
- Kalau search/filter berubah, loader otomatis re-run

### 8.2 RecipeCard Component

```tsx
// src/components/RecipeCard.tsx
import { Link } from "react-router-dom";
import type { Recipe } from "../types/recipe";
import FavoriteButton from "./FavoriteButton";

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
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
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {recipe.title}
          </h3>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full whitespace-nowrap ml-2">
            {recipe.category}
          </span>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {recipe.description}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>⏱️ {recipe.cookingTime} min</span>
          <span>🍽️ {recipe.servings} servings</span>
        </div>

        <Link
          to={`/recipes/${recipe.id}`}
          className="block text-center bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
        >
          View Recipe
        </Link>
      </div>
    </div>
  );
}
```

### 8.3 SearchBar Component

```tsx
// src/components/SearchBar.tsx
import { Form, useSubmit } from "react-router-dom";
import { useEffect, useRef } from "react";

interface SearchBarProps {
  defaultValue?: string;
}

export default function SearchBar({ defaultValue }: SearchBarProps) {
  const submit = useSubmit();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search — submit form setelah 300ms user berhenti ngetik
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = () => {
      const timeoutId = setTimeout(() => {
        submit(input.form);
      }, 300);

      return () => clearTimeout(timeoutId);
    };

    input.addEventListener("input", handleInput);
    return () => input.removeEventListener("input", handleInput);
  }, [submit]);

  return (
    <Form method="get" className="flex-1">
      <label
        htmlFor="search"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Search recipes
      </label>
      <input
        ref={inputRef}
        type="search"
        name="search"
        id="search"
        defaultValue={defaultValue}
        placeholder="Search by title or description..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
    </Form>
  );
}
```

**Key Points:**

- `<Form method="get">` — submit form ke URL dengan search params
- `useSubmit()` — programmatically submit form
- Debounce untuk avoid spam request saat user ngetik

### 8.4 CategoryFilter Component

```tsx
// src/components/CategoryFilter.tsx
import { Form } from "react-router-dom";
import type { RecipeCategory } from "../types/recipe";

const categories: RecipeCategory[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Dessert",
  "Snack",
  "Drink",
];

interface CategoryFilterProps {
  defaultValue?: string;
}

export default function CategoryFilter({ defaultValue }: CategoryFilterProps) {
  return (
    <Form method="get">
      <label
        htmlFor="category"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Filter by category
      </label>
      <select
        name="category"
        id="category"
        defaultValue={defaultValue || ""}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
    </Form>
  );
}
```

**Key Points:**

- `onChange` — submit form saat user pilih category
- `defaultValue` — preserve selected value after reload

---

## 9. Page: RecipeDetailPage dengan Loader

### 9.1 Loader Function

```tsx
// src/pages/RecipeDetailPage.tsx
import { useLoaderData, Link, useNavigate } from "react-router-dom";
import type { LoaderFunctionArgs } from "react-router-dom";
import type { Recipe } from "../types/recipe";
import { recipeApi } from "../api/recipeApi";
import FavoriteButton from "../components/FavoriteButton";

// Loader: fetch detail recipe by ID
export async function recipeDetailLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Recipe ID is required", { status: 400 });

  const recipe = await recipeApi.getRecipeById(id);
  return recipe;
}

export default function RecipeDetailPage() {
  const recipe = useLoaderData() as Recipe;
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="text-gray-600 hover:text-gray-900 mb-6 flex items-center gap-2"
      >
        ← Back
      </button>

      {/* Recipe Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="relative h-96 bg-gray-200">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4">
            <FavoriteButton
              recipeId={recipe.id}
              isFavorite={recipe.isFavorite}
            />
          </div>
        </div>

        <div className="p-8">
          {/* Title & Category */}
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-bold text-gray-900">{recipe.title}</h1>
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
              {recipe.category}
            </span>
          </div>

          <p className="text-gray-600 text-lg mb-6">{recipe.description}</p>

          {/* Meta Info */}
          <div className="flex gap-6 mb-8 text-gray-700">
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
                <p className="font-semibold">{recipe.servings} people</p>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Ingredients
            </h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-orange-600 mt-1">•</span>
                  <span className="text-gray-700">{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Instructions
            </h2>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <p className="text-gray-700 pt-1">{instruction}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t">
            <Link
              to={`/recipes/${recipe.id}/edit`}
              className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 text-center font-medium transition"
            >
              Edit Recipe
            </Link>
            <Link
              to="/recipes"
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 text-center font-medium transition"
            >
              Browse More Recipes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Key Points:**

- `params.id` dari URL path
- Kalau recipe tidak ditemukan, loader throw 404 → caught by errorElement
- Data sudah ready saat component render — no loading spinner needed
- `navigate(-1)` — kembali ke halaman sebelumnya

---

## 10. Page: CreateRecipePage dengan Action

### 10.1 Validation Helper

```tsx
// src/utils/validators.ts
import type { RecipeFormData, ValidationError } from "../types/recipe";

export function validateRecipeForm(
  formData: RecipeFormData,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Title validation
  if (!formData.title.trim()) {
    errors.push({ field: "title", message: "Title is required" });
  } else if (formData.title.trim().length < 3) {
    errors.push({
      field: "title",
      message: "Title must be at least 3 characters",
    });
  }

  // Description validation
  if (!formData.description.trim()) {
    errors.push({ field: "description", message: "Description is required" });
  }

  // Category validation
  if (!formData.category) {
    errors.push({ field: "category", message: "Category is required" });
  }

  // Cooking time validation
  if (formData.cookingTime <= 0) {
    errors.push({
      field: "cookingTime",
      message: "Cooking time must be positive",
    });
  }

  // Servings validation
  if (formData.servings <= 0) {
    errors.push({ field: "servings", message: "Servings must be positive" });
  }

  // Ingredients validation
  const ingredientsList = formData.ingredients
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (ingredientsList.length === 0) {
    errors.push({
      field: "ingredients",
      message: "At least one ingredient is required",
    });
  }

  // Instructions validation
  const instructionsList = formData.instructions
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (instructionsList.length === 0) {
    errors.push({
      field: "instructions",
      message: "At least one instruction is required",
    });
  }

  // Image URL validation (optional but must be valid URL if provided)
  if (formData.imageUrl && !isValidUrl(formData.imageUrl)) {
    errors.push({ field: "imageUrl", message: "Must be a valid URL" });
  }

  return errors;
}

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}
```

### 10.2 Action Function

```tsx
// src/pages/CreateRecipePage.tsx
import { Form, useActionData, useNavigation, redirect } from "react-router-dom";
import type { ActionFunctionArgs } from "react-router-dom";
import type { RecipeFormData, ActionData } from "../types/recipe";
import { recipeApi } from "../api/recipeApi";
import { validateRecipeForm } from "../utils/validators";
import RecipeForm from "../components/RecipeForm";

// Action: handle form submit
export async function createRecipeAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  const recipeData: RecipeFormData = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    category: formData.get("category") as any,
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

  // Create recipe
  try {
    const newRecipe = await recipeApi.createRecipe(recipeData);
    return redirect(`/recipes/${newRecipe.id}`);
  } catch (error) {
    return {
      success: false,
      errors: [{ field: "general", message: "Failed to create recipe" }],
    } as ActionData;
  }
}

export default function CreateRecipePage() {
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Add New Recipe</h1>

      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* General Error */}
        {actionData?.errors?.find((e) => e.field === "general") && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {actionData.errors.find((e) => e.field === "general")?.message}
          </div>
        )}

        <RecipeForm actionData={actionData} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
```

**Key Points:**

- `request.formData()` — ambil data dari form
- `validateRecipeForm()` — client-side validation
- Kalau ada error, return `ActionData` dengan errors
- Kalau success, `redirect()` ke detail page
- `useActionData()` — akses result dari action
- `useNavigation()` — detect submitting state untuk disable button

### 10.3 RecipeForm Component (Reusable)

```tsx
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
  const getError = (field: string) =>
    actionData?.errors?.find((e) => e.field === field)?.message;

  return (
    <Form method="post" className="space-y-6">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Recipe Title *
        </label>
        <input
          type="text"
          name="title"
          id="title"
          required
          defaultValue={recipe?.title}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
            getError("title") ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="e.g., Chocolate Chip Cookies"
        />
        {getError("title") && (
          <p className="text-red-600 text-sm mt-1">{getError("title")}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Description *
        </label>
        <textarea
          name="description"
          id="description"
          required
          rows={3}
          defaultValue={recipe?.description}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
            getError("description") ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Brief description of your recipe..."
        />
        {getError("description") && (
          <p className="text-red-600 text-sm mt-1">{getError("description")}</p>
        )}
      </div>

      {/* Category, Cooking Time, Servings */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Category *
          </label>
          <select
            name="category"
            id="category"
            required
            defaultValue={recipe?.category}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
              getError("category") ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {getError("category") && (
            <p className="text-red-600 text-sm mt-1">{getError("category")}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="cookingTime"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Cooking Time (min) *
          </label>
          <input
            type="number"
            name="cookingTime"
            id="cookingTime"
            required
            min="1"
            defaultValue={recipe?.cookingTime}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
              getError("cookingTime") ? "border-red-500" : "border-gray-300"
            }`}
          />
          {getError("cookingTime") && (
            <p className="text-red-600 text-sm mt-1">
              {getError("cookingTime")}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="servings"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Servings *
          </label>
          <input
            type="number"
            name="servings"
            id="servings"
            required
            min="1"
            defaultValue={recipe?.servings}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
              getError("servings") ? "border-red-500" : "border-gray-300"
            }`}
          />
          {getError("servings") && (
            <p className="text-red-600 text-sm mt-1">{getError("servings")}</p>
          )}
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <label
          htmlFor="ingredients"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Ingredients *{" "}
          <span className="text-gray-500 text-xs">(one per line)</span>
        </label>
        <textarea
          name="ingredients"
          id="ingredients"
          required
          rows={6}
          defaultValue={recipe?.ingredients.join("\n")}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm ${
            getError("ingredients") ? "border-red-500" : "border-gray-300"
          }`}
          placeholder={`2 cups flour\n1 cup sugar\n3 eggs\n1 tsp vanilla extract`}
        />
        {getError("ingredients") && (
          <p className="text-red-600 text-sm mt-1">{getError("ingredients")}</p>
        )}
      </div>

      {/* Instructions */}
      <div>
        <label
          htmlFor="instructions"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Instructions *{" "}
          <span className="text-gray-500 text-xs">(one step per line)</span>
        </label>
        <textarea
          name="instructions"
          id="instructions"
          required
          rows={8}
          defaultValue={recipe?.instructions.join("\n")}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm ${
            getError("instructions") ? "border-red-500" : "border-gray-300"
          }`}
          placeholder={`Preheat oven to 350°F\nMix flour and sugar\nAdd eggs one at a time\nBake for 25 minutes`}
        />
        {getError("instructions") && (
          <p className="text-red-600 text-sm mt-1">
            {getError("instructions")}
          </p>
        )}
      </div>

      {/* Image URL */}
      <div>
        <label
          htmlFor="imageUrl"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Image URL
        </label>
        <input
          type="url"
          name="imageUrl"
          id="imageUrl"
          defaultValue={recipe?.imageUrl}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 ${
            getError("imageUrl") ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="https://example.com/image.jpg"
        />
        {getError("imageUrl") && (
          <p className="text-red-600 text-sm mt-1">{getError("imageUrl")}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition"
        >
          {isSubmitting
            ? "Saving..."
            : recipe
              ? "Update Recipe"
              : "Create Recipe"}
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
        >
          Cancel
        </button>
      </div>
    </Form>
  );
}
```

**Key Points:**

- Reusable untuk create & edit (terima `recipe` prop untuk prefill)
- `<Form method="post">` — trigger action saat submit
- Error handling per field dengan conditional styling
- Disable button saat `isSubmitting`

---

## 11. Page: EditRecipePage dengan Loader + Action

```tsx
// src/pages/EditRecipePage.tsx
import {
  Form,
  useLoaderData,
  useActionData,
  useNavigation,
  redirect,
} from "react-router-dom";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router-dom";
import type { Recipe, RecipeFormData, ActionData } from "../types/recipe";
import { recipeApi } from "../api/recipeApi";
import { validateRecipeForm } from "../utils/validators";
import RecipeForm from "../components/RecipeForm";

// Loader: fetch existing recipe data
export async function editRecipeLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Recipe ID is required", { status: 400 });

  const recipe = await recipeApi.getRecipeById(id);
  return recipe;
}

// Action: handle update
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
    category: formData.get("category") as any,
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
  } catch (error) {
    return {
      success: false,
      errors: [{ field: "general", message: "Failed to update recipe" }],
    } as ActionData;
  }
}

export default function EditRecipePage() {
  const recipe = useLoaderData() as Recipe;
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Recipe</h1>

      <div className="bg-white rounded-lg shadow-lg p-8">
        {actionData?.errors?.find((e) => e.field === "general") && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {actionData.errors.find((e) => e.field === "general")?.message}
          </div>
        )}

        <RecipeForm
          recipe={recipe}
          actionData={actionData}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
```

**Key Points:**

- **Loader** fetch data existing → prefill form
- **Action** handle update → redirect ke detail
- Reuse `RecipeForm` component dengan prop `recipe`

---

## 12. Delete Recipe dengan useFetcher

Delete action tidak perlu navigasi — user tetap di halaman list. Untuk ini, kita pakai **useFetcher**.

### 12.1 Delete Action di Router

```tsx
// src/router.tsx (tambahkan route ini)
import { deleteRecipeAction } from "./pages/actions/deleteRecipeAction";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      // ... routes lain
      {
        path: "recipes/:id/delete",
        action: deleteRecipeAction,
      },
    ],
  },
]);
```

### 12.2 Delete Action Function

```tsx
// src/pages/actions/deleteRecipeAction.ts
import type { ActionFunctionArgs } from "react-router-dom";
import { redirect } from "react-router-dom";
import { recipeApi } from "../../api/recipeApi";

export async function deleteRecipeAction({ params }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Recipe ID is required", { status: 400 });

  await recipeApi.deleteRecipe(id);

  // Redirect ke list page
  return redirect("/recipes");
}
```

### 12.3 DeleteButton Component dengan useFetcher

```tsx
// src/components/DeleteButton.tsx
import { useFetcher } from "react-router-dom";
import { useState } from "react";

interface DeleteButtonProps {
  recipeId: string;
  recipeName: string;
}

export default function DeleteButton({
  recipeId,
  recipeName,
}: DeleteButtonProps) {
  const fetcher = useFetcher();
  const [showConfirm, setShowConfirm] = useState(false);

  const isDeleting = fetcher.state === "submitting";

  const handleDelete = () => {
    fetcher.submit(null, {
      method: "post",
      action: `/recipes/${recipeId}/delete`,
    });
  };

  if (showConfirm) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <p className="text-red-800 mb-4">
          Are you sure you want to delete <strong>{recipeName}</strong>?
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            {isDeleting ? "Deleting..." : "Yes, Delete"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
    >
      Delete Recipe
    </button>
  );
}
```

**Key Points:**

- `useFetcher()` — submit form tanpa navigasi
- `fetcher.submit()` — trigger action
- `fetcher.state` — detect loading state
- Confirmation dialog sebelum delete

### 12.4 Tambahkan DeleteButton di Detail Page

```tsx
// src/pages/RecipeDetailPage.tsx (update bagian actions)
import DeleteButton from "../components/DeleteButton";

// ... di bagian actions
<div className="flex gap-4 pt-6 border-t">
  <Link
    to={`/recipes/${recipe.id}/edit`}
    className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 text-center font-medium transition"
  >
    Edit Recipe
  </Link>
  <DeleteButton recipeId={recipe.id} recipeName={recipe.title} />
</div>;
```

---

## 13. Search & Filter dengan URL Search Params

Sudah kita implement di **RecipeListPage**, tapi mari review kenapa ini penting:

### 13.1 Kenapa Pakai URL Search Params?

```
❌ State biasa:
/recipes → filter tersimpan di useState
User refresh → filter hilang
User share link → orang lain tidak dapat filter yang sama

✅ URL search params:
/recipes?search=chocolate&category=Dessert
User refresh → filter tetap ada
User share link → orang lain dapat hasil yang sama
User bisa bookmark filtered results
```

### 13.2 Cara Kerja

```tsx
// Loader baca dari URL
export async function recipeListLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const category = url.searchParams.get("category");

  // Fetch dengan params
  const recipes = await recipeApi.getRecipes({ search, category });
  return { recipes, search, category };
}

// Form submit update URL
<Form method="get">
  <input name="search" />
  {/* Submit → URL jadi /recipes?search=value */}
</Form>;
```

**Benefits:**

- Shareable URLs
- Browser back/forward works
- Bookmarkable results
- No need `useState` for filters

---

## 14. Favorite Recipe dengan Optimistic UI

Toggle favorite seharusnya instant — user tidak perlu nunggu server response.

### 14.1 Favorite Action di Router

```tsx
// src/router.tsx
import { toggleFavoriteAction } from "./pages/actions/toggleFavoriteAction";

{
  path: "recipes/:id/favorite",
  action: toggleFavoriteAction,
}
```

### 14.2 Favorite Action Function

```tsx
// src/pages/actions/toggleFavoriteAction.ts
import type { ActionFunctionArgs } from "react-router-dom";
import { recipeApi } from "../../api/recipeApi";

export async function toggleFavoriteAction({ params }: ActionFunctionArgs) {
  const { id } = params;
  if (!id) throw new Response("Recipe ID is required", { status: 400 });

  const updatedRecipe = await recipeApi.toggleFavorite(id);
  return updatedRecipe;
}
```

### 14.3 FavoriteButton Component

```tsx
// src/components/FavoriteButton.tsx
import { useFetcher } from "react-router-dom";
import { useEffect, useState } from "react";

interface FavoriteButtonProps {
  recipeId: string;
  isFavorite: boolean;
}

export default function FavoriteButton({
  recipeId,
  isFavorite,
}: FavoriteButtonProps) {
  const fetcher = useFetcher();
  const [optimisticFavorite, setOptimisticFavorite] = useState(isFavorite);

  // Sync dengan server response
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setOptimisticFavorite(fetcher.data.isFavorite);
    }
  }, [fetcher.state, fetcher.data]);

  const handleToggle = () => {
    // Optimistic update — langsung update UI
    setOptimisticFavorite(!optimisticFavorite);

    // Submit ke server
    fetcher.submit(null, {
      method: "post",
      action: `/recipes/${recipeId}/favorite`,
    });
  };

  return (
    <button
      onClick={handleToggle}
      className="bg-white p-2 rounded-full shadow-md hover:shadow-lg transition"
      aria-label={optimisticFavorite ? "Unfavorite" : "Favorite"}
    >
      {optimisticFavorite ? (
        <span className="text-2xl">❤️</span>
      ) : (
        <span className="text-2xl">🤍</span>
      )}
    </button>
  );
}
```

**Key Points:**

- **Optimistic UI** — update UI dulu, baru kirim request
- Kalau server error, bisa rollback dengan `useEffect`
- UX feels instant

---

## 15. Global Loading State dengan useNavigation

### 15.1 LoadingBar Component

```tsx
// src/components/LoadingBar.tsx
export default function LoadingBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-orange-600 animate-progress"></div>
    </div>
  );
}
```

### 15.2 CSS Animation

```css
/* src/index.css */
@keyframes progress {
  0% {
    width: 0%;
  }
  50% {
    width: 70%;
  }
  100% {
    width: 100%;
  }
}

.animate-progress {
  animation: progress 1s ease-in-out infinite;
}
```

### 15.3 Tampilkan di RootLayout

Sudah kita implement di section 7.1:

```tsx
const navigation = useNavigation();
const isLoading = navigation.state === "loading";

{
  isLoading && <LoadingBar />;
}
```

**Hasil:**

- Loading bar muncul saat navigasi antar page
- Loading bar muncul saat loader sedang fetch data
- User tau app sedang proses something

---

## 16. Form Validation & Error Handling

### 16.1 Client-Side Validation

Pakai HTML5 validation attributes:

```tsx
<input
  type="text"
  name="title"
  required
  minLength={3}
  maxLength={100}
/>

<input
  type="number"
  name="cookingTime"
  required
  min={1}
  max={1440}
/>
```

Browser akan validate sebelum submit.

### 16.2 Server-Side Validation

Di action function:

```tsx
export async function createRecipeAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const recipeData = extractFormData(formData);

  // Validate
  const errors = validateRecipeForm(recipeData);
  if (errors.length > 0) {
    // Return errors — tidak redirect
    return { success: false, errors } as ActionData;
  }

  // Process if valid
  const newRecipe = await recipeApi.createRecipe(recipeData);
  return redirect(`/recipes/${newRecipe.id}`);
}
```

### 16.3 Display Errors di Component

```tsx
const actionData = useActionData() as ActionData | undefined;

{
  actionData?.errors?.find((e) => e.field === "title") && (
    <p className="text-red-600 text-sm">
      {actionData.errors.find((e) => e.field === "title")?.message}
    </p>
  );
}
```

**Best Practice:**

- Client-side validation untuk UX (instant feedback)
- Server-side validation untuk security (user bisa disable JS)
- Return errors dari action, display dengan `useActionData()`

---

## 17. Checklist Akhir & Ide Pengembangan

### 17.1 Checklist: Fitur yang Sudah Kita Bangun

- ✅ **List Recipes** dengan loader
- ✅ **View Recipe Detail** dengan loader + params
- ✅ **Create Recipe** dengan action + validation
- ✅ **Edit Recipe** dengan loader + action
- ✅ **Delete Recipe** dengan useFetcher + confirmation
- ✅ **Search & Filter** dengan URL search params
- ✅ **Toggle Favorite** dengan optimistic UI
- ✅ **Global Loading Bar** dengan useNavigation
- ✅ **Error Boundary** dengan errorElement
- ✅ **Form Validation** client-side + server-side
- ✅ **Centralized Route Config** dengan createBrowserRouter
- ✅ **Type-Safe** dengan TypeScript

### 17.2 Test yang Harus Kamu Lakukan

1. **Create Recipe**
   - Coba submit form kosong → harus muncul validation errors
   - Isi semua field → harus redirect ke detail page
   - Cek localStorage — recipe harus tersimpan

2. **Edit Recipe**
   - Buka edit page → form harus prefilled dengan data existing
   - Update beberapa field → submit → harus redirect ke detail dengan data baru

3. **Delete Recipe**
   - Klik delete → harus muncul confirmation
   - Cancel → recipe tetap ada
   - Confirm → recipe hilang dari list

4. **Search & Filter**
   - Search "chocolate" → harus tampil recipe yang mengandung "chocolate"
   - Filter by category → harus tampil recipe kategori tersebut
   - Refresh page → filter harus tetap apply

5. **Favorite**
   - Klik favorite button → icon harus instantly berubah
   - Refresh page → favorite status harus persist

6. **Error Handling**
   - Hapus localStorage → refresh → harus muncul seed data
   - Edit URL jadi `/recipes/999` → harus tampil 404 error page
   - Disconnect internet (simulate) → harus tampil error message

### 17.3 Ide Pengembangan Lanjutan

#### Level 2: Intermediate

- **Rating System** — user bisa kasih rating 1-5 stars
- **Comments/Reviews** — user bisa tulis review di detail page
- **Tags** — tambah tags seperti "vegan", "gluten-free", "quick"
- **Sort Options** — sort by title, cooking time, date created
- **Duplicate Recipe** — clone existing recipe untuk edit

#### Level 3: Advanced

- **User Authentication** — login/register dengan NextAuth atau Firebase
- **Multiple Users** — recipe punya author, user cuma bisa edit/delete milik sendiri
- **Image Upload** — upload image ke Cloudinary atau Supabase Storage
- **Real Backend** — ganti localStorage dengan REST API atau GraphQL
- **Share Recipe** — generate shareable link atau export PDF
- **Print View** — special layout untuk print recipe
- **Meal Planner** — plan recipes untuk seminggu

#### Level 4: Production Ready

- **Unit Tests** — test loader/action dengan Vitest
- **E2E Tests** — test user flow dengan Playwright
- **Skeleton Loading** — replace loading bar dengan skeleton UI
- **Infinite Scroll** — load more recipes saat scroll ke bawah
- **PWA** — install app, offline support dengan service worker
- **Analytics** — track popular recipes, search queries
- **SEO** — meta tags, Open Graph untuk sharing
- **Deployment** — deploy ke Vercel/Netlify dengan CI/CD

### 17.4 Perbandingan dengan Cara Lama

| Aspek                 | Cara Lama (useEffect)       | Cara Baru (Loader/Action)          |
| --------------------- | --------------------------- | ---------------------------------- |
| **Data fetching**     | useEffect di component      | loader di route config             |
| **Loading state**     | useState per component      | useNavigation global               |
| **Error handling**    | try-catch manual            | errorElement di route              |
| **Form submit**       | onSubmit + fetch manual     | action + Form component            |
| **Validation errors** | useState                    | useActionData                      |
| **Race condition**    | Butuh cleanup manual        | Handled otomatis                   |
| **Code location**     | Logic tersebar di component | Centralized di route/action        |
| **Type safety**       | Manual typing               | Inferred dari loader/action return |

---

## Penutup

Selamat! 🎉 Kamu sudah berhasil membangun **Recipe Book App** yang mengimplementasikan full React Router v6.4+ Data API.

**Apa yang Sudah Kamu Kuasai:**

1. **createBrowserRouter** — route config yang lebih powerful
2. **loader** — fetch data sebelum render, no more useEffect di component
3. **action** — handle mutations (create, update, delete)
4. **useLoaderData** — akses data dengan type-safe
5. **useActionData** — handle validation errors & success messages
6. **Form component** — pengganti `<form>` yang auto-integrate dengan action
7. **useFetcher** — submit form tanpa navigasi (delete, toggle, dll)
8. **useNavigation** — global loading state
9. **errorElement** — centralized error handling
10. **URL Search Params** — shareable & bookmarkable filters

**Next Steps:**

- Kerjakan ide pengembangan di section 17.3
- Baca doc berikutnya tentang **state management** untuk scale app yang lebih besar
- Coba migrate salah satu project lama kamu dari `useEffect` ke `loader/action`

**Resources:**

- [React Router Docs: Data APIs](https://reactrouter.com/en/main/routers/picking-a-router)
- [React Router Tutorial](https://reactrouter.com/en/main/start/tutorial)
- [Remix Philosophy](https://remix.run/docs/en/main/pages/philosophy) — React Router Data API inspired by Remix

Happy coding! 🚀
