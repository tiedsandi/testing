# Flowspace — Fase 8: Error Handling & Monitoring

> **Fase ini menghasilkan:** Error boundaries di setiap level, `error.tsx` dan `not-found.tsx` per route, custom error classes, Sentry integration untuk production monitoring, async error handling pattern yang konsisten, dan logging strategy.

---

## Gambaran Besar

Error handling yang baik adalah perbedaan antara app yang frustrating dan app yang trustworthy. Kita bangun berlapis:

```
Browser Error
  └── Error Boundary (React)
       └── error.tsx (Next.js route-level)
            └── Custom Error Classes
                 └── Server Action Error Handling
                      └── Sentry (production logging)

Network Error
  └── TanStack Query onError
       └── Toast notification
            └── Sentry (jika 5xx)
```

---

## Step 1: Custom Error Classes

### `src/lib/errors.ts`

```typescript
// src/lib/errors.ts

/**
 * Base class untuk semua custom errors di Flowspace.
 * Extend ini untuk error yang lebih spesifik.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "AppError";

    // Agar instanceof bekerja dengan benar setelah transpile
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ── Error Types ────────────────────────────────────────────────────────

/** User tidak login */
export class UnauthorizedError extends AppError {
  constructor(message = "Kamu harus login terlebih dahulu") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

/** User login tapi tidak punya izin */
export class ForbiddenError extends AppError {
  constructor(message = "Kamu tidak punya izin untuk aksi ini") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

/** Resource tidak ditemukan */
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} tidak ditemukan`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

/** Validasi input gagal */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, "VALIDATION_ERROR", 422);
    this.name = "ValidationError";
  }
}

/** Rate limit terlampaui */
export class RateLimitError extends AppError {
  constructor(message = "Terlalu banyak request. Coba lagi nanti.") {
    super(message, "RATE_LIMIT", 429);
    this.name = "RateLimitError";
  }
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Ambil pesan error yang aman untuk ditampilkan ke user.
 * Jangan tampilkan internal error messages ke user.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message; // Custom errors aman untuk ditampilkan
  }
  if (error instanceof Error) {
    // Hanya tampilkan di development
    if (process.env.NODE_ENV === "development") {
      return error.message;
    }
  }
  return "Terjadi kesalahan. Silakan coba lagi.";
}

/**
 * Konversi error ke format respons API standar
 */
export function toApiError(error: unknown) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  // Log unexpected errors
  console.error("[Unexpected Error]:", error);

  return {
    error: "Internal server error",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  };
}
```

---

## Step 2: Server Action Error Wrapper

Ini adalah pattern terpenting — wrapper yang membuat semua server actions konsisten:

### `src/lib/safe-action.ts`

```typescript
// src/lib/safe-action.ts
import { auth } from "@/lib/auth";
import { AppError, UnauthorizedError, getErrorMessage } from "./errors";
import * as Sentry from "@sentry/nextjs";

// Return type yang konsisten untuk semua server actions
type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Wrapper untuk server actions yang:
 * 1. Auto-cek autentikasi
 * 2. Catch semua errors
 * 3. Log ke Sentry kalau unexpected
 * 4. Return format yang konsisten
 *
 * Penggunaan:
 * export const myAction = withAuth(async (session, input) => {
 *   // logic di sini
 *   return { data: result };
 * });
 */
export function withAuth<TInput, TOutput>(
  handler: (
    session: { user: { id: string; name?: string | null; email?: string | null } },
    input: TInput
  ) => Promise<TOutput>
) {
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    try {
      const session = await auth();

      if (!session?.user?.id) {
        return { success: false, error: "Kamu harus login", code: "UNAUTHORIZED" };
      }

      const result = await handler(session, input);
      return { success: true, data: result };
    } catch (error) {
      // AppError — user-facing, tidak perlu log ke Sentry
      if (error instanceof AppError) {
        return {
          success: false,
          error: error.message,
          code: error.code,
        };
      }

      // Unexpected error — log ke Sentry
      if (process.env.NODE_ENV === "production") {
        Sentry.captureException(error, {
          tags: { type: "server_action" },
        });
      } else {
        console.error("[Server Action Error]:", error);
      }

      return {
        success: false,
        error: "Terjadi kesalahan server. Silakan coba lagi.",
        code: "INTERNAL_ERROR",
      };
    }
  };
}

/**
 * Versi tanpa auth check (untuk public actions)
 */
