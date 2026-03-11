# 15 — Keamanan API & Pengelolaan Secret di Next.js

> **Gaya baca:** Obrolan santai senior ke junior. Gue bakal tunjukin skenario yang bikin cold sweat dulu — baru kasih solusinya.

---

## Daftar Isi

1. [Kenapa API Security Sering Menjadi Titik Lemah?](#1-kenapa-api-security-sering-menjadi-titik-lemah)
2. [NEXT_PUBLIC_ vs Secret: Perbedaan yang Wajib Kamu Hafal](#2-next_public_-vs-secret-perbedaan-yang-wajib-kamu-hafal)
3. [Validasi Environment Variables dengan Zod](#3-validasi-environment-variables-dengan-zod)
4. [API Routes sebagai Secure Proxy](#4-api-routes-sebagai-secure-proxy)
5. [Rate Limiting di Next.js](#5-rate-limiting-di-nextjs)
6. [Validasi & Sanitasi Input User](#6-validasi--sanitasi-input-user)
7. [CORS: Cara Kerja dan Konfigurasi yang Benar](#7-cors-cara-kerja-dan-konfigurasi-yang-benar)
8. [Checklist Sebelum Push ke GitHub](#8-checklist-sebelum-push-ke-github)
9. [Mini Project: Secure Payment Intent API Route](#9-mini-project-secure-payment-intent-api-route)

---

## 1. Kenapa API Security Sering Menjadi Titik Lemah?

### Skenario yang Sering Gue Lihat

**Senin pagi.** Developer baru join startup, dikasih task "integrasi OpenAI ke chat feature". Deadline mepet. Dia langsung:

```tsx
// ❌ app/chat/page.tsx
'use client';

async function sendMessage(message: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'gpt-4', messages: [{ role: 'user', content: message }] }),
  });
  return response.json();
}
```

Kelihatan simpel. Kelihatan works. PR di-merge.

**Selasa pagi.** Tagihan OpenAI tiba-tiba naik 50x karena seseorang buka DevTools, ambil API key dari network tab, dan pakai ke script mereka sendiri. App kamu sekarang membiayai AI bot orang lain.

Ini bukan skenario hipotesis — ini kejadian nyata yang berulang.

---

### Pola Kesalahan yang Paling Umum

```
Kesalahan 1: Secret di client (NEXT_PUBLIC_SECRET_KEY)
Kesalahan 2: Tidak ada validasi env saat startup → crash di production
Kesalahan 3: Frontend langsung call third-party API → key exposed
Kesalahan 4: Tidak ada rate limiting → endpoint bisa di-abuse
Kesalahan 5: Input user langsung diteruskan ke API tanpa validasi
Kesalahan 6: CORS terlalu permisif → cross-origin request bebas masuk
```

Satu per satu kita bedah dan fix.

---

## 2. NEXT_PUBLIC_ vs Secret: Perbedaan yang Wajib Kamu Hafal

### Cara Kerja Next.js Environment Variables

Next.js punya dua "dunia" saat build:

```
Build Time                    Runtime
    │                            │
    ├─ Server-side code           ├─ Node.js process (server)
    │  (API routes, Server        │  Bisa akses env var apapun
    │   Components, middleware)   │
    │                             │
    └─ Client-side code           └─ Browser
       (Client Components,           Hanya bisa akses env var
        Pages dengan 'use client')   dengan prefix NEXT_PUBLIC_
```

Saat Next.js build kode client-side, dia **literally replace** `process.env.NEXT_PUBLIC_XXX` dengan nilai string-nya. Jadi kalau kamu punya:

```tsx
// Di kode client
const key = process.env.NEXT_PUBLIC_OPENAI_KEY;
```

Setelah build, kode itu jadi:

```tsx
// Di bundle yang dikirim ke browser
const key = "sk-proj-abc123def456..."; // nilai aslinya! 
```

Siapapun yang buka browser, view source, atau lihat network tab → bisa lihat key kamu.

---

### Tabel Referensi: Mana yang Boleh NEXT_PUBLIC_?

| Jenis Data | Contoh | NEXT_PUBLIC_? | Alasan |
|-----------|--------|---------------|--------|
| API URL publik | `https://api.yourapp.com` | ✅ Boleh | URL ini memang harus diakses browser |
| Feature flags | `NEXT_PUBLIC_ENABLE_BETA=true` | ✅ Boleh | Non-sensitive, intentionally public |
| Stripe Publishable Key | `pk_live_xxx` | ✅ Boleh | Dirancang untuk dipakai di browser |
| Google Maps Key | `AIzaSy...` | ⚠️ Hati-hati | Perlu domain restriction di Google Console |
| App name / version | `NEXT_PUBLIC_APP_NAME` | ✅ Boleh | Non-sensitive |
| Database URL | `postgresql://user:pass@...` | ❌ Jangan | Credentials database jelas rahasia |
| JWT Secret | `jwt-secret-key` | ❌ Jangan | Kalau exposed, semua token bisa dipalsukan |
| OpenAI / Anthropic key | `sk-proj-...` | ❌ Jangan | Tagihan membengkak + quota kamu habis |
| Stripe Secret Key | `sk_live_xxx` | ❌ Jangan | Bisa buat transaksi atas nama kamu |
| OAuth Client Secret | `GOCSPX-...` | ❌ Jangan | Bisa impersonate app kamu |
| Email service key | `SG.xxxxx` | ❌ Jangan | Bisa kirim spam pakai domain kamu |
| Webhook secrets | `whsec_...` | ❌ Jangan | Bisa forge webhook events |
| Internal API keys | `internal-key-xxx` | ❌ Jangan | Akses ke sistem internal |

---

### Struktur .env yang Benar

```bash
# .env.local — jangan pernah commit file ini ke git!

# ─────────────────────────────────────────
# SERVER ONLY — tidak pernah ke browser
# ─────────────────────────────────────────

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
REDIS_URL="redis://localhost:6379"

# Auth
NEXTAUTH_SECRET="generate-dengan-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Third-party APIs (sensitive)
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxx"
STRIPE_SECRET_KEY="sk_live_xxxxxxxxxxxxxxxx"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxx"
WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxx"

# Internal
JWT_SECRET="random-string-panjang-sekali"
ENCRYPTION_KEY="32-byte-hex-string"

# ─────────────────────────────────────────
# CLIENT SAFE — boleh di-bundle ke browser
# ─────────────────────────────────────────

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="https://api.yourapp.com"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_xxxxxxxxxxxxxxxx"
NEXT_PUBLIC_POSTHOG_KEY="phc_xxxxxxxxxxxxxxxx"
```

```bash
# .gitignore — pastikan ini ada!
.env.local
.env.*.local
.env.production  # kalau ada
```

---

## 3. Validasi Environment Variables dengan Zod

### Masalah: "undefined is not a string" di Production

```
App berjalan sempurna di local.
Di-deploy ke Vercel.
User pertama coba login → error 500.
Kamu cek logs: "Cannot read properties of undefined (reading 'sign')"
Ternyata: lupa set JWT_SECRET di environment Vercel.
```

Ini bisa dideteksi **sebelum deploy** kalau kamu validasi env saat startup.

---

### Setup Validasi Env dengan Zod

```bash
npm install zod
```

```typescript
// lib/env.ts — satu file, jadi single source of truth untuk semua env var

import { z } from 'zod';

// ─────────────────────────────────────────
// Schema untuk server-side env
// ─────────────────────────────────────────
const serverEnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL harus berupa URL yang valid'),

  // Auth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET minimal 32 karakter, gunakan: openssl rand -base64 32'),
  NEXTAUTH_URL: z.string().url(),

  // Stripe
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith('sk_', 'STRIPE_SECRET_KEY harus dimulai dengan sk_'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET harus dimulai dengan whsec_'),

  // OpenAI (optional — mungkin tidak semua env butuh ini)
  OPENAI_API_KEY: z
    .string()
    .startsWith('sk-', 'OPENAI_API_KEY harus dimulai dengan sk-')
    .optional(),

  // Redis (optional untuk development)
  REDIS_URL: z.string().url().optional(),

  // App
  APP_URL: z.string().url().default('http://localhost:3000'),
});

// ─────────────────────────────────────────
// Schema untuk client-side env (NEXT_PUBLIC_)
// ─────────────────────────────────────────
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_', 'Stripe publishable key harus dimulai dengan pk_'),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
});

// ─────────────────────────────────────────
// Validasi dan export
// ─────────────────────────────────────────

// Validasi server env — hanya jalan di server
function validateServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Environment variables tidak valid:');
    console.error(parsed.error.flatten().fieldErrors);
    // Crash saat startup — lebih baik gagal cepat daripada error di tengah jalan
    throw new Error('Environment variables tidak valid. Cek .env.local kamu!');
  }

  return parsed.data;
}

// Validasi client env
function validateClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  });

  if (!parsed.success) {
    console.error('❌ Client environment variables tidak valid:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Client environment variables tidak valid!');
  }

  return parsed.data;
}

// Guard: pastikan tidak ada akses server env dari client bundle
const isServer = typeof window === 'undefined';

export const serverEnv = isServer
  ? validateServerEnv()
  : ({} as ReturnType<typeof validateServerEnv>); // tidak pernah diakses dari client

export const clientEnv = validateClientEnv();
```

```tsx
// Cara pakai — di server (API route, Server Component)
import { serverEnv } from '@/lib/env';

export async function POST(request: Request) {
  // serverEnv sudah divalidasi, sudah ada type, tidak perlu optional chaining
  const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY);
  //                                  ^ TypeScript tahu ini string, bukan string | undefined
}
```

```tsx
// Cara pakai — di client component
import { clientEnv } from '@/lib/env';

function CheckoutButton() {
  const stripe = loadStripe(clientEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  // Ini aman — publishable key memang untuk client
}
```

### Integrasi dengan Next.js Startup

```typescript
// instrumentation.ts — jalan saat Next.js server startup
// Letakkan di root project (sebelah next.config.ts)
export async function register() {
  // Jalankan validasi saat server pertama kali start
  // Kalau ada env yang missing/invalid → crash early, bukan saat user hit endpoint
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/env'); // trigger validasi
    console.log('✅ Environment variables tervalidasi');
  }
}
```

```typescript
// next.config.ts — aktifkan instrumentation
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    instrumentationHook: true, // aktifkan instrumentation.ts
  },
};

export default nextConfig;
```

---

## 4. API Routes sebagai Secure Proxy

### Masalah: Frontend Langsung Call Third-Party API

```
Browser → OpenAI API
         (dengan API key yang exposed di network tab)
```

### Solusi: Backend for Frontend (BFF) Pattern

```
Browser → Next.js API Route → OpenAI API
          (key ada di server,  (key tidak pernah
           tidak ke browser)    ke browser)
```

Dengan pattern ini:
- API key **tidak pernah meninggalkan server**
- Kamu bisa **tambahkan auth check** sebelum forward request
- Kamu bisa **rate limit** di level App, bukan API key
- Kamu bisa **transform/filter** response sebelum dikirim ke client

---

### Contoh: Proxy ke OpenAI

```tsx
// ❌ CARA SALAH — langsung dari client
// app/chat/page.tsx
'use client';

async function chat(message: string) {
  // API key exposed! Siapapun bisa lihat di DevTools
  return fetch('https://api.openai.com/v1/chat/completions', {
    headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}` },
    // ...
  });
}
```

```typescript
// ✅ CARA BENAR — proxy via API route
// app/api/chat/route.ts

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { serverEnv } from '@/lib/env';
import { z } from 'zod';

const ChatSchema = z.object({
  message: z
    .string()
    .min(1, 'Pesan tidak boleh kosong')
    .max(2000, 'Pesan maksimal 2000 karakter'),
  conversationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  // 1. Cek autentikasi — siapa yang boleh pakai endpoint ini?
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: 'Silakan login terlebih dahulu' }, { status: 401 });
  }

  // 2. Validasi input
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Input tidak valid', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // 3. (Opsional) Cek usage quota user — cegah abuse per-user
  const userUsage = await getUserDailyUsage(session.user.id);
  if (userUsage >= 50) {
    return Response.json(
      { error: 'Batas penggunaan harian tercapai (50 pesan)' },
      { status: 429 }
    );
  }

  // 4. Call OpenAI dengan server-side key — client tidak pernah tahu key ini
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serverEnv.OPENAI_API_KEY}`, // server-only!
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: parsed.data.message }],
      max_tokens: 1000,
      // Batasi output — cegah response yang terlalu besar
    }),
  });

  if (!response.ok) {
    // Jangan expose error mentah dari OpenAI ke client
    console.error('OpenAI error:', response.status, await response.text());
    return Response.json(
      { error: 'Terjadi kesalahan saat memproses pesan' },
      { status: 500 }
    );
  }

  const data = await response.json();

  // 5. Increment usage counter
  await incrementUserUsage(session.user.id);

  // 6. Return ke client — hanya data yang diperlukan
  return Response.json({
    reply: data.choices[0].message.content,
    // JANGAN return: data.usage, data.model details, dll kalau tidak perlu
  });
}
```

```tsx
// app/chat/page.tsx — client hanya tahu endpoint internal kamu
'use client';

async function sendMessage(message: string) {
  const response = await fetch('/api/chat', { // endpoint kamu, bukan OpenAI!
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    credentials: 'include', // kirim cookie untuk auth
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
}
```

---

### Contoh: Proxy ke External API dengan Auth Header

```typescript
// app/api/weather/route.ts — proxy ke weather API
import { serverEnv } from '@/lib/env';
import { z } from 'zod';
import { NextRequest } from 'next/server';

const QuerySchema = z.object({
  city: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z\s-]+$/, 'Nama kota hanya boleh mengandung huruf dan spasi'),
  unit: z.enum(['metric', 'imperial']).default('metric'),
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const parsed = QuerySchema.safeParse({
    city: searchParams.get('city'),
    unit: searchParams.get('unit') ?? 'metric',
  });

  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { city, unit } = parsed.data;

  const weatherResponse = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=${unit}&appid=${serverEnv.OPENWEATHER_API_KEY}`,
    { next: { revalidate: 300 } } // cache 5 menit
  );

  if (!weatherResponse.ok) {
    if (weatherResponse.status === 404) {
      return Response.json({ error: 'Kota tidak ditemukan' }, { status: 404 });
    }
    return Response.json({ error: 'Gagal mengambil data cuaca' }, { status: 500 });
  }

  const weather = await weatherResponse.json();

  // Filter data: hanya return field yang diperlukan client
  return Response.json({
    city: weather.name,
    country: weather.sys.country,
    temp: weather.main.temp,
    feels_like: weather.main.feels_like,
    description: weather.weather[0].description,
    humidity: weather.main.humidity,
    // Tidak return: internal IDs, API metadata, dll
  });
}
```

---

## 5. Rate Limiting di Next.js

### Kenapa Perlu Rate Limiting?

Tanpa rate limiting, endpoint kamu vulnerable terhadap:
- **Brute force**: Coba ribuan kombinasi password
- **Credential stuffing**: Uji daftar username/password hasil leak
- **API abuse**: Boros quota third-party API yang kamu bayar
- **DoS ringan**: Flood endpoint sampai server lemot

---

### Implementasi dengan Upstash Redis (Production-Ready)

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// lib/rate-limit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Pastikan UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN ada di .env
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Berbagai konfigurasi rate limit untuk use case berbeda
export const rateLimiters = {
  // General API: 60 request per menit per IP
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1m'),
    analytics: true,
    prefix: 'rl:general',
  }),

  // Auth endpoints (login, register): ketat — cegah brute force
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15m'), // 5x per 15 menit
    analytics: true,
    prefix: 'rl:auth',
  }),

  // Expensive operations (AI, payment): lebih ketat
  expensive: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1h'), // 10x per jam
    analytics: true,
    prefix: 'rl:expensive',
  }),

  // Per user (bukan per IP) — kalau sudah authenticated
  perUser: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(100, '1d'), // 100x per hari per user
    analytics: true,
    prefix: 'rl:user',
  }),
};

// Helper: ambil IP dari request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    // x-forwarded-for bisa berisi daftar IP: "client, proxy1, proxy2"
    return forwarded.split(',')[0].trim();
  }

  return realIp ?? '127.0.0.1';
}

// Helper: response standard untuk rate limit exceeded
export function rateLimitExceededResponse(reset: number): Response {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: 'Terlalu banyak request. Coba lagi nanti.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      },
    }
  );
}
```

```typescript
// Cara pakai di API route

// app/api/login/route.ts
import { rateLimiters, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Rate limit berdasarkan IP — ketat untuk login
  const ip = getClientIP(request);
  const { success, limit, remaining, reset } = await rateLimiters.auth.limit(ip);

  // Selalu tambahkan headers info rate limit
  const rateLimitHeaders = {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(reset).toISOString(),
  };

  if (!success) {
    return rateLimitExceededResponse(reset);
  }

  // ... logic login
  return Response.json({ success: true }, { headers: rateLimitHeaders });
}
```

---

### Rate Limiting via Middleware (Untuk Semua Routes)

```typescript
// middleware.ts — rate limit di edge, sebelum request sampai ke route handler

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1m'),
  prefix: 'rl:middleware',
});

// Hanya apply rate limit ke API routes
export const config = {
  matcher: '/api/:path*',
};

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new NextResponse(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return NextResponse.next();
}
```

---

### Rate Limiting Tanpa Redis (Development / Sederhana)

```typescript
// lib/rate-limit-memory.ts — menggunakan in-memory (tidak persist antar restart)
// Cocok untuk development atau app kecil, TIDAK untuk production multi-instance

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = store.get(key);

  // Window sudah expired atau entry baru
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  // Sudah melebihi limit
  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetAt };
  }

  // Increment counter
  entry.count++;
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt };
}

// Cleanup periodis supaya memory tidak bocor
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000); // cleanup setiap menit
```

---

## 6. Validasi & Sanitasi Input User

### Prinsip: "Trust Nothing from the Client"

Semua data yang datang dari browser harus dianggap **berpotensi berbahaya** sampai terbukti sebaliknya. User bisa:
- Kirim tipe data yang salah (string di mana kamu expect number)
- Kirim value di luar range yang kamu expect
- Kirim payload yang sangat besar untuk crash server
- Inject karakter khusus untuk manipulasi query/command

---

### Validasi dengan Zod: Pattern Lengkap

```typescript
// lib/schemas/ — kumpulkan semua schema di satu tempat

// lib/schemas/user.schema.ts
import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .max(50, 'Nama maksimal 50 karakter')
    .regex(/^[a-zA-Z\s'-]+$/, 'Nama hanya boleh mengandung huruf'),

  email: z
    .string()
    .email('Format email tidak valid')
    .toLowerCase() // normalize: selalu lowercase
    .max(255),

  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(72, 'Password maksimal 72 karakter') // bcrypt limit
    .regex(/[A-Z]/, 'Password harus mengandung huruf kapital')
    .regex(/[0-9]/, 'Password harus mengandung angka'),

  age: z
    .number()
    .int('Umur harus bilangan bulat')
    .min(13, 'Minimal 13 tahun')
    .max(120, 'Umur tidak valid'),
});

// lib/schemas/product.schema.ts
export const CreateProductSchema = z.object({
  name: z.string().min(1).max(200).trim(),

  price: z
    .number()
    .positive('Harga harus positif')
    .max(999_999_999, 'Harga terlalu besar')
    .multipleOf(0.01, 'Harga maksimal 2 desimal'), // cegah floating point issue

  categoryId: z.string().uuid('Category ID harus berupa UUID valid'),

  description: z
    .string()
    .max(5000)
    .trim()
    .optional(),

  stock: z
    .number()
    .int()
    .min(0)
    .max(999_999),

  images: z
    .array(z.string().url())
    .min(1, 'Minimal 1 gambar')
    .max(10, 'Maksimal 10 gambar'),
});

// lib/schemas/pagination.schema.ts — reusable
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // z.coerce: string "1" dari query param dikonversi ke number 1

  limit: z.coerce.number().int().min(1).max(100).default(20),
  // Batasi max 100 — hindari query yang return jutaan rows

  sortBy: z.enum(['createdAt', 'name', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

```typescript
// Cara pakai di API route — consistent pattern
// app/api/products/route.ts

import { CreateProductSchema } from '@/lib/schemas/product.schema';
import { PaginationSchema } from '@/lib/schemas/pagination.schema';
import { NextRequest } from 'next/server';

// GET /api/products?page=1&limit=20&sortBy=price
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);

  const parsed = PaginationSchema.safeParse(params);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { page, limit, sortBy, sortOrder } = parsed.data;

  // Aman: page dan limit sudah validated dan bounded
  const products = await db.product.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
  });

  return Response.json({ products, page, limit });
}

