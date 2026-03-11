# Flowspace — Fase 3: Workspace & Project Management

> **Fase ini menghasilkan:** User bisa membuat workspace, invite member (simulasi via email), buat/edit/hapus project, dan UI berubah berdasarkan role (owner/admin vs member/guest).

---

## Gambaran Besar

Di fase ini kita bangun "core" dari aplikasi: struktur hierarki **Workspace → Project**. Setiap workspace punya members dengan role berbeda, dan hanya role tertentu yang bisa melakukan aksi tertentu.

```
User
 └─ WorkspaceMember (role: owner/admin/member/guest)
      └─ Workspace
           └─ Project
                └─ Task (Fase 4)
```

---

## Step 1: Server Actions untuk Workspace

### `src/features/workspace/actions/workspace.actions.ts`

```typescript
// src/features/workspace/actions/workspace.actions.ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema,
} from "../schemas/workspace.schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { WorkspaceRole } from "@prisma/client";
import { generateSlug } from "@/lib/utils";

// ── Helper: cek apakah user adalah owner atau admin ───────────────────
async function requireWorkspaceRole(
  workspaceId: string,
  userId: string,
  allowedRoles: WorkspaceRole[]
) {
  const member = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });

  if (!member || !allowedRoles.includes(member.role)) {
    throw new Error("Kamu tidak punya izin untuk melakukan aksi ini");
  }

  return member;
}

// ── Create Workspace ──────────────────────────────────────────────────
export async function createWorkspaceAction(formData: unknown) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = createWorkspaceSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { name, description } = parsed.data;

  // Generate slug unik dari nama workspace
  let slug = generateSlug(name);
  const existingSlug = await db.workspace.findUnique({ where: { slug } });
  // Jika slug sudah ada, tambahkan random suffix
  if (existingSlug) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // Buat workspace dan langsung set user sebagai OWNER
  const workspace = await db.workspace.create({
    data: {
      name,
      slug,
      description,
      members: {
        create: {
          userId: session.user.id,
          role: WorkspaceRole.OWNER,
        },
      },
    },
  });

  revalidatePath("/dashboard");
  redirect(`/workspace/${workspace.id}`);
}

// ── Update Workspace ──────────────────────────────────────────────────
export async function updateWorkspaceAction(
  workspaceId: string,
  formData: unknown
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = updateWorkspaceSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Hanya owner dan admin yang bisa update
  try {
    await requireWorkspaceRole(workspaceId, session.user.id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
  } catch {
    return { error: "Kamu tidak punya izin untuk mengubah workspace ini" };
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: parsed.data,
  });

  revalidatePath(`/workspace/${workspaceId}`);
  revalidatePath(`/workspace/${workspaceId}/settings`);
  return { success: true };
}

// ── Delete Workspace ──────────────────────────────────────────────────
export async function deleteWorkspaceAction(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Hanya OWNER yang bisa hapus workspace
  try {
    await requireWorkspaceRole(workspaceId, session.user.id, [
      WorkspaceRole.OWNER,
    ]);
  } catch {
    return { error: "Hanya owner yang bisa menghapus workspace" };
  }

  // Prisma cascade akan hapus semua workspace members, projects, tasks
  await db.workspace.delete({ where: { id: workspaceId } });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ── Invite Member (simulasi) ──────────────────────────────────────────
export async function inviteMemberAction(
  workspaceId: string,
  formData: unknown
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = inviteMemberSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { email, role } = parsed.data;

  // Cek permission
  try {
    await requireWorkspaceRole(workspaceId, session.user.id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
  } catch {
    return { error: "Kamu tidak punya izin untuk invite member" };
  }

  // Cari user berdasarkan email
  const userToInvite = await db.user.findUnique({ where: { email } });
  if (!userToInvite) {
    return {
      error: "User dengan email tersebut belum terdaftar di Flowspace",
    };
  }

  // Cek apakah sudah jadi member
  const existingMember = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: userToInvite.id,
      },
    },
  });

  if (existingMember) {
    return { error: "User ini sudah menjadi member workspace" };
  }

  // Tambahkan sebagai member
  await db.workspaceMember.create({
    data: {
      workspaceId,
      userId: userToInvite.id,
      role: role as WorkspaceRole,
    },
  });

  revalidatePath(`/workspace/${workspaceId}/settings`);
  return { success: true };
}

// ── Remove Member ─────────────────────────────────────────────────────
export async function removeMemberAction(
  workspaceId: string,
  targetUserId: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  // Tidak boleh hapus diri sendiri dari sini
  if (targetUserId === session.user.id) {
    return { error: "Gunakan 'Leave Workspace' untuk keluar dari workspace" };
  }

  // Cek permission
  try {
    await requireWorkspaceRole(workspaceId, session.user.id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
  } catch {
    return { error: "Kamu tidak punya izin untuk menghapus member" };
  }

  // Tidak bisa hapus OWNER
  const targetMember = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUserId,
      },
    },
  });

  if (targetMember?.role === WorkspaceRole.OWNER) {
    return { error: "Owner tidak bisa dihapus dari workspace" };
  }

  await db.workspaceMember.delete({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: targetUserId,
      },
    },
  });

  revalidatePath(`/workspace/${workspaceId}/settings`);
  return { success: true };
}
```

