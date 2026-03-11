# G. Project: Admin Dashboard — Next.js App Router + TypeScript

> **Level:** Intermediate  
> **Estimasi waktu:** 8–12 jam  
> **Stack:** Next.js 14 App Router · TypeScript · TanStack Table · Recharts · Zustand · Tailwind CSS · shadcn/ui

---

## Overview

Kamu akan membangun sebuah **Admin Dashboard** yang realistis — lengkap dengan tabel data user yang bisa di-sort, filter, search, dan paginate; halaman analytics dengan grafik; role-based UI; dan skeleton loading yang proper.

Ini bukan tutorial "hello world". Setelah selesai, kamu punya template dashboard yang bisa langsung kamu pakai di project nyata.

### Apa yang akan kamu pelajari

- Menyusun layout dashboard yang scalable dengan App Router
- Mengelola state UI (sidebar, filter) dengan Zustand
- Membangun tabel data yang performa pakai TanStack Table
- Implementasi sorting, filtering, pagination, dan search dengan debounce
- Role-based UI yang clean tanpa `if-if` berserakan
- Visualisasi data dengan Recharts
- Skeleton loading yang tidak bikin user frustasi

---

## Wireframe Layout

```
┌─────────────────────────────────────────────────────────┐
│  HEADER                                    [User Avatar] │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  SIDEBAR     │  CONTENT AREA                            │
│              │                                          │
│  Dashboard   │  ┌─────────────────────────────────┐    │
│  Users ←     │  │  Page Title + Breadcrumb         │    │
│  Analytics   │  └─────────────────────────────────┘    │
│  Settings    │                                          │
│              │  ┌─────────────────────────────────┐    │
│  [Collapse]  │  │  Main Content (Table / Charts)   │    │
│              │  └─────────────────────────────────┘    │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

---

## Struktur Folder Project

```
admin-dashboard/
├── app/
│   ├── (dashboard)/              ← Route Group, pakai layout dashboard
│   │   ├── layout.tsx            ← Layout utama: Sidebar + Header + Content
│   │   ├── page.tsx              ← /  → redirect ke /users
│   │   ├── users/
│   │   │   └── page.tsx          ← Halaman Users
│   │   └── analytics/
│   │       └── page.tsx          ← Halaman Analytics
│   ├── globals.css
│   └── layout.tsx                ← Root layout
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── SidebarLink.tsx
│   ├── users/
│   │   ├── UsersTable.tsx        ← Komponen tabel utama
│   │   ├── UsersTableToolbar.tsx ← Search + Filter
│   │   ├── UsersTableColumns.tsx ← Definisi kolom TanStack Table
│   │   └── UserActionMenu.tsx    ← Dropdown aksi (edit/hapus/ubah role)
│   ├── analytics/
│   │   ├── StatCard.tsx
│   │   ├── UserGrowthChart.tsx
│   │   └── RoleDistributionChart.tsx
│   ├── ui/                       ← shadcn/ui components (auto-generated)
│   └── shared/
│       ├── SkeletonTable.tsx
│       ├── SkeletonCard.tsx
│       └── RoleGuard.tsx         ← Komponen role-based UI
│
├── hooks/
│   ├── useUsers.ts               ← Fetch + manage users data
│   └── useDebouncedValue.ts
│
├── lib/
│   ├── mock-data.ts              ← Data palsu buat development
│   └── utils.ts                  ← cn() + helper lainnya
│
├── stores/
│   └── ui-store.ts               ← Zustand store: sidebar, filter state
│
├── types/
│   └── index.ts                  ← Semua type definition
│
└── constants/
    └── navigation.ts             ← Item navigasi sidebar
```

---

## Step 1 — Setup Project

### Instalasi

```bash
npx create-next-app@latest admin-dashboard --typescript --tailwind --app --src-dir=false
cd admin-dashboard

# TanStack Table
npm install @tanstack/react-table

# Recharts
npm install recharts

