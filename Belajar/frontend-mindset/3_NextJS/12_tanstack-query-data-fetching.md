# H. Data Fetching yang Proper dengan TanStack Query v5 + TypeScript

> **Level:** Intermediate  
> **Estimasi waktu:** 4–6 jam  
> **Stack:** Next.js App Router · TanStack Query v5 · TypeScript

---

## Kenapa Kamu Butuh Library Fetching?

Sebelum bahas solusinya, kita reproduksi dulu masalahnya.

### The Painful Way — `useEffect` Manual

Ini pola yang hampir semua orang tulis pertama kali:

```tsx
function UserList() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, []);

  // ...
}
```

Kelihatan simpel. Tapi coba kamu jawab pertanyaan-pertanyaan ini:

**1. Gimana kalau komponen di-unmount sebelum fetch selesai?**

Kamu dapat warning `Can't perform a React state update on an unmounted component`. Kamu perlu tambah cleanup:

```tsx
useEffect(() => {
  let cancelled = false;
  setIsLoading(true);

  fetch("/api/users")
    .then((res) => res.json())
    .then((data) => {
      if (!cancelled) setUsers(data);
    })
    .catch((err) => {
      if (!cancelled) setError(err);
    })
    .finally(() => {
      if (!cancelled) setIsLoading(false);
    });

  return () => { cancelled = true; }; // cleanup
}, []);
```

**2. Gimana kalau dua komponen berbeda butuh data yang sama?**

Fetch dijalankan dua kali. Tidak ada sharing cache.

**3. Gimana data tetap fresh saat user kembali ke tab?**

Kamu harus handle sendiri event `visibilitychange` dan trigger refetch.

**4. Gimana kalau fetch gagal? Retry otomatis?**

Kamu harus tulis sendiri logika retry dengan exponential backoff.

**5. Loading state saat refetch (background update)?**

`isLoading` jadi `true` lagi, UI flicker. Kamu butuh state `isFetching` terpisah.

Belum lagi: **deduplication request**, **pagination**, **infinite scroll**, **optimistic update**, **prefetching**...

Semua ini — TanStack Query handle otomatis. Itulah kenapa library ini ada.

---

## Apa itu TanStack Query?

TanStack Query (dulu bernama React Query) adalah **async state manager**. Bukan HTTP client — kamu tetap pakai `fetch` atau `axios`. Query hanya mengatur *kapan* data di-fetch, *bagaimana* cache-nya, dan *kapan* data dianggap basi.

Tiga hal utama yang dia kelola:

| Concern | TanStack Query |
|---|---|
| Loading / error state | Otomatis |
| Cache + deduplication | Otomatis |
| Background refetch | Otomatis |
| Retry on failure | Otomatis (3x default) |

---

## Setup di Next.js App Router

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

### Provider

Di App Router, provider harus di Client Component karena `QueryClient` tidak bisa di-serialize ke server.

```tsx
// providers/query-provider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState supaya setiap request server tidak share instance yang sama
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 menit — data dianggap fresh selama ini
            retry: 2,             // retry 2x kalau fetch gagal
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools — muncul hanya di development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

```tsx
// app/layout.tsx
import { QueryProvider } from "@/providers/query-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

---

## Perbandingan Side-by-Side

Sebelum lanjut ke detail, lihat dulu perbedaan nyatanya. Kasus: fetch list posts + loading + error state.

### useEffect (manual)

