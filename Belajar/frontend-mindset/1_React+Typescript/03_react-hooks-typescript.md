# React Hooks dengan TypeScript

> **Prerequisite:** Sudah baca [typescript-basics-for-react-dev.md](./typescript-basics-for-react-dev.md) dan [react-component-typescript.md](./react-component-typescript.md).

---

## Daftar Isi

1. [useState — Menyimpan State dengan Aman](#1-usestate--menyimpan-state-dengan-aman)
2. [useEffect — Side Effect & Dependency Array](#2-useeffect--side-effect--dependency-array)
3. [useRef — Pegang DOM & Nilai Persisten](#3-useref--pegang-dom--nilai-persisten)
4. [useCallback & useMemo — Optimasi yang Sering Disalahpakai](#4-usecallback--usememo--optimasi-yang-sering-disalahpakai)
5. [Custom Hook — Bikin Hook Sendiri](#5-custom-hook--bikin-hook-sendiri)
6. [Anti-Pattern yang Harus Dihindari](#6-anti-pattern-yang-harus-dihindari)
7. [Mini Project: useFetch](#7-mini-project-usefetch)

---

## 1. useState — Menyimpan State dengan Aman

### Konsep

`useState` itu kayak **papan tulis** di dalam component. Setiap component punya papan tulisnya sendiri, dan setiap kali kamu ngehapus/nulis ulang (setState), React otomatis gambar ulang (re-render) tampilan-nya.

Yang bikin TypeScript lebih unggul di sini: TypeScript bisa tahu apa yang boleh ditulis di papan itu. Kalau papan-nya untuk angka, kamu tidak bisa nulis string.

---

### 1.1 Primitive Types — TypeScript Bisa Inferensi Sendiri

```tsx
import { useState } from "react";

function Counter() {
  // TypeScript otomatis tahu ini number dari nilai awal 0
  const [count, setCount] = useState(0);
  //     ─────  ──────────
  //     number  Dispatch<SetStateAction<number>>

  // TypeScript otomatis tahu ini string
  const [name, setName] = useState("Budi");

  // TypeScript otomatis tahu ini boolean
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount((prev) => prev - 1)}>-</button>
      {/* ❌ Error — tidak bisa set string ke state number */}
      {/* <button onClick={() => setCount("banyak")}>Error</button> */}
    </div>
  );
}
```

> **Aturan praktis:** Kalau nilai awal cukup jelas tipenya (0, "teks", false), biarkan TypeScript inferensi sendiri. Tidak perlu nulis `useState<number>(0)` — verbose tanpa manfaat.

---

### 1.2 Kapan Perlu Explicit Type Generic

```tsx
// Kasus 1: Nilai awal null atau undefined — TypeScript perlu hint
// ❌ Tanpa generic — TypeScript inferensi jadi null, tidak berguna
const [user, setUser] = useState(null);
// Sekarang TypeScript tahu user hanya bisa null, tidak bisa di-set User

// ✅ Dengan generic — bilang ke TS bahwa state ini bisa null atau User
interface User {
  id: number;
  name: string;
  email: string;
}

const [user, setUser] = useState<User | null>(null);
// Sekarang OK:
setUser({ id: 1, name: "Budi", email: "budi@example.com" });
setUser(null); // reset ke null saat logout
```

```tsx
// Kasus 2: Array kosong — TypeScript tidak tahu isi array-nya
// ❌ TypeScript inferensi sebagai never[] — tidak bisa di-push apa-apa
const [items, setItems] = useState([]);
setItems(["apel"]); // Error: Type 'string' is not assignable to type 'never'

// ✅ Dengan generic
const [items, setItems] = useState<string[]>([]);
setItems(["apel", "mangga"]); // OK

// Atau array of object
interface Product {
  id: number;
  name: string;
  price: number;
}

const [products, setProducts] = useState<Product[]>([]);
setProducts([{ id: 1, name: "Laptop", price: 15000000 }]); // OK
```

---

### 1.3 State dengan Object

```tsx
interface FormData {
  username: string;
  email: string;
  password: string;
  rememberMe: boolean;
}

function LoginForm() {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    rememberMe: false,
  });

  // ✅ Update satu field tanpa kehilangan yang lain
  const handleChange = (field: keyof FormData, value: string | boolean): void => {
    setFormData((prev) => ({
      ...prev,        // spread semua field yang ada
      [field]: value, // override hanya field ini
    }));
  };

  // keyof FormData = "username" | "email" | "password" | "rememberMe"
  // TypeScript akan error kalau kamu salah ketik nama field-nya
  handleChange("username", "budi123");   // ✅
  handleChange("rememberMe", true);      // ✅
  handleChange("namaGalat", "salah");    // ❌ Error: Argument '"namaGalat"' is not assignable

  return (
    <form>
      <input
        value={formData.username}
        onChange={(e) => handleChange("username", e.target.value)}
        placeholder="Username"
      />
      <input
        value={formData.email}
        onChange={(e) => handleChange("email", e.target.value)}
        placeholder="Email"
      />
      <label>
        <input
          type="checkbox"
          checked={formData.rememberMe}
          onChange={(e) => handleChange("rememberMe", e.target.checked)}
        />
        Ingat saya
      </label>
    </form>
  );
}
```

---

### 1.4 State dengan Union Type (Enum-like Pattern)

```tsx
// Status yang bisa berubah secara bertahap
type LoadingState = "idle" | "loading" | "success" | "error";

interface FetchState<T> {
  status: LoadingState;
  data: T | null;
  error: string | null;
}

function DataPage() {
  const [state, setState] = useState<FetchState<string[]>>({
    status: "idle",
    data: null,
    error: null,
  });

  const fetchData = async (): Promise<void> => {
    setState((prev) => ({ ...prev, status: "loading", error: null }));

    try {
      const response = await fetch("/api/items");
      const data: string[] = await response.json();
      setState({ status: "success", data, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setState({ status: "error", data: null, error: message });
    }
  };

  // Render berdasarkan status
  if (state.status === "loading") return <p>Loading...</p>;
  if (state.status === "error")   return <p>Error: {state.error}</p>;
  if (state.status === "success") return <ul>{state.data?.map((item) => <li key={item}>{item}</li>)}</ul>;
  return <button onClick={fetchData}>Muat Data</button>;
}
```

---

## 2. useEffect — Side Effect & Dependency Array

### Konsep

`useEffect` itu kayak kamu bilang ke React: _"Hei, setelah render selesai, tolong jalankan ini juga."_ Biasanya untuk hal-hal yang berhubungan dengan "dunia luar" — fetch API, subscribe event, set timer, manipulasi DOM manual.

Analoginya: Kamu masak (render), baru setelah masakan matang, kamu bersih-bersih dapur (side effect).

---

### 2.1 Cara Kerja Dependency Array

```tsx
import { useState, useEffect } from "react";

function DependencyDemo() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("Budi");

  // ── Tanpa dependency array ─────────────────────────────────
  useEffect(() => {
    console.log("Jalan setiap render");
    // Dipanggil: mount, dan setiap kali count atau name berubah
    // Jarang dipakai karena terlalu sering jalan
  });

  // ── Dependency array kosong [] ────────────────────────────
  useEffect(() => {
    console.log("Jalan sekali saat mount");
    // Dipanggil: hanya sekali saat component pertama kali muncul
    // Cocok untuk: fetch data awal, setup subscription
  }, []);

  // ── Dengan dependencies tertentu ─────────────────────────
  useEffect(() => {
    console.log("Jalan saat count berubah:", count);
    // Dipanggil: saat mount, dan saat 'count' berubah nilainya
    // 'name' berubah? Tidak jalan.
  }, [count]);

  // ── Multiple dependencies ──────────────────────────────────
  useEffect(() => {
    console.log("Jalan saat count ATAU name berubah");
    // Dipanggil saat salah satu dari count atau name berubah
  }, [count, name]);

  return <div>{count} - {name}</div>;
}
```

---

### 2.2 Cleanup Function

```tsx
import { useState, useEffect } from "react";

function Timer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Kalau timer tidak jalan, tidak perlu setup interval
    if (!isRunning) return;

    // Setup interval
    const intervalId = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    // ✅ Cleanup — WAJIB untuk timer/subscription/listener
    // Dipanggil: saat isRunning berubah, atau saat component unmount
    return () => {
      clearInterval(intervalId);
      console.log("Interval dibersihkan");
    };
  }, [isRunning]); // Jalan ulang saat isRunning berubah

  return (
    <div>
      <p>Waktu: {seconds} detik</p>
      <button onClick={() => setIsRunning((prev) => !prev)}>
        {isRunning ? "Pause" : "Start"}
      </button>
      <button onClick={() => { setIsRunning(false); setSeconds(0); }}>
        Reset
      </button>
    </div>
  );
}
```

---

### 2.3 Fetch Data di useEffect

```tsx
import { useState, useEffect } from "react";

interface Post {
  id: number;
  title: string;
  body: string;
}

function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ✅ Pakai AbortController untuk cleanup fetch
    const controller = new AbortController();

    const fetchPosts = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
          signal: controller.signal, // fetch bisa di-cancel
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const data: Post[] = await response.json();
        setPosts(data);
      } catch (err) {
        // Jangan set error kalau fetch di-cancel karena unmount
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();

    // Cleanup: cancel fetch kalau component unmount sebelum selesai
    return () => controller.abort();
  }, []); // Hanya fetch sekali saat mount

  if (loading) return <p>Loading posts...</p>;
  if (error)   return <p>Error: {error}</p>;

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>
          <strong>{post.title}</strong>
          <p>{post.body}</p>
        </li>
      ))}
    </ul>
  );
}
```

---

### 2.4 Fetch dengan Dynamic Parameter

```tsx
interface UserDetail {
  id: number;
  name: string;
  email: string;
  phone: string;
}

function UserDetail({ userId }: { userId: number }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Tidak fetch kalau userId tidak valid
    if (!userId) return;

    const controller = new AbortController();

    const fetchUser = async (): Promise<void> => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://jsonplaceholder.typicode.com/users/${userId}`,
          { signal: controller.signal }
        );
        const data: UserDetail = await res.json();
        setUser(data);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    return () => controller.abort();
  }, [userId]); // ← Fetch ulang setiap userId berubah

  if (loading) return <p>Loading user {userId}...</p>;
  if (!user)   return <p>User tidak ditemukan.</p>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>{user.phone}</p>
    </div>
  );
}
```

---

### Jebakan useEffect yang Umum (Ringkasan)

| Jebakan | Efek | Fix |
|---|---|---|
| Lupa cleanup timer/listener | Memory leak, bug aneh | Selalu return cleanup function |
| Lupa `userId` di deps saat fetch by ID | Data stale, tampil user yang salah | Masukkan semua variabel yang dipakai ke deps |
| Async function langsung di useEffect | Warning di console | Buat fungsi async di dalam, panggil dari sana |
| Objek/array sebagai dependency | Loop tak terbatas | Gunakan primitive, atau `useRef`, atau `useMemo` |

---

## 3. useRef — Pegang DOM & Nilai Persisten

### Konsep

`useRef` punya dua kegunaan utama yang berbeda tapi pakai hook yang sama:

1. **Pegang referensi DOM** — kayak `document.getElementById` tapi versi React
2. **Simpan nilai yang tidak trigger re-render** — kayak variabel "tersembunyi" di dalam component

Analoginya: `useRef` itu layanan titip barang. Kamu bisa simpan sesuatu di sana, ambil kapanpun, dan React tidak akan "terkejut" (re-render) hanya karena barang titipan berubah.

---

### 3.1 useRef untuk DOM Element

```tsx
import { useRef, useEffect } from "react";

// Typing: useRef<TipeElement>(nilaiAwal)
// Untuk DOM element, nilai awal selalu null

function AutoFocusInput() {
  // ✅ Type: HTMLInputElement — sesuai dengan elemen yang akan dipegang
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // inputRef.current bisa null sebelum component mount
    // Pakai optional chaining atau null check
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} placeholder="Input ini auto-focus" />;
}
```

```tsx
// Contoh lain: scroll ke element tertentu
function ScrollToSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (): void => {
    sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div>
      <button onClick={scrollToSection}>Scroll ke Bawah</button>

      <div style={{ height: "100vh" }}>Konten panjang...</div>

      <div ref={sectionRef}>
        <h2>Target Section</h2>
        <p>Kamu berhasil scroll ke sini!</p>
      </div>
    </div>
  );
}
```

---

### 3.2 Tipe HTML Element yang Umum

```tsx
// Referensi cepat untuk element types yang sering dipakai:

