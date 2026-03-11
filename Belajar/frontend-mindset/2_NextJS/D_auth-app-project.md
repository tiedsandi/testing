# Project D — Auth App: Login, Register, Google OAuth, Protected Route

> **Level:** Intermediate | **Estimasi waktu:** 3–4 jam  
> **Prerequisite:** Paham Next.js App Router (doc 06), React Hook Form + Zod (doc 08), dan konsep Auth.js (doc 09).

---

## Daftar Isi

1. [Overview Project](#1-overview-project)
2. [Struktur Folder](#2-struktur-folder)
3. [Setup Project](#3-setup-project)
4. [Environment Variables](#4-environment-variables)
5. [TypeScript: Module Augmentation](#5-typescript-module-augmentation)
6. [Database Layer (Mock)](#6-database-layer-mock)
7. [Zod Schemas](#7-zod-schemas)
8. [Auth.js v5 Config](#8-authjs-v5-config)
9. [API Route Handler](#9-api-route-handler)
10. [Middleware: Protected Routes](#10-middleware-protected-routes)
11. [Register Flow](#11-register-flow)
12. [Login Flow](#12-login-flow)
13. [Dashboard Page](#13-dashboard-page)
14. [Profile Page](#14-profile-page)
15. [Root Layout + Providers](#15-root-layout--providers)
16. [Navbar dengan Auth State](#16-navbar-dengan-auth-state)
17. [Common Mistakes + Fix](#17-common-mistakes--fix)
18. [Security Checklist Sebelum Deploy](#18-security-checklist-sebelum-deploy)

---

## 1. Overview Project

Kita akan bangun **Auth App** — aplikasi dengan sistem autentikasi lengkap yang bisa jadi template untuk project apapun.

### Fitur yang Dibangun

| Fitur | Keterangan |
|---|---|
| Register | Email + password, simpan ke "database" |
| Login Credentials | Email + password via Auth.js |
| Login Google OAuth | One-click login dengan akun Google |
| Protected Route | Dashboard & profile hanya bisa diakses kalau sudah login |
| Halaman Profile | Tampilkan data user yang sedang login |
| Logout | Hapus session, redirect ke homepage |
| Auto-redirect | Belum login → redirect ke `/login`, sudah login → tidak bisa akses `/login` lagi |

### Diagram Alur Auth

#### Register Flow

```
User isi form Register
        │
        ▼
  Validasi Zod (client)
        │
        ▼ (jika valid)
  Server Action: registerUser()
        │
        ├─ Hash password dengan bcryptjs
        ├─ Cek apakah email sudah terdaftar
        ├─ Simpan user baru ke DB
        │
        ▼
  signIn("credentials", { email, password })
        │
        ▼
  Auth.js: authorize() → verifikasi credentials
        │
        ▼
  Session dibuat → httpOnly cookie di browser
        │
        ▼
  redirect("/dashboard")
```

#### Login Flow (Credentials)

```
User isi form Login
        │
        ▼
  Validasi Zod (client)
        │
        ▼ (jika valid)
  signIn("credentials", { email, password, redirectTo: "/dashboard" })
        │
        ▼
  Auth.js: authorize()
        ├─ Cari user by email di DB
        ├─ bcrypt.compare(password, hashedPassword)
        ├─ Jika cocok → return User object
        └─ Jika tidak → throw InvalidCredentials
        │
        ▼
  jwt() callback → encode user data ke JWT token
        │
        ▼
  session() callback → expose ke client
        │
        ▼
  httpOnly cookie "authjs.session-token" di-set
        │
        ▼
  redirect("/dashboard")
```

#### Google OAuth Flow

```
User klik "Login dengan Google"
        │
        ▼
  signIn("google")
        │
        ▼
  Redirect ke Google OAuth consent screen
        │
        ▼
  User setujui → Google redirect ke /api/auth/callback/google
        │
        ▼
  Auth.js: jwt() callback
        ├─ Jika user baru → bisa auto-create di DB
        └─ Set id, role, dll dari profile Google
        │
        ▼
  session() callback → expose ke client
        │
        ▼
  httpOnly cookie di-set
        │
        ▼
  redirect ke callbackUrl (default: "/")
```

#### Session Flow (Setiap Request)

```
Browser kirim request ke /dashboard
        │
        ▼
  middleware.ts berjalan (Edge Runtime)
        │
        ├─ Baca session dari cookie
        ├─ Validasi JWT token
        │
        ├─ [Session valid] → lanjutkan ke halaman
        └─ [Session tidak ada/expired] → redirect ke /login
        │
        ▼
  Server Component: auth() dipanggil
        │
        ▼
  Render halaman dengan data session
```

---

## 2. Struktur Folder

```
auth-app/
├── app/
│   ├── (auth)/                    ← Route group: halaman auth (layout beda)
│   │   ├── layout.tsx             ← Layout minimal, centered
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── (protected)/               ← Route group: halaman butuh login
│   │   ├── layout.tsx             ← Double-check auth di sini
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── profile/
│   │       └── page.tsx
│   │
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts       ← Auth.js handler
│   │
│   ├── layout.tsx                 ← Root layout (font, providers)
│   ├── page.tsx                   ← Homepage
│   └── globals.css
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── OAuthButtons.tsx       ← Tombol Google, GitHub dll
│   ├── layout/
│   │   └── Navbar.tsx
│   └── ui/
│       ├── Button.tsx
│       └── FormField.tsx
│
├── lib/
│   ├── auth.ts                    ← NextAuth config (KONFIGURASI UTAMA)
│   ├── db.ts                      ← Mock database (ganti dengan Prisma di produksi)
│   └── schemas.ts                 ← Zod schemas
│
├── types/
│   └── next-auth.d.ts             ← TypeScript module augmentation
│
├── middleware.ts                  ← Route protection (Edge Runtime)
├── auth.ts                        ← Re-export dari lib/auth.ts (Next.js convention)
├── .env.local
├── .env.example
├── tsconfig.json
└── next.config.ts
```

---

## 3. Setup Project

### Buat Project Next.js

```bash
npx create-next-app@latest auth-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd auth-app
```

### Install Dependencies

```bash
# Auth.js v5
npm install next-auth@beta

# Password hashing
npm install bcryptjs
npm install -D @types/bcryptjs

# Form handling & validation
npm install react-hook-form zod @hookform/resolvers
```

### Verifikasi Versi

```bash
npm list next-auth
# Pastikan versi: next-auth@5.x.x (beta)
```

> **Catatan Database:** Di project ini kita pakai **mock database** (in-memory) agar bisa langsung jalan tanpa setup. Di project nyata, ganti dengan Prisma + PostgreSQL/SQLite. Struktur kodenya sama persis — hanya `lib/db.ts` yang diganti.

---

## 4. Environment Variables

```bash
# .env.local

# WAJIB: Secret untuk enkripsi JWT — generate dengan:
# openssl rand -base64 32
AUTH_SECRET="your-super-secret-key-minimum-32-chars-here"

# Google OAuth — dapatkan dari console.cloud.google.com
AUTH_GOOGLE_ID="your-google-client-id.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# URL app (wajib di production)
NEXTAUTH_URL="http://localhost:3000"
AUTH_URL="http://localhost:3000"
```

```bash
# .env.example (commit ini ke git, .env.local jangan!)
AUTH_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
AUTH_URL="http://localhost:3000"
```

### Setup Google OAuth di Google Console

1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Buat project baru atau pilih yang sudah ada
3. Menu: **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth Client ID**
4. Application type: **Web application**
5. Authorized JavaScript origins: `http://localhost:3000`
6. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy **Client ID** dan **Client Secret** ke `.env.local`

---

## 5. TypeScript: Module Augmentation

Auth.js tidak include `id` dan `role` di session secara default. Kita perlu augment type-nya.

```ts
// types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

// Tipe role yang tersedia di app kita
export type UserRole = "admin" | "user";

declare module "next-auth" {
  // Augment interface Session
  interface Session {
    user: {
      id:   string;
      role: UserRole;
    } & DefaultSession["user"];
    // DefaultSession["user"] = { name?, email?, image? }
  }

  // Augment interface User (yang di-return dari authorize() / DB)
  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  // Augment interface JWT
  interface JWT {
    id:   string;
    role: UserRole;
  }
}
```

---

## 6. Database Layer (Mock)

Supaya project ini bisa langsung jalan tanpa setup database, kita pakai **in-memory store**. Di production, ganti ini dengan Prisma.

```ts
// lib/db.ts
import bcrypt from "bcryptjs";
import type { UserRole } from "@/types/next-auth";

// Shape user yang disimpan di "database"
export interface DbUser {
  id:             string;
  name:           string;
  email:          string;
  hashedPassword: string | null; // null untuk OAuth users
  role:           UserRole;
  image:          string | null;
  createdAt:      Date;
}

// In-memory store — data hilang kalau server restart
// GANTI dengan Prisma di production
const users = new Map<string, DbUser>();

// Seed satu user admin untuk development
const seedAdminPassword = await bcrypt.hash("admin123", 12);
users.set("seed-admin-id", {
  id:             "seed-admin-id",
  name:           "Admin Dev",
  email:          "admin@dev.com",
  hashedPassword: seedAdminPassword,
  role:           "admin",
  image:          null,
  createdAt:      new Date(),
});

// ─── CRUD Functions ───────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  for (const user of users.values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) return user;
  }
  return null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  return users.get(id) ?? null;
}

export async function createUser(data: {
  name:     string;
  email:    string;
  password: string;       // plain text — akan di-hash di sini
  role?:    UserRole;
}): Promise<DbUser> {
  // Cek duplikat email
  const existing = await findUserByEmail(data.email);
  if (existing) throw new Error("EMAIL_TAKEN");

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const newUser: DbUser = {
    id:             crypto.randomUUID(),
    name:           data.name,
    email:          data.email,
    hashedPassword,
    role:           data.role ?? "user",
    image:          null,
    createdAt:      new Date(),
  };

  users.set(newUser.id, newUser);
  return newUser;
}

export async function verifyPassword(
  password:       string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ─── Di Production: Ganti dengan Prisma ──────────────────────────
//
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();
//
// export async function findUserByEmail(email: string) {
//   return prisma.user.findUnique({ where: { email } });
// }
//
// export async function createUser(data: {...}) {
//   const hashedPassword = await bcrypt.hash(data.password, 12);
//   return prisma.user.create({
//     data: { ...data, password: hashedPassword }
//   });
// }
```

---

## 7. Zod Schemas

```ts
// lib/schemas.ts
import { z } from "zod";

// ─── Register ────────────────────────────────────────────────────
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nama minimal 2 karakter")
      .max(50, "Nama maksimal 50 karakter"),
    email: z.string().email("Format email tidak valid"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf kapital")
      .regex(/[0-9]/, "Password harus mengandung minimal 1 angka"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message:  "Password tidak cocok",
    path:     ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Login ────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email:    z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password tidak boleh kosong"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
```

---

## 8. Auth.js v5 Config

Ini adalah file paling penting. Semua logic autentikasi ada di sini.

```ts
// lib/auth.ts
import NextAuth                     from "next-auth";
import Google                       from "next-auth/providers/google";
import Credentials                  from "next-auth/providers/credentials";
import { findUserByEmail, verifyPassword } from "./db";
import type { UserRole }            from "@/types/next-auth";

export const {
  handlers, // → export ke app/api/auth/[...nextauth]/route.ts
  auth,     // → gunakan di Server Components, Server Actions, middleware
  signIn,   // → gunakan di Server Actions / tombol login
  signOut,  // → gunakan di tombol logout
} = NextAuth({
  // ─── Providers ────────────────────────────────────────────────
  providers: [
    // Provider 1: Google OAuth
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),

    // Provider 2: Email + Password (Credentials)
    Credentials({
      // Kolom-kolom yang ada di form login
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      // Dipanggil saat signIn("credentials", {...}) dipanggil
      async authorize(credentials) {
        // Validasi input dasar
        if (!credentials?.email || !credentials?.password) return null;

        const email    = credentials.email as string;
        const password = credentials.password as string;

        // Cari user di database
        const user = await findUserByEmail(email);
        if (!user || !user.hashedPassword) return null;
        // Kalau user tidak punya password (misal: register via Google),
        // dia tidak bisa login via credentials

        // Verifikasi password
        const passwordMatch = await verifyPassword(password, user.hashedPassword);
        if (!passwordMatch) return null;

        // Return user object — ini yang akan masuk ke JWT callback
        return {
          id:    user.id,
          name:  user.name,
          email: user.email,
          image: user.image,
          role:  user.role,
        };
      },
    }),
  ],

  // ─── Session Strategy ──────────────────────────────────────────
  session: {
    strategy:    "jwt",   // Stateless — tidak perlu DB session
    maxAge:      30 * 24 * 60 * 60, // 30 hari
    updateAge:   24 * 60 * 60,      // Update session tiap 24 jam
  },

  // ─── Custom Pages ──────────────────────────────────────────────
  pages: {
    signIn: "/login",  // Kalau tidak terautentikasi, arahkan ke /login
    error:  "/login",  // Error OAuth ditangani di halaman login
  },

  // ─── Callbacks ────────────────────────────────────────────────
  callbacks: {
    // jwt() dipanggil saat:
    //   1. User login (token baru dibuat)
    //   2. Session diakses (token di-decode)
    //   3. Access token direfresh
    async jwt({ token, user, account }) {
      // `user` hanya ada saat pertama kali login (bukan refresh)
      if (user) {
        token.id   = user.id!;
        token.role = (user.role as UserRole) ?? "user";
      }

      // Untuk Google OAuth — user.id datang dari account.providerAccountId
      if (account?.provider === "google" && account.providerAccountId) {
        // Coba cari user yang sudah ada (kalau dia pernah register via credentials
        // dengan email yang sama)
        const existingUser = await findUserByEmail(token.email!);
        if (existingUser) {
          token.id   = existingUser.id;
          token.role = existingUser.role;
        } else {
          // User baru via Google — bisa auto-create di DB di sini
          // Untuk contoh ini, kita assign ID dari Google
          token.id   = account.providerAccountId;
          token.role = "user";
        }
      }

      return token;
    },

    // session() dipanggil saat useSession() atau auth() dipanggil
    // Di sinilah kita expose data dari JWT token ke client
    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id;
        session.user.role = token.role;
      }
      return session;
    },

    // authorized() dipanggil oleh middleware
    // Return true = akses diizinkan, false = redirect ke signIn page
    async authorized({ auth, request }) {
      const isLoggedIn     = !!auth?.user;
      const isProtectedPath = request.nextUrl.pathname.startsWith("/(protected)");

      // Logic utama ada di middleware.ts — ini fallback saja
      return isLoggedIn || !isProtectedPath;
    },
  },

  // ─── Security ──────────────────────────────────────────────────
  secret: process.env.AUTH_SECRET,

  // Aktifkan debug di development saja
  debug: process.env.NODE_ENV === "development",
});
```

---

## 9. API Route Handler

```ts
// app/api/auth/[...nextauth]/route.ts
// File ini adalah entry point untuk semua request auth:
//   GET  /api/auth/session       → ambil data session
//   POST /api/auth/signin        → login
//   POST /api/auth/signout       → logout
//   GET  /api/auth/callback/google → callback dari Google OAuth
//   ... dll

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

---

## 10. Middleware: Protected Routes

```ts
// middleware.ts (di root project, sejajar dengan app/)
// Berjalan di Edge Runtime — cepat, tapi tidak bisa pakai Node.js APIs

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth(function middleware(req) {
  const { nextUrl, auth: session } = req as typeof req & { auth: typeof session };
  const isLoggedIn = !!session;

  // Path definitions
  const isOnProtectedPath = ["/dashboard", "/profile"].some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );
  const isOnAuthPath = ["/login", "/register"].some((path) =>
    req.nextUrl.pathname.startsWith(path)
  );

  // 1. Akses protected route tanpa login → redirect ke /login
  if (isOnProtectedPath && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    // Simpan URL yang mau diakses untuk redirect balik setelah login
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Sudah login tapi akses /login atau /register → redirect ke /dashboard
  if (isOnAuthPath && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  // 3. Semua kondisi lain: lanjutkan
  return NextResponse.next();
});

// Konfigurasi: middleware hanya berjalan pada path yang cocok
// (Jangan jalankan middleware untuk static files, dll.)
export const config = {
  matcher: [
    /*
     * Match semua path KECUALI:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - file dengan extension (gambar, font, dll.)
     * - api/auth (Auth.js handler — tidak perlu di-middleware)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

---

## 11. Register Flow

### Server Action

```ts
// lib/actions/auth.actions.ts
"use server";

import { signIn }         from "@/lib/auth";
import { createUser }     from "@/lib/db";
import { registerSchema } from "@/lib/schemas";
import { AuthError }      from "next-auth";
import { redirect }       from "next/navigation";

export type RegisterResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Partial<Record<string, string>> };

export async function registerAction(
  formData: FormData
): Promise<RegisterResult> {
  // 1. Ambil dan validasi data dari form
  const rawData = {
    name:            formData.get("name"),
    email:           formData.get("email"),
    password:        formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const validated = registerSchema.safeParse(rawData);
  if (!validated.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, errors] of Object.entries(
      validated.error.flatten().fieldErrors
    )) {
      fieldErrors[field] = errors?.[0] ?? "";
    }
    return { success: false, error: "Validasi gagal", fieldErrors };
  }

  const { name, email, password } = validated.data;

  // 2. Daftarkan user baru ke database
  try {
    await createUser({ name, email, password });
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_TAKEN") {
      return {
        success:     false,
        error:       "Email sudah terdaftar",
        fieldErrors: { email: "Email ini sudah digunakan" },
      };
    }
    return { success: false, error: "Terjadi kesalahan. Coba lagi." };
  }

  // 3. Langsung login setelah register berhasil
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false, // Kita akan redirect manual
    });
  } catch (err) {
    // Register berhasil tapi auto-login gagal — arahkan ke login
    if (err instanceof AuthError) {
      redirect("/login?registered=true");
    }
    throw err;
  }

  // 4. Redirect ke dashboard
  redirect("/dashboard");
}
```

### Register Form Component

```tsx
// components/auth/RegisterForm.tsx
"use client";

import { useForm }           from "react-hook-form";
import { zodResolver }       from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormValues } from "@/lib/schemas";
import { registerAction }    from "@/lib/actions/auth.actions";
import { useState }          from "react";
import { OAuthButtons }      from "./OAuthButtons";
import { FormField }         from "@/components/ui/FormField";
import { Button }            from "@/components/ui/Button";
import Link                  from "next/link";

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading,   setIsLoading  ] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode:     "onBlur",
  });

  async function onSubmit(values: RegisterFormValues) {
    setIsLoading(true);
    setServerError(null);

    // Buat FormData dari values (untuk Server Actions)
    const formData = new FormData();
    Object.entries(values).forEach(([key, val]) => formData.set(key, val));

    const result = await registerAction(formData);

    if (!result.success) {
      setIsLoading(false);
      // Pasang error field-level kalau ada
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof RegisterFormValues, {
            type:    "server",
            message: message ?? "",
          });
        });
      }
      setServerError(result.error);
    }
    // Kalau success → redirect terjadi di server, tidak perlu handling di sini
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-bold text-center mb-2">Buat Akun</h1>
      <p className="text-gray-500 text-center mb-8">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          Login di sini
        </Link>
      </p>

      {/* Google OAuth */}
      <OAuthButtons />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">atau dengan email</span>
        </div>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          label="Nama Lengkap"
          error={errors.name?.message}
          {...register("name")}
          placeholder="Budi Santoso"
        />

        <FormField
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register("email")}
          placeholder="budi@email.com"
        />

        <FormField
          label="Password"
          type="password"
          error={errors.password?.message}
          {...register("password")}
          placeholder="Min. 8 karakter, huruf kapital & angka"
        />

        <FormField
          label="Konfirmasi Password"
          type="password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
          placeholder="Ulangi password"
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Mendaftar..." : "Daftar Sekarang"}
        </Button>
      </form>
    </div>
  );
}
```

### Register Page

```tsx
// app/(auth)/register/page.tsx
import { RegisterForm } from "@/components/auth/RegisterForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar - Auth App",
};

export default function RegisterPage() {
  return <RegisterForm />;
  // Layout di (auth)/layout.tsx yang center-kan komponen ini
}
```

---

## 12. Login Flow

### Server Action

```ts
// lib/actions/auth.actions.ts (tambahkan setelah registerAction)
"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

// Map kode error NextAuth → pesan yang user-friendly
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin:   "Email atau password salah",
  OAuthSignin:         "Terjadi masalah saat login dengan OAuth. Coba lagi.",
  OAuthCallback:       "Terjadi masalah saat callback OAuth. Coba lagi.",
  OAuthAccountNotLinked:
    "Email ini sudah terdaftar dengan metode login berbeda.",
  EmailSignin:         "Link email tidak bisa dikirim. Coba lagi.",
  Default:             "Terjadi kesalahan saat login. Coba lagi.",
};

export type LoginResult =
  | { success: true }
  | { success: false; error: string };

export async function loginAction(
  _prevState: LoginResult | null,
  formData:   FormData
): Promise<LoginResult> {
  const email       = formData.get("email")       as string;
  const password    = formData.get("password")    as string;
  const callbackUrl = formData.get("callbackUrl") as string | null;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false, // Kita handle redirect manual
    });
  } catch (err) {
    if (err instanceof AuthError) {
      const errorKey = err.type ?? "Default";
      return {
        success: false,
        error:   AUTH_ERROR_MESSAGES[errorKey] ?? AUTH_ERROR_MESSAGES.Default,
      };
    }
    // Error yang bukan AuthError (misal: DB error)
    return { success: false, error: AUTH_ERROR_MESSAGES.Default };
  }

  // Redirect setelah login berhasil
  redirect(callbackUrl ?? "/dashboard");
}
```

### Login Form Component

```tsx
// components/auth/LoginForm.tsx
"use client";

import { useForm }         from "react-hook-form";
import { zodResolver }     from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/lib/schemas";
import { loginAction }     from "@/lib/actions/auth.actions";
import { useState }        from "react";
import { useSearchParams } from "next/navigation";
import { OAuthButtons }    from "./OAuthButtons";
import { FormField }       from "@/components/ui/FormField";
import { Button }          from "@/components/ui/Button";
import Link                from "next/link";

// Map error dari URL params (dari OAuth redirect) ke pesan user-friendly
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Email ini sudah terdaftar dengan metode berbeda (mungkin dengan password). Silakan login dengan email & password.",
  OAuthSignin:
    "Terjadi masalah saat login dengan Google. Coba lagi.",
  Default:
    "Terjadi kesalahan. Coba lagi.",
};

export function LoginForm() {
  const searchParams    = useSearchParams();
  const callbackUrl     = searchParams.get("callbackUrl") ?? "/dashboard";
  const registeredParam = searchParams.get("registered");
  const errorParam      = searchParams.get("error");

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading,   setIsLoading  ] = useState(false);

  // Error dari OAuth redirect (ada di URL)
  const oauthError = errorParam
    ? (OAUTH_ERROR_MESSAGES[errorParam] ?? OAUTH_ERROR_MESSAGES.Default)
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setServerError(null);

    const formData = new FormData();
    formData.set("email",       values.email);
    formData.set("password",    values.password);
    formData.set("callbackUrl", callbackUrl);

    const result = await loginAction(null, formData);

    if (!result.success) {
      setIsLoading(false);
      setServerError(result.error);
    }
    // Kalau success → redirect (di loginAction), tidak perlu handling
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-2xl font-bold text-center mb-2">Selamat Datang</h1>
      <p className="text-gray-500 text-center mb-8">
        Belum punya akun?{" "}
        <Link href="/register" className="text-blue-600 hover:underline">
          Daftar gratis
        </Link>
      </p>

      {/* Pesan sukses setelah register */}
      {registeredParam === "true" && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Registrasi berhasil! Silakan login.
        </div>
      )}

      {/* Error OAuth dari URL */}
      {oauthError && (
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
          {oauthError}
        </div>
      )}

      {/* Google OAuth */}
      <OAuthButtons />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">atau dengan email</span>
        </div>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register("email")}
          placeholder="budi@email.com"
          autoComplete="email"
        />

        <div>
          <FormField
            label="Password"
            type="password"
            error={errors.password?.message}
            {...register("password")}
            placeholder="Password kamu"
            autoComplete="current-password"
          />
          <div className="mt-1 text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Lupa password?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Memproses..." : "Login"}
        </Button>
      </form>
    </div>
  );
}
```

### Login Page

```tsx
// app/(auth)/login/page.tsx
import { LoginForm }  from "@/components/auth/LoginForm";
import { Suspense }   from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - Auth App",
};

export default function LoginPage() {
  // Suspense wajib karena LoginForm pakai useSearchParams()
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
```

### OAuth Buttons Component

```tsx
// components/auth/OAuthButtons.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function OAuthButtons() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  async function handleOAuthSignIn(provider: "google") {
    setIsLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch {
      setIsLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => handleOAuthSignIn("google")}
        disabled={isLoading === "google"}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {/* Google Icon (SVG) */}
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {isLoading === "google" ? "Menghubungkan..." : "Lanjutkan dengan Google"}
      </button>
    </div>
  );
}
```

---

## 13. Dashboard Page

```tsx
// app/(protected)/dashboard/page.tsx
import { auth }      from "@/lib/auth";
import { redirect }  from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Auth App",
};

export default async function DashboardPage() {
  // Double-check: Walaupun middleware sudah melindungi,
  // selalu verifikasi session di Server Component
  const session = await auth();
  if (!session) redirect("/login");

  const { user } = session;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-600">
          Selamat datang kembali,{" "}
          <span className="font-medium text-gray-900">{user.name}</span>!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Status Akun</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">Aktif</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Role</p>
          <p className="mt-1 text-2xl font-semibold capitalize text-blue-600">
            {user.role}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Login Via</p>
          <p className="mt-1 text-2xl font-semibold text-purple-600">
            {user.image?.includes("googleusercontent") ? "Google" : "Email"}
          </p>
        </div>
      </div>

      {/* Session Info — berguna untuk debugging */}
      <div className="rounded-xl border bg-gray-50 p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-700">
          Data Session (untuk debugging)
        </h2>
        <pre className="overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-green-400">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>
    </div>
  );
}
```

### Protected Layout (Double-Check Auth)

```tsx
// app/(protected)/layout.tsx
import { auth }     from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pertahanan kedua setelah middleware
  // Middleware berjalan di Edge runtime dan bisa ada edge cases
  const session = await auth();
  if (!session) redirect("/login");

  return <>{children}</>;
}
```

---

## 14. Profile Page

```tsx
// app/(protected)/profile/page.tsx
import { auth }      from "@/lib/auth";
import { redirect }  from "next/navigation";
import Image         from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil - Auth App",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { user } = session;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Profil Saya</h1>

      <div className="rounded-xl border bg-white p-8 shadow-sm">
        {/* Avatar */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Avatar"}
                width={80}
                height={80}
                className="rounded-full object-cover"
              />
            ) : (
              // Fallback: initials avatar
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
                {user.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user.name ?? "Tanpa Nama"}
            </h2>
            <p className="text-gray-500">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-blue-100 px-3 py-0.5 text-xs font-medium capitalize text-blue-700">
              {user.role}
            </span>
          </div>
        </div>

        {/* Info Fields */}
        <div className="space-y-4">
          {[
            { label: "ID Pengguna", value: user.id, mono: true },
            { label: "Nama",        value: user.name  ?? "-" },
            { label: "Email",       value: user.email ?? "-" },
            { label: "Role",        value: user.role,  capitalize: true },
          ].map(({ label, value, mono, capitalize }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
            >
              <span className="text-sm font-medium text-gray-500">{label}</span>
              <span
                className={[
                  "text-sm text-gray-900",
                  mono       ? "font-mono text-xs" : "",
                  capitalize ? "capitalize"         : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Action: Edit Profile (placeholder) */}
        <div className="mt-8 flex gap-3">
          <button className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
            Edit Profil
          </button>
          <button className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50">
            Ganti Password
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 15. Root Layout + Providers

Auth.js v5 memerlukan `SessionProvider` untuk `useSession()` di Client Components.

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Inter }          from "next/font/google";
import "./globals.css";
import { Navbar }         from "@/components/layout/Navbar";
import { SessionProvider } from "next-auth/react";
import { auth }           from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:       "Auth App",
  description: "Contoh implementasi Auth.js v5 dengan Next.js App Router",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ambil session di root layout untuk dikirim ke SessionProvider
  // Ini mencegah flash of unauthenticated content
  const session = await auth();

  return (
    <html lang="id">
      <body className={inter.className}>
        {/* Kirim initial session ke provider agar tidak ada loading flash */}
        <SessionProvider session={session}>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
```

### Auth Layout (Halaman Login/Register)

```tsx
// app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
```

### Homepage

```tsx
// app/page.tsx
import { auth }    from "@/lib/auth";
import Link        from "next/link";

export default async function HomePage() {
  const session = await auth();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
        Auth App
      </h1>
      <p className="text-xl text-gray-500 mb-10 max-w-lg">
        Demonstrasi Auth.js v5 dengan Next.js App Router — Login, Register,
        Google OAuth, dan Protected Routes.
      </p>

      <div className="flex gap-4">
        {session ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Ke Dashboard
            </Link>
            <Link
              href="/profile"
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Lihat Profil
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Daftar Gratis
            </Link>
          </>
        )}
      </div>

      {session && (
        <p className="mt-6 text-sm text-gray-500">
          Login sebagai{" "}
          <span className="font-medium">{session.user.email}</span>
        </p>
      )}
    </div>
  );
}
```

---

## 16. Navbar dengan Auth State

```tsx
// components/layout/Navbar.tsx
import { auth }    from "@/lib/auth";
import { signOut } from "@/lib/auth";
import Image       from "next/image";
import Link        from "next/link";

export async function Navbar() {
  const session = await auth();

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-blue-600">
          AuthApp
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/profile"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
              >
                Profil
              </Link>

              {/* User Avatar + Logout */}
              <div className="flex items-center gap-3">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name ?? "user"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {session.user.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}

                {/* Logout menggunakan form + Server Action */}
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="text-sm font-medium text-red-500 hover:text-red-700 transition"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
```

---

## UI Components

### FormField Component

```tsx
// components/ui/FormField.tsx
import { forwardRef } from "react";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label:   string;
  error?:  string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id, ...props }, ref) => {
    const fieldId    = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const errorId    = `${fieldId}-error`;
    const hasError   = !!error;

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className={[
            "w-full rounded-lg border px-3 py-2 text-sm outline-none transition",
            "focus:ring-2 focus:ring-offset-1",
            hasError
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-300 focus:ring-blue-300",
          ].join(" ")}
          {...props}
        />
        {hasError && (
          <p id={errorId} role="alert" className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
```

### Button Component

```tsx
// components/ui/Button.tsx
import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, ...props }, ref) => {
    const variants = {
      primary:   "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400",
      secondary: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50",
      danger:    "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400",
    };

    return (
      <button
        ref={ref}
        className={[
          "rounded-lg px-4 py-2 text-sm font-medium transition",
          "disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1",
          variants[variant],
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
```

---

## 17. Common Mistakes + Fix

### Mistake 1: Tidak Ada `AUTH_SECRET` di Production

```bash
# ❌ Tidak ada AUTH_SECRET → error di production, session tidak bisa dibuat

# ✅ Generate secret yang kuat:
openssl rand -base64 32
# Output: "Qw3rTy8..." → taruh di .env.local sebagai AUTH_SECRET

# Update .env di deployment platform (Vercel, dll.)
# Tanpa ini, Auth.js TIDAK BISA enkripsi JWT — app crash
```

---

### Mistake 2: Export Nama yang Salah dari `auth.ts`

```ts
// ❌ Salah — mengekspos config internal
export default NextAuth(authConfig);
// Lalu di route.ts:
import auth from "@/lib/auth";
const { GET, POST } = auth.handlers; // undefined!

// ✅ Benar — destructure exports langsung
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
// Lalu di route.ts:
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

---

### Mistake 3: Lupa `"use server"` di Server Actions

```ts
// ❌ Tidak ada "use server" → berjalan di client, BAHAYA!
// lib/actions/auth.actions.ts
export async function registerAction(formData: FormData) {
  const password = formData.get("password"); // ← bisa dimanipulasi di client!
  await createUser({ password }); // ← NEVER di client
}

// ✅ Wajib ada "use server" di baris pertama
"use server"; // ← WAJIB

export async function registerAction(formData: FormData) {
  // Ini berjalan di server — aman
}
```

---

### Mistake 4: Simpan Password di JWT

```ts
// ❌ JANGAN PERNAH simpan password (bahkan yang sudah di-hash) di token
async jwt({ token, user }) {
  if (user) {
    token.hashedPassword = user.hashedPassword; // ← HARAM!
    // JWT bisa di-decode oleh siapa saja (base64)
    // Meskipun terenkripsi, ini adalah risiko keamanan
  }
  return token;
}

// ✅ Hanya simpan ID dan role — data minimal
async jwt({ token, user }) {
  if (user) {
    token.id   = user.id;
    token.role = user.role;
    // Nama, email, dll. ambil dari DB kalau perlu
  }
  return token;
}
```

---

### Mistake 5: Hanya Proteksi di Middleware (Tanpa Double-Check)

```tsx
// ❌ Hanya andalkan middleware
// middleware.ts melindungi route
// tapi di Server Component tidak ada pengecekan lagi

// app/(protected)/dashboard/page.tsx
export default async function DashboardPage() {
  // Tidak ada auth check!
  // Kalau middleware bypass → halaman ini terbuka
  return <div>Konten rahasia</div>;
}

// ✅ Defense in depth: middleware + Server Component + API route
export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login"); // Double-check!

  return <div>Konten rahasia untuk {session.user.name}</div>;
}
```

---

### Mistake 6: Akses Session di Client tanpa `SessionProvider`

```tsx
// ❌ useSession() dipanggil tanpa SessionProvider di layout
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>  {/* SessionProvider tidak ada! */}
    </html>
  );
}

// components/SomeClientComponent.tsx
"use client";
const { data: session } = useSession();
// Error: "useSession must be wrapped in a SessionProvider"

// ✅ Tambahkan SessionProvider di root layout
export default async function RootLayout({ children }) {
  const session = await auth(); // Pre-fetch di server
  return (
    <html>
      <body>
        <SessionProvider session={session}>  {/* ← Wajib! */}
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

---

### Mistake 7: Lupa `Suspense` untuk Komponen yang Pakai `useSearchParams()`

```tsx
// ❌ Error: "useSearchParams() should be wrapped in a Suspense boundary"
// app/(auth)/login/page.tsx
export default function LoginPage() {
  return <LoginForm />; // LoginForm pakai useSearchParams() → Error!
}

// ✅ Bungkus dengan Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
```

---

### Mistake 8: `callbackUrl` Tidak Divalidasi → Open Redirect Vulnerability

```ts
// ❌ Langsung pakai callbackUrl dari user tanpa validasi!
const callbackUrl = searchParams.get("callbackUrl");
redirect(callbackUrl!);
// Hacker bisa buat link: /login?callbackUrl=https://evil.com
// User login → redirect ke situs berbahaya

// ✅ Validasi bahwa callbackUrl adalah path internal
function getSafeCallbackUrl(url: string | null): string {
  if (!url) return "/dashboard";

  // Hanya izinkan relative URL (dimulai dengan /)
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }

  // URL absolut: pastikan sama dengan origin app
  try {
    const parsed   = new URL(url);
    const appUrl   = new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000");
    if (parsed.origin === appUrl.origin) return parsed.pathname;
  } catch {
    // Invalid URL → pakai default
  }

  return "/dashboard";
}
```

---

### Mistake 9: Lupa Tambahkan `path` di Zod `.refine()`

```ts
// ❌ Error "Password tidak cocok" muncul di email field!
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: "Password tidak cocok" }
  // ← Tidak ada path! Error muncul di root object → biasanya tampil di field pertama
);

// ✅ Tentukan path supaya error muncul di field yang benar
.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Password tidak cocok",
    path: ["confirmPassword"], // ← Error muncul di confirmPassword field
  }
)
```

---

## 18. Security Checklist Sebelum Deploy

### Environment & Secrets

```
☐ AUTH_SECRET sudah di-set dengan nilai random yang kuat (≥ 32 chars)?
  → openssl rand -base64 32

☐ AUTH_SECRET TIDAK hardcoded di kode — hanya dari environment variable?

☐ .env.local ada di .gitignore?
  → git tidak boleh commit file env yang berisi secrets

☐ Secrets di deployment platform (Vercel/Netlify) sudah di-set?
  → Jangan sampai fallback ke nilai default yang lemah

☐ NEXTAUTH_URL sudah di-set ke URL production yang benar?
  → Penting untuk OAuth callback URL
```

### Session & Cookie

```
☐ Session strategy JWT — tidak perlu penyimpanan DB session tambahan?

☐ Auth.js otomatis set httpOnly + SameSite=Lax + Secure di production?
  → Tidak perlu konfigurasi manual

☐ Session maxAge sudah sesuai kebutuhan?
  → Login sensitif (banking): 15 menit
  → App biasa: 7-30 hari

☐ Tidak ada data sensitif di JWT payload?
  → Hanya: id, role, name, email
  → Bukan: password (hash sekalipun), credit card, dll.
```

### Input Validation

```
☐ Semua form input divalidasi dengan Zod di server (Server Action)?
  → Validasi client-side (RHF) tidak cukup — bisa dibypass

☐ Password di-hash dengan bcrypt (salt rounds ≥ 10)?
  → JANGAN: MD5, SHA1, SHA256 mentah untuk password
  → Gunakan: bcrypt/argon2/scrypt

☐ callbackUrl dari user di-validasi?
  → Cegah open redirect attack

☐ Rate limiting pada endpoint login?
  → Mencegah brute force
  → Library: upstash/ratelimit atau custom middleware
```

### Routes & Access Control

```
☐ Middleware melindungi semua protected routes?

☐ Server Components selalu double-check auth() walaupun di protected route?
  → Defense in depth

☐ API routes yang sensitif juga mengecek session?
  → app/api/user/route.ts harus cek auth(), bukan hanya middleware

☐ Role check ada di server (bukan hanya di client)?
  → Admin-only features: cek session.user.role di Server Component/API
  → Bukan hanya hide tombol di UI
```

### OAuth

```
☐ Google OAuth callback URL sudah benar di Google Console?
  → Development: http://localhost:3000/api/auth/callback/google
  → Production:  https://yourdomain.com/api/auth/callback/google

☐ Tidak mengekspos provider secrets di client bundle?
  → AUTH_GOOGLE_ID/SECRET hanya di .env.local, tidak di NEXT_PUBLIC_*

☐ Handle OAuthAccountNotLinked error?
  → User yang punya akun credentials + coba OAuth dengan email sama
  → Tampilkan error yang informatif
```

### Production

```
☐ NODE_ENV=production saat deploy?
  → Auth.js otomatis tambahkan Secure flag ke cookie di production

☐ HTTPS di production?
  → httpOnly cookie tidak bermakna tanpa HTTPS

☐ Error messages tidak expose internal details?
  → Log detail error di server, tampilkan pesan generik ke user

☐ Dependency auth sudah di-pin ke versi tertentu?
  → next-auth@5.x.x — beta version, bisa ada breaking changes
```

---

## Cara Menjalankan Project

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan nilai yang benar

# 3. Jalankan development server
npm run dev

# 4. Buka di browser
# http://localhost:3000

# Test credentials yang sudah di-seed:
# Email:    admin@dev.com
# Password: admin123
```

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Next.js 15*