```tsx
// ❌ Pendekatan useEffect
function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/posts");
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        if (!cancelled) setPosts(data);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

**32 baris**, belum termasuk retry, caching, background refetch, deduplication.

### TanStack Query

```tsx
// ✅ Pendekatan TanStack Query
function PostList() {
  const { data: posts, isLoading, error } = useQuery({
    queryKey: ["posts"],
    queryFn: () => fetch("/api/posts").then(res => res.json()),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  return <ul>{posts?.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

**10 baris**, plus dapat caching, retry, background refetch, deduplication secara gratis.

---

## `useQuery` — Fetching Data

### Anatomy dasar

```tsx
const result = useQuery({
  queryKey: ["posts"],        // ← identifier unik untuk cache
  queryFn: fetchPosts,        // ← fungsi yang return Promise
  staleTime: 30_000,          // ← (opsional) override default
  enabled: isLoggedIn,        // ← (opsional) kondisi fetch
});

// result berisi:
// result.data        — data yang berhasil di-fetch
// result.isLoading   — true hanya saat fetch pertama kali (belum ada cache)
// result.isFetching  — true setiap fetch sedang berjalan (termasuk background)
// result.isError     — true kalau fetch gagal
// result.error       — Error object
// result.refetch()   — trigger refetch manual
```

### Typing yang proper

Selalu typing `queryFn`-nya, bukan `useQuery`-nya:

```tsx
// types/post.ts
export interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

// api/posts.ts
async function fetchPosts(): Promise<Post[]> {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts");
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json(); // TypeScript tahu ini Promise<Post[]>
}

async function fetchPostById(id: number): Promise<Post> {
  const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!res.ok) throw new Error(`Post ${id} not found`);
  return res.json();
}
```

```tsx
// Komponen — TypeScript inference otomatis, tidak perlu type annotation manual
function PostList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
    // data: Post[] | undefined — TypeScript tahu ini!
  });

  if (isLoading) return <PostsSkeleton />;
  if (isError) return <ErrorMessage message={error.message} />;

  return (
    <ul>
      {data.map((post) => (   // data di sini sudah Post[], tidak perlu optional chaining
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Query Key yang dinamis

Query key adalah identifier cache. Kalau key-nya berubah, Query otomatis fetch ulang.

```tsx
// Fetch berdasarkan ID — key berubah saat id berubah
function PostDetail({ postId }: { postId: number }) {
  const { data: post } = useQuery({
    queryKey: ["posts", postId],      // ← array, bisa berisi variable
    queryFn: () => fetchPostById(postId),
    enabled: postId > 0,              // ← hanya fetch kalau id valid
  });

  return <div>{post?.title}</div>;
}

// Fetch dengan filter — key merefleksikan state filter
function FilteredUsers({ role }: { role: string }) {
  const { data: users } = useQuery({
    queryKey: ["users", { role }],    // ← object di key juga bisa
    queryFn: () => fetchUsersByRole(role),
  });

  return <UserTable users={users ?? []} />;
}
```

> **Aturan query key:** Anggap key seperti dependency array di `useEffect`. Semua variable yang dipakai di `queryFn` harus masuk ke key.

### `isLoading` vs `isFetching`

Ini sering bikin bingung:

```
Pertama kali buka halaman:
  isLoading = true  (tidak ada cache)
  isFetching = true

Halaman sudah pernah dibuka, user navigate away lalu balik:
  isLoading = false (ada cache, langsung tampil data lama)
  isFetching = true (background fetch untuk data terbaru)

Fetch selesai, data terupdate:
  isLoading = false
  isFetching = false
```

```tsx
function PostList() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  });

  return (
    <div>
      {/* Hanya tampil saat benar-benar tidak ada data */}
      {isLoading && <Skeleton />}

      {/* Indicator kecil di pojok — menunjukkan background update */}
      {isFetching && !isLoading && (
        <span className="text-xs text-muted-foreground">Memperbarui...</span>
      )}

      {data && <PostTable posts={data} />}
    </div>
  );
}
```

---

## `useMutation` — Mengubah Data

Kalau `useQuery` untuk membaca, `useMutation` untuk menulis (POST, PUT, PATCH, DELETE).

### Anatomy dasar

```tsx
const mutation = useMutation({
  mutationFn: (newPost: CreatePostInput) => createPost(newPost),
  onSuccess: (data) => {
    // data = response dari server
    console.log("Post berhasil dibuat:", data);
  },
  onError: (error) => {
    console.error("Gagal buat post:", error);
  },
  onSettled: () => {
    // Dipanggil setelah sukses ATAU error — bagus untuk cleanup
  },
});

// Cara pakai:
mutation.mutate({ title: "Post Baru", body: "..." });
// atau async:
await mutation.mutateAsync({ title: "Post Baru", body: "..." });
```

### Contoh lengkap dengan TypeScript

```tsx
// api/notes.ts
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface CreateNoteInput {
  title: string;
  content: string;
}

export interface UpdateNoteInput {
  id: string;
  title?: string;
  content?: string;
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Gagal membuat note");
  return res.json();
}

export async function updateNote({ id, ...data }: UpdateNoteInput): Promise<Note> {
  const res = await fetch(`/api/notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Gagal mengupdate note");
  return res.json();
}

export async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Gagal menghapus note");
}
```

```tsx
// Komponen form buat note baru
function CreateNoteForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      // Setelah berhasil, invalidasi cache "notes" supaya list ter-refresh
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setTitle("");
      setContent("");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate({ title, content });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Judul note"
        required
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Isi note"
        required
      />
      {isError && (
        <p className="text-destructive text-sm">{error.message}</p>
      )}
      <button type="submit" disabled={isPending}>
        {isPending ? "Menyimpan..." : "Simpan Note"}
      </button>
    </form>
  );
}
```

---

## Query Invalidation — "Data Kamu Basi, Fetch Ulang"

Setelah mutation berhasil, data di cache sudah tidak akurat. Gunakan `invalidateQueries` untuk memberi tahu Query agar fetch ulang.

```tsx
const queryClient = useQueryClient();

// Invalidasi semua query dengan key yang diawali "notes"
queryClient.invalidateQueries({ queryKey: ["notes"] });

// Invalidasi query spesifik
queryClient.invalidateQueries({ queryKey: ["notes", "abc-123"] });

// Invalidasi multiple query sekaligus
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ["notes"] }),
  queryClient.invalidateQueries({ queryKey: ["stats"] }),
]);
```

### Strategi invalidasi

```tsx
// Setelah hapus note, invalidasi list + stats user
const deleteNoteMutation = useMutation({
  mutationFn: deleteNote,
  onSuccess: (_, deletedNoteId) => {
    queryClient.invalidateQueries({ queryKey: ["notes"] });
    queryClient.invalidateQueries({ queryKey: ["user-stats"] });
  },
});

// Atau langsung update cache tanpa refetch (lebih performa)
const deleteNoteMutation = useMutation({
  mutationFn: deleteNote,
  onSuccess: (_, deletedNoteId) => {
    queryClient.setQueryData<Note[]>(["notes"], (oldData) =>
      oldData?.filter((note) => note.id !== deletedNoteId) ?? []
    );
  },
});
```

---

## Stale Time vs Cache Time — Jangan Sampai Keliru

Ini dua konsep yang sering dicampur aduk.

```
Timeline setelah fetch berhasil:

t=0s     ├── Data masuk cache, status: FRESH
         │   (tidak ada background refetch)
         │
t=60s    ├── staleTime habis, status: STALE
         │   (background refetch akan dipicu saat: window focus,
         │    komponen remount, atau network reconnect)
         │
Komponen ├── Di-unmount, tidak ada consumer lagi
unmount  │
         │
t=5min   └── gcTime habis, data dihapus dari cache
             (kalau user balik, fetch dari nol lagi)
```

```tsx
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,      // 1 menit — data dianggap fresh
      gcTime: 5 * 60 * 1000,     // 5 menit — cache disimpan setelah tidak dipakai
      // (di v4 namanya cacheTime, di v5 diganti gcTime)
    },
  },
});
```

### Kapan set staleTime tinggi?

```tsx
// Data referensi yang jarang berubah — staleTime panjang
const { data: countries } = useQuery({
  queryKey: ["countries"],
  queryFn: fetchCountries,
  staleTime: Infinity, // tidak pernah dianggap basi
});

// Data real-time — staleTime pendek
const { data: notifications } = useQuery({
  queryKey: ["notifications"],
  queryFn: fetchNotifications,
  staleTime: 0,         // selalu dianggap basi, refetch di setiap window focus
  refetchInterval: 30_000, // polling setiap 30 detik
});

// Data user — staleTime sedang
const { data: profile } = useQuery({
  queryKey: ["profile"],
  queryFn: fetchProfile,
  staleTime: 5 * 60 * 1000, // 5 menit
});
```

---

## Optimistic Update

Optimistic update artinya: **update UI sebelum server konfirmasi**. Kalau server gagal, rollback ke state sebelumnya.

Hasilnya: UI terasa instan, experience jauh lebih bagus.

```
Tanpa optimistic update:
User klik "Hapus" → loading spinner → server response → UI update
(delay terasa)

Dengan optimistic update:
User klik "Hapus" → UI langsung update → server response (background)
(jika gagal → rollback otomatis)
```

### Contoh: Toggle "like" pada note

```tsx
const likeNoteMutation = useMutation({
  mutationFn: (noteId: string) =>
    fetch(`/api/notes/${noteId}/like`, { method: "POST" }).then((r) =>
      r.json()
    ),

  // Dipanggil SEBELUM mutationFn dijalankan
  onMutate: async (noteId) => {
    // 1. Cancel query yang sedang berjalan supaya tidak overwrite optimistic update
    await queryClient.cancelQueries({ queryKey: ["notes"] });

    // 2. Simpan snapshot data sebelum update (untuk rollback)
    const previousNotes = queryClient.getQueryData<Note[]>(["notes"]);

    // 3. Update cache secara optimistis
    queryClient.setQueryData<Note[]>(["notes"], (old) =>
      old?.map((note) =>
        note.id === noteId
          ? { ...note, isLiked: !note.isLiked }
          : note
      ) ?? []
    );

    // 4. Return snapshot untuk dipakai di onError
    return { previousNotes };
  },

  // Dipanggil kalau mutationFn gagal
  onError: (error, noteId, context) => {
    // Rollback ke data sebelumnya
    queryClient.setQueryData(["notes"], context?.previousNotes);
  },

  // Dipanggil setelah sukses ATAU error — pastikan data sinkron dengan server
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  },
});
```

---

## Mini Project: Notes App CRUD

Sekarang kita satukan semua konsep di atas ke dalam satu mini project yang bisa langsung jalan.

### Setup mock API dengan Route Handlers

```typescript
// app/api/notes/route.ts
import { NextRequest, NextResponse } from "next/server";

// In-memory store — reset tiap server restart
let notes = [
  {
    id: "1",
    title: "Belajar TanStack Query",
    content: "Mulai dari useQuery dulu",
    createdAt: new Date("2025-01-10").toISOString(),
  },
  {
    id: "2",
    title: "Setup Zustand",
    content: "Buat store untuk UI state",
    createdAt: new Date("2025-01-12").toISOString(),
  },
];

export async function GET() {
  // Simulasi delay jaringan
  await new Promise((r) => setTimeout(r, 500));
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  await new Promise((r) => setTimeout(r, 400));
  const body = await req.json();
  const newNote = {
    id: Date.now().toString(),
    title: body.title,
    content: body.content,
    createdAt: new Date().toISOString(),
  };
  notes.push(newNote);
  return NextResponse.json(newNote, { status: 201 });
}
```

```typescript
// app/api/notes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

declare global {
  // eslint-disable-next-line no-var
  var notesStore: { id: string; title: string; content: string; createdAt: string }[];
}

// Simpan di global supaya bisa dishare antar route handler
if (!global.notesStore) {
  global.notesStore = [
    {
      id: "1",
      title: "Belajar TanStack Query",
      content: "Mulai dari useQuery dulu",
      createdAt: new Date("2025-01-10").toISOString(),
    },
    {
      id: "2",
      title: "Setup Zustand",
      content: "Buat store untuk UI state",
      createdAt: new Date("2025-01-12").toISOString(),
    },
  ];
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await new Promise((r) => setTimeout(r, 400));
  const body = await req.json();
  const index = global.notesStore.findIndex((n) => n.id === params.id);
  if (index === -1) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  global.notesStore[index] = { ...global.notesStore[index], ...body };
  return NextResponse.json(global.notesStore[index]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await new Promise((r) => setTimeout(r, 300));
  const index = global.notesStore.findIndex((n) => n.id === params.id);
  if (index === -1) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  global.notesStore.splice(index, 1);
  return new NextResponse(null, { status: 204 });
}
```

### Type definitions

```typescript
// types/note.ts
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface CreateNoteInput {
  title: string;
  content: string;
}

export interface UpdateNoteInput {
  id: string;
  title: string;
  content: string;
}
```

### API functions

```typescript
// api/notes.ts
import { Note, CreateNoteInput, UpdateNoteInput } from "@/types/note";

const BASE = "/api/notes";

export async function getNotes(): Promise<Note[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Gagal memuat notes");
  return res.json();
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Gagal membuat note");
  return res.json();
}

export async function updateNote({ id, ...data }: UpdateNoteInput): Promise<Note> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Gagal mengupdate note");
  return res.json();
}

export async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Gagal menghapus note");
}
```

### Custom hooks

Pisahkan logic query ke custom hooks — komponen jadi bersih dan hooks bisa dipakai ulang.

```typescript
// hooks/useNotes.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from "@/api/notes";
import type { CreateNoteInput, Note, UpdateNoteInput } from "@/types/note";

// Query key sebagai konstanta — hindari typo
export const NOTES_QUERY_KEY = ["notes"] as const;

// ─── Read ──────────────────────────────────────────────────────────────────

export function useNotes() {
  return useQuery({
    queryKey: NOTES_QUERY_KEY,
    queryFn: getNotes,
    staleTime: 30_000,
  });
}

// ─── Create ────────────────────────────────────────────────────────────────

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY });
    },
  });
}

// ─── Update ────────────────────────────────────────────────────────────────

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNote,
    // Update cache langsung tanpa refetch — lebih smooth
    onSuccess: (updatedNote) => {
      queryClient.setQueryData<Note[]>(NOTES_QUERY_KEY, (old) =>
        old?.map((note) =>
          note.id === updatedNote.id ? updatedNote : note
        ) ?? []
      );
    },
  });
}

// ─── Delete (dengan Optimistic Update) ─────────────────────────────────────

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNote,
    onMutate: async (noteId) => {
      // Batalkan fetch yang sedang berjalan
      await queryClient.cancelQueries({ queryKey: NOTES_QUERY_KEY });

      // Snapshot untuk rollback
      const previousNotes = queryClient.getQueryData<Note[]>(NOTES_QUERY_KEY);

      // Hapus optimistis dari cache
      queryClient.setQueryData<Note[]>(NOTES_QUERY_KEY, (old) =>
        old?.filter((note) => note.id !== noteId) ?? []
      );

      return { previousNotes };
    },
    onError: (_error, _noteId, context) => {
      // Rollback
      queryClient.setQueryData(NOTES_QUERY_KEY, context?.previousNotes);
    },
    onSettled: () => {
      // Pastikan data sinkron dengan server
      queryClient.invalidateQueries({ queryKey: NOTES_QUERY_KEY });
    },
  });
}
```

### Komponen-komponen UI

```tsx
// components/notes/NoteCard.tsx
"use client";

import { useState } from "react";
import { Note } from "@/types/note";
import { useUpdateNote, useDeleteNote } from "@/hooks/useNotes";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);

  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  function handleSave() {
    updateNote.mutate(
      { id: note.id, title, content },
      { onSuccess: () => setIsEditing(false) }
    );
  }

  function handleCancel() {
    setTitle(note.title);
    setContent(note.content);
    setIsEditing(false);
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {isEditing ? (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded border px-2 py-1 text-sm font-medium"
            autoFocus
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded border px-2 py-1 text-sm resize-none"
            rows={3}
          />
          {updateNote.isError && (
            <p className="text-destructive text-xs">
              {updateNote.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={updateNote.isPending}
              className="flex items-center gap-1 rounded bg-primary px-3 py-1 text-xs text-primary-foreground disabled:opacity-50"
            >
              {updateNote.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Simpan
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 rounded border px-3 py-1 text-xs"
            >
              <X className="h-3 w-3" />
              Batal
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm">{note.title}</h3>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
                aria-label={`Edit note: ${note.title}`}
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => deleteNote.mutate(note.id)}
                disabled={deleteNote.isPending}
                className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label={`Hapus note: ${note.title}`}
              >
                {deleteNote.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{note.content}</p>
          <p className="text-xs text-muted-foreground/60">
            {new Date(note.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </>
      )}
    </div>
  );
}
```

```tsx
// components/notes/CreateNoteForm.tsx
"use client";

import { useState } from "react";
import { useCreateNote } from "@/hooks/useNotes";
import { Loader2, Plus } from "lucide-react";

export function CreateNoteForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { mutate, isPending, isError, error, reset } = useCreateNote();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutate(
      { title, content },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          setIsOpen(false);
        },
      }
    );
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed py-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="h-4 w-4" />
        Tambah note baru
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <h3 className="font-medium text-sm">Note Baru</h3>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          if (isError) reset(); // clear error saat user mulai ngetik lagi
        }}
        placeholder="Judul note"
        required
        autoFocus
        className="w-full rounded border px-3 py-1.5 text-sm"
      />

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Isi note..."
        required
        rows={3}
        className="w-full rounded border px-3 py-1.5 text-sm resize-none"
      />

      {isError && (
        <p className="text-destructive text-xs" role="alert">
          {error.message}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded bg-primary px-4 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          {isPending ? "Menyimpan..." : "Simpan"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            reset();
          }}
          className="rounded border px-4 py-1.5 text-xs"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
```

```tsx
// components/notes/NoteList.tsx
"use client";

import { useNotes } from "@/hooks/useNotes";
import { NoteCard } from "./NoteCard";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NoteList() {
  const { data: notes, isLoading, isError, error, refetch, isFetching } = useNotes();

  if (isLoading) {
    return (
      <div className="grid gap-3" aria-busy="true" aria-label="Memuat notes...">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center space-y-3" role="alert">
        <p className="text-destructive font-medium">{error.message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-3 w-3" />
          Coba lagi
        </Button>
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <FileText className="mx-auto h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Belum ada note. Buat yang pertama!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Indicator background update yang tidak mengganggu */}
      {isFetching && (
        <p className="text-xs text-muted-foreground text-right" aria-live="polite">
          Memperbarui...
        </p>
      )}
      <div className="grid gap-3">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}
```

### Halaman utama

```tsx
// app/notes/page.tsx
import { CreateNoteForm } from "@/components/notes/CreateNoteForm";
import { NoteList } from "@/components/notes/NoteList";

export const metadata = {
  title: "Notes App",
};

export default function NotesPage() {
  return (
    <div className="max-w-lg mx-auto py-10 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Semua catatan kamu ada di sini.
        </p>
      </div>

      <CreateNoteForm />
      <NoteList />
    </div>
  );
}
```

---

## Pola-Pola Penting yang Perlu Kamu Tahu

### 1. Dependent Queries — fetch bergantung pada hasil fetch lain

```tsx
function UserPosts({ userId }: { userId: string | null }) {
  // Query pertama
  const { data: user } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId!),
    enabled: userId !== null, // ← hanya run kalau ada userId
  });

  // Query kedua — bergantung pada hasil query pertama
  const { data: posts } = useQuery({
    queryKey: ["posts", user?.id],
    queryFn: () => fetchPostsByUser(user!.id),
    enabled: user !== undefined, // ← hanya run setelah user berhasil di-fetch
  });

  return <PostList posts={posts} />;
}
```

### 2. Parallel Queries — fetch banyak sekaligus

```tsx
function Dashboard() {
  // Semua berjalan paralel — tidak saling tunggu
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: fetchUsers });
  const statsQuery = useQuery({ queryKey: ["stats"], queryFn: fetchStats });
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const isLoading =
    usersQuery.isLoading ||
    statsQuery.isLoading ||
    notificationsQuery.isLoading;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div>
      <StatsGrid data={statsQuery.data} />
      <UserTable users={usersQuery.data} />
      <NotificationList notifications={notificationsQuery.data} />
    </div>
  );
}
```

### 3. Prefetching — load data sebelum user butuh

```tsx
// Prefetch saat user hover ke link
function PostLink({ postId }: { postId: number }) {
  const queryClient = useQueryClient();

  return (
    <Link
      href={`/posts/${postId}`}
      onMouseEnter={() => {
        queryClient.prefetchQuery({
          queryKey: ["posts", postId],
          queryFn: () => fetchPostById(postId),
          staleTime: 10_000,
        });
      }}
    >
      Lihat Post
    </Link>
  );
}
```

### 4. Selectors — transformasi data di dalam query

```tsx
// Daripada transform di komponen, gunakan select
const { data: adminUsers } = useQuery({
  queryKey: ["users"],
  queryFn: fetchUsers,
  select: (users) => users.filter((u) => u.role === "admin"),
  // Komponen hanya re-render kalau hasil select berubah
});
```

---

## Cheatsheet

```
useQuery
├── queryKey     → identifier cache, ubah key = fetch ulang
├── queryFn      → async function yang return data
├── enabled      → kondisi kapan fetch dijalankan
├── staleTime    → berapa lama data dianggap fresh (ms)
├── select       → transform data hasil fetch
└── refetchInterval → polling interval (ms)

useMutation
├── mutationFn   → async function untuk write data
├── onMutate     → sebelum fetch (untuk optimistic update)
├── onSuccess    → setelah berhasil
├── onError      → setelah gagal (untuk rollback)
└── onSettled    → setelah berhasil atau gagal

useQueryClient
├── invalidateQueries → tandai basi, trigger refetch
├── setQueryData      → update cache manual
├── prefetchQuery     → prefetch tanpa render
└── getQueryData      → baca cache saat ini
```

---

## Alur Keputusan

```
Data ini butuh di-cache dan disinkronisasi dengan server?
├── YA  → useQuery (kalau read) / useMutation (kalau write)
└── TIDAK → useState / Zustand sudah cukup

Setelah mutation berhasil, data mana yang perlu diperbarui?
├── Banyak halaman pakai data itu → invalidateQueries
├── Hanya tambah/hapus satu item → setQueryData manual
└── Keduanya → lakukan keduanya

Perlu update UI sebelum server konfirmasi?
├── YA, UX harus instan (hapus, toggle) → optimistic update
└── TIDAK, biarkan loading state biasa → skip onMutate
```

---

## Langkah Selanjutnya

Setelah mini project ini selesai:

1. **Infinite scroll** — pelajari `useInfiniteQuery` untuk load more pattern
2. **Server-side prefetching** — di Next.js App Router, prefetch di Server Component lalu hydrate di client
3. **Suspense mode** — TanStack Query punya `useSuspenseQuery` untuk integrasi lebih smooth dengan React Suspense
4. **Error boundaries** — pasangkan dengan `ErrorBoundary` supaya error terisolasi per komponen