const inputRef     = useRef<HTMLInputElement>(null);
const textareaRef  = useRef<HTMLTextAreaElement>(null);
const selectRef    = useRef<HTMLSelectElement>(null);
const buttonRef    = useRef<HTMLButtonElement>(null);
const divRef       = useRef<HTMLDivElement>(null);
const imgRef       = useRef<HTMLImageElement>(null);
const videoRef     = useRef<HTMLVideoElement>(null);
const formRef      = useRef<HTMLFormElement>(null);
const anchorRef    = useRef<HTMLAnchorElement>(null);
```

---

### 3.3 useRef untuk Nilai Persisten (Tanpa Re-render)

```tsx
import { useState, useRef, useEffect } from "react";

// Gunakan useRef ketika kamu butuh "ingat" sesuatu
// tapi tidak ingin trigger re-render

function StopwatchWithHistory() {
  const [display, setDisplay] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // ✅ Interval ID disimpan di ref, bukan state
  // Kenapa? Karena mengubah interval ID tidak perlu re-render
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ✅ Track nilai sebelumnya
  const prevDisplayRef = useRef<number>(0);

  useEffect(() => {
    prevDisplayRef.current = display; // Update ref tanpa re-render
  });

  const start = (): void => {
    if (isRunning) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setDisplay((prev) => prev + 1);
    }, 1000);
  };

  const stop = (): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  };

  return (
    <div>
      <p>Sekarang: {display}s</p>
      <p>Sebelumnya: {prevDisplayRef.current}s</p>
      <button onClick={start} disabled={isRunning}>Start</button>
      <button onClick={stop} disabled={!isRunning}>Stop</button>
    </div>
  );
}
```

```tsx
// Pattern lain: "mounted" ref — cegah setState setelah unmount
function SafeFetch() {
  const [data, setData] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    fetch("/api/data")
      .then((res) => res.text())
      .then((text) => {
        // Hanya set state kalau component masih mounted
        if (isMountedRef.current) {
          setData(text);
        }
      });

    return () => {
      isMountedRef.current = false; // Tandai sebagai unmounted
    };
  }, []);

  return <p>{data ?? "Loading..."}</p>;
}
```

---

## 4. useCallback & useMemo — Optimasi yang Sering Disalahpakai

### Konsep

Sebelum bahas cara pakainya, kita perlu tahu dulu: **React re-render component setiap kali state atau props berubah.** Setiap re-render, semua variabel dan fungsi di dalam component dibuat ulang.

- **`useMemo`** — "Ingat hasil kalkulasi ini, jangan hitung ulang kalau inputnya tidak berubah."
- **`useCallback`** — "Ingat fungsi ini, jangan buat ulang kalau dependensinya tidak berubah."

Analogi: `useMemo` itu kayak cache hasil hitungan. `useCallback` kayak cache fungsinya itu sendiri.

---

### 4.1 useMemo — Cache Kalkulasi Berat

```tsx
import { useState, useMemo } from "react";

