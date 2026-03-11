# Flowspace — Fase 9: Testing dengan Vitest & RTL

> **Fase ini menghasilkan:** Setup Vitest + React Testing Library, unit tests untuk utilities dan hooks, integration tests untuk komponen utama, mock untuk server actions & database, dan testing patterns yang reusable.

---

## Gambaran Besar

Testing di Next.js App Router + Server Actions butuh pendekatan khusus. Kita fokus pada:

1. **Unit Tests** — Pure functions, custom hooks, utilities
2. **Component Tests** — UI components dengan RTL
3. **Integration Tests** — Components yang melibatkan server actions (mock)

```
src/
 └── __tests__/
      ├── lib/
      │    ├── utils.test.ts
      │    └── errors.test.ts
      ├── features/
      │    ├── task/
      │    │    ├── TaskCard.test.tsx
      │    │    └── TaskFilters.test.tsx
      │    └── workspace/
      │         └── WorkspaceCard.test.tsx
      └── hooks/
           └── useDebounce.test.ts
```

---

## Step 1: Install Dependencies

```bash
npm install -D vitest @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @tanstack/react-query  # Sudah ada jika Fase 4 selesai
npm install -D msw  # Mock Service Worker untuk API mocking
```

---

## Step 2: Konfigurasi Vitest