// POST /api/products
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return Response.json({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const parsed = CreateProductSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Validasi gagal',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  // parsed.data sudah clean: trimmed, tipe benar, dalam range
  const product = await db.product.create({ data: parsed.data });

  return Response.json(product, { status: 201 });
}
```

---

### Sanitasi: Field yang Akan Dirender sebagai HTML

```typescript
// Kalau ada field yang nantinya di-render dengan dangerouslySetInnerHTML
import DOMPurify from 'isomorphic-dompurify';
import { z } from 'zod';

// Custom Zod transformer untuk sanitasi HTML
const sanitizedHtml = z.string().transform(val =>
  DOMPurify.sanitize(val, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
);

const BlogPostSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  content: sanitizedHtml, // otomatis disanitasi
  summary: z.string().max(500).trim().optional(),
});
```

---

### Cegah Mass Assignment

```typescript
// ❌ BERBAHAYA — langsung pass semua dari request ke DB
export async function POST(request: Request) {
  const body = await request.json();
  // Kalau user kirim { "role": "admin", "credits": 9999 }
  // Dan kamu langsung pass ke createUser — user jadi admin!
  await db.user.create({ data: body });
}
```

```typescript
// ✅ AMAN — hanya field yang diizinkan
const CreateUserSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  // Tidak ada: role, credits, isAdmin, dll
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = CreateUserSchema.safeParse(body); // hanya ambil field yang diizinkan

  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }

  // parsed.data HANYA berisi: name, email, password
  // Field berbahaya seperti role dibuang otomatis oleh Zod
  await db.user.create({
    data: {
      ...parsed.data,
      role: 'user',       // selalu set default dari kode, bukan dari input
      credits: 0,         // bukan dari request
      hashedPassword: await bcrypt.hash(parsed.data.password, 12),
    },
  });
}
```

---

## 7. CORS: Cara Kerja dan Konfigurasi yang Benar

### Cara Kerja CORS

CORS (Cross-Origin Resource Sharing) adalah mekanisme browser yang mengontrol **script dari origin mana yang boleh mengakses resource kamu**.

```
Origin = protocol + domain + port
Contoh:
  https://app.com          = origin A
  https://api.app.com      = origin B (berbeda subdomain → cross-origin)
  http://app.com           = origin C (berbeda protocol → cross-origin)
  https://app.com:8080     = origin D (berbeda port → cross-origin)
