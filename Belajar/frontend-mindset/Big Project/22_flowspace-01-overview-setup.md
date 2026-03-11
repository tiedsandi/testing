# Flowspace — Fase 1: Overview, Setup & Foundation

> **Gaya baca:** Santai, tapi serius. Ini bukan tutorial "hello world" — ini production app yang sesungguhnya. Kita bakal bikin app yang bisa kamu pajang di portfolio dan bilang "ini buatan gue sendiri dari nol."

---

## Apa Itu Flowspace?

**Flowspace** adalah productivity app berbasis web untuk manajemen workspace, project, dan task — mirip Notion + Linear tapi lebih fokus ke task management. User bisa:

- Bikin workspace (satu perusahaan/tim = satu workspace)
- Bikin multiple projects dalam workspace
- Manage task dengan status, priority, assignee, due date
- Kolaborasi dengan anggota tim
- Lihat dashboard analytics progress pekerjaan

---

## Kenapa Tech Stack Ini?

Sebelum nulis satu baris kode pun, kita harus paham *kenapa* kita pilih setiap tool. Senior dev selalu bisa justify pilihan teknologi mereka.

### Next.js 15 App Router
- **Kenapa bukan Vite/CRA?** Karena kita butuh SSR untuk performance, SEO tidak terlalu penting tapi loading speed sangat penting. App Router ngasih kita Server Components = lebih sedikit JS yang dikirim ke browser.
- **Kenapa bukan Next.js 14?** Next 15 lebih stabil dengan React 19 features.

### Auth.js v5
- **Kenapa bukan implementasi manual?** Security itu susah. Auth.js sudah handle CSRF, session management, OAuth flow. Fokus kita ke bisnis logic, bukan auth plumbing.
- **Kenapa v5?** v5 adalah versi yang support App Router secara native. v4 masih Pages Router mindset.

### TanStack Query v5
- **Kenapa perlu ini di Next.js?** Server Components itu bagus untuk initial load, tapi untuk interaktivitas (tambah task, update status), kita butuh client-side data management. TanStack Query ngasih caching, invalidation, optimistic updates yang sangat powerful.

### Redux Toolkit + Zustand
- **Kenapa dua state manager?** Mereka untuk hal berbeda:
  - **Redux Toolkit** → global UI state yang kompleks (modal state, sidebar state, notification state, sesuatu yang banyak komponen akses)
  - **Zustand** → lightweight state yang lebih lokal tapi perlu persist atau share (filter task, preferences)
- **Kenapa bukan Redux saja?** Zustand lebih ringan untuk state sederhana. Redux untuk yang complex dengan DevTools support yang baik.

### React Hook Form + Zod
- **Kenapa bukan state biasa?** Form yang dikelola dengan `useState` itu performance nightmare untuk form besar. RHF tidak re-render komponen saat user mengetik.
- **Kenapa Zod?** Type-safe validation dari database sampai UI. Satu schema untuk server dan client.

### Prisma + SQLite/PostgreSQL
- **Kenapa Prisma?** Type-safe database queries. Auto-complete di IDE. Migration yang manageable.
- **Kenapa SQLite untuk dev?** Zero setup, file-based, perfect untuk development. Swap ke PostgreSQL di production tanpa ubah satu baris query pun.

### Tailwind CSS + shadcn/ui
- **Kenapa Tailwind?** Utility-first = lebih cepat iterate. Tidak ada naming convention CSS yang harus dipikirkan.
- **Kenapa shadcn/ui?** Bukan library — ini komponen yang kamu copy ke kode kamu sendiri. Fully customizable, tidak ada dependency hell.

---

## Arsitektur Folder (Feature-Based)

