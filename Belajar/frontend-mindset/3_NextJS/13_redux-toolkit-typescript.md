# I. Redux Toolkit + TypeScript di Next.js — Modern Redux, Bukan yang Lama

> **Level:** Intermediate  
> **Estimasi waktu:** 5–7 jam  
> **Stack:** Next.js App Router · Redux Toolkit · RTK Query · TypeScript

---

## Kapan Redux Benar-Benar Dibutuhkan?

Sebelum install Redux, jawab jujur pertanyaan ini:

> *"Apakah state ini perlu dibaca dan diubah oleh banyak komponen yang tidak punya hubungan parent-child langsung, dan perubahan itu harus predictable, traceable, dan testable?"*

Kalau jawabannya **ya** — Redux masuk akal. Kalau tidak, kamu mungkin over-engineering.

### Decision Framework

```
Butuh state management?
│
├── State lokal komponen?
│   └── → useState / useReducer ✅
│
├── Shared state, tapi tree kecil dan jarang update?
│   └── → React Context ✅
│
├── UI state global (sidebar, toast, modal)?
│   └── → Zustand ✅
│
├── Server state (fetch, cache, sync)?
│   └── → TanStack Query ✅
│
└── State yang kompleks, banyak actor yang mengubahnya,
    perlu audit trail, time-travel debugging, atau
    tim besar yang perlu strict pattern?
    └── → Redux Toolkit ✅
```

### Konkretnya, ini skenario di mana Redux masuk akal

| Skenario | Alasannya |
|---|---|
| Aplikasi e-commerce skala besar | Cart, wishlist, checkout state saling berinteraksi |
| Dashboard dengan banyak filter yang interconnected | State filter memengaruhi banyak komponen berbeda |
| Aplikasi dengan undo/redo | Redux DevTools time-travel built-in |
| Tim besar (5+ developer) | Strict pattern = prediktabel, mudah di-review |
| State yang sama dipakai di 10+ komponen | Satu source of truth yang jelas |

### Dan ini skenario di mana Redux **tidak** perlu

| Skenario | Pakai saja |
|---|---|
| Auth state (user login/logout) | Zustand atau Context |
| Fetch & cache data dari API | TanStack Query |
| Dark mode toggle | Zustand + localStorage |
| Form state | React Hook Form |
| Animasi / UI micro-state | useState lokal |

---

## Redux Toolkit vs Zustand — Tabel Keputusan

| | Redux Toolkit | Zustand |
|---|---|---|
| **Bundle size** | ~40kb | ~1kb |
| **Boilerplate** | Sedang (berkurang drastis dari Redux lama) | Sangat minimal |
| **Learning curve** | Lebih curam | Sangat gentle |
| **DevTools** | Redux DevTools (excellent) | Redux DevTools (support) |
| **TypeScript** | First-class, tapi verbose | First-class, sangat ergonomis |
| **Pattern** | Strict (slice, action, reducer) | Bebas |
| **RTK Query** | Built-in, terintegrasi sempurna | Tidak ada (pakai TanStack Query) |
| **Async (Thunk/Saga)** | Built-in | Manual |
| **Cocok untuk** | Tim besar, app kompleks, butuh audit | Tim kecil, prototype, UI state |
| **Tidak cocok untuk** | Project kecil, butuh simplicity | App yang butuh strict structure |

**Kesimpulan sederhana:**
- Kalau kamu ragu-ragu antara keduanya dan project kamu belum enterprise-scale → **Zustand**
- Kalau project kamu sudah kompleks, tim > 5 orang, atau butuh RTK Query → **Redux Toolkit**

---

## Setup Redux Toolkit di Next.js App Router

```bash
npm install @reduxjs/toolkit react-redux
```

### Struktur folder yang akan kita bangun

```
store/
├── index.ts              ← Konfigurasi store utama
├── hooks.ts              ← Typed hooks (useAppDispatch, useAppSelector)
├── provider.tsx          ← StoreProvider untuk App Router
└── slices/
    ├── auth-slice.ts     ← Login state
    └── ui-slice.ts       ← UI state (sidebar, dll)

services/
└── profile-api.ts        ← RTK Query endpoint
```

### Store

