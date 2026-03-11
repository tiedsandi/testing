// src/components/PostList.tsx

import useFetch from "../hooks/useFetch";

interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

function PostList() {
  // TypeScript tahu bahwa data adalah Post[] | null
  const {
    data: posts,
    isLoading,
    isError,
    isSuccess,
    error,
    execute: refetch,
  } = useFetch<Post[]>("https://jsonplaceholder.typicode.com/posts");

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <h1>Daftar Post</h1>
        <button onClick={refetch} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {isLoading && <p>Memuat posts...</p>}

      {isError && (
        <div style={{ color: "red" }}>
          <p>Gagal memuat: {error?.message}</p>
          {error?.statusCode && <p>Status: {error.statusCode}</p>}
          <button onClick={refetch}>Coba Lagi</button>
        </div>
      )}

      {isSuccess && posts && (
        <ul>
          {posts.slice(0, 10).map((post) => (
            <li key={post.id}>
              <strong>{post.title}</strong>
              <p>{post.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PostList;