---

## Step 2: Schemas Workspace

### `src/features/workspace/schemas/workspace.schema.ts`

```typescript
// src/features/workspace/schemas/workspace.schema.ts
import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Nama workspace minimal 2 karakter")
    .max(50, "Nama workspace maksimal 50 karakter"),
  description: z
    .string()
    .max(200, "Deskripsi maksimal 200 karakter")
    .optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export const inviteMemberSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  role: z.enum(["ADMIN", "MEMBER", "GUEST"], {
    errorMap: () => ({ message: "Role tidak valid" }),
  }),
});

export type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceFormData = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;
```

---

## Step 3: TanStack Query Hooks untuk Workspace

Ini kita pakai untuk **client-side data fetching** setelah initial load:

### `src/features/workspace/hooks/useWorkspace.ts`

```typescript
// src/features/workspace/hooks/useWorkspace.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Query Keys (centralized) ──────────────────────────────────────────
export const workspaceKeys = {
  all: ["workspaces"] as const,
  myWorkspaces: () => [...workspaceKeys.all, "my"] as const,
  detail: (id: string) => [...workspaceKeys.all, id] as const,
  members: (id: string) => [...workspaceKeys.detail(id), "members"] as const,
};

// ── Fetch Functions ───────────────────────────────────────────────────
// Ini memanggil API routes yang akan kita buat

async function fetchMyWorkspaces() {
  const res = await fetch("/api/workspaces");
  if (!res.ok) throw new Error("Gagal mengambil data workspace");
  return res.json();
}

async function fetchWorkspaceMembers(workspaceId: string) {
  const res = await fetch(`/api/workspaces/${workspaceId}/members`);
  if (!res.ok) throw new Error("Gagal mengambil data member");
  return res.json();
}

// ── Hooks ─────────────────────────────────────────────────────────────

export function useMyWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.myWorkspaces(),
    queryFn: fetchMyWorkspaces,
    staleTime: 1000 * 60 * 5, // Data dianggap fresh selama 5 menit
  });
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => fetchWorkspaceMembers(workspaceId),
    enabled: !!workspaceId,
  });
}
```

---

## Step 4: API Routes untuk Workspace

Kita butuh API routes untuk TanStack Query memanggil dari client:

### `src/app/api/workspaces/route.ts`

```typescript
// src/app/api/workspaces/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await db.workspace.findMany({
    where: {
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
        take: 5, // Hanya ambil 5 member untuk preview
      },
      _count: {
        select: { projects: true, members: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(workspaces);
}
```

### `src/app/api/workspaces/[workspaceId]/members/route.ts`

