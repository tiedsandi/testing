# Flowspace — Fase 10: Security & Deployment

> **Fase ini menghasilkan:** Security hardening (CSP headers, input sanitization, CSRF protection), environment variable management yang aman, deployment ke Vercel dengan Neon/Supabase database, CI/CD dengan GitHub Actions, dan production checklist.

---

## Gambaran Besar

```
Security Layers
 ├── HTTP Security Headers (CSP, HSTS, dll)
 ├── Input Validation (sudah ada via Zod — konfirmasi)
 ├── Authentication Guards (sudah ada — konfirmasi)
 ├── Rate Limiting (sudah ada di Fase 8 — extend)
 ├── SQL Injection Prevention (Prisma handled)
 └── OWASP Top 10 Checklist

Deployment
 ├── Environment variables (local vs production)
 ├── Database (Neon PostgreSQL — serverless)
 ├── Vercel deployment
 └── GitHub Actions CI/CD
```

---

## Step 1: Security Headers

### Update `next.config.ts`

```typescript
// next.config.ts
import type { NextConfig } from "next";
import BundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// CSP directives
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://lh3.googleusercontent.com https://avatars.githubusercontent.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://*.sentry.io https://vitals.vercel-insights.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  // Prevent XSS attacks
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Prevent MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Control referrer information
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Prevent clickjacking
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // HSTS (HTTPS Strict Transport Security)
  // Wajib HTTPS setelah browser pertama kali visit
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Permission Policy (batasi akses ke browser features)
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: ContentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },

  async headers() {
    return [
      {
        // Apply ke semua routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Logging di development
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default withBundleAnalyzer(nextConfig);
```

---

## Step 2: Input Sanitization

Server-side sudah di-handle Zod. Tambahkan sanitasi untuk input yang akan ditampilkan kembali:

### `src/lib/sanitize.ts`

```typescript
// src/lib/sanitize.ts

/**
 * Hapus HTML tags dari string untuk mencegah XSS
 * Dipakai sebelum tampilkan user input sebagai HTML
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Escape HTML special characters
 * Dipakai kalau perlu tampilkan teks di dalam HTML attribute
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Trim dan sanitize user input umum
 */
export function sanitizeInput(str: string): string {
  return str.trim().replace(/\s+/g, " ");
}

/**
 * Validasi dan sanitize URL untuk mencegah javascript: URLs
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "#"; // Block javascript: dan protocol berbahaya lain
    }
    return url;
  } catch {
    return "#";
  }
}
```

> **Catatan:** Di React, JSX sudah auto-escape HTML saat render teks biasa. `dangerouslySetInnerHTML` adalah satu-satunya jalur XSS di React — hindari atau gunakan library seperti `DOMPurify` kalau memang butuh render HTML.

---

## Step 3: CSRF Protection

Next.js Server Actions sudah memiliki built-in CSRF protection (menggunakan Same-Origin check). Tapi untuk API routes, tambahkan:

### `src/lib/csrf.ts`

```typescript
// src/lib/csrf.ts
import { headers } from "next/headers";

/**
 * Validasi bahwa request berasal dari origin yang sama
 * (untuk API routes yang dipakai oleh client-side fetch)
 */
export async function validateOrigin(): Promise<boolean> {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const host = headersList.get("host");

  if (!origin) return true; // Server-to-server request, tidak butuh CSRF check

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

// Cara pakai di API route (opsional, karena Next.js Server Actions sudah protected):
// const isValid = await validateOrigin();
// if (!isValid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

## Step 4: Environment Variables Management

### `.env.local` (development — jangan commit ke git!)

```bash
# .env.local

# ── DATABASE ───────────────────────────────────────────────────────────
# Development: pakai local PostgreSQL atau Neon dev branch
DATABASE_URL="postgresql://user:password@localhost:5432/flowspace_dev"

# ── AUTH ───────────────────────────────────────────────────────────────
# Generate dengan: openssl rand -hex 32
AUTH_SECRET="your-very-secret-string-min-32-chars"

# Google OAuth
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# ── APP ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# ── SENTRY (production only) ──────────────────────────────────────────
# NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
# SENTRY_AUTH_TOKEN="..."
```

### `.env.example` (commit ini ke git!)

```bash
# .env.example
# Copy file ini ke .env.local dan isi dengan nilai yang sesuai

