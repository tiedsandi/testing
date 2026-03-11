# Flowspace — Fase 2: Authentication

> **Fase ini menghasilkan:** App yang bisa register, login (email/password + Google OAuth), protected routes, dan profile page. Setelah fase ini selesai, kamu bisa run app dan test login/logout secara penuh.

---

## Gambaran Besar

Authentication di Next.js App Router itu berbeda dari Pages Router. Kita pakai **Auth.js v5** (dulu NextAuth.js) yang sudah native support App Router.

Flow yang kita bangun:
```
[User] → /login → Auth.js → Session → Middleware → Protected Routes
                    ↓
              Google OAuth
              Email/Password (+ bcryptjs)
```

---

## Step 1: Install Dependencies Auth

```bash
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install -D @types/bcryptjs
```

> **Kenapa `@beta`?** Auth.js v5 masih dalam beta tapi sudah production-ready untuk majority use cases. v4 tidak support App Router properly.

---

## Step 2: Konfigurasi Auth.js

### `src/lib/auth.ts`

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/features/auth/schemas/auth.schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Pakai Prisma untuk menyimpan session/account ke database
  adapter: PrismaAdapter(db),

  // Kita pakai JWT strategy supaya bisa tambah custom data ke session
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },

  // Halaman custom kita
  pages: {
    signIn: "/login",
    error: "/login", // Redirect error ke login page dengan query param
  },

  providers: [
    // ── Google OAuth ──────────────────────────────────────────────
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Minta profile + email dari Google
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    // ── Email + Password ──────────────────────────────────────────
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validasi input dulu pakai Zod
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Cari user di database
        const user = await db.user.findUnique({
          where: { email },
        });

        // User tidak ada atau user ini pakai OAuth (tidak punya password)
        if (!user || !user.password) return null;

        // Bandingkan password
        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if (!isPasswordValid) return null;

        // Return user object — ini yang masuk ke JWT
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],

  callbacks: {
    // ── JWT Callback: dipanggil saat token dibuat/diupdate ────────
    async jwt({ token, user, trigger, session }) {
      // Saat pertama kali login, `user` ada isinya
      if (user) {
        token.id = user.id;
      }

      // Saat user panggil `update()` dari client, sync data ke token
      if (trigger === "update" && session) {
        token.name = session.name;
        token.image = session.picture;
      }

      return token;
    },

    // ── Session Callback: dipanggil saat session dibaca ──────────
    async session({ session, token }) {
      // Tambahkan `id` ke session.user supaya bisa diakses di mana saja
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  // Secret untuk signing JWT (ambil dari env)
  secret: process.env.AUTH_SECRET,
});
```

### `src/types/next-auth.d.ts`

TypeScript tidak tahu bahwa kita tambah `id` ke session. Kita perlu augment type-nya:

```typescript
// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string; // Tambahkan ini
    } & DefaultSession["user"];
  }
}
```

---

## Step 3: API Route untuk Auth.js

Auth.js butuh satu API route handler untuk menangani semua OAuth callbacks:

### `src/app/api/auth/[...nextauth]/route.ts`

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

// Export GET dan POST handler dari Auth.js
export const { GET, POST } = handlers;
```

> **Penjelasan:** Auth.js menangani semua request ke `/api/auth/*` — login, logout, OAuth callback, session check, dll. Kamu tidak perlu nulis ini manual.

---

## Step 4: Middleware untuk Protected Routes

Middleware berjalan di Edge Runtime sebelum request sampai ke page. Ini tempat yang tepat untuk cek auth:

### `src/middleware.ts`

```typescript
// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes yang TIDAK perlu auth
const publicRoutes = ["/login", "/register", "/"];

// Routes yang khusus untuk user yang BELUM login
const authRoutes = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

  // Kalau user sudah login dan mencoba akses /login atau /register,
  // redirect ke dashboard
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Kalau route bukan public dan user belum login, redirect ke /login
  if (!isPublicRoute && !isLoggedIn) {
    // Simpan URL yang ingin diakses sebagai callbackUrl
    const callbackUrl = encodeURIComponent(nextUrl.pathname);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  // Lanjutkan request
  return NextResponse.next();
});

// Konfigurasi: middleware ini berlaku untuk route mana saja
export const config = {
  matcher: [
    // Jalankan di semua route KECUALI:
    // - _next/static (static files)
    // - _next/image (image optimization)
    // - favicon.ico
    // - api/auth (Auth.js handler sendiri)
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
```

