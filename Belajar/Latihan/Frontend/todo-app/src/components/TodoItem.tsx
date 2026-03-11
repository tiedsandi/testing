import { memo } from "react";
import type { Todo } from "../types/todo.types";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const TodoItem = memo(function TodoItem({
  todo,
  onToggle,
  onDelete,
}: TodoItemProps) {
  return (
    <div className={`todo-item${todo.completed ? " todo-item--done" : ""}`}>
      {/* Circular checkbox */}
      <button
        onClick={() => onToggle(todo.id)}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        className={`checkbox-circle${todo.completed ? " checkbox-circle--checked" : ""}`}
      >
        {todo.completed && <CheckIcon />}
      </button>

      {/* Text */}
      <span
        className="flex-1 text-center todo-item__text"
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: todo.completed
            ? "var(--font-weight-normal)"
            : "var(--font-weight-semibold)",
          color: todo.completed
            ? "var(--color-text-done)"
            : "var(--color-text-base)",
          textDecoration: todo.completed ? "line-through" : "none",
        }}
      >
        {todo.text}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(todo.id)}
        aria-label="Delete todo"
        className="icon-btn"
      >
        <TrashIcon />
      </button>
    </div>
  );
});

export default TodoItem;
