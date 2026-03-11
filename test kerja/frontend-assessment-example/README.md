# Frontend Developer Assessment

Assessment untuk posisi Frontend Developer dengan fokus pada React Router (data mode).

## Fitur

✅ Filter wilayah bertingkat (Provinsi → Kota/Kabupaten → Kecamatan)  
✅ State management menggunakan URL parameters (persisten saat refresh)  
✅ Breadcrumb navigation dengan class `breadcrumb`  
✅ Main content menggunakan tag `<main>`  
✅ Combobox dengan name attribute: `province`, `regency`, `district`  
✅ Tombol Reset untuk kembali ke kondisi awal  
✅ React Router dengan data mode (bukan framework)  
✅ Styling dengan Tailwind CSS  

## Teknologi

- React 18
- React Router DOM v6 (data mode)
- Tailwind CSS v4 (dengan @tailwindcss/vite plugin)
- Vite

## Instalasi

```bash
npm install
```

## Development

```bash
npm run dev
```

Aplikasi akan berjalan di http://localhost:5173/

## Build untuk Production

```bash
npm run build
```

Hasil build ada di folder `dist/`

## Preview Production Build

```bash
npm run preview
```

## Data Dummy

Data wilayah Indonesia tersimpan di `/public/data/indonesia_regions.json`. Anda bisa mengganti isinya sesuai kebutuhan.

Format data:
```json
{
  "provinces": [
    { "id": 1, "name": "Kepulauan Riau" },
    { "id": 2, "name": "DKI Jakarta" },
    { "id": 3, "name": "Bali" }
  ],
  "regencies": [
    { "id": 1, "name": "Kota Batam", "province_id": 1 },
    { "id": 2, "name": "Kota Tanjung Pinang", "province_id": 1 },
    { "id": 3, "name": "Jakarta Selatan", "province_id": 2 }
  ],
  "districts": [
    { "id": 1, "name": "Batam Kota", "regency_id": 1 },
    { "id": 2, "name": "Batu Ampar", "regency_id": 1 },
    { "id": 3, "name": "Belakang Padang", "regency_id": 1 }
  ]
}
```

## Cara Kerja

1. **Initial State**: Hanya data Provinsi yang terisi di combobox
2. **Memilih Provinsi**: Data Kota/Kabupaten akan terisi berdasarkan provinsi yang dipilih
3. **Memilih Kota/Kabupaten**: Data Kecamatan akan terisi berdasarkan kota/kabupaten yang dipilih
4. **URL Persistence**: Filter tersimpan di URL, sehingga tidak terpengaruh browser refresh
5. **Reset**: Tombol reset akan menghapus semua filter dan kembali ke kondisi awal

## Deploy

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload folder dist/ ke Netlify
```

### GitHub Pages
```bash
npm run build
# Deploy folder dist/ ke GitHub Pages
```

## Struktur Project

```
src/
├── App.jsx              # Main component dengan filter logic
├── main.jsx             # React Router setup
├── loaders/
│   └── regionLoader.js  # Data loader untuk fetch data
public/
└── data/
    └── indonesia_regions.json  # Dummy data wilayah
```

## Catatan Penting

- Filter menggunakan URL search parameters untuk state persistence
- Data di-fetch melalui React Router loader
- Breadcrumb otomatis update berdasarkan filter yang dipilih
- Combobox disabled jika parent belum dipilih
