// src/hooks/useTodos.ts
import { useState, useEffect, useMemo, useCallback } from "react";
import type { Todo, FilterType, UseTodosReturn } from "../types/todo.types";

// ── Key untuk localStorage ────────────────────────────────────
const STORAGE_KEY = "todo-app:todos" as const;

// ── Helper: baca dari localStorage ───────────────────────────
function loadTodosFromStorage(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    // JSON.parse bisa gagal kalau data corrupt — wrap dengan try/catch
    const parsed: unknown = JSON.parse(raw);

    // Validasi sederhana: pastikan hasilnya array
    if (!Array.isArray(parsed)) return [];

    return parsed as Todo[];
  } catch {
    // Data di localStorage corrupt → mulai dari kosong
    console.warn("useTodos: localStorage data corrupt, resetting...");
    return [];
  }
}

// ── Helper: tulis ke localStorage ────────────────────────────
function saveTodosToStorage(todos: Todo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (err) {
    // Bisa gagal kalau storage penuh (jarang, tapi mungkin)
    console.error("useTodos: gagal menyimpan ke localStorage:", err);
  }
}

// ── Custom hook ───────────────────────────────────────────────
export function useTodos(): UseTodosReturn {
  // ── State ────────────────────────────────────────────────
  // Lazy initializer: fungsi ini hanya dipanggil SEKALI saat pertama render
  // Lebih efisien daripada loadTodosFromStorage() langsung sebagai nilai default
  const [todos, setTodos] = useState<Todo[]>(loadTodosFromStorage);
  const [filter, setFilter] = useState<FilterType>("all");

  // ── Side effect: simpan ke localStorage setiap todos berubah ─
  useEffect(() => {
    saveTodosToStorage(todos);
  }, [todos]); // Hanya jalan ulang kalau todos berubah

  // ── Derived state (bukan state!) ─────────────────────────
  // useMemo: hitung ulang hanya kalau todos atau filter berubah
  // Jangan bikin state baru untuk ini — itu anti-pattern (data duplikat)
  const filteredTodos = useMemo<Todo[]>(() => {
    switch (filter) {
      case "active":
        return todos.filter((t) => !t.completed);
      case "completed":
        return todos.filter((t) => t.completed);
      default:
        return todos; // "all"
    }
  }, [todos, filter]);

  const activeCount = useMemo(
    () => todos.filter((t) => !t.completed).length,
    [todos],
  );
  const completedCount = useMemo(
    () => todos.filter((t) => t.completed).length,
    [todos],
  );

  // ── Actions ───────────────────────────────────────────────
  // useCallback: fungsi ini tidak dibuat ulang setiap render
  // Penting saat fungsi ini dikirim sebagai prop ke child component yang pakai React.memo

  const addTodo = useCallback((text: string): void => {
    const trimmed = text.trim();

    // Guard: jangan tambah todo kosong
    if (!trimmed) return;

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    // Functional update: pastikan kita pakai state terbaru
    setTodos((prev) => [newTodo, ...prev]); // Tambah di depan (newest first)
  }, []); // Tidak ada dependency — fungsi ini tidak berubah

  const toggleTodo = useCallback((id: string): void => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id
          ? { ...todo, completed: !todo.completed } // Flip completed
          : todo,
      ),
    );
  }, []);

  const deleteTodo = useCallback((id: string): void => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }, []);

  const clearCompleted = useCallback((): void => {
    setTodos((prev) => prev.filter((todo) => !todo.completed));
  }, []);

  // ── Return public API hook ────────────────────────────────
  return {
    todos,
    filter,
    filteredTodos,
    activeCount,
    completedCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    clearCompleted,
    setFilter,
  };
}