// ── Tanpa useMemo ─────────────────────────────────────────────
function ExpensiveListBad() {
  const [count, setCount] = useState(0);
  const [query, setQuery] = useState("");

  // ❌ Ini kalkulasi berat yang dijalankan SETIAP render
  // Bahkan saat hanya `count` yang berubah!
  const filteredItems = heavyFilter(thousandItems, query);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ul>{filteredItems.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

// ── Dengan useMemo ────────────────────────────────────────────
function ExpensiveListGood() {
  const [count, setCount] = useState(0);
  const [query, setQuery] = useState("");

  // ✅ Hanya hitung ulang kalau `query` berubah
  // Saat `count` berubah, pakai hasil cache
  const filteredItems = useMemo(
    () => heavyFilter(thousandItems, query),
    [query] // dependency: hitung ulang hanya kalau query berubah
  );

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <ul>{filteredItems.map(item => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}
```

```tsx
// Contoh typing useMemo yang lebih nyata

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

function ProductCatalog({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"asc" | "desc">("asc");

  // TypeScript otomatis inferensi return type dari callback
  const processedProducts = useMemo((): Product[] => {
    let result = [...products];

    // Filter by search
    if (search) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by category
    if (category !== "all") {
      result = result.filter((p) => p.category === category);
    }

    // Sort by price
    result.sort((a, b) =>
      sort === "asc" ? a.price - b.price : b.price - a.price
    );

    return result;
  }, [products, search, category, sort]); // Semua yang dipakai di dalam, masuk deps

  // useMemo untuk derived value: total harga
  const totalValue = useMemo(
    (): number => processedProducts.reduce((sum, p) => sum + p.price, 0),
    [processedProducts]
  );

  return (
    <div>
      <p>Total nilai: Rp{totalValue.toLocaleString("id-ID")}</p>
      <p>Menampilkan {processedProducts.length} produk</p>
      {/* render list... */}
    </div>
  );
}
```

---

### 4.2 useCallback — Cache Fungsi

```tsx
import { useState, useCallback, memo } from "react";

// useCallback paling berguna saat fungsi dikirim sebagai props
// ke component yang di-wrap React.memo

// Contoh: Child component yang di-memo
const TodoItem = memo(function TodoItem({
  id,
  text,
  completed,
  onToggle,
  onDelete,
}: {
  id: number;
  text: string;
  completed: boolean;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  console.log(`Render TodoItem ${id}`);
  return (
    <li>
      <input
        type="checkbox"
        checked={completed}
        onChange={() => onToggle(id)}
      />
      <span style={{ textDecoration: completed ? "line-through" : "none" }}>
        {text}
      </span>
      <button onClick={() => onDelete(id)}>×</button>
    </li>
  );
});

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: "Belajar TypeScript", completed: false },
    { id: 2, text: "Belajar React Hooks", completed: false },
  ]);
  const [filter, setFilter] = useState("all");

  // ✅ useCallback — fungsi ini tidak dibuat ulang setiap render
  // TodoItem yang pakai fungsi ini tidak akan re-render sia-sia
  const handleToggle = useCallback((id: number): void => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }, []); // [] karena tidak bergantung pada state/props dari luar

  const handleDelete = useCallback((id: number): void => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }, []);

  // Filter diproses dengan useMemo
  const filteredTodos = useMemo(() => {
    if (filter === "active")    return todos.filter((t) => !t.completed);
    if (filter === "completed") return todos.filter((t) => t.completed);
    return todos;
  }, [todos, filter]);

  return (
    <div>
      <div>
        <button onClick={() => setFilter("all")}>All</button>
        <button onClick={() => setFilter("active")}>Active</button>
        <button onClick={() => setFilter("completed")}>Completed</button>
      </div>
      <ul>
        {filteredTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            {...todo}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    </div>
  );
}
```

---

### Kapan Pakai, Kapan Tidak Perlu?

> **Ini bagian terpenting dari section ini. Baca pelan-pelan.**

```
Perlu useMemo / useCallback ketika:
✅ Kalkulasi benar-benar berat (filter ribuan item, sorting kompleks)
✅ Fungsi dikirim ke child component yang di-wrap React.memo
✅ Nilai dipakai sebagai dependency di useEffect lain
✅ Hasil dipakai di banyak tempat di component yang sama

TIDAK perlu useMemo / useCallback ketika:
❌ Kalkulasi simpel (tambah dua angka, string concatenation)
❌ Component tidak di-wrap React.memo
❌ Component hanya render beberapa elemen simpel
❌ "Karena sepertinya lebih cepat" tanpa profiling
```

```tsx
// ❌ Over-optimization — ini justru lebih lambat karena overhead useCallback
function SimpleButton({ label }: { label: string }) {
  // Ini sia-sia — component ini tidak di-memo,
  // dan fungsi ini tidak dipakai di dependency mana-mana
  const handleClick = useCallback(() => {
    console.log("klik");
  }, []);

  return <button onClick={handleClick}>{label}</button>;
}

// ✅ Cukup begini
function SimpleButtonBetter({ label }: { label: string }) {
  const handleClick = () => {
    console.log("klik");
  };

  return <button onClick={handleClick}>{label}</button>;
}
```

> **Saran senior dev:** Jangan optimasi dulu sebelum ada masalah performa nyata. Tulis kode yang bersih, ukur dengan React DevTools Profiler, baru optimasi kalau ada bottleneck yang terbukti. Premature optimization is the root of all evil.

---

## 5. Custom Hook — Bikin Hook Sendiri

### Konsep

Custom hook itu cara kita **mengemas logika** yang bisa dipakai ulang di banyak component. Naming convention: selalu mulai dengan kata `use`.

Analoginya: Custom hook itu kayak bikin **alat dapur sendiri**. Daripada tiap masak kamu potong bawang dengan cara yang sama berulang-ulang, kamu beli food processor sekali. Semua orang di dapur bisa pakai.

---

### 5.1 Hook Sederhana: useToggle

```tsx
import { useState, useCallback } from "react";

// Custom hook — naming harus mulai dengan "use"
function useToggle(initialValue: boolean = false): [boolean, () => void, (val: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  // Toggle: balik nilai boolean
  const toggle = useCallback((): void => {
    setValue((prev) => !prev);
  }, []);

  // Set langsung ke nilai tertentu
  const setTo = useCallback((val: boolean): void => {
    setValue(val);
  }, []);

  // Return sebagai tuple agar pemakainya bisa rename
  return [value, toggle, setTo];
}

// Pemakaian
function Modal() {
  const [isOpen, toggleModal, setModal] = useToggle(false);

  return (
    <div>
      <button onClick={toggleModal}>
        {isOpen ? "Tutup" : "Buka"} Modal
      </button>
      <button onClick={() => setModal(false)}>Force Close</button>

      {isOpen && (
        <div className="modal">
          <p>Isi modal di sini</p>
        </div>
      )}
    </div>
  );
}
```

---

### 5.2 Hook yang Return Object: useLocalStorage

```tsx
import { useState, useCallback } from "react";

// Return type sebagai object — lebih fleksibel untuk dikembangkan
interface UseLocalStorageReturn<T> {
  value: T;
  setValue: (newValue: T | ((prev: T) => T)) => void;
  removeValue: () => void;
}

function useLocalStorage<T>(key: string, initialValue: T): UseLocalStorageReturn<T> {
  // Inisialisasi dari localStorage atau pakai initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)): void => {
      try {
        // Support functional update seperti setState
        const valueToStore =
          typeof newValue === "function"
            ? (newValue as (prev: T) => T)(storedValue)
            : newValue;

        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (err) {
        console.error(`useLocalStorage error for key "${key}":`, err);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback((): void => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (err) {
      console.error(`useLocalStorage removeValue error for key "${key}":`, err);
    }
  }, [key, initialValue]);

  return { value: storedValue, setValue, removeValue };
}

// Pemakaian — TypeScript inferensi tipe dari initialValue
function ThemeSwitcher() {
  const {
    value: theme,
    setValue: setTheme,
  } = useLocalStorage<"light" | "dark">("theme", "light");

  return (
    <button onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}>
      Mode: {theme}
    </button>
  );
}

function UserPreferences() {
  interface Prefs { fontSize: number; language: string }

  const { value: prefs, setValue: setPrefs } = useLocalStorage<Prefs>(
    "user-prefs",
    { fontSize: 16, language: "id" }
  );

  return (
    <div>
      <p>Font size: {prefs.fontSize}px</p>
      <button onClick={() => setPrefs((prev) => ({ ...prev, fontSize: prev.fontSize + 2 }))}>
        A+
      </button>
    </div>
  );
}
```

---

### 5.3 Hook dengan useEffect: useDebounce

```tsx
import { useState, useEffect } from "react";

// Debounce — tunda eksekusi sampai user berhenti mengetik
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set timer — update debouncedValue setelah `delay` ms
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: reset timer kalau `value` berubah sebelum delay habis
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Pemakaian: search yang tidak spam API setiap ketukan keyboard
function SearchBox() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400); // Tunggu 400ms setelah berhenti ketik

  useEffect(() => {
    if (!debouncedQuery) return;
    console.log("Search API dipanggil:", debouncedQuery);
    // fetch(`/api/search?q=${debouncedQuery}`)
  }, [debouncedQuery]); // Hanya jalan kalau debouncedQuery berubah

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Cari..."
    />
  );
}
```

---

## 6. Anti-Pattern yang Harus Dihindari

### ❌ Anti-Pattern #1: setState langsung dari nilai lama tanpa functional update

```tsx
function Counter() {
  const [count, setCount] = useState(0);

  // ❌ Berbahaya! Masalah saat multiple setState dalam satu event
  const incrementThrice = (): void => {
    setCount(count + 1); // count masih 0
    setCount(count + 1); // count masih 0 (bukan 1!)
    setCount(count + 1); // count masih 0 — hasil akhir: 1, bukan 3!
  };

  // ✅ Pakai functional update — selalu dapat nilai terbaru
  const incrementThriceCorrect = (): void => {
    setCount((prev) => prev + 1); // 0 → 1
    setCount((prev) => prev + 1); // 1 → 2
    setCount((prev) => prev + 1); // 2 → 3 — hasil akhir: 3 ✓
  };

  return <button onClick={incrementThriceCorrect}>{count}</button>;
}
```

---

### ❌ Anti-Pattern #2: useEffect tanpa cleanup untuk subscription/listener

```tsx
// ❌ Memory leak! Event listener terus numpuk setiap re-render
function WindowSizeBad() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handleResize = (): void => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    // ❌ Tidak ada return cleanup! Tiap render, listener baru ditambah
  }, []);

  return <p>{size.width} x {size.height}</p>;
}

