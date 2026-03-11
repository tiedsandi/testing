import { FieldValidationResult, RawUserProfile, ValidationResult, ValidUserProfile } from "./type";
import { isStringArray, isValidEmail, makeFieldResult } from "./utils";

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