```

**Tanpa CORS headers** → browser blokir response dari cross-origin request.

**Dengan CORS headers yang terlalu permisif** → semua domain bisa akses API kamu.

---

### Skenario "Apa yang Bisa Salah"

```typescript
// ❌ TERLALU PERMISIF — semua origin bisa akses
export async function GET() {
  return new Response(data, {
    headers: {
      'Access-Control-Allow-Origin': '*', // wildcard = siapapun boleh
    },
  });
}
// Akibat: script dari evil.com bisa fetch data dari API kamu
// Kalau + Allow-Credentials: true → extra berbahaya (cookie ikut)
```

```typescript
// ❌ WILDCARD + CREDENTIALS — kombinasi paling berbahaya
// Browser sebenarnya tolak ini, tapi programmer kadang "fix" dengan cara yang salah
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true', // ini akan di-reject browser, tapi jangan coba
}
```

---

### Konfigurasi CORS yang Benar di Next.js

```typescript
// lib/cors.ts — helper yang bisa dipakai di semua API routes

type CORSOptions = {
  allowedOrigins: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
};

export function createCORSHeaders(
  requestOrigin: string | null,
  options: CORSOptions
): HeadersInit {
  const {
    allowedOrigins,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'x-csrf-token'],
    allowCredentials = false,
    maxAge = 86400, // 24 jam cache preflight
  } = options;

  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': allowedMethods.join(', '),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
    'Access-Control-Max-Age': maxAge.toString(),
    'Vary': 'Origin', // penting! cache berbeda per origin
  };

  // Cek apakah origin requester ada di whitelist
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    if (allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }
  // Kalau tidak ada di whitelist → tidak add Access-Control-Allow-Origin
  // Browser akan blokir response → exactly yang kita mau

  return headers;
}
```

```typescript
// lib/cors-config.ts — konfigurasi per environment