```
flowspace/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed data untuk development
│   └── migrations/            # Auto-generated migrations
│
├── public/
│   ├── images/
│   └── icons/
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Route group: no layout
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/       # Route group: main layout
│   │   │   ├── layout.tsx     # Dashboard layout (sidebar + navbar)
│   │   │   ├── page.tsx       # Home: redirect ke workspace
│   │   │   ├── workspace/
│   │   │   │   └── [workspaceId]/
│   │   │   │       ├── page.tsx           # Workspace dashboard
│   │   │   │       ├── settings/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── projects/
│   │   │   │           └── [projectId]/
│   │   │   │               ├── page.tsx   # Project task board
│   │   │   │               └── settings/
│   │   │   │                   └── page.tsx
│   │   │   └── profile/
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── workspaces/
│   │   │   │   └── route.ts
│   │   │   ├── projects/
│   │   │   │   └── route.ts
│   │   │   └── upload/
│   │   │       └── route.ts
│   │   │
│   │   ├── layout.tsx         # Root layout
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   └── global-error.tsx
│   │
│   ├── components/            # Shared/reusable components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── common/
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── SkeletonCard.tsx
│   │   └── providers/
│   │       ├── QueryProvider.tsx
│   │       ├── StoreProvider.tsx
│   │       └── ThemeProvider.tsx
│   │
│   ├── features/              # Feature modules (PENTING!)
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   ├── actions/
│   │   │   │   └── auth.actions.ts
│   │   │   └── schemas/
│   │   │       └── auth.schema.ts
│   │   │
│   │   ├── workspace/
│   │   │   ├── components/
│   │   │   │   ├── WorkspaceCard.tsx
│   │   │   │   ├── WorkspaceForm.tsx
│   │   │   │   ├── MemberList.tsx
│   │   │   │   └── InviteModal.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useWorkspace.ts
│   │   │   ├── actions/
│   │   │   │   └── workspace.actions.ts
│   │   │   └── schemas/
│   │   │       └── workspace.schema.ts
│   │   │
│   │   ├── project/
│   │   │   └── ... (same pattern)
│   │   │
│   │   ├── task/
│   │   │   ├── components/
│   │   │   │   ├── TaskBoard.tsx
│   │   │   │   ├── TaskCard.tsx
│   │   │   │   ├── TaskModal.tsx
│   │   │   │   ├── TaskForm.tsx
│   │   │   │   ├── TaskFilters.tsx
│   │   │   │   ├── TaskColumn.tsx
│   │   │   │   └── TaskComments.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTaskFilter.ts
│   │   │   │   ├── useTasks.ts
│   │   │   │   └── useDragDrop.ts
│   │   │   ├── actions/
│   │   │   │   └── task.actions.ts
│   │   │   └── schemas/
│   │   │       └── task.schema.ts
│   │   │
│   │   ├── dashboard/
│   │   │   └── components/
│   │   │       ├── StatsCard.tsx
│   │   │       ├── DonutChart.tsx
│   │   │       └── BarChart.tsx
│   │   │
│   │   └── notification/
│   │       ├── components/
│   │       │   ├── NotificationBell.tsx
│   │       │   └── NotificationList.tsx
│   │       └── hooks/
│   │           └── useNotifications.ts
│   │
│   ├── hooks/                 # Global custom hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useMediaQuery.ts
│   │   └── useIntersectionObserver.ts
│   │
│   ├── lib/                   # Utilities & configs
│   │   ├── auth.ts            # Auth.js config
│   │   ├── db.ts              # Prisma client
│   │   ├── validators/
│   │   │   └── env.ts         # Env validation dengan Zod
│   │   ├── utils.ts           # cn(), formatDate(), dll
│   │   ├── constants.ts       # App constants
│   │   └── query-client.ts    # TanStack Query config
│   │
│   ├── store/                 # Redux Toolkit
│   │   ├── index.ts
│   │   ├── hooks.ts
│   │   └── slices/
│   │       ├── uiSlice.ts
│   │       └── notificationSlice.ts
│   │
│   ├── stores/                # Zustand stores
│   │   ├── taskFilterStore.ts
│   │   └── workspaceStore.ts
│   │
│   ├── types/                 # Global TypeScript types
│   │   ├── index.ts
│   │   ├── next-auth.d.ts
│   │   └── api.ts
│   │
│   └── middleware.ts          # Next.js middleware (auth protection)
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── setup.ts
│
├── .env.local
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

> **Kenapa feature-based?** Kalau kamu taruh semua components di satu folder `components/`, setelah 3 bulan kamu bakal pusing sendiri. Feature-based: semua yang berkaitan dengan `task` ada di `features/task/`. Mau delete fitur? Hapus satu folder, beres.

---

## Database Schema (Prisma)

### ERD Sederhana

```
User ──────< WorkspaceMember >────── Workspace
              (role: owner/admin/member/guest)
                                          │
                                          └──< Project
                                                    │
                                                    └──< Task ──────< TaskComment
                                                         │
                                                         └──(assignedTo: User)

