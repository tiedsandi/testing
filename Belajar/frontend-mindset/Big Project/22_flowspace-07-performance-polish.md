# Flowspace — Fase 7: Performance & Polish

> **Fase ini menghasilkan:** Infinite scroll untuk list task panjang, skeleton loading konsisten, dark mode dengan next-themes, page transition animasi, responsive design mobile-first, image optimization, dan bundle analysis.

---

## Gambaran Besar

Fase ini tentang membuat app yang sudah *functional* menjadi *delightful*. Tidak perlu fitur baru — tapi user experience naik secara signifikan.

```
Performance
 ├── Infinite scroll (jangan load semua task sekaligus)
 ├── Skeleton loading (bukan spinner yang annoying)
 ├── Image optimization (Next.js Image component)
 └── Bundle analysis

Polish
 ├── Dark mode (next-themes)
 ├── Page transitions (Framer Motion)
 └── Responsive design mobile-first
```

---

## Step 1: Install Dependencies

```bash
npm install next-themes
```

Dark mode sudah pakai Tailwind CSS built-in support. next-themes mengelola toggling class di `<html>`.

---

## Step 2: Dark Mode Setup

### Update `src/app/layout.tsx`

```tsx
// src/app/layout.tsx
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "react-hot-toast";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s — Flowspace",
    default: "Flowspace",
  },
  description: "Productivity app untuk manajemen project dan task tim kamu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      {/* suppressHydrationWarning: diperlukan karena next-themes inject class */}
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### `src/components/providers/ThemeProvider.tsx`

```tsx
// src/components/providers/ThemeProvider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### `src/components/common/ThemeToggle.tsx`

```tsx
// src/components/common/ThemeToggle.tsx
"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun size={16} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon size={16} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun size={14} className="mr-2" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon size={14} className="mr-2" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor size={14} className="mr-2" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

Tambahkan `ThemeToggle` ke Navbar.

---

## Step 3: Infinite Scroll untuk Task List

Kita ubah task list agar menggunakan **cursor-based pagination** dengan infinite scroll:

### Update API Route untuk Pagination

### `src/app/api/projects/[projectId]/tasks/route.ts` (update)

```typescript
// Update src/app/api/projects/[projectId]/tasks/route.ts

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigneeId = searchParams.get("assigneeId");
  const search = searchParams.get("search");
  const cursor = searchParams.get("cursor"); // ID task terakhir
  const limit = 20; // Tasks per page

  const where: any = { projectId: params.projectId };
  if (status && status !== "all") where.status = status;
  if (priority && priority !== "all") where.priority = priority;
  if (assigneeId && assigneeId !== "all") where.assigneeId = assigneeId;
  if (search) where.title = { contains: search, mode: "insensitive" };

  const tasks = await db.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      creator: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: limit + 1, // Ambil 1 lebih untuk tahu ada halaman selanjutnya
    // Cursor-based pagination
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1, // Skip cursor item itu sendiri
        }
      : {}),
  });

  // Cek apakah masih ada halaman selanjutnya
  const hasNextPage = tasks.length > limit;
  const data = hasNextPage ? tasks.slice(0, limit) : tasks;
  const nextCursor = hasNextPage ? data[data.length - 1].id : null;

  return NextResponse.json({
    tasks: data,
    nextCursor,
    hasNextPage,
  });
}
```

### `src/features/task/hooks/useInfiniteTasks.ts`

```typescript
// src/features/task/hooks/useInfiniteTasks.ts
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTaskFilterStore } from "@/stores/taskFilterStore";
import { useDebounce } from "@/hooks/useDebounce";