```typescript
// store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./slices/auth-slice";
import { uiSlice } from "./slices/ui-slice";
import { profileApi } from "@/services/profile-api";

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    ui: uiSlice.reducer,
    // RTK Query punya reducer sendiri
    [profileApi.reducerPath]: profileApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    // Tambahkan RTK Query middleware — wajib untuk caching dan invalidation
    getDefaultMiddleware().concat(profileApi.middleware),
});

// Tipe-tipe penting yang akan sering kamu pakai
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Typed Hooks

Jangan pernah pakai `useSelector` dan `useDispatch` langsung dari `react-redux` — selalu pakai versi yang sudah di-type.

```typescript
// store/hooks.ts
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./index";

// Gunakan ini di seluruh app, bukan useDispatch biasa
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

// Gunakan ini di seluruh app, bukan useSelector biasa
export const useAppSelector = useSelector.withTypes<RootState>();
```

### StoreProvider

Di App Router, semua provider harus di Client Component.

```tsx
// store/provider.tsx
"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./index";
import type { AppStore } from "./index";

// Export makeStore factory supaya setiap request punya store sendiri
// (penting untuk SSR — hindari shared state antar request)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

Agar ini bisa jalan, update `store/index.ts` sedikit:

```typescript
// store/index.ts (updated)
import { configureStore } from "@reduxjs/toolkit";
import { authSlice } from "./slices/auth-slice";
import { uiSlice } from "./slices/ui-slice";
import { profileApi } from "@/services/profile-api";

// Factory function — penting untuk SSR
export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authSlice.reducer,
      ui: uiSlice.reducer,
      [profileApi.reducerPath]: profileApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(profileApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
```

```tsx
// app/layout.tsx
import { StoreProvider } from "@/store/provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
```

---

## `createSlice` — Jantungnya Redux Toolkit

`createSlice` menghasilkan tiga hal sekaligus: **initial state**, **reducers**, dan **action creators** — semua dari satu definisi.

### Anatomy

```typescript
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CounterState {
  value: number;
  status: "idle" | "loading";
}

const initialState: CounterState = {
  value: 0,
  status: "idle",
};

const counterSlice = createSlice({
  name: "counter",            // ← prefix action type: "counter/increment"
  initialState,
  reducers: {
    // PayloadAction<T> untuk typing payload
    increment: (state) => {
      state.value += 1;       // ← Immer di balik layar, mutasi langsung aman
    },
    decrement: (state) => {
      state.value -= 1;
    },
    setStatus: (state, action: PayloadAction<"idle" | "loading">) => {
      state.status = action.payload;
    },
    addByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

// Ekspor action creators
export const { increment, decrement, setStatus, addByAmount } =
  counterSlice.actions;

// Ekspor reducer untuk store
export { counterSlice };
```

> **Immer di balik layar:** Redux Toolkit sudah include Immer. Artinya kamu bisa "mutasi" state langsung di reducer (`state.value += 1`) dan itu akan menghasilkan state baru yang immutable. Tidak perlu spread operator.

### Redux yang lama vs RTK

```typescript
// ❌ Redux lama — verbose, rawan typo
const INCREMENT = "counter/increment";
const ADD_BY_AMOUNT = "counter/addByAmount";

function counterReducer(state = initialState, action) {
  switch (action.type) {
    case INCREMENT:
      return { ...state, value: state.value + 1 };
    case ADD_BY_AMOUNT:
      return { ...state, value: state.value + action.payload };
    default:
      return state;
  }
}

function increment() { return { type: INCREMENT }; }
function addByAmount(amount) { return { type: ADD_BY_AMOUNT, payload: amount }; }

// ✅ RTK — ringkas, type-safe, Immer built-in
const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    increment: (state) => { state.value += 1; },
    addByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});
```

---

## `useAppSelector` dan `useAppDispatch`

```tsx
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { increment, addByAmount } from "@/store/slices/counter-slice";

function Counter() {
  const dispatch = useAppDispatch();

  // TypeScript tahu shape RootState — autocomplete bekerja
  const value = useAppSelector((state) => state.counter.value);
  const status = useAppSelector((state) => state.counter.status);

  return (
    <div>
      <p>Count: {value}</p>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(addByAmount(5))}>+5</button>
    </div>
  );
}
```

---

## Selector Pattern untuk Performa

Jangan taruh transformasi data di komponen. Gunakan **selector** — fungsi yang mengambil potongan state dari store.

