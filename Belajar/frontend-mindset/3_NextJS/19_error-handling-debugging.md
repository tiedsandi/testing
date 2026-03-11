# 19 — Error Handling & Debugging di React/Next.js dengan TypeScript

> **Gaya baca:** Obrolan santai senior ke junior. Error itu tidak bisa dihindari — yang bisa dikontrol adalah seberapa cepat kamu tahu, seberapa mudah kamu debug, dan seberapa graceful app kamu gagalnya.

---

## Daftar Isi

1. [Kenapa Error Handling Sering Diabaikan dan Kenapa Itu Berbahaya](#1-kenapa-error-handling-sering-diabaikan-dan-kenapa-itu-berbahaya)
2. [Error Boundary: Jaring Pengaman Terakhir](#2-error-boundary-jaring-pengaman-terakhir)
3. [Async/Await Error Handling yang Benar](#3-asyncawait-error-handling-yang-benar)
4. [Error Handling di TanStack Query](#4-error-handling-di-tanstack-query)
5. [Next.js error.tsx dan global-error.tsx](#5-nextjs-errortsx-dan-global-errortsx)
6. [Logging Error yang Berguna](#6-logging-error-yang-berguna)
7. [TypeScript sebagai Pencegah Error Runtime](#7-typescript-sebagai-pencegah-error-runtime)
8. [Debugging Tools: Cara Baca dan Investigasi](#8-debugging-tools-cara-baca-dan-investigasi)
9. [Sentry: Error Monitoring di Production](#9-sentry-error-monitoring-di-production)
10. [Mini Project: Tambahkan Error Handling ke LoginForm](#10-mini-project-tambahkan-error-handling-ke-loginform)

---

## 1. Kenapa Error Handling Sering Diabaikan dan Kenapa Itu Berbahaya

### Skenario Nyata

Kamu baru deploy fitur baru. Semuanya berjalan mulus di dev. Besok pagi, ada laporan masuk:

> *"Halo, halaman checkout saya blank putih. Ini sudah dari tadi, tidak bisa bayar."*

Kamu buka console production: tidak ada log. Tidak ada error di Sentry (karena belum setup). Tidak ada trace sama sekali. Satu-satunya clue: "blank putih".

Ini bukan skenario fiksi — ini kejadian nyata yang bisa diselesaikan dalam 5 menit kalau error handling-nya benar, atau berjam-jam kalau tidak.

### Tiga Jenis Error yang Harus Ditangani

```
┌─────────────────────────────────────────────────────────────┐
│  1. RENDER ERROR                                            │
│     Komponen crash saat rendering                           │
│     → Ditangani: Error Boundary                             │
│     → Next.js: error.tsx                                    │
│                                                             │
│  2. ASYNC ERROR                                             │
│     fetch gagal, database timeout, API error                │
│     → Ditangani: try/catch yang benar, TanStack Query       │
│                                                             │
│  3. TYPE ERROR (runtime)                                    │
│     Data dari API tidak sesuai ekspektasi                   │
│     → Ditangani: Zod parsing, type guard, null check        │
└─────────────────────────────────────────────────────────────┘
```

### Anti-pattern yang Sering Gue Lihat

```tsx
// ❌ Pola 1: "Error ditelan" — silent failure paling berbahaya
async function loadUser(id: string) {
  try {
    const res = await fetch(`/api/users/${id}`);
    return await res.json();
  } catch (e) {
    // tidak ada apa-apa di sini
    // user melihat loading spinner selamanya
  }
}

// ❌ Pola 2: Console.log dan berharap itu cukup
async function saveData(data: unknown) {
  try {
    await api.save(data);
  } catch (e) {
    console.log(e); // tidak ada di production, tidak ada struktur
  }
}

// ❌ Pola 3: Asumsi response selalu OK
async function getPrice(productId: string) {
  const res = await fetch(`/api/products/${productId}`);
  const data = await res.json();
  return data.price; // kalau data.price = undefined? → NaN ke mana-mana
}

// ❌ Pola 4: Type assertion tanpa validasi
const user = apiResponse as User; // "percaya" API selalu balikin User
console.log(user.name.toUpperCase()); // crash kalau name = null/undefined
```

---

## 2. Error Boundary: Jaring Pengaman Terakhir

### Cara Kerja Error Boundary

Error Boundary adalah class component React yang *menangkap* error yang terjadi di subtree komponen di bawahnya selama proses rendering, lifecycle methods, atau constructor. Kalau tidak ada Error Boundary, satu error di komponen kecil bisa blank-putihkan seluruh halaman.

```
Tanpa Error Boundary:
  <App>
    <Header />
    <Sidebar />
    <ProductCard />   ← crash di sini
         ↓
    Seluruh App putih. User tidak tahu apa yang terjadi.

Dengan Error Boundary:
  <App>
    <Header />      ← tetap tampil
    <Sidebar />     ← tetap tampil
    <ErrorBoundary>
      <ProductCard />   ← crash di sini
           ↓
      Tampilkan fallback UI, sisanya tetap berfungsi
    </ErrorBoundary>
```

### Implementasi TypeScript

```tsx
// components/ErrorBoundary.tsx
import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  // Opsional: callback untuk logging ke Sentry/monitoring
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  // Opsional: fallback sebagai render function (dapat error info)
  renderFallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Dipanggil saat ada error — update state untuk render fallback
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Dipanggil setelah error ter-capture — tempat untuk logging
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // errorInfo.componentStack = stack trace komponen React
    this.props.onError?.(error, errorInfo);

    // Log ke console di development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo.componentStack);
    }
  }

  // Reset state — memungkinkan user coba lagi
  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Prioritas: renderFallback > fallback > default UI
      if (this.props.renderFallback) {
        return this.props.renderFallback(this.state.error, this.reset);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback
      return (
        <div role="alert" style={{ padding: '1rem', border: '1px solid red' }}>
          <h2>Terjadi kesalahan</h2>
          <p>Halaman ini tidak dapat ditampilkan saat ini.</p>
          <button onClick={this.reset}>Coba Lagi</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Cara Pakai yang Tepat

```tsx
// app/layout.tsx — Error Boundary di level root
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logErrorToMonitoring } from '@/lib/monitoring';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ErrorBoundary
          onError={(error, errorInfo) => {
            logErrorToMonitoring(error, { componentStack: errorInfo.componentStack });
          }}
          renderFallback={(error, reset) => (
            <div className="error-page">
              <h1>Ups, ada yang salah</h1>
              <p>Tim kami sudah diberitahu. Silakan coba lagi.</p>
              <button onClick={reset}>Muat Ulang</button>
            </div>
          )}
        >
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}

// Komponen dengan Error Boundary lebih spesifik (granular)
// Isolasi: kalau ProductCard crash, UserProfile tetap jalan
export default function ProductPage() {
  return (
    <div>
      <ErrorBoundary
        fallback={<p>Profil user tidak dapat dimuat.</p>}
      >
        <UserProfile />
      </ErrorBoundary>

      <ErrorBoundary
        renderFallback={(error, reset) => (
          <div>
            <p>Gagal memuat produk: {error.message}</p>
            <button onClick={reset}>Coba Lagi</button>
          </div>
        )}
      >
        <ProductList />
      </ErrorBoundary>
    </div>
  );
}
```

### Error Boundary TIDAK Menangkap

```tsx
// ❌ Error Boundary TIDAK tangkap ini:

// 1. Event handler
<button onClick={() => { throw new Error('tidak tertangkap EB') }}>
  Klik
</button>
// → Tangani sendiri dengan try/catch di handler

// 2. Async code (Promise)
useEffect(() => {
  fetch('/api/data')
    .then(r => r.json())
    .then(data => {
      throw new Error('tidak tertangkap EB'); // async!
    });
}, []);
// → Tangani sendiri di .catch() atau try/catch

// 3. Error di Error Boundary itu sendiri
// 4. Server-side rendering errors (untuk ini, pakai Next.js error.tsx)
```

### Wrapper Fungsional dengan react-error-boundary

Kalau tidak mau nulis class component sendiri, pakai library ini:

```bash
npm install react-error-boundary
```

```tsx
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

// Fallback component
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <p>Terjadi kesalahan: {error.message}</p>
      <button onClick={resetErrorBoundary}>Coba Lagi</button>
    </div>
  );
}

// Penggunaan
export default function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => logError(error, info)}
      onReset={() => {
        // Optional: reset state app sebelum re-render
      }}
    >
      <MyApp />
    </ErrorBoundary>
  );
}

// Hook untuk throw error ke boundary terdekat dari event handler / async
function ProductCard({ id }: { id: string }) {
  const { showBoundary } = useErrorBoundary();

  async function handleDelete() {
    try {
      await api.delete(id);
    } catch (error) {
      // Lempar ke Error Boundary terdekat
      showBoundary(error);
    }
  }

  return <button onClick={handleDelete}>Hapus</button>;
}
```

---

## 3. Async/Await Error Handling yang Benar

### Masalah: Tidak Semua Error Sama

```typescript
// Ada beberapa jenis error yang perlu ditangani berbeda:

// 1. Network error — tidak bisa konek sama sekali (offline, DNS gagal)
// 2. HTTP error — konek tapi server return 4xx/5xx
// 3. Parse error — response bukan JSON valid
// 4. Validation error — data tidak sesuai struktur yang diharapkan
// 5. Timeout error — request terlalu lama
```

### Pola Error Handling yang Benar

```typescript
// lib/api-client.ts — buat abstraksi untuk fetch yang proper

// Custom error types untuk error yang bisa di-handle secara berbeda
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ParseError extends Error {
  constructor(message: string, public readonly rawResponse?: string) {
    super(message);
    this.name = 'ParseError';
  }
}

// Fetch wrapper dengan error handling lengkap
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  let response: Response;

  // 1. Tangkap network error (offline, dsb)
  try {
    response = await fetch(url, {
      ...options,
      // Timeout menggunakan AbortController
      signal: options?.signal ?? AbortSignal.timeout(10_000), // 10 detik
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new NetworkError('Request timeout setelah 10 detik', error);
    }
    throw new NetworkError(
      'Tidak dapat terhubung ke server. Periksa koneksi internet kamu.',
      error
    );
  }

  // 2. Tangkap HTTP error (4xx, 5xx)
  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }

    // Extract pesan error dari response body kalau ada
    const message =
      (errorBody as { message?: string })?.message ??
      `HTTP ${response.status}: ${response.statusText}`;

    const code = (errorBody as { code?: string })?.code;

    throw new ApiError(message, response.status, code, errorBody);
  }

  // 3. Tangkap parse error
  try {
    return (await response.json()) as T;
  } catch (error) {
    const rawText = await response.text().catch(() => '(tidak bisa dibaca)');
    throw new ParseError(
      'Response dari server bukan JSON yang valid.',
      rawText
    );
  }
}
```

### Menggunakan apiFetch di Komponen

```tsx
// ❌ Sebelum: error handling naif
async function fetchProduct(id: string) {
  const res = await fetch(`/api/products/${id}`);
  const data = await res.json(); // crash kalau 404
  return data;
}

// ✅ Sesudah: error handling terstruktur
import { apiFetch, ApiError, NetworkError } from '@/lib/api-client';

interface Product {
  id: string;
  name: string;
  price: number;
}

async function fetchProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}`);
}

// Di komponen atau server action:
export async function loadProductAction(id: string) {
  try {
    const product = await fetchProduct(id);
    return { success: true, data: product };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return { success: false, error: 'Produk tidak ditemukan' };
      }
      if (error.status === 403) {
        return { success: false, error: 'Kamu tidak punya akses ke produk ini' };
      }
      // Error lain dari API (500, dsb)
      return { success: false, error: `Terjadi kesalahan: ${error.message}` };
    }

    if (error instanceof NetworkError) {
      return { success: false, error: 'Tidak dapat terhubung. Coba lagi nanti.' };
    }

    // Error tidak terduga — log dan tampilkan pesan generik
    logError(error, { action: 'loadProduct', productId: id });
    return { success: false, error: 'Terjadi kesalahan tidak terduga' };
  }
}
```

