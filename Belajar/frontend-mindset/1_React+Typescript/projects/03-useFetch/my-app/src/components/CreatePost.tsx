import { useState, type SyntheticEvent } from "react";
import useFetch from "../hooks/useFetch";

interface NewPost {
  title: string;
  body: string;
  userId: number;
}

interface CreatedPost extends NewPost {
  id: number;
}

function CreatePost() {
  const [formData, setFormData] = useState<NewPost>({
    title: "",
    body: "",
    userId: 1,
  });

  // immediate: false → tidak auto-fetch, tunggu dipanggil manual
  const { data, isLoading, isSuccess, isError, error, execute } =
    useFetch<CreatedPost>("https://jsonplaceholder.typicode.com/posts", {
      immediate: false,   // ← Kunci: tidak langsung fetch
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    await execute(); // Trigger fetch secara manual
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Buat Post Baru</h2>

      <div>
        <label>Title</label>
        <input
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <label>Body</label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
          required
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Menyimpan..." : "Simpan Post"}
      </button>

      {isSuccess && data && (
        <div style={{ color: "green", marginTop: "1rem" }}>
          <p>✅ Post berhasil dibuat! ID: {data.id}</p>
          <p>Judul: {data.title}</p>
        </div>
      )}

      {isError && (
        <p style={{ color: "red" }}>
          ❌ Gagal: {error?.message}
        </p>
      )}
    </form>
  );
}

export default CreatePost;