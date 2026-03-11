# 16 — Optimasi Performa React & Next.js dengan TypeScript

> **Gaya baca:** Obrolan santai senior ke junior. Kita mulai dari "kenapa ini lambat" sebelum loncat ke solusinya.

---

## Daftar Isi

1. [Filosofi: Jangan Optimasi yang Belum Masalah](#1-filosofi-jangan-optimasi-yang-belum-masalah)
2. [Cara Kerja Re-render di React](#2-cara-kerja-re-render-di-react)
3. [React.memo — Kapan Berguna, Kapan Buang-Buang Waktu](#3-reactmemo--kapan-berguna-kapan-buang-buang-waktu)
4. [useMemo dan useCallback](#4-usememo-dan-usecallback)
5. [Code Splitting dan Lazy Loading](#5-code-splitting-dan-lazy-loading)
6. [Next.js Image dan Font Optimization](#6-nextjs-image-dan-font-optimization)
7. [Dynamic Import di Next.js](#7-dynamic-import-di-nextjs)
8. [React DevTools Profiler](#8-react-devtools-profiler)
9. [Core Web Vitals: LCP, CLS, FID/INP](#9-core-web-vitals-lcp-cls-fidinp)
10. [Mini Project: Audit & Optimasi Product Listing](#10-mini-project-audit--optimasi-product-listing)

---

## 1. Filosofi: Jangan Optimasi yang Belum Masalah

Sebelum masuk ke teknis, gue mau kasih warning dulu.

**Premature optimization adalah akar dari banyak masalah.**

Gue pernah lihat codebase di mana developer taruh `useMemo` dan `useCallback` di *semua* komponen, semua fungsi — karena "biar performa bagus". Hasilnya? Kode susah dibaca, bug lebih susah ditrack, dan performa **tidak berubah** sama sekali karena bottleneck-nya bukan di sana.

### Aturan Optimasi Performa

```
1. Ukur dulu — jangan asumsi bagian mana yang lambat
2. Profil — gunakan DevTools, bukan feeling
3. Fix yang paling impactful dulu
4. Ukur lagi — pastikan fix memang berpengaruh
5. Baru lanjut ke masalah berikutnya
```

### Kapan Mulai Optimasi?

```
Optimasi DIPERLUKAN ketika:
  ✓ User complaint "app lambat / lag"
  ✓ Profiler menunjukkan render > 16ms (target 60fps)
  ✓ Core Web Vitals score merah di Google Search Console
  ✓ Lighthouse score < 70
  ✓ Bundle size > 200kb (initial load)

Optimasi BELUM DIPERLUKAN ketika:
  ✗ Asumsi "pasti lambat nanti kalau banyak data"
  ✗ "Best practice katanya harus pakai memo"
  ✗ Belum ada user yang complain
  ✗ Belum pernah run Profiler
```

---

## 2. Cara Kerja Re-render di React

### React Rendering Pipeline

Sebelum bisa optimasi, kamu harus paham **kapan React me-render ulang sebuah komponen**:

```
Trigger → Render → Commit
   │          │         │
   │          │         └── React update DOM yang beneran
   │          └── React panggil function component kamu
   └── State/prop berubah, context update, parent re-render
```

### Trigger Re-render

```tsx
// Ada 3 trigger yang bikin komponen re-render:

// 1. State berubah
const [count, setCount] = useState(0);
setCount(1); // → re-render komponen ini

// 2. Props berubah
function Child({ value }: { value: number }) {
  return <div>{value}</div>;
}
// Kalau parent re-render dan pass value baru → Child re-render

// 3. Context value berubah
const ThemeContext = createContext('light');
// Semua komponen yang useContext(ThemeContext) akan re-render
// kalau value context berubah
```

### Masalah Utama: Re-render Cascade

```tsx
// ❌ Ini masalah klasik yang sering bikin app lambat
function ParentComponent() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <SearchInput value={searchQuery} onChange={setSearchQuery} />
      {/* 
        Setiap ketik di SearchInput:
        → ParentComponent re-render
        → ExpensiveList re-render
        → AllChildrenInList re-render
        
        Padahal ExpensiveList tidak peduli soal searchQuery!
      */}
      <ExpensiveProductList />
      <Sidebar />
      <Footer />
    </div>
  );
}
```

### Visualisasi: Apa yang Terjadi Saat Re-render

```
User ketik "a" di search box
         │
         ▼
ParentComponent re-render
         │
    ┌────┴────────┬──────────────────────┐
    │             │                      │
    ▼             ▼                      ▼
SearchInput   ExpensiveList          Sidebar
(diperlukan)  (tidak perlu!)         (tidak perlu!)
                    │
          ┌─────────┼─────────┐
          │         │         │
          ▼         ▼         ▼
      Product1   Product2   Product3
      (tidak     (tidak      (tidak
       perlu!)    perlu!)     perlu!)
```

React memang sudah sangat cepat — kebanyakan re-render tidak akan kamu notice. Masalah muncul ketika:
- Komponen punya **logic yang berat** (kalkulasi kompleks, transformasi data besar)
- Re-render terjadi **sangat sering** (setiap keystroke, setiap mouse move)
- Jumlah komponen yang re-render **sangat banyak** (list dengan ribuan item)

---

## 3. React.memo — Kapan Berguna, Kapan Buang-Buang Waktu

### Cara Kerja React.memo

`React.memo` adalah Higher Order Component yang "membungkus" komponen kamu dan **skip re-render kalau props tidak berubah** (shallow comparison).

```tsx
// Tanpa memo: re-render setiap kali parent re-render
function ProductCard({ product }: { product: Product }) {
  return <div>{product.name}</div>;
}

// Dengan memo: re-render hanya kalau product prop berubah
const ProductCard = React.memo(function ProductCard({ product }: { product: Product }) {
  return <div>{product.name}</div>;
});
```

### Kapan React.memo BERGUNA

```tsx
// ✅ Kasus 1: Komponen mahal yang dapat props stabil dari parent yang sering re-render
interface FilterPanelProps {
  categories: Category[];  // array ini jarang berubah
  onFilterChange: (filters: Filter) => void;
}

const FilterPanel = React.memo(function FilterPanel({
  categories,
  onFilterChange,
}: FilterPanelProps) {
  // Render ini lumayan berat — ada banyak checkbox, dropdown, dll
  console.log('FilterPanel render'); // pakai ini untuk debug

  return (
    <aside>
      {categories.map(cat => (
        <CategoryFilter key={cat.id} category={cat} onChange={onFilterChange} />
      ))}
    </aside>
  );
});

// Parent component: searchQuery berubah setiap keystroke
function ProductPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div>
      <SearchBox value={searchQuery} onChange={setSearchQuery} />
      {/* Tanpa memo: FilterPanel re-render setiap keystroke */}
      {/* Dengan memo: FilterPanel skip re-render karena categories tidak berubah */}
      <FilterPanel categories={STATIC_CATEGORIES} onFilterChange={handleFilter} />
    </div>
  );
}
```

```tsx
// ✅ Kasus 2: Item dalam list yang besar
interface ListItemProps {
  item: Product;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

// Tanpa memo: kalau list punya 100 item, satu state change → 100 item re-render
// Dengan memo: hanya item yang props-nya berubah yang re-render
const ProductListItem = React.memo(function ProductListItem({
  item,
  isSelected,
  onSelect,
}: ListItemProps) {
  return (
    <div
      onClick={() => onSelect(item.id)}
      className={isSelected ? 'selected' : ''}
    >
      {item.name}
    </div>
  );
});
```

### Kapan React.memo TIDAK BERGUNA (atau Bahkan Overhead)

```tsx
// ❌ Kasus 1: Props selalu berubah — memo tidak akan skip apapun
const Header = React.memo(function Header({
  currentTime,  // berubah setiap detik!
}: {
  currentTime: Date;
}) {
  return <div>{currentTime.toString()}</div>;
});
// Memo ekstra overhead tapi tidak pernah bisa skip

// ❌ Kasus 2: Komponen sangat sederhana
const Badge = React.memo(function Badge({ label }: { label: string }) {
  return <span className="badge">{label}</span>;
});
// Re-render Badge secepat kilat. Overhead memo lebih besar dari manfaatnya.

// ❌ Kasus 3: Object/array baru setiap render (shallow comparison gagal)
function Parent() {
  return (
    <MemoizedChild
      config={{ theme: 'dark' }}  // object literal baru setiap render!
      items={[1, 2, 3]}           // array baru setiap render!
    />
  );
}
// memo tidak berguna karena {} !== {} dan [] !== [] (reference berbeda)
```

### Memo dengan Custom Comparison

```tsx
// Kalau default shallow comparison tidak cukup:
const ProductCard = React.memo(
  function ProductCard({ product, style }: ProductCardProps) {
    return <div style={style}>{product.name}</div>;
  },
  (prevProps, nextProps) => {
    // Return true = skip re-render (props "sama")
    // Return false = lakukan re-render (props "berbeda")
    return (
      prevProps.product.id === nextProps.product.id &&
      prevProps.product.updatedAt === nextProps.product.updatedAt
      // Tidak perlu cek style karena kita tahu tidak berubah
    );
  }
);
```

---

## 4. useMemo dan useCallback

### useMemo: Cache Hasil Kalkulasi

```tsx
// ❌ Kalkulasi berat dijalankan setiap render
function ProductList({ products, searchQuery }: Props) {
  // filterProducts mungkin iterasi ribuan item — berjalan setiap render!
  const filteredProducts = filterProducts(products, searchQuery);

  return <ul>{filteredProducts.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

```tsx
// ✅ useMemo: hanya kalkulasi ulang kalau dependency berubah
function ProductList({ products, searchQuery }: Props) {
  const filteredProducts = useMemo(
    () => filterProducts(products, searchQuery),
    [products, searchQuery] // hanya re-kalkulasi kalau ini berubah
  );

  return <ul>{filteredProducts.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}
```

### useMemo: Stabilkan Reference Object/Array

```tsx
// ❌ Setiap render bikin object config baru → MemoizedChart selalu re-render
function Dashboard({ data }: { data: SalesData[] }) {
  const chartConfig = {  // object baru setiap render!
    type: 'line',
    responsive: true,
    animation: false,
  };

  return <MemoizedChart data={data} config={chartConfig} />;
}
```

```tsx
// ✅ useMemo: reference config stabil selama dependency tidak berubah
function Dashboard({ data }: { data: SalesData[] }) {
  const chartConfig = useMemo(() => ({
    type: 'line' as const,
    responsive: true,
    animation: false,
  }), []); // tidak ada dependency — dibuat sekali

  return <MemoizedChart data={data} config={chartConfig} />;
}
```

### useCallback: Stabilkan Reference Fungsi

```tsx
// ❌ Handler baru setiap render → MemoizedButton selalu re-render (memo-nya gagal)
function SearchPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filter>({});

  // handleSearch adalah fungsi baru setiap render
  const handleSearch = () => {
    // logic pencarian
  };

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {/* MemoizedSearchButton terima handleSearch baru setiap render → tidak pernah skip */}
      <MemoizedSearchButton onClick={handleSearch} />
    </>
  );
}
```

```tsx
// ✅ useCallback: fungsi yang sama selama dependency tidak berubah
function SearchPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filter>({});

  const handleSearch = useCallback(() => {
    // logic pencarian pakai query dan filters
    performSearch(query, filters);
  }, [query, filters]); // fungsi baru hanya kalau query atau filters berubah

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {/* Sekarang MemoizedSearchButton bisa skip re-render dengan benar */}
      <MemoizedSearchButton onClick={handleSearch} />
    </>
  );
}
```

### useCallback untuk Prop ke Custom Hook

```tsx
// Kasus nyata: custom hook yang terima callback
function useIntersectionObserver(
  callback: () => void,  // kalau tidak distabilkan dengan useCallback, useEffect jalan terus
  options?: IntersectionObserverInit
) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) callback();
    }, options);

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [callback, options]); // callback di sini perlu stabil!

  return ref;
}

// Pakai di komponen:
function InfiniteList({ onLoadMore }: { onLoadMore: () => void }) {
  // ✅ Stabilkan callback dengan useCallback
  const stableOnLoadMore = useCallback(() => {
    onLoadMore();
  }, [onLoadMore]);

  const bottomRef = useIntersectionObserver(stableOnLoadMore);

  return (
    <div>
      {/* list items */}
      <div ref={bottomRef} />
    </div>
  );
}
```

### Aturan Praktis: Kapan Pakai useMemo/useCallback?

```
Pakai useMemo untuk:
  ✓ Kalkulasi yang membutuhkan iterasi data besar (filter, sort, transform)
  ✓ Menstabilkan object/array yang jadi prop ke komponen ter-memo
  ✓ Dependency dari useEffect yang berupa object/array

Pakai useCallback untuk:
  ✓ Fungsi yang jadi prop ke komponen ter-memo
  ✓ Fungsi yang jadi dependency di useEffect / custom hook
  ✓ Event handler yang di-pass deep ke child komponen

Jangan pakai untuk:
  ✗ Kalkulasi sederhana (tambah dua angka, akses property object)
  ✗ Komponen yang tidak di-memo
  ✗ "Supaya kelihatan lebih professional" (ini beneran alasan yang gue dengar)
```

---

## 5. Code Splitting dan Lazy Loading

### Masalah: Bundle Besar = Initial Load Lambat

Tanpa code splitting, semua JavaScript kamu di-bundle jadi satu file besar dan **harus didownload sebelum halaman bisa dipakai**:

```
bundle.js (2MB)
├── React (130kb)
├── Halaman Login (5kb)
├── Halaman Dashboard (50kb)
├── Halaman Admin (80kb)       ← Why download ini di halaman login?
├── Rich Text Editor (400kb)   ← Why download ini di homepage?
├── Chart Library (300kb)      ← Why download ini kalau user belum buka chart?
└── PDF Generator (200kb)      ← Why download ini di semua halaman?
```

### React.lazy + Suspense: Code Splitting Dasar

```tsx
// ❌ Import statis: semua masuk ke bundle utama
import { AdminDashboard } from '@/components/AdminDashboard';
import { RichTextEditor } from '@/components/RichTextEditor';
import { PDFViewer } from '@/components/PDFViewer';
```

```tsx
// ✅ Lazy import: masing-masing jadi chunk terpisah, diload saat dibutuhkan
import { lazy, Suspense } from 'react';

const AdminDashboard = lazy(() => import('@/components/AdminDashboard'));
const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));
const PDFViewer = lazy(() => import('@/components/PDFViewer'));