const ALLOWED_ORIGINS = {
  development: [
    'http://localhost:3000',
    'http://localhost:3001', // kalau ada dev environment lain
  ],
  production: [
    'https://app.yourcompany.com',
    'https://admin.yourcompany.com',
    // Tidak include: http://, * , domain kompetitor, dll
  ],
};

export const corsOptions = {
  allowedOrigins:
    ALLOWED_ORIGINS[process.env.NODE_ENV as keyof typeof ALLOWED_ORIGINS] ??
    ALLOWED_ORIGINS.development,
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  allowCredentials: true, // karena kita pakai cookie untuk auth
  maxAge: 86400,
};
```

```typescript
// Cara pakai di API route
// app/api/products/route.ts

import { createCORSHeaders } from '@/lib/cors';
import { corsOptions } from '@/lib/cors-config';
import { NextRequest } from 'next/server';

// Penting: Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new Response(null, {
    status: 204, // No Content — preflight tidak butuh body
    headers: createCORSHeaders(origin, corsOptions),
  });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = createCORSHeaders(origin, corsOptions);

  // ... logic

  return Response.json(data, { headers: corsHeaders });
}
```

---

### CORS via next.config.ts (Lebih Simple untuk Public API)

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Hanya apply ke public API yang memang boleh diakses cross-origin
        source: '/api/public/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://trusted-partner.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
      {
        // API private — tidak ada CORS header = browser blokir cross-origin
        source: '/api/private/:path*',
        headers: [
          // Tidak ada Access-Control-Allow-Origin → cross-origin diblokir browser
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## 8. Checklist Sebelum Push ke GitHub

### Secrets & Environment Variables

- [ ] Tidak ada API key, password, atau secret yang hardcoded di kode
- [ ] `.env.local`, `.env.production`, `.env.*` ada di `.gitignore`
- [ ] Semua secret ada di server-only env (tanpa prefix `NEXT_PUBLIC_`)
- [ ] Tidak ada `console.log` yang print secret key atau token
- [ ] `lib/env.ts` memvalidasi semua env yang diperlukan

```bash
# Cara cek: scan kode sebelum commit
# Install gitleaks atau truffleHog untuk scan secret
npx @secretlint/secretlint "**/*"