export function withErrorHandling<TInput, TOutput>(
  handler: (input: TInput) => Promise<TOutput>
) {
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    try {
      const result = await handler(input);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof AppError) {
        return { success: false, error: error.message, code: error.code };
      }

      if (process.env.NODE_ENV === "production") {
        Sentry.captureException(error);
      } else {
        console.error("[Action Error]:", error);
      }

      return {
        success: false,
        error: "Terjadi kesalahan. Silakan coba lagi.",
        code: "INTERNAL_ERROR",
      };
    }
  };
}
```

### Contoh penggunaan di server action:

```typescript
// src/features/task/actions/task.actions.ts (refactor dengan withAuth)
"use server";

import { withAuth } from "@/lib/safe-action";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { createTaskSchema } from "../schemas/task.schema";
import { db } from "@/lib/db";
import { WorkspaceRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

export const createTaskAction = withAuth(
  async (session, input: { projectId: string; data: unknown }) => {
    const parsed = createTaskSchema.safeParse(input.data);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message);
    }

    // Validasi akses
    const member = await db.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspace: {
          projects: { some: { id: input.projectId } },
        },
      },
    });

    if (!member) throw new ForbiddenError("Kamu bukan member workspace ini");
    if (member.role === WorkspaceRole.GUEST) {
      throw new ForbiddenError("Guest tidak bisa membuat task");
    }

    const { dueDate, ...rest } = parsed.data;

    const task = await db.task.create({
      data: {
        ...rest,
        projectId: input.projectId,
        creatorId: session.user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    revalidatePath(`/workspace`);
    return task;
  }
);
```

---

## Step 3: API Route Error Wrapper

### `src/lib/api-handler.ts`

```typescript
// src/lib/api-handler.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AppError, UnauthorizedError } from "./errors";
import * as Sentry from "@sentry/nextjs";

type RouteContext = {
  params: Record<string, string>;
};

/**
 * Wrapper untuk API Route handlers
 */
export function apiHandler(
  handler: (
    req: Request,
    ctx: RouteContext,
    userId: string
  ) => Promise<NextResponse>
) {
  return async (req: Request, ctx: RouteContext) => {
    try {
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json(
          { error: "Unauthorized", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }

      return await handler(req, ctx, session.user.id);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }

      if (process.env.NODE_ENV === "production") {
        Sentry.captureException(error);
      } else {
        console.error("[API Error]:", error);
      }

      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  };
}
```

### Contoh penggunaan:

```typescript
// src/app/api/workspaces/route.ts (refactor dengan apiHandler)
import { apiHandler } from "@/lib/api-handler";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = apiHandler(async (req, ctx, userId) => {
  const workspaces = await db.workspace.findMany({
    where: { members: { some: { userId } } },
    include: { /* ... */ },
  });

  return NextResponse.json(workspaces);
});
```

---

## Step 4: Error Boundaries React

### `src/components/common/ErrorBoundary.tsx`

```tsx
// src/components/common/ErrorBoundary.tsx
"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } },
      });
    } else {
      console.error("[Error Boundary caught]:", error, info);
    }

    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          reset={() => this.setState({ hasError: false })}
        />
      );
    }

    return this.props.children;
  }
}

// Fallback UI default
function ErrorFallback({
  error,
  reset,
}: {
  error?: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
      <h2 className="text-lg font-semibold mb-2">Oops! Ada yang salah</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {process.env.NODE_ENV === "development" && error?.message
          ? error.message
          : "Komponen ini mengalami error. Coba refresh atau klik tombol di bawah."}
      </p>
      <Button onClick={reset}>Coba Lagi</Button>
    </div>
  );
}

/**
 * HOC untuk wrap komponen dengan ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
```

### Cara pakai:

```tsx
// Wrap taskboard yang kompleks
import { withErrorBoundary } from "@/components/common/ErrorBoundary";

const SafeTaskBoard = withErrorBoundary(
  TaskBoard,
  <div className="text-center py-16 text-muted-foreground">
    Board tidak bisa dimuat. Coba refresh halaman.
  </div>
);
```

---

## Step 5: Next.js error.tsx Files

### `src/app/(dashboard)/error.tsx`

```tsx
// src/app/(dashboard)/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";
import { RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log ke Sentry
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error);
    } else {
      console.error("[Dashboard Error]:", error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="text-2xl font-bold mb-2">Terjadi Kesalahan</h1>
      <p className="text-muted-foreground mb-2 max-w-md">
        Halaman ini mengalami error yang tidak terduga. Tim kami sudah
        diberitahu.
      </p>
      {/* Digest ID untuk debugging */}
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-6 font-mono">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>
          <RefreshCw size={14} className="mr-2" />
          Coba Lagi
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <Home size={14} className="mr-2" />
            Ke Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