---

## Step 5: Schemas Validasi (Zod)

### `src/features/auth/schemas/auth.schema.ts`

```typescript
// src/features/auth/schemas/auth.schema.ts
import { z } from "zod";

// Schema untuk login
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .min(8, "Password minimal 8 karakter"),
});

// Schema untuk register
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nama wajib diisi")
      .min(2, "Nama minimal 2 karakter")
      .max(50, "Nama maksimal 50 karakter"),
    email: z
      .string()
      .min(1, "Email wajib diisi")
      .email("Format email tidak valid"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password harus mengandung huruf besar, huruf kecil, dan angka"
      ),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

// Schema untuk update profile
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(50, "Nama maksimal 50 karakter"),
  image: z.string().url().optional().or(z.literal("")),
});

// TypeScript types dari schema
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
```

---

## Step 6: Server Actions untuk Auth

Server Actions adalah functions yang berjalan di server tapi bisa dipanggil dari client. Ini cara modern untuk handle form submit di Next.js App Router:

### `src/features/auth/actions/auth.actions.ts`

```typescript
// src/features/auth/actions/auth.actions.ts
"use server";

import { signIn, signOut } from "@/lib/auth";
import { registerSchema } from "@/features/auth/schemas/auth.schema";
import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

// ── Register ──────────────────────────────────────────────────────────
export async function registerAction(formData: unknown) {
  // Validasi data
  const parsed = registerSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      error: parsed.error.errors[0].message,
    };
  }

  const { name, email, password } = parsed.data;

  // Cek apakah email sudah terdaftar
  const existingUser = await db.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "Email sudah terdaftar. Silakan login." };
  }

  // Hash password dengan bcrypt (cost factor 12 = secure tapi tidak terlalu lambat)
  const hashedPassword = await bcryptjs.hash(password, 12);

  // Buat user baru
  await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  // Auto login setelah register
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });
}

// ── Login dengan Credentials ──────────────────────────────────────────
export async function loginAction(formData: unknown) {
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: "Data tidak valid" };
  }

  const { email, password } = parsed.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    // Auth.js throw error untuk redirect, kita perlu re-throw itu
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email atau password salah" };
        default:
          return { error: "Terjadi kesalahan. Silakan coba lagi." };
      }
    }
    // Re-throw redirect error (penting!)
    throw error;
  }
}

// ── Login dengan Google ───────────────────────────────────────────────
export async function loginWithGoogleAction() {
  await signIn("google", { redirectTo: "/dashboard" });
}

// ── Logout ────────────────────────────────────────────────────────────
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
```

> **Pitfall #1:** Selalu re-throw error yang bukan `AuthError`. Auth.js menggunakan throw untuk trigger redirect, jadi kalau kamu catch semua error tanpa re-throw, redirect tidak akan terjadi.

---

## Step 7: Komponen Login Form

### `src/features/auth/components/LoginForm.tsx`

```tsx
// src/features/auth/components/LoginForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "../schemas/auth.schema";
import { loginAction, loginWithGoogleAction } from "../actions/auth.actions";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // useTransition untuk handle async Server Action tanpa blocking UI
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  function onSubmit(data: LoginFormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginAction(data);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Selamat datang kembali</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Masuk ke akun Flowspace kamu
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Google Login */}
      <form action={loginWithGoogleAction}>
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={isPending}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            {/* Google icon paths */}
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
          Masuk dengan Google
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">atau</span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="kamu@contoh.com"
            {...register("email")}
            disabled={isPending}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("password")}
              disabled={isPending}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            "Masuk"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
```

### `src/features/auth/components/RegisterForm.tsx`

