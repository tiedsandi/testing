# Project F — Job Application Form: Multi-Step Form dengan RHF + Zod

> **Level:** Intermediate | **Estimasi waktu:** 3–4 jam  
> **Prerequisite:** Paham React Hook Form + Zod (doc 08), Next.js App Router (doc 06), dan TypeScript basics (doc 01).

---

## Daftar Isi

1. [Overview Project](#1-overview-project)
2. [Struktur Folder](#2-struktur-folder)
3. [Setup Project](#3-setup-project)
4. [Schema Zod per Step](#4-schema-zod-per-step)
5. [Types dan Context](#5-types-dan-context)
6. [Form Context: State Global Multi-Step](#6-form-context-state-global-multi-step)
7. [Komponen Progress Bar](#7-komponen-progress-bar)
8. [Step 1: Data Pribadi](#8-step-1-data-pribadi)
9. [Step 2: Pengalaman Kerja](#9-step-2-pengalaman-kerja)
10. [Step 3: Upload CV](#10-step-3-upload-cv)
11. [Step 4: Review & Submit](#11-step-4-review--submit)
12. [Halaman Utama: Orchestrator](#12-halaman-utama-orchestrator)
13. [API Route: Handle Submit](#13-api-route-handle-submit)
14. [Success Page](#14-success-page)
15. [localStorage Persistence](#15-localstorage-persistence)
16. [Cara Debug Form yang Kompleks](#16-cara-debug-form-yang-kompleks)
17. [Checklist UX Form yang Baik](#17-checklist-ux-form-yang-baik)

---

## 1. Overview Project

Kita akan bangun **Job Application Form** — form lamaran kerja 4 langkah dengan validasi ketat, progress tersimpan, dan UX yang bagus.

### Kenapa Multi-Step Form?

Form dengan 15+ field kalau ditumpuk jadi satu halaman terasa overwhelming. Multi-step form:
- Memecah kompleksitas jadi bagian kecil yang mudah dicerna
- User tahu progress mereka sudah di mana
- Validasi real-time per step sebelum lanjut
- Mengurangi abandon rate form

### Diagram Alur

```
User buka /apply
        │
        ▼
┌─────────────────────────────────────────────────┐
│  STEP 1: Data Pribadi                           │
│  ┌────────────────────────────────────────────┐ │
│  │ Nama Lengkap: ________________________     │ │
│  │ Email:        ________________________     │ │
│  │ Nomor HP:     ________________________     │ │
│  └────────────────────────────────────────────┘ │
│  [Validasi Zod] → Error muncul di field         │
│                                    [Lanjut →]   │
└─────────────────────────────────────────────────┘
        │ (valid)
        ▼
┌─────────────────────────────────────────────────┐
│  STEP 2: Pengalaman Kerja                       │
│  ┌────────────────────────────────────────────┐ │
│  │ Posisi Terakhir: _____________________     │ │
│  │ Perusahaan:      _____________________     │ │
│  │ Tahun Mulai:     [2020 ▼]                  │ │
│  │ Tahun Selesai:   [2024 ▼] atau [Sekarang]  │ │
│  └────────────────────────────────────────────┘ │
│  [← Kembali]                      [Lanjut →]   │
└─────────────────────────────────────────────────┘
        │ (valid)
        ▼
┌─────────────────────────────────────────────────┐
│  STEP 3: Upload CV                              │
│  ┌────────────────────────────────────────────┐ │
│  │  📎 Drag & drop atau klik untuk upload     │ │
│  │     PDF, DOC, DOCX — max 5MB               │ │
│  └────────────────────────────────────────────┘ │
│  [← Kembali]                      [Lanjut →]   │
└─────────────────────────────────────────────────┘
        │ (valid)
        ▼
┌─────────────────────────────────────────────────┐
│  STEP 4: Review & Konfirmasi                    │
│  ┌────────────────────────────────────────────┐ │
│  │ ✔ Data Pribadi:  Budi Santoso, budi@...    │ │
│  │ ✔ Pengalaman:    Frontend Dev, PT Maju     │ │
│  │ ✔ CV:            cv-budi-2024.pdf          │ │
│  └────────────────────────────────────────────┘ │
│  [← Kembali]              [Kirim Lamaran 🚀]   │
└─────────────────────────────────────────────────┘
        │ (submit)
        ▼
   POST /api/apply
        │
        ▼ (success)
   /apply/success
   "Lamaran berhasil dikirim! 🎉"
```

### Diagram State Multi-Step

```
FormContext (React Context)
├── currentStep: 1 | 2 | 3 | 4
├── formData: {
│     personal?:    { name, email, phone }
│     experience?:  { position, company, startYear, endYear, isCurrentJob }
│     cv?:          { fileName, fileSize }
│   }
├── goToNextStep()   → validasi dulu, baru lanjut
├── goToPrevStep()   → bebas mundur
└── submitForm()     → POST ke API

                   ┌─────────────────────────────────┐
                   │ localStorage                     │
                   │ "job-application-draft": {       │
                   │   currentStep: 2,                │
                   │   formData: { personal: {...} }  │
                   │ }                                │
                   └─────────────────────────────────┘
                        ↕ sync dua arah
```

---

## 2. Struktur Folder

```
job-form/
├── app/
│   ├── apply/
│   │   ├── page.tsx               ← Halaman form utama (orchestrator)
│   │   └── success/
│   │       └── page.tsx           ← Halaman sukses setelah submit
│   ├── api/
│   │   └── apply/
│   │       └── route.ts           ← API route: handle submit
│   ├── layout.tsx
│   ├── page.tsx                   ← Landing page
│   └── globals.css
│
├── components/
│   ├── form/
│   │   ├── MultiStepForm.tsx      ← Wrapper + orchestrator UI
│   │   ├── ProgressBar.tsx        ← Progress indicator
│   │   ├── StepPersonal.tsx       ← Step 1
│   │   ├── StepExperience.tsx     ← Step 2
│   │   ├── StepUploadCV.tsx       ← Step 3
│   │   ├── StepReview.tsx         ← Step 4
│   │   └── FormNavigation.tsx     ← Tombol Kembali + Lanjut
│   └── ui/
│       ├── FormField.tsx
│       ├── SelectField.tsx
│       └── FileUpload.tsx
│
├── context/
│   └── FormContext.tsx            ← React Context + useFormContext hook
│
├── hooks/
│   └── useFormPersistence.ts      ← localStorage sync hook
│
├── lib/
│   ├── schemas.ts                 ← Semua Zod schemas
│   └── utils.ts
│
└── types/
    └── form.types.ts              ← Semua TypeScript types
```

---

## 3. Setup Project

```bash
npx create-next-app@latest job-form \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd job-form

npm install react-hook-form zod @hookform/resolvers
```

---

## 4. Schema Zod per Step

Satu file, semua schema. Tiap step punya schema-nya sendiri, lalu digabung jadi `fullApplicationSchema` untuk validasi final.

```ts
// lib/schemas.ts
import { z } from "zod";

// ─── Step 1: Data Pribadi ────────────────────────────────────────
export const personalSchema = z.object({
  name: z
    .string()
    .min(3, "Nama minimal 3 karakter")
    .max(100, "Nama terlalu panjang")
    .regex(/^[a-zA-Z\s.'-]+$/, "Nama hanya boleh huruf, spasi, dan tanda baca"),

  email: z
    .string()
    .email("Format email tidak valid")
    .max(254, "Email terlalu panjang"),

  phone: z
    .string()
    .min(10, "Nomor HP minimal 10 digit")
    .max(15, "Nomor HP terlalu panjang")
    .regex(/^(\+62|62|0)[0-9]{8,13}$/, "Format nomor HP tidak valid (contoh: 08123456789)"),
});

export type PersonalValues = z.infer<typeof personalSchema>;

// ─── Step 2: Pengalaman Kerja ────────────────────────────────────
const currentYear = new Date().getFullYear();

export const experienceSchema = z
  .object({
    position: z
      .string()
      .min(2, "Posisi minimal 2 karakter")
      .max(100, "Posisi terlalu panjang"),

    company: z
      .string()
      .min(2, "Nama perusahaan minimal 2 karakter")
      .max(150, "Nama perusahaan terlalu panjang"),

    startYear: z
      .number({
        required_error: "Tahun mulai wajib diisi",
        invalid_type_error: "Pilih tahun mulai",
      })
      .min(1970, "Tahun tidak valid")
      .max(currentYear, `Tahun mulai tidak boleh lebih dari ${currentYear}`),

    endYear: z
      .number()
      .min(1970, "Tahun tidak valid")
      .max(currentYear, `Tahun selesai tidak boleh lebih dari ${currentYear}`)
      .optional(),

    isCurrentJob: z.boolean().default(false),

    responsibilities: z
      .string()
      .max(500, "Deskripsi maksimal 500 karakter")
      .optional(),
  })
  .refine(
    (data) => {
      // Kalau bukan pekerjaan sekarang, endYear wajib ada
      if (!data.isCurrentJob && !data.endYear) return false;
      return true;
    },
    {
      message: "Tahun selesai wajib diisi",
      path: ["endYear"],
    }
  )
  .refine(
    (data) => {
      // endYear harus >= startYear
      if (data.endYear && data.endYear < data.startYear) return false;
      return true;
    },
    {
      message: "Tahun selesai tidak boleh sebelum tahun mulai",
      path: ["endYear"],
    }
  );

export type ExperienceValues = z.infer<typeof experienceSchema>;

// ─── Step 3: Upload CV ───────────────────────────────────────────
// Catatan: File tidak bisa di-serialize ke JSON/localStorage
// Kita simpan metadata-nya saja (nama file, ukuran)
// File asli disimpan di React state sementara

const MAX_FILE_SIZE     = 5 * 1024 * 1024; // 5MB dalam bytes
const ACCEPTED_TYPES    = ["application/pdf", "application/msword",
                           "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

// Schema untuk validasi File object (Client Component saja)
export const cvFileSchema = z.object({
  file: z
    .instanceof(File, { message: "File CV wajib diupload" })
    .refine(
      (f) => f.size <= MAX_FILE_SIZE,
      `Ukuran file maksimal 5MB`
    )
    .refine(
      (f) => ACCEPTED_TYPES.includes(f.type),
      "Format file harus PDF, DOC, atau DOCX"
    ),
});

export type CVFileValues = z.infer<typeof cvFileSchema>;

// Schema untuk metadata CV (yang disimpan ke localStorage + dikirim ke review)
export const cvMetaSchema = z.object({
  fileName: z.string().min(1, "File CV wajib diupload"),
  fileSize: z.number().positive(),
  fileType: z.string(),
});

export type CVMetaValues = z.infer<typeof cvMetaSchema>;

// ─── Full Schema (untuk validasi final sebelum submit) ────────────
export const fullApplicationSchema = z.object({
  personal:   personalSchema,
  experience: experienceSchema,
  cv:         cvMetaSchema,
});

export type FullApplicationValues = z.infer<typeof fullApplicationSchema>;
```

---

## 5. Types dan Context

```ts
// types/form.types.ts
import type { PersonalValues, ExperienceValues, CVMetaValues } from "@/lib/schemas";

// Step indicator
export type StepNumber = 1 | 2 | 3 | 4;

// Data yang dikumpulkan dari semua step
// Partial karena user belum tentu sudah isi semua step
export interface ApplicationFormData {
  personal?:   PersonalValues;
  experience?: ExperienceValues;
  cv?:         CVMetaValues;
}

// State lengkap yang disimpan di localStorage
export interface PersistedFormState {
  currentStep: StepNumber;
  formData:    ApplicationFormData;
}

// Config tiap step
export interface StepConfig {
  number:       StepNumber;
  title:        string;
  description:  string;
}

export const STEPS: StepConfig[] = [
  { number: 1, title: "Data Pribadi",       description: "Informasi dasar tentang kamu" },
  { number: 2, title: "Pengalaman Kerja",   description: "Riwayat pekerjaan terakhir"   },
  { number: 3, title: "Upload CV",          description: "File CV kamu (PDF/DOC, max 5MB)" },
  { number: 4, title: "Review & Konfirmasi", description: "Cek ulang sebelum dikirim"   },
];

// Status submit
export type SubmitStatus =
  | { status: "idle"    }
  | { status: "loading" }
  | { status: "success"; applicationId: string }
  | { status: "error";   message: string };
```

---

## 6. Form Context: State Global Multi-Step

Context ini adalah "jantung" dari multi-step form — menyimpan semua data dan mengontrol navigasi antar step.

```tsx
// context/FormContext.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ApplicationFormData,
  PersistedFormState,
  StepNumber,
  SubmitStatus,
} from "@/types/form.types";

// ─── Context Type ──────────────────────────────────────────────────
interface FormContextValue {
  currentStep:    StepNumber;
  formData:       ApplicationFormData;
  submitStatus:   SubmitStatus;
  cvFile:         File | null;            // File object tidak bisa disimpan di localStorage
  isStepComplete: (step: StepNumber) => boolean;

  // Actions
  saveStepData:  (step: StepNumber, data: Partial<ApplicationFormData>) => void;
  goToNextStep:  () => void;
  goToPrevStep:  () => void;
  goToStep:      (step: StepNumber) => void;
  setCvFile:     (file: File | null) => void;
  submitForm:    () => Promise<void>;
  resetForm:     () => void;
}

// ─── Context ───────────────────────────────────────────────────────
const FormContext = createContext<FormContextValue | null>(null);

// ─── Constants ────────────────────────────────────────────────────
const STORAGE_KEY  = "job-application-draft";
const TOTAL_STEPS  = 4 as const;

const INITIAL_STATE: PersistedFormState = {
  currentStep: 1,
  formData:    {},
};

// ─── Provider ─────────────────────────────────────────────────────
export function FormProvider({ children }: { children: React.ReactNode }) {
  const [currentStep,  setCurrentStep ] = useState<StepNumber>(1);
  const [formData,     setFormData    ] = useState<ApplicationFormData>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>({ status: "idle" });
  const [cvFile,       setCvFile      ] = useState<File | null>(null);
  const isHydrated = useRef(false);

  // ── Hydrate dari localStorage saat pertama mount ────────────────
  useEffect(() => {
    if (isHydrated.current) return;
    isHydrated.current = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: PersistedFormState = JSON.parse(saved);
        setCurrentStep(parsed.currentStep ?? 1);
        setFormData(parsed.formData ?? {});
      }
    } catch {
      // Kalau data corrupt → mulai dari awal
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ── Persist ke localStorage setiap kali state berubah ───────────
  useEffect(() => {
    if (!isHydrated.current) return;

    const state: PersistedFormState = { currentStep, formData };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [currentStep, formData]);

  // ── Simpan data dari satu step ───────────────────────────────────
  const saveStepData = useCallback(
    (step: StepNumber, data: Partial<ApplicationFormData>) => {
      setFormData((prev) => ({ ...prev, ...data }));
    },
    []
  );

  // ── Navigasi ─────────────────────────────────────────────────────
  const goToNextStep = useCallback(() => {
    setCurrentStep((prev) =>
      prev < TOTAL_STEPS ? ((prev + 1) as StepNumber) : prev
    );
  }, []);

  const goToPrevStep = useCallback(() => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as StepNumber) : prev));
  }, []);

  const goToStep = useCallback((step: StepNumber) => {
    setCurrentStep(step);
  }, []);

  // ── Cek apakah step sudah diisi ──────────────────────────────────
  const isStepComplete = useCallback(
    (step: StepNumber): boolean => {
      switch (step) {
        case 1: return !!formData.personal;
        case 2: return !!formData.experience;
        case 3: return !!formData.cv;
        case 4: return false; // Step 4 tidak pernah "complete" sendiri
        default: return false;
      }
    },
    [formData]
  );

  // ── Submit ke API ────────────────────────────────────────────────
  const submitForm = useCallback(async () => {
    if (!formData.personal || !formData.experience || !formData.cv || !cvFile) {
      setSubmitStatus({ status: "error", message: "Data tidak lengkap" });
      return;
    }

    setSubmitStatus({ status: "loading" });

    try {
      // Kirim sebagai FormData supaya bisa include file
      const payload = new FormData();
      payload.append("personal",   JSON.stringify(formData.personal));
      payload.append("experience", JSON.stringify(formData.experience));
      payload.append("cv",         cvFile);

      const response = await fetch("/api/apply", {
        method: "POST",
        body:   payload,
        // Tidak set Content-Type — browser auto-set multipart/form-data + boundary
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message ?? "Gagal mengirim lamaran");
      }

      const result = await response.json();
      setSubmitStatus({ status: "success", applicationId: result.applicationId });

      // Hapus draft dari localStorage setelah sukses
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      setSubmitStatus({
        status:  "error",
        message: err instanceof Error ? err.message : "Terjadi kesalahan",
      });
    }
  }, [formData, cvFile]);

  // ── Reset semua ──────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setCurrentStep(1);
    setFormData({});
    setCvFile(null);
    setSubmitStatus({ status: "idle" });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <FormContext.Provider
      value={{
        currentStep,
        formData,
        submitStatus,
        cvFile,
        isStepComplete,
        saveStepData,
        goToNextStep,
        goToPrevStep,
        goToStep,
        setCvFile,
        submitForm,
        resetForm,
      }}
    >
      {children}
    </FormContext.Provider>
  );
}

// ─── Custom Hook ──────────────────────────────────────────────────
export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error("useFormContext harus dipakai di dalam FormProvider");
  }
  return ctx;
}
```

---

## 7. Komponen Progress Bar

```tsx
// components/form/ProgressBar.tsx
import { STEPS } from "@/types/form.types";
import type { StepNumber } from "@/types/form.types";

interface ProgressBarProps {
  currentStep:   StepNumber;
  isStepComplete: (step: StepNumber) => boolean;
  onStepClick?:  (step: StepNumber) => void;
}

export function ProgressBar({
  currentStep,
  isStepComplete,
  onStepClick,
}: ProgressBarProps) {
  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full">
      {/* Step Indicators */}
      <div className="relative flex items-center justify-between">
        {/* Line background */}
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200" aria-hidden="true" />
        {/* Line progress */}
        <div
          className="absolute left-0 top-5 h-0.5 bg-blue-600 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
          aria-hidden="true"
        />

        {/* Step Circles */}
        {STEPS.map((step) => {
          const isCompleted = isStepComplete(step.number);
          const isCurrent   = currentStep === step.number;
          const isPast      = step.number < currentStep;
          const canClick    = isPast || isCompleted;

          return (
            <div key={step.number} className="flex flex-col items-center z-10">
              <button
                type="button"
                onClick={() => canClick && onStepClick?.(step.number)}
                disabled={!canClick}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${step.number}: ${step.title}${isCompleted ? " (selesai)" : ""}`}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 text-sm font-semibold",
                  isCurrent
                    ? "border-blue-600 bg-blue-600 text-white scale-110 shadow-md shadow-blue-200"
                    : isPast || isCompleted
                    ? "border-blue-600 bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                    : "border-gray-300 bg-white text-gray-400 cursor-default",
                ].join(" ")}
              >
                {isPast || (isCompleted && !isCurrent) ? (
                  // Checkmark icon
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </button>

              {/* Step Label */}
              <div className="mt-2 text-center">
                <p className={[
                  "text-xs font-medium hidden sm:block",
                  isCurrent ? "text-blue-600" : isPast ? "text-gray-700" : "text-gray-400",
                ].join(" ")}>
                  {step.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Step Info (mobile) */}
      <div className="mt-4 text-center sm:hidden">
        <p className="text-sm font-medium text-gray-900">
          {STEPS[currentStep - 1]?.title}
        </p>
        <p className="text-xs text-gray-500">
          Langkah {currentStep} dari {STEPS.length}
        </p>
      </div>
    </div>
  );
}
```

---

## 8. Step 1: Data Pribadi

```tsx
// components/form/StepPersonal.tsx
"use client";

import { useForm }       from "react-hook-form";
import { zodResolver }   from "@hookform/resolvers/zod";
import { useEffect }     from "react";
import { personalSchema, type PersonalValues } from "@/lib/schemas";
import { useFormContext } from "@/context/FormContext";
import { FormField }     from "@/components/ui/FormField";
import { FormNavigation } from "./FormNavigation";

export function StepPersonal() {
  const { formData, saveStepData, goToNextStep } = useFormContext();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<PersonalValues>({
    resolver:      zodResolver(personalSchema),
    mode:          "onBlur",       // Validasi saat user meninggalkan field
    defaultValues: formData.personal ?? {
      name:  "",
      email: "",
      phone: "",
    },
  });

  // Isi ulang form dari saved data saat komponen mount
  useEffect(() => {
    if (formData.personal) {
      reset(formData.personal);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(data: PersonalValues) {
    saveStepData(1, { personal: data });
    goToNextStep();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <FormField
          label="Nama Lengkap"
          error={errors.name?.message}
          placeholder="Budi Santoso"
          autoComplete="name"
          {...register("name")}
        />

        <FormField
          label="Email"
          type="email"
          error={errors.email?.message}
          placeholder="budi@email.com"
          autoComplete="email"
          {...register("email")}
        />

        <FormField
          label="Nomor HP"
          type="tel"
          error={errors.phone?.message}
          placeholder="08123456789"
          autoComplete="tel"
          hint="Format: 08xxxxxxxxx atau +628xxxxxxxxx"
          {...register("phone")}
        />
      </div>

      <FormNavigation
        isFirstStep
        isSubmitting={false}
      />
    </form>
  );
}
```

---

## 9. Step 2: Pengalaman Kerja

```tsx
// components/form/StepExperience.tsx
"use client";

import { useForm }    from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect }  from "react";
import { experienceSchema, type ExperienceValues } from "@/lib/schemas";
import { useFormContext }  from "@/context/FormContext";
import { FormField }      from "@/components/ui/FormField";
import { SelectField }    from "@/components/ui/SelectField";
import { FormNavigation } from "./FormNavigation";

// Generate opsi tahun: dari tahun ini mundur ke 1970
function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= 1970; y--) {
    years.push(y);
  }
  return years;
}

const YEARS = getYearOptions();

export function StepExperience() {
  const { formData, saveStepData, goToNextStep, goToPrevStep } = useFormContext();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ExperienceValues>({
    resolver:      zodResolver(experienceSchema),
    mode:          "onBlur",
    defaultValues: formData.experience ?? {
      position:         "",
      company:          "",
      startYear:        undefined,
      endYear:          undefined,
      isCurrentJob:     false,
      responsibilities: "",
    },
  });

  useEffect(() => {
    if (formData.experience) {
      reset(formData.experience);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch isCurrentJob untuk hide/show endYear
  const isCurrentJob = watch("isCurrentJob");

  // Kalau isCurrentJob true, clear endYear
  useEffect(() => {
    if (isCurrentJob) {
      setValue("endYear", undefined, { shouldValidate: true });
    }
  }, [isCurrentJob, setValue]);

  function onSubmit(data: ExperienceValues) {
    saveStepData(2, { experience: data });
    goToNextStep();
  }

  const yearSelectOptions = [
    { value: "", label: "Pilih tahun" },
    ...YEARS.map((y) => ({ value: String(y), label: String(y) })),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <FormField
          label="Posisi Terakhir"
          error={errors.position?.message}
          placeholder="Frontend Developer"
          {...register("position")}
        />

        <FormField
          label="Nama Perusahaan"
          error={errors.company?.message}
          placeholder="PT Maju Bersama"
          {...register("company")}
        />

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Tahun Mulai"
            error={errors.startYear?.message}
            options={yearSelectOptions}
            {...register("startYear", { valueAsNumber: true })}
          />

          {!isCurrentJob && (
            <SelectField
              label="Tahun Selesai"
              error={errors.endYear?.message}
              options={yearSelectOptions}
              {...register("endYear", { valueAsNumber: true })}
            />
          )}

          {isCurrentJob && (
            <div className="flex items-end pb-1">
              <span className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 font-medium w-full text-center">
                Pekerjaan Sekarang
              </span>
            </div>
          )}
        </div>

        {/* Checkbox: masih bekerja di sini */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            {...register("isCurrentJob")}
          />
          <span className="text-sm text-gray-700">
            Saya masih bekerja di perusahaan ini
          </span>
        </label>

        {/* Textarea: tanggung jawab */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            Tanggung Jawab{" "}
            <span className="font-normal text-gray-400">(opsional)</span>
          </label>
          <textarea
            className={[
              "w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-offset-1 transition",
              errors.responsibilities
                ? "border-red-400 focus:ring-red-300"
                : "border-gray-300 focus:ring-blue-300",
            ].join(" ")}
            rows={3}
            placeholder="Jelaskan tanggung jawab utama kamu di posisi ini..."
            maxLength={500}
            {...register("responsibilities")}
          />
          {errors.responsibilities && (
            <p className="text-xs text-red-600">{errors.responsibilities.message}</p>
          )}
          <p className="text-xs text-gray-400 text-right">
            Maks. 500 karakter
          </p>
        </div>
      </div>

      <FormNavigation onBack={goToPrevStep} isSubmitting={false} />
    </form>
  );
}
```

---

## 10. Step 3: Upload CV

Step ini yang paling tricky karena File tidak bisa disimpan di localStorage. Kita simpan `File` object di Context state, dan metadata-nya di `formData`.

```tsx
// components/form/StepUploadCV.tsx
"use client";

import { useForm }       from "react-hook-form";
import { zodResolver }   from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { cvFileSchema, type CVFileValues } from "@/lib/schemas";
import { useFormContext } from "@/context/FormContext";
import { FormNavigation } from "./FormNavigation";

const MAX_SIZE_MB = 5;
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx";

// Format bytes ke string yang readable (1024 → "1 KB")
function formatFileSize(bytes: number): string {
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StepUploadCV() {
  const { formData, saveStepData, goToNextStep, goToPrevStep, cvFile, setCvFile } =
    useFormContext();

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    trigger,
    clearErrors,
  } = useForm<CVFileValues>({
    resolver: zodResolver(cvFileSchema),
    // File tidak bisa punya defaultValues dari JSON, tapi kalau
    // cvFile sudah ada di context (misalnya user kembali dari step 4),
    // kita set ulang ke form
    defaultValues: cvFile ? { file: cvFile } : undefined,
  });

  // Kalau cvFile sudah ada di context, register ke form
  useEffect(() => {
    if (cvFile) {
      setValue("file", cvFile, { shouldValidate: true });
    }
  }, [cvFile, setValue]);

  // Handle file selection (dari input atau drag-drop)
  async function handleFileSelect(file: File) {
    setValue("file", file, { shouldValidate: false });

    // Trigger validasi manual
    const valid = await trigger("file");
    if (valid) {
      setCvFile(file);
      clearErrors("file");
    } else {
      setCvFile(null);
    }
  }

  // Input change event
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  // Drag & Drop events
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  function removeFile() {
    setCvFile(null);
    setValue("file", undefined as any);
    clearErrors("file");
    // Reset input value
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit(_data: CVFileValues) {
    if (!cvFile) return;
    saveStepData(3, {
      cv: {
        fileName: cvFile.name,
        fileSize: cvFile.size,
        fileType: cvFile.type,
      },
    });
    goToNextStep();
  }

  const currentFile = cvFile;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        {/* Drag & Drop Zone */}
        {!currentFile ? (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition",
              isDragging
                ? "border-blue-400 bg-blue-50"
                : errors.file
                ? "border-red-300 bg-red-50 hover:border-red-400"
                : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50",
            ].join(" ")}
          >
            {/* Upload icon */}
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
              <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <p className="text-sm font-medium text-gray-700">
              {isDragging ? "Lepas file di sini" : "Drag & drop file CV kamu"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              atau <span className="text-blue-600 font-medium">klik untuk pilih file</span>
            </p>
            <p className="mt-2 text-xs text-gray-400">
              PDF, DOC, DOCX — maksimal {MAX_SIZE_MB}MB
            </p>

            {/* Hidden input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={onInputChange}
              className="sr-only"
              aria-label="Upload CV"
            />
          </div>
        ) : (
          // File Preview: setelah file dipilih
          <div className="flex items-center gap-4 rounded-xl border bg-green-50 border-green-200 p-4">
            {/* File icon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm border">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(currentFile.size)}
              </p>
            </div>

            {/* Checkmark */}
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={removeFile}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
              aria-label="Hapus file"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Error message */}
        {errors.file && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.file.message}
          </p>
        )}

        {/* Info: kalau file sudah ada dari sebelumnya tapi halaman di-refresh */}
        {!currentFile && formData.cv && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
            <strong>Perhatian:</strong> File CV kamu hilang karena halaman di-refresh.
            Silakan upload ulang file:{" "}
            <span className="font-medium">{formData.cv.fileName}</span>
          </div>
        )}
      </div>

      <FormNavigation onBack={goToPrevStep} isSubmitting={false} />
    </form>
  );
}
```

---

## 11. Step 4: Review & Submit

```tsx
// components/form/StepReview.tsx
"use client";

import { useFormContext } from "@/context/FormContext";
import { FormNavigation } from "./FormNavigation";
import { useRouter }      from "next/navigation";
import { useEffect }      from "react";
import type { StepNumber } from "@/types/form.types";

// Format bytes
function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StepReview() {
  const {
    formData,
    submitStatus,
    cvFile,
    submitForm,
    goToPrevStep,
    goToStep,
  } = useFormContext();

  const router = useRouter();

  // Redirect ke success page kalau submit berhasil
  useEffect(() => {
    if (submitStatus.status === "success") {
      router.push(`/apply/success?id=${submitStatus.applicationId}`);
    }
  }, [submitStatus, router]);

  const { personal, experience, cv } = formData;

  // Guard: kalau data tidak ada (harusnya tidak terjadi karena ada validasi tiap step)
  if (!personal || !experience || (!cv && !cvFile)) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Data tidak lengkap. Silakan mulai dari awal.</p>
      </div>
    );
  }

  function EditButton({ step }: { step: StepNumber }) {
    return (
      <button
        type="button"
        onClick={() => goToStep(step)}
        className="text-sm text-blue-600 hover:underline font-medium"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error dari Submit */}
      {submitStatus.status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Gagal mengirim:</strong> {submitStatus.message}
        </div>
      )}

      {/* ── Section 1: Data Pribadi ─────────────────────────────── */}
      <section className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              1
            </span>
            Data Pribadi
          </h3>
          <EditButton step={1} />
        </div>
        <dl className="space-y-2">
          {[
            { label: "Nama Lengkap", value: personal.name  },
            { label: "Email",        value: personal.email },
            { label: "Nomor HP",     value: personal.phone },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-2 text-sm">
              <dt className="w-32 shrink-0 text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900">: {value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Section 2: Pengalaman Kerja ────────────────────────── */}
      <section className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              2
            </span>
            Pengalaman Kerja
          </h3>
          <EditButton step={2} />
        </div>
        <dl className="space-y-2">
          {[
            { label: "Posisi",      value: experience.position },
            { label: "Perusahaan",  value: experience.company  },
            {
              label: "Periode",
              value: `${experience.startYear} – ${
                experience.isCurrentJob ? "Sekarang" : (experience.endYear ?? "-")
              }`,
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-2 text-sm">
              <dt className="w-32 shrink-0 text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900">: {value}</dd>
            </div>
          ))}
          {experience.responsibilities && (
            <div className="flex items-start gap-2 text-sm">
              <dt className="w-32 shrink-0 text-gray-500">Deskripsi</dt>
              <dd className="text-gray-700 italic">: "{experience.responsibilities}"</dd>
            </div>
          )}
        </dl>
      </section>

      {/* ── Section 3: CV ───────────────────────────────────────── */}
      <section className="rounded-xl border bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              3
            </span>
            File CV
          </h3>
          <EditButton step={3} />
        </div>
        <div className="flex items-center gap-3">
          <svg className="h-8 w-8 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {cv?.fileName ?? cvFile?.name}
            </p>
            <p className="text-xs text-gray-500">
              {cv ? formatFileSize(cv.fileSize) : cvFile ? formatFileSize(cvFile.size) : "-"}
            </p>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <p className="text-xs text-center text-gray-400">
        Dengan mengirim lamaran, kamu menyetujui bahwa data yang diberikan adalah benar.
      </p>

      {/* Navigation */}
      <FormNavigation
        onBack={goToPrevStep}
        onSubmit={submitForm}
        isLastStep
        isSubmitting={submitStatus.status === "loading"}
        submitLabel="Kirim Lamaran 🚀"
      />
    </div>
  );
}
```

### FormNavigation Component

```tsx
// components/form/FormNavigation.tsx
interface FormNavigationProps {
  onBack?:       () => void;
  onSubmit?:     () => void;
  isFirstStep?:  boolean;
  isLastStep?:   boolean;
  isSubmitting?: boolean;
  submitLabel?:  string;
}

export function FormNavigation({
  onBack,
  onSubmit,
  isFirstStep   = false,
  isLastStep    = false,
  isSubmitting  = false,
  submitLabel   = "Lanjut →",
}: FormNavigationProps) {
  return (
    <div className={`mt-8 flex ${isFirstStep ? "justify-end" : "justify-between"}`}>
      {/* Tombol Kembali */}
      {!isFirstStep && (
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>
      )}

      {/* Tombol Submit / Lanjut */}
      <button
        type={isLastStep ? "button" : "submit"}
        onClick={isLastStep ? onSubmit : undefined}
        disabled={isSubmitting}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Mengirim...
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
```

---

## 12. Halaman Utama: Orchestrator

```tsx
// app/apply/page.tsx
"use client";

import { FormProvider, useFormContext } from "@/context/FormContext";
import { ProgressBar }  from "@/components/form/ProgressBar";
import { StepPersonal } from "@/components/form/StepPersonal";
import { StepExperience } from "@/components/form/StepExperience";
import { StepUploadCV } from "@/components/form/StepUploadCV";
import { StepReview }   from "@/components/form/StepReview";
import { STEPS }        from "@/types/form.types";
import type { Metadata } from "next";

// Catatan: metadata tidak bisa di-export dari Client Component.
// Untuk halaman "use client", buat layout.tsx terpisah untuk metadata.

// ─── Inner Component (di dalam Provider) ──────────────────────────
function ApplicationFormInner() {
  const { currentStep, isStepComplete, goToStep } = useFormContext();

  const currentStepConfig = STEPS.find((s) => s.number === currentStep);

  // Render step yang sesuai
  function renderCurrentStep() {
    switch (currentStep) {
      case 1: return <StepPersonal   />;
      case 2: return <StepExperience />;
      case 3: return <StepUploadCV   />;
      case 4: return <StepReview     />;
      default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Formulir Lamaran Kerja
          </h1>
          <p className="mt-2 text-gray-500">
            Lengkapi semua langkah untuk mengirim lamaran kamu
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          {/* Progress Bar */}
          <ProgressBar
            currentStep={currentStep}
            isStepComplete={isStepComplete}
            onStepClick={goToStep}
          />

          {/* Step Title */}
          <div className="mt-8 mb-6 border-b pb-5">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentStepConfig?.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {currentStepConfig?.description}
            </p>
          </div>

          {/* Step Content */}
          <div key={currentStep}>
            {/* key={currentStep} memaksa re-mount saat step berubah
                supaya form state ter-reset dengan benar */}
            {renderCurrentStep()}
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-4 text-center text-xs text-gray-400">
          Progress kamu tersimpan otomatis. Bisa dilanjutkan kapan saja.
        </p>
      </div>
    </div>
  );
}

// ─── Page Export (dengan Provider) ────────────────────────────────
export default function ApplyPage() {
  return (
    <FormProvider>
      <ApplicationFormInner />
    </FormProvider>
  );
}
```

---

## 13. API Route: Handle Submit

```ts
// app/api/apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fullApplicationSchema }     from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    // Parse multipart form data
    const formData  = await req.formData();

    // Ambil dan parse JSON fields
    const personalRaw   = formData.get("personal");
    const experienceRaw = formData.get("experience");
    const cvFile        = formData.get("cv");

    // Validasi field ada
    if (!personalRaw || !experienceRaw || !cvFile) {
      return NextResponse.json(
        { message: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    // Parse JSON
    let personal, experience;
    try {
      personal   = JSON.parse(personalRaw as string);
      experience = JSON.parse(experienceRaw as string);
    } catch {
      return NextResponse.json(
        { message: "Format data tidak valid" },
        { status: 400 }
      );
    }

    // Validasi file adalah File object
    if (!(cvFile instanceof File)) {
      return NextResponse.json(
        { message: "CV harus berupa file" },
        { status: 400 }
      );
    }

    // Validasi tipe dan ukuran file
    const ACCEPTED_TYPES = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!ACCEPTED_TYPES.includes(cvFile.type)) {
      return NextResponse.json(
        { message: "Format file CV tidak valid (harus PDF, DOC, atau DOCX)" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (cvFile.size > MAX_SIZE) {
      return NextResponse.json(
        { message: "Ukuran file CV melebihi 5MB" },
        { status: 400 }
      );
    }

    // Validasi data dengan Zod (server-side validation — wajib!)
    const validationResult = fullApplicationSchema.safeParse({
      personal,
      experience,
      cv: {
        fileName: cvFile.name,
        fileSize: cvFile.size,
        fileType: cvFile.type,
      },
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          message: "Validasi gagal",
          errors:  validationResult.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    // ── Proses data di sini ──────────────────────────────────────
    // Di production: simpan ke database, upload file ke S3, kirim email, dll.

    // Untuk development: simulasi proses + delay
    await new Promise((r) => setTimeout(r, 1500)); // Simulasi proses

    // Generate application ID
    const applicationId = `APP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    console.log("✅ Lamaran baru diterima:", {
      id:         applicationId,
      personal:   validationResult.data.personal,
      experience: validationResult.data.experience,
      cv:         validationResult.data.cv,
    });

    // Kembalikan response sukses
    return NextResponse.json(
      {
        success:        true,
        applicationId,
        message:        "Lamaran berhasil dikirim!",
        submittedAt:    new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error processing application:", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan server. Coba lagi." },
      { status: 500 }
    );
  }
}
```

---

## 14. Success Page

```tsx
// app/apply/success/page.tsx
import Link   from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lamaran Berhasil Dikirim!",
};

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4 py-10">
      <div className="mx-auto max-w-md text-center">
        {/* Success Animation */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-12 w-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Lamaran Terkirim! 🎉
        </h1>
        <p className="text-gray-500 mb-6">
          Terima kasih sudah melamar. Tim kami akan meninjau lamaran kamu
          dan menghubungi kamu dalam 3–5 hari kerja.
        </p>

        {/* Application ID */}
        {id && (
          <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Nomor Referensi Lamaran</p>
            <p className="font-mono font-semibold text-gray-900 text-lg">{id}</p>
            <p className="text-xs text-gray-400 mt-1">
              Simpan nomor ini untuk konfirmasi status lamaran kamu
            </p>
          </div>
        )}

        {/* Steps selanjutnya */}
        <div className="mb-8 rounded-xl border bg-white p-5 text-left shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Langkah Selanjutnya</h2>
          <ol className="space-y-3">
            {[
              "Tim HR akan meninjau lamaran kamu",
              "Kamu akan menerima email konfirmasi",
              "Jika lolos seleksi, kami akan menghubungi untuk interview",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white text-center transition hover:bg-blue-700"
          >
            Kembali ke Beranda
          </Link>
          <Link
            href="/apply"
            className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 text-center transition hover:bg-gray-50"
          >
            Kirim Lamaran Lain
          </Link>
        </div>
      </div>
    </div>
  );
}
```

---

## 15. localStorage Persistence

### Cara Kerjanya di Project Ini

Semua sudah terintegrasi di `FormContext`. Tapi penting untuk paham edge case-nya:

```tsx
// Penjelasan detail tentang apa yang BISA dan TIDAK BISA disimpan

// ✅ BISA disimpan ke localStorage:
const persistedData: PersistedFormState = {
  currentStep: 2,
  formData: {
    personal:   { name: "Budi", email: "budi@mail.com", phone: "08123" },
    experience: { position: "Dev", company: "PT Maju", startYear: 2020, ... },
    cv:         { fileName: "cv.pdf", fileSize: 204800, fileType: "application/pdf" },
    // Metadata CV saja, bukan File object!
  },
};

// ❌ TIDAK BISA disimpan ke localStorage:
const file = new File(["..."], "cv.pdf"); // File object tidak JSON-serializable
// JSON.stringify(file) → "{}" - semua property hilang!

// ─── Solusi untuk File ────────────────────────────────────────────
// 1. Simpan metadata CV (nama, ukuran, tipe) ke localStorage ✅
// 2. Simpan File object di React state (in-memory, hilang kalau refresh) ✅
// 3. Kalau user refresh halaman:
//    - Metadata CV masih ada di localStorage → tampilkan nama file
//    - File object hilang → minta user upload ulang (dengan peringatan yang jelas)
```

### Custom Hook (Alternatif yang Lebih Reusable)

```ts
// hooks/useFormPersistence.ts
// Kalau mau pisahkan logic persistence dari context

import { useEffect, useRef, useState } from "react";
import type { PersistedFormState } from "@/types/form.types";

const INITIAL_STATE: PersistedFormState = {
  currentStep: 1,
  formData:    {},
};

export function useFormPersistence(storageKey: string) {
  const [state,      setState     ] = useState<PersistedFormState>(INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read dari localStorage saat pertama mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setState(JSON.parse(saved));
    } catch {
      localStorage.removeItem(storageKey);
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey]);

  // Write ke localStorage setiap kali state berubah
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey, isHydrated]);

  function clearStorage() {
    localStorage.removeItem(storageKey);
    setState(INITIAL_STATE);
  }

  return { state, setState, clearStorage, isHydrated };
}
```

---

## 16. Cara Debug Form yang Kompleks

### Teknik 1: DevTools Component

Tambahkan komponen debug yang hanya muncul di development. Letakkan di bawah form.

```tsx
// components/form/FormDevTools.tsx
"use client";

import { useFormContext }    from "@/context/FormContext";
import { useState }          from "react";

// Hanya render di development
export function FormDevTools() {
  if (process.env.NODE_ENV !== "development") return null;
  return <FormDevToolsInner />;
}

function FormDevToolsInner() {
  const { currentStep, formData, cvFile } = useFormContext();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full bg-gray-900 p-3 text-white shadow-lg hover:bg-gray-700"
        title="Form DevTools"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0..." />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-14 right-0 w-80 rounded-xl border bg-gray-900 text-white shadow-xl">
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold">🛠 Form DevTools</h3>
            <span className="text-xs text-gray-400">Step {currentStep}/4</span>
          </div>
          <div className="p-3 overflow-auto max-h-64">
            <p className="text-xs text-gray-400 mb-2">formData:</p>
            <pre className="text-xs text-green-400">
              {JSON.stringify(formData, null, 2)}
            </pre>
            {cvFile && (
              <>
                <p className="text-xs text-gray-400 mt-3 mb-1">cvFile (in-memory):</p>
                <pre className="text-xs text-yellow-400">
                  {JSON.stringify({
                    name: cvFile.name,
                    size: cvFile.size,
                    type: cvFile.type,
                  }, null, 2)}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Teknik 2: Log RHF State dengan `watch`

```tsx
// Di dalam setiap StepComponent, tambahkan ini sementara untuk debug:

const { watch, formState } = useForm<PersonalValues>({ ... });

// ✅ Saat development: log semua nilai form
if (process.env.NODE_ENV === "development") {
  console.log("Form values:", watch());
  console.log("Form errors:", formState.errors);
  console.log("Is valid:", formState.isValid);
  console.log("Dirty fields:", formState.dirtyFields);
  console.log("Touched fields:", formState.touchedFields);
}
```

### Teknik 3: Pahami Error `formState.errors`

```tsx
// Kalau .errors kosong tapi submit tidak jalan — cek ini:

function DebugErrors<T extends FieldValues>({ errors }: { errors: FieldErrors<T> }) {
  if (process.env.NODE_ENV !== "development") return null;
  if (Object.keys(errors).length === 0) return null;

  return (
    <div className="rounded-lg bg-red-900 p-3 text-xs text-red-200">
      <p className="font-bold mb-2">❌ Form Errors:</p>
      <pre>{JSON.stringify(errors, null, 2)}</pre>
    </div>
  );
}

// Pakai di dalam form:
// <DebugErrors errors={errors} />
```

### Teknik 4: Common Bug dan Solusinya

```tsx
// BUG 1: Validasi tidak jalan saat submit
// Penyebab: form bukan <form> dengan handleSubmit
// ❌ Salah
<div onSubmit={handleSubmit(onSubmit)}>...</div>
// ✅ Benar
<form onSubmit={handleSubmit(onSubmit)}>...</form>

// ─────────────────────────────────────────────────────────────────

// BUG 2: Validasi number field selalu gagal walaupun sudah diisi
// Penyebab: HTML select mengembalikan string, bukan number
// ❌ Salah
<select {...register("startYear")}>
  <option value="2020">2020</option>
</select>
// ✅ Benar: tambahkan valueAsNumber
<select {...register("startYear", { valueAsNumber: true })}>
  <option value="2020">2020</option>
</select>

// ─────────────────────────────────────────────────────────────────

// BUG 3: mode: "onChange" tapi error tidak muncul setelah user mengetik
// Penyebab: mode perlu "onBlur" atau "onChange" di register juga
// ✅ Set mode di useForm:
const { register } = useForm({ mode: "onBlur" }); // Validasi saat blur

// ─────────────────────────────────────────────────────────────────

// BUG 4: defaultValues tidak di-apply saat data berubah
// Penyebab: defaultValues hanya dibaca saat mount
// ✅ Gunakan reset() untuk update form dengan data baru:
useEffect(() => {
  if (savedData) {
    reset(savedData); // Bukan setValue satu per satu
  }
}, []); // intentionally empty dep array

// ─────────────────────────────────────────────────────────────────

// BUG 5: File input tidak bisa dikontrol oleh register biasa
// Penyebab: <input type="file"> tidak support value binding
// ✅ Gunakan setValue + trigger manual (seperti di StepUploadCV):
setValue("file", selectedFile, { shouldValidate: false });
const isValid = await trigger("file");

// ─────────────────────────────────────────────────────────────────

// BUG 6: Context value undefined
// Penyebab: komponen berada di luar Provider
// Error: "useFormContext harus dipakai di dalam FormProvider"
// ✅ Pastikan Provider membungkus komponen yang menggunakannya:
export default function ApplyPage() {
  return (
    <FormProvider>          {/* ← Provider di sini */}
      <ApplicationFormInner /> {/* ← Consumer di dalam */}
    </FormProvider>
  );
}
```

---

## 17. Checklist UX Form yang Baik

### Validasi & Error States

```
☐ Validasi dijalankan saat "onBlur" (bukan onChange) untuk field text biasa?
  → Mencegah error muncul saat user masih mengetik
  → mode: "onBlur" di useForm()

☐ Error muncul tepat di bawah field yang bermasalah?
  → Bukan di atas form atau di modal
  → Gunakan aria-describedby untuk aksesibilitas

☐ Field yang error diberi visual indicator yang jelas?
  → Border merah, bukan hanya teks error
  → Tidak hanya mengandalkan warna (untuk color-blind users)

☐ Pesan error spesifik dan actionable?
  → ❌ "Input tidak valid"
  → ✅ "Format email tidak valid (contoh: nasa@email.com)"

☐ Error hilang setelah user memperbaiki field?
  → Pakai mode: "onBlur" atau validasi ulang saat onChange setelah error

☐ Validasi server-side juga ada (bukan hanya client-side)?
  → Client validation bisa dibypass — selalu validasi ulang di API route
```

### Navigasi & Progress

```
☐ User tahu sedang di langkah berapa dari berapa?
  → Progress bar dengan label yang jelas

☐ User bisa kembali ke step sebelumnya tanpa kehilangan data?
  → Data tersimpan sebelum navigasi

☐ User bisa lompat ke step yang sudah selesai (kalau mau edit)?
  → Step yang sudah complete bisa diklik di progress bar

☐ Tombol "Kembali" dan "Lanjut" posisi konsisten?
  → Kembali: kiri, Lanjut/Submit: kanan

☐ Disabled state tombol jelas saat loading?
  → Loading spinner, teks ber-ganti, kursor not-allowed
```

### Persistence & Data

```
☐ Ada indikator bahwa progress tersimpan?
  → "Progress tersimpan otomatis" di footer form

☐ Draft dihapus dari localStorage setelah berhasil submit?
  → Jangan biarkan data stale tertinggal

☐ Ada peringatan kalau data wajib hilang (misal: file setelah refresh)?
  → "File CV kamu hilang, silakan upload ulang"

☐ Tidak menyimpan data sensitif di localStorage tanpa enkripsi?
  → Untuk project ini (nama, email) masih OK
  → Untuk KTP, nomor rekening → jangan di localStorage
```

### Accessibility

```
☐ Semua input punya label yang terhubung (htmlFor/id)?

☐ Error message terhubung ke input via aria-describedby?

☐ Focus management: setelah pindah step, focus kembali ke atas form?
  → Pakai useEffect + ref.focus() saat currentStep berubah

☐ Progress bar punya aria-label dan step saat ini punya aria-current="step"?

☐ Loading state diumumkan ke screen reader?
  → aria-live="polite" pada area status
  → aria-busy="true" saat submitting

☐ Form bisa diisi hanya dengan keyboard?
  → Tab order logis
  → Enter men-submit form
```

### Mobile & Responsiveness

```
☐ Touch target minimal 44x44px untuk semua tombol?

☐ Keyboard type sesuai untuk tiap input?
  → type="email" → keyboard email di mobile
  → type="tel" → keyboard nomor di mobile
  → inputMode="numeric" untuk field angka

☐ Form tidak ter-zoom saat tap input di iOS?
  → font-size input minimal 16px (di bawah itu iOS auto-zoom)

☐ Progress bar steps masih readable di layar kecil?
  → Sembunyikan label teks, tampilkan hanya nomor/icon
```

---

## Cara Menjalankan Project

```bash
# 1. Install dependencies
npm install react-hook-form zod @hookform/resolvers

# 2. Jalankan development server
npm run dev

# Buka: http://localhost:3000/apply

# Test flow lengkap:
# 1. Isi data pribadi → klik Lanjut
# 2. Isi pengalaman → klik Lanjut  
# 3. Upload file PDF/DOC → klik Lanjut
# 4. Review → klik Kirim Lamaran
# 5. Lihat success page dengan Application ID

# Test localStorage persistence:
# 1. Isi step 1 → klik Lanjut
# 2. Refresh halaman
# 3. Data step 1 masih ada, langsung di step 2 ✅

# Test debug:
# Buka browser console saat di form → lihat log FormContext
```

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Next.js 15*