User ──────< Notification
```

### `prisma/schema.prisma`

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // Ganti "postgresql" untuk production
  url      = env("DATABASE_URL")
}

// ============================================
// USER
// ============================================
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  password      String?   // null kalau pakai OAuth saja

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  accounts          Account[]
  sessions          Session[]
  workspaceMembers  WorkspaceMember[]
  assignedTasks     Task[]            @relation("TaskAssignee")
  createdTasks      Task[]            @relation("TaskCreator")
  comments          TaskComment[]
  notifications     Notification[]

  @@map("users")
}

// Auth.js tables
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================
// WORKSPACE
// ============================================
model Workspace {
  id          String  @id @default(cuid())
  name        String
  slug        String  @unique // URL-friendly: "my-team"
  description String?
  logo        String? // URL ke image

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  members  WorkspaceMember[]
  projects Project[]

  @@map("workspaces")
}

// Pivot table untuk User <-> Workspace dengan role
model WorkspaceMember {
  id          String          @id @default(cuid())
  workspaceId String
  userId      String
  role        WorkspaceRole   @default(MEMBER)
  joinedAt    DateTime        @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId]) // Satu user hanya bisa jadi member sekali per workspace
  @@map("workspace_members")
}

enum WorkspaceRole {
  OWNER
  ADMIN
  MEMBER
  GUEST
}

// ============================================
// PROJECT
// ============================================
model Project {
  id          String  @id @default(cuid())
  workspaceId String
  name        String
  description String?
  color       String  @default("#6366f1") // Tailwind indigo-500
  emoji       String  @default("📋")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  tasks     Task[]

  @@map("projects")
}

// ============================================
// TASK
// ============================================
model Task {
  id          String      @id @default(cuid())
  projectId   String
  title       String
  description String?
  status      TaskStatus  @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  order       Int         @default(0) // Untuk drag & drop ordering

  assigneeId  String?
  creatorId   String

  dueDate   DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  project  Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee User?        @relation("TaskAssignee", fields: [assigneeId], references: [id])
  creator  User         @relation("TaskCreator", fields: [creatorId], references: [id])
  comments TaskComment[]
  notificationsGenerated Notification[]

  @@map("tasks")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// ============================================
// TASK COMMENT
// ============================================
model TaskComment {
  id      String @id @default(cuid())
  taskId  String
  userId  String
  content String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id])

  @@map("task_comments")
}

// ============================================
// NOTIFICATION
// ============================================
model Notification {
  id      String           @id @default(cuid())
  userId  String           // Who receives the notification
  type    NotificationType
  title   String
  message String
  isRead  Boolean          @default(false)
  href    String?          // Link ke halaman terkait

  // Optional references
  taskId  String?

  createdAt DateTime @default(now())

  user User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  task Task? @relation(fields: [taskId], references: [id], onDelete: SetNull)

  @@map("notifications")
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_COMMENT
  WORKSPACE_INVITE
  PROJECT_UPDATE
}
```

---

## Setup Step by Step

### Langkah 1: Buat Project Next.js

```bash
# Buat project baru
npx create-next-app@latest flowspace \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd flowspace
```

### Langkah 2: Install Semua Dependencies

```bash
# Auth
npm install next-auth@beta @auth/prisma-adapter

# Database
npm install prisma @prisma/client
npm install --save-dev tsx

# UI
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-tooltip
npm install @radix-ui/react-avatar @radix-ui/react-separator
npm install @radix-ui/react-switch @radix-ui/react-popover
npm install @radix-ui/react-checkbox @radix-ui/react-label
npm install @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install next-themes

# shadcn/ui CLI
npx shadcn@latest init

# State management
npm install @reduxjs/toolkit react-redux zustand

# Data fetching
npm install @tanstack/react-query @tanstack/react-query-devtools

# Forms & validation
npm install react-hook-form @hookform/resolvers zod

# Animation
npm install framer-motion

# Drag & drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Charts
npm install recharts

# Toast
npm install react-hot-toast

# Error monitoring
npm install @sentry/nextjs

# File upload
npm install uploadthing @uploadthing/react

# Rate limiting
npm install @upstash/ratelimit @upstash/redis

# Testing
npm install --save-dev vitest @vitejs/plugin-react
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev jsdom msw

# Linting & formatting
npm install --save-dev prettier eslint-config-prettier
npm install --save-dev husky lint-staged
npm install --save-dev @typescript-eslint/eslint-plugin

# Bundle analyzer
npm install --save-dev @next/bundle-analyzer
```