```tsx
// src/features/auth/components/RegisterForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "../schemas/auth.schema";
import { registerAction } from "../actions/auth.actions";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  function onSubmit(data: RegisterFormData) {
    setError(null);
    startTransition(async () => {
      const result = await registerAction(data);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Buat akun baru</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mulai kelola project kamu dengan Flowspace
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nama Lengkap</Label>
          <Input
            id="name"
            placeholder="Budi Santoso"
            {...register("name")}
            disabled={isPending}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="kamu@contoh.com"
            {...register("email")}
            disabled={isPending}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 8 karakter, huruf besar + angka"
            {...register("password")}
            disabled={isPending}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Ulangi password kamu"
            {...register("confirmPassword")}
            disabled={isPending}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mendaftarkan akun...
            </>
          ) : (
            "Daftar"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Masuk sekarang
        </Link>
      </p>
    </div>
  );
}
```

---

## Step 8: Pages

### `src/app/(auth)/login/page.tsx`

```tsx
// src/app/(auth)/login/page.tsx
import { LoginForm } from "@/features/auth/components/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login — Flowspace",
  description: "Masuk ke akun Flowspace kamu",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <LoginForm />
    </main>
  );
}
```

### `src/app/(auth)/register/page.tsx`

```tsx
// src/app/(auth)/register/page.tsx
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register — Flowspace",
  description: "Buat akun Flowspace baru",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <RegisterForm />
    </main>
  );
}
```

---

## Step 9: Custom Hook useAuth

### `src/features/auth/hooks/useAuth.ts`

```typescript
// src/features/auth/hooks/useAuth.ts
"use client";

import { useSession } from "next-auth/react";

/**
 * Custom hook untuk akses session dengan type safety.
 * Gunakan ini di client components, bukan `auth()` dari lib/auth.ts.
 */
export function useAuth() {
  const { data: session, status, update } = useSession();

  return {
    user: session?.user,
    isLoggedIn: status === "authenticated",
    isLoading: status === "loading",
    // Fungsi untuk update session setelah user update profile
    updateSession: update,
  };
}
```

> **Ingat:** `useSession()` hanya untuk **Client Components**. Untuk Server Components, gunakan `auth()` dari `@/lib/auth`.

---

## Step 10: Profile Page

### `src/app/(dashboard)/profile/page.tsx`

```tsx
// src/app/(dashboard)/profile/page.tsx
import { auth } from "@/lib/auth";
import { ProfileForm } from "@/features/auth/components/ProfileForm";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile — Flowspace",
};

export default async function ProfilePage() {
  // Di Server Components, gunakan auth() langsung
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Ambil data lengkap user dari database
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      // Hitung jumlah workspace
      _count: {
        select: { workspaceMembers: true },
      },
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Kelola informasi akun kamu
        </p>
      </div>
      <ProfileForm user={user} />
    </div>
  );
}
```

### `src/features/auth/components/ProfileForm.tsx`

```tsx
// src/features/auth/components/ProfileForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateProfileSchema,
  type UpdateProfileFormData,
} from "../schemas/auth.schema";
import { updateProfileAction } from "../actions/auth.actions";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";
import { Loader2, Camera } from "lucide-react";

interface ProfileFormProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    createdAt: Date;
    _count: { workspaceMembers: number };
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { update: updateSession } = useSession();
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user.name ?? "",
      image: user.image ?? "",
    },
  });

  function onSubmit(data: UpdateProfileFormData) {
    startTransition(async () => {
      const result = await updateProfileAction(data);
      if (result?.error) {
        toast.error(result.error);
      } else {
        // Update session supaya navbar langsung reflect perubahan
        await updateSession({ name: data.name, picture: data.image });
        toast.success("Profile berhasil diupdate!");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
            <AvatarFallback className="text-lg">
              {user.name?.charAt(0).toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Member di {user._count.workspaceMembers} workspace ·{" "}
              Bergabung {new Date(user.createdAt).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                {...register("name")}
                disabled={isPending}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">URL Avatar (opsional)</Label>
              <Input
                id="image"
                placeholder="https://..."
                {...register("image")}
                disabled={isPending}
              />
              {errors.image && (
                <p className="text-sm text-destructive">{errors.image.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Paste URL gambar kamu. Di fase selanjutnya kita akan tambah upload langsung.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isPending || !isDirty}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

Tambahkan action `updateProfileAction` ke `auth.actions.ts`:

```typescript
// Tambahkan di src/features/auth/actions/auth.actions.ts
import { updateProfileSchema } from "../schemas/auth.schema";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = updateProfileSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      image: parsed.data.image || null,
    },
  });

  revalidatePath("/profile");
  return { success: true };
}
```

---

## Environment Variables

Tambahkan di `.env.local`:

```bash
# Auth.js
AUTH_SECRET="generate-dengan-openssl-rand-base64-32"

