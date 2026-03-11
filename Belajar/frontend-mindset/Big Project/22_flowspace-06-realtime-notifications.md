# Flowspace — Fase 6: Optimistic Updates & Notifikasi

> **Fase ini menghasilkan:** Optimistic updates yang membuat app terasa instan, sistem notifikasi in-app (assign task, komentar baru), toast notifications, dan badge notifikasi di navbar.

---

## Gambaran Besar

Di fase ini kita perfeksi UX dengan dua hal:

1. **Optimistic Updates** — UI berubah langsung tanpa tunggu server. Kalau gagal, rollback otomatis.
2. **Notifikasi in-app** — Notifikasi yang tersimpan di DB dan bisa dibaca user.

```
User tambah task
  → UI langsung tampil task baru (optimistic)
  → Server action jalan di background
  → Kalau sukses: metan, sync data dari server
  → Kalau gagal: rollback + toast error

User di-assign ke task
  → Notifikasi ter-create di DB (dari server action)
  → Navbar badge +1
  → User klik bell → lihat list notifikasi
```

---

## Step 1: Install Dependencies

```bash
npm install react-hot-toast
```

---

## Step 2: Setup Toast Provider

### `src/app/layout.tsx` (tambahkan Toaster)

```tsx
// src/app/layout.tsx
import { Toaster } from "react-hot-toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        {children}
        {/* Toast notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "8px",
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
            },
            success: {
              iconTheme: {
                primary: "hsl(var(--primary))",
                secondary: "white",
              },
            },
            error: {
              iconTheme: {
                primary: "hsl(var(--destructive))",
                secondary: "white",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
```

---

## Step 3: Optimistic Update untuk Create Task

Kita sudah punya basic mutation di Fase 4. Sekarang kita tambahkan **optimistic update** penuh:

### `src/features/task/hooks/useTasks.ts` (update dengan optimistic create)

```typescript
// Tambahkan ke src/features/task/hooks/useTasks.ts

// ── Create Task dengan Optimistic Update ─────────────────────────────
export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      data,
      currentUser,
    }: {
      data: CreateTaskFormData;
      currentUser: { id: string; name: string | null; image: string | null };
    }) => {
      const result = await createTaskAction(projectId, data);
      if (result?.error) throw new Error(result.error);
      return result;
    },

    onMutate: async ({ data, currentUser }) => {
      // 1. Batalkan query yang berjalan
      await queryClient.cancelQueries({
        queryKey: taskKeys.byProject(projectId),
      });

      // 2. Simpan state lama
      const previousData = queryClient.getQueriesData({
        queryKey: taskKeys.byProject(projectId),
      });

      // 3. Buat temporary task dengan ID sementara
      const tempTask: TaskWithRelations = {
        id: `temp-${Date.now()}`, // ID sementara
        title: data.title,
        description: data.description ?? null,
        status: (data.status as TaskWithRelations["status"]) ?? "TODO",
        priority: (data.priority as TaskWithRelations["priority"]) ?? "MEDIUM",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        projectId,
        assigneeId: data.assigneeId ?? null,
        creatorId: currentUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: currentUser,
        assignee: null, // Akan di-resolve setelah sync dengan server
        _count: { comments: 0 },
      };

      // 4. Tambahkan ke semua query cache yang match
      queryClient.setQueriesData(
        { queryKey: taskKeys.byProject(projectId) },
        (old: TaskWithRelations[] | undefined) => {
          if (!old) return [tempTask];
          return [tempTask, ...old];
        }
      );

      return { previousData };
    },

    onError: (error, variables, context) => {
      // Rollback
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message || "Gagal membuat task");
    },

    onSuccess: () => {
      toast.success("Task berhasil dibuat!");
    },

    onSettled: () => {
      // Sync dengan data server yang sebenarnya
      queryClient.invalidateQueries({
        queryKey: taskKeys.byProject(projectId),
      });
    },
  });
}
```

---

## Step 4: Redux Slice untuk UI & Notifications

### `src/store/slices/uiSlice.ts`

