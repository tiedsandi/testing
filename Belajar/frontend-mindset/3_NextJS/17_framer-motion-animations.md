# 17 — Animasi di React/Next.js dengan Framer Motion & TypeScript

> **Gaya baca:** Obrolan santai senior ke junior. Kita mulai dari "kenapa perlu library ini" sebelum masuk ke kodenya.

---

## Daftar Isi

1. [Kenapa Framer Motion, Bukan CSS Animation Saja?](#1-kenapa-framer-motion-bukan-css-animation-saja)
2. [Setup dan Konsep Dasar](#2-setup-dan-konsep-dasar)
3. [motion Component: animate, initial, exit](#3-motion-component-animate-initial-exit)
4. [Variants: Animasi yang Terorganisir](#4-variants-animasi-yang-terorganisir)
5. [AnimatePresence: Animasi Masuk dan Keluar](#5-animatepresence-animasi-masuk-dan-keluar)
6. [Gesture Animation: Hover, Tap, Drag](#6-gesture-animation-hover-tap-drag)
7. [Layout Animation (FLIP)](#7-layout-animation-flip)
8. [Page Transition di Next.js](#8-page-transition-di-nextjs)
9. [Tips Performa Animasi](#9-tips-performa-animasi)
10. [Mini Project: Page Transition + Animated List + Modal](#10-mini-project-page-transition--animated-list--modal)

---

## 1. Kenapa Framer Motion, Bukan CSS Animation Saja?

### CSS Animation Cukup Untuk Banyak Hal

Sebelum gue jelasin Framer Motion, jujur dulu: **CSS animation sudah sangat bagus** dan sebagian besar animasi sederhana tidak butuh library tambahan.

```css
/* CSS animation: hover, fade, transform — semua bisa */
.button {
  transition: transform 0.2s ease, background-color 0.2s ease;
}
.button:hover {
  transform: scale(1.05);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.card { animation: fadeIn 0.3s ease; }
```

Pakai CSS kalau:
- Animasi sederhana (hover, fade, slide)
- Tidak butuh interaksi dengan state React
- Tidak ada elemen yang masuk/keluar DOM secara kondisional

### Tapi CSS Mulai Struggle di Sini

**Problem 1: Animasi "keluar" dari DOM** — CSS tidak bisa animasikan elemen yang `display: none` atau di-unmount.

```tsx
// ❌ Animasi masuk ada, animasi keluar tidak bisa
function Modal({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null; // ← langsung hilang, tidak ada animasi keluar
  return <div className="modal fade-in">...</div>;
}
```

**Problem 2: Animasi berdasarkan state JavaScript** — CSS tidak tahu nilai dari state React.

```tsx
// ❌ CSS tidak bisa akses nilai state ini
function ProgressBar({ progress }: { progress: number }) {
  // Kamu bisa pakai inline style, tapi transition-nya awkward
  return <div style={{ width: `${progress}%` }} className="transition-all" />;
}
```

**Problem 3: Animasi yang saling berhubungan (orkestasi)** — susah koordinasi kapan child mulai animasi setelah parent selesai.

**Problem 4: Drag, gesture, spring physics** — CSS tidak ada konsep ini.

**Problem 5: Layout animation (FLIP)** — menganimasikan perubahan posisi/ukuran elemen sangat kompleks kalau manual.

---

### Yang Bisa Framer Motion Tapi CSS Tidak

| Fitur | CSS | Framer Motion |
|-------|-----|---------------|
| Hover, focus, active state | ✅ | ✅ |
| Fade in saat mount | ✅ | ✅ |
| Fade out saat unmount | ❌ | ✅ `AnimatePresence` |
| Animasi berdasarkan JS state | 🟡 (terbatas) | ✅ |
| Spring physics | ❌ | ✅ |
| Drag dengan constraints | ❌ | ✅ |
| Layout animation (FLIP) | ❌ | ✅ `layout` prop |
| Orkestasi (stagger, sequence) | 🟡 (terbatas) | ✅ `variants` |
| Gesture (pan, pinch) | ❌ | ✅ |
| Scroll-triggered animation | 🟡 (terbatas) | ✅ `useScroll` |

---

## 2. Setup dan Konsep Dasar

```bash
npm install framer-motion
```

```typescript
// Tidak perlu konfigurasi tambahan — langsung import dan pakai
import { motion, AnimatePresence } from 'framer-motion';
```

### Konsep Inti yang Perlu Dipahami

```
motion component
  │
  ├── initial    → kondisi awal (sebelum animasi mulai)
  ├── animate    → kondisi tujuan (animasi menuju ini)
  ├── exit       → kondisi saat di-unmount (butuh AnimatePresence)
  ├── transition → kontrol timing, easing, delay, type
  │
  ├── whileHover → animasi saat hover
  ├── whileTap   → animasi saat click/tap
  ├── whileDrag  → animasi saat di-drag
  │
  └── layout     → animasi perubahan layout otomatis
```

### Setiap HTML Element Punya Versinya

```tsx
import { motion } from 'framer-motion';

// motion.div, motion.span, motion.button, motion.ul, motion.li
// motion.svg, motion.path, motion.circle — semua ada
// Kalau butuh custom component: motion(MyComponent)

<motion.div animate={{ opacity: 1 }} />
<motion.button whileHover={{ scale: 1.05 }} />
<motion.ul layout />
```

---

## 3. motion Component: animate, initial, exit

### Animasi Dasar

```tsx
import { motion } from 'framer-motion';

// Paling simpel: fade in saat mount
function FadeInCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}        // mulai dari transparan
      animate={{ opacity: 1 }}         // animasi ke opaque
      transition={{ duration: 0.4 }}   // dalam 0.4 detik
      className="card"
    >
      Konten kartu
    </motion.div>
  );
}
```

```tsx
// Slide in dari bawah + fade
function SlideUpCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}  // mulai transparan + 20px ke bawah
      animate={{ opacity: 1, y: 0 }}    // animasi ke posisi normal
      transition={{
        duration: 0.5,
        ease: 'easeOut',               // decelerating = terasa natural
      }}
    >
      {children}
    </motion.div>
  );
}
```

### Transition Options

```tsx
// Duration + easing (CSS-style)
<motion.div
  animate={{ x: 100 }}
  transition={{
    duration: 0.5,
    ease: 'easeInOut',  // atau [0.42, 0, 0.58, 1] (cubic bezier)
    delay: 0.2,
  }}
/>

// Spring physics — lebih natural dari duration-based
<motion.div
  animate={{ scale: 1 }}
  transition={{
    type: 'spring',
    stiffness: 300,  // "kekakuan" per, lebih tinggi = lebih cepat
    damping: 20,     // "peredam", lebih tinggi = lebih sedikit bounce
    mass: 1,
  }}
/>

// Tween — eksplisit pakai duration (tidak spring)
<motion.div
  animate={{ rotate: 360 }}
  transition={{
    type: 'tween',
    duration: 1,
    repeat: Infinity,          // loop selamanya
    repeatType: 'loop',        // atau 'reverse', 'mirror'
    ease: 'linear',
  }}
/>
```

### Animasi Berdasarkan State

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';

function ToggleBox() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      animate={{
        // animate menerima nilai langsung dari state JS!
        height: isExpanded ? 200 : 80,
        backgroundColor: isExpanded ? '#3b82f6' : '#e5e7eb',
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      onClick={() => setIsExpanded(prev => !prev)}
      className="rounded-lg cursor-pointer overflow-hidden"
    >
      <p className="p-4 text-white">
        {isExpanded ? 'Klik untuk collapse' : 'Klik untuk expand'}
      </p>
    </motion.div>
  );
}
```

### useMotionValue dan useTransform

```tsx
import { useMotionValue, useTransform, motion } from 'framer-motion';

// useMotionValue: nilai yang bisa di-track dan di-transform
// Berguna untuk animasi yang berubah terus-menerus (drag, scroll)

function RotatingCard() {
  const x = useMotionValue(0);

  // Transform nilai x (-100 sampai 100) ke rotasi (-15 sampai 15 derajat)
  const rotate = useTransform(x, [-100, 100], [-15, 15]);
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5]);

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      className="card cursor-grab active:cursor-grabbing"
    >
      Drag kiri-kanan
    </motion.div>
  );
}
```

---

## 4. Variants: Animasi yang Terorganisir

### Masalah Tanpa Variants

```tsx
// ❌ Animasi inline — susah di-maintain, tidak bisa reuse
function ProductCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <motion.h3
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        Nama Produk
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        Deskripsi
      </motion.p>
    </motion.div>
  );
}
```

### Variants: Definisikan Animasi Secara Terpisah

```tsx
import { motion, Variants } from 'framer-motion';

// Definisikan variants di luar komponen (tidak dibuat ulang setiap render)
const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
      // Orkestasi: child mulai animasi 0.1s setelah parent
      when: 'beforeChildren',
      staggerChildren: 0.1, // jeda antar child
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 },
  },
};

function ProductCard({ product }: { product: Product }) {
  return (
    // Parent pakai nama variant yang sama
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="card"
    >
      {/* Child: cukup definisikan variants, inherit initial/animate dari parent */}
      <motion.h3 variants={itemVariants}>
        {product.name}
      </motion.h3>
      <motion.p variants={itemVariants}>
        {product.description}
      </motion.p>
      <motion.span variants={itemVariants}>
        Rp {product.price.toLocaleString('id-ID')}
      </motion.span>
    </motion.div>
  );
}
```

### Stagger: List Animasi Satu per Satu

```tsx
import { motion, Variants } from 'framer-motion';

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08, // tiap item mulai 80ms setelah item sebelumnya
      delayChildren: 0.2,    // tunggu 200ms setelah parent sebelum child mulai
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
    scale: 0.97,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
    },
  },
};

