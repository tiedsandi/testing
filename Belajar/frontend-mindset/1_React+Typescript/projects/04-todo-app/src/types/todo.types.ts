// src/types/todo.types.ts

// ── Data model utama ──────────────────────────────────────────
export interface Todo {
  id: string; // UUID — string, bukan number (lebih aman untuk sort/filter)
  text: string; // Isi teks todo
  completed: boolean; // Sudah selesai atau belum
  createdAt: number; // Timestamp (Date.now()) — untuk sorting
}

// ── Filter options ────────────────────────────────────────────
// "all" | "active" | "completed" — bukan string bebas (typo-proof)
export type FilterType = "all" | "active" | "completed";

// ── Return type dari custom hook useTodos ─────────────────────
export interface UseTodosReturn {
  // State
  todos: Todo[];
  filter: FilterType;
  filteredTodos: Todo[]; // Hasil filter — derived dari todos + filter
  activeCount: number; // Jumlah todo yang belum selesai
  completedCount: number; // Jumlah todo yang sudah selesai

  // Actions
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  clearCompleted: () => void;
  setFilter: (filter: FilterType) => void;
}
