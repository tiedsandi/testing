# 🚀 Quick Start Guide - URL Shortener API

## 📋 Apa yang Sudah Dibuat?

Aplikasi URL Shortener API lengkap dengan:

### ✅ Struktur Project
```
url-shortener/
├── cmd/api/main.go                           # Entry point aplikasi
├── internal/
│   ├── config/config.go                      # Configuration management
│   ├── database/postgres.go                  # Database connection
│   ├── entity/short_url.go                   # Entity model
│   ├── repository/shorturl_repository.go     # Data access layer
│   ├── service/shorturl_service.go           # Business logic
│   ├── handler/shorturl_handler.go           # HTTP handlers
│   ├── middleware/
│   │   ├── request_id.go                     # Request ID tracking
│   │   ├── logger.go                         # Request logging
│   │   └── recovery.go                       # Panic recovery
│   └── apperror/error.go                     # Custom error handling
├── .env                                      # Environment variables
├── .env.example                              # Environment template
├── go.mod                                    # Go module file
├── README.md                                 # Dokumentasi lengkap
├── start-db.sh                               # Script start PostgreSQL
└── test-api.sh                               # Script testing API
```

### ✅ Fitur yang Tersedia

1. **Create Short URL** - Convert URL panjang jadi kode 6 karakter
2. **List All URLs** - Lihat semua URL yang pernah dibuat
3. **Get URL by ID** - Detail URL berdasarkan ID
4. **Update URL** - Update original URL atau status aktif
5. **Delete URL** - Soft delete URL
6. **Redirect** - Redirect dari short code ke URL asli + increment counter
7. **Click Tracking** - Automatic click counter
8. **Soft Delete** - Data tidak benar-benar dihapus
9. **Error Handling** - Konsisten error response
10. **Logging** - Structured logging dengan request ID

---

## 🔧 Cara Menjalankan Aplikasi

### **Step 1: Install Dependencies Go**

```bash
cd "/home/topsoul/Desktop/backend-mindset/GO/Fase 1/url-shortener"
go mod download
```

### **Step 2: Start PostgreSQL Database**

Opsi A - Menggunakan script yang sudah disediakan:
```bash
./start-db.sh
```

Opsi B - Manual dengan Docker:
```bash
docker run --name postgres-shortener \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=url_shortener \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### **Step 3: Jalankan Aplikasi**

```bash
go run cmd/api/main.go
```

Output yang diharapkan:
```
🚀 Starting URL Shortener API...
✅ Database connected successfully
Running database migrations...
✅ Database migrations completed
🎧 Server listening on http://localhost:3000
```

### **Step 4: Test API**

Opsi A - Menggunakan script testing:
```bash
./test-api.sh
```

Opsi B - Manual dengan curl:

**1. Health Check**
```bash
curl http://localhost:3000/health
```

**2. Create Short URL**
```bash
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"original_url": "https://www.google.com"}'
```

**3. Get All URLs**
```bash
curl http://localhost:3000/api/urls
```

**4. Test Redirect** (ganti `abc123` dengan short_code dari response di atas)
```bash
curl -L http://localhost:3000/r/abc123
```

**5. Update URL**
```bash
curl -X PUT http://localhost:3000/api/urls/{id} \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

**6. Delete URL**
```bash
curl -X DELETE http://localhost:3000/api/urls/{id}
```

---

## 📚 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/urls` | Create short URL |
| GET | `/api/urls` | Get all URLs |
| GET | `/api/urls/:id` | Get URL by ID |
| PUT | `/api/urls/:id` | Update URL |
| DELETE | `/api/urls/:id` | Delete URL (soft delete) |
| GET | `/r/:short_code` | Redirect to original URL |

---

## 🏗️ Arsitektur Clean Architecture

```
┌─────────────┐
│   Handler   │ ← HTTP Layer (Fiber handlers)
└──────┬──────┘
       │
┌──────▼──────┐
│   Service   │ ← Business Logic Layer
└──────┬──────┘
       │
┌──────▼──────┐
│ Repository  │ ← Data Access Layer
└──────┬──────┘
       │
┌──────▼──────┐
│   Database  │ ← PostgreSQL (GORM)
└─────────────┘
```

**Separation of Concerns:**
- **Handler**: Terima HTTP request, validasi input, kirim response
- **Service**: Business logic, validasi business rules
- **Repository**: Query database, CRUD operations
- **Entity**: Data models

---

## 🛑 Stop Aplikasi & Database

**Stop aplikasi**: Tekan `Ctrl + C`

**Stop & remove PostgreSQL container**:
```bash
docker stop postgres-shortener
docker rm postgres-shortener
```

**Restart database nanti**:
```bash
docker start postgres-shortener
```

---

## 🧪 Testing Examples

### Create Multiple URLs
```bash
# Google
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"original_url": "https://www.google.com"}'

# GitHub
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"original_url": "https://github.com"}'

# Stack Overflow
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"original_url": "https://stackoverflow.com"}'
```

### Test Click Counter
```bash
# Redirect 3 kali
curl -L http://localhost:3000/r/{short_code}
curl -L http://localhost:3000/r/{short_code}
curl -L http://localhost:3000/r/{short_code}

# Check click count
curl http://localhost:3000/api/urls/{id}
# Output: "click_count": 3
```

---

## 🎯 Next Steps - Belajar Lebih Lanjut

1. **Baca kode** - Pahami setiap layer (Handler → Service → Repository)
2. **Modifikasi** - Coba ubah response format atau tambah field baru
3. **Debugging** - Set breakpoint dan trace flow data
4. **Tambah fitur** - Coba implementasi custom short code
5. **Test lebih detail** - Coba berbagai error cases

### Fitur yang Bisa Ditambahkan:
- [ ] Custom short code (user input sendiri)
- [ ] Expiration date untuk URL
- [ ] Pagination untuk list URLs
- [ ] Search & filter
- [ ] QR Code generator
- [ ] Analytics dashboard
- [ ] Rate limiting
- [ ] Redis caching
- [ ] Unit tests

---

## 📖 Teknologi yang Digunakan

- **Go 1.21+** - Programming language
- **Fiber v2** - Web framework (seperti Express.js)
- **GORM** - ORM untuk database
- **PostgreSQL 15** - Relational database
- **Zerolog** - Structured logging
- **Viper** - Configuration management
- **Validator v10** - Input validation
- **UUID** - Unique identifiers

---

## ❓ Troubleshooting

### Error: "failed to connect database"
- Pastikan PostgreSQL running: `docker ps | grep postgres`
- Check port 5432 tidak dipakai aplikasi lain: `lsof -i :5432`

### Error: "port 3000 already in use"
- Kill process yang pakai port 3000: `lsof -ti:3000 | xargs kill -9`
- Atau ubah port di `.env`: `APP_PORT=8080`

### Error: "no such file or directory: .env"
- Pastikan file `.env` ada di root project
- Copy dari template: `cp .env.example .env`

---

## ✅ Checklist Pembelajaran

Setelah menjalankan project ini, pastikan kamu paham:

- [ ] Cara kerja Clean Architecture
- [ ] Flow data dari HTTP request → Handler → Service → Repository → Database
- [ ] Dependency injection manual
- [ ] Error handling yang konsisten
- [ ] Middleware (logger, recovery, request ID)
- [ ] GORM operations (Create, Find, Update, Delete)
- [ ] Soft delete pattern
- [ ] Atomic update (increment click_count)
- [ ] UUID sebagai primary key
- [ ] Environment variables dengan Viper

---

Selamat! 🎉 Kamu sudah punya aplikasi URL Shortener yang fully functional!

**Happy Coding!** 🚀