### Langkah 3: Setup Prisma

```bash
# Init Prisma
npx prisma init --datasource-provider sqlite

# Setelah nulis schema, jalankan migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Buka Prisma Studio (opsional, buat lihat data)
npx prisma studio
```

### Langkah 4: Environment Variables

Buat file `.env.local`:

```env
# Database
DATABASE_URL="file:./dev.db"

# Auth.js
# Generate dengan: openssl rand -base64 32
AUTH_SECRET="your-super-secret-key-here-generate-this"

# Google OAuth (dari console.cloud.google.com)
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"

# App URL
NEXTAUTH_URL="http://localhost:3000"
AUTH_URL="http://localhost:3000"

# Uploadthing (untuk avatar upload, dari uploadthing.com)
UPLOADTHING_SECRET="sk_live_..."
UPLOADTHING_APP_ID="..."

# Sentry (dari sentry.io)
SENTRY_DSN="https://..."
NEXT_PUBLIC_SENTRY_DSN="https://..."

# Upstash Redis (untuk rate limiting, dari upstash.com)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Vercel Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID="..."
```

Buat `.env.example` (versi tanpa value rahasia):

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
NEXTAUTH_URL="http://localhost:3000"
AUTH_URL="http://localhost:3000"
UPLOADTHING_SECRET=""
UPLOADTHING_APP_ID=""
SENTRY_DSN=""
NEXT_PUBLIC_SENTRY_DSN=""
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

### Langkah 5: Validasi Environment Variables dengan Zod

```typescript
// src/lib/validators/env.ts
import { z } from "zod";

// Schema untuk environment variables
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),

  // Auth
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET harus minimal 32 karakter"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID wajib diisi"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET wajib diisi"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL harus berupa URL valid"),

  // Node env
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Optional untuk development
  UPLOADTHING_SECRET: z.string().optional(),
  UPLOADTHING_APP_ID: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

// Validasi saat startup
// Kalau ada env yang kurang, app langsung crash dengan pesan yang jelas
const validateEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Environment variables tidak valid:\n",
      parsed.error.format()
    );
    // Crash intentional — lebih baik crash waktu startup
    // daripada error aneh-aneh di production
    process.exit(1);
  }

  return parsed.data;
};

// Export validated env
export const env = validateEnv();

// Type untuk autocomplete
export type Env = z.infer<typeof envSchema>;
```

Import di `src/app/layout.tsx` untuk memastikan validasi jalan saat startup:

```typescript
// src/app/layout.tsx
import "@/lib/validators/env"; // Ini trigger validasi env saat startup
```

### Langkah 6: Setup Prisma Client

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

// Pattern standar untuk Next.js + Prisma
// Tanpa ini, setiap hot-reload di dev akan buat connection baru
// dan kamu akan kehabisan connection database

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

### Langkah 7: Setup Utility Functions

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { id } from "date-fns/locale"; // Locale Indonesia

// Utility untuk merge Tailwind classes (dari shadcn/ui)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format tanggal
export function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy", { locale: id });
}

// Format tanggal relatif ("3 hari lalu")
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: id });
}

// Cek apakah task overdue
export function isOverdue(dueDate: Date | string | null): boolean {
  if (!dueDate) return false;
  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  return isPast(d) && !isToday(d);
}

// Generate slug dari string
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim();
}

// Truncate text
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

// Get initials dari nama (untuk avatar fallback)
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Random color untuk project
export const PROJECT_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
];

export function getRandomColor(): string {
  return PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
}
```

### Langkah 8: Setup TypeScript Constants

```typescript
// src/lib/constants.ts
import { TaskPriority, TaskStatus } from "@prisma/client";

