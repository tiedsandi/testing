// src/utils/validators.ts
import type { RecipeFormData, ValidationError } from "../types/recipe";

export function validateRecipeForm(
  formData: RecipeFormData,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate title
  if (!formData.title || formData.title.trim().length === 0) {
    errors.push({ field: "title", message: "Title is required" });
  } else if (formData.title.trim().length < 3) {
    errors.push({
      field: "title",
      message: "Title must be at least 3 characters",
    });
  } else if (formData.title.trim().length > 100) {
    errors.push({
      field: "title",
      message: "Title must be less than 100 characters",
    });
  }

  // Validate description
  if (!formData.description || formData.description.trim().length === 0) {
    errors.push({ field: "description", message: "Description is required" });
  } else if (formData.description.trim().length < 10) {
    errors.push({
      field: "description",
      message: "Description must be at least 10 characters",
    });
  }

  // Validate category
  const validCategories = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Dessert",
    "Snack",
    "Drink",
  ];
  if (!formData.category || !validCategories.includes(formData.category)) {
    errors.push({ field: "category", message: "Please select a category" });
  }

  // Validate cooking time
  const cookingTime = Number(formData.cookingTime);
  if (isNaN(cookingTime) || cookingTime <= 0) {
    errors.push({
      field: "cookingTime",
      message: "Cooking time must be a positive number",
    });
  } else if (cookingTime > 1440) {
    errors.push({
      field: "cookingTime",
      message: "Cooking time cannot exceed 24 hours (1440 minutes)",
    });
  }

  // Validate servings
  const servings = Number(formData.servings);
  if (isNaN(servings) || servings <= 0) {
    errors.push({
      field: "servings",
      message: "Servings must be a positive number",
    });
  } else if (servings > 100) {
    errors.push({
      field: "servings",
      message: "Servings cannot exceed 100",
    });
  }

  // Validate ingredients
  if (!formData.ingredients || formData.ingredients.trim().length === 0) {
    errors.push({ field: "ingredients", message: "Ingredients are required" });
  } else {
    const ingredientList = formData.ingredients
      .split("\n")
      .filter((line) => line.trim().length > 0);
    if (ingredientList.length === 0) {
      errors.push({
        field: "ingredients",
        message: "Please add at least one ingredient",
      });
    }
  }

  // Validate instructions
  if (!formData.instructions || formData.instructions.trim().length === 0) {
    errors.push({
      field: "instructions",
      message: "Instructions are required",
    });
  } else {
    const instructionList = formData.instructions
      .split("\n")
      .filter((line) => line.trim().length > 0);
    if (instructionList.length === 0) {
      errors.push({
        field: "instructions",
        message: "Please add at least one instruction step",
      });
    }
  }

  // Validate image URL
  if (!formData.imageUrl || formData.imageUrl.trim().length === 0) {
    errors.push({ field: "imageUrl", message: "Image URL is required" });
  } else if (!isValidUrl(formData.imageUrl)) {
    errors.push({ field: "imageUrl", message: "Please enter a valid URL" });
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