// Harus dibungkus Suspense — ditampilkan selama chunk loading
function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminDashboard />
    </Suspense>
  );
}
```

### Lazy Loading Berdasarkan Route (Next.js App Router)

Di Next.js App Router, **setiap segment route sudah otomatis di-code-split**. Tapi kamu masih perlu lazy-load komponen berat di dalam route tersebut:

```tsx
// app/dashboard/page.tsx — ini sudah jadi chunk terpisah otomatis
// Tapi komponen di dalamnya belum tentu

import dynamic from 'next/dynamic'; // versi Next.js dari React.lazy

// Komponen berat di-lazy load
const RevenueChart = dynamic(() => import('@/components/RevenueChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // chart library sering tidak support SSR
});

const DataGrid = dynamic(() => import('@/components/DataGrid'), {
  loading: () => <TableSkeleton />,
});

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* Loaded on demand, bukan saat initial page load */}
      <RevenueChart />
      <DataGrid />
    </div>
  );
}
```

### Lazy Loading Berdasarkan User Action

```tsx
// ❌ Modal yang jarang dibuka tapi selalu ada di bundle
import { ComplexModal } from '@/components/ComplexModal'; // 80kb library

function ProductPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>Detail</button>
      {showModal && <ComplexModal />}
    </>
  );
}
```

```tsx
// ✅ Load modal hanya saat user klik tombol
import { lazy, Suspense, useState } from 'react';