### Error Handling di Server Actions (Next.js)

```typescript
// app/actions/product.ts
'use server';

import { z } from 'zod';
import { apiFetch, ApiError } from '@/lib/api-client';
import { logError } from '@/lib/logger';

// Definisi return type yang eksplisit — TypeScript enforce di sisi pemanggil
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

const CreateProductSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter'),
  price: z.number().positive('Harga harus lebih dari 0'),
  stock: z.number().int().min(0, 'Stok tidak boleh negatif'),
});

type CreateProductInput = z.infer<typeof CreateProductSchema>;
type Product = CreateProductInput & { id: string; createdAt: string };

export async function createProductAction(
  input: unknown
): Promise<ActionResult<Product>> {
  // 1. Validasi input
  const parsed = CreateProductSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Data tidak valid',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 2. Panggil API dengan error handling
  try {
    const product = await apiFetch<Product>('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    return { success: true, data: product };
  } catch (error) {
    if (error instanceof ApiError) {
      // Duplikat nama produk
      if (error.status === 409) {
        return {
          success: false,
          error: 'Nama produk sudah digunakan',
          fieldErrors: { name: ['Nama produk ini sudah ada'] },
        };
      }
    }

    // Log error yang tidak terduga sebelum return response generik
    logError(error, {
      action: 'createProduct',
      input: parsed.data,
    });

    return { success: false, error: 'Gagal membuat produk. Coba lagi nanti.' };
  }
}
```

