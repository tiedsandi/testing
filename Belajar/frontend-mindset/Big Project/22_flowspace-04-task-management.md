# Flowspace — Fase 4: Task Management (Inti App)

> **Fase ini menghasilkan:** Task board lengkap dengan drag & drop, CRUD tasks, filter multi-kriteria, search dengan debounce, dan task detail modal dengan komentar. Ini inti dari Flowspace.

---

## Gambaran Besar

Task management adalah fitur paling kompleks. Kita pecah jadi beberapa bagian:

1. **Task Schema & Server Actions** — CRUD operations
2. **Task Board** — Kanban board dengan kolom status
3. **Drag & Drop** — Pakai `@dnd-kit/core`
4. **TaskCard & TaskModal** — UI individual task
5. **Filter & Search** — Zustand store + debounce
6. **Komentar** — Nested data di task modal

```
TaskBoard
 ├── TaskColumn (todo)
 │    └── TaskCard × N
 ├── TaskColumn (in_progress)
 │    └── TaskCard × N
 ├── TaskColumn (in_review)
 │    └── TaskCard × N
 └── TaskColumn (done)
      └── TaskCard × N
```

---

## Step 1: Install Dependencies

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Step 2: Schemas Task

### `src/features/task/schemas/task.schema.ts`

```typescript
// src/features/task/schemas/task.schema.ts
import { z } from "zod";

export const TaskStatus = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
export const TaskPriority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Judul task wajib diisi")
    .max(200, "Judul task maksimal 200 karakter"),
  description: z
    .string()
    .max(2000, "Deskripsi maksimal 2000 karakter")
    .optional(),
  status: TaskStatus.default("TODO"),
  priority: TaskPriority.default("MEDIUM"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(), // ISO date string
});

export const updateTaskSchema = createTaskSchema.partial();

export const updateTaskStatusSchema = z.object({
  status: TaskStatus,
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Komentar tidak boleh kosong")
    .max(1000, "Komentar maksimal 1000 karakter"),
});

export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;
export type CreateCommentFormData = z.infer<typeof createCommentSchema>;

// Type untuk task lengkap dengan relasi
export type TaskWithRelations = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: Date | null;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  assignee: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null; image: string | null };
  _count: { comments: number };
};
```

---

## Step 3: Server Actions untuk Task

### `src/features/task/actions/task.actions.ts`