# Atau manual grep untuk pattern umum
grep -r "sk-" src/           # OpenAI key pattern
grep -r "sk_live" src/       # Stripe secret key
grep -r "AIza" src/          # Google API key
grep -r "AAAA" src/          # Firebase key
grep -rE "ghp_|github_pat" src/  # GitHub token
```

### API Routes

- [ ] Semua endpoint yang mutate data (POST/PUT/DELETE) memvalidasi autentikasi
- [ ] Input dari request body/query param divalidasi dengan Zod atau schema validation
- [ ] Rate limiting terpasang untuk endpoint yang sensitif (auth, payment, AI)
- [ ] Error message tidak expose informasi internal (stack trace, DB errors, dll)
- [ ] Response tidak return field yang tidak perlu (password hash, internal IDs, dll)

### CORS

- [ ] API endpoint tidak pakai `Access-Control-Allow-Origin: *` untuk endpoint yang butuh auth
- [ ] Whitelist origin sudah benar untuk production
- [ ] OPTIONS preflight dihandle dengan benar

### Dependencies

- [ ] `npm audit` clean (tidak ada high/critical)
- [ ] Package baru yang ditambahkan: cek reputasi, download count, kapan terakhir update

```bash
# Quick pre-push checklist sebagai npm script
# package.json
{
  "scripts": {
    "pre-push": "npm audit --audit-level=high && npm run type-check && npm run lint"
  }
}
```

---

## 9. Mini Project: Secure Payment Intent API Route

### Konteks

Kamu bikin fitur checkout. User pilih produk, klik "Bayar", frontend perlu buat Stripe Payment Intent. Ini operasi yang **sangat sensitif** — salah implementasi bisa bikin attacker buat transaksi palsu atau manipulasi jumlah pembayaran.

### Yang Perlu Diproteksi

```
1. Stripe secret key → jangan pernah ke client
2. Amount → jangan percaya dari client, hitung dari server
3. User → harus login, tidak boleh bikin intent untuk orang lain
4. Product → validasi produk ada dan harganya benar dari DB
5. Rate limit → cegah spam payment intent
6. Input → validasi semua field dengan ketat
```

---

### Struktur Project

```
app/
  api/
    payments/
      create-intent/
        route.ts      ← kita buat ini
  checkout/
    page.tsx          ← client component