export function useInfiniteTasks(projectId: string) {
  const { search, status, priority, assigneeId } = useTaskFilterStore();
  const debouncedSearch = useDebounce(search, 300);

  const filters = { search: debouncedSearch, status, priority, assigneeId };

  return useInfiniteQuery({
    queryKey: ["tasks-infinite", projectId, filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.priority !== "all") params.set("priority", filters.priority);
      if (filters.assigneeId !== "all")
        params.set("assigneeId", filters.assigneeId);
      if (pageParam) params.set("cursor", pageParam as string);

      const res = await fetch(
        `/api/projects/${projectId}/tasks?${params.toString()}`
      );
      if (!res.ok) throw new Error("Gagal memuat tasks");
      return res.json();
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 1000 * 30,
  });
}
```

### `src/hooks/useIntersectionObserver.ts`

Hook untuk detect saat user scroll ke bawah (trigger load more):

```typescript
// src/hooks/useIntersectionObserver.ts
"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Trigger callback saat element masuk viewport
 * Dipakai untuk infinite scroll
 */
export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit
): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [callback, options]);

  return ref;
}
```

### Usage di List View (contoh view alternatif):

```tsx
// src/features/task/components/TaskList.tsx
"use client";

import { useInfiniteTasks } from "../hooks/useInfiniteTasks";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { TaskCard } from "./TaskCard";
import { Loader2 } from "lucide-react";
import { useCallback } from "react";

export function TaskList({ projectId, workspaceId, currentUserId, currentUserRole }: any) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteTasks(projectId);

  // Callback saat sentinel masuk viewport
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sentinelRef = useIntersectionObserver(loadMore);

  const allTasks = data?.pages.flatMap((page) => page.tasks) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          projectId={projectId}
          workspaceId={workspaceId}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
        />
      ))}

      {/* Sentinel: el ini di-observe untuk trigger load more */}
      <div ref={sentinelRef} className="py-2 flex justify-center">
        {isFetchingNextPage && (
          <Loader2 size={16} className="animate-spin text-muted-foreground" />
        )}
        {!hasNextPage && allTasks.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Semua task sudah dimuat ✓
          </p>
        )}
      </div>
    </div>
  );
}

function TaskCardSkeleton() {
  return (
    <div className="h-20 rounded-lg border bg-muted/30 animate-pulse" />
  );
}
```

---

## Step 4: Page Transitions dengan Framer Motion

### `src/components/layout/PageTransition.tsx`

```tsx
// src/components/layout/PageTransition.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

Tambahkan ke `src/app/(dashboard)/layout.tsx`:
```tsx
<main className="flex-1 overflow-y-auto bg-background">
  <PageTransition>   {/* ← tambahkan ini */}
    {children}
  </PageTransition>
</main>
```

---

## Step 5: Sidebar yang Responsive

### `src/components/layout/Sidebar.tsx`

```tsx
// src/components/layout/Sidebar.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setSidebarOpen } from "@/store/slices/uiSlice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Settings,
  ChevronLeft,
  Plus,
} from "lucide-react";
import { useMyWorkspaces } from "@/features/workspace/hooks/useWorkspace";

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen);
  const { data: workspaces = [] } = useMyWorkspaces();

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => dispatch(setSidebarOpen(false))}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 240 : 0,
          opacity: sidebarOpen ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "border-r bg-background overflow-hidden shrink-0",
          "fixed md:relative z-40 md:z-auto h-full md:h-auto",
          !sidebarOpen && "md:w-0"
        )}
      >
        <div className="w-60 h-full flex flex-col py-4 overflow-y-auto">
          {/* Logo */}
          <div className="px-4 mb-4 flex items-center justify-between">
            <Link href="/dashboard" className="font-bold text-lg">
              Flowspace
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 md:hidden"
              onClick={() => dispatch(setSidebarOpen(false))}
            >
              <ChevronLeft size={14} />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="px-2 space-y-1">
            <SidebarLink
              href="/dashboard"
              icon={<LayoutDashboard size={16} />}
              label="Dashboard"
              active={pathname === "/dashboard"}
            />
          </nav>

          {/* Workspaces */}
          <div className="mt-6 px-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Workspaces
              </p>
              <Button variant="ghost" size="icon" className="h-5 w-5" asChild>
                <Link href="/workspace/new">
                  <Plus size={12} />
                </Link>
              </Button>
            </div>
            <div className="space-y-0.5">
              {workspaces.map((workspace: any) => (
                <SidebarLink
                  key={workspace.id}
                  href={`/workspace/${workspace.id}`}
                  icon={
                    <span className="text-sm w-4 text-center">
                      {workspace.logo
                        ? workspace.name.charAt(0)
                        : workspace.name.charAt(0).toUpperCase()}
                    </span>
                  }
                  label={workspace.name}
                  active={pathname.startsWith(`/workspace/${workspace.id}`)}
                />
              ))}
              {workspaces.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 px-2">
                  Belum ada workspace
                </p>
              )}
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-auto px-2">
            <SidebarLink
              href="/profile"
              icon={<Settings size={16} />}
              label="Settings"
              active={pathname === "/profile"}
            />
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
```