# Zustand
npm install zustand

# shadcn/ui
npx shadcn@latest init
# Pilih: Default style, Slate color, yes untuk CSS variables

# Install komponen shadcn yang dibutuhkan
npx shadcn@latest add button input badge dropdown-menu
npx shadcn@latest add select skeleton sheet avatar
npx shadcn@latest add table card separator
```

### tsconfig.json — pastikan path alias aktif

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## Step 2 — Type Definitions

Buat semua tipe di satu tempat dulu biar konsisten.

```typescript
// types/index.ts

export type UserRole = "admin" | "user" | "guest";

export type UserStatus = "active" | "inactive" | "banned";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  registeredAt: string; // ISO date string
  avatarUrl?: string;
}

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface SortingState {
  id: string;
  desc: boolean;
}

export interface UsersFilterState {
  search: string;
  role: UserRole | "all";
  status: UserStatus | "all";
}

// Untuk analytics
export interface StatCardData {
  title: string;
  value: string | number;
  change: number; // persentase, bisa negatif
  description: string;
}

export interface UserGrowthData {
  month: string;
  users: number;
  newUsers: number;
}
```

---

## Step 3 — Mock Data

```typescript
// lib/mock-data.ts

import { User, UserGrowthData } from "@/types";

export const MOCK_USERS: User[] = [
  {
    id: "1",
    name: "Budi Santoso",
    email: "budi@example.com",
    role: "admin",
    status: "active",
    registeredAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "2",
    name: "Siti Aminah",
    email: "siti@example.com",
    role: "user",
    status: "active",
    registeredAt: "2024-02-20T10:30:00Z",
  },
  {
    id: "3",
    name: "Reza Pratama",
    email: "reza@example.com",
    role: "user",
    status: "inactive",
    registeredAt: "2024-03-05T14:15:00Z",
  },
  {
    id: "4",
    name: "Dewi Kusuma",
    email: "dewi@example.com",
    role: "guest",
    status: "active",
    registeredAt: "2024-03-18T09:00:00Z",
  },
  {
    id: "5",
    name: "Ahmad Fauzi",
    email: "ahmad@example.com",
    role: "admin",
    status: "active",
    registeredAt: "2024-04-01T11:00:00Z",
  },
  {
    id: "6",
    name: "Rina Wulandari",
    email: "rina@example.com",
    role: "user",
    status: "banned",
    registeredAt: "2024-04-10T16:45:00Z",
  },
  {
    id: "7",
    name: "Hendra Gunawan",
    email: "hendra@example.com",
    role: "user",
    status: "active",
    registeredAt: "2024-05-02T08:30:00Z",
  },
  {
    id: "8",
    name: "Maya Indah",
    email: "maya@example.com",
    role: "guest",
    status: "active",
    registeredAt: "2024-05-15T13:00:00Z",
  },
  {
    id: "9",
    name: "Doni Setiawan",
    email: "doni@example.com",
    role: "user",
    status: "inactive",
    registeredAt: "2024-06-01T07:00:00Z",
  },
  {
    id: "10",
    name: "Lina Marlina",
    email: "lina@example.com",
    role: "user",
    status: "active",
    registeredAt: "2024-06-20T12:00:00Z",
  },
  {
    id: "11",
    name: "Tono Hartono",
    email: "tono@example.com",
    role: "admin",
    status: "active",
    registeredAt: "2024-07-08T09:30:00Z",
  },
  {
    id: "12",
    name: "Yuni Astuti",
    email: "yuni@example.com",
    role: "user",
    status: "active",
    registeredAt: "2024-07-22T15:00:00Z",
  },
];

// Simulasi fetch dengan delay
export async function fetchUsers(): Promise<User[]> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return MOCK_USERS;
}

