// src/api/recipeApi.ts
import type { Recipe, RecipeFormData, RecipeCategory } from "../types/recipe";

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
      id: "recipe-1",
      title: "Classic Pancakes",
      description: "Fluffy and delicious pancakes perfect for breakfast",
      category: "Breakfast",
      cookingTime: 20,
      servings: 4,
      ingredients: [
        "2 cups all-purpose flour",
        "2 tablespoons sugar",
        "2 teaspoons baking powder",
        "1 teaspoon salt",
        "2 eggs",
        "1.5 cups milk",
        "2 tablespoons melted butter",
      ],
      instructions: [
        "Mix dry ingredients in a large bowl",
        "Whisk eggs, milk, and melted butter in another bowl",
        "Pour wet ingredients into dry ingredients and mix until just combined",
        "Heat a griddle or pan over medium heat",
        "Pour 1/4 cup batter for each pancake",
        "Cook until bubbles form, then flip and cook until golden",
      ],
      imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445",
      isFavorite: false,
      createdAt: new Date("2024-01-15").toISOString(),
      updatedAt: new Date("2024-01-15").toISOString(),
    },
    {
      id: "recipe-2",
      title: "Chocolate Chip Cookies",
      description: "Crispy on the outside, chewy on the inside cookies",
      category: "Dessert",
      cookingTime: 25,
      servings: 24,
      ingredients: [
        "2.25 cups all-purpose flour",
        "1 tsp baking soda",
        "1 tsp salt",
        "1 cup butter, softened",
        "0.75 cup granulated sugar",
        "0.75 cup brown sugar",
        "2 eggs",
        "2 tsp vanilla extract",
        "2 cups chocolate chips",
      ],
      instructions: [
        "Preheat oven to 375°F (190°C)",
        "Mix flour, baking soda, and salt in a bowl",
        "Beat butter and sugars until creamy",
        "Add eggs and vanilla, beat well",
        "Gradually blend in flour mixture",
        "Stir in chocolate chips",
        "Drop rounded tablespoons onto ungreased cookie sheets",
        "Bake 9-11 minutes or until golden brown",
      ],
      imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e",
      isFavorite: true,
      createdAt: new Date("2024-01-16").toISOString(),
      updatedAt: new Date("2024-01-16").toISOString(),
    },
    {
      id: "recipe-3",
      title: "Caesar Salad",
      description: "Fresh and crispy Caesar salad with homemade dressing",
      category: "Lunch",
      cookingTime: 15,
      servings: 4,
      ingredients: [
        "1 large romaine lettuce, chopped",
        "1 cup croutons",
        "1/2 cup parmesan cheese, grated",
        "1/4 cup olive oil",
        "2 tbsp lemon juice",
        "2 cloves garlic, minced",
        "1 tsp Dijon mustard",
        "2 anchovy fillets (optional)",
        "Salt and pepper to taste",
      ],
      instructions: [
        "Wash and chop romaine lettuce",
        "Make dressing: blend olive oil, lemon juice, garlic, mustard, and anchovies",
        "Toss lettuce with dressing",
        "Top with croutons and parmesan cheese",
        "Season with salt and pepper",
        "Serve immediately",
      ],
      imageUrl: "https://images.unsplash.com/photo-1546793665-c74683f339c1",
      isFavorite: false,
      createdAt: new Date("2024-01-17").toISOString(),
      updatedAt: new Date("2024-01-17").toISOString(),
    },
    {
      id: "recipe-4",
      title: "Spaghetti Carbonara",
      description: "Creamy Italian pasta with bacon and parmesan",
      category: "Dinner",
      cookingTime: 30,
      servings: 4,
      ingredients: [
        "400g spaghetti",
        "200g pancetta or bacon, diced",
        "4 large eggs",
        "1 cup parmesan cheese, grated",
        "2 cloves garlic, minced",
        "Salt and black pepper to taste",
        "Fresh parsley for garnish",
      ],
      instructions: [
        "Cook spaghetti according to package directions",
        "Fry pancetta until crispy in a large pan",
        "Whisk eggs and parmesan in a bowl",
        "Drain pasta, reserving 1 cup pasta water",
        "Add pasta to pancetta pan, remove from heat",
        "Quickly stir in egg mixture, adding pasta water to create creamy sauce",
        "Season with salt and pepper",
        "Garnish with parsley and extra parmesan",
      ],
      imageUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3",
      isFavorite: true,
      createdAt: new Date("2024-01-18").toISOString(),
      updatedAt: new Date("2024-01-18").toISOString(),
    },
    {
      id: "recipe-5",
      title: "Iced Coffee",
      description: "Refreshing cold coffee perfect for hot days",
      category: "Drink",
      cookingTime: 5,
      servings: 2,
      ingredients: [
        "2 cups strong brewed coffee, cooled",
        "1 cup milk or cream",
        "2-4 tbsp sugar or sweetener",
        "Ice cubes",
        "Whipped cream (optional)",
      ],
      instructions: [
        "Brew coffee and let it cool completely",
        "Fill glasses with ice cubes",
        "Pour coffee over ice",
        "Add milk and sweetener to taste",
        "Stir well",
        "Top with whipped cream if desired",
      ],
      imageUrl: "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7",
      isFavorite: false,
      createdAt: new Date("2024-01-19").toISOString(),
      updatedAt: new Date("2024-01-19").toISOString(),
    },
  ];

  saveRecipesToStorage(initialRecipes);
}

// Initialize seed data saat module di-import
seedInitialData();

// API Functions
export const recipeApi = {
  // GET /recipes — dengan optional search & filter
  async getRecipes(params?: {
    search?: string;
    category?: RecipeCategory;
  }): Promise<Recipe[]> {
    await delay(DELAY_MS);

    let recipes = getRecipesFromStorage();

    // Filter by search term
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      recipes = recipes.filter(
        (recipe) =>
          recipe.title.toLowerCase().includes(searchLower) ||
          recipe.description.toLowerCase().includes(searchLower) ||
          recipe.ingredients.some((ing) =>
            ing.toLowerCase().includes(searchLower),
          ),
      );
    }

    // Filter by category
    if (params?.category) {
      recipes = recipes.filter((recipe) => recipe.category === params.category);
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

    const recipes = getRecipesFromStorage();

    const newRecipe: Recipe = {
      id: generateId(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      cookingTime: Number(formData.cookingTime),
      servings: Number(formData.servings),
      ingredients: formData.ingredients
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
      instructions: formData.instructions
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
      imageUrl: formData.imageUrl.trim(),
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    recipes.push(newRecipe);
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
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      cookingTime: Number(formData.cookingTime),
      servings: Number(formData.servings),
      ingredients: formData.ingredients
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
      instructions: formData.instructions
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
      imageUrl: formData.imageUrl.trim(),
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
    const index = recipes.findIndex((r) => r.id === id);

    if (index === -1) {
      throw new Response("Recipe not found", { status: 404 });
    }

    recipes.splice(index, 1);
    saveRecipesToStorage(recipes);
  },

  // POST /recipes/:id/favorite — toggle favorite
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
