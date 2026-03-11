// src/components/TodoItem/TodoItem.tsx
import { memo } from "react";
import type { Todo } from "../../types/todo.types";
import styles from "./TodoItem.module.css";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

// React.memo: komponen ini TIDAK akan re-render kalau props tidak berubah
// Penting karena TodoItem bisa ada banyak — tidak mau semua re-render saat satu todo diubah
const TodoItem = memo(function TodoItem({
  todo,
  onToggle,
  onDelete,
}: TodoItemProps) {
  return (
    <li
      className={`${styles.item} ${todo.completed ? styles.completed : ""}`}
      aria-label={`Todo: ${todo.text}${todo.completed ? " (selesai)" : ""}`}
    >
      {/* Checkbox untuk toggle */}
      <button
        className={styles.checkbox}
        onClick={() => onToggle(todo.id)}
        aria-label={todo.completed ? "Tandai belum selesai" : "Tandai selesai"}
        role="checkbox"
        aria-checked={todo.completed}
      >
        {todo.completed && (
          <svg
            width="12"
            height="10"
            viewBox="0 0 12 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 5L4.5 8.5L11 1"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Teks todo */}
      <span className={styles.text}>{todo.text}</span>

      {/* Tombol hapus — hanya tampil saat hover (via CSS) */}
      <button
        className={styles.deleteButton}
        onClick={() => onDelete(todo.id)}
        aria-label={`Hapus: ${todo.text}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1 1L13 13M13 1L1 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </li>
  );
});

export default TodoItem;