lib/
  env.ts              ← env validation
  rate-limit.ts       ← rate limiter
  schemas/
    payment.schema.ts ← Zod schemas
```

---

### Step 1: Environment Validation

```typescript
// lib/env.ts (tambahkan ke schema yang sudah ada)
import { z } from 'zod';

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),

  // Stripe — wajib untuk payment
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  // Redis untuk rate limiting
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
});

function validateEnv<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('❌ Env validation failed:', result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  return result.data;
}

export const serverEnv = typeof window === 'undefined'
  ? validateEnv(serverEnvSchema, process.env)
  : ({} as z.infer<typeof serverEnvSchema>);

export const clientEnv = validateEnv(clientEnvSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});
```

---

### Step 2: Payment Schema

```typescript
// lib/schemas/payment.schema.ts
import { z } from 'zod';

export const CreatePaymentIntentSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid('Product ID harus berupa UUID'),
        quantity: z
          .number()
          .int('Quantity harus bilangan bulat')
          .min(1, 'Quantity minimal 1')
          .max(99, 'Quantity maksimal 99 per item'),
      })
    )
    .min(1, 'Minimal 1 item')
    .max(20, 'Maksimal 20 item berbeda dalam satu order'),

  // Kita TIDAK minta amount dari client!
  // Amount dihitung dari DB berdasarkan productId
  // Ini mencegah manipulasi harga dari sisi client

  shippingAddressId: z.string().uuid('Shipping address ID tidak valid').optional(),

  couponCode: z
    .string()
    .max(50)
    .regex(/^[A-Z0-9-]+$/, 'Format kode kupon tidak valid')
    .optional(),
});

export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>;