---

## 4. Error Handling di TanStack Query

### Setup Global Error Handler

```tsx
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner'; // atau toast library apapun
import { logError } from '@/lib/logger';

function makeQueryClient() {
  return new QueryClient({
    // QueryCache: error dari semua query
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Hanya tampilkan toast kalau bukan background refetch
        if (query.state.data !== undefined) {
          // Ada data sebelumnya → background refresh gagal
          toast.error('Gagal memperbarui data. Menggunakan data terakhir.');
        }
        // Log semua query error
        logError(error, { queryKey: query.queryKey });
      },
    }),

    // MutationCache: error dari semua mutation
    mutationCache: new MutationCache({
      onError: (error, variables, context, mutation) => {
        logError(error, {
          mutationKey: mutation.options.mutationKey,
          variables,
        });
      },
    }),

    defaultOptions: {
      queries: {
        // Jangan retry untuk error client (4xx) — tidak akan berhasil
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 3; // retry 3x untuk error server/network
        },
        // Tampilkan data lama selagi refetch
        staleTime: 1000 * 60 * 5, // 5 menit
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Error Handling di Query

```tsx
// hooks/useProduct.ts
import { useQuery } from '@tanstack/react-query';
import { apiFetch, ApiError } from '@/lib/api-client';

interface Product {
  id: string;
  name: string;
  price: number;
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => apiFetch<Product>(`/api/products/${id}`),
    // Tipe error di-infer otomatis kalau queryFn throw typed error
    enabled: !!id, // jangan fetch kalau id kosong
  });
}

// Penggunaan di komponen
function ProductDetail({ id }: { id: string }) {
  const { data, error, isLoading, isError } = useProduct(id);

  if (isLoading) return <ProductSkeleton />;

  if (isError) {
    // TypeScript tahu error bisa apa saja — perlu narrowing
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return <NotFound message="Produk tidak ditemukan" />;
      }
    }
    // Fallback generic
    return <ErrorMessage message="Gagal memuat produk. Silakan coba lagi." />;
  }

  if (!data) return null;

  return <ProductCard product={data} />;
}
```

### Error Handling di Mutation

```tsx
// hooks/useCreateProduct.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api-client';

interface CreateProductInput {
  name: string;
  price: number;
  stock: number;
}