const ComplexModal = lazy(() => import('@/components/ComplexModal'));

function ProductPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>Detail</button>
      {showModal && (
        <Suspense fallback={<ModalSkeleton />}>
          <ComplexModal onClose={() => setShowModal(false)} />
        </Suspense>
      )}
    </>
  );
}
```

### Preloading: Load Sebelum User Butuh

```tsx
// Trick: preload komponen saat user hover — siap sebelum klik
function ProductListItem({ product }: { product: Product }) {
  const handleMouseEnter = () => {
    // Preload sebelum user klik
    import('@/components/ProductDetailModal');
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      {product.name}
    </div>
  );
}
```

### Named Export dengan Lazy

```tsx
// Masalah: lazy() hanya support default export
// Solusi: wrapper module

// ❌ Tidak bisa langsung
const { ProductCard } = lazy(() => import('@/components/Cards'));

// ✅ Solusi 1: re-export sebagai default di file terpisah
// components/Cards/ProductCard.lazy.ts
export { ProductCard as default } from './Cards';

// Lalu:
const ProductCard = lazy(() => import('@/components/Cards/ProductCard.lazy'));

// ✅ Solusi 2: wrapper inline
const ProductCard = lazy(() =>
  import('@/components/Cards').then(module => ({ default: module.ProductCard }))
);
```

---

## 6. Next.js Image dan Font Optimization

### Next.js Image: Lebih dari Sekadar `<img>`

```tsx
// ❌ img biasa — tidak ada optimasi apapun
function ProductCard({ product }: { product: Product }) {
  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      // Problems:
      // • Download gambar full size walau ditampilkan kecil
      // • Tidak ada lazy loading otomatis
      // • Tidak ada WebP conversion
      // • Bisa bikin layout shift (CLS naik)
    />
  );
}
```

```tsx
// ✅ next/image — optimasi otomatis
import Image from 'next/image';

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="relative h-48 w-full">
      <Image
        src={product.imageUrl}
        alt={product.name}
        fill              // atau width={400} height={300}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        // sizes: kasih tau browser ukuran gambar di viewport berbeda
        // Browser bisa download ukuran yang tepat, bukan yang paling besar
        quality={85}      // default 75, 85 untuk foto produk yang perlu detail
        priority={false}  // true untuk gambar "above the fold" (hero image)
        placeholder="blur"
        blurDataURL={product.blurHash} // opsional: blur placeholder
        className="object-cover"
      />
    </div>
  );
}
```

### Konfigurasi Domain untuk next/image

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.yourcdn.com',
        port: '',
        pathname: '/products/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com', // wildcard subdomain
      },
    ],
    // Ukuran gambar yang di-generate (match dengan breakpoints CSS kamu)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Format yang di-support
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
```