### `src/app/(dashboard)/workspace/[workspaceId]/error.tsx`

```tsx
// src/app/(dashboard)/workspace/[workspaceId]/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="p-8 text-center">
      <p className="text-lg font-semibold mb-2">
        Workspace tidak bisa dimuat
      </p>
      <p className="text-muted-foreground mb-4">
        Coba refresh atau kembali ke dashboard.
      </p>
      <div className="flex justify-center gap-3">
        <Button onClick={reset} variant="outline">
          Refresh
        </Button>
        <Button onClick={() => router.push("/dashboard")}>
          ← Dashboard
        </Button>
      </div>
    </div>
  );
}
```

### `src/app/not-found.tsx`

```tsx
// src/app/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <p className="text-8xl font-black text-muted-foreground/20 mb-4">404</p>
      <h1 className="text-2xl font-bold mb-2">Halaman Tidak Ditemukan</h1>
      <p className="text-muted-foreground mb-6">
        Halaman yang kamu cari mungkin sudah dipindah atau tidak pernah ada.
      </p>
      <Button asChild>
        <Link href="/dashboard">Kembali ke Dashboard</Link>
      </Button>
    </div>
  );
}
```

### `src/app/(dashboard)/workspace/[workspaceId]/not-found.tsx`

```tsx
// src/app/(dashboard)/workspace/[workspaceId]/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function WorkspaceNotFound() {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <p className="text-5xl mb-4">🔍</p>
      <h2 className="text-xl font-bold mb-2">Workspace Tidak Ditemukan</h2>
      <p className="text-muted-foreground mb-6">
        Workspace ini mungkin sudah dihapus atau kamu tidak punya akses.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">← Kembali ke Dashboard</Link>
      </Button>
    </div>
  );
}
```

---

## Step 6: Sentry Setup

### Install

```bash
npx @sentry/wizard@latest -i nextjs
```

Wizard akan otomatis buat file `sentry.client.config.ts`, `sentry.server.config.ts`, dan `sentry.edge.config.ts`.

### Manual setup kalau tidak pakai wizard:

### `sentry.client.config.ts`

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Hanya aktif di production
  enabled: process.env.NODE_ENV === "production",

  // Percentage error yang di-capture (0-100)
  tracesSampleRate: 0.1,  // 10% performance traces
  replaysSessionSampleRate: 0.05, // 5% session replay
  replaysOnErrorSampleRate: 1.0,  // 100% kalau ada error

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,     // Sembunyikan teks untuk privasi
      blockAllMedia: false,
    }),
  ],
});
```

### `sentry.server.config.ts`

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
});
```

### `.env` variables:

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...  # Untuk upload source maps
```

---

## Step 7: TanStack Query Global Error Handler

### Update `QueryProvider`:

```tsx
// src/components/providers/QueryProvider.tsx (update)
"use client";

import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { toast } from "react-hot-toast";
import * as Sentry from "@sentry/nextjs";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            // Hanya tampilkan toast untuk query yang sudah punya data (bukan initial fetch)
            if (query.state.data !== undefined) {
              toast.error(
                `Gagal memperbarui data: ${
                  error instanceof Error ? error.message : "Error tidak diketahui"
                }`
              );
            }

            // Log 5xx errors ke Sentry
            if (
              error instanceof Error &&
              error.message.includes("5") &&
              process.env.NODE_ENV === "production"
            ) {
              Sentry.captureException(error, {
                tags: { type: "query_error", queryKey: String(query.queryKey[0]) },
              });
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            // Global mutation error handler sebagai safety net
            // Individual mutations sebaiknya handle error sendiri
            console.error("[Mutation Error]:", error);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error) => {
              // Jangan retry 4xx errors (client errors)
              if (
                error instanceof Error &&
                (error.message.includes("401") ||
                  error.message.includes("403") ||
                  error.message.includes("404"))
              ) {
                return false;
              }
              return failureCount < 2; // Max 2 retry untuk 5xx
            },
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

---

## Step 8: Loading States — loading.tsx

### `src/app/(dashboard)/loading.tsx`

```tsx
// src/app/(dashboard)/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
```

### `src/app/(dashboard)/workspace/[workspaceId]/loading.tsx`

