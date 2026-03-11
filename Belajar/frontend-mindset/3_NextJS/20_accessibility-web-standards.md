# 20 — Accessibility (a11y) & Web Standards di React/Next.js

> **Gaya baca:** Obrolan santai senior ke junior. Accessibility bukan fitur tambahan — ini bagian dari kualitas kode. Kalau aplikasimu tidak bisa dipakai orang lain, itu bug, bukan "bukan prioritas".

---

## Daftar Isi

1. [Kenapa Accessibility Penting (Bukan Soal Compliance)](#1-kenapa-accessibility-penting-bukan-soal-compliance)
2. [Semantic HTML di React](#2-semantic-html-di-react)
3. [ARIA: Kapan Berguna, Kapan Merusak](#3-aria-kapan-berguna-kapan-merusak)
4. [Keyboard Navigation dan Focus Management](#4-keyboard-navigation-dan-focus-management)
5. [Visual Accessibility: Kontras, Ukuran, Motion](#5-visual-accessibility-kontras-ukuran-motion)
6. [Testing Accessibility: axe-core dan eslint-plugin-jsx-a11y](#6-testing-accessibility-axe-core-dan-eslint-plugin-jsx-a11y)
7. [Next.js Metadata API dan SEO Dasar](#7-nextjs-metadata-api-dan-seo-dasar)
8. [Mini Project: Audit dan Perbaiki Dropdown Menu & Modal](#8-mini-project-audit-dan-perbaiki-dropdown-menu--modal)
9. [Checklist Accessibility Sebelum Deploy](#9-checklist-accessibility-sebelum-deploy)

---

## 1. Kenapa Accessibility Penting (Bukan Soal Compliance)

### Lebih dari Sekedar "Untuk Difabel"

Accessibility sering disalahpahami sebagai fitur khusus untuk 1-2% pengguna dengan disabilitas permanen. Kenyataannya:

```
Siapa yang terbantu dengan accessible app?

Disabilitas permanen:
  → Pengguna screen reader (buta/low vision)
  → Pengguna keyboard only (cerebral palsy, tremor)
  → Pengguna yang sensitive terhadap motion (vestibular disorder)

Disabilitas situasional (KAMU sendiri mungkin pernah):
  → Tangan lagi penuh, navigasi keyboard
  → Di tempat terang, kontras rendah tidak terbaca
  → Lagi flu, konsentrasi turun — cognitive load tinggi
  → Pakai mouse rusak — paksa keyboard
  → Internet lambat, gambar tidak load — butuh alt text

Disabilitas sementara:
  → Patah tangan → keyboard only
  → Operasi mata → screen reader sementara
  → Nyetir sambil dengar app lewat screen reader
```

**Angka yang perlu kamu tahu:** 1 dari 4 orang dewasa di dunia punya setidaknya satu disabilitas (WHO). Di Indonesia dengan 270 juta penduduk, itu 67 juta orang potensial yang kamu exclude kalau accessibility diabaikan.

### Manfaat Langsung untuk Developer

```
Accessible code = Kode yang lebih baik

1. SEO lebih baik
   → Search engine "membaca" konten seperti screen reader
   → Semantic HTML + alt text = ranking lebih tinggi

2. Maintainability lebih mudah
   → Semantic HTML lebih mudah dibaca dan di-debug
   → ARIA labels memberi context yang hilang dari nama class

3. Test lebih mudah ditulis
   → getByRole, getByLabelText — test yang pakai accessible queries
     otomatis enforce accessibility yang baik

4. Legal risk berkurang
   → Banyak negara sudah punya regulasi (ADA di US, EN 301 549 di EU)
   → Perusahaan besar Indonesia mulai ikuti standar ini
```

### Standar yang Perlu Tahu

```
WCAG 2.1 (Web Content Accessibility Guidelines)
  Level A   → Minimum. Kalau ini tidak terpenuhi, beberapa user tidak bisa akses sama sekali
  Level AA  → Target standar industri. Ini yang umumnya diharapkan
  Level AAA → Aspirasional. Tidak selalu mungkin di semua konteks

4 Prinsip POUR:
  P — Perceivable   → Konten bisa dirasakan (lihat, dengar, sentuh)
  O — Operable      → Komponen bisa dioperasikan (keyboard, tidak seizure-inducing)
  U — Understandable → Konten dan UI bisa dipahami
  R — Robust         → Bisa diakses oleh berbagai teknologi bantu
```

---

## 2. Semantic HTML di React

### Masalah: `<div>` Soup

```tsx
// ❌ "div soup" — tidak ada informasi semantik
export function ProductPage() {
  return (
    <div className="page">
      <div className="header">
        <div className="logo">TokoBaju</div>
        <div className="nav">
          <div className="nav-item" onClick={() => navigate('/home')}>Beranda</div>
          <div className="nav-item" onClick={() => navigate('/products')}>Produk</div>
        </div>
      </div>
      <div className="content">
        <div className="title">Kaos Polos</div>
        <div className="price">Rp 75.000</div>
        <div className="button" onClick={handleBuy}>Beli Sekarang</div>
      </div>
      <div className="footer">
        <div>© 2026 TokoBaju</div>
      </div>
    </div>
  );
}
// Screen reader: "TokoBaju Beranda Produk Kaos Polos 75.000 Beli Sekarang 2026 TokoBaju"
// Tidak ada struktur, tidak ada konteks
```

```tsx
// ✅ Semantic HTML — konten punya makna
export function ProductPage() {
  return (
    <>
      <header>
        <a href="/" aria-label="TokoBaju — Kembali ke Beranda">
          <img src="/logo.svg" alt="TokoBaju" width={120} height={40} />
        </a>
        <nav aria-label="Navigasi utama">
          <ul>
            <li><a href="/">Beranda</a></li>
            <li><a href="/products">Produk</a></li>
          </ul>
        </nav>
      </header>

      <main>
        <article>
          <h1>Kaos Polos</h1>
          <p className="price">
            <span className="sr-only">Harga:</span>
            Rp 75.000
          </p>
          <button type="button" onClick={handleBuy}>
            Beli Sekarang
          </button>
        </article>
      </main>

      <footer>
        <p>
          <small>© 2026 TokoBaju</small>
        </p>
      </footer>
    </>
  );
}
// Screen reader: navigasi landmark, heading hierarchy, button yang bisa diaktifkan keyboard
```

### Elemen Semantik dan Kapan Pakainya

```tsx
// Landmark elements — membantu user navigasi cepat dengan screen reader
<header>    // Satu per page, biasanya berisi logo + nav
<nav>       // Navigasi — bisa ada beberapa, bedakan dengan aria-label
<main>      // Konten utama — HANYA SATU per halaman
<aside>     // Konten sampingan (sidebar, related articles)
<footer>    // Footer halaman atau section
<section>   // Grup konten tematik — sebaiknya punya heading
<article>   // Konten yang bisa berdiri sendiri (post, produk, komentar)

// Heading hierarchy — jangan skip level!
<h1>  → Judul halaman (satu per halaman)
<h2>  → Section utama
<h3>  → Sub-section
// h4-h6: gunakan kalau memang butuh nesting, jangan karena ukuran font!

// ❌ Skip heading level — screen reader jadi bingung
<h1>TokoBaju</h1>
<h3>Produk Terbaru</h3>  {/* lompat dari h1 ke h3 */}

// ✅ Heading yang rapi
<h1>TokoBaju</h1>
<h2>Produk Terbaru</h2>
<h3>Kaos Polos</h3>
<h3>Kemeja Batik</h3>
```

### Tombol vs Link — Perbedaan yang Sering Salah

```tsx
// Aturan sederhana:
// <button> = melakukan aksi (submit, toggle, delete, open modal)
// <a>      = navigasi ke URL lain (halaman, anchor, external)

// ❌ Salah: div sebagai tombol
<div onClick={handleDelete} className="btn-delete">
  Hapus
</div>
// Tidak bisa diaktifkan keyboard, tidak ada role, tidak ada focus

// ❌ Salah: button untuk navigasi
<button onClick={() => router.push('/products')}>
  Lihat Semua Produk
</button>
// Secara semantik ini link, bukan aksi

// ❌ Salah: link tanpa href yang bermakna
<a href="#" onClick={handleToggle}>
  Tampilkan Filter
</a>
// href="#" = navigasi ke top, bukan semantik yang benar

// ✅ Benar: button untuk aksi
<button type="button" onClick={handleDelete}>
  Hapus Produk
</button>

// ✅ Benar: link untuk navigasi
<Link href="/products">Lihat Semua Produk</Link>

// ✅ Benar: button untuk toggle
<button type="button" onClick={handleToggleFilter} aria-expanded={isOpen}>
  Tampilkan Filter
</button>
```

### Tabel yang Accessible

```tsx
// ❌ Tabel tanpa semantik
<div className="table">
  <div className="row header">
    <div>Nama</div>
    <div>Harga</div>
    <div>Stok</div>
  </div>
  <div className="row">
    <div>Kaos Polos</div>
    <div>75.000</div>
    <div>50</div>
  </div>
</div>

// ✅ Tabel yang proper
<table>
  <caption>Daftar Produk</caption>  {/* Judul tabel untuk screen reader */}
  <thead>
    <tr>
      <th scope="col">Nama Produk</th>
      <th scope="col">Harga</th>
      <th scope="col">Stok</th>
      <th scope="col">
        <span className="sr-only">Aksi</span>  {/* visible: tidak ada teks, SR: "Aksi" */}
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Kaos Polos</td>
      <td>
        <span className="sr-only">Rp</span>75.000
      </td>
      <td>50</td>
      <td>
        <button type="button" aria-label="Edit Kaos Polos">Edit</button>
        <button type="button" aria-label="Hapus Kaos Polos">Hapus</button>
      </td>
    </tr>
  </tbody>
</table>
```

### sr-only: Teks untuk Screen Reader Saja

```css
/* Taruh di global CSS — class paling berguna untuk accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Tailwind: class "sr-only" sudah ada built-in */
```

```tsx
// Kapan pakai sr-only:

// 1. Label untuk ikon tanpa teks
<button type="button" aria-label="Cari">
  <SearchIcon aria-hidden="true" />
  {/* aria-hidden pada ikon — jangan baca ikon SVG yang tidak bermakna */}
</button>

// 2. Context tambahan yang jelas visual tapi tidak di HTML
<ul>
  {products.map(p => (
    <li key={p.id}>
      {p.name}
      <span className="sr-only"> — Harga:</span>
      {formatPrice(p.price)}
      <button aria-label={`Tambah ${p.name} ke keranjang`}>
        <CartIcon aria-hidden="true" />
      </button>
    </li>
  ))}
</ul>

// 3. Heading tersembunyi untuk section tanpa judul visual
<section>
  <h2 className="sr-only">Filter Produk</h2>
  <FilterForm />
</section>
```

---

## 3. ARIA: Kapan Berguna, Kapan Merusak

### Aturan Emas ARIA

> **"No ARIA is better than bad ARIA."**
> — WhatWG

ARIA (Accessible Rich Internet Applications) adalah atribut HTML untuk menambahkan informasi semantik yang tidak bisa diungkapkan dengan HTML biasa. Tapi:

```
Urutan prioritas:
1. Gunakan elemen HTML semantik yang tepat (SELALU coba ini dulu)
2. Kalau tidak ada elemen yang tepat → tambahkan ARIA
3. Jangan tambah ARIA ke elemen yang sudah semantik
```

```tsx
// ❌ ARIA yang berlebihan / salah
<button role="button">Klik</button>     // role="button" sudah implicit di <button>
<h1 aria-level="1">Judul</h1>          // h1 sudah implisit level 1
<a href="/home" role="link">Beranda</a> // link sudah implisit di <a href>
<img src="logo.png" alt="Logo" aria-label="Logo" /> // duplikat!

// ❌ Menambah interaktivitas ke elemen non-interaktif (jangan!)
<div
  role="button"
  onClick={handleClick}
  // MASIH kurang: tidak ada tabIndex, tidak ada keyboard handler
>
  Klik Saya
</div>

// Kalau terpaksa pakai div sebagai button (sangat jarang):
<div
  role="button"
  tabIndex={0}          // supaya bisa di-tab
  onClick={handleClick}
  onKeyDown={(e) => {   // supaya bisa diaktifkan Enter dan Space
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Klik Saya
</div>
// Lebih baik: gunakan <button> saja!
```

### ARIA yang Memang Berguna

```tsx
// 1. aria-label: label untuk elemen tanpa teks visible yang cukup
<button aria-label="Tutup dialog konfirmasi">
  <XIcon aria-hidden="true" />
</button>

// Beberapa tombol "Edit" di tabel:
<button aria-label="Edit produk Kaos Polos">Edit</button>
<button aria-label="Edit produk Kemeja Batik">Edit</button>
// Screen reader bedakan keduanya!

// 2. aria-labelledby: label dari elemen lain di halaman
<div role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <h2 id="dialog-title">Konfirmasi Hapus</h2>
  <p id="dialog-desc">Produk ini akan dihapus permanen. Tidak bisa dibatalkan.</p>
  ...
</div>

// 3. aria-describedby: deskripsi tambahan (bukan label utama)
<input
  id="password"
  type="password"
  aria-describedby="password-hint password-error"
/>
<p id="password-hint">Minimal 8 karakter, mengandung huruf dan angka</p>
{error && <p id="password-error" role="alert">{error}</p>}

// 4. aria-expanded: untuk toggle (accordion, dropdown, menu)
<button
  aria-expanded={isOpen}
  aria-controls="dropdown-content"
>
  Filter
</button>
<div id="dropdown-content" hidden={!isOpen}>
  {/* content */}
</div>

// 5. aria-live: untuk konten yang update dinamis
<div aria-live="polite" aria-atomic="true">
  {/* Screen reader akan mengumumkan perubahan di sini */}
  {statusMessage}
</div>

// aria-live="polite"   → tunggu sampai user selesai baca sebelum umumkan
// aria-live="assertive" → interrupt langsung (gunakan untuk error kritis saja)
// aria-atomic="true"   → baca seluruh konten region, bukan hanya yang berubah

// 6. aria-hidden: sembunyikan dari screen reader
<span aria-hidden="true">★★★★☆</span>
<span className="sr-only">Rating: 4 dari 5 bintang</span>
// Ikon dekoratif:
<svg aria-hidden="true" focusable="false">...</svg>

// 7. role="alert": untuk pesan error/success penting
{error && (
  <p role="alert" className="error">{error}</p>
  // Screen reader langsung mengumumkan konten ini saat muncul
)}

// 8. aria-invalid + aria-errormessage: untuk form validation
<input
  aria-invalid={!!fieldError}
  aria-errormessage="email-error"
/>
{fieldError && <p id="email-error" role="alert">{fieldError}</p>}

// 9. aria-current: untuk item aktif di nav
<nav>
  <a href="/" aria-current={pathname === '/' ? 'page' : undefined}>Beranda</a>
  <a href="/products" aria-current={pathname === '/products' ? 'page' : undefined}>Produk</a>
</nav>

// 10. aria-busy: saat konten sedang dimuat
<div aria-busy={isLoading} aria-live="polite">
  {isLoading ? <Spinner /> : <Content />}
</div>
```

---

## 4. Keyboard Navigation dan Focus Management

### Tab Order yang Benar

```tsx
// Semua elemen interaktif harus bisa di-tab secara logis
// Order ditentukan oleh DOM order — bukan CSS order!

// ❌ CSS order mengubah visual tapi tidak keyboard order
<div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
  <button>Kanan (visual)</button>  {/* Tab 1 → keyboard user bingung */}
  <button>Kiri (visual)</button>   {/* Tab 2 */}
</div>

// ✅ DOM order sesuai visual order
<div style={{ display: 'flex' }}>
  <button>Kiri</button>   {/* Tab 1 */}
  <button>Kanan</button>  {/* Tab 2 */}
</div>

// tabIndex:
// tabIndex={0}   → masuk tab order natural (ikut DOM order)
// tabIndex={-1}  → bisa difokus via JS (.focus()), tapi tidak lewat Tab key
// tabIndex={>0}  → JANGAN — menciptakan tab order yang tidak intuitif
```

### Focus Management di React

```tsx
// Kapan harus manage focus secara manual:
// 1. Setelah dialog/modal terbuka → focus ke elemen pertama di dalam dialog
// 2. Setelah dialog/modal ditutup → kembalikan focus ke tombol yang membukanya
// 3. Setelah navigasi SPA → focus ke heading atau konten utama
// 4. Setelah form submit sukses → focus ke pesan sukses

import { useRef, useEffect } from 'react';

// Contoh: focus ke pesan sukses setelah form submit
function FeedbackForm() {
  const successRef = useRef<HTMLDivElement>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (isSubmitted && successRef.current) {
      successRef.current.focus();
      // tabIndex={-1} diperlukan agar div bisa di-focus
    }
  }, [isSubmitted]);

  if (isSubmitted) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}             // bisa difokus via JS
        role="status"             // screen reader umumkan
        className="success-message"
      >
        <h2>Terima kasih!</h2>
        <p>Pesan kamu sudah kami terima.</p>
      </div>
    );
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### Focus Trap di Modal

Ketika modal terbuka, Tab harus "terjebak" di dalam modal — tidak boleh lompat ke halaman di belakangnya.

```tsx
// hooks/useFocusTrap.ts
import { useEffect, RefObject } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus ke elemen pertama saat trap aktif
    firstElement.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab: mundur
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: maju
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive, containerRef]);
}
```

### Skip Link — "Lewati Navigasi" untuk Keyboard User

Keyboard user harus Tab melewati seluruh nav (bisa 10-20 link) setiap halaman kalau tidak ada skip link. Ini sangat melelahkan.

```tsx
// components/SkipLink.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
    >
      Lewati ke konten utama
    </a>
  );
}

// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <SkipLink />  {/* HARUS elemen pertama di body */}
        <Header />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
```

```css
/* Skip link: tersembunyi sampai difokus */
.skip-link {
  position: absolute;
  top: -100%;
  left: 0;
  background: #000;
  color: #fff;
  padding: 0.5rem 1rem;
  z-index: 9999;
  font-size: 1rem;
  text-decoration: none;
}

.skip-link:focus {
  top: 0;  /* Muncul saat difokus keyboard */
}
```

### Focus Visible — Jangan Hapus Outline!

```css
/* ❌ JANGAN PERNAH ini */
* {
  outline: none; /* atau outline: 0 */
}
button:focus {
  outline: none;
}

/* ✅ Custom focus style yang jelas dan indah */
:focus-visible {
  outline: 2px solid #0070f3;
  outline-offset: 2px;
  border-radius: 2px;
}

/* Sembunyikan focus ring untuk mouse user, tampilkan untuk keyboard user */
/* :focus-visible otomatis melakukan ini di browser modern */
button:focus:not(:focus-visible) {
  outline: none; /* Mouse click: tidak tampil */
}
button:focus-visible {
  outline: 2px solid #0070f3; /* Keyboard: tampil */
}
```

---

## 5. Visual Accessibility: Kontras, Ukuran, Motion

### Color Contrast

```
WCAG 2.1 Level AA requirements:

Teks normal (< 18pt / < 14pt bold):
  → Minimum contrast ratio: 4.5:1

Teks besar (≥ 18pt / ≥ 14pt bold):
  → Minimum contrast ratio: 3:1

UI components dan grafik:
  → Minimum contrast ratio: 3:1

Tools untuk cek:
  → Browser DevTools: Inspeksi elemen → Accessibility tab → Contrast ratio
  → https://webaim.org/resources/contrastchecker/
  → VS Code: extensi "axe Accessibility Linter"
```

```tsx
// ❌ Kontras rendah — sering ditemui
// Teks abu-abu muda di background putih
<p style={{ color: '#999', background: '#fff' }}>
  Stok: 5 tersisa {/* contrast ratio ~2.8:1 — GAGAL */}
</p>

// ❌ Warna sebagai satu-satunya indikator
<span style={{ color: 'red' }}>Error</span>
<span style={{ color: 'green' }}>Sukses</span>
// Pengguna buta warna tidak bisa bedakan!

// ✅ Kontras yang cukup
<p style={{ color: '#595959', background: '#fff' }}>
  Stok: 5 tersisa {/* contrast ratio ~7:1 — LULUS */}
</p>

// ✅ Warna + ikon + teks — bukan cuma warna
<span className="status-error">
  <ErrorIcon aria-hidden="true" />
  <span>Error: Email tidak valid</span>
</span>

<span className="status-success">
  <CheckIcon aria-hidden="true" />
  <span>Berhasil disimpan</span>
</span>
```

### Ukuran dan Spacing

```css
/* Ukuran teks minimum */
body {
  font-size: 16px; /* Jangan kurang dari ini untuk body text */
}

/* Gunakan rem/em, bukan px untuk teks — ikuti preferensi user */
.body-text { font-size: 1rem; }      /* 16px default */
.small-text { font-size: 0.875rem; } /* 14px — hati-hati */
.caption { font-size: 0.75rem; }     /* 12px — sangat kecil, gunakan jarang */

/* Touch target — minimum 44x44px (Apple/WCAG guideline) */
button,
a,
input[type="checkbox"],
input[type="radio"] {
  min-width: 44px;
  min-height: 44px;
}

/* Spasi antar baris untuk keterbacaan */
p, li {
  line-height: 1.5; /* minimum */
}

/* Lebar paragraf maksimum untuk keterbacaan */
.content {
  max-width: 65ch; /* ~65 karakter — optimal untuk reading */
}
```

### Reduced Motion

```css
/* Beberapa orang sensitif terhadap animasi — bisa trigger vertigo/migrain */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```tsx
// Di React/Framer Motion: cek preferensi user
import { useReducedMotion } from 'framer-motion';

function AnimatedCard({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  const variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// Atau: hook biasa tanpa Framer Motion
function useReducedMotionQuery(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduceMotion;
}
```

---

## 6. Testing Accessibility: axe-core dan eslint-plugin-jsx-a11y

### eslint-plugin-jsx-a11y — Catch di Waktu Nulis Kode

```bash
npm install -D eslint-plugin-jsx-a11y
```

```javascript
// eslint.config.js
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,

      // Beberapa rules penting:
      'jsx-a11y/alt-text': 'error',              // img harus punya alt
      'jsx-a11y/anchor-has-content': 'error',    // <a> tidak boleh kosong
      'jsx-a11y/button-has-type': 'warn',        // button harus punya type attribute
      'jsx-a11y/click-events-have-key-events': 'error', // onClick harus ada keyboard equivalent
      'jsx-a11y/interactive-supports-focus': 'error',   // elemen interaktif harus bisa difokus
      'jsx-a11y/label-has-associated-control': 'error', // label harus terhubung ke input
      'jsx-a11y/no-autofocus': 'warn',           // autofocus bisa ganggu screen reader flow
    },
  },
];
```

### @axe-core/react — Testing di Browser (Development)

```bash
npm install -D @axe-core/react
```

```tsx
// app/layout.tsx — aktif di development saja
if (process.env.NODE_ENV !== 'production') {
  import('@axe-core/react').then(({ default: axe }) => {
    import('react-dom').then(({ default: ReactDOM }) => {
      axe(React, ReactDOM, 1000); // delay 1 detik setelah render
    });
  });
}
// Menampilkan pelanggaran accessibility di browser console secara real-time
```

### jest-axe / vitest-axe — Automated Testing

```bash
npm install -D axe-core @testing-library/jest-dom
npm install -D vitest-axe  # atau jest-axe kalau pakai Jest
```

```tsx
// Extend matchers di vitest.setup.ts
import { configureAxe, toHaveNoViolations } from 'vitest-axe';
expect.extend(toHaveNoViolations);

// Konfigurasi axe (opsional)
export const axe = configureAxe({
  rules: {
    // Disable rules tertentu kalau ada false positive
    'color-contrast': { enabled: false }, // kadang false positive di JSDOM
  },
});
```

```tsx
// components/ProductCard.test.tsx
import { render } from '@testing-library/react';
import { axe } from '../vitest.setup'; // atau import langsung
import { ProductCard } from './ProductCard';

const mockProduct = {
  id: '1',
  name: 'Kaos Polos',
  price: 75_000,
  imageUrl: '/kaos.jpg',
  rating: 4.5,
};

describe('ProductCard — Accessibility', () => {
  it('tidak punya pelanggaran accessibility', async () => {
    const { container } = render(<ProductCard product={mockProduct} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// axe akan check: alt text, ARIA usage, color contrast (terbatas di JSDOM),
// heading hierarchy, label association, dsb
```

### Testing dengan Screen Reader Secara Manual

```
Cara test yang paling meaningful: pakai screen reader sungguhan

macOS:    VoiceOver — Cmd+F5 untuk aktif/nonaktif
Windows:  NVDA (gratis) atau Narrator (built-in)
iOS:      VoiceOver — Settings → Accessibility
Android:  TalkBack — Settings → Accessibility

Checklist saat test dengan screen reader:
☐ Bisa navigasi hanya dengan keyboard (Tab, Enter, Space, Arrow keys)?
☐ Setiap elemen interaktif punya label yang bermakna?
☐ Konten dinamis (loading, error, success) diumumkan?
☐ Modal/dialog: focus masuk dan keluar dengan benar?
☐ Heading hierarchy masuk akal saat dibacakan?
☐ Gambar punya alt text yang deskriptif?
```

---

## 7. Next.js Metadata API dan SEO Dasar

### Metadata API (App Router)

```typescript
// app/layout.tsx — metadata default untuk semua halaman
import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Title template: halaman lain bisa pakai %s
  title: {
    default: 'TokoBaju — Belanja Baju Online',
    template: '%s | TokoBaju',
    // Hasil: "Kaos Polos | TokoBaju"
  },
  description: 'Belanja baju, kaos, kemeja, dan celana berkualitas dengan harga terjangkau.',
  keywords: ['baju online', 'kaos', 'kemeja', 'fashion indonesia'],

  // Open Graph — tampilan saat di-share ke social media
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://tokobaju.id',
    siteName: 'TokoBaju',
    title: 'TokoBaju — Belanja Baju Online',
    description: 'Belanja baju berkualitas dengan harga terjangkau.',
    images: [
      {
        url: 'https://tokobaju.id/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TokoBaju — Koleksi Terbaru',
      },
    ],
  },

  // Twitter/X Card
  twitter: {
    card: 'summary_large_image',
    title: 'TokoBaju',
    description: 'Belanja baju berkualitas.',
    images: ['https://tokobaju.id/og-image.jpg'],
  },

  // Canonical URL — hindari duplicate content
  alternates: {
    canonical: 'https://tokobaju.id',
    languages: {
      'id-ID': 'https://tokobaju.id',
    },
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
};
```

```typescript
// app/products/[slug]/page.tsx — metadata dinamis per halaman
import type { Metadata, ResolvingMetadata } from 'next';
import { getProduct } from '@/lib/products';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// generateMetadata = async, bisa fetch data
export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: 'Produk Tidak Ditemukan',
    };
  }

  // Ambil Open Graph image dari parent kalau produk tidak punya gambar
  const previousImages = (await parent).openGraph?.images ?? [];

  return {
    title: product.name,   // Hasil: "Kaos Polos | TokoBaju" (pakai template dari layout)
    description: product.description ?? `Beli ${product.name} dengan harga terbaik.`,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.imageUrl
        ? [{ url: product.imageUrl, alt: product.name }, ...previousImages]
        : previousImages,
    },
    // Structured data untuk Google rich results
    alternates: {
      canonical: `https://tokobaju.id/products/${slug}`,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <>
      {/* JSON-LD Structured Data — Google rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description,
            image: product.imageUrl,
            offers: {
              '@type': 'Offer',
              price: product.price,
              priceCurrency: 'IDR',
              availability: product.stock > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            },
          }),
        }}
      />
      <ProductDetail product={product} />
    </>
  );
}
```

### Sitemap dan robots.txt

```typescript
// app/sitemap.ts — auto-generate sitemap.xml
import { MetadataRoute } from 'next';
import { getAllProducts, getAllCategories } from '@/lib/data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
  const categories = await getAllCategories();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://tokobaju.id',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: 'https://tokobaju.id/products',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  const productPages: MetadataRoute.Sitemap = products.map(product => ({
    url: `https://tokobaju.id/products/${product.slug}`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...productPages];
}
```

```typescript
// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/dashboard/'],
    },
    sitemap: 'https://tokobaju.id/sitemap.xml',
  };
}
```

---

## 8. Mini Project: Audit dan Perbaiki Dropdown Menu & Modal

### Dropdown Menu — Sebelum (Penuh Masalah)

```tsx
// ❌ components/DropdownMenu/DropdownMenu.bad.tsx
// Masalah:
// 1. Tidak bisa diakses keyboard
// 2. Tidak ada ARIA
// 3. Klik di luar tidak menutup
// 4. Tidak ada focus management

import { useState } from 'react';

export function DropdownMenuBad() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="dropdown">
      <div onClick={() => setIsOpen(!isOpen)} className="dropdown-trigger">
        Aksi ▼
      </div>

      {isOpen && (
        <div className="dropdown-menu">
          <div onClick={() => console.log('edit')}>Edit</div>
          <div onClick={() => console.log('duplicate')}>Duplikat</div>
          <div onClick={() => console.log('delete')} style={{ color: 'red' }}>
            Hapus
          </div>
        </div>
      )}
    </div>
  );
}
```

### Dropdown Menu — Sesudah (Accessible)

```tsx
// ✅ components/DropdownMenu/DropdownMenu.tsx
// Sesuai ARIA Authoring Practices Guide (APG) — Menu Button pattern

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
  onClick: () => void;
}

interface DropdownMenuProps {
  label: string;          // Label tombol trigger
  items: DropdownItem[];
}

export function DropdownMenu({ label, items }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  // Tutup saat klik di luar
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Kembalikan focus ke trigger saat menu ditutup
  function closeMenu() {
    setIsOpen(false);
    setFocusedIndex(-1);
    // Kembalikan focus ke tombol trigger
    triggerRef.current?.focus();
  }

  function openMenu() {
    setIsOpen(true);
    setFocusedIndex(0); // focus ke item pertama
  }

  // Focus ke item berdasarkan index
  useEffect(() => {
    if (isOpen && focusedIndex >= 0) {
      const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
      items?.[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Keyboard handler untuk tombol trigger
  function handleTriggerKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault();
        openMenu();
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(items.length - 1); // focus ke item terakhir
        break;
    }
  }

  // Keyboard handler untuk item di dalam menu
  function handleMenuKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'Escape':
        closeMenu();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < items.length - 1 ? prev + 1 : 0 // wrap ke atas
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : items.length - 1 // wrap ke bawah
        );
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
      case 'Tab':
        // Tab menutup menu tanpa kembali ke trigger
        setIsOpen(false);
        break;
    }
  }

  function handleItemClick(item: DropdownItem) {
    item.onClick();
    closeMenu();
  }

  const menuId = 'dropdown-menu'; // bisa pakai useId() di React 18

  return (
    <div className="dropdown" style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"           // menandakan ada menu yang bisa dibuka
        aria-expanded={isOpen}          // status buka/tutup
        aria-controls={menuId}          // terhubung ke menu element
        onClick={() => isOpen ? closeMenu() : openMenu()}
        onKeyDown={handleTriggerKeyDown}
        className="dropdown-trigger"
      >
        {label}
        <span aria-hidden="true" className="dropdown-arrow">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Menu */}
      {isOpen && (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}             // label menu sama dengan trigger
          onKeyDown={handleMenuKeyDown}
          className="dropdown-panel"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            listStyle: 'none',
            margin: 0,
            padding: '0.25rem 0',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            minWidth: '160px',
          }}
        >
          {items.map((item, index) => (
            <li key={item.id} role="none">  {/* role="none" menghilangkan implicit "listitem" */}
              <button
                role="menuitem"             // ARIA role yang benar untuk item menu
                type="button"
                tabIndex={-1}              // navigasi via Arrow keys, bukan Tab
                onClick={() => handleItemClick(item)}
                className={`dropdown-item ${item.variant === 'danger' ? 'dropdown-item-danger' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.5rem 1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: item.variant === 'danger' ? '#dc2626' : '#1a1a1a',
                  textAlign: 'left',
                }}
              >
                {item.icon && (
                  <span aria-hidden="true">{item.icon}</span>
                )}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

```tsx
// Cara pakai
<DropdownMenu
  label="Aksi Produk"
  items={[
    { id: 'edit', label: 'Edit', onClick: handleEdit },
    { id: 'duplicate', label: 'Duplikat', onClick: handleDuplicate },
    { id: 'delete', label: 'Hapus', variant: 'danger', onClick: handleDelete },
  ]}
/>
```

---

### Modal — Sebelum (Penuh Masalah)

```tsx
// ❌ components/Modal/Modal.bad.tsx
// Masalah:
// 1. Tidak ada focus trap — Tab bisa keluar ke halaman
// 2. Tidak ada focus ke modal saat terbuka
// 3. Escape tidak menutup modal
// 4. Tidak ada ARIA (role, label)
// 5. Scroll di belakang modal masih bisa
// 6. Screen reader membaca konten di belakang modal

import { ReactNode } from 'react';

interface ModalBadProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function ModalBad({ isOpen, onClose, children }: ModalBadProps) {
  if (!isOpen) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}>X</button>
        {children}
      </div>
    </div>
  );
}
```

### Modal — Sesudah (Accessible)

```tsx
// ✅ components/Modal/Modal.tsx
import {
  ReactNode,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;           // WAJIB — label untuk screen reader
  description?: string;    // Deskripsi opsional
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Simpan elemen yang difokus sebelum modal terbuka
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Kembalikan focus saat modal ditutup
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // Cegah scroll di belakang modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Focus trap
  useFocusTrap(dialogRef, isOpen);

  // Tutup dengan Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  // Tutup saat klik overlay
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!isOpen) return null;

  const sizeStyles: Record<string, string> = {
    sm: '400px',
    md: '560px',
    lg: '800px',
  };

  // Render di luar DOM tree komponen — ke <body> langsung
  return createPortal(
    // aria-modal="true" memberi tahu AT (assistive technology) bahwa
    // konten di belakang modal tidak relevan
    <div
      role="presentation"
      className="modal-overlay"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        onKeyDown={handleKeyDown}
        tabIndex={-1}              // bisa difokus, tapi focus trap akan handle
        style={{
          background: '#fff',
          borderRadius: '0.75rem',
          width: '100%',
          maxWidth: sizeStyles[size],
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h2 id="modal-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
              {title}
            </h2>
            {description && (
              <p id="modal-description" style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '0.25rem',
              flexShrink: 0,
              fontSize: '1.25rem',
              lineHeight: 1,
              color: '#6b7280',
            }}
          >
            {/* Karakter × lebih baik dibaca screen reader daripada X */}
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
```

### Contoh Penggunaan Modal

```tsx
// app/products/page.tsx
import { useState, useRef } from 'react';
import { Modal } from '@/components/Modal/Modal';

export function ProductsPage() {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  function handleDeleteClick(product: Product) {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  }

  async function handleConfirmDelete() {
    if (!productToDelete) return;
    await deleteProduct(productToDelete.id);
    setDeleteModalOpen(false);
    setProductToDelete(null);
  }

  return (
    <>
      <ProductList onDeleteClick={handleDeleteClick} />

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Konfirmasi Hapus Produk"
        description={`Produk "${productToDelete?.name}" akan dihapus permanen.`}
        size="sm"
      >
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(false)}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            // Tombol destruktif harus jadi fokus pertama? Tidak!
            // Tombol "Batal" lebih aman sebagai default fokus
            style={{ background: '#dc2626', color: '#fff' }}
          >
            Ya, Hapus Produk
          </button>
        </div>
      </Modal>
    </>
  );
}
```

### Test Accessibility untuk Dropdown dan Modal

```tsx
// components/DropdownMenu/DropdownMenu.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { DropdownMenu } from './DropdownMenu';

const mockItems = [
  { id: 'edit', label: 'Edit', onClick: vi.fn() },
  { id: 'delete', label: 'Hapus', variant: 'danger' as const, onClick: vi.fn() },
];

describe('DropdownMenu — Accessibility', () => {
  it('tidak punya pelanggaran accessibility saat tertutup', async () => {
    const { container } = render(<DropdownMenu label="Aksi" items={mockItems} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('tidak punya pelanggaran accessibility saat terbuka', async () => {
    const user = userEvent.setup();
    const { container } = render(<DropdownMenu label="Aksi" items={mockItems} />);
    await user.click(screen.getByRole('button', { name: 'Aksi' }));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('toggle dengan Enter dan Space', async () => {
    const user = userEvent.setup();
    render(<DropdownMenu label="Aksi" items={mockItems} />);

    const trigger = screen.getByRole('button', { name: /aksi/i });
    trigger.focus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('navigasi dengan Arrow keys', async () => {
    const user = userEvent.setup();
    render(<DropdownMenu label="Aksi" items={mockItems} />);

    await user.click(screen.getByRole('button', { name: /aksi/i }));

    const [editItem, deleteItem] = screen.getAllByRole('menuitem');

    // Awal: fokus ke item pertama
    expect(editItem).toHaveFocus();

    // ArrowDown: ke item berikutnya
    await user.keyboard('{ArrowDown}');
    expect(deleteItem).toHaveFocus();

    // ArrowDown di item terakhir: wrap ke item pertama
    await user.keyboard('{ArrowDown}');
    expect(editItem).toHaveFocus();
  });

  it('memanggil onClick dan menutup menu saat item dipilih', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const items = [{ id: 'edit', label: 'Edit', onClick: handleEdit }];
    render(<DropdownMenu label="Aksi" items={items} />);

    await user.click(screen.getByRole('button', { name: /aksi/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(handleEdit).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('mengembalikan focus ke trigger setelah ditutup', async () => {
    const user = userEvent.setup();
    render(<DropdownMenu label="Aksi" items={mockItems} />);
    const trigger = screen.getByRole('button', { name: /aksi/i });

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(trigger).toHaveFocus();
  });
});

// components/Modal/Modal.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Modal } from './Modal';

describe('Modal — Accessibility', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Konfirmasi',
    children: (
      <>
        <p>Apakah kamu yakin?</p>
        <button type="button">Ya</button>
        <button type="button">Tidak</button>
      </>
    ),
  };

  it('tidak punya pelanggaran accessibility', async () => {
    const { container } = render(<Modal {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('punya role dialog dengan label yang benar', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog', { name: 'Konfirmasi' })).toBeInTheDocument();
  });

  it('tutup dengan Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('tombol tutup punya label yang jelas', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Tutup dialog' })).toBeInTheDocument();
  });

  it('tidak ditampilkan saat isOpen=false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('memanggil onClose saat klik overlay', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);

    // Klik overlay (bukan konten modal)
    await user.click(screen.getByRole('presentation'));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

---

## 9. Checklist Accessibility Sebelum Deploy

```
SEMANTIK & STRUKTUR
☐ Ada satu <main> per halaman
☐ Heading hierarchy benar (h1 → h2 → h3, tidak skip)
☐ Navigasi dibungkus <nav> dengan aria-label yang deskriptif
☐ <button> untuk aksi, <a href> untuk navigasi
☐ Semua <img> punya alt text (atau alt="" untuk gambar dekoratif)
☐ Tabel punya <caption> dan <th scope="col/row">
☐ Form inputs punya <label> yang terhubung (for/id atau wrapping)

KEYBOARD & FOCUS
☐ Semua interaktif bisa di-Tab dan diaktifkan dengan Enter/Space
☐ Focus visible terlihat jelas (tidak dihapus dengan outline:none)
☐ Tab order mengikuti urutan visual
☐ Modal/dialog punya focus trap
☐ Focus kembali ke trigger setelah modal ditutup
☐ Ada skip link "Lewati ke konten utama"
☐ Dropdown/menu navigasi dengan Arrow keys

ARIA
☐ Tidak ada ARIA yang tidak perlu (jangan tambah ke elemen sudah semantik)
☐ aria-label / aria-labelledby ada untuk elemen tanpa teks visible
☐ aria-expanded untuk toggle element
☐ aria-live untuk konten yang update dinamis
☐ aria-invalid + aria-errormessage untuk form error
☐ aria-hidden pada ikon/gambar dekoratif
☐ role="dialog" + aria-modal="true" untuk modal
☐ role="alert" untuk pesan error penting

VISUAL
☐ Kontras teks normal ≥ 4.5:1
☐ Kontras teks besar ≥ 3:1
☐ Kontras UI component ≥ 3:1
☐ Warna bukan satu-satunya indikator (ada ikon/teks juga)
☐ Teks bisa di-zoom 200% tanpa kehilangan konten/fungsi
☐ Touch target ≥ 44x44px
☐ Respects prefers-reduced-motion

TESTING
☐ eslint-plugin-jsx-a11y: tidak ada error/warning
☐ axe-core: tidak ada violations di semua halaman utama
☐ Test manual menggunakan hanya keyboard (Tab, Enter, Space, Escape, Arrows)
☐ Test dengan VoiceOver (macOS) atau NVDA (Windows) — setidaknya sekali

NEXT.JS / SEO
☐ <html lang="id"> (atau bahasa yang sesuai) di root layout
☐ Setiap halaman punya <title> yang unik dan deskriptif
☐ Setiap halaman punya meta description
☐ Open Graph image ada (1200x630px)
☐ Canonical URL set dengan benar
☐ sitemap.xml di-generate
☐ robots.txt ada
```

---

## Penutup

Accessibility bukan checklist yang dikerjakan sekali sebelum launch — ini mindset yang harus jalan dari hari pertama nulis kode.

Yang paling berpengaruh dari semua yang ada di doc ini:

```
1. Gunakan semantic HTML yang tepat dari awal
   → Ini "free accessibility" — tidak butuh usaha ekstra

2. Jangan hapus outline focus
   → Satu baris CSS ini yang paling sering bikin keyboard user frustasi

3. Test dengan keyboard sesekali
   → Tab terus dari awal halaman — kalau kamu bisa navigasi dengan nyaman,
     keyboard user (dan screen reader user) juga bisa

4. Kontras cukup
   → Cek sebelum PR merge, bukan setelah design di-approve

5. Test dengan axe-core secara otomatis
   → Tangkap 30-40% pelanggaran WCAG secara gratis setiap kali test jalan
```

Accessibility yang baik = UX yang baik untuk semua orang. Bukan tradeoff, bukan overhead — ini bagian dari professionalism kita sebagai developer.
