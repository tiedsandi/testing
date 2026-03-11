# Flowspace — Fase 5: Dashboard & Analytics

> **Fase ini menghasilkan:** Dashboard per workspace dengan grafik donut (task by status), grafik bar (task selesai per minggu), card statistik animasi, dan tabel member activity + overdue tasks.

---

## Gambaran Besar

Dashboard adalah halaman yang memberikan **bird's-eye view** dari kondisi workspace. Kita pakai:
- **Recharts** untuk grafik (sudah ada di shadcn/ui)
- **Framer Motion** untuk animasi counter di stats card
- **Server Components** untuk initial data fetch (lebih cepat)

```
WorkspaceDashboard
 ├── StatsRow (4 cards: total, selesai, in progress, overdue)
 ├── ChartsRow
 │    ├── DonutChart (task by status)
 │    └── BarChart (task selesai per minggu)
 ├── OverdueTasksList
 └── MemberActivity
```

---

## Step 1: Install Dependencies

```bash
npm install recharts framer-motion
npm install -D @types/recharts
```

---

## Step 2: API Route untuk Analytics Data

### `src/app/api/workspaces/[workspaceId]/analytics/route.ts`

```typescript
// src/app/api/workspaces/[workspaceId]/analytics/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { startOfWeek, subWeeks, endOfWeek, format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = params.workspaceId;

  // Cek keanggotaan
  const member = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: session.user.id,
      },
    },
  });
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Ambil semua tasks dalam workspace ini
  const allTasks = await db.task.findMany({
    where: {
      project: { workspaceId },
    },
    include: {
      assignee: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  // ── 1. Statistik per status ─────────────────────────────────────────
  const statusCounts = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
  let overdueCount = 0;
  const now = new Date();

  allTasks.forEach((task) => {
    statusCounts[task.status as keyof typeof statusCounts]++;
    if (
      task.dueDate &&
      task.status !== "DONE" &&
      new Date(task.dueDate) < now
    ) {
      overdueCount++;
    }
  });

  // ── 2. Task selesai per minggu (6 minggu terakhir) ──────────────────
  const weeklyData = [];
  for (let i = 5; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

    const completedThisWeek = allTasks.filter((task) => {
      if (task.status !== "DONE") return false;
      // Gunakan updatedAt sebagai proxy untuk "kapan selesai"
      const updatedAt = new Date(task.updatedAt);
      return updatedAt >= weekStart && updatedAt <= weekEnd;
    }).length;

    weeklyData.push({
      week: format(weekStart, "d MMM", { locale: idLocale }),
      selesai: completedThisWeek,
    });
  }

  // ── 3. Overdue tasks (detail) ────────────────────────────────────────
  const overdueTasks = allTasks
    .filter(
      (task) =>
        task.dueDate &&
        task.status !== "DONE" &&
        new Date(task.dueDate) < now
    )
    .slice(0, 10) // Batasi 10 untuk performance
    .map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate,
      assignee: task.assignee,
    }));

  // ── 4. Member activity ────────────────────────────────────────────────
  const members = await db.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  const memberActivity = members.map((m) => {
    const userTasks = allTasks.filter(
      (t) => t.assigneeId === m.userId
    );
    return {
      userId: m.userId,
      name: m.user.name,
      image: m.user.image,
      role: m.role,
      totalAssigned: userTasks.length,
      completed: userTasks.filter((t) => t.status === "DONE").length,
      inProgress: userTasks.filter((t) => t.status === "IN_PROGRESS").length,
    };
  });

  return NextResponse.json({
    stats: {
      total: allTasks.length,
      done: statusCounts.DONE,
      inProgress: statusCounts.IN_PROGRESS,
      overdue: overdueCount,
    },
    statusDistribution: [
      { name: "To Do", value: statusCounts.TODO, fill: "#94a3b8" },
      { name: "In Progress", value: statusCounts.IN_PROGRESS, fill: "#60a5fa" },
      { name: "In Review", value: statusCounts.IN_REVIEW, fill: "#fbbf24" },
      { name: "Done", value: statusCounts.DONE, fill: "#4ade80" },
    ],
    weeklyCompletion: weeklyData,
    overdueTasks,
    memberActivity,
  });
}
```