---

## Step 6: Image Optimization

### `src/components/common/UserAvatar.tsx`

Buat wrapper Avatar yang menggunakan Next.js `Image` untuk gambar dari URL external:

```tsx
// src/components/common/UserAvatar.tsx
import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({
  src,
  name,
  size = 32,
  className,
}: UserAvatarProps) {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 font-medium text-muted-foreground",
        className
      )}
      style={{ width: size, height: size, fontSize: size / 3 }}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? "User avatar"}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          // Unoptimized untuk URL external yang tidak dikonfigurasi
          // Hapus ini kalau sudah setting domains di next.config.ts
        />
      ) : (
        <span>{initials ?? "?"}</span>
      )}
    </div>
  );
}
```

### Update `next.config.ts` untuk Image Domains

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google profile photos
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // GitHub avatars (kalau butuh)
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      // Tambahkan domain lain sesuai kebutuhan
    ],
  },
  // Bundle analyzer (diaktifkan via env var)
  ...(process.env.ANALYZE === "true" && {
    // Akan dikonfigurasi di Step 7
  }),
  experimental: {
    // Aktifkan server actions (sudah default di Next.js 15)
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
```

---

## Step 7: Bundle Analysis

### Install & Setup

```bash
npm install -D @next/bundle-analyzer
```

### Update `next.config.ts`

```typescript
// next.config.ts
import type { NextConfig } from "next";
import BundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: true,
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
```

### Cara pakai:

```bash
ANALYZE=true npm run build
```

Browser akan terbuka otomatis dengan visual bundle report. Cari:
- Package yang terlalu besar (hover untuk lihat ukuran)
- Duplikasi dependencies
- Komponent yang seharusnya lazy-loaded

---

## Step 8: Lazy Loading & Code Splitting

Untuk komponen berat seperti chart, lazy load mereka:

### Update import di DashboardView:

```tsx
// src/features/dashboard/components/DashboardView.tsx
import dynamic from "next/dynamic";

// Lazy load chart components — mereka besar dan tidak perlu di initial bundle
const DonutChart = dynamic(
  () =>
    import("./DonutChart").then((m) => ({ default: m.DonutChart })),
  {
    loading: () => (
      <div className="h-64 rounded-lg bg-muted animate-pulse" />
    ),
    ssr: false, // Recharts tidak support SSR
  }
);

const WeeklyBarChart = dynamic(
  () =>
    import("./WeeklyBarChart").then((m) => ({ default: m.WeeklyBarChart })),
  {
    loading: () => (
      <div className="h-64 rounded-lg bg-muted animate-pulse" />
    ),
    ssr: false,
  }
);
```

---

## Step 9: Responsive Design Checks

### Mobile-first checklist untuk setiap halaman:

Tambahkan komponen `MobileNav` untuk bottom navigation di mobile:

### `src/components/layout/MobileNav.tsx`

```tsx
// src/components/layout/MobileNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Bell, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

export function MobileNav() {
  const pathname = usePathname();
  const unreadCount = useAppSelector((s) => s.notification.unreadCount);

  const items = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    {
      href: "/notifications",
      icon: Bell,
      label: "Notifikasi",
      badge: unreadCount,
    },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-40 md:hidden">
      <div className="flex items-center justify-around h-14 px-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 relative",
              pathname === item.href
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon size={20} />
            <span className="text-[10px]">{item.label}</span>
            {item.badge ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-destructive text-destructive-foreground text-[9px] rounded-full flex items-center justify-center font-bold px-0.5">
                {item.badge > 9 ? "9+" : item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

Tambahkan ke dashboard layout:
```tsx
// src/app/(dashboard)/layout.tsx
import { MobileNav } from "@/components/layout/MobileNav";

// Di dalam JSX:
<main className="flex-1 overflow-y-auto pb-14 md:pb-0"> {/* pb-14 untuk mobile nav */}
  ...
</main>
<MobileNav />
```

---

## Step 10: Performance Monitoring dengan Web Vitals

### `src/app/web-vitals.tsx`

```tsx
// src/app/web-vitals.tsx (optional: untuk debug performance)
"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onLCP, onTTFB, onINP } from "web-vitals";

export function WebVitals() {
  useEffect(() => {
    // Log Core Web Vitals ke console (dev only)
    if (process.env.NODE_ENV === "development") {
      onCLS(console.log);
      onFCP(console.log);
      onLCP(console.log);
      onTTFB(console.log);
      onINP(console.log);
    }
  }, []);

  return null;
}
```

---

## Step 11: Tailwind Config Optimizations

### `tailwind.config.ts`

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Animasi custom
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## Common Pitfalls Fase 7

### ❌ Pitfall 1: Dark mode flicker saat pertama load

**Masalah:** Saat halaman pertama kali load, flash singkat dari light ke dark mode.

**Solusi:** Sudah ditangani dengan `suppressHydrationWarning` di `<html>` dan `disableTransitionOnChange` di ThemeProvider. Jangan tambahkan CSS transition untuk background-color di awal load.

---

### ❌ Pitfall 2: `AnimatePresence` tidak kerja

**Masalah:** Exit animation tidak tampil.

**Solusi:** `AnimatePresence` butuh `key` yang unik di setiap child untuk detect perubahan. Tanpa `key`, Framer Motion tidak tahu kapan komponen berganti.

---

### ❌ Pitfall 3: Infinite scroll infinite loop

**Masalah:** `loadMore` terus dipanggil berulang bahkan saat tidak scroll.

**Solusi:** Pastikan sentinel element hanya ter-intersect ketika user benar-benar scroll ke bawah. Tambahkan guard `hasNextPage && !isFetchingNextPage`:
```typescript
const loadMore = useCallback(() => {
  if (hasNextPage && !isFetchingNextPage) fetchNextPage();
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);
```

---

### ❌ Pitfall 4: Bundle size besar karena date-fns

**Masalah:** Import `import * as dateFns from 'date-fns'` mengimpor seluruh library.

**Solusi:** Selalu import fungsi spesifik:
```typescript
// ❌ Buruk
import * as dateFns from 'date-fns';

// ✅ Baik — tree-shakeable
import { format, startOfWeek, subWeeks } from 'date-fns';
```

---

### ❌ Pitfall 5: Next.js Image error untuk external URLs

**Masalah:** Error "hostname ... is not configured under images in your next.config.js".

**Solusi:** Tambahkan hostname ke `remotePatterns` di `next.config.ts`. Untuk development awal, bisa gunakan `unoptimized: true` sementara.

---

## Checklist Fase 7

- [ ] Dark mode toggle bekerja dan preference disimpan
- [ ] Tidak ada flash/flicker saat load pertama di dark mode
- [ ] Page transition mulus saat navigasi antar halaman
- [ ] Sidebar toggle bekerja di mobile
- [ ] Mobile nav muncul di bawah di layar kecil
- [ ] Infinite scroll load more task saat scroll ke bawah
- [ ] Skeleton loading muncul bukan spinner saat fetch
- [ ] `ANALYZE=true npm run build` membuka bundle report
- [ ] Lazy load chart components (tidak di initial bundle)
- [ ] Google OAuth avatar tampil dengan Next.js Image component

---

## Lanjut ke Fase 8

App sudah terasa polished dan responsive. Saatnya fokus ke **ketahanan app**: error boundaries, error.tsx, Sentry monitoring, dan proper async error handling.