### `vitest.config.ts`

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Simulasi browser environment
    environment: "jsdom",

    // Setup file dijalankan sebelum setiap test file
    setupFiles: ["./src/__tests__/setup.ts"],

    // Global test utilities (describe, it, expect, dll)
    globals: true,

    // Coverage config
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        "src/app/**", // Next.js pages, skip
        "src/types/**",
      ],
      // Minimum coverage thresholds
      thresholds: {
        statements: 60,
        branches: 60,
        functions: 60,
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### `src/__tests__/setup.ts`

```typescript
// src/__tests__/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup setelah setiap test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));
```

### Update `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:run": "vitest run"
  }
}
```

---

## Step 3: Test Utilities

Buat test wrappers yang reusable:

### `src/__tests__/utils.tsx`

```tsx
// src/__tests__/utils.tsx
import { type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";

/**
 * Buat QueryClient baru per test (isolasi state)
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Jangan retry di test
        staleTime: Infinity, // Jangan re-fetch di test
      },
    },
  });
}

// All-in-one wrapper dengan semua providers
function AllProviders({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ReduxProvider>
  );
}

/**
 * Custom render dengan semua providers termasuk
 *
 * @example
 * const { getByText } = renderWithProviders(<MyComponent />);
 */
function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export semua dari RTL untuk convenience
export * from "@testing-library/react";
export { renderWithProviders as render };
```

---

## Step 4: Unit Tests — Utilities

### `src/__tests__/lib/utils.test.ts`

```typescript
// src/__tests__/lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { generateSlug, formatRelativeDate, formatDate } from "@/lib/utils";

describe("generateSlug", () => {
  it("mengkonversi teks biasa ke slug", () => {
    expect(generateSlug("My Team Name")).toBe("my-team-name");
  });

  it("menghapus karakter spesial", () => {
    expect(generateSlug("Hello! World & Co.")).toBe("hello-world-co");
  });

  it("menghandle multiple spasi", () => {
    expect(generateSlug("too   many    spaces")).toBe("too-many-spaces");
  });

  it("menghapus dash di awal dan akhir", () => {
    expect(generateSlug("-trimmed-")).toBe("trimmed");
  });

  it("menghandle string kosong", () => {
    expect(generateSlug("")).toBe("");
  });

  it("mengkonversi uppercase ke lowercase", () => {
    expect(generateSlug("UPPERCASE")).toBe("uppercase");
  });
});

describe("formatRelativeDate", () => {
  it('menampilkan "baru saja" untuk waktu kurang dari 60 detik', () => {
    const recentDate = new Date(Date.now() - 30 * 1000); // 30 detik lalu
    expect(formatRelativeDate(recentDate)).toBe("baru saja");
  });

  it("menampilkan menit yang lalu", () => {
    const minutesAgo = new Date(Date.now() - 5 * 60 * 1000); // 5 menit lalu
    expect(formatRelativeDate(minutesAgo)).toBe("5 menit lalu");
  });

  it("menampilkan jam yang lalu", () => {
    const hoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 jam lalu
    expect(formatRelativeDate(hoursAgo)).toBe("2 jam lalu");
  });

  it('menampilkan "kemarin" untuk 1 hari lalu', () => {
    const yesterday = new Date(Date.now() - 28 * 60 * 60 * 1000); // 28 jam lalu
    expect(formatRelativeDate(yesterday)).toBe("kemarin");
  });
});

describe("formatDate", () => {
  it("memformat tanggal ke format Indonesia", () => {
    const date = new Date("2026-02-28");
    const formatted = formatDate(date);
    // Format: "28 Februari 2026"
    expect(formatted).toContain("2026");
    expect(formatted).toContain("28");
  });
});
```

### `src/__tests__/lib/errors.test.ts`

```typescript
// src/__tests__/lib/errors.test.ts
import { describe, it, expect } from "vitest";
import {
  AppError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  getErrorMessage,
} from "@/lib/errors";

describe("AppError", () => {
  it("membuat error dengan code dan statusCode yang benar", () => {
    const error = new AppError("Test error", "TEST_CODE", 400);
    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_CODE");
    expect(error.statusCode).toBe(400);
  });

  it("instanceof bekerja dengan benar", () => {
    const error = new UnauthorizedError();
    expect(error instanceof AppError).toBe(true);
    expect(error instanceof UnauthorizedError).toBe(true);
    expect(error instanceof ForbiddenError).toBe(false);
  });
});

describe("UnauthorizedError", () => {
  it("memiliki default message yang benar", () => {
    const error = new UnauthorizedError();
    expect(error.message).toBe("Kamu harus login terlebih dahulu");
    expect(error.statusCode).toBe(401);
  });

  it("bisa override message", () => {
    const error = new UnauthorizedError("Custom message");
    expect(error.message).toBe("Custom message");
  });
});

describe("NotFoundError", () => {
  it("memformat resource name dengan benar", () => {
    const error = new NotFoundError("Task");
    expect(error.message).toBe("Task tidak ditemukan");
    expect(error.statusCode).toBe(404);
  });
});

describe("getErrorMessage", () => {
  it("mengembalikan pesan AppError", () => {
    const error = new ForbiddenError("Custom forbidden message");
    expect(getErrorMessage(error)).toBe("Custom forbidden message");
  });

  it("mengembalikan pesan generic untuk Error biasa di production", () => {
    // Simulate production
    const originalEnv = process.env.NODE_ENV;
    // @ts-ignore
    process.env.NODE_ENV = "production";

    const error = new Error("Internal database error");
    expect(getErrorMessage(error)).toBe("Terjadi kesalahan. Silakan coba lagi.");

    // @ts-ignore
    process.env.NODE_ENV = originalEnv;
  });

  it("mengembalikan pesan generic untuk unknown errors", () => {
    expect(getErrorMessage("string error")).toBe(
      "Terjadi kesalahan. Silakan coba lagi."
    );
    expect(getErrorMessage(null)).toBe(
      "Terjadi kesalahan. Silakan coba lagi."
    );
  });
});
```

---

## Step 5: Unit Tests — Custom Hooks

### `src/__tests__/hooks/useDebounce.test.ts`

```typescript
// src/__tests__/hooks/useDebounce.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mengembalikan nilai awal tanpa delay", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("tidak mengupdate nilai sebelum delay habis", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );

    rerender({ value: "updated", delay: 300 });

    // Belum 300ms, nilai masih lama
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("initial");
  });

  it("mengupdate nilai setelah delay habis", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 300 } }
    );

    rerender({ value: "updated", delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("updated");
  });

  it("mereset timer saat value berubah sebelum delay habis", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "first" } }
    );

    rerender({ value: "second" });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ value: "third" }); // Reset timer
    act(() => { vi.advanceTimersByTime(200); }); // Total 400ms tapi dari "third" baru 200ms

    expect(result.current).toBe("first"); // Masih "first", belum 300ms dari "third"

    act(() => { vi.advanceTimersByTime(100); }); // Total 300ms dari "third"

    expect(result.current).toBe("third"); // Sekarang update ke "third"
  });
});
```

---

## Step 6: Component Tests — TaskCard

### `src/__tests__/features/task/TaskCard.test.tsx`

```tsx
// src/__tests__/features/task/TaskCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { render } from "../../utils";
import { TaskCard } from "@/features/task/components/TaskCard";
import type { TaskWithRelations } from "@/features/task/schemas/task.schema";

// Mock komponen dari @dnd-kit (tidak butuh test DnD di unit test)
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: { toString: vi.fn(() => "") },
  },
}));

// Mock TaskModal (tidak perlu test modal di sini)
vi.mock("@/features/task/components/TaskModal", () => ({
  TaskModal: () => null,
}));