> **Catatan:** Kita pakai `date-fns` untuk kalkulasi waktu. Install dulu: `npm install date-fns`

---

## Step 3: TanStack Query Hook

### `src/features/dashboard/hooks/useAnalytics.ts`

```typescript
// src/features/dashboard/hooks/useAnalytics.ts
"use client";

import { useQuery } from "@tanstack/react-query";

export function useWorkspaceAnalytics(workspaceId: string) {
  return useQuery({
    queryKey: ["analytics", workspaceId],
    queryFn: async () => {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/analytics`
      );
      if (!res.ok) throw new Error("Gagal memuat analytics");
      return res.json();
    },
    staleTime: 1000 * 60 * 5, // Fresh 5 menit — analytics tidak perlu real-time
  });
}
```

---

## Step 4: StatsCard dengan Animasi Counter

### `src/features/dashboard/components/StatsCard.tsx`

```tsx
// src/features/dashboard/components/StatsCard.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

const VARIANT_STYLES = {
  default: "bg-background",
  success: "bg-green-50 dark:bg-green-950/20",
  warning: "bg-yellow-50 dark:bg-yellow-950/20",
  danger: "bg-red-50 dark:bg-red-950/20",
};

const ICON_STYLES = {
  default: "text-muted-foreground",
  success: "text-green-600",
  warning: "text-yellow-600",
  danger: "text-red-600",
};

/**
 * Hook untuk animasi angka counter dari 0 sampai target
 */
function useCountUp(target: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing: ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress >= 1) {
        clearInterval(timer);
        setCount(target);
      }
    }, 16); // ~60fps

    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