DATABASE_URL=""
AUTH_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""
```

### `src/env.ts` — Type-safe environment variables

```typescript
// src/env.ts
/**
 * Type-safe environment variable validation
 * Crash di startup (bukan saat runtime) kalau env var ada yang missing
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Add it to .env.local (development) atau Vercel environment variables (production).`
    );
  }
  return value;
}

// Server-only environment variables
export const serverEnv = {
  databaseUrl: requireEnv("DATABASE_URL"),
  authSecret: requireEnv("AUTH_SECRET"),
  googleClientId: requireEnv("AUTH_GOOGLE_ID"),
  googleClientSecret: requireEnv("AUTH_GOOGLE_SECRET"),
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? null,
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;

// Public environment variables (bisa di-expose ke client)
export const clientEnv = {
  appUrl:
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? null,
} as const;
```

---

## Step 5: Database Setup (Neon)

Neon adalah PostgreSQL serverless yang gratis untuk hobby tier — cocok untuk portfolio project.

### Setup:

1. Buat akun di [neon.tech](https://neon.tech)
2. Buat project "flowspace"
3. Copy connection string dari dashboard

### `.env.local` untuk Neon:

```bash
DATABASE_URL="postgresql://[user]:[password]@[host].neon.tech/[dbname]?sslmode=require"
```

> **Tip:** Neon mendukung branching database — buat branch `dev` untuk development dan `main` untuk production.

### Database Migrations di Production:

```bash
# Deploy migrations ke database production
npx prisma migrate deploy

# Generate Prisma client (dijalankan otomatis saat build di Vercel)
npx prisma generate
```

### Update `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio"
  }
}
```

---

## Step 6: GitHub Actions CI/CD

### `.github/workflows/ci.yml`

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ── Job 1: Lint & Type Check ────────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

  # ── Job 2: Tests ───────────────────────────────────────────────────
  test:
    name: Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: success()
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          file: ./coverage/lcov.info

  # ── Job 3: Build Check ──────────────────────────────────────────────
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test]

    env:
      # Dummy env untuk build check (tidak perlu database real)
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db"
      AUTH_SECRET: "fake-secret-min-32-chars-for-build-check"
      AUTH_GOOGLE_ID: "fake-google-id"
      AUTH_GOOGLE_SECRET: "fake-google-secret"
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Build
        run: npm run build
```

---

## Step 7: Vercel Deployment Setup

### 1. Install Vercel CLI

```bash
npm i -g vercel
vercel login
```

### 2. Link project

```bash
vercel link
```

### 3. Set environment variables di Vercel

Via dashboard atau CLI:

```bash
# Satu per satu
vercel env add DATABASE_URL production
vercel env add AUTH_SECRET production
# ... dst

# Atau lebih praktis: import dari .env.local
vercel env pull .env.local  # Pull dari Vercel ke local
```

### 4. `vercel.json` (opsional tapi berguna)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "prisma generate && prisma migrate deploy && next build",
  "framework": "nextjs",
  "regions": ["sin1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, no-cache"
        }
      ]
    }
  ]
}
```

> **Catatan:** `sin1` = Singapore region (dekat Indonesia). Pilih region sesuai target audience.

### 5. Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

---

## Step 8: Database Migration di Production

Setelah deploy pertama, jalankan migrations:

```bash
# Dari local dengan DATABASE_URL production
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Atau tambahkan ke build command di Vercel:

```
prisma generate && prisma migrate deploy && next build
```

---

## Step 9: Production Checklist

### Security

```
□ AUTH_SECRET sudah di-set (minimum 32 karakter, random)
□ HTTPS aktif (Vercel otomatis handle ini)
□ Security headers terpasang (cek di https://securityheaders.com)
□ Environment variables tidak hardcoded di code
□ .env.local ada di .gitignore
□ Prisma queries tidak bisa di-manipulasi (parameterized queries — Prisma default)
□ Rate limiting aktif di server actions yang sensitif
```

### Performance

```
□ npm run build berhasil tanpa error
□ Bundle size check (tidak ada package >500KB di client bundle)
□ Images menggunakan next/image component
□ Lazy loading untuk chart components
□ Tidak ada N+1 queries (cek dengan Prisma logging)
```

### Monitoring

```
□ Sentry DSN dikonfigurasi di production env vars
□ Error.tsx ada di setiap route level
□ Loading.tsx ada untuk initial loading
□ Vercel Analytics aktif (gratis untuk hobby tier)
```

### Database

```
□ Prisma migrations sudah di-deploy
□ Indexes ada untuk foreign keys dan kolom yang sering di-query
□ Connection pooling aktif (Neon sudah built-in)
□ Backup policy ada (Neon otomatis backup)
```

### Functionality

```
□ Google OAuth callback URL sudah di-update ke production domain
□ Semua .env variables sudah ada di Vercel
□ Test di staging sebelum push ke production
```

---

## Step 10: Google OAuth Production Setup

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Pilih project OAuth kamu
3. Edit OAuth client
4. Tambahkan **Authorized redirect URIs**:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   ```
5. Tambahkan **Authorized JavaScript origins**:
   ```
   https://your-app.vercel.app
   ```

---

## Step 11: Monitoring Post-Deployment

### Cek Vercel Dashboard

Setelah deploy, pantau:
- **Functions tab**: Execution time dan error rate
- **Analytics tab**: Core Web Vitals
- **Logs tab**: Server errors real-time

### Cek Sentry

- Buka `sentry.io` → project Flowspace
- Pantau error rate dan performance
- Setup alerting (email) kalau error rate naik

### Core Web Vitals Target

| Metric | Target | Apakah Tercapai? |
|--------|--------|------------------|
| LCP (Largest Contentful Paint) | < 2.5s | □ |
| FID (First Input Delay) | < 100ms | □ |
| CLS (Cumulative Layout Shift) | < 0.1 | □ |
| TTFB (Time to First Byte) | < 800ms | □ |

---

## Common Pitfalls Fase 10

### ❌ Pitfall 1: Build gagal di Vercel karena Prisma generate

**Masalah:** Vercel tidak auto-run `prisma generate` sebelum build.

**Solusi:** Tambahkan ke `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```
`postinstall` selalu dijalankan setelah `npm install`, termasuk di Vercel.

---

### ❌ Pitfall 2: AUTH_SECRET tidak match antara local dan production

**Masalah:** Sessions tidak valid di production karena AUTH_SECRET berbeda.

**Solusi:** Gunakan **satu** AUTH_SECRET yang sama. Generate sekali dengan:
```bash
openssl rand -hex 32
```
Simpan di `.env.local` dan Vercel environment variables dengan nilai **identik**.

---

### ❌ Pitfall 3: Database connection pool habis

**Masalah:** Error "Too many connections" di production.

**Solusi:** Neon sudah built-in connection pooling. Tapi pastikan Prisma Client tidak dibuat berulang kali — gunakan singleton pattern (sudah ada di `src/lib/db.ts`):
```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

---

### ❌ Pitfall 4: CORS error untuk API routes

**Masalah:** Browser block request ke API route dari domain berbeda.

**Solusi:** Semua fetch dari client Flowspace ke API Flowspace sudah same-origin (`.vercel.app`). CORS tidak perlu diatur kecuali kamu expose API ke aplikasi lain.

---

### ❌ Pitfall 5: Environment variables tidak terbaca di Edge Runtime

**Masalah:** Beberapa middleware dan edge functions tidak bisa akses semua env vars.

**Solusi:** Middleware yang butuh env vars harus menggunakan variabel yang tersedia di edge. Untuk `AUTH_SECRET`, sudah didukung Auth.js di edge.

---

## Checklist Fase 10

- [ ] Security headers terpasang (test di [securityheaders.com](https://securityheaders.com))
- [ ] `.env.example` ada di repo
- [ ] `.env.local` ada di `.gitignore`
- [ ] Vercel project sudah di-link dan semua env vars ter-set
- [ ] `postinstall: prisma generate` ada di package.json
- [ ] Database migrations sudah di-deploy ke production
- [ ] Google OAuth redirect URI sudah di-update ke production domain
- [ ] GitHub Actions CI pipeline berjalan (lint + test + build)
- [ ] Deployment production berhasil dan app bisa diakses
- [ ] Google OAuth login berhasil di production
- [ ] Sentry menerima events dari production (test dengan trigger error kecil)

---

## Ringkasan Perjalanan Flowspace

Selamat! Kamu sudah menyelesaikan semua 10 fase Flowspace, dari setup awal hingga production deployment.

### Yang sudah dibangun:

| Fase | Fitur |
|------|-------|
| 1 | Setup: Next.js 15, Prisma, Auth.js, shadcn/ui, Zod, TanStack Query, Redux Toolkit |
| 2 | Authentication: Google OAuth, registration, protected routes, session management |
| 3 | Workspace & Project: CRUD workspace, invite members, role management, project cards |
| 4 | Task Management: Kanban board, drag & drop, filter, search, komentar |
| 5 | Dashboard: Analytics, donut chart, bar chart, stats cards dengan animasi |
| 6 | Notifications: Optimistic updates, notifikasi in-app, Redux untuk state |
| 7 | Performance: Infinite scroll, dark mode, page transitions, lazy loading |
| 8 | Error Handling: Error boundaries, Sentry, custom errors, rate limiting |
| 9 | Testing: Vitest, RTL, MSW, unit tests, component tests |
| 10 | Security & Deployment: CSP headers, CI/CD, Vercel, production checklist |

### Stack yang digunakan:

```
Frontend       : Next.js 15 (App Router), TypeScript, Tailwind CSS
UI Components  : shadcn/ui
Auth           : Auth.js (NextAuth v5) + Google OAuth
Database       : PostgreSQL (Neon) + Prisma ORM
State (server) : TanStack Query v5
State (client) : Redux Toolkit + Zustand
Forms          : React Hook Form + Zod
Animations     : Framer Motion
Charts         : Recharts
DnD            : @dnd-kit
Testing        : Vitest + React Testing Library + MSW
Monitoring     : Sentry
Deployment     : Vercel
CI/CD          : GitHub Actions
```

Ini adalah portfolio project yang solid untuk level **mid-senior frontend developer**. Semua teknologi yang dipakai adalah industry-standard dan sering muncul di job requirements.
