# Next.js App Router dari Nol: TypeScript + React 18

> **Prerequisite:** Paham React dasar — component, props, hooks, useState/useEffect. Kalau belum, baca dulu [01_typescript-basics-for-react-dev.md](./01_typescript-basics-for-react-dev.md) sampai [03_react-hooks-typescript.md](./03_react-hooks-typescript.md).

---

## Daftar Isi

1. [Next.js vs React Biasa — Kenapa Ada Next.js?](#1-nextjs-vs-react-biasa--kenapa-ada-nextjs)
2. [App Router: Cara Berpikir Baru](#2-app-router-cara-berpikir-baru)
3. [Struktur Folder & File Conventions](#3-struktur-folder--file-conventions)
4. [Server Component vs Client Component](#4-server-component-vs-client-component)
5. [Navigasi: next/link dan useRouter](#5-navigasi-nextlink-dan-userouter)
6. [Optimasi Gambar: next/image](#6-optimasi-gambar-nextimage)
7. [Optimasi Font: next/font](#7-optimasi-font-nextfont)
8. [Mini Project: Personal Site dengan Dynamic Route](#8-mini-project-personal-site-dengan-dynamic-route)
9. [Kesalahan Umum yang Wajib Kamu Tahu](#9-kesalahan-umum-yang-wajib-kamu-tahu)

---

## 1. Next.js vs React Biasa — Kenapa Ada Next.js?

### Masalah React Biasa (Vite/CRA)

Kalau kamu build app dengan React + Vite, yang terjadi adalah:

1. Browser minta halaman → Server kirim satu file HTML **kosong** + bundel JS besar
2. Browser download JS → baru mulai render konten
3. Kalau JS-nya lambat di-download atau device-nya lemah → user lihat layar putih dulu

Ini disebut **Client-Side Rendering (CSR)**. Masalahnya:

```
Browser minta /products
    │
    ▼
Server: "Nih, index.html kosong + app.js (500KB)"
    │
    ▼                           ← User lihat layar putih di sini
Browser: download app.js (500ms–2s tergantung koneksi)
    │
    ▼
React mulai dieksekusi, fetch data ke API
    │
    ▼                           ← User masih lihat loading spinner
API response (200–500ms)
    │
    ▼
React render konten → user akhirnya lihat sesuatu
```

**Total time to content: 700ms–2.5 detik.** Di mobile dengan koneksi 4G yang pas-pasan? Bisa lebih lama.

Ada dua masalah lain yang lebih serius:

- **SEO buruk** — Google bot crawl sebelum JS selesai jalan, yang dia lihat cuma HTML kosong. Konten tidak terindex.
- **Performance** — Semua kode (termasuk yang besar seperti charting library) didownload walau user belum tentu pakai.

### Solusi Next.js

Next.js memberikan pilihan **bagaimana** kontenmu di-render:

| Strategi | Kapan dipakai | Contoh |
|---|---|---|
| **SSR** (Server-Side Rendering) | Data harus fresh setiap request | Dashboard user, feed realtime |
| **SSG** (Static Site Generation) | Data jarang berubah | Blog, landing page, docs |
| **ISR** (Incremental Static Regeneration) | Data berubah tapi tidak harus realtime | Product catalog, artikel berita |
| **CSR** (Client-Side Rendering) | Data sangat dinamis, tidak butuh SEO | Komentar, notifikasi |

Dengan Next.js, HTML digenerate **di server** sebelum dikirim ke browser. User langsung lihat konten, bot search engine langsung bisa baca — dan kamu tetap bisa pakai semua kemampuan React.

### Kenapa Next.js di Production?

Bayangkan kamu disuruh buat toko online. Requirement-nya:
- URL yang bagus dan bisa di-*bookmark* (`/products/sepatu-nike-air-max`)
- Muncul di Google
- Gambar produk yang cepat dan tidak boros bandwidth
- Font yang konsisten di semua halaman

Dengan React biasa, kamu perlu setup sendiri: React Router, React Helmet untuk meta tags, lazy loading gambar, font loading strategy, kode splitting... itu pekerjaan seminggu lebih.

Dengan Next.js, itu semua sudah ada. **Next.js adalah opinionated framework** — artinya dia sudah punya jawaban untuk masalah-masalah umum production.

---

## 2. App Router: Cara Berpikir Baru

Next.js 13+ memperkenalkan **App Router** — cara baru mendefinisikan routing yang berbeda dari Pages Router (versi lama).

### Konsep Fundamental: File System Routing

Di React + React Router, kamu definisikan route di kode:

```tsx
// React Router — definisi route manual
<Routes>
  <Route path="/"          element={<HomePage />} />
  <Route path="/about"     element={<AboutPage />} />
  <Route path="/blog/:id"  element={<BlogDetailPage />} />
</Routes>
```

Di Next.js App Router, **struktur folder = definisi route**:

```
app/
├── page.tsx          → /
├── about/
│   └── page.tsx      → /about
└── blog/
    ├── page.tsx      → /blog
    └── [id]/
        └── page.tsx  → /blog/123, /blog/hello-world, dll.
```

Tidak ada konfigurasi apapun — cukup buat folder dan file, Next.js langsung kenali sebagai route.

### Mental Model yang Benar

```
URL yang dikunjungi user
    │
    ▼
Next.js cocokkan dengan struktur folder di app/
    │
    ▼
Render layout.tsx paling luar (root layout)
    │
    ▼
Render layout.tsx di folder yang cocok (kalau ada)
    │
    ▼
Render page.tsx yang sesuai
    │
    ▼
Kirim HTML ke browser
```

Layout dibungkus dari luar ke dalam — seperti matryoshka doll (boneka Rusia yang bersarang). Setiap segment URL bisa punya layout-nya sendiri.

---

## 3. Struktur Folder & File Conventions

### Struktur Lengkap

```
my-app/
├── app/                      ← Semua halaman dan layout ada di sini
│   ├── layout.tsx            ← ROOT LAYOUT — wajib ada, berlaku untuk semua halaman
│   ├── page.tsx              ← Halaman /
│   ├── globals.css
│   │
│   ├── about/
│   │   └── page.tsx          ← Halaman /about
│   │
│   ├── blog/
│   │   ├── layout.tsx        ← Layout khusus untuk semua halaman di /blog/*
│   │   ├── page.tsx          ← Halaman /blog
│   │   └── [slug]/
│   │       ├── page.tsx      ← Halaman /blog/[slug]
│   │       └── loading.tsx   ← Loading state khusus untuk route ini
│   │
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx          ← Halaman /dashboard
│   │   ├── loading.tsx       ← Loading state untuk /dashboard
│   │   └── error.tsx         ← Error boundary untuk /dashboard
│   │
│   └── not-found.tsx         ← Halaman 404 custom
│
├── components/               ← Shared components (tidak di folder app/)
│   ├── Navbar/
│   └── Footer/
│
├── lib/                      ← Utility functions, API calls
│   └── api.ts
│
├── types/                    ← TypeScript interfaces
│   └── index.ts
│
├── public/                   ← File statis (gambar, font jika manual)
│
├── next.config.ts
├── tsconfig.json
└── package.json
```

### File Conventions: Penjelasan Satu per Satu

#### `layout.tsx` — Pembungkus yang Persisten

```tsx
// app/layout.tsx — Root Layout (WAJIB ADA)
// File ini TIDAK di-unmount saat navigasi antar halaman
// Cocok untuk: Navbar, Footer, Provider (Theme, Auth, dll.)

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// Metadata — digunakan Next.js untuk generate <head> tag
export const metadata: Metadata = {
  title: {
    template: "%s | My App",   // %s diganti dengan title tiap halaman
    default:  "My App",        // Fallback kalau halaman tidak set title
  },
  description: "Deskripsi default aplikasi",
};

// Props children: konten halaman aktif akan di-inject di sini
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <header>
          {/* Navbar di sini — tampil di semua halaman */}
        </header>
        <main>{children}</main>
        <footer>
          {/* Footer di sini */}
        </footer>
      </body>
    </html>
  );
}
```

> **Aturan:** Root layout (`app/layout.tsx`) WAJIB ada dan WAJIB punya tag `<html>` dan `<body>`. Nested layout (di subfolder) tidak perlu itu.

#### `page.tsx` — Halaman yang Dapat Diakses

```tsx
// app/page.tsx — Halaman /
// Hanya file page.tsx yang otomatis jadi URL yang bisa diakses
// Nama file lain di folder app/ (selain conventions) tidak jadi URL

// Metadata per-halaman — override metadata dari root layout
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",  // Hasilnya: "Home | My App" (dari template di root layout)
};

// Server Component by default — boleh async!
export default async function HomePage() {
  // Bisa fetch data di sini, langsung di component
  // Tidak perlu useEffect + useState untuk data fetching
  const data = await fetch("https://api.example.com/featured");
  const featured = await data.json();

  return (
    <div>
      <h1>Selamat Datang</h1>
      {/* render featured */}
    </div>
  );
}
```

#### `loading.tsx` — Loading UI yang Otomatis

```tsx
// app/blog/[slug]/loading.tsx
// File ini OTOMATIS ditampilkan sementara page.tsx masih loading (Suspense)
// Tidak perlu konfigurasi apapun — cukup buat file ini

export default function BlogPostLoading() {
  // Tampilkan skeleton atau spinner
  return (
    <div className="animate-pulse">
      <div className="h-8 w-3/4 bg-gray-200 rounded mb-4" />
      <div className="h-4 w-full bg-gray-200 rounded mb-2" />
      <div className="h-4 w-full bg-gray-200 rounded mb-2" />
      <div className="h-4 w-2/3 bg-gray-200 rounded" />
    </div>
  );
}
```

#### `error.tsx` — Error Boundary Otomatis

```tsx
// app/dashboard/error.tsx
// Ditampilkan kalau page.tsx atau komponen di dalamnya throw error
// HARUS "use client" karena butuh useState/useEffect untuk error recovery

"use client";

import { useEffect } from "react";

interface ErrorProps {
  error:  Error & { digest?: string }; // digest = server error ID untuk logging
  reset: () => void;                   // Coba render ulang segment ini
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error ke monitoring service (Sentry, dll.)
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="error-container">
      <h2>Ada yang Salah di Dashboard</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Coba Lagi</button>
    </div>
  );
}
```

#### `not-found.tsx` — Halaman 404 Custom

```tsx
// app/not-found.tsx — Tampil untuk semua route yang tidak ditemukan
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div>
      <h1>404 — Halaman Tidak Ditemukan</h1>
      <p>Kayaknya kamu nyasar nih.</p>
      <Link href="/">Balik ke Home</Link>
    </div>
  );
}
```

Kamu juga bisa trigger 404 secara programatis dari page:

```tsx
// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  // Kalau data tidak ada, panggil notFound()
  // Next.js akan render not-found.tsx terdekat
  if (!post) notFound();

  return <article>{/* ... */}</article>;
}
```

#### Dynamic Routes — Folder dengan `[bracket]`

```
app/
├── blog/
│   └── [slug]/
│       └── page.tsx    → /blog/hello-world, /blog/belajar-nextjs
│
├── shop/
│   └── [category]/
│       └── [product]/
│           └── page.tsx → /shop/electronics/laptop-asus
│
└── docs/
    └── [...slug]/
        └── page.tsx    → /docs/a, /docs/a/b, /docs/a/b/c (catch-all)
```

```tsx
// app/blog/[slug]/page.tsx
// params adalah Promise di Next.js 15+ (breaking change)

interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPost({ params }: BlogPostProps) {
  const { slug } = await params;  // Wajib await di Next.js 15+

  return <h1>Post: {slug}</h1>;
}

// Generate static paths untuk SSG
// Kalau tidak define ini, halaman di-render secara dinamis (SSR)
export async function generateStaticParams() {
  const posts = await getAllPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}
```

---

## 4. Server Component vs Client Component

Ini adalah konsep paling **krusial** di App Router. Banyak developer bingung di sini, jadi mari kita bedah dengan sangat jelas.

### Default: Server Component

Semua component di folder `app/` adalah **Server Component** secara default. Artinya, mereka di-render di server — **bukan** di browser user.

```tsx
// app/page.tsx — ini adalah Server Component
// Kode ini TIDAK berjalan di browser user
// Kode ini berjalan di server Next.js

export default async function HomePage() {
  // ✅ Boleh: akses langsung ke database
  // ✅ Boleh: baca environment variable sensitif
  // ✅ Boleh: async/await tanpa useEffect
  // ✅ Boleh: import library besar yang tidak perlu di browser

  const posts = await db.query("SELECT * FROM posts LIMIT 10");

  return (
    <main>
      {posts.map(post => <div key={post.id}>{post.title}</div>)}
    </main>
  );
}
```

### "use client" — Client Component

Tambahkan `"use client"` di baris pertama file untuk menandai component sebagai Client Component:

```tsx
// components/Counter.tsx
"use client"; // ← Tandai sebagai Client Component

import { useState } from "react";

export default function Counter() {
  // ✅ Boleh: useState, useEffect, useRef, hooks lain
  // ✅ Boleh: event handlers (onClick, onChange, dll.)
  // ✅ Boleh: akses browser APIs (window, document, localStorage)
  // ✅ Boleh: CSS animations yang butuh JS

  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

### Perbandingan Lengkap

| | Server Component | Client Component |
|---|---|---|
| **Directive** | Tidak perlu (default) | `"use client"` di baris pertama |
| **Render** | Di server Next.js | Di browser user |
| **Hooks** | ❌ Tidak bisa | ✅ useState, useEffect, dll. |
| **Event handlers** | ❌ Tidak bisa | ✅ onClick, onChange, dll. |
| **Browser APIs** | ❌ Tidak bisa (tidak ada `window`) | ✅ window, localStorage, dll. |
| **async/await** | ✅ Langsung di component | ❌ Butuh useEffect |
| **Database access** | ✅ Langsung (tidak expose ke browser) | ❌ Butuh API route |
| **Env sensitif** | ✅ Aman (tidak dikirim ke browser) | ❌ Hanya `NEXT_PUBLIC_` yang aman |
| **Bundle size** | ✅ 0 JS ke browser | Menambah JS bundle |

### Cara Memilih dengan Benar

Gunakan **Server Component** kalau:
- Fetch data dari database atau API
- Akses sistem file
- Baca environment variable sensitif
- Komponen yang murni statis (tidak ada interaksi)
- Komponen yang ingin kamu sembunyikan logikanya dari client

Gunakan **"use client"** kalau:
- Butuh `useState`, `useReducer`, `useContext`
- Butuh `useEffect`, `useLayoutEffect`, `useRef`
- Ada event listener (`onClick`, `onChange`, `onSubmit`, dll.)
- Butuh akses ke browser API (`window`, `navigator`, `localStorage`)
- Butuh library UI yang dependent ke browser (banyak komponen dari library UI pihak ketiga)

### Pola Komposisi Server + Client

Pola yang sering dipakai: fetch data di Server Component, kasih ke Client Component sebagai props.

```tsx
// app/dashboard/page.tsx — SERVER COMPONENT
// Fetch data di sini, tanpa hook
import StatsChart from "@/components/StatsChart"; // Client Component

export default async function DashboardPage() {
  // Ini jalan di server — aman, tidak ada "waterfall" request
  const stats = await fetchStats(); // langsung ke database

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Passing data sebagai props ke Client Component */}
      <StatsChart data={stats} />
    </div>
  );
}
```

```tsx
// components/StatsChart.tsx — CLIENT COMPONENT
"use client";

import { useState } from "react";
import { BarChart } from "recharts"; // Library charting yang butuh browser

interface StatsChartProps {
  data: StatsData[]; // Data sudah diambil di server
}

export default function StatsChart({ data }: StatsChartProps) {
  const [activeMonth, setActiveMonth] = useState<string | null>(null);

  return (
    <BarChart data={data} onClick={(e) => setActiveMonth(e.activeLabel ?? null)}>
      {/* chart config */}
    </BarChart>
  );
}
```

> **Aturan emas:** Push `"use client"` ke komponen **sedalam mungkin** di component tree. Kalau hanya satu tombol yang butuh `onClick`, jangan jadikan seluruh halaman Client Component — pisahkan tombolnya ke komponen tersendiri.

### Misconception yang Sering Terjadi

```tsx
// ❌ SALAH: Orang sering pikir semua komponen butuh "use client"
// karena terbiasa dengan React biasa

"use client"; // ← Ini tidak perlu!

// Komponen ini tidak pakai hooks, tidak ada event handler
// Dia just render data statis
export default function UserProfile({ name, bio }: { name: string; bio: string }) {
  return (
    <div>
      <h2>{name}</h2>
      <p>{bio}</p>
    </div>
  );
}
```

```tsx
// ✅ BENAR: Tanpa "use client" karena memang tidak butuh

export default function UserProfile({ name, bio }: { name: string; bio: string }) {
  return (
    <div>
      <h2>{name}</h2>
      <p>{bio}</p>
    </div>
  );
}
// Komponen ini di-render di server, hasilnya adalah HTML statis — lebih cepat
```

---

## 5. Navigasi: next/link dan useRouter

### `<Link>` — Navigasi Antar Halaman

Jangan pakai `<a href="...">` untuk navigasi internal. Pakailah `<Link>` dari `next/link`:

```tsx
// ✅ Gunakan Link untuk navigasi internal
import Link from "next/link";

export default function Navbar() {
  return (
    <nav>
      {/* Link biasa */}
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/blog">Blog</Link>

      {/* Link dengan object — berguna untuk dynamic routes */}
      <Link href={{ pathname: "/blog/[slug]", query: { slug: "hello-world" } }}>
        Post Pertama
      </Link>

      {/* Link dengan query string */}
      <Link href="/search?category=tech&page=2">Teknologi</Link>

      {/* Styling active link — pakai CSS atau usePathname */}
    </nav>
  );
}
```

**Kenapa Link, bukan `<a>`?**
- `<Link>` melakukan **prefetching** — saat link terlihat di viewport, Next.js sudah mulai preload halaman tujuan di background. Ketika user klik, halaman nyaris instan.
- `<a href>` menyebabkan full page reload — seluruh aplikasi di-reload dari awal.

### Active Link dengan `usePathname`

```tsx
// components/Navbar/Navbar.tsx
"use client"; // usePathname adalah hook → butuh Client Component

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/",       label: "Home"  },
  { href: "/about",  label: "About" },
  { href: "/blog",   label: "Blog"  },
];

export default function Navbar() {
  const pathname = usePathname(); // Contoh nilai: "/about"

  return (
    <nav>
      {navLinks.map(({ href, label }) => {
        // Cek apakah route ini yang sedang aktif
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            className={isActive ? "nav-link nav-link--active" : "nav-link"}
            aria-current={isActive ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

### `useRouter` — Navigasi Programatis

Untuk navigasi yang dipicu oleh kode (bukan klik user), gunakan `useRouter`:

```tsx
// components/SearchForm.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation"; // Bukan dari "next/router"!

export default function SearchForm() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (query.trim()) {
      // Navigasi programatis ke halaman search
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari..."
      />
      <button type="submit">Cari</button>
    </form>
  );
}
```

**Method `useRouter` yang sering dipakai:**

| Method | Kegunaan |
|---|---|
| `router.push("/path")` | Navigasi ke halaman baru, tambah ke history |
| `router.replace("/path")` | Navigasi ke halaman baru, **ganti** history (tidak bisa back) |
| `router.back()` | Kembali ke halaman sebelumnya |
| `router.forward()` | Maju ke halaman berikutnya |
| `router.refresh()` | Refresh data halaman tanpa full reload |
| `router.prefetch("/path")` | Preload halaman secara manual |

### `useSearchParams` — Baca Query String

```tsx
// app/search/page.tsx tapi versi Client Component-nya
"use client";

import { useSearchParams } from "next/navigation";

export default function SearchResults() {
  const searchParams = useSearchParams();

  const query    = searchParams.get("q")        ?? "";
  const category = searchParams.get("category") ?? "all";
  const page     = Number(searchParams.get("page") ?? "1");

  return (
    <div>
      <p>Hasil pencarian untuk: <strong>{query}</strong></p>
      <p>Kategori: {category} | Halaman: {page}</p>
    </div>
  );
}
```

Kalau halaman-mu adalah Server Component, baca params dari props langsung:

```tsx
// app/search/page.tsx — SERVER COMPONENT
interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "", category = "all", page = "1" } = await searchParams;

  // Langsung fetch dengan params
  const results = await searchProducts({ q, category, page: Number(page) });

  return (
    <div>
      <p>Hasil untuk: {q}</p>
      {/* render results */}
    </div>
  );
}
```

---

## 6. Optimasi Gambar: next/image

`<img>` standar HTML itu "bodoh" — dia load gambar dengan ukuran aslinya (mungkin 4MB), tidak peduli device user pakai layar kecil.

`next/image` adalah solusinya:

```tsx
import Image from "next/image";

// ── Gambar dengan dimensi diketahui ───────────────────────────
function ProductCard() {
  return (
    <div className="card">
      <Image
        src="/images/product.jpg"   // Gambar lokal dari folder public/
        alt="Deskripsi gambar yang bermakna"
        width={400}                 // ← Wajib untuk gambar lokal
        height={300}                // ← Wajib untuk gambar lokal
        // Fitur otomatis:
        // - Resize ke ukuran yang sesuai (tidak load 1MB untuk thumbnail)
        // - Convert ke WebP/AVIF (format modern, 2–3x lebih kecil)
        // - Lazy loading (tidak load sebelum terlihat di viewport)
        // - Prevent layout shift (browser tahu ukurannya sebelum load)
      />
    </div>
  );
}

// ── Gambar yang memenuhi container ────────────────────────────
function HeroSection() {
  return (
    <div className="relative h-[500px]">
      <Image
        src="/images/hero.jpg"
        alt="Hero image"
        fill                        // Memenuhi parent container
        className="object-cover"    // Seperti CSS object-fit: cover
        priority                    // Load segera (tidak lazy) — untuk above the fold
        sizes="100vw"               // Hint untuk browser: gambar selebar viewport
      />
    </div>
  );
}

// ── Gambar dari domain external ───────────────────────────────
function UserAvatar({ avatarUrl }: { avatarUrl: string }) {
  return (
    <Image
      src={avatarUrl}               // URL dari CDN atau server lain
      alt="Foto profil"
      width={48}
      height={48}
      className="rounded-full"
    />
  );
}
```

Untuk gambar dari domain external, kamu perlu whitelist domain-nya di `next.config.ts`:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",  // GitHub avatars
      },
      {
        protocol: "https",
        hostname: "*.cloudinary.com",               // Cloudinary (wildcard)
      },
    ],
  },
};

export default nextConfig;
```

### Props `sizes` yang Penting

```tsx
// Tanpa sizes: browser download gambar ukuran terbesar yang ada
// Dengan sizes: browser download yang sesuai dengan ukuran tampilannya

<Image
  src="/images/article-thumbnail.jpg"
  alt="Thumbnail artikel"
  fill
  // "Di layar kecil (<768px): gambar lebar 100% viewport.
  //  Di layar sedang (<1200px): gambar lebar 50% viewport.
  //  Di layar besar: gambar lebar 33% viewport."
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>
```

---

## 7. Optimasi Font: next/font

Loading font dengan cara manual (pakai `<link>` di `<head>`) itu punya masalah: font didownload dari Google Fonts pada runtime → lambat + privacy concern (request ke server Google).

`next/font` mendownload font pada **build time** dan serve dari server kamu sendiri:

```tsx
// app/layout.tsx
import { Inter, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";

// Konfigurasi font — Next.js download dan optimize saat build
const inter = Inter({
  subsets: ["latin"],
  // Hanya muat varian yang dipakai (irit bandwidth)
  variable: "--font-inter",         // CSS variable — berguna kalau pakai CSS/Tailwind
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],           // Font weight yang dibutuhkan
  style:  ["normal", "italic"],
  variable: "--font-playfair",
});

// Font lokal (dari folder public/ atau font/)
const geist = localFont({
  src: [
    { path: "../public/fonts/Geist-Regular.woff2",  weight: "400" },
    { path: "../public/fonts/Geist-SemiBold.woff2", weight: "600" },
    { path: "../public/fonts/Geist-Bold.woff2",     weight: "700" },
  ],
  variable: "--font-geist",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Pasang CSS variable di <html> supaya bisa dipakai di mana saja
    <html lang="id" className={`${inter.variable} ${playfair.variable} ${geist.variable}`}>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

Pakai di CSS:

```css
/* app/globals.css */
:root {
  --font-inter:     var(--font-inter);
  --font-playfair:  var(--font-playfair);
}

h1, h2, h3 {
  font-family: var(--font-playfair);
}

body {
  font-family: var(--font-inter);
}
```

Atau langsung di Tailwind config:

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-inter)"],
        display: ["var(--font-playfair)"],
      },
    },
  },
} satisfies Config;
```

---

## 8. Mini Project: Personal Site dengan Dynamic Route

Kita bangun site sederhana yang punya:
- **Halaman Home** — dengan daftar artikel
- **Halaman About** — profil singkat
- **Halaman Blog** — list semua postingan
- **Halaman Blog Detail** — dynamic route `/blog/[slug]`
- Root layout dengan Navbar
- Metadata yang proper

### Setup Project

```bash
npx create-next-app@latest personal-site --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd personal-site
```

> Jawab semua prompt dengan Yes/default. Flag `--app` memastikan kamu pakai App Router.

### Types

```ts
// src/types/index.ts

export interface Post {
  slug:        string;
  title:       string;
  excerpt:     string;
  content:     string;
  publishedAt: string;   // ISO date string: "2026-02-23"
  tags:        string[];
  author:      string;
  readingTime: number;   // Dalam menit
}
```

### Data (Mock)

```ts
// src/lib/posts.ts
// Di produksi nyata, ini bisa fetch dari Contentful, Sanity, atau filesystem
import type { Post } from "@/types";

const posts: Post[] = [
  {
    slug:        "belajar-nextjs-dari-nol",
    title:       "Belajar Next.js dari Nol: Panduan 2026",
    excerpt:     "Next.js adalah framework React yang paling banyak dipakai di production. Ini alasannya.",
    content:     `# Belajar Next.js dari Nol\n\nNext.js memberikan...`,
    publishedAt: "2026-02-23",
    tags:        ["nextjs", "react", "typescript"],
    author:      "Kamu",
    readingTime: 8,
  },
  {
    slug:        "typescript-tips-2026",
    title:       "10 TypeScript Tips yang Bikin Kamu Produktif",
    excerpt:     "Trik-trik TypeScript yang sering diabaikan tapi sangat berguna.",
    content:     `# TypeScript Tips\n\nDi artikel ini...`,
    publishedAt: "2026-02-15",
    tags:        ["typescript"],
    author:      "Kamu",
    readingTime: 5,
  },
  {
    slug:        "react-hooks-deep-dive",
    title:       "Deep Dive: React Hooks yang Jarang Dibahas",
    excerpt:     "useReducer, useImperativeHandle, useSyncExternalStore — kapan dan kenapa dipakai.",
    content:     `# Deep Dive React Hooks\n\nSelain useState...`,
    publishedAt: "2026-02-10",
    tags:        ["react", "hooks"],
    author:      "Kamu",
    readingTime: 12,
  },
];

// Getter functions — simulasi async DB query
export async function getAllPosts(): Promise<Post[]> {
  return posts;
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  return posts.find((p) => p.slug === slug);
}

export async function getRecentPosts(count = 3): Promise<Post[]> {
  return posts.slice(0, count);
}
```

### Root Layout dengan Navbar

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import "./globals.css";

const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets:  ["latin"],
  weight:   ["700"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Personal Site",
    default:  "Personal Site",
  },
  description: "Tulisan-tulisan tentang web development.",
  authors:     [{ name: "Kamu" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col bg-white text-gray-900 antialiased">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

```tsx
// src/components/Navbar/Navbar.tsx
"use client"; // Butuh usePathname

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",     label: "Home"  },
  { href: "/blog", label: "Blog"  },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-100">
      <nav className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link href="/" className="font-bold text-xl font-[family-name:var(--font-playfair)]">
          Personal<span className="text-blue-600">.</span>
        </Link>

        {/* Nav Links */}
        <ul className="flex gap-6 text-sm font-medium">
          {links.map(({ href, label }) => {
            const isActive =
              href === "/"
                ? pathname === "/"          // Home hanya aktif di /
                : pathname.startsWith(href); // Blog aktif di /blog, /blog/slug, dll.

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={
                    isActive
                      ? "text-blue-600 font-semibold"
                      : "text-gray-600 hover:text-gray-900 transition-colors"
                  }
                  aria-current={isActive ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
```

```tsx
// src/components/Footer/Footer.tsx
// Tidak ada interaktivitas → Server Component (tidak perlu "use client")

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-500">
      <p>© {year} Personal Site. Dibuat dengan Next.js & TypeScript.</p>
    </footer>
  );
}
```

### Halaman Home

```tsx
// src/app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getRecentPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Home",
};

// Server Component — fetch data langsung
export default async function HomePage() {
  const recentPosts = await getRecentPosts(3);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 space-y-4">
        <p className="text-4xl">👋</p>
        <h1 className="text-4xl font-bold font-[family-name:var(--font-playfair)]">
          Halo, saya Kamu!
        </h1>
        <p className="text-gray-600 text-lg max-w-xl mx-auto">
          Developer yang suka nulis tentang React, TypeScript, dan hal-hal teknis lain
          yang kadang bikin frustrasi — tapi akhirnya berhasil.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/blog"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Baca Tulisan
          </Link>
          <Link
            href="/about"
            className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Tentang Saya
          </Link>
        </div>
      </section>

      {/* Recent Posts */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Tulisan Terbaru</h2>
          <Link href="/blog" className="text-sm text-blue-600 hover:underline">
            Lihat semua →
          </Link>
        </div>

        <div className="space-y-4">
          {recentPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block p-5 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-semibold group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {post.excerpt}
                  </p>
                </div>
                <span className="text-gray-400 shrink-0 mt-0.5">→</span>
              </div>
              <div className="flex gap-3 mt-3 text-xs text-gray-400">
                <span>{post.publishedAt}</span>
                <span>·</span>
                <span>{post.readingTime} menit baca</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
```

### Halaman About

```tsx
// src/app/about/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:       "About",
  description: "Tentang saya dan apa yang saya kerjakan.",
};

// Server Component — tidak ada interaktivitas, tidak perlu "use client"
export default function AboutPage() {
  const skills = [
    "TypeScript", "React", "Next.js", "Node.js",
    "PostgreSQL", "Git", "Docker",
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)]">
          Tentang Saya
        </h1>
        <p className="text-gray-600 leading-relaxed">
          Saya seorang web developer yang sudah 3 tahun bekerja di industri ini.
          Saya suka membangun produk yang cepat, accessible, dan mudah dipakai.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Di luar coding, saya suka main sepeda gunung dan sesekali nulis tentang
          hal-hal teknis yang saya pelajari.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Kontak</h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="text-gray-500">Twitter/X:</span>{" "}
            <a href="https://twitter.com" className="text-blue-600 hover:underline">
              @username
            </a>
          </p>
          <p>
            <span className="text-gray-500">GitHub:</span>{" "}
            <a href="https://github.com" className="text-blue-600 hover:underline">
              github.com/username
            </a>
          </p>
          <p>
            <span className="text-gray-500">Email:</span>{" "}
            <a href="mailto:me@example.com" className="text-blue-600 hover:underline">
              me@example.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
```

### Halaman Blog List

```tsx
// src/app/blog/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title:       "Blog",
  description: "Semua tulisan tentang web development.",
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)]">
          Blog
        </h1>
        <p className="text-gray-500">
          {posts.length} tulisan tentang web development, React, TypeScript, dan lain-lain.
        </p>
      </div>

      <div className="space-y-0 divide-y divide-gray-100">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="flex items-start justify-between gap-4 py-5 group hover:bg-gray-50 -mx-3 px-3 rounded-lg transition-colors"
          >
            <div className="space-y-1 min-w-0">
              <h2 className="font-semibold group-hover:text-blue-600 transition-colors truncate">
                {post.title}
              </h2>
              <p className="text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <time dateTime={post.publishedAt}>{post.publishedAt}</time>
                <span>·</span>
                <span>{post.readingTime} menit</span>
                <span>·</span>
                <div className="flex gap-1">
                  {post.tags.map((tag) => (
                    <span key={tag} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <span className="text-gray-400 shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

### Halaman Blog Detail (Dynamic Route)

```tsx
// src/app/blog/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

// ── Props dari dynamic route ──────────────────────────────────
interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// ── Metadata dinamis ──────────────────────────────────────────
// generateMetadata dipanggil untuk setiap halaman dynamic
// Ini yang bikin setiap halaman blog punya meta title & description sendiri
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: "Tidak Ditemukan" };
  }

  return {
    title:       post.title,
    description: post.excerpt,
    authors:     [{ name: post.author }],
    openGraph: {
      title:       post.title,
      description: post.excerpt,
      type:        "article",
      publishedTime: post.publishedAt,
    },
  };
}

// ── Static Generation ─────────────────────────────────────────
// Beritahu Next.js slug apa saja yang perlu di-pre-render
// Kalau ini tidak ada, Next.js render secara dinamis saat request masuk
export async function generateStaticParams() {
  const posts = await getAllPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// ── Page Component ────────────────────────────────────────────
export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  // Kalau post tidak ada → render halaman 404
  if (!post) notFound();

  return (
    <article className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link href="/blog" className="hover:text-gray-900 transition-colors">Blog</Link>
            </li>
            <li aria-hidden="true">›</li>
            <li className="text-gray-900 font-medium truncate">{post.title}</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold font-[family-name:var(--font-playfair)] leading-tight">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{post.author}</span>
          <span>·</span>
          <time dateTime={post.publishedAt}>{post.publishedAt}</time>
          <span>·</span>
          <span>{post.readingTime} menit baca</span>
        </div>

        {/* Tags */}
        <div className="flex gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      </header>

      {/* Content */}
      {/* Di produksi nyata, content Markdown perlu di-parse dulu
          pakai library seperti `@next/mdx` atau `marked` + `sanitize-html` */}
      <div className="prose prose-gray max-w-none">
        <p className="text-gray-600 leading-relaxed text-lg border-l-4 border-blue-500 pl-4 italic">
          {post.excerpt}
        </p>
        <div className="mt-6 space-y-4 text-gray-700 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </div>
      </div>

      {/* Footer artikle */}
      <footer className="border-t border-gray-100 pt-6">
        <Link
          href="/blog"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Kembali ke semua tulisan
        </Link>
      </footer>
    </article>
  );
}
```

### Loading State untuk Blog

```tsx
// src/app/blog/[slug]/loading.tsx
// Tampil otomatis sementara page.tsx sedang fetch data

export default function BlogPostLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex gap-2">
        <div className="h-4 w-12 bg-gray-200 rounded" />
        <div className="h-4 w-4 bg-gray-200 rounded" />
        <div className="h-4 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-4 bg-gray-200 rounded" />
        <div className="h-4 w-48 bg-gray-200 rounded" />
      </div>

      {/* Title skeleton */}
      <div className="space-y-3">
        <div className="h-8 w-4/5 bg-gray-200 rounded" />
        <div className="h-8 w-3/5 bg-gray-200 rounded" />
      </div>

      {/* Meta skeleton */}
      <div className="flex gap-3">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-4 bg-gray-200 rounded" />
        <div className="h-4 w-28 bg-gray-200 rounded" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${85 + Math.random() * 15}%` }} />
        ))}
      </div>
    </div>
  );
}
```

### Jalankan Project

```bash
npm run dev
```

Buka `http://localhost:3000`. Route yang tersedia:
- `/` — Home page
- `/about` — About page
- `/blog` — Blog list
- `/blog/belajar-nextjs-dari-nol` — Blog detail
- `/blog/typescript-tips-2026` — Blog detail
- `/blog/react-hooks-deep-dive` — Blog detail
- `/blog/apapun-yang-tidak-ada` — Halaman 404 otomatis

---

## 9. Kesalahan Umum yang Wajib Kamu Tahu

### ❌ Selalu tambah "use client" karena terasa lebih aman

```tsx
// ❌ Ini membuang semua manfaat App Router
"use client";

// Komponen ini sama sekali tidak butuh client-side features
async function ProductList() {
  const products = await fetchProducts();
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

Solusi: Hanya tambah `"use client"` kalau memang butuh hooks atau browser APIs.

---

### ❌ Pakai `useEffect` untuk data fetching di Server Component

```tsx
// ❌ Ini tidak akan jalan — Server Component tidak punya lifecycle hooks
import { useState, useEffect } from "react";

export default function Page() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/data").then(r => r.json()).then(setData);
  }, []);

  return <div>{data?.title}</div>;
}
```

```tsx
// ✅ Gunakan async/await langsung di Server Component
export default async function Page() {
  const data = await fetch("https://api.example.com/data");
  const json = await data.json();

  return <div>{json.title}</div>;
}
```

---

### ❌ Import dari "next/router" (Pages Router) di App Router

```tsx
// ❌ SALAH — ini untuk Pages Router (lama)
import { useRouter } from "next/router";

