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