interface Product extends CreateProductInput {
  id: string;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      apiFetch<Product>('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),

    onSuccess: (newProduct) => {
      // Invalidasi cache produk agar list terupdate
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`Produk "${newProduct.name}" berhasil dibuat!`);
    },

    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          toast.error('Nama produk sudah digunakan');
          return;
        }
        if (error.status === 422) {
          toast.error('Data produk tidak valid');
          return;
        }
      }
      toast.error('Gagal membuat produk. Coba lagi nanti.');
    },
  });
}

// Penggunaan di form
function CreateProductForm() {
  const { mutate, isPending, error } = useCreateProduct();

  function handleSubmit(data: CreateProductInput) {
    mutate(data, {
      // Override per-call kalau perlu behavior spesifik
      onSuccess: () => router.push('/products'),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={isPending}>
        {isPending ? 'Menyimpan...' : 'Buat Produk'}
      </button>
    </form>
  );
}
```

---

## 5. Next.js error.tsx dan global-error.tsx

### Hierarki Error di Next.js App Router

```
app/
  layout.tsx              ← global-error.tsx untuk ini
  global-error.tsx        ← menangkap error di root layout
  error.tsx               ← menangkap error di halaman root
  
  (dashboard)/
    layout.tsx
    error.tsx             ← menangkap error di segment ini + nested
    page.tsx
    
    products/
      error.tsx           ← menangkap error khusus di segment products
      page.tsx            ← kalau page ini throw, error.tsx di atasnya tangkap
      
      [id]/
        error.tsx
        page.tsx
```

### error.tsx

```tsx
// app/error.tsx
'use client'; // WAJIB — Error Component harus Client Component

import { useEffect } from 'react';
import { logError } from '@/lib/logger';

interface ErrorPageProps {
  error: Error & { digest?: string }; // digest = unique error ID dari Next.js
  reset: () => void; // fungsi untuk re-render segment
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error ke monitoring service
    logError(error, {
      digest: error.digest,
      location: 'ErrorPage',
    });
  }, [error]);

  return (
    <div className="error-container" role="alert">
      <h2>Terjadi Kesalahan</h2>
      <p>
        Halaman ini tidak dapat ditampilkan saat ini. Tim kami sudah diberitahu.
      </p>
      {/* Tampilkan digest untuk debugging — user bisa share ke support */}
      {error.digest && (
        <p className="error-code">
          Kode error: <code>{error.digest}</code>
        </p>
      )}
      {/* Hanya tampilkan detail di development */}
      {process.env.NODE_ENV === 'development' && (
        <details>
          <summary>Detail error (development only)</summary>
          <pre>{error.message}</pre>
          <pre>{error.stack}</pre>
        </details>
      )}
      <div className="error-actions">
        <button onClick={reset}>Coba Lagi</button>
        <a href="/">Kembali ke Beranda</a>
      </div>
    </div>
  );
}
```

### global-error.tsx

```tsx
// app/global-error.tsx
// Menangkap error di root layout — sangat jarang terjadi
// HARUS render elemen html dan body sendiri karena layout tidak tersedia
'use client';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="id">
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Terjadi kesalahan kritis</h1>
          <p>Maaf, aplikasi mengalami masalah serius.</p>
          {error.digest && <p>Error ID: {error.digest}</p>}
          <button onClick={reset}>Muat Ulang Aplikasi</button>
        </div>
      </body>
    </html>
  );
}
```

### not-found.tsx (Bonus: 404 Handler)

```tsx
// app/not-found.tsx
// Dipanggil saat notFound() dilempar di Server Component
import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="not-found">
      <h1>404 — Halaman Tidak Ditemukan</h1>
      <p>Halaman yang kamu cari tidak ada atau sudah dipindahkan.</p>
      <Link href="/">Kembali ke Beranda</Link>
    </div>
  );
}

// Cara melempar 404 dari Server Component:
// import { notFound } from 'next/navigation';
// const product = await getProduct(id);
// if (!product) notFound();
```

---

## 6. Logging Error yang Berguna

### Struktur Pesan Error yang Baik

```typescript
// ❌ Log yang tidak berguna
console.error('Error occurred');
console.error(error);
console.log('fetch failed', e);

// ✅ Log yang berguna
// Harus bisa jawab: APA yang gagal? DIMANA? KENAPA? SIAPA yang affected? KAPAN?
```

### Implementasi Logger

```typescript
// lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  action?: string;
  component?: string;
  url?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    status?: number;
  };
  context: LogContext;
  environment: string;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  error: unknown,
  context: LogContext
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: {
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      environment: process.env.NODE_ENV ?? 'unknown',
      ...context,
    },
    environment: process.env.NODE_ENV ?? 'unknown',
  };

  if (error instanceof Error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };

    // Tambahkan info spesifik untuk ApiError
    if ('status' in error) {
      entry.error.status = error.status as number;
    }
    if ('code' in error) {
      entry.error.code = error.code as string;
    }
  }

  return entry;
}

export function logError(error: unknown, context: LogContext = {}): void {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const entry = createLogEntry('error', message, error, context);

  if (process.env.NODE_ENV === 'development') {
    // Di development: tampilkan di console dengan format yang mudah dibaca
    console.error(
      `[ERROR] ${entry.timestamp} | ${entry.message}`,
      '\nContext:', entry.context,
      '\nError:', entry.error
    );
  } else {
    // Di production: kirim ke monitoring service
    // (Sentry, Datadog, dsb — lihat Bagian 9)
    sendToMonitoring(entry);
  }
}

