import type { Todo } from "../types/todo.types";
import TodoItem from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  emptyMessage?: string;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export default function TodoList({
  todos,
  onToggle,
  onDelete,
  emptyMessage = "No todos yet — add one above!",
}: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p
        className="text-center py-6"
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-text-muted)",
        }}
      >
        {emptyMessage}
      </p>
    );
  }

  // Group todos by creation date
  const groups = todos.reduce<Record<string, Todo[]>>((acc, todo) => {
    const date = formatDate(todo.createdAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(todo);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-1">
      {Object.entries(groups).map(([date, group]) => (
        <div key={date} className="flex flex-col gap-2">
          {/* Date label */}
          <p className="date-label text-left pt-3 pb-1">Date: {date}</p>

          {group.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