### Priority vs Lazy: Ini Sering Salah

```tsx
// Priority image = didownload SEGERA saat halaman load
// Pakai untuk LCP (Largest Contentful Paint) element

// ✅ Hero image — tampil pertama, user langsung lihat → priority
function HeroSection() {
  return (
    <Image
      src="/hero-banner.jpg"
      alt="Hero"
      width={1920}
      height={600}
      priority // ← penting untuk LCP
    />
  );
}

// ✅ Product cards — below the fold → jangan priority, biar lazy load
function ProductCard({ product }: { product: Product }) {
  return (
    <Image
      src={product.image}
      alt={product.name}
      width={400}
      height={400}
      // priority tidak ada → otomatis lazy load
    />
  );
}

// ❌ Jangan taruh priority di semua gambar — justru kontraproduktif
// Kalau semua priority, tidak ada yang truly prioritized
```

### Font Optimization

```tsx
// ❌ Cara lama — font dari Google CDN, blocking render
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        {/* Blocking: browser harus download ini sebelum render teks */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// ✅ next/font — font di-host sendiri, zero layout shift, tidak ada request eksternal
import { Inter, Merriweather } from 'next/font/google';
import localFont from 'next/font/local';

// Font dari Google (di-host otomatis oleh Next.js)
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter', // bisa dipakai sebagai CSS variable
  display: 'swap',          // tampilkan fallback dulu, ganti saat font siap
});

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-merriweather',
  display: 'swap',
});

// Font lokal
const brandFont = localFont({
  src: [
    { path: '../public/fonts/BrandFont-Regular.woff2', weight: '400' },
    { path: '../public/fonts/BrandFont-Bold.woff2', weight: '700' },
  ],
  variable: '--font-brand',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      // Apply font variables ke root — bisa dipakai di seluruh app via CSS
      className={`${inter.variable} ${merriweather.variable} ${brandFont.variable}`}
    >
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

```css
/* globals.css — pakai font variable */
body {
  font-family: var(--font-inter), system-ui, sans-serif;
}

h1, h2, h3 {
  font-family: var(--font-merriweather), Georgia, serif;
}

.brand-text {
  font-family: var(--font-brand), sans-serif;
}
```

---

## 7. Dynamic Import di Next.js

### `next/dynamic` vs `React.lazy`

`next/dynamic` adalah wrapper Next.js di atas `React.lazy` dengan fitur tambahan:
- Support SSR control (`ssr: false`)
- Loading component built-in
- Support named exports lebih mudah

```tsx
import dynamic from 'next/dynamic';

// Matikan SSR untuk library yang butuh browser API
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,         // tidak di-render di server — butuh window, navigator, dll
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded" />,
});

// Dengan named export
const { BarChart } = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

// Kondisional: load library analytics hanya di production
const Analytics = dynamic(
  () => import('@/components/Analytics'),
  {
    ssr: false,
    // Hanya load kalau bukan development
    ...(process.env.NODE_ENV === 'development' ? { loading: () => null } : {}),
  }
);
```

### Dynamic Import untuk Library Besar

```typescript
// Jangan import library besar di top-level kalau hanya dipakai sekali

// ❌ Library PDF masuk bundle utama (500kb+)
import jsPDF from 'jspdf';
import { parse } from 'csv-parse';

function ExportButton({ data }: { data: SalesData[] }) {
  const handleExport = () => {
    const pdf = new jsPDF();
    // ...
  };

  return <button onClick={handleExport}>Export PDF</button>;
}
```

```typescript
// ✅ Import hanya saat user klik export
function ExportButton({ data }: { data: SalesData[] }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Import saat dibutuhkan — tidak masuk bundle utama
      const { default: jsPDF } = await import('jspdf');
      const { autoTable } = await import('jspdf-autotable');

      const pdf = new jsPDF();
      autoTable(pdf, {
        head: [['Produk', 'Kuantitas', 'Total']],
        body: data.map(d => [d.name, d.quantity, d.total]),
      });
      pdf.save('laporan.pdf');
    } catch (error) {
      console.error('Export gagal:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={isExporting}>
      {isExporting ? 'Mengekspor...' : 'Export PDF'}
    </button>
  );
}
```

### Route-Based Dynamic Import (Next.js App Router)

```tsx
// Kontrol apa yang di-render di server vs client
'use server' // atau tidak ada, default server component

// ✅ Heavy client component di-lazy load
const InteractiveMap = dynamic(() => import('./InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-gray-200 rounded animate-pulse flex items-center justify-center">
      <span className="text-gray-500">Memuat peta...</span>
    </div>
  ),
});

