# 21 — Workflow & Tooling Senior Frontend Developer

> **Gaya baca:** Obrolan santai senior ke junior. Tooling yang bagus itu bukan gengsi — ini yang membedakan kode yang mudah dijaga selama 2 tahun vs kode yang sudah jadi beban dalam 2 bulan.

---

## Daftar Isi

1. [Kenapa Tooling Ini Penting](#1-kenapa-tooling-ini-penting)
2. [ESLint: Setup yang Proper untuk Next.js + TypeScript](#2-eslint-setup-yang-proper-untuk-nextjs--typescript)
3. [Prettier: Format Otomatis, Debat Gaya Selesai](#3-prettier-format-otomatis-debat-gaya-selesai)
4. [Husky + lint-staged: Auto Lint Sebelum Commit](#4-husky--lint-staged-auto-lint-sebelum-commit)
5. [Conventional Commits: Commit Message yang Bermakna](#5-conventional-commits-commit-message-yang-bermakna)
6. [Git Workflow: GitHub Flow yang Simpel tapi Efektif](#6-git-workflow-github-flow-yang-simpel-tapi-efektif)
7. [Environment Variables di Next.js dengan Validasi Zod](#7-environment-variables-di-nextjs-dengan-validasi-zod)
8. [Path Aliases TypeScript](#8-path-aliases-typescript)
9. [VS Code: Extensions dan Settings Penting](#9-vs-code-extensions-dan-settings-penting)
10. [Bonus: AI Instructions Template untuk Project Next.js](#10-bonus-ai-instructions-template-untuk-project-nextjs)

---

## 1. Kenapa Tooling Ini Penting

### Cerita dari Proyek Nyata

> *"Kita join tim baru. Codebase ada 50 file TypeScript. Setiap developer punya style sendiri — ada yang pakai single quote, ada double quote. Ada yang pakai 2 spasi, ada 4 spasi. Commit message: 'fix', 'update', 'asdf', 'coba2'. Mau trace bug dari 3 bulan lalu? Good luck."*

Ini bukan masalah estetika. Ini masalah produktivitas nyata:

```
Tanpa tooling yang baik:
→ Review PR sibuk bahas style, bukan logic
→ Merge conflict karena perbedaan whitespace
→ Bug masuk ke main karena tidak ada guard otomatis
→ Tidak tahu perubahan apa yang terjadi 2 bulan lalu
→ Onboarding developer baru butuh 1 minggu buat setup

Dengan tooling yang baik:
→ PR review fokus ke logic dan architecture
→ Tidak ada debat tabs vs spaces — Prettier memutuskan
→ ESLint + Husky tangkap bug sebelum push
→ Commit history = dokumentasi hidup project
→ Developer baru bisa commit pertama dalam 30 menit
```

### Gambaran Besar Setup yang Kita Bangun

```
Developer nulis kode
       ↓
VS Code (ESLint + Prettier) → highlight error real-time, format saat save
       ↓
git commit → Husky aktif
       ↓
lint-staged → jalankan ESLint + Prettier hanya di file yang berubah
       ↓
commitlint → validasi format commit message
       ↓
Kalau semua lulus → commit berhasil
Kalau gagal → commit ditolak, developer harus perbaiki dulu
```

---

## 2. ESLint: Setup yang Proper untuk Next.js + TypeScript

### Install Dependencies

```bash
npm install -D eslint eslint-config-next
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D eslint-plugin-jsx-a11y
npm install -D eslint-plugin-import
npm install -D eslint-plugin-unused-imports
```

### Konfigurasi Lengkap

```javascript
// eslint.config.mjs — Flat Config (ESLint 9+, default di Next.js terbaru)
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  // Next.js base config (includes React rules)
  ...compat.extends('next/core-web-vitals'),

  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'jsx-a11y': jsxA11y,
      'import': importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      // ─── TypeScript ───────────────────────────────────────────────
      // Cegah penggunaan `any` secara implisit
      '@typescript-eslint/no-explicit-any': 'warn',
      // Wajib handle Promise yang di-return dari async function
      '@typescript-eslint/no-floating-promises': 'error',
      // Prefer `interface` untuk object types (konsistensi)
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      // Import type harus pakai `import type` — membantu tree-shaking
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Non-null assertion (!) harus eksplisit, jangan asal-asalan
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Tidak pakai variabel yang sudah di-declare tapi tidak dipakai
      '@typescript-eslint/no-unused-vars': 'off', // handled by unused-imports below

      // ─── Unused Imports ───────────────────────────────────────────
      // Auto-fix: hapus import yang tidak terpakai
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',     // variabel _foo diabaikan
          args: 'after-used',
          argsIgnorePattern: '^_',    // parameter _bar diabaikan
        },
      ],

      // ─── Import Order ─────────────────────────────────────────────
      // Urutkan import secara konsisten
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',      // node:path, node:fs
            'external',     // react, next, tanstack
            'internal',     // @/components, @/hooks
            ['parent', 'sibling', 'index'], // ../utils, ./Button
            'type',         // import type { ... }
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',

      // ─── React ──────────────────────────────────────────────────
      // React 17+ tidak perlu import React untuk JSX
      'react/react-in-jsx-scope': 'off',
      // Props yang tidak dipakai di destructuring
      'react/no-unused-prop-types': 'warn',
      // Key unik di list items
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],

      // ─── Accessibility ────────────────────────────────────────────
      ...jsxA11y.configs.recommended.rules,

      // ─── General ─────────────────────────────────────────────────
      // console.log boleh di dev, tapi warn untuk ingat dihapus
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // Prefer const
      'prefer-const': 'error',
      // Tidak boleh var
      'no-var': 'error',
      // === bukan ==
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
    },
  },

  // Test files — rules yang lebih longgar
  {
    files: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // Config files — tidak perlu strict TypeScript rules
  {
    files: ['*.config.{js,mjs,ts}', 'vitest.setup.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },

  // Ignore patterns (ganti .eslintignore di flat config)
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'dist/**',
      'out/**',
      'public/**',
      '*.min.js',
    ],
  },
];
```

### Scripts di package.json

```json
{
  "scripts": {
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "lint:check": "next lint --max-warnings=0"
  }
}
```

### Tips: Rules yang Sering Bikin Kaget Tapi Penting

```typescript
// @typescript-eslint/no-floating-promises — sering lupa di-await

// ❌ ESLint error: floating promise
useEffect(() => {
  fetchData(); // Promise tidak di-await dan tidak di-.catch()
}, []);

// ✅ Benar
useEffect(() => {
  void fetchData(); // void = sengaja ignore promise
  // atau:
  fetchData().catch(console.error);
  // atau kalau mau proper:
  const load = async () => { await fetchData(); };
  void load();
}, []);

// @typescript-eslint/consistent-type-imports — import type

// ❌ Sebelum
import { User, Product } from '@/types';
import type { ButtonProps } from '@/components/Button'; // kadang type, kadang tidak

// ✅ Sesudah (konsisten)
import type { User, Product } from '@/types';
import type { ButtonProps } from '@/components/Button';
```

---

## 3. Prettier: Format Otomatis, Debat Gaya Selesai

### Install

```bash
npm install -D prettier eslint-config-prettier
# eslint-config-prettier: matikan ESLint rules yang konflik dengan Prettier
```

### Konfigurasi

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 90,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",

  "overrides": [
    {
      "files": "*.md",
      "options": {
        "printWidth": 100,
        "proseWrap": "always"
      }
    },
    {
      "files": "*.json",
      "options": {
        "printWidth": 120
      }
    }
  ]
}
```

```text
# .prettierignore
.next
node_modules
dist
out
public
*.min.js
package-lock.json
pnpm-lock.yaml
```

### Integrasi ESLint + Prettier

```javascript
// eslint.config.mjs — tambahkan di bagian paling BAWAH
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // ... semua config sebelumnya ...

  // HARUS di akhir — matikan rules ESLint yang konflik dengan Prettier
  eslintConfigPrettier,
];
```

### Scripts

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### Kenapa Prettier, Bukan ESLint untuk Format?

```
ESLint = Linter: "Kode ini salah secara logika/best practice"
Prettier = Formatter: "Kode ini ditulis ulang supaya konsisten"

Keduanya fokus yang berbeda — pakailah keduanya:
→ ESLint: logic errors, best practices, potential bugs
→ Prettier: indentation, quotes, trailing commas, line breaks

Jangan konfigurasi ESLint untuk format (no-extra-semi, indent, dsb)
→ Gunakan eslint-config-prettier untuk matikan rules tersebut
```

---

## 4. Husky + lint-staged: Auto Lint Sebelum Commit

### Kenapa Ini Perlu?

```
Workflow tanpa Husky:
1. Developer nulis kode
2. Developer lupa jalankan lint
3. Push ke repo
4. CI/CD merah karena lint error
5. Push lagi dengan fix
6. History commit kotor, waktu terbuang

Workflow dengan Husky:
1. Developer nulis kode
2. git commit → Husky aktif otomatis
3. lint-staged jalankan lint hanya di file yang berubah
4. Kalau ada error → commit gagal, developer fix dulu
5. Commit bersih, CI/CD hijau
```

### Setup

```bash
# Install
npm install -D husky lint-staged

# Inisialisasi Husky (buat folder .husky/)
npx husky init

# Kalau sudah ada .git: install hooks
npm run prepare
```

Tambahkan `prepare` script yang otomatis jalan setelah `npm install`:

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

### Git Hooks

```bash
# .husky/pre-commit — jalan sebelum SETIAP commit
npx lint-staged

# .husky/commit-msg — validasi format commit message
npx --no -- commitlint --edit $1
```

Pastikan file executable:
```bash
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

### Konfigurasi lint-staged

```javascript
// lint-staged.config.mjs
export default {
  // TypeScript + TSX: lint dan format
  '*.{ts,tsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
  ],

  // JavaScript biasa
  '*.{js,jsx,mjs,cjs}': [
    'eslint --fix',
    'prettier --write',
  ],

  // JSON, CSS, Markdown: format saja
  '*.{json,css,scss,md,mdx}': [
    'prettier --write',
  ],
};
```

### Cara Bypass (Darurat Saja!)

```bash
# Kalau benar-benar perlu commit tanpa lint (misalnya WIP):
git commit -m "wip: setup" --no-verify

# JANGAN jadikan kebiasaan — ini mengalahkan tujuan Husky
```

---

## 5. Conventional Commits: Commit Message yang Bermakna

### Masalah dengan Commit Message yang Buruk

```bash
# ❌ Commit history tidak informatif
git log --oneline
abc1234 fix
def5678 update
ghi9012 asdf
jkl3456 ok
mno7890 done

# Pertanyaan: apa yang berubah 3 minggu lalu? Tidak tahu.
# Harus buka setiap commit satu per satu.

# ✅ Conventional Commits — informasi lengkap sekilas
git log --oneline
abc1234 feat(auth): add Google OAuth login
def5678 fix(cart): total price not updating after quantity change
ghi9012 refactor(api): centralize error handling in apiFetch
jkl3456 docs: update environment variable setup guide
mno7890 chore(deps): upgrade tanstack-query to v6
```

### Format Conventional Commits

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types yang umum dipakai:**

```
feat     → Fitur baru yang visible ke user
fix      → Bug fix
refactor → Perubahan kode tanpa mengubah behavior (tidak feat, tidak fix)
docs     → Perubahan dokumentasi saja
style    → Format, whitespace — tidak ada perubahan logic
test     → Tambah atau ubah test
chore    → Tooling, dependency update, config — tidak mempengaruhi production code
perf     → Improvement performa
ci       → Perubahan CI/CD config
build    → Perubahan build system atau external dependencies
revert   → Revert commit sebelumnya
```

**Scope (opsional tapi sangat membantu):**

```
feat(auth): ...          → fitur di area auth
fix(cart): ...           → bug di area cart
refactor(api): ...       → refactoring di api layer
test(LoginForm): ...     → test untuk LoginForm
chore(deps): ...         → dependency-related
```

**Contoh nyata:**

```bash
# Fitur baru
git commit -m "feat(products): add infinite scroll to product listing"
git commit -m "feat(auth): implement magic link login"
git commit -m "feat(checkout): add promo code validation"

# Bug fix
git commit -m "fix(search): debounce not working on mobile"
git commit -m "fix(modal): focus trap not resetting after close"
git commit -m "fix(cart): duplicate items when clicking add quickly"

# Refactoring
git commit -m "refactor(auth): extract token refresh logic to useTokenRefresh hook"
git commit -m "refactor: centralize API error types"

# Dengan body (untuk perubahan yang perlu penjelasan lebih)
git commit -m "fix(auth): session not persisting after page refresh

Previously, token was stored in memory only. Now using httpOnly cookie
via the /api/auth/session endpoint.

Resolves: #234"

# Breaking change — tambahkan ! dan BREAKING CHANGE footer
git commit -m "feat(api)!: change product ID format from number to UUID

BREAKING CHANGE: All endpoints now expect UUID strings instead of
integer IDs. Update all API calls to use the new format.

Migration guide: docs/migration/v2.md"
```

### Setup commitlint

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

```javascript
// commitlint.config.mjs
export default {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Type harus lowercase
    'type-case': [2, 'always', 'lower-case'],
    // Type tidak boleh kosong
    'type-empty': [2, 'never'],
    // Type harus dari daftar yang diizinkan
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'docs', 'style', 'test', 'chore', 'perf', 'ci', 'build', 'revert'],
    ],
    // Subject tidak boleh kosong
    'subject-empty': [2, 'never'],
    // Subject tidak boleh diakhiri titik
    'subject-full-stop': [2, 'never', '.'],
    // Panjang header maksimum 100 karakter
    'header-max-length': [2, 'always', 100],
    // Scope harus lowercase kalau ada
    'scope-case': [1, 'always', 'lower-case'],
  },
};
```

### Bonus: Commitizen — Helper Interaktif

Kalau tim sering lupa format:

```bash
npm install -D commitizen cz-conventional-changelog

# package.json
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  },
  "scripts": {
    "commit": "cz"
  }
}
```

```bash
# Pakai npm run commit → wizard interaktif muncul
# Pilih type, isi scope, isi description
# Lebih mudah untuk pemula
```

---

## 6. Git Workflow: GitHub Flow yang Simpel tapi Efektif

### Kenapa Bukan Git Flow?

```
Git Flow: main → develop → feature branches → release branches → hotfix
→ Kompleks, banyak long-lived branches
→ Cocok untuk proyek dengan release cycle terpisah
→ Overkill untuk web app yang deploy continuous

GitHub Flow: main → feature branches → merge via PR
→ Simpel, clean
→ Deploy setiap merge ke main
→ Cocok untuk 90% web/SaaS project
```

### GitHub Flow Step by Step

```bash
# ─── MULAI FITUR BARU ─────────────────────────────────────

# 1. Pastikan main terbaru
git checkout main
git pull origin main

# 2. Buat branch dengan nama deskriptif
# Format: <type>/<ticket-or-short-description>
git checkout -b feat/google-oauth-login
git checkout -b fix/cart-total-calculation
git checkout -b refactor/centralize-api-errors
git checkout -b docs/update-env-setup

# 3. Kerjakan — commit kecil dan sering
git add src/lib/auth.ts src/app/api/auth/[...nextauth]/route.ts
git commit -m "feat(auth): add NextAuth config with Google provider"

git add src/components/LoginForm.tsx
git commit -m "feat(auth): update LoginForm to show Google OAuth button"

git add src/app/(auth)/login/page.tsx
git commit -m "feat(auth): add redirect to dashboard after OAuth login"

# ─── SIAP UNTUK REVIEW ──────────────────────────────────

# 4. Push branch
git push -u origin feat/google-oauth-login

# 5. Buat Pull Request di GitHub
# → Title: "feat(auth): Add Google OAuth login"
# → Description: apa yang berubah, screenshot kalau ada UI change, cara test
# → Assign reviewer
# → Link ke issue kalau ada

# ─── SETELAH PR DI-APPROVE ──────────────────────────────

# 6. Merge ke main (via GitHub UI — squash merge atau merge commit)
# Squash merge = semua commit di branch jadi satu commit di main (clean history)
# Merge commit = semua commit masuk (lebih detail tapi lebih noisy)

# 7. Delete branch setelah merge
git branch -d feat/google-oauth-login
git push origin --delete feat/google-oauth-login
```

### Naming Convention untuk Branch

```bash
# Format: <type>/<description-kebab-case>
# Opsional: tambah ticket number

feat/user-profile-page
feat/PROJ-123-user-profile-page   # dengan ticket number

fix/login-redirect-loop
fix/PROJ-456-login-redirect-loop

refactor/extract-auth-hooks
docs/add-deployment-guide
chore/upgrade-nextjs-15
hotfix/critical-payment-bug       # untuk bug production yang urgent
```

### Aturan yang Harus Disepakati Tim

```
✅ Yang harus dilakukan:
→ Branch dari main yang sudah di-pull terbaru
→ Branch name deskriptif dan lowercase kebab-case
→ Commit kecil-kecil dengan pesan yang jelas
→ Selalu buat PR sebelum merge ke main
→ Minta review minimal 1 orang
→ Delete branch setelah merge
→ Pull main sebelum mulai branch baru

❌ Yang tidak boleh dilakukan:
→ Commit langsung ke main (protect branch di repo settings!)
→ Branch yang hidup lebih dari seminggu tanpa merge
→ Force push ke branch yang di-review orang lain
→ Merge PR tanpa approval
→ Commit banyak hal sekaligus dalam satu commit besar
```

### PR Description Template

Simpan ini di `.github/pull_request_template.md`:

```markdown
## Apa yang Berubah?
<!-- Jelaskan perubahan yang dibuat -->

## Kenapa Perubahan Ini Diperlukan?
<!-- Context dan motivasi -->

## Cara Test
<!-- Step-by-step cara reviewer bisa verify perubahan ini -->
1. 
2. 
3. 

## Screenshots (kalau ada perubahan UI)
<!-- Before/after screenshot -->

## Checklist
- [ ] Sudah test secara manual
- [ ] Test sudah ditambahkan/diupdate
- [ ] Tidak ada console.log yang tertinggal
- [ ] Dokumentasi diupdate (kalau perlu)
- [ ] Breaking change sudah didokumentasi

## Related Issues
<!-- Closes #123 -->
```

---

## 7. Environment Variables di Next.js dengan Validasi Zod

### Hierarki File .env di Next.js

```bash
# Urutan precedence (yang paling bawah = prioritas tertinggi):
.env                  # Default, semua environment. Di-commit ke git
.env.local            # Override lokal. TIDAK di-commit (ada di .gitignore)
.env.development      # Hanya saat NODE_ENV=development
.env.development.local # Local override untuk development
.env.test             # Hanya saat NODE_ENV=test (Vitest/Jest)
.env.test.local       # Local override untuk test
.env.production       # Hanya saat NODE_ENV=production
.env.production.local # Local override untuk production (sangat jarang)
```

### Konvensi Penamaan

```bash
# NEXT_PUBLIC_ prefix = tersedia di BROWSER (client-side)
# Ingat: nilai ini BAKED IN saat build time — bukan runtime!
NEXT_PUBLIC_APP_URL=https://tokobaju.id
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...  # ⚠️ Akan terlihat di source code!

# Tanpa prefix = hanya tersedia di SERVER (API routes, Server Components, Server Actions)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-super-secret
STRIPE_SECRET_KEY=sk_live_...
SENTRY_DSN=https://...@sentry.io/...
```

### Template .env Files

```bash
# .env.example — di-commit ke git, sebagai dokumentasi variabel yang diperlukan
# Isi dengan nilai placeholder/kosong — JANGAN isi nilai asli!

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MyApp

# Database
DATABASE_URL=

# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payment (Stripe)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email
RESEND_API_KEY=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# Feature Flags
NEXT_PUBLIC_ENABLE_DARK_MODE=true
```

```bash
# .env.local — TIDAK di-commit (ada di .gitignore), berisi nilai asli

NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=MyApp Dev

DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev

NEXTAUTH_SECRET=local-dev-secret-ganti-ini-di-production
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Validasi Environment Variables dengan Zod

Tanpa validasi, app akan crash dengan pesan error yang tidak jelas saat env var missing.

```typescript
// lib/env.ts — validasi di satu tempat, dipakai di mana-mana
import { z } from 'zod';

// ─── Schema untuk SERVER-SIDE env vars ────────────────────────────
const serverEnvSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL harus berupa URL yang valid'),

  // Auth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET harus minimal 32 karakter'),
  NEXTAUTH_URL: z.string().url(),

  // Google OAuth (opsional — hanya kalau fitur ini dipakai)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z
    .string()
    .startsWith('sk_', 'STRIPE_SECRET_KEY harus dimulai dengan "sk_"'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET harus dimulai dengan "whsec_"'),

  // Email
  RESEND_API_KEY: z.string().startsWith('re_'),

  // Monitoring (opsional di development)
  SENTRY_DSN: z.string().url().optional(),
});

// ─── Schema untuk CLIENT-SIDE env vars ────────────────────────────
// Hanya NEXT_PUBLIC_ variables
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .startsWith('pk_', 'Publishable key harus dimulai dengan "pk_"'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_ENABLE_DARK_MODE: z
    .string()
    .transform(v => v === 'true')
    .default('false'),
});

// ─── Parsing dan Validasi ────────────────────────────────────────
function parseEnv() {
  // Server env: hanya parse di server (tidak di browser)
  const serverResult = serverEnvSchema.safeParse(process.env);
  if (!serverResult.success && typeof window === 'undefined') {
    console.error('❌ Environment variables tidak valid:');
    console.error(serverResult.error.flatten().fieldErrors);
    throw new Error(
      '❌ Environment variables tidak valid. Cek .env.local kamu.\n' +
      JSON.stringify(serverResult.error.flatten().fieldErrors, null, 2)
    );
  }

  // Client env: bisa diparse di mana saja
  const clientResult = clientEnvSchema.safeParse({
    // Harus eksplisit karena Next.js mengganti NEXT_PUBLIC_ saat build
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_ENABLE_DARK_MODE: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE,
  });

  if (!clientResult.success) {
    throw new Error(
      '❌ Client environment variables tidak valid:\n' +
      JSON.stringify(clientResult.error.flatten().fieldErrors, null, 2)
    );
  }

  return {
    server: serverResult.success ? serverResult.data : ({} as z.infer<typeof serverEnvSchema>),
    client: clientResult.data,
  };
}

const envData = parseEnv();

// Export yang aman dan typed
export const env = {
  // Server (jangan akses di client component!)
  DATABASE_URL:        envData.server.DATABASE_URL,
  NEXTAUTH_SECRET:     envData.server.NEXTAUTH_SECRET,
  NEXTAUTH_URL:        envData.server.NEXTAUTH_URL,
  GOOGLE_CLIENT_ID:    envData.server.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: envData.server.GOOGLE_CLIENT_SECRET,
  STRIPE_SECRET_KEY:   envData.server.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: envData.server.STRIPE_WEBHOOK_SECRET,
  RESEND_API_KEY:      envData.server.RESEND_API_KEY,
  SENTRY_DSN:          envData.server.SENTRY_DSN,
  NODE_ENV:            envData.server.NODE_ENV,
  isDevelopment:       envData.server.NODE_ENV === 'development',
  isProduction:        envData.server.NODE_ENV === 'production',
  isTest:              envData.server.NODE_ENV === 'test',

  // Client (aman diakses dari mana saja)
  APP_URL:             envData.client.NEXT_PUBLIC_APP_URL,
  APP_NAME:            envData.client.NEXT_PUBLIC_APP_NAME,
  STRIPE_PUBLIC_KEY:   envData.client.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  PUBLIC_SENTRY_DSN:   envData.client.NEXT_PUBLIC_SENTRY_DSN,
  DARK_MODE_ENABLED:   envData.client.NEXT_PUBLIC_ENABLE_DARK_MODE,
};

// Type export untuk dipakai di tempat lain
export type Env = typeof env;
```

### Cara Pakai yang Benar

```typescript
// ✅ Gunakan env object, bukan process.env langsung
import { env } from '@/lib/env';

// Di Server Component, API route, atau Server Action:
async function getProducts() {
  const db = createClient(env.DATABASE_URL);
  return db.query('SELECT * FROM products');
}

// Di Client Component:
function SupportInfo() {
  return <p>Hubungi {env.APP_NAME} support</p>;
}

// ❌ Jangan akses process.env langsung
// (tidak ada type safety, tidak ada validasi)
const dbUrl = process.env.DATABASE_URL; // TypeScript: string | undefined
```

### Validasi di Server Startup (instrumentation.ts)

```typescript
// instrumentation.ts — jalan di startup server, sebelum request apapun
export async function register() {
  // Import env untuk trigger validasi di startup
  // Kalau ada env var yang missing → server crash dengan pesan jelas
  // Daripada crash saat handling request pertama user
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/env');
  }
}
```

---

## 8. Path Aliases TypeScript

### Masalah: Import Hell

```typescript
// ❌ Relative imports yang panjang dan rapuh
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { formatPrice } from '../../../../lib/utils/currency';
import type { Product } from '../../../types/product';

// Kalau folder dipindahkan → semua import harus diupdate satu per satu
```

### Setup Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],

      // Opsional: alias yang lebih spesifik untuk sering dipakai
      "@/components/*": ["./components/*"],
      "@/hooks/*":      ["./hooks/*"],
      "@/lib/*":        ["./lib/*"],
      "@/types/*":      ["./types/*"],
      "@/stores/*":     ["./stores/*"],
      "@/styles/*":     ["./styles/*"],
      "@/config/*":     ["./config/*"]
    }
  }
}
```

```javascript
// next.config.ts — Next.js biasanya sudah auto-detect dari tsconfig.json
// Tapi kalau tidak, tambahkan ini:
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // sudah stable di Next.js 14+
  },
};

export default nextConfig;
```

```javascript
// vitest.config.ts — alias harus juga didefinisikan di Vitest
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

### Penggunaan

```typescript
// ✅ Setelah setup path aliases
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/lib/utils/currency';
import type { Product } from '@/types/product';
import { env } from '@/lib/env';

// Tidak peduli file ini ada di mana — tinggal ganti struktur folder
// tanpa update semua import!
```

### Struktur Folder yang Disarankan

```
/                        ← root (tsconfig baseUrl)
├── app/                 ← Next.js App Router
│   ├── (auth)/
│   ├── (dashboard)/
│   └── api/
├── components/
│   ├── ui/              ← Komponen UI primitif (Button, Input, Modal)
│   ├── forms/           ← Komponen form (LoginForm, ProfileForm)
│   ├── layouts/         ← Layout komponen (Sidebar, Header)
│   └── features/        ← Komponen domain-specific (ProductCard, CartDrawer)
├── hooks/               ← Custom hooks (useAuth, useDebounce)
├── lib/                 ← Utility libraries (api-client, logger, env)
│   ├── api-client.ts
│   ├── env.ts
│   ├── logger.ts
│   └── utils/
├── stores/              ← State management (Zustand stores)
├── types/               ← TypeScript types dan interfaces
│   ├── index.ts         ← Re-export semua types
│   ├── api.ts
│   └── auth.ts
├── config/              ← App configuration (site config, nav links)
└── styles/              ← Global styles, theme tokens
```

---

## 9. VS Code: Extensions dan Settings Penting

### Extensions Wajib

```json
// .vscode/extensions.json — rekomendasi extensions untuk tim
// VS Code akan prompt "Install recommended extensions?" saat buka project
{
  "recommendations": [
    // Core
    "dbaeumer.vscode-eslint",          // ESLint integration
    "esbenp.prettier-vscode",          // Prettier integration
    "bradlc.vscode-tailwindcss",       // Tailwind IntelliSense

    // TypeScript & React
    "ms-vscode.vscode-typescript-next", // Latest TypeScript support
    "dsznajder.es7-react-js-snippets",  // Snippets: rfce, useState, dll

    // Git
    "eamodio.gitlens",                  // Git history, blame, diff
    "mhutchie.git-graph",               // Visual git graph

    // Testing
    "vitest.explorer",                  // Vitest runner di sidebar

    // Productivity
    "github.copilot",                   // AI code completion
    "github.copilot-chat",              // AI chat
    "usernamehw.errorlens",             // Inline error messages
    "christian-kohler.path-intellisense", // Autocomplete file path
    "formulahendry.auto-rename-tag",    // Auto rename HTML closing tag
    "visualstudioexptteam.vscodeintellicode", // AI IntelliSense

    // Accessibility
    "deque-systems.axe-linter",         // Accessibility linting

    // Misc
    "mikestead.dotenv",                 // .env syntax highlighting
    "pkief.material-icon-theme",        // Icon theme
    "mechatroner.rainbow-csv",          // CSV highlighting
  ]
}
```

### Settings Project

```json
// .vscode/settings.json — settings spesifik untuk project ini
// Di-commit ke git supaya semua developer pakai settings yang sama
{
  // ─── Format on Save ──────────────────────────────────────────
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // Override formatter per bahasa
  "[typescript]":     { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]":{ "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[javascript]":     { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]":           { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[markdown]":       { "editor.defaultFormatter": "esbenp.prettier-vscode" },

  // ─── ESLint ──────────────────────────────────────────────────
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  // Auto-fix saat save
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never",  // jangan: konflik dengan ESLint import/order
    "source.removeUnusedImports": "explicit"
  },

  // ─── TypeScript ───────────────────────────────────────────────
  "typescript.preferences.importModuleSpecifier": "non-relative",
  // Pakai TypeScript versi dari project, bukan yang built-in VS Code
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,

  // ─── Editor ──────────────────────────────────────────────────
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.wordWrap": "off",
  "editor.minimap.enabled": false,       // matikan kalau tidak terpakai
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "editor.suggestSelection": "first",
  "editor.inlineSuggest.enabled": true,  // Copilot inline suggestions

  // ─── Files ───────────────────────────────────────────────────
  "files.eol": "\n",                     // LF, bukan CRLF
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "files.autoSave": "onFocusChange",

  // Explorer: sembunyikan folder yang tidak perlu
  "files.exclude": {
    "**/.git": true,
    "**/.next": true,
    "**/node_modules": true,
    "**/.turbo": true
  },

  // ─── Tailwind ────────────────────────────────────────────────
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],   // cva() helper
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],   // cx() helper
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]    // cn() helper
  ],

  // ─── Tailwind ────────────────────────────────────────────────
  "tailwindCSS.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },

  // ─── Git ─────────────────────────────────────────────────────
  "git.autofetch": true,
  "git.confirmSync": false,
  "gitlens.currentLine.enabled": true,   // Tampilkan blame di current line
  "gitlens.hovers.currentLine.over": "line"
}
```

### Snippets yang Berguna

```json
// .vscode/snippets.code-snippets — project-specific snippets
{
  "Next.js Server Component": {
    "prefix": "nsc",
    "body": [
      "interface ${1:Page}Props {",
      "  params: Promise<{ ${2:id}: string }>;",
      "}",
      "",
      "export default async function ${1:Page}({ params }: ${1:Page}Props) {",
      "  const { ${2:id} } = await params;",
      "  $0",
      "}"
    ],
    "description": "Next.js async Server Component"
  },

  "Next.js API Route": {
    "prefix": "nar",
    "body": [
      "import { NextRequest, NextResponse } from 'next/server';",
      "",
      "export async function ${1:GET}(request: NextRequest) {",
      "  try {",
      "    $0",
      "    return NextResponse.json({ success: true });",
      "  } catch (error) {",
      "    return NextResponse.json(",
      "      { error: 'Internal server error' },",
      "      { status: 500 }",
      "    );",
      "  }",
      "}"
    ],
    "description": "Next.js API Route handler"
  },

  "React Client Component": {
    "prefix": "rcc",
    "body": [
      "'use client';",
      "",
      "interface ${1:Component}Props {",
      "  $2",
      "}",
      "",
      "export function ${1:Component}({ $3 }: ${1:Component}Props) {",
      "  return (",
      "    <div>",
      "      $0",
      "    </div>",
      "  );",
      "}"
    ],
    "description": "React Client Component with TypeScript"
  },

  "Custom Hook": {
    "prefix": "rhook",
    "body": [
      "import { useState, useEffect } from 'react';",
      "",
      "interface Use${1:Hook}Options {",
      "  $2",
      "}",
      "",
      "export function use${1:Hook}($3: Use${1:Hook}Options = {}) {",
      "  $0",
      "}"
    ],
    "description": "Custom React hook template"
  },

  "Zod Schema + Type": {
    "prefix": "zschema",
    "body": [
      "import { z } from 'zod';",
      "",
      "export const ${1:Entity}Schema = z.object({",
      "  $0",
      "});",
      "",
      "export type ${1:Entity} = z.infer<typeof ${1:Entity}Schema>;"
    ],
    "description": "Zod schema with inferred type"
  }
}
```

---

## 10. Bonus: AI Instructions Template untuk Project Next.js

AI coding assistant (GitHub Copilot, Cursor) bekerja jauh lebih baik kalau tahu konteks project kamu secara eksplisit. Ini template yang bisa kamu sesuaikan:

### Untuk GitHub Copilot

```markdown
<!-- .github/copilot-instructions.md -->
# Project: [Nama Project]

## Stack
- Next.js 15 dengan App Router
- TypeScript strict mode
- Tailwind CSS untuk styling
- TanStack Query v5 untuk server state
- Zustand untuk client state
- Zod untuk validasi schema
- Vitest + React Testing Library untuk testing
- Prisma ORM dengan PostgreSQL

## Konvensi Penting

### File Structure
- Server Components default — tambahkan 'use client' hanya kalau perlu
- API routes di app/api/
- Server Actions di app/actions/ atau di-colocate dengan fitur
- Custom hooks di hooks/
- Utility functions di lib/
- Types di types/ (gunakan interface, bukan type alias untuk object shapes)
- Path alias @/ untuk root project

### TypeScript
- Gunakan `interface` untuk object shapes, `type` untuk unions/intersections
- Gunakan `import type` untuk type-only imports
- Hindari `any` — gunakan `unknown` dan type guard kalau perlu
- Union return type untuk fungsi yang bisa gagal:
  `type Result<T> = { success: true; data: T } | { success: false; error: string }`
- Selalu handle semua case di switch dengan exhaustive check

### React & Next.js
- Gunakan `async/await` di Server Components untuk data fetching
- Gunakan TanStack Query untuk data fetching di Client Components
- Gunakan Server Actions untuk form mutations
- Preferensikan `useReducer` daripada multiple `useState` untuk state kompleks
- Definisikan variants di luar komponen untuk menghindari re-creation

### Error Handling
- API calls selalu pakai apiFetch() dari @/lib/api-client.ts
- Server Actions return `{ success: true, data }` atau `{ success: false, error }`
- Validasi input dengan Zod `safeParse()` sebelum proses
- Log errors dengan logError() dari @/lib/logger.ts

### Testing
- Test behavior, bukan implementasi
- Gunakan `getByRole` dan `getByLabelText` — hindari `getByTestId`
- Semua test harus pass `axe` accessibility check
- Mock API calls dengan MSW, bukan mock fetch langsung
- Format describe block: `describe('ComponentName', () => { describe('skenario', () => { it('behavior yang ditest', ...) }) })`

### Accessibility
- Semua elemen interaktif harus bisa diakses keyboard
- Ikon murni dekoratif pakai `aria-hidden="true"`
- Form errors menggunakan `role="alert"` dan terhubung via `aria-describedby`
- Heading hierarchy tidak boleh skip level

### Commit Messages
- Format Conventional Commits: `type(scope): description`
- Types: feat, fix, refactor, docs, test, chore, perf

## Yang Tidak Boleh Dilakukan
- Jangan pakai `class` component (kecuali Error Boundary)
- Jangan akses `process.env` langsung — import dari @/lib/env.ts
- Jangan commit console.log ke production code
- Jangan gunakan `!` (non-null assertion) tanpa komentar kenapa aman
- Jangan import tipe dengan regular import — gunakan `import type`
```

### Untuk Cursor (.cursorrules)

```
# Cursor Rules — [Nama Project]

## Tech Stack
Next.js 15 App Router, TypeScript strict, Tailwind CSS, TanStack Query v5, 
Zustand, Zod, Vitest + RTL, Prisma + PostgreSQL

## Core Principles
1. Server Components by default — 'use client' hanya kalau benar-benar perlu
2. TypeScript strict — no any, use unknown + type guards
3. Test behavior dengan RTL, bukan implementasi
4. Error handling eksplisit menggunakan union return types
5. WCAG 2.1 AA accessibility compliance

## Code Style
- interface > type alias untuk object shapes
- import type untuk type-only imports
- Zod untuk semua input validation (API, forms, env vars)
- apiFetch() dari @/lib/api-client.ts untuk semua HTTP calls
- logError() dari @/lib/logger.ts untuk semua error logging
- env dari @/lib/env.ts untuk semua environment variables

## Component Rules
- Satu komponen per file
- Named exports, bukan default export untuk komponen (kecuali pages)
- Props interface di file yang sama dengan komponen
- Variants dan static data di luar komponen, bukan di dalam render

## Testing Rules
- Describe structure: describe(Component) > describe(scenario) > it(behavior)
- Pakai userEvent dari @testing-library/user-event, bukan fireEvent
- Setiap komponen harus punya axe accessibility test
- Mock via MSW handlers di test/mocks/handlers.ts

## File Naming
- Components: PascalCase.tsx
- Hooks: camelCase.ts (prefix use)
- Utils: camelCase.ts
- Types: camelCase.ts
- API routes: route.ts
- Pages: page.tsx

## Forbidden
- process.env langsung (gunakan @/lib/env.ts)
- console.log di production code
- any type
- Non-null assertion (!) tanpa justifikasi
- Inline styles (kecuali dynamic values yang tidak bisa Tailwind)
- Default export untuk non-page components
```

---

## Setup Checklist: Project Baru dari Nol

Simpan sebagai `SETUP.md` di root project untuk onboarding:

```bash
# ─── 1. Clone dan install ──────────────────────────────────────
git clone <repo>
cd <project>
npm install

# ─── 2. Setup env vars ─────────────────────────────────────────
cp .env.example .env.local
# Edit .env.local dengan nilai yang benar

# ─── 3. Verifikasi tools ────────────────────────────────────────
npm run lint           # Harus: tidak ada error
npm run format:check   # Harus: tidak ada file yang perlu diformat
npm run test:run       # Harus: semua test hijau

# ─── 4. Verifikasi Husky terpasang ───────────────────────────────
ls .husky/             # Harus ada: pre-commit, commit-msg

# ─── 5. Test coba commit ────────────────────────────────────────
git checkout -b test/setup-verification
echo "# test" >> TEST.md
git add TEST.md
git commit -m "chore: verify tooling setup"   # Harus sukses
git commit -m "test commit"                    # Harus GAGAL (format salah)
git checkout main
git branch -D test/setup-verification

# ─── 6. Install VS Code extensions ─────────────────────────────
# VS Code akan prompt untuk install .vscode/extensions.json
# Atau: Cmd+Shift+P → "Show Recommended Extensions"
```

---

## Penutup

Tooling yang bagus itu kayak rem di mobil — tidak bikin kamu lebih cepat, tapi bikin kamu bisa pergi lebih jauh dengan lebih aman.

Investasi 2-3 jam setup tooling di awal project akan saving kamu:
- Peberdebatan style yang tidak produktif
- Bug yang masuk ke main karena tidak ada guard
- Waktu yang terbuang untuk trace "apa yang berubah kapan"
- Onboarding lambat untuk developer baru

```
Priority kalau setup bertahap:
Week 1: Prettier + ESLint + VS Code settings
         → Konsistensi kode langsung hari pertama

Week 2: Husky + lint-staged + commitlint
         → Tidak ada lagi "lupa lint sebelum push"

Week 3: Zod env validation + path aliases
         → Type-safe config, import yang bersih

Ongoing: Refine rules ESLint sesuai kebutuhan tim
          Tambah snippets sesuai pattern yang sering dipakai
```

Tooling bukan tujuan — ini sarana supaya kamu dan tim bisa fokus ke hal yang penting: membangun produk yang berguna.
