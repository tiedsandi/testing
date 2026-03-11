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

  const handleDelete = () => {
    fetcher.submit(null, {
      method: "delete",
      action: `/recipes/${recipeId}/delete`,
    });
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-700">
          Delete "{recipeName}"? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={fetcher.state !== "idle"}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 transition-colors"
          >
            {fetcher.state !== "idle" ? "Deleting..." : "Yes, Delete"}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
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
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
    >
      Delete Recipe
    </button>
  );
}
