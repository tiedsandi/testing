# Arsitektur Project Next.js yang Scalable: Struktur Folder untuk Tim

> **Prerequisite:** Paham Next.js App Router (doc 06) dan prinsip clean code (doc 10). Doc ini tentang "bagaimana menyusun file-file kamu agar tidak kacau saat project membesar".

---

## Daftar Isi

1. [Kenapa Struktur Folder Itu Penting?](#1-kenapa-struktur-folder-itu-penting)
2. [Type-Based vs Feature-Based: Dua Filosofi](#2-type-based-vs-feature-based-dua-filosofi)
3. [Struktur untuk Project Kecil](#3-struktur-untuk-project-kecil)
4. [Struktur untuk Project Menengah](#4-struktur-untuk-project-menengah)
5. [Struktur untuk Project Besar](#5-struktur-untuk-project-besar)
6. [Isi Tiap Folder: Apa yang Masuk ke Mana?](#6-isi-tiap-folder-apa-yang-masuk-ke-mana)
7. [Barrel Exports (index.ts): Keuntungan dan Jebakan](#7-barrel-exports-indexts-keuntungan-dan-jebakan)
8. [Cara Import Antar Folder](#8-cara-import-antar-folder)
9. [Kapan Abstraksi, Kapan Over-Engineering](#9-kapan-abstraksi-kapan-over-engineering)
10. [Anti-Pattern yang Terlihat Rapi tapi Menyiksa](#10-anti-pattern-yang-terlihat-rapi-tapi-menyiksa)
11. [Pengenalan Monorepo](#11-pengenalan-monorepo)
12. [Mini Project: Rancang Struktur E-commerce](#12-mini-project-rancang-struktur-e-commerce)
13. [Checklist Sebelum Mulai Project Baru](#13-checklist-sebelum-mulai-project-baru)

---

## 1. Kenapa Struktur Folder Itu Penting?

Bayangkan kamu harus mencari satu file di antara 200 file yang semuanya ditaruh di satu folder:

```
src/
  ├── Button.tsx
  ├── Card.tsx
  ├── CartAPI.ts
  ├── checkout.ts
  ├── fetchProducts.ts
  ├── formatCurrency.ts
  ├── Header.tsx
  ├── HomePage.tsx
  ├── loginForm.tsx
  ├── productCard.tsx
  ├── productHelpers.ts
  ├── types.ts
  ├── UserAPI.ts
  ├── useCart.ts
  └── ... 186 file lagi
```

Saat project kecil, ini masih oke. Tapi saat project berkembang:
- "File ini ada di mana ya?"
- "Ini duplikat fungsi yang sudah ada atau bukan?"
- "Kalau aku hapus file ini, yang lain akan error nggak?"

Struktur folder yang baik menjawab pertanyaan **"di mana sesuatu harus berada"** secara konsisten. Tim baru bisa onboard lebih cepat. Kamu sendiri bisa kembali ke project setelah 3 bulan dan masih tahu mau ke mana.

---

## 2. Type-Based vs Feature-Based: Dua Filosofi

Ada dua cara besar untuk menyusun folder: berdasarkan **tipe file** atau berdasarkan **fitur**.

### Type-Based (a.k.a. Technical Separation)

Pisah berdasarkan "jenis" teknikal file: semua komponen di satu folder, semua hook di satu folder, semua tipe di satu folder.

```
src/
  ├── components/     ← semua komponen (ProductCard, UserAvatar, Modal, ...)
  ├── hooks/          ← semua hook (useProducts, useCart, useAuth, ...)
  ├── services/       ← semua API call
  ├── types/          ← semua TypeScript types
  └── utils/          ← semua fungsi helper
```

**Cocok untuk:**
- Project kecil (< 10 fitur)
- Tim kecil (1-3 developer)
- App yang mayoritas CRUD sederhana
- Phase awal project yang belum jelas arah fiturnya

**Masalahnya saat project besar:**
```
Kamu mau kerjain fitur "Checkout":

Harus buka:
  components/CheckoutForm.tsx
  components/OrderSummary.tsx
  components/PaymentMethod.tsx
  hooks/useCheckout.ts
  hooks/usePayment.ts
  services/checkoutService.ts
  services/paymentService.ts
  types/checkout.types.ts
  types/payment.types.ts

File untuk satu fitur tersebar di 9 folder berbeda.
Kalau mau hapus fitur Checkout → harus hunting file di mana-mana.
```

---

### Feature-Based (a.k.a. Domain/Module Separation)

Pisah berdasarkan "domain" atau fitur. Semua yang berkaitan dengan satu fitur ada di satu tempat.

```
src/
  ├── features/
  │   ├── auth/
  │   │   ├── components/
  │   │   ├── hooks/
  │   │   ├── services/
  │   │   └── types/
  │   ├── products/
  │   │   ├── components/
  │   │   ├── hooks/
  │   │   ├── services/
  │   │   └── types/
  │   └── checkout/
  │       └── ...
  └── shared/         ← yang dipakai lintas-fitur
      ├── components/
      ├── hooks/
      └── utils/
```

**Cocok untuk:**
- Project menengah-besar (10+ fitur yang jelas)
- Tim besar di mana tiap developer/sub-tim kerja di fitur berbeda
- App dengan domain yang jelas dan terpisah

**Keuntungannya:**
```
Mau kerja di fitur Checkout?
Buka satu folder: features/checkout/
Semua ada di situ. 

Mau hapus fitur? Delete satu folder.
Mau share fitur ke project lain? Copy satu folder.
```

---

### Kenyataan: Hybrid Adalah yang Paling Umum

Di prakteknya, hampir semua project pakai pendekatan **hybrid**:

```
src/
  ├── app/            ← Next.js routing (wajib)
  ├── features/       ← Domain spesifik (feature-based)
  ├── components/     ← Shared UI components (type-based)
  ├── hooks/          ← Shared hooks
  ├── lib/            ← Shared utilities & configs
  └── types/          ← Shared types
```

Prinsipnya: **fitur yang jelas dan besar → feature-based. Utility yang dipakai lintas-fitur → type-based di shared.**

---

## 3. Struktur untuk Project Kecil

Project kecil = landing page, portfolio, blog sederhana, CRUD dengan 3-5 halaman. Satu developer atau tim kecil.

```
my-app/
├── app/                          ← Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   ├── about/
│   │   └── page.tsx
│   ├── blog/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   └── globals.css
│
├── components/                   ← Semua komponen UI
│   ├── ui/                       ← Komponen generik (Button, Input, Modal)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   ├── layout/                   ← Komponen layout
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── BlogCard.tsx              ← Komponen domain-spesifik
│
├── lib/                          ← Utility, helpers, configs
│   ├── formatters.ts
│   └── constants.ts
│
├── types/                        ← TypeScript types
│   └── index.ts                  ← Semua type di satu file (project kecil)
│
├── public/
│   └── images/
│
└── package.json
```

**Aturan thumb untuk project kecil:**
- Tidak perlu `features/` folder — terlalu early
- Semua component di satu `components/` folder
- `lib/` untuk semua utility yang tidak masuk kategori lain
- Satu file `types/index.ts` sudah cukup

---

## 4. Struktur untuk Project Menengah

Project menengah = SaaS app, dashboard, e-commerce kecil. Tim 2-5 developer, 5-15 halaman yang berbeda domain.

```
my-app/
├── app/                          ← Next.js App Router (routing saja)
│   ├── (auth)/                   ← Route group untuk hal-hal auth
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/              ← Route group untuk dashboard
│   │   ├── layout.tsx            ← Layout shared untuk semua dashboard pages
│   │   ├── page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── orders/
│   │       └── page.tsx
│   ├── api/
│   │   └── ...
│   └── layout.tsx
│
├── features/                     ← Fitur-fitur utama (domain logic)
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── RegisterForm.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   └── authService.ts    ← API calls untuk auth
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts              ← Barrel export
│   │
│   ├── products/
│   │   ├── components/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   └── ProductFilters.tsx
│   │   ├── hooks/
│   │   │   ├── useProducts.ts
│   │   │   └── useProductFilters.ts
│   │   ├── services/
│   │   │   └── productService.ts
│   │   ├── types/
│   │   │   └── product.types.ts
│   │   └── index.ts
│   │
│   └── orders/
│       └── ...
│
├── components/                   ← Shared UI components (dipakai lintas-fitur)
│   ├── ui/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Table/
│   │   └── Badge/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── feedback/
│       ├── LoadingSpinner.tsx
│       ├── ErrorMessage.tsx
│       └── EmptyState.tsx
│
├── hooks/                        ← Shared hooks (dipakai lintas-fitur)
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
│
├── lib/                          ← Shared utilities & configs
│   ├── api.ts                    ← Base fetch helper
│   ├── formatters.ts
│   ├── validators.ts
│   └── constants.ts
│
├── types/                        ← Shared types (lintas-fitur)
│   ├── api.types.ts              ← Tipe response API generik
│   └── common.types.ts           ← Tipe umum (Pagination, Status, dll.)
│
├── styles/
│   ├── globals.css
│   └── variables.css
│
└── public/
```

---

## 5. Struktur untuk Project Besar

Project besar = platform dengan 20+ fitur, tim 10+ developer, mungkin multiple sub-tim yang kerja paralel.

```
my-app/
├── app/                          ← Routing SAJA — tidak ada logic di sini
│   ├── (marketing)/              ← Sub-app: halaman publik
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── pricing/
│   ├── (app)/                    ← Sub-app: halaman dalam dashboard
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── analytics/
│   │   └── settings/
│   └── api/
│       └── v1/
│
├── features/                     ← Modul-modul domain
│   ├── catalog/                  ← Domain: Product catalog
│   │   ├── components/
│   │   │   ├── ProductCard/
│   │   │   ├── ProductGrid/
│   │   │   ├── ProductDetail/
│   │   │   └── CategoryBrowser/
│   │   ├── hooks/
│   │   │   ├── useProductList.ts
│   │   │   ├── useProductDetail.ts
│   │   │   └── useCategoryTree.ts
│   │   ├── services/
│   │   │   ├── productService.ts
│   │   │   └── categoryService.ts
│   │   ├── store/               ← State management khusus fitur ini
│   │   │   └── catalogStore.ts
│   │   ├── types/
│   │   │   ├── product.types.ts
│   │   │   └── category.types.ts
│   │   ├── utils/               ← Util khusus untuk domain ini
│   │   │   └── productHelpers.ts
│   │   └── index.ts
│   │
│   ├── cart/
│   ├── checkout/
│   ├── auth/
│   ├── orders/
│   ├── analytics/
│   └── settings/
│
├── shared/                       ← Semua yang lintas fitur
│   ├── components/               ← Design system / UI primitives
│   │   ├── ui/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Select/
│   │   │   ├── Modal/
│   │   │   ├── Table/
│   │   │   ├── Tabs/
│   │   │   ├── Toast/
│   │   │   └── Badge/
│   │   ├── layout/
│   │   │   ├── AppShell/
│   │   │   ├── Navbar/
│   │   │   └── Sidebar/
│   │   ├── data-display/
│   │   │   ├── DataTable/
│   │   │   ├── Chart/
│   │   │   └── StatCard/
│   │   └── feedback/
│   │       ├── Skeleton/
│   │       ├── EmptyState/
│   │       └── ErrorBoundary/
│   │
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── usePagination.ts
│   │   ├── useIntersectionObserver.ts
│   │   └── useMediaQuery.ts
│   │
│   ├── services/
│   │   ├── apiClient.ts          ← Base HTTP client (axios/fetch wrapper)
│   │   └── storageService.ts
│   │
│   ├── store/
│   │   ├── authStore.ts          ← Global state (Zustand)
│   │   └── uiStore.ts
│   │
│   ├── lib/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── dateUtils.ts
│   │   └── constants.ts
│   │
│   └── types/
│       ├── api.types.ts
│       ├── common.types.ts
│       └── env.d.ts
│
├── config/                       ← Konfigurasi app
│   ├── navigation.ts             ← Menu items, nav links
│   ├── permissions.ts            ← RBAC config
│   └── seo.ts                    ← Default SEO metadata
│
└── public/
    ├── icons/
    ├── images/
    └── fonts/
```

---

## 6. Isi Tiap Folder: Apa yang Masuk ke Mana?

### `app/` — Routing SAJA

```
app/ hanya berisi:
  ✅ page.tsx, layout.tsx, loading.tsx, error.tsx, not-found.tsx
  ✅ Thin "orchestrator" — import komponen dari features/, render, selesai
  ✅ generateMetadata, generateStaticParams

  ❌ Logic bisnis
  ❌── useEffect yang panjang
  ❌── Komponen dengan 100+ baris
  ❌── Direct fetch yang sudah ada di services/

Analogi: app/ = resepsionis yang mengarahkan tamu ke ruangan yang tepat,
         bukan yang mengerjakan semua pekerjaan.
```

```tsx
// ✅ app/products/page.tsx yang benar — tipis, jelas
import { ProductGrid } from "@/features/products";
import { getProducts } from "@/features/products/services/productService";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Produk" };

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductGrid products={products} />;
}

// ❌ app/products/page.tsx yang salah — terlalu gemuk
export default async function ProductsPage() {
  // 20 baris useState/useEffect
  // 30 baris logic filter dan sort
  // 50 baris JSX inline
  // Tipe any di mana-mana
}
```

---

### `features/[domain]/` — Satu Domain, Satu Folder

Setiap sub-folder di `features/` merepresentasikan satu **domain bisnis**:

```
features/
  ├── products/   ← Domain: semua tentang produk
  ├── cart/       ← Domain: semua tentang keranjang belanja
  ├── auth/       ← Domain: semua tentang autentikasi
  ├── orders/     ← Domain: semua tentang pesanan
  └── users/      ← Domain: profil dan manajemen user
```

Isi tiap domain:

```
features/products/
  ├── components/        ← Komponen yang HANYA dipakai di domain ini
  │   ├── ProductCard/
  │   ├── ProductGrid/
  │   └── ProductFilters/
  │
  ├── hooks/             ← Custom hooks untuk domain ini
  │   ├── useProductList.ts      → fetch list produk + filter + pagination
  │   └── useProductDetail.ts   → fetch detail satu produk
  │
  ├── services/          ← API calls untuk domain ini
  │   └── productService.ts     → getProducts(), getProductById(), dll.
  │
  ├── types/             ← TypeScript types untuk domain ini
  │   └── product.types.ts      → Product, Category, ProductFilter, dll.
  │
  ├── utils/             ← Helper functions KHUSUS domain ini
  │   └── productHelpers.ts     → sortProducts(), filterByCategory(), dll.
  │
  └── index.ts           ← Public API domain ini (barrel export)
```

**Aturan penting:** Komponen di dalam `features/products/` **tidak boleh** import dari `features/cart/` secara langsung. Kalau ada kebutuhan lintas-domain, komunikasi harus lewat:
1. Props/callback (paling sederhana)
2. Shared state (Zustand/Context)
3. Event (custom events)

---

### `components/` atau `shared/components/` — UI yang Bisa Dipakai Di Mana Saja

```
components/
  ├── ui/              ← Primitif — tidak punya logic bisnis
  │   ├── Button/      ← Mau jenis button apapun, lewat props
  │   ├── Input/
  │   ├── Modal/
  │   └── Badge/
  │
  ├── layout/          ← Struktur halaman
  │   ├── Navbar/
  │   └── Sidebar/
  │
  └── feedback/        ← State loading/error/empty
      ├── Skeleton/
      └── EmptyState/
```

**Test yang bagus untuk `shared/components`:**
> "Kalau project ini jadi dua app berbeda (e-commerce dan admin panel), apakah komponen ini bisa dipakai di keduanya tanpa modifikasi?"
>
> Kalau ya → masuk `shared/components`.
> Kalau tidak (ada logic bisnis spesifik) → tetap di `features/`.

---

### `lib/` atau `shared/lib/` — Utility & Helper

```
lib/
  ├── formatters.ts    ← Semua fungsi format (rupiah, tanggal, angka)
  ├── validators.ts    ← Fungsi validasi yang tidak pakai Zod
  ├── constants.ts     ← Magic numbers, enum-like constants
  ├── dateUtils.ts     ← Manipulasi tanggal (kalau tidak pakai date-fns)
  └── api.ts           ← Base fetch helper, error handling
```

```ts
// lib/constants.ts — jangan hardcode di komponen

// ✅ Konstanta dengan nama yang jelas
export const MAX_CART_ITEMS      = 10;
export const FREE_SHIPPING_THRESHOLD = 200_000; // Rp 200.000
export const PRODUCT_IMAGE_SIZES = [640, 750, 828, 1080, 1200] as const;

export const BREAKPOINTS = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  "2xl": 1536,
} as const;

export const API_ROUTES = {
  products:   "/api/v1/products",
  categories: "/api/v1/categories",
  cart:       "/api/v1/cart",
  orders:     "/api/v1/orders",
} as const;

// ❌ Jangan taruh di dalam komponen
function ProductCard() {
  if (item.price > 200000) { // ← Magic number!
    // ...
  }
}
```

---

### `services/` — Semua Komunikasi dengan Dunia Luar

```ts
// Apa itu service layer?
// Service = fungsi yang berkomunikasi dengan API / database / storage
// Komponen tidak boleh langsung fetch — lewat service dulu

// features/products/services/productService.ts

import { apiClient } from "@/shared/services/apiClient";
import type { Product, ProductFilter, ApiProductResponse } from "../types/product.types";
import { toProduct } from "../utils/productHelpers";

interface GetProductsOptions {
  filter?:   ProductFilter;
  page?:     number;
  pageSize?: number;
}

export async function getProducts(options: GetProductsOptions = {}): Promise<{
  products:    Product[];
  totalPages:  number;
  totalItems:  number;
}> {
  const params = new URLSearchParams();
  if (options.filter?.category) params.set("category", options.filter.category);
  if (options.filter?.minPrice) params.set("minPrice", String(options.filter.minPrice));
  if (options.page)             params.set("page", String(options.page));
  if (options.pageSize)         params.set("pageSize", String(options.pageSize));

  const data = await apiClient.get<ApiProductResponse>(`/products?${params}`);

  return {
    products:   data.items.map(toProduct),  // Transform API → UI type
    totalPages: data.totalPages,
    totalItems: data.totalCount,
  };
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const data = await apiClient.get<ApiProductResponse["items"][0]>(`/products/${id}`);
    return toProduct(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// ✅ Keuntungan service layer:
// 1. Komponen tidak tahu URL API → mudah ganti endpoint
// 2. Transform API → UI terjadi di satu tempat
// 3. Error handling terpusat
// 4. Bisa di-mock saat testing komponen
```

---

### `types/` — TypeScript Types yang Bersama

```ts
// types/common.types.ts — tipe umum yang dipakai lintas-fitur

// Pagination
export interface PaginatedResponse<T> {
  data:        T[];
  page:        number;
  pageSize:    number;
  totalPages:  number;
  totalItems:  number;
}

// Async state pattern
export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error";   error: string };

// Generic API error
export interface ApiError {
  code:    string;
  message: string;
  details?: Record<string, string[]>;
}

// Sorting
export interface SortConfig<T extends string = string> {
  field:     T;
  direction: "asc" | "desc";
}

// ID types — pakai branded types untuk type safety
export type ProductId  = string & { readonly _brand: "ProductId"  };
export type UserId     = string & { readonly _brand: "UserId"     };
export type OrderId    = string & { readonly _brand: "OrderId"    };

// Dengan branded types, ini akan error di TypeScript:
// const productId: ProductId = "abc" as UserId; // ← Type error!
// Mencegah tukar-menukar ID yang berbeda domain
```

---

## 7. Barrel Exports (index.ts): Keuntungan dan Jebakan

Barrel export = file `index.ts` yang mengumpulkan dan re-export semua export dari folder tersebut.

### Tanpa Barrel Export

```ts
// Import dengan path panjang dan specific
import { ProductCard }    from "@/features/products/components/ProductCard/ProductCard";
import { ProductGrid }    from "@/features/products/components/ProductGrid/ProductGrid";
import { useProductList } from "@/features/products/hooks/useProductList";
import type { Product }   from "@/features/products/types/product.types";

// Masalah:
// 1. Import panjang dan mengekspos internal structure
// 2. Kalau file dipindah → semua import harus diupdate
// 3. Sulit tahu apa saja yang "public" dari fitur ini
```

### Dengan Barrel Export

```ts
// features/products/index.ts — "Public API" dari fitur products
// Hanya export yang BOLEH dipakai dari luar folder ini

// Components — re-export dari sub-folder
export { ProductCard }    from "./components/ProductCard/ProductCard";
export { ProductGrid }    from "./components/ProductGrid/ProductGrid";
export { ProductFilters } from "./components/ProductFilters/ProductFilters";

// Hooks — hanya yang dimaksud untuk dipakai dari luar
export { useProductList }   from "./hooks/useProductList";
export { useProductDetail } from "./hooks/useProductDetail";

// Services
export { getProducts, getProductById } from "./services/productService";

// Types — export type untuk re-export types saja (tree-shaking friendly)
export type { Product, ProductFilter, Category } from "./types/product.types";

// TIDAK di-export:
// - ProductCard.module.css
// - productHelpers.ts (internal utility)
// - Tipe internal yang tidak perlu diketahui dari luar
```

```ts
// Sekarang import dari luar jadi bersih:
import { ProductCard, ProductGrid, useProductList } from "@/features/products";
import type { Product } from "@/features/products";
```

### Jebakan Barrel Export

```ts
// ❌ Jebakan 1: Circular dependency
// features/auth/index.ts
export { useAuth } from "./hooks/useAuth";

// features/products/hooks/useProducts.ts
import { useAuth } from "@/features/auth"; // ← OK

// features/auth/hooks/useAuth.ts
import { getProducts } from "@/features/products"; // ← CIRCULAR!
// auth bergantung ke products, products bergantung ke auth

// ✅ Solusi: fitur tidak boleh bergantung satu sama lain secara circular
// Kalau butuh data dari fitur lain → lewat props atau shared state


// ❌ Jebakan 2: Barrel dari seluruh shared/components
// shared/components/index.ts
export * from "./ui/Button";
export * from "./ui/Input";
export * from "./ui/Modal";
export * from "./ui/Table";
// ... 30+ komponen lainnya

// Masalah: kalau ada satu file bermasalah,
// SEMUA import dari shared/components ikut gagal.
// Next.js juga bisa import lebih banyak dari yang dibutuhkan.

// ✅ Lebih baik: barrel per sub-folder
// shared/components/ui/index.ts
export { Button } from "./Button/Button";
export { Input }  from "./Input/Input";
// dst.

// Lalu import spesifik:
import { Button } from "@/shared/components/ui";
// bukan:
import { Button } from "@/shared/components"; // ← Load semua subfolder


// ❌ Jebakan 3: Barrel di level terlalu dalam
// Setiap subfolder punya index.ts → index lagi → index lagi
// features/products/components/ProductCard/index.ts
// features/products/components/index.ts
// features/products/index.ts
// Terlalu banyak indirection — susah trace kode aslinya

// ✅ Satu barrel per feature (index.ts di root feature folder) sudah cukup
// features/products/index.ts
// Tidak perlu barrel di setiap sub-sub-folder
```

---

## 8. Cara Import Antar Folder

Atur path alias di `tsconfig.json` agar import tidak pakai `../../../`:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*":          ["./*"],
      "@features/*":  ["./features/*"],
      "@shared/*":    ["./shared/*"],
      "@components/*":["./shared/components/*"],
      "@hooks/*":     ["./shared/hooks/*"],
      "@lib/*":       ["./shared/lib/*"],
      "@types/*":     ["./shared/types/*"]
    }
  }
}
```

```ts
// Tanpa alias — menyiksa:
import { Button }      from "../../../../shared/components/ui/Button/Button";
import { formatRupiah} from "../../../shared/lib/formatters";

// Dengan alias — bersih:
import { Button }       from "@components/ui";
import { formatRupiah } from "@lib/formatters";
import { useProducts }  from "@features/products";
```

### Aturan Import: Layer Architecture

Project yang sehat punya arah dependency yang satu arah:

```
app/ (routing)
  ↓ boleh import dari
features/ (domain logic)
  ↓ boleh import dari
shared/ (shared utilities)
  ↓ boleh import dari
lib/ (pure functions, no React)

TIDAK BOLEH ke atas:
  lib/ → TIDAK BOLEH import dari features/
  shared/ → TIDAK BOLEH import dari features/
  features/auth/ → TIDAK BOLEH import dari features/products/ (horizontal)
```

```ts
// ✅ Arah yang benar
// features/products/services/productService.ts
import { apiClient } from "@shared/services/apiClient"; // Ke bawah ✅
import { formatRupiah } from "@lib/formatters";         // Ke bawah ✅

// ❌ Arah yang salah
// shared/components/ui/Button.tsx
import { useAuth } from "@features/auth";  // Ke atas ❌
// Button seharusnya tidak tahu tentang auth!

// ❌ Import horizontal antar fitur (langsung, tanpa lewat shared)
// features/checkout/hooks/useCheckout.ts
import { ProductCard } from "@features/products/components/ProductCard"; // ❌
// Kalau butuh ProductCard di checkout → pindah ke shared/components
```

---

## 9. Kapan Abstraksi, Kapan Over-Engineering

Ini yang sering bikin junior bingung: "Haruskah aku buat service layer untuk ini? Haruskah semua di feature folder?"

### Panduan Sederhana

```
Baru mulai project (0-2 bulan, < 5 fitur)?
  → Flat structure. Jangan terlalu banyak folder.
  → Refactor nanti kalau sudah keliatan polanya.

Mulai ada 5+ fitur yang jelas batasannya?
  → Mulai pindah ke features/ folder.
  → Komponen yang dipakai 2+ tempat → pindah ke shared/.

Sudah 10+ fitur, tim lebih dari 3 orang?
  → Feature-based penuh dengan shared/ terpisah.
  → Pertimbangkan barrel exports.
  → Mungkin mulai pertimbangkan monorepo.
```

### Sinyal Over-Engineering

```
❌ Kamu buat service layer untuk app yang cuma 2 halaman

❌ Setiap komponen punya folder sendiri walaupun isinya 1 file:
   components/
     Button/
       Button.tsx  ← Folder untuk satu file? Tidak perlu kalau belum ada test/css
       index.ts
   → Cukup Button.tsx sampai dia punya Button.test.tsx atau Button.module.css

❌ Kamu buat abstraksi "buat-buat" sebelum ada dua use case konkret:
   // Abstraksi prematur
   class DataFetcher<T, K extends keyof T> {
     constructor(private transformer: TransformerFn<T, K>) {}
     // ... 50 baris untuk fetch 1 endpoint
   }
   // Padahal: fetch("/api/products").then(r => r.json()) sudah cukup

❌ Feature folder dengan hanya 2-3 file:
   features/
     profilePicture/     ← Terlalu granular
       ProfilePicture.tsx
       useProfilePicture.ts
   → Ini masih bisa masuk ke features/users/ atau features/profile/

❌ Barrel export semua dari semua tempat:
   // Di setiap file .tsx ada index.ts yang re-export
   // 20 level barrel → webpack/turbopack bingung, dev server lambat
```

### Sinyal Waktunya Refactor (Bukan Over-Engineering)

```
✓ Kamu copy-paste folder struktur yang sama dari fitur A ke fitur B?
  → Waktunya bikin template atau abstrak yang lebih jelas.

✓ Kamu harus update 5+ file hanya untuk ganti satu URL API endpoint?
  → Waktunya buat service layer.

✓ Kamu tidak ingat di mana file X berada tanpa Ctrl+P search?
  → Waktunya reorganisasi.

✓ Ada 2 developer yang kerja di fitur berbeda tapi selalu conflict di git?
  → Waktunya pisah ke feature folders yang lebih jelas.

✓ Komponen kamu sudah di-import dari 5+ halaman berbeda?
  → Waktunya pindah ke shared/ dan buat lebih generic.
```

---

## 10. Anti-Pattern yang Terlihat Rapi tapi Menyiksa

### Anti-Pattern 1: Folder "Utils" yang Jadi Tempat Sampah

```
❌ utils/ yang tidak terstruktur — semua "yang tidak tahu taruh di mana" masuk sini

utils/
  ├── arrayUtils.ts
  ├── authHelper.ts       ← Ini logic auth, bukan utility umum!
  ├── cartCalculations.ts ← Ini domain logic cart!
  ├── dateHelpers.ts
  ├── formatters.ts
  ├── productTransform.ts ← Ini seharusnya di features/products/utils/
  ├── stringUtils.ts
  └── validateEmail.ts

Setelah 6 bulan: utils/ punya 40+ file tanpa kategorisasi jelas.

✅ Pisahkan berdasarkan scope:
  lib/                    ← Pure utility, tidak domain-specific
    formatters.ts
    dateUtils.ts
    stringUtils.ts

  features/cart/utils/    ← Utility khusus cart
    cartCalculations.ts

  features/products/utils/ ← Utility khusus produk
    productTransform.ts

  features/auth/          ← Logic auth ada di feature auth
    services/authService.ts
```

---

### Anti-Pattern 2: "God Component" yang Tidak Pernah Dipecah

```tsx
// ❌ DashboardPage.tsx — 800 baris, melakukan segalanya
// Terlihat "rapi" karena hanya satu file, tapi:

export default function DashboardPage() {
  // 50 baris state
  const [products, setProducts] = useState([]);
  const [orders, setOrders]     = useState([]);
  const [users, setUsers]       = useState([]);
  const [analytics, setAnalytics] = useState({});
  // ...

  // 80 baris useEffect
  useEffect(() => { /* fetch products */ }, []);
  useEffect(() => { /* fetch orders   */ }, []);
  useEffect(() => { /* fetch users    */ }, []);
  // ...

  // 600 baris JSX dengan semua domain campur
  return (
    <div>
      {/* Product section */}
      {products.map(p => (
        <div key={p.id}>
          {/* inline semua styling dan logic */}
        </div>
      ))}
      {/* Order section */}
      {/* User section */}
      {/* Analytics section */}
    </div>
  );
}

// Masalah:
// - Git blame tidak berguna — semuanya di satu file
// - Merge conflict terus-terusan antar developer
// - Tidak bisa test bagian-bagian secara terpisah
// - Lambat di-render karena semua state dan effect dalam satu komponen
```

---

### Anti-Pattern 3: Types yang Terlalu Di-share

```ts
// ❌ Satu file types.ts untuk SEMUA tipe seluruh app

// types.ts — 500 baris, semua domain campur
export interface User { ... }
export interface Product { ... }
export interface Order { ... }
export interface Cart { ... }
export interface Category { ... }
export interface Payment { ... }
export interface Shipment { ... }
// + 50 tipe lainnya

// Masalah:
// - Setiap orang edit file yang sama → conflict terus
// - Tidak jelas tipe mana "milik" domain mana
// - Import apa saja dari satu file besar → bundle besar

// ✅ Tipe tinggal di dekat domain-nya
features/
  products/types/product.types.ts    → Product, Category
  orders/types/order.types.ts        → Order, OrderItem
  auth/types/auth.types.ts           → User, Session, Role
  cart/types/cart.types.ts           → Cart, CartItem

shared/types/common.types.ts         → Tipe umum (Pagination, AsyncState)
```

---

### Anti-Pattern 4: Coupling yang Tersembunyi Lewat Barrel

```ts
// ❌ features/products/index.ts yang terlalu banyak export

export { ProductCard }              from "./components/ProductCard";
export { ProductGrid }              from "./components/ProductGrid";
export { ProductFilters }           from "./components/ProductFilters";
export { useProductList }           from "./hooks/useProductList";
export { useProductDetail }         from "./hooks/useProductDetail";
export { productReducer }           from "./store/productReducer"; // ← Internal!
export { transformProductData }     from "./utils/productHelpers"; // ← Internal!
export { PRODUCT_STATUS_ENUM }      from "./constants";           // ← Internal!
export type { Product, ApiProduct } from "./types/product.types"; // ApiProduct internal!

// Masalah: terlalu banyak yang diekspos.
// Orang lain sekarang bisa import productReducer dari luar features/products/
// padahal itu seharusnya detail implementasi.

// ✅ Barrel export hanya yang benar-benar "public API":
// features/products/index.ts
export { ProductCard }     from "./components/ProductCard";
export { ProductGrid }     from "./components/ProductGrid";
export { useProductList }  from "./hooks/useProductList";
export { getProducts }     from "./services/productService";
export type { Product }    from "./types/product.types";
// Semua yang lain: internal — tidak perlu diekspos
```

---

### Anti-Pattern 5: Penamaan File yang Tidak Konsisten

```
❌ Tidak konsisten — susah ditebak nama filenya apa

components/
  ├── Button.tsx           ← PascalCase
  ├── input-field.tsx      ← kebab-case
  ├── modalComponent.tsx   ← camelCase + "Component" suffix
  ├── use_auth.ts          ← snake_case
  ├── UserCard.component.tsx  ← .component suffix (Angular style)
  └── IProduct.ts          ← Hungarian notation (I prefix = interface)

✅ Konsisten — langsung tebak nama file tanpa perlu search

Aturan yang umum dipakai di ekosistem Next.js/React:
  Komponen React:     PascalCase.tsx         → ProductCard.tsx
  Custom hooks:       camelCase.ts           → useProductList.ts
  Utility/lib:        camelCase.ts           → formatters.ts
  Types:              camelCase.types.ts     → product.types.ts
  Constants:          camelCase.ts atau      → constants.ts
                      UPPER_SNAKE_CASE value → MAX_ITEMS = 10
  Server Actions:     camelCase.actions.ts   → product.actions.ts
  Test files:         [nama].test.tsx        → ProductCard.test.tsx
  CSS Modules:        [nama].module.css      → ProductCard.module.css
  Barrel:             index.ts selalu        → index.ts
```

---

## 11. Pengenalan Monorepo

Monorepo = satu repository Git yang berisi beberapa project atau package sekaligus.

### Kapan Butuh Monorepo?

```
Kamu butuh monorepo kalau:
  ✓ Ada "customer app" dan "admin app" yang share komponen/tipe yang sama
  ✓ Ada shared design system yang dipakai beberapa app
  ✓ Frontend dan backend (Node.js) yang perlu share types
  ✓ Tim yang berbeda kerja di app berbeda tapi perlu coordinate

Kamu TIDAK butuh monorepo kalau:
  ✗ Hanya satu Next.js app
  ✗ Tim kecil (< 5 orang)
  ✗ Tidak ada shared packages yang berarti
```

### Struktur Monorepo Sederhana dengan Turborepo

```
my-company/                    ← Root monorepo
├── apps/
│   ├── web/                   ← Next.js customer-facing app
│   │   ├── src/
│   │   └── package.json       → "@my-company/web"
│   └── admin/                 ← Next.js admin panel
│       ├── src/
│       └── package.json       → "@my-company/admin"
│
├── packages/
│   ├── ui/                    ← Shared React component library
│   │   ├── src/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   └── index.ts
│   │   └── package.json       → "@my-company/ui"
│   │
│   ├── types/                 ← Shared TypeScript types
│   │   ├── src/
│   │   │   ├── product.ts
│   │   │   └── user.ts
│   │   └── package.json       → "@my-company/types"
│   │
│   └── config/                ← Shared configs (ESLint, Tailwind, TSConfig)
│       ├── eslint/
│       ├── tailwind/
│       └── tsconfig/
│
├── package.json               ← Root package.json (workspaces)
└── turbo.json                 ← Turborepo config
```

```json
// package.json (root)
{
  "name": "my-company",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

```json
// apps/web/package.json
{
  "name": "@my-company/web",
  "dependencies": {
    "@my-company/ui":    "*",  // Gunakan package internal
    "@my-company/types": "*",
    "next": "15.x"
  }
}
```

```tsx
// Di apps/web — import dari shared package
import { Button } from "@my-company/ui";
import type { Product } from "@my-company/types";

// Di apps/admin — import yang sama
import { Button } from "@my-company/ui";
// Satu update di packages/ui → langsung berlaku untuk web DAN admin
```

### Tool Monorepo yang Populer

```
Turborepo (Vercel):
  ✅ Terintegrasi bagus dengan Next.js
  ✅ Smart caching — tidak build ulang kalau tidak berubah
  ✅ Paling mudah untuk pemula monorepo
  → Pilihan pertama untuk proyek Next.js

Nx:
  ✅ Lebih powerful, banyak plugin
  ✅ Bagus untuk enterprise dengan banyak teams
  ⚠️ Learning curve lebih tinggi

pnpm Workspaces (tanpa tool tambahan):
  ✅ Simpel, tidak perlu setup extra
  ✅ Bagus untuk project kecil yang baru mau coba monorepo
  ⚠️ Tidak punya caching build otomatis
```

> **Catatan:** Monorepo adalah topik yang luas. Pengenalan ini cukup untuk kamu tahu kapan diperlukan. Kalau mau terjun lebih dalam, cari "Turborepo docs" — dokumentasinya bagus dan ada template starter untuk Next.js.

---

## 12. Mini Project: Rancang Struktur E-commerce

Kita rancang struktur untuk **TokoKita** — e-commerce sederhana dengan fitur: produk, keranjang, checkout, profil user. Tim 3 orang, fitur yang berkembang.

### Analisis Fitur

```
TokoKita fitur:
  ├── Publik (tidak perlu login)
  │   ├── Lihat daftar produk + filter kategori
  │   ├── Lihat detail produk
  │   └── Search produk
  │
  ├── Auth
  │   ├── Register, Login, Logout
  │   └── Lupa password
  │
  ├── Terautentikasi
  │   ├── Keranjang belanja (tambah, hapus, update qty)
  │   ├── Wishlist
  │   ├── Checkout (alamat, metode bayar, konfirmasi)
  │   ├── Riwayat pesanan + detail pesanan
  │   └── Profil user (edit info, ganti password, kelola alamat)
  │
  └── Admin (role: admin)
      ├── Kelola produk (CRUD)
      ├── Kelola pesanan
      └── Dashboard statistik
```

### Struktur Lengkap

```
tokokita/
├── app/
│   ├── (storefront)/             ← Halaman publik (layout: Navbar + Footer)
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← Homepage (featured products, promo)
│   │   ├── products/
│   │   │   ├── page.tsx          ← Daftar produk + filter
│   │   │   └── [slug]/
│   │   │       └── page.tsx      ← Detail produk
│   │   └── search/
│   │       └── page.tsx
│   │
│   ├── (auth)/                   ← Halaman auth (layout: minimal, centered)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── (account)/                ← Halaman user terautentikasi
│   │   ├── layout.tsx            ← Sidebar account navigation
│   │   ├── cart/page.tsx
│   │   ├── wishlist/page.tsx
│   │   ├── checkout/
│   │   │   ├── page.tsx          ← Checkout flow
│   │   │   └── success/page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx
│   │   │   └── [orderId]/page.tsx
│   │   └── profile/
│   │       ├── page.tsx
│   │       ├── addresses/page.tsx
│   │       └── security/page.tsx
│   │
│   ├── admin/                    ← Admin panel
│   │   ├── layout.tsx
│   │   ├── page.tsx              ← Dashboard
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   └── orders/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── webhooks/
│   │       └── payment/route.ts  ← Webhook dari payment gateway
│   │
│   ├── layout.tsx                ← Root layout (fonts, providers)
│   ├── not-found.tsx
│   └── globals.css
│
├── features/
│   │
│   ├── catalog/                  ← Domain: Produk & Kategori
│   │   ├── components/
│   │   │   ├── ProductCard/
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── ProductCard.module.css
│   │   │   │   └── ProductCard.test.tsx
│   │   │   ├── ProductGrid/
│   │   │   ├── ProductDetail/
│   │   │   │   ├── ProductDetail.tsx         ← Layout komponen detail
│   │   │   │   ├── ProductImageGallery.tsx   ← Sub-komponen
│   │   │   │   ├── ProductVariantSelector.tsx
│   │   │   │   └── ProductReviews.tsx
│   │   │   ├── CategoryBrowser/
│   │   │   └── ProductSearch/
│   │   │       ├── ProductSearch.tsx
│   │   │       └── SearchSuggestions.tsx
│   │   ├── hooks/
│   │   │   ├── useProductList.ts    ← fetch + filter + pagination
│   │   │   ├── useProductDetail.ts  ← fetch satu produk
│   │   │   └── useProductSearch.ts  ← debounced search + suggestions
│   │   ├── services/
│   │   │   ├── productService.ts
│   │   │   └── categoryService.ts
│   │   ├── types/
│   │   │   └── product.types.ts     → Product, Category, ProductVariant, Review
│   │   ├── utils/
│   │   │   └── productHelpers.ts    → toProduct(), sortProducts(), etc.
│   │   └── index.ts
│   │
│   ├── cart/                     ← Domain: Keranjang Belanja
│   │   ├── components/
│   │   │   ├── CartDrawer/          ← Slide-in cart panel
│   │   │   ├── CartItem/
│   │   │   └── CartSummary/
│   │   ├── hooks/
│   │   │   └── useCart.ts           ← Cart state + actions
│   │   ├── store/
│   │   │   └── cartStore.ts         ← Zustand cart store (persist ke localStorage)
│   │   ├── types/
│   │   │   └── cart.types.ts        → Cart, CartItem
│   │   └── index.ts
│   │
│   ├── checkout/                 ← Domain: Proses Pembelian
│   │   ├── components/
│   │   │   ├── CheckoutStepper/      ← Step indicator (Alamat → Bayar → Konfirmasi)
│   │   │   ├── ShippingForm/
│   │   │   ├── PaymentSelector/
│   │   │   └── OrderConfirmation/
│   │   ├── hooks/
│   │   │   ├── useCheckout.ts        ← Checkout flow state machine
│   │   │   └── useShippingOptions.ts ← Fetch ongkir dari API
│   │   ├── services/
│   │   │   ├── checkoutService.ts    ← Create order, process payment
│   │   │   └── shippingService.ts    ← Fetch shipping rates
│   │   ├── types/
│   │   │   └── checkout.types.ts
│   │   └── index.ts
│   │
│   ├── orders/                   ← Domain: Riwayat Pesanan
│   │   ├── components/
│   │   │   ├── OrderList/
│   │   │   ├── OrderDetail/
│   │   │   └── OrderStatusBadge/
│   │   ├── hooks/
│   │   │   ├── useOrderList.ts
│   │   │   └── useOrderDetail.ts
│   │   ├── services/
│   │   │   └── orderService.ts
│   │   ├── types/
│   │   │   └── order.types.ts       → Order, OrderItem, OrderStatus
│   │   └── index.ts
│   │
│   ├── auth/                     ← Domain: Autentikasi
│   │   ├── components/
│   │   │   ├── LoginForm/
│   │   │   ├── RegisterForm/
│   │   │   └── ForgotPasswordForm/
│   │   ├── hooks/
│   │   │   └── useAuthForm.ts        ← Form validation + submit logic
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts
│   │
│   ├── profile/                  ← Domain: Profil User
│   │   ├── components/
│   │   │   ├── ProfileForm/
│   │   │   ├── AddressBook/
│   │   │   │   ├── AddressBook.tsx
│   │   │   │   ├── AddressCard.tsx
│   │   │   │   └── AddressForm.tsx
│   │   │   └── ChangePasswordForm/
│   │   ├── hooks/
│   │   │   └── useProfile.ts
│   │   ├── services/
│   │   │   └── profileService.ts
│   │   ├── types/
│   │   │   └── profile.types.ts     → UserProfile, Address
│   │   └── index.ts
│   │
│   └── admin/                    ← Domain: Admin Panel
│       ├── components/
│       │   ├── ProductForm/          ← Form create/edit produk
│       │   ├── OrderManagement/
│       │   └── DashboardStats/
│       ├── hooks/
│       │   ├── useAdminProducts.ts
│       │   └── useAdminOrders.ts
│       ├── services/
│       │   └── adminService.ts
│       └── index.ts
│
├── shared/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Select/
│   │   │   ├── Checkbox/
│   │   │   ├── Modal/
│   │   │   ├── Drawer/
│   │   │   ├── Badge/
│   │   │   ├── Tooltip/
│   │   │   ├── Tabs/
│   │   │   └── index.ts
│   │   ├── layout/
│   │   │   ├── Navbar/
│   │   │   │   ├── Navbar.tsx
│   │   │   │   ├── NavbarCartButton.tsx  ← Tombol cart di navbar (pakai cart store)
│   │   │   │   └── NavbarUserMenu.tsx
│   │   │   ├── Footer/
│   │   │   └── AccountSidebar/
│   │   └── feedback/
│   │       ├── Skeleton/
│   │       ├── EmptyState/
│   │       ├── ErrorMessage/
│   │       └── Toast/
│   │
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   └── useIntersectionObserver.ts  ← Infinite scroll
│   │
│   ├── services/
│   │   └── apiClient.ts               ← Base fetch dengan auth header + error handling
│   │
│   ├── lib/
│   │   ├── formatters.ts              ← formatRupiah, formatDate, formatWeight
│   │   ├── validators.ts
│   │   └── constants.ts               ← FREE_SHIPPING_MIN, MAX_CART_ITEMS, dll.
│   │
│   └── types/
│       ├── common.types.ts            ← PaginatedResponse, AsyncState, ApiError
│       └── env.d.ts                   ← TypeScript types untuk env vars
│
├── config/
│   ├── navigation.ts                  ← Storefront nav items, account menu items
│   ├── payment.ts                     ← Payment methods config
│   └── shipping.ts                    ← Shipping provider config
│
├── auth.ts                            ← Auth.js config
├── middleware.ts                      ← Route protection
└── public/
    ├── icons/
    └── images/
        └── placeholders/
```

### Contoh Aliur: Halaman Daftar Produk ke Komponen

```tsx
// app/(storefront)/products/page.tsx — Server Component, tipis
import { ProductGrid }  from "@/features/catalog";
import { getProducts }  from "@/features/catalog";
import { CategoryBrowser } from "@/features/catalog";
import { getCategories } from "@/features/catalog";
import type { Metadata }  from "next";

export const metadata: Metadata = { title: "Semua Produk" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; sort?: string }>;
}) {
  const params      = await searchParams;
  const page        = Number(params.page ?? 1);
  const [products, categories] = await Promise.all([
    getProducts({ filter: { category: params.category }, page }),
    getCategories(),
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Semua Produk</h1>
      <div className="flex gap-8">
        <aside className="w-56 shrink-0">
          <CategoryBrowser
            categories={categories}
            selectedCategory={params.category}
          />
        </aside>
        <main className="flex-1">
          <ProductGrid
            products={products.products}
            totalPages={products.totalPages}
            currentPage={page}
          />
        </main>
      </div>
    </div>
  );
}
```

```tsx
// features/catalog/index.ts — public API
export { ProductCard }     from "./components/ProductCard/ProductCard";
export { ProductGrid }     from "./components/ProductGrid/ProductGrid";
export { CategoryBrowser } from "./components/CategoryBrowser/CategoryBrowser";
export { useProductList }  from "./hooks/useProductList";
export { getProducts, getProductById } from "./services/productService";
export { getCategories }   from "./services/categoryService";
export type { Product, Category } from "./types/product.types";
```

```ts
// features/catalog/services/productService.ts
import { apiClient }   from "@/shared/services/apiClient";
import { toProduct }   from "../utils/productHelpers";
import type { Product, ApiProduct } from "../types/product.types";
import type { PaginatedResponse }   from "@/shared/types/common.types";

export async function getProducts(options: {
  filter?: { category?: string; minPrice?: number; maxPrice?: number };
  page?:   number;
}): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams();
  if (options.filter?.category) params.set("category", options.filter.category);
  if (options.page)             params.set("page",     String(options.page));

  const data = await apiClient.get<PaginatedResponse<ApiProduct>>(
    `/products?${params}`,
    { next: { revalidate: 300 } }  // ISR: cache 5 menit
  );

  return {
    ...data,
    data: data.data.map(toProduct),
  };
}
```

---

## 13. Checklist Sebelum Mulai Project Baru

Sebelum nulis satu baris kode pun, tanyakan ini ke diri sendiri (dan tim):

### Tentukan Scope Dulu

```
☐ Berapa banyak fitur yang jelas ada sekarang?
  < 5 fitur  → flat structure, type-based
  5-15 fitur → hybrid, mulai features/ folder
  15+ fitur  → feature-based penuh

☐ Berapa orang di tim?
  1-2 orang  → flat atau hybrid
  3-5 orang  → feature-based dengan shared
  5+ orang   → feature-based + pertimbangkan monorepo

☐ Ada plan untuk share kode ke project lain (admin panel, mobile)?
  Tidak → satu Next.js app sudah cukup
  Ya    → mulai pertimbangkan monorepo dari awal
```

### Setup yang Harus Ada dari Awal

```
☐ Path alias di tsconfig.json sudah dikonfigurasi?
  ("@/*": ["./*"] minimal)

☐ Konvensi penamaan file sudah disepakati?
  (PascalCase untuk komponen, camelCase untuk hooks/utils)

☐ Dimana "shared" vs "feature-specific" sudah jelas?

☐ ESLint rule untuk mencegah import yang salah arah?
  (eslint-plugin-import atau @typescript-eslint untuk enforce module boundaries)

☐ Folder README.md di setiap folder utama? (opsional tapi bagus untuk tim baru)

☐ Template komponen/hook yang sudah disepakati?
  (Misal: semua komponen pakai named export, bukan default export)
```

### Pertanyaan Tiap Kali Buat File Baru

```
☐ File ini masuk ke features/ atau shared/?
  → Dipakai hanya satu domain? → features/[domain]/
  → Dipakai lebih dari satu domain? → shared/

☐ Nama file sudah mengikuti konvensi?

☐ Sudah ada file yang melakukan hal yang sama?
  (Cari dulu sebelum buat baru)

☐ Apakah ini perlu jadi komponen terpisah atau bisa inline?
  (Rule of three: kalau baru satu use case, mungkin belum perlu)

☐ Type sudah didefinisikan? Atau pakai any/unknown dulu?
  (Sebaiknya definisikan type dari awal)
```

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Next.js 15*