// ✅ Fitur premium — load hanya kalau user punya akses
async function StorePage({ params }: { params: { id: string } }) {
  const store = await fetchStore(params.id);
  const hasAnalytics = store.plan === 'premium';

  return (
    <div>
      <StoreInfo store={store} />
      {hasAnalytics && (
        // Analytics component tidak masuk bundle kalau user tidak premium
        <Suspense fallback={<AnalyticsSkeleton />}>
          {dynamic(() => import('./AnalyticsDashboard'))}
        </Suspense>
      )}
    </div>
  );
}
```

---

## 8. React DevTools Profiler

### Install dan Setup

```
1. Install React Developer Tools:
   Chrome: https://chrome.google.com/webstore/detail/react-developer-tools
   Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/

2. Buka browser DevTools (F12)
3. Tab "Components" → lihat component tree
4. Tab "Profiler" → rekam dan analisis render
```

### Cara Menggunakan Profiler

```
Langkah 1: Buka tab "Profiler" di React DevTools
Langkah 2: Klik tombol Record (lingkaran merah)
Langkah 3: Lakukan aksi yang terasa lambat di app
           (scroll, ketik, klik, dll)
Langkah 4: Stop recording
Langkah 5: Analisis hasil
```

### Membaca Flamegraph

```
Flamegraph menunjukkan waktu render setiap komponen:

┌─────────────────────────────────────────────┐
│                  App (2ms)                   │
├──────────────────┬──────────────────────────┤
│   Header (0.1ms) │    ProductList (1.8ms)    │
│                  ├────────┬────────┬─────────┤
│                  │Item    │Item    │Item     │
│                  │(0.5ms) │(0.5ms) │(0.8ms)  │
└──────────────────┴────────┴────────┴─────────┘

Warna:
  ■ Hijau = render cepat
  ■ Kuning = lumayan, perhatikan
  ■ Merah = lambat, perlu dioptimasi

Yang perlu diperhatikan:
  • Komponen yang sering muncul di setiap frame
  • Komponen berwarna merah/kuning (>16ms)
  • Komponen yang re-render padahal seharusnya tidak
```

### Menggunakan Profiler API di Kode

```tsx
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,            // ID yang kamu kasih ke <Profiler>
  phase,         // "mount" atau "update"
  actualDuration, // waktu render (ms)
  baseDuration,  // waktu render tanpa optimasi React
  startTime,
  commitTime,
) => {
  // Log ke analytics kalau render terlalu lambat
  if (actualDuration > 16) {
    console.warn(`🐌 Slow render: ${id} took ${actualDuration.toFixed(2)}ms (${phase})`);

    // Kirim ke monitoring (Sentry, dll) di production
    if (process.env.NODE_ENV === 'production') {
      analytics.track('slow_render', { component: id, duration: actualDuration });
    }
  }
};

// Bungkus komponen yang ingin di-profil
function App() {
  return (
    <Profiler id="ProductList" onRender={onRenderCallback}>
      <ProductList />
    </Profiler>
  );
}
```

### Trick: Why Did This Component Render?

```tsx
// Custom hook untuk debug re-render — HAPUS sebelum push ke production!
import { useEffect, useRef } from 'react';

function useWhyDidYouRender(componentName: string, props: Record<string, unknown>) {
  const previousProps = useRef<Record<string, unknown>>({});

  useEffect(() => {
    if (previousProps.current) {
      const changedProps = Object.entries(props).reduce(
        (acc, [key, value]) => {
          if (previousProps.current[key] !== value) {
            acc[key] = {
              from: previousProps.current[key],
              to: value,
            };
          }
          return acc;
        },
        {} as Record<string, { from: unknown; to: unknown }>
      );

      if (Object.keys(changedProps).length > 0) {
        console.log(`[${componentName}] Re-render karena:`, changedProps);
      } else {
        console.log(`[${componentName}] Re-render tapi props tidak berubah (parent re-render?)`);
      }
    }

    previousProps.current = props;
  });
}

// Pakai di komponen yang misterius selalu re-render
function ProductCard({ product, style }: ProductCardProps) {
  // Debug: uncomment ini untuk investigasi
  // useWhyDidYouRender('ProductCard', { product, style });

  return <div>{product.name}</div>;
}
```

---

## 9. Core Web Vitals: LCP, CLS, FID/INP

### Apa Itu Core Web Vitals?

Core Web Vitals adalah metrik yang dipakai Google untuk mengukur **pengalaman user yang nyata** — bukan cuma seberapa cepat file didownload, tapi seberapa cepat user bisa **melihat**, **berinteraksi**, dan **menggunakan** halaman.

| Metrik | Singkatan | Ukur Apa | Target |
|--------|-----------|----------|--------|
| **LCP** | Largest Contentful Paint | Seberapa cepat konten utama terlihat | ≤ 2.5 detik |
| **CLS** | Cumulative Layout Shift | Seberapa banyak layout bergeser | ≤ 0.1 |
| **INP** | Interaction to Next Paint | Seberapa responsif halaman | ≤ 200ms |

> FID (First Input Delay) sudah digantikan INP di Maret 2024.

---

### LCP — Largest Contentful Paint

**Masalah: LCP lambat** biasanya karena:
1. Hero image tidak di-prioritize
2. Image terlalu besar
3. Font blocking render
4. Server response lambat (TTFB)

```tsx
// ❌ Hero image tidak diprioritize
function HeroSection() {
  return (
    <section>
      <Image
        src="/hero.jpg"
        alt="Hero"
        width={1920}
        height={600}
        // Tanpa priority → lazy loaded → LCP lambat
      />
      <h1>Selamat Datang</h1>
    </section>
  );
}
```

```tsx
// ✅ Fix LCP: priority pada gambar utama
function HeroSection() {
  return (
    <section>
      <Image
        src="/hero.jpg"
        alt="Hero"
        width={1920}
        height={600}
        priority              // ← didownload secepatnya
        sizes="100vw"
        quality={90}
      />
      <h1>Selamat Datang</h1>
    </section>
  );
}