export function logWarn(message: string, context: LogContext = {}): void {
  const entry = createLogEntry('warn', message, null, context);
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[WARN] ${entry.message}`, entry.context);
  }
}

export function logInfo(message: string, context: LogContext = {}): void {
  const entry = createLogEntry('info', message, null, context);
  if (process.env.NODE_ENV === 'development') {
    console.info(`[INFO] ${entry.message}`, entry.context);
  }
}

// Placeholder — akan diisi Sentry di Bagian 9
function sendToMonitoring(entry: LogEntry): void {
  // Sentry.captureException(entry.error, { extra: entry.context });
}
```

### Contoh Log yang Baik vs Buruk

```typescript
// ❌ Tidak tahu apa yang terjadi
logError(error);

// ✅ Konteks yang cukup untuk debug
logError(error, {
  action: 'createOrder',
  userId: session.user.id,
  orderId: orderId,
  paymentMethod: 'credit_card',
  totalAmount: cart.total,
});

// ❌ Pesan terlalu generic
logError(new Error('Failed'), { 
  component: 'Form' 
});

// ✅ Pesan spesifik + konteks relevan
logError(error, {
  action: 'submitRegistrationForm',
  component: 'RegistrationForm',
  fieldValues: {
    // JANGAN log password/token!
    email: formData.email,
    hasAgreedToTerms: formData.agreedToTerms,
  },
});
```

---

## 7. TypeScript sebagai Pencegah Error Runtime

### Type Guard

```typescript
// Type guard: fungsi yang mempersempit tipe pada runtime

// ❌ Assertion tanpa validasi — berbahaya
const user = JSON.parse(response) as User;
console.log(user.email.toLowerCase()); // crash kalau email = null

// ✅ Type guard yang aman
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).email === 'string'
  );
}

const parsed = JSON.parse(response);
if (isUser(parsed)) {
  // TypeScript tahu di sini parsed adalah User
  console.log(parsed.email.toLowerCase()); // aman!
} else {
  throw new ParseError('Response bukan User yang valid');
}
```

### Zod untuk Runtime Validation (Cara Paling Praktis)

```typescript
// lib/schemas.ts
import { z } from 'zod';

// Definisi schema sekali — dapat TypeScript type + runtime validation gratis
export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'moderator']),
  createdAt: z.string().datetime(),
  avatar: z.string().url().nullable(), // bisa null
}).strict(); // strict = tidak boleh ada field tambahan yang tidak dikenal

export type User = z.infer<typeof UserSchema>;

// Penggunaan: parse data dari API
async function fetchUser(id: string): Promise<User> {
  const raw = await apiFetch(`/api/users/${id}`);

  const result = UserSchema.safeParse(raw);
  if (!result.success) {
    // Tahu persis field mana yang bermasalah
    logError(new Error('Skema User tidak valid dari API'), {
      url: `/api/users/${id}`,
      zodErrors: result.error.flatten(),
    });
    throw new ParseError('Data user dari server tidak valid');
  }

  return result.data; // TypeScript tahu ini User
}
```

### Assertion Function

```typescript
// Assertion function: throw kalau kondisi tidak terpenuhi
// Berbeda dari type guard — tidak return boolean, tapi throw

function assertDefined<T>(
  value: T | null | undefined,
  message: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

function assertNonEmptyString(
  value: unknown,
  fieldName: string
): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} harus berupa string yang tidak kosong`);
  }
}

// Penggunaan
const userId = searchParams.get('userId');
assertDefined(userId, 'Parameter userId wajib ada di URL');
// TypeScript tahu userId adalah string (bukan string | null) setelah ini

const config = process.env.DATABASE_URL;
assertNonEmptyString(config, 'DATABASE_URL');
// TypeScript tahu config adalah string
```

### Exhaustive Check — Pastikan Semua Case Tertangani

```typescript
type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled';

// Kalau ada PaymentStatus baru ditambahkan tapi tidak ditangani di sini,
// TypeScript akan mengeluarkan compile error!
function getStatusMessage(status: PaymentStatus): string {
  switch (status) {
    case 'pending':   return 'Pembayaran sedang diproses';
    case 'success':   return 'Pembayaran berhasil!';
    case 'failed':    return 'Pembayaran gagal. Coba lagi.';
    case 'cancelled': return 'Pembayaran dibatalkan';
    default:
      // Exhaustive check: TypeScript error kalau ada case yang belum di-handle
      const _exhaustive: never = status;
      throw new Error(`Status pembayaran tidak dikenali: ${_exhaustive}`);
  }
}
```

---

## 8. Debugging Tools: Cara Baca dan Investigasi

### Cara Baca Stack Trace

```
TypeError: Cannot read properties of undefined (reading 'name')
    at ProductCard (ProductCard.tsx:24:18)       ← tempat crash
    at renderWithHooks (react-dom.development.js:...)
    at mountIndeterminateComponent (...)
    at beginWork (...)
    ...

Cara baca:
1. Baris pertama = tipe error + pesan spesifik
   "Cannot read properties of undefined (reading 'name')"
   → Ada objek yang undefined, kamu coba akses .name

2. Baris kedua = FILE DAN BARIS kode KAMU
   ProductCard.tsx:24:18
   → Buka ProductCard.tsx, pergi ke baris 24, karakter ke-18

