# Membangun Weather App dari Nol: React + TypeScript + Fetch API

> **Prerequisite:** Sudah baca [A_todo-app-project.md](./A_todo-app-project.md) — khususnya custom hook pattern dan localStorage. Di project ini kita naik level lagi: belajar fetch data dari API eksternal yang sesungguhnya, lengkap dengan typing response, loading state, dan error handling yang proper.

---

## Daftar Isi

1. [Overview & Cara Dapat API Key Gratis](#1-overview--cara-dapat-api-key-gratis)
2. [Struktur Folder Project](#2-struktur-folder-project)
3. [Setup Project & Environment Variable](#3-setup-project--environment-variable)
4. [Typing: Interface & API Response](#4-typing-interface--api-response)
5. [Custom Hook: useWeather](#5-custom-hook-useweather)
6. [Komponen: SearchBar](#6-komponen-searchbar)
7. [Komponen: WeatherCard](#7-komponen-weathercard)
8. [Komponen: ForecastList & ForecastItem](#8-komponen-forecastlist--forecastitem)
9. [Komponen: LoadingSpinner & ErrorMessage](#9-komponen-loadingspinner--errormessage)
10. [Komponen: SearchHistory](#10-komponen-searchhistory)
11. [App.tsx: Merakit Semuanya](#11-apptsx-merakit-semuanya)
12. [Styling dengan CSS Modules](#12-styling-dengan-css-modules)
13. [Checklist Akhir & Ide Pengembangan](#13-checklist-akhir--ide-pengembangan)

---

## 1. Overview & Cara Dapat API Key Gratis

### Apa yang Kita Bangun?

Sebuah **Weather App** yang connect ke API sungguhan — bukan data dummy. Kamu ketik nama kota, app fetch data cuaca real-time dari OpenWeatherMap, dan tampilkan kondisi cuaca sekarang plus forecast 5 hari ke depan.

Ini adalah project yang paling dekat dengan cara kerja app production: ada API key yang harus dijaga, ada asynchronous data fetching, ada loading/error state, dan ada response JSON dari server external yang perlu ditype dengan benar.

### Cara Dapat API Key OpenWeatherMap (Gratis)

Ikuti langkah ini — butuh waktu sekitar 5 menit:

1. Buka **[openweathermap.org](https://openweathermap.org)**
2. Klik **"Sign In"** → lalu **"Create an Account"** (gratis)
3. Isi form registrasi, verifikasi email
4. Setelah login, klik nama kamu di pojok kanan atas → **"My API Keys"**
5. Copy API key yang sudah ada (atau generate yang baru)
6. **Penting:** API key baru butuh **10–60 menit** untuk aktif. Jangan panik kalau langsung dapat error 401.

**Free tier limits:**
- 60 calls/minute
- 1.000.000 calls/bulan
- Akses ke: Current Weather API + 5 Day Forecast API

Lebih dari cukup untuk project ini.

### Tampilan Akhir

```
┌─────────────────────────────────────────────────────────────┐
│  ⛅ Weather App                                              │
│  ─────────────────────────────────────────────────────────  │
│  [  🔍 Cari kota, misal: Jakarta...              ] [Cari]   │
│  Riwayat: Jakarta  Bandung  Surabaya                        │
│  ─────────────────────────────────────────────────────────  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │        🌤️  Jakarta, ID                                │  │
│  │        32°C   Partly Cloudy                           │  │
│  │   Terasa: 36°C  💧 78%  💨 12 km/h  👁 10 km        │  │
│  └───────────────────────────────────────────────────────┘  │
│  PRAKIRAAN 5 HARI                                           │
│  Sen  26°/33°  🌤️   Sel  25°/32°  ⛅                       │
│  Rab  27°/34°  ☀️   Kam  26°/33°  🌦️   Jum  25°/31°  🌧️   │
└─────────────────────────────────────────────────────────────┘
```

### Yang Akan Kamu Pelajari

| Konsep | Implementasi |
|---|---|
| **Environment variables** | `.env` + Vite's `import.meta.env` — menyimpan API key dengan aman |
| **Typing API response** | Interface dari dokumentasi JSON yang sesungguhnya |
| **Fetch + TypeScript** | Async/await, generic `fetch`, type assertion untuk response |
| **Custom hook async** | `useWeather` — mengelola `data`, `isLoading`, `error` dalam satu hook |
| **AbortController** | Cancel fetch yang sedang berjalan ketika user search lagi |
| **Error handling** | HTTP error vs network error vs "kota tidak ditemukan" |
| **localStorage** | Simpan history pencarian |
| **`useCallback` + deps** | Fetch function yang stable, tidak berubah setiap render |

---

## 2. Struktur Folder Project

```
weather-app/
  src/
  ├── components/
  │   ├── SearchBar/
  │   │   ├── SearchBar.tsx
  │   │   └── SearchBar.module.css
  │   ├── WeatherCard/
  │   │   ├── WeatherCard.tsx
  │   │   └── WeatherCard.module.css
  │   ├── ForecastList/
  │   │   ├── ForecastList.tsx
  │   │   └── ForecastList.module.css
  │   ├── ForecastItem/
  │   │   ├── ForecastItem.tsx
  │   │   └── ForecastItem.module.css
  │   ├── SearchHistory/
  │   │   ├── SearchHistory.tsx
  │   │   └── SearchHistory.module.css
  │   ├── LoadingSpinner/
  │   │   └── LoadingSpinner.tsx
  │   └── ErrorMessage/
  │       ├── ErrorMessage.tsx
  │       └── ErrorMessage.module.css
  │
  ├── hooks/
  │   ├── useWeather.ts          ← fetch current + forecast, loading, error
  │   └── useSearchHistory.ts    ← localStorage search history
  │
  ├── services/
  │   └── weatherApi.ts          ← Semua API call di satu tempat
  │
  ├── types/
  │   └── weather.types.ts       ← Semua interface & types
  │
  ├── utils/
  │   ├── formatters.ts          ← formatTemp, formatWind, formatDate
  │   └── weatherIcons.ts        ← Mapping kode cuaca → emoji/icon
  │
  ├── App.tsx
  ├── App.module.css
  └── main.tsx
```

---

## 3. Setup Project & Environment Variable

### 3.1 Buat Project

```bash
npm create vite@latest weather-app -- --template react-ts
cd weather-app
npm install
```

### 3.2 Setup Environment Variable

API key **tidak boleh** di-hardcode langsung di kode. Kenapa? Karena kalau kamu upload ke GitHub, semua orang bisa lihat dan pakai API key-mu.

Solusinya: simpan di file `.env` yang masuk ke `.gitignore`.

```bash
# Buat file .env di root project (sejajar dengan package.json)
touch .env
```

```bash
# .env
# Prefix VITE_ wajib agar Vite expose ke client-side code
VITE_OPENWEATHER_API_KEY=paste_api_key_kamu_di_sini
VITE_OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5
```

```bash
# .env.example — commit file ini ke git sebagai template (tanpa nilai asli)
VITE_OPENWEATHER_API_KEY=your_api_key_here
VITE_OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5
```

```gitignore
# .gitignore — pastikan .env tidak ikut di-commit
.env
.env.local
.env.*.local
```

**Cara akses di kode:**

```ts
// Vite expose env vars via import.meta.env
const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

// TypeScript perlu tahu tipenya — tambah ke vite-env.d.ts
```

```ts
// src/vite-env.d.ts — tambahkan interface ini
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENWEATHER_API_KEY:  string;
  readonly VITE_OPENWEATHER_BASE_URL: string;
  // Tambah variabel lain di sini kalau ada
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

Sekarang `import.meta.env.VITE_OPENWEATHER_API_KEY` punya type `string` — tidak lagi `any`.

---

## 4. Typing: Interface & API Response

Ini bagian yang paling berbeda dari project sebelumnya — kita harus typing **response dari API external** yang kita tidak kontrol bentuknya.

### 4.1 Cara Membaca Dokumentasi OpenWeatherMap dan Buat Interface

Buka: [openweathermap.org/current](https://openweathermap.org/current#JSON) — di sana ada contoh JSON response. Dari situ kita buat interface.

> **Pro tip:** Saat kamu bekerja dengan API yang tidak diketahui strukturnya, selalu buka endpoint langsung di browser dulu (atau gunakan Postman/Thunder Client), lihat JSON-nya, baru tulis interface-nya. Jangan buat interface dari ingatan.

### 4.2 Types untuk Current Weather API

```ts
// src/types/weather.types.ts

// ── Raw API response dari OpenWeatherMap ─────────────────────
// Kita ketik hanya field yang kita butuhkan (tidak perlu semua field)
// Tanda "?" artinya field bisa tidak ada di response

// Response /weather endpoint
export interface OWMCurrentWeatherResponse {
  name:    string;           // "Jakarta"
  sys: {
    country: string;         // "ID"
    sunrise: number;         // Unix timestamp
    sunset:  number;         // Unix timestamp
  };
  coord: {
    lat: number;
    lon: number;
  };
  weather: Array<{
    id:          number;     // Kode cuaca, misal: 800 = clear sky
    main:        string;     // "Clear", "Clouds", "Rain"
    description: string;     // "clear sky", "overcast clouds"
    icon:        string;     // "01d", "02n" — kode icon OWM
  }>;
  main: {
    temp:       number;      // Suhu dalam Kelvin atau °C (tergantung units param)
    feels_like: number;
    temp_min:   number;
    temp_max:   number;
    humidity:   number;      // Persen, 0–100
    pressure:   number;      // hPa
  };
  wind: {
    speed: number;           // m/s
    deg:   number;           // Arah angin dalam derajat
    gust?: number;           // Hembusan angin (opsional)
  };
  visibility: number;        // Meter, max 10000
  clouds: {
    all: number;             // Persentase awan, 0–100
  };
  dt: number;                // Unix timestamp data diambil
  timezone: number;          // Offset dari UTC dalam detik
  cod: number;               // HTTP-like status code (200 = OK, 404 = not found)
}

// ── Response /forecast endpoint (5 hari, per 3 jam) ──────────
export interface OWMForecastItem {
  dt:      number;           // Unix timestamp
  dt_txt:  string;           // "2026-01-15 12:00:00"
  main: {
    temp:       number;
    feels_like: number;
    temp_min:   number;
    temp_max:   number;
    humidity:   number;
  };
  weather: Array<{
    id:          number;
    main:        string;
    description: string;
    icon:        string;
  }>;
  wind: {
    speed: number;
    deg:   number;
  };
  clouds: {
    all: number;
  };
  pop: number;               // Probability of precipitation, 0–1
}

export interface OWMForecastResponse {
  list:   OWMForecastItem[];
  city: {
    name:    string;
    country: string;
    timezone: number;
  };
  cod: string;               // "200"
  cnt: number;               // Jumlah item (biasanya 40 = 5 hari × 8 per hari)
}

// ── Error response dari OWM ────────────────────────────────────
export interface OWMErrorResponse {
  cod:     number | string;  // 400, 404, "401"
  message: string;           // "city not found", "Invalid API key"
}

// ── Tipe yang sudah "diproses" untuk UI ──────────────────────
// Kita transform raw API response ke bentuk yang lebih bersih
// Alasannya: kalau API berubah, kita hanya ubah transformer, bukan semua component

export interface CurrentWeather {
  cityName:    string;
  country:     string;
  temp:        number;       // Sudah dalam °C (bulat)
  feelsLike:   number;
  tempMin:     number;
  tempMax:     number;
  humidity:    number;
  windSpeed:   number;       // m/s → kita convert ke km/h di formatter
  windDeg:     number;
  visibility:  number;       // Meter
  description: string;
  icon:        string;
  weatherCode: number;
  isDay:       boolean;      // Berdasarkan sunrise/sunset
  sunrise:     number;
  sunset:      number;
}

export interface DailyForecast {
  date:       string;        // "Senin", "Selasa", dll.
  dateShort:  string;        // "Sen", "Sel", dll.
  tempMin:    number;
  tempMax:    number;
  description: string;
  icon:        string;
  humidity:   number;
  rainChance: number;        // 0–100 (dari pop * 100)
}

// ── State hook useWeather ─────────────────────────────────────
export type WeatherStatus = "idle" | "loading" | "success" | "error";

export interface WeatherState {
  status:   WeatherStatus;
  current:  CurrentWeather | null;
  forecast: DailyForecast[];
  error:    string | null;
  city:     string;           // Kota yang sedang ditampilkan
}
```

> **Kenapa Buat Dua Lapisan Type (raw API + processed)?**
>
> Ini adalah pattern **data transformation layer**. Raw API response dari OWM itu field-nya campur Bahasa Inggris dan naming convention yang tidak konsisten (`temp_min`, `feels_like`, `dt_txt`...). Kalau kita langsung pakai di component, semua component harus tahu detail API.
>
> Dengan transform ke `CurrentWeather` dan `DailyForecast`, component hanya tahu tentang business logic — bukan implementasi detail API. Kalau suatu saat kita ganti API, cukup update bagian transformer saja.

### 4.3 Utilities: Formatters & Icons

```ts
// src/utils/formatters.ts

// Kelvin ke Celsius (kalau API dipanggil tanpa ?units=metric)
// Kita pakai units=metric jadi ini tidak dipakai, tapi bagus untuk tahu
export function kelvinToCelsius(k: number): number {
  return Math.round(k - 273.15);
}

// Bulatkan suhu
export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°C`;
}

// m/s ke km/h
export function msToKmh(ms: number): number {
  return Math.round(ms * 3.6);
}

// Derajat angin ke arah mata angin
export function degToCompass(deg: number): string {
  const dirs = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
  const idx  = Math.round(deg / 45) % 8;
  return dirs[idx];
}

// Unix timestamp ke nama hari
export function unixToDay(unix: number, timezone: number, short = false): string {
  // Gunakan timezone offset dari response supaya nama hari akurat sesuai lokasi
  const date  = new Date((unix + timezone) * 1000);
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const localDate = new Date(utcMs);

  return localDate.toLocaleDateString("id-ID", {
    weekday: short ? "short" : "long",
    timeZone: "UTC",
  });
}

// Format visibility: meter ke km
export function formatVisibility(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

// Format waktu dari unix timestamp
export function formatTime(unix: number): string {
  return new Date(unix * 1000).toLocaleTimeString("id-ID", {
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
```

```ts
// src/utils/weatherIcons.ts
// Map kode cuaca OWM ke emoji yang ekspresif
// Lihat daftar kode lengkap: openweathermap.org/weather-conditions

export function getWeatherEmoji(code: number, isDay = true): string {
  // Thunderstorm: 200–232
  if (code >= 200 && code < 300) return "⛈️";

  // Drizzle: 300–321
  if (code >= 300 && code < 400) return "🌦️";

  // Rain: 500–531
  if (code === 500) return "🌧️";
  if (code === 501) return "🌧️";
  if (code >= 502 && code <= 504) return "⛈️";
  if (code === 511) return "🌨️"; // freezing rain
  if (code >= 520 && code < 600) return "🌧️"; // shower rain

  // Snow: 600–622
  if (code >= 600 && code < 700) return "❄️";

  // Atmosphere: 700–781 (fog, haze, dust...)
  if (code === 741) return "🌫️"; // fog
  if (code === 721) return "🌫️"; // haze
  if (code >= 700 && code < 800) return "🌫️";

  // Clear: 800
  if (code === 800) return isDay ? "☀️" : "🌙";

  // Clouds: 801–804
  if (code === 801) return isDay ? "🌤️" : "🌙";
  if (code === 802) return "⛅";
  if (code === 803) return "🌥️";
  if (code === 804) return "☁️";

  return "🌡️"; // fallback
}

// Background gradient berdasarkan kondisi cuaca
export function getWeatherGradient(code: number, isDay: boolean): string {
  if (!isDay) return "linear-gradient(135deg, #0f0c29, #302b63, #24243e)";

  if (code === 800) return "linear-gradient(135deg, #56ccf2, #2f80ed)"; // Clear
  if (code <= 804 && code >= 801) return "linear-gradient(135deg, #757f9a, #d7dde8)"; // Cloudy
  if (code >= 200 && code < 300) return "linear-gradient(135deg, #373b44, #4286f4)"; // Thunder
  if (code >= 500 && code < 600) return "linear-gradient(135deg, #4b6cb7, #182848)"; // Rain
  if (code >= 600 && code < 700) return "linear-gradient(135deg, #e0eafc, #cfdef3)"; // Snow
  if (code >= 700 && code < 800) return "linear-gradient(135deg, #c9d6df, #e2ebf0)"; // Fog

  return "linear-gradient(135deg, #56ccf2, #2f80ed)"; // default
}
```

---

## 5. Custom Hook: useWeather

Ini adalah hook yang paling kompleks yang pernah kita tulis. Di sini ada async fetching, error handling, AbortController, dan semua state management-nya.

```ts
// src/hooks/useWeather.ts
import { useState, useCallback, useRef } from "react";
import type {
  WeatherState,
  CurrentWeather,
  DailyForecast,
  OWMCurrentWeatherResponse,
  OWMForecastResponse,
} from "../types/weather.types";
import { fetchCurrentWeather, fetchForecast } from "../services/weatherApi";
import { unixToDay, msToKmh } from "../utils/formatters";

// ── State awal ────────────────────────────────────────────────
const initialState: WeatherState = {
  status:   "idle",
  current:  null,
  forecast: [],
  error:    null,
  city:     "",
};

// ── Transform: raw API response → cleaned data untuk UI ──────
function transformCurrentWeather(raw: OWMCurrentWeatherResponse): CurrentWeather {
  const weather  = raw.weather[0];
  const isDay    = raw.dt > raw.sys.sunrise && raw.dt < raw.sys.sunset;

  return {
    cityName:    raw.name,
    country:     raw.sys.country,
    temp:        Math.round(raw.main.temp),
    feelsLike:   Math.round(raw.main.feels_like),
    tempMin:     Math.round(raw.main.temp_min),
    tempMax:     Math.round(raw.main.temp_max),
    humidity:    raw.main.humidity,
    windSpeed:   msToKmh(raw.wind.speed),
    windDeg:     raw.wind.deg,
    visibility:  raw.visibility,
    description: weather.description,
    icon:        weather.icon,
    weatherCode: weather.id,
    isDay,
    sunrise:     raw.sys.sunrise,
    sunset:      raw.sys.sunset,
  };
}

function transformForecast(raw: OWMForecastResponse): DailyForecast[] {
  const timezone = raw.city.timezone;

  // OWM forecast memberikan data per 3 jam — kita perlu group per hari
  // Ambil satu data per hari (preferensi: tengah hari atau yang pertama)
  const dailyMap = new Map<string, typeof raw.list>();

  for (const item of raw.list) {
    // Gunakan tanggal sebagai key untuk grouping
    const date = item.dt_txt.split(" ")[0]; // "2026-01-15"
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date)!.push(item);
  }

  // Convert Map ke array DailyForecast
  const forecasts: DailyForecast[] = [];

  for (const [, items] of dailyMap) {
    if (forecasts.length >= 5) break; // Maksimal 5 hari

    // Cari item tengah hari (12:00) atau ambil yang pertama
    const midday = items.find((i) => i.dt_txt.includes("12:00:00")) ?? items[0];

    // Hitung min/max dari semua item hari itu
    const temps    = items.map((i) => i.main.temp);
    const tempMin  = Math.round(Math.min(...temps));
    const tempMax  = Math.round(Math.max(...temps));

    // Ambil rainChance tertinggi dari hari itu
    const maxRainChance = Math.round(Math.max(...items.map((i) => i.pop)) * 100);

    forecasts.push({
      date:        unixToDay(midday.dt, timezone, false),
      dateShort:   unixToDay(midday.dt, timezone, true),
      tempMin,
      tempMax,
      description: midday.weather[0].description,
      icon:        midday.weather[0].icon,
      humidity:    midday.main.humidity,
      rainChance:  maxRainChance,
    });
  }

  return forecasts;
}

// ── Return type hook ──────────────────────────────────────────
export interface UseWeatherReturn extends WeatherState {
  search: (city: string) => void;
}

// ── Hook ──────────────────────────────────────────────────────
export function useWeather(): UseWeatherReturn {
  const [state, setState] = useState<WeatherState>(initialState);

  // AbortController ref — cancel fetch lama kalau search lagi sebelum selesai
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (city: string): Promise<void> => {
    const trimmedCity = city.trim();
    if (!trimmedCity) return;

    // ── Cancel fetch sebelumnya kalau masih jalan ─────────
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // ── Buat AbortController baru ────────────────────────
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // ── Set loading state ─────────────────────────────────
    setState({
      status:   "loading",
      current:  null,
      forecast: [],
      error:    null,
      city:     trimmedCity,
    });

    try {
      // ── Fetch current weather dan forecast secara paralel ─
      // Promise.all: keduanya berjalan bersamaan, lebih cepat daripada sequential
      const [currentRaw, forecastRaw] = await Promise.all([
        fetchCurrentWeather(trimmedCity, controller.signal),
        fetchForecast(trimmedCity, controller.signal),
      ]);

      // ── Guard: cek kalau sudah di-abort ──────────────────
      if (controller.signal.aborted) return;

      // ── Transform dan set success state ──────────────────
      const current  = transformCurrentWeather(currentRaw);
      const forecast = transformForecast(forecastRaw);

      setState({
        status:   "success",
        current,
        forecast,
        error:    null,
        city:     current.cityName, // Pakai nama kota dari API (lebih akurat)
      });

    } catch (err) {
      // ── Jangan set error kalau request di-abort (user search lagi) ─
      if (err instanceof DOMException && err.name === "AbortError") return;

      // ── Handle error ──────────────────────────────────────
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan.";

      setState((prev) => ({
        ...prev,
        status: "error",
        error:  errorMessage,
      }));
    }
  }, []); // Tidak ada dependency — fungsi ini tidak berubah

  return { ...state, search };
}
```

---

## Service Layer: weatherApi.ts

Hook memanggil `fetchCurrentWeather` dan `fetchForecast` dari service. Kita pisahkan supaya kalau mau ganti API, hanya ubah file ini.

```ts
// src/services/weatherApi.ts
import type {
  OWMCurrentWeatherResponse,
  OWMForecastResponse,
  OWMErrorResponse,
} from "../types/weather.types";

const API_KEY  = import.meta.env.VITE_OPENWEATHER_API_KEY;
const BASE_URL = import.meta.env.VITE_OPENWEATHER_BASE_URL;

// ── Custom Error class untuk API errors ───────────────────────
export class WeatherApiError extends Error {
  constructor(
    message: string,
    public readonly code: number | string
  ) {
    super(message);
    this.name = "WeatherApiError";
  }
}

// ── Generic fetch wrapper ─────────────────────────────────────
// Menangani HTTP error dan memetakan ke pesan yang ramah user
async function weatherFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    // Parse error response dari OWM untuk pesan yang lebih baik
    const errorBody = await response.json() as OWMErrorResponse;

    // Map kode error OWM ke pesan Bahasa Indonesia
    const errorMessages: Record<number, string> = {
      401: "API key tidak valid atau belum aktif. Tunggu 10–60 menit setelah daftar.",
      404: "Kota tidak ditemukan. Coba nama kota yang berbeda.",
      429: "Terlalu banyak request. Coba lagi dalam beberapa saat.",
    };

    const message = errorMessages[response.status]
      ?? errorBody.message
      ?? `Error ${response.status}: Gagal mengambil data cuaca.`;

    throw new WeatherApiError(message, response.status);
  }

  // Response bertipe unknown → kita assert ke tipe yang diinginkan
  // Ini acceptable karena kita sudah definisikan interface yang sesuai dokumentasi
  return (await response.json()) as T;
}

// ── Fetch current weather ─────────────────────────────────────
export async function fetchCurrentWeather(
  city: string,
  signal?: AbortSignal
): Promise<OWMCurrentWeatherResponse> {
  const params = new URLSearchParams({
    q:      city,
    appid:  API_KEY,
    units:  "metric",  // Celsius, bukan Kelvin
    lang:   "id",      // Deskripsi cuaca dalam Bahasa Indonesia
  });

  return weatherFetch<OWMCurrentWeatherResponse>(
    `${BASE_URL}/weather?${params}`,
    signal
  );
}

// ── Fetch 5-day forecast ──────────────────────────────────────
export async function fetchForecast(
  city: string,
  signal?: AbortSignal
): Promise<OWMForecastResponse> {
  const params = new URLSearchParams({
    q:     city,
    appid: API_KEY,
    units: "metric",
    lang:  "id",
    cnt:   "40",       // Maksimum: 5 hari × 8 data per hari
  });

  return weatherFetch<OWMForecastResponse>(
    `${BASE_URL}/forecast?${params}`,
    signal
  );
}
```

---

## Search History Hook

```ts
// src/hooks/useSearchHistory.ts
import { useState, useCallback } from "react";

const STORAGE_KEY  = "weather-app:search-history" as const;
const MAX_HISTORY  = 5; // Simpan 5 pencarian terakhir

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export interface UseSearchHistoryReturn {
  history:        string[];
  addToHistory:   (city: string) => void;
  removeFromHistory: (city: string) => void;
  clearHistory:   () => void;
}

export function useSearchHistory(): UseSearchHistoryReturn {
  const [history, setHistory] = useState<string[]>(loadHistory);

  const saveHistory = useCallback((newHistory: string[]): void => {
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  }, []);

  // Tambah ke history — taruh di depan, hapus duplikat, max 5
  const addToHistory = useCallback((city: string): void => {
    const normalized = city.trim();
    if (!normalized) return;

    setHistory((prev) => {
      // Hapus kalau sudah ada (case-insensitive)
      const filtered = prev.filter(
        (h) => h.toLowerCase() !== normalized.toLowerCase()
      );
      // Tambah di depan, potong ke MAX_HISTORY
      const newHistory = [normalized, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const removeFromHistory = useCallback((city: string): void => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h !== city);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return filtered;
    });
  }, []);

  const clearHistory = useCallback((): void => {
    saveHistory([]);
  }, [saveHistory]);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
```

---

## 6. Komponen: SearchBar

```tsx
// src/components/SearchBar/SearchBar.tsx
import { useState, FormEvent, ChangeEvent, KeyboardEvent } from "react";
import styles from "./SearchBar.module.css";

interface SearchBarProps {
  onSearch:    (city: string) => void;
  isLoading:   boolean;
  initialValue?: string;
}

function SearchBar({ onSearch, isLoading, initialValue = "" }: SearchBarProps) {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setValue(e.target.value);
  };

  // Clear input dengan tombol Escape
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Escape") {
      setValue("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} role="search">
      <div className={styles.inputWrapper}>
        {/* Search icon */}
        <svg
          className={styles.searchIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="search"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Cari kota, misal: Jakarta, Bandung, Surabaya..."
          className={styles.input}
          disabled={isLoading}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Cari kota"
        />

        {/* Clear button — hanya tampil kalau ada teks */}
        {value && !isLoading && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => setValue("")}
            aria-label="Hapus teks pencarian"
          >
            ×
          </button>
        )}
      </div>

      <button
        type="submit"
        className={styles.searchButton}
        disabled={!value.trim() || isLoading}
        aria-label="Cari cuaca"
      >
        {isLoading ? (
          <span className={styles.buttonSpinner} aria-hidden="true" />
        ) : (
          "Cari"
        )}
      </button>
    </form>
  );
}

export default SearchBar;
```

```css
/* src/components/SearchBar/SearchBar.module.css */
.form {
  display: flex;
  gap: 0.6rem;
}

.inputWrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.searchIcon {
  position: absolute;
  left: 0.875rem;
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
  flex-shrink: 0;
}

.input {
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 2.75rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.95rem;
  color: #1e293b;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}

.input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px #60a5fa20;
}

.input:disabled {
  background: #f8fafc;
  cursor: not-allowed;
}

/* Remove default browser search input clear button */
.input::-webkit-search-cancel-button {
  display: none;
}

.clearButton {
  position: absolute;
  right: 0.75rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: #e2e8f0;
  color: #64748b;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0;
  transition: background 0.15s;
}

.clearButton:hover {
  background: #cbd5e1;
}

.searchButton {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.15s, transform 0.1s;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.searchButton:hover:not(:disabled) {
  background: #2563eb;
}

.searchButton:active:not(:disabled) {
  transform: scale(0.97);
}

.searchButton:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

/* Spinner di dalam tombol */
.buttonSpinner {
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
```

---

## 7. Komponen: WeatherCard

```tsx
// src/components/WeatherCard/WeatherCard.tsx
import type { CurrentWeather } from "../../types/weather.types";
import { getWeatherEmoji, getWeatherGradient } from "../../utils/weatherIcons";
import { formatTemp, formatVisibility, degToCompass, formatTime } from "../../utils/formatters";
import styles from "./WeatherCard.module.css";

interface WeatherCardProps {
  weather: CurrentWeather;
}

function WeatherCard({ weather }: WeatherCardProps) {
  const emoji    = getWeatherEmoji(weather.weatherCode, weather.isDay);
  const gradient = getWeatherGradient(weather.weatherCode, weather.isDay);
  const isLight  = weather.isDay && weather.weatherCode > 700; // Gradient warna terang

  return (
    <div
      className={styles.card}
      style={{ background: gradient }}
      aria-label={`Cuaca di ${weather.cityName}: ${weather.temp}°C, ${weather.description}`}
    >
      {/* Header: kota + negara */}
      <div className={styles.header}>
        <div>
          <h2 className={`${styles.cityName} ${isLight ? styles.textDark : styles.textLight}`}>
            📍 {weather.cityName}, {weather.country}
          </h2>
          <p className={`${styles.description} ${isLight ? styles.textMuted : styles.textMutedLight}`}>
            {weather.description.charAt(0).toUpperCase() + weather.description.slice(1)}
          </p>
        </div>

        {/* Emoji cuaca besar */}
        <span className={styles.weatherEmoji} aria-hidden="true">
          {emoji}
        </span>
      </div>

      {/* Suhu utama */}
      <div className={styles.tempSection}>
        <span className={`${styles.tempMain} ${isLight ? styles.textDark : styles.textLight}`}>
          {weather.temp}°C
        </span>
        <div className={`${styles.tempRange} ${isLight ? styles.textMuted : styles.textMutedLight}`}>
          <span>↑ {weather.tempMax}°</span>
          <span> / </span>
          <span>↓ {weather.tempMin}°</span>
          <span> · </span>
          <span>Terasa {weather.feelsLike}°C</span>
        </div>
      </div>

      {/* Detail cuaca: 4 metric */}
      <div className={styles.details}>
        <DetailItem
          icon="💧"
          label="Kelembaban"
          value={`${weather.humidity}%`}
          isLight={isLight}
        />
        <DetailItem
          icon="💨"
          label={`Angin ${degToCompass(weather.windDeg)}`}
          value={`${weather.windSpeed} km/j`}
          isLight={isLight}
        />
        <DetailItem
          icon="👁️"
          label="Jarak Pandang"
          value={formatVisibility(weather.visibility)}
          isLight={isLight}
        />
        <DetailItem
          icon="🌅"
          label="Matahari Terbit"
          value={formatTime(weather.sunrise)}
          isLight={isLight}
        />
      </div>
    </div>
  );
}

// Sub-component kecil untuk satu metric
interface DetailItemProps {
  icon:    string;
  label:   string;
  value:   string;
  isLight: boolean;
}

function DetailItem({ icon, label, value, isLight }: DetailItemProps) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailIcon} aria-hidden="true">{icon}</span>
      <span className={`${styles.detailLabel} ${isLight ? styles.textMuted : styles.textMutedLight}`}>
        {label}
      </span>
      <span className={`${styles.detailValue} ${isLight ? styles.textDark : styles.textLight}`}>
        {value}
      </span>
    </div>
  );
}

export default WeatherCard;
```

```css
/* src/components/WeatherCard/WeatherCard.module.css */
.card {
  border-radius: 20px;
  padding: 1.75rem;
  color: #fff;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  transition: background 0.5s ease;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.cityName {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
}

.description {
  font-size: 0.9rem;
  text-transform: capitalize;
}

.weatherEmoji {
  font-size: 3.5rem;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.2));
}

.tempSection {
  margin-bottom: 1.5rem;
}

.tempMain {
  font-size: 4rem;
  font-weight: 800;
  letter-spacing: -2px;
  line-height: 1;
  display: block;
  margin-bottom: 0.25rem;
}

.tempRange {
  font-size: 0.85rem;
}

.details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
  background: rgba(255,255,255,0.12);
  border-radius: 14px;
  padding: 1rem;
  backdrop-filter: blur(8px);
}

.detailItem {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.detailIcon {
  font-size: 1.1rem;
  margin-bottom: 0.1rem;
}

.detailLabel {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detailValue {
  font-size: 0.9rem;
  font-weight: 600;
}

/* Text color variants */
.textLight  { color: #fff; }
.textDark   { color: #1e293b; }
.textMuted  { color: rgba(30, 41, 59, 0.65); }
.textMutedLight { color: rgba(255, 255, 255, 0.75); }
```

---

## 8. Komponen: ForecastList & ForecastItem

```tsx
// src/components/ForecastItem/ForecastItem.tsx
import { memo } from "react";
import type { DailyForecast } from "../../types/weather.types";
import { getWeatherEmoji } from "../../utils/weatherIcons";
import styles from "./ForecastItem.module.css";

interface ForecastItemProps {
  forecast: DailyForecast;
  isFirst:  boolean; // Hari ini — tampilkan label "Hari ini"
}

const ForecastItem = memo(function ForecastItem({ forecast, isFirst }: ForecastItemProps) {
  const emoji = getWeatherEmoji(
    // Konversi string icon OWM ke code — kita pakai emoji manual
    // Icon "01d" = clear sky, kita cukup tampilkan emoji dari description
    800 // Simplified: gunakan weatherCode dari parent kalau ada
  );

  return (
    <li className={styles.item}>
      {/* Nama hari */}
      <span className={styles.day}>
        {isFirst ? "Hari ini" : forecast.dateShort}
      </span>

      {/* Rain chance */}
      {forecast.rainChance > 0 && (
        <span className={styles.rain}>
          💧 {forecast.rainChance}%
        </span>
      )}

      {/* Icon cuaca */}
      <img
        src={`https://openweathermap.org/img/wn/${forecast.icon}@2x.png`}
        alt={forecast.description}
        className={styles.icon}
        loading="lazy"
        width="40"
        height="40"
      />

      {/* Range suhu */}
      <div className={styles.temps}>
        <span className={styles.tempMax}>{forecast.tempMax}°</span>
        <span className={styles.tempMin}>{forecast.tempMin}°</span>
      </div>
    </li>
  );
});

export default ForecastItem;
```

```css
/* src/components/ForecastItem/ForecastItem.module.css */
.item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.875rem 0.5rem;
  flex: 1;
  min-width: 0;
}

.day {
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  text-transform: capitalize;
  text-align: center;
}

.rain {
  font-size: 0.7rem;
  color: #3b82f6;
  height: 16px;
  display: flex;
  align-items: center;
}

.icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.temps {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.tempMax {
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}

.tempMin {
  font-size: 0.78rem;
  color: #94a3b8;
}
```

```tsx
// src/components/ForecastList/ForecastList.tsx
import type { DailyForecast } from "../../types/weather.types";
import ForecastItem from "../ForecastItem/ForecastItem";
import styles from "./ForecastList.module.css";

interface ForecastListProps {
  forecasts: DailyForecast[];
}

function ForecastList({ forecasts }: ForecastListProps) {
  if (forecasts.length === 0) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Prakiraan 5 Hari</h3>
      <ul className={styles.list} aria-label="Prakiraan cuaca 5 hari ke depan">
        {forecasts.map((forecast, index) => (
          <ForecastItem
            key={forecast.date + index}
            forecast={forecast}
            isFirst={index === 0}
          />
        ))}
      </ul>
    </div>
  );
}

export default ForecastList;
```

```css
/* src/components/ForecastList/ForecastList.module.css */
.container {
  background: #fff;
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}

.list {
  display: flex;
  padding: 0;
  margin: 0;
  list-style: none;
  divide-x: 1px solid #f1f5f9;
}

/* Garis pemisah antar item */
.list > li + li {
  border-left: 1px solid #f1f5f9;
}
```

---

## 9. Komponen: LoadingSpinner & ErrorMessage

```tsx
// src/components/LoadingSpinner/LoadingSpinner.tsx
import styles from "./LoadingSpinner.module.css";

interface LoadingSpinnerProps {
  message?: string;
}

function LoadingSpinner({ message = "Mengambil data cuaca..." }: LoadingSpinnerProps) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden="true">
        <div className={styles.bounce1} />
        <div className={styles.bounce2} />
        <div className={styles.bounce3} />
      </div>
      <p className={styles.message}>{message}</p>
    </div>
  );
}

export default LoadingSpinner;
```

```css
/* src/components/LoadingSpinner/LoadingSpinner.module.css */
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

/* Three bouncing dots */
.spinner {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.bounce1, .bounce2, .bounce3 {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #3b82f6;
  animation: bounce 1.2s ease-in-out infinite;
}

.bounce2 { animation-delay: 0.15s; }
.bounce3 { animation-delay: 0.3s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
  40%           { transform: scale(1.1); opacity: 1;   }
}

.message {
  font-size: 0.85rem;
  color: #94a3b8;
}
```

```tsx
// src/components/ErrorMessage/ErrorMessage.tsx
import styles from "./ErrorMessage.module.css";

interface ErrorMessageProps {
  message:   string;
  onRetry?:  () => void;
}

function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  // Tentukan icon berdasarkan jenis error
  const icon = message.includes("tidak ditemukan") ? "🔍"
    : message.includes("API key")                  ? "🔑"
    : message.includes("internet") ||
      message.includes("network") ||
      message.includes("fetch")                    ? "📡"
    : "⚠️";

  return (
    <div className={styles.container} role="alert" aria-live="assertive">
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={styles.retryButton}
          aria-label="Coba lagi"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
```

```css
/* src/components/ErrorMessage/ErrorMessage.module.css */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1.5rem;
  background: #fef2f2;
  border: 1.5px solid #fecaca;
  border-radius: 16px;
  text-align: center;
}

.icon {
  font-size: 2.5rem;
  line-height: 1;
}

.message {
  font-size: 0.9rem;
  color: #dc2626;
  max-width: 320px;
  line-height: 1.5;
}

.retryButton {
  padding: 0.5rem 1.5rem;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.15s;
}

.retryButton:hover {
  background: #dc2626;
}
```

---

## 10. Komponen: SearchHistory

```tsx
// src/components/SearchHistory/SearchHistory.tsx
import styles from "./SearchHistory.module.css";

interface SearchHistoryProps {
  history:  string[];
  onSelect: (city: string) => void;
  onRemove: (city: string) => void;
  onClear:  () => void;
}

function SearchHistory({ history, onSelect, onRemove, onClear }: SearchHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Riwayat</span>
        <button
          onClick={onClear}
          className={styles.clearAll}
          aria-label="Hapus semua riwayat"
        >
          Hapus Semua
        </button>
      </div>

      <div className={styles.chips}>
        {history.map((city) => (
          <div key={city} className={styles.chip}>
            {/* Klik nama kota → search */}
            <button
              onClick={() => onSelect(city)}
              className={styles.chipLabel}
              aria-label={`Cari cuaca di ${city}`}
            >
              🕐 {city}
            </button>

            {/* Tombol hapus satu item */}
            <button
              onClick={() => onRemove(city)}
              className={styles.chipRemove}
              aria-label={`Hapus ${city} dari riwayat`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchHistory;
```

```css
/* src/components/SearchHistory/SearchHistory.module.css */
.container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.clearAll {
  font-size: 0.72rem;
  color: #94a3b8;
  background: none;
  border: none;
  text-decoration: underline;
  padding: 0;
  transition: color 0.15s;
}

.clearAll:hover {
  color: #ef4444;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  overflow: hidden;
  transition: border-color 0.15s;
}

.chip:hover {
  border-color: #93c5fd;
}

.chipLabel {
  padding: 0.3rem 0.6rem 0.3rem 0.75rem;
  background: none;
  border: none;
  font-size: 0.8rem;
  color: #475569;
  transition: color 0.15s;
}

.chipLabel:hover {
  color: #3b82f6;
}

.chipRemove {
  padding: 0.3rem 0.5rem;
  background: none;
  border: none;
  border-left: 1px solid #e2e8f0;
  font-size: 1rem;
  color: #94a3b8;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}

.chipRemove:hover {
  background: #fee2e2;
  color: #ef4444;
}
```

---

## 11. App.tsx: Merakit Semuanya

```tsx
// src/App.tsx
import { useEffect } from "react";
import { useWeather } from "./hooks/useWeather";
import { useSearchHistory } from "./hooks/useSearchHistory";
import SearchBar      from "./components/SearchBar/SearchBar";
import WeatherCard    from "./components/WeatherCard/WeatherCard";
import ForecastList   from "./components/ForecastList/ForecastList";
import SearchHistory  from "./components/SearchHistory/SearchHistory";
import LoadingSpinner from "./components/LoadingSpinner/LoadingSpinner";
import ErrorMessage   from "./components/ErrorMessage/ErrorMessage";
import styles from "./App.module.css";

function App() {
  const {
    status,
    current,
    forecast,
    error,
    city,
    search,
  } = useWeather();

  const {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  } = useSearchHistory();

  // ── Saat search berhasil, simpan ke history ───────────────
  useEffect(() => {
    if (status === "success" && current) {
      // Simpan nama kota yang dikembalikan API (bukan input user)
      // Contoh: user ketik "jkt" → API kembalikan "Jakarta" → simpan "Jakarta"
      addToHistory(current.cityName);
    }
  }, [status, current, addToHistory]);

  // ── Handler: pilih dari history ───────────────────────────
  const handleHistorySelect = (historyCity: string): void => {
    search(historyCity);
  };

  // ── Handler: retry setelah error ─────────────────────────
  const handleRetry = (): void => {
    if (city) search(city);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>
            <span aria-hidden="true">⛅</span> Weather App
          </h1>
          <p className={styles.subtitle}>
            Cari cuaca di kota manapun di seluruh dunia.
          </p>
        </header>

        {/* Search area */}
        <div className={styles.searchArea}>
          <SearchBar
            onSearch={search}
            isLoading={status === "loading"}
          />
          <SearchHistory
            history={history}
            onSelect={handleHistorySelect}
            onRemove={removeFromHistory}
            onClear={clearHistory}
          />
        </div>

        {/* Content area */}
        <main className={styles.content} aria-live="polite" aria-atomic="true">
          {/* Loading */}
          {status === "loading" && (
            <LoadingSpinner message={`Mengambil cuaca di ${city}...`} />
          )}

          {/* Error */}
          {status === "error" && error && (
            <ErrorMessage message={error} onRetry={handleRetry} />
          )}

          {/* Success */}
          {status === "success" && current && (
            <div className={styles.weatherContent}>
              <WeatherCard weather={current} />
              <ForecastList forecasts={forecast} />
            </div>
          )}

          {/* Idle — belum ada pencarian */}
          {status === "idle" && (
            <div className={styles.idle}>
              <p className={styles.idleEmoji} aria-hidden="true">🌍</p>
              <p className={styles.idleText}>
                Ketik nama kota di atas untuk melihat cuaca saat ini dan prakiraan 5 hari.
              </p>
              <p className={styles.idleHint}>
                Coba: Jakarta · Bandung · Tokyo · London · New York
              </p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          Data dari{" "}
          <a href="https://openweathermap.org" target="_blank" rel="noopener noreferrer">
            OpenWeatherMap
          </a>
          {" "}· Update setiap 10 menit
        </footer>
      </div>
    </div>
  );
}

export default App;
```

```css
/* src/App.module.css */
.page {
  min-height: 100vh;
  padding: 2rem 1rem 4rem;
}

.container {
  max-width: 560px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.header {
  text-align: center;
}

.title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 0.25rem;
}

.subtitle {
  font-size: 0.875rem;
  color: #64748b;
}

.searchArea {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.content {
  min-height: 200px;
}

.weatherContent {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.idle {
  text-align: center;
  padding: 3rem 1rem;
  color: #94a3b8;
}

.idleEmoji {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}

.idleText {
  font-size: 0.9rem;
  color: #64748b;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.idleHint {
  font-size: 0.8rem;
  color: #94a3b8;
}

.footer {
  text-align: center;
  font-size: 0.75rem;
  color: #94a3b8;
}

.footer a {
  color: #3b82f6;
  text-decoration: none;
}

.footer a:hover {
  text-decoration: underline;
}
```

---

## 12. Alur Data & Penjelasan useCallback

Sebelum lanjut ke checklist, penting untuk paham alur data dan kenapa kita pakai `useCallback` dengan tepat:

```
User ketik kota → klik "Cari"
         │
         ▼
SearchBar.handleSubmit(city)
         │
         ▼
App.search(city)    ← dari useWeather()
         │
         ▼
useWeather.search(city)
    │
    ├─ Abort request sebelumnya (kalau ada)
    ├─ setState({ status: "loading" })
    │
    ├─ Promise.all([
    │      fetchCurrentWeather(city, signal),  ─→ OWM /weather API
    │      fetchForecast(city, signal)          ─→ OWM /forecast API
    │  ])
    │
    ├─ transformCurrentWeather(raw)   → CurrentWeather
    ├─ transformForecast(raw)         → DailyForecast[]
    │
    └─ setState({ status: "success", current, forecast })
              │
              ▼
    App useEffect → addToHistory(cityName)
              │
              ▼
    Re-render semua component dengan data baru
```

### Tentang `useCallback` dan AbortController

```ts
// Kenapa AbortController perlu useRef, bukan useState?
const abortControllerRef = useRef<AbortController | null>(null);

// useRef menyimpan nilai yang TIDAK men-trigger re-render saat berubah
// Kita tidak butuh re-render saat controller berubah — kita hanya butuh referensinya
// Kalau pakai useState, setiap new search → setState(controller) → re-render
// Dengan useRef: tidak ada re-render, tapi nilai tetap persisten antar render
```

---

## 13. Checklist Akhir & Ide Pengembangan

### Checklist Fungsional

**Setup & API Key:**
- [ ] File `.env` sudah dibuat dan API key sudah diisi
- [ ] `vite-env.d.ts` sudah diupdate dengan type untuk env vars
- [ ] `.env` sudah masuk `.gitignore` (cek dengan `git status` — `.env` tidak muncul)

**Search:**
- [ ] Ketik kota → tekan Enter → fetch data
- [ ] Ketik kota → klik tombol "Cari" → fetch data
- [ ] Saat loading, input dan tombol disable
- [ ] Kota tidak valid → pesan error "Kota tidak ditemukan"
- [ ] API key salah → pesan error yang jelas tentang API key
- [ ] Teks di search bar bisa dihapus dengan tombol ×
- [ ] Tekan Escape → input kosong

**WeatherCard:**
- [ ] Nama kota + negara tampil benar
- [ ] Suhu saat ini dalam °C
- [ ] Deskripsi cuaca (dalam Bahasa Indonesia kalau pakai `lang=id`)
- [ ] Feels like, min/max suhu tampil
- [ ] Humidity, kecepatan angin, visibility tampil
- [ ] Background gradient berubah sesuai kondisi cuaca
- [ ] Malam hari tampil dengan gradient gelap

**Forecast:**
- [ ] Tampil 5 hari ke depan
- [ ] Nama hari yang benar (Senin, Selasa, ... atau Hari ini untuk hari pertama)
- [ ] Icon cuaca OWM tampil dengan benar
- [ ] Suhu min/max per hari

**Search History:**
- [ ] Setelah search berhasil, kota ditambah ke history
- [ ] History tampil sebagai chip yang bisa diklik
- [ ] Klik chip → langsung search kota itu
- [ ] Tombol × pada chip → hapus satu item dari history
- [ ] "Hapus Semua" → hapus semua history
- [ ] History tersimpan setelah refresh halaman
- [ ] Tidak ada duplikat di history
- [ ] Maksimum 5 item di history

**Error & Loading:**
- [ ] Loading state tampil dengan animasi (bukan hanya teks statis)
- [ ] Error message berbeda: kota tidak ditemukan vs masalah network vs API key
- [ ] Tombol "Coba Lagi" di error state berfungsi

**Edge Cases:**
- [ ] Search kota yang sama dua kali berturut-turut → tidak ada masalah
- [ ] Ketik cepat dan submit → hanya request terakhir yang diproses (AbortController)
- [ ] Kota dengan nama yang sama di banyak negara (misal: "Paris" → Paris, FR)
- [ ] Kota dengan karakter non-ASCII (misal: "Münich", "São Paulo")

---

### Ide Pengembangan Mandiri

**Level 1 — Tambah Fitur:**
- [ ] **Geolocation** — Tombol "Lokasiku" pakai `navigator.geolocation.getCurrentPosition()` untuk fetch cuaca berdasarkan koordinat GPS
- [ ] **Unit toggle** — Tombol °C / °F, simpan preferensi di localStorage
- [ ] **Refresh button** — Tombol refresh untuk fetch ulang kota yang sedang ditampilkan tanpa typing ulang
- [ ] **Last searched** — Langsung load kota terakhir yang dicari saat app dibuka

**Level 2 — Lebih Dalam:**
- [ ] **Hourly forecast** — Tampilkan prakiraan per jam untuk hari ini (dari data 3-jam OWM)
- [ ] **Weather alerts** — Tampilkan peringatan cuaca ekstrem kalau ada (butuh API plan berbeda)
- [ ] **Multiple cities** — Bisa tambah beberapa kota sekaligus, lihat semua dalam satu dashboard
- [ ] **Animated weather backgrounds** — CSS animation yang berbeda untuk hujan, cerah, badai

**Level 3 — Arsitektur:**
- [ ] **React Query** — Ganti fetch manual dengan `useQuery` dari TanStack Query — handle caching, refetching, stale time otomatis
- [ ] **Error boundary** — Tambah `ErrorBoundary` component untuk handle runtime errors
- [ ] **Vitest + Testing Library** — Tulis test untuk hook `useWeather` dan komponen penting
- [ ] **PWA** — Service worker + manifest agar bisa diinstall sebagai app dan bisa cek cuaca offline (dari cache)

---

### Lesson Learned dari Project Ini

| Yang kamu buat | Prinsip yang dipelajari |
|---|---|
| `vite-env.d.ts` | Selalu type environment variables — jangan biarkan `any` masuk dari `import.meta.env` |
| Interface raw vs processed (`OWMCurrentWeatherResponse` vs `CurrentWeather`) | **Data transformation layer** — isolasi detail API dari business logic |
| `WeatherApiError extends Error` | Custom error class untuk error handling yang lebih spesifik |
| `Promise.all([fetchCurrent, fetchForecast])` | Paralel fetch lebih cepat dari sequential |
| `AbortController` di `useRef` | Cancel request lama — penting untuk search input yang cepat |
| `transformCurrentWeather()` dan `transformForecast()` sebagai pure function | Data transformation yang testable dan terpisah dari hook |
| `lang=id` di API params | Internalisasi — selalu pertimbangkan bahasa end user |

---

*Dokumen ini adalah bagian dari seri **Frontend Mindset**. | TypeScript 5.x + React 18+ + Vite + OpenWeatherMap API*
