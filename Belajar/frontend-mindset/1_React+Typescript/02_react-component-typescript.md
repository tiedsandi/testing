# React Component dengan TypeScript

> **Prerequisite:** Sudah baca [typescript-basics-for-react-dev.md](./typescript-basics-for-react-dev.md) — kalau belum, baca dulu ya, biar nyambung.

---

## Daftar Isi

1. [Setup Singkat](#1-setup-singkat)
2. [Typing Props dengan Interface](#2-typing-props-dengan-interface)
3. [React.FC vs Function Biasa](#3-reactfc-vs-function-biasa)
4. [Typing Children (ReactNode)](#4-typing-children-reactnode)
5. [Default Props dengan TypeScript](#5-default-props-dengan-typescript)
6. [Typing Event Handler](#6-typing-event-handler)
7. [Common Mistakes Pemula](#7-common-mistakes-pemula)
8. [Mini Project: Card & Button Component](#8-mini-project-card--button-component)

---

## 1. Setup Singkat

Kalau pakai Vite (recommended sekarang):

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

Kalau pakai Create React App (lebih lama):

```bash
npx create-react-app my-app --template typescript
```

Yang penting: file component kamu pakai ekstensi `.tsx` (bukan `.jsx`), dan TypeScript sudah keinstall.

---

## 2. Typing Props dengan Interface

### Kenapa Props Perlu di-Type?

Props itu "pintu masuk" data ke sebuah component. Tanpa typing, kamu tidak tahu data apa yang diharapkan — persis kayak fungsi tanpa parameter type yang kita bahas sebelumnya.

### Side-by-Side: JavaScript vs TypeScript

**JavaScript (tanpa typing):**

```jsx
// ❌ JavaScript — tidak ada kontrak, bebas mau kasih apa aja
function UserCard({ name, age, email, isAdmin }) {
  return (
    <div>
      <h2>{name}</h2>
      <p>Umur: {age}</p>
      <p>Email: {email}</p>
      {isAdmin && <span>Admin</span>}
    </div>
  );
}

// Pemakainya bisa salah kasih tipe data — tidak ada warning
<UserCard name={123} age="dua puluh" email={null} />
// Ini tidak error di editor, tapi bisa error di runtime
```

**TypeScript (dengan typing):**

```tsx
// ✅ TypeScript — ada kontrak yang jelas
interface UserCardProps {
  name: string;
  age: number;
  email: string;
  isAdmin: boolean;
}

function UserCard({ name, age, email, isAdmin }: UserCardProps) {
  return (
    <div>
      <h2>{name}</h2>
      <p>Umur: {age}</p>
      <p>Email: {email}</p>
      {isAdmin && <span>Admin</span>}
    </div>
  );
}

// ❌ Error langsung di editor sebelum run
<UserCard name={123} age="dua puluh" email={null} />
// Argument of type 'number' is not assignable to parameter of type 'string'

// ✅ Harus seperti ini
<UserCard name="Budi" age={25} email="budi@example.com" isAdmin={false} />
```

---

### Cara Mendefinisikan Props Interface

```tsx
// Konvensi penamaan: NamaComponent + Props
interface ButtonProps {
  label: string;
  color: string;
  size: number;
  disabled: boolean;
}

// Letakkan di atas component, di file yang sama
function Button({ label, color, size, disabled }: ButtonProps) {
  return (
    <button style={{ color, fontSize: size }} disabled={disabled}>
      {label}
    </button>
  );
}
```

---

### Props dengan Optional & Default

```tsx
interface AlertProps {
  message: string;
  type: "success" | "error" | "warning" | "info"; // literal union
  title?: string;        // opsional
  dismissable?: boolean; // opsional
}

function Alert({ message, type, title, dismissable }: AlertProps) {
  return (
    <div className={`alert alert-${type}`}>
      {title && <strong>{title}</strong>}
      <p>{message}</p>
      {dismissable && <button>×</button>}
    </div>
  );
}

// Pemakaian — title dan dismissable boleh tidak diisi
<Alert message="Data berhasil disimpan!" type="success" />
<Alert message="Terjadi kesalahan." type="error" title="Error!" dismissable />
```

---

### Props dengan Object & Array

```tsx
// Object sebagai prop
interface Address {
  street: string;
  city: string;
  zipCode: string;
}

interface UserProfileProps {
  name: string;
  address: Address;          // object
  hobbies: string[];         // array of string
  scores: number[];          // array of number
  metadata?: Record<string, string>; // object dengan key dinamis (opsional)
}

function UserProfile({ name, address, hobbies, scores, metadata }: UserProfileProps) {
  return (
    <div>
      <h1>{name}</h1>
      <p>{address.street}, {address.city} {address.zipCode}</p>
      <ul>
        {hobbies.map((hobby, i) => <li key={i}>{hobby}</li>)}
      </ul>
    </div>
  );
}
```

---

## 3. React.FC vs Function Biasa

Ini salah satu topik paling debatable di komunitas React + TypeScript. Mari kita bedah tuntas.

### Apa itu `React.FC`?

`React.FC` (atau `React.FunctionComponent`) adalah generic type bawaan React yang bisa kamu pakai untuk mengetik functional component.

```tsx
import React from "react";

// Cara pakai React.FC
const Greeting: React.FC<{ name: string }> = ({ name }) => {
  return <h1>Halo, {name}!</h1>;
};
```

### Perbandingan Langsung

```tsx
// ── Cara 1: React.FC ─────────────────────────────────────────
import React from "react";

interface GreetingProps {
  name: string;
  age?: number;
}

const Greeting: React.FC<GreetingProps> = ({ name, age }) => {
  return <p>Halo {name}{age ? `, umur ${age}` : ""}!</p>;
};

// ── Cara 2: Function biasa (regular function declaration) ─────
function Greeting({ name, age }: GreetingProps) {
  return <p>Halo {name}{age ? `, umur ${age}` : ""}!</p>;
}

// ── Cara 3: Arrow function tanpa React.FC ────────────────────
const Greeting = ({ name, age }: GreetingProps) => {
  return <p>Halo {name}{age ? `, umur ${age}` : ""}!</p>;
};
```

---

### Kenapa `React.FC` Sudah Tidak Direkomendasikan?

Sebelum React 18, `React.FC` secara implisit meng-include `children` di setiap component — bahkan yang tidak butuh `children`. Ini menyebabkan bug yang sulit dideteksi.

```tsx
// ❌ Masalah dengan React.FC (sebelum React 18)
const Button: React.FC<{ label: string }> = ({ label, children }) => {
  //                                                   ^^^^^^^^
  // children otomatis ada! Padahal Button ini tidak butuh children.
  // TypeScript tidak akan warning kalau kamu kasih children ke Button.
  return <button>{label}</button>;
};

// Ini tidak error, padahal harusnya error
<Button label="Klik">
  <span>Ini tidak seharusnya ada di sini</span>
</Button>
```

Sejak **React 18**, masalah ini sudah diperbaiki — `React.FC` tidak lagi otomatis include `children`. Tapi stigmanya masih ada, dan komunitas sudah banyak yang pindah ke function biasa.

---

### Perbedaan Lain yang Perlu Diketahui

```tsx
// React.FC tidak bisa pakai generic dengan mudah
// ❌ Awkward dengan React.FC
const List: React.FC<{ items: T[] }> = ... // TypeScript tidak suka ini

// ✅ Jauh lebih natural dengan function biasa
function List<T>({ items }: { items: T[] }) {
  return <ul>{items.map((item, i) => <li key={i}>{String(item)}</li>)}</ul>;
}

// React.FC tidak bisa return tipe lain (misalnya array atau string) tanpa workaround
// Function biasa lebih fleksibel soal return type
```

---

### Verdict: Mana yang Sebaiknya Dipakai?

| | `React.FC` | Function Biasa |
|---|---|---|
| Verbose | Lebih verbose | Lebih ringkas |
| Generic component | Awkward | Natural |
| Return type inference | Ada, tapi terbatas | Lebih fleksibel |
| `children` handling | Otomatis (React 17), manual (React 18+) | Selalu explicit |
| Komunitas (2024+) | Mulai ditinggalkan | **Recommended** |

> **Saran senior dev:** Pakai **function biasa** atau **arrow function tanpa `React.FC`**. Lebih eksplisit, lebih bersih, lebih mudah baca. `React.FC` masih valid dan tidak salah, tapi convention terkini sudah menjauhinya. Kalau kamu bergabung ke tim yang pakai `React.FC`, ikuti saja — konsistensi lebih penting dari preferensi pribadi.

---

## 4. Typing Children (ReactNode)

### Apa itu `children` di TypeScript?

`children` adalah prop spesial di React — ini yang kamu taruh di antara opening dan closing tag component. Di TypeScript, kamu harus eksplisit mendeklarasikannya.

### Tipe-Tipe untuk Children

```tsx
import { ReactNode, ReactElement, PropsWithChildren } from "react";

// ReactNode — paling fleksibel, cocok untuk hampir semua kasus
// Bisa: JSX element, string, number, null, undefined, boolean, array
interface ContainerProps {
  children: ReactNode;
  className?: string;
}

// ReactElement — hanya JSX element (bukan string/number/null)
interface WrapperProps {
  children: ReactElement;
}

// PropsWithChildren<T> — shortcut untuk T & { children?: ReactNode }
type CardProps = PropsWithChildren<{
  title: string;
  footer?: string;
}>;
// Sama dengan: { title: string; footer?: string; children?: ReactNode }
```

---

### Side-by-Side: JS vs TS untuk Children

**JavaScript:**

```jsx
// JS — tidak ada kontrak, terima apa aja
function Layout({ children, sidebar }) {
  return (
    <div className="layout">
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}
```

**TypeScript:**

```tsx
// TS — explicit, jelas tipenya
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;    // wajib ada
  sidebar?: ReactNode;    // opsional
}

function Layout({ children, sidebar }: LayoutProps) {
  return (
    <div className="layout">
      {sidebar && <aside>{sidebar}</aside>}
      <main>{children}</main>
    </div>
  );
}

// Pemakaian
<Layout sidebar={<nav>Menu di sini</nav>}>
  <h1>Konten utama</h1>
  <p>Paragraf konten.</p>
</Layout>
```

---

### Contoh Berbagai Jenis Children

```tsx
import { ReactNode, ReactElement } from "react";

// 1. children sebagai ReactNode (paling umum)
interface PanelProps {
  children: ReactNode;
  title: string;
}

function Panel({ children, title }: PanelProps) {
  return (
    <div className="panel">
      <h2>{title}</h2>
      <div className="panel-body">{children}</div>
    </div>
  );
}

// Bisa diisi teks, element, apa aja
<Panel title="Info">Ini teks biasa.</Panel>
<Panel title="Konten"><ul><li>Item</li></ul></Panel>
<Panel title="Campuran">
  <h3>Subheading</h3>
  Teks setelah heading
</Panel>

// ─────────────────────────────────────────────────────────────

// 2. Children yang wajib hanya ReactElement (bukan teks)
interface TabsProps {
  children: ReactElement | ReactElement[]; // Harus JSX, bukan string mentah
}

// ─────────────────────────────────────────────────────────────

// 3. Multiple children slots dengan nama spesifik
interface PageLayoutProps {
  header: ReactNode;   // slot header
  footer: ReactNode;   // slot footer
  sidebar?: ReactNode; // slot sidebar (opsional)
  children: ReactNode; // konten utama
}

function PageLayout({ header, footer, sidebar, children }: PageLayoutProps) {
  return (
    <div>
      <header>{header}</header>
      <div className="body">
        {sidebar && <aside>{sidebar}</aside>}
        <main>{children}</main>
      </div>
      <footer>{footer}</footer>
    </div>
  );
}

// Pemakaian — named slots
<PageLayout
  header={<nav>Navigation</nav>}
  footer={<p>© 2025</p>}
  sidebar={<ul>Menu items</ul>}
>
  <h1>Main Content</h1>
</PageLayout>
```

---

## 5. Default Props dengan TypeScript

### Cara Modern: Default Parameter Values

Ini cara yang paling dianjurkan sekarang — bersih, natural, dan fully typed.

**JavaScript:**

```jsx
// JS — defaultProps (cara lama) atau default parameter
function Badge({ text, color = "blue", size = "medium" }) {
  return <span className={`badge badge-${color} badge-${size}`}>{text}</span>;
}

// Atau pakai defaultProps (deprecated untuk function component)
Badge.defaultProps = {
  color: "blue",
  size: "medium",
};
```

**TypeScript:**

```tsx
// ✅ Cara modern — default value langsung di destructuring
interface BadgeProps {
  text: string;
  color?: "blue" | "green" | "red" | "gray"; // optional karena ada default
  size?: "small" | "medium" | "large";       // optional karena ada default
}

function Badge({ text, color = "blue", size = "medium" }: BadgeProps) {
  return (
    <span className={`badge badge-${color} badge-${size}`}>
      {text}
    </span>
  );
}

// Pemakaian
<Badge text="New" />                          // color: "blue", size: "medium"
<Badge text="Hot" color="red" />              // color: "red", size: "medium"
<Badge text="Sale" color="green" size="large" /> // semua custom
```

---

### Default untuk Object Props

```tsx
interface AvatarConfig {
  shape: "circle" | "square";
  border: boolean;
  borderColor: string;
}

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
  config?: AvatarConfig;
}

// Default untuk object — gunakan default parameter dengan spread
const DEFAULT_CONFIG: AvatarConfig = {
  shape: "circle",
  border: false,
  borderColor: "transparent",
};

function Avatar({
  src,
  alt,
  size = 40,
  config = DEFAULT_CONFIG,
}: AvatarProps) {
  const style = {
    width: size,
    height: size,
    borderRadius: config.shape === "circle" ? "50%" : "4px",
    border: config.border ? `2px solid ${config.borderColor}` : "none",
  };

  return <img src={src} alt={alt} style={style} />;
}

// Pemakaian
<Avatar src="/user.jpg" alt="Foto Budi" />
<Avatar src="/user.jpg" alt="Foto Sari" size={64} config={{ shape: "square", border: true, borderColor: "#000" }} />
```

---

### Default Props untuk Required vs Optional

```tsx
// Pola yang sering bikin bingung — ini penjelasannya

interface InputProps {
  // Wajib — tidak ada default, harus selalu diisi
  name: string;
  value: string;
  onChange: (value: string) => void;

  // Opsional dengan default — harus pakai ? di interface
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

function Input({
  name,
  value,
  onChange,
  placeholder = "",      // default: string kosong
  disabled = false,      // default: false
  maxLength = 255,       // default: 255
}: InputProps) {
  return (
    <input
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
    />
  );
}
```

> **Aturan praktis:** Kalau sebuah prop punya default value, tandai dengan `?` di interface. Kalau wajib diisi, jangan pakai `?`.

---

## 6. Typing Event Handler

Ini topik yang paling sering bikin pemula bingung: "tipe apa yang harus dipakai untuk event?"

### Daftar Event Handler yang Umum

```tsx
import {
  MouseEvent,
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  FocusEvent,
  DragEvent,
} from "react";
```

---

### 6.1 onClick

```tsx
// ── Side-by-side: JS vs TS ────────────────────────────────────

// JavaScript
function ButtonJS({ onClick, label }) {
  return <button onClick={onClick}>{label}</button>;
}

// TypeScript
interface ButtonTSProps {
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

function ButtonTS({ label, onClick }: ButtonTSProps) {
  return <button onClick={onClick}>{label}</button>;
}

// ────────────────────────────────────────────────────────────

// Contoh lengkap dengan berbagai onClick pattern

interface CardProps {
  title: string;
  // onClick yang simple — tidak butuh event object
  onSelect: () => void;
  // onClick yang butuh event — misalnya untuk stopPropagation
  onDelete: (event: MouseEvent<HTMLButtonElement>) => void;
  // onClick dengan data — callback dengan ID
  onEdit: (id: number) => void;
  id: number;
}

function Card({ title, onSelect, onDelete, onEdit, id }: CardProps) {
  return (
    <div onClick={onSelect}>
      <h3>{title}</h3>
      <button onClick={(e) => onDelete(e)}>Hapus</button>
      <button onClick={() => onEdit(id)}>Edit</button>
    </div>
  );
}
```

---

### 6.2 onChange (Input, Textarea, Select)

```tsx
import { ChangeEvent } from "react";

// Input text / textarea
interface TextInputProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

function TextInput({ value, onChange }: TextInputProps) {
  return <input type="text" value={value} onChange={onChange} />;
}

// Atau kalau kamu hanya ingin string-nya (bukan full event object)
interface SimpleInputProps {
  value: string;
  onChange: (value: string) => void; // langsung string-nya
}

function SimpleInput({ value, onChange }: SimpleInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)} // extract value-nya
    />
  );
}

// ────────────────────────────────────────────────────────────

// Select / Dropdown
interface SelectProps {
  value: string;
  options: string[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

function Select({ value, options, onChange }: SelectProps) {
  return (
    <select value={value} onChange={onChange}>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

// ────────────────────────────────────────────────────────────

// Checkbox — pakai e.target.checked, bukan e.target.value
interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
```

---

### 6.3 onSubmit

```tsx
import { FormEvent } from "react";

// ── Side-by-side: JS vs TS ────────────────────────────────────

// JavaScript
function LoginFormJS({ onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      {/* ... */}
    </form>
  );
}

// TypeScript
interface LoginFormProps {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function LoginForm({ onSubmit }: LoginFormProps) {
  return (
    <form onSubmit={onSubmit}>
      {/* ... */}
    </form>
  );
}

// ────────────────────────────────────────────────────────────

// Contoh form lengkap dengan state management

import { useState, FormEvent, ChangeEvent } from "react";

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginFormFullProps {
  onSubmit: (data: LoginFormData) => void;
  isLoading?: boolean;
}

function LoginFormFull({ onSubmit, isLoading = false }: LoginFormFullProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Email"
      />
      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={handleChange}
        placeholder="Password"
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Loading..." : "Login"}
      </button>
    </form>
  );
}
```

---

### 6.4 onKeyDown, onFocus, onBlur

```tsx
import { KeyboardEvent, FocusEvent } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;          // dipanggil saat Enter ditekan
  onFocus?: () => void;
  onBlur?: () => void;
}

function SearchInput({ value, onChange, onEnter, onFocus, onBlur }: SearchInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      onEnter?.(); // optional chaining — panggil kalau ada
    }
    if (e.key === "Escape") {
      onChange("");
    }
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>): void => {
    onFocus?.();
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>): void => {
    onBlur?.();
  };

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="Cari..."
    />
  );
}
```

---

### Cheat Sheet: Event Types

| Event | Elemen HTML | Tipe TypeScript |
|---|---|---|
| `onClick` | `<button>`, `<div>`, dll | `MouseEvent<HTMLButtonElement>` |
| `onChange` | `<input>` | `ChangeEvent<HTMLInputElement>` |
| `onChange` | `<select>` | `ChangeEvent<HTMLSelectElement>` |
| `onChange` | `<textarea>` | `ChangeEvent<HTMLTextAreaElement>` |
| `onSubmit` | `<form>` | `FormEvent<HTMLFormElement>` |
| `onKeyDown/Up/Press` | `<input>` | `KeyboardEvent<HTMLInputElement>` |
| `onFocus` / `onBlur` | `<input>` | `FocusEvent<HTMLInputElement>` |
| `onMouseEnter/Leave` | `<div>`, dll | `MouseEvent<HTMLDivElement>` |
| `onScroll` | `<div>` | `UIEvent<HTMLDivElement>` |

---

## 7. Common Mistakes Pemula

### ❌ Mistake #1: Lupa interface untuk props, pakai inline type

```tsx
// ❌ Inline di parameter — susah dibaca kalau props banyak
function UserCard({ name, age, email, role, isVerified }: {
  name: string;
  age: number;
  email: string;
  role: string;
  isVerified: boolean;
}) {
  return <div>{name}</div>;
}

// ✅ Pisahkan ke interface — lebih bersih, bisa di-reuse
interface UserCardProps {
  name: string;
  age: number;
  email: string;
  role: string;
  isVerified: boolean;
}

function UserCard({ name, age, email, role, isVerified }: UserCardProps) {
  return <div>{name}</div>;
}
```

---

### ❌ Mistake #2: Export interface tapi tidak export component, atau sebaliknya

```tsx
// ❌ Interface tidak di-export padahal dibutuhkan di tempat lain
interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) { ... }

// Di file lain, tidak bisa pakai ButtonProps
// import { ButtonProps } from "./Button"; // Error: tidak ada

// ✅ Export interface juga kalau akan dipakai di tempat lain
export interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) { ... }

// Sekarang bisa di-import di tempat lain
import { Button, ButtonProps } from "./Button";
```

---

### ❌ Mistake #3: Menggunakan `any` untuk event handler

```tsx
// ❌ Pakai any — kehilangan semua type safety
function Input({ onChange }: { onChange: (e: any) => void }) {
  return <input onChange={onChange} />;
}

// Tidak ada autocomplete, tidak ada error detection
const handleChange = (e: any) => {
  console.log(e.targer.value); // Typo 'targer' tidak terdeteksi!
};

// ✅ Pakai tipe yang benar
function Input({ onChange }: { onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return <input onChange={onChange} />;
}

const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value); // Autocomplete berfungsi, typo terdeteksi
};
```

---

### ❌ Mistake #4: Salah tipe untuk children

```tsx
// ❌ Pakai JSX.Element — terlalu restrictive
interface CardProps {
  children: JSX.Element; // Hanya menerima satu JSX element
}

// Error kalau ada teks langsung atau array
<Card>Teks biasa</Card>       // Error
<Card>{[<div/>, <p/>]}</Card> // Error
<Card>{null}</Card>           // Error

// ✅ Pakai ReactNode — lebih fleksibel dan realistis
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode; // Menerima semua: JSX, string, number, null, array
}

// Semua ini valid
<Card>Teks biasa</Card>
<Card><div>JSX</div></Card>
<Card>{null}</Card>
<Card>{condition && <Spinner />}</Card>
```

---

### ❌ Mistake #5: Tidak type-guard saat menerima `string | undefined`

```tsx
interface TagProps {
  label: string;
  tooltip?: string;
}

// ❌ Langsung pakai tanpa cek
function Tag({ label, tooltip }: TagProps) {
  return (
    <span title={tooltip.toUpperCase()}> {/* Error! tooltip bisa undefined */}
      {label}
    </span>
  );
}

// ✅ Handle optional dengan benar
function Tag({ label, tooltip }: TagProps) {
  return (
    <span title={tooltip?.toUpperCase()}> {/* OK — optional chaining */}
      {label}
    </span>
  );
}

// ✅ Atau dengan default value
function Tag({ label, tooltip = "" }: TagProps) {
  return (
    <span title={tooltip.toUpperCase()}>
      {label}
    </span>
  );
}
```

---

### ❌ Mistake #6: Prop drilling tanpa typing yang rapi

```tsx
// ❌ Copy-paste interface terus di setiap level
interface ParentProps {
  userId: number;
  userName: string;
}

interface ChildProps {
  userId: number;   // duplikasi
  userName: string; // duplikasi
}

// ✅ Extend atau Pick dari interface yang ada
interface UserBase {
  userId: number;
  userName: string;
}

interface ChildProps extends UserBase {
  extraProp: string;
}

// Atau gunakan Pick untuk ambil sebagian
interface DetailCardProps extends Pick<UserBase, "userName"> {
  age: number;
}
```

---

## 8. Mini Project: Card & Button Component

Saatnya implementasi. Kita buat dua component yang **fully typed**, **reusable**, dan bisa dipakai di banyak situasi.

---

### Struktur File

```
src/
  components/
    Button/
      Button.tsx
      Button.types.ts   ← types dipisah biar rapi
    Card/
      Card.tsx
      Card.types.ts
  App.tsx
```

---

### Button Component

**`src/components/Button/Button.types.ts`**

```ts
import { MouseEvent, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  // ── Konten ──────────────────────────────────────────────────
  children: ReactNode;

  // ── Behaviour ───────────────────────────────────────────────
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;

  // ── Tampilan ─────────────────────────────────────────────────
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;

  // ── Accessibility ────────────────────────────────────────────
  ariaLabel?: string;

  // ── Styling tambahan ─────────────────────────────────────────
  className?: string;
}
```

**`src/components/Button/Button.tsx`**

```tsx
import { ButtonProps } from "./Button.types";

// Mapping size ke class CSS (atau bisa pakai Tailwind)
const SIZE_CLASSES: Record<string, string> = {
  sm: "btn--sm",
  md: "btn--md",
  lg: "btn--lg",
};

const VARIANT_CLASSES: Record<string, string> = {
  primary:   "btn--primary",
  secondary: "btn--secondary",
  danger:    "btn--danger",
  ghost:     "btn--ghost",
};

function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  variant = "primary",
  size = "md",
  fullWidth = false,
  ariaLabel,
  className = "",
}: ButtonProps) {
  // Gabungkan semua class
  const classes = [
    "btn",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? "btn--full-width" : "",
    loading   ? "btn--loading"    : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    if (disabled || loading) return; // Jangan trigger kalau disabled/loading
    onClick?.(e);
  };

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      onClick={handleClick}
    >
      {loading ? (
        <>
          <span className="btn__spinner" aria-hidden="true" />
          <span className="btn__loading-text">Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;
```

---

### Card Component

**`src/components/Card/Card.types.ts`**

```ts
import { ReactNode, MouseEvent } from "react";

export type CardElevation = "flat" | "raised" | "floating";

// Sub-type untuk action button di dalam card
export interface CardAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

export interface CardProps {
  // ── Konten ──────────────────────────────────────────────────
  children: ReactNode;

  // ── Header (opsional semua) ──────────────────────────────────
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode; // slot untuk tombol di area header

  // ── Footer ───────────────────────────────────────────────────
  footer?: ReactNode;
  actions?: CardAction[]; // array action buttons di footer

  // ── Tampilan ─────────────────────────────────────────────────
  elevation?: CardElevation;
  padding?: "none" | "sm" | "md" | "lg";
  fullHeight?: boolean;

  // ── Interaksi ────────────────────────────────────────────────
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  hoverable?: boolean;

  // ── Styling ───────────────────────────────────────────────────
  className?: string;
}
```

**`src/components/Card/Card.tsx`**

```tsx
import { CardProps, CardAction } from "./Card.types";
import Button from "../Button/Button";

const ELEVATION_CLASSES: Record<string, string> = {
  flat:    "card--flat",
  raised:  "card--raised",
  floating: "card--floating",
};

const PADDING_CLASSES: Record<string, string> = {
  none: "card--padding-none",
  sm:   "card--padding-sm",
  md:   "card--padding-md",
  lg:   "card--padding-lg",
};

// Sub-component: Header
function CardHeader({
  title,
  subtitle,
  headerAction,
}: {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}) {
  // Tidak render apa-apa kalau tidak ada header content
  if (!title && !subtitle && !headerAction) return null;

  return (
    <div className="card__header">
      <div className="card__header-text">
        {title && <h3 className="card__title">{title}</h3>}
        {subtitle && <p className="card__subtitle">{subtitle}</p>}
      </div>
      {headerAction && (
        <div className="card__header-action">{headerAction}</div>
      )}
    </div>
  );
}

// Sub-component: Actions Footer
function CardActions({ actions }: { actions: CardAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="card__actions">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant ?? "secondary"}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

// Main Card Component
function Card({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  actions = [],
  elevation = "raised",
  padding = "md",
  fullHeight = false,
  onClick,
  hoverable = false,
  className = "",
}: CardProps) {
  const isClickable = Boolean(onClick) || hoverable;

  const classes = [
    "card",
    ELEVATION_CLASSES[elevation],
    PADDING_CLASSES[padding],
    fullHeight  ? "card--full-height" : "",
    isClickable ? "card--clickable"   : "",
    hoverable   ? "card--hoverable"   : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const hasFooter = footer !== undefined || actions.length > 0;

  return (
    <div
      className={classes}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header section */}
      <CardHeader
        title={title}
        subtitle={subtitle}
        headerAction={headerAction}
      />

      {/* Body section */}
      <div className="card__body">{children}</div>

      {/* Footer section */}
      {hasFooter && (
        <div className="card__footer">
          {footer}
          {actions.length > 0 && <CardActions actions={actions} />}
        </div>
      )}
    </div>
  );
}

export default Card;
```

---

### Menggunakan Card & Button di App

**`src/App.tsx`**

```tsx
import { useState } from "react";
import Card from "./components/Card/Card";
import Button from "./components/Button/Button";
import { CardAction } from "./components/Card/Card.types";

// Type untuk data article
interface Article {
  id: number;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  tags: string[];
}

// Data dummy
const ARTICLES: Article[] = [
  {
    id: 1,
    title: "Belajar TypeScript dari Nol",
    excerpt: "TypeScript adalah superset JavaScript yang menambahkan static typing...",
    author: "Budi Santoso",
    publishedAt: "2025-01-15",
    tags: ["typescript", "javascript", "tutorial"],
  },
  {
    id: 2,
    title: "React Hooks Lengkap",
    excerpt: "Panduan lengkap menggunakan useState, useEffect, useCallback...",
    author: "Sari Dewi",
    publishedAt: "2025-01-20",
    tags: ["react", "hooks", "tutorial"],
  },
];

function App() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [likedIds, setLikedIds] = useState<number[]>([]);

  const toggleLike = (id: number): void => {
    setLikedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDelete = (id: number): void => {
    alert(`Hapus article ID: ${id}`);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Article List</h1>

      {/* Button contoh berbagai variant */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
        <Button variant="primary" onClick={() => alert("Primary!")}>
          Primary
        </Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger" size="sm">
          Danger
        </Button>
        <Button variant="ghost" size="lg">
          Ghost
        </Button>
        <Button variant="primary" loading>
          Loading...
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </div>

      {/* Card list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {ARTICLES.map((article) => {
          const isLiked = likedIds.includes(article.id);
          const isSelected = selectedId === article.id;

          // Actions untuk card footer
          const cardActions: CardAction[] = [
            {
              label: isLiked ? "❤️ Liked" : "🤍 Like",
              onClick: () => toggleLike(article.id),
              variant: isLiked ? "primary" : "secondary",
            },
            {
              label: "Edit",
              onClick: () => setSelectedId(article.id),
              variant: "secondary",
            },
            {
              label: "Hapus",
              onClick: () => handleDelete(article.id),
              variant: "danger",
            },
          ];

          return (
            <Card
              key={article.id}
              title={article.title}
              subtitle={`Oleh ${article.author} — ${article.publishedAt}`}
              elevation={isSelected ? "floating" : "raised"}
              hoverable
              actions={cardActions}
              headerAction={
                <span style={{ fontSize: "0.75rem", color: "#888" }}>
                  #{article.id}
                </span>
              }
              onClick={() => setSelectedId(isSelected ? null : article.id)}
            >
              {/* Body card */}
              <p>{article.excerpt}</p>
              <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem" }}>
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: "2px 8px",
                      background: "#e0f0ff",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Expanded detail saat selected */}
              {isSelected && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    background: "#f9f9f9",
                    borderRadius: "4px",
                  }}
                >
                  <strong>Detail Article #{article.id}</strong>
                  <p>Klik card lagi untuk menutup detail ini.</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Status panel */}
      {selectedId !== null && (
        <Card
          title="Status"
          elevation="flat"
          padding="sm"
          footer={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedId(null)}
            >
              Tutup
            </Button>
          }
          style={{ marginTop: "1rem" }}
        >
          <p>Article yang dipilih: <strong>ID #{selectedId}</strong></p>
          <p>Total liked: <strong>{likedIds.length}</strong></p>
        </Card>
      )}
    </div>
  );
}

export default App;
```

---

### Rekap: Apa yang Sudah Diimplementasi

| Fitur | Di mana |
|---|---|
| **Interface untuk props** | `ButtonProps`, `CardProps`, `CardAction`, `Article` |
| **Function component biasa** (bukan `React.FC`) | `Button`, `Card`, `CardHeader`, `CardActions` |
| **children: ReactNode** | `ButtonProps.children`, `CardProps.children` |
| **Default props** | `type = "button"`, `variant = "primary"`, `elevation = "raised"`, dll |
| **onClick** dengan `MouseEvent` | `ButtonProps.onClick`, `CardProps.onClick` |
| **Union types** | `ButtonVariant`, `ButtonSize`, `CardElevation` |
| **Optional props** | `title?`, `subtitle?`, `headerAction?`, `footer?`, dll |
| **Array of object** | `CardProps.actions: CardAction[]` |
| **Export interface** | `ButtonProps`, `CardProps`, `CardAction` di-export |
| **State typing** | `useState<number \| null>`, `useState<number[]>` |

---

## Penutup

Dua component ini sudah menerapkan semua konsep yang dibahas hari ini. Tapi perjalanannya belum selesai!

**Langkah selanjutnya:**

1. **Utility Types**: `Partial<ButtonProps>` untuk override sebagian props, `Omit<CardProps, 'onClick'>` untuk versi non-clickable
2. **Generic Component**: Buat `List<T>` component yang bisa render data apapun
3. **Custom Hooks + TypeScript**: `useForm<T>`, `useFetch<T>` — generics di hooks
4. **Context + TypeScript**: Typing React Context agar tidak ada `any`
5. **Compound Component Pattern**: Pakai `Card.Header`, `Card.Body`, `Card.Footer` sebagai sub-components

> **Reminder dari senior dev:** Jangan fokus ke "TypeScript yang perfect" sejak awal. Tulis dulu, biar TypeScript complain, baca error-nya, fix. Lama-lama kamu mulai hafal pola dan intuisi typing-mu akan tajam sendiri. Selamat ngoding! 🚀

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+*
