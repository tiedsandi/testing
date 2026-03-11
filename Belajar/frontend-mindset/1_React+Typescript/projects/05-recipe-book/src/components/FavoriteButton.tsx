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

  // Update optimistic state when server responds
  useEffect(() => {
    if (fetcher.state === "idle") {
      setOptimisticFavorite(isFavorite);
    }
  }, [isFavorite, fetcher.state]);

  const handleToggle = () => {
    setOptimisticFavorite(!optimisticFavorite); // Optimistic UI
    fetcher.submit(null, {
      method: "post",
      action: `/recipes/${recipeId}/favorite`,
    });
  };

  return (
    <button
      onClick={handleToggle}
      className="text-2xl hover:scale-110 transition-transform"
      aria-label={
        optimisticFavorite ? "Remove from favorites" : "Add to favorites"
      }
    >
      {optimisticFavorite ? "❤️" : "🤍"}
    </button>
  );
}
