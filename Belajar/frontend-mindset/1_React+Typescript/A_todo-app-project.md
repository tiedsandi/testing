# Membangun Todo App dari Nol: Panduan Praktis React + TypeScript

> **Prerequisite:** Sudah baca seri ini dari awal, terutama:
> - [03_react-hooks-typescript.md](./03_react-hooks-typescript.md) — useState, useEffect, custom hooks
> - [02_react-component-typescript.md](./02_react-component-typescript.md) — Props typing, event handlers

---

## Daftar Isi

1. [Overview & Tujuan Belajar](#1-overview--tujuan-belajar)
2. [Struktur Folder Project](#2-struktur-folder-project)
3. [Setup Project](#3-setup-project)
4. [Typing: Interface & Types](#4-typing-interface--types)
5. [Custom Hook: useTodos](#5-custom-hook-usetodos)
6. [Komponen: TodoInput](#6-komponen-todoinput)
7. [Komponen: TodoItem](#7-komponen-todoitem)
8. [Komponen: FilterBar](#8-komponen-filterbar)
9. [Komponen: TodoList](#9-komponen-todolist)
10. [Komponen: TodoStats](#10-komponen-todostats)
11. [App.tsx: Merakit Semuanya](#11-apptsx-merakit-semuanya)
12. [Styling dengan CSS Module](#12-styling-dengan-css-module)
13. [Checklist Akhir & Ide Pengembangan](#13-checklist-akhir--ide-pengembangan)

---

## 1. Overview & Tujuan Belajar

### Apa yang Akan Kita Bangun?

Sebuah **Todo App** yang benar-benar fungsional — bukan sekadar project "Hello World" yang langsung dilupakan. Kita akan membangunnya dengan cara yang benar dari awal: mulai dari typing yang solid, pisahkan logic dari UI, sampai data yang persist di localStorage.

Ini adalah **project fondasi**. Hampir semua konsep di sini akan kamu pakai terus di project yang lebih besar — CRUD, state management, event handling, filter/search, data persistence.

### Fitur yang Kita Bangun

- ✅ Tambah todo baru (dengan Enter atau tombol)
- ✅ Toggle todo selesai/belum selesai
- ✅ Hapus todo satu per satu
- ✅ Filter: All, Active, Completed
- ✅ Simpan ke localStorage (data tidak hilang saat refresh)
- ✅ Counter: berapa todo yang tersisa

### Yang Akan Kamu Pelajari

| Konsep | Pelajaran |
|---|---|
| `interface Todo` | Cara mendefinisikan tipe data yang kompleks |
| `useState<Todo[]>` | State array dengan TypeScript |
| `useEffect` + `localStorage` | Side effect untuk persistensi data |
| Custom hook `useTodos` | Memisahkan logic dari UI (separation of concerns) |
| Controlled input | Pattern form input yang benar di React |
| Derived state | Filter tanpa state ekstra, pakai `useMemo` |
| Event handler typing | `FormEvent`, `ChangeEvent`, `KeyboardEvent` |
| CSS Modules | Styling yang scoped dan tidak bentrok |

---

## 2. Struktur Folder Project

Kita akan pakai struktur yang rapi dari awal — bukan taruh semua file di satu folder.

```
todo-app/
  src/
  ├── components/
  │   ├── TodoInput/
  │   │   ├── TodoInput.tsx
  │   │   └── TodoInput.module.css
  │   ├── TodoList/
  │   │   ├── TodoList.tsx
  │   │   └── TodoList.module.css
  │   ├── TodoItem/
  │   │   ├── TodoItem.tsx
  │   │   └── TodoItem.module.css
  │   ├── FilterBar/
  │   │   ├── FilterBar.tsx
  │   │   └── FilterBar.module.css
  │   └── TodoStats/
  │       └── TodoStats.tsx
  │
  ├── hooks/
  │   └── useTodos.ts        ← Semua logic todo di sini
  │
  ├── types/
  │   └── todo.types.ts      ← Semua TypeScript types
  │
  ├── utils/
  │   └── localStorage.ts    ← Helper baca/tulis localStorage
  │
  ├── App.tsx
  ├── App.module.css
  └── main.tsx
```

> **Kenapa segini banyak folder cuma untuk Todo App?**
>
> Karena kebiasaan menulis kode yang terstruktur itu harus dibentuk dari project kecil. Kalau dari awal sudah biasa taruh semua di satu file, nanti di project besar susah untuk bongkar kebiasaan itu. Anggap ini sebagai latihan otot sebelum main beneran.

---

## 3. Setup Project

### Buat Project Baru dengan Vite

```bash
# Buat project baru
npm create vite@latest todo-app -- --template react-ts

# Masuk ke folder project
cd todo-app

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

Setelah itu buka `http://localhost:5173` — kamu akan lihat halaman default Vite.

### Bersihkan File Default

File bawaan Vite perlu dibersihkan dulu. Hapus atau kosongkan:

```bash
# Hapus file yang tidak kita butuhkan
rm src/App.css
rm src/assets/react.svg
rm public/vite.svg
```

Kosongkan `src/index.css` (biarkan file-nya ada, kita akan isi nanti dengan reset minimal).

```css
/* src/index.css — reset minimal */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f0f2f5;
  min-height: 100vh;
  color: #1a1a2e;
}

button {
  cursor: pointer;
  font-family: inherit;
}

input {
  font-family: inherit;
}
```

### Struktur Final `tsconfig.json`

Pastikan `tsconfig.json` punya konfigurasi ini (biasanya sudah default dari Vite):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,            // ← Pastikan ini true!
    "noUnusedLocals": true,    // ← Catch unused variables
    "noUnusedParameters": true // ← Catch unused params
  },
  "include": ["src"]
}
```

> **`"strict": true`** itu wajib. Ini yang membuat TypeScript benar-benar membantu kamu — bukan hanya formalitas.

---

## 4. Typing: Interface & Types

Sebelum nulis satu baris kode component, kita definisikan dulu **bentuk data** kita. Ini kebiasaan yang bagus — selalu mulai dari tipe datanya.

```ts
// src/types/todo.types.ts

// ── Data model utama ──────────────────────────────────────────
export interface Todo {
  id: string;          // UUID — string, bukan number (lebih aman untuk sort/filter)
  text: string;        // Isi teks todo
  completed: boolean;  // Sudah selesai atau belum
  createdAt: number;   // Timestamp (Date.now()) — untuk sorting
}

// ── Filter options ────────────────────────────────────────────
// "all" | "active" | "completed" — bukan string bebas (typo-proof)
export type FilterType = "all" | "active" | "completed";

// ── Return type dari custom hook useTodos ─────────────────────
export interface UseTodosReturn {
  // State
  todos: Todo[];
  filter: FilterType;
  filteredTodos: Todo[];   // Hasil filter — derived dari todos + filter
  activeCount: number;     // Jumlah todo yang belum selesai
  completedCount: number;  // Jumlah todo yang sudah selesai

  // Actions
  addTodo:         (text: string) => void;
  toggleTodo:      (id: string)   => void;
  deleteTodo:      (id: string)   => void;
  clearCompleted:  ()             => void;
  setFilter:       (filter: FilterType) => void;
}
```

> **Kenapa `id` pakai `string` (UUID), bukan `number` auto-increment?**
>
> Di real app, ID biasanya datang dari server sebagai string/UUID. Kalau kamu terbiasa pakai number dari awal, nanti ada saatnya kamu perlu refactor. Lebih baik biasakan pakai UUID dari sekarang. Kita pakai `crypto.randomUUID()` bawaan browser — tidak perlu install library tambahan.

---

## 5. Custom Hook: useTodos

Ini adalah inti dari project kita. **Semua logic** (tambah, hapus, toggle, filter, localStorage) tinggal di sini. Component-component kita nanti tinggal pakai data dan fungsi dari hook ini — mereka tidak perlu tahu cara kerjanya.

```ts
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
      case "active":    return todos.filter((t) => !t.completed);
      case "completed": return todos.filter((t) => t.completed);
      default:          return todos; // "all"
    }
  }, [todos, filter]);

  const activeCount    = useMemo(() => todos.filter((t) => !t.completed).length, [todos]);
  const completedCount = useMemo(() => todos.filter((t) => t.completed).length, [todos]);

  // ── Actions ───────────────────────────────────────────────
  // useCallback: fungsi ini tidak dibuat ulang setiap render
  // Penting saat fungsi ini dikirim sebagai prop ke child component yang pakai React.memo

  const addTodo = useCallback((text: string): void => {
    const trimmed = text.trim();

    // Guard: jangan tambah todo kosong
    if (!trimmed) return;

    const newTodo: Todo = {
      id:        crypto.randomUUID(),
      text:      trimmed,
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
          : todo
      )
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
```

### Kenapa Pakai `useCallback` di Sini?

Karena fungsi-fungsi ini akan dikirim sebagai props ke child components. Tanpa `useCallback`, setiap kali `App` re-render (misalnya karena filter berubah), fungsi ini akan dibuat ulang dan dapat menyebabkan child components yang pakai `React.memo` ikut re-render tanpa alasan.

```
┌─────────────────────────────────────────────────┐
│  useTodos()                                     │
│                                                 │
│  State:         todos, filter                   │
│  Derived:       filteredTodos, activeCount, ...  │
│  Actions:       addTodo, toggleTodo, ...         │
│                                                 │
│  ↓  Side effect                                 │
│  localStorage ←─ setiap todos berubah           │
└─────────────────────────────────────────────────┘
         ↓ return semua
┌─────────────────────────────────────────────────┐
│  App.tsx                                        │
│  Distribusi props ke semua child components     │
└─────────────────────────────────────────────────┘
```

---

## 6. Komponen: TodoInput

Komponen untuk menambah todo baru. Ini adalah **controlled input** — nilai input dikontrol oleh React state, bukan DOM.

```tsx
// src/components/TodoInput/TodoInput.tsx
import { useState, KeyboardEvent, ChangeEvent, FormEvent } from "react";
import styles from "./TodoInput.module.css";

interface TodoInputProps {
  onAdd: (text: string) => void;
  placeholder?: string;
}

function TodoInput({ onAdd, placeholder = "Tambah todo baru..." }: TodoInputProps) {
  const [inputValue, setInputValue] = useState("");

  // ── Submit via form (Enter atau klik tombol) ─────────────
  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault(); // Cegah reload halaman

    const trimmed = inputValue.trim();
    if (!trimmed) return; // Jangan submit kalau kosong

    onAdd(trimmed);
    setInputValue(""); // Reset input setelah berhasil add
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={styles.input}
        // autoFocus supaya user langsung bisa ketik tanpa klik dulu
        autoFocus
        // maxLength untuk mencegah input yang terlalu panjang
        maxLength={200}
        aria-label="Input todo baru"
      />
      <button
        type="submit"
        className={styles.button}
        // Disable tombol kalau input kosong
        disabled={!inputValue.trim()}
        aria-label="Tambah todo"
      >
        Tambah
      </button>
    </form>
  );
}

export default TodoInput;
```

```css
/* src/components/TodoInput/TodoInput.module.css */
.form {
  display: flex;
  gap: 0.5rem;
}

.input {
  flex: 1;
  padding: 0.7rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  outline: none;
  background: #fff;
}

.input:focus {
  border-color: #6c63ff;
  box-shadow: 0 0 0 3px #6c63ff22;
}

.input::placeholder {
  color: #aaa;
}

.button {
  padding: 0.7rem 1.25rem;
  background: #6c63ff;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  transition: background 0.2s, transform 0.1s;
  white-space: nowrap;
}

.button:hover:not(:disabled) {
  background: #5a52e0;
}

.button:active:not(:disabled) {
  transform: scale(0.97);
}

.button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

> **Pattern Penting: Controlled Input**
>
> Di React, ada dua jenis input:
> - **Uncontrolled**: React tidak tahu nilai inputnya. Nilai diambil pakai `ref`. Jarang dipakai di form biasa.
> - **Controlled**: Nilai input selalu = state React (`value={inputValue}`). Perubahan via `onChange` → update state → React re-render → tampilkan nilai baru.
>
> Selalu pakai **controlled input** untuk form. Dengan ini kamu bisa validasi, transform, atau sync nilai input kapan saja.

---

## 7. Komponen: TodoItem

Komponen untuk satu baris todo. Menampilkan text, checkbox, dan tombol hapus.

```tsx
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
const TodoItem = memo(function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
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
```

```css
/* src/components/TodoItem/TodoItem.module.css */
.item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #eee;
  transition: all 0.2s;
  list-style: none;
}

.item:hover {
  border-color: #ddd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* Checkbox button */
.checkbox {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 2px solid #d0d0d0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  transition: all 0.15s;
}

/* Checkbox saat item completed */
.completed .checkbox {
  background: #6c63ff;
  border-color: #6c63ff;
}

.checkbox:hover:not(.completed .checkbox) {
  border-color: #6c63ff;
}

/* Teks todo */
.text {
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.4;
  word-break: break-word;
  color: #333;
  transition: all 0.2s;
}

/* Teks saat completed: strikethrough + memudar */
.completed .text {
  text-decoration: line-through;
  color: #aaa;
}

/* Tombol hapus */
.deleteButton {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
  opacity: 0;             /* Tersembunyi by default */
  transition: all 0.15s;
}

/* Tampilkan tombol hapus saat hover item */
.item:hover .deleteButton {
  opacity: 1;
}

.deleteButton:hover {
  background: #fff0f0;
  color: #e53e3e;
}
```

---

## 8. Komponen: FilterBar

Komponen untuk filter All / Active / Completed, plus tombol "Clear Completed".

```tsx
// src/components/FilterBar/FilterBar.tsx
import type { FilterType } from "../../types/todo.types";
import styles from "./FilterBar.module.css";

interface FilterBarProps {
  currentFilter:   FilterType;
  activeCount:     number;
  completedCount:  number;
  onFilterChange:  (filter: FilterType) => void;
  onClearCompleted: () => void;
}

// Label untuk tiap filter agar tidak ada magic string di JSX
const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all",       label: "Semua" },
  { value: "active",    label: "Aktif" },
  { value: "completed", label: "Selesai" },
];

function FilterBar({
  currentFilter,
  activeCount,
  completedCount,
  onFilterChange,
  onClearCompleted,
}: FilterBarProps) {
  return (
    <div className={styles.bar}>
      {/* Info: berapa sisa yang aktif */}
      <span className={styles.count} aria-live="polite">
        {activeCount} {activeCount === 1 ? "item" : "item"} tersisa
      </span>

      {/* Filter buttons */}
      <div className={styles.filters} role="group" aria-label="Filter todo">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            className={`${styles.filterButton} ${
              currentFilter === value ? styles.active : ""
            }`}
            aria-pressed={currentFilter === value}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tombol clear — hanya tampil kalau ada yang completed */}
      {completedCount > 0 ? (
        <button
          onClick={onClearCompleted}
          className={styles.clearButton}
          aria-label={`Hapus ${completedCount} todo yang selesai`}
        >
          Hapus Selesai ({completedCount})
        </button>
      ) : (
        /* Placeholder kosong supaya layout tidak bergeser */
        <span />
      )}
    </div>
  );
}

export default FilterBar;
```

```css
/* src/components/FilterBar/FilterBar.module.css */
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 0;
  flex-wrap: wrap;
}

.count {
  font-size: 0.8rem;
  color: #888;
  min-width: 90px;
}

.filters {
  display: flex;
  gap: 0.25rem;
}

.filterButton {
  padding: 0.3rem 0.8rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  font-size: 0.82rem;
  color: #666;
  transition: all 0.15s;
}

.filterButton:hover {
  border-color: #6c63ff;
  color: #6c63ff;
}

.filterButton.active {
  border-color: #6c63ff;
  color: #6c63ff;
  background: #f0eeff;
  font-weight: 600;
}

.clearButton {
  font-size: 0.8rem;
  color: #999;
  background: transparent;
  border: none;
  text-decoration: underline;
  padding: 0;
  transition: color 0.15s;
  min-width: 90px;
  text-align: right;
}

.clearButton:hover {
  color: #e53e3e;
}
```

---

## 9. Komponen: TodoList

Komponen yang merender daftar `TodoItem`. Bertugas juga menampilkan empty state.

```tsx
// src/components/TodoList/TodoList.tsx
import type { Todo } from "../../types/todo.types";
import TodoItem from "../TodoItem/TodoItem";
import styles from "./TodoList.module.css";

interface TodoListProps {
  todos:    Todo[];
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
        <p className={styles.emptyIcon} aria-hidden="true">🎉</p>
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
```

```css
/* src/components/TodoList/TodoList.module.css */
.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.empty {
  text-align: center;
  padding: 2.5rem 1rem;
  color: #aaa;
}

.emptyIcon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.emptyText {
  font-size: 0.9rem;
  line-height: 1.5;
}
```

---

## 10. Komponen: TodoStats

Komponen kecil yang menampilkan statistik keseluruhan di bagian bawah.

```tsx
// src/components/TodoStats/TodoStats.tsx
import type { FilterType } from "../../types/todo.types";

interface TodoStatsProps {
  total:     number;
  active:    number;
  completed: number;
}

function TodoStats({ total, active, completed }: TodoStatsProps) {
  if (total === 0) return null; // Jangan tampilkan kalau tidak ada todo

  const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        marginTop: "0.5rem",
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "#eee",
          borderRadius: "2px",
          overflow: "hidden",
        }}
        role="progressbar"
        aria-valuenow={completionPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${completionPercent}% selesai`}
      >
        <div
          style={{
            height: "100%",
            width: `${completionPercent}%`,
            background: completionPercent === 100 ? "#48bb78" : "#6c63ff",
            borderRadius: "2px",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Summary text */}
      <p
        style={{
          textAlign: "center",
          fontSize: "0.78rem",
          color: "#aaa",
        }}
      >
        {completed} dari {total} selesai
        {completionPercent === 100 && " · Semua beres! 🎉"}
      </p>
    </div>
  );
}

export default TodoStats;
```

---

## 11. App.tsx: Merakit Semuanya

Ini adalah "command center" — semua component dipasang di sini, dan semua data dari `useTodos` didistribusikan sebagai props.

```tsx
// src/App.tsx
import { useTodos } from "./hooks/useTodos";
import TodoInput from "./components/TodoInput/TodoInput";
import TodoList  from "./components/TodoList/TodoList";
import FilterBar from "./components/FilterBar/FilterBar";
import TodoStats from "./components/TodoStats/TodoStats";
import type { FilterType } from "./types/todo.types";
import styles from "./App.module.css";

// Pesan empty state yang kontekstual sesuai filter
const EMPTY_MESSAGES: Record<FilterType, string> = {
  all:       "Belum ada todo. Yuk mulai sesuatu! ✨",
  active:    "Tidak ada todo yang aktif. Semua sudah selesai? 🎉",
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
    todos,        // untuk TodoStats (total count)
  } = useTodos();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>
            <span aria-hidden="true">✅</span> Todo App
          </h1>
          <p className={styles.subtitle}>
            Kelola harianmu dengan rapi.
          </p>
        </header>

        {/* Input tambah todo */}
        <section aria-label="Tambah todo baru">
          <TodoInput onAdd={addTodo} />
        </section>

        {/* Progress dan statistik */}
        <TodoStats
          total={todos.length}
          active={activeCount}
          completed={completedCount}
        />

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
```

```css
/* src/App.module.css */
.page {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 3rem 1rem 5rem;
}

.card {
  width: 100%;
  max-width: 580px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header {
  text-align: center;
  padding-bottom: 0.5rem;
}

.title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 0.25rem;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #888;
  font-size: 0.9rem;
}

.divider {
  border: none;
  border-top: 1px solid #f0f0f0;
  margin: 0;
}

.footer {
  text-align: center;
  font-size: 0.75rem;
  color: #ccc;
  padding-top: 0.5rem;
}
```

---

### Alur Data: Dari Hook ke UI

Ini penting untuk dipahami — data mengalir **satu arah** (one-way data flow):

```
┌──────────────────────────────────────────────────────────────┐
│  useTodos()                                                  │
│  todos, filter, filteredTodos, activeCount, completedCount   │
│  addTodo, toggleTodo, deleteTodo, clearCompleted, setFilter  │
└──────────────────┬───────────────────────────────────────────┘
                   │ destructure & distribusi ke children
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  App.tsx                                                    │
│                                                             │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │  TodoInput  │  │ TodoStats  │  │      FilterBar       │ │
│  │  ───────    │  │ ─────────  │  │  ──────────────────  │ │
│  │  onAdd ←    │  │ total      │  │  currentFilter ←     │ │
│  │  addTodo    │  │ active     │  │  filter              │ │
│  └─────────────┘  │ completed  │  │  onFilterChange ←    │ │
│                   └────────────┘  │  setFilter           │ │
│  ┌─────────────────────────────┐  │  onClearCompleted ←  │ │
│  │         TodoList            │  │  clearCompleted      │ │
│  │  todos ← filteredTodos      │  └──────────────────────┘ │
│  │  onToggle ← toggleTodo      │                           │
│  │  onDelete ← deleteTodo      │                           │
│  │                             │                           │
│  │    ┌──────────────────┐     │                           │
│  │    │    TodoItem      │ × N │                           │
│  │    │  todo ← todo     │     │                           │
│  │    │  onToggle        │     │                           │
│  │    │  onDelete        │     │                           │
│  │    └──────────────────┘     │                           │
│  └─────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. Styling dengan CSS Module

Kita sudah pakai CSS Modules di seluruh project. Tapi ada beberapa hal yang perlu dipahami:

### Cara Kerja CSS Modules

```tsx
// Import CSS module sebagai object
import styles from "./TodoItem.module.css";

// className menjadi scoped — tidak akan bentrok dengan class yang sama di file lain
<li className={styles.item}>...</li>

// Combine multiple classes
<li className={`${styles.item} ${styles.completed}`}>...</li>

// Conditional class yang lebih bersih dengan array.join
<li
  className={[
    styles.item,
    todo.completed ? styles.completed : "",
  ].join(" ")}
>
  ...
</li>
```

### Hasil Build

Di background, Vite akan transform class name kamu jadi unik:

```css
/* CSS yang kamu tulis */
.item { ... }

/* CSS yang dihasilkan di production */
.TodoItem_item__x9f2k { ... }
```

Ini yang membuat styling tidak pernah bentrok antar komponen, meskipun nama classnya sama.

---

### Tips: Install `clsx` untuk Conditional Classes

Kalau sudah banyak conditional class, `clsx` membuat kode lebih bersih:

```bash
npm install clsx
```

```tsx
import clsx from "clsx";

// Tanpa clsx:
<li className={`${styles.item} ${todo.completed ? styles.completed : ""} ${isEditing ? styles.editing : ""}`}>

// Dengan clsx — jauh lebih bersih:
<li className={clsx(styles.item, todo.completed && styles.completed, isEditing && styles.editing)}>
```

---

## 13. Checklist Akhir & Ide Pengembangan

### Checklist: Sebelum Kamu Claim "Selesai"

Coba semua skenario ini satu per satu:

**Fungsionalitas dasar:**
- [ ] Bisa tambah todo baru dengan menekan Enter
- [ ] Bisa tambah todo baru dengan klik tombol "Tambah"
- [ ] Tidak bisa tambah todo yang isinya kosong atau hanya spasi
- [ ] Klik checkbox → todo berubah jadi completed (strikethrough)
- [ ] Klik checkbox lagi → todo kembali jadi active
- [ ] Tombol hapus muncul saat hover item
- [ ] Klik hapus → todo hilang dari list

**Filter:**
- [ ] Filter "Semua" → tampilkan semua todo
- [ ] Filter "Aktif" → hanya tampilkan todo yang belum selesai
- [ ] Filter "Selesai" → hanya tampilkan todo yang sudah selesai
- [ ] Counter "X item tersisa" update secara real-time
- [ ] Tombol "Hapus Selesai" hanya muncul kalau ada todo yang completed
- [ ] Klik "Hapus Selesai" → semua completed todo hilang

**Persistensi:**
- [ ] Tambah beberapa todo, lalu refresh halaman → todo masih ada
- [ ] Toggle beberapa todo, refresh → status masih tersimpan
- [ ] Hapus todo, refresh → todo yang dihapus tidak kembali

**Edge cases:**
- [ ] Input dengan leading/trailing spasi → tersimpan tanpa spasi
- [ ] Input sangat panjang (>100 karakter) → ditampilkan dengan baik, wrap ke baris baru
- [ ] Semua todo dihapus → empty state tampil dengan benar
- [ ] Filter "Aktif" saat tidak ada yang aktif → empty state kontekstual

**UI/UX:**
- [ ] Halaman saat tidak ada todo sama sekali → terlihat bagus
- [ ] Progress bar bergerak saat toggle todo

---

### Ide Pengembangan Mandiri

Sudah selesai semua checklist? Ini challenge selanjutnya, dari yang mudah ke yang susah:

**Level 1 — Gampang:**
- [ ] **Edit todo** — Double click teks → bisa edit inline, Enter/blur untuk save
- [ ] **Drag to reorder** — Ganti urutan todo dengan drag and drop (coba library `@dnd-kit/core`)
- [ ] **Keyboard shortcut** — `Ctrl+Z` untuk undo hapus terakhir
- [ ] **Due date** — Tambah tanggal deadline ke setiap todo, tampilkan yang sudah lewat dengan warna merah

**Level 2 — Menengah:**
- [ ] **Multiple lists** — Bukan cuma satu list, tapi bisa buat beberapa list (Work, Personal, dll.)
- [ ] **Todo priority** — Low / Medium / High, dengan color coding
- [ ] **Search** — Filter todo berdasarkan teks
- [ ] **Dark mode** — Toggle light/dark dengan `prefers-color-scheme` dan localStorage

**Level 3 — Susah:**
- [ ] **Backend sync** — Simpan todo ke server (pakai JSON Server atau Supabase sebagai backend)
- [ ] **Authentication** — Login/logout, todo per user
- [ ] **Offline support** — Tetap bisa tambah/edit todo saat offline, sync saat online
- [ ] **Drag & drop antara list** — Mirip Trello

---

### Refleksi: Apa yang Baru Saja Kamu Pelajari

Dengan menyelesaikan project ini, kamu sebenarnya sudah latihan konsep-konsep yang dipakai di 90% React project:

| Yang kamu lakukan | Konsep React/TS yang dipakai |
|---|---|
| Buat `interface Todo` sebelum nulis komponen | **Type-first development** |
| Semua logic di `useTodos`, komponen hanya UI | **Separation of concerns** |
| `useState<Todo[]>(loadTodosFromStorage)` | **Lazy state initialization** |
| `useMemo` untuk `filteredTodos` | **Derived state, memoization** |
| `useCallback` untuk action functions | **Referential stability, performance** |
| `useEffect` untuk sync ke localStorage | **Side effects** |
| `setTodos(prev => ...)` | **Functional state update** |
| `React.memo` di TodoItem | **Render optimization** |
| CSS Modules | **Scoped styling** |
| `aria-label`, `role`, `aria-live` | **Accessibility (a11y)** |

Ini bukan sekadar Todo App. Ini adalah **miniatur aplikasi production-ready**.

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Vite*