```typescript
// src/store/slices/uiSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  // Sidebar state (buka/tutup)
  sidebarOpen: boolean;
  // Modal state (global — untuk modal yang dimuat dari mana saja)
  activeModal: string | null;
  activeModalData: unknown;
}

const initialState: UIState = {
  sidebarOpen: true,
  activeModal: null,
  activeModalData: null,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    openModal: (state, action: PayloadAction<{ id: string; data?: unknown }>) => {
      state.activeModal = action.payload.id;
      state.activeModalData = action.payload.data ?? null;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.activeModalData = null;
    },
  },
});

export const { toggleSidebar, setSidebarOpen, openModal, closeModal } =
  uiSlice.actions;
```

### `src/store/slices/notificationSlice.ts`

```typescript
// src/store/slices/notificationSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "task_assigned" | "comment_added" | "mention";
  isRead: boolean;
  createdAt: string;
  link: string; // URL untuk navigate saat notifikasi diklik
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isOpen: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isOpen: false,
};

export const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    setNotifications: (
      state,
      action: PayloadAction<NotificationItem[]>
    ) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.isRead).length;
    },
    markAllAsRead: (state) => {
      state.notifications = state.notifications.map((n) => ({
        ...n,
        isRead: true,
      }));
      state.unreadCount = 0;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(
        (n) => n.id === action.payload
      );
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    toggleNotificationPanel: (state) => {
      state.isOpen = !state.isOpen;
    },
    closeNotificationPanel: (state) => {
      state.isOpen = false;
    },
  },
});

export const {
  setNotifications,
  markAllAsRead,
  markAsRead,
  toggleNotificationPanel,
  closeNotificationPanel,
} = notificationSlice.actions;
```

### `src/store/index.ts`

```typescript
// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { uiSlice } from "./slices/uiSlice";
import { notificationSlice } from "./slices/notificationSlice";

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    notification: notificationSlice.reducer,
  },
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### `src/store/hooks.ts`

```typescript
// src/store/hooks.ts
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./index";

// Typed hooks — SELALU pakai ini, bukan useDispatch/useSelector langsung
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### `src/components/providers/StoreProvider.tsx`

```tsx
// src/components/providers/StoreProvider.tsx
"use client";

import { Provider } from "react-redux";
import { store } from "@/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

---

## Step 5: Notification System

### Server Action untuk Buat Notifikasi

Kita tambahkan notifikasi generator ke task actions:

```typescript
// Tambahkan ke src/features/task/actions/task.actions.ts

// ── Helper: buat notifikasi ───────────────────────────────────────────
async function createNotification(params: {
  userId: string;   // Penerima notifikasi
  title: string;
  message: string;
  type: "TASK_ASSIGNED" | "COMMENT_ADDED";
  link: string;
}) {
  await db.notification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link,
    },
  });
}

// Modifikasi createTaskAction — tambahkan notifikasi saat task di-assign
export async function createTaskAction(
  projectId: string,
  formData: unknown
) {
  // ... (kode existing)

  const task = await db.task.create({ /* ... */ });

  // Kirim notifikasi ke assignee kalau ada dan bukan diri sendiri
  if (parsed.data.assigneeId && parsed.data.assigneeId !== session.user.id) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { name: true, workspaceId: true },
    });

    await createNotification({
      userId: parsed.data.assigneeId,
      title: "Task baru di-assign ke kamu",
      message: `"${parsed.data.title}" di project ${project?.name}`,
      type: "TASK_ASSIGNED",
      link: `/workspace/${project?.workspaceId}/projects/${projectId}`,
    });
  }

  return { success: true, task };
}

// Modifikasi addCommentAction — notifikasi ke creator task
export async function addCommentAction(taskId: string, formData: unknown) {
  // ... (kode existing)

  const comment = await db.taskComment.create({ /* ... */ });

  // Ambil info task dan creator
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: {
      creator: { select: { id: true, name: true } },
      project: { select: { name: true, workspaceId: true } },
    },
  });

  // Notifikasi ke creator task (kalau bukan yang comment = creator sendiri)
  if (task && task.creatorId !== session.user.id) {
    await createNotification({
      userId: task.creatorId,
      title: "Komentar baru di task kamu",
      message: `${session.user.name} mengomentari "${task.title}"`,
      type: "COMMENT_ADDED",
      link: `/workspace/${task.project.workspaceId}/projects/${task.projectId}`,
    });
  }

  return { success: true };
}
```

### API Route untuk Notifications

### `src/app/api/notifications/route.ts`

```typescript
// src/app/api/notifications/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: Ambil notifikasi user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20, // Ambil 20 notifikasi terbaru
  });

  return NextResponse.json(notifications);
}

