# Recipe Book App - Setup Guide

## 🎯 Project Overview

Recipe Book App dengan React Router v7 + TypeScript + Tailwind CSS v3 Modern Stack

## 📦 Tech Stack (Versi Terbaru 2026)

- **React** 19.2.0
- **React Router** 7.13.1 (dengan Data APIs)
- **TypeScript** 5.9.3
- **Vite** 7.3.1
- **Tailwind CSS** 3.4.17
- **PostCSS** 8.4+
- **ESLint** 9.39+

## 🏗️ Modern Architecture (React Router v7 Best Practices)

```
src/
├── actions/              # Route actions (terpisah dari pages)
│   ├── createRecipeAction.ts
│   ├── editRecipeAction.ts
│   ├── deleteRecipeAction.ts
│   └── toggleFavoriteAction.ts
├── loaders/              # Route loaders (terpisah dari pages)
│   ├── recipeListLoader.ts
│   ├── recipeDetailLoader.ts
│   └── editRecipeLoader.ts
├── pages/                # UI components only
│   ├── HomePage.tsx
│   ├── RecipeListPage.tsx
│   ├── RecipeDetailPage.tsx
│   ├── CreateRecipePage.tsx
│   └── EditRecipePage.tsx
├── components/           # Reusable components
├── layouts/              # Layout wrappers
├── api/                  # API service layer
├── types/                # TypeScript definitions
├── utils/                # Helper functions
└── router.tsx            # Centralized routing config
```

## 🚀 Setup & Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## ✨ Key Features Implemented

### 1. **Separation of Concerns**
- ✅ Loaders dan actions di file terpisah (bukan di page components)
- ✅ Menghindari Fast Refresh warnings
- ✅ Lebih mudah di-test dan maintain

### 2. **Modern Tailwind Setup**
- ✅ TypeScript config (`tailwind.config.ts`)
- ✅ Minimal configuration
- ✅ PostCSS integration
- ✅ Custom animations dengan `@layer`
- ✅ Built-in `line-clamp` utilities (Tailwind 3.3+)

### 3. **Type Safety**
- ✅ No `any` types (proper type casting)
- ✅ Strict TypeScript configuration
- ✅ Type-safe loaders dan actions
- ✅ ReactElement instead of JSX namespace

### 4. **ESLint Compliance**
- ✅ No unused variables
- ✅ Proper error handling (catch blocks)
- ✅ Modern React patterns

## 🎨 Tailwind CSS v3 Modern Features

```css
/* src/index.css - Modern approach dengan @layer */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  /* Custom animations */
  @keyframes progress {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(0%); }
    100% { transform: translateX(100%); }
  }

  .animate-progress {
    animation: progress 1s ease-in-out infinite;
  }
}
```

## 📚 Learning Resources

### File Structure
- `loaders/*.ts` - Data fetching sebelum render
- `actions/*.ts` - Form submissions & mutations
- `pages/*.tsx` - Pure UI components
- `router.tsx` - Route configuration

### Example: Create Recipe Flow

1. User navigates to `/recipes/new`
2. `CreateRecipePage.tsx` renders
3. User fills form and submits
4. `createRecipeAction.ts` handles validation & API call
5. If success: redirect to detail page
6. If error: return validation errors via `useActionData()`

## 🔥 What's New in This Version

### vs Documentation (README.md)

| Aspect | README.md | This Implementation |
|--------|-----------|-------------------|
| Loaders/Actions | Di page files | Separated files |
| Tailwind Config | JS config | TypeScript config |
| Type Safety | Some `any` types | Fully type-safe |
| React Router | v6.4+ examples | v7.13.1 with best practices |
| ESLint | Basic | Strict compliance |

## 📝 Notes

- **localStorage** digunakan untuk mock API (production akan pakai real backend)
- **3 seed recipes** otomatis di-generate saat pertama kali load
- **Form validation** client-side + server-side
- **Optimistic UI** untuk favorite toggle (instant feedback)
- **URL search params** untuk shareable filters

## 🧪 Testing the App

1. **Browse Recipes**: http://localhost:5173/recipes
2. **Add New Recipe**: Click "+ Add Recipe" button
3. **Search**: Type in search box (debounced)
4. **Filter**: Select category dropdown
5. **View Details**: Click "View Recipe" on any card
6. **Edit**: Click "Edit Recipe" on detail page
7. **Delete**: Click "Delete Recipe" (with confirmation)
8. **Favorite**: Click heart icon (optimistic update)

## 🎓 Learning Path

1. **Start Here**: Explore `/recipes` page - understand loader
2. **Create Recipe**: Test form validation & action
3. **Edit Recipe**: Loader + action in single route
4. **Delete**: useFetcher without navigation
5. **Search**: URL params for shareable state
6. **Favorite**: Optimistic UI pattern

---

**Happy Coding!** 🚀

Built with ❤️ following React Router v7 + Modern React best practices