### Selector inline vs selector terdefinisi

```tsx
// ❌ Jangan: transformasi di komponen — re-compute setiap render
function AdminUserList() {
  const adminUsers = useAppSelector((state) =>
    state.users.list.filter((u) => u.role === "admin") // array baru tiap render!
  );
}

// ✅ Lakukan: definisikan selector di luar komponen
// auth-slice.ts
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsLoggedIn = (state: RootState) => state.auth.user !== null;
export const selectUserRole = (state: RootState) => state.auth.user?.role;

// Di komponen
function Header() {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const user = useAppSelector(selectCurrentUser);
  // ...
}
```

### Memoized Selector dengan `createSelector`

Untuk selector yang melakukan komputasi berat, gunakan `createSelector` dari RTK (re-export dari Reselect). Hasilnya di-memoize — hanya dihitung ulang kalau input berubah.

```typescript
// store/slices/users-slice.ts
import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../index";

// Selector input (base selectors — murah)
const selectUsers = (state: RootState) => state.users.list;
const selectFilterRole = (state: RootState) => state.users.filterRole;
const selectSearchQuery = (state: RootState) => state.users.searchQuery;

// Selector memoized — hasil dihitung ulang HANYA saat users, filterRole,
// atau searchQuery berubah. Bukan setiap render.
export const selectFilteredUsers = createSelector(
  [selectUsers, selectFilterRole, selectSearchQuery],
  (users, role, query) => {
    let result = users;

    if (role !== "all") {
      result = result.filter((u) => u.role === role);
    }

    if (query) {
      const lower = query.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower)
      );
    }

    return result;
  }
);

// Selector dengan parameter — pakai factory function
export const selectUserById = (userId: string) =>
  createSelector(
    selectUsers,
    (users) => users.find((u) => u.id === userId)
  );
```

```tsx
// Di komponen
function UserTable() {
  const filteredUsers = useAppSelector(selectFilteredUsers);
  // Hanya re-render kalau filteredUsers benar-benar berubah
}

function UserDetail({ userId }: { userId: string }) {
  const user = useAppSelector(selectUserById(userId));
}
```

---

## RTK Query — Fetching Terintegrasi Redux

RTK Query adalah solusi data fetching bawaan Redux Toolkit. Dia terintegrasi langsung dengan Redux store — data hasil fetch masuk ke Redux state, bukan state terpisah.

Kapan pakai RTK Query **vs** TanStack Query?
- Kamu sudah pakai Redux Toolkit → **RTK Query** (one ecosystem)
- Kamu tidak pakai Redux → **TanStack Query**

### Definisi API

```typescript
// services/profile-api.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { User, UpdateProfileInput } from "@/types";

export const profileApi = createApi({
  reducerPath: "profileApi",     // ← kunci di Redux store
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    // Tambahkan auth header otomatis
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Profile", "Users"], // ← untuk cache invalidation
  endpoints: (builder) => ({
    // GET /api/profile
    getProfile: builder.query<User, void>({
      query: () => "/profile",
      providesTags: ["Profile"],
    }),

    // GET /api/users/:id
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: "Users", id }],
    }),

    // GET /api/users
    getUsers: builder.query<User[], void>({
      query: () => "/users",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Users" as const, id })),
              { type: "Users", id: "LIST" },
            ]
          : [{ type: "Users", id: "LIST" }],
    }),

    // PUT /api/profile
    updateProfile: builder.mutation<User, UpdateProfileInput>({
      query: (data) => ({
        url: "/profile",
        method: "PUT",
        body: data,
      }),
      // Setelah update berhasil, invalidasi cache Profile
      invalidatesTags: ["Profile"],
    }),
  }),
});

// Export hooks yang di-generate otomatis — nama: use + EndpointName + Query/Mutation
export const {
  useGetProfileQuery,
  useGetUserByIdQuery,
  useGetUsersQuery,
  useUpdateProfileMutation,
} = profileApi;
```

### Pakai di komponen