// ✅ Selalu cleanup
function WindowSizeGood() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = (): void => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);

    // ✅ Cleanup — remove listener saat component unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return <p>{size.width} x {size.height}</p>;
}
```

---

### ❌ Anti-Pattern #3: Object/array sebagai useEffect dependency

```tsx
function UserProfile({ userId }: { userId: number }) {
  // ❌ Object dibuat ulang setiap render → object berbeda di setiap render
  // → useEffect jalan terus = infinite loop!
  const options = { method: "GET", timeout: 3000 }; // Objek baru setiap render

  useEffect(() => {
    console.log("Fetch dipanggil untuk user:", userId);
    // fetch dengan options...
  }, [userId, options]); // ❌ options selalu "berubah"

  // ✅ Fix 1: Pindah definisi ke dalam useEffect
  useEffect(() => {
    const options = { method: "GET", timeout: 3000 }; // Tidak jadi dependency
    // fetch...
  }, [userId]);

  // ✅ Fix 2: Pakai useMemo kalau benar-benar perlu
  const memoOptions = useMemo(
    () => ({ method: "GET", timeout: 3000 }),
    [] // Hanya dibuat sekali
  );

  useEffect(() => {
    // fetch dengan memoOptions...
  }, [userId, memoOptions]);

  return <div>User {userId}</div>;
}
```

---

### ❌ Anti-Pattern #4: Async function langsung di useEffect

```tsx
// ❌ Ini bikin warning: "Effect callbacks are synchronous to prevent race conditions"
useEffect(async () => {
  const data = await fetchData(); // Warning!
  setData(data);
}, []);

