# Data Fetching di Next.js App Router: TypeScript

> **Prerequisite:** Sudah baca [06_nextjs-app-router.md](./06_nextjs-app-router.md) — khususnya bagian Server Component vs Client Component. Konsep itu adalah fondasi dari semua yang kita bahas di sini.

---

## Daftar Isi

1. [Cara Berpikir Tentang Fetching di Next.js](#1-cara-berpikir-tentang-fetching-di-nextjs)
2. [Fetch di Server Component](#2-fetch-di-server-component)
3. [Caching & Revalidasi](#3-caching--revalidasi)
4. [Loading State: loading.tsx dan Suspense](#4-loading-state-loadingtsx-dan-suspense)
5. [Error Handling: error.tsx dan try/catch](#5-error-handling-errortsx-dan-trycatch)
6. [Fetch di Client Component](#6-fetch-di-client-component)
7. [SWR — Library untuk Client Fetching](#7-swr--library-untuk-client-fetching)
8. [Kapan Pakai Server vs Client Fetch?](#8-kapan-pakai-server-vs-client-fetch)
9. [Mini Project: Halaman Berita dengan JSONPlaceholder](#9-mini-project-halaman-berita-dengan-jsonplaceholder)
10. [Pola Lanjutan yang Perlu Kamu Tahu](#10-pola-lanjutan-yang-perlu-kamu-tahu)

---

## 1. Cara Berpikir Tentang Fetching di Next.js

Di React biasa (Vite/CRA), kamu hanya punya **satu cara** fetch data: `useEffect` di client. Monoton tapi simpel.

Di Next.js App Router, kamu punya **dua tempat** untuk fetch: server dan client. Dan ini bukan sekadar pilihan teknis — ini pilihan **arsitektur** yang berdampak ke performa, keamanan, dan UX.

### Analogi Restoran

Bayangkan aplikasi kamu adalah sebuah restoran:

- **Server fetch** = Dapur yang menyiapkan makanan sebelum disajikan ke meja. Tamu langsung dapat makanan jadi — tidak perlu tunggu.
- **Client fetch** = Tamu order sendiri di tablet, makanan dikirim setelah dipesan. Ada delay, ada loading state, tapi lebih fleksibel kalau tamu mau ganti pesanan.

Keduanya valid, tergantung konteksnya. Menu utama (konten halaman)? Siapkan di dapur. Rekomendasi personal waktu nyata? Order dari tablet.

### Gambaran Besarnya

```
REQUEST MASUK ke /berita
          │
          ▼
     Server Next.js
          │
          ├─── Server Component fetch otomatis
          │         │
          │         ├─ Fetch articles dari API  ─→ Data
          │         ├─ Fetch categories        ─→ Data
          │         └─ Render HTML dengan data
          │
          ▼
     HTML lengkap dikirim ke browser
          │
          ▼
     Browser tampilkan konten langsung (tidak ada loading spinner)
          │
          │    (kalau ada Client Component)
          ▼
     React "hydrate" — JS aktif, event handlers berjalan
          │
          │    (kalau butuh client fetch)
          ▼
     useEffect/SWR/React Query fetch data real-time
```

Di React biasa, semua step dilakukan di browser. Di Next.js, langkah pertama sudah selesai di server — user tidak perlu tunggu.

---

## 2. Fetch di Server Component

### 2.1 Cara Paling Dasar

Server Component boleh `async` — dan ini adalah superpower terbesar App Router:

```tsx
// app/posts/page.tsx

// Tidak ada "use client" → ini Server Component
// Boleh async, boleh await langsung di body component

export default async function PostsPage() {
  // Fetch langsung di sini — tidak butuh useEffect, tidak butuh useState
  const response = await fetch("https://jsonplaceholder.typicode.com/posts");

  if (!response.ok) {
    throw new Error("Gagal mengambil data posts");
  }

  const posts = await response.json();

  return (
    <ul>
      {posts.map((post: { id: number; title: string }) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

Simpel, bukan? Tidak ada boilerplate. Tapi baris `const posts = await response.json()` menghasilkan tipe `any` — tidak aman. Mari perbaiki dengan typing yang benar.

### 2.2 Typing API Response dengan TypeScript

```tsx
// src/types/post.types.ts

// Definisikan interface sesuai shape JSON dari API
export interface Post {
  id:     number;
  title:  string;
  body:   string;
  userId: number;
}

export interface User {
  id:       number;
  name:     string;
  username: string;
  email:    string;
  phone:    string;
  website:  string;
  address: {
    street:  string;
    suite:   string;
    city:    string;
    zipcode: string;
  };
  company: {
    name: string;
  };
}

export interface Comment {
  id:     number;
  postId: number;
  name:   string;
  email:  string;
  body:   string;
}
```

```tsx
// src/lib/api.ts
// Semua fungsi fetch di satu tempat — bukan scatter di mana-mana

import type { Post, User, Comment } from "@/types/post.types";

const BASE_URL = "https://jsonplaceholder.typicode.com";

// ── Generic fetch helper ───────────────────────────────────────
// Hindari duplikasi error handling di setiap fungsi
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    // Lempar error dengan pesan yang informatif
    throw new Error(
      `API Error ${response.status}: ${response.statusText} — ${endpoint}`
    );
  }

  // Generic cast ke tipe T — aman karena kita yang define interface-nya
  return response.json() as Promise<T>;
}

// ── Post functions ────────────────────────────────────────────
export async function getPosts(): Promise<Post[]> {
  return apiFetch<Post[]>("/posts");
}

export async function getPost(id: number): Promise<Post> {
  return apiFetch<Post>(`/posts/${id}`);
}

export async function getPostComments(postId: number): Promise<Comment[]> {
  return apiFetch<Comment[]>(`/posts/${postId}/comments`);
}

// ── User functions ────────────────────────────────────────────
export async function getUsers(): Promise<User[]> {
  return apiFetch<User[]>("/users");
}

export async function getUser(id: number): Promise<User> {
  return apiFetch<User>(`/users/${id}`);
}
```

Sekarang pakai di Server Component:

```tsx
// app/posts/page.tsx
import { getPosts } from "@/lib/api";
import type { Post } from "@/types/post.types";

export default async function PostsPage() {
  // posts sekarang bertipe Post[] — bukan any
  const posts: Post[] = await getPosts();

  return (
    <ul>
      {posts.map((post) => (
        // TypeScript tahu post.id, post.title, post.body, post.userId
        <li key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.body}</p>
        </li>
      ))}
    </ul>
  );
}
```

### 2.3 Parallel Fetch — Jangan Berturut-turut

Ini kesalahan yang sering terjadi, dan dampaknya signifikan ke performa:

```tsx
// ❌ SEQUENTIAL FETCH — lambat!
// Fetch kedua baru dimulai setelah fetch pertama selesai
// Total waktu = waktu_fetch_1 + waktu_fetch_2

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user    = await getUser(Number(id));    // Tunggu 200ms
  const posts   = await getUserPosts(Number(id)); // Baru mulai setelah itu, tunggu 150ms
  // Total: 350ms
}
```

```tsx
// ✅ PARALLEL FETCH — lebih cepat!
// Keduanya dimulai bersamaan
// Total waktu = waktu fetch yang paling lama

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Promise.all — semua fetch jalan bersamaan
  const [user, posts] = await Promise.all([
    getUser(Number(id)),       // Mulai bersamaan
    getUserPosts(Number(id)),  // Mulai bersamaan
  ]);
  // Total: ~200ms (yang paling lama)

  return (
    <div>
      <h1>{user.name}</h1>
      {posts.map(post => <div key={post.id}>{post.title}</div>)}
    </div>
  );
}
```

Kalau salah satu fetch boleh gagal tanpa menggagalkan yang lain, pakai `Promise.allSettled`:

```tsx
const results = await Promise.allSettled([
  getUser(id),
  getUserPosts(id),
  getUserStats(id),
]);

// Cek hasil masing-masing
const user      = results[0].status === "fulfilled" ? results[0].value : null;
const posts     = results[1].status === "fulfilled" ? results[1].value : [];
const stats     = results[2].status === "fulfilled" ? results[2].value : null;
```

---

## 3. Caching & Revalidasi

Ini adalah bagian yang paling sering bikin bingung, tapi sangat penting untuk dipahami.

### 3.1 Default Behavior: Tidak ada cache di Next.js 15

Di **Next.js 15**, `fetch()` tidak di-cache secara default — setiap request ke halaman akan fetch ulang data dari API. Ini berbeda dari Next.js 13/14 yang cache secara default.

```tsx
// Next.js 15 — fetch tanpa opsi = tidak di-cache (seperti fetch biasa)
const data = await fetch("https://api.example.com/data");
// Setiap kali halaman diakses → fetch ulang dari API
```

### 3.2 Opsi `cache`

```tsx
// ── force-cache: Simpan di cache, pakai terus ─────────────────
// Cocok untuk: Data yang tidak berubah (konfigurasi, konten statis)
const config = await fetch("https://api.example.com/config", {
  cache: "force-cache",
});
// Request pertama: fetch dari API, simpan di cache
// Request berikutnya: ambil dari cache, tidak fetch lagi

// ── no-store: Jangan pernah cache ────────────────────────────
// Cocok untuk: Data yang harus selalu fresh (harga saham, cuaca realtime)
const prices = await fetch("https://api.example.com/prices", {
  cache: "no-store",
});
// Setiap request → selalu fetch dari API, tidak pernah pakai cache
```

### 3.3 `next.revalidate` — Time-Based Revalidation

Ini adalah ISR (Incremental Static Regeneration) untuk per-fetch:

```tsx
// Revalidasi setiap 60 detik
// Maksud: "Pakai cache selama 60 detik. Setelah itu, kalau ada request,
//          fetch ulang di background dan update cache."
const articles = await fetch("https://api.example.com/articles", {
  next: { revalidate: 60 },
});

// Revalidasi setiap 1 jam untuk data yang jarang berubah
const products = await fetch("https://api.example.com/products", {
  next: { revalidate: 3600 },
});

// Revalidasi setiap hari untuk konten semi-statis
const faq = await fetch("https://api.example.com/faq", {
  next: { revalidate: 86400 }, // 24 * 60 * 60 detik
});
```

### 3.4 `next.tags` — On-Demand Revalidation

Tag memungkinkan kamu invalidate cache secara spesifik (misal: setelah user update data):

```tsx
// app/blog/page.tsx
const posts = await fetch("https://api.example.com/posts", {
  next: {
    revalidate: 3600,
    tags: ["posts"],  // Tandai cache ini dengan tag "posts"
  },
});

// app/blog/[slug]/page.tsx
const post = await fetch(`https://api.example.com/posts/${slug}`, {
  next: {
    revalidate: 3600,
    tags: ["posts", `post-${slug}`], // Bisa punya beberapa tag
  },
});
```

```ts
// app/api/revalidate/route.ts — API route untuk trigger revalidasi
// Dipanggil dari webhook CMS ketika ada konten baru/diupdate
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json() as { tag?: string; secret?: string };

  // Validasi secret key untuk keamanan
  if (body.secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!body.tag) {
    return NextResponse.json({ error: "Tag diperlukan" }, { status: 400 });
  }

  // Invalidate semua cache yang punya tag ini
  revalidateTag(body.tag);

  return NextResponse.json({
    revalidated: true,
    tag:         body.tag,
    timestamp:   new Date().toISOString(),
  });
}
```

### 3.5 Ringkasan Pilihan Cache

| Opsi | Kapan dipakai | Contoh |
|---|---|---|
| Tanpa opsi (default Next.js 15) | Data harus fresh setiap request | User-specific data, real-time |
| `cache: "force-cache"` | Data tidak pernah/jarang berubah | Konfigurasi, halaman statis |
| `cache: "no-store"` | Data sensitif, tidak boleh di-cache | Data pribadi user, harga real-time |
| `next: { revalidate: N }` | Data berubah tapi tidak harus realtime | Artikel, produk, katalog |
| `next: { tags: [...] }` | Butuh invalidasi on-demand | CMS content, admin updates |

---

## 4. Loading State: loading.tsx dan Suspense

### 4.1 `loading.tsx` — Cara Paling Simpel

Buat file `loading.tsx` di folder yang sama dengan `page.tsx` — Next.js otomatis tampilkan ini saat page sedang loading:

```tsx
// app/posts/loading.tsx
// Tidak perlu konfigurasi, tidak perlu import — Next.js otomatis pakai ini

export default function PostsLoading() {
  return (
    <div className="space-y-4">
      {/* Skeleton loader — lebih baik dari spinner karena user tahu layout-nya */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-2 p-4 border border-gray-100 rounded-xl">
          <div className="h-5 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}
```

Di balik layar, Next.js membungkus `page.tsx` dengan React `<Suspense>` otomatis. Kamu tidak perlu tulis apapun di `page.tsx` — cukup bikin file `loading.tsx`.

### 4.2 `<Suspense>` Manual — Kontrol Lebih Detail

Kadang kamu ingin loading state yang lebih granular — misalnya, bagian atas halaman tampil duluan sementara bagian bawah masih loading:

```tsx
// app/dashboard/page.tsx
import { Suspense } from "react";
import RevenueChart    from "./RevenueChart";
import TopProducts     from "./TopProducts";
import RecentOrders    from "./RecentOrders";

// Skeleton components untuk masing-masing section
function ChartSkeleton() {
  return <div className="animate-pulse h-64 bg-gray-200 rounded-xl" />;
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-200 rounded" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>

      {/* Section ini loading independently — tidak blokir yang lain */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart /> {/* Server Component yang fetch datanya sendiri */}
      </Suspense>

      <div className="grid grid-cols-2 gap-6">
        <Suspense fallback={<TableSkeleton />}>
          <TopProducts />
        </Suspense>

        <Suspense fallback={<TableSkeleton />}>
          <RecentOrders />
        </Suspense>
      </div>
    </div>
  );
}
```

```tsx
// app/dashboard/RevenueChart.tsx — Server Component yang fetch datanya sendiri
import { getRevenue }  from "@/lib/api";

export default async function RevenueChart() {
  // Fetch ini terjadi "paralel" dengan TopProducts dan RecentOrders
  // berkat Suspense di atas — setiap component loading sendiri-sendiri
  const revenue = await getRevenue();

  return (
    <div>
      {/* render chart */}
    </div>
  );
}
```

> **Perbedaan `loading.tsx` vs `<Suspense>` manual:**
> - `loading.tsx` = satu loading state untuk seluruh halaman (otomatis)
> - `<Suspense>` manual = loading state per-section (perlu tulis sendiri, tapi lebih fleksibel)

---

## 5. Error Handling: error.tsx dan try/catch

### 5.1 `error.tsx` — Error Boundary Otomatis

Sama seperti `loading.tsx`, buat `error.tsx` di folder yang sama dengan `page.tsx`:

```tsx
// app/posts/error.tsx
// WAJIB "use client" — error.tsx selalu Client Component
// Alasannya: butuh state untuk retry, dan error bisa terjadi saat hydration

"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string }; // digest: server-side error ID untuk logging
  reset: () => void;                  // Coba render ulang segment ini
}

export default function PostsError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log ke error monitoring service (Sentry, Datadog, dll.)
    console.error("Posts page error:", error);
  }, [error]);

  // Tentukan pesan berdasarkan jenis error
  const isNetworkError   = error.message.includes("fetch") || error.message.includes("network");
  const isNotFoundError  = error.message.includes("404");
  const isServerError    = error.message.includes("500");

  const userMessage = isNetworkError
    ? "Koneksi bermasalah. Cek internet kamu."
    : isNotFoundError
    ? "Data tidak ditemukan."
    : isServerError
    ? "Server sedang bermasalah. Coba lagi nanti."
    : "Terjadi kesalahan yang tidak diharapkan.";

  return (
    <div className="text-center py-16 space-y-4">
      <p className="text-4xl">⚠️</p>
      <h2 className="text-xl font-semibold text-gray-800">Ups, Ada Masalah</h2>
      <p className="text-gray-500 max-w-sm mx-auto">{userMessage}</p>

      {/* Tombol retry — memanggil reset() yang mencoba render ulang */}
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Coba Lagi
      </button>

      {/* Info teknis untuk development */}
      {process.env.NODE_ENV === "development" && (
        <details className="mt-4 text-left max-w-lg mx-auto">
          <summary className="text-sm text-gray-400 cursor-pointer">Detail error (dev only)</summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto text-red-600">
            {error.message}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
```

### 5.2 try/catch di Server Component — Handle Gracefully

Kadang kamu tidak mau seluruh halaman crash karena satu bagian data gagal diambil. Gunakan try/catch untuk handle per-section:

```tsx
// app/profile/[id]/page.tsx
import { getUser, getUserPosts, getUserStats } from "@/lib/api";
import type { User, Post } from "@/types/post.types";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const userId = Number(id);

  // User data adalah wajib — kalau gagal, lempar error (tangkap oleh error.tsx)
  const user = await getUser(userId);

  // Posts dan stats adalah optional — kalau gagal, tampilkan fallback
  let posts: Post[] = [];
  let statsError     = false;

  try {
    posts = await getUserPosts(userId);
  } catch {
    // Gagal fetch posts — tidak crash halaman, tampilkan pesan
    posts = [];
  }

  try {
    // await getUserStats(userId);
  } catch {
    statsError = true;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>

      <section>
        <h2>Postingan</h2>
        {posts.length > 0 ? (
          posts.map(post => <div key={post.id}>{post.title}</div>)
        ) : (
          <p className="text-gray-500">Belum ada postingan atau gagal memuat.</p>
        )}
      </section>

      {statsError && (
        <p className="text-amber-600 text-sm">⚠️ Statistik tidak dapat dimuat saat ini.</p>
      )}
    </div>
  );
}
```

### 5.3 Hierarchy Error Handling

Error boundaries di Next.js bekerja dari dalam ke luar — error "naik" ke error.tsx terdekat:

```
app/
├── error.tsx          ← Tangkap error dari seluruh app (kecuali root layout)
├── layout.tsx
│
├── dashboard/
│   ├── error.tsx      ← Tangkap error dari route /dashboard/*
│   ├── layout.tsx
│   ├── page.tsx       ← Kalau ini throw error → error.tsx di folder ini yang handle
│   │
│   └── analytics/
│       ├── error.tsx  ← Tangkap error dari /dashboard/analytics saja
│       └── page.tsx
```

---

## 6. Fetch di Client Component

### 6.1 `useEffect` + `fetch` — Pendekatan Manual

```tsx
// components/LiveComments.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Comment } from "@/types/post.types";

interface LiveCommentsProps {
  postId: number;
}

// State untuk data async
interface FetchState<T> {
  data:      T | null;
  isLoading: boolean;
  error:     string | null;
}

export default function LiveComments({ postId }: LiveCommentsProps) {
  const [state, setState] = useState<FetchState<Comment[]>>({
    data:      null,
    isLoading: true,
    error:     null,
  });

  const fetchComments = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `https://jsonplaceholder.typicode.com/posts/${postId}/comments`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: Gagal memuat komentar`);
      }

      const comments = await response.json() as Comment[];

      setState({ data: comments, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      setState({ data: null, isLoading: false, error: message });
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Loading state
  if (state.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse space-y-1">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="text-center py-6">
        <p className="text-red-500 text-sm">{state.error}</p>
        <button
          onClick={fetchComments}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  // Empty state
  if (!state.data || state.data.length === 0) {
    return <p className="text-gray-500 text-sm">Belum ada komentar.</p>;
  }

  return (
    <ul className="space-y-3">
      {state.data.map(comment => (
        <li key={comment.id} className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700">{comment.name}</p>
          <p className="text-xs text-gray-400">{comment.email}</p>
          <p className="text-sm text-gray-600 mt-1">{comment.body}</p>
        </li>
      ))}
    </ul>
  );
}
```

Kode di atas berfungsi, tapi perhatikan betapa banyak boilerplate yang kita tulis: state management manual, error handling manual, loading state manual, retry logic... Bayangkan kalau ada puluhan komponen yang butuh ini.

### 6.2 Custom Hook untuk Reusability

Daripada duplikasi logika di setiap komponen, buat custom hook:

```tsx
// src/hooks/useFetch.ts
"use client"; // Hooks yang menggunakan useState/useEffect butuh ini

import { useState, useEffect, useCallback, useRef } from "react";

interface UseFetchState<T> {
  data:      T | null;
  isLoading: boolean;
  error:     string | null;
  refetch:   () => void;
}

export function useFetch<T>(url: string | null): UseFetchState<T> {
  const [data,      setData]      = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Pakai ref untuk hindari stale closure di refetch
  const urlRef = useRef(url);
  urlRef.current = url;

  const fetchData = useCallback(async (): Promise<void> => {
    const currentUrl = urlRef.current;
    if (!currentUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(currentUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json() as T;
      setData(json);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }, []); // Tidak ada deps — fetchData stabil

  useEffect(() => {
    fetchData();
  }, [url, fetchData]); // Re-fetch kalau URL berubah

  return { data, isLoading, error, refetch: fetchData };
}
```

Sekarang penggunaannya jauh lebih bersih:

```tsx
// components/UserCard.tsx
"use client";

import { useFetch } from "@/hooks/useFetch";
import type { User } from "@/types/post.types";

export default function UserCard({ userId }: { userId: number }) {
  const { data: user, isLoading, error } = useFetch<User>(
    `https://jsonplaceholder.typicode.com/users/${userId}`
  );

  if (isLoading) return <div className="animate-pulse h-24 bg-gray-200 rounded-xl" />;
  if (error)     return <p className="text-red-500">{error}</p>;
  if (!user)     return null;

  return (
    <div className="p-4 border rounded-xl">
      <h3 className="font-semibold">{user.name}</h3>
      <p className="text-sm text-gray-500">{user.email}</p>
    </div>
  );
}
```

---

## 7. SWR — Library untuk Client Fetching

Menulis `useFetch` sendiri itu bagus sebagai latihan, tapi di produksi kamu sebaiknya pakai library seperti **SWR** (dari Vercel) atau **TanStack Query** (React Query).

Kenapa? Karena ada banyak edge case yang sulit kamu handle sendiri:
- Deduplication: kalau 3 komponen fetch URL yang sama bersamaan, SWR hanya kirim 1 request
- Revalidation on focus: tab dibuka kembali → data di-refresh otomatis
- Optimistic updates
- Pagination & infinite scroll
- Cache management

### 7.1 Setup SWR

```bash
npm install swr
```

### 7.2 Penggunaan Dasar

```tsx
// Fungsi fetcher — SWR butuh fungsi ini, bisa definisikan satu untuk seluruh app
async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error("API Error") as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

// components/PostList.tsx
"use client";

import useSWR from "swr";
import type { Post } from "@/types/post.types";

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error("Fetch failed");
    return res.json() as Promise<Post[]>;
  });

export default function PostList() {
  const { data: posts, error, isLoading } = useSWR<Post[]>(
    "https://jsonplaceholder.typicode.com/posts",
    fetcher
  );

  if (isLoading) return <p>Loading...</p>;
  if (error)     return <p>Error: {error.message}</p>;
  if (!posts)    return null;

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### 7.3 SWR dengan Konfigurasi

```tsx
// src/lib/swr.ts — Konfigurasi global SWR

import type { SWRConfiguration } from "swr";

// Fetcher yang bisa dipakai di seluruh app
export async function defaultFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`) as Error & {
      status:     number;
      statusText: string;
    };
    err.status     = response.status;
    err.statusText = response.statusText;
    throw err;
  }

  return response.json() as Promise<T>;
}

// Konfigurasi default
export const swrConfig: SWRConfiguration = {
  fetcher:            defaultFetcher,
  revalidateOnFocus:  true,          // Refresh saat tab aktif kembali
  revalidateOnReconnect: true,       // Refresh saat koneksi kembali
  errorRetryCount:    3,             // Retry 3x sebelum menyerah
  dedupingInterval:   2000,          // Deduplicate request dalam window 2 detik
};
```

```tsx
// app/layout.tsx — Pasang SWR Provider di root
import { SWRConfig } from "swr";
import { swrConfig } from "@/lib/swr";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <SWRConfig value={swrConfig}>
          {children}
        </SWRConfig>
      </body>
    </html>
  );
}
```

### 7.4 SWR untuk Data yang Bergantung ke Data Lain

Pola umum: fetch user dulu, baru fetch postingan user itu berdasarkan userId:

```tsx
"use client";

import useSWR from "swr";
import type { User, Post } from "@/types/post.types";
import { defaultFetcher } from "@/lib/swr";

const BASE = "https://jsonplaceholder.typicode.com";

interface UserPostsProps {
  userId: number;
}

export default function UserPosts({ userId }: UserPostsProps) {
  // Fetch user dulu
  const { data: user } = useSWR<User>(`${BASE}/users/${userId}`, defaultFetcher);

  // Fetch posts HANYA kalau user sudah ada (conditional fetching)
  // Kalau key-nya null/undefined, SWR tidak fetch
  const { data: posts, isLoading, error } = useSWR<Post[]>(
    user ? `${BASE}/users/${user.id}/posts` : null,
    defaultFetcher
  );

  if (isLoading || !user) return <div className="animate-pulse h-8 bg-gray-200 rounded" />;
  if (error)              return <p className="text-red-500">{error.message}</p>;

  return (
    <div>
      <h2>Postingan oleh {user.name}</h2>
      {posts?.map(post => (
        <div key={post.id} className="p-3 border-b">
          {post.title}
        </div>
      ))}
    </div>
  );
}
```

### 7.5 SWR Mutation — Update Data & Optimistic UI

```tsx
"use client";

import useSWR, { useSWRConfig } from "swr";
import { useState } from "react";
import type { Post } from "@/types/post.types";
import { defaultFetcher } from "@/lib/swr";

const BASE = "https://jsonplaceholder.typicode.com";

export default function EditablePost({ postId }: { postId: number }) {
  const { mutate }              = useSWRConfig();
  const [isEditing, setEditing] = useState(false);
  const [title,     setTitle]   = useState("");

  const { data: post, isLoading } = useSWR<Post>(
    `${BASE}/posts/${postId}`,
    defaultFetcher,
    {
      onSuccess: (data) => {
        // Sync local state saat data pertama kali loaded
        if (!isEditing) setTitle(data.title);
      },
    }
  );

  const handleSave = async (): Promise<void> => {
    if (!post) return;

    // Optimistic update — update UI segera tanpa tunggu server
    const optimisticData: Post = { ...post, title };

    await mutate(
      `${BASE}/posts/${postId}`,
      async () => {
        // Kirim ke server
        const response = await fetch(`${BASE}/posts/${postId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ title }),
        });
        return response.json() as Promise<Post>;
      },
      {
        optimisticData,       // Tampilkan ini segera
        rollbackOnError: true, // Kalau gagal, kembalikan data lama
        revalidate:      true, // Fetch ulang dari server setelah selesai
      }
    );

    setEditing(false);
  };

  if (isLoading) return <div className="animate-pulse h-8 bg-gray-200 rounded" />;
  if (!post)     return null;

  return (
    <div className="p-4 border rounded-xl">
      {isEditing ? (
        <div className="space-y-2">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Simpan</button>
            <button onClick={() => setEditing(false)} className="px-3 py-1 border rounded text-sm">Batal</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{post.title}</h3>
          <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Edit</button>
        </div>
      )}
    </div>
  );
}
```

---

## 8. Kapan Pakai Server vs Client Fetch?

Ini adalah keputusan yang sering salah dibuat. Gunakan tabel ini sebagai panduan:

| Kondisi | Gunakan | Alasan |
|---|---|---|
| Konten halaman utama (artikel, produk, profil) | **Server fetch** | SEO, performance, tidak ada loading spinner |
| Data yang butuh auth/akses DB langsung | **Server fetch** | Credentials tidak bocor ke browser |
| Data statis atau jarang berubah | **Server fetch + cache** | Tidak perlu fetch setiap request |
| Data yang update realtime (feed, notif) | **Client fetch (SWR)** | SWR auto-refresh saat tab aktif |
| Data bergantung pada interaksi user (filter, search) | **Client fetch** | Tidak bisa diketahui saat server render |
| Infinite scroll / pagination dengan cursor | **Client fetch** | Butuh state untuk track "sudah load sampai mana" |
| Data privat per-user setelah login | **Client fetch** | Atau Server fetch dengan session check |
| Form submission → update daftar | **Server Action + revalidate** | Pola terbaru Next.js |

### Decision Tree

```
Data apa yang kamu mau fetch?
          │
          ├── Konten halaman (rendered on load)?
          │       │
          │       └── YA → Server Component + fetch()
          │                 │
          │                 ├── Butuh fresh setiap request? → cache: "no-store"
          │                 ├── Butuh update berkala?      → next: { revalidate: N }
          │                 └── Jarang berubah?            → cache: "force-cache"
          │
          ├── Data muncul setelah interaksi user?
          │       │
          │       └── YA → "use client" + SWR/useFetch
          │
          ├── Data realtime (polling/websocket)?
          │       │
          │       └── YA → "use client" + SWR (refreshInterval) / WebSocket
          │
          └── Bergantung pada state client (filter, search term)?
                  │
                  └── YA → "use client" + SWR dengan key dinamis
```

---

## 9. Mini Project: Halaman Berita dengan JSONPlaceholder

Kita bangun halaman `/news` yang:
- Fetch "berita" dari JSONPlaceholder (kita pakai posts sebagai simulasi)
- Punya loading state yang bagus
- Punya error handling yang nyata
- Halaman detail berita dengan dynamic route
- Komentar di detail berita yang di-fetch dari Client Component (untuk demonstrasi perbedaan)

### Struktur yang Akan Dibuat

```
app/
└── news/
    ├── page.tsx          ← List berita (Server Component, fetch posts)
    ├── loading.tsx       ← Skeleton saat halaman loading
    ├── error.tsx         ← Error boundary
    └── [id]/
        ├── page.tsx      ← Detail berita (Server Component)
        ├── loading.tsx
        └── error.tsx

components/
└── NewsComments/
    └── NewsComments.tsx  ← Client Component (demo client fetch)

src/
├── types/
│   └── news.types.ts
└── lib/
    └── news-api.ts
```

### Types

```ts
// src/types/news.types.ts

// Kita "reframe" JSONPlaceholder posts sebagai artikel berita
export interface NewsArticle {
  id:       number;
  title:    string;
  body:     string;
  userId:   number;
  // Field yang kita tambahkan sendiri untuk memperkaya tampilan
  category: NewsCategory;
  readTime: number;        // Estimasi menit baca
}

export type NewsCategory = "teknologi" | "bisnis" | "sains" | "olahraga" | "hiburan";

export interface NewsComment {
  id:     number;
  postId: number;
  name:   string;
  email:  string;
  body:   string;
}

export interface NewsAuthor {
  id:       number;
  name:     string;
  username: string;
  email:    string;
  company: { name: string };
}
```

### API Layer

```ts
// src/lib/news-api.ts
import type { NewsArticle, NewsComment, NewsAuthor, NewsCategory } from "@/types/news.types";

const BASE = "https://jsonplaceholder.typicode.com";

// Kategori berdasarkan modulo userId (simulasi)
const CATEGORIES: NewsCategory[] = ["teknologi", "bisnis", "sains", "olahraga", "hiburan"];

function getCategory(userId: number): NewsCategory {
  return CATEGORIES[userId % CATEGORIES.length];
}

// Estimasi waktu baca dari panjang teks
function estimateReadTime(body: string): number {
  const wordsPerMinute = 200;
  const words = body.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// Transform raw post menjadi NewsArticle
function toNewsArticle(raw: { id: number; title: string; body: string; userId: number }): NewsArticle {
  return {
    ...raw,
    category: getCategory(raw.userId),
    readTime: estimateReadTime(raw.body),
  };
}

// ── Fetch functions ───────────────────────────────────────────

export async function getNewsArticles(): Promise<NewsArticle[]> {
  const response = await fetch(`${BASE}/posts`, {
    next: { revalidate: 300 }, // Cache 5 menit
  });

  if (!response.ok) {
    throw new Error(`Gagal memuat berita: ${response.status} ${response.statusText}`);
  }

  const posts = await response.json() as Array<{ id: number; title: string; body: string; userId: number }>;
  return posts.slice(0, 20).map(toNewsArticle); // Ambil 20 artikel saja
}

export async function getNewsArticle(id: number): Promise<NewsArticle> {
  const response = await fetch(`${BASE}/posts/${id}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Artikel tidak ditemukan");
    }
    throw new Error(`Gagal memuat artikel: ${response.status}`);
  }

  const post = await response.json() as { id: number; title: string; body: string; userId: number };
  return toNewsArticle(post);
}

export async function getArticleComments(articleId: number): Promise<NewsComment[]> {
  const response = await fetch(`${BASE}/posts/${articleId}/comments`);

  if (!response.ok) {
    throw new Error("Gagal memuat komentar");
  }

  return response.json() as Promise<NewsComment[]>;
}

export async function getAuthor(userId: number): Promise<NewsAuthor> {
  const response = await fetch(`${BASE}/users/${userId}`, {
    next: { revalidate: 3600 }, // Cache 1 jam (data author jarang berubah)
  });

  if (!response.ok) {
    throw new Error("Gagal memuat data penulis");
  }

  return response.json() as Promise<NewsAuthor>;
}

// Untuk generateStaticParams
export async function getAllArticleIds(): Promise<number[]> {
  const articles = await getNewsArticles();
  return articles.map(a => a.id);
}
```

### Halaman News List

```tsx
// app/news/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getNewsArticles } from "@/lib/news-api";
import type { NewsCategory } from "@/types/news.types";

export const metadata: Metadata = {
  title:       "Berita Terkini",
  description: "Kumpulan berita teknologi, bisnis, sains, dan lebih banyak lagi.",
};

// Warna badge per kategori
const categoryStyles: Record<NewsCategory, string> = {
  teknologi: "bg-blue-100 text-blue-700",
  bisnis:    "bg-green-100 text-green-700",
  sains:     "bg-purple-100 text-purple-700",
  olahraga:  "bg-orange-100 text-orange-700",
  hiburan:   "bg-pink-100 text-pink-700",
};

export default async function NewsPage() {
  // Server Component — fetch langsung tanpa useEffect
  const articles = await getNewsArticles();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold">📰 Berita Terkini</h1>
        <p className="text-gray-500 mt-1">{articles.length} artikel tersedia</p>
      </div>

      {/* Article Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/news/${article.id}`}
            className="flex flex-col p-5 border border-gray-100 rounded-xl hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            {/* Category badge */}
            <span className={`self-start px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${categoryStyles[article.category]}`}>
              {article.category.charAt(0).toUpperCase() + article.category.slice(1)}
            </span>

            {/* Title */}
            <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
              {article.title}
            </h2>

            {/* Excerpt */}
            <p className="text-sm text-gray-500 line-clamp-2 flex-1">
              {article.body}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
              <span>⏱ {article.readTime} menit baca</span>
              <span>·</span>
              <span className="group-hover:text-blue-500">Baca selengkapnya →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### Loading Skeleton untuk News List

```tsx
// app/news/loading.tsx
export default function NewsLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="border-b pb-6 space-y-2 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse p-5 border border-gray-100 rounded-xl space-y-3">
            <div className="h-5 w-20 bg-gray-200 rounded-full" />
            <div className="space-y-1">
              <div className="h-5 bg-gray-200 rounded w-full" />
              <div className="h-5 bg-gray-200 rounded w-3/4" />
            </div>
            <div className="space-y-1">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Error handling untuk News

```tsx
// app/news/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function NewsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("News page error:", error);
  }, [error]);

  return (
    <div className="text-center py-20 space-y-4">
      <p className="text-5xl">📡</p>
      <h2 className="text-xl font-semibold">Gagal Memuat Berita</h2>
      <p className="text-gray-500 max-w-sm mx-auto text-sm">
        {error.message || "Terjadi kesalahan saat mengambil data berita."}
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
        <Link
          href="/"
          className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Ke Beranda
        </Link>
      </div>
    </div>
  );
}
```

### Client Component: Komentar Berita

```tsx
// components/NewsComments/NewsComments.tsx
// Ini adalah Client Component — demonstrasi fetch dari client
// Kenapa client? Karena kita ingin:
// 1. Komentar tidak perlu dirender saat page load (bukan prioritas utama)
// 2. User bisa expand/collapse komentar (butuh state)

"use client";

import { useState } from "react";
import useSWR from "swr";
import type { NewsComment } from "@/types/news.types";

interface NewsCommentsProps {
  articleId: number;
}

const fetcher = (url: string) =>
  fetch(url).then(res => res.json() as Promise<NewsComment[]>);

export default function NewsComments({ articleId }: NewsCommentsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // SWR tidak fetch sampai isOpen = true (conditional key)
  const { data: comments, isLoading, error } = useSWR<NewsComment[]>(
    isOpen
      ? `https://jsonplaceholder.typicode.com/posts/${articleId}/comments`
      : null,
    fetcher
  );

  return (
    <section className="mt-8 border-t pt-6">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
      >
        <span>{isOpen ? "▼" : "▶"}</span>
        <span>Komentar {comments ? `(${comments.length})` : ""}</span>
      </button>

      {/* Komentar section — hanya tampil kalau isOpen */}
      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="h-3 w-40 bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <p className="text-sm text-red-500 p-3 bg-red-50 rounded-lg">
              Gagal memuat komentar: {error.message}
            </p>
          )}

          {/* Empty state */}
          {comments && comments.length === 0 && (
            <p className="text-sm text-gray-500">Belum ada komentar.</p>
          )}

          {/* Comments list */}
          {comments && comments.length > 0 && (
            <ul className="space-y-3">
              {comments.map(comment => (
                <li key={comment.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{comment.name}</span>
                    <span className="text-xs text-gray-400">{comment.email}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
```

### Halaman News Detail

```tsx
// app/news/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNewsArticle, getAuthor, getAllArticleIds } from "@/lib/news-api";
import NewsComments from "@/components/NewsComments/NewsComments";
import type { NewsCategory } from "@/types/news.types";

interface NewsDetailPageProps {
  params: Promise<{ id: string }>;
}

// Metadata dinamis per artikel
export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const articleId = Number(id);

  if (isNaN(articleId)) return { title: "Artikel Tidak Valid" };

  try {
    const article = await getNewsArticle(articleId);
    return {
      title:       article.title,
      description: article.body.substring(0, 150) + "...",
    };
  } catch {
    return { title: "Artikel Tidak Ditemukan" };
  }
}

// Pre-generate halaman statis untuk semua artikel
export async function generateStaticParams() {
  const ids = await getAllArticleIds();
  return ids.map(id => ({ id: String(id) }));
}

const categoryLabels: Record<NewsCategory, string> = {
  teknologi: "💻 Teknologi",
  bisnis:    "💼 Bisnis",
  sains:     "🔬 Sains",
  olahraga:  "⚽ Olahraga",
  hiburan:   "🎬 Hiburan",
};

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const articleId = Number(id);

  // Validasi id
  if (isNaN(articleId) || articleId <= 0) {
    notFound();
  }

  // Fetch artikel dan penulis secara paralel
  // Kalau artikel tidak ada, getNewsArticle throw → error.tsx handle
  const [article, author] = await Promise.all([
    getNewsArticle(articleId),
    getNewsArticle(articleId).then(a => getAuthor(a.userId)).catch(() => null),
  ]);

  return (
    <article className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500" aria-label="breadcrumb">
        <ol className="flex items-center gap-2">
          <li><Link href="/" className="hover:text-gray-800">Home</Link></li>
          <li aria-hidden="true">›</li>
          <li><Link href="/news" className="hover:text-gray-800">Berita</Link></li>
          <li aria-hidden="true">›</li>
          <li className="text-gray-800 font-medium truncate max-w-[200px]">{article.title}</li>
        </ol>
      </nav>

      {/* Category */}
      <div>
        <span className="text-sm font-medium text-blue-600">
          {categoryLabels[article.category]}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold leading-tight">
        {article.title}
      </h1>

      {/* Meta */}
      <div className="flex items-center gap-3 text-sm text-gray-500 pb-4 border-b">
        {author && (
          <>
            <span className="font-medium text-gray-700">{author.name}</span>
            <span>·</span>
            <span>{author.company.name}</span>
            <span>·</span>
          </>
        )}
        <span>⏱ {article.readTime} menit baca</span>
      </div>

      {/* Body */}
      <div className="prose prose-gray max-w-none">
        {/* Paragraf artikel — di produksi nyata ini adalah konten Markdown yang di-parse */}
        {article.body.split(". ").map((sentence, idx) => (
          <p key={idx} className="text-gray-700 leading-relaxed mb-4">
            {sentence.trim()}{sentence.endsWith(".") ? "" : "."}
          </p>
        ))}
      </div>

      {/* Informasi penulis */}
      {author && (
        <aside className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Tentang Penulis</h3>
          <p className="font-medium">{author.name}</p>
          <p className="text-sm text-gray-500">{author.email} · {author.website}</p>
        </aside>
      )}

      {/* Komentar — Client Component, load lazy (hanya fetch saat user klik) */}
      {/* Ini adalah contoh komposisi Server + Client yang disebutkan di doc 06 */}
      <NewsComments articleId={articleId} />

      {/* Navigasi */}
      <div className="flex justify-between pt-6 border-t text-sm">
        <Link href="/news" className="text-blue-600 hover:underline">
          ← Semua Berita
        </Link>
        {articleId < 20 && (
          <Link href={`/news/${articleId + 1}`} className="text-blue-600 hover:underline">
            Artikel Berikutnya →
          </Link>
        )}
      </div>
    </article>
  );
}
```

### Loading & Error untuk Detail

```tsx
// app/news/[id]/loading.tsx
export default function NewsDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-4 bg-gray-200 rounded ${i % 2 === 0 ? "w-4" : "w-16"}`} />
        ))}
      </div>

      {/* Category skeleton */}
      <div className="h-5 w-28 bg-gray-200 rounded" />

      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-full" />
        <div className="h-8 bg-gray-200 rounded w-4/5" />
        <div className="h-8 bg-gray-200 rounded w-3/5" />
      </div>

      {/* Meta skeleton */}
      <div className="flex gap-3 pb-4 border-b">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-4 bg-gray-200 rounded" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>

      {/* Body skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${75 + Math.random() * 25}%` }} />
        ))}
      </div>
    </div>
  );
}
```

```tsx
// app/news/[id]/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function NewsDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isNotFound = error.message.includes("tidak ditemukan");

  return (
    <div className="text-center py-20 space-y-4">
      <p className="text-5xl">{isNotFound ? "🔍" : "⚠️"}</p>
      <h2 className="text-xl font-semibold">
        {isNotFound ? "Artikel Tidak Ditemukan" : "Gagal Memuat Artikel"}
      </h2>
      <p className="text-gray-500 text-sm max-w-sm mx-auto">{error.message}</p>
      <div className="flex gap-3 justify-center">
        {!isNotFound && (
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Coba Lagi
          </button>
        )}
        <Link
          href="/news"
          className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          ← Semua Berita
        </Link>
      </div>
    </div>
  );
}
```

### Jalankan dan Test

```bash
npm run dev
```

Route yang bisa ditest:
- `/news` → List berita, lihat skeleton saat load pertama
- `/news/1` → Detail artikel pertama
- `/news/1` → Scroll ke bawah, klik "Komentar" → demo client-side fetch dengan SWR
- `/news/99999` → 404 karena artikel tidak ada
- Matikan internet → reload → lihat error state (dengan `cache: "no-store"`)

---

## 10. Pola Lanjutan yang Perlu Kamu Tahu

### 10.1 Server Actions — Mutasi Data Tanpa API Route

Di Next.js 14+, kamu bisa tulis fungsi server langsung di component untuk handle form submission dan mutasi data:

```tsx
// app/news/submit/page.tsx
import { revalidateTag } from "next/cache";

