# TypeScript Basics untuk React Developer Pemula

> **Gaya belajar:** Santai tapi serius. Kita bahas dari dasar, step by step, kayak lagi pair programming bareng senior dev.

---

## Daftar Isi

1. [Kenapa TypeScript?](#1-kenapa-typescript)
2. [Types Dasar](#2-types-dasar)
3. [Interface & Type Alias](#3-interface--type-alias)
4. [Type vs Interface — Kapan Pakai yang Mana?](#4-type-vs-interface--kapan-pakai-yang-mana)
5. [Union Types & Optional Properties](#5-union-types--optional-properties)
6. [Typing di Function](#6-typing-di-function)
7. [Generic Types Sederhana](#7-generic-types-sederhana)
8. [Common Mistakes Pemula](#8-common-mistakes-pemula)
9. [Mini Project: User Profile Validator](#9-mini-project-user-profile-validator)

---

## 1. Kenapa TypeScript?

Bayangin kamu lagi masak. JavaScript itu kayak resep yang bilang _"tambahkan bahan secukupnya"_ — bebas, tapi rawan salah. TypeScript itu resep yang bilang _"tambahkan 200ml susu, 2 butir telur"_ — lebih ketat, tapi hasilnya lebih predictable.

```js
// JavaScript — ini valid, tapi bahaya
function greet(name) {
  return "Halo, " + name.toUpperCase();
}

greet(123); // Runtime error! 123 tidak punya .toUpperCase()
```

```ts
// TypeScript — error terdeteksi SEBELUM running
function greet(name: string): string {
  return "Halo, " + name.toUpperCase();
}

greet(123); // ❌ Error: Argument of type 'number' is not assignable to parameter of type 'string'
```

**Intinya:** TypeScript bukan musuh, dia itu teman yang jujur. Dia bilang kamu salah di editor, bukan di production saat user lagi pakai app kamu.

---

## 2. Types Dasar

### 2.1 Primitive Types

Analogi: ini kayak jenis-jenis bahan makanan. Tepung ya tepung, gula ya gula, jangan ditukar.

```ts
// String — untuk teks
let username: string = "budi_dev";
let greeting: string = `Halo, ${username}`;

// Number — untuk angka (integer & float jadi satu)
let age: number = 25;
let price: number = 49.99;
let score: number = -10; // negative juga bisa

// Boolean — true atau false, titik
let isLoggedIn: boolean = true;
let hasSubscription: boolean = false;

// Null & Undefined — eksplisit "tidak ada nilai"
let nickname: null = null;
let middleName: undefined = undefined;
```

> **Catatan:** Di TypeScript, `number` mencakup semua jenis angka. Tidak ada `int` atau `float` terpisah seperti di bahasa lain.

---

### 2.2 Array

```ts
// Cara 1: pakai kurung siku
let fruits: string[] = ["apel", "mangga", "jeruk"];
let scores: number[] = [90, 85, 78];
let flags: boolean[] = [true, false, true];

// Cara 2: pakai generic Array<T> (sama persis, tinggal selera)
let fruits2: Array<string> = ["apel", "mangga"];
let scores2: Array<number> = [90, 85];

// Array of objects
let users: { id: number; name: string }[] = [
  { id: 1, name: "Budi" },
  { id: 2, name: "Sari" },
];
```

```ts
// ❌ Ini error
let names: string[] = ["Budi", 42, true]; // Error: Type 'number' is not assignable to type 'string'

// ✅ Kalau mau campur, gunakan union type (dibahas nanti)
let mixed: (string | number)[] = ["Budi", 42];
```

---

### 2.3 Object

```ts
// Inline object type
let user: { id: number; name: string; email: string } = {
  id: 1,
  name: "Budi Santoso",
  email: "budi@example.com",
};

// Kalau object-nya besar, inline jadi ribet. Makanya ada Interface & Type Alias.
```

---

## 3. Interface & Type Alias

Daripada nulis inline object type terus-terusan, kita bungkus jadi satu nama yang bisa dipakai ulang.

### 3.1 Interface

Analogi: Interface itu kayak **blueprint** atau **kontrak**. Siapapun yang pakai blueprint ini harus punya semua yang tercantum di dalamnya.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Sekarang kita bisa pakai "User" sebagai tipe
const newUser: User = {
  id: 1,
  name: "Budi Santoso",
  email: "budi@example.com",
  age: 25,
};

// ❌ Ini error — property 'age' missing
const incompleteUser: User = {
  id: 2,
  name: "Sari",
  email: "sari@example.com",
  // age tidak ada → Error!
};
```

---

### 3.2 Type Alias

```ts
type Product = {
  id: number;
  name: string;
  price: number;
  inStock: boolean;
};

const laptop: Product = {
  id: 101,
  name: "Laptop Gaming",
  price: 15000000,
  inStock: true,
};
```

Sekilas keliatan sama banget sama Interface, kan? Nah ini yang sering bikin bingung.

---

## 4. Type vs Interface — Kapan Pakai yang Mana?

Ini pertanyaan klasik yang hampir semua pemula tanyain. Jawabannya: **hampir sama, tapi ada bedanya**.

### Perbedaan yang Paling Penting

#### Interface bisa di-`extend` (diwarisi)

```ts
interface Animal {
  name: string;
  age: number;
}

// Dog mewarisi semua property dari Animal, lalu tambah yang baru
interface Dog extends Animal {
  breed: string;
}

const myDog: Dog = {
  name: "Buddy",
  age: 3,
  breed: "Labrador", // property tambahan dari Dog
};
```

#### Type bisa melakukan hal yang sama dengan `&` (intersection)

```ts
type Animal = {
  name: string;
  age: number;
};

type Dog = Animal & {
  breed: string;
};

const myDog: Dog = {
  name: "Buddy",
  age: 3,
  breed: "Labrador",
};
```

#### Interface bisa "declaration merging" — Type tidak bisa

```ts
// Interface bisa didefinisikan dua kali, TypeScript akan merge-nya
interface Config {
  apiUrl: string;
}

interface Config {
  timeout: number;
}

// Hasil akhirnya Config punya keduanya
const config: Config = {
  apiUrl: "https://api.example.com",
  timeout: 3000,
};

// ❌ Type tidak bisa begini — error: Duplicate identifier 'Config2'
type Config2 = { apiUrl: string };
type Config2 = { timeout: number }; // Error!
```

#### Type bisa dipakai untuk Union Types

```ts
// Ini bisa dengan Type...
type Status = "active" | "inactive" | "banned";
type ID = string | number;

// ❌ ...tapi Interface tidak bisa untuk ini
// interface Status = "active" | "inactive"; // Syntax error!
```

---

### Panduan Singkat: Pilih Mana?

| Situasi | Gunakan |
|---|---|
| Mendefinisikan **shape of object** (data model, props, API response) | `interface` |
| Membuat **union type** atau **intersection type** | `type` |
| Butuh **extends** atau pewarisan antar object type | `interface` |
| Type yang kompleks, kombinasi beberapa tipe | `type` |
| Tidak yakin? | `interface` (konvensi umum di React) |

> **Saran senior dev:** Di React, gunakan `interface` untuk props dan data model. Gunakan `type` untuk union, literal types, dan kombinasi kompleks. Konsistensi lebih penting dari pilihan mana yang "benar".

---

## 5. Union Types & Optional Properties

### 5.1 Union Types

Analogi: "Boleh ini **atau** itu." Kayak formulir yang bilang "isi nomor HP atau email".

```ts
// Nilai bisa string ATAU number
type ID = string | number;

let userId: ID = 123;     // ✅ valid
userId = "user_abc";      // ✅ juga valid
userId = true;            // ❌ Error: boolean tidak termasuk

// Status dengan literal union
type UserStatus = "active" | "inactive" | "suspended";

let status: UserStatus = "active";   // ✅
status = "inactive";                  // ✅
status = "banned";                    // ❌ Error: "banned" bukan bagian dari union

// Union dengan null (sangat umum di TypeScript)
type MaybeString = string | null;

let nickname: MaybeString = "budikeren"; // ✅
nickname = null;                          // ✅ — user belum set nickname-nya
```

```ts
// Contoh nyata: response dari API
type ApiResponse = {
  data: User | null;    // bisa ada user-nya, bisa null
  error: string | null; // bisa ada error, bisa null
  loading: boolean;
};
```

---

### 5.2 Optional Properties

Analogi: Property dengan tanda `?` itu kayak field di formulir yang **tidak wajib** diisi.

```ts
interface UserProfile {
  id: number;
  name: string;
  email: string;
  nickname?: string;     // opsional — boleh ada, boleh tidak
  bio?: string;          // opsional
  phoneNumber?: string;  // opsional
}

// ✅ Valid — hanya isi yang wajib
const user1: UserProfile = {
  id: 1,
  name: "Budi Santoso",
  email: "budi@example.com",
};

// ✅ Valid — isi beberapa optional juga
const user2: UserProfile = {
  id: 2,
  name: "Sari Dewi",
  email: "sari@example.com",
  nickname: "saridew",
  bio: "Frontend developer dari Bandung",
};
```

```ts
// Perhatikan perbedaan ini!
interface Example {
  a: string;           // wajib, harus berupa string
  b: string | undefined; // wajib ada sebagai key, tapi nilainya boleh undefined
  c?: string;          // tidak wajib ada sama sekali
}

// ✅ Valid
const ex1: Example = { a: "hello", b: undefined };

// ❌ Error — 'b' harus ada meskipun undefined
const ex2: Example = { a: "hello" }; // Property 'b' is missing
```

---

## 6. Typing di Function

### 6.1 Typing Parameter

```ts
// Parameter biasa
function sayHello(name: string): void {
  console.log(`Halo, ${name}!`);
}

// Parameter dengan default value
function greet(name: string, greeting: string = "Halo"): void {
  console.log(`${greeting}, ${name}!`);
}

// Parameter opsional (pakai ?)
function introduce(name: string, age?: number): string {
  if (age !== undefined) {
    return `Nama saya ${name}, umur ${age} tahun.`;
  }
  return `Nama saya ${name}.`;
}

introduce("Budi");       // "Nama saya Budi."
introduce("Sari", 25);   // "Nama saya Sari, umur 25 tahun."
```

---

### 6.2 Typing Return Value

```ts
// Return string
function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

// Return number
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// Return boolean
function isAdult(age: number): boolean {
  return age >= 18;
}

// Return void — tidak mengembalikan nilai
function logMessage(message: string): void {
  console.log(message);
  // tidak ada return value
}

// Return object
function createUser(name: string, email: string): { id: number; name: string; email: string } {
  return {
    id: Math.random(),
    name,
    email,
  };
}

// Lebih rapi: pakai interface sebagai return type
interface User {
  id: number;
  name: string;
  email: string;
}

function createUserClean(name: string, email: string): User {
  return {
    id: Math.random(),
    name,
    email,
  };
}
```

---

### 6.3 Mengetik Arrow Function

```ts
// Cara 1: type di parameter & return
const add = (a: number, b: number): number => {
  return a + b;
};

// Cara 2: type seluruh fungsinya (function type)
const multiply: (a: number, b: number) => number = (a, b) => {
  return a * b;
};

// Arrow function dengan object parameter
const formatUser = (user: { name: string; age: number }): string => {
  return `${user.name} (${user.age} tahun)`;
};

// Lebih rapi dengan interface
interface UserBasic {
  name: string;
  age: number;
}

const formatUserClean = (user: UserBasic): string => {
  return `${user.name} (${user.age} tahun)`;
};
```

---

### 6.4 Function yang Menerima Callback

```ts
// Callback sederhana
function doSomething(callback: () => void): void {
  console.log("Sebelum callback...");
  callback();
  console.log("Setelah callback.");
}

doSomething(() => console.log("Ini callback!"));

// Callback dengan parameter
function processItems(
  items: string[],
  callback: (item: string, index: number) => void
): void {
  items.forEach((item, index) => callback(item, index));
}

processItems(["apel", "mangga"], (item, index) => {
  console.log(`${index + 1}. ${item}`);
});

// Callback yang return value
function transformItems(items: number[], transform: (n: number) => number): number[] {
  return items.map(transform);
}

const doubled = transformItems([1, 2, 3], (n) => n * 2); // [2, 4, 6]
```

---

## 7. Generic Types Sederhana

### Apa itu Generic?

Analogi: Generic itu kayak **cetakan kue** yang bisa diisi apapun. Cetakannya sama, isinya beda-beda.

Tanpa generic:
```ts
// Kita harus buat fungsi terpisah untuk setiap tipe — membosankan dan redundant
function getFirstString(arr: string[]): string {
  return arr[0];
}

function getFirstNumber(arr: number[]): number {
  return arr[0];
}

// Harus buat terus untuk boolean, object, dll...
```

Dengan generic:
```ts
// Satu fungsi untuk semua tipe! T adalah "placeholder tipe"
function getFirst<T>(arr: T[]): T {
  return arr[0];
}

// TypeScript otomatis menebak tipenya dari argument
const firstFruit = getFirst(["apel", "mangga", "jeruk"]); // tipe: string
const firstScore = getFirst([90, 85, 78]);                 // tipe: number
const firstFlag = getFirst([true, false, true]);           // tipe: boolean
```

---

### Generic di Interface / Type

```ts
// Wrapper generic untuk response API
interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// Bisa dipakai untuk berbagai jenis data
interface User {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
}

// ApiResponse dengan User
const userResponse: ApiResponse<User> = {
  data: { id: 1, name: "Budi" },
  message: "OK",
  success: true,
};

// ApiResponse dengan array of Product
const productsResponse: ApiResponse<Product[]> = {
  data: [
    { id: 1, name: "Laptop", price: 15000000 },
    { id: 2, name: "Mouse", price: 150000 },
  ],
  message: "OK",
  success: true,
};

// ApiResponse dengan null (ketika data tidak ada / loading)
const emptyResponse: ApiResponse<null> = {
  data: null,
  message: "Not found",
  success: false,
};
```

---

### Generic dengan Multiple Type Parameters

```ts
// Pair — dua nilai dengan tipe berbeda
function makePair<K, V>(key: K, value: V): { key: K; value: V } {
  return { key, value };
}

const pair1 = makePair("name", "Budi");        // { key: string, value: string }
const pair2 = makePair(1, true);               // { key: number, value: boolean }
const pair3 = makePair("score", 95);           // { key: string, value: number }
```

---

## 8. Common Mistakes Pemula

### ❌ Mistake #1: Pakai `any` sebagai jalan pintas

```ts
// ❌ Jangan lakukan ini — menghilangkan semua manfaat TypeScript
function processData(data: any): any {
  return data.someProperty.nestedProperty; // Runtime error tidak terdeteksi
}

// ✅ Definisikan tipe yang proper
interface Data {
  someProperty: {
    nestedProperty: string;
  };
}

function processData(data: Data): string {
  return data.someProperty.nestedProperty; // Aman dan terdeteksi kalau salah
}
```

> **Analoginya:** Pakai `any` itu kayak nulis "ini barang" di label koper. Betul sih, tapi tidak membantu sama sekali.

---

### ❌ Mistake #2: Tidak handle `undefined` dari optional property

```ts
interface User {
  name: string;
  nickname?: string;
}

const user: User = { name: "Budi" };

// ❌ Bahaya! nickname bisa undefined
console.log(user.nickname.toUpperCase()); // Runtime Error: Cannot read properties of undefined

// ✅ Selalu cek nullable/optional sebelum dipakai
if (user.nickname) {
  console.log(user.nickname.toUpperCase()); // Aman
}

// ✅ Atau pakai optional chaining
console.log(user.nickname?.toUpperCase()); // undefined jika tidak ada, tidak error

// ✅ Atau pakai nullish coalescing
console.log((user.nickname ?? "Anonymous").toUpperCase()); // "Anonymous" jika undefined
```

---

### ❌ Mistake #3: Salah paham `string | undefined` vs optional property `?`

```ts
// Ini TIDAK sama!

interface A {
  name?: string;          // Property 'name' boleh tidak ada
}

interface B {
  name: string | undefined; // Property 'name' HARUS ada, tapi boleh bernilai undefined
}

// ✅ A — boleh skip property name
const a: A = {};          // OK
const a2: A = { name: "Budi" }; // OK

// ❌ B — property name wajib ada
const b: B = {};          // Error: Property 'name' is missing
const b2: B = { name: undefined }; // OK
const b3: B = { name: "Sari" };    // OK
```

---

### ❌ Mistake #4: Union type tapi lupa narrowing

```ts
type ID = string | number;

function printId(id: ID): void {
  // ❌ Langsung pakai method string padahal bisa number
  console.log(id.toUpperCase()); // Error: Property 'toUpperCase' does not exist on type 'number'

  // ✅ Narrowing dulu — cek tipenya dengan typeof
  if (typeof id === "string") {
    console.log(id.toUpperCase()); // Di sini TypeScript tahu id adalah string
  } else {
    console.log(id.toFixed(2));    // Di sini TypeScript tahu id adalah number
  }
}
```

---

### ❌ Mistake #5: Return type yang tidak konsisten

```ts
// ❌ Kadang return string, kadang tidak return apa-apa — ambigu
function getName(user: { name?: string }): string {
  if (user.name) {
    return user.name;
  }
  // Lupa return di sini! TypeScript akan error karena return type-nya string
  // tapi ada code path yang tidak return
}

// ✅ Pastikan semua code path punya return value
function getNameSafe(user: { name?: string }): string {
  if (user.name) {
    return user.name;
  }
  return "Anonymous"; // Default value
}

// ✅ Atau ubah return type jadi string | undefined
function getNameMaybe(user: { name?: string }): string | undefined {
  return user.name; // Bisa string atau undefined, explicit
}
```

---

### ❌ Mistake #6: Extend interface tapi property conflict

```ts
interface Animal {
  sound: string;
}

// ❌ Conflict: sound di Animal adalah string, tapi di Cat kita override jadi number
interface Cat extends Animal {
  sound: number; // Error! Type 'number' is not assignable to type 'string'
}

// ✅ Pastikan tipe compatible saat extend
interface Cat extends Animal {
  sound: string; // OK
  indoor: boolean;
}

// ✅ Atau gunakan literal type yang lebih spesifik
interface Cat extends Animal {
  sound: "meow" | "purr"; // OK — ini subtype dari string
}
```

---

## 9. Mini Project: User Profile Validator

Saatnya praktek! Kita buat fungsi TypeScript yang menerima object user dan memvalidasi tipe datanya.

### Spesifikasi

- Menerima object dengan berbagai tipe data (string, number, boolean, array)
- Memvalidasi bahwa setiap field punya tipe yang benar
- Return hasil validasi berupa object yang detail
- Handle optional fields dengan benar

---

### Step 1: Definisi Types

```ts
// user-profile-validator.ts

// Tipe untuk data user mentah yang masuk (bisa dari form, API, dll.)
interface RawUserProfile {
  id: unknown;
  name: unknown;
  email: unknown;
  age: unknown;
  role: unknown;
  tags?: unknown;
  isVerified?: unknown;
}

// Tipe untuk user yang sudah tervalidasi
interface ValidUserProfile {
  id: number;
  name: string;
  email: string;
  age: number;
  role: "admin" | "editor" | "viewer";
  tags: string[];
  isVerified: boolean;
}

// Tipe untuk hasil satu field validasi
interface FieldValidationResult {
  field: string;
  valid: boolean;
  message: string;
  receivedType: string;
  expectedType: string;
}

// Tipe untuk hasil keseluruhan validasi
interface ValidationResult {
  isValid: boolean;
  validatedUser: ValidUserProfile | null;
  errors: FieldValidationResult[];
  summary: string;
}
```

---

### Step 2: Helper Functions

```ts
// Cek apakah string adalah email yang valid
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Cek apakah sebuah nilai adalah string array
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Dapatkan nama tipe dari nilai apapun
function getTypeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

// Buat field validation result
function makeFieldResult(
  field: string,
  valid: boolean,
  message: string,
  receivedValue: unknown,
  expectedType: string
): FieldValidationResult {
  return {
    field,
    valid,
    message,
    receivedType: getTypeName(receivedValue),
    expectedType,
  };
}
```

---

### Step 3: Fungsi Validator Utama

```ts
function validateUserProfile(raw: RawUserProfile): ValidationResult {
  const errors: FieldValidationResult[] = [];

  // ── Validasi ID ──────────────────────────────────────────────
  const idValid = typeof raw.id === "number" && raw.id > 0 && Number.isInteger(raw.id);
  errors.push(
    makeFieldResult(
      "id",
      idValid,
      idValid ? "ID valid." : "ID harus berupa bilangan bulat positif.",
      raw.id,
      "number (positive integer)"
    )
  );

  // ── Validasi Name ────────────────────────────────────────────
  const nameValid =
    typeof raw.name === "string" &&
    raw.name.trim().length >= 2 &&
    raw.name.trim().length <= 50;
  errors.push(
    makeFieldResult(
      "name",
      nameValid,
      nameValid
        ? "Nama valid."
        : "Nama harus berupa string dengan panjang 2–50 karakter.",
      raw.name,
      "string (2–50 chars)"
    )
  );

  // ── Validasi Email ───────────────────────────────────────────
  const emailValid =
    typeof raw.email === "string" && isValidEmail(raw.email);
  errors.push(
    makeFieldResult(
      "email",
      emailValid,
      emailValid ? "Email valid." : "Email harus berupa string dengan format yang benar.",
      raw.email,
      "string (valid email format)"
    )
  );

  // ── Validasi Age ─────────────────────────────────────────────
  const ageValid =
    typeof raw.age === "number" &&
    Number.isInteger(raw.age) &&
    raw.age >= 13 &&
    raw.age <= 120;
  errors.push(
    makeFieldResult(
      "age",
      ageValid,
      ageValid ? "Umur valid." : "Umur harus berupa bilangan bulat antara 13–120.",
      raw.age,
      "number (integer, 13–120)"
    )
  );

  // ── Validasi Role ────────────────────────────────────────────
  const validRoles: ValidUserProfile["role"][] = ["admin", "editor", "viewer"];
  const roleValid =
    typeof raw.role === "string" &&
    (validRoles as string[]).includes(raw.role);
  errors.push(
    makeFieldResult(
      "role",
      roleValid,
      roleValid ? "Role valid." : `Role harus salah satu dari: ${validRoles.join(", ")}.`,
      raw.role,
      `"admin" | "editor" | "viewer"`
    )
  );

  // ── Validasi Tags (optional) ─────────────────────────────────
  let tagsValid = true;
  if (raw.tags !== undefined) {
    tagsValid = isStringArray(raw.tags);
    errors.push(
      makeFieldResult(
        "tags",
        tagsValid,
        tagsValid ? "Tags valid." : "Tags harus berupa array of string.",
        raw.tags,
        "string[] (optional)"
      )
    );
  }

  // ── Validasi isVerified (optional) ──────────────────────────
  let isVerifiedValid = true;
  if (raw.isVerified !== undefined) {
    isVerifiedValid = typeof raw.isVerified === "boolean";
    errors.push(
      makeFieldResult(
        "isVerified",
        isVerifiedValid,
        isVerifiedValid ? "isVerified valid." : "isVerified harus berupa boolean.",
        raw.isVerified,
        "boolean (optional)"
      )
    );
  }

  // ── Cek semua validasi ───────────────────────────────────────
  const allValid =
    idValid &&
    nameValid &&
    emailValid &&
    ageValid &&
    roleValid &&
    tagsValid &&
    isVerifiedValid;

  // ── Bangun validatedUser kalau semua OK ──────────────────────
  const validatedUser: ValidUserProfile | null = allValid
    ? {
        id: raw.id as number,
        name: (raw.name as string).trim(),
        email: raw.email as string,
        age: raw.age as number,
        role: raw.role as ValidUserProfile["role"],
        tags: raw.tags !== undefined ? (raw.tags as string[]) : [],
        isVerified:
          raw.isVerified !== undefined ? (raw.isVerified as boolean) : false,
      }
    : null;

  // ── Hitung jumlah error ──────────────────────────────────────
  const failedFields = errors.filter((e) => !e.valid);
  const summary = allValid
    ? `✅ User profile valid! Semua ${errors.length} field lolos validasi.`
    : `❌ Validasi gagal. ${failedFields.length} dari ${errors.length} field tidak valid: ${failedFields.map((e) => e.field).join(", ")}.`;

  return {
    isValid: allValid,
    validatedUser,
    errors,
    summary,
  };
}
```

---

### Step 4: Testing

```ts
// ── Test 1: User yang valid ──────────────────────────────────
console.log("=== TEST 1: Valid User ===");

const result1 = validateUserProfile({
  id: 1,
  name: "Budi Santoso",
  email: "budi@example.com",
  age: 25,
  role: "editor",
  tags: ["typescript", "react", "frontend"],
  isVerified: true,
});

console.log(result1.summary);
// Output: ✅ User profile valid! Semua 7 field lolos validasi.

if (result1.validatedUser) {
  console.log("Validated user:", result1.validatedUser);
}

// ── Test 2: User dengan banyak error ─────────────────────────
console.log("\n=== TEST 2: Invalid User ===");

const result2 = validateUserProfile({
  id: -5,           // ❌ harus positif
  name: "A",        // ❌ terlalu pendek
  email: "bukan-email",  // ❌ format salah
  age: 10,          // ❌ di bawah minimum
  role: "superadmin",  // ❌ bukan role yang valid
  tags: [1, 2, 3],  // ❌ harus string[]
  isVerified: "yes", // ❌ harus boolean
});

console.log(result2.summary);
// Output: ❌ Validasi gagal. 7 dari 7 field tidak valid: id, name, email, age, role, tags, isVerified.

console.log("\nDetail error:");
result2.errors.forEach((err) => {
  const status = err.valid ? "✅" : "❌";
  console.log(`${status} [${err.field}] ${err.message}`);
  if (!err.valid) {
    console.log(`     Received: ${err.receivedType}, Expected: ${err.expectedType}`);
  }
});

// ── Test 3: User tanpa optional fields ───────────────────────
console.log("\n=== TEST 3: User tanpa optional fields ===");

const result3 = validateUserProfile({
  id: 42,
  name: "  Sari Dewi  ", // Nama dengan leading/trailing spaces (akan di-trim)
  email: "sari@example.com",
  age: 30,
  role: "viewer",
  // tags dan isVerified tidak diisi (optional)
});

console.log(result3.summary);
// Output: ✅ User profile valid! Semua 5 field lolos validasi.

if (result3.validatedUser) {
  console.log("Nama setelah trim:", result3.validatedUser.name);  // "Sari Dewi"
  console.log("Tags default:", result3.validatedUser.tags);       // []
  console.log("isVerified default:", result3.validatedUser.isVerified); // false
}
```

---

### Output yang Diharapkan

```
=== TEST 1: Valid User ===
✅ User profile valid! Semua 7 field lolos validasi.
Validated user: {
  id: 1,
  name: 'Budi Santoso',
  email: 'budi@example.com',
  age: 25,
  role: 'editor',
  tags: [ 'typescript', 'react', 'frontend' ],
  isVerified: true
}

=== TEST 2: Invalid User ===
❌ Validasi gagal. 7 dari 7 field tidak valid: id, name, email, age, role, tags, isVerified.

Detail error:
❌ [id] ID harus berupa bilangan bulat positif.
     Received: number, Expected: number (positive integer)
❌ [name] Nama harus berupa string dengan panjang 2–50 karakter.
     Received: string, Expected: string (2–50 chars)
❌ [email] Email harus berupa string dengan format yang benar.
     Received: string, Expected: string (valid email format)
❌ [age] Umur harus berupa bilangan bulat antara 13–120.
     Received: number, Expected: number (integer, 13–120)
❌ [role] Role harus salah satu dari: admin, editor, viewer.
     Received: string, Expected: "admin" | "editor" | "viewer"
❌ [tags] Tags harus berupa array of string.
     Received: array, Expected: string[] (optional)
❌ [isVerified] isVerified harus berupa boolean.
     Received: string, Expected: boolean (optional)

=== TEST 3: User tanpa optional fields ===
✅ User profile valid! Semua 5 field lolos validasi.
Nama setelah trim: Sari Dewi
Tags default: []
isVerified default: false
```

---

### Konsep yang Kamu Sudah Pakai di Mini Project Ini

| Konsep | Digunakan di |
|---|---|
| `interface` | `RawUserProfile`, `ValidUserProfile`, `FieldValidationResult`, `ValidationResult` |
| `type alias` | — (bisa juga diganti `type`) |
| Union types | `ValidUserProfile \| null`, role `"admin" \| "editor" \| "viewer"` |
| Optional properties | `tags?`, `isVerified?` di `RawUserProfile` |
| Typing function params | Semua fungsi helper & `validateUserProfile` |
| Typing return value | Semua fungsi punya explicit return type |
| `unknown` vs `any` | Pakai `unknown` di `RawUserProfile` — lebih aman dari `any` |
| Type narrowing | `typeof raw.id === "number"`, `Array.isArray()` |
| Generic (`is` type guard) | `value is string[]` di `isStringArray()` |

---

## Penutup

Selamat, kamu sudah cover semua fondasi TypeScript yang dibutuhkan sebelum masuk ke React + TypeScript!

**Urutan belajar selanjutnya:**

1. **React + TypeScript**: Typing props dengan `interface`, typing `useState`, `useRef`, event handlers
2. **Utility Types**: `Partial<T>`, `Required<T>`, `Pick<T>`, `Omit<T>`, `Readonly<T>`
3. **Advanced Generics**: Constraint, conditional types, mapped types
4. **TypeScript Config**: `strict mode`, `noImplicitAny`, `tsconfig.json`

> **Pesan dari "senior dev":** Jangan takut sama error TypeScript. Setiap error itu TypeScript lagi ngomong "Eh, ada yang kurang bener nih, coba dicek." Semakin sering kamu baca dan ngerti error-nya, semakin cepet kamu jadi pro. TypeScript itu investasi — ribet di awal, tapi menghemat jam debugging di kemudian hari.

---

*Dokumen ini dibuat untuk React developer pemula. Versi: TypeScript 5.x*