// ✅ Tambahan: preload LCP image di metadata
// app/page.tsx
export const metadata = {
  other: {
    // Beri hint ke browser untuk preload gambar ini
    'link': '<link rel="preload" as="image" href="/hero.jpg" />',
  },
};
```

```tsx
// ✅ Fix LCP: kurangi waktu server dengan caching
// app/page.tsx — Next.js App Router
export const revalidate = 3600; // cache halaman 1 jam

async function HomePage() {
  // Data di-cache, bukan fetch fresh setiap request
  const featuredProducts = await getFeaturedProducts();

  return (
    <main>
      <HeroSection />
      <ProductList products={featuredProducts} />
    </main>
  );
}
```

---

### CLS — Cumulative Layout Shift

CLS adalah "layout yang loncat-loncat" — kamu pernah klik sesuatu tapi yang ke-klik berbeda karena ada konten yang tiba-tiba muncul dan geser layout? Itu CLS tinggi.

```tsx
// ❌ Penyebab CLS 1: Gambar tanpa dimensi
function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img src={src} alt={alt} />
    // Browser tidak tahu ukuran gambar sampai didownload
    // Layout bergeser begitu gambar muncul
  );
}
```

```tsx
// ✅ Fix: selalu tentukan dimensi gambar
function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative w-full aspect-square"> {/* aspect ratio container */}
      <Image src={src} alt={alt} fill className="object-cover" />
    </div>
  );
}

// Atau dengan width/height eksplisit
<Image src={src} alt={alt} width={400} height={400} />
// Browser reserved space sebelum gambar didownload → tidak ada shift
```

```tsx
// ❌ Penyebab CLS 2: Skeleton yang ukurannya berbeda dengan konten asli
function ProductSkeleton() {
  return (
    <div className="h-10 bg-gray-200 rounded" /> // tinggi hardcoded 40px
  );
}

function ProductCard({ isLoading, product }: Props) {
  return isLoading ? <ProductSkeleton /> : (
    <div className="p-4">            {/* padding berbeda */}
      <h3 className="text-lg">{product.name}</h3>  {/* 2 baris teks mungkin */}
      <p className="text-sm text-gray-500">{product.desc}</p>
    </div>
  );
  // Ukuran skeleton berbeda dari konten asli → layout shift saat data load
}
```

```tsx
// ✅ Fix: skeleton dengan ukuran yang sama dengan konten asli
function ProductCardSkeleton() {
  return (
    <div className="p-4">  {/* sama dengan konten asli */}
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" /> {/* judul */}
      <div className="h-4 bg-gray-200 rounded w-full mb-1" /> {/* deskripsi baris 1 */}
      <div className="h-4 bg-gray-200 rounded w-2/3" />       {/* deskripsi baris 2 */}
    </div>
  );
}
```

```tsx
// ❌ Penyebab CLS 3: Ads / banner yang muncul tiba-tiba
function AdBanner() {
  const [adLoaded, setAdLoaded] = useState(false);
  return (
    <div>
      {adLoaded && <div className="h-24">Ad content</div>}
      {/* Muncul tiba-tiba → push konten di bawahnya */}
    </div>
  );
}

// ✅ Fix: reserved space dari awal
function AdBanner() {
  const [adLoaded, setAdLoaded] = useState(false);
  return (
    <div className="h-24 w-full"> {/* space sudah di-reserved */}
      {adLoaded ? <ActualAd /> : null}
      {/* Layout tidak bergeser karena space sudah ada */}
    </div>
  );
}
```

---

### INP — Interaction to Next Paint

INP mengukur waktu dari user melakukan interaksi (klik, ketik, tap) sampai browser bisa menampilkan respons visual.

```tsx
// ❌ Penyebab INP tinggi: Main thread diblokir logic berat di event handler
function SearchInput({ onSearch }: { onSearch: (results: Product[]) => void }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;

    // Operasi berat di main thread → UI freeze saat user ketik
    const results = products
      .filter(p => fuzzySearch(p.name, query))     // operasi O(n)
      .sort((a, b) => calculateScore(a, query) - calculateScore(b, query))
      .slice(0, 50);

    onSearch(results);
  };

  return <input onChange={handleChange} />;
}
```

```tsx
// ✅ Fix 1: Debounce untuk kurangi frekuensi operasi berat
import { useDeferredValue, useTransition } from 'react';