// Task status config — satu tempat untuk semua metadata status
export const TASK_STATUS_CONFIG = {
  [TaskStatus.TODO]: {
    label: "To Do",
    color: "bg-slate-100 text-slate-700",
    dotColor: "bg-slate-400",
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700",
    dotColor: "bg-blue-500",
  },
  [TaskStatus.IN_REVIEW]: {
    label: "In Review",
    color: "bg-yellow-100 text-yellow-700",
    dotColor: "bg-yellow-500",
  },
  [TaskStatus.DONE]: {
    label: "Done",
    color: "bg-green-100 text-green-700",
    dotColor: "bg-green-500",
  },
} as const;

// Task priority config
export const TASK_PRIORITY_CONFIG = {
  [TaskPriority.LOW]: {
    label: "Low",
    color: "text-slate-500",
    icon: "↓",
  },
  [TaskPriority.MEDIUM]: {
    label: "Medium",
    color: "text-blue-500",
    icon: "→",
  },
  [TaskPriority.HIGH]: {
    label: "High",
    color: "text-orange-500",
    icon: "↑",
  },
  [TaskPriority.URGENT]: {
    label: "Urgent",
    color: "text-red-500",
    icon: "⚠",
  },
} as const;

// Workspace role config
export const WORKSPACE_ROLE_CONFIG = {
  OWNER: {
    label: "Owner",
    description: "Full control atas workspace",
    color: "bg-purple-100 text-purple-700",
  },
  ADMIN: {
    label: "Admin",
    description: "Bisa manage member dan project",
    color: "bg-blue-100 text-blue-700",
  },
  MEMBER: {
    label: "Member",
    description: "Bisa buat dan edit task",
    color: "bg-green-100 text-green-700",
  },
  GUEST: {
    label: "Guest",
    description: "Hanya bisa lihat",
    color: "bg-slate-100 text-slate-700",
  },
} as const;

// App-wide constants
export const APP_NAME = "Flowspace";
export const APP_DESCRIPTION = "Productivity app untuk tim yang bergerak cepat";

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const TASKS_PAGE_SIZE = 50;

// File upload limits
export const MAX_AVATAR_SIZE = 4 * 1024 * 1024; // 4MB
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
```

### Langkah 9: Setup Global Types

```typescript
// src/types/index.ts
import type { 
  User, 
  Workspace, 
  WorkspaceMember, 
  Project, 
  Task, 
  TaskComment,
  Notification,
  WorkspaceRole,
  TaskStatus,
  TaskPriority
} from "@prisma/client";

// Re-export Prisma types yang sering dipakai
export type {
  User,
  Workspace,
  WorkspaceMember,
  Project,
  Task,
  TaskComment,
  Notification,
  WorkspaceRole,
  TaskStatus,
  TaskPriority,
};

// Extended types dengan relations
export type WorkspaceWithMembers = Workspace & {
  members: (WorkspaceMember & { user: User })[];
};

export type ProjectWithTasks = Project & {
  tasks: Task[];
  _count: { tasks: number };
};

export type TaskWithRelations = Task & {
  assignee: User | null;
  creator: User;
  comments: (TaskComment & { user: User })[];
  _count: { comments: number };
};

export type NotificationWithRelations = Notification & {
  task: Task | null;
};

// API Response types
export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type ApiError = {
  error: string;
  details?: unknown;
};

// Pagination
export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
```

### Langkah 10: Setup ESLint + Prettier

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "next/typescript",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { "prefer": "type-imports" }
    ],
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": { "order": "asc" }
      }
    ]
  }
}
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Langkah 11: Setup Husky + lint-staged

```bash
# Init husky
npx husky init

# Ini akan buat .husky/ folder
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

```json
// package.json — tambahkan bagian ini
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,css}": [
      "prettier --write"
    ]
  }
}
```

### Langkah 12: Setup Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/features/*": ["./src/features/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/store/*": ["./src/store/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/types/*": ["./src/types/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Langkah 13: Setup `next.config.ts`

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Google OAuth avatars
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        // Uploadthing avatars
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        // Dicebear avatars (fallback)
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  experimental: {
    // Server Actions sudah stable di Next 15, tapi tetap perlu
    // serverActions: { allowedOrigins: ["localhost:3000"] }
  },
};