// PATCH: Mark semua sebagai read
export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.notification.updateMany({
    where: {
      userId: session.user.id,
      isRead: false,
    },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
```

---

## Step 6: Custom Hook useNotifications

### `src/features/notification/hooks/useNotifications.ts`

```typescript
// src/features/notification/hooks/useNotifications.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  setNotifications,
  markAllAsRead as markAllAsReadAction,
} from "@/store/slices/notificationSlice";
import { useAppDispatch } from "@/store/hooks";
import { useEffect } from "react";

const notificationKeys = {
  all: ["notifications"] as const,
};

export function useNotifications() {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: notificationKeys.all,
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Gagal memuat notifikasi");
      return res.json();
    },
    // Poll setiap 30 detik untuk "pseudo-realtime"
    // Kamu bisa ganti dengan SSE atau WebSocket di production
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
  });

  // Sync ke Redux store saat data berubah
  useEffect(() => {
    if (notifications.length > 0) {
      dispatch(setNotifications(notifications));
    }
  }, [notifications, dispatch]);

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications", { method: "PATCH" });
    },
    onSuccess: () => {
      dispatch(markAllAsReadAction());
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });

  return {
    notifications,
    isLoading,
    markAllRead: markAllRead.mutate,
  };
}
```

---

## Step 7: NotificationBell Component

### `src/features/notification/components/NotificationBell.tsx`

```tsx
// src/features/notification/components/NotificationBell.tsx
"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationList } from "./NotificationList";
import { useAppSelector } from "@/store/hooks";
import { useNotifications } from "../hooks/useNotifications";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useAppSelector((state) => state.notification);
  const { notifications, markAllRead } = useNotifications();

  function handleOpen(open: boolean) {
    setIsOpen(open);
    // Auto mark all as read saat buka panel
    if (open && unreadCount > 0) {
      setTimeout(() => markAllRead(), 1000); // Delay 1 detik
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
        >
          <Bell size={18} />
          {/* Unread badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className={cn(
                  "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px]",
                  "bg-destructive text-destructive-foreground text-[10px]",
                  "rounded-full flex items-center justify-center font-bold px-1"
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        <NotificationList
          notifications={notifications}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
```

### `src/features/notification/components/NotificationList.tsx`

```tsx
// src/features/notification/components/NotificationList.tsx
"use client";

import { Bell, CheckCheck, MessageSquare, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAppDispatch } from "@/store/hooks";
import { markAsRead } from "@/store/slices/notificationSlice";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  link: string;
}

interface NotificationListProps {
  notifications: Notification[];
  onClose?: () => void;
}

const NOTIFICATION_ICONS = {
  TASK_ASSIGNED: <UserCheck size={14} className="text-blue-500" />,
  COMMENT_ADDED: <MessageSquare size={14} className="text-green-500" />,
};

export function NotificationList({
  notifications,
  onClose,
}: NotificationListProps) {
  const dispatch = useAppDispatch();

  function handleClick(notificationId: string) {
    dispatch(markAsRead(notificationId));
    onClose?.();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell size={16} />
          <span className="font-semibold text-sm">Notifikasi</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {notifications.filter((n) => !n.isRead).length} belum dibaca
        </span>
      </div>

      {/* Notification List */}
      <ScrollArea className="max-h-[360px]">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Tidak ada notifikasi</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.link}
                onClick={() => handleClick(notification.id)}
              >
                <div
                  className={cn(
                    "flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    !notification.isRead && "bg-primary/5"
                  )}
                >
                  {/* Icon */}
                  <div className="mt-0.5 shrink-0">
                    {NOTIFICATION_ICONS[
                      notification.type as keyof typeof NOTIFICATION_ICONS
                    ] ?? <Bell size={14} />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm",
                        !notification.isRead && "font-medium"
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatRelativeDate(notification.createdAt)}
                    </p>
                  </div>

                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

---

## Step 8: Navbar dengan Notification Bell

### `src/components/layout/Navbar.tsx`

```tsx
// src/components/layout/Navbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/features/notification/components/NotificationBell";
import { logoutAction } from "@/features/auth/actions/auth.actions";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleSidebar } from "@/store/slices/uiSlice";
import { Menu, LogOut, User, Settings } from "lucide-react";

export function Navbar() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur sticky top-0 z-40 flex items-center px-4 gap-4">
      {/* Sidebar toggle (mobile) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => dispatch(toggleSidebar())}
      >
        <Menu size={18} />
      </Button>

      {/* Logo / Brand */}
      <Link href="/dashboard" className="font-bold text-lg hidden md:block">
        Flowspace
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image ?? undefined} />
                <AvatarFallback className="text-sm">
                  {user?.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User size={14} className="mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logoutAction()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut size={14} className="mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

---

## Step 9: Prisma Schema Update (Notification Model)

Pastikan model `Notification` sudah ada di schema (sudah kita definisikan di Fase 1, tapi ini untuk konfirmasi):

```prisma
// Sudah ada di prisma/schema.prisma (Fase 1)
model Notification {
  id        String   @id @default(cuid())
  userId    String
  title     String
  message   String
  type      String   // "TASK_ASSIGNED" | "COMMENT_ADDED"
  isRead    Boolean  @default(false)
  link      String   // URL to navigate
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notifications")
}
```

Kalau belum ada, tambahkan ke schema dan jalankan:
```bash
npx prisma migrate dev --name add_notifications
```

---

## Step 10: Providers di Dashboard Layout

### `src/app/(dashboard)/layout.tsx`

```tsx
// src/app/(dashboard)/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SessionProvider } from "next-auth/react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <SessionProvider session={session}>
      <StoreProvider>
        <QueryProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Navbar />
              <main className="flex-1 overflow-y-auto bg-background">
                {children}
              </main>
            </div>
          </div>
        </QueryProvider>
      </StoreProvider>
    </SessionProvider>
  );
}
```

### `src/components/providers/QueryProvider.tsx`

```tsx
// src/components/providers/QueryProvider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Buat QueryClient di dalam useState agar tidak shared antar requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 menit default
            retry: 1,
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

