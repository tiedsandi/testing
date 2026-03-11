# Todo App - React + TypeScript

> Project praktis untuk belajar React + TypeScript dengan fitur lengkap: CRUD, filter, localStorage, dan component architecture yang proper.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build untuk production
npm run build
```

Buka browser di `http://localhost:5173/`

---

## 📁 Struktur Project

```
src/
├── types/
│   └── todo.types.ts          # TypeScript interfaces & types
├── hooks/
│   └── useTodos.ts            # Custom hook untuk logic todo
├── components/
│   ├── TodoInput/             # Komponen input tambah todo
│   ├── TodoItem/              # Komponen item todo
│   ├── FilterBar/             # Komponen filter & clear completed
│   ├── TodoList/              # Komponen daftar todo
│   └── TodoStats/             # Komponen progress bar & statistik
├── App.tsx                    # Main component
├── App.module.css             # App styling
└── index.css                  # Global reset
```

---

## ✨ Fitur

- ✅ Tambah todo baru (dengan Enter atau tombol)
- ✅ Toggle todo selesai/belum selesai
- ✅ Hapus todo satu per satu
- ✅ Filter: All, Active, Completed
- ✅ Simpan ke localStorage (data tidak hilang saat refresh)
- ✅ Counter: berapa todo yang tersisa
- ✅ Progress bar visual
- ✅ Clear all completed todos
- ✅ Empty state yang kontekstual

---

## 🧪 Checklist: Sebelum Kamu Claim "Selesai"

Coba semua skenario ini satu per satu:

### **Fungsionalitas dasar:**

- [ ] Bisa tambah todo baru dengan menekan Enter
- [ ] Bisa tambah todo baru dengan klik tombol "Tambah"
- [ ] Tidak bisa tambah todo yang isinya kosong atau hanya spasi
- [ ] Klik checkbox → todo berubah jadi completed (strikethrough)
- [ ] Klik checkbox lagi → todo kembali jadi active
- [ ] Tombol hapus muncul saat hover item
- [ ] Klik hapus → todo hilang dari list

### **Filter:**

- [ ] Filter "Semua" → tampilkan semua todo
- [ ] Filter "Aktif" → hanya tampilkan todo yang belum selesai
- [ ] Filter "Selesai" → hanya tampilkan todo yang sudah selesai
- [ ] Counter "X item tersisa" update secara real-time
- [ ] Tombol "Hapus Selesai" hanya muncul kalau ada todo yang completed
- [ ] Klik "Hapus Selesai" → semua completed todo hilang

### **Persistensi:**

- [ ] Tambah beberapa todo, lalu refresh halaman → todo masih ada
- [ ] Toggle beberapa todo, refresh → status masih tersimpan
- [ ] Hapus todo, refresh → todo yang dihapus tidak kembali

### **Edge cases:**

- [ ] Input dengan leading/trailing spasi → tersimpan tanpa spasi
- [ ] Input sangat panjang (>100 karakter) → ditampilkan dengan baik, wrap ke baris baru
- [ ] Semua todo dihapus → empty state tampil dengan benar
- [ ] Filter "Aktif" saat tidak ada yang aktif → empty state kontekstual

### **UI/UX:**

- [ ] Halaman saat tidak ada todo sama sekali → terlihat bagus
- [ ] Progress bar bergerak saat toggle todo

---

## 🎯 Konsep React/TypeScript yang Dipelajari

| Konsep                      | Implementasi                                 |
| --------------------------- | -------------------------------------------- |
| Type-first development      | Buat `interface Todo` sebelum nulis komponen |
| Separation of concerns      | Semua logic di `useTodos`, komponen hanya UI |
| Lazy state initialization   | `useState<Todo[]>(loadTodosFromStorage)`     |
| Derived state & memoization | `useMemo` untuk `filteredTodos`              |
| Referential stability       | `useCallback` untuk action functions         |
| Side effects                | `useEffect` untuk sync ke localStorage       |
| Functional state update     | `setTodos(prev => ...)`                      |
| Render optimization         | `React.memo` di TodoItem                     |
| Scoped styling              | CSS Modules untuk semua komponen             |
| Accessibility               | `aria-label`, `role`, `aria-live`            |

---

## 💡 Ide Pengembangan

**Level 1 — Gampang:**

- [ ] Edit todo inline (double click)
- [ ] Drag to reorder todos
- [ ] Keyboard shortcut (Ctrl+Z untuk undo)
- [ ] Due date dengan color coding

**Level 2 — Menengah:**

- [ ] Multiple lists (Work, Personal, dll.)
- [ ] Todo priority (Low/Medium/High)
- [ ] Search/filter berdasarkan teks
- [ ] Dark mode toggle

**Level 3 — Advanced:**

- [ ] Backend sync dengan API
- [ ] Authentication (login/logout)
- [ ] Offline support dengan service worker
- [ ] Drag & drop antar list (seperti Trello)

---

## 📚 Dokumentasi Lengkap

Lihat panduan lengkap di: [A_todo-app-project.md](../../A_todo-app-project.md)

---

**Built with:** React 18 + TypeScript 5 + Vite
