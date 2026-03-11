# State Management di React dengan TypeScript

> **Prerequisite:** Sudah baca [03_react-hooks-typescript.md](./03_react-hooks-typescript.md) — terutama bagian `useState` dan `useEffect`.

---

## Daftar Isi

1. [Local State vs Global State — Kapan Butuh yang Mana?](#1-local-state-vs-global-state--kapan-butuh-yang-mana)
2. [Context API — Global State Bawaan React](#2-context-api--global-state-bawaan-react)
3. [Masalah Context API & Kapan Harus Pindah Library](#3-masalah-context-api--kapan-harus-pindah-library)
4. [Zustand — State Management yang Tidak Bikin Pusing](#4-zustand--state-management-yang-tidak-bikin-pusing)
5. [Context API vs Zustand — Perbandingan Jujur](#5-context-api-vs-zustand--perbandingan-jujur)
6. [Mini Project: Shopping Cart dengan Zustand](#6-mini-project-shopping-cart-dengan-zustand)

---

## 1. Local State vs Global State — Kapan Butuh yang Mana?

### Analogi Dulu

Bayangin sebuah rumah (aplikasi). Di rumah ada beberapa ruangan (component):

- **Local state** itu kayak barang yang ada di dalam satu kamar. Remote TV di kamar tidur — hanya orang di kamar itu yang bisa pakai, dan orang lain tidak perlu tahu.
- **Global state** itu kayak Wi-Fi router. Seluruh rumah butuh akses, jadi tidak masuk akal kalau diletakkan di dalm satu kamar saja.

---

### Decision Tree: State di Mana?

```
Pertanyaan: "State ini dibutuhkan oleh siapa?"
│
├── Hanya component ini sendiri
│   → local state (useState)
│   Contoh: isDropdownOpen, inputValue, activeTab
│
├── Component ini + beberapa child langsung
│   → Lift state up ke parent, kirim via props
│   Contoh: form data di antara beberapa input dalam satu form
│
├── Banyak component yang tidak berkaitan / jauh secara tree
│   → Global state (Context API atau library)
│   Contoh: user yang login, tema, bahasa, cart items
│
└── Data dari server (API response, cache, sync)
    → React Query / SWR (bukan state biasa)
    Contoh: daftar produk, detail artikel, user profile dari API
```

---

### Contoh Nyata: Apa yang Biasanya Global?

```
✅ Global state yang umum:
- Data user yang sedang login (auth)
- Tema aplikasi (dark/light mode)
- Bahasa / locale
- Shopping cart
- Notifikasi / toast
- Sidebar buka/tutup (kalau state-nya dipakai di banyak tempat)

❌ Jangan dijadiin global state:
- Input value dari sebuah form
- isDropdownOpen di satu tombol
- activeTab di satu komponen tab
- Loading state dari satu request
```

---

## 2. Context API — Global State Bawaan React

### Konsep

Context API itu cara React untuk "broadcast" data ke semua component di bawah Provider — tanpa harus kirim lewat props satu per satu (prop drilling).

Analoginya: Context itu kayak **pengumuman lewat speaker di kantor**. Semua orang yang ada di kantor langsung dengar, tidak perlu bisik-bisik dari satu orang ke orang lain.

---

### 2.1 Masalah Prop Drilling (Yang Context Selesaikan)

```tsx
// ❌ Prop drilling — username harus dioper dari atas ke bawah
function App() {
  const [username, setUsername] = useState("Budi");
  return <Dashboard username={username} />;
}

function Dashboard({ username }: { username: string }) {
  // Dashboard sendiri tidak butuh username, tapi harus oper ke bawah
  return <Sidebar username={username} />;
}

function Sidebar({ username }: { username: string }) {
  // Sidebar juga tidak butuh, tapi harus oper lagi
  return <UserAvatar username={username} />;
}

function UserAvatar({ username }: { username: string }) {
  // Barulah di sini username dipakai
  return <img alt={username} src={`/avatars/${username}.png`} />;
}

// Bayangkan kalau layering-nya 10 level... menyiksa.
```

```tsx
// ✅ Dengan Context — UserAvatar langsung ambil dari context
function UserAvatar() {
  const { username } = useUserContext(); // Langsung ambil!
  return <img alt={username} src={`/avatars/${username}.png`} />;
}

// Dashboard dan Sidebar tidak perlu tahu tentang username sama sekali
```

---

### 2.2 Full Flow Context API dengan TypeScript

Ini template yang bisa kamu copy-paste dan modifikasi. Ada 4 langkah: **define types → create context → buat Provider → pakai di component**.

#### Step 1: Define Types

```tsx
// src/context/AuthContext.tsx

// Tipe untuk data user
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
  avatarUrl?: string;
}

// Tipe untuk nilai yang akan ada di dalam context
interface AuthContextValue {
  // State
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Pick<User, "name" | "avatarUrl">>) => void;
}
```

---

#### Step 2: Buat Context

```tsx
// Lanjutan src/context/AuthContext.tsx

import { createContext, useContext, useState, ReactNode } from "react";

// ✅ Pola terbaik: inisialisasi dengan undefined, buat custom hook yang guard
// Jangan pakai null atau {} sebagai nilai awal — TypeScript jadi susah
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Custom hook — ini yang akan dipakai oleh component
// Keuntungan: TypeScript tahu persis tipe yang dikembalikan, tidak perlu optional chaining
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  // Guard: throw error kalau hook dipakai di luar Provider
  if (context === undefined) {
    throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  }

  return context;
}
```

---

#### Step 3: Buat Provider

```tsx
// Lanjutan src/context/AuthContext.tsx

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Derived state — tidak perlu disimpan terpisah
  const isLoggedIn = user !== null;

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulasi API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Dalam real app: const response = await fetch("/api/login", { ... })
      const mockUser: User = {
        id: 1,
        name: "Budi Santoso",
        email,
        role: "user",
      };

      setUser(mockUser);
    } catch (err) {
      console.error("Login gagal:", err);
      throw err; // Re-throw agar component bisa handle error-nya
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    // Dalam real app: clear token dari localStorage, redirect, dll.
  };

  const updateProfile = (
    updates: Partial<Pick<User, "name" | "avatarUrl">>
  ): void => {
    setUser((prev) => {
      if (!prev) return prev; // Tidak ada user = tidak ada yang di-update
      return { ...prev, ...updates };
    });
  };

  // Nilai yang di-provide ke seluruh tree
  const value: AuthContextValue = {
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

---

#### Step 4: Pasang Provider & Pakai di Component

```tsx
// src/main.tsx — Pasang Provider di root
import { AuthProvider } from "./context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

```tsx
// src/components/Navbar.tsx — Pakai di mana saja di dalam tree
import { useAuth } from "../context/AuthContext";
import { FormEvent, useState } from "react";

function Navbar() {
  const { user, isLoggedIn, logout } = useAuth();

  return (
    <nav>
      <span>MyApp</span>
      {isLoggedIn ? (
        <div>
          <span>Halo, {user?.name}!</span> {/* user bisa null → pakai ?. */}
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <span>Silakan login</span>
      )}
    </nav>
  );
}

// src/components/LoginForm.tsx
function LoginForm() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch {
      setError("Email atau password salah.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Loading..." : "Login"}
      </button>
    </form>
  );
}
```

---

### 2.3 Multiple Context — Pisahkan Concern

```tsx
// ✅ Jangan taruh semua state di satu context
// Pisahkan berdasarkan domain agar tidak ada re-render berlebihan

// AuthContext — hanya auth state
// ThemeContext — hanya theme
// CartContext — hanya cart

// src/main.tsx
<AuthProvider>
  <ThemeProvider>
    <CartProvider>
      <App />
    </CartProvider>
  </ThemeProvider>
</AuthProvider>
```

---

## 3. Masalah Context API & Kapan Harus Pindah Library

### Masalah Utama: Re-render yang Tidak Perlu

Ini jebakan paling umum. Setiap kali **nilai context berubah** (apapun yang berubah), **semua component yang subscribe** ke context itu akan re-render — bahkan kalau mereka tidak pakai bagian yang berubah.

```tsx
// ❌ Context dengan banyak state — masalah re-render
interface AppContextValue {
  user: User | null;         // berubah saat login/logout
  cart: CartItem[];          // berubah saat tambah/hapus item
  theme: "light" | "dark";  // berubah saat ganti tema
  notifications: string[];  // berubah setiap notifikasi baru
}

// Component yang hanya butuh theme,
// akan re-render setiap cart berubah. Tidak efisien!
function ThemeButton() {
  const { theme } = useAppContext(); // Subscribe ke seluruh context
  // Re-render walaupun hanya cart yang berubah → sia-sia
  return <button>{theme}</button>;
}
```

```
Visualisasi masalah re-render:

Context.Provider (value berubah karena cart berubah)
├── Navbar (pakai user) ← RE-RENDER padahal user tidak berubah!
├── ThemeButton (pakai theme) ← RE-RENDER padahal theme tidak berubah!
├── CartIcon (pakai cart) ← re-render, ini memang perlu
└── NotifBell (pakai notifications) ← RE-RENDER padahal notif tidak berubah!
```

---

### Workaround Context: Split Context

```tsx
// ✅ Pisahkan ke beberapa context agar re-render lebih terkontrol

// Hanya component yang butuh cart yang akan re-render saat cart berubah
const CartContext = createContext<CartContextValue | undefined>(undefined);
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
```

Ini membantu, tapi menambah boilerplate. Dan kalau satu context masih punya state yang sering berubah bersamaan, masalah re-render tetap ada.

---

### Kapan Pindah ke Library?

```
Tetap pakai Context API kalau:
✅ State jarang berubah (tema, bahasa, user login)
✅ Aplikasi kecil-menengah, tidak banyak interaksi bersamaan
✅ Jumlah subscriber sedikit
✅ Tidak ada update dengan frekuensi tinggi (bukan real-time)

Pertimbangkan library (Zustand, Jotai, Redux RTK) kalau:
⚠️ State sering berubah dengan cepat (cart, filter, search)
⚠️ Banyak component berbeda subscribe ke state yang sama
⚠️ Logic state makin kompleks (banyak action, computed state)
⚠️ Ada kebutuhan middleware (logging, persist, devtools)
⚠️ Tim besar dan butuh konvensi yang lebih strict
```

---

## 4. Zustand — State Management yang Tidak Bikin Pusing

### Kenapa Zustand?

Di antara pilihan library (Redux, Recoil, Jotai, Zustand), Zustand menang dari sisi **simpel tapi powerful**:

- Setup minimal, tidak perlu Provider di root
- Tidak perlu action creators, reducers, dispatch
- Tidak re-render component yang tidak pakai state yang berubah (selector!)
- TypeScript first class
- Bundle size kecil (~2kb)

Analoginya: Redux itu kayak birokrasi kantor lengkap — ada prosedur resmi untuk tiap hal. Zustand itu kayak startup kecil — langsung action, tidak perlu laporan bertingkat.

---

### 4.1 Instalasi

```bash
npm install zustand
```

---

### 4.2 Anatomy sebuah Zustand Store

```tsx
import { create } from "zustand";

// 1. Definisi tipe state + actions dalam satu interface
interface CounterStore {
  // ── State ──────────────────────────────────────────────────
  count: number;
  lastUpdated: Date | null;

  // ── Actions ────────────────────────────────────────────────
  increment: () => void;
  decrement: () => void;
  incrementBy: (amount: number) => void;
  reset: () => void;
}

// 2. Buat store dengan create() — tidak butuh Provider!
const useCounterStore = create<CounterStore>((set, get) => ({
  // Initial state
  count: 0,
  lastUpdated: null,

  // Actions — pakai set() untuk update state
  increment: () =>
    set((state) => ({
      count: state.count + 1,
      lastUpdated: new Date(),
    })),

  decrement: () =>
    set((state) => ({
      count: state.count - 1,
      lastUpdated: new Date(),
    })),

  incrementBy: (amount: number) =>
    set((state) => ({
      count: state.count + amount,
      lastUpdated: new Date(),
    })),

  // get() untuk baca state saat ini tanpa subscribe
  reset: () => {
    const currentCount = get().count;
    console.log(`Reset dari ${currentCount} ke 0`);
    set({ count: 0, lastUpdated: new Date() });
  },
}));
```

---

### 4.3 Menggunakan Store di Component

```tsx
// ✅ Selector — component hanya subscribe ke bagian yang dibutuhkan
// Tidak re-render kalau bagian lain berubah

function CounterDisplay() {
  // Hanya subscribe ke 'count' — tidak re-render kalau lastUpdated berubah
  const count = useCounterStore((state) => state.count);

  return <h1>Count: {count}</h1>;
}

function CounterButtons() {
  // Hanya subscribe ke actions — actions tidak pernah berubah, tidak re-render

  const increment   = useCounterStore((state) => state.increment);
  const decrement   = useCounterStore((state) => state.decrement);
  const incrementBy = useCounterStore((state) => state.incrementBy);
  const reset       = useCounterStore((state) => state.reset);

  return (
    <div>
      <button onClick={decrement}>-</button>
      <button onClick={increment}>+</button>
      <button onClick={() => incrementBy(10)}>+10</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}

function LastUpdatedLabel() {
  // Hanya subscribe ke lastUpdated
  const lastUpdated = useCounterStore((state) => state.lastUpdated);

  return (
    <p>
      Update terakhir:{" "}
      {lastUpdated ? lastUpdated.toLocaleTimeString("id-ID") : "Belum ada"}
    </p>
  );
}

// CounterDisplay tidak re-render saat tombol diklik (karena hanya count yang berubah)
// CounterButtons tidak pernah re-render (actions adalah fungsi statis)
// LastUpdatedLabel re-render setiap klik (lastUpdated berubah)
```

---

### 4.4 Store dengan Nested State

```tsx
interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: "id" | "en";
  fontSize: number;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}

interface PreferencesStore {
  preferences: UserPreferences;
  updateTheme: (theme: UserPreferences["theme"]) => void;
  updateLanguage: (lang: UserPreferences["language"]) => void;
  updateFontSize: (size: number) => void;
  toggleNotification: (channel: keyof UserPreferences["notifications"]) => void;
  resetToDefaults: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  language: "id",
  fontSize: 16,
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
};

const usePreferencesStore = create<PreferencesStore>((set) => ({
  preferences: DEFAULT_PREFERENCES,

  updateTheme: (theme) =>
    set((state) => ({
      preferences: { ...state.preferences, theme },
    })),

  updateLanguage: (language) =>
    set((state) => ({
      preferences: { ...state.preferences, language },
    })),

  updateFontSize: (fontSize) =>
    set((state) => ({
      preferences: { ...state.preferences, fontSize },
    })),

  // Update nested object — perlu double spread
  toggleNotification: (channel) =>
    set((state) => ({
      preferences: {
        ...state.preferences,
        notifications: {
          ...state.preferences.notifications,
          [channel]: !state.preferences.notifications[channel],
        },
      },
    })),

  resetToDefaults: () =>
    set({ preferences: DEFAULT_PREFERENCES }),
}));

// Pemakaian
function ThemeSelector() {
  const theme       = usePreferencesStore((s) => s.preferences.theme);
  const updateTheme = usePreferencesStore((s) => s.updateTheme);

  return (
    <select
      value={theme}
      onChange={(e) => updateTheme(e.target.value as UserPreferences["theme"])}
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );
}
```

---

### 4.5 Persist Middleware — Simpan ke localStorage

```tsx
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsStore {
  sidebarOpen: boolean;
  volume: number;
  toggleSidebar: () => void;
  setVolume: (v: number) => void;
}

// Bungkus create() dengan persist()
const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      volume: 80,
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setVolume: (volume) => set({ volume }),
    }),
    {
      name: "app-settings",             // key di localStorage
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({         // Hanya persist sebagian state
        volume: state.volume,
        // sidebarOpen tidak di-persist
      }),
    }
  )
);
// Sekarang volume otomatis tersimpan ke localStorage dan akan dipulihkan saat refresh
```

---

## 5. Context API vs Zustand — Perbandingan Jujur

### Tabel Perbandingan

| Aspek | Context API | Zustand |
|---|---|---|
| **Setup** | Butuh createContext + Provider + custom hook | Langsung `create()`, tidak perlu Provider |
| **Boilerplate** | Cukup banyak | Minimal |
| **TypeScript** | Manual (tapi bisa) | First-class, sangat natural |
| **Re-render** | Semua subscriber re-render saat value berubah | Hanya subscriber yang pakai bagian yang berubah (via selector) |
| **Performance** | Perlu optimasi manual (split context, memo) | Efficient by default |
| **Devtools** | Tidak ada | Zustand Devtools (via middleware) |
| **Persist** | Manual (useEffect + localStorage) | Built-in middleware |
| **Learning curve** | Rendah — sudah bawaan React | Sangat rendah — API minimal |
| **Bundle size** | 0 (bawaan React) | ~2kb |
| **Use case terbaik** | Static/rarely-changing data (auth, theme) | Dynamic, frequently-changing state (cart, filters, UI state) |

---

### Side-by-Side: Implementasi yang Sama

```tsx
// ── SKENARIO: Theme Switcher ──────────────────────────────────

// ── Context API ───────────────────────────────────────────────
// Butuh: interface, createContext, Provider, customHook, bungkus App

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}

// Di root: <ThemeProvider><App /></ThemeProvider>
// Di component: const { theme, toggle } = useTheme();

// ── Zustand ───────────────────────────────────────────────────
// Selesai dalam satu file pendek, tidak perlu Provider sama sekali

interface ThemeStore {
  theme: "light" | "dark";
  toggle: () => void;
}

const useThemeStore = create<ThemeStore>((set) => ({
  theme: "light",
  toggle: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
}));

// Di component: const { theme, toggle } = useThemeStore();
// Tidak perlu setup Provider apapun
```

---

### Kapan Pilih Context, Kapan Pilih Zustand?

```
Pilih Context API:
✅ Auth state (user yang login) — berubah jarang
✅ Tema (light/dark) — berubah jarang, hanya trigger 1x render
✅ Locale / bahasa — sama seperti tema
✅ Config aplikasi yang statis
✅ Kamu tidak mau tambah dependency external

Pilih Zustand:
✅ Shopping cart — sering berubah, banyak component butuh
✅ Filter/sort di halaman produk — berubah cepat
✅ UI state yang complex (modal stack, sidebar)
✅ Data yang perlu di-persist ke localStorage
✅ State yang diakses di luar React (misalnya di utility function)
✅ Aplikasi yang sudah scale dan Context mulai terasa lambat
```

---

## 6. Mini Project: Shopping Cart dengan Zustand

Mari bangun shopping cart yang fully typed — bisa tambah item, hapus item, ubah quantity, dan hitung total — semua dalam satu Zustand store.

---

### Struktur File

```
src/
  store/
    cartStore.ts         ← Store Zustand
  components/
    ProductList.tsx      ← Tampilkan produk, tombol "Add to Cart"
    Cart.tsx             ← Tampilkan isi cart
    CartItem.tsx         ← Satu item di dalam cart
    CartSummary.tsx      ← Total harga, checkout button
  data/
    products.ts          ← Data produk dummy
  App.tsx
```

---

### Step 1: Types & Data Produk

```ts
// src/data/products.ts

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;       // dalam Rupiah
  imageUrl: string;
  category: string;
  stock: number;
}

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Laptop Pro 15",
    description: "Laptop untuk developer, RAM 16GB, SSD 512GB",
    price: 18_500_000,
    imageUrl: "https://via.placeholder.com/200x150?text=Laptop",
    category: "Elektronik",
    stock: 10,
  },
  {
    id: 2,
    name: "Mechanical Keyboard",
    description: "Keyboard TKL, switch Cherry MX Red, RGB",
    price: 1_250_000,
    imageUrl: "https://via.placeholder.com/200x150?text=Keyboard",
    category: "Aksesori",
    stock: 25,
  },
  {
    id: 3,
    name: "4K Monitor 27\"",
    description: "Monitor 27 inci, resolusi 4K, 144Hz, IPS panel",
    price: 7_200_000,
    imageUrl: "https://via.placeholder.com/200x150?text=Monitor",
    category: "Elektronik",
    stock: 8,
  },
  {
    id: 4,
    name: "USB-C Hub 7-in-1",
    description: "Hub dengan port HDMI, USB 3.0, SD Card, PD Charging",
    price: 450_000,
    imageUrl: "https://via.placeholder.com/200x150?text=Hub",
    category: "Aksesori",
    stock: 50,
  },
  {
    id: 5,
    name: "Wireless Mouse",
    description: "Mouse ergonomis, baterai tahan 6 bulan, silent click",
    price: 380_000,
    imageUrl: "https://via.placeholder.com/200x150?text=Mouse",
    category: "Aksesori",
    stock: 30,
  },
];
```

---

### Step 2: Cart Store

```ts
// src/store/cartStore.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Product } from "../data/products";

// Item di dalam cart: produk + quantity
export interface CartItem {
  product: Product;
  quantity: number;
}

// Tipe untuk seluruh store
interface CartStore {
  // ── State ──────────────────────────────────────────────────
  items: CartItem[];
  isCartOpen: boolean;

  // ── Computed (derived) — dihitung dari items ────────────────
  // Catatan: Di Zustand, "computed" bisa berupa fungsi di store
  // atau dihitung di component dengan selector + useMemo
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemQuantity: (productId: number) => number;
  isInCart: (productId: number) => boolean;

  // ── Actions ────────────────────────────────────────────────
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  incrementQuantity: (productId: number) => void;
  decrementQuantity: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // ── Initial State ─────────────────────────────────────
      items: [],
      isCartOpen: false,

      // ── Computed ──────────────────────────────────────────
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      getItemQuantity: (productId: number) => {
        const item = get().items.find((i) => i.product.id === productId);
        return item?.quantity ?? 0;
      },

      isInCart: (productId: number) => {
        return get().items.some((i) => i.product.id === productId);
      },

      // ── Actions ───────────────────────────────────────────
      addItem: (product: Product) => {
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.product.id === product.id
          );

          if (existingItem) {
            // Sudah ada → increment quantity (tidak melebihi stock)
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? {
                      ...item,
                      quantity: Math.min(item.quantity + 1, product.stock),
                    }
                  : item
              ),
            };
          }

          // Belum ada → tambah sebagai item baru dengan quantity 1
          return {
            items: [...state.items, { product, quantity: 1 }],
          };
        });
      },

      removeItem: (productId: number) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },

      incrementQuantity: (productId: number) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, item.product.stock),
                }
              : item
          ),
        }));
      },

      decrementQuantity: (productId: number) => {
        set((state) => {
          const item = state.items.find((i) => i.product.id === productId);

          // Kalau quantity akan jadi 0, hapus item dari cart
          if (item && item.quantity <= 1) {
            return {
              items: state.items.filter((i) => i.product.id !== productId),
            };
          }

          return {
            items: state.items.map((i) =>
              i.product.id === productId
                ? { ...i, quantity: i.quantity - 1 }
                : i
            ),
          };
        });
      },

      updateQuantity: (productId: number, quantity: number) => {
        // Kalau quantity 0 atau negatif, hapus item
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId
              ? {
                  ...item,
                  quantity: Math.min(quantity, item.product.stock),
                }
              : item
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
    }),
    {
      name: "shopping-cart",
      storage: createJSONStorage(() => localStorage),
      // Hanya persist items, bukan isCartOpen (agar cart selalu tertutup saat refresh)
      partialize: (state) => ({ items: state.items }),
    }
  )
);
```

---

### Step 3: ProductList Component

```tsx
// src/components/ProductList.tsx

import { PRODUCTS } from "../data/products";
import { useCartStore } from "../store/cartStore";

function ProductCard({ product }: { product: (typeof PRODUCTS)[0] }) {
  const addItem        = useCartStore((s) => s.addItem);
  const isInCart       = useCartStore((s) => s.isInCart);
  const getItemQty     = useCartStore((s) => s.getItemQuantity);
  const incrementQty   = useCartStore((s) => s.incrementQuantity);
  const decrementQty   = useCartStore((s) => s.decrementQuantity);

  const inCart  = isInCart(product.id);
  const qty     = getItemQty(product.id);
  const isMaxed = qty >= product.stock;

  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <img
        src={product.imageUrl}
        alt={product.name}
        style={{ borderRadius: "4px", width: "100%" }}
      />
      <span
        style={{
          fontSize: "0.7rem",
          background: "#e8f4fd",
          padding: "2px 8px",
          borderRadius: "4px",
          width: "fit-content",
        }}
      >
        {product.category}
      </span>
      <h3 style={{ margin: 0, fontSize: "1rem" }}>{product.name}</h3>
      <p style={{ margin: 0, fontSize: "0.85rem", color: "#666" }}>
        {product.description}
      </p>
      <p style={{ margin: 0, color: "#888", fontSize: "0.8rem" }}>
        Stok: {product.stock}
      </p>
      <strong style={{ color: "#e44d26", fontSize: "1.1rem" }}>
        Rp{product.price.toLocaleString("id-ID")}
      </strong>

      {/* Tombol: Add to Cart atau Quantity Control */}
      {!inCart ? (
        <button
          onClick={() => addItem(product)}
          style={{
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "0.5rem",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          + Tambah ke Cart
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => decrementQty(product.id)}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid #ccc",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            −
          </button>
          <span style={{ minWidth: "2rem", textAlign: "center", fontWeight: "bold" }}>
            {qty}
          </span>
          <button
            onClick={() => incrementQty(product.id)}
            disabled={isMaxed}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "1px solid #ccc",
              cursor: isMaxed ? "not-allowed" : "pointer",
              fontWeight: "bold",
              opacity: isMaxed ? 0.5 : 1,
            }}
          >
            +
          </button>
          {isMaxed && (
            <span style={{ fontSize: "0.7rem", color: "#e44" }}>Maks</span>
          )}
        </div>
      )}
    </div>
  );
}

export function ProductList() {
  return (
    <div>
      <h2>Produk</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

---

### Step 4: Cart Component

```tsx
// src/components/CartItem.tsx

import { CartItem as CartItemType } from "../store/cartStore";
import { useCartStore } from "../store/cartStore";

interface CartItemProps {
  item: CartItemType;
}

export function CartItemRow({ item }: CartItemProps) {
  const removeItem      = useCartStore((s) => s.removeItem);
  const incrementQty    = useCartStore((s) => s.incrementQuantity);
  const decrementQty    = useCartStore((s) => s.decrementQuantity);
  const updateQty       = useCartStore((s) => s.updateQuantity);

  const subtotal = item.product.price * item.quantity;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 0",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      {/* Gambar */}
      <img
        src={item.product.imageUrl}
        alt={item.product.name}
        style={{ width: 60, height: 45, objectFit: "cover", borderRadius: 4 }}
      />

      {/* Info produk */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontWeight: "bold",
            fontSize: "0.9rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.product.name}
        </p>
        <p style={{ margin: 0, color: "#888", fontSize: "0.8rem" }}>
          Rp{item.product.price.toLocaleString("id-ID")} / pcs
        </p>
      </div>

      {/* Quantity control */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <button
          onClick={() => decrementQty(item.product.id)}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px solid #ccc",
            cursor: "pointer",
            fontSize: "1rem",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={item.product.stock}
          value={item.quantity}
          onChange={(e) =>
            updateQty(item.product.id, parseInt(e.target.value, 10) || 1)
          }
          style={{
            width: 36,
            textAlign: "center",
            border: "1px solid #ccc",
            borderRadius: 4,
            padding: "2px 0",
          }}
        />
        <button
          onClick={() => incrementQty(item.product.id)}
          disabled={item.quantity >= item.product.stock}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "1px solid #ccc",
            cursor:
              item.quantity >= item.product.stock ? "not-allowed" : "pointer",
            opacity: item.quantity >= item.product.stock ? 0.5 : 1,
            fontSize: "1rem",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      </div>

      {/* Subtotal */}
      <p
        style={{
          margin: 0,
          fontWeight: "bold",
          fontSize: "0.9rem",
          minWidth: 90,
          textAlign: "right",
        }}
      >
        Rp{subtotal.toLocaleString("id-ID")}
      </p>

      {/* Tombol hapus */}
      <button
        onClick={() => removeItem(item.product.id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#e44",
          fontSize: "1.1rem",
          padding: "0 4px",
        }}
        title="Hapus dari cart"
      >
        ×
      </button>
    </div>
  );
}
```

```tsx
// src/components/Cart.tsx

import { useCartStore } from "../store/cartStore";
import { CartItemRow } from "./CartItem";

export function Cart() {
  const items         = useCartStore((s) => s.items);
  const isCartOpen    = useCartStore((s) => s.isCartOpen);
  const toggleCart    = useCartStore((s) => s.toggleCart);
  const clearCart     = useCartStore((s) => s.clearCart);
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const getTotalPrice = useCartStore((s) => s.getTotalPrice);

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  return (
    <>
      {/* Cart Toggle Button */}
      <button
        onClick={toggleCart}
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          background: "#0070f3",
          color: "#fff",
          border: "none",
          borderRadius: "50px",
          padding: "0.6rem 1.2rem",
          cursor: "pointer",
          fontWeight: "bold",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        🛒 Cart
        {totalItems > 0 && (
          <span
            style={{
              background: "#e44d26",
              borderRadius: "50%",
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: "bold",
            }}
          >
            {totalItems}
          </span>
        )}
      </button>

      {/* Cart Drawer */}
      {isCartOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={toggleCart}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 1001,
            }}
          />

          {/* Drawer */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(420px, 100vw)",
              background: "#fff",
              zIndex: 1002,
              display: "flex",
              flexDirection: "column",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #e0e0e0",
              }}
            >
              <h2 style={{ margin: 0 }}>
                Shopping Cart{" "}
                <span style={{ color: "#888", fontWeight: "normal", fontSize: "1rem" }}>
                  ({totalItems} item)
                </span>
              </h2>
              <button
                onClick={toggleCart}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0 1.25rem" }}>
              {items.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "#aaa",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "3rem" }}>🛒</span>
                  <p>Cart kamu masih kosong.</p>
                </div>
              ) : (
                items.map((item) => (
                  <CartItemRow key={item.product.id} item={item} />
                ))
              )}
            </div>

            {/* Footer / Summary */}
            {items.length > 0 && (
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderTop: "1px solid #e0e0e0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#666" }}>Subtotal ({totalItems} item)</span>
                  <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                    Rp{totalPrice.toLocaleString("id-ID")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: "#888",
                    fontSize: "0.85rem",
                  }}
                >
                  <span>Ongkos kirim</span>
                  <span>Dihitung saat checkout</span>
                </div>
                <button
                  onClick={() => alert(`Checkout! Total: Rp${totalPrice.toLocaleString("id-ID")}`)}
                  style={{
                    background: "#0070f3",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.85rem",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "1rem",
                  }}
                >
                  Checkout — Rp{totalPrice.toLocaleString("id-ID")}
                </button>
                <button
                  onClick={clearCart}
                  style={{
                    background: "none",
                    border: "1px solid #e44",
                    color: "#e44",
                    borderRadius: "8px",
                    padding: "0.5rem",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Kosongkan Cart
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
```

---

### Step 5: App Entry Point

```tsx
// src/App.tsx

import { ProductList } from "./components/ProductList";
import { Cart } from "./components/Cart";

function App() {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1rem 1rem 8rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0 }}>🛍️ TechShop</h1>
        <p style={{ color: "#666", margin: "0.25rem 0 0" }}>
          Klik tombol Cart di kanan atas untuk melihat keranjang belanja
        </p>
      </header>

      <ProductList />
      <Cart />
    </div>
  );
}

export default App;
```

---

### Rekap Konsep yang Dipakai di Mini Project

| Konsep | Implementasi |
|---|---|
| **Zustand `create<T>()`** | `create<CartStore>()` — fully typed |
| **State + Actions dalam satu interface** | `CartStore` dengan `items`, `isCartOpen`, semua action |
| **`get()` di dalam action** | `getTotalItems`, `getTotalPrice`, `isInCart`, `getItemQuantity` |
| **`set()` dengan function update** | `addItem`, `decrementQuantity` — pakai `(state) => ...` |
| **Nested state update** | Spread operator berlapis di `addItem` |
| **Persist middleware** | Cart tersimpan ke localStorage, pulih setelah refresh |
| **Selector di component** | `useCartStore((s) => s.items)` — tiap component subscribe bagiannya saja |
| **`Math.min()` untuk guard stock** | Quantity tidak bisa melebihi `product.stock` |
| **Derived values di store** | `getTotalItems()` dan `getTotalPrice()` sebagai fungsi di store |
| **TypeScript interface terekspor** | `CartItem` di-export untuk dipakai di `CartItemRow` |

---

## Penutup

Sekarang kamu sudah punya gambaran menyeluruh tentang state management di React:

| Level | Solusi |
|---|---|
| **Component-level** | `useState`, `useReducer` |
| **Beberapa component terkait** | Lift state up + props |
| **Global, jarang berubah** | Context API |
| **Global, sering berubah / kompleks** | Zustand |
| **Data dari server** | React Query / SWR |

**Langkah selanjutnya:**

1. **`useReducer` + TypeScript** — State machine pattern untuk state yang benar-benar kompleks
2. **React Query** — Data fetching, caching, invalidasi — jauh lebih powerful dari `useFetch` manual
3. **Zustand intermediate** — `immer` middleware (update nested tanpa spread berulang), `devtools` middleware
4. **Zod + TypeScript** — Validasi runtime untuk data dari API, form validation

> **Pesan dari senior dev:** Pilih solusi state management yang paling simpel yang cukup untuk kebutuhan kamu. Jangan langsung pasang Redux untuk counter sederhana, tapi jangan juga ngotot pakai Context untuk cart yang berubah setiap detik. State management yang baik itu yang tidak kamu sadari keberadaannya — dia bekerja, dan kamu fokus ke fitur.

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Zustand 5.x*