```typescript
// src/features/task/actions/task.actions.ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  createCommentSchema,
} from "../schemas/task.schema";
import { revalidatePath } from "next/cache";
import { WorkspaceRole } from "@prisma/client";

// Helper: validasi user adalah member project ini
async function validateProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!project) throw new Error("Project tidak ditemukan");

  const member = project.workspace.members[0];
  if (!member) throw new Error("Kamu bukan member workspace ini");

  return { project, member };
}

// ── Create Task ───────────────────────────────────────────────────────
export async function createTaskAction(
  projectId: string,
  formData: unknown
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = createTaskSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  try {
    const { member } = await validateProjectAccess(projectId, session.user.id);
    // Guest tidak bisa buat task
    if (member.role === WorkspaceRole.GUEST) {
      return { error: "Guest tidak bisa membuat task" };
    }
  } catch (e: any) {
    return { error: e.message };
  }

  const { dueDate, ...rest } = parsed.data;

  const task = await db.task.create({
    data: {
      ...rest,
      projectId,
      creatorId: session.user.id,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  revalidatePath(`/workspace/[workspaceId]/projects/${projectId}`);
  return { success: true, task };
}

// ── Update Task ───────────────────────────────────────────────────────
export async function updateTaskAction(
  taskId: string,
  projectId: string,
  formData: unknown
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = updateTaskSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  try {
    const { member } = await validateProjectAccess(projectId, session.user.id);
    if (member.role === WorkspaceRole.GUEST) {
      return { error: "Guest tidak bisa mengubah task" };
    }
  } catch (e: any) {
    return { error: e.message };
  }

  const { dueDate, ...rest } = parsed.data;

  await db.task.update({
    where: { id: taskId },
    data: {
      ...rest,
      ...(dueDate !== undefined && {
        dueDate: dueDate ? new Date(dueDate) : null,
      }),
    },
  });

  revalidatePath(`/workspace/[workspaceId]/projects/${projectId}`);
  return { success: true };
}

// ── Update Task Status (khusus untuk drag & drop) ─────────────────────
export async function updateTaskStatusAction(
  taskId: string,
  projectId: string,
  newStatus: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = updateTaskStatusSchema.safeParse({ status: newStatus });
  if (!parsed.success) return { error: "Status tidak valid" };

  try {
    await validateProjectAccess(projectId, session.user.id);
  } catch (e: any) {
    return { error: e.message };
  }

  await db.task.update({
    where: { id: taskId },
    data: { status: parsed.data.status },
  });

  revalidatePath(`/workspace/[workspaceId]/projects/${projectId}`);
  return { success: true };
}

// ── Delete Task ───────────────────────────────────────────────────────
export async function deleteTaskAction(taskId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Cek task ada dan ambil info creator
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { creatorId: true },
  });

  if (!task) return { error: "Task tidak ditemukan" };

  try {
    const { member } = await validateProjectAccess(projectId, session.user.id);
    // Hanya creator, admin, atau owner yang bisa hapus
    const isCreator = task.creatorId === session.user.id;
    const isPrivileged = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN].includes(
      member.role
    );
    if (!isCreator && !isPrivileged) {
      return { error: "Kamu tidak bisa menghapus task milik orang lain" };
    }
  } catch (e: any) {
    return { error: e.message };
  }

  await db.task.delete({ where: { id: taskId } });

  revalidatePath(`/workspace/[workspaceId]/projects/${projectId}`);
  return { success: true };
}

// ── Add Comment ───────────────────────────────────────────────────────
export async function addCommentAction(taskId: string, formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = createCommentSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Cek task ada
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) return { error: "Task tidak ditemukan" };

  try {
    await validateProjectAccess(task.projectId, session.user.id);
  } catch (e: any) {
    return { error: e.message };
  }

  await db.taskComment.create({
    data: {
      content: parsed.data.content,
      taskId,
      userId: session.user.id,
    },
  });

  revalidatePath(`/workspace/[workspaceId]/projects/${task.projectId}`);
  return { success: true };
}
```

---

## Step 4: API Route untuk Tasks (TanStack Query)

### `src/app/api/projects/[projectId]/tasks/route.ts`

```typescript
// src/app/api/projects/[projectId]/tasks/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query params untuk filter
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigneeId = searchParams.get("assigneeId");
  const search = searchParams.get("search");

  // Build filter object untuk Prisma
  const where: any = { projectId: params.projectId };

  if (status && status !== "all") where.status = status;
  if (priority && priority !== "all") where.priority = priority;
  if (assigneeId && assigneeId !== "all") where.assigneeId = assigneeId;
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  const tasks = await db.task.findMany({
    where,
    include: {
      assignee: {
        select: { id: true, name: true, image: true },
      },
      creator: {
        select: { id: true, name: true, image: true },
      },
      _count: { select: { comments: true } },
    },
    orderBy: [
      { priority: "desc" }, // URGENT dulu
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(tasks);
}
```

### `src/app/api/tasks/[taskId]/comments/route.ts`

```typescript
// src/app/api/tasks/[taskId]/comments/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const comments = await db.taskComment.findMany({
    where: { taskId: params.taskId },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(comments);
}
```

---

## Step 5: Zustand Store untuk Filter

### `src/stores/taskFilterStore.ts`