const mockTask: TaskWithRelations = {
  id: "task-1",
  title: "Setup database schema",
  description: "Buat Prisma schema untuk semua models",
  status: "IN_PROGRESS",
  priority: "HIGH",
  dueDate: null,
  projectId: "project-1",
  assigneeId: "user-1",
  creatorId: "user-2",
  createdAt: new Date(),
  updatedAt: new Date(),
  assignee: {
    id: "user-1",
    name: "Budi Santoso",
    image: null,
  },
  creator: {
    id: "user-2",
    name: "Admin User",
    image: null,
  },
  _count: { comments: 3 },
};

const defaultProps = {
  task: mockTask,
  projectId: "project-1",
  workspaceId: "workspace-1",
  currentUserId: "user-2",
  currentUserRole: "ADMIN",
};

describe("TaskCard", () => {
  it("menampilkan judul task", () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText("Setup database schema")).toBeInTheDocument();
  });

  it("menampilkan nama assignee", () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
  });

  it("menampilkan jumlah komentar", () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("menampilkan priority badge HIGH", () => {
    render(<TaskCard {...defaultProps} />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("menampilkan task DONE dengan strikethrough", () => {
    const doneTask = { ...mockTask, status: "DONE" as const };
    render(<TaskCard {...defaultProps} task={doneTask} />);

    const titleEl = screen.getByText("Setup database schema");
    expect(titleEl).toHaveClass("line-through");
  });

  it("menampilkan indikator overdue untuk task yang terlambat", () => {
    const overdueTask = {
      ...mockTask,
      status: "TODO" as const,
      dueDate: new Date("2020-01-01"), // Jauh di masa lalu
    };
    render(<TaskCard {...defaultProps} task={overdueTask} />);

    // Check ada teks "⚠"
    expect(screen.getByText(/⚠/)).toBeInTheDocument();
  });

  it("menampilkan 'Unassigned' jika tidak ada assignee", () => {
    const unassignedTask = { ...mockTask, assignee: null, assigneeId: null };
    render(<TaskCard {...defaultProps} task={unassignedTask} />);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("membuka TaskModal saat card diklik", () => {
    // TODO: Test ini butuh spying isDragging state
    // Implementasi test ini bergantung pada setup mock TaskModal yang lebih lengkap
  });
});
```

---

## Step 7: Component Tests — WorkspaceCard

### `src/__tests__/features/workspace/WorkspaceCard.test.tsx`

```tsx
// src/__tests__/features/workspace/WorkspaceCard.test.tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../utils";
import { WorkspaceCard } from "@/features/workspace/components/WorkspaceCard";

const mockWorkspace = {
  id: "ws-1",
  name: "Tim Frontend",
  slug: "tim-frontend",
  description: "Workspace untuk tim frontend Flowspace",
  logo: null,
  _count: { projects: 3, members: 5 },
  members: [
    {
      role: "OWNER",
      user: { id: "u1", name: "Alice", image: null },
    },
    {
      role: "MEMBER",
      user: { id: "u2", name: "Bob", image: null },
    },
  ],
};

describe("WorkspaceCard", () => {
  it("menampilkan nama workspace", () => {
    render(
      <WorkspaceCard workspace={mockWorkspace} currentUserRole="OWNER" />
    );
    expect(screen.getByText("Tim Frontend")).toBeInTheDocument();
  });

  it("menampilkan deskripsi workspace", () => {
    render(
      <WorkspaceCard workspace={mockWorkspace} currentUserRole="OWNER" />
    );
    expect(
      screen.getByText("Workspace untuk tim frontend Flowspace")
    ).toBeInTheDocument();
  });

  it("menampilkan jumlah project", () => {
    render(
      <WorkspaceCard workspace={mockWorkspace} currentUserRole="OWNER" />
    );
    expect(screen.getByText("3 project")).toBeInTheDocument();
  });

  it("menampilkan jumlah member", () => {
    render(
      <WorkspaceCard workspace={mockWorkspace} currentUserRole="OWNER" />
    );
    expect(screen.getByText("5 member")).toBeInTheDocument();
  });

  it("menampilkan badge OWNER untuk owner", () => {
    render(
      <WorkspaceCard workspace={mockWorkspace} currentUserRole="OWNER" />
    );
    expect(screen.getByText("owner")).toBeInTheDocument();
  });

  it("menampilkan badge member untuk role member", () => {
    render(
      <WorkspaceCard workspace={mockWorkspace} currentUserRole="MEMBER" />
    );
    expect(screen.getByText("member")).toBeInTheDocument();
  });

  it("menampilkan inisial dalam logo jika tidak ada gambar", () => {
    render(
      <WorkspaceCard workspace={mockWorkspace} currentUserRole="OWNER" />
    );
    // Logo inisial adalah huruf pertama nama workspace
    expect(screen.getByText("T")).toBeInTheDocument(); // "T" dari "Tim Frontend"
  });

  it("card adalah link ke halaman workspace", () => {
    render(
      <WorkspaceCard workspace={mockWorkspace} currentUserRole="OWNER" />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/workspace/ws-1");
  });
});
```

---

## Step 8: Tests — Zustand Store

### `src/__tests__/stores/taskFilterStore.test.ts`

```typescript
// src/__tests__/stores/taskFilterStore.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useTaskFilterStore } from "@/stores/taskFilterStore";
import { act, renderHook } from "@testing-library/react";

describe("useTaskFilterStore", () => {
  // Reset store sebelum setiap test
  beforeEach(() => {
    const { resetFilters } = useTaskFilterStore.getState();
    act(() => resetFilters());
  });

  it("state awal semua filter default", () => {
    const { result } = renderHook(() => useTaskFilterStore());

    expect(result.current.search).toBe("");
    expect(result.current.status).toBe("all");
    expect(result.current.priority).toBe("all");
    expect(result.current.assigneeId).toBe("all");
  });

  it("setSearch mengupdate search state", () => {
    const { result } = renderHook(() => useTaskFilterStore());

    act(() => {
      result.current.setSearch("database");
    });

    expect(result.current.search).toBe("database");
  });

  it("setStatus mengupdate status state", () => {
    const { result } = renderHook(() => useTaskFilterStore());

    act(() => {
      result.current.setStatus("IN_PROGRESS");
    });

    expect(result.current.status).toBe("IN_PROGRESS");
  });

  it("resetFilters mengembalikan ke state default", () => {
    const { result } = renderHook(() => useTaskFilterStore());

    act(() => {
      result.current.setSearch("test");
      result.current.setStatus("DONE");
      result.current.setPriority("URGENT");
    });

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.search).toBe("");
    expect(result.current.status).toBe("all");
    expect(result.current.priority).toBe("all");
  });
});
```

---

## Step 9: Tests — Workspace Role Hook

### `src/__tests__/features/workspace/useWorkspaceRole.test.ts`

```typescript
// src/__tests__/features/workspace/useWorkspaceRole.test.ts
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWorkspaceRole } from "@/features/workspace/hooks/useWorkspaceRole";

describe("useWorkspaceRole", () => {
  describe("OWNER", () => {
    it("OWNER bisa manage workspace", () => {
      const { result } = renderHook(() => useWorkspaceRole("OWNER"));
      expect(result.current.canManageWorkspace).toBe(true);
    });

    it("OWNER bisa manage projects", () => {
      const { result } = renderHook(() => useWorkspaceRole("OWNER"));
      expect(result.current.canManageProjects).toBe(true);
    });

    it("OWNER bisa delete workspace", () => {
      const { result } = renderHook(() => useWorkspaceRole("OWNER"));
      expect(result.current.canDeleteWorkspace).toBe(true);
    });

    it("OWNER bisa invite members", () => {
      const { result } = renderHook(() => useWorkspaceRole("OWNER"));
      expect(result.current.canInviteMembers).toBe(true);
    });
  });

  describe("ADMIN", () => {
    it("ADMIN bisa manage workspace", () => {
      const { result } = renderHook(() => useWorkspaceRole("ADMIN"));
      expect(result.current.canManageWorkspace).toBe(true);
    });

    it("ADMIN tidak bisa delete workspace", () => {
      const { result } = renderHook(() => useWorkspaceRole("ADMIN"));
      expect(result.current.canDeleteWorkspace).toBe(false);
    });

    it("ADMIN bisa invite members", () => {
      const { result } = renderHook(() => useWorkspaceRole("ADMIN"));
      expect(result.current.canInviteMembers).toBe(true);
    });
  });

  describe("MEMBER", () => {
    it("MEMBER tidak bisa manage workspace", () => {
      const { result } = renderHook(() => useWorkspaceRole("MEMBER"));
      expect(result.current.canManageWorkspace).toBe(false);
    });

    it("MEMBER tidak bisa invite members", () => {
      const { result } = renderHook(() => useWorkspaceRole("MEMBER"));
      expect(result.current.canInviteMembers).toBe(false);
    });

    it("MEMBER bisa buat tasks", () => {
      const { result } = renderHook(() => useWorkspaceRole("MEMBER"));
      expect(result.current.canCreateTasks).toBe(true);
    });
  });

  describe("GUEST", () => {
    it("GUEST tidak bisa buat tasks", () => {
      const { result } = renderHook(() => useWorkspaceRole("GUEST"));
      expect(result.current.canCreateTasks).toBe(false);
    });

    it("GUEST tidak bisa manage workspace", () => {
      const { result } = renderHook(() => useWorkspaceRole("GUEST"));
      expect(result.current.canManageWorkspace).toBe(false);
    });

    it("isGuest bernilai true", () => {
      const { result } = renderHook(() => useWorkspaceRole("GUEST"));
      expect(result.current.isGuest).toBe(true);
    });
  });
});
```

---

## Step 10: Tests — TaskFilters Component

### `src/__tests__/features/task/TaskFilters.test.tsx`

```tsx
// src/__tests__/features/task/TaskFilters.test.tsx
import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../utils";
import { TaskFilters } from "@/features/task/components/TaskFilters";
import { useTaskFilterStore } from "@/stores/taskFilterStore";
import { act, renderHook } from "@testing-library/react";

const mockMembers = [
  { user: { id: "u1", name: "Alice", image: null } },
  { user: { id: "u2", name: "Bob", image: null } },
];

const defaultProps = {
  members: mockMembers,
  canCreateTasks: true,
  projectId: "project-1",
};

// Reset store sebelum setiap test
beforeEach(() => {
  const { resetFilters } = useTaskFilterStore.getState();
  act(() => resetFilters());
});

describe("TaskFilters", () => {
  it("menampilkan search input", () => {
    render(<TaskFilters {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Cari task...")
    ).toBeInTheDocument();
  });

  it("menampilkan tombol 'Tambah Task' jika canCreateTasks true", () => {
    render(<TaskFilters {...defaultProps} />);
    expect(screen.getByText("Tambah Task")).toBeInTheDocument();
  });

  it("tidak menampilkan tombol 'Tambah Task' jika canCreateTasks false", () => {
    render(<TaskFilters {...defaultProps} canCreateTasks={false} />);
    expect(screen.queryByText("Tambah Task")).not.toBeInTheDocument();
  });

  it("update search state saat user mengetik", async () => {
    const user = userEvent.setup();
    render(<TaskFilters {...defaultProps} />);

    const input = screen.getByPlaceholderText("Cari task...");
    await user.type(input, "database");

    const { search } = useTaskFilterStore.getState();
    expect(search).toBe("database");
  });

  it("tidak menampilkan tombol 'Reset' saat tidak ada filter aktif", () => {
    render(<TaskFilters {...defaultProps} />);
    expect(screen.queryByText("Reset")).not.toBeInTheDocument();
  });

  it("menampilkan tombol 'Reset' saat ada filter aktif", async () => {
    const user = userEvent.setup();
    render(<TaskFilters {...defaultProps} />);

    const input = screen.getByPlaceholderText("Cari task...");
    await user.type(input, "database");

    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("mereset search saat klik X button", async () => {
    const user = userEvent.setup();
    render(<TaskFilters {...defaultProps} />);

    const input = screen.getByPlaceholderText("Cari task...");
    await user.type(input, "database");

    // Cari dan klik button X
    const clearButton = screen.getByRole("button", { name: /clear/i });
    await user.click(clearButton);

    // Check placeholder kembali tampil (input kosong)
    expect(input).toHaveValue("");
  });
});
```

---

## Step 11: MSW untuk Mock API

Untuk test yang butuh fetch ke API:

### `src/__tests__/mocks/handlers.ts`

```typescript
// src/__tests__/mocks/handlers.ts
import { http, HttpResponse } from "msw";

const mockTasks = [
  {
    id: "task-1",
    title: "Setup database",
    status: "TODO",
    priority: "HIGH",
    projectId: "project-1",
    assignee: null,
    creator: { id: "u1", name: "Alice", image: null },
    _count: { comments: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const handlers = [
  // GET tasks
  http.get("/api/projects/:projectId/tasks", () => {
    return HttpResponse.json(mockTasks);
  }),

  // GET workspaces
  http.get("/api/workspaces", () => {
    return HttpResponse.json([
      {
        id: "ws-1",
        name: "Test Workspace",
        slug: "test-workspace",
        description: null,
        _count: { projects: 2, members: 3 },
        members: [],
      },
    ]);
  }),

  // GET notifications
  http.get("/api/notifications", () => {
    return HttpResponse.json([]);
  }),
];
```

### `src/__tests__/mocks/server.ts`

```typescript
// src/__tests__/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Setup MSW server untuk node environment (test)
export const server = setupServer(...handlers);
```

### Update `src/__tests__/setup.ts`:

```typescript
// Tambahkan ke setup.ts
import { server } from "./mocks/server";
import { beforeAll, afterAll, afterEach } from "vitest";

// Start MSW sebelum semua tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset handlers setelah setiap test
afterEach(() => server.resetHandlers());

// Stop MSW setelah semua tests
afterAll(() => server.close());
```

---

## Step 12: Snapshot Tests

Untuk memastikan UI tidak berubah tanpa disengaja:

### `src/__tests__/features/dashboard/StatsCard.test.tsx`

```tsx
// src/__tests__/features/dashboard/StatsCard.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "../../utils";
import { StatsCard } from "@/features/dashboard/components/StatsCard";
import { LayoutGrid } from "lucide-react";

describe("StatsCard", () => {
  it("renders dengan benar", () => {
    const { container } = render(
      <StatsCard
        label="Total Task"
        value={42}
        icon={<LayoutGrid size={20} />}
        description="Semua project"
      />
    );

    // Snapshot test — kalau UI berubah, test akan fail sampai snapshot diupdate
    expect(container).toMatchSnapshot();
  });

  it("renders variant success dengan benar", () => {
    const { container } = render(
      <StatsCard
        label="Selesai"
        value={20}
        icon={<LayoutGrid size={20} />}
        variant="success"
      />
    );
    expect(container).toMatchSnapshot();
  });
});
```

---

## Cara Menjalankan Tests

```bash
# Jalankan semua tests
npm test

# Watch mode (jalankan ulang saat file berubah)
npm test

# Jalankan sekali (untuk CI)
npm run test:run

# Coverage report
npm run test:coverage

# UI mode (visual test runner)
npm run test:ui

# Jalankan test spesifik
npm test -- TaskCard
npm test -- src/__tests__/lib/utils.test.ts
```

---

## Common Pitfalls Fase 9

### ❌ Pitfall 1: Test bergantung pada implementasi detail

**Masalah:**
```tsx
const button = container.querySelector(".bg-primary"); // Bergantung pada class CSS
```

**Solusi:** Selalu query berdasarkan role atau teks yang user lihat:
```tsx
const button = screen.getByRole("button", { name: /tambah task/i });
```

---

### ❌ Pitfall 2: Test yang async tidak di-await

**Masalah:**
```tsx
fireEvent.click(button);
expect(screen.getByText("Success")).toBeInTheDocument(); // Mungkin belum muncul
```

**Solusi:**
```tsx
await userEvent.click(button);
await waitFor(() => {
  expect(screen.getByText("Success")).toBeInTheDocument();
});
```

---

### ❌ Pitfall 3: Mock yang terlalu luas

**Masalah:** Mock seluruh module hanya untuk menghindari satu side effect.

**Solusi:** Mock fungsi spesifik yang butuh di-mock, bukan seluruh modul. Gunakan `vi.spyOn()` untuk partial mock.

---

### ❌ Pitfall 4: Vitest vs Jest globals

**Masalah:** Lupa import `describe`, `it`, `expect` dari vitest.

**Solusi:** Sudah di-handle dengan setting `globals: true` di `vitest.config.ts`. Tapi untuk kejelasan, bisa tetap import eksplisit.

---

## Checklist Fase 9

- [ ] `npm test` berjalan tanpa error
- [ ] `npm run test:coverage` menampilkan coverage ≥ 60%
- [ ] `generateSlug` tests semua pass
- [ ] `useDebounce` tests semua pass (termasuk timer test)
- [ ] `useWorkspaceRole` tests cover semua 4 roles
- [ ] `WorkspaceCard` tests cover nama, deskripsi, stats, dan link
- [ ] `TaskCard` tests cover overdue, DONE strikethrough, unassigned
- [ ] `TaskFilters` tests cover search input dan reset button
- [ ] Zustand store tests cover state changes dan resetFilters
- [ ] MSW handlers configured untuk API mocking

---

## Lanjut ke Fase 10

Testing sudah solid! Ini fase terakhir: **Security hardening dan deployment ke Vercel** dengan environment variables yang aman, CSP headers, dan CI/CD pipeline sederhana.