```tsx
// src/app/(dashboard)/workspace/[workspaceId]/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

---

## Step 9: Logging Utility

### `src/lib/logger.ts`

```typescript
// src/lib/logger.ts
import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  workspaceId?: string;
  projectId?: string;
  action?: string;
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, context ?? "");
    }
  }

  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context ?? "");
    }
    // Di production, info logs tidak perlu dikirim ke Sentry
  }

  warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${message}`, context ?? "");
    if (!this.isDevelopment) {
      Sentry.captureMessage(message, {
        level: "warning",
        contexts: { app: context ?? {} },
      });
    }
  }

  error(message: string, error?: unknown, context?: LogContext) {
    console.error(`[ERROR] ${message}`, error, context ?? "");
    if (!this.isDevelopment && error) {
      Sentry.captureException(error, {
        contexts: {
          app: { message, ...context },
        },
      });
    }
  }
}

export const logger = new Logger();
```

### Cara pakai:

```typescript
import { logger } from "@/lib/logger";

// Di server action
try {
  await db.workspace.delete({ where: { id: workspaceId } });
  logger.info("Workspace deleted", { workspaceId, userId: session.user.id });
} catch (error) {
  logger.error("Failed to delete workspace", error, { workspaceId });
  return { error: "Gagal menghapus workspace" };
}
```

---

## Step 10: Rate Limiting untuk Server Actions

Protect server actions dari abuse:

### `src/lib/rate-limit.ts`

```typescript
// src/lib/rate-limit.ts
// Simple in-memory rate limiter (ganti dengan Redis di production skala besar)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Cek apakah key sudah melampaui rate limit
 * @param key - Identifier (biasanya userId + action)
 * @param limit - Max request per window
 * @param windowMs - Time window dalam milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(key);

  // Reset jika window sudah expired
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: limit - entry.count,
    resetIn: entry.resetAt - now,
  };
}
```

### Cara pakai di server action:

```typescript
import { checkRateLimit } from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";

export async function addCommentAction(taskId: string, formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Rate limit: max 20 komentar per menit per user
  const { success } = checkRateLimit(`comment:${session.user.id}`, 20, 60000);
  if (!success) {
    return { error: "Terlalu banyak komentar. Tunggu sebentar." };
  }

  // ... rest of action
}
```

---

## Common Pitfalls Fase 8

### ❌ Pitfall 1: Error boundary tidak catch async errors

**Masalah:** Error boundary React hanya catch synchronous errors dan errors di render phase. Async errors (seperti di event handlers) tidak tercover.

**Solusi:** Untuk async errors, gunakan try-catch eksplisit dan toast. Error boundary adalah safety net terakhir, bukan handler utama.

---

### ❌ Pitfall 2: Expose internal error messages ke user

**Masalah:**
```typescript
return { error: error.message }; // Bisa expose stacktrace atau DB error
```

**Solusi:** Gunakan `getErrorMessage()` dari `src/lib/errors.ts` yang hanya tampilkan user-friendly message.

---

### ❌ Pitfall 3: Sentry di development

**Masalah:** Sentry dikirim saat development, memenuhi Sentry quota dengan noise.

**Solusi:** Selalu cek `process.env.NODE_ENV === "production"` sebelum capture, atau set `enabled: process.env.NODE_ENV === "production"` di `Sentry.init()`.

---

### ❌ Pitfall 4: Terlalu banyak toast error

**Masalah:** Setiap query error muncul toast, menggangu user.

**Solusi:** Di `QueryCache.onError`, hanya tampilkan toast untuk query yang sudah memiliki data (bukan initial fetch gagal — handle itu dengan empty state atau error.tsx).

---

### ❌ Pitfall 5: Rate limiter tidak persistent

**Masalah:** In-memory rate limiter reset saat server restart, dan tidak bekerja di multiple instances (Vercel scales to multiple).

**Solusi:** Untuk production: gunakan Redis (Upstash) atau Vercel KV. Untuk learning project ini, in-memory sudah lebih dari cukup dan mudah dipahami.

---

## Checklist Fase 8

- [ ] Error boundary wrap TaskBoard dan komponen kompleks lain
- [ ] `error.tsx` ada di route `/dashboard` dan `/workspace/[id]`
- [ ] `not-found.tsx` ada di root dan workspace routes
- [ ] `loading.tsx` ada untuk initial loading state
- [ ] Server actions return konsisten `{ success, error }` format
- [ ] Sentry hanya aktif di production
- [ ] API routes pakai `apiHandler` wrapper
- [ ] Rate limiting di `addCommentAction`
- [ ] Internal error messages tidak ter-expose ke user
- [ ] Logger utility dipakai di critical operations

---

## Lanjut ke Fase 9

Error handling sudah solid. Sekarang kita tulis **tests** — unit tests untuk utilities, integration tests untuk server actions dengan Vitest, dan component tests dengan React Testing Library.