3. Sisanya = React internals — biasanya tidak perlu dibaca
```

### Debug Sistematis: Lima Langkah

```
Langkah 1: Baca error message dengan seksama
→ Jangan langsung Google. Baca pesannya dulu.
→ "Cannot read X of undefined" = ada null/undefined di chain
→ "X is not a function" = kamu panggil sesuatu yang bukan fungsi
→ "Maximum update depth exceeded" = infinite loop di useEffect

Langkah 2: Identifikasi file dan baris dari stack trace
→ Pergi ke file:baris yang disebutkan di stack trace
→ Lihat apa yang ada di sana

Langkah 3: Tambahkan console.log strategis
→ Jangan log semua, log DATA YANG RELEVAN
→ Log sebelum baris yang crash
→ console.log('data sebelum crash:', JSON.stringify(data, null, 2))

Langkah 4: Periksa data yang mengalir
→ Pakai React DevTools untuk inspect props dan state
→ Network tab untuk lihat apa yang API kembalikan

Langkah 5: Isolasi masalah
→ Kecilkan scope — hapus bagian lain sampai crash hilang
→ Buat minimal reproducible case
```

### React DevTools — Fitur yang Sering Diabaikan

```
1. Components Tab
   → Inspect props dan state komponen manapun
   → Klik komponen → lihat semua hooks-nya
   → Edit state langsung dari DevTools untuk tes behavior

2. Profiler Tab
   → Record → interaksi → stop → lihat siapa yang re-render
   → Flame graph: lebar = waktu rendering
   → Ranked chart: komponen yang paling mahal
   → "Why did this render?" - klik komponen, lihat alasannya

3. Tips:
   → Setting → "Highlight updates" → lihat komponen yang re-render (warna flash)
   → Klik ikon bug di komponen untuk scroll ke elemen di DOM
```

### Network Tab untuk Debug API

```
Checklist saat ada masalah fetch:

1. Cek Request
   → URL sudah benar?
   → Method benar (GET/POST/PUT/DELETE)?
   → Headers ada? (Authorization, Content-Type?)
   → Request body sesuai? (klik Preview untuk lihat parsed JSON)

2. Cek Response
   → Status code berapa? (200/401/404/500?)
   → Response body isinya apa? (klik Preview)
   → Ada timing yang tidak normal? (TTFB tinggi?)

3. Tricks:
   → Filter: ketik "api" di filter box untuk lihat hanya API calls
   → Klik kanan request → "Copy as fetch" → paste di console → debug
   → "Preserve log" = log tidak hilang saat navigasi
   → Initiator tab = tahu baris kode mana yang memanggil request ini
```

### Breakpoint di VS Code

```typescript
// Cara debug tanpa console.log berlebihan:

// 1. Klik di gutter (area kiri nomor baris) di VS Code → set breakpoint

// 2. Atau: tambahkan debugger statement
async function processOrder(orderId: string) {
  const order = await fetchOrder(orderId);
  debugger; // ← eksekusi berhenti di sini kalau DevTools terbuka
  const total = calculateTotal(order.items);
  return { order, total };
}

// 3. Di browser: buka DevTools → Source tab → set breakpoint
// → Eksekusi berhenti, kamu bisa inspect variabel di scope

// 4. Conditional breakpoint: klik kanan pada breakpoint
// → "Edit Breakpoint" → masukkan kondisi
// Misal: orderId === '123' → hanya berhenti untuk order tertentu
```

---

## 9. Sentry untuk Error Monitoring di Production

### Kenapa Sentry?

Di production, `console.error` tidak berguna — tidak ada yang baca. Sentry:
- Menangkap error secara otomatis
- Mengelompokkan error yang sama
- Kasih context: user yang affected, browser, OS
- Memberitahu via email/Slack saat error baru muncul

### Setup di Next.js

```bash
npx @sentry/wizard@latest -i nextjs
# Wizard akan otomatis setup file-file yang diperlukan
```

Atau manual:

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts — untuk browser
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Hanya aktif di production
  enabled: process.env.NODE_ENV === 'production',

  // Persentase transaksi yang disampling untuk performance monitoring
  tracesSampleRate: 0.1, // 10% dari transaksi

  // Persentase session yang direkam (Replay)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0, // 100% saat ada error

  // Masukkan context user secara otomatis (via setUser di bawah)
  integrations: [
    Sentry.replayIntegration(),
  ],
});
```

```typescript
// sentry.server.config.ts — untuk Node.js (Server Components, API routes)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN, // server-side: tidak perlu NEXT_PUBLIC_
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.1,
});
```

### Integrasi dengan Logger

```typescript
// lib/logger.ts — update untuk kirim ke Sentry di production
import * as Sentry from '@sentry/nextjs';

export function logError(error: unknown, context: LogContext = {}): void {
  const message = error instanceof Error ? error.message : 'Unknown error';

  if (process.env.NODE_ENV === 'development') {
    console.error(`[ERROR] ${message}`, context);
    return;
  }

  // Production: kirim ke Sentry
  Sentry.withScope(scope => {
    // Tambahkan context sebagai "extra" data
    scope.setExtras(context as Record<string, unknown>);

    // Tag untuk filter di Sentry dashboard
    if (context.action) scope.setTag('action', String(context.action));
    if (context.component) scope.setTag('component', String(context.component));

    Sentry.captureException(error instanceof Error ? error : new Error(message));
  });
}

// Set user context setelah login
export function setLogUser(user: { id: string; email: string } | null): void {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null); // Clear saat logout
  }
}
```

### Sentry di Error Boundary