export async function fetchUserGrowth(): Promise<UserGrowthData[]> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return [
    { month: "Jan", users: 120, newUsers: 25 },
    { month: "Feb", users: 145, newUsers: 30 },
    { month: "Mar", users: 180, newUsers: 42 },
    { month: "Apr", users: 210, newUsers: 38 },
    { month: "Mei", users: 255, newUsers: 51 },
    { month: "Jun", users: 290, newUsers: 47 },
    { month: "Jul", users: 330, newUsers: 58 },
  ];
}
```

---

## Step 4 — Zustand Store

```typescript
// stores/ui-store.ts
"use client";

import { create } from "zustand";
import { UsersFilterState } from "@/types";

interface UIStore {
  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Users filter state (di-persist di store biar gak reset saat navigate)
  usersFilter: UsersFilterState;
  setUsersFilter: (filter: Partial<UsersFilterState>) => void;
  resetUsersFilter: () => void;
}

const DEFAULT_FILTER: UsersFilterState = {
  search: "",
  role: "all",
  status: "all",
};

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  usersFilter: DEFAULT_FILTER,
  setUsersFilter: (filter) =>
    set((state) => ({
      usersFilter: { ...state.usersFilter, ...filter },
    })),
  resetUsersFilter: () => set({ usersFilter: DEFAULT_FILTER }),
}));
```

---

## Step 5 — Layout Dashboard

### Constants navigasi

```typescript
// constants/navigation.ts
import { LayoutDashboard, Users, BarChart3, Settings } from "lucide-react";

export const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    adminOnly: false,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    adminOnly: false,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    adminOnly: true, // hanya admin
  },
] as const;
```

### Sidebar

```tsx
// components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { NAV_ITEMS } from "@/constants/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Di project nyata, ambil dari session/auth context
const CURRENT_USER_ROLE = "admin";

