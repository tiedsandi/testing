# Form Handling di React/Next.js: React Hook Form + Zod + TypeScript

> **Prerequisite:** Paham React hooks dasar (useState, useEffect) dan TypeScript interface. Kalau belum, baca dulu [01_typescript-basics-for-react-dev.md](./01_typescript-basics-for-react-dev.md) dan [03_react-hooks-typescript.md](./03_react-hooks-typescript.md).

---

## Daftar Isi

1. [Kenapa Form Itu Susah?](#1-kenapa-form-itu-susah)
2. [Controlled vs Uncontrolled Component](#2-controlled-vs-uncontrolled-component)
3. [React Hook Form: Cara Berpikir Baru](#3-react-hook-form-cara-berpikir-baru)
4. [Zod: Validasi Schema dengan TypeScript](#4-zod-validasi-schema-dengan-typescript)
5. [Integrasi React Hook Form + Zod](#5-integrasi-react-hook-form--zod)
6. [Error Messages yang User-Friendly](#6-error-messages-yang-user-friendly)
7. [Pola Form yang Sering Dipakai](#7-pola-form-yang-sering-dipakai)
8. [Mini Project: Form Register User](#8-mini-project-form-register-user)
9. [Bonus: Server Action di Next.js](#9-bonus-server-action-di-nextjs)
10. [Kesalahan Umum & Cara Hindarinya](#10-kesalahan-umum--cara-hindarinya)

---

## 1. Kenapa Form Itu Susah?

Sekilas, form terlihat simpel: user isi input, klik submit, selesai. Tapi kalau dipikir lebih dalam, ada banyak hal yang harus dihandle:

```
Form yang "benar" harus:
   │
   ├── Validasi input sebelum submit (format email, panjang password, dll.)
   ├── Tampilkan error yang informatif — bukan cuma "Invalid"
   ├── Highlight field yang salah
   ├── Disable tombol submit saat sedang loading
   ├── Handle state: idle → loading → success/error
   ├── Reset form setelah berhasil submit
   ├── Tidak re-render semua field saat satu field berubah (performa)
   └── Accessible: label, aria-describedby, aria-invalid
```

Kalau kamu handle ini semua manual dengan `useState`, kodenya akan jadi 200+ baris untuk form sederhana sekalipun. Dan sangat rawan bug.

Di sinilah **React Hook Form** dan **Zod** masuk.

---

## 2. Controlled vs Uncontrolled Component

Sebelum masuk ke library, penting paham perbedaan ini karena React Hook Form menggunakan pendekatan yang berbeda dari "cara biasa".

### Controlled Component — State di React

```tsx
// Cara yang paling sering diajarkan di tutorial React
"use client";

import { useState, ChangeEvent, FormEvent } from "react";

export default function ControlledForm() {
  // Setiap field punya state sendiri di React
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    console.log({ name, email });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}                // React "kontrol" nilai input
        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
      />
      <input
        value={email}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Masalahnya:** Setiap ketukan tombol → `setState` → seluruh component re-render. Untuk form dengan 10 field, ini berarti 10 field re-render setiap kali user ketik satu karakter.

### Uncontrolled Component — State di DOM

```tsx
"use client";

import { useRef, FormEvent } from "react";

export default function UncontrolledForm() {
  // Tidak ada state React — nilai disimpan di DOM langsung
  const nameRef  = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    // Baca nilai dari DOM saat submit
    console.log({
      name:  nameRef.current?.value,
      email: emailRef.current?.value,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={nameRef}  defaultValue="" />  {/* defaultValue, bukan value */}
      <input ref={emailRef} defaultValue="" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Lebih performant** (tidak re-render saat ketik), tapi validasi dan error displaynya susah dihandle.

### React Hook Form — Best of Both Worlds

React Hook Form menggunakan pendekatan *uncontrolled* di balik layar (tidak ada re-render per keystroke), tapi API-nya senyaman *controlled*. Kamu mendapat performa bagus **dan** kemudahan syntax.

```
Controlled:   setiap ketukan → setState → re-render semua field   ❌ Lambat
Uncontrolled: nilai di DOM → susah validasi real-time             ❌ Kurang nyaman
React Hook Form: nilai di DOM, API React, validasi saat blur/submit ✅ Terbaik
```

---

## 3. React Hook Form: Cara Berpikir Baru

### Setup

```bash
npm install react-hook-form
```

### Konsep Dasar

React Hook Form berputar di satu hook: `useForm`. Dari satu hook ini, kamu dapat semua yang kamu butuhkan:

```tsx
"use client";

import { useForm } from "react-hook-form";

// Tipe untuk semua nilai form
interface LoginFormValues {
  email:    string;
  password: string;
}

export default function LoginForm() {
  const {
    register,       // Daftarkan input ke React Hook Form
    handleSubmit,   // Wrapper onSubmit — validasi dulu, baru panggil callback
    formState: {
      errors,       // Object berisi error per-field
      isSubmitting, // true saat onSubmit sedang berjalan (async)
      isValid,      // true kalau tidak ada error
      isDirty,      // true kalau user sudah mengubah setidaknya satu field
    },
    watch,          // Subscribe ke perubahan nilai field tertentu
    reset,          // Reset form ke nilai awal
    setValue,       // Set nilai field secara programatis
    getValues,      // Baca nilai semua field tanpa trigger re-render
  } = useForm<LoginFormValues>({
    defaultValues: {
      email:    "",
      password: "",
    },
    mode: "onBlur", // Kapan validasi dijalankan: onChange | onBlur | onSubmit | all
  });

  const onSubmit = async (data: LoginFormValues): Promise<void> => {
    // data sudah tervalidasi — tidak akan sampai sini kalau ada error
    // data bertipe LoginFormValues — bukan any
    console.log(data);
  };

  return (
    // handleSubmit menghentikan event default DAN validasi sebelum panggil onSubmit
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          // register menghubungkan input ini ke React Hook Form
          // + aturan validasi bawaan (tanpa Zod)
          {...register("email", {
            required: "Email wajib diisi",
            pattern: {
              value:   /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Format email tidak valid",
            },
          })}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-red-500 text-sm">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register("password", {
            required:  "Password wajib diisi",
            minLength: { value: 8, message: "Password minimal 8 karakter" },
          })}
          aria-invalid={errors.password ? "true" : "false"}
        />
        {errors.password && (
          <p role="alert" className="text-red-500 text-sm">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Loading..." : "Masuk"}
      </button>
    </form>
  );
}
```

### Apa itu `register`?

`register("fieldName")` mengembalikan empat props yang disebar ke input:

```ts
// Yang sebenarnya dikembalikan register("email"):
{
  name:     "email",                    // Nama field untuk identifikasi
  ref:      (element) => { ... },       // Ref ke DOM element
  onChange: (e) => { ... },             // Tracking perubahan (tanpa re-render)
  onBlur:   (e) => { ... },            // Trigger validasi saat blur
}

// Makanya kita pakai spread: {...register("email")}
// Sama seperti menulis:
// <input name="email" ref={...} onChange={...} onBlur={...} />
```

### Mode Validasi

```tsx
useForm({
  mode: "onSubmit",  // Default: validasi hanya saat tombol submit diklik
  mode: "onBlur",    // Validasi saat user meninggalkan field (fokus pindah)
  mode: "onChange",  // Validasi setiap ketukan — re-render lebih sering
  mode: "onTouched", // Validasi onBlur pertama, lalu onChange setelahnya
  mode: "all",       // Kombinasi onBlur dan onChange
});
```

Rekomendasi: **`"onBlur"`** — validasi saat user selesai mengisi field, tidak terlalu agresif seperti `onChange` (tidak langsung error saat baru mulai ketik).

---

## 4. Zod: Validasi Schema dengan TypeScript

### Kenapa Zod dan Bukan Yup / Joi?

Semua library validasi itu bisa dipakai. Tapi Zod punya kelebihan utama: **dia TypeScript-first**. Artinya schema Zod *sekaligus* mendefinisikan TypeScript type kamu — tidak perlu tulis interface dan schema secara terpisah.

```ts
// Dengan Yup (atau manual typing):
interface UserForm {           // Type terpisah
  name:  string;
  email: string;
  age:   number;
}

const schema = yup.object({   // Schema terpisah
  name:  yup.string().required(),
  email: yup.string().email().required(),
  age:   yup.number().min(18).required(),
});
// Masalah: type dan schema bisa berbeda kalau lupa update salah satunya

// Dengan Zod:
const schema = z.object({      // Schema sekaligus type
  name:  z.string(),
  email: z.string().email(),
  age:   z.number().min(18),
});

type UserForm = z.infer<typeof schema>; // Type di-derive otomatis dari schema
// UserForm = { name: string; email: string; age: number }
// Selalu sinkron — tidak mungkin berbeda
```

### Setup Zod

```bash
npm install zod
```

### Sintaks Dasar Zod

```ts
import { z } from "zod";

// ── Tipe primitif ─────────────────────────────────────────────
const stringSchema  = z.string();
const numberSchema  = z.number();
const booleanSchema = z.boolean();
const dateSchema    = z.date();

// ── String validators ─────────────────────────────────────────
const nameSchema = z
  .string()
  .min(2,   "Nama minimal 2 karakter")
  .max(50,  "Nama maksimal 50 karakter")
  .trim()    // Hapus whitespace di awal/akhir sebelum validasi
  .regex(/^[a-zA-Z\s]+$/, "Nama hanya boleh huruf dan spasi");

const emailSchema = z
  .string()
  .email("Format email tidak valid")
  .toLowerCase(); // Normalize ke lowercase

const passwordSchema = z
  .string()
  .min(8,  "Password minimal 8 karakter")
  .max(100, "Password terlalu panjang")
  .regex(/[A-Z]/,     "Harus ada huruf kapital")
  .regex(/[0-9]/,     "Harus ada angka")
  .regex(/[^A-Za-z0-9]/, "Harus ada karakter spesial");

// ── Number validators ─────────────────────────────────────────
const ageSchema = z
  .number({ invalid_type_error: "Usia harus berupa angka" })
  .int("Usia harus bilangan bulat")
  .min(17, "Minimal usia 17 tahun")
  .max(120, "Usia tidak valid");

// Kalau input dari form (selalu string), pakai coerce untuk konversi otomatis
const ageFromInputSchema = z.coerce.number().int().min(17).max(120);

// ── Enum ──────────────────────────────────────────────────────
const roleSchema = z.enum(["admin", "user", "moderator"], {
  errorMap: () => ({ message: "Role tidak valid" }),
});

type Role = z.infer<typeof roleSchema>; // "admin" | "user" | "moderator"

// ── Optional dan Nullable ─────────────────────────────────────
const optionalBioSchema = z.string().max(200).optional(); // string | undefined
const nullablePhoneSchema = z.string().nullable();         // string | null

// ── Object ───────────────────────────────────────────────────
const addressSchema = z.object({
  street:  z.string().min(1, "Alamat wajib diisi"),
  city:    z.string().min(1, "Kota wajib diisi"),
  zipCode: z.string().regex(/^\d{5}$/, "Kode pos harus 5 digit angka"),
});

// ── Array ─────────────────────────────────────────────────────
const tagsSchema = z
  .array(z.string())
  .min(1, "Minimal satu tag")
  .max(5,  "Maksimal 5 tag");
```

### `z.infer` — Derive Type dari Schema

```ts
const loginSchema = z.object({
  email:    z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  remember: z.boolean().default(false),
});

// Type di-derive otomatis — tidak perlu tulis interface terpisah
type LoginFormValues = z.infer<typeof loginSchema>;
// Hasilnya:
// {
//   email:    string;
//   password: string;
//   remember: boolean;
// }
```

### Validasi Lintas-Field dengan `superRefine` / `refine`

```ts
const changePasswordSchema = z
  .object({
    currentPassword:  z.string().min(1, "Password saat ini wajib diisi"),
    newPassword:      z.string().min(8, "Password baru minimal 8 karakter"),
    confirmPassword:  z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine(
    // Fungsi validator: return true kalau valid
    (data) => data.newPassword === data.confirmPassword,
    {
      message: "Konfirmasi password tidak cocok",
      path:    ["confirmPassword"], // Error muncul di field ini
    }
  )
  .refine(
    (data) => data.newPassword !== data.currentPassword,
    {
      message: "Password baru tidak boleh sama dengan password lama",
      path:    ["newPassword"],
    }
  );
```

### Parse vs SafeParse

```ts
const schema = z.object({ name: z.string(), age: z.number() });

// ── parse: Lempar error kalau invalid ─────────────────────────
try {
  const data = schema.parse({ name: "Budi", age: "dua puluh" }); // Throw ZodError
} catch (err) {
  if (err instanceof z.ZodError) {
    console.log(err.errors); // Array of ZodIssue
  }
}

// ── safeParse: Return object { success, data, error } ─────────
const result = schema.safeParse({ name: "Budi", age: "dua puluh" });

if (!result.success) {
  // result.error adalah ZodError
  const fieldErrors = result.error.flatten().fieldErrors;
  console.log(fieldErrors);
  // { age: ["Expected number, received string"] }
} else {
  // result.data sudah tervalidasi dan fully typed
  console.log(result.data.name); // TypeScript tahu ini string
}
```

---

## 5. Integrasi React Hook Form + Zod

Untuk integrasi keduanya, kita butuh satu package tambahan:

```bash
npm install @hookform/resolvers
```

`@hookform/resolvers` adalah jembatan antara React Hook Form dan library validasi (Zod, Yup, Joi, dll.).

### Setup Dasar

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// ── 1. Definisikan schema Zod ──────────────────────────────────
const loginSchema = z.object({
  email:    z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

// ── 2. Derive TypeScript type dari schema ─────────────────────
type LoginFormValues = z.infer<typeof loginSchema>;
// { email: string; password: string }

// ── 3. Gunakan di useForm ─────────────────────────────────────
export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema), // ← Zod sebagai validator
    defaultValues: {
      email:    "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues): Promise<void> => {
    // data dijamin valid sesuai schema Zod
    // data.email bertipe string, data.password bertipe string
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulasi API call
    console.log("Login:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* noValidate: matikan validasi browser bawaan, pakai Zod saja */}

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          aria-invalid={errors.email ? "true" : "false"}
        />
        {errors.email && <p role="alert">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          aria-invalid={errors.password ? "true" : "false"}
        />
        {errors.password && <p role="alert">{errors.password.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}
```

### Mengapa Tidak Perlu Aturan Validasi di `register` Lagi?

```tsx
// ❌ Double validasi — redundan kalau sudah pakai zodResolver
{...register("email", {
  required: "Email wajib diisi",     // Ini tidak dipakai kalau ada resolver
  pattern: { ... },
})}

// ✅ Cukup nama field saja — validasi sudah di Zod schema
{...register("email")}
```

Ketika kamu pakai `zodResolver`, semua validasi dihandle oleh Zod. Aturan di `register` diabaikan.

---

## 6. Error Messages yang User-Friendly

### Prinsip Error Message yang Baik

| ❌ Buruk | ✅ Baik |
|---|---|
| "Invalid" | "Format email tidak valid. Contoh: nama@email.com" |
| "Required" | "Nama lengkap wajib diisi" |
| "Too short" | "Password minimal 8 karakter (saat ini: 5 karakter)" |
| "Pattern mismatch" | "Nomor telepon hanya boleh angka, diawali 08" |
| "Error on field 3" | Highlight field yang salah dengan warna merah |

### Komponen `FieldError` yang Reusable

```tsx
// components/ui/FieldError.tsx
interface FieldErrorProps {
  message?: string;
  id?:      string; // Untuk aria-describedby
}

export function FieldError({ message, id }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="mt-1 text-sm text-red-600 flex items-center gap-1"
    >
      {/* Icon error */}
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </p>
  );
}
```

### Komponen `FormField` yang Reusable

```tsx
// components/ui/FormField.tsx
import { forwardRef, InputHTMLAttributes } from "react";
import { FieldError } from "./FieldError";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label:       string;
  error?:      string;
  helpText?:   string;   // Teks bantuan di bawah field (sebelum error)
  required?:   boolean;
}

// forwardRef karena React Hook Form butuh ref ke DOM element
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField({ label, error, helpText, required, id, ...inputProps }, ref) {
    const fieldId   = id ?? label.toLowerCase().replace(/\s+/g, "-");
    const errorId   = `${fieldId}-error`;
    const helpId    = `${fieldId}-help`;

    return (
      <div className="space-y-1">
        {/* Label */}
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-label="wajib diisi">*</span>
          )}
        </label>

        {/* Input */}
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={[
            error   ? errorId : null,
            helpText ? helpId  : null,
          ].filter(Boolean).join(" ") || undefined}
          className={`
            w-full px-3 py-2 border rounded-lg text-sm
            focus:outline-none focus:ring-2 transition-colors
            ${error
              ? "border-red-400 focus:ring-red-300 bg-red-50"
              : "border-gray-300 focus:ring-blue-300 focus:border-blue-400"
            }
          `}
          {...inputProps}
        />

        {/* Help text */}
        {helpText && !error && (
          <p id={helpId} className="text-xs text-gray-500">{helpText}</p>
        )}

        {/* Error message */}
        <FieldError id={errorId} message={error} />
      </div>
    );
  }
);
```

### Penggunaan `FormField` dengan React Hook Form

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/components/ui/FormField";

const schema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  email:    z.string().email("Format email tidak valid"),
});

type FormValues = z.infer<typeof schema>;

export default function ExampleForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  return (
    <form onSubmit={handleSubmit(console.log)} noValidate>
      <FormField
        label="Username"
        required
        error={errors.username?.message}
        helpText="Hanya huruf, angka, dan underscore"
        {...register("username")}
      />
      <FormField
        label="Email"
        type="email"
        required
        error={errors.email?.message}
        {...register("email")}
      />
    </form>
  );
}
```

### Password Strength Indicator

```tsx
// components/PasswordStrength.tsx
"use client";

interface PasswordStrengthProps {
  password: string;
}

interface StrengthResult {
  score:   0 | 1 | 2 | 3 | 4;
  label:   string;
  color:   string;
  checks:  { label: string; passed: boolean }[];
}

function getPasswordStrength(password: string): StrengthResult {
  const checks = [
    { label: "Minimal 8 karakter",       passed: password.length >= 8      },
    { label: "Mengandung huruf kapital",  passed: /[A-Z]/.test(password)    },
    { label: "Mengandung angka",          passed: /[0-9]/.test(password)    },
    { label: "Mengandung karakter spesial", passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const passed = checks.filter(c => c.passed).length as 0 | 1 | 2 | 3 | 4;

  const labels: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: "—",
    1: "Lemah",
    2: "Cukup",
    3: "Kuat",
    4: "Sangat Kuat",
  };

  const colors: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: "bg-gray-200",
    1: "bg-red-400",
    2: "bg-yellow-400",
    3: "bg-blue-400",
    4: "bg-green-500",
  };

  return { score: passed, label: labels[passed], color: colors[passed], checks };
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const { score, label, color, checks } = getPasswordStrength(password);

  return (
    <div className="mt-2 space-y-2">
      {/* Bar strength indicator */}
      <div className="flex gap-1" aria-label={`Kekuatan password: ${label}`}>
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              level <= score ? color : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Label */}
      <p className="text-xs text-gray-500">
        Kekuatan: <span className="font-medium">{label}</span>
      </p>

      {/* Checklist */}
      <ul className="space-y-0.5">
        {checks.map(({ label: checkLabel, passed }) => (
          <li
            key={checkLabel}
            className={`text-xs flex items-center gap-1.5 ${
              passed ? "text-green-600" : "text-gray-400"
            }`}
          >
            <span aria-hidden="true">{passed ? "✓" : "○"}</span>
            {checkLabel}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 7. Pola Form yang Sering Dipakai

### 7.1 `watch` — Reaktif ke Nilai Field Lain

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  hasCompany: z.boolean(),
  companyName: z.string().optional(),
}).refine(
  data => !data.hasCompany || (data.companyName && data.companyName.length > 0),
  { message: "Nama perusahaan wajib diisi", path: ["companyName"] }
);

type FormValues = z.infer<typeof schema>;

export default function ConditionalForm() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { hasCompany: false, companyName: "" },
  });

  // watch("fieldName") → nilai terkini field, trigger re-render saat berubah
  const hasCompany = watch("hasCompany");

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <label>
        <input type="checkbox" {...register("hasCompany")} />
        Saya mewakili perusahaan
      </label>

      {/* Conditional field — hanya tampil kalau hasCompany = true */}
      {hasCompany && (
        <div>
          <label>Nama Perusahaan</label>
          <input {...register("companyName")} />
          {errors.companyName && <p>{errors.companyName.message}</p>}
        </div>
      )}
    </form>
  );
}
```

### 7.2 `setValue` — Set Nilai Secara Programatis

```tsx
"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import type { User } from "@/types";

// Form edit profile — perlu prefill dengan data user yang ada
export default function EditProfileForm({ user }: { user: User }) {
  const { register, handleSubmit, setValue } = useForm<User>();

  // Prefill form dengan data user yang ada
  useEffect(() => {
    setValue("name",  user.name);
    setValue("email", user.email);
    setValue("bio",   user.bio ?? "");
  }, [user, setValue]);

  // Atau pakai shorthand:
  // useEffect(() => {
  //   reset(user); // reset() juga bisa set semua nilai sekaligus
  // }, [user, reset]);

  return <form onSubmit={handleSubmit(console.log)}>{/* fields */}</form>;
}
```

### 7.3 `reset` — Reset Setelah Submit Berhasil

```tsx
const {
  register,
  handleSubmit,
  reset,
  formState: { isSubmitSuccessful },
} = useForm<FormValues>();

const onSubmit = async (data: FormValues): Promise<void> => {
  await submitToAPI(data);
  // Reset ke defaultValues setelah berhasil submit
  reset();
  // Atau reset ke nilai baru:
  // reset({ email: "", password: "" });
};

// Atau pakai useEffect untuk react terhadap isSubmitSuccessful
useEffect(() => {
  if (isSubmitSuccessful) {
    reset();
  }
}, [isSubmitSuccessful, reset]);
```

### 7.4 `getValues` — Baca Nilai Tanpa Re-render

```tsx
const { register, handleSubmit, getValues } = useForm<FormValues>();

// getValues() tidak trigger re-render — cocok untuk operasi yang tidak butuh reaktivitas
const handleSaveDraft = (): void => {
  const currentValues = getValues(); // Baca semua nilai saat ini
  localStorage.setItem("form-draft", JSON.stringify(currentValues));
};
```

### 7.5 Form Array (`useFieldArray`)

```tsx
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  teamName: z.string().min(1),
  members: z.array(z.object({
    name:  z.string().min(1, "Nama anggota wajib diisi"),
    email: z.string().email("Format email tidak valid"),
  })).min(1, "Tim harus punya minimal 1 anggota"),
});

type FormValues = z.infer<typeof schema>;

export default function TeamForm() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      teamName: "",
      members: [{ name: "", email: "" }], // Mulai dengan 1 member
    },
  });

  // useFieldArray mengelola array field secara dinamis
  const { fields, append, remove } = useFieldArray({
    control,
    name: "members",
  });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <input {...register("teamName")} placeholder="Nama tim" />

      {fields.map((field, index) => (
        <div key={field.id}> {/* Gunakan field.id, bukan index */}
          <input
            {...register(`members.${index}.name`)}
            placeholder="Nama anggota"
          />
          {errors.members?.[index]?.name && (
            <p>{errors.members[index].name.message}</p>
          )}

          <input
            {...register(`members.${index}.email`)}
            placeholder="Email anggota"
          />

          {fields.length > 1 && ( // Jangan boleh hapus anggota terakhir
            <button type="button" onClick={() => remove(index)}>
              Hapus
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ name: "", email: "" })}
      >
        + Tambah Anggota
      </button>

      <button type="submit">Simpan Tim</button>
    </form>
  );
}
```

---

## 8. Mini Project: Form Register User

Kita bangun form registrasi lengkap dengan:
- Validasi Zod yang ketat
- Password dengan indicator kekuatan
- Konfirmasi password dengan validasi lintas-field
- Checkbox syarat & ketentuan
- Loading state + success state
- Error handling dari "API"
- Reusable components

### Struktur File

```
app/register/
  └── page.tsx

components/
  ├── RegisterForm/
  │   ├── RegisterForm.tsx     ← Komponen utama
  │   └── RegisterForm.module.css
  └── ui/
      ├── FormField.tsx        ← Dari section 6 di atas
      ├── FieldError.tsx       ← Dari section 6 di atas
      └── PasswordStrength.tsx ← Dari section 6 di atas

lib/
  ├── schemas/
  │   └── register.schema.ts  ← Zod schema
  └── actions/
      └── auth.ts             ← Simulasi API call
```

### Schema Zod

```ts
// lib/schemas/register.schema.ts
import { z } from "zod";

// Schema terpisah untuk reusability
// Bisa dipakai juga di Server Action untuk re-validasi di server
export const registerSchema = z
  .object({
    // Nama lengkap
    fullName: z
      .string()
      .min(1,  "Nama lengkap wajib diisi")
      .min(2,  "Nama minimal 2 karakter")
      .max(50, "Nama maksimal 50 karakter")
      .trim()
      .regex(
        /^[a-zA-ZÀ-ÿ\s'-]+$/,
        "Nama hanya boleh mengandung huruf, spasi, tanda hubung, dan apostrof"
      ),

    // Email
    email: z
      .string()
      .min(1, "Email wajib diisi")
      .email("Format email tidak valid. Contoh: nama@email.com")
      .max(100, "Email terlalu panjang")
      .toLowerCase(),

    // Password
    password: z
      .string()
      .min(1, "Password wajib diisi")
      .min(8,  "Password minimal 8 karakter")
      .max(100, "Password terlalu panjang")
      .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf kapital")
      .regex(/[0-9]/, "Password harus mengandung minimal 1 angka")
      .regex(/[^A-Za-z0-9]/, "Password harus mengandung minimal 1 karakter spesial (!@#$%...)"),

    // Konfirmasi password
    confirmPassword: z
      .string()
      .min(1, "Konfirmasi password wajib diisi"),

    // Nomor telepon (opsional)
    phone: z
      .string()
      .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Format nomor telepon tidak valid. Contoh: 081234567890")
      .optional()
      .or(z.literal("")), // Boleh kosong

    // Persetujuan syarat
    agreeToTerms: z
      .boolean()
      .refine(val => val === true, {
        message: "Kamu harus menyetujui syarat dan ketentuan",
      }),
  })
  // Validasi lintas-field: password harus sama dengan confirmPassword
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Konfirmasi password tidak cocok dengan password",
      path:    ["confirmPassword"], // Error muncul di field confirmPassword
    }
  );

// Type di-derive dari schema — satu sumber kebenaran
export type RegisterFormValues = z.infer<typeof registerSchema>;
```

### Simulasi API Call

```ts
// lib/actions/auth.ts

import type { RegisterFormValues } from "@/lib/schemas/register.schema";

export interface RegisterResult {
  success: boolean;
  message: string;
  // Kalau error dari server yang relate ke field tertentu
  fieldError?: {
    field: keyof RegisterFormValues;
    message: string;
  };
}

// Simulasi API — di produksi ini akan fetch ke backend atau Server Action
export async function registerUser(
  data: Omit<RegisterFormValues, "confirmPassword" | "agreeToTerms">
): Promise<RegisterResult> {
  // Simulasi delay jaringan
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Simulasi email sudah terdaftar
  if (data.email === "exist@email.com") {
    return {
      success:    false,
      message:    "Email sudah terdaftar",
      fieldError: { field: "email", message: "Email ini sudah digunakan. Coba login atau gunakan email lain." },
    };
  }

  // Simulasi server error (1 dari 10 request)
  if (Math.random() < 0.1) {
    return {
      success: false,
      message: "Terjadi kesalahan pada server. Silakan coba lagi.",
    };
  }

  return {
    success: true,
    message: "Akun berhasil dibuat! Cek email kamu untuk verifikasi.",
  };
}
```

### Komponen RegisterForm

```tsx
// components/RegisterForm/RegisterForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { registerSchema, type RegisterFormValues } from "@/lib/schemas/register.schema";
import { registerUser } from "@/lib/actions/auth";
import { FormField } from "@/components/ui/FormField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import styles from "./RegisterForm.module.css";

// State setelah submit
type SubmitState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error";   message: string };

export default function RegisterForm() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError,     // Set error dari luar (misal: server error per-field)
    reset,
    formState: {
      errors,
      isSubmitting,
      isSubmitSuccessful,
    },
  } = useForm<RegisterFormValues>({
    resolver:      zodResolver(registerSchema),
    defaultValues: {
      fullName:        "",
      email:           "",
      password:        "",
      confirmPassword: "",
      phone:           "",
      agreeToTerms:    false,
    },
    mode: "onBlur", // Validasi saat user meninggalkan field
  });

  // Watch password untuk password strength indicator
  const passwordValue = watch("password");

  const onSubmit = async (data: RegisterFormValues): Promise<void> => {
    setSubmitState({ status: "idle" });

    // Kirim ke "API" — tanpa confirmPassword dan agreeToTerms
    const { confirmPassword: _cp, agreeToTerms: _at, ...apiData } = data;

    const result = await registerUser(apiData);

    if (!result.success) {
      // Kalau ada error per-field dari server, set error di field yang sesuai
      if (result.fieldError) {
        setError(result.fieldError.field, {
          type:    "server",
          message: result.fieldError.message,
        });
        // Fokus ke field yang error (opsional tapi UX bagus)
        return;
      }

      // Error umum (server error, dll.)
      setSubmitState({ status: "error", message: result.message });
      return;
    }

    setSubmitState({ status: "success", message: result.message });
    reset(); // Reset form setelah berhasil
  };

  // Tampilan success state — form diganti dengan pesan sukses
  if (isSubmitSuccessful && submitState.status === "success") {
    return (
      <div className={styles.successCard}>
        <span className={styles.successIcon} aria-hidden="true">✅</span>
        <h2 className={styles.successTitle}>Pendaftaran Berhasil!</h2>
        <p className={styles.successMessage}>{submitState.message}</p>
        <Link href="/login" className={styles.loginLink}>
          Masuk ke akun →
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1 className={styles.title}>Buat Akun Baru</h1>
        <p className={styles.subtitle}>
          Sudah punya akun?{" "}
          <Link href="/login" className={styles.link}>
            Masuk di sini
          </Link>
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className={styles.form}
        aria-label="Form pendaftaran akun"
      >
        {/* ── Error global dari server ─────────────────────── */}
        {submitState.status === "error" && (
          <div className={styles.errorBanner} role="alert">
            <span aria-hidden="true">⚠️</span>
            <p>{submitState.message}</p>
          </div>
        )}

        {/* ── Nama Lengkap ──────────────────────────────────── */}
        <FormField
          label="Nama Lengkap"
          required
          autoComplete="name"
          placeholder="Contoh: Budi Santoso"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        {/* ── Email ─────────────────────────────────────────── */}
        <FormField
          label="Alamat Email"
          type="email"
          required
          autoComplete="email"
          placeholder="nama@email.com"
          error={errors.email?.message}
          helpText="Kami akan kirim link verifikasi ke email ini"
          {...register("email")}
        />

        {/* ── Password ──────────────────────────────────────── */}
        <div className={styles.fieldWrapper}>
          <FormField
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            error={errors.password?.message}
            {...register("password")}
          />

          {/* Toggle visibility password */}
          <button
            type="button"
            className={styles.togglePassword}
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>

          {/* Indicator kekuatan password */}
          <PasswordStrength password={passwordValue} />
        </div>

        {/* ── Konfirmasi Password ───────────────────────────── */}
        <FormField
          label="Konfirmasi Password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          placeholder="Ulangi password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {/* ── Nomor Telepon (Opsional) ──────────────────────── */}
        <FormField
          label="Nomor Telepon"
          type="tel"
          autoComplete="tel"
          placeholder="081234567890 (opsional)"
          error={errors.phone?.message}
          helpText="Digunakan untuk verifikasi 2 langkah (opsional)"
          {...register("phone")}
        />

        {/* ── Persetujuan Syarat ──────────────────────────────── */}
        <div className={styles.checkboxWrapper}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              {...register("agreeToTerms")}
              aria-invalid={errors.agreeToTerms ? "true" : "false"}
              aria-describedby={errors.agreeToTerms ? "terms-error" : undefined}
            />
            <span className={styles.checkboxText}>
              Saya setuju dengan{" "}
              <Link href="/terms" className={styles.link} target="_blank">
                Syarat & Ketentuan
              </Link>
              {" "}dan{" "}
              <Link href="/privacy" className={styles.link} target="_blank">
                Kebijakan Privasi
              </Link>
            </span>
          </label>
          {errors.agreeToTerms && (
            <p
              id="terms-error"
              role="alert"
              className={styles.checkboxError}
            >
              {errors.agreeToTerms.message}
            </p>
          )}
        </div>

        {/* ── Submit Button ─────────────────────────────────── */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={styles.submitButton}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <span className={styles.loadingContent}>
              <span className={styles.spinner} aria-hidden="true" />
              Mendaftarkan akun...
            </span>
          ) : (
            "Daftar Sekarang"
          )}
        </button>
      </form>
    </div>
  );
}
```

### CSS Modules untuk RegisterForm

```css
/* components/RegisterForm/RegisterForm.module.css */
.wrapper {
  max-width: 480px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 0.875rem;
  color: #64748b;
}

.link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.link:hover {
  text-decoration: underline;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Error banner untuk error dari server */
.errorBanner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #fef2f2;
  border: 1.5px solid #fecaca;
  border-radius: 10px;
  color: #dc2626;
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Wrapper untuk password field dengan toggle button */
.fieldWrapper {
  position: relative;
}

.togglePassword {
  position: absolute;
  right: 0;
  top: 0;
  padding: 0.25rem 0.5rem;
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #64748b;
  line-height: 1.75rem; /* Sejajar dengan label */
}

/* Checkbox area */
.checkboxWrapper {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.checkboxLabel {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  cursor: pointer;
}

.checkbox {
  width: 1rem;
  height: 1rem;
  margin-top: 0.125rem;
  accent-color: #3b82f6;
  flex-shrink: 0;
}

.checkboxText {
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.5;
}

.checkboxError {
  font-size: 0.8rem;
  color: #dc2626;
  margin-left: 1.625rem; /* Sejajar dengan teks checkbox */
}

/* Submit button */
.submitButton {
  width: 100%;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  transition: background 0.15s, transform 0.1s, opacity 0.15s;
  margin-top: 0.5rem;
}

.submitButton:hover:not(:disabled) {
  background: #2563eb;
}

.submitButton:active:not(:disabled) {
  transform: scale(0.99);
}

.submitButton:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loadingContent {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Success card */
.successCard {
  max-width: 400px;
  margin: 4rem auto;
  text-align: center;
  padding: 2.5rem 2rem;
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.successIcon {
  font-size: 3rem;
}

.successTitle {
  font-size: 1.25rem;
  font-weight: 700;
  color: #15803d;
}

.successMessage {
  font-size: 0.9rem;
  color: #166534;
  line-height: 1.5;
}

.loginLink {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 0.625rem 1.5rem;
  background: #16a34a;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background 0.15s;
}

.loginLink:hover {
  background: #15803d;
}
```

### Halaman Register

```tsx
// app/register/page.tsx
import type { Metadata } from "next";
import RegisterForm from "@/components/RegisterForm/RegisterForm";

export const metadata: Metadata = {
  title:       "Daftar",
  description: "Buat akun baru untuk mulai menggunakan layanan kami.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <RegisterForm />
    </div>
  );
}
```

### Cara Test

```bash
npm run dev
# Buka http://localhost:3000/register
```

Coba skenario ini:
- Submit form kosong → semua field merah dengan pesan error
- Isi password lemah → lihat indicator kekuatan
- Isi password dan konfirmasi yang berbeda → error di confirmPassword
- Gunakan `exist@email.com` → lihat server-side field error
- Isi semua form dengan benar → lihat success state

---

## 9. Bonus: Server Action di Next.js

Di Next.js 14+, kamu bisa handle form submission langsung di server tanpa membuat API route terpisah. Data dikirim langsung ke fungsi server — lebih sederhana dan lebih aman.

### Form dengan Server Action (Tanpa React Hook Form)

```tsx
// app/contact/page.tsx
import { z } from "zod";
import { redirect } from "next/navigation";

const contactSchema = z.object({
  name:    z.string().min(1),
  email:   z.string().email(),
  message: z.string().min(10),
});

// Server Action — tandai dengan "use server"
// Fungsi ini berjalan di server, tidak pernah terekspos ke browser
async function submitContact(formData: FormData): Promise<void> {
  "use server";

  // Parse dan validasi dengan Zod
  const result = contactSchema.safeParse({
    name:    formData.get("name"),
    email:   formData.get("email"),
    message: formData.get("message"),
  });

  if (!result.success) {
    // Di produksi: lempar error atau return state
    throw new Error("Data tidak valid");
  }

  // Simpan ke database, kirim email, dll.
  // await db.contacts.create({ data: result.data });
  // await sendEmail(result.data);

  console.log("Contact submitted:", result.data);

  // Redirect setelah berhasil
  redirect("/contact/success");
}

export default function ContactPage() {
  return (
    <form action={submitContact}> {/* action langsung pakai server action */}
      <input   name="name"    placeholder="Nama"    required />
      <input   name="email"   type="email"          required />
      <textarea name="message" placeholder="Pesan"  required />
      <button  type="submit">Kirim</button>
    </form>
  );
}
```

### Server Action + React Hook Form (Progressive Enhancement)

Untuk UX terbaik, gabungkan React Hook Form (validasi client-side cepat) dengan Server Action (validasi server-side aman):

```tsx
// components/ContactForm/ContactForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useActionState } from "react"; // React 19 / Next.js 15
import { z } from "zod";
import { submitContactAction } from "@/lib/actions/contact";

const contactSchema = z.object({
  name:    z.string().min(2, "Nama minimal 2 karakter"),
  email:   z.string().email("Format email tidak valid"),
  message: z.string().min(10, "Pesan minimal 10 karakter"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    mode:     "onBlur",
  });

  // useActionState untuk handle state dari Server Action
  const [actionState, formAction, isPending] = useActionState(
    submitContactAction,
    { success: false, message: "" }
  );

  // handleSubmit validasi dulu di client, baru submit ke server
  const onSubmit = (data: ContactFormValues): void => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formAction(formData);
  };

  if (actionState.success) {
    return <p>✅ {actionState.message}</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {actionState.message && !actionState.success && (
        <p className="text-red-500">{actionState.message}</p>
      )}

      <div>
        <input {...register("name")} placeholder="Nama" />
        {errors.name && <p>{errors.name.message}</p>}
      </div>

      <div>
        <input {...register("email")} type="email" placeholder="Email" />
        {errors.email && <p>{errors.email.message}</p>}
      </div>

      <div>
        <textarea {...register("message")} placeholder="Pesan" />
        {errors.message && <p>{errors.message.message}</p>}
      </div>

      <button type="submit" disabled={isPending || !isValid}>
        {isPending ? "Mengirim..." : "Kirim Pesan"}
      </button>
    </form>
  );
}
```

```ts
// lib/actions/contact.ts
"use server";

import { z } from "zod";
import { contactSchema } from "@/lib/schemas/contact.schema";

interface ActionState {
  success: boolean;
  message: string;
}

export async function submitContactAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // Re-validasi di server (client-side validation bisa di-bypass!)
  const result = contactSchema.safeParse({
    name:    formData.get("name"),
    email:   formData.get("email"),
    message: formData.get("message"),
  });

  if (!result.success) {
    return { success: false, message: "Data tidak valid. Periksa kembali formulir." };
  }

  try {
    // Simpan ke database
    // await db.contacts.create({ data: result.data });

    return { success: true, message: "Pesan berhasil dikirim! Kami akan balas dalam 1x24 jam." };
  } catch {
    return { success: false, message: "Terjadi kesalahan. Silakan coba lagi." };
  }
}
```

> **Kenapa Re-validasi di Server?**
> Client-side validation bisa di-bypass — user tinggal buka DevTools dan kirim FormData langsung ke Server Action tanpa lewat form. **Selalu validasi di server** sebagai last line of defense.

---

## 10. Kesalahan Umum & Cara Hindarinya

### ❌ Tidak Pakai `noValidate` di Form

```tsx
// ❌ Browser akan validasi sendiri (HTML5 validation)
// Dua sistem validasi jalan bersamaan → UI tidak konsisten
<form onSubmit={handleSubmit(onSubmit)}>

// ✅ Matikan validasi browser, serahkan semuanya ke Zod/RHF
<form onSubmit={handleSubmit(onSubmit)} noValidate>
```

---

### ❌ Lupa `react-hook-form` perlu "use client"

```tsx
// ❌ Ini akan error — useForm adalah hook, tidak bisa di Server Component
// app/register/page.tsx (tanpa "use client")
import { useForm } from "react-hook-form"; // Error!

// ✅ Pisahkan form ke Client Component terpisah
// app/register/page.tsx — Server Component
import RegisterForm from "@/components/RegisterForm/RegisterForm"; // "use client" ada di sini

export default function RegisterPage() {
  return <RegisterForm />;
}
```

---

### ❌ Menaruh Schema Zod di Dalam Component

```tsx
// ❌ Schema dibuat ulang setiap render — tidak efisien
function RegisterForm() {
  const schema = z.object({ ... }); // ← Ini dijalankan setiap render!
  const { register } = useForm({ resolver: zodResolver(schema) });
}

// ✅ Definisikan schema di luar component (module level)
const schema = z.object({ ... }); // ← Dibuat sekali saja

function RegisterForm() {
  const { register } = useForm({ resolver: zodResolver(schema) });
}
```

---

### ❌ Tidak Beri Error Message Custom di Zod

```ts
// ❌ Pesan error default Zod berbahasa Inggris dan teknis
const schema = z.object({
  email: z.string().email(), // "Invalid email" — tidak informatif
  age:   z.number().min(18), // "Number must be greater than or equal to 18"
});

// ✅ Selalu berikan pesan custom dalam bahasa yang user paham
const schema = z.object({
  email: z.string().email("Format email tidak valid. Contoh: nama@email.com"),
  age:   z.number().min(18, "Usia minimal 18 tahun untuk mendaftar"),
});
```

---

### ❌ Validasi Lintas-Field Salah Tempat untuk Error Display

```ts
// ❌ Error tidak muncul di field yang tepat
const schema = z
  .object({
    password:        z.string(),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    // Tidak ada path → error muncul di root object, bukan di field
  });

// ✅ Tentukan path ke field yang seharusnya menampilkan error
const schema = z
  .object({
    password:        z.string(),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path:    ["confirmPassword"], // ← Error muncul di sini
  });
```

---

### ❌ Tidak Handle Server-Side Field Error

```tsx
// ❌ Server bilang email sudah ada, tapi error cuma ditampilkan sebagai banner
const onSubmit = async (data: FormValues): Promise<void> => {
  const result = await registerUser(data);
  if (!result.success) {
    setErrorMessage(result.message); // Semua error jadi generic banner
  }
};

// ✅ Pakai setError() untuk error yang spesifik ke field
const onSubmit = async (data: FormValues): Promise<void> => {
  const result = await registerUser(data);
  if (!result.success) {
    if (result.fieldError) {
      // Set error langsung di field yang bermasalah
      setError(result.fieldError.field, {
        type:    "server",
        message: result.fieldError.message,
      });
    } else {
      setGlobalError(result.message);
    }
  }
};
```

---

### Ringkasan Pattern

```
Form baru?
    │
    ├── 1. Definisikan schema Zod (di luar component)
    │         └── z.object({ field: z.string().min(1, "pesan error") })
    │
    ├── 2. Derive type dengan z.infer<typeof schema>
    │
    ├── 3. Setup useForm<Type>({ resolver: zodResolver(schema) })
    │
    ├── 4. Spread {...register("fieldName")} ke setiap input
    │
    ├── 5. Tampilkan errors.fieldName?.message di bawah setiap input
    │
    ├── 6. handleSubmit(onSubmit) di form onSubmit
    │
    ├── 7. Di onSubmit: submit ke API/Server Action
    │         ├── Success → reset() & tampilkan success state
    │         └── Field error → setError("field", { message })
    │
    └── 8. Tambah noValidate ke <form>
```

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + React Hook Form + Zod*
