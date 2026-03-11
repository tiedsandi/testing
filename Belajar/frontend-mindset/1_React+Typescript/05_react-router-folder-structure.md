# React Router v6 & Struktur Folder Project yang Scalable

> **Prerequisite:** Sudah baca [04_state-management-typescript.md](./04_state-management-typescript.md) — terutama Context API, karena kita pakai itu untuk auth state di Protected Route.

---

## Daftar Isi

1. [Konsep Routing di React](#1-konsep-routing-di-react)
2. [Setup React Router v6](#2-setup-react-router-v6)
3. [Route, Routes, Link, NavLink](#3-route-routes-link-navlink)
4. [useNavigate & useParams — dengan Typing](#4-usenavigate--useparams--dengan-typing)
5. [Nested Routes & Layout Component](#5-nested-routes--layout-component)
6. [Protected Route (Auth Guard)](#6-protected-route-auth-guard)
7. [Struktur Folder Project yang Scalable](#7-struktur-folder-project-yang-scalable)
8. [Mini Project: Blog App](#8-mini-project-blog-app)

---

## 1. Konsep Routing di React

### Routing itu Apa?

Di website biasa (tanpa React), setiap kamu klik link, browser pergi ke server, minta file HTML baru, dan halaman refresh total. Di React (SPA — Single Page Application), halaman tidak pernah refresh. Yang berubah hanya **komponen yang ditampilkan** sesuai URL saat ini.

Analoginya: Routing di React itu kayak **televisi dengan remote**. Tidak ada orang yang pergi ke mana-mana — channel yang berganti, tapi TVnya tetap nyala di tempat yang sama.

```
URL: /                → Tampilkan <HomePage />
URL: /posts           → Tampilkan <PostListPage />
URL: /posts/42        → Tampilkan <PostDetailPage postId="42" />
URL: /login           → Tampilkan <LoginPage />
URL: /dashboard       → Tampilkan <DashboardPage /> (kalau sudah login)
```

### Kenapa React Router?

React sendiri tidak punya built-in router. React Router adalah library paling populer dan de-facto standard untuk routing di React. Versi 6 (yang kita bahas) lebih simpel dan powerful dibanding versi sebelumnya.

---

## 2. Setup React Router v6

### Instalasi

```bash
npm install react-router-dom
```

Untuk TypeScript, type definitions sudah termasuk di dalam package — tidak perlu install `@types/react-router-dom` secara terpisah.

---

### Setup di Root App

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* BrowserRouter harus membungkus semua component yang butuh routing */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

> **Kenapa `BrowserRouter` di `main.tsx`?** Karena semua hook router (`useNavigate`, `useParams`, dll.) hanya bisa dipakai di dalam `BrowserRouter`. Kalau taruh di dalam `App.tsx`, kamu tidak bisa pakai hook router di `App.tsx` sendiri.

---

## 3. Route, Routes, Link, NavLink

### 3.1 Route & Routes — Mendefinisikan Halaman

```tsx
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import PostListPage from "./pages/PostListPage";
import PostDetailPage from "./pages/PostDetailPage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <Routes>
      {/* path="/" → tampilkan HomePage */}
      <Route path="/" element={<HomePage />} />

      {/* path="/about" → tampilkan AboutPage */}
      <Route path="/about" element={<AboutPage />} />

      {/* path="/posts" → tampilkan PostListPage */}
      <Route path="/posts" element={<PostListPage />} />

      {/* path="/posts/:id" → :id adalah parameter dinamis */}
      <Route path="/posts/:id" element={<PostDetailPage />} />

      {/* path="*" → catch-all, tampilkan 404 kalau tidak ada yang cocok */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
```

---

### 3.2 Link & NavLink — Navigasi Antar Halaman

**Jangan pakai `<a href>` biasa** untuk navigasi internal — itu akan reload halaman. Pakai `<Link>` dari react-router-dom.

```tsx
import { Link, NavLink } from "react-router-dom";

// ── Link — navigasi dasar ──────────────────────────────────────
function SimpleNav() {
  return (
    <nav>
      {/* ✅ Link — tidak reload halaman */}
      <Link to="/">Home</Link>
      <Link to="/about">About</Link>
      <Link to="/posts">Blog</Link>

      {/* ❌ Jangan pakai ini untuk navigasi internal */}
      {/* <a href="/about">About</a> */}
    </nav>
  );
}

// ── NavLink — Link dengan kemampuan "active state" ─────────────
// Otomatis menambahkan class "active" saat path-nya cocok dengan URL saat ini
function Navbar() {
  return (
    <nav>
      <NavLink
        to="/"
        end          // "end" → hanya active kalau path persis "/", bukan "/posts" dll.
        style={({ isActive }) => ({
          color: isActive ? "#0070f3" : "#333",
          fontWeight: isActive ? "bold" : "normal",
          textDecoration: "none",
        })}
      >
        Home
      </NavLink>

      <NavLink
        to="/posts"
        className={({ isActive }) =>
          isActive ? "nav-link nav-link--active" : "nav-link"
        }
      >
        Blog
      </NavLink>

      <NavLink
        to="/about"
        style={({ isActive, isPending }) => ({
          color: isActive ? "#0070f3" : isPending ? "#888" : "#333",
        })}
      >
        About
      </NavLink>
    </nav>
  );
}
```

---

### 3.3 Link dengan State & Dynamic Path

```tsx
import { Link } from "react-router-dom";

interface Post {
  id: number;
  title: string;
  excerpt: string;
}

function PostCard({ post }: { post: Post }) {
  return (
    <div>
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>

      {/* Dynamic path — template literal */}
      <Link to={`/posts/${post.id}`}>Baca Selengkapnya →</Link>

      {/* Link dengan state — data yang dibawa ke halaman tujuan */}
      <Link
        to={`/posts/${post.id}`}
        state={{ fromList: true, postTitle: post.title }}
      >
        Baca (dengan state)
      </Link>
    </div>
  );
}
```

---

## 4. useNavigate & useParams — dengan Typing

### 4.1 useNavigate — Navigasi Programatik

Dipakai ketika navigasi harus terjadi dari dalam logic (bukan dari klik link langsung) — misalnya setelah submit form, setelah logout, setelah countdown.

```tsx
import { useNavigate } from "react-router-dom";
import { FormEvent, useState } from "react";

function LoginForm() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulasi login
      await fakeLogin();

      // ✅ Navigasi setelah berhasil login
      navigate("/dashboard");

      // Atau navigasi dengan replace — tidak bisa back ke halaman login
      // navigate("/dashboard", { replace: true });
    } catch {
      alert("Login gagal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields... */}
      <button type="submit" disabled={isLoading}>Login</button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────

// Navigasi mundur (back) dan maju (forward)
function NavigationButtons() {
  const navigate = useNavigate();

  return (
    <div>
      {/* -1 = back satu langkah, seperti tombol back browser */}
      <button onClick={() => navigate(-1)}>← Back</button>

      {/* +1 = forward */}
      <button onClick={() => navigate(1)}>Forward →</button>

      {/* Navigasi ke path tertentu */}
      <button onClick={() => navigate("/")}>Home</button>
    </div>
  );
}
```

---

### 4.2 useParams — Baca URL Parameter

```tsx
// Ketika route-nya: <Route path="/posts/:id" element={<PostDetailPage />} />
// URL: /posts/42 → params.id === "42"

import { useParams } from "react-router-dom";

// ── Cara biasa — params.id bertipe string | undefined ─────────
function PostDetailPageBasic() {
  const { id } = useParams(); // id: string | undefined

  // Harus handle kemungkinan undefined
  if (!id) return <p>ID tidak valid.</p>;

  // id masih string — convert ke number untuk API call
  const postId = parseInt(id, 10);
  if (isNaN(postId)) return <p>ID bukan angka.</p>;

  return <div>Menampilkan post ID: {postId}</div>;
}

// ── Cara dengan typing eksplisit ──────────────────────────────
// Definisikan tipe params yang diharapkan
interface PostDetailParams {
  id: string; // URL params selalu string
}

function PostDetailPageTyped() {
  // useParams<T> → TypeScript tahu tipe params-nya
  const { id } = useParams<PostDetailParams>();

  // id sekarang: string | undefined (bukan any)
  if (!id) return <p>Post tidak ditemukan.</p>;

  return <div>Post ID: {id}</div>;
}
```

---

### 4.3 useLocation — Baca State & URL Saat Ini

```tsx
import { useLocation } from "react-router-dom";

// Tipe untuk state yang dibawa via Link
interface LocationState {
  fromList?: boolean;
  postTitle?: string;
}

function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  // Cast state ke tipe yang kita definisikan
  const state = location.state as LocationState | null;

  return (
    <div>
      {/* Kalau datang dari list, tampilkan breadcrumb */}
      {state?.fromList && (
        <p>
          ← Kembali ke daftar post
        </p>
      )}

      <h1>Post #{id}</h1>
      <p>Path saat ini: {location.pathname}</p>
      <p>Query string: {location.search}</p>
    </div>
  );
}
```

---

### 4.4 useSearchParams — Query String (?key=value)

```tsx
import { useSearchParams } from "react-router-dom";

// URL: /posts?category=tech&page=2

function PostListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Baca query params
  const category = searchParams.get("category") ?? "all"; // string | null
  const page     = parseInt(searchParams.get("page") ?? "1", 10);

  const handleCategoryChange = (newCategory: string): void => {
    setSearchParams((prev) => {
      prev.set("category", newCategory);
      prev.set("page", "1"); // Reset ke halaman 1 saat filter berubah
      return prev;
    });
  };

  const handleNextPage = (): void => {
    setSearchParams((prev) => {
      prev.set("page", String(page + 1));
      return prev;
    });
  };

  return (
    <div>
      <div>
        {["all", "tech", "design", "business"].map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            style={{ fontWeight: category === cat ? "bold" : "normal" }}
          >
            {cat}
          </button>
        ))}
      </div>

      <p>Halaman: {page} | Kategori: {category}</p>

      <button onClick={() => handleNextPage()}>Halaman Berikutnya →</button>
    </div>
  );
}
```

---

## 5. Nested Routes & Layout Component

### Konsep

Nested routes itu saat satu route berada **di dalam** route lain. Ini penting untuk layout yang konsisten — misalnya sidebar dan navbar yang tetap ada di semua halaman dashboard, tapi konten tengahnya yang berubah.

Analoginya: Bayangin frame foto yang ditempel di dinding. Framenya (layout) tetap di situ, cuma foto di dalamnya (konten) yang diganti-ganti.

---

### 5.1 Setup Nested Routes

```tsx
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import HomePage from "./pages/HomePage";
import PostListPage from "./pages/PostListPage";
import PostDetailPage from "./pages/PostDetailPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <Routes>
      {/* Layout utama — Navbar + Footer */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/posts" element={<PostListPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
      </Route>

      {/* Dashboard layout — Sidebar + konten */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        {/* index route — tampil saat /dashboard (tanpa path lanjutan) */}
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />       {/* /dashboard/profile */}
        <Route path="settings" element={<SettingsPage />} />     {/* /dashboard/settings */}
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
```

---

### 5.2 Layout Component dengan `<Outlet />`

`<Outlet />` adalah "lubang" di mana child route akan dirender.

```tsx
// src/layouts/MainLayout.tsx
import { Outlet, Link, NavLink } from "react-router-dom";

function MainLayout() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar — selalu ada */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e0e0e0",
          padding: "0.75rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "2rem",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Link to="/" style={{ fontWeight: "bold", fontSize: "1.2rem", textDecoration: "none", color: "#000" }}>
          📝 MyBlog
        </Link>
        <nav style={{ display: "flex", gap: "1.5rem" }}>
          <NavLink to="/" end style={navLinkStyle}>Home</NavLink>
          <NavLink to="/posts" style={navLinkStyle}>Blog</NavLink>
        </nav>
      </header>

      {/* Main content area — di sinilah Outlet/child routes dirender */}
      <main style={{ flex: 1, padding: "2rem 1.5rem", maxWidth: "900px", margin: "0 auto", width: "100%" }}>
        <Outlet /> {/* ← Child route component muncul di sini */}
      </main>

      {/* Footer — selalu ada */}
      <footer
        style={{
          borderTop: "1px solid #e0e0e0",
          padding: "1rem 1.5rem",
          textAlign: "center",
          color: "#888",
          fontSize: "0.85rem",
        }}
      >
        © {new Date().getFullYear()} MyBlog. Dibuat dengan React + TypeScript.
      </footer>
    </div>
  );
}

// Helper style function untuk NavLink
const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  color: isActive ? "#0070f3" : "#444",
  fontWeight: isActive ? "600" : "normal",
  textDecoration: "none",
});

export default MainLayout;
```

```tsx
// src/layouts/DashboardLayout.tsx
import { Outlet, NavLink, Navigate } from "react-router-dom";

const sidebarLinks = [
  { to: "/dashboard",          label: "📊 Overview",  end: true },
  { to: "/dashboard/profile",  label: "👤 Profile",   end: false },
  { to: "/dashboard/settings", label: "⚙️ Settings",  end: false },
];

function DashboardLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 220,
          background: "#f8f9fa",
          borderRight: "1px solid #e0e0e0",
          padding: "1.5rem 0",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <p style={{ padding: "0 1rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          Dashboard
        </p>
        {sidebarLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            style={({ isActive }) => ({
              display: "block",
              padding: "0.6rem 1rem",
              textDecoration: "none",
              color: isActive ? "#0070f3" : "#555",
              background: isActive ? "#e8f0fe" : "transparent",
              borderRight: isActive ? "3px solid #0070f3" : "3px solid transparent",
              fontSize: "0.9rem",
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </aside>

      {/* Konten sidebar — Outlet renders di sini */}
      <div style={{ flex: 1, padding: "2rem" }}>
        <Outlet />
      </div>
    </div>
  );
}

export default DashboardLayout;
```

---

### 5.3 Outlet Context — Kirim Data dari Layout ke Child

```tsx
// Kadang layout punya data yang perlu diakses child routes
import { Outlet, useOutletContext } from "react-router-dom";

interface DashboardContextType {
  user: { name: string; role: string };
  refetchUser: () => void;
}

function DashboardLayoutWithContext() {
  const [user] = useState({ name: "Budi", role: "admin" });

  const refetchUser = (): void => {
    // fetch ulang user data...
  };

  return (
    <div>
      <aside>{/* sidebar */}</aside>
      {/* Kirim context ke semua child routes */}
      <Outlet context={{ user, refetchUser } satisfies DashboardContextType} />
    </div>
  );
}

// Buat custom hook supaya typed
function useDashboardContext(): DashboardContextType {
  return useOutletContext<DashboardContextType>();
}

// Di child route, pakai hook-nya
function ProfilePage() {
  const { user } = useDashboardContext();
  return <h1>Halo, {user.name}!</h1>;
}
```

---

## 6. Protected Route (Auth Guard)

### Konsep

Protected route adalah "penjaga" yang memeriksa apakah user sudah login sebelum diizinkan masuk ke halaman tertentu. Kalau belum login, langsung redirect ke halaman login.

Analoginya: Security di gedung kantor. Kalau kamu belum punya ID card (belum login), kamu tidak bisa masuk ke lantai kantor — langsung diarahkan ke meja resepsionis (halaman login).

---

### 6.1 Auth Context Sederhana

```tsx
// src/context/AuthContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (email: string, password: string): Promise<void> => {
    // Simulasi API call — di real app: fetch ke backend
    await new Promise((res) => setTimeout(res, 800));

    if (email === "admin@blog.com" && password === "password") {
      setUser({ id: 1, name: "Budi Admin", email, role: "admin" });
    } else {
      throw new Error("Email atau password salah.");
    }
  };

  const logout = (): void => setUser(null);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

### 6.2 ProtectedRoute Component

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  // Opsional: hanya izinkan role tertentu
  allowedRoles?: ("admin" | "user")[];
}

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // ── Belum login → redirect ke /login ──────────────────────
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }} // Simpan halaman asal untuk redirect balik setelah login
        replace                    // replace = tidak bisa back ke halaman protected
      />
    );
  }

  // ── Sudah login tapi role tidak sesuai → redirect ke /unauthorized ─
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ── Lolos semua cek → render child routes ─────────────────
  return <Outlet />;
}

export default ProtectedRoute;
```

---

### 6.3 Pasang di Routes

```tsx
// src/App.tsx
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<MainLayout />}>
        <Route path="/"         element={<HomePage />} />
        <Route path="/posts"    element={<PostListPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      {/* Protected routes — harus login */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile"  element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="/write" element={<WritePostPage />} />
      </Route>

      {/* Admin-only routes */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
```

---

### 6.4 Redirect Balik Setelah Login

```tsx
// src/pages/LoginPage.tsx
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FormEvent, useState } from "react";

// Tipe untuk location state yang dikirim ProtectedRoute
interface LocationState {
  from?: { pathname: string };
}

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Kalau sudah login, redirect ke dashboard (atau halaman asal)
  const state = location.state as LocationState | null;
  const from  = state?.from?.pathname ?? "/dashboard";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      // Setelah berhasil, navigate ke halaman asal (atau dashboard)
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "4rem auto" }}>
      <h1>Login</h1>
      {state?.from && (
        <p style={{ color: "#888", fontSize: "0.85rem" }}>
          Kamu harus login untuk mengakses <strong>{state.from.pathname}</strong>.
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (coba: admin@blog.com)"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (coba: password)"
          required
        />
        {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
```

---

## 7. Struktur Folder Project yang Scalable

Ini topik yang tidak ada jawaban paling benar — tapi ada convention yang terbukti bekerja di skala menengah hingga besar. Mari kita bandingkan dua pendekatan populer.

---

### 7.1 Type-Based Structure (Berdasarkan Jenis File)

Cocok untuk: **project kecil**, saat fitur masih sedikit.

```
src/
  components/       ← Semua komponen
  pages/            ← Semua halaman
  hooks/            ← Semua custom hooks
  utils/            ← Semua utility functions
  types/            ← Semua TypeScript types/interfaces
  services/         ← Semua API calls
  context/          ← Semua React contexts
  store/            ← Semua Zustand stores
  assets/           ← Gambar, font, dll.
```

**Masalahnya:** Saat project membesar, kamu harus lompat-lompat antar folder untuk mengerjakan satu fitur. Mau edit fitur "Post"? Kamu menyentuh `components/PostCard.tsx`, `pages/PostDetailPage.tsx`, `hooks/usePost.ts`, `types/post.types.ts`, `services/postService.ts`. Semua tersebar.

---

### 7.2 Feature-Based Structure (Berdasarkan Fitur)

Cocok untuk: **project menengah ke atas**. Ini yang direkomendasikan.

```
src/
  features/                    ← Dikelompokkan per fitur
  │
  ├── auth/                    ← Fitur autentikasi
  │   ├── components/
  │   │   ├── LoginForm.tsx
  │   │   └── LogoutButton.tsx
  │   ├── context/
  │   │   └── AuthContext.tsx
  │   ├── hooks/
  │   │   └── useAuth.ts       ← Re-export dari context
  │   ├── pages/
  │   │   └── LoginPage.tsx
  │   ├── types/
  │   │   └── auth.types.ts
  │   └── index.ts             ← Public API folder ini
  │
  ├── posts/                   ← Fitur blog/artikel
  │   ├── components/
  │   │   ├── PostCard.tsx
  │   │   ├── PostList.tsx
  │   │   └── PostDetail.tsx
  │   ├── hooks/
  │   │   ├── usePosts.ts
  │   │   └── usePost.ts
  │   ├── pages/
  │   │   ├── PostListPage.tsx
  │   │   └── PostDetailPage.tsx
  │   ├── services/
  │   │   └── postService.ts
  │   ├── types/
  │   │   └── post.types.ts
  │   └── index.ts
  │
  └── dashboard/               ← Fitur dashboard
      ├── components/
      ├── pages/
      └── index.ts
  │
  shared/                      ← Kode yang dipakai banyak fitur
  ├── components/              ← Button, Card, Modal, Input — reusable UI
  │   ├── Button/
  │   │   ├── Button.tsx
  │   │   └── Button.types.ts
  │   └── Card/
  │       └── Card.tsx
  ├── hooks/                   ← useDebounce, useLocalStorage, useFetch
  │   ├── useDebounce.ts
  │   └── useFetch.ts
  ├── utils/                   ← formatCurrency, formatDate, validators
  │   ├── formatters.ts
  │   └── validators.ts
  ├── types/                   ← Global types (ApiResponse<T>, dll.)
  │   └── api.types.ts
  └── constants/
      └── routes.ts            ← Route path constants
  │
  layouts/                     ← Layout components
  ├── MainLayout.tsx
  └── DashboardLayout.tsx
  │
  pages/                       ← Halaman "top-level" yang tidak masuk fitur tertentu
  ├── HomePage.tsx
  └── NotFoundPage.tsx
  │
  router/                      ← Routing configuration
  │   ├── AppRouter.tsx        ← <Routes> definition
  │   ├── ProtectedRoute.tsx
  │   └── routes.constants.ts  ← Path constants
  │
  App.tsx
  main.tsx
```

---

### 7.3 Route Constants — Hindari Magic String

```ts
// src/router/routes.constants.ts

// ✅ Definisikan semua path di satu tempat
// Kalau path berubah, cukup update di sini — tidak perlu cari-cari di seluruh project

export const ROUTES = {
  HOME:            "/",
  LOGIN:           "/login",
  UNAUTHORIZED:    "/unauthorized",

  POSTS:           "/posts",
  POST_DETAIL:     "/posts/:id",    // template
  POST_DETAIL_URL: (id: number | string) => `/posts/${id}`, // helper function

  DASHBOARD:          "/dashboard",
  DASHBOARD_PROFILE:  "/dashboard/profile",
  DASHBOARD_SETTINGS: "/dashboard/settings",

  ADMIN: "/admin",
  WRITE: "/write",
} as const;

// Pemakaian
// ✅ import { ROUTES } from "@/router/routes.constants";
// ✅ <Link to={ROUTES.HOME}>Home</Link>
// ✅ <Link to={ROUTES.POST_DETAIL_URL(post.id)}>Baca</Link>
// ✅ navigate(ROUTES.DASHBOARD);
```

---

### 7.4 Index File — Public API per Folder

```ts
// src/features/posts/index.ts
// Tentukan apa yang "public" dari folder ini

// Export types yang dibutuhkan di luar folder
export type { Post, PostSummary } from "./types/post.types";

// Export hooks yang boleh dipakai dari luar
export { usePosts } from "./hooks/usePosts";
export { usePost } from "./hooks/usePost";

// Export pages untuk dipakai di router
export { default as PostListPage } from "./pages/PostListPage";
export { default as PostDetailPage } from "./pages/PostDetailPage";

// Export components yang reusable ke fitur lain
export { PostCard } from "./components/PostCard";

// Tidak perlu export: internal components, internal hooks, service files
```

```ts
// Di App.tsx atau router, import dari folder index (bersih)
import { PostListPage, PostDetailPage } from "./features/posts";
import { LoginPage } from "./features/auth";

// Bukan:
// import PostListPage from "./features/posts/pages/PostListPage";
// import PostDetailPage from "./features/posts/pages/PostDetailPage";
```

---

## 8. Mini Project: Blog App

Sekarang kita praktek semua yang sudah dipelajari dalam satu project Blog sederhana: halaman daftar post, detail post pakai `useParams`, halaman login, dan protected route untuk halaman "Write".

---

### Struktur Folder

```
src/
  features/
    auth/
      context/AuthContext.tsx
      pages/LoginPage.tsx
      index.ts
    posts/
      data/posts.data.ts
      types/post.types.ts
      hooks/usePost.ts
      components/PostCard.tsx
      pages/PostListPage.tsx
      pages/PostDetailPage.tsx
      index.ts
    write/
      pages/WritePostPage.tsx
      index.ts
  layouts/
    MainLayout.tsx
  router/
    AppRouter.tsx
    ProtectedRoute.tsx
    routes.constants.ts
  pages/
    HomePage.tsx
    NotFoundPage.tsx
  App.tsx
  main.tsx
```

---

### Step 1: Data & Types

```ts
// src/features/posts/types/post.types.ts

export interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;        // Markdown/HTML konten penuh
  author: {
    name: string;
    avatarUrl: string;
  };
  publishedAt: string;    // ISO date string
  tags: string[];
  coverImageUrl: string;
  readingTimeMinutes: number;
}

export type PostSummary = Pick<Post, "id" | "slug" | "title" | "excerpt" | "author" | "publishedAt" | "tags" | "coverImageUrl" | "readingTimeMinutes">;
```

```ts
// src/features/posts/data/posts.data.ts
import { Post } from "../types/post.types";

export const POSTS: Post[] = [
  {
    id: 1,
    slug: "belajar-typescript-dari-nol",
    title: "Belajar TypeScript dari Nol: Panduan Lengkap untuk Pemula",
    excerpt: "TypeScript semakin populer di kalangan developer. Tapi apa sebenarnya TypeScript itu, dan kenapa kamu harus belajar?",
    content: `
# Belajar TypeScript dari Nol

TypeScript adalah superset dari JavaScript yang menambahkan **static typing** ke dalam bahasa yang kita cintai ini.

## Kenapa TypeScript?

1. Catch error lebih awal — di editor, bukan saat runtime
2. Autocomplete yang lebih baik
3. Kode lebih mudah dibaca dan di-maintain

## Langkah Pertama

Install TypeScript:

\`\`\`bash
npm install -g typescript
\`\`\`

Selamat, kamu sudah memulai perjalanan TypeScript!
    `.trim(),
    author: { name: "Budi Santoso", avatarUrl: "https://i.pravatar.cc/40?u=budi" },
    publishedAt: "2025-01-15T08:00:00Z",
    tags: ["typescript", "javascript", "tutorial"],
    coverImageUrl: "https://via.placeholder.com/800x400?text=TypeScript",
    readingTimeMinutes: 8,
  },
  {
    id: 2,
    slug: "react-hooks-cheatsheet",
    title: "React Hooks Cheatsheet: useState, useEffect, dan Teman-Temannya",
    excerpt: "Semua hook penting yang perlu kamu tahu sebagai React developer, lengkap dengan contoh penggunaan.",
    content: `
# React Hooks Cheatsheet

Hooks diperkenalkan di React 16.8 dan sekarang menjadi cara utama untuk menulis React component.

## useState

\`\`\`tsx
const [count, setCount] = useState(0);
\`\`\`

## useEffect

\`\`\`tsx
useEffect(() => {
  document.title = \`Count: \${count}\`;
}, [count]);
\`\`\`

## useRef

\`\`\`tsx
const inputRef = useRef<HTMLInputElement>(null);
\`\`\`
    `.trim(),
    author: { name: "Sari Dewi", avatarUrl: "https://i.pravatar.cc/40?u=sari" },
    publishedAt: "2025-01-22T10:30:00Z",
    tags: ["react", "hooks", "cheatsheet"],
    coverImageUrl: "https://via.placeholder.com/800x400?text=React+Hooks",
    readingTimeMinutes: 12,
  },
  {
    id: 3,
    slug: "zustand-vs-redux",
    title: "Zustand vs Redux: Mana yang Harus Kamu Pilih di 2025?",
    excerpt: "Redux sudah lama menjadi raja state management. Tapi Zustand datang dengan pendekatan yang jauh lebih simpel. Siapa yang menang?",
    content: `
# Zustand vs Redux

Pertanyaan klasik: state management mana yang harus kamu pakai?

## Redux

Redux bagus untuk:
- Aplikasi enterprise yang besar
- Tim yang butuh konvensi strict
- Ketika butuh time-travel debugging

## Zustand

Zustand unggul di:
- Setup yang minimal
- API yang intuitif
- Tidak perlu Provider
- TypeScript yang natural

## Verdict

Untuk project baru di 2025: **Zustand**. Kecuali kamu punya alasan spesifik untuk Redux.
    `.trim(),
    author: { name: "Ari Wibowo", avatarUrl: "https://i.pravatar.cc/40?u=ari" },
    publishedAt: "2025-02-01T09:00:00Z",
    tags: ["zustand", "redux", "state-management"],
    coverImageUrl: "https://via.placeholder.com/800x400?text=Zustand+vs+Redux",
    readingTimeMinutes: 6,
  },
];
```

---

### Step 2: Route Constants

```ts
// src/router/routes.constants.ts

export const ROUTES = {
  HOME:         "/",
  LOGIN:        "/login",
  POSTS:        "/posts",
  POST_DETAIL:  "/posts/:slug",
  POST_URL:     (slug: string) => `/posts/${slug}`,
  WRITE:        "/write",
  NOT_FOUND:    "*",
} as const;
```

---

### Step 3: Post Components & Pages

```tsx
// src/features/posts/components/PostCard.tsx
import { Link } from "react-router-dom";
import { PostSummary } from "../types/post.types";
import { ROUTES } from "../../../router/routes.constants";

interface PostCardProps {
  post: PostSummary;
  variant?: "default" | "featured";
}

export function PostCard({ post, variant = "default" }: PostCardProps) {
  const isFeatured = variant === "featured";

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "10px",
        overflow: "hidden",
        display: "flex",
        flexDirection: isFeatured ? "row" : "column",
        transition: "box-shadow 0.2s",
      }}
    >
      <img
        src={post.coverImageUrl}
        alt={post.title}
        style={{
          width: isFeatured ? 260 : "100%",
          height: isFeatured ? "100%" : 180,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {/* Tags */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {post.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                background: "#e8f4fd",
                color: "#0070f3",
                borderRadius: "20px",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <Link
          to={ROUTES.POST_URL(post.slug)}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: isFeatured ? "1.4rem" : "1.1rem",
              lineHeight: 1.3,
            }}
          >
            {post.title}
          </h2>
        </Link>

        {/* Excerpt */}
        <p style={{ margin: 0, color: "#555", fontSize: "0.9rem", lineHeight: 1.6 }}>
          {post.excerpt}
        </p>

        {/* Meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "auto",
            paddingTop: "0.75rem",
            borderTop: "1px solid #f0f0f0",
            fontSize: "0.8rem",
            color: "#888",
          }}
        >
          <img
            src={post.author.avatarUrl}
            alt={post.author.name}
            style={{ width: 24, height: 24, borderRadius: "50%" }}
          />
          <span>{post.author.name}</span>
          <span>·</span>
          <span>{formattedDate}</span>
          <span>·</span>
          <span>{post.readingTimeMinutes} menit baca</span>
        </div>
      </div>
    </article>
  );
}
```

---

```tsx
// src/features/posts/pages/PostListPage.tsx
import { useState, useMemo } from "react";
import { PostCard } from "../components/PostCard";
import { POSTS } from "../data/posts.data";

const ALL_TAGS = Array.from(new Set(POSTS.flatMap((p) => p.tags))).sort();

function PostListPage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredPosts = useMemo(() => {
    return POSTS.filter((post) => {
      const matchTag    = !activeTag || post.tags.includes(activeTag);
      const matchSearch = !search
        || post.title.toLowerCase().includes(search.toLowerCase())
        || post.excerpt.toLowerCase().includes(search.toLowerCase());

      return matchTag && matchSearch;
    });
  }, [activeTag, search]);

  const [featured, ...rest] = filteredPosts;

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: "0 0 0.5rem" }}>Blog</h1>
        <p style={{ color: "#666", margin: 0 }}>
          {POSTS.length} artikel tentang frontend development
        </p>
      </div>

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cari artikel..."
        style={{
          width: "100%",
          padding: "0.6rem 1rem",
          borderRadius: "8px",
          border: "1px solid #ccc",
          fontSize: "1rem",
          marginBottom: "1rem",
          boxSizing: "border-box",
        }}
      />

      {/* Tag filter */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <button
          onClick={() => setActiveTag(null)}
          style={{
            padding: "4px 14px",
            borderRadius: "20px",
            border: "1px solid",
            cursor: "pointer",
            fontSize: "0.8rem",
            background: !activeTag ? "#0070f3" : "transparent",
            color: !activeTag ? "#fff" : "#555",
            borderColor: !activeTag ? "#0070f3" : "#ccc",
          }}
        >
          Semua
        </button>
        {ALL_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag === activeTag ? null : tag)}
            style={{
              padding: "4px 14px",
              borderRadius: "20px",
              border: "1px solid",
              cursor: "pointer",
              fontSize: "0.8rem",
              background: activeTag === tag ? "#0070f3" : "transparent",
              color: activeTag === tag ? "#fff" : "#555",
              borderColor: activeTag === tag ? "#0070f3" : "#ccc",
            }}
          >
            #{tag}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", padding: "3rem 0" }}>
          Tidak ada artikel yang cocok dengan filter.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Featured post pertama */}
          {featured && <PostCard post={featured} variant="featured" />}

          {/* Rest dalam grid */}
          {rest.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {rest.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PostListPage;
```

---

```tsx
// src/features/posts/pages/PostDetailPage.tsx
import { useParams, Link, useNavigate } from "react-router-dom";
import { POSTS } from "../data/posts.data";
import { ROUTES } from "../../../router/routes.constants";

function PostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate  = useNavigate();

  // Cari post berdasarkan slug
  const post = POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 0" }}>
        <h2>Post tidak ditemukan</h2>
        <p style={{ color: "#888" }}>
          Slug <code>"{slug}"</code> tidak ada di database.
        </p>
        <button
          onClick={() => navigate(ROUTES.POSTS)}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1.5rem",
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← Kembali ke Daftar Post
        </button>
      </div>
    );
  }

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <nav style={{ fontSize: "0.85rem", color: "#888", marginBottom: "1.5rem" }}>
        <Link to={ROUTES.HOME} style={{ color: "#888" }}>Home</Link>
        {" / "}
        <Link to={ROUTES.POSTS} style={{ color: "#888" }}>Blog</Link>
        {" / "}
        <span style={{ color: "#333" }}>{post.title}</span>
      </nav>

      {/* Cover image */}
      <img
        src={post.coverImageUrl}
        alt={post.title}
        style={{ width: "100%", height: 320, objectFit: "cover", borderRadius: "12px", marginBottom: "2rem" }}
      />

      {/* Tags */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
        {post.tags.map((tag) => (
          <Link
            key={tag}
            to={`${ROUTES.POSTS}?tag=${tag}`}
            style={{
              fontSize: "0.75rem",
              padding: "2px 10px",
              background: "#e8f4fd",
              color: "#0070f3",
              borderRadius: "20px",
              textDecoration: "none",
            }}
          >
            #{tag}
          </Link>
        ))}
      </div>

      {/* Title */}
      <h1 style={{ fontSize: "2rem", lineHeight: 1.25, margin: "0 0 1rem" }}>
        {post.title}
      </h1>

      {/* Author & Meta */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1rem 0",
          borderTop: "1px solid #eee",
          borderBottom: "1px solid #eee",
          marginBottom: "2rem",
          color: "#666",
          fontSize: "0.9rem",
        }}
      >
        <img
          src={post.author.avatarUrl}
          alt={post.author.name}
          style={{ width: 40, height: 40, borderRadius: "50%" }}
        />
        <div>
          <p style={{ margin: 0, fontWeight: "bold", color: "#333" }}>
            {post.author.name}
          </p>
          <p style={{ margin: 0 }}>
            {formattedDate} · {post.readingTimeMinutes} menit baca
          </p>
        </div>
      </div>

      {/* Content — render sebagai pre-formatted text */}
      <div
        style={{
          lineHeight: 1.8,
          fontSize: "1.05rem",
          color: "#333",
          whiteSpace: "pre-wrap",
          fontFamily: "Georgia, serif",
        }}
      >
        {post.content}
      </div>

      {/* Navigation: prev/next post */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "3rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid #eee",
        }}
      >
        <Link
          to={ROUTES.POSTS}
          style={{ color: "#0070f3", textDecoration: "none" }}
        >
          ← Semua Post
        </Link>
        <Link
          to={ROUTES.WRITE}
          style={{ color: "#0070f3", textDecoration: "none" }}
        >
          Tulis Post Baru →
        </Link>
      </div>
    </article>
  );
}

export default PostDetailPage;
```

---

### Step 4: Write Page (Protected)

```tsx
// src/features/write/pages/WritePostPage.tsx
import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/context/AuthContext";
import { ROUTES } from "../../../router/routes.constants";

function WritePostPage() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [title,   setTitle]   = useState("");
  const [content, setContent] = useState("");
  const [tags,    setTags]    = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    // Di real app: kirim ke API, simpan ke database
    alert(`Post "${title}" berhasil dibuat oleh ${user?.name}!`);
    navigate(ROUTES.POSTS);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1>Tulis Post Baru</h1>
      <p style={{ color: "#888", marginTop: 0 }}>
        Logged in sebagai: <strong>{user?.name}</strong>
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
      >
        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.4rem" }}>
            Judul *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul artikel yang menarik..."
            required
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.4rem" }}>
            Tags (pisahkan dengan koma)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="react, typescript, tutorial"
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontWeight: "bold", marginBottom: "0.4rem" }}>
            Konten *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis konten artikel di sini (Markdown supported)..."
            required
            rows={16}
            style={{
              width: "100%",
              padding: "0.6rem 0.8rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
              fontSize: "0.95rem",
              fontFamily: "monospace",
              lineHeight: 1.6,
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="submit"
            style={{
              padding: "0.6rem 1.5rem",
              background: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
            }}
          >
            Publikasikan
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: "0.6rem 1.5rem",
              background: "transparent",
              color: "#444",
              border: "1px solid #ccc",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

export default WritePostPage;
```

---

### Step 5: AppRouter & App

```tsx
// src/router/AppRouter.tsx
import { Routes, Route } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "./ProtectedRoute";
import { ROUTES } from "./routes.constants";

// Pages
import HomePage from "../pages/HomePage";
import NotFoundPage from "../pages/NotFoundPage";

// Feature pages
import { LoginPage } from "../features/auth";
import { PostListPage, PostDetailPage } from "../features/posts";
import { WritePostPage } from "../features/write";

function AppRouter() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Public routes */}
        <Route path={ROUTES.HOME}        element={<HomePage />} />
        <Route path={ROUTES.POSTS}       element={<PostListPage />} />
        <Route path={ROUTES.POST_DETAIL} element={<PostDetailPage />} />
        <Route path={ROUTES.LOGIN}       element={<LoginPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.WRITE} element={<WritePostPage />} />
        </Route>

        {/* 404 */}
        <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRouter;
```

```tsx
// src/App.tsx
import { AuthProvider } from "./features/auth";
import AppRouter from "./router/AppRouter";

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
```

```tsx
// src/pages/HomePage.tsx
import { Link } from "react-router-dom";
import { POSTS } from "../features/posts/data/posts.data";
import { PostCard } from "../features/posts";
import { ROUTES } from "../router/routes.constants";

function HomePage() {
  const latestPosts = POSTS.slice(0, 2);

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          textAlign: "center",
          padding: "4rem 1rem",
          background: "linear-gradient(135deg, #667eea22, #764ba222)",
          borderRadius: "16px",
          marginBottom: "3rem",
        }}
      >
        <h1 style={{ fontSize: "2.5rem", margin: "0 0 1rem" }}>
          📝 MyBlog
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#555", maxWidth: 500, margin: "0 auto 1.5rem" }}>
          Tempat belajar frontend development — TypeScript, React, dan semua yang ada di antaranya.
        </p>
        <Link
          to={ROUTES.POSTS}
          style={{
            display: "inline-block",
            padding: "0.7rem 2rem",
            background: "#0070f3",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Baca Artikel →
        </Link>
      </section>

      {/* Latest Posts */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Artikel Terbaru</h2>
          <Link to={ROUTES.POSTS} style={{ color: "#0070f3", fontSize: "0.9rem" }}>
            Lihat Semua →
          </Link>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {latestPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
```

---

### Rekap: Konsep yang Dipakai di Mini Project

| Konsep | Implementasi |
|---|---|
| **`<Routes>` & `<Route>`** | `AppRouter.tsx` — semua route definition |
| **`<Link>`** | `PostCard`, `PostDetailPage` — navigasi internal |
| **`<NavLink>` + `isActive`** | `MainLayout.tsx` — highlight menu aktif |
| **`useParams<T>`** | `PostDetailPage` — ambil slug dari URL |
| **`useNavigate()`** | `WritePostPage` (batal), `PostDetailPage` (404), `LoginPage` (redirect) |
| **`useLocation`** | `LoginPage` — baca halaman asal dari state |
| **Nested routes** | `MainLayout` sebagai layout wrapper dengan `<Outlet />` |
| **`<Outlet />`** | `MainLayout.tsx` — slot untuk child routes |
| **Protected Route** | `ProtectedRoute.tsx` — guard dengan redirect + role check |
| **Redirect after login** | `LoginPage` — `navigate(from, { replace: true })` |
| **Route constants** | `routes.constants.ts` — tidak ada magic string |
| **Feature-based structure** | Folder dikelompokkan per fitur (`auth/`, `posts/`, `write/`) |
| **Index file** | Export public API dari setiap feature folder |

---

## Penutup

Sekarang kamu punya fondasi routing yang solid untuk membangun SPA React yang proper:

| Konsep | Kapan Dipakai |
|---|---|
| `<Link>` | Navigasi langsung dari klik user |
| `<NavLink>` | Menu navigasi (butuh active state) |
| `useNavigate()` | Navigasi dari kode (setelah submit, login, dll.) |
| `useParams()` | Baca parameter dinamis dari URL (`:id`, `:slug`) |
| `useSearchParams()` | Baca dan update query string (`?page=2&filter=tech`) |
| `useLocation()` | Baca URL saat ini, baca state yang dibawa Link |
| Nested Routes + `<Outlet>` | Layout yang konsisten di banyak halaman |
| `ProtectedRoute` | Halaman yang butuh autentikasi/otorisasi |

**Langkah selanjutnya:**

1. **React Router Lazy Loading** — `React.lazy()` + `<Suspense>` untuk split bundle per halaman
2. **Data Router (loader & action)** — React Router v6.4+ punya built-in data fetching
3. **Testing Routes** — Unit test protected routes dan navigasi dengan `MemoryRouter`
4. **Absolute Imports** — Setup `@` alias di `tsconfig.json` dan `vite.config.ts` agar tidak ada `../../../`

> **Pesan dari senior dev:** Struktur folder itu bukan agama — tidak ada yang paling benar. Yang penting: **konsisten dalam satu project**, dan **mudah bagi orang baru untuk menemukan file yang mereka cari**. Kalau kamu join project yang sudah jalan dan strukturnya berbeda, ikuti konvensi yang sudah ada. Jangan refactor struktur folder di hari pertama. 😄

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + React Router v6*
