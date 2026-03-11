# Clean Code di React/Next.js: Tulis Kode yang Enak Dibaca dan Mudah Di-maintain

> **Prerequisite:** Paham React hooks dan TypeScript dasar. Doc ini bukan tentang "bisa jalan", tapi tentang "enak dibaca orang lain — termasuk dirimu sendiri 3 bulan ke depan".

---

## Daftar Isi

1. [Kenapa Kode Bersih Itu Penting?](#1-kenapa-kode-bersih-itu-penting)
2. [Penamaan yang Jelas dan Intentional](#2-penamaan-yang-jelas-dan-intentional)
3. [Single Responsibility Principle di React](#3-single-responsibility-principle-di-react)
4. [Kapan Pecah Komponen, Kapan Tidak](#4-kapan-pecah-komponen-kapan-tidak)
5. [Custom Hooks: Pisahkan Logic dari UI](#5-custom-hooks-pisahkan-logic-dari-ui)
6. [Hindari Prop Drilling yang Berlebihan](#6-hindari-prop-drilling-yang-berlebihan)
7. [Komentar yang Berguna vs Komentar Noise](#7-komentar-yang-berguna-vs-komentar-noise)
8. [Prinsip DRY di React](#8-prinsip-dry-di-react)
9. [Mini Project: Refactor ProductList](#9-mini-project-refactor-productlist)
10. [Checklist Code Review Diri Sendiri](#10-checklist-code-review-diri-sendiri)

---

## 1. Kenapa Kode Bersih Itu Penting?

Ada kutipan terkenal dari Robert C. Martin (Uncle Bob):

> *"Clean code reads like well-written prose."*

Artinya: orang lain bisa baca kode kamu seperti membaca cerita — mengalir, masuk akal, tidak perlu berpikir keras untuk paham maksudnya.

### Realita di Tempat Kerja

```
Kamu nulis kode sekarang...
    │
    ├── 20% waktu: nulis kode baru
    └── 80% waktu: baca dan modifikasi kode yang sudah ada

Kode yang kamu baca itu:
    ├── Kode orang lain (yang mungkin sudah resign)
    ├── Kode kamu sendiri 3 bulan lalu
    └── Keduanya sama-sama membingungkan kalau ditulis sembarangan
```

### Biaya Kode yang Kotor

```tsx
// Ini kode yang "works" tapi kotor:
const x = d.filter(i => i.s === 1 && !i.d).map(i => ({
  ...i, p: i.p * (1 - (i.dc ?? 0))
}));

// Pertanyaan yang muncul saat baca ini:
// - x itu apa?
// - d itu koleksi apa?
// - i.s === 1 artinya apa?
// - i.d itu deleted?
// - p dan dc itu field apa?

// Setiap pertanyaan = waktu yang terbuang untuk trace ke tempat lain
// Untuk tim 5 orang × 10 menit × sehari → 50 menit lost productivity per hari
```

---

## 2. Penamaan yang Jelas dan Intentional

Penamaan yang bagus adalah **dokumentasi terbaik**. Kalau nama variabelmu sudah jelas, komentar seringkali tidak diperlukan.

### 2.1 Variabel dan State

```tsx
// ❌ BURUK — nama tidak menjelaskan apa-apa
const [d, setD] = useState(false);
const [lst, setLst] = useState([]);
const tmp = user.n;
const x = items.filter(i => i.s);
const n = 86400000;

// ✅ BAIK — nama = dokumentasi
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
const [productList,    setProductList]    = useState<Product[]>([]);
const fullName    = user.fullName;
const activeItems = items.filter(item => item.isActive);
const ONE_DAY_MS  = 86_400_000; // underscore untuk readability angka besar
```

### Aturan Penamaan State

```tsx
// Boolean: pakai prefix is, has, can, should, will
const [isLoading,       setIsLoading]       = useState(false);
const [hasError,        setHasError]        = useState(false);
const [canSubmit,       setCanSubmit]       = useState(true);
const [isModalOpen,     setIsModalOpen]     = useState(false);
const [hasNotification, setHasNotification] = useState(false);

// Array: pakai bentuk jamak
const [products, setProducts] = useState<Product[]>([]);
const [users,    setUsers]    = useState<User[]>([]);
const [tags,     setTags]     = useState<string[]>([]);

// Object/entity: pakai singular
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
const [currentUser,     setCurrentUser]     = useState<User | null>(null);

// Setter: SELALU pasangkan nama dengan setter yang jelas
// Jangan pakai nama berbeda antara state dan setter
const [count, setCount] = useState(0);     // ✅ Pasangan jelas
const [count, updateIt] = useState(0);     // ❌ updateIt itu update apa?
```

### 2.2 Fungsi dan Event Handler

```tsx
// ❌ BURUK — tidak jelas apa yang dilakukan dan kapan dipanggil
const handle  = () => { ... };
const click   = () => { ... };
const process = (data: unknown) => { ... };
const doThing = async () => { ... };

// ✅ BAIK — format: handle[Object][Action] atau [action][Object]
// Event handlers (dipanggil oleh user interaction):
const handleLoginButtonClick    = () => { ... };
const handleSearchInputChange   = (e: ChangeEvent<HTMLInputElement>) => { ... };
const handleProductCardSelect   = (product: Product) => { ... };
const handleFormSubmit          = async (data: FormValues) => { ... };
const handleModalClose          = () => { ... };

// Fungsi utility (dipanggil programatically):
const fetchUserProfile          = async (userId: string) => { ... };
const formatCurrencyToRupiah    = (amount: number) => { ... };
const validateEmailFormat       = (email: string) => { ... };
const transformApiResponseToUI  = (raw: RawProduct) => { ... };
const calculateDiscountedPrice  = (price: number, pct: number) => { ... };
```

### 2.3 Props Interface

```tsx
// ❌ BURUK — props tidak jelas tipenya dan fungsinya
interface CardProps {
  d:    string;
  fn:   () => void;
  t:    string;
  opt?: boolean;
  ch?:  React.ReactNode;
}

// ✅ BAIK — setiap prop nama dan tipenya sudah cerita sendiri
interface ProductCardProps {
  // Data props — noun
  product:       Product;
  isHighlighted: boolean;

  // Callback props — mulai dengan "on"
  onAddToCart:   (product: Product) => void;
  onWishlistAdd?: (productId: string) => void;

  // Render props / slots
  footer?: React.ReactNode;

  // Class / style overrides
  className?: string;
}
```

### 2.4 File dan Folder

```
❌ BURUK — nama file tidak konsisten dan tidak informatif:
components/
  ├── card.tsx
  ├── Card2.tsx
  ├── myCard.tsx
  ├── product_card_component.tsx
  └── ProductCardNew.tsx           ← "New" akan jadi legacy dalam 2 bulan

✅ BAIK — nama file = nama komponen utama di dalamnya, PascalCase:
components/
  ├── ProductCard/
  │   ├── ProductCard.tsx          ← Komponen utama
  │   ├── ProductCard.test.tsx     ← Test
  │   ├── ProductCard.module.css   ← Styles
  │   └── index.ts                 ← Re-export: export { default } from "./ProductCard"
  ├── UserAvatar/
  │   └── ...
  └── ui/                          ← Komponen generik (button, input, dll.)
      ├── Button/
      └── Modal/

hooks/
  ├── useProductList.ts     ← Prefix "use" wajib untuk hook
  ├── useShoppingCart.ts
  └── useDebounce.ts

lib/
  ├── formatters.ts         ← Kumpulan fungsi format
  ├── validators.ts         ← Kumpulan fungsi validasi
  └── constants.ts          ← Konstanta global

types/
  ├── product.types.ts      ← Suffix ".types.ts" untuk file yang isinya hanya types
  └── api.types.ts
```

---

## 3. Single Responsibility Principle di React

SRP = **satu komponen, satu alasan untuk berubah**. Kalau komponen kamu butuh berubah karena dua hal yang tidak berkaitan, berarti dia terlalu besar.

### Analogi: Restoran

```
Bayangkan restoran di mana seorang karyawan melakukan:
  - Masak makanan
  - Antar pesanan ke meja
  - Kasir bayar
  - Cuci piring
  - Beli bahan baku

Kalau ada yang berubah (misalnya sistem bayar baru), satu orang itu harus
re-training semua → kacau.

Di React, komponen yang terlalu besar = karyawan yang multitasking berlebihan.
Kalau butuh update UI saja tapi harus sentuh logic fetch juga → tanda SRP dilanggar.
```

### Contoh Nyata

```tsx
// ❌ BURUK — UserProfile melakukan terlalu banyak hal:
// 1. Fetch data user
// 2. Format tampilan
// 3. Handle edit form
// 4. Upload avatar
// 5. Handle logout

export default function UserProfile() {
  const [user, setUser]             = useState<User | null>(null);
  const [isEditing, setIsEditing]   = useState(false);
  const [isLoading, setIsLoading]   = useState(true);
  const [formData, setFormData]     = useState({ name: "", bio: "" });
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.json())
      .then(data => { setUser(data); setIsLoading(false); });
  }, []);

  const handleSave = async () => {
    await fetch("/api/user/me", {
      method: "PUT",
      body:   JSON.stringify(formData),
    });
    setIsEditing(false);
  };

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      setUploadProgress(Math.round((e.loaded / e.total) * 100));
    };
    // ... seterusnya
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {/* 100+ baris JSX yang campur semua concern */}
    </div>
  );
}

// Masalahnya:
// - Kalau API endpoint berubah → sentuh komponen ini
// - Kalau UI layout berubah → sentuh komponen ini
// - Kalau logic upload berubah → sentuh komponen ini
// - Unit test hampir mustahil karena terlalu banyak dependencies
```

```tsx
// ✅ BAIK — setiap bagian punya tanggung jawab sendiri

// 1. Custom hook: tanggung jawab = data fetching & state
function useUserProfile() {
  const [user, setUser]       = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.json())
      .then(setUser)
      .catch(() => setError("Gagal memuat profil"))
      .finally(() => setIsLoading(false));
  }, []);

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    await fetch("/api/user/me", { method: "PUT", body: JSON.stringify(data) });
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  return { user, isLoading, error, updateProfile };
}

// 2. Komponen tampilan avatar: tanggung jawab = upload UI
function UserAvatar({ user, onUpload }: {
  user: User;
  onUpload: (file: File) => Promise<void>;
}) {
  return (/* hanya UI avatar dan tombol upload */);
}

// 3. Komponen form: tanggung jawab = form edit profil
function EditProfileForm({ user, onSave, onCancel }: {
  user:     User;
  onSave:   (data: Partial<User>) => Promise<void>;
  onCancel: () => void;
}) {
  return (/* hanya form edit */);
}

// 4. Komponen utama: tanggung jawab = orkestrasikan semua bagian
export default function UserProfile() {
  const { user, isLoading, error, updateProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) return <ProfileSkeleton />;
  if (error)     return <ErrorMessage message={error} />;
  if (!user)     return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <UserAvatar user={user} onUpload={handleAvatarUpload} />
      {isEditing ? (
        <EditProfileForm
          user={user}
          onSave={async (data) => { await updateProfile(data); setIsEditing(false); }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ProfileDisplay user={user} onEdit={() => setIsEditing(true)} />
      )}
    </div>
  );
}

// Sekarang:
// - Ganti API endpoint → hanya ubah useUserProfile
// - Ganti UI avatar → hanya ubah UserAvatar
// - Ganti form layout → hanya ubah EditProfileForm
// - Test masing-masing bagian secara independen ✅
```

---

## 4. Kapan Pecah Komponen, Kapan Tidak

Ini yang sering bikin bingung junior: "Kapan tepatnya aku harus pecah jadi komponen baru?"

### Sinyal Waktunya Pecah Komponen

```
1. UKURAN — lebih dari ~80-100 baris JSX?
   Mungkin sudah waktunya dipisah.

2. REUSE — JSX yang sama muncul di lebih dari 1 tempat?
   Sudah pasti harus dijadikan komponen.

3. LOGIC BERBEDA — ada bagian yang punya state/logic sendiri
   yang tidak berkaitan dengan sisa komponen?
   Pisahkan.

4. NAMA YANG JELAS — kamu bisa beri nama deskriptif untuk blok itu?
   Kalau bisa → layak jadi komponen.
   <div className="..."> // ← ini blok apa?
   <ProductImageGallery /> // ← langsung jelas
```

### Sinyal Tidak Perlu Dipecah

```
1. Hanya dipakai DI SATU tempat dan kecil?
   Tidak perlu dipisah — justru menambah cognitive overhead.

2. Komponen "wrapper" kosong?
   Jangan buat komponen yang hanya return children.

3. Props drilling ke satu level saja?
   Masih oke, belum perlu refactor ke Context.

4. Pemisahan membuat alur data lebih rumit dari sebelumnya?
   Tanda over-engineering — batalkan.
```

### Contoh Praktis

```tsx
// Situasi: form signup dengan beberapa section

// ❌ TERLALU BANYAK PECAH — over-engineering
// Ini untuk form kecil yang dipecah terlalu jauh
function SignupFormEmailSection() {
  return (
    <div>
      <input type="email" />
    </div>
  );
}

function SignupFormPasswordSection() {
  return (
    <div>
      <input type="password" />
    </div>
  );
}

function SignupFormSubmitSection() {
  return (
    <div>
      <button type="submit">Daftar</button>
    </div>
  );
}

function SignupForm() {
  return (
    <form>
      <SignupFormEmailSection />
      <SignupFormPasswordSection />
      <SignupFormSubmitSection />
    </form>
  );
  // Form sederhana terpecah jadi 4 file — tidak ada value tambah di sini
}

// ✅ TEPAT — kalau form kecil, cukup satu komponen
function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<SignupValues>();
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>Email</label>
        <input type="email" {...register("email")} />
        {errors.email && <p>{errors.email.message}</p>}
      </div>
      <div>
        <label>Password</label>
        <input type="password" {...register("password")} />
        {errors.password && <p>{errors.password.message}</p>}
      </div>
      <button type="submit">Daftar</button>
    </form>
  );
}

// ✅ TEPAT — kalau form BESAR dan kompleks, pecah ke section logis
function CheckoutForm() {
  return (
    <form>
      {/* Masing-masing punya state/logic validasi sendiri yang independen */}
      <ShippingAddressSection />   {/* 30+ fields untuk alamat */}
      <PaymentMethodSection />     {/* Credit card form dengan mask & validation */}
      <OrderSummarySection />      {/* Kalkulasi ongkir, voucher, total */}
    </form>
  );
}
```

---

## 5. Custom Hooks: Pisahkan Logic dari UI

Custom hook adalah cara terbaik untuk memisahkan **"apa yang harus dilakukan"** dari **"bagaimana tampilannya"**.

### Analogi: MVC di React

```
Model (data & logic) = Custom Hook
View  (tampilan)     = Komponen React

Tanpa hook custom:
  Komponen = Model + View campur aduk
  → Susah di-test, susah di-reuse

Dengan hook custom:
  useProductList() = semua logic (fetch, filter, sort, pagination)
  <ProductList />  = hanya tampilan, passing data dari hook
  → Masing-masing bisa di-test dan dipakai secara independen
```

### Sebelum & Sesudah

```tsx
// ❌ SEBELUM — semua logic di dalam komponen
export default function ProductSearch() {
  const [query,    setQuery]    = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [sortBy,   setSortBy]   = useState<"price" | "name" | "rating">("name");
  const [page,     setPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const debouncedQuery = useMemo(() => {
    const timer = setTimeout(() => query, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!query.trim()) { setProducts([]); return; }

    setIsLoading(true);
    setError(null);

    fetch(`/api/products?q=${query}&sort=${sortBy}&page=${page}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setProducts(data.products);
        setTotalPages(data.totalPages);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [query, sortBy, page]);

  // JSX yang panjang dengan banyak kondisi...
  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {isLoading && <Spinner />}
      {error && <p>{error}</p>}
      {products.map(p => <ProductCard key={p.id} product={p} />)}
      <Pagination page={page} total={totalPages} onPageChange={setPage} />
    </div>
  );
}
```

```tsx
// ✅ SESUDAH — logic di custom hook, komponen hanya render

// hooks/useProductSearch.ts
interface UseProductSearchOptions {
  initialSortBy?: "price" | "name" | "rating";
  pageSize?:      number;
  debounceMs?:    number;
}

interface UseProductSearchReturn {
  // State
  query:      string;
  products:   Product[];
  isLoading:  boolean;
  error:      string | null;
  sortBy:     "price" | "name" | "rating";
  page:       number;
  totalPages: number;
  hasResults: boolean;
  isEmpty:    boolean; // Query ada tapi tidak ada hasil

  // Actions
  setQuery:   (query: string) => void;
  setSortBy:  (sort: "price" | "name" | "rating") => void;
  setPage:    (page: number) => void;
  clearSearch: () => void;
}

export function useProductSearch({
  initialSortBy = "name",
  debounceMs    = 300,
}: UseProductSearchOptions = {}): UseProductSearchReturn {
  const [query,      setQuery]      = useState("");
  const [products,   setProducts]   = useState<Product[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [sortBy,     setSortBy]     = useState(initialSortBy);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce query agar tidak fetch setiap ketukan
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Reset halaman kalau query atau sort berubah
  useEffect(() => { setPage(1); }, [debouncedQuery, sortBy]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setProducts([]);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/products?q=${debouncedQuery}&sort=${sortBy}&page=${page}`, {
      signal: controller.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error("Gagal memuat produk");
        return r.json() as Promise<{ products: Product[]; totalPages: number }>;
      })
      .then(data => {
        setProducts(data.products);
        setTotalPages(data.totalPages);
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [debouncedQuery, sortBy, page]);

  const clearSearch = (): void => {
    setQuery("");
    setProducts([]);
    setPage(1);
  };

  return {
    query,
    products,
    isLoading,
    error,
    sortBy,
    page,
    totalPages,
    hasResults: products.length > 0,
    isEmpty:    debouncedQuery.trim().length > 0 && !isLoading && products.length === 0,
    setQuery,
    setSortBy,
    setPage,
    clearSearch,
  };
}

// components/ProductSearch.tsx — hanya tanggung jawab UI
export default function ProductSearch() {
  const {
    query, products, isLoading, error,
    sortBy, page, totalPages,
    hasResults, isEmpty,
    setQuery, setSortBy, setPage, clearSearch,
  } = useProductSearch({ debounceMs: 300 });

  return (
    <div className="space-y-4">
      <SearchBar
        value={query}
        onChange={setQuery}
        onClear={clearSearch}
        placeholder="Cari produk..."
      />

      <SortControl value={sortBy} onChange={setSortBy} />

      {isLoading && <SearchSkeleton />}
      {error      && <ErrorMessage message={error} />}
      {isEmpty    && <EmptyState query={query} />}

      {hasResults && (
        <>
          <ProductGrid products={products} />
          <Pagination current={page} total={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// Keuntungan:
// 1. useProductSearch bisa dipakai di halaman lain yang butuh search
// 2. ProductSearch bisa di-test dengan mock hook
// 3. Ganti implementasi fetch ke SWR/React Query → hanya ubah hook
// 4. Tambah filter baru → hanya ubah hook, komponen tidak perlu tahu
```

### Aturan Custom Hook yang Baik

```ts
// ✅ Hook yang baik:
// - Return nilai yang informatif (bukan hanya setState)
// - Expose computed values (hasResults, isEmpty, isFirstPage)
// - Handle edge cases di dalam hook (empty query, abort signal)
// - Tidak return JSX — itu urusan komponen
// - Nama mulai dengan "use"

// ❌ Anti-pattern hook:
function useButtonColor() {         // Terlalu granular — ini harusnya state biasa
  const [color, setColor] = useState("blue");
  return [color, setColor];
}

function useEverything() {          // Terlalu besar — SRP dilanggar
  // fetch users, handle auth, manage cart, track analytics...
}
```

---

## 6. Hindari Prop Drilling yang Berlebihan

Prop drilling = melewatkan props lewat banyak lapisan komponen yang tidak membutuhkannya, hanya untuk sampai ke komponen yang butuh.

### Visualisasi Masalahnya

```
❌ Prop Drilling:

<App user={user}>
  └── <Layout user={user}>            ← Layout tidak pakai user, tapi harus pass
        └── <Sidebar user={user}>     ← Sidebar tidak pakai user, tapi harus pass
              └── <NavMenu user={user}>  ← NavMenu tidak pakai user, tapi harus pass
                    └── <UserAvatar user={user} />  ← Yang sebenarnya butuh

Setiap komponen di tengah "terkontaminasi" oleh props yang bukan urusannya.
Kalau tipe User berubah → harus update Layout, Sidebar, NavMenu, UserAvatar.
```

### Solusi 1: Context (untuk global/shared state)

```tsx
// ✅ Context untuk data yang dipakai banyak tempat

// contexts/UserContext.tsx
interface UserContextValue {
  user:         User | null;
  isLoading:    boolean;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/me")
      .then(r => r.json())
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    await fetch("/api/user/me", { method: "PUT", body: JSON.stringify(data) });
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <UserContext.Provider value={{ user, isLoading, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook untuk konsumsi — dengan type safety
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser harus dipakai di dalam <UserProvider>");
  return ctx;
}

// Sekarang UserAvatar bisa langsung pakai tanpa prop drilling:
function UserAvatar() {
  const { user } = useUser(); // ← Langsung ambil dari context
  if (!user) return null;
  return (
    <img src={user.image ?? "/default.png"} alt={user.name ?? ""} className="w-8 h-8 rounded-full" />
  );
}
```

### Solusi 2: Component Composition (lebih ringan dari Context)

```tsx
// Context kadang over-engineering untuk kasus sederhana.
// Composition bisa lebih simpel.

// ❌ Prop drilling 3 level
<Dashboard userId={userId}>
  <DashboardSidebar userId={userId}>
    <ProfileLink userId={userId} />
  </DashboardSidebar>
</Dashboard>

// ✅ Composition — pass komponen, bukan data
// Dashboard tidak perlu tahu tentang userId
function Dashboard({ sidebar, content }: {
  sidebar: React.ReactNode;
  content: React.ReactNode;
}) {
  return (
    <div className="flex">
      <aside>{sidebar}</aside>
      <main>{content}</main>
    </div>
  );
}

// Di parent yang tahu userId → langsung render komponen yang butuh userId
function DashboardPage() {
  const userId = "123";
  return (
    <Dashboard
      sidebar={<DashboardSidebar profileLink={<ProfileLink userId={userId} />} />}
      content={<DashboardContent />}
    />
  );
}
```

### Panduan Kapan Pakai Apa

```
Hanya 1-2 level prop drilling?
  → Biarkan saja, tidak perlu Context

3+ level dan banyak komponen butuh data yang sama?
  → Pakai Context

Data dipakai di beberapa komponen tapi tidak terlalu spread?
  → Coba Component Composition dulu

State global (user, theme, cart, auth)?
  → Context atau Zustand

Server-side data di Next.js App Router?
  → Langsung fetch di Server Component → pass sebagai props
  → Atau pakai React Cache untuk de-duplicate fetch
```

---

## 7. Komentar yang Berguna vs Komentar Noise

Komentar yang buruk lebih berbahaya daripada tidak ada komentar — mereka memberikan rasa aman yang palsu.

### Komentar yang Harus Dihapus (Noise)

```tsx
// ❌ Komentar yang hanya mengulang kode — hapus saja

// Set loading to true
setIsLoading(true);

// Increment counter
setCount(count + 1);

// Return the component
return <div>{content}</div>;

// Map over products array
const productCards = products.map(product => (
  <ProductCard key={product.id} product={product} />
));

// ❌ Komentar yang commented-out code — hapus, pakai git
// const oldVersion = () => { ... };
// setData(response.json()); // old

// ❌ Komentar yang bohong (lebih parah dari tidak ada)
// Calculate total price
const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
// ^ Padahal ini hitung harga SEBELUM diskon, bukan total

// ❌ TODO yang tidak pernah diselesaikan
// TODO: Fix this later
// FIXME: This is broken but works somehow
// HACK: Don't touch this
```

### Komentar yang Bernilai

```tsx
// ✅ Komentar yang menjelaskan KENAPA, bukan APA

// Timeout 0ms — ini bukan typo.
// Kita butuh microtask delay agar DOM selesai update
// sebelum kita baca ukurannya.
setTimeout(() => measureElementSize(ref.current), 0);

// Magic number yang tidak bisa dijelaskan dengan nama variabel saja:
const THROTTLE_DELAY = 1000 / 60; // ~16ms = target 60fps

// Workaround untuk bug library/browser:
// Safari tidak mendukung negative margin pada sticky element sebelum iOS 15.4
// https://bugs.webkit.org/show_bug.cgi?id=239460
const stickyOffset = isSafari ? 0 : -headerHeight;

// Alasan pemilihan algoritma atau pendekatan:
// Kita pakai insertion sort (bukan quick sort) di sini karena
// data hampir selalu sudah terurut — O(n) untuk kasus tersebut.

// Warning untuk developer lain:
// Hati-hati mengubah urutan operasi di sini.
// Tax harus dihitung SETELAH diskon diterapkan,
// sesuai regulasi pajak Indonesia (PMK-39/2019).
const afterDiscount = price - discountAmount;
const tax           = afterDiscount * TAX_RATE;
const finalPrice    = afterDiscount + tax;

// Konteks bisnis yang tidak obvious dari kode:
// User bisa punya maksimal 3 alamat aktif bersamaan.
// Ini limitasi dari gateway pengiriman (JNE API v2).
const MAX_ACTIVE_ADDRESSES = 3;
```

### JSDoc untuk API Publik

```tsx
/**
 * Menghitung harga akhir produk setelah diskon dan pajak.
 *
 * @param basePrice  - Harga dasar dalam Rupiah (tanpa pajak)
 * @param discountPct - Persentase diskon (0-100). Nilai di luar range di-clamp otomatis.
 * @param taxRate    - Tax rate sebagai desimal (0.11 untuk 11% PPN)
 * @returns Harga akhir dalam Rupiah, dibulatkan ke ratusan terdekat
 *
 * @example
 * calculateFinalPrice(100_000, 10, 0.11)
 * // → 99_900  (10% diskon → 90.000, + 11% PPN → 99.900)
 */
export function calculateFinalPrice(
  basePrice:   number,
  discountPct: number,
  taxRate:     number
): number {
  const clampedDiscount = Math.min(Math.max(discountPct, 0), 100);
  const afterDiscount   = basePrice * (1 - clampedDiscount / 100);
  const withTax         = afterDiscount * (1 + taxRate);
  return Math.round(withTax / 100) * 100; // Bulatkan ke ratusan
}
```

---

## 8. Prinsip DRY di React

DRY = Don't Repeat Yourself. Setiap pengetahuan harus punya **satu representasi yang otoritatif** dalam sistem.

> Tapi hati-hati: **DRY bukan berarti deduplikasi semua code yang terlihat mirip.** Duplikasi yang terlalu dipaksakan untuk DRY justru bikin kode lebih sulit diubah.

### Kapan Saatnya DRY?

```
Aturan "Rule of Three":
  - Tulis pertama kali → tulis saja, jangan abstraksikan dulu
  - Muncul kedua kali → copy, tapi perhatikan
  - Muncul ketiga kali → SEKARANG abstraksikan

Duplikasi yang AMAN dibiarkan:
  - Kode mirip tapi untuk domain yang berbeda
    (form login dan form payment mungkin terlihat mirip tapi berbeda tujuan)
  - Kode yang berubahnya tidak bersamaan
    (kalau satu harus berubah, yang lain tidak ikut berubah)

Duplikasi yang HARUS di-DRY:
  - Logic bisnis yang sama (formula harga selalu sama)
  - Format yang sama berulang (format tanggal, format rupiah)
  - Struktur komponen yang identik dengan data berbeda
```

### DRY pada Komponen

```tsx
// ❌ BURUK — duplikasi komponen yang identik kecuali data

function AdminCard() {
  return (
    <div className="p-6 bg-white rounded-xl border hover:shadow-md transition cursor-pointer">
      <span className="text-2xl">🛡️</span>
      <h3 className="font-semibold mt-2">Admin Panel</h3>
      <p className="text-sm text-gray-500">Kelola sistem</p>
    </div>
  );
}

function AnalyticsCard() {
  return (
    <div className="p-6 bg-white rounded-xl border hover:shadow-md transition cursor-pointer">
      <span className="text-2xl">📊</span>
      <h3 className="font-semibold mt-2">Analytics</h3>
      <p className="text-sm text-gray-500">Lihat statistik</p>
    </div>
  );
}

function UsersCard() {
  return (
    <div className="p-6 bg-white rounded-xl border hover:shadow-md transition cursor-pointer">
      <span className="text-2xl">👥</span>
      <h3 className="font-semibold mt-2">Users</h3>
      <p className="text-sm text-gray-500">Kelola pengguna</p>
    </div>
  );
}
// Kalau mau tambah shadow atau ganti radius → ubah 3 tempat

// ✅ BAIK — abstraksikan ke satu komponen
interface DashboardCardProps {
  icon:        string;
  title:       string;
  description: string;
  onClick?:    () => void;
  href?:       string;
}

function DashboardCard({ icon, title, description, onClick, href }: DashboardCardProps) {
  const className = "p-6 bg-white rounded-xl border hover:shadow-md transition cursor-pointer text-left w-full";
  const content = (
    <>
      <span className="text-2xl">{icon}</span>
      <h3 className="font-semibold mt-2">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </>
  );

  if (href) return <a href={href} className={className}>{content}</a>;
  return <button onClick={onClick} className={className}>{content}</button>;
}

// Data itu urusan konsumer, bukan komponen
const DASHBOARD_MENU = [
  { icon: "🛡️", title: "Admin Panel",  description: "Kelola sistem",    href: "/admin" },
  { icon: "📊", title: "Analytics",    description: "Lihat statistik",   href: "/analytics" },
  { icon: "👥", title: "Users",        description: "Kelola pengguna",   href: "/users" },
] as const;

function DashboardMenu() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {DASHBOARD_MENU.map(item => (
        <DashboardCard key={item.href} {...item} />
      ))}
    </div>
  );
}
```

### DRY pada Logic & Utils

```tsx
// ❌ Duplikasi format Rupiah di banyak tempat
function ProductCard({ product }: { product: Product }) {
  return (
    <div>
      <p>Rp {product.price.toLocaleString("id-ID")}</p>        {/* Copy 1 */}
      <p>Rp {product.originalPrice.toLocaleString("id-ID")}</p> {/* Copy 2 */}
    </div>
  );
}

function CartItem({ item }: { item: CartItem }) {
  return (
    <div>
      <p>Rp {item.totalPrice.toLocaleString("id-ID")}</p>      {/* Copy 3 */}
    </div>
  );
}
// Kalau format berubah (misal: tambah simbol ",-") → ubah di 3+ tempat

// ✅ Satu fungsi format, dipakai di mana-mana
// lib/formatters.ts
export function formatRupiah(amount: number, options?: {
  showDecimals?: boolean;
  compact?:      boolean; // 1.5K, 2.3M
}): string {
  if (options?.compact) {
    if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
    if (amount >= 1_000)     return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  }

  return new Intl.NumberFormat("id-ID", {
    style:                 "currency",
    currency:              "IDR",
    minimumFractionDigits: options?.showDecimals ? 2 : 0,
    maximumFractionDigits: options?.showDecimals ? 2 : 0,
  }).format(amount);
}

// Sekarang semua tempat pakai fungsi yang sama:
// Rp 150.000
// Rp 1.5jt (compact mode)
// Kalau format berubah → ubah di satu tempat saja ✅
```

### DRY Tapi Tidak Over-Abstract

```tsx
// ❌ OVER-DRY — abstraksi yang terlalu generik justru susah dibaca

// Seorang developer yang "terlalu kreatif" membuat:
function GenericFormField<T extends Record<string, unknown>>({
  config,
  handler,
  renderer,
}: {
  config:   FieldConfig<T>;
  handler:  FieldHandler<T>;
  renderer: FieldRenderer<T>;
}) {
  // 50 baris untuk handle semua edge case semua jenis field
  // Untuk menggunakannya: butuh baca 3 interface, 2 generic, dan dokumentasi
}

// ✅ CUKUP — abstraksi sesuai kebutuhan nyata
function TextField({ label, error, ...inputProps }: TextFieldProps) {
  return (
    <div>
      <label>{label}</label>
      <input {...inputProps} />
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
// Simpel, jelas, mudah dipakai, mudah di-extend kalau perlu
```

---

## 9. Mini Project: Refactor ProductList

Kita lihat komponen nyata yang "berantakan" — lalu refactor step by step dengan semua prinsip yang sudah dipelajari.

### Kode Awal yang Messy

```tsx
// ❌ SEBELUM REFACTOR — ProductList.tsx (140 baris, semua campur)
"use client";

import { useState, useEffect } from "react";

export default function ProductList({ cat }: { cat: string }) {
  const [d, setD] = useState<any[]>([]);
  const [l, setL] = useState(true);
  const [e, setE] = useState(false);
  const [s, setS] = useState("");
  const [pg, setPg] = useState(1);
  const [srt, setSrt] = useState("n");
  const [sel, setSel] = useState<any>(null);

  useEffect(() => {
    setL(true);
    fetch(`https://api.example.com/products?cat=${cat}&page=${pg}&sort=${srt}&search=${s}`)
      .then(x => x.json())
      .then(x => { setD(x.data); setL(false); })
      .catch(() => { setE(true); setL(false); });
  }, [cat, pg, srt, s]);

  const handleS = (e: any) => setS(e.target.value);
  const handleSrt = (e: any) => setSrt(e.target.value);
  const handleClick = (item: any) => setSel(item);

  if (l) return <div style={{textAlign:'center',padding:'20px'}}>Loading...</div>;
  if (e) return <div style={{color:'red'}}>Error!</div>;

  return (
    <div>
      <div>
        <input value={s} onChange={handleS} placeholder="search..." style={{border:'1px solid #ccc',padding:'8px'}}/>
        <select value={srt} onChange={handleSrt}>
          <option value="n">name</option>
          <option value="p">price</option>
          <option value="r">rating</option>
        </select>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
        {d.length === 0 && <p>no products</p>}
        {d.map((item: any) => (
          <div key={item.id} onClick={() => handleClick(item)}
            style={{border:'1px solid #eee',padding:'16px',cursor:'pointer',
              background: sel?.id === item.id ? '#e0f0ff' : 'white'}}>
            <img src={item.img} style={{width:'100%',height:'150px',objectFit:'cover'}}/>
            <h3 style={{fontSize:'14px',marginTop:'8px'}}>{item.nm}</h3>
            <p style={{color:'#888',fontSize:'12px'}}>{item.ctg}</p>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:'8px'}}>
              <span style={{fontWeight:'bold'}}>Rp {item.pr.toLocaleString()}</span>
              {item.dsc > 0 &&
                <span style={{background:'#ff4444',color:'white',fontSize:'11px',padding:'2px 6px',borderRadius:'4px'}}>
                  -{item.dsc}%
                </span>
              }
            </div>
            <div style={{display:'flex',gap:'4px',marginTop:'4px'}}>
              {'⭐'.repeat(Math.round(item.rt))}
              <span style={{fontSize:'11px',color:'#888'}}>({item.rv})</span>
            </div>
            {item.stk === 0 && <p style={{color:'red',fontSize:'12px'}}>Habis</p>}
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:'8px',justifyContent:'center',marginTop:'16px'}}>
        <button onClick={() => setPg(p => p-1)} disabled={pg===1}>prev</button>
        <span>hal {pg}</span>
        <button onClick={() => setPg(p => p+1)}>next</button>
      </div>
    </div>
  );
}

// Masalah yang ada:
// 1. Variabel: d, l, e, s, pg, srt, sel, item.nm, item.pr, item.dsc, item.rt, item.rv, item.stk
// 2. Tipe `any` di mana-mana — TypeScript tidak berguna
// 3. Semua dalam satu file — fetch, UI, pagination, sort, filter
// 4. Inline styles — tidak konsisten, tidak bisa di-reuse
// 5. Event handler generik (handleS, handleSrt)
// 6. Tidak ada error yang informatif
// 7. Pagination tidak tahu kapan "next" harus disabled
```

### Langkah 1: Definisikan Types

```ts
// types/product.types.ts

// Tipe dari API (nama field sesuai API response)
export interface ApiProduct {
  id:       string;
  nm:       string;  // API pakai abbreviated field names
  img:      string;
  ctg:      string;
  pr:       number;
  dsc:      number;  // discount percentage
  rt:       number;  // rating
  rv:       number;  // review count
  stk:      number;  // stock
}

// Tipe untuk UI (nama field yang manusiawi)
export interface Product {
  id:            string;
  name:          string;
  imageUrl:      string;
  category:      string;
  price:         number;
  discountPct:   number;
  rating:        number;
  reviewCount:   number;
  stockCount:    number;
  // Computed di transform function
  discountedPrice: number;
  isOutOfStock:    boolean;
  isOnSale:        boolean;
}

export type SortOption = "name" | "price" | "rating";

export interface ProductListResponse {
  data:        ApiProduct[];
  totalPages:  number;
  totalItems:  number;
}

// Transform raw API → UI type
export function toProduct(raw: ApiProduct): Product {
  const discountedPrice = raw.dsc > 0
    ? Math.round(raw.pr * (1 - raw.dsc / 100))
    : raw.pr;

  return {
    id:            raw.id,
    name:          raw.nm,
    imageUrl:      raw.img,
    category:      raw.ctg,
    price:         raw.pr,
    discountPct:   raw.dsc,
    rating:        raw.rt,
    reviewCount:   raw.rv,
    stockCount:    raw.stk,
    discountedPrice,
    isOutOfStock:  raw.stk === 0,
    isOnSale:      raw.dsc > 0,
  };
}
```

### Langkah 2: Extract Custom Hook

```ts
// hooks/useProductList.ts
import { useState, useEffect, useCallback } from "react";
import type { Product, SortOption, ProductListResponse } from "@/types/product.types";
import { toProduct } from "@/types/product.types";

interface UseProductListOptions {
  category: string;
}

interface UseProductListReturn {
  products:    Product[];
  isLoading:   boolean;
  error:       string | null;
  searchQuery:  string;
  sortBy:       SortOption;
  currentPage:  number;
  totalPages:   number;
  isEmpty:      boolean;
  hasProducts:  boolean;
  setSearchQuery: (query: string) => void;
  setSortBy:      (sort: SortOption) => void;
  setCurrentPage: (page: number) => void;
  retry:          () => void;
}

export function useProductList({ category }: UseProductListOptions): UseProductListReturn {
  const [products,    setProducts]    = useState<Product[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [sortBy,       setSortBy]       = useState<SortOption>("name");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [retryCount,   setRetryCount]   = useState(0);

  // Reset ke halaman 1 kalau filter berubah
  useEffect(() => { setCurrentPage(1); }, [searchQuery, sortBy, category]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      cat:    category,
      page:   currentPage.toString(),
      sort:   sortBy,
      search: searchQuery,
    });

    fetch(`https://api.example.com/products?${params}`, {
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Kategori tidak ditemukan"
              : "Gagal memuat produk. Coba lagi."
          );
        }
        return response.json() as Promise<ProductListResponse>;
      })
      .then(data => {
        setProducts(data.data.map(toProduct));
        setTotalPages(data.totalPages);
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [category, currentPage, sortBy, searchQuery, retryCount]);

  const retry = useCallback(() => setRetryCount(c => c + 1), []);

  return {
    products,
    isLoading,
    error,
    searchQuery,
    sortBy,
    currentPage,
    totalPages,
    isEmpty:     !isLoading && !error && products.length === 0,
    hasProducts: products.length > 0,
    setSearchQuery,
    setSortBy,
    setCurrentPage,
    retry,
  };
}
```

### Langkah 3: Buat UI Components

```tsx
// components/ProductCard/ProductCard.tsx
import type { Product } from "@/types/product.types";
import { formatRupiah } from "@/lib/formatters";
import styles from "./ProductCard.module.css";

interface ProductCardProps {
  product:      Product;
  isSelected:   boolean;
  onSelect:     (product: Product) => void;
}

export function ProductCard({ product, isSelected, onSelect }: ProductCardProps) {
  return (
    <article
      className={`${styles.card} ${isSelected ? styles.selected : ""}`}
      onClick={() => onSelect(product)}
      aria-pressed={isSelected}
      aria-label={`${product.name}, ${formatRupiah(product.discountedPrice)}`}
    >
      <div className={styles.imageWrapper}>
        <img
          src={product.imageUrl}
          alt={product.name}
          className={styles.image}
          loading="lazy"
        />
        {product.isOnSale && (
          <span className={styles.discountBadge} aria-label={`Diskon ${product.discountPct}%`}>
            -{product.discountPct}%
          </span>
        )}
        {product.isOutOfStock && (
          <div className={styles.outOfStockOverlay}>
            <span>Stok Habis</span>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <p className={styles.category}>{product.category}</p>
        <h3 className={styles.name}>{product.name}</h3>

        <div className={styles.pricing}>
          <span className={styles.discountedPrice}>
            {formatRupiah(product.discountedPrice)}
          </span>
          {product.isOnSale && (
            <span className={styles.originalPrice}>
              {formatRupiah(product.price)}
            </span>
          )}
        </div>

        <ProductRating rating={product.rating} reviewCount={product.reviewCount} />
      </div>
    </article>
  );
}

// Sub-komponen kecil yang hanya ada untuk ProductCard
function ProductRating({ rating, reviewCount }: {
  rating:      number;
  reviewCount: number;
}) {
  const fullStars  = Math.floor(rating);
  const hasHalf    = rating % 1 >= 0.5;

  return (
    <div className={styles.rating} aria-label={`Rating ${rating} dari 5`}>
      <span aria-hidden="true">
        {"★".repeat(fullStars)}
        {hasHalf ? "½" : ""}
        {"☆".repeat(5 - fullStars - (hasHalf ? 1 : 0))}
      </span>
      <span className={styles.reviewCount}>({reviewCount.toLocaleString("id-ID")})</span>
    </div>
  );
}
```

```tsx
// components/ProductListControls/ProductListControls.tsx
import type { SortOption } from "@/types/product.types";
import styles from "./ProductListControls.module.css";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name",   label: "Nama A-Z" },
  { value: "price",  label: "Harga Terendah" },
  { value: "rating", label: "Rating Tertinggi" },
];

interface ProductListControlsProps {
  searchQuery:       string;
  sortBy:            SortOption;
  totalItems?:       number;
  onSearchChange:    (query: string) => void;
  onSortChange:      (sort: SortOption) => void;
}

export function ProductListControls({
  searchQuery,
  sortBy,
  totalItems,
  onSearchChange,
  onSortChange,
}: ProductListControlsProps) {
  return (
    <div className={styles.controls}>
      <div className={styles.searchWrapper}>
        <span className={styles.searchIcon} aria-hidden="true">🔍</span>
        <input
          type="search"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Cari produk..."
          className={styles.searchInput}
          aria-label="Cari produk"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className={styles.clearButton}
            aria-label="Hapus pencarian"
          >
            ✕
          </button>
        )}
      </div>

      <div className={styles.sortWrapper}>
        <label htmlFor="sort-select" className={styles.sortLabel}>Urutkan:</label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={e => onSortChange(e.target.value as SortOption)}
          className={styles.sortSelect}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {totalItems !== undefined && (
        <p className={styles.resultCount} aria-live="polite">
          {totalItems.toLocaleString("id-ID")} produk ditemukan
        </p>
      )}
    </div>
  );
}
```

```tsx
// components/Pagination/Pagination.tsx
import styles from "./Pagination.module.css";

interface PaginationProps {
  currentPage:  number;
  totalPages:   number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const isFirstPage = currentPage === 1;
  const isLastPage  = currentPage === totalPages;

  // Buat array halaman yang ditampilkan (max 5)
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav className={styles.pagination} aria-label="Navigasi halaman">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isFirstPage}
        className={styles.navButton}
        aria-label="Halaman sebelumnya"
      >
        ← Sebelumnya
      </button>

      <div className={styles.pageNumbers}>
        {pageNumbers.map((pageNum, idx) =>
          pageNum === "..." ? (
            <span key={`ellipsis-${idx}`} className={styles.ellipsis}>...</span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum as number)}
              className={`${styles.pageButton} ${currentPage === pageNum ? styles.active : ""}`}
              aria-label={`Halaman ${pageNum}`}
              aria-current={currentPage === pageNum ? "page" : undefined}
            >
              {pageNum}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLastPage}
        className={styles.navButton}
        aria-label="Halaman berikutnya"
      >
        Berikutnya →
      </button>
    </nav>
  );
}

// Helper: buat array nomor halaman dengan ellipsis untuk halaman banyak
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total-4, total-3, total-2, total-1, total];

  return [1, "...", current-1, current, current+1, "...", total];
}
```

### Langkah 4: Komponen Utama yang Bersih

```tsx
// components/ProductList/ProductList.tsx
"use client";

