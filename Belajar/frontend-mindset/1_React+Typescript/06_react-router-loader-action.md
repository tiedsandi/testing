# React Router v6.4+ Data Fetching: Loader, Action, & Defer

> **Prerequisite:** Sudah baca [05_react-router-folder-structure.md](./05_react-router-folder-structure.md) — paham routing dasar, useNavigate, useParams, Protected Routes. Ini lanjutannya, fokus ke **data fetching** yang proper tanpa `useEffect`.

---

## Daftar Isi

1. [Masalah dengan useEffect untuk Data Fetching](#1-masalah-dengan-useeffect-untuk-data-fetching)
2. [createBrowserRouter: Cara Baru Definisi Route](#2-createbrowserrouter-cara-baru-definisi-route)
3. [Loader: Fetch Data Sebelum Render](#3-loader-fetch-data-sebelum-render)
4. [useLoaderData: Akses Data dari Loader](#4-useloaderdata-akses-data-dari-loader)
5. [Action: Handle Form Submit & Mutations](#5-action-handle-form-submit--mutations)
6. [useActionData & Redirect](#6-useactiondata--redirect)
7. [Form Component: Pengganti form HTML Biasa](#7-form-component-pengganti-form-html-biasa)
8. [ErrorBoundary: Handle Error di Route](#8-errorboundary-handle-error-di-route)
9. [Defer & Await: Streaming Data untuk UX Lebih Baik](#9-defer--await-streaming-data-untuk-ux-lebih-baik)
10. [useNavigation: Loading State Global](#10-usenavigation-loading-state-global)
11. [useFetcher: Submit Form Tanpa Navigasi](#11-usefetcher-submit-form-tanpa-navigasi)
12. [Mini Project: Product Management dengan CRUD Lengkap](#12-mini-project-product-management-dengan-crud-lengkap)
13. [Migration Guide: BrowserRouter → createBrowserRouter](#13-migration-guide-browserrouter--createbrowserrouter)

---

## 1. Masalah dengan useEffect untuk Data Fetching

Ini pola yang hampir semua orang tulis pertama kali:

```tsx
// ❌ CARA LAMA — banyak masalah
function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => setProduct(data))
      .catch((err) => setError(err))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!product) return <p>Product not found</p>;

  return <div>{product.name}</div>;
}
```

### Masalahnya:

**1. Race Condition**
```
User klik product ID 1 → fetch mulai (500ms)
User klik product ID 2 → fetch mulai (200ms)
Fetch ID 2 selesai duluan → tampil product 2
Fetch ID 1 selesai belakangan → TIMPA jadi product 1

User klik product 2, tapi yang muncul product 1 ❌
```

**2. Component Render Tanpa Data**
```
1. Component mount → render "Loading..."
2. useEffect run → fetch API
3. Data datang → re-render dengan data

User lihat layout shift — loading skeleton dulu, baru konten.
```

**3. Error Handling yang Berantakan**
- Kalau API error, kamu perlu state `error` + UI untuk tampilkan error
- Kalau komponen unmount sebelum fetch selesai, kamu dapat warning
- Perlu cleanup manual dengan `AbortController`

**4. Loading State Per Komponen**
- Setiap halaman punya loading state sendiri-sendiri
- Tidak ada global loading indicator saat navigasi (seperti bar loading di top)

---

### Solusi: React Router v6.4+ Data API

React Router v6.4+ memperkenalkan **loader** dan **action** — konsep yang mirip dengan Next.js, tapi untuk React SPA.

```tsx
// ✅ CARA BARU — data siap sebelum component render
import { useLoaderData } from "react-router-dom";

// Loader: fetch SEBELUM component render
export async function productDetailLoader({ params }: LoaderFunctionArgs) {
  const product = await fetch(`/api/products/${params.id}`).then((r) => r.json());
  if (!product) throw new Response("Not Found", { status: 404 });
  return product;
}

// Component: data sudah ready, tinggal pakai
function ProductDetailPage() {
  const product = useLoaderData() as Product;
  return <div>{product.name}</div>;
}
```

**Keuntungan:**
- ✅ Data fetch **sebelum** component render — tidak ada loading state di component
- ✅ Error handling dengan `errorElement` — centralized, tidak manual di tiap component
- ✅ Race condition solved — React Router handle cancelation otomatis
- ✅ Global loading state dengan `useNavigation()`
- ✅ Type-safe dengan TypeScript

---

## 2. createBrowserRouter: Cara Baru Definisi Route

Di doc sebelumnya kita pakai `<BrowserRouter>` + `<Routes>`. Untuk pakai loader/action, kita harus migrasi ke **`createBrowserRouter`**.

### Setup di main.tsx

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
```

### Definisi Routes di File Terpisah

```tsx
// src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import ProductListPage, { productListLoader } from "./pages/ProductListPage";
import ProductDetailPage, { productDetailLoader } from "./pages/ProductDetailPage";
import CreateProductPage, { createProductAction } from "./pages/CreateProductPage";
import ErrorPage from "./pages/ErrorPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <ErrorPage />, // Error boundary untuk semua child routes
    children: [
      {
        index: true, // sama seperti path: ""
        element: <HomePage />,
      },
      {
        path: "products",
        element: <ProductListPage />,
        loader: productListLoader, // ← fetch list sebelum render
      },
      {
        path: "products/:id",
        element: <ProductDetailPage />,
        loader: productDetailLoader, // ← fetch detail sebelum render
      },
      {
        path: "products/new",
        element: <CreateProductPage />,
        action: createProductAction, // ← handle form submit
      },
    ],
  },
]);
```

**Bedanya dengan `<Routes>`:**

| `<BrowserRouter>` + `<Routes>` | `createBrowserRouter` |
|---|---|
| JSX-based route definition | Object-based route definition |
| Tidak support `loader` & `action` | Support semua Data API |
| Error handling manual | Built-in `errorElement` |
| Tidak ada global loading state | Support `useNavigation()` |
| Route definition di component | Route definition di file terpisah |

---

## 3. Loader: Fetch Data Sebelum Render

**Loader** adalah function yang **run sebelum component render**. Think of it as "data yang harus ready sebelum halaman muncul".

### 3.1 Basic Loader

```tsx
// src/pages/ProductListPage.tsx
import { useLoaderData, type LoaderFunctionArgs } from "react-router-dom";

// Type untuk data yang direturn loader
type Product = {
  id: number;
  name: string;
  price: number;
};

// Loader function — export agar bisa dipakai di router
export async function productListLoader() {
  const response = await fetch("/api/products");
  if (!response.ok) {
    throw new Response("Failed to fetch products", { status: 500 });
  }
  const products: Product[] = await response.json();
  return products;
}

// Component — data sudah ready dari loader
export default function ProductListPage() {
  const products = useLoaderData() as Product[];

  return (
    <div>
      <h1>Products</h1>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            {product.name} — ${product.price}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3.2 Loader dengan Params

```tsx
// src/pages/ProductDetailPage.tsx
import { useLoaderData, type LoaderFunctionArgs } from "react-router-dom";

type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
};

// Loader dapat akses params dari URL
export async function productDetailLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  
  const response = await fetch(`/api/products/${id}`);
  if (!response.ok) {
    // Throw Response untuk trigger errorElement
    throw new Response("Product not found", { status: 404 });
  }
  
  const product: Product = await response.json();
  return product;
}

export default function ProductDetailPage() {
  const product = useLoaderData() as Product;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>Price: ${product.price}</p>
      <p>{product.description}</p>
    </div>
  );
}
```

### 3.3 Loader dengan Multiple Fetch (Parallel)

```tsx
// src/pages/DashboardPage.tsx
import { useLoaderData } from "react-router-dom";

type DashboardData = {
  products: Product[];
  orders: Order[];
  stats: Stats;
};

export async function dashboardLoader() {
  // Fetch parallel — lebih cepat daripada sequential
  const [productsRes, ordersRes, statsRes] = await Promise.all([
    fetch("/api/products"),
    fetch("/api/orders"),
    fetch("/api/stats"),
  ]);

  const [products, orders, stats] = await Promise.all([
    productsRes.json(),
    ordersRes.json(),
    statsRes.json(),
  ]);

  return { products, orders, stats };
}

export default function DashboardPage() {
  const { products, orders, stats } = useLoaderData() as DashboardData;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Products: {products.length}</p>
      <p>Total Orders: {orders.length}</p>
      <p>Revenue: ${stats.revenue}</p>
    </div>
  );
}
```

### 3.4 Type-Safe Loader dengan TypeScript

```tsx
// src/pages/ProductDetailPage.tsx
import { useLoaderData, type LoaderFunctionArgs } from "react-router-dom";

type Product = {
  id: number;
  name: string;
  price: number;
};

// Return type explicit
export async function productDetailLoader({ params }: LoaderFunctionArgs): Promise<Product> {
  const response = await fetch(`/api/products/${params.id}`);
  if (!response.ok) throw new Response("Not found", { status: 404 });
  return response.json();
}

export default function ProductDetailPage() {
  // Type inference otomatis dari loader return type
  const product = useLoaderData() as Awaited<ReturnType<typeof productDetailLoader>>;
  //    ^ Product type

  return <h1>{product.name}</h1>;
}
```

---

## 4. useLoaderData: Akses Data dari Loader

Hook `useLoaderData()` mengambil data yang direturn oleh loader **di route yang sama**.

```tsx
import { useLoaderData } from "react-router-dom";

export default function ProductDetailPage() {
  const product = useLoaderData() as Product;
  // Data ini dari productDetailLoader yang didefinisi di router
  
  return <div>{product.name}</div>;
}
```

### Akses Loader Data di Child Component

```tsx
// Parent component
export default function ProductDetailPage() {
  const product = useLoaderData() as Product;
  
  return (
    <div>
      <ProductHeader product={product} />
      <ProductDescription product={product} />
    </div>
  );
}

// Child component — perlu terima via props
function ProductHeader({ product }: { product: Product }) {
  return <h1>{product.name}</h1>;
}
```

Atau, child component bisa panggil `useLoaderData()` langsung:

```tsx
// Child component — panggil useLoaderData langsung
function ProductHeader() {
  const product = useLoaderData() as Product;
  return <h1>{product.name}</h1>;
}
```

**Catatan:** `useLoaderData()` hanya bisa dipanggil di component yang **di-render oleh route** atau **child dari component route**. Tidak bisa di component yang di luar route tree.

---

## 5. Action: Handle Form Submit & Mutations

**Action** adalah function yang handle **POST/PUT/DELETE** — semua yang mengubah data.

### 5.1 Basic Action — Create Product

```tsx
// src/pages/CreateProductPage.tsx
import { Form, redirect, type ActionFunctionArgs } from "react-router-dom";

type FormErrors = {
  name?: string;
  price?: string;
};

// Action function — handle form submission
export async function createProductAction({ request }: ActionFunctionArgs) {
  // Parse form data
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const price = formData.get("price") as string;

  // Validasi
  const errors: FormErrors = {};
  if (!name || name.trim().length < 3) {
    errors.name = "Name must be at least 3 characters";
  }
  if (!price || isNaN(Number(price)) || Number(price) <= 0) {
    errors.price = "Price must be a positive number";
  }

  // Kalau ada error, return ke form
  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  // Submit ke API
  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price: Number(price) }),
  });

  if (!response.ok) {
    return { errors: { name: "Failed to create product" } };
  }

  const product = await response.json();

  // Redirect ke detail page setelah berhasil
  return redirect(`/products/${product.id}`);
}

export default function CreateProductPage() {
  return (
    <div>
      <h1>Create Product</h1>
      
      {/* Form component dari react-router — bukan <form> biasa */}
      <Form method="post">
        <div>
          <label htmlFor="name">Name:</label>
          <input type="text" id="name" name="name" required />
        </div>
        
        <div>
          <label htmlFor="price">Price:</label>
          <input type="number" id="price" name="price" step="0.01" required />
        </div>
        
        <button type="submit">Create</button>
      </Form>
    </div>
  );
}
```

### 5.2 Action dengan Validasi & Error Display

```tsx
// src/pages/CreateProductPage.tsx
import { Form, useActionData, redirect, type ActionFunctionArgs } from "react-router-dom";

type ActionData = {
  errors?: {
    name?: string;
    price?: string;
  };
};

export async function createProductAction({ request }: ActionFunctionArgs): Promise<ActionData | Response> {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const price = formData.get("price") as string;

  const errors: ActionData["errors"] = {};
  
  if (!name?.trim()) {
    errors.name = "Name is required";
  } else if (name.trim().length < 3) {
    errors.name = "Name must be at least 3 characters";
  }

  if (!price) {
    errors.price = "Price is required";
  } else if (isNaN(Number(price)) || Number(price) <= 0) {
    errors.price = "Price must be a positive number";
  }

  if (errors.name || errors.price) {
    return { errors };
  }

  const response = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price: Number(price) }),
  });

  if (!response.ok) {
    return { errors: { name: "Server error. Please try again." } };
  }

  const product = await response.json();
  return redirect(`/products/${product.id}`);
}

export default function CreateProductPage() {
  // Akses data yang direturn action (errors)
  const actionData = useActionData() as ActionData | undefined;
  const errors = actionData?.errors;

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto" }}>
      <h1>Create Product</h1>
      
      <Form method="post" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label htmlFor="name">Product Name</label>
          <input
            type="text"
            id="name"
            name="name"
            style={{ width: "100%", padding: "0.5rem", fontSize: "1rem" }}
          />
          {errors?.name && (
            <p style={{ color: "red", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="price">Price ($)</label>
          <input
            type="number"
            id="price"
            name="price"
            step="0.01"
            style={{ width: "100%", padding: "0.5rem", fontSize: "1rem" }}
          />
          {errors?.price && (
            <p style={{ color: "red", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
              {errors.price}
            </p>
          )}
        </div>

        <button
          type="submit"
          style={{
            padding: "0.75rem",
            fontSize: "1rem",
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Create Product
        </button>
      </Form>
    </div>
  );
}
```

### 5.3 Update & Delete Actions

```tsx
// src/pages/EditProductPage.tsx
import { Form, useLoaderData, useActionData, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router-dom";

type Product = {
  id: number;
  name: string;
  price: number;
};

// Loader: ambil data product untuk pre-fill form
export async function editProductLoader({ params }: LoaderFunctionArgs) {
  const response = await fetch(`/api/products/${params.id}`);
  if (!response.ok) throw new Response("Not found", { status: 404 });
  return response.json();
}

// Action: handle update atau delete
export async function editProductAction({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent"); // "update" atau "delete"

  // DELETE
  if (intent === "delete") {
    await fetch(`/api/products/${params.id}`, { method: "DELETE" });
    return redirect("/products");
  }

  // UPDATE
  const name = formData.get("name") as string;
  const price = formData.get("price") as string;

  const errors: { name?: string; price?: string } = {};
  if (!name?.trim()) errors.name = "Name required";
  if (!price || Number(price) <= 0) errors.price = "Invalid price";

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  await fetch(`/api/products/${params.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price: Number(price) }),
  });

  return redirect(`/products/${params.id}`);
}

export default function EditProductPage() {
  const product = useLoaderData() as Product;
  const actionData = useActionData() as { errors?: { name?: string; price?: string } };

  return (
    <div>
      <h1>Edit Product</h1>

      <Form method="post">
        <div>
          <label>Name</label>
          <input type="text" name="name" defaultValue={product.name} />
          {actionData?.errors?.name && <p style={{ color: "red" }}>{actionData.errors.name}</p>}
        </div>

        <div>
          <label>Price</label>
          <input type="number" name="price" defaultValue={product.price} step="0.01" />
          {actionData?.errors?.price && <p style={{ color: "red" }}>{actionData.errors.price}</p>}
        </div>

        <button type="submit" name="intent" value="update">
          Update
        </button>
        
        <button
          type="submit"
          name="intent"
          value="delete"
          style={{ background: "red", color: "white", marginLeft: "1rem" }}
          onClick={(e) => {
            if (!confirm("Are you sure you want to delete this product?")) {
              e.preventDefault();
            }
          }}
        >
          Delete
        </button>
      </Form>
    </div>
  );
}
```

---

## 6. useActionData & Redirect

### 6.1 useActionData — Akses Data dari Action

```tsx
import { useActionData } from "react-router-dom";

export default function CreateProductPage() {
  const actionData = useActionData() as { errors?: { name?: string } } | undefined;

  // actionData hanya ada setelah form di-submit
  // Kalau action return redirect(), actionData = undefined
  
  return (
    <Form method="post">
      <input name="name" />
      {actionData?.errors?.name && <p>{actionData.errors.name}</p>}
      <button type="submit">Submit</button>
    </Form>
  );
}
```

### 6.2 redirect() — Navigasi Setelah Action Sukses

```tsx
import { redirect } from "react-router-dom";

export async function createProductAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  
  // ... validasi & submit ke API
  
  const product = await response.json();
  
  // Redirect ke halaman detail
  return redirect(`/products/${product.id}`);
}
```

**Redirect dengan Flash Message:**

```tsx
export async function deleteProductAction({ params }: ActionFunctionArgs) {
  await fetch(`/api/products/${params.id}`, { method: "DELETE" });
  
  // Redirect dengan state (bisa diakses via useLocation)
  return redirect("/products", {
    state: { message: "Product deleted successfully" },
  });
}

// Di ProductListPage
function ProductListPage() {
  const location = useLocation();
  const message = location.state?.message;

  return (
    <div>
      {message && <div style={{ background: "green", color: "white", padding: "1rem" }}>{message}</div>}
      {/* ... */}
    </div>
  );
}
```

---

## 7. Form Component: Pengganti form HTML Biasa

`<Form>` dari React Router adalah **progressive enhancement** dari `<form>` HTML biasa.

```tsx
import { Form } from "react-router-dom";

<Form method="post" action="/products">
  <input name="name" />
  <button type="submit">Submit</button>
</Form>
```

### Bedanya dengan `<form>` biasa:

| `<form>` HTML | `<Form>` React Router |
|---|---|
| Submit → full page reload | Submit → no page reload (SPA) |
| Manual `e.preventDefault()` + fetch | Otomatis call action function |
| Manual loading state | Otomatis integrate dengan `useNavigation()` |
| Manual error handling | Integrate dengan `errorElement` |

### Method & Action

```tsx
{/* POST ke action di route yang sama */}
<Form method="post">

{/* POST ke action di route lain */}
<Form method="post" action="/api/products">

{/* GET — trigger loader dengan query params */}
<Form method="get">
  <input name="search" />
  <button>Search</button>
</Form>
{/* Submit ke /products?search=keyword → trigger loader dengan searchParams */}
```

### Replace (Tidak Masuk History)

```tsx
<Form method="post" replace>
  {/* Setelah submit, tidak bisa "back" ke form ini */}
</Form>
```

---

## 8. ErrorBoundary: Handle Error di Route

Saat loader atau action `throw`, React Router akan render **errorElement** terdekat.

### 8.1 Setup Error Page

```tsx
// src/pages/ErrorPage.tsx
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();

  let errorMessage: string;
  let errorStatus: number | undefined;

  if (isRouteErrorResponse(error)) {
    // Error dari throw new Response(...)
    errorMessage = error.statusText || error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    // Error biasa (throw new Error(...))
    errorMessage = error.message;
  } else {
    errorMessage = "Unknown error occurred";
  }

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>{errorStatus || "Oops!"}</h1>
      <p>{errorMessage}</p>
      <Link to="/">← Back to Home</Link>
    </div>
  );
}
```

### 8.2 Definisi di Router

```tsx
export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <ErrorPage />, // ← Catch semua error di child routes
    children: [
      {
        path: "products/:id",
        element: <ProductDetailPage />,
        loader: productDetailLoader,
        // Kalau loader throw, ErrorPage akan muncul
      },
    ],
  },
]);
```

### 8.3 Throw Error dari Loader

```tsx
export async function productDetailLoader({ params }: LoaderFunctionArgs) {
  const response = await fetch(`/api/products/${params.id}`);
  
  if (response.status === 404) {
    throw new Response("Product not found", { status: 404 });
  }
  
  if (!response.ok) {
    throw new Response("Server error", { status: 500 });
  }
  
  return response.json();
}
```

### 8.4 Per-Route Error Element

```tsx
{
  path: "products/:id",
  element: <ProductDetailPage />,
  loader: productDetailLoader,
  errorElement: <ProductErrorPage />, // ← Hanya untuk route ini
}
```

---

## 9. Defer & Await: Streaming Data untuk UX Lebih Baik

**Masalah:** Kalau loader fetch 3 API dan salah satunya lambat (2 detik), user harus nunggu 2 detik sebelum halaman muncul.

**Solusi:** `defer()` — render halaman dulu dengan data yang cepat, sisanya streaming.

### 9.1 Defer Slow Data

```tsx
// src/pages/ProductDetailPage.tsx
import { defer, Await, useLoaderData, type LoaderFunctionArgs } from "react-router-dom";
import { Suspense } from "react";

type ProductDetailData = {
  product: Product; // ← Fast (100ms)
  reviews: Promise<Review[]>; // ← Slow (2 detik)
};

export async function productDetailLoader({ params }: LoaderFunctionArgs) {
  const productPromise = fetch(`/api/products/${params.id}`).then((r) => r.json());
  const reviewsPromise = fetch(`/api/products/${params.id}/reviews`).then((r) => r.json());

  // Tunggu product (cepat), defer reviews (lambat)
  const product = await productPromise;

  return defer({
    product, // ← Resolved
    reviews: reviewsPromise, // ← Promise (belum resolved)
  });
}

export default function ProductDetailPage() {
  const { product, reviews } = useLoaderData() as ProductDetailData;

  return (
    <div>
      {/* Product langsung render — data sudah ada */}
      <h1>{product.name}</h1>
      <p>{product.description}</p>

      {/* Reviews streaming — render loading dulu, baru data */}
      <Suspense fallback={<p>Loading reviews...</p>}>
        <Await resolve={reviews}>
          {(resolvedReviews) => (
            <div>
              <h2>Reviews</h2>
              {resolvedReviews.map((review) => (
                <div key={review.id}>{review.text}</div>
              ))}
            </div>
          )}
        </Await>
      </Suspense>
    </div>
  );
}
```

### Timeline dengan defer():

```
User klik link
  ↓
Loader mulai
  ├── productPromise (100ms) ← tunggu ini
  └── reviewsPromise (2s)    ← tidak tunggu
  ↓
Halaman render (100ms) — product sudah muncul
  ├── Product info ✅
  └── Reviews: "Loading..." ⏳
  ↓
reviewsPromise selesai (2s total)
  └── Reviews muncul ✅
```

**Tanpa defer:**

```
User klik link
  ↓
Loader tunggu SEMUA fetch selesai (2s)
  ↓
Halaman render (2s) — semua data sekaligus
```

User experience jauh lebih baik dengan defer — halaman terasa lebih cepat.

### 9.2 Error Handling di Await

```tsx
<Suspense fallback={<p>Loading...</p>}>
  <Await resolve={reviews} errorElement={<p>Failed to load reviews</p>}>
    {(resolvedReviews) => (
      <div>
        {resolvedReviews.map((review) => (
          <div key={review.id}>{review.text}</div>
        ))}
      </div>
    )}
  </Await>
</Suspense>
```

---

## 10. useNavigation: Loading State Global

`useNavigation()` memberitahu **status navigasi saat ini** — idle, loading, atau submitting.

```tsx
// src/layouts/MainLayout.tsx
import { Outlet, useNavigation } from "react-router-dom";

export default function MainLayout() {
  const navigation = useNavigation();

  return (
    <div>
      {/* Loading bar di top saat navigasi */}
      {navigation.state === "loading" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "#0070f3",
            animation: "loading 1s ease-in-out infinite",
          }}
        />
      )}

      <header>My App</header>
      
      <main>
        {/* Blur konten saat loading */}
        <div style={{ opacity: navigation.state === "loading" ? 0.5 : 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

### navigation.state Values

```tsx
const navigation = useNavigation();

navigation.state === "idle"       // Tidak ada navigasi
navigation.state === "loading"    // Loader running (fetch data)
navigation.state === "submitting" // Action running (form submit)
```

### Disable Tombol Saat Submitting

```tsx
import { useNavigation } from "react-router-dom";

export default function CreateProductPage() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Form method="post">
      <input name="name" disabled={isSubmitting} />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Product"}
      </button>
    </Form>
  );
}
```

---

## 11. useFetcher: Submit Form Tanpa Navigasi

**Masalah:** Kadang kamu mau submit form (misal: like button, toggle favorite) tapi **tidak mau navigasi** ke halaman lain.

**Solusi:** `useFetcher()` — call action tanpa navigasi.

### 11.1 Like Button dengan useFetcher

```tsx
// src/components/LikeButton.tsx
import { useFetcher } from "react-router-dom";

type Props = {
  productId: number;
  initialLikes: number;
};

export default function LikeButton({ productId, initialLikes }: Props) {
  const fetcher = useFetcher();

  // Optimistic UI: tampilin hasil sebelum server respond
  const likes = fetcher.formData
    ? initialLikes + 1
    : initialLikes;

  const isLiking = fetcher.state === "submitting";

  return (
    <fetcher.Form method="post" action={`/products/${productId}/like`}>
      <button type="submit" disabled={isLiking}>
        👍 {likes} {isLiking && "..."}
      </button>
    </fetcher.Form>
  );
}
```

### 11.2 Action untuk Like

```tsx
// src/actions/likeProductAction.ts
import { type ActionFunctionArgs } from "react-router-dom";

export async function likeProductAction({ params }: ActionFunctionArgs) {
  await fetch(`/api/products/${params.id}/like`, { method: "POST" });
  
  // Tidak return redirect — fetcher tidak navigasi
  return { success: true };
}

// Di router
{
  path: "products/:id/like",
  action: likeProductAction,
}
```

### 11.3 Search Form Tanpa Navigasi

```tsx
import { useFetcher } from "react-router-dom";

export default function SearchBox() {
  const fetcher = useFetcher();

  return (
    <div>
      <fetcher.Form method="get" action="/search">
        <input name="q" placeholder="Search..." />
        <button type="submit">Search</button>
      </fetcher.Form>

      {fetcher.state === "loading" && <p>Searching...</p>}
      
      {fetcher.data && (
        <ul>
          {fetcher.data.results.map((item: any) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 12. Mini Project: Product Management dengan CRUD Lengkap

Sekarang kita gabungkan semua konsep: loader, action, defer, error boundary, useFetcher.

### Project Structure

```
src/
  ├── main.tsx
  ├── router.tsx
  ├── layouts/
  │   └── MainLayout.tsx
  ├── pages/
  │   ├── ErrorPage.tsx
  │   ├── HomePage.tsx
  │   ├── ProductListPage.tsx
  │   ├── ProductDetailPage.tsx
  │   ├── CreateProductPage.tsx
  │   └── EditProductPage.tsx
  ├── components/
  │   ├── ProductCard.tsx
  │   └── LikeButton.tsx
  └── api/
      └── products.ts
```

### 1. API Module (Mock)

```tsx
// src/api/products.ts
export type Product = {
  id: number;
  name: string;
  price: number;
  description: string;
  likes: number;
};

export type Review = {
  id: number;
  productId: number;
  text: string;
  rating: number;
};

// Mock database
let products: Product[] = [
  { id: 1, name: "Laptop", price: 1200, description: "Powerful laptop", likes: 10 },
  { id: 2, name: "Mouse", price: 25, description: "Wireless mouse", likes: 5 },
];

let reviews: Review[] = [
  { id: 1, productId: 1, text: "Great laptop!", rating: 5 },
  { id: 2, productId: 1, text: "A bit expensive", rating: 4 },
];

// Helper untuk simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getProducts(): Promise<Product[]> {
  await delay(300);
  return products;
}

export async function getProduct(id: number): Promise<Product | undefined> {
  await delay(200);
  return products.find((p) => p.id === id);
}

export async function getReviews(productId: number): Promise<Review[]> {
  await delay(2000); // Slow — untuk demo defer
  return reviews.filter((r) => r.productId === productId);
}

export async function createProduct(data: Omit<Product, "id" | "likes">): Promise<Product> {
  await delay(500);
  const newProduct = {
    id: Math.max(...products.map((p) => p.id)) + 1,
    ...data,
    likes: 0,
  };
  products.push(newProduct);
  return newProduct;
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<Product | undefined> {
  await delay(500);
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return undefined;
  products[index] = { ...products[index], ...data };
  return products[index];
}

export async function deleteProduct(id: number): Promise<boolean> {
  await delay(500);
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;
  products.splice(index, 1);
  return true;
}

export async function likeProduct(id: number): Promise<Product | undefined> {
  await delay(300);
  const product = products.find((p) => p.id === id);
  if (!product) return undefined;
  product.likes += 1;
  return product;
}
```

### 2. Router Definition

```tsx
// src/router.tsx
import { createBrowserRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import ProductListPage, { productListLoader } from "./pages/ProductListPage";
import ProductDetailPage, { productDetailLoader } from "./pages/ProductDetailPage";
import CreateProductPage, { createProductAction } from "./pages/CreateProductPage";
import EditProductPage, { editProductLoader, editProductAction } from "./pages/EditProductPage";
import { likeProductAction } from "./actions/likeProductAction";
import ErrorPage from "./pages/ErrorPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "products",
        element: <ProductListPage />,
        loader: productListLoader,
      },
      {
        path: "products/new",
        element: <CreateProductPage />,
        action: createProductAction,
      },
      {
        path: "products/:id",
        element: <ProductDetailPage />,
        loader: productDetailLoader,
      },
      {
        path: "products/:id/edit",
        element: <EditProductPage />,
        loader: editProductLoader,
        action: editProductAction,
      },
      {
        path: "products/:id/like",
        action: likeProductAction,
      },
    ],
  },
]);
```

### 3. Product List Page

```tsx
// src/pages/ProductListPage.tsx
import { useLoaderData, Link } from "react-router-dom";
import { getProducts, type Product } from "../api/products";
import ProductCard from "../components/ProductCard";