```tsx
// components/ErrorBoundary.tsx — update
import * as Sentry from '@sentry/nextjs';

export class ErrorBoundary extends Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.withScope(scope => {
      scope.setExtras({ componentStack: errorInfo.componentStack });
      Sentry.captureException(error);
    });
    this.props.onError?.(error, errorInfo);
  }
  // ... rest sama
}
```

---

## 10. Mini Project: Tambahkan Error Handling ke LoginForm

Kita ambil `LoginForm` dari doc sebelumnya dan upgrade error handling-nya dari naif ke production-ready.

### Struktur File

```
app/
  (auth)/
    login/
      page.tsx
      loading.tsx
  error.tsx
  global-error.tsx
components/
  ErrorBoundary.tsx        ← Error Boundary generik
  LoginForm/
    LoginForm.tsx          ← Komponen login (upgraded)
    LoginForm.test.tsx
lib/
  api-client.ts            ← apiFetch dengan typed errors
  logger.ts                ← logger terstruktur
  auth.ts                  ← login function dengan error handling
```

---

### lib/api-client.ts

```typescript
// lib/api-client.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new NetworkError('Request timeout. Coba lagi nanti.');
    }
    throw new NetworkError('Tidak dapat terhubung. Periksa koneksi internet kamu.');
  }

  if (!response.ok) {
    let body: { message?: string; code?: string } = {};
    try { body = await response.json(); } catch { /* ignore */ }
    throw new ApiError(
      body.message ?? `Error ${response.status}`,
      response.status,
      body.code
    );
  }

  return response.json() as Promise<T>;
}
```

---

### lib/auth.ts

```typescript
// lib/auth.ts
import { apiFetch, ApiError, NetworkError } from './api-client';
import { logError } from './logger';

interface LoginResponse {
  token: string;
  user: { id: string; name: string; role: string };
  redirectTo: string;
}

// Union type yang jelas — pemanggil tahu harus handle semua case
type LoginResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string; field?: 'email' | 'password' | 'general' };

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const response = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    // Simpan token (seharusnya di httpOnly cookie — ini contoh sederhana)
    sessionStorage.setItem('token', response.token);

    return { success: true, redirectTo: response.redirectTo };
  } catch (error) {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 401:
          return {
            success: false,
            error: 'Email atau password salah',
            field: 'general',
          };
        case 403:
          return {
            success: false,
            error: 'Akun kamu diblokir. Hubungi support.',
            field: 'general',
          };
        case 422:
          return {
            success: false,
            error: 'Format email tidak valid',
            field: 'email',
          };
        case 429:
          return {
            success: false,
            error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.',
            field: 'general',
          };
      }
    }

    if (error instanceof NetworkError) {
      return {
        success: false,
        error: error.message,
        field: 'general',
      };
    }

    // Error tidak terduga — log dan tampilkan pesan generik
    logError(error, {
      action: 'loginUser',
      email: email, // aman di-log (bukan password)
    });

    return {
      success: false,
      error: 'Terjadi kesalahan sistem. Tim kami sudah diberitahu.',
      field: 'general',
    };
  }
}
```

---

### components/LoginForm/LoginForm.tsx (Upgraded)

```tsx
// components/LoginForm/LoginForm.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/auth';
import { logError } from '@/lib/logger';

interface FieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = 'Email wajib diisi';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Format email tidak valid';
  }
  if (!password) {
    errors.password = 'Password wajib diisi';
  } else if (password.length < 8) {
    errors.password = 'Password minimal 8 karakter';
  }
  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validasi client-side dulu sebelum hit API
    const validationErrors = validate(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await loginUser(email, password);

      if (!result.success) {
        // Server-side error — petakan ke field yang tepat
        if (result.field === 'email') {
          setErrors({ email: result.error });
        } else if (result.field === 'password') {
          setErrors({ password: result.error });
        } else {
          setErrors({ general: result.error });
        }
        return;
      }

      // Sukses: redirect
      router.push(result.redirectTo);
    } catch (unexpectedError) {
      // Ini seharusnya tidak terjadi karena loginUser sudah handle semua case
      // Tapi kita tetap defensive
      logError(unexpectedError, {
        action: 'LoginForm.handleSubmit',
        email,
      });
      setErrors({
        general: 'Terjadi kesalahan tidak terduga. Coba muat ulang halaman.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-container">
      <h1>Masuk ke Akun</h1>

      <form onSubmit={handleSubmit} noValidate aria-label="Form Login">
        {/* General Error Banner */}
        {errors.general && (
          <div role="alert" className="error-banner">
            <span aria-hidden="true">⚠</span>
            {errors.general}
          </div>
        )}

        {/* Email */}
        <div className="field">
          <label htmlFor="email">Alamat Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
            disabled={isLoading}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="field-error">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            aria-invalid={!!errors.password}
            disabled={isLoading}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="field-error">
              {errors.password}
            </p>
          )}
        </div>

        <a href="/forgot-password">Lupa password?</a>

        <button type="submit" disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <p>
        Belum punya akun?{' '}
        <a href="/register">Daftar sekarang</a>
      </p>
    </div>
  );
}
```

---

### app/(auth)/login/page.tsx dengan Error Boundary