// ✅ Fix: Definisikan async function di dalam, panggil dari sana
useEffect(() => {
  const loadData = async (): Promise<void> => {
    const data = await fetchData();
    setData(data);
  };

  loadData(); // Panggil tanpa await
}, []);

// ✅ Fix alternatif: IIFE (Immediately Invoked Function Expression)
useEffect(() => {
  (async () => {
    const data = await fetchData();
    setData(data);
  })();
}, []);
```

---

### ❌ Anti-Pattern #5: Menyimpan computed value di state

```tsx
// ❌ Derived state yang tidak perlu — redundant dan rawan tidak sinkron
function Cart() {
  const [items, setItems] = useState<{ price: number; qty: number }[]>([]);
  const [total, setTotal] = useState(0); // ❌ ini derived dari items!

  const addItem = (item: { price: number; qty: number }): void => {
    const newItems = [...items, item];
    setItems(newItems);
    // Harus ingat update total juga — rawan lupa!
    setTotal(newItems.reduce((sum, i) => sum + i.price * i.qty, 0));
  };

  // ✅ Computed value tidak perlu disimpan di state
  // Hitung langsung saat render — simpel dan selalu sinkron
  const total2 = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  // Kalau kalkulasinya berat, bungkus dengan useMemo
  const totalMemo = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  return <p>Total: {total2}</p>;
}
```

---

## 7. Mini Project: useFetch

Hook generic yang fully typed untuk fetching data dari API. Ini hook yang kamu akan pakai terus-terusan di real project.

---

### Spesifikasi

- Generic `<T>` — bisa dipakai untuk tipe data apapun
- State: `data`, `loading`, `error`
- Support refetch manual
- Support `AbortController` untuk cleanup
- Handle berbagai error case
- Support custom fetch options (headers, method, body)

---

### Step 1: Types

```ts
// src/hooks/useFetch.types.ts