import { useState }                from "react";
import { useProductList }          from "@/hooks/useProductList";
import { ProductCard }             from "@/components/ProductCard/ProductCard";
import { ProductListControls }     from "@/components/ProductListControls/ProductListControls";
import { Pagination }              from "@/components/Pagination/Pagination";
import { ProductGridSkeleton }     from "@/components/skeletons/ProductGridSkeleton";
import type { Product }            from "@/types/product.types";
import styles                      from "./ProductList.module.css";

interface ProductListProps {
  category: string;
}

export default function ProductList({ category }: ProductListProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const {
    products,
    isLoading,
    error,
    searchQuery,
    sortBy,
    currentPage,
    totalPages,
    isEmpty,
    hasProducts,
    setSearchQuery,
    setSortBy,
    setCurrentPage,
    retry,
  } = useProductList({ category });

  return (
    <section className={styles.wrapper} aria-label={`Daftar produk ${category}`}>
      {/* Controls — search & sort */}
      <ProductListControls
        searchQuery={searchQuery}
        sortBy={sortBy}
        totalItems={hasProducts ? products.length : undefined}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
      />

      {/* Status states */}
      {isLoading && <ProductGridSkeleton count={6} />}

      {error && (
        <div className={styles.errorState} role="alert">
          <span className={styles.errorIcon} aria-hidden="true">⚠️</span>
          <p className={styles.errorMessage}>{error}</p>
          <button onClick={retry} className={styles.retryButton}>
            Coba Lagi
          </button>
        </div>
      )}

      {isEmpty && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon} aria-hidden="true">🔍</span>
          <p className={styles.emptyTitle}>Produk tidak ditemukan</p>
          <p className={styles.emptySubtitle}>
            Coba kata kunci lain atau hapus filter pencarian
          </p>
          <button onClick={() => setSearchQuery("")} className={styles.clearSearchButton}>
            Hapus Pencarian
          </button>
        </div>
      )}

      {/* Product grid */}
      {hasProducts && (
        <div className={styles.grid} role="list">
          {products.map(product => (
            <div key={product.id} role="listitem">
              <ProductCard
                product={product}
                isSelected={selectedProduct?.id === product.id}
                onSelect={setSelectedProduct}
              />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasProducts && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </section>
  );
}
```

### Perbandingan Sebelum vs Sesudah

```
SEBELUM (1 file):
  ProductList.tsx — 140 baris
  ├── State: 7 variabel dengan nama satu huruf
  ├── Tipe: any untuk semua
  ├── Logic: fetch + transform + UI + styling semua campur
  ├── Styling: inline style hardcoded
  └── Tidak bisa di-test

SESUDAH (terorganisir):
  types/product.types.ts     — Type definitions + transform function
  lib/formatters.ts          — Format Rupiah (sudah ada dari sebelumnya)
  hooks/useProductList.ts    — Data fetching & state logic
  components/
    ProductCard/             — Tampilan satu produk
    ProductListControls/     — Search & sort UI
    Pagination/              — Navigasi halaman
    skeletons/               — Loading states
    ProductList/             — Orchestrator (komponen utama)

Keuntungan:
  ✅ useProductList bisa di-test tanpa render komponen apapun
  ✅ ProductCard bisa dipakai di halaman wishlist, search results, dll.
  ✅ Pagination bisa dipakai di komponen list lain
  ✅ Ganti API → hanya ubah hook
  ✅ Ganti UI card → hanya ubah ProductCard
  ✅ Nama jelas → bisa onboard developer baru lebih cepat
```

---

## 10. Checklist Code Review Diri Sendiri

Sebelum push dan buat PR, jalankan checklist ini:

### Penamaan

```
☐ Semua variabel state punya nama yang menjelaskan isinya?
  Bukan: d, l, e, tmp, val
  
☐ Boolean state pakai prefix is/has/can/should?
  Bukan: loading, error, modal
  Tapi: isLoading, hasError, isModalOpen
  
☐ Event handler punya format yang konsisten?
  handle[Object][Action] atau on[Object][Action]
  Contoh: handleFormSubmit, onProductSelect
  
☐ Props interface semua field punya nama yang informatif?

☐ Tidak ada `any` yang tersisa?
  Pakai `unknown` atau buat interface yang proper
```

### Struktur & Tanggung Jawab

```
☐ Komponen bisa dijelaskan dalam satu kalimat?
  Kalau butuh kata "dan" → mungkin terlalu besar
  
☐ Logic fetch/validasi/transform dipisah dari JSX?
  Logic → custom hook / lib function
  Tampilan → komponen
  
☐ Ada JSX yang muncul lebih dari 2 kali dengan struktur identik?
  → Abstraksikan ke komponen atau mapped array
  
☐ Ada code yang di-copy dari file lain?
  → Move ke shared utility
  
☐ Komponen tidak lebih dari ~80-100 baris JSX?
  Kalau lebih → evaluasi apakah perlu dipecah
```

### Hooks & State

```
☐ Semua useEffect punya cleanup function kalau butuh?
  (fetch → AbortController, subscription → unsubscribe)
  
☐ Dependency array useEffect/useMemo/useCallback sudah benar?
  Jangan dependency array kosong [] kalau sebenarnya ada deps
  
☐ Tidak ada state yang duplicate/derived yang harusnya computed?
  Bukan: const [filteredProducts, setFilteredProducts] = useState([])
  Tapi:  const filteredProducts = products.filter(...)
  
☐ setState tidak dipanggil langsung setelah setState lain?
  → Gabungkan ke satu useReducer atau satu object state
```

### Komentar & Dokumentasi

```
☐ Tidak ada komentar yang hanya mengulang kode?
  // Increment counter — HAPUS

☐ Komentar "KENAPA", bukan "APA"?
  ✓ // Timeout 0 karena butuh microtask delay setelah DOM update
  ✗ // Set timeout to 0
  
☐ Tidak ada kode yang di-comment out?
  → Delete saja, ada git kalau mau lihat history
  
☐ Fungsi publik punya JSDoc kalau tidak obvious?
  (Parameter, return value, contoh penggunaan)
```

### TypeScript

```
☐ Tidak ada `any` yang tidak disengaja?

☐ Type inference dimanfaatkan (tidak type semua secara eksplisit)?
  const items = [1, 2, 3]        // TypeScript tahu ini number[]
  const items: number[] = [1, 2, 3] // Redundant — tidak perlu

☐ Props interface props opsional (?) vs required sudah tepat?

☐ Union types untuk diskriminasi state?
  type Status = "idle" | "loading" | "success" | "error"
  Bukan: isLoading + isError + isSuccess yang bisa conflict
  
☐ Type data dari API terpisah dari type untuk UI?
  ApiProduct (raw dari server) vs Product (untuk render)
```

### Performance & Security

```
☐ List rendering pakai key yang stabil (bukan index)?
  key={item.id}  ✓
  key={index}    ✗ (kalau list bisa berubah order)
  
☐ Callback yang di-pass ke child sudah di-wrap useCallback?
  (Kalau child adalah React.memo atau ada di dependency array)
  
☐ Image pakai next/image dengan ukuran yang tepat?

☐ Tidak ada credential/token di kode?

☐ User input tidak langsung dipakai di dangerouslySetInnerHTML?
```

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Next.js 15*