export default nextConfig;
```

### Langkah 14: Setup TanStack Query Provider

```tsx
// src/components/providers/QueryProvider.tsx
"use client";

import { useState } from "react";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState untuk memastikan QueryClient tidak di-recreate setiap render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data dianggap stale setelah 60 detik
            staleTime: 1000 * 60,
            // Retry 1x kalau gagal (default 3x terlalu banyak)
            retry: 1,
            // Refetch saat window focus (berguna untuk kolaborasi)
            refetchOnWindowFocus: true,
          },
          mutations: {
            // Jangan retry mutation otomatis
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools hanya di development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
```

### Langkah 15: Setup Redux Store

```typescript
// src/store/slices/uiSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  theme: "light" | "dark" | "system";
}

const initialState: UIState = {
  sidebarOpen: true,
  activeModal: null,
  theme: "system",
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
    openModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
    setTheme: (state, action: PayloadAction<UIState["theme"]>) => {
      state.theme = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarOpen, openModal, closeModal, setTheme } =
  uiSlice.actions;
```

```typescript
// src/store/slices/notificationSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface NotificationState {
  unreadCount: number;
  isPanelOpen: boolean;
}

const initialState: NotificationState = {
  unreadCount: 0,
  isPanelOpen: false,
};

export const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    incrementUnread: (state) => {
      state.unreadCount += 1;
    },
    clearUnread: (state) => {
      state.unreadCount = 0;
    },
    togglePanel: (state) => {
      state.isPanelOpen = !state.isPanelOpen;
    },
  },
});

export const { setUnreadCount, incrementUnread, clearUnread, togglePanel } =
  notificationSlice.actions;
```

```typescript
// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";

import { notificationSlice } from "./slices/notificationSlice";
import { uiSlice } from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    notification: notificationSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```typescript
// src/store/hooks.ts
// Typed hooks untuk Redux — SELALU pakai ini, bukan useSelector/useDispatch langsung
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from ".";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector);
```

### Langkah 16: Setup Zustand Stores

```typescript
// src/stores/taskFilterStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { TaskPriority, TaskStatus } from "@prisma/client";

interface TaskFilterState {
  search: string;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  assigneeId: string | null;
  dueDateFilter: "all" | "overdue" | "today" | "week" | null;

  // Actions
  setSearch: (search: string) => void;
  toggleStatus: (status: TaskStatus) => void;
  togglePriority: (priority: TaskPriority) => void;
  setAssignee: (assigneeId: string | null) => void;
  setDueDateFilter: (filter: TaskFilterState["dueDateFilter"]) => void;
  resetFilters: () => void;
}

const initialFilters = {
  search: "",
  statuses: [] as TaskStatus[],
  priorities: [] as TaskPriority[],
  assigneeId: null,
  dueDateFilter: null as TaskFilterState["dueDateFilter"],
};

export const useTaskFilterStore = create<TaskFilterState>()(
  persist(
    (set) => ({
      ...initialFilters,

      setSearch: (search) => set({ search }),

      toggleStatus: (status) =>
        set((state) => ({
          statuses: state.statuses.includes(status)
            ? state.statuses.filter((s) => s !== status)
            : [...state.statuses, status],
        })),

      togglePriority: (priority) =>
        set((state) => ({
          priorities: state.priorities.includes(priority)
            ? state.priorities.filter((p) => p !== priority)
            : [...state.priorities, priority],
        })),

      setAssignee: (assigneeId) => set({ assigneeId }),

      setDueDateFilter: (dueDateFilter) => set({ dueDateFilter }),

      resetFilters: () => set(initialFilters),
    }),
    {
      name: "task-filters",
      // Hanya persist search dan filter settings saja
      partialize: (state) => ({
        statuses: state.statuses,
        priorities: state.priorities,
      }),
    }
  )
);
```

### Langkah 17: Root Layout

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/lib/validators/env"; // Validasi env saat startup