function SearchInput({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // deferredQuery update dengan prioritas rendah
  // UI tetap responsif saat query berubah
  const deferredQuery = useDeferredValue(query);

  // Kalkulasi hanya jalan dengan deferredQuery
  const results = useMemo(
    () => searchProducts(products, deferredQuery),
    [products, deferredQuery]
  );

  return (
    <>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        // Input update segera (tidak di-defer) → tetap responsive
      />
      {isPending && <Spinner />}
      <SearchResults results={results} />
    </>
  );
}

// ✅ Fix 2: Pindahkan kalkulasi berat ke Web Worker
// hooks/useSearchWorker.ts
export function useSearchWorker(products: Product[]) {
  const [results, setResults] = useState<Product[]>([]);

  const search = useCallback(async (query: string) => {
    // Kalkulasi di background thread, tidak blokir UI
    const worker = new Worker(new URL('../workers/search.worker.ts', import.meta.url));
    worker.postMessage({ products, query });
    worker.onmessage = e => {
      setResults(e.data);
      worker.terminate();
    };
  }, [products]);

  return { results, search };
}
```

### Ukur Core Web Vitals di Next.js

```tsx
// app/layout.tsx — Next.js built-in Web Vitals reporting
export function reportWebVitals(metric: any) {
  // Kirim ke analytics service kamu
  console.log(metric);
  // { name: 'LCP', value: 1234, rating: 'good', ... }

  // Contoh: kirim ke Google Analytics
  if (metric.name === 'LCP' || metric.name === 'CLS' || metric.name === 'INP') {
    window.gtag?.('event', metric.name, {
      value: Math.round(metric.value),
      metric_rating: metric.rating, // 'good', 'needs-improvement', 'poor'
    });
  }
}
```

```bash
# Cek Core Web Vitals secara lokal
npx lighthouse http://localhost:3000 --view
# atau
npx unlighthouse --site localhost:3000
```

---

## 10. Mini Project: Audit & Optimasi Product Listing

### Konteks

Kamu dapat task: *"Halaman product listing lambat banget, scroll lag, filter juga lag."*

Kode awal terlihat seperti ini — penuh masalah performa yang akan kita identifikasi dan fix satu per satu.

---

### Kode Awal (Penuh Masalah Performa)

```tsx
// ❌ app/products/page.tsx — BEFORE (lambat)
'use client';

import { useState, useEffect } from 'react';
import { SearchIcon, FilterIcon } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { FilterPanel } from '@/components/FilterPanel';
import { SortDropdown } from '@/components/SortDropdown';
import { Analytics } from '@/components/Analytics';       // 200kb library
import { RecommendationEngine } from '@/components/Recommendations'; // 300kb

type SortOption = 'price_asc' | 'price_desc' | 'newest' | 'popular';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10_000_000 });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);

  // ❌ MASALAH 1: Filtering dan sorting dijalankan setiap render
  const filteredProducts = products
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => selectedCategory ? p.category === selectedCategory : true)
    .filter(p => p.price >= priceRange.min && p.price <= priceRange.max)
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return b.rating - a.rating;
    });

  return (
    <div>
      {/* ❌ MASALAH 2: Analytics library besar selalu di-load */}
      <Analytics pageView="products" />

      <div className="flex gap-4">
        {/* ❌ MASALAH 3: FilterPanel re-render setiap searchQuery berubah */}
        <FilterPanel
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          priceRange={priceRange}
          // ❌ MASALAH 4: Object baru setiap render
          onPriceChange={(range) => setPriceRange(range)}
        />

        <main>
          <div className="flex justify-between mb-4">
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari produk..."
            />
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>

          {/* ❌ MASALAH 5: Render semua produk sekaligus (500+ produk) */}
          <div className="grid grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              // ❌ MASALAH 6: ProductCard buat object style baru setiap render
              <ProductCard
                key={product.id}
                product={product}
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
              />
            ))}
          </div>

          {/* ❌ MASALAH 7: RecommendationEngine (berat) di-load upfront */}
          <RecommendationEngine userId="current-user" />
        </main>
      </div>
    </div>
  );
}
```

---

### Identifikasi Masalah

```
Masalah yang ditemukan:
  1. Filter + sort: kalkulasi berat dijalankan setiap render (setiap keystroke)
  2. Analytics (200kb): masuk bundle utama, blokir initial load
  3. FilterPanel: re-render setiap searchQuery berubah, padahal tidak relevan
  4. onPriceChange: fungsi baru setiap render → memo FilterPanel tidak berguna
  5. Render 500+ produk sekaligus → DOM besar, scroll lambat
  6. style object baru setiap render → ProductCard re-render terus
  7. RecommendationEngine (300kb): di-load upfront padahal scroll-to-view
```

---

### Kode Setelah Optimasi

```tsx
// ✅ app/products/page.tsx — AFTER (dioptimasi)
// Ini Server Component — fetch data di server, bukan di client
import { Suspense } from 'react';
import { ProductListingClient } from './ProductListingClient';
import { fetchProducts } from '@/lib/api';

interface SearchParams {
  category?: string;
  sort?: string;
  q?: string;
}

// Server Component: fetch data di sini
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Data di-fetch di server, sudah terfilter — tidak perlu filter di client
  const products = await fetchProducts({
    category: searchParams.category,
    sort: searchParams.sort,
    query: searchParams.q,
  });

  return (
    <div>
      <Suspense fallback={<ProductListingSkeleton />}>
        <ProductListingClient initialProducts={products} />
      </Suspense>
    </div>
  );
}
```

```tsx
// ✅ app/products/ProductListingClient.tsx — AFTER
'use client';

import {
  useState,
  useMemo,
  useCallback,
  useTransition,
  lazy,
  Suspense,
} from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterPanel } from '@/components/FilterPanel';
import { SortDropdown } from '@/components/SortDropdown';
import { VirtualizedProductGrid } from '@/components/VirtualizedProductGrid';

// FIX 2: Lazy load library besar
const Analytics = dynamic(() => import('@/components/Analytics'), {
  ssr: false,
  loading: () => null,
});

// FIX 7: Lazy load recommendation — hanya load saat mendekati viewport
const RecommendationEngine = dynamic(
  () => import('@/components/RecommendationEngine'),
  {
    ssr: false,
    loading: () => <RecommendationSkeleton />,
  }
);

type SortOption = 'price_asc' | 'price_desc' | 'newest' | 'popular';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  rating: number;
  imageUrl: string;
  createdAt: string;
}

// FIX 6: Object style di luar komponen — tidak dibuat ulang setiap render
const CARD_STYLE = { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } as const;

interface ProductListingClientProps {
  initialProducts: Product[];
}