```tsx
function ProfilePage() {
  // Persis seperti useQuery TanStack, tapi terintegrasi Redux
  const { data: profile, isLoading, isError, error } = useGetProfileQuery();

  if (isLoading) return <ProfileSkeleton />;
  if (isError) return <p>Error: {(error as Error).message}</p>;
  if (!profile) return null;

  return (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.email}</p>
    </div>
  );
}

function EditProfileForm({ currentProfile }: { currentProfile: User }) {
  const [updateProfile, { isLoading, isError, error }] =
    useUpdateProfileMutation();

  async function handleSubmit(data: UpdateProfileInput) {
    try {
      await updateProfile(data).unwrap(); // .unwrap() throw error kalau gagal
      toast.success("Profil berhasil diperbarui!");
    } catch (err) {
      // Error ditangani di isError + error juga, tapi .unwrap() redirect ke catch
    }
  }

  return <form onSubmit={...}>...</form>;
}
```

### Conditional fetch dengan `skip`

```tsx
function UserProfile({ userId }: { userId: string | null }) {
  const { data } = useGetUserByIdQuery(userId ?? "", {
    skip: userId === null, // ← jangan fetch kalau userId null
  });

  return <div>{data?.name}</div>;
}
```

---

## Anti-Pattern Redux yang Harus Dihindari

### 1. Taruh semua state ke Redux

```tsx
// ❌ Over-kill — form state tidak perlu Redux
const formSlice = createSlice({
  name: "form",
  initialState: { username: "", password: "" },
  reducers: {
    setUsername: (state, action) => { state.username = action.payload; },
    setPassword: (state, action) => { state.password = action.payload; },
  }
});

// ✅ useState lokal sudah lebih dari cukup
function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
}
```

### 2. Fetch data di Redux Thunk kalau sudah pakai RTK Query

```typescript
// ❌ Jangan ini kalau punya RTK Query
export const fetchProfile = createAsyncThunk(
  "auth/fetchProfile",
  async () => {
    const res = await fetch("/api/profile");
    return res.json();
  }
);

// ✅ Pakai RTK Query — sudah punya caching, loading state, polling, dll
const { data: profile } = useGetProfileQuery();
```

### 3. Selector di dalam komponen

```tsx
// ❌ Transformasi inline — computed ulang setiap render
const expensiveList = useAppSelector((state) =>
  state.items.list
    .filter(item => item.active)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
);

// ✅ createSelector — memoized, re-compute hanya saat input slice berubah
export const selectTopActiveItems = createSelector(
  (state: RootState) => state.items.list,
  (items) =>
    items
      .filter((item) => item.active)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
);
```

### 4. Mutasi state langsung di luar Redux

```tsx
// ❌ Mutasi state Redux dari luar reducer
function Component() {
  const user = useAppSelector(state => state.auth.user);
  user.name = "Hacked"; // Ini anti-pattern, state akan korup
}

// ✅ Selalu lewat dispatch + action
dispatch(updateUserName("Budi"));
```

### 5. Slice yang terlalu besar

```typescript
// ❌ Satu slice untuk semua hal
const appSlice = createSlice({
  name: "app",
  initialState: { user: null, posts: [], comments: [], ui: {} },
  reducers: { /* 30+ reducers */ }
});

// ✅ Pisahkan berdasarkan domain
// auth-slice.ts   → user, token, isLoggedIn
// posts-slice.ts  → posts, pagination
// ui-slice.ts     → sidebar, modal, toast
```

### 6. Dispatch di dalam reducer

```typescript
// ❌ Dispatch aksi lain di dalam reducer — tidak pernah lakukan ini
reducers: {
  login: (state, action) => {
    state.user = action.payload;
    dispatch(fetchProfile()); // Redux akan error/crash
  }
}

// ✅ Gunakan extraReducers atau middleware untuk side effects
```

---

## Mini Project: Auth + User Dashboard

Kita bangun ini:
- Login form → dispatch ke `authSlice`
- Dashboard yang hanya bisa diakses kalau sudah login
- Ambil profil user pakai RTK Query
- Tabel user dengan filter yang disimpan di Redux

### Types

```typescript
// types/index.ts
export type UserRole = "admin" | "user" | "guest";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface UpdateProfileInput {
  name: string;
  email: string;
}
```

### Auth Slice