export function StatsCard({
  label,
  value,
  icon,
  description,
  variant = "default",
}: StatsCardProps) {
  const ref = useRef(null);
  // Animasi counter baru trigger saat card masuk viewport
  const isInView = useInView(ref, { once: true });
  const animatedValue = useCountUp(isInView ? value : 0);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className={cn("overflow-hidden", VARIANT_STYLES[variant])}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <motion.p
                className="text-3xl font-bold mt-1"
                key={value} // Re-animate kalau value berubah
              >
                {animatedValue}
              </motion.p>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            <div className={cn("p-2 rounded-lg bg-background/50", ICON_STYLES[variant])}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

---

## Step 5: Donut Chart (Task by Status)

### `src/features/dashboard/components/DonutChart.tsx`

```tsx
// src/features/dashboard/components/DonutChart.tsx
"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
    fill: string;
  }>;
}

// Custom tooltip agar tampilan lebih bagus
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-muted-foreground">
          {payload[0].value} task ({payload[0].payload.percent}%)
        </p>
      </div>
    );
  }
  return null;
}

export function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Tambahkan persentase ke data
  const dataWithPercent = data.map((item) => ({
    ...item,
    percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Distribusi Task</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Belum ada task
          </div>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={dataWithPercent}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {dataWithPercent.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total Task</p>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {dataWithPercent.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs text-muted-foreground truncate">
                    {item.name}
                  </span>
                  <span className="text-xs font-medium ml-auto">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Step 6: Bar Chart (Task Selesai per Minggu)

### `src/features/dashboard/components/WeeklyBarChart.tsx`

```tsx
// src/features/dashboard/components/WeeklyBarChart.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeeklyBarChartProps {
  data: Array<{
    week: string;
    selesai: number;
  }>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-green-600 font-medium">
          {payload[0].value} task selesai
        </p>
      </div>
    );
  }
  return null;
}

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.selesai), 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Task Selesai per Minggu</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-muted"
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              domain={[0, maxValue + 2]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              className="fill-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="selesai"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              animationBegin={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

## Step 7: Overdue Tasks List

### `src/features/dashboard/components/OverdueTasksList.tsx`

```tsx
// src/features/dashboard/components/OverdueTasksList.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface OverdueTask {
  id: string;
  title: string;
  priority: string;
  dueDate: string;
  assignee: { name: string | null; image: string | null } | null;
}

const PRIORITY_BADGE = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "warning",
  URGENT: "destructive",
} as const;

export function OverdueTasksList({ tasks }: { tasks: OverdueTask[] }) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle size={16} className="text-yellow-500" />
            Task Overdue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm">Tidak ada task yang overdue!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" />
          Task Overdue ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {tasks.map((task) => (
          <div key={task.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-destructive flex items-center gap-1">
                    <CalendarDays size={10} />
                    {formatDate(task.dueDate)}
                  </span>
                  <Badge
                    variant={
                      (PRIORITY_BADGE[task.priority as keyof typeof PRIORITY_BADGE] as any) ??
                      "default"
                    }
                    className="text-[10px] h-4 px-1"
                  >
                    {task.priority}
                  </Badge>
                </div>
              </div>
              {task.assignee ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.assignee.image ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {task.assignee.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {task.assignee.name}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0">
                  Unassigned
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

---

## Step 8: Member Activity Table

### `src/features/dashboard/components/MemberActivity.tsx`

```tsx
// src/features/dashboard/components/MemberActivity.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";

interface MemberActivityItem {
  userId: string;
  name: string | null;
  image: string | null;
  role: string;
  totalAssigned: number;
  completed: number;
  inProgress: number;
}

export function MemberActivity({
  members,
}: {
  members: MemberActivityItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users size={16} />
          Aktivitas Member
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Belum ada member
          </p>
        ) : (
          <div className="space-y-4">
            {members.map((member) => {
              const completionRate =
                member.totalAssigned > 0
                  ? Math.round(
                      (member.completed / member.totalAssigned) * 100
                    )
                  : 0;

              return (
                <div key={member.userId} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.image ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {member.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {member.role.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{completionRate}%</p>
                      <p className="text-xs text-muted-foreground">
                        {member.completed}/{member.totalAssigned} selesai
                      </p>
                    </div>
                  </div>
                  <Progress value={completionRate} className="h-1.5" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Step 9: Dashboard Page

### `src/features/dashboard/components/DashboardView.tsx`

```tsx
// src/features/dashboard/components/DashboardView.tsx
"use client";

import { useWorkspaceAnalytics } from "../hooks/useAnalytics";
import { StatsCard } from "./StatsCard";
import { DonutChart } from "./DonutChart";
import { WeeklyBarChart } from "./WeeklyBarChart";
import { OverdueTasksList } from "./OverdueTasksList";
import { MemberActivity } from "./MemberActivity";
import { DashboardSkeleton } from "./DashboardSkeleton";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  LayoutGrid,
} from "lucide-react";

interface DashboardViewProps {
  workspaceId: string;
  workspaceName: string;
}

export function DashboardView({
  workspaceId,
  workspaceName,
}: DashboardViewProps) {
  const { data, isLoading, error } = useWorkspaceAnalytics(workspaceId);

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Gagal memuat dashboard. Coba refresh halaman.</p>
      </div>
    );
  }

  const { stats, statusDistribution, weeklyCompletion, overdueTasks, memberActivity } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{workspaceName}</h1>
        <p className="text-muted-foreground">Overview workspace kamu</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Task"
          value={stats.total}
          icon={<LayoutGrid size={20} />}
          description="Semua project"
        />
        <StatsCard
          label="Selesai"
          value={stats.done}
          icon={<CheckSquare size={20} />}
          variant="success"
          description={
            stats.total > 0
              ? `${Math.round((stats.done / stats.total) * 100)}% dari total`
              : undefined
          }
        />
        <StatsCard
          label="In Progress"
          value={stats.inProgress}
          icon={<Clock size={20} />}
          variant="warning"
        />
        <StatsCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle size={20} />}
          variant={stats.overdue > 0 ? "danger" : "default"}
          description={stats.overdue > 0 ? "Perlu perhatian segera" : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DonutChart data={statusDistribution} />
        <WeeklyBarChart data={weeklyCompletion} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OverdueTasksList tasks={overdueTasks} />
        <MemberActivity members={memberActivity} />
      </div>
    </div>
  );
}
```

### `src/features/dashboard/components/DashboardSkeleton.tsx`

```tsx
// src/features/dashboard/components/DashboardSkeleton.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 10: Workspace Dashboard Page (Update)

Update halaman dashboard workspace untuk tampilkan analytics:

### `src/app/(dashboard)/workspace/[workspaceId]/page.tsx` (update)

```tsx
// Update src/app/(dashboard)/workspace/[workspaceId]/page.tsx
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { DashboardView } from "@/features/dashboard/components/DashboardView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceDashboard } from "@/features/workspace/components/WorkspaceDashboard";

export default async function WorkspacePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await db.workspace.findFirst({
    where: {
      id: params.workspaceId,
      members: { some: { userId: session.user.id } },
    },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { tasks: true } } },
      },
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!workspace) notFound();

  const currentUserRole = workspace.members[0]?.role ?? "GUEST";

  return (
    <div>
      <Tabs defaultValue="overview">
        <div className="px-6 pt-6 border-b">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          {/* Dashboard Analytics */}
          <DashboardView
            workspaceId={workspace.id}
            workspaceName={workspace.name}
          />
        </TabsContent>

        <TabsContent value="projects">
          {/* Project list (dari Fase 3) */}
          <WorkspaceDashboard
            workspace={workspace}
            currentUserRole={currentUserRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Common Pitfalls Fase 5

### ❌ Pitfall 1: Recharts tidak bekerja di SSR

**Masalah:** Error "window is not defined" saat menggunakan Recharts di Server Components atau saat server render.

**Solusi:** Komponen chart harus `"use client"` dan pastikan tidak dirender di server. Kalau perlu, gunakan dynamic import dengan `ssr: false`:
```typescript
// Kalau tetap error
const DonutChart = dynamic(
  () => import('@/features/dashboard/components/DonutChart'),
  { ssr: false }
);
```

---

### ❌ Pitfall 2: `date-fns` locale error

**Masalah:** Import locale bahasa Indonesia dari `date-fns` error.

**Solusi:**
```typescript
// ✅ Import yang benar di date-fns v3+
import { id } from "date-fns/locale";
// Atau
import { format } from "date-fns";
import { id } from "date-fns/locale/id";
```

---

### ❌ Pitfall 3: Framer Motion `useInView` tidak trigger di server

**Masalah:** `useInView` dari framer-motion butuh browser environment.

**Solusi:** Komponen dengan `useInView` harus `"use client"`. Sudah kita handle di `StatsCard.tsx`.

---

### ❌ Pitfall 4: Progress bar melebihi 100%

**Masalah:** Kalau ada bug di kalkulasi, progress bar > 100% tampil aneh.

**Solusi:** Clamp nilai progress:
```typescript
const completionRate = Math.min(
  100,
  Math.round((member.completed / member.totalAssigned) * 100)
);
```

---

## Checklist Fase 5

- [ ] Dashboard tab muncul di halaman workspace
- [ ] 4 stats card tampil dengan animasi counter saat scroll
- [ ] Donut chart tampil distribusi task by status
- [ ] Bar chart tampil progress 6 minggu terakhir
- [ ] Overdue tasks list tampil dengan benar (atau empty state kalau tidak ada)
- [ ] Member activity progress bar tampil untuk tiap member
- [ ] Skeleton loading muncul saat data loading
- [ ] Semua chart responsive di mobile

---

## Lanjut ke Fase 6

Dashboard analytics sudah lengkap. Selanjutnya kita bangun **Optimistic Updates, Notifikasi In-App, dan Toast Notifications** — membuat app terasa responsif dan real-time.