// Response type untuk client
export type PaymentIntentResponse = {
  clientSecret: string;      // untuk Stripe.js di frontend
  paymentIntentId: string;   // untuk tracking
  amount: number;            // dalam rupiah, untuk ditampilkan ke user
  currency: string;
};
```

---

### Step 3: Rate Limiter

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const rateLimiters = {
  // Payment intent: sangat ketat
  // 10 attempts per jam per user
  payment: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1h'),
    analytics: true,
    prefix: 'rl:payment',
  }),

  // Auth endpoints
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15m'),
    analytics: true,
    prefix: 'rl:auth',
  }),
};

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() ?? '127.0.0.1';
}
```

---

### Step 4: API Route (Inti)

```typescript
// app/api/payments/create-intent/route.ts
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { serverEnv } from '@/lib/env';
import { rateLimiters, getClientIP } from '@/lib/rate-limit';
import { CreatePaymentIntentSchema } from '@/lib/schemas/payment.schema';
import type { PaymentIntentResponse } from '@/lib/schemas/payment.schema';

// Inisialisasi Stripe dengan versi API yang spesifik
const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export async function POST(request: Request) {
  // ─────────────────────────────────────────
  // LAYER 1: Autentikasi
  // ─────────────────────────────────────────
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return Response.json(
      { error: 'Silakan login untuk melanjutkan pembayaran' },
      { status: 401 }
    );
  }

  // ─────────────────────────────────────────
  // LAYER 2: Rate Limiting
  // ─────────────────────────────────────────

  // Rate limit per user (bukan per IP) untuk authenticated routes
  const { success, reset, remaining } = await rateLimiters.payment.limit(
    `user:${session.user.id}`
  );

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return Response.json(
      {
        error: 'Terlalu banyak percobaan pembayaran. Coba lagi dalam beberapa menit.',
        retryAfterSeconds: retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  }

  // ─────────────────────────────────────────
  // LAYER 3: Validasi Input
  // ─────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Request body tidak valid' }, { status: 400 });
  }

  const parsed = CreatePaymentIntentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Data pesanan tidak valid',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }

  const { items, couponCode } = parsed.data;

  // ─────────────────────────────────────────
  // LAYER 4: Verifikasi Produk & Kalkulasi Harga (dari DB!)
  // ─────────────────────────────────────────
  const productIds = items.map(item => item.productId);

  // Ambil semua produk dari DB sekaligus
  const products = await db.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,       // pastikan produk masih aktif
      stock: { gt: 0 },     // pastikan ada stok
    },
    select: {
      id: true,
      name: true,
      price: true,     // harga dari DB — tidak dari client!
      stock: true,
    },
  });

  // Cek semua product ID ditemukan
  if (products.length !== productIds.length) {
    const foundIds = new Set(products.map(p => p.id));
    const notFound = productIds.filter(id => !foundIds.has(id));
    return Response.json(
      { error: 'Beberapa produk tidak tersedia', invalidProductIds: notFound },
      { status: 400 }
    );
  }

  const productMap = new Map(products.map(p => [p.id, p]));

  // Validasi stok cukup untuk setiap item
  for (const item of items) {
    const product = productMap.get(item.productId)!;
    if (product.stock < item.quantity) {
      return Response.json(
        {
          error: `Stok ${product.name} tidak mencukupi`,
          available: product.stock,
          requested: item.quantity,
        },
        { status: 400 }
      );
    }
  }

  // Kalkulasi total dari harga DB (bukan dari client!)
  let subtotal = items.reduce((total, item) => {
    const product = productMap.get(item.productId)!;
    return total + product.price * item.quantity;
  }, 0);

  // ─────────────────────────────────────────
  // LAYER 5: Aplikasi Kupon (opsional)
  // ─────────────────────────────────────────
  let discountAmount = 0;
  let couponId: string | undefined;

  if (couponCode) {
    const coupon = await db.coupon.findFirst({
      where: {
        code: couponCode,
        isActive: true,
        expiresAt: { gt: new Date() },
        usageCount: { lt: db.coupon.fields.maxUsage }, // belum habis kuota
      },
    });

    if (!coupon) {
      return Response.json({ error: 'Kode kupon tidak valid atau sudah kadaluarsa' }, { status: 400 });
    }

    // Kalkulasi diskon dari DB coupon, bukan dari client
    discountAmount =
      coupon.type === 'percentage'
        ? Math.floor(subtotal * (coupon.value / 100))
        : Math.min(coupon.value, subtotal); // diskon tidak boleh > total

    couponId = coupon.id;
  }

  const totalAmount = subtotal - discountAmount;
  const minimumPayment = 1000; // Rp 1.000 — minimum Stripe

  if (totalAmount < minimumPayment) {
    return Response.json(
      { error: `Minimum pembayaran adalah Rp ${minimumPayment.toLocaleString('id-ID')}` },
      { status: 400 }
    );
  }

  // ─────────────────────────────────────────
  // LAYER 6: Buat Stripe Payment Intent
  // ─────────────────────────────────────────
  let paymentIntent: Stripe.PaymentIntent;

  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,     // dalam satuan terkecil (sen/rupiah terkecil)
      currency: 'idr',
      payment_method_types: ['card'],
      metadata: {
        userId: session.user.id,        // untuk audit trail
        couponId: couponId ?? '',
        itemCount: items.length.toString(),
      },
      // Jangan simpan payment method secara default
      setup_future_usage: undefined,
    });
  } catch (stripeError) {
    // Jangan expose Stripe error detail ke client
    console.error('[Payment] Stripe error:', stripeError);
    return Response.json(
      { error: 'Gagal membuat sesi pembayaran. Coba beberapa saat lagi.' },
      { status: 500 }
    );
  }

  // ─────────────────────────────────────────
  // LAYER 7: Simpan Order Draft di DB
  // ─────────────────────────────────────────
  await db.order.create({
    data: {
      userId: session.user.id,
      paymentIntentId: paymentIntent.id,
      status: 'PENDING',
      subtotal,
      discountAmount,
      totalAmount,
      couponId,
      items: {
        create: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: productMap.get(item.productId)!.price,
        })),
      },
    },
  });

  // ─────────────────────────────────────────
  // Response ke client — HANYA data yang diperlukan
  // ─────────────────────────────────────────
  const response: PaymentIntentResponse = {
    clientSecret: paymentIntent.client_secret!, // untuk Stripe.js
    paymentIntentId: paymentIntent.id,          // untuk tracking
    amount: totalAmount,                        // untuk ditampilkan ke user
    currency: 'IDR',
  };

  return Response.json(response, { status: 201 });
}
```