// ✅ BENAR — khusus App Router
import { useRouter } from "next/navigation";
```

---

### ❌ Lupa `await params` di Next.js 15+

```tsx
// ❌ Warning di Next.js 14, Error di Next.js 15
export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params; // ← params bukan Promise di sini (cara lama)
}

// ✅ BENAR untuk Next.js 15+
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; // ← params adalah Promise, wajib await
}
```

---

### ❌ Tidak set `priority` pada gambar above-the-fold

```tsx
// ❌ Gambar hero di-lazy-load — user lihat gambar muncul belakangan
<Image src="/hero.jpg" alt="Hero" fill />

// ✅ Gambar yang langsung terlihat = prioritaskan
<Image src="/hero.jpg" alt="Hero" fill priority />
```

---

### ❌ Server Component imports Client Component, lalu server component di-pass ke client component sebagai children:

```tsx
// ❌ Ini bikin error — Server Component tidak bisa langsung di-import ke Client Component
"use client";
import ServerComponent from "./ServerComponent"; // ← ERROR

export default function ClientComponent() {
  return <ServerComponent />; // Tidak diperbolehkan
}

// ✅ BENAR — lewat children (composition pattern)
// Di Server Component / layout:
<ClientComponent>
  <ServerComponent /> {/* Server Component di-pass sebagai children prop */}
</ClientComponent>

// Di Client Component:
"use client";
export default function ClientComponent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>; // children bisa berisi Server Component
}
```

---

### Ringkasan Decision Tree

```
Komponen baru perlu dibuat?
    │
    ├── Ada interaktivitas? (onClick, useState, useEffect, dll.)
    │       │
    │       └── YA → Tambah "use client", buat Client Component
    │
    ├── Butuh akses browser API? (window, localStorage, dll.)
    │       │
    │       └── YA → Tambah "use client"
    │
    ├── Butuh fetch data dari DB/API?
    │       │
    │       └── YA → Biarkan sebagai Server Component (async function + await)
    │
    └── Hanya tampilkan data/UI statis?
            │
            └── YA → Biarkan sebagai Server Component (default)
```

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Next.js 15*
