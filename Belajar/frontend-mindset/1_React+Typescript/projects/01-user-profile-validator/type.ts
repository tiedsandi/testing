export interface RawUserProfile {
  id: unknown;
  name: unknown;
  email: unknown;
  age: unknown;
  role: unknown;
  tags?: unknown;
  isVerified?: unknown;
}

// Tipe untuk user yang sudah tervalidasi
export interface ValidUserProfile {
  id: number;
  name: string;
  email: string;
  age: number;
  role: "admin" | "editor" | "viewer";
  tags: string[];
  isVerified: boolean;
}

// Tipe untuk hasil satu field validasi
export interface FieldValidationResult {
  field: string;
  valid: boolean;
  message: string;
  receivedType: string;
  expectedType: string;
}

// Tipe untuk hasil keseluruhan validasi
export interface ValidationResult {
  isValid: boolean;
  validatedUser: ValidUserProfile | null;
  errors: FieldValidationResult[];
  summary: string;
}