---

### Step 5: Client Component

```tsx
// app/checkout/page.tsx
'use client';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { clientEnv } from '@/lib/env';

// Publishable key aman di client — dirancang untuk ini
const stripePromise = loadStripe(clientEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

interface CartItem {
  productId: string;
  quantity: number;
}

function CheckoutForm({
  clientSecret,
  amount,
}: {
  clientSecret: string;
  amount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${clientEnv.NEXT_PUBLIC_APP_URL}/checkout/success`,
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? 'Pembayaran gagal');
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      <div className="text-lg font-semibold">
        Total: Rp {amount.toLocaleString('id-ID')}
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !stripe}
        className="w-full py-3 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {isLoading ? 'Memproses...' : 'Bayar Sekarang'}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const [paymentData, setPaymentData] = useState<{
    clientSecret: string;
    amount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartItems: CartItem[] = [
    { productId: 'uuid-product-1', quantity: 2 },
    { productId: 'uuid-product-2', quantity: 1 },
  ];

  const initializePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // kirim cookie auth
        body: JSON.stringify({ items: cartItems }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 429) {
          setError(`${errorData.error} Coba lagi dalam ${errorData.retryAfterSeconds} detik.`);
          return;
        }

        setError(errorData.error ?? 'Terjadi kesalahan');
        return;
      }

      const data = await response.json();
      setPaymentData({ clientSecret: data.clientSecret, amount: data.amount });
    } catch {
      setError('Gagal terhubung ke server');
    } finally {
      setIsLoading(false);
    }
  };

  if (!paymentData) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>

        {/* Tampilkan items */}
        <div className="mb-6 space-y-2">
          {cartItems.map(item => (
            <div key={item.productId} className="flex justify-between">
              <span>Product {item.productId.slice(0, 8)}...</span>
              <span>x{item.quantity}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-50 text-red-700 rounded">{error}</div>
        )}

        <button
          onClick={initializePayment}
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded"
        >
          {isLoading ? 'Mempersiapkan...' : 'Lanjut ke Pembayaran'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Pembayaran</h1>
      <Elements
        stripe={stripePromise}
        options={{ clientSecret: paymentData.clientSecret }}
      >
        <CheckoutForm
          clientSecret={paymentData.clientSecret}
          amount={paymentData.amount}
        />
      </Elements>
    </div>
  );
}
```

---

### Rangkuman Layer Security yang Diimplementasikan

```
Request masuk ke POST /api/payments/create-intent
  │
  ├─ Layer 1: Autentikasi (getServerSession)
  │    Tidak login → 401 Unauthorized
  │
  ├─ Layer 2: Rate Limiting (10 req/jam per user)
  │    Terlalu banyak → 429 Too Many Requests
  │
  ├─ Layer 3: Validasi Input (Zod)
  │    Format salah → 422 Unprocessable Entity
  │
  ├─ Layer 4: Verifikasi Produk (dari DB)
  │    Produk tidak ada / stok kurang → 400 Bad Request
  │    Harga dari DB, bukan dari client → no price manipulation
  │
  ├─ Layer 5: Validasi Kupon (dari DB)
  │    Kupon tidak valid / kadaluarsa → 400 Bad Request
  │    Diskon dihitung dari DB → no discount manipulation
  │
  ├─ Layer 6: Stripe API (server-side key)
  │    Key tidak pernah ke client
  │    Error Stripe tidak di-expose ke client
  │
  └─ Layer 7: Response
       Hanya return clientSecret, paymentIntentId, amount
       Tidak return: DB IDs internal, metadata sensitif, dll
```

---

## Penutup

Semua yang ada di tutorial ini bisa diringkas jadi satu prinsip:

> **Server adalah satu-satunya yang bisa dipercaya. Client bisa berbohong.**

Validasi di client itu untuk UX — feedback cepat ke user. Validasi di server itu untuk security — gerbang yang tidak bisa di-bypass.

Mulai dari yang fundamental: pisahkan env var yang boleh dan tidak boleh di client, validasi semua input di server, dan jangan pernah percaya bahwa API key kamu "aman" hanya karena tidak kelihatan di UI.

Satu `NEXT_PUBLIC_` yang salah tempat = tagihan API membengkak, atau lebih buruk — data user kamu bocor.

Stay defensive! 🔐