// Tanda fungsi server action
async function submitArticle(formData: FormData): Promise<void> {
  "use server"; // ← Tandai sebagai Server Action

  const title = formData.get("title") as string;
  const body  = formData.get("body")  as string;

  // Ini jalan di server — boleh akses DB langsung
  await saveToDatabase({ title, body });

  // Invalidate cache berita setelah submit
  revalidateTag("news");

  // Redirect ke halaman berita
  // redirect("/news"); // import dari "next/navigation"
}

export default function SubmitArticlePage() {
  return (
    // action langsung pakai server action function
    <form action={submitArticle} className="space-y-4">
      <input name="title" placeholder="Judul artikel" className="w-full p-2 border rounded" />
      <textarea name="body" placeholder="Isi artikel" className="w-full p-2 border rounded h-32" />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
        Kirim
      </button>
    </form>
  );
}
```

### 10.2 Streaming dengan `<Suspense>` untuk Halaman Lambat

Kalau ada satu fetch yang sangat lambat, jangan biarkan dia memblokir seluruh halaman:

```tsx
// app/news/[id]/page.tsx
import { Suspense } from "react";
import ArticleContent  from "./ArticleContent";
import RelatedArticles from "./RelatedArticles"; // Ini bisa lambat

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;

  return (
    <div>
      {/* Konten utama — fast, tidak perlu Suspense */}
      <ArticleContent articleId={Number(id)} />

      {/* Related articles — boleh lambat, tidak blokir konten utama */}
      <Suspense fallback={<RelatedArticlesSkeleton />}>
        <RelatedArticles articleId={Number(id)} />
      </Suspense>
    </div>
  );
}
```

Next.js akan **stream** HTML ke browser — konten utama dikirim segera, `RelatedArticles` dikirim begitu selesai. User tidak perlu tunggu semuanya selesai.

### 10.3 Preloading — Antisipasi Data yang Dibutuhkan

```tsx
// src/lib/news-api.ts — tambahkan preload pattern