```typescript
// src/app/api/workspaces/[workspaceId]/members/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pastikan user adalah member workspace ini
  const isMember = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: params.workspaceId,
        userId: session.user.id,
      },
    },
  });

  if (!isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await db.workspaceMember.findMany({
    where: { workspaceId: params.workspaceId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}
```

---

## Step 5: Komponen WorkspaceCard

### `src/features/workspace/components/WorkspaceCard.tsx`

```tsx
// src/features/workspace/components/WorkspaceCard.tsx
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FolderOpen, Users } from "lucide-react";

interface WorkspaceCardProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo: string | null;
    _count: { projects: number; members: number };
    members: Array<{
      role: string;
      user: { id: string; name: string | null; image: string | null };
    }>;
  };
  currentUserRole: string;
}

export function WorkspaceCard({ workspace, currentUserRole }: WorkspaceCardProps) {
  return (
    <Link href={`/workspace/${workspace.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {/* Logo workspace */}
              {workspace.logo ? (
                <img
                  src={workspace.logo}
                  alt={workspace.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {workspace.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {workspace.slug}
                </p>
              </div>
            </div>
            {/* Role badge */}
            <Badge variant={currentUserRole === "OWNER" ? "default" : "secondary"}>
              {currentUserRole.toLowerCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {workspace.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {workspace.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FolderOpen size={14} />
                {workspace._count.projects} project
              </span>
              <span className="flex items-center gap-1">
                <Users size={14} />
                {workspace._count.members} member
              </span>
            </div>
            {/* Member avatars preview */}
            <div className="flex -space-x-2">
              {workspace.members.slice(0, 4).map((member) => (
                <Avatar key={member.user.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={member.user.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {member.user.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
              {workspace._count.members > 4 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                  +{workspace._count.members - 4}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

---

## Step 6: Form Buat Workspace

### `src/features/workspace/components/WorkspaceForm.tsx`

```tsx
// src/features/workspace/components/WorkspaceForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createWorkspaceSchema,
  type CreateWorkspaceFormData,
} from "../schemas/workspace.schema";
import {
  createWorkspaceAction,
  updateWorkspaceAction,
} from "../actions/workspace.actions";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface WorkspaceFormProps {
  // Kalau ada `workspace`, kita dalam mode edit. Kalau tidak ada, mode create.
  workspace?: {
    id: string;
    name: string;
    description: string | null;
  };
  onSuccess?: () => void;
}

export function WorkspaceForm({ workspace, onSuccess }: WorkspaceFormProps) {
  const [isPending, startTransition] = useTransition();
  const isEditing = !!workspace;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: workspace?.name ?? "",
      description: workspace?.description ?? "",
    },
  });

  function onSubmit(data: CreateWorkspaceFormData) {
    startTransition(async () => {
      let result;
      if (isEditing) {
        result = await updateWorkspaceAction(workspace.id, data);
      } else {
        result = await createWorkspaceAction(data);
      }

      if (result?.error) {
        toast.error(result.error);
      } else if (isEditing) {
        toast.success("Workspace berhasil diupdate!");
        onSuccess?.();
      }
      // Kalau create, redirect sudah di-handle di server action
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nama Workspace *</Label>
        <Input
          id="name"
          placeholder="Nama tim atau perusahaan kamu"
          {...register("name")}
          disabled={isPending}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi (opsional)</Label>
        <Textarea
          id="description"
          placeholder="Ceritakan sedikit tentang workspace ini..."
          rows={3}
          {...register("description")}
          disabled={isPending}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isEditing ? "Menyimpan..." : "Membuat workspace..."}
          </>
        ) : isEditing ? (
          "Simpan Perubahan"
        ) : (
          "Buat Workspace"
        )}
      </Button>
    </form>
  );
}
```

---

## Step 7: Invite Member Modal

### `src/features/workspace/components/InviteModal.tsx`

```tsx
// src/features/workspace/components/InviteModal.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  inviteMemberSchema,
  type InviteMemberFormData,
} from "../schemas/workspace.schema";
import { inviteMemberAction } from "../actions/workspace.actions";
import { useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Loader2, UserPlus } from "lucide-react";

interface InviteModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ workspaceId, isOpen, onClose }: InviteModalProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: "MEMBER" },
  });

  function onSubmit(data: InviteMemberFormData) {
    startTransition(async () => {
      const result = await inviteMemberAction(workspaceId, data);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Member berhasil diundang!");
        reset();
        onClose();
      }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus size={18} />
            Undang Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="rekan@contoh.com"
              {...register("email")}
              disabled={isPending}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              defaultValue="MEMBER"
              onValueChange={(val) =>
                setValue("role", val as "ADMIN" | "MEMBER" | "GUEST")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">
                  <div>
                    <p className="font-medium">Admin</p>
                    <p className="text-xs text-muted-foreground">
                      Bisa manage projects, members, dan tasks
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value="MEMBER">
                  <div>
                    <p className="font-medium">Member</p>
                    <p className="text-xs text-muted-foreground">
                      Bisa buat dan edit tasks
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value="GUEST">
                  <div>
                    <p className="font-medium">Guest</p>
                    <p className="text-xs text-muted-foreground">
                      Hanya bisa lihat tasks
                    </p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="flex-1"
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Undang"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Step 8: Server Actions untuk Project

### `src/features/project/actions/project.actions.ts`

```typescript
// src/features/project/actions/project.actions.ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createProjectSchema, updateProjectSchema } from "../schemas/project.schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { WorkspaceRole } from "@prisma/client";

// Helper: pastikan user adalah member workspace dengan role yang diizinkan
async function requireMembership(
  workspaceId: string,
  userId: string,
  allowedRoles: WorkspaceRole[] = [
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.MEMBER,
  ]
) {
  const member = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
  });

  if (!member || !allowedRoles.includes(member.role)) {
    throw new Error("Tidak punya izin");
  }

  return member;
}

// ── Create Project ────────────────────────────────────────────────────
export async function createProjectAction(
  workspaceId: string,
  formData: unknown
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = createProjectSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  try {
    await requireMembership(workspaceId, session.user.id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
  } catch {
    return { error: "Hanya owner dan admin yang bisa membuat project" };
  }

  const project = await db.project.create({
    data: {
      ...parsed.data,
      workspaceId,
    },
  });

  revalidatePath(`/workspace/${workspaceId}`);
  redirect(`/workspace/${workspaceId}/projects/${project.id}`);
}

// ── Update Project ────────────────────────────────────────────────────
export async function updateProjectAction(
  projectId: string,
  workspaceId: string,
  formData: unknown
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const parsed = updateProjectSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  try {
    await requireMembership(workspaceId, session.user.id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
  } catch {
    return { error: "Tidak punya izin" };
  }

  await db.project.update({
    where: { id: projectId },
    data: parsed.data,
  });

  revalidatePath(`/workspace/${workspaceId}`);
  revalidatePath(`/workspace/${workspaceId}/projects/${projectId}`);
  return { success: true };
}

// ── Delete Project ────────────────────────────────────────────────────
export async function deleteProjectAction(
  projectId: string,
  workspaceId: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  try {
    await requireMembership(workspaceId, session.user.id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
  } catch {
    return { error: "Hanya owner dan admin yang bisa menghapus project" };
  }

  await db.project.delete({ where: { id: projectId } });

  revalidatePath(`/workspace/${workspaceId}`);
  redirect(`/workspace/${workspaceId}`);
}
```

---

## Step 9: Schemas Project

### `src/features/project/schemas/project.schema.ts`

```typescript
// src/features/project/schemas/project.schema.ts
import { z } from "zod";

// Daftar warna yang tersedia
const PROJECT_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#0ea5e9", // sky
];

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, "Nama project wajib diisi")
    .max(100, "Nama project maksimal 100 karakter"),
  description: z.string().max(500).optional(),
  color: z.string().default("#6366f1"),
  emoji: z.string().max(2).default("📋"),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectFormData = z.infer<typeof createProjectSchema>;
export type UpdateProjectFormData = z.infer<typeof updateProjectSchema>;
```

---

## Step 10: Role-Based UI

Ini adalah hook yang menentukan apa yang boleh dilakukan user berdasarkan role-nya:

### `src/features/workspace/hooks/useWorkspaceRole.ts`

```typescript
// src/features/workspace/hooks/useWorkspaceRole.ts
"use client";

import { WorkspaceRole } from "@prisma/client";

type Role = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

/**
 * Hook untuk role-based UI permissions.
 * Bukan sebagai pengganti server-side auth — ini hanya untuk UI.
 * Server action tetap harus validasi sendiri.
 */
export function useWorkspaceRole(role: Role | undefined) {
  const canManageWorkspace = role === "OWNER" || role === "ADMIN";
  const canManageProjects = role === "OWNER" || role === "ADMIN";
  const canCreateTasks = role !== "GUEST" && !!role;
  const canDeleteWorkspace = role === "OWNER";
  const canInviteMembers = role === "OWNER" || role === "ADMIN";

  return {
    role,
    canManageWorkspace,
    canManageProjects,
    canCreateTasks,
    canDeleteWorkspace,
    canInviteMembers,
    isOwner: role === "OWNER",
    isAdmin: role === "ADMIN",
    isMember: role === "MEMBER",
    isGuest: role === "GUEST",
  };
}
```

**Cara pakai di komponen:**

```tsx
// Contoh penggunaan
"use client";
import { useWorkspaceRole } from "@/features/workspace/hooks/useWorkspaceRole";

function WorkspaceActions({ userRole }: { userRole: "OWNER" | "ADMIN" | "MEMBER" | "GUEST" }) {
  const { canInviteMembers, canDeleteWorkspace } = useWorkspaceRole(userRole);

  return (
    <div>
      {canInviteMembers && (
        <Button onClick={openInviteModal}>Undang Member</Button>
      )}
      {canDeleteWorkspace && (
        <Button variant="destructive" onClick={handleDelete}>
          Hapus Workspace
        </Button>
      )}
    </div>
  );
}
```

---

## Step 11: Pages

### `src/app/(dashboard)/workspace/[workspaceId]/page.tsx`

```tsx
// src/app/(dashboard)/workspace/[workspaceId]/page.tsx
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { WorkspaceDashboard } from "@/features/workspace/components/WorkspaceDashboard";

interface PageProps {
  params: { workspaceId: string };
}

export default async function WorkspacePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Ambil workspace + cek keanggotaan user
  const workspace = await db.workspace.findFirst({
    where: {
      id: params.workspaceId,
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      projects: {
        orderBy: { createdAt: "asc" },
        include: {
          _count: { select: { tasks: true } },
        },
      },
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  // Kalau workspace tidak ada atau user bukan member → 404
  if (!workspace) notFound();

  const currentUserRole = workspace.members[0]?.role ?? "GUEST";

  return (
    <WorkspaceDashboard
      workspace={workspace}
      currentUserRole={currentUserRole}
    />
  );
}
```

### `src/features/workspace/components/WorkspaceDashboard.tsx`

```tsx
// src/features/workspace/components/WorkspaceDashboard.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/features/project/components/ProjectCard";
import { ProjectForm } from "@/features/project/components/ProjectForm";
import { InviteModal } from "./InviteModal";
import { useWorkspaceRole } from "../hooks/useWorkspaceRole";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, UserPlus } from "lucide-react";

interface WorkspaceDashboardProps {
  workspace: {
    id: string;
    name: string;
    description: string | null;
    projects: Array<{
      id: string;
      name: string;
      description: string | null;
      color: string;
      emoji: string;
      _count: { tasks: number };
    }>;
  };
  currentUserRole: "OWNER" | "ADMIN" | "MEMBER" | "GUEST";
}

export function WorkspaceDashboard({
  workspace,
  currentUserRole,
}: WorkspaceDashboardProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const { canManageProjects, canInviteMembers } = useWorkspaceRole(currentUserRole);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-muted-foreground mt-1">{workspace.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {canInviteMembers && (
            <Button
              variant="outline"
              onClick={() => setIsInviteOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Undang
            </Button>
          )}
          {canManageProjects && (
            <Dialog
              open={isCreateProjectOpen}
              onOpenChange={setIsCreateProjectOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Project Baru
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Buat Project Baru</DialogTitle>
                </DialogHeader>
                <ProjectForm
                  workspaceId={workspace.id}
                  onSuccess={() => setIsCreateProjectOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {workspace.projects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Belum ada project</p>
          <p className="mt-1">
            {canManageProjects
              ? 'Klik "Project Baru" untuk memulai'
              : "Tunggu admin membuat project untuk workspace ini"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspace.projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspaceId={workspace.id}
              currentUserRole={currentUserRole}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <InviteModal
        workspaceId={workspace.id}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />
    </div>
  );
}
```

---

## Step 12: Utility Functions

### `src/lib/utils.ts` (tambahkan `generateSlug`)

```typescript
// Tambahkan di src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate URL-friendly slug dari string
 * "My Team Name" → "my-team-name"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")     // Hapus karakter spesial
    .replace(/[\s_-]+/g, "-")     // Ganti spasi/underscore dengan dash
    .replace(/^-+|-+$/g, "");     // Hapus dash di awal dan akhir
}

/**
 * Format tanggal ke string Indonesia
 * Date → "28 Februari 2026"
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format tanggal relatif
 * "3 menit yang lalu", "kemarin", dst.
 */
export function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay === 1) return "kemarin";
  if (diffDay < 7) return `${diffDay} hari lalu`;

  return formatDate(date);
}
```

---

## Common Pitfalls Fase 3

### ❌ Pitfall 1: N+1 Query di list workspace

**Masalah:** Setiap workspace mencari members secara terpisah.

**Solusi:** Selalu pakai `include` atau `_count` di Prisma, bukan fetch dalam loop:
```typescript
// ❌ Salah — N+1 query
const workspaces = await db.workspace.findMany();
for (const ws of workspaces) {
  ws.memberCount = await db.workspaceMember.count({ where: { workspaceId: ws.id } });
}

// ✅ Benar — 1 query
const workspaces = await db.workspace.findMany({
  include: { _count: { select: { members: true } } }
});
```

---

### ❌ Pitfall 2: Role check hanya di frontend

**Masalah:** User bisa manipulasi JavaScript dan bypass role check di UI.

**Solusi:** SELALU validasi role di server action atau API route. UI role check (`useWorkspaceRole`) hanya untuk UX, bukan security.

---

### ❌ Pitfall 3: Lupa `revalidatePath` setelah mutasi

**Masalah:** Setelah buat project baru, halaman workspace masih tampil data lama.

**Solusi:** Selalu panggil `revalidatePath()` di server action setelah perubahan database. Ini memberitahu Next.js untuk re-render halaman dengan data terbaru.

---

### ❌ Pitfall 4: Slug collision

**Masalah:** Dua workspace dengan nama sama menghasilkan slug yang sama.

**Solusi:** Cek keunikan slug sebelum create, dan tambahkan suffix acak seperti yang sudah ada di `createWorkspaceAction` di atas.

---

## Checklist Fase 3

- [ ] Buat workspace baru berhasil → redirect ke halaman workspace
- [ ] List workspace muncul di dashboard
- [ ] Buat project dalam workspace berhasil
- [ ] Card project tampil dengan benar
- [ ] Invite member lewat email berhasil (user harus sudah terdaftar)
- [ ] Role-based UI: tombol invite/hapus tidak muncul untuk MEMBER/GUEST
- [ ] Server action tetap validasi role meski UI disembunyikan
- [ ] Update workspace name berhasil
- [ ] Delete workspace berhasil (cascade hapus semua data)

---

## Lanjut ke Fase 4

Workspace dan project sudah ada. Saatnya masuk ke **inti dari app ini: Task Management** — task board dengan drag & drop, filter, dan masih banyak lagi.
