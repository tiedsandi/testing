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
      <select
        name="category"
        defaultValue={defaultValue || ""}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </Form>
  );
}
