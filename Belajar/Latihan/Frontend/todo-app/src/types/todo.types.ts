export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export type FilterType = "all" | "active" | "completed";

export interface UseTodosReturn {
  todos: Todo[];
  filter: FilterType;
  filteredTodos: Todo[];
  activeCount: number;
  completedCount: number;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  clearCompleted: () => void;
  setFilter: (filter: FilterType) => void;
}