# Google OAuth — dapet dari console.cloud.google.com
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Base URL app
NEXTAUTH_URL="http://localhost:3000"
```

### Generate AUTH_SECRET:
```bash
openssl rand -base64 32
```

### Setup Google OAuth:
1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Buat project baru → APIs & Services → Credentials
3. Create OAuth Client ID → Web Application
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID dan Client Secret ke `.env.local`

---

## Common Pitfalls Fase 2

### ❌ Pitfall 1: Session tidak update setelah edit profile

**Masalah:** User update nama di profile, tapi navbar masih tampil nama lama.

**Solusi:** Gunakan `update()` dari `useSession()` setelah server action sukses:
```typescript
const { update } = useSession();
// Setelah action sukses:
await update({ name: newName });
```

---

### ❌ Pitfall 2: "redirect() did not catch" error

**Masalah:** Error aneh saat `redirect()` dipanggil di dalam try/catch.

**Solusi:** `redirect()` di Next.js menggunakan throw internally. Selalu re-throw:
```typescript
// ❌ Salah
try {
  await signIn(...)
} catch (err) {
  console.error(err); // Menelan redirect error!
}

// ✅ Benar
try {
  await signIn(...)
} catch (err) {
  if (err instanceof AuthError) {
    return { error: "..." };
  }
  throw err; // Re-throw untuk redirect
}
```

---

### ❌ Pitfall 3: Middleware memblokir static files

**Masalah:** Gambar atau font tidak bisa dimuat karena middleware block semua request.

**Solusi:** Pastikan matcher di `middleware.ts` exclude `_next/static`, `_next/image`, dan file statis lainnya. Lihat kode middleware di atas.

---

### ❌ Pitfall 4: Google OAuth callback URL salah

**Masalah:** Error "redirect_uri_mismatch" dari Google.

**Solusi:** Pastikan di Google Console, Authorized Redirect URI persis sama:
- Development: `http://localhost:3000/api/auth/callback/google`
- Production: `https://yourdomain.com/api/auth/callback/google`

---

### ❌ Pitfall 5: User bisa akses /login saat sudah login

**Masalah:** User yang sudah login bisa tetap buka `/login`.

**Solusi:** Di middleware, cek `isAuthRoute && isLoggedIn` dan redirect ke `/dashboard`. Sudah ada di kode middleware kita.

---

## Checklist Fase 2

- [ ] `npm run dev` berjalan tanpa error
- [ ] Register dengan email baru berhasil dan auto-redirect ke /dashboard
- [ ] Login dengan email/password yang sudah terdaftar berhasil
- [ ] Login dengan Google berhasil (butuh env variables yang benar)
- [ ] Logout berhasil dan redirect ke /login
- [ ] Akses `/dashboard` tanpa login → redirect ke `/login`
- [ ] Akses `/login` saat sudah login → redirect ke `/dashboard`
- [ ] Profile page tampil data user yang benar
- [ ] Update nama di profile berhasil tersimpan
- [ ] Error message muncul saat email/password salah

---

## Lanjut ke Fase 3

Setelah autentikasi berjalan, di fase berikutnya kita bangun **Workspace & Project Management** — user bisa buat workspace, invite member, dan buat project.
