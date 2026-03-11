// src/components/TodoList/TodoList.tsx
import type { Todo } from "../../types/todo.types";
import TodoItem from "../TodoItem/TodoItem";
import styles from "./TodoList.module.css";

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  // Label untuk empty state (berbeda tergantung filter aktif)
  emptyMessage?: string;
}

function TodoList({
  todos,
  onToggle,
  onDelete,
  emptyMessage = "Belum ada todo. Yuk tambah yang baru!",
}: TodoListProps) {
  // ── Empty state ──────────────────────────────────────────
  if (todos.length === 0) {
    return (
      <div className={styles.empty} role="status" aria-live="polite">
        <p className={styles.emptyIcon} aria-hidden="true">
          🎉
        </p>
        <p className={styles.emptyText}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className={styles.list} aria-label="Daftar todo">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

export default TodoList;
