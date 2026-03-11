# Project E — Blog Platform: Server Components, SEO, Sitemap, Suspense

> **Level:** Intermediate | **Estimasi waktu:** 3–4 jam  
> **Prerequisite:** Paham Next.js App Router (doc 06), Data Fetching (doc 07), Clean Code (doc 10), dan Project Architecture (doc 11).

---

## Daftar Isi

1. [Overview Project](#1-overview-project)
2. [Struktur Folder](#2-struktur-folder)
3. [Setup Project](#3-setup-project)
4. [TypeScript: Interface dan Types](#4-typescript-interface-dan-types)
5. [Mock Data + "Service" Layer](#5-mock-data--service-layer)
6. [Halaman Home: List Artikel](#6-halaman-home-list-artikel)
7. [Loading State dengan Suspense](#7-loading-state-dengan-suspense)
8. [Dynamic Route: Halaman Detail Artikel](#8-dynamic-route-halaman-detail-artikel)
9. [Halaman Kategori](#9-halaman-kategori)
10. [Search Artikel](#10-search-artikel)
11. [generateMetadata: SEO Dinamis](#11-generatemetadata-seo-dinamis)
12. [Sitemap Otomatis](#12-sitemap-otomatis)
13. [Error Handling dengan error.tsx](#13-error-handling-dengan-errortsx)
14. [Komponen UI Reusable](#14-komponen-ui-reusable)
15. [Server vs Client Component: Kapan Pakai Yang Mana?](#15-server-vs-client-component-kapan-pakai-yang-mana)
16. [Checklist SEO Sebelum Deploy](#16-checklist-seo-sebelum-deploy)

---

## 1. Overview Project

Kita akan bangun **Blog Platform** — tempat publish artikel dengan fitur pencarian, kategori, SEO yang bagus, dan performa yang optimal. Semua fetching dilakukan di Server Components.

### Peta Halaman

```
blog-platform/
│
├── /                         ← Homepage
│   ├── Hero section
│   ├── Featured articles (3 terbaru)
│   └── All articles (grid) + Search
│
├── /blog/[slug]              ← Detail artikel
│   ├── Judul, author, tanggal
│   ├── Cover image
│   ├── Konten artikel (full)
│   └── Related articles (kategori sama)
│
├── /blog/category/[category] ← Filter by kategori
│   ├── Heading: "Artikel {kategori}"
│   └── Grid artikel filtered
│
└── /blog/search?q=keyword   ← Hasil pencarian (Server-side)
    ├── Search input (sticky di atas)
    └── Hasil pencarian
```

### Diagram Alur Data

```
                    Browser
                       │
                       │ Request: GET /blog/cara-belajar-react
                       ▼
               Next.js Middleware
                       │
                       ▼
          Server Component: ArticleDetailPage
                       │
              ┌────────┴────────┐
              ▼                 ▼
    getArticleBySlug()    getRelatedArticles()
              │                 │
              ▼                 ▼
       Mock DB / API      Mock DB / API
    (cached 1 jam)     (cached 30 menit)
              │                 │
              └────────┬────────┘
                       ▼
            HTML sudah dengan data
            dikirim ke browser
                       │
                       ▼
          Browser: Render selesai
          (tidak ada loading spinner)
```

### Kenapa Mayoritas Server Components?

```
Blog platform = mostly READ-ONLY content

Bukan pakai useState/useEffect untuk fetch di client:
  ❌ User dapat HTML kosong dulu
  ❌ Loading spinner muncul
  ❌ Fetch baru dimulai di browser (butuh round-trip)
  ❌ Data tidak ada di HTML → Google Crawler tidak baca konten
  ❌ SEO buruk

Pakai Server Components:
  ✅ HTML sudah isi data konten saat dikirim ke browser
  ✅ Tidak ada loading spinner untuk konten utama
  ✅ Google Crawler baca HTML langsung → SEO bagus
  ✅ Bundle JS lebih kecil (fetch logic tidak dikirim ke client)
```

---

## 2. Struktur Folder

```
blog-platform/
├── app/
│   ├── layout.tsx                 ← Root layout (Navbar, Footer, fonts)
│   ├── page.tsx                   ← Homepage
│   ├── loading.tsx                ← Root loading state
│   ├── not-found.tsx              ← 404 page
│   ├── sitemap.ts                 ← Auto-generated sitemap
│   ├── robots.ts                  ← robots.txt
│   │
│   └── blog/
│       ├── [slug]/
│       │   ├── page.tsx           ← Detail artikel
│       │   ├── loading.tsx        ← Loading state detail
│       │   └── error.tsx          ← Error state detail
│       │
│       ├── category/
│       │   └── [category]/
│       │       ├── page.tsx       ← Halaman kategori
│       │       └── loading.tsx
│       │
│       └── search/
│           └── page.tsx           ← Halaman hasil pencarian
│
├── components/
│   ├── blog/
│   │   ├── ArticleCard.tsx        ← Card artikel di grid
│   │   ├── ArticleGrid.tsx        ← Grid container
│   │   ├── ArticleContent.tsx     ← Render konten artikel
│   │   ├── ArticleMeta.tsx        ← Author, tanggal, kategori
│   │   ├── CategoryBadge.tsx      ← Badge warna per kategori
│   │   ├── RelatedArticles.tsx    ← Artikel terkait
│   │   └── SearchBar.tsx          ← Input search (Client Component)
│   │
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   │
│   └── ui/
│       ├── Skeleton.tsx           ← Loading skeleton
│       └── Badge.tsx
│
├── lib/
│   ├── blog.ts                    ← Service: semua fungsi fetch artikel
│   └── utils.ts                   ← Helper: slugify, formatDate, dll.
│
├── types/
│   └── blog.types.ts              ← Semua TypeScript types
│
└── public/
    └── images/
        └── og-default.png         ← Default OG image
```

---

## 3. Setup Project

```bash
# Buat project baru
npx create-next-app@latest blog-platform \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd blog-platform

# Install tambahan (tidak banyak — mayoritas built-in Next.js)
npm install date-fns
```

### `tsconfig.json` — Pastikan Path Alias

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]          
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `next.config.ts`

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Domain gambar yang diizinkan pakai next/image
    remotePatterns: [
      {
        protocol: "https",
        hostname:  "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname:  "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
```

---

## 4. TypeScript: Interface dan Types

```ts
// types/blog.types.ts

// ─── Author ───────────────────────────────────────────────────────
export interface Author {
  id:     string;
  name:   string;
  avatar: string;
  bio:    string;
  twitter?: string;
}

// ─── Category ─────────────────────────────────────────────────────
export type CategorySlug =
  | "teknologi"
  | "tutorial"
  | "tips-tricks"
  | "opini"
  | "karir";

export interface Category {
  slug:        CategorySlug;
  name:        string;
  description: string;
  color:       string;  // Tailwind color class, misal: "blue"
  count:       number;  // Jumlah artikel di kategori ini
}

// ─── Article ──────────────────────────────────────────────────────
export interface Article {
  id:          string;
  slug:        string;
  title:       string;
  excerpt:     string;    // Deskripsi singkat ~150 karakter
  content:     string;    // Konten penuh (bisa HTML atau Markdown)
  coverImage:  string;    // URL gambar
  author:      Author;
  category:    Category;
  tags:        string[];
  publishedAt: string;    // ISO date string: "2024-01-15T08:00:00Z"
  updatedAt:   string;
  readingTime: number;    // Estimasi menit baca
  featured:    boolean;   // Ditampilkan di featured section?
}

// ─── API Response Wrappers ────────────────────────────────────────
export interface PaginatedArticles {
  articles:    Article[];
  total:       number;
  page:        number;
  pageSize:    number;
  totalPages:  number;
}

// ─── Search ───────────────────────────────────────────────────────
export interface SearchResult {
  articles: Article[];
  query:    string;
  total:    number;
}

// ─── Filter Options ───────────────────────────────────────────────
export interface ArticleFilter {
  category?: CategorySlug;
  tag?:      string;
  search?:   string;
  featured?: boolean;
  page?:     number;
  pageSize?: number;
}
```

---

## 5. Mock Data + "Service" Layer

Di project nyata, `lib/blog.ts` akan call API/database. Di sini kita pakai mock data supaya langsung bisa jalan.

```ts
// lib/blog.ts
// "use server" tidak diperlukan di sini — ini hanya utility functions
// yang dipanggil dari Server Components

import type {
  Article,
  ArticleFilter,
  Category,
  CategorySlug,
  PaginatedArticles,
  SearchResult,
} from "@/types/blog.types";

// ─── Mock Data ────────────────────────────────────────────────────

const AUTHORS = {
  budi: {
    id:     "author-1",
    name:   "Budi Santoso",
    avatar: "https://picsum.photos/seed/budi/100/100",
    bio:    "Senior Frontend Engineer. 7 tahun di industri, obsesi dengan TypeScript dan performa web.",
    twitter: "budisantoso",
  },
  sari: {
    id:     "author-2",
    name:   "Sari Dewi",
    avatar: "https://picsum.photos/seed/sari/100/100",
    bio:    "Full-stack Developer & Technical Writer. Suka explain hal kompleks dengan cara sederhana.",
    twitter: "saridewi_dev",
  },
  andi: {
    id:     "author-3",
    name:   "Andi Prasetyo",
    avatar: "https://picsum.photos/seed/andi/100/100",
    bio:    "DevOps & Cloud Engineer. Hobi nulis tentang infrastruktur dan deployment.",
  },
} as const;

const CATEGORIES: Record<CategorySlug, Category> = {
  teknologi: {
    slug: "teknologi", name: "Teknologi",
    description: "Berita dan tren teknologi terkini",
    color: "purple", count: 8,
  },
  tutorial: {
    slug: "tutorial", name: "Tutorial",
    description: "Panduan langkah demi langkah",
    color: "blue", count: 12,
  },
  "tips-tricks": {
    slug: "tips-tricks", name: "Tips & Tricks",
    description: "Shortcut dan trik produktivitas",
    color: "green", count: 6,
  },
  opini: {
    slug: "opini", name: "Opini",
    description: "Pandangan dan perspektif developer",
    color: "orange", count: 4,
  },
  karir: {
    slug: "karir", name: "Karir",
    description: "Tips karir dan pengembangan diri",
    color: "pink", count: 5,
  },
};

// Artikel mock — 10 artikel
const ARTICLES_DB: Article[] = [
  {
    id:         "art-001",
    slug:       "memahami-react-server-components",
    title:      "Memahami React Server Components dari Nol",
    excerpt:    "Server Components adalah perubahan terbesar React dalam beberapa tahun terakhir. Artikel ini menjelaskan cara kerjanya, kapan menggunakannya, dan bagaimana bedanya dengan Client Components.",
    content: `
<h2>Apa itu Server Components?</h2>
<p>React Server Components (RSC) adalah komponen yang di-render sepenuhnya di server. Berbeda dengan komponen React biasa yang di-render di browser, RSC menghasilkan HTML langsung di server tanpa mengirimkan JavaScript ke client.</p>

<h2>Keuntungan Server Components</h2>
<ul>
  <li><strong>Bundle size lebih kecil</strong> — Kode komponen tidak dikirim ke browser</li>
  <li><strong>Akses langsung ke backend</strong> — Bisa query database tanpa API layer</li>
  <li><strong>Lebih cepat</strong> — Data sudah ada saat HTML dikirim</li>
  <li><strong>SEO-friendly</strong> — Konten ada di HTML, bukan di JavaScript</li>
</ul>

<h2>Kapan Tidak Pakai Server Components?</h2>
<p>Kamu butuh Client Component kalau:</p>
<ul>
  <li>Komponen butuh state (useState)</li>
  <li>Komponen butuh event handler (onClick, onChange)</li>
  <li>Butuh browser APIs (window, localStorage)</li>
  <li>Butuh hooks seperti useEffect, useContext</li>
</ul>

<h2>Kesimpulan</h2>
<p>Gunakan Server Components sebagai default, dan "turun" ke Client Components hanya saat benar-benar butuh interaktivitas.</p>
    `.trim(),
    coverImage:  "https://picsum.photos/seed/rsc/800/450",
    author:      AUTHORS.budi,
    category:    CATEGORIES.tutorial,
    tags:        ["React", "Server Components", "Next.js", "Performance"],
    publishedAt: "2024-11-10T08:00:00Z",
    updatedAt:   "2024-11-10T08:00:00Z",
    readingTime: 8,
    featured:    true,
  },
  {
    id:         "art-002",
    slug:       "typescript-tips-untuk-react-developer",
    title:      "10 TypeScript Tips yang Wajib Diketahui React Developer",
    excerpt:    "Dari generics sampai utility types, ini adalah trik TypeScript yang akan mengubah cara kamu nulis React code. Dengan contoh nyata yang langsung bisa dipraktekkan.",
    content: `
<h2>Tip 1: Gunakan Generic untuk Komponen yang Fleksibel</h2>
<p>Generic memungkinkan kamu membuat komponen yang type-safe tapi tetap fleksibel terhadap berbagai tipe data.</p>
<pre><code>interface ListProps&lt;T&gt; {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List&lt;T&gt;({ items, renderItem }: ListProps&lt;T&gt;) {
  return &lt;ul&gt;{items.map(renderItem)}&lt;/ul&gt;;
}</code></pre>

<h2>Tip 2: Pakai as const untuk Konstanta</h2>
<p>as const membuat TypeScript infer tipe yang lebih spesifik (literal type) alih-alih tipe yang lebar.</p>

<h2>Tip 3: Discriminated Union untuk State</h2>
<p>Daripada useState dengan banyak boolean, gunakan discriminated union untuk state yang mutual exclusive.</p>
    `.trim(),
    coverImage:  "https://picsum.photos/seed/ts-tips/800/450",
    author:      AUTHORS.sari,
    category:    CATEGORIES["tips-tricks"],
    tags:        ["TypeScript", "React", "Tips"],
    publishedAt: "2024-11-05T10:00:00Z",
    updatedAt:   "2024-11-06T12:00:00Z",
    readingTime: 12,
    featured:    true,
  },
  {
    id:         "art-003",
    slug:       "nextjs-15-fitur-baru",
    title:      "Semua Fitur Baru di Next.js 15 yang Perlu Kamu Tahu",
    excerpt:    "Next.js 15 membawa perubahan signifikan: async params, turbopack stabil, dan optimisasi caching. Panduan lengkap migrasi dan fitur baru.",
    content: `
<h2>1. Params Sekarang Async</h2>
<p>Breaking change terbesar: params dan searchParams sekarang bersifat async Promise yang harus di-await.</p>
<pre><code>// Sebelumnya (Next.js 14)
export default function Page({ params }: { params: { slug: string } }) {
  return &lt;h1&gt;{params.slug}&lt;/h1&gt;;
}

// Next.js 15 — params adalah Promise!
export default async function Page({
  params,
}: {
  params: Promise&lt;{ slug: string }&gt;;
}) {
  const { slug } = await params;
  return &lt;h1&gt;{slug}&lt;/h1&gt;;
}</code></pre>

<h2>2. Turbopack Stabil untuk Development</h2>
<p>Turbopack (pengganti Webpack) sekarang stabil di next dev. Startup time jauh lebih cepat.</p>

<h2>3. React 19 Support</h2>
<p>Next.js 15 support React 19 dengan semua fitur barunya: use() hook, improved Server Actions, dll.</p>
    `.trim(),
    coverImage:  "https://picsum.photos/seed/nextjs15/800/450",
    author:      AUTHORS.budi,
    category:    CATEGORIES.teknologi,
    tags:        ["Next.js", "React", "Web Development"],
    publishedAt: "2024-10-25T09:00:00Z",
    updatedAt:   "2024-10-25T09:00:00Z",
    readingTime: 10,
    featured:    true,
  },
  {
    id:         "art-004",
    slug:       "cara-deploy-nextjs-ke-vercel",
    title:      "Cara Deploy Next.js ke Vercel: Panduan Lengkap",
    excerpt:    "Dari push pertama sampai custom domain dan environment variables. Panduan lengkap deploy Next.js ke Vercel, termasuk konfigurasi CI/CD.",
    content: `
<h2>Langkah 1: Siapkan Repository</h2>
<p>Pastikan kode kamu sudah di GitHub, GitLab, atau Bitbucket. Vercel akan otomatis deploy setiap kali kamu push ke branch yang ditentukan.</p>

<h2>Langkah 2: Connect ke Vercel</h2>
<p>Buka vercel.com, login, dan klik "New Project". Import repository yang kamu mau deploy.</p>

<h2>Langkah 3: Konfigurasi Environment Variables</h2>
<p>Sebelum deploy, set semua environment variables yang diperlukan di Vercel dashboard.</p>

<h2>Langkah 4: Custom Domain</h2>
<p>Di tab Domains, tambahkan custom domain kamu. Vercel akan otomatis mengurus SSL certificate.</p>
    `.trim(),
    coverImage:  "https://picsum.photos/seed/vercel-deploy/800/450",
    author:      AUTHORS.andi,
    category:    CATEGORIES.tutorial,
    tags:        ["Next.js", "Vercel", "Deployment", "CI/CD"],
    publishedAt: "2024-10-18T11:00:00Z",
    updatedAt:   "2024-10-20T08:00:00Z",
    readingTime: 15,
    featured:    false,
  },
  {
    id:         "art-005",
    slug:       "zustand-vs-redux-mana-yang-lebih-baik",
    title:      "Zustand vs Redux: Mana yang Lebih Baik untuk Project Kamu?",
    excerpt:    "Perbandingan jujur antara Zustand dan Redux Toolkit. Kapan pakai yang mana, trade-off, dan contoh implementasi yang sama dengan dua library berbeda.",
    content: `
<h2>Redux Toolkit: Kuat tapi Bertele-tele</h2>
<p>Redux masih jadi pilihan utama untuk project enterprise besar. Dengan Redux Toolkit, boilerplate sudah berkurang banyak, tapi masih lebih verbose dibanding Zustand.</p>

<h2>Zustand: Sederhana dan Efektif</h2>
<p>Zustand adalah state management yang sangat simpel. Setup minimal, API intuitif, dan ukurannya kecil (~1KB).</p>

<h2>Kapan Pakai Redux?</h2>
<ul>
  <li>Project dengan tim besar yang butuh struktur strict</li>
  <li>Sudah pakai Redux — tidak perlu migrasi</li>
  <li>Butuh Redux DevTools yang mature</li>
</ul>

<h2>Kapan Pakai Zustand?</h2>
<ul>
  <li>Project baru, kecil hingga menengah</li>
  <li>Tim kecil yang mau move fast</li>
  <li>Tidak butuh boilerplate yang banyak</li>
</ul>
    `.trim(),
    coverImage:  "https://picsum.photos/seed/state-mgmt/800/450",
    author:      AUTHORS.sari,
    category:    CATEGORIES.opini,
    tags:        ["State Management", "Zustand", "Redux", "React"],
    publishedAt: "2024-10-10T14:00:00Z",
    updatedAt:   "2024-10-10T14:00:00Z",
    readingTime: 9,
    featured:    false,
  },
  {
    id:         "art-006",
    slug:       "tips-sukses-jadi-frontend-developer",
    title:      "Tips Sukses Jadi Frontend Developer di 2025",
    excerpt:    "Dari mana harus mulai, skill apa yang paling dicari, dan bagaimana membangun karir yang solid sebagai Frontend Developer di tahun 2025.",
    content: `
<h2>Skill yang Paling Dicari di 2025</h2>
<p>Setelah survei ke 50+ tech company, ini adalah skill yang paling banyak dicari:</p>
<ol>
  <li>TypeScript (bukan lagi optional)</li>
  <li>React atau Next.js</li>
  <li>Testing (Vitest, Playwright)</li>
  <li>Performance optimization</li>
  <li>Aksesibilitas (a11y)</li>
</ol>

<h2>Bangun Portfolio yang Berbeda</h2>
<p>Jangan hanya buat todo app atau weather app. Bangun sesuatu yang memecahkan masalah nyata.</p>

<h2>Kontribusi ke Open Source</h2>
<p>Kontribusi ke project open source akan meningkatkan kemampuan code review, kolaborasi, dan tentu saja visibility kamu di komunitas.</p>
    `.trim(),
    coverImage:  "https://picsum.photos/seed/career-tips/800/450",
    author:      AUTHORS.budi,
    category:    CATEGORIES.karir,
    tags:        ["Karir", "Frontend", "Tips", "Junior Developer"],
    publishedAt: "2024-09-28T07:00:00Z",
    updatedAt:   "2024-09-28T07:00:00Z",
    readingTime: 7,
    featured:    false,
  },
  {
    id:         "art-007",
    slug:       "css-grid-vs-flexbox-panduan-lengkap",
    title:      "CSS Grid vs Flexbox: Panduan Lengkap Kapan Pakai Yang Mana",
    excerpt:    "Masih bingung kapan pakai Grid dan kapan pakai Flexbox? Panduan visual ini akan membantu kamu memilih yang tepat setiap saat.",
    content: `
<h2>Flexbox: Satu Dimensi</h2>
<p>Flexbox sempurna untuk layout satu dimensi — baik horizontal maupun vertikal. Gunakan untuk navbar, row of buttons, atau centering elemen.</p>

<h2>Grid: Dua Dimensi</h2>
<p>CSS Grid cocok untuk layout dua dimensi — row dan column secara bersamaan. Gunakan untuk page layout, card grids, atau layout yang kompleks.</p>

<h2>Aturan Sederhana</h2>
<ul>
  <li>Satu baris atau satu kolom → Flexbox</li>
  <li>Dua dimensi → Grid</li>
  <li>Kombinasi keduanya dalam satu layout → sangat normal!</li>
</ul>
    `.trim(),
    coverImage:  "https://picsum.photos/seed/css-layout/800/450",
    author:      AUTHORS.sari,
    category:    CATEGORIES["tips-tricks"],
    tags:        ["CSS", "Flexbox", "Grid", "Layout"],
    publishedAt: "2024-09-15T10:00:00Z",
    updatedAt:   "2024-09-15T10:00:00Z",
    readingTime: 6,
    featured:    false,
  },
  {
    id:         "art-008",
    slug:       "web-performance-core-web-vitals",
    title:      "Web Performance: Panduan Core Web Vitals untuk Developer",
    excerpt:    "LCP, FID, CLS — bukan cuma untuk SEO. Memahami Core Web Vitals dan cara mengoptimasi skor kamu dengan teknik nyata yang bisa langsung diterapkan.",
    content: `
<h2>Apa itu Core Web Vitals?</h2>
<p>Core Web Vitals adalah metrik performa web yang dipakai Google sebagai ranking factor SEO:</p>
<ul>
  <li><strong>LCP (Largest Contentful Paint)</strong>: Seberapa cepat konten utama muncul. Target: &lt; 2.5 detik</li>
  <li><strong>FID (First Input Delay)</strong>: Seberapa responsif halaman saat pertama kali diinteraksi. Target: &lt; 100ms</li>
  <li><strong>CLS (Cumulative Layout Shift)</strong>: Seberapa stabil layout. Target: &lt; 0.1</li>
</ul>

<h2>Cara Improve LCP</h2>
<ol>
  <li>Optimasi gambar dengan next/image</li>
  <li>Preload critical fonts</li>
  <li>Minimasi blocking JavaScript</li>
  <li>Pakai CDN untuk asset statis</li>
</ol>
    `.trim(),
    coverImage:  "https://picsum.photos/seed/web-perf/800/450",
    author:      AUTHORS.andi,
    category:    CATEGORIES.teknologi,
    tags:        ["Performance", "SEO", "Core Web Vitals"],
    publishedAt: "2024-09-05T09:00:00Z",
    updatedAt:   "2024-09-07T11:00:00Z",
    readingTime: 11,
    featured:    false,
  },
  {
    id:         "art-009",
    slug:       "testing-react-dengan-vitest",
    title:      "Testing React: Panduan Vitest + React Testing Library",
    excerpt:    "Cara setup Vitest, menulis unit test dan integration test untuk komponen React, dan bagaimana mock yang benar. Termasuk tips testing Server Components.",
    content: `
<h2>Setup Vitest di Next.js</h2>
<p>Vitest adalah test runner yang sangat cepat, kompatibel dengan Jest API, dan terintegrasi bagus dengan Vite/Turbopack.</p>

<h2>Filosofi Testing yang Benar</h2>
<p>Jangan test implementasi — test behavior. Artinya: test apa yang user lihat dan lakukan, bukan bagaimana komponen diimplementasi secara internal.</p>

<h2>Contoh Test yang Bagus</h2>
<pre><code>// ✅ Test behavior
test("menampilkan error saat form disubmit dengan email invalid", async () => {
  render(&lt;LoginForm /&gt;);
  await userEvent.type(screen.getByLabelText("Email"), "bukan-email");
  await userEvent.click(screen.getByRole("button", { name: "Login" }));
  expect(screen.getByText("Format email tidak valid")).toBeInTheDocument();
});</code></pre>
    `.trim(),
    coverImage:  "https://picsum.photos/seed/testing/800/450",
    author:      AUTHORS.sari,
    category:    CATEGORIES.tutorial,
    tags:        ["Testing", "Vitest", "React Testing Library"],
    publishedAt: "2024-08-20T08:00:00Z",
    updatedAt:   "2024-08-20T08:00:00Z",
    readingTime: 14,
    featured:    false,
  },
  {
    id:         "art-010",
    slug:       "docker-untuk-nodejs-developer",
    title:      "Docker untuk Node.js Developer: Dari Nol Sampai Production",
    excerpt:    "Containerization bukan lagi luxury — sudah jadi standar industri. Panduan lengkap Docker untuk developer Node.js: dari Dockerfile sampai docker-compose.",
    content: `
<h2>Kenapa Docker?</h2>
<p>"Works on my machine" — kalimat yang sudah terlalu sering kita dengar. Docker memastikan aplikasi berjalan persis sama di development, staging, dan production.</p>

<h2>Dockerfile untuk Node.js</h2>
<pre><code>FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS production
COPY --from=build /app/.next ./.next
EXPOSE 3000
CMD ["npm", "start"]</code></pre>

<h2>Multi-stage Build</h2>
<p>Multi-stage build memisahkan proses build dan runtime, sehingga image production jauh lebih kecil karena tidak mengandung dev dependencies.</p>
    `.trim(),
    coverImage:  "https://picsum.photos/seed/docker/800/450",
    author:      AUTHORS.andi,
    category:    CATEGORIES.tutorial,
    tags:        ["Docker", "Node.js", "DevOps", "Deployment"],
    publishedAt: "2024-08-10T13:00:00Z",
    updatedAt:   "2024-08-12T09:00:00Z",
    readingTime: 16,
    featured:    false,
  },
];

// ─── Service Functions ────────────────────────────────────────────
// Di production: ganti dengan fetch ke API / Prisma query

export async function getAllArticles(
  filter: ArticleFilter = {}
): Promise<PaginatedArticles> {
  // Simulasi network delay (hapus di production)
  await new Promise((r) => setTimeout(r, 200));

  let results = [...ARTICLES_DB];

  // Apply filters
  if (filter.category) {
    results = results.filter((a) => a.category.slug === filter.category);
  }
  if (filter.tag) {
    results = results.filter((a) =>
      a.tags.some((t) => t.toLowerCase() === filter.tag!.toLowerCase())
    );
  }
  if (filter.featured !== undefined) {
    results = results.filter((a) => a.featured === filter.featured);
  }
  if (filter.search) {
    const q = filter.search.toLowerCase();
    results = results.filter(
      (a) =>
        a.title.toLowerCase().includes(q)   ||
        a.excerpt.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Sort by date (terbaru dulu)
  results.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Pagination
  const page     = filter.page     ?? 1;
  const pageSize = filter.pageSize ?? 6;
  const total    = results.length;
  const start    = (page - 1) * pageSize;
  const end      = start + pageSize;

  return {
    articles:   results.slice(start, end),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  await new Promise((r) => setTimeout(r, 100));
  return ARTICLES_DB.find((a) => a.slug === slug) ?? null;
}

export async function getRelatedArticles(
  currentSlug: string,
  categorySlug: string,
  limit = 3
): Promise<Article[]> {
  await new Promise((r) => setTimeout(r, 100));
  return ARTICLES_DB.filter(
    (a) => a.slug !== currentSlug && a.category.slug === categorySlug
  ).slice(0, limit);
}

export async function getAllCategories(): Promise<CategoryWithCount[]> {
  return Object.values(CATEGORIES);
}

export async function getAllSlugs(): Promise<string[]> {
  return ARTICLES_DB.map((a) => a.slug);
}

export async function getFeaturedArticles(): Promise<Article[]> {
  return ARTICLES_DB.filter((a) => a.featured).slice(0, 3);
}

// Tipe helper untuk getAllCategories return
type CategoryWithCount = import("@/types/blog.types").Category;
```

### Helper Utilities

```ts
// lib/utils.ts
import { format, formatDistanceToNow } from "date-fns";
import { id as idLocale }              from "date-fns/locale";

export function formatDate(dateString: string): string {
  return format(new Date(dateString), "d MMMM yyyy", { locale: idLocale });
  // "10 November 2024"
}

export function formatDateRelative(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), {
    addSuffix: true,
    locale:    idLocale,
  });
  // "3 bulan yang lalu"
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function calculateReadingTime(content: string): number {
  // Rata-rata orang baca 200 kata per menit
  const words   = content.replace(/<[^>]+>/g, "").split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return Math.max(1, minutes);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

// Buat base URL dari environment
export function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  return "http://localhost:3000";
}
```

---

## 6. Halaman Home: List Artikel

```tsx
// app/page.tsx
import { Suspense }          from "react";
import { getAllArticles, getFeaturedArticles, getAllCategories } from "@/lib/blog";
import { ArticleGrid }       from "@/components/blog/ArticleGrid";
import { CategoryBadge }     from "@/components/blog/CategoryBadge";
import { Skeleton }          from "@/components/ui/Skeleton";
import { SearchBar }         from "@/components/blog/SearchBar";
import Link                  from "next/link";
import Image                 from "next/image";
import type { Metadata }     from "next";

export const metadata: Metadata = {
  title:       "Dev Blog — Artikel untuk Frontend Developer",
  description: "Artikel, tutorial, dan tips seputar React, TypeScript, Next.js, dan dunia Frontend Development.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const params       = await searchParams;
  const searchQuery  = params.search   ?? "";
  const categoryFilter = params.category ?? "";

  // Fetch paralel — jalan bersamaan, tidak perlu tunggu satu-satu
  const [featured, allArticlesResult, categories] = await Promise.all([
    getFeaturedArticles(),
    getAllArticles({
      search:   searchQuery || undefined,
      category: (categoryFilter as any) || undefined,
    }),
    getAllCategories(),
  ]);

  const isFiltering = !!(searchQuery || categoryFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section — hanya muncul kalau tidak sedang filter */}
      {!isFiltering && (
        <section className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-bold mb-4 leading-tight">
              Dev Blog
            </h1>
            <p className="text-xl text-blue-200 mb-10">
              Artikel, tutorial, dan tips untuk Frontend Developer Indonesia
            </p>
            {/* Search Bar — Client Component */}
            <SearchBar initialValue={searchQuery} />
          </div>
        </section>
      )}

      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Featured Articles — hanya kalau tidak sedang filter */}
        {!isFiltering && featured.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Artikel Pilihan
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {featured.map((article) => (
                <Link
                  key={article.id}
                  href={`/blog/${article.slug}`}
                  className="group rounded-2xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      fill
                      className="object-cover transition group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      priority  // LCP optimization: preload featured images
                    />
                  </div>
                  <div className="p-5">
                    <CategoryBadge category={article.category} />
                    <h3 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <main className="flex-1">
            {/* Search bar (saat filter aktif) */}
            {isFiltering && (
              <div className="mb-8">
                <SearchBar initialValue={searchQuery} />
              </div>
            )}

            {/* Heading hasil filter */}
            {isFiltering && (
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-700">
                  {searchQuery
                    ? `${allArticlesResult.total} hasil untuk "${searchQuery}"`
                    : `Artikel kategori "${categoryFilter}"`}
                </h2>
                <Link
                  href="/"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Reset filter
                </Link>
              </div>
            )}

            {/* Article Grid */}
            {!isFiltering && (
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Semua Artikel
              </h2>
            )}

            {allArticlesResult.articles.length > 0 ? (
              <ArticleGrid articles={allArticlesResult.articles} />
            ) : (
              <div className="rounded-xl border bg-white p-12 text-center">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-lg font-medium text-gray-700">
                  Tidak ada artikel yang ditemukan
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Coba kata kunci yang berbeda
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-block text-sm text-blue-600 hover:underline"
                >
                  Lihat semua artikel
                </Link>
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="rounded-xl border bg-white p-5 sticky top-20">
              <h3 className="font-semibold text-gray-900 mb-4">Kategori</h3>
              <ul className="space-y-2">
                {categories.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/blog/category/${cat.slug}`}
                      className={[
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                        categoryFilter === cat.slug
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <span>{cat.name}</span>
                      <span className="text-xs text-gray-400">
                        {cat.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
```

---

## 7. Loading State dengan Suspense

### Root Loading

```tsx
// app/loading.tsx
// Otomatis ditampilkan oleh Next.js saat navigasi ke halaman baru
// Bungkus seluruh halaman dalam Suspense secara implisit

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero skeleton */}
      <div className="h-64 bg-gray-200 animate-pulse" />

      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Featured skeleton */}
        <div className="mb-16">
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ArticleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ArticleCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="aspect-video bg-gray-200 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-6 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}
```

### Detail Page Loading

```tsx
// app/blog/[slug]/loading.tsx
export default function ArticleDetailLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 animate-pulse">
      {/* Breadcrumb */}
      <div className="h-4 w-48 bg-gray-200 rounded mb-8" />

      {/* Category + meta */}
      <div className="h-6 w-24 bg-gray-200 rounded-full mb-4" />
      
      {/* Title */}
      <div className="space-y-3 mb-4">
        <div className="h-10 bg-gray-200 rounded" />
        <div className="h-10 w-3/4 bg-gray-200 rounded" />
      </div>
      
      {/* Author meta */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-48 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Cover image */}
      <div className="aspect-video w-full rounded-2xl bg-gray-200 mb-10" />

      {/* Content */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-gray-100 rounded ${i % 3 === 2 ? "w-2/3" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 8. Dynamic Route: Halaman Detail Artikel

```tsx
// app/blog/[slug]/page.tsx
import { getArticleBySlug, getRelatedArticles } from "@/lib/blog";
import { ArticleMeta }     from "@/components/blog/ArticleMeta";
import { ArticleContent }  from "@/components/blog/ArticleContent";
import { RelatedArticles } from "@/components/blog/RelatedArticles";
import { CategoryBadge }   from "@/components/blog/CategoryBadge";
import { notFound }        from "next/navigation";
import Image               from "next/image";
import Link                from "next/link";
import type { Metadata }   from "next";
import { getAllSlugs }      from "@/lib/blog";

// ─── Static Site Generation (SSG) ─────────────────────────────────
// generateStaticParams → Next.js pre-render semua halaman artikel
// saat build time untuk performa maksimal

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

// ─── Dynamic Metadata ─────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug }  = await params;
  const article   = await getArticleBySlug(slug);

  if (!article) {
    return { title: "Artikel Tidak Ditemukan" };
  }

  return {
    title:       `${article.title} — Dev Blog`,
    description: article.excerpt,
    authors:     [{ name: article.author.name }],
    openGraph: {
      title:       article.title,
      description: article.excerpt,
      type:        "article",
      publishedTime: article.publishedAt,
      modifiedTime:  article.updatedAt,
      authors:     [article.author.name],
      images: [
        {
          url:    article.coverImage,
          width:  800,
          height: 450,
          alt:    article.title,
        },
      ],
    },
    twitter: {
      card:        "summary_large_image",
      title:       article.title,
      description: article.excerpt,
      images:      [article.coverImage],
    },
  };
}

// ─── Page Component ───────────────────────────────────────────────
export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch artikel + related articles secara paralel
  const [article, related] = await Promise.all([
    getArticleBySlug(slug),
    getArticleBySlug(slug).then((a) =>
      a ? getRelatedArticles(slug, a.category.slug) : []
    ),
  ]);

  if (!article) notFound();

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-gray-500" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="hover:text-gray-700">Beranda</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/blog/category/${article.category.slug}`}
                className="hover:text-gray-700"
              >
                {article.category.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-900 truncate max-w-xs">
              {article.title}
            </li>
          </ol>
        </nav>

        {/* Article Header */}
        <header className="mb-8">
          <CategoryBadge category={article.category} />
          <h1 className="mt-3 text-4xl font-bold text-gray-900 leading-tight">
            {article.title}
          </h1>
          <p className="mt-4 text-xl text-gray-500 leading-relaxed">
            {article.excerpt}
          </p>
          <ArticleMeta article={article} className="mt-6" />
        </header>

        {/* Cover Image */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-10">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            className="object-cover"
            priority   // Ini yang paling atas di viewport → priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        {/* Article Content */}
        <ArticleContent content={article.content} />

        {/* Tags */}
        <div className="mt-10 pt-8 border-t flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Link
              key={tag}
              href={`/?search=${encodeURIComponent(tag)}`}
              className="rounded-full border px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              #{tag}
            </Link>
          ))}
        </div>

        {/* Author Bio */}
        <div className="mt-10 rounded-2xl border bg-gray-50 p-6 flex gap-4">
          <Image
            src={article.author.avatar}
            alt={article.author.name}
            width={64}
            height={64}
            className="rounded-full shrink-0 self-start"
          />
          <div>
            <p className="font-semibold text-gray-900">{article.author.name}</p>
            {article.author.twitter && (
              <a
                href={`https://twitter.com/${article.author.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                @{article.author.twitter}
              </a>
            )}
            <p className="mt-2 text-sm text-gray-600">{article.author.bio}</p>
          </div>
        </div>
      </div>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="border-t bg-gray-50 py-12">
          <div className="container mx-auto max-w-6xl px-4">
            <RelatedArticles articles={related} />
          </div>
        </section>
      )}
    </div>
  );
}
```

---

## 9. Halaman Kategori

```tsx
// app/blog/category/[category]/page.tsx
import { getAllArticles, getAllCategories } from "@/lib/blog";
import { ArticleGrid }     from "@/components/blog/ArticleGrid";
import { notFound }        from "next/navigation";
import Link                from "next/link";
import type { Metadata }   from "next";
import type { CategorySlug } from "@/types/blog.types";

const CATEGORY_NAMES: Record<string, string> = {
  teknologi:    "Teknologi",
  tutorial:     "Tutorial",
  "tips-tricks": "Tips & Tricks",
  opini:        "Opini",
  karir:        "Karir",
};

// Pre-generate semua halaman kategori saat build
export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const name = CATEGORY_NAMES[category];

  if (!name) return { title: "Kategori Tidak Ditemukan" };

  return {
    title:       `Artikel ${name} — Dev Blog`,
    description: `Semua artikel tentang ${name} di Dev Blog.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const categoryName = CATEGORY_NAMES[category];

  if (!categoryName) notFound();

  const { articles, total } = await getAllArticles({
    category: category as CategorySlug,
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Semua Artikel
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {categoryName}
        </h1>
        <p className="mt-2 text-gray-500">
          {total} artikel dalam kategori ini
        </p>
      </div>

      {articles.length > 0 ? (
        <ArticleGrid articles={articles} />
      ) : (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-gray-500">Belum ada artikel di kategori ini.</p>
        </div>
      )}
    </div>
  );
}
```

---

## 10. Search Artikel

Search di project ini bekerja **server-side** — query dikirim ke server via URL `?search=keyword`, bukan fetch dari client.

### SearchBar Component (Client Component)

```tsx
// components/blog/SearchBar.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition }               from "react";
import { useDebouncedCallback }                     from "use-debounce";

// Install: npm install use-debounce
// Alternatif: import { useDebounce } from "@/hooks/useDebounce"

interface SearchBarProps {
  initialValue?: string;
  placeholder?:  string;
}

export function SearchBar({
  initialValue = "",
  placeholder  = "Cari artikel...",
}: SearchBarProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Debounce 300ms — tidak trigger search setiap ketik
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (term) {
      params.set("search", term);
    } else {
      params.delete("search");
    }

    // Hapus category filter saat search
    params.delete("category");

    startTransition(() => {
      // Kalau di homepage → update searchParams di homepage
      // Kalau di halaman lain → arahkan ke homepage dengan searchParams
      if (pathname === "/") {
        router.push(`/?${params.toString()}`);
      } else {
        router.push(`/?${params.toString()}`);
      }
    });
  }, 300);

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        {isPending ? (
          <svg
            className="h-4 w-4 text-gray-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      </div>
      <input
        type="search"
        defaultValue={initialValue}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        aria-label="Cari artikel"
      />
    </div>
  );
}
```

### Search Page (Dedicated)

```tsx
// app/blog/search/page.tsx
// Alternatif: halaman khusus pencarian (bukan via homepage)

import { getAllArticles }     from "@/lib/blog";
import { ArticleGrid }       from "@/components/blog/ArticleGrid";
import { SearchBar }         from "@/components/blog/SearchBar";
import { Suspense }          from "react";
import type { Metadata }     from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Hasil pencarian "${q}" — Dev Blog` : "Cari Artikel — Dev Blog",
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { articles, total } = await getAllArticles({ search: q || undefined });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Cari Artikel</h1>

      <Suspense>
        <SearchBar initialValue={q} placeholder="Cari judul, topik, atau tag..." />
      </Suspense>

      {q && (
        <p className="mt-6 mb-4 text-gray-500">
          {total > 0
            ? `${total} hasil untuk "${q}"`
            : `Tidak ada hasil untuk "${q}"`}
        </p>
      )}

      {articles.length > 0 ? (
        <div className="mt-6">
          <ArticleGrid articles={articles} />
        </div>
      ) : q ? (
        <div className="mt-12 text-center">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg font-medium text-gray-700">
            Tidak ada artikel yang cocok
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Coba kata kunci yang lebih umum
          </p>
        </div>
      ) : (
        <p className="mt-8 text-center text-gray-400">
          Ketik sesuatu untuk mulai mencari
        </p>
      )}
    </div>
  );
}
```

---

## 11. generateMetadata: SEO Dinamis

### Cara Kerja generateMetadata

```
Request ke /blog/memahami-react-server-components
                        │
                        ▼
         Next.js jalankan generateMetadata()
                        │
                        ▼
         getArticleBySlug("memahami-react-server-components")
                        │
                        ▼
         Return Metadata object
                        │
                        ▼
         Next.js inject ke <head>:
           <title>Memahami React Server Components — Dev Blog</title>
           <meta name="description" content="...">
           <meta property="og:title" content="...">
           <meta property="og:image" content="...">
           ...

Catatan penting: generateMetadata dan page component
TIDAK double-fetch — Next.js cache-kan request yang sama.
```

### Pattern Lengkap generateMetadata

```tsx
// Pola yang bisa dipakai di setiap halaman dinamis

import type { Metadata, ResolvingMetadata } from "next";

type Props = {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params, searchParams }: Props,
  // parent: ResolvingMetadata  ← pakai ini kalau mau merge dengan parent metadata
): Promise<Metadata> {
  const { slug }  = await params;
  const article   = await getArticleBySlug(slug); // Di-cache oleh Next.js

  // Kalau artikel tidak ditemukan
  if (!article) {
    return {
      title:       "Artikel Tidak Ditemukan",
      description: "Artikel yang kamu cari tidak ada.",
    };
  }

  const ogImageUrl = article.coverImage;
  const articleUrl = `https://devblog.com/blog/${slug}`;

  return {
    // ─── Basic ──────────────────────────────────────────────
    title:       `${article.title} — Dev Blog`,
    description: article.excerpt,
    authors:     [{ name: article.author.name }],
    keywords:    article.tags,

    // ─── Canonical URL ──────────────────────────────────────
    alternates: {
      canonical: articleUrl,
    },

    // ─── Open Graph (Facebook, LinkedIn, WhatsApp) ───────────
    openGraph: {
      title:         article.title,
      description:   article.excerpt,
      url:           articleUrl,
      siteName:      "Dev Blog",
      locale:        "id_ID",
      type:          "article",
      publishedTime: article.publishedAt,
      modifiedTime:  article.updatedAt,
      authors:       [article.author.name],
      section:       article.category.name,
      tags:          article.tags,
      images: [
        {
          url:    ogImageUrl,
          width:  800,
          height: 450,
          alt:    article.title,
        },
      ],
    },

    // ─── Twitter/X Card ─────────────────────────────────────
    twitter: {
      card:        "summary_large_image",
      title:       article.title,
      description: article.excerpt,
      images:      [ogImageUrl],
      creator:     article.author.twitter
        ? `@${article.author.twitter}`
        : undefined,
    },

    // ─── Robots ─────────────────────────────────────────────
    robots: {
      index:  true,
      follow: true,
    },
  };
}
```

### Root Layout Metadata (Base/Fallback)

```tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  // Template: child pages akan replace %s, root title dipakai kalau tidak ada title
  title: {
    default:  "Dev Blog",
    template: "%s — Dev Blog",
    // Contoh: halaman detail → "Memahami RSC — Dev Blog"
  },
  description: "Artikel, tutorial, dan tips untuk Frontend Developer Indonesia.",
  keywords:    ["React", "TypeScript", "Next.js", "Frontend", "Tutorial"],
  authors:     [{ name: "Dev Blog Team" }],

  // Default OG image (dipakai kalau halaman tidak punya OG image sendiri)
  openGraph: {
    type:        "website",
    locale:      "id_ID",
    url:         "https://devblog.com",
    siteName:    "Dev Blog",
    title:       "Dev Blog",
    description: "Artikel, tutorial, dan tips untuk Frontend Developer Indonesia.",
    images: [
      {
        url:    "/images/og-default.png",  // 1200x630px
        width:  1200,
        height: 630,
        alt:    "Dev Blog",
      },
    ],
  },

  twitter: {
    card:    "summary_large_image",
    site:    "@devblog_id",
    creator: "@devblog_id",
  },

  // Untuk verifikasi domain di Google Search Console
  verification: {
    google: "your-verification-code-here",
  },

  // Izinkan robot untuk index semua halaman secara default
  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:          true,
      follow:         true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet":  -1,
    },
  },
};
```

---

## 12. Sitemap Otomatis

```ts
// app/sitemap.ts
// Next.js akan generate /sitemap.xml dari file ini

import type { MetadataRoute } from "next";
import { getAllSlugs, getAllCategories } from "@/lib/blog";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://devblog.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Ambil semua slugs artikel dan semua kategori
  const [slugs, categories] = await Promise.all([
    getAllSlugs(),
    getAllCategories(),
  ]);

  // Halaman statis
  const staticPages: MetadataRoute.Sitemap = [
    {
      url:              BASE_URL,
      lastModified:     new Date(),
      changeFrequency:  "daily",   // Berapa sering konten berubah
      priority:         1.0,       // 0.0 - 1.0, halaman utama paling prioritas
    },
    {
      url:              `${BASE_URL}/blog/search`,
      lastModified:     new Date(),
      changeFrequency:  "monthly",
      priority:         0.3,
    },
  ];

  // Halaman artikel dinamis
  const articlePages: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url:             `${BASE_URL}/blog/${slug}`,
    lastModified:    new Date(),
    changeFrequency: "monthly" as const,
    priority:        0.8,
  }));

  // Halaman kategori
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url:             `${BASE_URL}/blog/category/${cat.slug}`,
    lastModified:    new Date(),
    changeFrequency: "weekly" as const,
    priority:        0.6,
  }));

  return [...staticPages, ...articlePages, ...categoryPages];
}
```

### robots.ts

```ts
// app/robots.ts
// Next.js generate /robots.txt dari file ini

import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://devblog.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent:  "*",
        allow:      "/",
        // Disallow halaman yang tidak perlu di-crawl
        disallow:   ["/api/", "/_next/"],
      },
    ],
    // Beritahu crawler di mana sitemap berada
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

---

## 13. Error Handling dengan error.tsx

```tsx
// app/blog/[slug]/error.tsx
"use client"; // Error components HARUS Client Component

import { useEffect }   from "react";
import Link            from "next/link";

interface ErrorPageProps {
  error:  Error & { digest?: string };
  reset:  () => void;  // Fungsi untuk retry
}

export default function ArticleError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error ke monitoring service (Sentry, dll.)
    console.error("Article error:", error);
  }, [error]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-20 text-center">
      <div className="text-6xl mb-6">😵</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Waduh, ada yang error
      </h1>
      <p className="text-gray-500 mb-8">
        Artikel ini tidak bisa dimuat saat ini. Coba refresh atau kembali ke beranda.
      </p>

      {/* Tampilkan error message di development saja */}
      {process.env.NODE_ENV === "development" && (
        <pre className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-left text-xs text-red-600 overflow-auto">
          {error.message}
          {error.stack && `\n\n${error.stack}`}
        </pre>
      )}

      <div className="flex gap-4 justify-center">
        <button
          onClick={reset}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          Coba Lagi
        </button>
        <Link
          href="/"
          className="rounded-lg border px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          Ke Beranda
        </Link>
      </div>
    </div>
  );
}
```

### not-found.tsx (Custom 404)

```tsx
// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-8xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Halaman Tidak Ditemukan
      </h1>
      <p className="text-gray-500 mb-8">
        Artikel atau halaman yang kamu cari tidak ada, mungkin sudah dihapus atau URL-nya salah.
      </p>
      <Link
        href="/"
        className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 transition"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
```

---

## 14. Komponen UI Reusable

### ArticleCard

```tsx
// components/blog/ArticleCard.tsx
import Image          from "next/image";
import Link           from "next/link";
import { CategoryBadge } from "./CategoryBadge";
import { formatDate } from "@/lib/utils";
import type { Article } from "@/types/blog.types";

interface ArticleCardProps {
  article:  Article;
  priority?: boolean;  // True untuk card pertama (LCP optimization)
}

export function ArticleCard({ article, priority = false }: ArticleCardProps) {
  return (
    <article className="group flex flex-col rounded-2xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition">
      {/* Cover Image */}
      <Link href={`/blog/${article.slug}`} className="relative block aspect-video overflow-hidden">
        <Image
          src={article.coverImage}
          alt={article.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
        />
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <CategoryBadge category={article.category} />

        <Link href={`/blog/${article.slug}`}>
          <h2 className="mt-2 text-lg font-semibold text-gray-900 leading-snug group-hover:text-blue-600 transition line-clamp-2">
            {article.title}
          </h2>
        </Link>

        <p className="mt-2 text-sm text-gray-500 line-clamp-2 flex-1">
          {article.excerpt}
        </p>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Image
              src={article.author.avatar}
              alt={article.author.name}
              width={20}
              height={20}
              className="rounded-full"
            />
            <span>{article.author.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <time dateTime={article.publishedAt}>
              {formatDate(article.publishedAt)}
            </time>
            <span>·</span>
            <span>{article.readingTime} menit baca</span>
          </div>
        </div>
      </div>
    </article>
  );
}
```

### ArticleGrid

```tsx
// components/blog/ArticleGrid.tsx
import { ArticleCard } from "./ArticleCard";
import type { Article } from "@/types/blog.types";

interface ArticleGridProps {
  articles: Article[];
}

export function ArticleGrid({ articles }: ArticleGridProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          priority={index < 2}  // Prioritas untuk 2 card pertama (LCP)
        />
      ))}
    </div>
  );
}
```

### CategoryBadge

```tsx
// components/blog/CategoryBadge.tsx
import Link from "next/link";
import type { Category } from "@/types/blog.types";

// Map warna ke Tailwind class
// (Tailwind tidak bisa parse class yang dibangun secara dinamis)
const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
  purple: { bg: "bg-purple-100", text: "text-purple-700" },
  blue:   { bg: "bg-blue-100",   text: "text-blue-700"   },
  green:  { bg: "bg-green-100",  text: "text-green-700"  },
  orange: { bg: "bg-orange-100", text: "text-orange-700" },
  pink:   { bg: "bg-pink-100",   text: "text-pink-700"   },
};

interface CategoryBadgeProps {
  category: Category;
  asLink?:  boolean;
}

export function CategoryBadge({ category, asLink = true }: CategoryBadgeProps) {
  const colors = COLOR_CLASSES[category.color] ?? COLOR_CLASSES.blue;
  const classes = `inline-block rounded-full px-3 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`;

  if (!asLink) {
    return <span className={classes}>{category.name}</span>;
  }

  return (
    <Link
      href={`/blog/category/${category.slug}`}
      className={`${classes} hover:opacity-75 transition`}
    >
      {category.name}
    </Link>
  );
}
```

### ArticleMeta

```tsx
// components/blog/ArticleMeta.tsx
import Image          from "next/image";
import { formatDate, formatDateRelative } from "@/lib/utils";
import type { Article } from "@/types/blog.types";

interface ArticleMetaProps {
  article:   Article;
  className?: string;
}

export function ArticleMeta({ article, className = "" }: ArticleMetaProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <Image
        src={article.author.avatar}
        alt={article.author.name}
        width={40}
        height={40}
        className="rounded-full"
      />
      <div>
        <p className="text-sm font-medium text-gray-900">
          {article.author.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <time dateTime={article.publishedAt} title={formatDate(article.publishedAt)}>
            {formatDateRelative(article.publishedAt)}
          </time>
          <span>·</span>
          <span>{article.readingTime} menit baca</span>
        </div>
      </div>
    </div>
  );
}
```

### ArticleContent

```tsx
// components/blog/ArticleContent.tsx
// Render konten HTML artikel dengan styling tipografi

interface ArticleContentProps {
  content: string;
}

export function ArticleContent({ content }: ArticleContentProps) {
  return (
    <div
      // Tailwind typography plugin: @tailwindcss/typography
      // Kalau tidak pakai plugin, pakai class manual di bawah
      className="prose prose-lg max-w-none
        prose-headings:font-bold prose-headings:text-gray-900
        prose-p:text-gray-600 prose-p:leading-relaxed
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
        prose-code:bg-gray-100 prose-code:rounded prose-code:px-1
        prose-pre:bg-gray-900 prose-pre:text-gray-100
        prose-img:rounded-xl
        prose-strong:text-gray-900
        prose-ul:text-gray-600 prose-ol:text-gray-600"
      dangerouslySetInnerHTML={{ __html: content }}
    />
    // Catatan: dangerouslySetInnerHTML aman jika konten berasal dari
    // sumber terpercaya (CMS milik sendiri). Untuk konten user-generated,
    // sanitize dulu dengan DOMPurify atau sanitize-html.
  );
}
```

> Install Tailwind Typography: `npm install -D @tailwindcss/typography` lalu tambahkan `plugins: [require('@tailwindcss/typography')]` di `tailwind.config.ts`.

### RelatedArticles

```tsx
// components/blog/RelatedArticles.tsx
import { ArticleCard } from "./ArticleCard";
import type { Article } from "@/types/blog.types";

interface RelatedArticlesProps {
  articles: Article[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Artikel Terkait
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
```

---

## 15. Server vs Client Component: Kapan Pakai Yang Mana?

### Aturan Praktis

```
Default: PAKAI SERVER COMPONENT
  → Tidak perlu menulis "use client"
  → Bisa async/await langsung di komponen
  → Bisa akses DB, API, file system secara langsung
  → Lebih efisien (tidak ada JS yang dikirim ke client)

Turun ke CLIENT COMPONENT kalau:
  → Butuh useState
  → Butuh useEffect
  → Butuh event handlers (onClick, onChange, onSubmit)
  → Butuh browser APIs (window, document, localStorage)
  → Butuh animasi/transisi (Framer Motion, dll.)
  → Butuh real-time updates (WebSocket, polling)
```

### Peta di Project Ini

```
app/page.tsx                  ← Server Component ✅ (fetch artikel)
app/blog/[slug]/page.tsx      ← Server Component ✅ (fetch + metadata)
app/blog/category/[c]/page.tsx ← Server Component ✅ (fetch)

components/blog/ArticleCard.tsx    ← Server Component ✅ (hanya display)
components/blog/ArticleGrid.tsx    ← Server Component ✅ (hanya display)
components/blog/ArticleMeta.tsx    ← Server Component ✅ (hanya display)
components/blog/RelatedArticles.tsx ← Server Component ✅ (hanya display)
components/blog/CategoryBadge.tsx  ← Server Component ✅ (hanya link)

components/blog/SearchBar.tsx      ← Client Component ⚡ (useRouter, onChange)
components/layout/Navbar.tsx       ← Server Component ✅ (hanya nav links)
app/blog/[slug]/error.tsx          ← Client Component ⚡ (WAJIB untuk error)
```

### Contoh Nyata: Mana yang Tepat?

```tsx
// ❌ Tidak perlu Client Component untuk ini
"use client";
function ArticleTitle({ title }: { title: string }) {
  return <h1>{title}</h1>;
  // Ini pure display — tidak ada state, tidak ada event
  // Mengirim JS ke client yang tidak diperlukan
}

// ✅ Server Component sudah cukup
function ArticleTitle({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

// ─────────────────────────────────────────────────────────────────

// ✅ Ini memang perlu Client Component: ada interaktivitas
"use client";
function LikeButton({ articleId }: { articleId: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  async function handleLike() {
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);
    await fetch(`/api/articles/${articleId}/like`, { method: "POST" });
  }

  return (
    <button onClick={handleLike} aria-pressed={liked}>
      {liked ? "❤️" : "🤍"} {count}
    </button>
  );
}
```

### Pola: Server Component Membungkus Client Component

```tsx
// ✅ Pola terbaik: fetch di server, pass ke client component

// app/blog/[slug]/page.tsx (Server Component)
export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article  = await getArticleBySlug(slug); // Fetch di server ✅
  if (!article) notFound();

  return (
    <div>
      <h1>{article.title}</h1>
      <ArticleContent content={article.content} />

      {/* Pass data yang sudah di-fetch ke client component */}
      <LikeButton
        articleId={article.id}
        initialLikeCount={article.likeCount}
      />
      {/* LikeButton adalah Client Component, tapi data sudah dari server */}
    </div>
  );
}
```

---

## 16. Checklist SEO Sebelum Deploy

### Metadata

```
☐ Setiap halaman punya <title> yang unik dan deskriptif?
  → Gunakan title template: "%s — Nama Situs"
  → Title ideal: 50-60 karakter

☐ Setiap halaman punya meta description yang unik?
  → 150-160 karakter
  → Jelaskan isi halaman, bukan hanya nama situs

☐ generateMetadata() sudah diimplementasi di semua halaman dinamis?
  → /blog/[slug] ✅
  → /blog/category/[category] ✅
  → /blog/search ✅

☐ Open Graph tags sudah benar?
  → og:title, og:description, og:image, og:type, og:url
  → Test dengan: developers.facebook.com/tools/debug

☐ Twitter Card sudah benar?
  → twitter:card (summary_large_image)
  → twitter:title, twitter:description, twitter:image
  → Test dengan: cards-dev.twitter.com/validator

☐ OG image ukuran yang benar?
  → Minimal 1200x630px untuk og:image
  → Format: PNG atau JPG
```

### Technical SEO

```
☐ Sitemap.xml sudah ada dan accessible?
  → Cek: yourdomain.com/sitemap.xml
  → Submit ke Google Search Console

☐ robots.txt sudah benar?
  → Cek: yourdomain.com/robots.txt
  → Tidak memblokir halaman yang harus di-crawl

☐ Canonical URL sudah di-set?
  → Mencegah duplicate content issue
  → alternates: { canonical: url } di metadata

☐ Structured Data (JSON-LD) sudah ada?
  → Article schema untuk artikel blog
  → Membantu Google tampilkan rich results
  → Contoh:
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Judul Artikel",
      "author": { "@type": "Person", "name": "Nama Penulis" },
      "datePublished": "2024-11-10T08:00:00Z"
    }
    </script>

☐ Semua gambar punya alt text yang deskriptif?
  → Penting untuk aksesibilitas dan SEO gambar

☐ Heading hierarchy benar?
  → Satu <h1> per halaman
  → <h2> untuk section, <h3> untuk sub-section
  → Tidak skip level (h1 → h3 tanpa h2)
```

### Performance (Langsung Pengaruhi SEO)

```
☐ Core Web Vitals sudah bagus?
  → Test dengan: pagespeed.web.dev
  → LCP < 2.5 detik
  → CLS < 0.1
  → FID/INP < 200ms

☐ Next/image digunakan untuk semua gambar?
  → Lazy loading otomatis
  → Optimasi ukuran otomatis
  → WebP/AVIF conversion otomatis

☐ Priority flag di-set untuk gambar above-the-fold?
  → <Image priority> untuk LCP image
  → Maksimal 1-2 gambar yang priority per halaman

☐ Font sudah dioptimasi?
  → Pakai next/font (Google Fonts atau local)
  → Akan otomatis di-preload dan tidak ada FOUT

☐ JavaScript bundle tidak terlalu besar?
  → Cek dengan: next build && next analyze
  → Lazy load komponen yang berat
```

### Aksesibilitas (Juga SEO Signal)

```
☐ Semua link punya teks yang deskriptif?
  → Bukan "klik di sini" — gunakan "Baca artikel tentang React"

☐ Semua form element punya label?
  → Input search punya aria-label

☐ Warna contrast memenuhi WCAG AA?
  → Rasio minimal 4.5:1 untuk teks normal
  → Test: webaim.org/resources/contrastchecker

☐ Keyboard navigation berfungsi?
  → Semua tombol dan link bisa diakses dengan Tab
  → Focus indicator terlihat jelas
```

---

## Cara Menjalankan Project

```bash
# 1. Install dependencies
npm install

# 2. (Opsional) Install Tailwind Typography untuk styling artikel
npm install -D @tailwindcss/typography

# 3. Tambahkan ke tailwind.config.ts:
#    plugins: [require('@tailwindcss/typography')],

# 4. Jalankan development server
npm run dev

# Buka: http://localhost:3000
# Artikel tersedia di: http://localhost:3000/blog/memahami-react-server-components
# Kategori: http://localhost:3000/blog/category/tutorial
# Search: http://localhost:3000/?search=react
```

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Next.js 15*