```tsx
// app/(auth)/login/page.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoginForm } from '@/components/LoginForm/LoginForm';

// Fallback khusus untuk halaman login
function LoginFormError({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="login-error">
      <h2>Formulir login tidak dapat dimuat</h2>
      <p>Coba muat ulang halaman.</p>
      <button onClick={reset}>Coba Lagi</button>
      <p>
        Masih bermasalah?{' '}
        <a href="/bantuan">Hubungi support</a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-page">
      <ErrorBoundary
        renderFallback={(error, reset) => <LoginFormError reset={reset} />}
      >
        <LoginForm />
      </ErrorBoundary>
    </main>
  );
}
```

---

### app/error.tsx — Global Error Handler

```tsx
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { logError } from '@/lib/logger';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, {
      digest: error.digest,
      location: 'GlobalErrorPage',
      url: window.location.href,
    });
  }, [error]);

  return (
    <div className="error-page" role="alert">
      <h2>Halaman Ini Mengalami Masalah</h2>
      <p>Kami sudah diberitahu dan sedang menangani masalah ini.</p>
      {error.digest && (
        <p className="error-id">
          ID Error: <code>{error.digest}</code>
          <br />
          <small>Sertakan kode ini saat menghubungi support.</small>
        </p>
      )}
      {process.env.NODE_ENV === 'development' && (
        <details open>
          <summary>Detail (dev only)</summary>
          <pre>{error.stack}</pre>
        </details>
      )}
      <div className="error-actions">
        <button onClick={reset}>Coba Lagi</button>
        <a href="/">Kembali ke Beranda</a>
      </div>
    </div>
  );
}
```

---

### Test yang Di-update (lib/auth.ts)

```tsx
// lib/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { loginUser } from './auth';

describe('loginUser', () => {
  it('return success dengan redirectTo saat login berhasil', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({
          token: 'jwt.token.here',
          user: { id: '1', name: 'Budi', role: 'user' },
          redirectTo: '/dashboard',
        })
      )
    );

    const result = await loginUser('budi@email.com', 'password123');
    expect(result).toEqual({ success: true, redirectTo: '/dashboard' });
  });

  it('return error generik saat 401 (email/password salah)', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
      )
    );

    const result = await loginUser('salah@email.com', 'wrongpassword');
    expect(result).toEqual({
      success: false,
      error: 'Email atau password salah',
      field: 'general',
    });
  });

  it('return error rate limit saat 429', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ message: 'Too many requests' }, { status: 429 })
      )
    );

    const result = await loginUser('budi@email.com', 'password123');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/terlalu banyak percobaan/i);
  });

  it('return error network saat tidak bisa konek', async () => {
    server.use(
      http.post('/api/auth/login', () => HttpResponse.error())
    );

    const result = await loginUser('budi@email.com', 'password123');
    expect(result.success).toBe(false);
    expect(result.field).toBe('general');
  });
});
```

---

### Checklist Error Handling

```
Error Boundary
☐ Ada ErrorBoundary di root layout
☐ Ada ErrorBoundary yang lebih spesifik di area kritis (form, data-heavy components)
☐ Fallback UI bermakna — bukan cuma "Error!" polos
☐ Ada tombol "Coba Lagi" yang reset boundary
☐ Error dikirim ke monitoring (Sentry/logger) di componentDidCatch

Async Error Handling
☐ Setiap fetch dibungkus dengan try/catch
☐ HTTP error (response.ok === false) ditangani secara eksplisit
☐ Network error (fetch throw) ditangani dengan pesan yang ramah user
☐ Error 4xx vs 5xx ditangani berbeda
☐ Tidak ada "error ditelan" (catch kosong)

TanStack Query
☐ Global error handler untuk query (QueryCache.onError)
☐ Global error handler untuk mutation (MutationCache.onError)
☐ isError state ditampilkan di komponen
☐ retry config: jangan retry untuk error 4xx

Next.js
☐ error.tsx ada di setiap segment penting
☐ global-error.tsx ada di root
☐ not-found.tsx ada untuk 404

Logging
☐ Setiap error log mengandung: action, context, user-relevant data
☐ TIDAK log data sensitif (password, token, kartu kredit)
☐ Log berbeda untuk dev (console) dan production (Sentry)
☐ error.digest disertakan saat ada

TypeScript
☐ Data dari API di-parse dengan Zod sebelum digunakan
☐ Tidak ada `as SomeType` tanpa validasi runtime
☐ Union return type untuk fungsi yang bisa gagal
☐ Exhaustive check untuk enum/switch
```

---

## Penutup

Error handling yang baik itu bukan berarti "anti-crash" — error akan selalu ada. Yang penting adalah:

1. **User tahu apa yang terjadi** — bukan blank putih atau spinner infinite
2. **Developer tahu di mana masalahnya** — log dengan context yang cukup
3. **Sistem bisa recover** — reset button, retry logic, fallback UI
4. **Error bisa dimonitor** — Sentry memberitahu kamu sebelum user report

```
Hierarki pertahanan:
  TypeScript          → Cegah error di compile time
     ↓
  Zod/type guard      → Cegah error dari data tidak terduga
     ↓
  try/catch yang benar → Tangkap dan handle error async
     ↓
  Error Boundary      → Jaring terakhir, isolasi kerusakan
     ↓
  error.tsx           → Fallback UI yang bermakna
     ↓
  Sentry/logging      → Kamu tahu kalau ada yang gagal di production
```

Error handling seperti sabuk pengaman di mobil — tidak ada yang suka pasang, tapi kamu sangat bersyukur saat butuh.