```typescript
// src/stores/taskFilterStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FilterStatus = "all" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type FilterPriority = "all" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface TaskFilterState {
  search: string;
  status: FilterStatus;
  priority: FilterPriority;
  assigneeId: string; // "all" = semua
  // Actions
  setSearch: (search: string) => void;
  setStatus: (status: FilterStatus) => void;
  setPriority: (priority: FilterPriority) => void;
  setAssigneeId: (assigneeId: string) => void;
  resetFilters: () => void;
}

const defaultFilters = {
  search: "",
  status: "all" as FilterStatus,
  priority: "all" as FilterPriority,
  assigneeId: "all",
};

export const useTaskFilterStore = create<TaskFilterState>()(
  // persist: simpan filter ke localStorage
  persist(
    (set) => ({
      ...defaultFilters,

      setSearch: (search) => set({ search }),
      setStatus: (status) => set({ status }),
      setPriority: (priority) => set({ priority }),
      setAssigneeId: (assigneeId) => set({ assigneeId }),
      resetFilters: () => set(defaultFilters),
    }),
    {
      name: "task-filters", // localStorage key
      partialize: (state) => ({
        // Jangan persist search — biasanya user tidak mau search tersimpan
        status: state.status,
        priority: state.priority,
        assigneeId: state.assigneeId,
      }),
    }
  )
);
```

---

## Step 6: Custom Hook useTasks

### `src/features/task/hooks/useTasks.ts`

```typescript
// src/features/task/hooks/useTasks.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { useTaskFilterStore } from "@/stores/taskFilterStore";
import { useDebounce } from "@/hooks/useDebounce";
import {
  createTaskAction,
  updateTaskAction,
  updateTaskStatusAction,
  deleteTaskAction,
} from "../actions/task.actions";
import type { TaskWithRelations } from "../schemas/task.schema";

export const taskKeys = {
  all: ["tasks"] as const,
  byProject: (projectId: string) =>
    [...taskKeys.all, "project", projectId] as const,
  byProjectFiltered: (projectId: string, filters: object) =>
    [...taskKeys.byProject(projectId), filters] as const,
};

// ── Fetch Tasks (dengan filter dari Zustand store) ────────────────────
export function useTasks(projectId: string) {
  const { search, status, priority, assigneeId } = useTaskFilterStore();
  // Debounce search agar tidak spam request saat mengetik
  const debouncedSearch = useDebounce(search, 300);

  const filters = {
    search: debouncedSearch,
    status,
    priority,
    assigneeId,
  };

  return useQuery<TaskWithRelations[]>({
    queryKey: taskKeys.byProjectFiltered(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.priority !== "all") params.set("priority", filters.priority);
      if (filters.assigneeId !== "all") params.set("assigneeId", filters.assigneeId);

      const res = await fetch(
        `/api/projects/${projectId}/tasks?${params.toString()}`
      );
      if (!res.ok) throw new Error("Gagal mengambil tasks");
      return res.json();
    },
    staleTime: 1000 * 30, // 30 detik fresh
  });
}

// ── Update Task Status (untuk drag & drop dengan optimistic update) ───
export function useUpdateTaskStatus(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      newStatus,
    }: {
      taskId: string;
      newStatus: string;
    }) => updateTaskStatusAction(taskId, projectId, newStatus),

    // Optimistic update: ubah UI dulu sebelum server respond
    onMutate: async ({ taskId, newStatus }) => {
      // Batalkan query yang sedang berjalan
      await queryClient.cancelQueries({
        queryKey: taskKeys.byProject(projectId),
      });

      // Simpan state sebelumnya untuk rollback
      const previousTasks = queryClient.getQueriesData({
        queryKey: taskKeys.byProject(projectId),
      });

      // Update semua query yang match (semua filter state)
      queryClient.setQueriesData(
        { queryKey: taskKeys.byProject(projectId) },
        (oldData: TaskWithRelations[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((task) =>
            task.id === taskId
              ? { ...task, status: newStatus as TaskWithRelations["status"] }
              : task
          );
        }
      );

      return { previousTasks };
    },

    // Kalau gagal, rollback ke state sebelumnya
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Setelah selesai (sukses atau gagal), sync dengan server
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byProject(projectId),
      });
    },
  });
}

// ── Delete Task ───────────────────────────────────────────────────────
export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTaskAction(taskId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: taskKeys.byProject(projectId),
      });
    },
  });
}
```