export function Sidebar() {
  const pathname = usePathname();
  const { isSidebarOpen, toggleSidebar } = useUIStore();

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || CURRENT_USER_ROLE === "admin"
  );

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-background transition-all duration-300",
        isSidebarOpen ? "w-60" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            A
          </div>
          {isSidebarOpen && (
            <span className="font-semibold text-sm whitespace-nowrap">
              AdminDashboard
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground"
              )}
              title={!isSidebarOpen ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {isSidebarOpen && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Toggle Button */}
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
```

### Header

```tsx
// components/layout/Header.tsx
"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Breadcrumb / Page Title bisa ditaruh di sini */}
      <div />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifikasi */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <Badge
            className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
            variant="destructive"
          >
            3
          </Badge>
        </Button>

        {/* Avatar + Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  BS
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-none">Budi Santoso</p>
                <p className="text-xs text-muted-foreground">admin</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

### Dashboard Layout

```tsx
// app/(dashboard)/layout.tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main
          className="flex-1 overflow-y-auto p-6"
          id="main-content"
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Root redirect

```tsx
// app/(dashboard)/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/users");
}
```

---

## Step 6 — Hook: useUsers

```typescript
// hooks/useUsers.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { User, UserRole, UserStatus } from "@/types";
import { fetchUsers } from "@/lib/mock-data";

export function useUsers() {
  const [data, setData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const users = await fetchUsers();
      setData(users);
    } catch {
      setError("Gagal memuat data user. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateUserRole = useCallback((userId: string, newRole: UserRole) => {
    setData((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    );
  }, []);

  const deleteUser = useCallback((userId: string) => {
    setData((prev) => prev.filter((user) => user.id !== userId));
  }, []);

  const updateUserStatus = useCallback(
    (userId: string, newStatus: UserStatus) => {
      setData((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
    },
    []
  );

  return {
    data,
    isLoading,
    error,
    refetch: loadUsers,
    updateUserRole,
    deleteUser,
    updateUserStatus,
  };
}
```

### Hook: useDebouncedValue

```typescript
// hooks/useDebouncedValue.ts
import { useState, useEffect } from "react";

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## Step 7 — Implementasi Tabel dengan TanStack Table

### Definisi Kolom

```tsx
// components/users/UsersTableColumns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { User, UserRole, UserStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { UserActionMenu } from "./UserActionMenu";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Install date-fns: npm install date-fns

function getRoleBadgeVariant(
  role: UserRole
): "default" | "secondary" | "outline" {
  const map = {
    admin: "default" as const,
    user: "secondary" as const,
    guest: "outline" as const,
  };
  return map[role];
}

function getStatusBadgeVariant(
  status: UserStatus
): "default" | "secondary" | "destructive" {
  const map = {
    active: "default" as const,
    inactive: "secondary" as const,
    banned: "destructive" as const,
  };
  return map[status];
}

interface CreateColumnsProps {
  onUpdateRole: (userId: string, role: UserRole) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateStatus: (userId: string, status: UserStatus) => void;
  currentUserRole: UserRole;
}

export function createColumns({
  onUpdateRole,
  onDeleteUser,
  onUpdateStatus,
  currentUserRole,
}: CreateColumnsProps): ColumnDef<User>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-label={`Sort by name ${column.getIsSorted() === "asc" ? "descending" : "ascending"}`}
        >
          Nama
          <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden="true" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-label={`Sort by email ${column.getIsSorted() === "asc" ? "descending" : "ascending"}`}
        >
          Email
          <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden="true" />
        </Button>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.getValue("role") as UserRole;
        return (
          <Badge variant={getRoleBadgeVariant(role)} className="capitalize">
            {role}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as UserStatus;
        return (
          <Badge
            variant={getStatusBadgeVariant(status)}
            className="capitalize"
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "registeredAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          aria-label={`Sort by registration date ${column.getIsSorted() === "asc" ? "descending" : "ascending"}`}
        >
          Tanggal Daftar
          <ArrowUpDown className="ml-2 h-3 w-3" aria-hidden="true" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("registeredAt"));
        return (
          <span className="text-muted-foreground text-sm">
            {format(date, "d MMM yyyy", { locale: id })}
          </span>
        );
      },
      sortingFn: "datetime",
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Aksi</span>,
      cell: ({ row }) => (
        <UserActionMenu
          user={row.original}
          onUpdateRole={onUpdateRole}
          onDeleteUser={onDeleteUser}
          onUpdateStatus={onUpdateStatus}
          currentUserRole={currentUserRole}
        />
      ),
    },
  ];
}
```

### Action Menu

```tsx
// components/users/UserActionMenu.tsx
"use client";

import { User, UserRole, UserStatus } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, Shield } from "lucide-react";

interface UserActionMenuProps {
  user: User;
  onUpdateRole: (userId: string, role: UserRole) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateStatus: (userId: string, status: UserStatus) => void;
  currentUserRole: UserRole;
}

const ROLES: UserRole[] = ["admin", "user", "guest"];
const STATUSES: UserStatus[] = ["active", "inactive", "banned"];

export function UserActionMenu({
  user,
  onUpdateRole,
  onDeleteUser,
  onUpdateStatus,
  currentUserRole,
}: UserActionMenuProps) {
  const isAdmin = currentUserRole === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Aksi untuk ${user.name}`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem>
          <Pencil className="mr-2 h-3 w-3" aria-hidden="true" />
          Edit User
        </DropdownMenuItem>

        {/* Ubah Role — hanya admin */}
        {isAdmin && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Shield className="mr-2 h-3 w-3" aria-hidden="true" />
              Ubah Role
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {ROLES.map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => onUpdateRole(user.id, role)}
                  className={user.role === role ? "font-medium" : ""}
                  aria-current={user.role === role ? "true" : undefined}
                >
                  <span className="capitalize">{role}</span>
                  {user.role === role && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      aktif
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Ubah Status — hanya admin */}
        {isAdmin && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => onUpdateStatus(user.id, status)}
                  className={user.status === status ? "font-medium" : ""}
                >
                  <span className="capitalize">{status}</span>
                  {user.status === status && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      saat ini
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}

        {/* Hapus — hanya admin */}
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteUser(user.id)}
            >
              <Trash2 className="mr-2 h-3 w-3" aria-hidden="true" />
              Hapus User
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Toolbar: Search + Filter

```tsx
// components/users/UsersTableToolbar.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUIStore } from "@/stores/ui-store";
import { Search, X } from "lucide-react";
import { UserRole, UserStatus } from "@/types";

export function UsersTableToolbar() {
  const { usersFilter, setUsersFilter, resetUsersFilter } = useUIStore();

  const hasActiveFilter =
    usersFilter.search !== "" ||
    usersFilter.role !== "all" ||
    usersFilter.status !== "all";

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder="Cari nama atau email..."
          value={usersFilter.search}
          onChange={(e) => setUsersFilter({ search: e.target.value })}
          className="pl-8"
          aria-label="Cari user berdasarkan nama atau email"
        />
      </div>

      {/* Filter Role */}
      <Select
        value={usersFilter.role}
        onValueChange={(value) =>
          setUsersFilter({ role: value as UserRole | "all" })
        }
      >
        <SelectTrigger className="w-36" aria-label="Filter berdasarkan role">
          <SelectValue placeholder="Semua Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Role</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="guest">Guest</SelectItem>
        </SelectContent>
      </Select>

      {/* Filter Status */}
      <Select
        value={usersFilter.status}
        onValueChange={(value) =>
          setUsersFilter({ status: value as UserStatus | "all" })
        }
      >
        <SelectTrigger className="w-36" aria-label="Filter berdasarkan status">
          <SelectValue placeholder="Semua Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="banned">Banned</SelectItem>
        </SelectContent>
      </Select>

      {/* Reset Filter */}
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetUsersFilter}
          className="text-muted-foreground"
          aria-label="Reset semua filter"
        >
          <X className="mr-1 h-3 w-3" aria-hidden="true" />
          Reset
        </Button>
      )}
    </div>
  );
}
```

### Komponen Tabel Utama

```tsx
// components/users/UsersTable.tsx
"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/hooks/useUsers";
import { useUIStore } from "@/stores/ui-store";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { createColumns } from "./UsersTableColumns";
import { UsersTableToolbar } from "./UsersTableToolbar";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { UserRole } from "@/types";

// Di project nyata, ambil dari session
const CURRENT_USER_ROLE: UserRole = "admin";

export function UsersTable() {
  const { data, isLoading, error, updateUserRole, deleteUser, updateUserStatus } =
    useUsers();

  const { usersFilter } = useUIStore();

  // Debounce input search supaya tidak trigger filter setiap keystroke
  const debouncedSearch = useDebouncedValue(usersFilter.search, 300);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo(
    () =>
      createColumns({
        onUpdateRole: updateUserRole,
        onDeleteUser: deleteUser,
        onUpdateStatus: updateUserStatus,
        currentUserRole: CURRENT_USER_ROLE,
      }),
    [updateUserRole, deleteUser, updateUserStatus]
  );

  // Filter data berdasarkan search (debounced) + role + status
  const filteredData = useMemo(() => {
    let result = data;

    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(lower) ||
          user.email.toLowerCase().includes(lower)
      );
    }

    if (usersFilter.role !== "all") {
      result = result.filter((user) => user.role === usersFilter.role);
    }

    if (usersFilter.status !== "all") {
      result = result.filter((user) => user.status === usersFilter.status);
    }

    return result;
  }, [data, debouncedSearch, usersFilter.role, usersFilter.status]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: false,
  });

  if (error) {
    return (
      <div
        className="rounded-md border border-destructive/50 bg-destructive/10 p-6 text-center"
        role="alert"
      >
        <p className="text-destructive font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <UsersTableToolbar />

      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : (
        <>
          {/* Info hasil */}
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Menampilkan{" "}
            <strong>
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
              –
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                filteredData.length
              )}
            </strong>{" "}
            dari <strong>{filteredData.length}</strong> user
          </p>

          {/* Tabel */}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Tidak ada user yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Baris per halaman:</span>
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger className="h-8 w-16" aria-label="Baris per halaman">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Halaman {table.getState().pagination.pageIndex + 1} dari{" "}
                {table.getPageCount()}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Step 8 — Halaman Users

```tsx
// app/(dashboard)/users/page.tsx
import { UsersTable } from "@/components/users/UsersTable";

export const metadata = {
  title: "Users — Admin Dashboard",
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">
          Kelola semua user terdaftar di sistem.
        </p>
      </div>
      <UsersTable />
    </div>
  );
}
```

---

## Step 9 — Skeleton Loading

```tsx
// components/shared/SkeletonTable.tsx
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 5, cols = 5 }: SkeletonTableProps) {
  return (
    <div className="rounded-md border overflow-hidden" aria-busy="true" aria-label="Memuat data...">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b bg-muted/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 px-4 py-3 border-b last:border-0"
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className="h-4 flex-1"
              style={{ opacity: 1 - rowIndex * 0.07 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

```tsx
// components/shared/SkeletonCard.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SkeletonCard() {
  return (
    <Card aria-busy="true" aria-label="Memuat...">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
```

---

## Step 10 — Role-Based UI

```tsx
// components/shared/RoleGuard.tsx
"use client";

import { UserRole } from "@/types";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  currentRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Render children hanya jika currentRole ada di allowedRoles.
 * Gunakan fallback untuk tampilkan pesan alternatif atau null.
 */
export function RoleGuard({
  allowedRoles,
  currentRole,
  children,
  fallback = null,
}: RoleGuardProps) {
  if (!allowedRoles.includes(currentRole)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
```

**Cara pakai:**

```tsx
// Hanya admin yang bisa lihat tombol ini
<RoleGuard allowedRoles={["admin"]} currentRole={currentUserRole}>
  <Button variant="destructive" onClick={handleDeleteAll}>
    Hapus Semua
  </Button>
</RoleGuard>

// Admin dan user bisa lihat, guest tidak
<RoleGuard
  allowedRoles={["admin", "user"]}
  currentRole={currentUserRole}
  fallback={<p className="text-muted-foreground text-sm">
    Upgrade akun untuk mengakses fitur ini.
  </p>}
>
  <ExportButton />
</RoleGuard>
```

---

## Step 11 — Halaman Analytics

### StatCard

```tsx
// components/analytics/StatCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCardData } from "@/types";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  data: StatCardData;
}

export function StatCard({ data }: StatCardProps) {
  const isPositive = data.change >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {data.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-3xl font-bold">{data.value}</p>
        <div className="flex items-center gap-1 text-sm">
          {isPositive ? (
            <TrendingUp
              className="h-4 w-4 text-emerald-500"
              aria-hidden="true"
            />
          ) : (
            <TrendingDown
              className="h-4 w-4 text-destructive"
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              "font-medium",
              isPositive ? "text-emerald-500" : "text-destructive"
            )}
            aria-label={`${isPositive ? "Naik" : "Turun"} ${Math.abs(data.change)}%`}
          >
            {isPositive ? "+" : ""}
            {data.change}%
          </span>
          <span className="text-muted-foreground">{data.description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
```

### User Growth Chart

```tsx
// components/analytics/UserGrowthChart.tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { UserGrowthData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UserGrowthChartProps {
  data: UserGrowthData[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pertumbuhan User</CardTitle>
      </CardHeader>
      <CardContent>
        {/* aria-label deskriptif untuk screen reader */}
        <div
          role="img"
          aria-label="Grafik garis menampilkan pertumbuhan total user dan user baru per bulan"
          className="h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                name="Total User"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="newUsers"
                name="User Baru"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                dot={{ r: 4 }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Role Distribution Chart

```tsx
// components/analytics/RoleDistributionChart.tsx
"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RoleDistributionChartProps {
  data: { name: string; value: number }[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
];

export function RoleDistributionChart({ data }: RoleDistributionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribusi Role</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          role="img"
          aria-label={`Diagram pie distribusi role: ${data.map((d) => `${d.name} ${d.value}`).join(", ")}`}
          className="h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Halaman Analytics

```tsx
// app/(dashboard)/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/analytics/StatCard";
import { UserGrowthChart } from "@/components/analytics/UserGrowthChart";
import { RoleDistributionChart } from "@/components/analytics/RoleDistributionChart";
import { SkeletonCard } from "@/components/shared/SkeletonCard";
import { fetchUserGrowth, fetchUsers } from "@/lib/mock-data";
import { StatCardData, UserGrowthData, User } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

const STAT_CARDS: StatCardData[] = [
  {
    title: "Total Users",
    value: "1,240",
    change: 12.5,
    description: "dari bulan lalu",
  },
  {
    title: "User Aktif",
    value: "987",
    change: 8.2,
    description: "dari bulan lalu",
  },
  {
    title: "User Baru (bulan ini)",
    value: "58",
    change: -3.1,
    description: "dari bulan lalu",
  },
  {
    title: "User Banned",
    value: "12",
    change: 0,
    description: "tidak ada perubahan",
  },
];

export default function AnalyticsPage() {
  const [growthData, setGrowthData] = useState<UserGrowthData[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchUserGrowth(), fetchUsers()]).then(
      ([growth, userList]) => {
        setGrowthData(growth);
        setUsers(userList);
        setIsLoading(false);
      }
    );
  }, []);

  const roleDistribution = ["admin", "user", "guest"].map((role) => ({
    name: role.charAt(0).toUpperCase() + role.slice(1),
    value: users.filter((u) => u.role === role).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Ringkasan data dan tren platform.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : STAT_CARDS.map((card, i) => <StatCard key={i} data={card} />)}
      </div>

      {/* Charts */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Skeleton className="h-[380px] w-full rounded-lg" />
          </div>
          <Skeleton className="h-[380px] w-full rounded-lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <UserGrowthChart data={growthData} />
          </div>
          <RoleDistributionChart data={roleDistribution} />
        </div>
      )}
    </div>
  );
}
```

---

## Tips Performa Tabel dengan Data Banyak

### 1. Gunakan `useMemo` untuk kolom dan data terfilter

```tsx
// JANGAN begini — kolom di-recreate setiap render
const columns = createColumns({ ... }); // ❌

// Lakukan ini
const columns = useMemo(() => createColumns({ ... }), [dep1, dep2]); // ✅
```

### 2. Debounce search, jangan filter langsung

```tsx
// Filter langsung — trigger re-render tiap keystroke ❌
const filtered = data.filter(u => u.name.includes(search));

// Debounce dulu ✅
const debouncedSearch = useDebouncedValue(search, 300);
const filtered = useMemo(
  () => data.filter(u => u.name.includes(debouncedSearch)),
  [data, debouncedSearch]
);
```

### 3. Virtual scrolling untuk 1000+ baris

Kalau data kamu bisa mencapai ribuan baris, pagination saja tidak cukup. Gunakan **TanStack Virtual**:

```bash
npm install @tanstack/react-virtual
```

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

const rowVirtualizer = useVirtualizer({
  count: table.getRowModel().rows.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 48, // estimasi tinggi baris dalam px
  overscan: 10,
});
```

### 4. Server-side pagination untuk dataset besar

Kalau data dari API dan ada ribuan records, pindahkan sorting + filtering + pagination ke server:

```tsx
const table = useReactTable({
  data,
  columns,
  manualPagination: true,   // ← ini
  manualSorting: true,      // ← dan ini
  manualFiltering: true,    // ← dan ini
  pageCount: totalPages,    // dari server
  state: { pagination, sorting },
  onPaginationChange: (updater) => {
    // Trigger API call dengan parameter baru
    const newState = typeof updater === "function"
      ? updater(pagination)
      : updater;
    router.push(`?page=${newState.pageIndex + 1}&size=${newState.pageSize}`);
  },
});
```

### 5. Hindari anonymous function di cell renderer

```tsx
// Setiap render, function baru dibuat ❌
cell: ({ row }) => <button onClick={() => doSomething(row.id)}>Aksi</button>

// Pisahkan ke komponen terpisah dengan useCallback ✅
cell: ({ row }) => <ActionButton userId={row.id} onAction={handleAction} />
```

### 6. `React.memo` untuk row yang tidak berubah

Kalau baris tabel tidak sering berubah, wrap `TableRow` dengan `React.memo` supaya tidak re-render saat parent update.

---

## Checklist Aksesibilitas Tabel

### Struktur HTML

- [ ] Gunakan elemen `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` yang semantic
- [ ] Setiap `<th>` punya `scope="col"` atau `scope="row"` yang tepat
- [ ] Tabel punya `<caption>` atau `aria-label` / `aria-labelledby`

### Sorting

- [ ] Tombol sort punya `aria-label` yang mendeskripsikan aksi: `"Sort by Name ascending"`
- [ ] Kolom yang sedang di-sort punya `aria-sort="ascending"` atau `aria-sort="descending"` pada `<th>`

### Navigasi Keyboard

- [ ] Semua aksi bisa dilakukan dengan keyboard (Tab, Enter, Space, Arrow keys)
- [ ] Urutan focus logis dan tidak menjebak user
- [ ] Dropdown menu bisa ditutup dengan Escape

### Loading State

- [ ] Skeleton/loading area punya `aria-busy="true"` dan `aria-label` deskriptif
- [ ] Setelah data load, `aria-live="polite"` memberi tahu screen reader

### Filter dan Search

- [ ] Setiap input/select punya `<label>` eksplisit atau `aria-label`
- [ ] Hasil filter (jumlah data yang ditampilkan) diumumkan via `aria-live="polite"`

### Aksi

- [ ] Tombol aksi (edit, hapus) punya `aria-label` yang spesifik: `"Edit user Budi Santoso"`
- [ ] Konfirmasi hapus menggunakan dialog dengan focus management yang benar

### Warna dan Kontras

- [ ] Badge status tidak hanya mengandalkan warna — punya teks label juga
- [ ] Kontras warna memenuhi WCAG AA minimum (4.5:1 untuk teks normal)

### Error dan Empty State

- [ ] Error ditampilkan dengan `role="alert"` supaya langsung diumumkan
- [ ] Empty state punya pesan yang informatif (bukan cuma "No data")

---

## Hasil Akhir

Setelah selesai, kamu punya:

```
✅ Dashboard layout yang collapsible dan responsive
✅ Tabel users dengan sorting multi-kolom
✅ Filter by role dan status yang persist saat navigate
✅ Search dengan debounce 300ms
✅ Pagination dengan page size configurable
✅ Aksi edit/hapus/ubah role (role-based)
✅ Halaman analytics dengan stat cards + 2 grafik
✅ Skeleton loading di semua area yang fetch data
✅ Komponen RoleGuard yang reusable
✅ Arsitektur Zustand yang clean untuk UI state
```

---

## Langkah Selanjutnya

Setelah project ini selesai, tantang diri kamu:

1. **Tambah real auth** — integrasikan NextAuth.js dan baca role dari session
2. **Server-side pagination** — connect ke API nyata dengan URL params sebagai state
3. **Baris yang bisa dipilih** — tambah checkbox di setiap baris untuk bulk actions
4. **Export ke CSV** — bisa pakai library `papaparse` atau `xlsx`
5. **Dark mode** — shadcn/ui + Tailwind sudah support ini dengan mudah
6. **Test** — tulis unit test untuk `useDebouncedValue` dan integration test untuk filter logic