export function ProductListingClient({ initialProducts }: ProductListingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) ?? 'newest'
  );
  const [priceRange, setPriceRange] = useState({
    min: 0,
    max: 10_000_000,
  });

  // useTransition: state update ini tidak blocking
  const [isPending, startTransition] = useTransition();

  // FIX 1: useMemo — filter + sort hanya jalan kalau dependency berubah
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return initialProducts
      .filter(p => !query || p.name.toLowerCase().includes(query))
      .filter(p => p.price >= priceRange.min && p.price <= priceRange.max)
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'newest')
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return b.rating - a.rating;
      });
  }, [initialProducts, searchQuery, priceRange, sortBy]);

  // FIX 4: useCallback — fungsi stabil, memo FilterPanel bisa kerja
  const handlePriceChange = useCallback(
    (range: { min: number; max: number }) => {
      setPriceRange(range);
    },
    [] // tidak ada dependency — fungsi ini tidak perlu berubah
  );

  const handleSortChange = useCallback((newSort: SortOption) => {
    setSortBy(newSort);
    // Update URL supaya bisa di-bookmark/share
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', newSort);
      router.replace(`/products?${params.toString()}`, { scroll: false });
    });
  }, [router, searchParams]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set('q', query);
      else params.delete('q');
      router.replace(`/products?${params.toString()}`, { scroll: false });
    });
  }, [router, searchParams]);

  return (
    <div>
      {/* FIX 2: Analytics di-load lazy, tidak blokir initial render */}
      <Analytics pageView="products" />

      <div className="flex gap-4">
        {/*
          FIX 3: FilterPanel ter-memo hanya re-render kalau props berubah
          FIX 4: handlePriceChange stabil berkat useCallback
        */}
        <FilterPanel
          priceRange={priceRange}
          onPriceChange={handlePriceChange}
          // Tidak perlu pass searchQuery — FilterPanel tidak peduli soal ini
        />

        <main className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="search"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Cari produk..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
              {isPending && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              )}
            </div>

            <SortDropdown value={sortBy} onChange={handleSortChange} />

            <p className="text-sm text-gray-500">
              {filteredProducts.length} produk
            </p>
          </div>

          {/*
            FIX 5: Virtualized list — hanya render produk yang visible di viewport
            (bukan 500 sekaligus)
            FIX 6: CARD_STYLE adalah konstanta, tidak dibuat ulang
          */}
          <VirtualizedProductGrid
            products={filteredProducts}
            cardStyle={CARD_STYLE}
          />

          {/* FIX 7: Recommendation engine lazy — load saat scroll ke sini */}
          <Suspense fallback={<RecommendationSkeleton />}>
            <RecommendationEngine userId="current-user" />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
```

```tsx
// ✅ components/VirtualizedProductGrid.tsx — FIX 5
// Virtualized rendering: hanya render item yang visible

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, memo, CSSProperties } from 'react';
import { ProductCard } from './ProductCard';

interface Props {
  products: Product[];
  cardStyle: CSSProperties;
}

// FIX 3: Memo untuk grid supaya tidak re-render kalau products sama
export const VirtualizedProductGrid = memo(function VirtualizedProductGrid({
  products,
  cardStyle,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtualizer: hanya render baris yang visible di viewport
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(products.length / 4), // 4 kolom
    getScrollElement: () => parentRef.current,
    estimateSize: () => 340, // estimasi tinggi baris (card + gap)
    overscan: 3, // render 3 baris ekstra di atas/bawah viewport
  });

  return (
    <div
      ref={parentRef}
      style={{ height: '80vh', overflow: 'auto' }}
    >
      {/* Container dengan total height virtual */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const rowProducts = products.slice(
            virtualRow.index * 4,
            virtualRow.index * 4 + 4
          );

          return (
            <div
              key={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-4 gap-4 pb-4">
                {rowProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    style={cardStyle}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
```

```tsx
// ✅ components/FilterPanel.tsx — FIX 3
// Memo: hanya re-render kalau priceRange atau onPriceChange berubah
import { memo } from 'react';

interface FilterPanelProps {
  priceRange: { min: number; max: number };
  onPriceChange: (range: { min: number; max: number }) => void;
}

export const FilterPanel = memo(function FilterPanel({
  priceRange,
  onPriceChange,
}: FilterPanelProps) {
  // Komponen ini tidak re-render saat user ketik di search box
  // karena searchQuery tidak di-pass sebagai prop
  return (
    <aside className="w-64 shrink-0">
      <h3 className="font-semibold mb-4">Filter</h3>

      <div>
        <label className="text-sm text-gray-600">Rentang Harga</label>
        <PriceRangeSlider
          value={priceRange}
          onChange={onPriceChange}
        />
      </div>

      {/* Filter lainnya... */}
    </aside>
  );
});
```

---

### Ringkasan Optimasi yang Dilakukan

| # | Masalah | Solusi | Teknik |
|---|---------|--------|--------|
| 1 | Filter/sort di setiap render | Cache hasil kalkulasi | `useMemo` |
| 2 | Analytics (200kb) blokir load | Load asynchronous, tidak blocking | `dynamic()` + `ssr: false` |
| 3 | FilterPanel re-render tiap keystroke | Skip re-render kalau props sama | `React.memo` |
| 4 | Handler baru tiap render (memo gagal) | Stabilkan fungsi | `useCallback` |
| 5 | Render 500 produk sekaligus | Hanya render yang visible | Virtualized list |
| 6 | Style object baru tiap render | Pindahkan ke luar komponen | Konstanta statis |
| 7 | Recommendation (300kb) load upfront | Load saat mendekati viewport | `dynamic()` + `Suspense` |
| 8 | Fetch di client - waterfall | Fetch di server dulu | Server Component |

---

## Penutup

Optimasi performa itu seni yang butuh pengukuran, bukan asumsi.

**Urutan yang benar:**

```
1. UKUR → Lighthouse, DevTools Profiler, Core Web Vitals
2. IDENTIFIKASI → Mana yang paling lambat dan paling impactful?
3. FIX → Terapkan solusi yang tepat
4. VERIFIKASI → Ukur lagi, apakah membaik?
5. ULANGI → Masalah berikutnya

Bukan:
  ✗ "Gue taruh useMemo di semua komponen biar aman"
  ✗ "Best practice katanya harus memo"
  ✗ Fix dulu baru ukur
```

**Yang paling impactful (bang for the buck):**
1. **Server Components** — data fetching di server = tidak ada client bundle + tidak ada waterfall
2. **Image optimization** — `next/image` dengan `priority` yang benar = LCP bagus
3. **Code splitting** — dynamic import untuk komponen besar = initial load kecil
4. **Virtualization** — untuk list panjang (50+ item) = scroll mulus

`useMemo` dan `useCallback`? Berguna, tapi bukan solusi untuk semua masalah. Profil dulu, baru pakai kalau memang dibutuhkan.

Selamat optimasi! 🚀
