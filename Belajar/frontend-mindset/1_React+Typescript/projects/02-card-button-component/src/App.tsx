import { useState } from "react";
import Card from "./components/Card/Card";
import Button from "./components/Button/Button";
import type { CardAction } from "./components/Card/Card.types";

// Type untuk data article
interface Article {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  tags: string[];
}

// Data dummy
const ARTICLES: Article[] = [
  {
    id: 1,
    title: "Belajar TypeScript dari Nol",
    excerpt: "TypeScript adalah superset JavaScript yang menambahkan static typing...",
    author: "Budi Santoso",
    publishedAt: "2025-01-15",
    tags: ["typescript", "javascript", "tutorial"],
  },
  {
    id: 2,
    title: "React Hooks Lengkap",
    excerpt: "Panduan lengkap menggunakan useState, useEffect, useCallback...",
    author: "Sari Dewi",
    publishedAt: "2025-01-20",
    tags: ["react", "hooks", "tutorial"],
  },
];

function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<number[]>([]);

  const toggleLike = (id: number): void => {
    setLikedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDelete = (id: number): void => {
    alert(`Hapus article ID: ${id}`);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Article List</h1>

      {/* Button contoh berbagai variant */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        <Button variant="primary" onClick={() => alert("Primary!")}>
          Primary
        </Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger" size="sm">
          Danger
        </Button>
        <Button variant="ghost" size="lg">
          Ghost
        </Button>
        <Button variant="primary" loading>
          Loading...
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </div>

      {/* Card list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {ARTICLES.map((article) => {
          const isLiked = likedIds.includes(article.id);
          const isSelected = selectedId === article.id;

          // Actions untuk card footer
          const cardActions: CardAction[] = [
            {
              label: isLiked ? "❤️ Liked" : "🤍 Like",
              onClick: () => toggleLike(article.id),
              variant: isLiked ? "primary" : "secondary",
            },
            {
              label: "Edit",
              onClick: () => setSelectedId(article.id),
              variant: "secondary",
            },
            {
              label: "Hapus",
              onClick: () => handleDelete(article.id),
              variant: "danger",
            },
          ];

          return (
            <Card
              key={article.id}
              title={article.title}
              subtitle={`Oleh ${article.author} — ${article.publishedAt}`}
              elevation={isSelected ? "floating" : "raised"}
              hoverable
              actions={cardActions}
              headerAction={
                <span style={{ fontSize: "0.75rem", color: "#888" }}>
                  #{article.id}
                </span>
              }
              onClick={() => setSelectedId(isSelected ? null : article.id)}
            >
              {/* Body card */}
              <p>{article.excerpt}</p>
              <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem" }}>
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: "2px 8px",
                      background: "#e0f0ff",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Expanded detail saat selected */}
              {isSelected && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    background: "#f9f9f9",
                    borderRadius: "4px",
                  }}
                >
                  <strong>Detail Article #{article.id}</strong>
                  <p>Klik card lagi untuk menutup detail ini.</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Status panel */}
      {selectedId !== null && (
        <Card
          title="Status"
          elevation="flat"
          padding="sm"
          footer={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedId(null)}
            >
              Tutup
            </Button>
          }
          style={{ marginTop: "1rem" }}
        >
          <p>Article yang dipilih: <strong>ID #{selectedId}</strong></p>
          <p>Total liked: <strong>{likedIds.length}</strong></p>
        </Card>
      )}
    </div>
  );
}

export default App;