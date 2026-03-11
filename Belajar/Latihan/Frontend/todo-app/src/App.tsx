import FilterBar from "./components/FilterBar";
import Header from "./components/Header";
import Title from "./components/Title";
import TodoInput from "./components/TodoInput";
import TodoList from "./components/TodoList";
import TodoStats from "./components/TodoStats";
import { useTodos } from "./hooks/useTodos";

function App() {
  const {
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
  } = useTodos();

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center py-6 gap-4"
      style={{ background: "var(--color-bg-page)" }}
    >
      {/* Header — greeting + live clock */}
      <Header />

      {/* Main card */}
      <div
        className="w-full max-w-xl flex flex-col"
        style={{
          background: "var(--color-bg-card)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-lg)",
          padding: "var(--spacing-6) var(--spacing-6) var(--spacing-8)",
          gap: "var(--spacing-4)",
        }}
      >
        {/* Title */}
        <Title />

        {/* Input */}
        <TodoInput onAdd={addTodo} />

        {todos.length > 0 && (
          <>
            {/* Progress stats */}
            <TodoStats total={todos.length} completed={completedCount} />

            {/* Filter / clear bar */}
            <FilterBar
              currentFilter={filter}
              activeCount={activeCount}
              completedCount={completedCount}
              onFilterChange={setFilter}
              onClearCompleted={clearCompleted}
            />
          </>
        )}

        {/* Todo List */}
        <section aria-label="List Todo">
          <TodoList
            todos={filteredTodos}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        </section>
      </div>
    </div>
  );
}

export default App;
