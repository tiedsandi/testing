import { FieldValidationResult } from "./type";

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Cek apakah sebuah nilai adalah string array
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

// Dapatkan nama tipe dari nilai apapun
export function getTypeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

// Buat field validation result
export function makeFieldResult(
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