interface Product {
  id: string;
  name: string;
  price: number;
}

function AnimatedProductList({ products }: { products: Product[] }) {
  return (
    <motion.ul
      variants={listVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {products.map(product => (
        <motion.li
          key={product.id}
          variants={itemVariants}
          className="p-4 bg-white rounded-lg shadow"
        >
          <span>{product.name}</span>
          <span className="font-semibold">
            Rp {product.price.toLocaleString('id-ID')}
          </span>
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### Variants dengan Dynamic Values

```tsx
// Variants bisa berupa fungsi yang terima custom prop
const cardVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number) => ({  // custom prop via `custom`
    opacity: 1,
    transition: { delay },
  }),
};

function CardWithDelay({ index }: { index: number }) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index * 0.1}  // pass custom value ke variants function
    />
  );
}
```

---

## 5. AnimatePresence: Animasi Masuk dan Keluar

### Permasalahan

React langsung unmount elemen dari DOM — tidak ada jeda untuk animasi keluar. `AnimatePresence` menahan proses unmount sampai `exit` animation selesai.

```tsx
// ❌ Tanpa AnimatePresence: elemen langsung hilang
function Notification({ message }: { message: string | null }) {
  if (!message) return null; // langsung hilang!
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }} // ini tidak pernah jalan!
    >
      {message}
    </motion.div>
  );
}
```

```tsx
// ✅ Dengan AnimatePresence: exit animation berjalan sebelum unmount
import { AnimatePresence, motion } from 'framer-motion';

function Notification({ message }: { message: string | null }) {
  return (
    // AnimatePresence membungkus elemen yang conditional
    <AnimatePresence>
      {message && (  // kondisional render di dalam AnimatePresence
        <motion.div
          key="notification"  // key penting! bantu AnimatePresence track elemen
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}  // sekarang berjalan!
          transition={{ duration: 0.3 }}
          className="notification"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### AnimatePresence dengan List

```tsx
import { AnimatePresence, motion } from 'framer-motion';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, x: -20, height: 0 },
  visible: {
    opacity: 1,
    x: 0,
    height: 'auto',
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    x: 20,
    height: 0,
    transition: { duration: 0.2 },
  },
};

function TodoList({ items, onDelete }: {
  items: TodoItem[];
  onDelete: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {/* mode="popLayout": item lain bergeser smooth saat satu item dihapus */}
      <AnimatePresence mode="popLayout">
        {items.map(item => (
          <motion.li
            key={item.id}       // KEY WAJIB ADA dan harus unik + stabil
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout               // animasikan perubahan posisi
            className="flex items-center justify-between p-3 bg-white rounded shadow"
          >
            <span className={item.done ? 'line-through text-gray-400' : ''}>
              {item.text}
            </span>
            <button
              onClick={() => onDelete(item.id)}
              className="text-red-500 hover:text-red-700"
            >
              Hapus
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
```

### AnimatePresence Mode

```tsx
// mode="sync" (default): enter dan exit animasi jalan bersamaan
// Cocok untuk: tab content, accordion

// mode="wait": exit selesai dulu, baru enter mulai
// Cocok untuk: page transition, modal swap

// mode="popLayout": exit animasi jalan, layout sisanya re-flow
// Cocok untuk: list dengan item yang bisa dihapus

<AnimatePresence mode="wait">
  {/* page content */}
</AnimatePresence>
```

### Modal dengan AnimatePresence

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 20,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Tutup dengan Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Lock body scroll saat modal open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl"
              onClick={e => e.stopPropagation()} // prevent close saat klik inside
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 id="modal-title" className="text-xl font-semibold">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Tutup modal"
                >
                  ✕
                </button>
              </div>
              <div className="p-6">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
```

---

## 6. Gesture Animation: Hover, Tap, Drag

### Hover dan Tap

```tsx
import { motion } from 'framer-motion';

// Hover + Tap sederhana
function AnimatedButton({ children, onClick }: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={{
        scale: 1.03,
        boxShadow: '0 8px 25px rgba(59, 130, 246, 0.35)',
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={onClick}
      className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium"
    >
      {children}
    </motion.button>
  );
}
```

```tsx
// Card dengan hover effect
function ProductCard({ product }: { product: Product }) {
  return (
    <motion.div
      whileHover="hover"  // trigger variant "hover" pada semua child
      initial="rest"
      className="relative rounded-xl overflow-hidden cursor-pointer"
    >
      {/* Gambar yang di-zoom saat hover */}
      <motion.div
        variants={{
          rest: { scale: 1 },
          hover: { scale: 1.05, transition: { duration: 0.4 } },
        }}
        className="h-48 bg-gray-200"
      >
        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
      </motion.div>

      {/* Overlay yang muncul saat hover */}
      <motion.div
        variants={{
          rest: { opacity: 0 },
          hover: { opacity: 1, transition: { duration: 0.2 } },
        }}
        className="absolute inset-0 bg-black/30 flex items-center justify-center"
      >
        <span className="text-white font-semibold">Lihat Detail</span>
      </motion.div>

      <div className="p-4">
        <h3>{product.name}</h3>
      </div>
    </motion.div>
  );
}
```

### Drag

```tsx
import { motion, PanInfo } from 'framer-motion';
import { useRef } from 'react';

// Draggable item dengan constraints
function DraggableCard() {
  const constraintsRef = useRef<HTMLDivElement>(null);

  return (
    // Container yang membatasi area drag
    <div
      ref={constraintsRef}
      className="relative h-64 w-full bg-gray-100 rounded-xl overflow-hidden"
    >
      <motion.div
        drag                           // enable drag di semua arah
        // drag="x"                    // hanya horizontal
        // drag="y"                    // hanya vertikal
        dragConstraints={constraintsRef} // tidak bisa keluar container
        dragElastic={0.1}              // 0 = rigid, 1 = sangat elastis
        dragMomentum={true}            // inersia setelah lepas
        whileDrag={{
          scale: 1.05,
          boxShadow: '0 15px 30px rgba(0,0,0,0.2)',
          cursor: 'grabbing',
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-32 h-32 bg-blue-500 rounded-xl cursor-grab
                   flex items-center justify-center text-white font-bold"
      >
        Drag me!
      </motion.div>
    </div>
  );
}
```

```tsx
// Swipe to dismiss (seperti notifikasi)
import { motion, useAnimation, PanInfo } from 'framer-motion';

function SwipeCard({ onDismiss, children }: {
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const controls = useAnimation();

  const handleDragEnd = async (_: MouseEvent | TouchEvent, info: PanInfo) => {
    const threshold = 100; // px dari posisi awal

    if (Math.abs(info.offset.x) > threshold) {
      // Swipe cukup jauh — dismiss
      await controls.start({
        x: info.offset.x > 0 ? 500 : -500,
        opacity: 0,
        transition: { duration: 0.2 },
      });
      onDismiss();
    } else {
      // Tidak cukup jauh — kembalikan ke posisi awal
      controls.start({ x: 0, opacity: 1 });
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={controls}
      className="bg-white rounded-xl p-4 shadow cursor-grab"
      style={{ touchAction: 'none' }} // penting untuk mobile
    >
      {children}
    </motion.div>
  );
}
```

### useAnimation: Control Animasi Secara Programatik

```tsx
import { motion, useAnimation } from 'framer-motion';

function ShakeInput({ hasError }: { hasError: boolean }) {
  const controls = useAnimation();

  // Trigger shake animation saat error
  useEffect(() => {
    if (hasError) {
      controls.start({
        x: [0, -8, 8, -8, 8, -4, 4, 0],
        transition: { duration: 0.5 },
      });
    }
  }, [hasError, controls]);

  return (
    <motion.input
      animate={controls}
      className={`border rounded px-3 py-2 ${hasError ? 'border-red-500' : 'border-gray-300'}`}
    />
  );
}
```

---

## 7. Layout Animation (FLIP)

### Apa Itu Layout Animation?

Layout animation menganimasikan elemen saat **posisi atau ukurannya berubah** karena perubahan layout CSS, bukan karena animasi eksplisit.

Contoh kasus: filter list → item yang tersisa bergeser posisi → tanpa `layout` prop mereka langsung "jump" ke posisi baru.

FLIP = **F**irst **L**ast **I**nvert **P**lay — teknik di balik layout animation.

```tsx
// ❌ Tanpa layout: item langsung jump ke posisi baru
function FilterableList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

```tsx
// ✅ Dengan layout: item bergerak smooth ke posisi baru
import { motion, AnimatePresence } from 'framer-motion';

function FilterableList({ items }: { items: Item[] }) {
  return (
    <motion.ul layout className="space-y-2"> {/* layout pada parent */}
      <AnimatePresence mode="popLayout">
        {items.map(item => (
          <motion.li
            key={item.id}
            layout             // animasikan perubahan posisi/ukuran
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="p-3 bg-white rounded shadow"
          >
            {item.name}
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}
```

### Layout Animation: Shared Layout (Tabs, Accordion)

```tsx
// "Magic move" antara tab — active indicator bergerak smooth
import { useState } from 'react';
import { motion } from 'framer-motion';

const TABS = ['Semua', 'Aktif', 'Selesai', 'Dibatalkan'];

function AnimatedTabs() {
  const [activeTab, setActiveTab] = useState('Semua');

  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`
            relative flex-1 py-2 px-4 text-sm font-medium rounded-lg
            transition-colors duration-200
            ${activeTab === tab ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}
          `}
        >
          {/* Active indicator bergerak smooth antar tab */}
          {activeTab === tab && (
            <motion.div
              layoutId="activeTab"  // ID yang sama = React tahu ini "elemen yang sama"
              className="absolute inset-0 bg-white rounded-lg shadow"
              initial={false}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">{tab}</span>
        </button>
      ))}
    </div>
  );
}
```

```tsx
// Expand/collapse dengan layout animation
import { useState } from 'react';
import { motion } from 'framer-motion';

interface AccordionItemProps {
  title: string;
  content: string;
}

function AccordionItem({ title, content }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    // layout pada container — animasikan perubahan tinggi
    <motion.div
      layout
      onClick={() => setIsOpen(prev => !prev)}
      className="bg-white rounded-xl shadow overflow-hidden cursor-pointer"
    >
      <motion.div layout className="p-4 flex justify-between items-center">
        <span className="font-medium">{title}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.span>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-4 text-gray-600"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

---

## 8. Page Transition di Next.js

### Next.js App Router: Page Transition

Di App Router, page transition sedikit lebih kompleks karena Next.js navigasi tidak full page reload. Kita perlu wrapper di layout.

```tsx
// components/PageTransition.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.61, 1, 0.88, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}     // key berubah saat navigasi → AnimatePresence detect exit
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

```tsx
// app/layout.tsx — wrap content dengan PageTransition
import { PageTransition } from '@/components/PageTransition';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <Navigation />
        <main>
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </body>
    </html>
  );
}
```

### Variasi Page Transition

```tsx
// Slide transition
const slideVariants = {
  initial: { x: '100%', opacity: 0 },
  enter: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 260, damping: 20 },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: { duration: 0.25 },
  },
};

// Scale transition (cocok untuk modal-like pages)
const scaleVariants = {
  initial: { scale: 0.96, opacity: 0 },
  enter: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    scale: 1.04,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Blur transition (keren untuk portfolio)
const blurVariants = {
  initial: { filter: 'blur(8px)', opacity: 0 },
  enter: {
    filter: 'blur(0px)',
    opacity: 1,
    transition: { duration: 0.4 },
  },
  exit: {
    filter: 'blur(8px)',
    opacity: 0,
    transition: { duration: 0.2 },
  },
};
```

### useScroll: Scroll-triggered Animation

```tsx
'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

// Parallax hero section
function ParallaxHero() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'], // dari top element di top viewport, sampai bottom element di top viewport
  });

  // Transform progress scroll (0-1) ke nilai yang diinginkan
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div ref={ref} className="relative h-screen overflow-hidden">
      <motion.div
        style={{ y }} // bergerak lebih lambat dari scroll = parallax
        className="absolute inset-0"
      >
        <img src="/hero.jpg" alt="Hero" className="w-full h-full object-cover" />
      </motion.div>

      <motion.div
        style={{ opacity }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <h1 className="text-5xl font-bold text-white">Selamat Datang</h1>
      </motion.div>
    </div>
  );
}

// Scroll-triggered animation untuk section
function AnimatedSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['0 1', '1 1'], // mulai saat bottom element sampai ke bottom viewport
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.85, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div ref={ref} style={{ scale, opacity }}>
      {children}
    </motion.div>
  );
}
```

---

## 9. Tips Performa Animasi

### GPU vs CPU Animation

```
GPU-accelerated (gunakan ini):
  ✓ transform (translate, scale, rotate, skew)
  ✓ opacity

CPU-only (hindari untuk animasi):
  ✗ width, height, top, left, right, bottom
  ✗ margin, padding
  ✗ background-color (kecuali opacity-based)
  ✗ border-radius (menyebabkan repaint)
  ✗ box-shadow (mahal!)
```

```tsx
// ❌ CPU animation — menyebabkan layout/paint
<motion.div
  animate={{ width: '100%', height: 200 }} // layout recalculation setiap frame!
/>

// ✅ GPU animation — hanya composite layer
<motion.div
  animate={{ scaleX: 1, scaleY: 1 }}  // transform = GPU = mulus
/>

// ❌ Animasi position dengan top/left
<motion.div animate={{ top: 0, left: 0 }} />

// ✅ Animasi position dengan translate
<motion.div animate={{ x: 0, y: 0 }} />  // framer motion otomatis pakai translateX/Y
```

### will-change dan Hardware Acceleration

```tsx
// Framer Motion otomatis menambahkan will-change saat animasi berjalan
// Tapi kamu bisa hint browser lebih awal kalau tahu elemen akan dianimasikan

<motion.div
  style={{ willChange: 'transform' }} // hint ke browser: elemen ini akan berubah
  animate={{ x: 100 }}
/>

// Atau via CSS
// .animated-element {
//   will-change: transform, opacity;
// }

// ⚠️ Jangan taruh will-change di semua elemen!
// will-change menggunakan memory VRAM — kalau terlalu banyak justru lambat
// Pakai hanya untuk elemen yang benar-benar sering dianimasikan
```

### Kurangi Re-render dengan LazyMotion

```tsx
// Framer Motion full package ~27kb gzipped
// LazyMotion bisa reduce ke ~6kb untuk kasus sederhana

import { LazyMotion, domAnimation, m } from 'framer-motion';

// Di root app
function App({ children }: { children: React.ReactNode }) {
  return (
    // Muat hanya fitur animasi DOM (tanpa gesture kompleks)
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

// Di komponen — gunakan `m` bukan `motion`
function AnimatedCard() {
  return (
    <m.div  // ← m bukan motion
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    />
  );
}

// Import full features kalau butuh gesture:
import { domMax } from 'framer-motion';
// <LazyMotion features={domMax}>
```

### Reduce Motion: Aksesibilitas

```tsx
import { useReducedMotion, motion, Variants } from 'framer-motion';

// Hargai preferensi user yang matikan animasi (vestibular disorder, epilepsi)
function AccessibleAnimation({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  const variants: Variants = prefersReducedMotion
    ? {
        // Kalau user prefer reduced motion: hanya opacity, tidak ada gerak
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        // Animasi normal
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ duration: prefersReducedMotion ? 0.1 : 0.4 }}
    >
      {children}
    </motion.div>
  );
}
```

```css
/* Alternatif: handle di CSS dengan media query */
@media (prefers-reduced-motion: reduce) {
  /* Override semua animasi */
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Jangan Animasikan yang Tidak Perlu

```tsx
// ❌ Framer Motion untuk animasi yang bisa CSS
// Ini overkill dan tambah bundle size
<motion.div whileHover={{ backgroundColor: '#3b82f6' }}>
  Hover me
</motion.div>

// ✅ Pakai CSS untuk ini
<div className="hover:bg-blue-500 transition-colors duration-200">
  Hover me
</div>

// ✅ Framer Motion untuk yang tidak bisa CSS saja
<motion.div
  whileHover="hover"  // trigger parent state untuk child
  animate={controls}  // programatic control
  drag="x"            // gesture
  layout              // layout animation
>
```

---

## 10. Mini Project: Page Transition + Animated List + Modal

### Struktur Project

```
app/
  layout.tsx               ← root layout dengan PageTransition
  page.tsx                 ← home page
  todos/
    page.tsx               ← halaman todo dengan animated list
components/
  PageTransition.tsx       ← page transition wrapper
  AnimatedTodoList.tsx     ← todo list dengan add/delete animasi
  AddTodoModal.tsx         ← modal dengan animasi masuk/keluar
  AnimatedButton.tsx       ← reusable button komponen
```

---

### 1. Root Layout dengan Page Transition

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PageTransition } from '@/components/PageTransition';
import { Navigation } from '@/components/Navigation';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Framer Motion Demo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="bg-gray-50 min-h-screen">
        <Navigation />
        <PageTransition>
          <main className="max-w-4xl mx-auto px-4 py-8">
            {children}
          </main>
        </PageTransition>
      </body>
    </html>
  );
}
```

```tsx
// components/PageTransition.tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const variants = {
  initial: { opacity: 0, y: 10 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.61, 1, 0.88, 1] },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

### 2. Home Page

```tsx
// app/page.tsx
import Link from 'next/link';
import { motion } from 'framer-motion';

const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 20 },
  },
};

export default function HomePage() {
  return (
    <motion.div
      variants={heroVariants}
      initial="hidden"
      animate="visible"
      className="text-center py-16"
    >
      <motion.h1
        variants={itemVariants}
        className="text-5xl font-bold text-gray-900 mb-4"
      >
        Framer Motion Demo
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className="text-xl text-gray-500 mb-10"
      >
        Animasi yang halus dan natural di React
      </motion.p>

      <motion.div variants={itemVariants}>
        <Link
          href="/todos"
          className="inline-block px-8 py-4 bg-blue-600 text-white rounded-2xl
                     font-semibold text-lg hover:bg-blue-700 transition-colors"
        >
          Lihat Demo Todo →
        </Link>
      </motion.div>
    </motion.div>
  );
}
```

---

### 3. Animated Button

```tsx
// components/AnimatedButton.tsx
'use client';

import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  danger:  'bg-red-500 text-white hover:bg-red-600',
  ghost:   'bg-transparent text-gray-600 hover:bg-gray-100 border border-gray-200',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg',
};

export function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}: AnimatedButtonProps) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.97, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      disabled={disabled}
      className={`
        rounded-xl font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.button>
  );
}
```

---

### 4. Add Todo Modal

```tsx
// components/AddTodoModal.tsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useEffect, useState, FormEvent } from 'react';
import { AnimatedButton } from './AnimatedButton';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (text: string, priority: 'low' | 'medium' | 'high') => void;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { delay: 0.1 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 28,
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 30,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function AddTodoModal({ isOpen, onClose, onAdd }: AddTodoModalProps) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setText('');
      setPriority('medium');
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim(), priority);
    onClose();
  };

  const priorityConfig = {
    low:    { label: 'Rendah',  color: 'bg-green-100 text-green-700 border-green-200'  },
    medium: { label: 'Sedang',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    high:   { label: 'Tinggi', color: 'bg-red-100 text-red-700 border-red-200'   },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <motion.div
              variants={fieldVariants}
              className="flex items-center justify-between px-6 pt-6 pb-4"
            >
              <h2 className="text-xl font-bold text-gray-900">Tambah Todo</h2>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center
                           rounded-full hover:bg-gray-100 transition-colors"
              >
                ✕
              </motion.button>
            </motion.div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
              {/* Input */}
              <motion.div variants={fieldVariants}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Deskripsi Todo
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Apa yang perlu dikerjakan?"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-blue-500
                             focus:border-transparent transition-shadow"
                />
              </motion.div>

              {/* Priority */}
              <motion.div variants={fieldVariants}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prioritas
                </label>
                <div className="flex gap-2">
                  {(Object.entries(priorityConfig) as [typeof priority, typeof priorityConfig[typeof priority]][]).map(
                    ([value, config]) => (
                      <motion.button
                        key={value}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPriority(value)}
                        className={`
                          flex-1 py-2 px-3 rounded-lg text-sm font-medium border
                          transition-all duration-150
                          ${priority === value
                            ? config.color + ' ring-2 ring-offset-1 ring-current'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                          }
                        `}
                      >
                        {config.label}
                      </motion.button>
                    )
                  )}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div variants={fieldVariants} className="flex gap-3 pt-1">
                <AnimatedButton
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="flex-1"
                >
                  Batal
                </AnimatedButton>
                <AnimatedButton
                  type="submit"
                  variant="primary"
                  disabled={!text.trim()}
                  className="flex-1"
                >
                  Tambah
                </AnimatedButton>
              </motion.div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

---

### 5. Animated Todo List

```tsx
// components/AnimatedTodoList.tsx
'use client';

import { AnimatePresence, motion, Reorder } from 'framer-motion';

type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  text: string;
  priority: Priority;
  done: boolean;
  createdAt: number;
}

interface AnimatedTodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (todos: Todo[]) => void;
}

const priorityColors: Record<Priority, string> = {
  low:    'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high:   'bg-red-100 text-red-700',
};

const priorityLabels: Record<Priority, string> = {
  low: 'Rendah', medium: 'Sedang', high: 'Tinggi',
};

function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    // Reorder.Item: bisa di-drag untuk reorder
    <Reorder.Item
      value={todo}
      id={todo.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        cursor: 'grabbing',
        zIndex: 10,
      }}
      layout
      className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm
                 border border-gray-100 cursor-grab select-none"
    >
      {/* Drag handle */}
      <div className="text-gray-300 hover:text-gray-400">⠿</div>

      {/* Checkbox */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => onToggle(todo.id)}
        className={`
          w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
          transition-colors duration-200
          ${todo.done
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'border-gray-300 hover:border-blue-400'
          }
        `}
      >
        <AnimatePresence>
          {todo.done && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="text-xs"
            >
              ✓
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <motion.span
          animate={{
            opacity: todo.done ? 0.45 : 1,
            textDecoration: todo.done ? 'line-through' : 'none',
          }}
          className="block text-gray-800 truncate"
        >
          {todo.text}
        </motion.span>
      </div>

      {/* Priority Badge */}
      <span className={`
        text-xs font-medium px-2.5 py-1 rounded-full shrink-0
        ${priorityColors[todo.priority]}
      `}>
        {priorityLabels[todo.priority]}
      </span>

      {/* Delete Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onDelete(todo.id)}
        className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
        aria-label="Hapus todo"
      >
        🗑
      </motion.button>
    </Reorder.Item>
  );
}

export function AnimatedTodoList({
  todos,
  onToggle,
  onDelete,
  onReorder,
}: AnimatedTodoListProps) {
  if (todos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16 text-gray-400"
      >
        <div className="text-5xl mb-4">📝</div>
        <p className="text-lg">Belum ada todo. Tambah sekarang!</p>
      </motion.div>
    );
  }

  return (
    // Reorder.Group: container untuk drag-to-reorder
    <Reorder.Group
      axis="y"
      values={todos}
      onReorder={onReorder}
      className="space-y-3"
    >
      <AnimatePresence mode="popLayout">
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </Reorder.Group>
  );
}
```

---

### 6. Halaman Todo (Semua Digabung)

```tsx
// app/todos/page.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedTodoList, type Todo } from '@/components/AnimatedTodoList';
import { AddTodoModal } from '@/components/AddTodoModal';
import { AnimatedButton } from '@/components/AnimatedButton';

type FilterType = 'all' | 'active' | 'done';

const TABS: { value: FilterType; label: string }[] = [
  { value: 'all',    label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'done',   label: 'Selesai' },
];

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: generateId(), text: 'Belajar Framer Motion', priority: 'high', done: false, createdAt: Date.now() - 3000 },
    { id: generateId(), text: 'Bikin animasi keren', priority: 'medium', done: false, createdAt: Date.now() - 2000 },
    { id: generateId(), text: 'Deploy ke production', priority: 'low', done: true, createdAt: Date.now() - 1000 },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredTodos = useMemo(() => {
    switch (activeFilter) {
      case 'active': return todos.filter(t => !t.done);
      case 'done':   return todos.filter(t => t.done);
      default:       return todos;
    }
  }, [todos, activeFilter]);

  const counts = useMemo(() => ({
    all:    todos.length,
    active: todos.filter(t => !t.done).length,
    done:   todos.filter(t => t.done).length,
  }), [todos]);

  const handleAdd = useCallback((text: string, priority: Todo['priority']) => {
    const newTodo: Todo = {
      id: generateId(),
      text,
      priority,
      done: false,
      createdAt: Date.now(),
    };
    setTodos(prev => [newTodo, ...prev]);
  }, []);

  const handleToggle = useCallback((id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleClearDone = useCallback(() => {
    setTodos(prev => prev.filter(t => !t.done));
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Todo List</h1>
        <p className="text-gray-500">
          {counts.active} aktif · {counts.done} selesai
        </p>
      </motion.div>

      {/* Tabs dengan layout animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-1 p-1.5 bg-gray-100 rounded-2xl mb-6"
      >
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`
              relative flex-1 py-2 px-3 text-sm font-medium rounded-xl
              transition-colors duration-200
              ${activeFilter === tab.value ? 'text-gray-900' : 'text-gray-500'}
            `}
          >
            {activeFilter === tab.value && (
              <motion.div
                layoutId="activeFilter"
                className="absolute inset-0 bg-white rounded-xl shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              {tab.label}
              <span className="ml-1.5 text-xs text-gray-400">
                {counts[tab.value]}
              </span>
            </span>
          </button>
        ))}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-3 mb-6"
      >
        <AnimatedButton
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2"
        >
          + Tambah Todo
        </AnimatedButton>

        <AnimatePresence>
          {counts.done > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <AnimatedButton variant="ghost" onClick={handleClearDone}>
                Hapus Selesai ({counts.done})
              </AnimatedButton>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Todo List */}
      <AnimatedTodoList
        todos={filteredTodos}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onReorder={(reordered) => {
          setTodos(prev => {
            const map = new Map(prev.map(t => [t.id, t]));
            return reordered.map(t => map.get(t.id) ?? t);
          });
        }}
      />

      {/* Add Modal */}
      <AddTodoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
```

---

### Fitur yang Terimplementasi

| Fitur | Teknik Framer Motion |
|-------|---------------------|
| Page transition (home ↔ todos) | `AnimatePresence` + `usePathname` |
| Hero text stagger | `variants` + `staggerChildren` |
| Tab indicator bergerak | `layout` + `layoutId` |
| Tambah todo (fade + slide) | `AnimatePresence` + variants |
| Hapus todo (slide out + collapse) | `AnimatePresence` + `exit` |
| Drag to reorder | `Reorder.Group` + `Reorder.Item` |
| Checkbox check animasi | `AnimatePresence` di dalam item |
| Strikethrough saat selesai | `animate` berdasarkan state |
| Modal masuk/keluar | `AnimatePresence` + spring |
| Button hover + tap | `whileHover` + `whileTap` |
| "Hapus Selesai" button muncul/hilang | `AnimatePresence` kondisional |

---

## Penutup

Animasi yang bagus itu tidak terasa seperti animasi — terasa seperti UI yang **hidup dan responsif**. Kalau user notice animasinya, mungkin terlalu berlebihan. Kalau tanpa animasi terasa "kaku atau jarring", berarti animasinya benar.

**Tiga prinsip yang gue pegang:**

1. **Animasi harus komunikatif** — bantu user paham apa yang terjadi (modal masuk = sesuatu muncul, delete = sesuatu hilang)
2. **Singkat dan snappy** — kebanyakan animasi UI antara 150–400ms. Lebih dari itu terasa lambat.
3. **Spring > duration** — `type: 'spring'` dengan `stiffness` dan `damping` yang tepat jauh lebih natural dari `duration: 0.3s ease-out`

Dan ingat: **pakai CSS untuk yang bisa CSS** — hover, focus, simple fade. Framer Motion untuk yang CSS tidak bisa: exit animation, gesture, layout animation, orkestasi.

Selamat beranimasi! 🎬