export async function productListLoader() {
  const products = await getProducts();
  return products;
}

export default function ProductListPage() {
  const products = useLoaderData() as Product[];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Products</h1>
        <Link
          to="/products/new"
          style={{
            padding: "0.75rem 1.5rem",
            background: "#0070f3",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 4,
          }}
        >
          + New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <p>No products yet. Create one!</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.5rem" }}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4. Product Detail Page (dengan Defer)

```tsx
// src/pages/ProductDetailPage.tsx
import { defer, Await, useLoaderData, Link, type LoaderFunctionArgs } from "react-router-dom";
import { Suspense } from "react";
import { getProduct, getReviews, type Product, type Review } from "../api/products";
import LikeButton from "../components/LikeButton";

type ProductDetailData = {
  product: Product;
  reviews: Promise<Review[]>;
};

export async function productDetailLoader({ params }: LoaderFunctionArgs) {
  const id = Number(params.id);
  
  const productPromise = getProduct(id);
  const reviewsPromise = getReviews(id);

  const product = await productPromise;
  
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  return defer({
    product,
    reviews: reviewsPromise,
  });
}

export default function ProductDetailPage() {
  const { product, reviews } = useLoaderData() as ProductDetailData;

  return (
    <div>
      <Link to="/products" style={{ color: "#0070f3", textDecoration: "none", marginBottom: "1rem", display: "inline-block" }}>
        ← Back to Products
      </Link>

      <div style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h1>{product.name}</h1>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#0070f3" }}>
              ${product.price}
            </p>
            <p style={{ color: "#666", marginTop: "1rem" }}>{product.description}</p>
          </div>
          
          <Link
            to={`/products/${product.id}/edit`}
            style={{
              padding: "0.5rem 1rem",
              background: "#f0f0f0",
              color: "#000",
              textDecoration: "none",
              borderRadius: 4,
            }}
          >
            Edit
          </Link>
        </div>

        <div style={{ marginTop: "2rem" }}>
          <LikeButton productId={product.id} initialLikes={product.likes} />
        </div>

        <div style={{ marginTop: "3rem" }}>
          <h2>Reviews</h2>
          <Suspense fallback={<p style={{ color: "#666" }}>Loading reviews...</p>}>
            <Await resolve={reviews} errorElement={<p style={{ color: "red" }}>Failed to load reviews</p>}>
              {(resolvedReviews) => (
                <div style={{ marginTop: "1rem" }}>
                  {resolvedReviews.length === 0 ? (
                    <p style={{ color: "#666" }}>No reviews yet</p>
                  ) : (
                    resolvedReviews.map((review) => (
                      <div
                        key={review.id}
                        style={{
                          padding: "1rem",
                          border: "1px solid #e0e0e0",
                          borderRadius: 4,
                          marginBottom: "1rem",
                        }}
                      >
                        <div>{"⭐".repeat(review.rating)}</div>
                        <p style={{ marginTop: "0.5rem" }}>{review.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Await>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
```

### 5. Create Product Page

```tsx
// src/pages/CreateProductPage.tsx
import { Form, useActionData, useNavigation, redirect, type ActionFunctionArgs } from "react-router-dom";
import { createProduct } from "../api/products";

type ActionData = {
  errors?: {
    name?: string;
    price?: string;
    description?: string;
  };
};

export async function createProductAction({ request }: ActionFunctionArgs): Promise<ActionData | Response> {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const price = formData.get("price") as string;
  const description = formData.get("description") as string;

  const errors: ActionData["errors"] = {};

  if (!name?.trim()) {
    errors.name = "Name is required";
  }

  if (!price || isNaN(Number(price)) || Number(price) <= 0) {
    errors.price = "Price must be a positive number";
  }

  if (!description?.trim()) {
    errors.description = "Description is required";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const product = await createProduct({
    name,
    price: Number(price),
    description,
  });

  return redirect(`/products/${product.id}`);
}

export default function CreateProductPage() {
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1>Create New Product</h1>

      <Form method="post" style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Product Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
          {actionData?.errors?.name && (
            <p style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}>{actionData.errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="price" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Price ($)
          </label>
          <input
            type="number"
            id="price"
            name="price"
            step="0.01"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: 4,
            }}
          />
          {actionData?.errors?.price && (
            <p style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}>{actionData.errors.price}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontFamily: "inherit",
            }}
          />
          {actionData?.errors?.description && (
            <p style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}>{actionData.errors.description}</p>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: "0.75rem",
              fontSize: "1rem",
              background: isSubmitting ? "#ccc" : "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Creating..." : "Create Product"}
          </button>
        </div>
      </Form>
    </div>
  );
}
```

### 6. Edit Product Page

```tsx
// src/pages/EditProductPage.tsx
import { Form, useLoaderData, useActionData, useNavigation, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router-dom";
import { getProduct, updateProduct, deleteProduct, type Product } from "../api/products";

type ActionData = {
  errors?: {
    name?: string;
    price?: string;
    description?: string;
  };
};

export async function editProductLoader({ params }: LoaderFunctionArgs) {
  const id = Number(params.id);
  const product = await getProduct(id);
  
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }
  
  return product;
}

export async function editProductAction({ request, params }: ActionFunctionArgs): Promise<ActionData | Response> {
  const id = Number(params.id);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // DELETE
  if (intent === "delete") {
    await deleteProduct(id);
    return redirect("/products");
  }

  // UPDATE
  const name = formData.get("name") as string;
  const price = formData.get("price") as string;
  const description = formData.get("description") as string;

  const errors: ActionData["errors"] = {};

  if (!name?.trim()) errors.name = "Name is required";
  if (!price || Number(price) <= 0) errors.price = "Invalid price";
  if (!description?.trim()) errors.description = "Description is required";

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  await updateProduct(id, {
    name,
    price: Number(price),
    description,
  });

  return redirect(`/products/${id}`);
}

export default function EditProductPage() {
  const product = useLoaderData() as Product;
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h1>Edit Product</h1>

      <Form method="post" style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <label htmlFor="name">Product Name</label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={product.name}
            disabled={isSubmitting}
            style={{ width: "100%", padding: "0.75rem", fontSize: "1rem" }}
          />
          {actionData?.errors?.name && <p style={{ color: "red" }}>{actionData.errors.name}</p>}
        </div>

        <div>
          <label htmlFor="price">Price ($)</label>
          <input
            type="number"
            id="price"
            name="price"
            step="0.01"
            defaultValue={product.price}
            disabled={isSubmitting}
            style={{ width: "100%", padding: "0.75rem", fontSize: "1rem" }}
          />
          {actionData?.errors?.price && <p style={{ color: "red" }}>{actionData.errors.price}</p>}
        </div>

        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={product.description}
            disabled={isSubmitting}
            style={{ width: "100%", padding: "0.75rem", fontSize: "1rem" }}
          />
          {actionData?.errors?.description && <p style={{ color: "red" }}>{actionData.errors.description}</p>}
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            type="submit"
            name="intent"
            value="update"
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 4,
            }}
          >
            {isSubmitting ? "Updating..." : "Update"}
          </button>

          <button
            type="submit"
            name="intent"
            value="delete"
            disabled={isSubmitting}
            onClick={(e) => {
              if (!confirm("Delete this product?")) e.preventDefault();
            }}
            style={{
              padding: "0.75rem 1.5rem",
              background: "red",
              color: "#fff",
              border: "none",
              borderRadius: 4,
            }}
          >
            Delete
          </button>
        </div>
      </Form>
    </div>
  );
}
```

### 7. Like Button Component (useFetcher)

```tsx
// src/components/LikeButton.tsx
import { useFetcher } from "react-router-dom";

type Props = {
  productId: number;
  initialLikes: number;
};

export default function LikeButton({ productId, initialLikes }: Props) {
  const fetcher = useFetcher();

  // Optimistic update
  const likes = fetcher.formData ? initialLikes + 1 : initialLikes;
  const isLiking = fetcher.state === "submitting";

  return (
    <fetcher.Form method="post" action={`/products/${productId}/like`}>
      <button
        type="submit"
        disabled={isLiking}
        style={{
          padding: "0.5rem 1rem",
          fontSize: "1rem",
          background: "#f0f0f0",
          border: "1px solid #ccc",
          borderRadius: 4,
          cursor: isLiking ? "not-allowed" : "pointer",
        }}
      >
        👍 {likes} {isLiking && "..."}
      </button>
    </fetcher.Form>
  );
}
```

### 8. Like Action

```tsx
// src/actions/likeProductAction.ts
import { type ActionFunctionArgs } from "react-router-dom";
import { likeProduct } from "../api/products";

export async function likeProductAction({ params }: ActionFunctionArgs) {
  const id = Number(params.id);
  await likeProduct(id);
  return { success: true };
}
```

### 9. Main Layout dengan Loading Bar

```tsx
// src/layouts/MainLayout.tsx
import { Outlet, Link, useNavigation } from "react-router-dom";

export default function MainLayout() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {isLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "#0070f3",
            zIndex: 9999,
            animation: "loading 1s ease-in-out infinite",
          }}
        />
      )}

      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e0e0e0",
          padding: "1rem 2rem",
        }}
      >
        <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <Link to="/" style={{ fontWeight: "bold", fontSize: "1.25rem", textDecoration: "none", color: "#000" }}>
            🛍️ My Store
          </Link>
          <Link to="/products" style={{ textDecoration: "none", color: "#666" }}>
            Products
          </Link>
        </nav>
      </header>

      <main
        style={{
          flex: 1,
          padding: "2rem",
          maxWidth: 1200,
          margin: "0 auto",
          width: "100%",
          opacity: isLoading ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}
      >
        <Outlet />
      </main>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
```

### 10. Error Page

```tsx
// src/pages/ErrorPage.tsx
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();

  let title = "Oops!";
  let message = "An unexpected error occurred";

  if (isRouteErrorResponse(error)) {
    title = `${error.status}`;
    message = error.statusText || error.data;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "4rem", margin: 0 }}>{title}</h1>
      <p style={{ fontSize: "1.25rem", color: "#666", marginTop: "1rem" }}>{message}</p>
      <Link
        to="/"
        style={{
          display: "inline-block",
          marginTop: "2rem",
          padding: "0.75rem 1.5rem",
          background: "#0070f3",
          color: "#fff",
          textDecoration: "none",
          borderRadius: 4,
        }}
      >
        ← Back to Home
      </Link>
    </div>
  );
}
```

---

## 13. Migration Guide: BrowserRouter → createBrowserRouter

Kalau kamu punya project yang pakai `<BrowserRouter>`, ini langkah-langkahnya:

### Before (BrowserRouter)

```tsx
// main.tsx
<BrowserRouter>
  <App />
</BrowserRouter>

// App.tsx
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/products" element={<ProductListPage />} />
</Routes>
```

### After (createBrowserRouter)

```tsx
// main.tsx
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

<RouterProvider router={router} />

// router.tsx
export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/products", element: <ProductListPage />, loader: productListLoader },
]);
```

### Migration Checklist

- [ ] Pindahkan route definition dari JSX ke object
- [ ] Tambahkan loader untuk data fetching
- [ ] Ganti `<form>` dengan `<Form>`
- [ ] Tambahkan action untuk mutations
- [ ] Tambahkan errorElement
- [ ] Hapus useEffect untuk data fetching
- [ ] Ganti manual loading state dengan useNavigation()

---

## Ringkasan

### Kenapa React Router v6.4+ Lebih Baik

| Pola Lama | Pola Baru (v6.4+) |
|---|---|
| useEffect + fetch | loader function |
| Manual loading state | useNavigation() |
| Manual error handling | errorElement |
| form + e.preventDefault() | Form component |
| Manual submit handler | action function |
| Race condition manual cleanup | Otomatis handled |
| Data fetch SETELAH render | Data ready SEBELUM render |

### Flow Data Fetching

```
User klik link /products/5
  ↓
React Router panggil loader
  ↓
Loader fetch dari API
  ↓
Data ready
  ↓
Component render dengan data (useLoaderData)
  ↓
User lihat halaman (tanpa loading state di component)
```

### Flow Form Submit

```
User isi form → klik submit
  ↓
Form component kirim data ke action
  ↓
Action validasi + submit ke API
  ↓
Kalau error → return { errors } → useActionData di component
Kalau sukses → redirect("/success")
```

---

**Langkah selanjutnya:**

1. **Remix Framework** — React Router versi full-stack dengan SSR
2. **TanStack Query + React Router** — Combine keduanya untuk caching yang lebih powerful
3. **Testing Routes** — Unit test loader, action, dan navigation flow

> **Pesan dari senior dev:** React Router v6.4+ mengubah cara kita berpikir tentang data fetching di React. Ini bukan lagi "fetch di useEffect", tapi "declare data dependency di route". Pola ini mirip dengan Next.js getServerSideProps/loader, tapi untuk SPA. Setelah pakai ini, kamu tidak akan mau balik ke useEffect lagi. 😄

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | React Router v6.4+ · TypeScript 5.x · React 18+*
