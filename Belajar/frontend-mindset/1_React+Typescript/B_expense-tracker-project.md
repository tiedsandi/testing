# Membangun Expense Tracker dari Nol: React + TypeScript + useReducer

> **Prerequisite:** Sudah baca [A_todo-app-project.md](./A_todo-app-project.md) — terutama konsep custom hook dan CSS Modules. Di project ini kita naik level: `useState` biasa kita ganti dengan `useReducer` untuk state management yang lebih terstruktur.

---

## Daftar Isi

1. [Overview & Kenapa useReducer?](#1-overview--kenapa-usereducer)
2. [Struktur Folder Project](#2-struktur-folder-project)
3. [Setup Project](#3-setup-project)
4. [Typing: Interface, Types, Actions](#4-typing-interface-types-actions)
5. [Reducer: Logika State Terpusat](#5-reducer-logika-state-terpusat)
6. [Custom Hook: useExpenses](#6-custom-hook-useexpenses)
7. [Komponen: ExpenseForm](#7-komponen-expenseform)
8. [Komponen: ExpenseItem & ExpenseList](#8-komponen-expenseitem--expenselist)
9. [Komponen: CategorySummary](#9-komponen-categorysummary)
10. [Komponen: SummaryCards](#10-komponen-summarycards)
11. [App.tsx: Merakit Semuanya](#11-apptsx-merakit-semuanya)
12. [Styling dengan CSS Modules](#12-styling-dengan-css-modules)
13. [Checklist Akhir & Ide Pengembangan](#13-checklist-akhir--ide-pengembangan)

---

## 1. Overview & Kenapa useReducer?

### Apa yang Kita Bangun?

Sebuah **Expense Tracker** — aplikasi pencatat pengeluaran harian. User bisa catat nama, jumlah, kategori, dan tanggal pengeluaran. App langsung hitung total, breakdown per kategori, dan filter berdasarkan kategori.

### Tampilan Akhir

```
┌──────────────────────────────────────────────────────────┐
│  💸 Expense Tracker                                      │
│  ─────────────────────────────────────────────────────   │
│  Total: Rp 1.250.000  │  Transaksi: 5  │  Bulan ini     │
│  ─────────────────────────────────────────────────────   │
│  [FORM: Nama | Jumlah | Kategori | Tanggal | Tambah]     │
│  ─────────────────────────────────────────────────────   │
│  Filter: Semua  Makanan  Transport  Hiburan  Lainnya     │
│  ─────────────────────────────────────────────────────   │
│  Kopi Kekinian          Makanan      Rp 35.000   [🗑]   │
│  Grab ke kantor         Transport    Rp 45.000   [🗑]   │
│  Netflix                Hiburan      Rp 54.000   [🗑]   │
│  ─────────────────────────────────────────────────────   │
│  RINGKASAN KATEGORI                                      │
│  Makanan   ████████░░░░  45%  Rp 563.000                │
│  Transport ████░░░░░░░░  25%  Rp 312.000                │
│  Hiburan   ███░░░░░░░░░  30%  Rp 375.000                │
└──────────────────────────────────────────────────────────┘
```

### Kenapa useReducer, Bukan useState Biasa?

Ini pertanyaan yang bagus — dan kamu perlu benar-benar paham jawabannya.

**Coba pakai useState dulu bayangkan:**

```tsx
// ❌ Dengan useState — state mulai tersebar
const [expenses, setExpenses]   = useState<Expense[]>([]);
const [filter, setFilter]       = useState<Category | "all">("all");
const [sortBy, setSortBy]       = useState<SortOption>("date");
// Kalau nambah fitur lagi... tambah useState lagi... dan lagi...
```

Masalahnya:
1. State tersebar di banyak variabel
2. Setiap "action" (tambah, hapus, filter) adalah serangkaian pemanggilan `set*` yang harus diingat
3. Kalau ada satu yang lupa, bug muncul dan susah di-trace

**Dengan useReducer:**

```tsx
// ✅ State terpusat, perubahan via action yang jelas
const [state, dispatch] = useReducer(expenseReducer, initialState);

// Tambah expense → kirim action yang deskriptif
dispatch({ type: "ADD_EXPENSE", payload: newExpense });

// Hapus → kirim action dengan ID
dispatch({ type: "DELETE_EXPENSE", payload: { id: "abc-123" } });

// Filter → kirim action dengan kategori baru
dispatch({ type: "SET_FILTER", payload: { filter: "makanan" } });
```

**Kapan pakai `useReducer` vs `useState`?**

| Kondisi | Pilihan |
|---|---|
| State sederhana, satu nilai (boolean, string, number) | `useState` |
| Beberapa state yang independen dan simple | `useState` |
| State yang saling berkaitan (satu action = update banyak state) | `useReducer` |
| Logic update state yang kompleks (berbagai kondisi) | `useReducer` |
| State array dengan banyak jenis operasi (CRUD) | `useReducer` |
| Ingin logic yang mudah di-test secara terpisah | `useReducer` |

Expense Tracker ini masuk kategori **"state saling berkaitan"** — karena saat `ADD_EXPENSE`, kita juga mau pastikan filter tidak rusak, urutan terjaga, dll. `useReducer` cocok untuk ini.

> **Analogi useReducer:**
> Kamu adalah **manager toko** (component). Kamu tidak turun tangan langsung ubah stok barang — kamu kirim **memo/instruksi** (action) ke **bagian gudang** (reducer). Bagian gudang yang tahu cara prosesnya, dan selalu menghasilkan stok baru yang valid.
>
> `dispatch` = kirim memo  
> `reducer` = bagian gudang  
> `action` = isi memo (apa yang mau dilakukan)  
> `state` = kondisi stok terkini  

---

## 2. Struktur Folder Project

```
expense-tracker/
  src/
  ├── components/
  │   ├── ExpenseForm/
  │   │   ├── ExpenseForm.tsx
  │   │   └── ExpenseForm.module.css
  │   ├── ExpenseList/
  │   │   ├── ExpenseList.tsx
  │   │   └── ExpenseList.module.css
  │   ├── ExpenseItem/
  │   │   ├── ExpenseItem.tsx
  │   │   └── ExpenseItem.module.css
  │   ├── CategoryFilter/
  │   │   ├── CategoryFilter.tsx
  │   │   └── CategoryFilter.module.css
  │   ├── CategorySummary/
  │   │   ├── CategorySummary.tsx
  │   │   └── CategorySummary.module.css
  │   └── SummaryCards/
  │       ├── SummaryCards.tsx
  │       └── SummaryCards.module.css
  │
  ├── hooks/
  │   └── useExpenses.ts       ← useReducer + dispatch + useMemo kalkulasi
  │
  ├── reducer/
  │   ├── expenseReducer.ts    ← Pure function: (state, action) => newState
  │   └── expenseReducer.test.ts  ← (bonus) unit test reducer
  │
  ├── types/
  │   └── expense.types.ts     ← Semua interface & type
  │
  ├── utils/
  │   ├── formatters.ts        ← formatCurrency, formatDate
  │   ├── localStorage.ts      ← Helper persist state
  │   └── categoryConfig.ts    ← Konfigurasi kategori (warna, icon, label)
  │
  ├── App.tsx
  ├── App.module.css
  └── main.tsx
```

---

## 3. Setup Project

```bash
npm create vite@latest expense-tracker -- --template react-ts
cd expense-tracker
npm install
npm run dev
```

Bersihkan file bawaan Vite (sama seperti project sebelumnya):

```bash
rm src/App.css src/assets/react.svg public/vite.svg
```

```css
/* src/index.css */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f4f6f8;
  min-height: 100vh;
  color: #1e293b;
}

button, input, select {
  font-family: inherit;
}
```

---

## 4. Typing: Interface, Types, Actions

Mulai dari tipe data. Ini fondasi dari semua yang kita bangun.

### 4.1 Types Utama

```ts
// src/types/expense.types.ts

// ── Kategori yang tersedia ────────────────────────────────────
// Union type — lebih type-safe dari string biasa
export type Category =
  | "makanan"
  | "transport"
  | "hiburan"
  | "kesehatan"
  | "belanja"
  | "tagihan"
  | "lainnya";

// ── Data model pengeluaran ────────────────────────────────────
export interface Expense {
  id:         string;    // crypto.randomUUID()
  name:       string;    // Nama pengeluaran, contoh: "Kopi Kekinian"
  amount:     number;    // Jumlah dalam Rupiah (integer, bukan desimal)
  category:   Category;
  date:       string;    // ISO date string "YYYY-MM-DD"
  note?:      string;    // Catatan opsional
  createdAt:  number;    // Date.now() — untuk sorting
}

// ── Input form sebelum jadi Expense lengkap ───────────────────
// Tipe terpisah untuk form state: semua string, belum punya id/createdAt
export interface ExpenseFormData {
  name:     string;
  amount:   string;  // String dulu di form, convert ke number saat submit
  category: Category;
  date:     string;
  note:     string;
}

// ── State untuk filter ────────────────────────────────────────
export type FilterValue = Category | "all";

// ── Ringkasan per kategori (hasil kalkulasi useMemo) ──────────
export interface CategoryBreakdown {
  category:   Category;
  total:      number;
  count:      number;
  percentage: number;  // 0–100
}

// ── Global state yang dikelola reducer ────────────────────────
export interface ExpenseState {
  expenses: Expense[];
  filter:   FilterValue;
}

// ── Action types — discriminated union ───────────────────────
// Setiap action punya "type" yang unik → TypeScript bisa narrow dengan tepat
export type ExpenseAction =
  | { type: "ADD_EXPENSE";    payload: Expense }
  | { type: "DELETE_EXPENSE"; payload: { id: string } }
  | { type: "SET_FILTER";     payload: { filter: FilterValue } }
  | { type: "CLEAR_ALL" };
  // Mudah ditambah: EDIT_EXPENSE, IMPORT_EXPENSES, dll.
```

> **Discriminated Union untuk Actions — Ini Pattern Penting!**
>
> Dengan `type ExpenseAction = { type: "ADD_EXPENSE"; payload: Expense } | { type: "DELETE_EXPENSE"; payload: { id: string } } | ...`, TypeScript bisa tahu persis isi `payload` berdasarkan nilai `type`-nya. Di dalam reducer, setelah kamu tulis `case "ADD_EXPENSE":`, TypeScript sudah tahu `action.payload` bertipe `Expense`. Tidak perlu casting manual. Ini yang membuat reducer dengan TypeScript sangat aman.

---

### 4.2 Konfigurasi Kategori

```ts
// src/utils/categoryConfig.ts
import type { Category } from "../types/expense.types";

export interface CategoryConfig {
  label:   string;
  icon:    string;
  color:   string;   // Warna untuk chart / badge
  bgColor: string;   // Background warna lembut
}

// Record<Category, CategoryConfig> → TypeScript paksa kita isi semua kategori
// Kalau ada kategori yang terlewat, TypeScript langsung error
export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  makanan:   { label: "Makanan",   icon: "🍜", color: "#f59e0b", bgColor: "#fef3c7" },
  transport: { label: "Transport", icon: "🚗", color: "#3b82f6", bgColor: "#dbeafe" },
  hiburan:   { label: "Hiburan",   icon: "🎮", color: "#8b5cf6", bgColor: "#ede9fe" },
  kesehatan: { label: "Kesehatan", icon: "🏥", color: "#10b981", bgColor: "#d1fae5" },
  belanja:   { label: "Belanja",   icon: "🛍️", color: "#ec4899", bgColor: "#fce7f3" },
  tagihan:   { label: "Tagihan",   icon: "📄", color: "#ef4444", bgColor: "#fee2e2" },
  lainnya:   { label: "Lainnya",   icon: "📦", color: "#6b7280", bgColor: "#f3f4f6" },
};

// Daftar semua kategori dalam urutan yang diinginkan
export const ALL_CATEGORIES: Category[] = [
  "makanan", "transport", "hiburan", "kesehatan", "belanja", "tagihan", "lainnya",
];
```

---

### 4.3 Formatter Utilities

```ts
// src/utils/formatters.ts

// Format angka ke Rupiah
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style:    "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date string "YYYY-MM-DD" ke "15 Jan 2026"
export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  }).format(new Date(dateStr + "T00:00:00")); // Tambah T00:00 supaya tidak kena timezone shift
}

// Dapat tanggal hari ini dalam format "YYYY-MM-DD"
export function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

// Validasi — apakah amount valid?
export function isValidAmount(value: string): boolean {
  const num = Number(value.replace(/[^0-9]/g, ""));
  return !isNaN(num) && num > 0 && num <= 999_999_999;
}
```

---

## 5. Reducer: Logika State Terpusat

Reducer adalah sebuah **pure function** — tidak ada side effect, tidak ada API call, tidak ada `localStorage` access. Hanya menerima state + action, mengembalikan state baru.

> **Pure function** = fungsi yang:
> 1. Selalu menghasilkan output yang sama untuk input yang sama
> 2. Tidak mengubah apapun di luar fungsinya sendiri (no mutation, no side effects)
>
> Karena reducer adalah pure function, dia **sangat mudah di-test**. Kamu tinggal panggil `expenseReducer(state, action)` dan cek hasilnya — tidak perlu mock apapun.

```ts
// src/reducer/expenseReducer.ts
import type { ExpenseState, ExpenseAction } from "../types/expense.types";

export const initialState: ExpenseState = {
  expenses: [],
  filter:   "all",
};

export function expenseReducer(
  state: ExpenseState,
  action: ExpenseAction
): ExpenseState {
  switch (action.type) {

    // ── Tambah expense baru ──────────────────────────────────
    case "ADD_EXPENSE": {
      return {
        ...state,
        expenses: [action.payload, ...state.expenses],
        // Newest first — tidak perlu sort lagi di render
      };
    }

    // ── Hapus expense berdasarkan ID ─────────────────────────
    case "DELETE_EXPENSE": {
      return {
        ...state,
        expenses: state.expenses.filter(
          (expense) => expense.id !== action.payload.id
        ),
      };
    }

    // ── Ubah filter aktif ────────────────────────────────────
    case "SET_FILTER": {
      return {
        ...state,
        filter: action.payload.filter,
      };
    }

    // ── Hapus semua expense ──────────────────────────────────
    case "CLEAR_ALL": {
      return {
        ...state,
        expenses: [],
        filter:   "all",
      };
    }

    // ── Default: kembalikan state tanpa perubahan ────────────
    // TypeScript akan error kalau ada action.type yang belum di-handle
    // (karena kita pakai discriminated union yang exhaustive)
    default: {
      // Trik: assertNever memastikan semua case handled saat compile time
      return state;
    }
  }
}
```

### Bonus: Unit Test Reducer (Tanpa Testing Library)

Ini salah satu keunggulan reducer — bisa di-test seperti test fungsi biasa:

```ts
// src/reducer/expenseReducer.test.ts
// Jalankan dengan: npx vitest (Vite sudah include Vitest)

import { describe, it, expect } from "vitest";
import { expenseReducer, initialState } from "./expenseReducer";
import type { Expense } from "../types/expense.types";

const mockExpense: Expense = {
  id:        "test-1",
  name:      "Kopi",
  amount:    35000,
  category:  "makanan",
  date:      "2026-01-15",
  createdAt: 1705286400000,
};

describe("expenseReducer", () => {
  it("ADD_EXPENSE — menambah expense ke list", () => {
    const newState = expenseReducer(initialState, {
      type:    "ADD_EXPENSE",
      payload: mockExpense,
    });

    expect(newState.expenses).toHaveLength(1);
    expect(newState.expenses[0]).toEqual(mockExpense);
  });

  it("DELETE_EXPENSE — menghapus expense berdasarkan ID", () => {
    const stateWithOne = expenseReducer(initialState, {
      type:    "ADD_EXPENSE",
      payload: mockExpense,
    });

    const afterDelete = expenseReducer(stateWithOne, {
      type:    "DELETE_EXPENSE",
      payload: { id: "test-1" },
    });

    expect(afterDelete.expenses).toHaveLength(0);
  });

  it("SET_FILTER — mengubah filter aktif", () => {
    const newState = expenseReducer(initialState, {
      type:    "SET_FILTER",
      payload: { filter: "makanan" },
    });

    expect(newState.filter).toBe("makanan");
  });

  it("CLEAR_ALL — mengosongkan semua expense dan reset filter", () => {
    const stateWithData = { expenses: [mockExpense], filter: "makanan" as const };
    const cleared = expenseReducer(stateWithData, { type: "CLEAR_ALL" });

    expect(cleared.expenses).toHaveLength(0);
    expect(cleared.filter).toBe("all");
  });

  it("Reducer tidak mutate state asli", () => {
    const originalExpenses = initialState.expenses;
    expenseReducer(initialState, { type: "ADD_EXPENSE", payload: mockExpense });

    // State asli harus tidak berubah
    expect(initialState.expenses).toBe(originalExpenses);
    expect(initialState.expenses).toHaveLength(0);
  });
});
```

> **Kenapa immutability itu penting?**
> Di reducer, kita **tidak boleh** langsung modifikasi `state.expenses.push(...)` atau `state.filter = "makanan"`. Kita harus selalu return **object baru** dengan spread operator (`{ ...state, expenses: [...] }`).
>
> Alasannya: React mendeteksi perubahan dengan membandingkan **referensi** object (shallow comparison). Kalau kamu mutasi langsung, referensinya tidak berubah → React pikir state tidak berubah → tidak re-render.

---

## 6. Custom Hook: useExpenses

Ini penghubung antara reducer (logic) dengan component (UI). Hook ini expose `state`, `dispatch` yang sudah di-wrap jadi action functions yang ekspresif, dan kalkulasi dengan `useMemo`.

```ts
// src/hooks/useExpenses.ts
import { useReducer, useEffect, useMemo, useCallback } from "react";
import { expenseReducer, initialState } from "../reducer/expenseReducer";
import type {
  Expense,
  ExpenseFormData,
  FilterValue,
  Category,
  CategoryBreakdown,
} from "../types/expense.types";
import { ALL_CATEGORIES } from "../utils/categoryConfig";

// ── localStorage ──────────────────────────────────────────────
const STORAGE_KEY = "expense-tracker:state" as const;

function loadFromStorage(): typeof initialState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as typeof initialState;
    // Validasi minimal
    if (!Array.isArray(parsed?.expenses)) return initialState;
    return parsed;
  } catch {
    return initialState;
  }
}

function saveToStorage(state: typeof initialState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Gagal simpan ke localStorage:", err);
  }
}

// ── Return type hook ──────────────────────────────────────────
export interface UseExpensesReturn {
  // State
  expenses:           Expense[];
  filteredExpenses:   Expense[];
  filter:             FilterValue;
  // Kalkulasi
  totalAmount:        number;
  totalCount:         number;
  categoryBreakdown:  CategoryBreakdown[];
  // Actions
  addExpense:    (data: ExpenseFormData) => void;
  deleteExpense: (id: string) => void;
  setFilter:     (filter: FilterValue) => void;
  clearAll:      () => void;
}

// ── Hook ──────────────────────────────────────────────────────
export function useExpenses(): UseExpensesReturn {
  // Lazy initializer: baca dari localStorage sekali saat pertama mount
  const [state, dispatch] = useReducer(expenseReducer, undefined, loadFromStorage);

  // Sync ke localStorage setiap state berubah
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // ── Derived state via useMemo ─────────────────────────────

  // Daftar expense setelah filter — O(n), hanya hitung ulang kalau expenses/filter berubah
  const filteredExpenses = useMemo<Expense[]>(() => {
    if (state.filter === "all") return state.expenses;
    return state.expenses.filter((e) => e.category === state.filter);
  }, [state.expenses, state.filter]);

  // Total amount dari SEMUA expense (bukan yang difilter)
  // Ini yang ditampilkan di summary card atas
  const totalAmount = useMemo<number>(
    () => state.expenses.reduce((sum, e) => sum + e.amount, 0),
    [state.expenses]
  );

  const totalCount = state.expenses.length;

  // Breakdown per kategori — untuk chart/ringkasan
  const categoryBreakdown = useMemo<CategoryBreakdown[]>(() => {
    // Hitung total per kategori
    const totals = new Map<Category, { total: number; count: number }>();

    for (const expense of state.expenses) {
      const current = totals.get(expense.category) ?? { total: 0, count: 0 };
      totals.set(expense.category, {
        total: current.total + expense.amount,
        count: current.count + 1,
      });
    }

    // Convert Map ke array, hitung persentase, sort by total (desc)
    const breakdown: CategoryBreakdown[] = ALL_CATEGORIES
      .filter((cat) => totals.has(cat)) // Hanya kategori yang ada datanya
      .map((cat) => {
        const data = totals.get(cat)!;
        return {
          category:   cat,
          total:      data.total,
          count:      data.count,
          percentage: totalAmount > 0 ? Math.round((data.total / totalAmount) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total); // Sort: kategori terbesar di atas

    return breakdown;
  }, [state.expenses, totalAmount]);

  // ── Action wrappers ───────────────────────────────────────
  // Wrap dispatch supaya component tidak perlu tahu detail action shape

  const addExpense = useCallback((data: ExpenseFormData): void => {
    const amount = parseInt(data.amount.replace(/[^0-9]/g, ""), 10);

    // Guard: validasi sebelum dispatch
    if (!data.name.trim() || isNaN(amount) || amount <= 0) return;

    const newExpense: Expense = {
      id:        crypto.randomUUID(),
      name:      data.name.trim(),
      amount,
      category:  data.category,
      date:      data.date,
      note:      data.note.trim() || undefined,
      createdAt: Date.now(),
    };

    dispatch({ type: "ADD_EXPENSE", payload: newExpense });
  }, []);

  const deleteExpense = useCallback((id: string): void => {
    dispatch({ type: "DELETE_EXPENSE", payload: { id } });
  }, []);

  const setFilter = useCallback((filter: FilterValue): void => {
    dispatch({ type: "SET_FILTER", payload: { filter } });
  }, []);

  const clearAll = useCallback((): void => {
    if (window.confirm("Hapus semua data pengeluaran? Aksi ini tidak bisa di-undo.")) {
      dispatch({ type: "CLEAR_ALL" });
    }
  }, []);

  return {
    expenses:          state.expenses,
    filteredExpenses,
    filter:            state.filter,
    totalAmount,
    totalCount,
    categoryBreakdown,
    addExpense,
    deleteExpense,
    setFilter,
    clearAll,
  };
}
```

---

## 7. Komponen: ExpenseForm

Form dengan 4 field: nama, jumlah, kategori, tanggal. Semua dikelola lewat satu state `formData` — pattern yang lebih rapi daripada `useState` terpisah per field.

```tsx
// src/components/ExpenseForm/ExpenseForm.tsx
import { useState, FormEvent, ChangeEvent } from "react";
import type { ExpenseFormData, Category } from "../../types/expense.types";
import { ALL_CATEGORIES, CATEGORY_CONFIG } from "../../utils/categoryConfig";
import { todayString, isValidAmount } from "../../utils/formatters";
import styles from "./ExpenseForm.module.css";

interface ExpenseFormProps {
  onAdd: (data: ExpenseFormData) => void;
}

// Nilai awal form
const DEFAULT_FORM: ExpenseFormData = {
  name:     "",
  amount:   "",
  category: "makanan",
  date:     todayString(),
  note:     "",
};

function ExpenseForm({ onAdd }: ExpenseFormProps) {
  const [form, setForm] = useState<ExpenseFormData>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});

  // ── Generic handler — satu fungsi untuk semua field ──────
  // Trik: name attribute di input harus match key di ExpenseFormData
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear error saat user mulai edit field
    if (errors[name as keyof ExpenseFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // ── Validasi sebelum submit ───────────────────────────────
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!form.name.trim()) {
      newErrors.name = "Nama pengeluaran harus diisi.";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Nama minimal 2 karakter.";
    }

    if (!form.amount) {
      newErrors.amount = "Jumlah harus diisi.";
    } else if (!isValidAmount(form.amount)) {
      newErrors.amount = "Jumlah tidak valid. Masukkan angka lebih dari 0.";
    }

    if (!form.date) {
      newErrors.date = "Tanggal harus diisi.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!validate()) return;

    onAdd(form);
    // Reset form ke nilai awal (tanggal diperbarui ke hari ini)
    setForm({ ...DEFAULT_FORM, date: todayString() });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <h2 className={styles.title}>Catat Pengeluaran Baru</h2>

      <div className={styles.grid}>
        {/* Nama */}
        <div className={`${styles.field} ${styles.fieldName}`}>
          <label htmlFor="expense-name" className={styles.label}>
            Nama Pengeluaran *
          </label>
          <input
            id="expense-name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="cth: Kopi Kekinian, Grab ke kantor"
            maxLength={100}
            className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && (
            <span id="name-error" className={styles.errorText} role="alert">
              {errors.name}
            </span>
          )}
        </div>

        {/* Jumlah */}
        <div className={styles.field}>
          <label htmlFor="expense-amount" className={styles.label}>
            Jumlah (Rp) *
          </label>
          <input
            id="expense-amount"
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            placeholder="cth: 35000"
            min={1}
            max={999999999}
            className={`${styles.input} ${errors.amount ? styles.inputError : ""}`}
            aria-describedby={errors.amount ? "amount-error" : undefined}
          />
          {errors.amount && (
            <span id="amount-error" className={styles.errorText} role="alert">
              {errors.amount}
            </span>
          )}
        </div>

        {/* Kategori */}
        <div className={styles.field}>
          <label htmlFor="expense-category" className={styles.label}>
            Kategori *
          </label>
          <select
            id="expense-category"
            name="category"
            value={form.category}
            onChange={handleChange}
            className={styles.select}
          >
            {ALL_CATEGORIES.map((cat) => {
              const config = CATEGORY_CONFIG[cat];
              return (
                <option key={cat} value={cat}>
                  {config.icon} {config.label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Tanggal */}
        <div className={styles.field}>
          <label htmlFor="expense-date" className={styles.label}>
            Tanggal *
          </label>
          <input
            id="expense-date"
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            max={todayString()} // Tidak boleh input tanggal masa depan
            className={`${styles.input} ${errors.date ? styles.inputError : ""}`}
            aria-describedby={errors.date ? "date-error" : undefined}
          />
          {errors.date && (
            <span id="date-error" className={styles.errorText} role="alert">
              {errors.date}
            </span>
          )}
        </div>

        {/* Catatan (opsional) */}
        <div className={`${styles.field} ${styles.fieldNote}`}>
          <label htmlFor="expense-note" className={styles.label}>
            Catatan <span className={styles.optional}>(opsional)</span>
          </label>
          <input
            id="expense-note"
            type="text"
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="cth: Makan siang bareng tim"
            maxLength={200}
            className={styles.input}
          />
        </div>
      </div>

      <button type="submit" className={styles.submitButton}>
        + Catat Pengeluaran
      </button>
    </form>
  );
}

export default ExpenseForm;
```

```css
/* src/components/ExpenseForm/ExpenseForm.module.css */
.form {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
}

.title {
  font-size: 1rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 1.25rem;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1rem;
}

/* Nama dan catatan span full width */
.fieldName,
.fieldNote {
  grid-column: 1 / -1;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.optional {
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: normal;
  text-transform: none;
  letter-spacing: 0;
}

.input,
.select {
  padding: 0.6rem 0.8rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #374151;
  background: #f9fafb;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  outline: none;
  width: 100%;
}

.input:focus,
.select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px #6366f120;
  background: #fff;
}

.inputError {
  border-color: #ef4444;
}

.inputError:focus {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px #ef444420;
}

.errorText {
  font-size: 0.75rem;
  color: #ef4444;
}

.submitButton {
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  transition: background 0.15s, transform 0.1s;
}

.submitButton:hover {
  background: #4f46e5;
}

.submitButton:active {
  transform: scale(0.98);
}

@media (max-width: 480px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .fieldName,
  .fieldNote {
    grid-column: 1;
  }
}
```

---

## 8. Komponen: ExpenseItem & ExpenseList

### ExpenseItem

```tsx
// src/components/ExpenseItem/ExpenseItem.tsx
import { memo } from "react";
import type { Expense } from "../../types/expense.types";
import { CATEGORY_CONFIG } from "../../utils/categoryConfig";
import { formatCurrency, formatDate } from "../../utils/formatters";
import styles from "./ExpenseItem.module.css";

interface ExpenseItemProps {
  expense:  Expense;
  onDelete: (id: string) => void;
}

const ExpenseItem = memo(function ExpenseItem({ expense, onDelete }: ExpenseItemProps) {
  const config = CATEGORY_CONFIG[expense.category];

  return (
    <li className={styles.item}>
      {/* Category badge */}
      <span
        className={styles.badge}
        style={{ background: config.bgColor, color: config.color }}
        aria-label={`Kategori: ${config.label}`}
      >
        <span aria-hidden="true">{config.icon}</span>
        <span>{config.label}</span>
      </span>

      {/* Info */}
      <div className={styles.info}>
        <span className={styles.name} title={expense.name}>
          {expense.name}
        </span>
        {expense.note && (
          <span className={styles.note}>{expense.note}</span>
        )}
        <span className={styles.date}>{formatDate(expense.date)}</span>
      </div>

      {/* Amount */}
      <span className={styles.amount}>
        {formatCurrency(expense.amount)}
      </span>

      {/* Delete button */}
      <button
        className={styles.deleteBtn}
        onClick={() => onDelete(expense.id)}
        aria-label={`Hapus pengeluaran: ${expense.name}`}
        title="Hapus"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </li>
  );
});

export default ExpenseItem;
```

```css
/* src/components/ExpenseItem/ExpenseItem.module.css */
.item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #fff;
  border-radius: 10px;
  border: 1px solid #f1f3f5;
  transition: box-shadow 0.15s, border-color 0.15s;
  list-style: none;
}

.item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  border-color: #e5e7eb;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0; /* Penting: supaya text-overflow ellipsis bekerja */
}

.name {
  font-size: 0.9rem;
  font-weight: 500;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note {
  font-size: 0.75rem;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date {
  font-size: 0.72rem;
  color: #94a3b8;
}

.amount {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  flex-shrink: 0;
}

.deleteBtn {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #cbd5e1;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
  opacity: 0;
}

.item:hover .deleteBtn {
  opacity: 1;
}

.deleteBtn:hover {
  background: #fee2e2;
  color: #ef4444;
}
```

---

### ExpenseList

```tsx
// src/components/ExpenseList/ExpenseList.tsx
import type { Expense, FilterValue } from "../../types/expense.types";
import { CATEGORY_CONFIG } from "../../utils/categoryConfig";
import ExpenseItem from "../ExpenseItem/ExpenseItem";
import styles from "./ExpenseList.module.css";

interface ExpenseListProps {
  expenses:      Expense[];
  filter:        FilterValue;
  onDelete:      (id: string) => void;
  onClearAll:    () => void;
  totalExpenses: number; // Total SEMUA expense (untuk pesan empty saat filter aktif)
}

function ExpenseList({
  expenses,
  filter,
  onDelete,
  onClearAll,
  totalExpenses,
}: ExpenseListProps) {
  // ── Empty state ──────────────────────────────────────────
  if (expenses.length === 0) {
    // Tidak ada expense sama sekali
    if (totalExpenses === 0) {
      return (
        <div className={styles.empty}>
          <p className={styles.emptyIcon} aria-hidden="true">💸</p>
          <p className={styles.emptyTitle}>Belum ada pengeluaran</p>
          <p className={styles.emptySubtitle}>
            Mulai catat pengeluaran pertamamu di atas.
          </p>
        </div>
      );
    }

    // Ada expense tapi filter aktif dan tidak menemukan yang cocok
    const filterLabel = filter !== "all" ? CATEGORY_CONFIG[filter].label : "";
    return (
      <div className={styles.empty}>
        <p className={styles.emptyIcon} aria-hidden="true">🔍</p>
        <p className={styles.emptyTitle}>
          Tidak ada pengeluaran di kategori "{filterLabel}"
        </p>
        <p className={styles.emptySubtitle}>
          Coba pilih kategori yang lain.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header list */}
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>
          Pengeluaran{" "}
          {filter !== "all" && (
            <span style={{ color: CATEGORY_CONFIG[filter].color }}>
              ({CATEGORY_CONFIG[filter].label})
            </span>
          )}
        </h3>
        <div className={styles.headerActions}>
          <span className={styles.count}>
            {expenses.length} transaksi
          </span>
          {totalExpenses > 0 && (
            <button
              onClick={onClearAll}
              className={styles.clearBtn}
              aria-label="Hapus semua pengeluaran"
            >
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <ul className={styles.list} aria-label="Daftar pengeluaran">
        {expenses.map((expense) => (
          <ExpenseItem
            key={expense.id}
            expense={expense}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}

export default ExpenseList;
```

```css
/* src/components/ExpenseList/ExpenseList.module.css */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.headerTitle {
  font-size: 0.95rem;
  font-weight: 700;
  color: #374151;
}

.headerActions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.count {
  font-size: 0.78rem;
  color: #94a3b8;
}

.clearBtn {
  font-size: 0.78rem;
  color: #ef4444;
  background: transparent;
  border: none;
  text-decoration: underline;
  padding: 0;
  transition: color 0.15s;
}

.clearBtn:hover {
  color: #dc2626;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0;
  margin: 0;
}

.empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #94a3b8;
}

.emptyIcon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.emptyTitle {
  font-size: 0.95rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.emptySubtitle {
  font-size: 0.82rem;
}
```

---

## 9. Komponen: CategorySummary

Ini bagian paling menarik — visualisasi breakdown pengeluaran per kategori dengan progress bar.

```tsx
// src/components/CategorySummary/CategorySummary.tsx
import { memo } from "react";
import type { CategoryBreakdown } from "../../types/expense.types";
import { CATEGORY_CONFIG } from "../../utils/categoryConfig";
import { formatCurrency } from "../../utils/formatters";
import styles from "./CategorySummary.module.css";

interface CategorySummaryProps {
  breakdown: CategoryBreakdown[];
  total:     number;
}

const CategorySummary = memo(function CategorySummary({
  breakdown,
  total,
}: CategorySummaryProps) {
  if (breakdown.length === 0 || total === 0) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Ringkasan per Kategori</h3>

      <ul className={styles.list}>
        {breakdown.map(({ category, total: catTotal, count, percentage }) => {
          const config = CATEGORY_CONFIG[category];

          return (
            <li key={category} className={styles.row}>
              {/* Label kiri */}
              <div className={styles.labelRow}>
                <span className={styles.icon} aria-hidden="true">
                  {config.icon}
                </span>
                <span className={styles.label}>{config.label}</span>
                <span className={styles.transactionCount}>
                  {count} transaksi
                </span>
                <span className={styles.percent}>{percentage}%</span>
                <span className={styles.amount}>{formatCurrency(catTotal)}</span>
              </div>

              {/* Progress bar */}
              <div
                className={styles.barTrack}
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${config.label}: ${percentage}% dari total`}
              >
                <div
                  className={styles.barFill}
                  style={{
                    width:      `${percentage}%`,
                    background: config.color,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Total */}
      <div className={styles.totalRow}>
        <span>Total Keseluruhan</span>
        <span className={styles.totalAmount}>{formatCurrency(total)}</span>
      </div>
    </div>
  );
});

export default CategorySummary;
```

```css
/* src/components/CategorySummary/CategorySummary.module.css */
.container {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
}

.title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 1rem;
}

.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.labelRow {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #374151;
  flex: 1;
}

.transactionCount {
  font-size: 0.72rem;
  color: #9ca3af;
  white-space: nowrap;
}

.percent {
  font-size: 0.8rem;
  font-weight: 700;
  color: #374151;
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

.amount {
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  min-width: 80px;
  text-align: right;
}

.barTrack {
  height: 8px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}

.barFill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.totalRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 0.875rem;
  border-top: 1px solid #f1f5f9;
  font-size: 0.85rem;
  color: #6b7280;
}

.totalAmount {
  font-size: 1rem;
  font-weight: 800;
  color: #1e293b;
}
```

---

## 10. Komponen: SummaryCards

Kartu statistik di bagian atas: total pengeluaran, jumlah transaksi, rata-rata.

```tsx
// src/components/SummaryCards/SummaryCards.tsx
import { useMemo } from "react";
import type { Expense } from "../../types/expense.types";
import { formatCurrency } from "../../utils/formatters";
import styles from "./SummaryCards.module.css";

interface SummaryCardsProps {
  expenses:    Expense[];
  totalAmount: number;
  totalCount:  number;
}

function SummaryCards({ expenses, totalAmount, totalCount }: SummaryCardsProps) {
  // Rata-rata pengeluaran per transaksi
  const avgAmount = useMemo(
    () => (totalCount > 0 ? Math.round(totalAmount / totalCount) : 0),
    [totalAmount, totalCount]
  );

  // Pengeluaran terbesar
  const maxExpense = useMemo(
    () => expenses.reduce<Expense | null>(
      (max, e) => (!max || e.amount > max.amount ? e : max),
      null
    ),
    [expenses]
  );

  const cards = [
    {
      label:   "Total Pengeluaran",
      value:   formatCurrency(totalAmount),
      icon:    "💰",
      color:   "#6366f1",
      bgColor: "#eef2ff",
    },
    {
      label:   "Jumlah Transaksi",
      value:   `${totalCount} transaksi`,
      icon:    "📋",
      color:   "#0891b2",
      bgColor: "#ecfeff",
    },
    {
      label:   "Rata-rata / Transaksi",
      value:   totalCount > 0 ? formatCurrency(avgAmount) : "-",
      icon:    "📊",
      color:   "#059669",
      bgColor: "#ecfdf5",
    },
    {
      label:   "Pengeluaran Terbesar",
      value:   maxExpense ? formatCurrency(maxExpense.amount) : "-",
      subtext: maxExpense?.name,
      icon:    "🏆",
      color:   "#d97706",
      bgColor: "#fffbeb",
    },
  ];

  return (
    <div className={styles.grid}>
      {cards.map((card) => (
        <div
          key={card.label}
          className={styles.card}
          style={{ borderTop: `3px solid ${card.color}` }}
        >
          <div className={styles.cardIcon} style={{ background: card.bgColor }}>
            <span aria-hidden="true">{card.icon}</span>
          </div>
          <div className={styles.cardContent}>
            <p className={styles.cardLabel}>{card.label}</p>
            <p className={styles.cardValue} style={{ color: card.color }}>
              {card.value}
            </p>
            {card.subtext && (
              <p className={styles.cardSubtext} title={card.subtext}>
                {card.subtext}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default SummaryCards;
```

```css
/* src/components/SummaryCards/SummaryCards.module.css */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.card {
  background: #fff;
  border-radius: 10px;
  padding: 1rem;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.cardIcon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.cardContent {
  flex: 1;
  min-width: 0;
}

.cardLabel {
  font-size: 0.72rem;
  color: #9ca3af;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.2rem;
}

.cardValue {
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.2;
}

.cardSubtext {
  font-size: 0.72rem;
  color: #94a3b8;
  margin-top: 0.15rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 480px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 11. App.tsx: Merakit Semuanya

```tsx
// src/App.tsx
import { useExpenses } from "./hooks/useExpenses";
import ExpenseForm     from "./components/ExpenseForm/ExpenseForm";
import ExpenseList     from "./components/ExpenseList/ExpenseList";
import CategoryFilter  from "./components/CategoryFilter/CategoryFilter";
import CategorySummary from "./components/CategorySummary/CategorySummary";
import SummaryCards    from "./components/SummaryCards/SummaryCards";
import styles from "./App.module.css";

function App() {
  const {
    expenses,
    filteredExpenses,
    filter,
    totalAmount,
    totalCount,
    categoryBreakdown,
    addExpense,
    deleteExpense,
    setFilter,
    clearAll,
  } = useExpenses();

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>
            <span aria-hidden="true">💸</span> Expense Tracker
          </h1>
          <p className={styles.subtitle}>
            Catat, pantau, dan kelola pengeluaranmu.
          </p>
        </header>

        {/* Layout: dua kolom di desktop, satu kolom di mobile */}
        <div className={styles.layout}>
          {/* Kolom kiri: form + filter + list */}
          <main className={styles.mainCol}>
            {/* Form tambah */}
            <ExpenseForm onAdd={addExpense} />

            {/* Summary cards */}
            <SummaryCards
              expenses={expenses}
              totalAmount={totalAmount}
              totalCount={totalCount}
            />

            {/* Filter kategori */}
            {totalCount > 0 && (
              <CategoryFilter
                currentFilter={filter}
                onFilterChange={setFilter}
              />
            )}

            {/* Daftar pengeluaran */}
            <ExpenseList
              expenses={filteredExpenses}
              filter={filter}
              onDelete={deleteExpense}
              onClearAll={clearAll}
              totalExpenses={totalCount}
            />
          </main>

          {/* Kolom kanan: ringkasan kategori */}
          {categoryBreakdown.length > 0 && (
            <aside className={styles.sideCol}>
              <CategorySummary
                breakdown={categoryBreakdown}
                total={totalAmount}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
```

### CategoryFilter (Satu Lagi yang Belum Kita Tulis)

```tsx
// src/components/CategoryFilter/CategoryFilter.tsx
import type { FilterValue } from "../../types/expense.types";
import { ALL_CATEGORIES, CATEGORY_CONFIG } from "../../utils/categoryConfig";
import styles from "./CategoryFilter.module.css";

interface CategoryFilterProps {
  currentFilter:  FilterValue;
  onFilterChange: (filter: FilterValue) => void;
}

function CategoryFilter({ currentFilter, onFilterChange }: CategoryFilterProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll} role="group" aria-label="Filter kategori">
        {/* Tombol "Semua" */}
        <button
          onClick={() => onFilterChange("all")}
          className={`${styles.btn} ${currentFilter === "all" ? styles.active : ""}`}
          aria-pressed={currentFilter === "all"}
        >
          🗂️ Semua
        </button>

        {/* Tombol per kategori */}
        {ALL_CATEGORIES.map((cat) => {
          const config = CATEGORY_CONFIG[cat];
          const isActive = currentFilter === cat;

          return (
            <button
              key={cat}
              onClick={() => onFilterChange(cat)}
              className={`${styles.btn} ${isActive ? styles.active : ""}`}
              style={
                isActive
                  ? { borderColor: config.color, color: config.color, background: config.bgColor }
                  : {}
              }
              aria-pressed={isActive}
            >
              {config.icon} {config.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryFilter;
```

```css
/* src/components/CategoryFilter/CategoryFilter.module.css */
.wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Firefox */
}

.wrapper::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

.scroll {
  display: flex;
  gap: 0.4rem;
  padding-bottom: 0.25rem;
  min-width: max-content;
}

.btn {
  padding: 0.4rem 0.85rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 20px;
  background: #fff;
  font-size: 0.8rem;
  color: #6b7280;
  white-space: nowrap;
  transition: all 0.15s;
}

.btn:hover {
  border-color: #d1d5db;
  color: #374151;
}

.active {
  border-color: #6366f1;
  color: #6366f1;
  background: #eef2ff;
  font-weight: 600;
}
```

```css
/* src/App.module.css */
.page {
  min-height: 100vh;
  padding: 2rem 1rem 4rem;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header {
  text-align: center;
}

.title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 0.35rem;
}

.subtitle {
  color: #64748b;
  font-size: 0.9rem;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1.25rem;
  align-items: start;
}

.mainCol {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sideCol {
  position: sticky;
  top: 1.5rem; /* Sidebar nempel saat scroll */
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sideCol {
    position: static;
  }
}
```

---

## 12. Styling dengan CSS Modules

Kita sudah menggunakan CSS Modules di seluruh project. Satu hal tambahan yang perlu dipahami adalah penggunaan `style` prop untuk dynamic styling:

### Kapan Pakai CSS Module vs Inline Style?

```tsx
// ✅ CSS Module — untuk styling statis dan state-based classes
<div className={styles.card}>...</div>
<div className={`${styles.card} ${isActive ? styles.active : ""}`}>...</div>

// ✅ Inline style — hanya untuk nilai DINAMIS yang tidak bisa prediksi di CSS
<div
  style={{
    width: `${percentage}%`,    // Nilai berubah runtime
    background: config.color,   // Warna dari data, bukan predefined class
  }}
/>

// ❌ Jangan: inline style untuk styling yang bisa diprediksi
<div style={{ fontSize: "14px", color: "red" }}>
  Ini seharusnya jadi CSS class
</div>
```

---

## 13. Checklist Akhir & Ide Pengembangan

### Checklist: Verifikasi Semua Fitur

**Form & Tambah Expense:**
- [ ] Bisa tambah expense dengan semua field terisi
- [ ] Validasi: tidak bisa submit kalau nama kosong
- [ ] Validasi: tidak bisa submit kalau amount kosong atau 0
- [ ] Validasi: input yang salah menampilkan pesan error yang jelas
- [ ] Setelah submit berhasil, form kembali ke nilai awal (tanggal = hari ini)
- [ ] Tombol "Catat Pengeluaran" disable saat ada error yang belum diperbaiki? *(Bonus challenge!)*

**Hapus:**
- [ ] Tombol hapus muncul saat hover setiap item
- [ ] Klik hapus → item langsung hilang dari list
- [ ] Tombol "Hapus Semua" memunculkan konfirmasi sebelum menghapus
- [ ] Summary cards update setelah hapus

**Filter:**
- [ ] Filter "Semua" tampilkan semua expense
- [ ] Filter per kategori hanya tampilkan expense kategori tersebut
- [ ] Counter di ExpenseList update sesuai filter
- [ ] Empty state yang berbeda: "belum ada data" vs "tidak ada di kategori ini"
- [ ] Total di SummaryCards tetap menampilkan total SEMUA (tidak terpengaruh filter)

**Kalkulasi & Summary:**
- [ ] Total amount akurat (tidak ada pembulatan yang salah)
- [ ] Persentase per kategori akurat (total semua = 100%, boleh ada off-by-one karena rounding)
- [ ] Progress bar sesuai persentase
- [ ] Rata-rata per transaksi benar
- [ ] Pengeluaran terbesar menampilkan nama + jumlah yang benar

**Persistensi:**
- [ ] Tambah expense → refresh → data masih ada
- [ ] Hapus expense → refresh → data terhapus tetap
- [ ] Filter aktif → refresh → *boleh* reset ke "all" (ini UX choice — pilih sesuai keinginan)
- [ ] Tambah banyak expense → refresh → semua tetap ada dan urutan terjaga

**Responsif:**
- [ ] Tampil bagus di desktop (sidebar CategorySummary di sebelah kanan)
- [ ] Tampil bagus di mobile (satu kolom, filter bisa di-scroll horizontal)
- [ ] Form masih nyaman diisi di mobile

---

### Ide Pengembangan Mandiri

**Level 1 — Lebih Lengkap:**
- [ ] **Edit expense** — Klik expense → bisa edit nama/jumlah/kategori
- [ ] **Sort options** — Urutkan by: terbaru, tertinggi, terendah, A-Z
- [ ] **Date range filter** — Filter by minggu ini / bulan ini / bulan lalu
- [ ] **Export CSV** — Download semua data sebagai `.csv` yang bisa dibuka di Excel

**Level 2 — Fitur Baru:**
- [ ] **Budget per kategori** — Set batas anggaran per kategori, tampilkan warning kalau mendekati
- [ ] **Recurring expense** — Pengeluaran rutin (bulanan/minggu) yang auto-generate
- [ ] **Multi-currency** — Support IDR, USD, EUR dengan konversi rata-rata
- [ ] **Pie/Bar chart** — Pakai library `recharts` untuk visualisasi yang lebih menarik

**Level 3 — Arsitektur:**
- [ ] **Context + useReducer** — Pindahkan state ke Context agar bisa diakses dari mana saja tanpa prop-drilling
- [ ] **Zustand store** — Refactor dari `useReducer` ke Zustand (bandingkan DX-nya)
- [ ] **Backend sync** — Simpan ke Supabase atau Firebase, bisa akses dari banyak device
- [ ] **PWA** — Jadikan installable dan bisa dipakai offline

---

### Perbandingan: useState vs useReducer — Sebelum dan Sesudah

Setelah menyelesaikan project ini, kamu punya bukti nyata kenapa `useReducer` lebih tepat di sini:

```
useState approach (bayangkan kalau kita paksa):
─────────────────────────────────────────────
const [expenses, setExpenses] = useState([]);
const [filter, setFilter]     = useState("all");

// Hapus expense:
const deleteExpense = (id) => {
  setExpenses(prev => prev.filter(e => e.id !== id));
  // Harus ingat: kalau filter aktif dan tidak ada lagi yang cocok,
  // apakah kita reset filter? Tiap developer bisa beda keputusan.
  // Logic tersebar.
};


useReducer approach (yang kita pakai):
───────────────────────────────────────
dispatch({ type: "DELETE_EXPENSE", payload: { id } });
// Reducer yang handle semua konsekuensinya.
// Logic terpusat, testable, predictable.
```

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Vite*