import { QueryProvider } from "@/components/providers/QueryProvider";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "react-hot-toast";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Flowspace",
    template: "%s | Flowspace",
  },
  description: "Productivity app untuk tim yang bergerak cepat",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProvider>
            <QueryProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "var(--background)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  },
                }}
              />
            </QueryProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

```tsx
// src/components/providers/StoreProvider.tsx
"use client";

import { useRef } from "react";

import { Provider } from "react-redux";
import { store } from "@/store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // useRef untuk memastikan store tidak recreated setiap render
  const storeRef = useRef(store);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

```tsx
// src/components/providers/ThemeProvider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

### Langkah 18: Setup Database Seed

```typescript
// prisma/seed.ts
import { PrismaClient, WorkspaceRole, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Mulai seeding database...");

  // Buat demo users
  const hashedPassword = await bcrypt.hash("password123", 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Johnson",
      password: hashedPassword,
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Smith",
      password: hashedPassword,
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
    },
  });

  // Buat demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-workspace" },
    update: {},
    create: {
      name: "Demo Workspace",
      slug: "demo-workspace",
      description: "Workspace untuk testing dan demo",
      members: {
        create: [
          { userId: alice.id, role: WorkspaceRole.OWNER },
          { userId: bob.id, role: WorkspaceRole.MEMBER },
        ],
      },
    },
  });

  // Buat demo project
  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Website Redesign",
      description: "Redesign website perusahaan Q1 2026",
      color: "#6366f1",
      emoji: "🎨",
    },
  });

  // Buat demo tasks
  const tasks = [
    {
      title: "Setup design system",
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      assigneeId: alice.id,
    },
    {
      title: "Buat wireframe halaman utama",
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.HIGH,
      assigneeId: bob.id,
    },
    {
      title: "Implementasi komponen UI",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      assigneeId: alice.id,
    },
    {
      title: "Testing cross-browser",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assigneeId: bob.id,
    },
    {
      title: "Setup CI/CD pipeline",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        ...task,
        projectId: project.id,
        creatorId: alice.id,
      },
    });
  }

  console.log("✅ Seeding selesai!");
  console.log("   Email: alice@example.com / bob@example.com");
  console.log("   Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Tambahkan ke `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Jalankan seed:

```bash
npx prisma db seed
```

---

## Checklist Fase 1

Sebelum lanjut ke Fase 2, pastikan semua ini sudah beres:

- [ ] Project Next.js bisa dijalankan (`npm run dev`)
- [ ] Semua dependencies terinstall tanpa error
- [ ] Prisma migration berhasil (file `dev.db` terbuat)
- [ ] Seed data berhasil: bisa lihat data di Prisma Studio
- [ ] `.env.local` terkonfigurasi dengan benar
- [ ] Env validation berjalan (coba comment satu env variable dan pastikan app error dengan pesan yang jelas)
- [ ] TypeScript tidak ada error (`npx tsc --noEmit`)
- [ ] ESLint tidak ada error (`npm run lint`)
- [ ] Path aliases bekerja (`@/lib/utils` bisa diimport)

---

## Common Pitfalls Fase 1

### 1. Prisma Client tidak terupdate setelah ubah schema
```bash
# Selalu jalankan ini setelah ubah prisma/schema.prisma
npx prisma migrate dev --name describe-your-change
npx prisma generate
```

### 2. "PrismaClient is not a constructor" di edge runtime
Middleware Next.js jalan di Edge Runtime yang tidak support Node.js modules. Jangan import `db.ts` (Prisma) di dalam `middleware.ts`. Gunakan Auth.js session saja di middleware.

### 3. Hot reload membuat terlalu banyak Prisma connections
Sudah di-handle di `src/lib/db.ts` dengan pattern `globalForPrisma`. Kalau masih ada warning, pastikan kamu export dengan benar.

### 4. SQLite tidak support semua PostgreSQL features
Beberapa fitur Prisma tidak tersedia di SQLite (seperti `createMany` dengan skipDuplicates). Selalu test di environment yang mirip production kalau bisa.

### 5. Env validation crash di CI/CD
Pastikan semua required env variables di-set di GitHub Actions atau Vercel environment variables. Buat daftar dari `.env.example` dan set satu per satu.

---

Lanjut ke [Fase 2 — Authentication →](./22_flowspace-02-authentication.md)
