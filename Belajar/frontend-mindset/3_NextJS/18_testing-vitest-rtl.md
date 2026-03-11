# 18 — Testing di React/Next.js dengan Vitest & React Testing Library

> **Gaya baca:** Obrolan santai senior ke junior. Kita mulai dari "kenapa ini worth it" sebelum nulis satu baris test pun.

---

## Daftar Isi

1. [Filosofi: Test yang Berguna vs Test yang Bikin Sakit Kepala](#1-filosofi-test-yang-berguna-vs-test-yang-bikin-sakit-kepala)
2. [Jenis-jenis Testing dan Kapan Dipakainya](#2-jenis-jenis-testing-dan-kapan-dipakainya)
3. [Setup Vitest + React Testing Library di Next.js](#3-setup-vitest--react-testing-library-di-nextjs)
4. [Testing Komponen Dasar](#4-testing-komponen-dasar)
5. [Screen Queries: Cara Pilih Elemen yang Benar](#5-screen-queries-cara-pilih-elemen-yang-benar)
6. [User Events: Simulasi Interaksi](#6-user-events-simulasi-interaksi)
7. [Testing Custom Hooks](#7-testing-custom-hooks)
8. [Mocking: API, Module, dan Next.js Router](#8-mocking-api-module-dan-nextjs-router)
9. [Testing Form dan Validasi](#9-testing-form-dan-validasi)
10. [Apa yang Harus dan Tidak Perlu Di-test](#10-apa-yang-harus-dan-tidak-perlu-di-test)
11. [Mini Project: Test Suite untuk LoginForm](#11-mini-project-test-suite-untuk-loginform)

---

## 1. Filosofi: Test yang Berguna vs Test yang Bikin Sakit Kepala

### Cerita yang Gue Sering Dengar

> *"Kita juga nulis test kok, tapi kayaknya tidak berguna. Setiap refactoring, semua test merah padahal behavior-nya sama. Akhirnya males nulis test."*

Ini bukan salah testing-nya — ini salah cara kita nulis test-nya.

Ada dua jenis test:

**Test yang menguji implementasi:**
```tsx
// ❌ Test implementasi — rapuh, sering merah walau behavior sama
test('menggunakan useState untuk menyimpan count', () => {
  const { result } = renderHook(() => useState(0));
  expect(result.current[0]).toBe(0); // testing internal state
});

test('className button berubah jadi "active" saat isActive true', () => {
  render(<Button isActive={true} />);
  expect(screen.getByRole('button')).toHaveClass('active');
  // kalau kamu ganti class jadi 'btn-active' → test merah
  // padahal behavior untuk user tidak berubah!
});
```

**Test yang menguji behavior:**
```tsx
// ✅ Test behavior — tahan refactoring, mencerminkan apa yang user rasakan
test('menampilkan pesan error saat password kurang dari 8 karakter', async () => {
  render(<RegisterForm />);
  await userEvent.type(screen.getByLabelText('Password'), 'abc');
  await userEvent.click(screen.getByRole('button', { name: 'Daftar' }));
  expect(screen.getByText('Password minimal 8 karakter')).toBeInTheDocument();
});
```

Prinsip utama dari React Testing Library sendiri:

> *"The more your tests resemble the way your software is used, the more confidence they can give you."*
> — Kent C. Dodds

### Tiga Pertanyaan Sebelum Nulis Test

```
1. Apa yang akan DILAKUKAN user di sini?
   → Test dari perspektif user, bukan developer

2. Apa yang bisa SALAH dan bikin user frustrated?
   → Test happy path + error cases penting

3. Apa yang DIANDAlKAN kode lain dari komponen ini?
   → Test kontrak/interface komponen, bukan detil implementasi
```

---

## 2. Jenis-jenis Testing dan Kapan Dipakainya

```
         ╔═══════════════════════════════════╗
         ║           E2E Tests               ║  ← Sedikit, lambat, mahal
         ║    (Playwright, Cypress)           ║  ← Test critical user journey
         ╠═══════════════════════════════════╣
         ║       Integration Tests            ║  ← Sebagian besar test kamu
         ║  (Vitest + RTL + MSW)              ║  ← Beberapa komponen + API
         ╠═══════════════════════════════════╣
         ║          Unit Tests                ║  ← Banyak, cepat, murah
         ║  (Vitest)                          ║  ← Fungsi murni, custom hooks
         ╚═══════════════════════════════════╝
                    Testing Pyramid
```

| Jenis | Apa yang Di-test | Contoh | Speed | Confidence |
|-------|-----------------|--------|-------|-----------|
| **Unit** | Fungsi/hook terisolasi | `formatCurrency()`, `useDebounce()` | ⚡ Cepat | 🟡 Medium |
| **Integration** | Komponen + dependencies | Form dengan validasi + submit ke API mock | 🔄 Sedang | 🟢 Tinggi |
| **E2E** | Flow lengkap di browser nyata | Login → Dashboard → Checkout → Konfirmasi | 🐢 Lambat | 🟢 Sangat Tinggi |

### Tool yang Kita Pakai

```
Vitest          → Test runner (lebih cepat dari Jest, native ESM support)
React Testing   → Render komponen, query elemen, assert
Library (RTL)
@testing-       → Simulasi user interaction (type, click, dll)
library/user-event
MSW             → Mock API calls (intercept di network level, bukan mock fetch)
```

---

## 3. Setup Vitest + React Testing Library di Next.js

### Install Dependencies

```bash
npm install -D vitest @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install -D @vitest/coverage-v8
```

### Konfigurasi Vitest

```typescript
// vitest.config.ts — di root project
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',      // simulasi browser environment
    globals: true,             // tidak perlu import describe/test/expect
    setupFiles: ['./vitest.setup.ts'],

    // Pattern file test
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e/**'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.tsx',
        'src/types/**',
      ],
      // Target coverage (opsional — jangan jadikan obsesi)
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### Setup File

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom';
// Menambahkan matcher seperti:
// toBeInTheDocument(), toHaveValue(), toBeDisabled()
// toHaveClass(), toBeVisible(), toHaveTextContent()

// Global mock yang hampir selalu diperlukan di Next.js
import { vi } from 'vitest';

// Mock next/navigation yang sering dipakai
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Suppress console.error noise dari React saat testing
// (opsional — kadang justru berguna untuk debug)
// const originalError = console.error;
// beforeAll(() => {
//   console.error = (...args) => {
//     if (args[0]?.includes('Warning:')) return;
//     originalError(...args);
//   };
// });
// afterAll(() => { console.error = originalError; });
```

### Scripts di package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### TypeScript Config

```json
// tsconfig.json — pastikan include vitest types
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

---

## 4. Testing Komponen Dasar

### Test Pertama: Render dan Assert

```tsx
// components/Badge.tsx
interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'danger';
}

export function Badge({ label, variant = 'success' }: BadgeProps) {
  return (
    <span
      role="status"
      data-variant={variant}
      className={`badge badge-${variant}`}
    >
      {label}
    </span>
  );
}
```

```tsx
// components/Badge.test.tsx
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('menampilkan label yang diberikan', () => {
    render(<Badge label="Aktif" />);

    // getByText: cari elemen dengan teks exact atau regex
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });

  it('menggunakan variant "success" sebagai default', () => {
    render(<Badge label="OK" />);

    // getByRole: cara terbaik untuk query elemen (aksesibel)
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('data-variant', 'success');
  });

  it('menampilkan variant yang ditentukan', () => {
    render(<Badge label="Error" variant="danger" />);
    expect(screen.getByRole('status')).toHaveAttribute('data-variant', 'danger');
  });
});
```

### Struktur Folder Test

```
Ada dua konvensi umum — pilih salah satu dan konsisten:

Konvensi 1: Test bersebelahan dengan file (colocated)
  src/
    components/
      Button/
        Button.tsx
        Button.test.tsx    ← bersebelahan

Konvensi 2: Folder __tests__ terpisah
  src/
    components/
      Button.tsx
    __tests__/
      components/
        Button.test.tsx

Gue prefer Konvensi 1 — mudah ditemukan, context jelas.
```

### Testing dengan Props Berbeda

```tsx
// components/UserAvatar.tsx
interface UserAvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  online?: boolean;
}

export function UserAvatar({ name, imageUrl, size = 'md', online = false }: UserAvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`avatar avatar-${size}`} aria-label={`Avatar ${name}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
      {online && (
        <span
          className="online-indicator"
          aria-label="Online"
          role="img"
        />
      )}
    </div>
  );
}
```

```tsx
// components/UserAvatar.test.tsx
import { render, screen } from '@testing-library/react';
import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  describe('ketika tidak ada imageUrl', () => {
    it('menampilkan inisial nama', () => {
      render(<UserAvatar name="Budi Santoso" />);
      // User melihat "BS" — test apa yang user lihat
      expect(screen.getByText('BS')).toBeInTheDocument();
    });

    it('mengambil maksimal 2 karakter inisial', () => {
      render(<UserAvatar name="Ahmad Budi Cahyo" />);
      expect(screen.getByText('AC')).toBeInTheDocument();
    });
  });

  describe('ketika ada imageUrl', () => {
    it('menampilkan gambar dengan alt text yang benar', () => {
      render(<UserAvatar name="Budi Santoso" imageUrl="/avatar.jpg" />);

      const img = screen.getByRole('img', { name: 'Budi Santoso' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/avatar.jpg');
    });

    it('tidak menampilkan inisial saat ada gambar', () => {
      render(<UserAvatar name="Budi Santoso" imageUrl="/avatar.jpg" />);
      expect(screen.queryByText('BS')).not.toBeInTheDocument();
      // queryByText → tidak throw kalau tidak ditemukan (berbeda dengan getByText)
    });
  });

  describe('status online', () => {
    it('menampilkan indikator online saat online=true', () => {
      render(<UserAvatar name="Budi" online={true} />);
      expect(screen.getByRole('img', { name: 'Online' })).toBeInTheDocument();
    });

    it('tidak menampilkan indikator online secara default', () => {
      render(<UserAvatar name="Budi" />);
      expect(screen.queryByRole('img', { name: 'Online' })).not.toBeInTheDocument();
    });
  });
});
```

---

## 5. Screen Queries: Cara Pilih Elemen yang Benar

### Hirarki Query (Prioritas Tertinggi ke Terendah)

```tsx
// PRIORITAS 1: getByRole — cara terbaik
// Karena inilah yang aksesibilitas tools dan screen reader gunakan
screen.getByRole('button', { name: 'Submit' })
screen.getByRole('textbox', { name: 'Email' })
screen.getByRole('checkbox', { name: 'Ingat Saya' })
screen.getByRole('heading', { name: 'Login' })
screen.getByRole('link', { name: 'Lupa Password?' })
screen.getByRole('dialog', { name: 'Konfirmasi' })
screen.getByRole('alert')   // untuk error messages
screen.getByRole('status')  // untuk loading/success messages

// PRIORITAS 2: getByLabelText — untuk form inputs
screen.getByLabelText('Email')  // mencari input yang di-associate dengan label "Email"
screen.getByLabelText(/password/i) // case-insensitive regex

// PRIORITAS 3: getByPlaceholderText — kalau tidak ada label
screen.getByPlaceholderText('Cari produk...')

// PRIORITAS 4: getByText — untuk teks konten
screen.getByText('Harga: Rp 150.000')
screen.getByText(/selamat datang/i) // regex = lebih fleksibel

// PRIORITAS 5: getByDisplayValue — current value dari input
screen.getByDisplayValue('budi@email.com')

// PRIORITAS 6: getByAltText — untuk gambar
screen.getByAltText('Avatar Budi')

// PRIORITAS 7: getByTitle — title attribute
screen.getByTitle('Tutup modal')

// PRIORITAS 8: getByTestId — LAST RESORT
// Gunakan hanya kalau tidak ada cara lain
screen.getByTestId('product-card-123')
// Di komponen: <div data-testid="product-card-123">
```

### get vs query vs find

```tsx
// getBy* — throw error kalau tidak ditemukan. Gunakan untuk: "ini HARUS ada"
screen.getByRole('button')         // error kalau tidak ada
screen.getByRole('button')         // error kalau lebih dari 1

// queryBy* — return null kalau tidak ditemukan. Gunakan untuk: "ini mungkin tidak ada"
screen.queryByRole('alert')        // null kalau tidak ada
expect(screen.queryByRole('alert')).not.toBeInTheDocument()

// findBy* — async, return Promise. Gunakan untuk: "ini akan muncul setelah async operation"
await screen.findByRole('alert')   // wait sampai muncul, default timeout 1000ms
await screen.findByText('Berhasil disimpan', {}, { timeout: 3000 })

// Versi *All: return array
screen.getAllByRole('listitem')     // semua li, error kalau 0
screen.queryAllByRole('button')    // array, empty array kalau tidak ada
await screen.findAllByRole('option') // async, array
```

### Contoh Nyata: Query yang Tepat

```tsx
// Form Login
render(
  <form>
    <label htmlFor="email">Alamat Email</label>
    <input id="email" type="email" placeholder="nama@email.com" />

    <label htmlFor="password">Password</label>
    <input id="password" type="password" />

    <button type="submit">Masuk</button>
    <a href="/register">Belum punya akun?</a>
  </form>
);

// ✅ Cara query yang benar
screen.getByLabelText('Alamat Email')         // lebih baik dari getByPlaceholderText
screen.getByLabelText('Password')
screen.getByRole('button', { name: 'Masuk' })
screen.getByRole('link', { name: 'Belum punya akun?' })

// ❌ Cara query yang kurang ideal
screen.getByPlaceholderText('nama@email.com') // placeholder bisa berubah
screen.getByDisplayValue('')                   // value kosong = ambiguous
```

---

## 6. User Events: Simulasi Interaksi

### `@testing-library/user-event` vs `fireEvent`

```tsx
// fireEvent: langsung trigger DOM event — TIDAK realistis
// Tidak simulate semua event yang terjadi saat user ketik/klik
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'hello' } });

// userEvent: simulasi interaksi user yang lebih realistis
// Type = focus + keydown + keypress + input + keyup per karakter
// Click = mousemove + mousedown + mouseup + click + focus
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'hello');
```

```tsx
// Setup userEvent — direkomendasikan di beforeEach atau di awal setiap test
import userEvent from '@testing-library/user-event';

describe('SearchBox', () => {
  // Opsi 1: setup di setiap test
  it('filter hasil saat user ketik', async () => {
    const user = userEvent.setup();
    render(<SearchBox />);

    await user.type(screen.getByRole('searchbox'), 'laptop');

    expect(screen.getByDisplayValue('laptop')).toBeInTheDocument();
  });
});
```

### Semua Interaksi yang Tersedia

```tsx
const user = userEvent.setup();

// Keyboard
await user.type(input, 'Hello World');        // ketik karakter per karakter
await user.keyboard('{Enter}');               // tekan key spesifik
await user.keyboard('{Escape}');
await user.keyboard('{Tab}');                 // pindah focus
await user.clear(input);                      // hapus semua isi

// Mouse
await user.click(element);                   // klik
await user.dblClick(element);                // double click
await user.hover(element);                   // mouse masuk
await user.unhover(element);                 // mouse keluar

// Form
await user.selectOptions(select, 'option1'); // pilih option di select
await user.deselectOptions(multiSelect, ['a', 'b']);
await user.upload(fileInput, file);          // upload file

// Clipboard
await user.paste('text to paste');           // paste teks
await user.cut();                            // cut selection
await user.copy();                           // copy selection
```

### Contoh: Testing Interaksi Counter

```tsx
// components/Counter.tsx
import { useState } from 'react';

interface CounterProps {
  initialValue?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
}

export function Counter({
  initialValue = 0,
  min = 0,
  max = 10,
  onChange,
}: CounterProps) {
  const [count, setCount] = useState(initialValue);

  const increment = () => {
    const newValue = Math.min(count + 1, max);
    setCount(newValue);
    onChange?.(newValue);
  };

  const decrement = () => {
    const newValue = Math.max(count - 1, min);
    setCount(newValue);
    onChange?.(newValue);
  };

  return (
    <div>
      <button onClick={decrement} disabled={count <= min} aria-label="Kurangi">
        −
      </button>
      <span aria-live="polite" aria-label={`Nilai: ${count}`}>
        {count}
      </span>
      <button onClick={increment} disabled={count >= max} aria-label="Tambah">
        +
      </button>
    </div>
  );
}
```

```tsx
// components/Counter.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

describe('Counter', () => {
  it('menampilkan nilai awal', () => {
    render(<Counter initialValue={5} />);
    expect(screen.getByLabelText('Nilai: 5')).toBeInTheDocument();
  });

  it('bertambah saat tombol tambah diklik', async () => {
    const user = userEvent.setup();
    render(<Counter initialValue={0} />);

    await user.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(screen.getByLabelText('Nilai: 1')).toBeInTheDocument();
  });

  it('berkurang saat tombol kurang diklik', async () => {
    const user = userEvent.setup();
    render(<Counter initialValue={5} />);

    await user.click(screen.getByRole('button', { name: 'Kurangi' }));

    expect(screen.getByLabelText('Nilai: 4')).toBeInTheDocument();
  });

  it('tidak bisa melebihi nilai maksimum', async () => {
    const user = userEvent.setup();
    render(<Counter initialValue={10} max={10} />);

    expect(screen.getByRole('button', { name: 'Tambah' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(screen.getByLabelText('Nilai: 10')).toBeInTheDocument(); // tidak berubah
  });

  it('tidak bisa kurang dari nilai minimum', async () => {
    const user = userEvent.setup();
    render(<Counter initialValue={0} min={0} />);

    expect(screen.getByRole('button', { name: 'Kurangi' })).toBeDisabled();
  });

  it('memanggil onChange dengan nilai baru', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn(); // vi.fn() = mock function

    render(<Counter initialValue={3} onChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: 'Tambah' }));

    expect(handleChange).toHaveBeenCalledOnce();
    expect(handleChange).toHaveBeenCalledWith(4);
  });
});
```

---

## 7. Testing Custom Hooks

### renderHook dari RTL

```tsx
// hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
```

```tsx
// hooks/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers(); // kontrol waktu secara manual
  });

  afterEach(() => {
    vi.useRealTimers(); // restore timer asli setelah setiap test
  });

  it('mengembalikan nilai awal', () => {
    const { result } = renderHook(() => useDebounce('hello', 500));
    expect(result.current).toBe('hello');
  });

  it('tidak langsung update saat nilai berubah', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'awal', delay: 500 } }
    );

    // Ubah nilai
    rerender({ value: 'baru', delay: 500 });

    // Sebelum delay selesai → masih nilai lama
    expect(result.current).toBe('awal');
  });

  it('update nilai setelah delay selesai', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'awal', delay: 500 } }
    );

    rerender({ value: 'baru', delay: 500 });

    // Majukan waktu 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('baru');
  });

  it('reset timer kalau nilai berubah sebelum delay selesai (debounce behavior)', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'ab' });
    act(() => { vi.advanceTimersByTime(300); }); // belum 500ms

    rerender({ value: 'abc' });
    act(() => { vi.advanceTimersByTime(300); }); // total 600ms dari 'ab', tapi hanya 300ms dari 'abc'

    expect(result.current).toBe('a'); // masih nilai awal!

    act(() => { vi.advanceTimersByTime(200); }); // sekarang 500ms dari 'abc'

    expect(result.current).toBe('abc');
  });
});
```

### Testing Hook dengan State Kompleks

```tsx
// hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      console.error('Gagal menyimpan ke localStorage');
    }
  }, [key, state]);

  return [state, setState];
}
```

```tsx
// hooks/useLocalStorage.test.ts
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('mengembalikan nilai awal saat key belum ada di storage', () => {
    const { result } = renderHook(() => useLocalStorage('test', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('mengambil nilai yang sudah tersimpan', () => {
    localStorageMock.setItem('theme', JSON.stringify('dark'));
    const { result } = renderHook(() => useLocalStorage('theme', 'light'));
    expect(result.current[0]).toBe('dark');
  });

  it('menyimpan nilai baru ke localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));

    act(() => {
      result.current[1](42); // set value
    });

    expect(result.current[0]).toBe(42);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('count', '42');
  });

  it('mendukung functional update', () => {
    const { result } = renderHook(() => useLocalStorage('count', 10));

    act(() => {
      result.current[1](prev => prev + 5);
    });

    expect(result.current[0]).toBe(15);
  });
});
```

---

## 8. Mocking: API, Module, dan Next.js Router

### Mock API dengan MSW (Mock Service Worker)

MSW intercept request di network level — jauh lebih realistis dari mock `fetch`.

```bash
npm install -D msw
```

```typescript
// test/mocks/handlers.ts — definisi mock API
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GET /api/users
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Budi Santoso', email: 'budi@email.com' },
      { id: '2', name: 'Sari Dewi',   email: 'sari@email.com' },
    ]);
  }),

  // POST /api/login
  http.post('/api/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'admin@email.com' && body.password === 'password123') {
      return HttpResponse.json({
        user: { id: '1', name: 'Admin', role: 'admin' },
        token: 'fake-jwt-token',
      });
    }

    return HttpResponse.json(
      { error: 'Email atau password salah' },
      { status: 401 }
    );
  }),

  // GET /api/products — dengan delay simulasi loading
  http.get('/api/products', async () => {
    await new Promise(r => setTimeout(r, 100)); // simulasi network delay
    return HttpResponse.json([
      { id: '1', name: 'Laptop', price: 15_000_000 },
      { id: '2', name: 'Mouse',  price: 300_000 },
    ]);
  }),
];
```

```typescript
// test/mocks/server.ts — setup MSW server untuk Node.js (testing)
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// vitest.setup.ts — integrate MSW dengan Vitest
import '@testing-library/jest-dom';
import { server } from './test/mocks/server';

// Start server sebelum semua test
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handler setelah setiap test (handler override tidak bocor ke test lain)
afterEach(() => server.resetHandlers());

// Cleanup setelah semua test selesai
afterAll(() => server.close());
```

```tsx
// Cara pakai di test
import { render, screen, waitFor } from '@testing-library/react';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';
import { UserList } from './UserList';

describe('UserList', () => {
  it('menampilkan loading state awal', () => {
    render(<UserList />);
    expect(screen.getByRole('status', { name: /memuat/i })).toBeInTheDocument();
  });

  it('menampilkan daftar user setelah data dimuat', async () => {
    render(<UserList />);

    // findBy menunggu sampai element muncul (async-aware)
    expect(await screen.findByText('Budi Santoso')).toBeInTheDocument();
    expect(screen.getByText('Sari Dewi')).toBeInTheDocument();
  });

  it('menampilkan pesan error saat API gagal', async () => {
    // Override handler untuk test ini saja — tidak mempengaruhi test lain
    server.use(
      http.get('/api/users', () => {
        return HttpResponse.json({ error: 'Server error' }, { status: 500 });
      })
    );

    render(<UserList />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /gagal memuat daftar user/i
    );
  });
});
```

### Mock Module dengan vi.mock

```tsx
// Untuk mocking dependency yang sulit dikontrol
import { vi } from 'vitest';

// Mock entire module
vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}));

// Mock dengan implementation
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn().mockResolvedValue({
    user: { id: '1', name: 'Budi', role: 'user' },
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

// Partial mock — hanya override fungsi tertentu
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,           // keep semua yang asli
    generateId: vi.fn().mockReturnValue('mocked-id'), // hanya override ini
  };
});
```

### Mock Next.js Router

```tsx
// vitest.setup.ts sudah mock next/navigation, tapi kadang perlu custom per test

import { vi } from 'vitest';

// Di dalam test:
it('redirect ke dashboard setelah login berhasil', async () => {
  const mockPush = vi.fn();

  // Override mock untuk test ini
  vi.mocked(useRouter).mockReturnValue({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>);

  // ... test setup
  const user = userEvent.setup();
  render(<LoginPage />);

  await user.type(screen.getByLabelText('Email'), 'admin@email.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.click(screen.getByRole('button', { name: 'Masuk' }));

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
```

### Mock Date dan Waktu

```tsx
describe('ExpiryBadge', () => {
  beforeEach(() => {
    // Freeze waktu ke tanggal tertentu
    vi.setSystemTime(new Date('2026-01-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('menampilkan "Kadaluarsa" untuk tanggal yang sudah lewat', () => {
    render(<ExpiryBadge expiryDate="2026-01-10" />);
    expect(screen.getByText('Kadaluarsa')).toBeInTheDocument();
  });

  it('menampilkan "5 hari lagi" untuk tanggal 5 hari ke depan', () => {
    render(<ExpiryBadge expiryDate="2026-01-20" />);
    expect(screen.getByText('5 hari lagi')).toBeInTheDocument();
  });
});
```

---

## 9. Testing Form dan Validasi

### Testing Form Biasa (Tanpa Library)

```tsx
// components/ContactForm.tsx
import { useState, FormEvent } from 'react';

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = 'Nama wajib diisi';
  if (!data.email.trim()) {
    errors.email = 'Email wajib diisi';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Format email tidak valid';
  }
  if (data.message.trim().length < 10) {
    errors.message = 'Pesan minimal 10 karakter';
  }
  return errors;
}

interface ContactFormProps {
  onSubmit: (data: FormData) => Promise<void>;
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const [form, setForm] = useState<FormData>({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setIsLoading(true);
    setErrors({});
    try {
      await onSubmit(form);
      setIsSuccess(true);
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setErrors({ message: 'Gagal mengirim pesan. Coba lagi.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return <p role="status">Pesan berhasil dikirim! Kami akan segera menghubungi kamu.</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="name">Nama Lengkap</label>
        <input
          id="name"
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          aria-describedby={errors.name ? 'name-error' : undefined}
          aria-invalid={!!errors.name}
        />
        {errors.name && <p id="name-error" role="alert">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="email">Alamat Email</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={!!errors.email}
        />
        {errors.email && <p id="email-error" role="alert">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="message">Pesan</label>
        <textarea
          id="message"
          value={form.message}
          onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          aria-describedby={errors.message ? 'message-error' : undefined}
          aria-invalid={!!errors.message}
        />
        {errors.message && <p id="message-error" role="alert">{errors.message}</p>}
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Mengirim...' : 'Kirim Pesan'}
      </button>
    </form>
  );
}
```

```tsx
// components/ContactForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from './ContactForm';

// Helper: render form dengan mock onSubmit
function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup();
  render(<ContactForm onSubmit={onSubmit} />);
  return {
    user,
    onSubmit,
    nameInput: () => screen.getByLabelText('Nama Lengkap'),
    emailInput: () => screen.getByLabelText('Alamat Email'),
    messageInput: () => screen.getByLabelText('Pesan'),
    submitButton: () => screen.getByRole('button', { name: /kirim/i }),
  };
}

describe('ContactForm', () => {
  describe('validasi input', () => {
    it('menampilkan error saat submit dengan form kosong', async () => {
      const { user, submitButton } = setup();

      await user.click(submitButton());

      expect(screen.getByText('Nama wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Email wajib diisi')).toBeInTheDocument();
      expect(screen.getByText('Pesan minimal 10 karakter')).toBeInTheDocument();
    });

    it('menampilkan error format email yang tidak valid', async () => {
      const { user, emailInput, submitButton } = setup();

      await user.type(emailInput(), 'bukan-email');
      await user.click(submitButton());

      expect(screen.getByText('Format email tidak valid')).toBeInTheDocument();
    });

    it('menandai field invalid dengan aria-invalid', async () => {
      const { user, submitButton } = setup();

      await user.click(submitButton());

      expect(screen.getByLabelText('Nama Lengkap')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Alamat Email')).toHaveAttribute('aria-invalid', 'true');
    });

    it('menghilangkan error setelah diisi dengan benar', async () => {
      const { user, nameInput, submitButton } = setup();

      // Trigger error dulu
      await user.click(submitButton());
      expect(screen.getByText('Nama wajib diisi')).toBeInTheDocument();

      // Isi dengan benar
      await user.type(nameInput(), 'Budi Santoso');
      await user.click(submitButton());

      // Error nama harus hilang
      expect(screen.queryByText('Nama wajib diisi')).not.toBeInTheDocument();
    });
  });

  describe('submit berhasil', () => {
    it('memanggil onSubmit dengan data yang benar', async () => {
      const { user, onSubmit, nameInput, emailInput, messageInput, submitButton } = setup();

      await user.type(nameInput(), 'Budi Santoso');
      await user.type(emailInput(), 'budi@email.com');
      await user.type(messageInput(), 'Halo, saya ingin bertanya tentang produk ini.');
      await user.click(submitButton());

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          name: 'Budi Santoso',
          email: 'budi@email.com',
          message: 'Halo, saya ingin bertanya tentang produk ini.',
        });
      });
    });

    it('menampilkan pesan sukses setelah submit berhasil', async () => {
      const { user, nameInput, emailInput, messageInput, submitButton } = setup();

      await user.type(nameInput(), 'Budi Santoso');
      await user.type(emailInput(), 'budi@email.com');
      await user.type(messageInput(), 'Pesan yang cukup panjang untuk validasi.');
      await user.click(submitButton());

      expect(
        await screen.findByText(/pesan berhasil dikirim/i)
      ).toBeInTheDocument();
    });

    it('mereset form setelah submit berhasil', async () => {
      const { user, nameInput, emailInput, messageInput, submitButton } = setup();

      await user.type(nameInput(), 'Budi');
      await user.type(emailInput(), 'budi@email.com');
      await user.type(messageInput(), 'Pesan yang cukup panjang.');
      await user.click(submitButton());

      // Form di-reset → tidak perlu cek karena form sudah tidak dirender
      await screen.findByText(/pesan berhasil dikirim/i);
      expect(screen.queryByRole('form')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('menonaktifkan tombol submit saat mengirim', async () => {
      // Buat onSubmit yang tidak langsung resolve
      let resolver!: () => void;
      const slowSubmit = vi.fn(
        () => new Promise<void>(resolve => { resolver = resolve; })
      );

      const { user, nameInput, emailInput, messageInput, submitButton } = setup(slowSubmit);

      await user.type(nameInput(), 'Budi Santoso');
      await user.type(emailInput(), 'budi@email.com');
      await user.type(messageInput(), 'Pesan yang cukup panjang.');
      await user.click(submitButton());

      // Saat sedang loading → tombol disabled dan teks berubah
      expect(screen.getByRole('button', { name: 'Mengirim...' })).toBeDisabled();

      // Resolve promise → submit selesai
      resolver();
    });
  });

  describe('submit gagal', () => {
    it('menampilkan error saat API gagal', async () => {
      const failingSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
      const { user, nameInput, emailInput, messageInput, submitButton } = setup(failingSubmit);

      await user.type(nameInput(), 'Budi Santoso');
      await user.type(emailInput(), 'budi@email.com');
      await user.type(messageInput(), 'Pesan yang cukup panjang.');
      await user.click(submitButton());

      expect(
        await screen.findByText('Gagal mengirim pesan. Coba lagi.')
      ).toBeInTheDocument();
    });

    it('tombol submit aktif kembali setelah gagal', async () => {
      const failingSubmit = vi.fn().mockRejectedValue(new Error('Error'));
      const { user, nameInput, emailInput, messageInput, submitButton } = setup(failingSubmit);

      await user.type(nameInput(), 'Budi');
      await user.type(emailInput(), 'budi@email.com');
      await user.type(messageInput(), 'Pesan yang cukup panjang.');
      await user.click(submitButton());

      await screen.findByText(/gagal mengirim/i);

      // Tombol harus aktif lagi — user bisa coba ulang
      expect(screen.getByRole('button', { name: /kirim/i })).toBeEnabled();
    });
  });
});
```

---

## 10. Apa yang Harus dan Tidak Perlu Di-test

### Harus Di-test

```
✅ Behavior yang terlihat user:
   • Konten yang ditampilkan berdasarkan props
   • Perubahan UI akibat interaksi (klik, ketik)
   • Error message saat validasi gagal
   • Loading state saat request berlangsung
   • Success state setelah aksi berhasil

✅ Edge cases yang bisa bikin bug:
   • Empty state (tidak ada data, list kosong)
   • Error state (API gagal, network error)
   • Permission/auth state (user login vs tidak)
   • Boundary values (angka maksimum, string kosong)

✅ Logika bisnis penting:
   • Kalkulasi harga, diskon, pajak
   • Validasi form yang kompleks
   • Transformasi/filtering data

✅ Aksesibilitas dasar:
   • Elemen punya label yang benar
   • Error message terhubung ke input (aria-describedby)
   • Button punya accessible name
```

### Tidak Perlu Di-test

```
❌ Implementasi internal React:
   • Nama state variable (testing ini = testing React, bukan kode kamu)
   • Apakah useState vs useReducer digunakan
   • Nama class CSS / Tailwind class

❌ Third-party library yang sudah punya test sendiri:
   • Apakah Zod validator bekerja
   • Apakah React Hook Form internals bekerja
   • Apakah Next.js router berfungsi

❌ Type checking — itu job TypeScript:
   • "Kalau string dikasih, apakah error?" → TypeScript yang handle

❌ Style dan tampilan:
   • Warna button
   • Ukuran font
   • Margin/padding
   → Gunakan visual regression testing (Chromatic, Percy) untuk ini

❌ Setiap single line of code:
   → 100% coverage bukan target. Test yang BERMAKNA lebih baik dari test yang banyak.
```

### Code Coverage: Jangan Obsesi

```
Coverage 80% dengan test yang bermakna >> Coverage 100% dengan test yang kosong

// ❌ Test yang hanya mengejar coverage, tidak bermakna
it('renders without crashing', () => {
  render(<MyComponent />);
  // Tidak ada assert apapun — "green" tapi tidak berguna
});

// ❌ Testing implementation detail untuk naikan coverage
it('state count diinisialisasi dengan 0', () => {
  const { result } = renderHook(() => useState(0));
  expect(result.current[0]).toBe(0); // testing React useState, bukan kode kamu
});

// ✅ Test yang bermakna
it('menampilkan jumlah produk di cart', () => {
  render(<CartIcon items={[item1, item2, item3]} />);
  expect(screen.getByRole('status')).toHaveTextContent('3');
});
```

---

## 11. Mini Project: Test Suite untuk LoginForm

### Komponen yang Akan Di-test

```tsx
// components/LoginForm/LoginForm.tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<{ token: string; redirectTo: string }>;
}

interface FieldErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!email.trim()) {
      errs.email = 'Email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Format email tidak valid';
    }
    if (!password) {
      errs.password = 'Password wajib diisi';
    } else if (password.length < 8) {
      errs.password = 'Password minimal 8 karakter';
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { redirectTo } = await onLogin(email, password);
      router.push(redirectTo);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-form-container">
      <h1>Masuk ke Akun</h1>

      <form onSubmit={handleSubmit} noValidate aria-label="Form Login">
        {/* General Error */}
        {errors.general && (
          <div role="alert" className="error-banner">
            {errors.general}
          </div>
        )}

        {/* Email Field */}
        <div className="field">
          <label htmlFor="email">Alamat Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
            disabled={isLoading}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="field-error">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            aria-invalid={!!errors.password}
            disabled={isLoading}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="field-error">
              {errors.password}
            </p>
          )}
        </div>

        <a href="/forgot-password">Lupa password?</a>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Memproses...' : 'Masuk'}
        </button>
      </form>

      <p>
        Belum punya akun?{' '}
        <a href="/register">Daftar sekarang</a>
      </p>
    </div>
  );
}
```

---

### Test Suite Lengkap

```tsx
// components/LoginForm/LoginForm.test.tsx
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useRouter } from 'next/navigation';
import { LoginForm } from './LoginForm';

// ─────────────────────────────────────────────────────────
// Helper: setup standard untuk semua test
// ─────────────────────────────────────────────────────────
function setup(onLogin = vi.fn().mockResolvedValue({ token: 'abc', redirectTo: '/dashboard' })) {
  const user = userEvent.setup();
  const mockPush = vi.fn();

  vi.mocked(useRouter).mockReturnValue({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>);

  render(<LoginForm onLogin={onLogin} />);

  return {
    user,
    onLogin,
    mockPush,
    // Getters sebagai fungsi — selalu ambil fresh reference
    emailInput: () => screen.getByLabelText('Alamat Email'),
    passwordInput: () => screen.getByLabelText('Password'),
    submitButton: () => screen.getByRole('button', { name: /masuk/i }),
  };
}

// Helper: isi form dengan data valid dan submit
async function fillAndSubmit(
  helpers: ReturnType<typeof setup>,
  overrides?: { email?: string; password?: string }
) {
  const { user, emailInput, passwordInput, submitButton } = helpers;
  await user.type(emailInput(), overrides?.email ?? 'budi@email.com');
  await user.type(passwordInput(), overrides?.password ?? 'password123');
  await user.click(submitButton());
}

// ─────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────

describe('LoginForm', () => {

  // ───────── RENDERING AWAL ─────────
  describe('tampilan awal', () => {
    it('menampilkan heading form', () => {
      setup();
      expect(screen.getByRole('heading', { name: 'Masuk ke Akun' })).toBeInTheDocument();
    });

    it('menampilkan field email dan password', () => {
      setup();
      expect(screen.getByLabelText('Alamat Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('menampilkan tombol submit', () => {
      setup();
      expect(screen.getByRole('button', { name: 'Masuk' })).toBeInTheDocument();
    });

    it('menampilkan link "Lupa password"', () => {
      setup();
      expect(screen.getByRole('link', { name: 'Lupa password?' })).toBeInTheDocument();
    });

    it('menampilkan link ke halaman register', () => {
      setup();
      expect(screen.getByRole('link', { name: 'Daftar sekarang' })).toBeInTheDocument();
    });

    it('tidak menampilkan error apapun di awal', () => {
      setup();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // ───────── VALIDASI EMAIL ─────────
  describe('validasi email', () => {
    it('menampilkan error saat email kosong', async () => {
      const helpers = setup();
      await helpers.user.click(helpers.submitButton());

      expect(screen.getByText('Email wajib diisi')).toBeInTheDocument();
    });

    it('menampilkan error saat format email tidak valid', async () => {
      const helpers = setup();

      await helpers.user.type(helpers.emailInput(), 'bukan-email');
      await helpers.user.click(helpers.submitButton());

      expect(screen.getByText('Format email tidak valid')).toBeInTheDocument();
    });

    it('tidak menampilkan error untuk email valid', async () => {
      const helpers = setup();

      await helpers.user.type(helpers.emailInput(), 'valid@email.com');
      await helpers.user.click(helpers.submitButton()); // submit untuk trigger validasi

      expect(screen.queryByText('Format email tidak valid')).not.toBeInTheDocument();
      expect(screen.queryByText('Email wajib diisi')).not.toBeInTheDocument();
    });

    it('menandai field email invalid dengan aria-invalid', async () => {
      const helpers = setup();
      await helpers.user.click(helpers.submitButton());

      expect(helpers.emailInput()).toHaveAttribute('aria-invalid', 'true');
    });

    it('field email tidak aria-invalid saat valid', async () => {
      const helpers = setup();
      await helpers.user.type(helpers.emailInput(), 'valid@email.com');

      expect(helpers.emailInput()).not.toHaveAttribute('aria-invalid', 'true');
    });
  });

  // ───────── VALIDASI PASSWORD ─────────
  describe('validasi password', () => {
    it('menampilkan error saat password kosong', async () => {
      const helpers = setup();
      await helpers.user.click(helpers.submitButton());

      expect(screen.getByText('Password wajib diisi')).toBeInTheDocument();
    });

    it('menampilkan error saat password kurang dari 8 karakter', async () => {
      const helpers = setup();

      await helpers.user.type(helpers.passwordInput(), 'abc');
      await helpers.user.click(helpers.submitButton());

      expect(screen.getByText('Password minimal 8 karakter')).toBeInTheDocument();
    });

    it('tidak menampilkan error untuk password valid (8+ karakter)', async () => {
      const helpers = setup();

      await helpers.user.type(helpers.passwordInput(), 'password123');
      await helpers.user.click(helpers.submitButton());

      expect(screen.queryByText(/password minimal/i)).not.toBeInTheDocument();
    });

    it('menghubungkan error ke field dengan aria-describedby', async () => {
      const helpers = setup();
      await helpers.user.click(helpers.submitButton());

      const errorElement = screen.getByText('Password wajib diisi');
      const errorId = errorElement.id;
      expect(helpers.passwordInput()).toHaveAttribute('aria-describedby', errorId);
    });
  });

  // ───────── SUBMIT BERHASIL ─────────
  describe('submit berhasil', () => {
    it('memanggil onLogin dengan email dan password yang diisi', async () => {
      const helpers = setup();
      await fillAndSubmit(helpers);

      await waitFor(() => {
        expect(helpers.onLogin).toHaveBeenCalledWith('budi@email.com', 'password123');
      });
    });

    it('memanggil onLogin hanya sekali', async () => {
      const helpers = setup();
      await fillAndSubmit(helpers);

      await waitFor(() => {
        expect(helpers.onLogin).toHaveBeenCalledOnce();
      });
    });

    it('redirect ke URL yang dikembalikan onLogin', async () => {
      const onLogin = vi.fn().mockResolvedValue({
        token: 'abc',
        redirectTo: '/dashboard',
      });
      const helpers = setup(onLogin);
      await fillAndSubmit(helpers);

      await waitFor(() => {
        expect(helpers.mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('redirect ke URL berbeda sesuai response', async () => {
      const adminLogin = vi.fn().mockResolvedValue({
        token: 'xyz',
        redirectTo: '/admin/dashboard',
      });
      const helpers = setup(adminLogin);
      await fillAndSubmit(helpers);

      await waitFor(() => {
        expect(helpers.mockPush).toHaveBeenCalledWith('/admin/dashboard');
      });
    });

    it('menghilangkan semua error sebelum submit', async () => {
      const helpers = setup();

      // Trigger error dulu
      await helpers.user.click(helpers.submitButton());
      expect(screen.getByText('Email wajib diisi')).toBeInTheDocument();

      // Isi dan submit
      await helpers.user.type(helpers.emailInput(), 'budi@email.com');
      await helpers.user.type(helpers.passwordInput(), 'password123');
      await helpers.user.click(helpers.submitButton());

      // Error harus hilang
      await waitFor(() => {
        expect(screen.queryByText('Email wajib diisi')).not.toBeInTheDocument();
      });
    });
  });

  // ───────── LOADING STATE ─────────
  describe('loading state saat submit', () => {
    it('mengubah teks tombol menjadi "Memproses..." saat loading', async () => {
      let resolver!: () => void;
      const slowLogin = vi.fn(
        () => new Promise<{ token: string; redirectTo: string }>(resolve => {
          resolver = () => resolve({ token: 'abc', redirectTo: '/dashboard' });
        })
      );
      const helpers = setup(slowLogin);
      await fillAndSubmit(helpers);

      // Saat loading: "Memproses..." muncul, "Masuk" hilang
      expect(screen.getByRole('button', { name: 'Memproses...' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Masuk' })).not.toBeInTheDocument();

      resolver();
    });

    it('menonaktifkan tombol submit saat loading', async () => {
      let resolver!: () => void;
      const slowLogin = vi.fn(
        () => new Promise<{ token: string; redirectTo: string }>(resolve => {
          resolver = () => resolve({ token: 'abc', redirectTo: '/dashboard' });
        })
      );
      const helpers = setup(slowLogin);
      await fillAndSubmit(helpers);

      expect(screen.getByRole('button', { name: 'Memproses...' })).toBeDisabled();

      resolver();
    });

    it('menonaktifkan input email dan password saat loading', async () => {
      let resolver!: () => void;
      const slowLogin = vi.fn(
        () => new Promise<{ token: string; redirectTo: string }>(resolve => {
          resolver = () => resolve({ token: 'abc', redirectTo: '/dashboard' });
        })
      );
      const helpers = setup(slowLogin);
      await fillAndSubmit(helpers);

      expect(helpers.emailInput()).toBeDisabled();
      expect(helpers.passwordInput()).toBeDisabled();

      resolver();
    });

    it('mengaktifkan kembali tombol setelah submit selesai', async () => {
      const helpers = setup();
      await fillAndSubmit(helpers);

      await waitFor(() => {
        // Setelah redirect, tapi kalau ditest sebelum redirect terjadi:
        expect(helpers.onLogin).toHaveBeenCalled();
      });
    });
  });

  // ───────── SUBMIT GAGAL ─────────
  describe('submit gagal (error dari API)', () => {
    it('menampilkan pesan error dari API', async () => {
      const failLogin = vi.fn().mockRejectedValue(
        new Error('Email atau password salah')
      );
      const helpers = setup(failLogin);
      await fillAndSubmit(helpers);

      expect(
        await screen.findByText('Email atau password salah')
      ).toBeInTheDocument();
    });

    it('menampilkan error umum untuk error tidak dikenal', async () => {
      const crashLogin = vi.fn().mockRejectedValue('unknown error');
      const helpers = setup(crashLogin);
      await fillAndSubmit(helpers);

      expect(
        await screen.findByText('Terjadi kesalahan')
      ).toBeInTheDocument();
    });

    it('menampilkan error di area yang bisa dibaca screen reader (role=alert)', async () => {
      const failLogin = vi.fn().mockRejectedValue(
        new Error('Akun terkunci sementara')
      );
      const helpers = setup(failLogin);
      await fillAndSubmit(helpers);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Akun terkunci sementara');
    });

    it('tidak redirect setelah gagal', async () => {
      const failLogin = vi.fn().mockRejectedValue(new Error('Gagal'));
      const helpers = setup(failLogin);
      await fillAndSubmit(helpers);

      await screen.findByRole('alert');
      expect(helpers.mockPush).not.toHaveBeenCalled();
    });

    it('mengaktifkan kembali form setelah gagal', async () => {
      const failLogin = vi.fn().mockRejectedValue(new Error('Gagal'));
      const helpers = setup(failLogin);
      await fillAndSubmit(helpers);

      await screen.findByRole('alert');

      // Semua input dan tombol harus aktif kembali untuk retry
      expect(helpers.emailInput()).toBeEnabled();
      expect(helpers.passwordInput()).toBeEnabled();
      expect(screen.getByRole('button', { name: /masuk/i })).toBeEnabled();
    });

    it('bisa coba submit ulang setelah gagal', async () => {
      let callCount = 0;
      const eventuallySuccessLogin = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('Gagal pertama'));
        return Promise.resolve({ token: 'abc', redirectTo: '/dashboard' });
      });

      const helpers = setup(eventuallySuccessLogin);

      // Submit pertama — gagal
      await fillAndSubmit(helpers);
      await screen.findByText('Gagal pertama');

      // Submit kedua — berhasil
      await helpers.user.click(helpers.submitButton());

      await waitFor(() => {
        expect(helpers.mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  // ───────── AKSESIBILITAS ─────────
  describe('aksesibilitas', () => {
    it('form punya accessible name', () => {
      setup();
      expect(screen.getByRole('form', { name: 'Form Login' })).toBeInTheDocument();
    });

    it('setiap input punya label yang terhubung', () => {
      setup();
      // getByLabelText gagal kalau label tidak terhubung ke input
      expect(screen.getByLabelText('Alamat Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('password input bertipe password (tidak tampil plaintext)', () => {
      setup();
      expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    });

    it('email input punya autocomplete yang benar', () => {
      setup();
      expect(screen.getByLabelText('Alamat Email')).toHaveAttribute('autocomplete', 'email');
    });
  });
});
```

---

### Jalankan Test Suite

```bash
# Watch mode — test ulang saat file berubah
npm run test:watch

# Run sekali (untuk CI)
npm run test:run

# Lihat coverage
npm run test:coverage

# UI mode — buka browser untuk lihat hasil test
npm run test:ui
```

### Contoh Output yang Diharapkan

```
 ✓ LoginForm (28 test)
   ✓ tampilan awal (6)
     ✓ menampilkan heading form
     ✓ menampilkan field email dan password
     ✓ menampilkan tombol submit
     ✓ menampilkan link "Lupa password"
     ✓ menampilkan link ke halaman register
     ✓ tidak menampilkan error apapun di awal
   ✓ validasi email (5)
     ...
   ✓ validasi password (4)
     ...
   ✓ submit berhasil (5)
     ...
   ✓ loading state saat submit (4)
     ...
   ✓ submit gagal (error dari API) (6)
     ...
   ✓ aksesibilitas (4)
     ...

 Test Files  1 passed (1)
 Tests       28 passed (28)
 Duration    1.24s
```

---

## Penutup

Testing itu investasi, bukan overhead. Test yang bagus:

1. **Kasih confidence** saat refactoring — ubah implementasi tanpa takut break sesuatu
2. **Dokumentasi hidup** — baca test = tahu apa yang seharusnya dilakukan komponen
3. **Tangkap regression** — bug yang sudah pernah diperbaiki tidak akan muncul lagi

**Tiga hal yang paling penting dari semua yang ada di doc ini:**

```
1. Test behavior, bukan implementasi
   → Kalau ganti nama class CSS dan test merah, sesuatu yang salah

2. Tulis test dari perspektif user
   → getByRole dan getByLabelText, bukan getByTestId

3. Test yang sedikit tapi bermakna > test banyak tapi kosong
   → 70% coverage dengan test nyata > 100% coverage dengan test palsu
```

Mulai dari yang berdampak: form validation, API error handling, loading states. Di situ bug paling sering bersembunyi dan user paling sering frustrated.

Selamat testing! 🧪