```typescript
// store/slices/auth-slice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, LoginCredentials, LoginResponse, User } from "@/types";
import type { RootState } from "../index";

// Mock login API
async function loginApi(credentials: LoginCredentials): Promise<LoginResponse> {
  await new Promise((r) => setTimeout(r, 800));

  if (
    credentials.email === "admin@example.com" &&
    credentials.password === "password"
  ) {
    return {
      user: {
        id: "1",
        name: "Budi Santoso",
        email: "admin@example.com",
        role: "admin",
      },
      token: "mock-jwt-token-xyz",
    };
  }

  throw new Error("Email atau password salah");
}

// Async thunk untuk login
export const loginThunk = createAsyncThunk(
  "auth/login",
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      return await loginApi(credentials);
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    // Update data user lokal (setelah edit profil berhasil)
    updateLocalUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  // extraReducers untuk handle async thunk
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, clearError, updateLocalUser } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsLoggedIn = (state: RootState) => state.auth.user !== null;
export const selectAuthIsLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;
export const selectToken = (state: RootState) => state.auth.token;
export const selectUserRole = (state: RootState) => state.auth.user?.role;
export const selectIsAdmin = (state: RootState) =>
  state.auth.user?.role === "admin";
```

### UI Slice

```typescript
// store/slices/ui-slice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../index";
import type { UserRole } from "@/types";

interface UIState {
  isSidebarOpen: boolean;
  usersFilterRole: UserRole | "all";
  usersSearchQuery: string;
}

const initialState: UIState = {
  isSidebarOpen: true,
  usersFilterRole: "all",
  usersSearchQuery: "",
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setUsersFilterRole: (
      state,
      action: PayloadAction<UserRole | "all">
    ) => {
      state.usersFilterRole = action.payload;
    },
    setUsersSearchQuery: (state, action: PayloadAction<string>) => {
      state.usersSearchQuery = action.payload;
    },
    resetUsersFilter: (state) => {
      state.usersFilterRole = "all";
      state.usersSearchQuery = "";
    },
  },
});

export const {
  toggleSidebar,
  setUsersFilterRole,
  setUsersSearchQuery,
  resetUsersFilter,
} = uiSlice.actions;

export const selectIsSidebarOpen = (state: RootState) =>
  state.ui.isSidebarOpen;
export const selectUsersFilterRole = (state: RootState) =>
  state.ui.usersFilterRole;
export const selectUsersSearchQuery = (state: RootState) =>
  state.ui.usersSearchQuery;
```

### RTK Query — Profile API

```typescript
// services/profile-api.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { User, UpdateProfileInput } from "@/types";
import type { RootState } from "@/store";

// Mock users data
const MOCK_USERS: User[] = [
  { id: "1", name: "Budi Santoso", email: "admin@example.com", role: "admin" },
  { id: "2", name: "Siti Aminah", email: "siti@example.com", role: "user" },
  { id: "3", name: "Reza Pratama", email: "reza@example.com", role: "user" },
  { id: "4", name: "Dewi Kusuma", email: "dewi@example.com", role: "guest" },
];

export const profileApi = createApi({
  reducerPath: "profileApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["Profile"],
  endpoints: (builder) => ({
    getProfile: builder.query<User, void>({
      queryFn: async (_, { getState }) => {
        // Mock: ambil user dari auth state
        await new Promise((r) => setTimeout(r, 600));
        const user = (getState() as RootState).auth.user;
        if (!user) return { error: { status: 401, data: "Unauthorized" } };
        return { data: user };
      },
      providesTags: ["Profile"],
    }),

    getUsers: builder.query<User[], void>({
      queryFn: async () => {
        await new Promise((r) => setTimeout(r, 700));
        return { data: MOCK_USERS };
      },
    }),

    updateProfile: builder.mutation<User, UpdateProfileInput>({
      queryFn: async (input, { getState }) => {
        await new Promise((r) => setTimeout(r, 500));
        const user = (getState() as RootState).auth.user;
        if (!user) return { error: { status: 401, data: "Unauthorized" } };
        const updated: User = { ...user, ...input };
        return { data: updated };
      },
      invalidatesTags: ["Profile"],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useGetUsersQuery,
  useUpdateProfileMutation,
} = profileApi;
```

### Komponen Login

