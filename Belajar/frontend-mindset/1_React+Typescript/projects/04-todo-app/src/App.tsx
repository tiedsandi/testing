// src/App.tsx
import { useTodos } from "./hooks/useTodos";
import TodoInput from "./components/TodoInput/TodoInput";
import TodoList from "./components/TodoList/TodoList";
import FilterBar from "./components/FilterBar/FilterBar";
import TodoStats from "./components/TodoStats/TodoStats";
import type { FilterType } from "./types/todo.types";
import styles from "./App.module.css";

// Pesan empty state yang kontekstual sesuai filter
const EMPTY_MESSAGES: Record<FilterType, string> = {
  all: "Belum ada todo. Yuk mulai sesuatu! ✨",
  active: "Tidak ada todo yang aktif. Semua sudah selesai? 🎉",
  completed: "Belum ada yang diselesaikan. Ayo semangat! 💪",
};

function App() {
  const {
    filter,
    filteredTodos,
    activeCount,
    completedCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    clearCompleted,
    setFilter,
    todos, // untuk TodoStats (total count)
  } = useTodos();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>
            <span aria-hidden="true">✅</span> Todo App
          </h1>
          <p className={styles.subtitle}>Kelola harianmu dengan rapi.</p>
        </header>

        {/* Input tambah todo */}
        <section aria-label="Tambah todo baru">
          <TodoInput onAdd={addTodo} />
        </section>

        {/* Progress dan statistik */}
        <TodoStats total={todos.length} completed={completedCount} />

        {/* Filter bar */}
        {todos.length > 0 && (
          <FilterBar
            currentFilter={filter}
            activeCount={activeCount}
            completedCount={completedCount}
            onFilterChange={setFilter}
            onClearCompleted={clearCompleted}
          />
        )}

        {/* Divider */}
        {todos.length > 0 && <hr className={styles.divider} />}

        {/* Daftar todo */}
        <section aria-label="Daftar todo">
          <TodoList
            todos={filteredTodos}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            emptyMessage={EMPTY_MESSAGES[filter]}
          />
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>Data tersimpan otomatis di browser kamu.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