export type FetchStatus = "idle" | "loading" | "success" | "error";

export interface FetchState<T> {
  data: T | null;
  status: FetchStatus;
  error: FetchError | null;
}

export interface FetchError {
  message: string;
  statusCode?: number;
  originalError?: unknown;
}

export interface UseFetchOptions extends Omit<RequestInit, "signal"> {
  // Apakah langsung fetch saat hook dipanggil, atau tunggu trigger manual
  immediate?: boolean;
}

export interface UseFetchReturn<T> extends FetchState<T> {
  // Derived boolean states — convenience shorthand
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;

  // Trigger fetch atau refetch
  execute: () => Promise<void>;
  // Reset ke state awal
  reset: () => void;
}
```

---

### Step 2: Implementasi Hook

```ts
// src/hooks/useFetch.ts

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FetchState,
  FetchError,
  UseFetchOptions,
  UseFetchReturn,
} from "./useFetch.types";

const INITIAL_STATE = <T>(): FetchState<T> => ({
  data: null,
  status: "idle",
  error: null,
});

function useFetch<T>(url: string, options: UseFetchOptions = {}): UseFetchReturn<T> {
  const { immediate = true, ...fetchOptions } = options;

  const [state, setState] = useState<FetchState<T>>(INITIAL_STATE<T>);

  // Ref untuk AbortController agar bisa di-cancel
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ref untuk track apakah component masih mounted
  const isMountedRef = useRef(true);

  // Fungsi fetch utama — dibungkus useCallback agar stabil
  const execute = useCallback(async (): Promise<void> => {
    // Cancel request sebelumnya kalau ada
    abortControllerRef.current?.abort();

    // Buat AbortController baru untuk request ini
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Set status loading
    setState((prev) => ({
      ...prev,
      status: "loading",
      error: null,
    }));

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      // Handle HTTP error (4xx, 5xx)
      if (!response.ok) {
        const fetchError: FetchError = {
          message: `Fetch failed with status ${response.status}: ${response.statusText}`,
          statusCode: response.status,
        };
        throw fetchError;
      }

      // Parse JSON response
      const data: T = await response.json();

      // Hanya update state kalau component masih mounted
      if (isMountedRef.current) {
        setState({
          data,
          status: "success",
          error: null,
        });
      }
    } catch (err: unknown) {
      // Jangan update state kalau request di-cancel (component unmount)
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }

      if (!isMountedRef.current) return;

      // Normalize semua jenis error ke FetchError
      let fetchError: FetchError;

      if (isFetchError(err)) {
        fetchError = err;
      } else if (err instanceof Error) {
        fetchError = {
          message: err.message,
          originalError: err,
        };
      } else {
        fetchError = {
          message: "Terjadi kesalahan yang tidak diketahui.",
          originalError: err,
        };
      }

      setState({
        data: null,
        status: "error",
        error: fetchError,
      });
    }
  }, [url, JSON.stringify(fetchOptions)]); // eslint-disable-line

  // Reset ke initial state
  const reset = useCallback((): void => {
    abortControllerRef.current?.abort();
    setState(INITIAL_STATE<T>());
  }, []);

  // Auto-fetch saat mount kalau `immediate` true
  useEffect(() => {
    isMountedRef.current = true;

    if (immediate) {
      execute();
    }

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [execute, immediate]);

  // Derived booleans — convenience
  const isIdle    = state.status === "idle";
  const isLoading = state.status === "loading";
  const isSuccess = state.status === "success";
  const isError   = state.status === "error";

  return {
    ...state,
    isIdle,
    isLoading,
    isSuccess,
    isError,
    execute,
    reset,
  };
}