```tsx
// components/auth/LoginForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loginThunk, clearError, selectAuthIsLoading, selectAuthError, selectIsLoggedIn } from "@/store/slices/auth-slice";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const isLoading = useAppSelector(selectAuthIsLoading);
  const error = useAppSelector(selectAuthError);
  const isLoggedIn = useAppSelector(selectIsLoggedIn);

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password");

  // Redirect kalau sudah login
  useEffect(() => {
    if (isLoggedIn) router.push("/dashboard");
  }, [isLoggedIn, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch(loginThunk({ email, password }));
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Masuk ke dashboard admin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) dispatch(clearError());
              }}
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) dispatch(clearError());
              }}
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? "Masuk..." : "Masuk"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            Hint: admin@example.com / password
          </p>
        </form>
      </div>
    </div>
  );
}
```

### Auth Guard

```tsx
// components/auth/AuthGuard.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { selectIsLoggedIn } from "@/store/slices/auth-slice";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  return <>{children}</>;
}
```

### Komponen Profil

```tsx
// components/dashboard/ProfileCard.tsx
"use client";

import { useGetProfileQuery, useUpdateProfileMutation } from "@/services/profile-api";
import { useAppDispatch } from "@/store/hooks";
import { updateLocalUser } from "@/store/slices/auth-slice";
import { useState } from "react";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileCard() {
  const dispatch = useAppDispatch();
  const { data: profile, isLoading, isError } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");

  function startEdit() {
    setName(profile?.name ?? "");
    setIsEditing(true);
  }

  async function handleSave() {
    if (!profile) return;
    try {
      const updated = await updateProfile({
        name,
        email: profile.email,
      }).unwrap();

      // Sync ke auth state juga
      dispatch(updateLocalUser({ name: updated.name }));
      setIsEditing(false);
    } catch {
      // error di-handle oleh state RTK Query
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6 space-y-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-destructive text-sm">
        Gagal memuat profil.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
          {profile.name.charAt(0)}
        </div>
        <div className="flex-1">
          {isEditing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border px-2 py-1 text-sm font-medium w-full"
              autoFocus
            />
          ) : (
            <p className="font-semibold">{profile.name}</p>
          )}
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>

        <div className="flex gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="rounded p-1.5 hover:bg-accent"
                aria-label="Simpan perubahan"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 text-emerald-500" />
                )}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded p-1.5 hover:bg-accent"
                aria-label="Batal edit"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={startEdit}
              className="rounded p-1.5 hover:bg-accent text-muted-foreground"
              aria-label="Edit nama profil"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Role:</span>
        <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium capitalize">
          {profile.role}
        </span>
      </div>
    </div>
  );
}
```

### Dashboard Layout + Logout

```tsx
// components/dashboard/DashboardLayout.tsx
"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout, selectCurrentUser, selectIsAdmin } from "@/store/slices/auth-slice";
import { toggleSidebar, selectIsSidebarOpen } from "@/store/slices/ui-slice";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Users, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector(selectCurrentUser);
  const isAdmin = useAppSelector(selectIsAdmin);
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);

  function handleLogout() {
    dispatch(logout());
    router.push("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-background transition-all duration-300",
          isSidebarOpen ? "w-56" : "w-14"
        )}
      >
        <div className="flex h-14 items-center border-b px-3">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="rounded p-1.5 hover:bg-accent"
            aria-label={isSidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
          >
            <Menu className="h-4 w-4" />
          </button>
          {isSidebarOpen && (
            <span className="ml-2 font-semibold text-sm">Admin</span>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {isSidebarOpen && "Dashboard"}
          </Link>

          {/* Hanya admin yang lihat menu Users */}
          {isAdmin && (
            <Link
              href="/dashboard/users"
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Users className="h-4 w-4 shrink-0" />
              {isSidebarOpen && "Users"}
            </Link>
          )}
        </nav>

        <div className="border-t p-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {isSidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
```

### Halaman Dashboard

```tsx
// app/dashboard/page.tsx
"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProfileCard } from "@/components/dashboard/ProfileCard";
import { useAppSelector } from "@/store/hooks";
import { selectCurrentUser } from "@/store/slices/auth-slice";

export default function DashboardPage() {
  const user = useAppSelector(selectCurrentUser);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold">
              Selamat datang, {user?.name} 👋
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Ini adalah dashboard kamu.
            </p>
          </div>

          <ProfileCard />
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
```

### Halaman Users (khusus admin)