---

## Step 7: Global useDebounce Hook

### `src/hooks/useDebounce.ts`

```typescript
// src/hooks/useDebounce.ts
"use client";

import { useState, useEffect } from "react";

/**
 * Delay update nilai sampai user berhenti mengetik
 * @param value - nilai yang ingin di-debounce
 * @param delay - delay dalam milliseconds
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: batalkan timer kalau value berubah sebelum delay habis
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## Step 8: TaskCard Component

### `src/features/task/components/TaskCard.tsx`

```tsx
// src/features/task/components/TaskCard.tsx
"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskModal } from "./TaskModal";
import { formatRelativeDate } from "@/lib/utils";
import { CalendarDays, MessageSquare, GripVertical, Flag } from "lucide-react";
import type { TaskWithRelations } from "../schemas/task.schema";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithRelations;
  projectId: string;
  workspaceId: string;
  currentUserId: string;
  currentUserRole: string;
}

// Warna badge untuk priority
const PRIORITY_CONFIG = {
  LOW: { label: "Low", className: "bg-slate-100 text-slate-700" },
  MEDIUM: { label: "Medium", className: "bg-blue-100 text-blue-700" },
  HIGH: { label: "High", className: "bg-orange-100 text-orange-700" },
  URGENT: { label: "Urgent", className: "bg-red-100 text-red-700 font-semibold" },
} as const;