// Type guard untuk FetchError
function isFetchError(err: unknown): err is FetchError {
  return (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as FetchError).message === "string"
  );
}

export default useFetch;
```

---

### Step 3: Menggunakan useFetch

```tsx
// src/components/PostList.tsx

import useFetch from "../hooks/useFetch";

interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

function PostList() {
  // TypeScript tahu bahwa data adalah Post[] | null
  const {
    data: posts,
    isLoading,
    isError,
    isSuccess,
    error,
    execute: refetch,
  } = useFetch<Post[]>("https://jsonplaceholder.typicode.com/posts");

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <h1>Daftar Post</h1>
        <button onClick={refetch} disabled={isLoading}>
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {isLoading && <p>Memuat posts...</p>}

      {isError && (
        <div style={{ color: "red" }}>
          <p>Gagal memuat: {error?.message}</p>
          {error?.statusCode && <p>Status: {error.statusCode}</p>}
          <button onClick={refetch}>Coba Lagi</button>
        </div>
      )}

      {isSuccess && posts && (
        <ul>
          {posts.slice(0, 10).map((post) => (
            <li key={post.id}>
              <strong>{post.title}</strong>
              <p>{post.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PostList;
```

---

### Step 4: useFetch dengan Parameter Dinamis

```tsx
// src/components/UserSearch.tsx

import { useState } from "react";
import useFetch from "../hooks/useFetch";

interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  address: {
    city: string;
  };
}

function UserSearch() {
  const [userId, setUserId] = useState<number>(1);

  // Fetch berubah setiap userId berubah (karena URL berubah)
  const { data: user, isLoading, isError, error } = useFetch<User>(
    `https://jsonplaceholder.typicode.com/users/${userId}`
  );

  return (
    <div>
      <div>
        <label>User ID (1–10): </label>
        <input
          type="number"
          min={1}
          max={10}
          value={userId}
          onChange={(e) => setUserId(Number(e.target.value))}
        />
      </div>

      {isLoading && <p>Mencari user {userId}...</p>}
      {isError && <p style={{ color: "red" }}>{error?.message}</p>}

      {user && !isLoading && (
        <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ddd" }}>
          <h2>{user.name}</h2>
          <p>@{user.username}</p>
          <p>{user.email}</p>
          <p>📍 {user.address.city}</p>
        </div>
      )}
    </div>
  );
}

export default UserSearch;
```

---

### Step 5: useFetch untuk POST (Manual Trigger)

```tsx
// src/components/CreatePost.tsx

import { useState, FormEvent } from "react";
import useFetch from "../hooks/useFetch";

interface NewPost {
  title: string;
  body: string;
  userId: number;
}

interface CreatedPost extends NewPost {
  id: number;
}

function CreatePost() {
  const [formData, setFormData] = useState<NewPost>({
    title: "",
    body: "",
    userId: 1,
  });

  // immediate: false → tidak auto-fetch, tunggu dipanggil manual
  const { data, isLoading, isSuccess, isError, error, execute } =
    useFetch<CreatedPost>("https://jsonplaceholder.typicode.com/posts", {
      immediate: false,   // ← Kunci: tidak langsung fetch
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await execute(); // Trigger fetch secara manual
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Buat Post Baru</h2>

      <div>
        <label>Title</label>
        <input
          value={formData.title}
          onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div>
        <label>Body</label>
        <textarea
          value={formData.body}
          onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
          required
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Menyimpan..." : "Simpan Post"}
      </button>

      {isSuccess && data && (
        <div style={{ color: "green", marginTop: "1rem" }}>
          <p>✅ Post berhasil dibuat! ID: {data.id}</p>
          <p>Judul: {data.title}</p>
        </div>
      )}

      {isError && (
        <p style={{ color: "red" }}>
          ❌ Gagal: {error?.message}
        </p>
      )}
    </form>
  );
}

export default CreatePost;
```

---

### Rekap: Konsep yang Dipakai di useFetch

| Konsep | Implementasi |
|---|---|
| **Generic type `<T>`** | `useFetch<T>`, `FetchState<T>`, `UseFetchReturn<T>` |
| **useState dengan object** | `FetchState<T>` sebagai satu state |
| **useEffect dengan cleanup** | `AbortController.abort()` + `isMountedRef` |
| **useCallback** | `execute` dan `reset` agar referensi stabil |
| **useRef** | `abortControllerRef`, `isMountedRef` |
| **Union type** | `FetchStatus = "idle" \| "loading" \| "success" \| "error"` |
| **Type guard** | `isFetchError(err)` — narrowing dari `unknown` ke `FetchError` |
| **Interface extend** | `UseFetchOptions extends Omit<RequestInit, "signal">` |
| **Omit utility type** | `Omit<RequestInit, "signal">` — exclude signal dari options |

---

## Penutup

Kamu sudah cover semua hooks yang paling sering dipakai di aplikasi React production:

| Hook | Dipakai untuk |
|---|---|
| `useState` | State lokal — primitive, object, array, union |
| `useEffect` | Side effects — fetch, event listener, timer |
| `useRef` | DOM reference, nilai persisten tanpa re-render |
| `useCallback` | Cache fungsi untuk child component bermemo |
| `useMemo` | Cache hasil kalkulasi berat |
| Custom Hook | Enkapsulasi logika yang reusable antar component |

**Langkah selanjutnya:**

1. **useContext + TypeScript** — State global tanpa Redux
2. **useReducer** — State management yang lebih terstruktur untuk state kompleks
3. **React Query / SWR** — Library data fetching yang lebih powerful dari `useFetch` buatan sendiri
4. **Zustand + TypeScript** — State management ringan tapi powerful

> **Pesan dari senior dev:** Sekarang kamu sudah punya `useFetch` sendiri. Tapi di real project, coba pakai React Query atau SWR — mereka sudah handle caching, deduplication, background refetch, dan banyak edge case yang `useFetch` buatan kita belum cover. Membangun dari scratch itu bagus untuk belajar, tapi jangan reinvent the wheel di production.

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+*