```tsx
// app/dashboard/users/page.tsx
"use client";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useGetUsersQuery } from "@/services/profile-api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectUsersFilterRole,
  selectUsersSearchQuery,
  setUsersFilterRole,
  setUsersSearchQuery,
  resetUsersFilter,
} from "@/store/slices/ui-slice";
import { selectIsAdmin } from "@/store/slices/auth-slice";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isAdmin = useAppSelector(selectIsAdmin);

  const filterRole = useAppSelector(selectUsersFilterRole);
  const searchQuery = useAppSelector(selectUsersSearchQuery);

  const { data: users, isLoading, isError } = useGetUsersQuery();

  // Redirect kalau bukan admin
  if (!isAdmin) {
    router.push("/dashboard");
    return null;
  }

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let result = users;

    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower)
      );
    }

    return result;
  }, [users, filterRole, searchQuery]);

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="space-y-5">
          <h1 className="text-2xl font-bold">Users</h1>

          {/* Filter toolbar */}
          <div className="flex gap-3 flex-wrap">
            <input
              value={searchQuery}
              onChange={(e) =>
                dispatch(setUsersSearchQuery(e.target.value))
              }
              placeholder="Cari nama atau email..."
              className="rounded-md border px-3 py-1.5 text-sm w-64"
              aria-label="Cari user"
            />
            <select
              value={filterRole}
              onChange={(e) =>
                dispatch(setUsersFilterRole(e.target.value as UserRole | "all"))
              }
              className="rounded-md border px-3 py-1.5 text-sm"
              aria-label="Filter role"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="guest">Guest</option>
            </select>
            {(filterRole !== "all" || searchQuery !== "") && (
              <button
                onClick={() => dispatch(resetUsersFilter())}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Reset filter
              </button>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <p className="text-destructive text-sm" role="alert">
              Gagal memuat users.
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Nama</th>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Tidak ada user yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{user.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs capitalize">
                            {user.role}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-muted-foreground" aria-live="polite">
            Menampilkan {filteredUsers.length} dari {users?.length ?? 0} user
          </p>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
```

---

## Alur Data — Dari Klik Login Sampai Dashboard Tampil

```
User isi form & klik "Masuk"
        │
        ▼
dispatch(loginThunk({ email, password }))
        │
        ├─ loginThunk.pending → isLoading = true, error = null
        │
        ├─ loginApi() dipanggil (mock / fetch ke /api/auth)
        │
        ├─ loginThunk.fulfilled → user = {...}, token = "..."
        │   isLoading = false
        │
        └─ loginThunk.rejected → error = "Email atau password salah"
                                  isLoading = false

Setelah fulfilled:
        │
        ▼
useEffect di LoginForm melihat isLoggedIn = true
        │
        ▼
router.push("/dashboard")
        │
        ▼
DashboardPage render → useGetProfileQuery() dijalankan
        │
        ├─ Cache miss → fetch ke /api/profile
        │
        └─ Data masuk ke profileApi state di Redux store
           Komponen ProfileCard re-render dengan data
```

---

## Cheatsheet

```
createSlice
├── name          → prefix action type
├── initialState  → state awal dengan TypeScript interface
├── reducers      → sync reducers (Immer built-in, mutasi langsung aman)
└── extraReducers → handle async thunk (pending/fulfilled/rejected)

createAsyncThunk
├── Arg 1: action type string "slice/actionName"
├── Arg 2: async payloadCreator(arg, thunkAPI)
└── rejectWithValue(value) → payload di .rejected

createSelector
├── Input selectors (array)
└── Output selector (hasil transformasi, di-memoize)

RTK Query createApi
├── reducerPath   → kunci di store
├── baseQuery     → konfigurasi base URL + headers
├── tagTypes      → untuk cache invalidation
└── endpoints     → builder.query / builder.mutation
    ├── providesTags   → deklarasi cache tag yang dihasilkan
    └── invalidatesTags → cache tag yang dihapus setelah mutasi
```

---

## Langkah Selanjutnya

1. **Persist Redux state** — pakai `redux-persist` supaya auth state tidak hilang saat refresh
2. **RTK Query + Next.js SSR** — prefetch RTK Query di Server Component, hydrate di client
3. **Optimistic update di RTK Query** — pakai `onQueryStarted` + `updateQueryData`
4. **Testing** — slice sangat mudah di-unit test karena pure reducer; gunakan `@reduxjs/toolkit` `configureStore` untuk setup test store