// Fungsi preload — panggil segera untuk mulai fetch di background
export function preloadArticle(id: number): void {
  // void berarti kita sengaja tidak await — cukup mulai fetch
  void getNewsArticle(id);
}
```

```tsx
// app/news/page.tsx — preload artikel pertama saat list dimuat
import { preloadArticle } from "@/lib/news-api";

export default async function NewsPage() {
  const articles = await getNewsArticles();

  // Preload artikel pertama — kemungkinan besar user akan klik itu
  if (articles[0]) preloadArticle(articles[0].id);

  return (/* render list */);
}
```

---

## Ringkasan

| Situasi | Solusi |
|---|---|
| Data untuk konten halaman | `async` Server Component + `fetch()` langsung |
| Data tidak berubah | `fetch(url, { cache: "force-cache" })` |
| Data update berkala | `fetch(url, { next: { revalidate: N } })` |
| Data selalu fresh | `fetch(url, { cache: "no-store" })` |
| Update after mutation | `revalidateTag("tag-name")` |
| Loading state satu halaman | `loading.tsx` |
| Loading state per-section | `<Suspense fallback={<Skeleton />}>` |
| Error handling | `error.tsx` + `try/catch` untuk graceful fallback |
| Client-side realtime data | SWR dengan `refreshInterval` |
| Data setelah interaksi user | SWR dengan conditional key (`null` sampai siap) |
| Form submission | Server Actions dengan `"use server"` |

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Next.js 15*