## Common Pitfalls Fase 6

### ❌ Pitfall 1: Optimistic update muncul dua kali

**Masalah:** Task muncul dua kali sesaat — sekali dari optimistic, sekali setelah server sync.

**Solusi:** Selalu gunakan `temp-` prefix untuk ID sementara, dan `onSettled` akan `invalidateQueries` yang menggantikan data dengan data dari server (termasuk ID real).

---

### ❌ Pitfall 2: Redux state tidak sync dengan server

**Masalah:** Unread count di Redux tidak sesuai dengan data di database.

**Solusi:** Selalu sync Redux dari TanStack Query data (bukan sebaliknya). TanStack Query adalah sumber kebenaran untuk server state, Redux hanya untuk UI state.

---

### ❌ Pitfall 3: Polling terlalu agresif

**Masalah:** `refetchInterval: 5000` (5 detik) terlalu sering, membebani server.

**Solusi:** Untuk notifikasi, 30 detik sudah cukup. Untuk production yang butuh real-time sejati, gunakan Server-Sent Events (SSE) atau WebSocket.

---

### ❌ Pitfall 4: Toast muncul saat rollback tapi tidak informatif

**Masalah:** User melihat toast "Gagal" tanpa tahu apa yang harus dilakukan.

**Solusi:** Berikan pesan error yang actionable:
```typescript
toast.error("Gagal memperbarui task. Koneksi terputus — coba lagi?");
```

---

## Checklist Fase 6

- [ ] Toast muncul saat create/delete task berhasil/gagal
- [ ] Task baru muncul di board sesaat setelah submit (optimistic)
- [ ] Kalau server action gagal, task hilang dari board (rollback)
- [ ] Notifikasi muncul di bell icon saat di-assign ke task
- [ ] Badge angka di bell icon menampilkan jumlah notifikasi belum dibaca
- [ ] Klik bell icon membuka popover dengan list notifikasi
- [ ] Buka popover → notifikasi auto mark as read setelah 1 detik
- [ ] Klik notifikasi → navigate ke halaman yang relevan
- [ ] Navbar tampil dengan benar di desktop dan mobile

---

## Lanjut ke Fase 7

App sudah terasa responsif dan interaktif. Sekarang kita keluar polish ke level production: **infinite scroll, skeleton loading, dark mode, dan page transitions**.