export function TaskCard({
  task,
  projectId,
  workspaceId,
  currentUserId,
  currentUserRole,
}: TaskCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Drag & drop hooks dari @dnd-kit/sortable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Cek apakah task sudah overdue
  const isOverdue =
    task.dueDate &&
    task.status !== "DONE" &&
    new Date(task.dueDate) < new Date();

  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group relative",
          isDragging && "opacity-50 rotate-2 scale-105"
        )}
      >
        <Card
          className="p-3 cursor-pointer hover:shadow-md transition-all border hover:border-primary/30"
          onClick={() => setIsModalOpen(true)}
        >
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground p-1"
            onClick={(e) => e.stopPropagation()} // Jangan trigger modal saat drag
          >
            <GripVertical size={14} />
          </div>

          <div className="pl-4 space-y-2">
            {/* Title */}
            <p className={cn(
              "text-sm font-medium leading-snug",
              task.status === "DONE" && "line-through text-muted-foreground"
            )}>
              {task.title}
            </p>

            {/* Priority + Due date */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-md flex items-center gap-1",
                  priorityConfig.className
                )}
              >
                <Flag size={10} />
                {priorityConfig.label}
              </span>

              {task.dueDate && (
                <span
                  className={cn(
                    "text-xs flex items-center gap-1",
                    isOverdue
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <CalendarDays size={10} />
                  {isOverdue ? "⚠ " : ""}
                  {new Date(task.dueDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </div>

            {/* Footer: assignee + comment count */}
            <div className="flex items-center justify-between">
              {task.assignee ? (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.assignee.image ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {task.assignee.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {task.assignee.name}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              )}

              {task._count.comments > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MessageSquare size={10} />
                  {task._count.comments}
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Task Detail Modal */}
      <TaskModal
        taskId={task.id}
        projectId={projectId}
        workspaceId={workspaceId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </>
  );
}
```

---

## Step 9: TaskColumn Component

### `src/features/task/components/TaskColumn.tsx`

```tsx
// src/features/task/components/TaskColumn.tsx
"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { TaskForm } from "./TaskForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "../schemas/task.schema";

// Config visual per kolom
const COLUMN_CONFIG = {
  TODO: {
    label: "To Do",
    dotColor: "bg-slate-400",
    headerClass: "border-t-slate-400",
  },
  IN_PROGRESS: {
    label: "In Progress",
    dotColor: "bg-blue-400",
    headerClass: "border-t-blue-400",
  },
  IN_REVIEW: {
    label: "In Review",
    dotColor: "bg-yellow-400",
    headerClass: "border-t-yellow-400",
  },
  DONE: {
    label: "Done",
    dotColor: "bg-green-400",
    headerClass: "border-t-green-400",
  },
} as const;

interface TaskColumnProps {
  status: keyof typeof COLUMN_CONFIG;
  tasks: TaskWithRelations[];
  projectId: string;
  workspaceId: string;
  currentUserId: string;
  currentUserRole: string;
  canCreateTasks: boolean;
}

export function TaskColumn({
  status,
  tasks,
  projectId,
  workspaceId,
  currentUserId,
  currentUserRole,
  canCreateTasks,
}: TaskColumnProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const config = COLUMN_CONFIG[status];

  // Droppable dari @dnd-kit/core
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column Header */}
      <div
        className={cn(
          "bg-muted/50 rounded-t-lg border-t-4 px-3 py-2.5",
          config.headerClass
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
            <span className="text-sm font-semibold">{config.label}</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
              {tasks.length}
            </span>
          </div>

          {canCreateTasks && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Plus size={14} />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Task Baru</DialogTitle>
                </DialogHeader>
                <TaskForm
                  projectId={projectId}
                  defaultStatus={status}
                  onSuccess={() => setIsCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Droppable Task List */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-32 p-2 rounded-b-lg bg-muted/30 transition-colors space-y-2",
          isOver && "bg-primary/5 ring-2 ring-primary/20"
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              workspaceId={workspaceId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Tidak ada task di sini
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Step 10: TaskBoard (Main Component)

### `src/features/task/components/TaskBoard.tsx`

```tsx
// src/features/task/components/TaskBoard.tsx
"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { TaskColumn } from "./TaskColumn";
import { TaskCard } from "./TaskCard";
import { TaskFilters } from "./TaskFilters";
import { useTasks, useUpdateTaskStatus } from "../hooks/useTasks";
import { useWorkspaceRole } from "@/features/workspace/hooks/useWorkspaceRole";
import { Loader2 } from "lucide-react";
import type { TaskWithRelations } from "../schemas/task.schema";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;

interface TaskBoardProps {
  projectId: string;
  workspaceId: string;
  currentUserId: string;
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
  members: Array<{ user: { id: string; name: string | null; image: string | null } }>;
}

export function TaskBoard({
  projectId,
  workspaceId,
  currentUserId,
  currentUserRole,
  members,
}: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);

  const { data: tasks = [], isLoading } = useTasks(projectId);
  const updateStatus = useUpdateTaskStatus(projectId);
  const { canCreateTasks } = useWorkspaceRole(currentUserRole);

  // Konfigurasi sensor drag & drop
  const sensors = useSensors(
    // Mouse: butuh move 8px sebelum drag dimulai (biar klik task card tidak trigger drag)
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    // Touch: butuh hold 250ms (biar scroll tidak trigger drag di mobile)
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Cari task yang di-drag
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Jangan update kalau status sama
    if (task.status === newStatus) return;

    // Validasi newStatus adalah status yang valid
    if (!STATUSES.includes(newStatus as any)) return;

    // Update! Optimistic update sudah di-handle di hook
    updateStatus.mutate({ taskId, newStatus });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <TaskFilters
        members={members}
        canCreateTasks={canCreateTasks}
        projectId={projectId}
      />

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => (
            <TaskColumn
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
              projectId={projectId}
              workspaceId={workspaceId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              canCreateTasks={canCreateTasks}
            />
          ))}
        </div>

        {/* Drag Overlay: tampil saat sedang drag */}
        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              projectId={projectId}
              workspaceId={workspaceId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
```

---

## Step 11: TaskFilters

### `src/features/task/components/TaskFilters.tsx`

```tsx
// src/features/task/components/TaskFilters.tsx
"use client";

import { useTaskFilterStore } from "@/stores/taskFilterStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TaskForm } from "./TaskForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, X, Plus, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

interface TaskFiltersProps {
  members: Array<{
    user: { id: string; name: string | null; image: string | null };
  }>;
  canCreateTasks: boolean;
  projectId: string;
}

export function TaskFilters({
  members,
  canCreateTasks,
  projectId,
}: TaskFiltersProps) {
  const {
    search, status, priority, assigneeId,
    setSearch, setStatus, setPriority, setAssigneeId,
    resetFilters,
  } = useTaskFilterStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const hasActiveFilters =
    search || status !== "all" || priority !== "all" || assigneeId !== "all";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Cari task..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-36 h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status</SelectItem>
          <SelectItem value="TODO">To Do</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="IN_REVIEW">In Review</SelectItem>
          <SelectItem value="DONE">Done</SelectItem>
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select value={priority} onValueChange={setPriority}>
        <SelectTrigger className="w-36 h-9">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Priority</SelectItem>
          <SelectItem value="LOW">🟢 Low</SelectItem>
          <SelectItem value="MEDIUM">🔵 Medium</SelectItem>
          <SelectItem value="HIGH">🟠 High</SelectItem>
          <SelectItem value="URGENT">🔴 Urgent</SelectItem>
        </SelectContent>
      </Select>

      {/* Assignee Filter */}
      <Select value={assigneeId} onValueChange={setAssigneeId}>
        <SelectTrigger className="w-40 h-9">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Member</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.user.id} value={m.user.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={m.user.image ?? undefined} />
                  <AvatarFallback className="text-[8px]">
                    {m.user.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {m.user.name ?? "Anonymous"}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Reset button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-9 text-muted-foreground"
        >
          <X size={14} className="mr-1" />
          Reset
        </Button>
      )}

      {/* Create Task Button */}
      {canCreateTasks && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 ml-auto">
              <Plus size={14} className="mr-1" />
              Tambah Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Task Baru</DialogTitle>
            </DialogHeader>
            <TaskForm
              projectId={projectId}
              onSuccess={() => setIsCreateOpen(false)}
              members={members}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
```

---

## Step 12: TaskForm

### `src/features/task/components/TaskForm.tsx`

```tsx
// src/features/task/components/TaskForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTaskSchema,
  type CreateTaskFormData,
} from "../schemas/task.schema";
import { createTaskAction } from "../actions/task.actions";
import { useQueryClient } from "@tanstack/react-query";
import { taskKeys } from "../hooks/useTasks";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface TaskFormProps {
  projectId: string;
  defaultStatus?: string;
  onSuccess?: () => void;
  members?: Array<{
    user: { id: string; name: string | null; image: string | null };
  }>;
}

export function TaskForm({
  projectId,
  defaultStatus = "TODO",
  onSuccess,
  members = [],
}: TaskFormProps) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      status: defaultStatus as any,
      priority: "MEDIUM",
    },
  });

  function onSubmit(data: CreateTaskFormData) {
    startTransition(async () => {
      const result = await createTaskAction(projectId, data);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Task berhasil dibuat!");
        // Invalidate agar list ter-refresh
        queryClient.invalidateQueries({
          queryKey: taskKeys.byProject(projectId),
        });
        onSuccess?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Judul Task *</Label>
        <Input
          id="title"
          placeholder="Apa yang perlu dikerjakan?"
          {...register("title")}
          disabled={isPending}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi (opsional)</Label>
        <Textarea
          id="description"
          placeholder="Detail tambahan..."
          rows={3}
          {...register("description")}
          disabled={isPending}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            defaultValue="MEDIUM"
            onValueChange={(val) => setValue("priority", val as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">🟢 Low</SelectItem>
              <SelectItem value="MEDIUM">🔵 Medium</SelectItem>
              <SelectItem value="HIGH">🟠 High</SelectItem>
              <SelectItem value="URGENT">🔴 Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            {...register("dueDate")}
            disabled={isPending}
          />
        </div>
      </div>

      {members.length > 0 && (
        <div className="space-y-2">
          <Label>Assign ke</Label>
          <Select onValueChange={(val) => setValue("assigneeId", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih member..." />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.user.id} value={m.user.id}>
                  {m.user.name ?? "Anonymous"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Membuat task...
          </>
        ) : (
          "Buat Task"
        )}
      </Button>
    </form>
  );
}
```

---

## Step 13: TaskModal dengan Komentar

### `src/features/task/components/TaskModal.tsx`

```tsx
// src/features/task/components/TaskModal.tsx
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TaskComments } from "./TaskComments";
import { deleteTaskAction } from "../actions/task.actions";
import { useDeleteTask } from "../hooks/useTasks";
import { taskKeys } from "../hooks/useTasks";
import { formatDate, cn } from "@/lib/utils";
import { CalendarDays, Flag, Trash2, Edit2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useState } from "react";

interface TaskModalProps {
  taskId: string;
  projectId: string;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserRole: string;
}

const PRIORITY_COLORS = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const STATUS_COLORS = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-yellow-100 text-yellow-700",
  DONE: "bg-green-100 text-green-700",
};

export function TaskModal({
  taskId,
  projectId,
  workspaceId,
  isOpen,
  onClose,
  currentUserId,
  currentUserRole,
}: TaskModalProps) {
  const queryClient = useQueryClient();
  const deleteTask = useDeleteTask(projectId);

  // Fetch task detail
  const { data: tasks = [] } = useQuery({
    queryKey: taskKeys.byProject(projectId),
    // Data sudah di cache dari board view, jadi ini tidak akan re-fetch
    staleTime: Infinity,
  });

  const task = tasks.find((t: any) => t.id === taskId);

  if (!task) return null;

  const isOverdue =
    task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();

  async function handleDelete() {
    if (!confirm("Yakin ingin menghapus task ini?")) return;

    deleteTask.mutate(taskId, {
      onSuccess: () => {
        toast.success("Task berhasil dihapus");
        onClose();
      },
      onError: () => {
        toast.error("Gagal menghapus task");
      },
    });
  }

  const canDelete =
    task.creatorId === currentUserId ||
    ["OWNER", "ADMIN"].includes(currentUserRole);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <DialogTitle className="text-left text-lg font-semibold leading-snug">
              {task.title}
            </DialogTitle>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                disabled={deleteTask.isPending}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full font-medium",
                STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]
              )}
            >
              {task.status.replace("_", " ")}
            </span>
            <span
              className={cn(
                "text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1",
                PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]
              )}
            >
              <Flag size={10} />
              {task.priority}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                Deskripsi
              </p>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                Assignee
              </p>
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {task.assignee.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{task.assignee.name}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                Due Date
              </p>
              {task.dueDate ? (
                <span
                  className={cn(
                    "flex items-center gap-1",
                    isOverdue && "text-destructive font-medium"
                  )}
                >
                  <CalendarDays size={14} />
                  {isOverdue && "⚠ "}
                  {formatDate(task.dueDate)}
                </span>
              ) : (
                <span className="text-muted-foreground">Tidak ada</span>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                Dibuat oleh
              </p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={task.creator.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {task.creator.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span>{task.creator.name}</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                Dibuat
              </p>
              <span>{formatDate(task.createdAt)}</span>
            </div>
          </div>

          {/* Divider */}
          <hr />

          {/* Comments */}
          <TaskComments
            taskId={taskId}
            currentUserId={currentUserId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Step 14: TaskComments

### `src/features/task/components/TaskComments.tsx`

```tsx
// src/features/task/components/TaskComments.tsx
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCommentSchema,
  type CreateCommentFormData,
} from "../schemas/task.schema";
import { addCommentAction } from "../actions/task.actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useTransition } from "react";

interface TaskCommentsProps {
  taskId: string;
  currentUserId: string;
}

export function TaskComments({ taskId, currentUserId }: TaskCommentsProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      if (!res.ok) throw new Error("Gagal memuat komentar");
      return res.json();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCommentFormData>({
    resolver: zodResolver(createCommentSchema),
  });

  function onSubmit(data: CreateCommentFormData) {
    startTransition(async () => {
      const result = await addCommentAction(taskId, data);
      if (result?.error) {
        toast.error(result.error);
      } else {
        reset();
        // Refresh comments
        queryClient.invalidateQueries({
          queryKey: ["task-comments", taskId],
        });
      }
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">
        Komentar {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment List */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada komentar. Jadilah yang pertama!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage src={comment.user.image ?? undefined} />
                <AvatarFallback className="text-xs">
                  {comment.user.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">
                    {comment.user.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <Textarea
          placeholder="Tulis komentar..."
          rows={2}
          {...register("content")}
          disabled={isPending}
          className="resize-none"
          // Kirim dengan Ctrl+Enter
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              handleSubmit(onSubmit)();
            }
          }}
        />
        {errors.content && (
          <p className="text-xs text-destructive">{errors.content.message}</p>
        )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Ctrl+Enter untuk kirim
          </p>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send size={14} className="mr-1" />
                Kirim
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

---

## Common Pitfalls Fase 4

### ❌ Pitfall 1: Drag & drop tidak bekerja di mobile

**Masalah:** Pengguna mobile tidak bisa drag task.

**Solusi:** Gunakan `TouchSensor` dengan delay yang tepat. Delay 250ms membedakan scroll dari drag:
```typescript
useSensor(TouchSensor, {
  activationConstraint: { delay: 250, tolerance: 5 },
})
```

---

### ❌ Pitfall 2: Optimistic update conflict

**Masalah:** Saat drag cepat berurutan, state bisa inconsistent.

**Solusi:** Gunakan `cancelQueries` sebelum mutate untuk batalkan fetch yang sedang berlangsung, lalu `invalidateQueries` di `onSettled` untuk sync akhir dengan server.

---

### ❌ Pitfall 3: Filter tidak apply ke drag & drop

**Masalah:** Setelah filter, user drag task ke kolom lain tapi task melompat ke posisi aneh.

**Solusi:** Drag & drop bekerja pada **status kolom** sebagai droppable ID, bukan posisi dalam array. Update hanya status task, bukan urutan. Urutan bisa di-handle terpisah kalau perlu.

---

### ❌ Pitfall 4: `revalidatePath` dengan dynamic segments

**Masalah:** `revalidatePath('/workspace/[workspaceId]/...')` tidak bekerja karena Next.js tidak tahu workspaceId mana.

**Solusi:** Pass workspaceId sebagai parameter ke server action dan gunakan path yang tepat:
```typescript
revalidatePath(`/workspace/${workspaceId}/projects/${projectId}`);
```

---

### ❌ Pitfall 5: Komentar tidak muncul real-time

**Masalah:** Setelah submit komentar, list tidak terupdate.

**Solusi:** Setelah server action sukses, panggil `queryClient.invalidateQueries` untuk query key comment yang tepat.

---

## Checklist Fase 4

- [ ] Task board tampil dengan 4 kolom
- [ ] Tambah task dari board berhasil, langsung muncul di kolom yang sesuai
- [ ] Drag task ke kolom berbeda berhasil mengubah status
- [ ] Filter by status, priority, assignee bekerja
- [ ] Search task dengan debounce (tidak spam request) bekerja
- [ ] TaskCard menampilkan overdue indicator merah jika due date terlewat
- [ ] Task modal terbuka dengan detail lengkap saat card diklik  
- [ ] Tambah komentar di task modal berhasil
- [ ] Hapus task berhasil (dengan konfirmasi)
- [ ] Role-based: guest tidak bisa buat/hapus task

---

## Lanjut ke Fase 5

Task management sudah komplit! Sekarang kita bangun **Dashboard & Analytics** — visualisasi data progress workspace dengan grafik dari Recharts.
