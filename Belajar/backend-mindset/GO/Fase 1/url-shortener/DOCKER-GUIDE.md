# 🐳 Docker Quick Start Guide

## 🎯 Cara Termudah - Pakai Docker Compose

### ✅ Requirement
- Docker sudah terinstall
- Docker Compose sudah terinstall

Cek dengan:
```bash
docker --version
docker-compose --version
```

---

## 🚀 Jalankan Aplikasi (1 Command!)

### Opsi 1: Pakai Script (Paling Mudah)
```bash
chmod +x run.sh
./run.sh
```

### Opsi 2: Manual
```bash
# Build dan start semua services
docker-compose up --build -d
```

Selesai! 🎉 Aplikasi dan database langsung jalan di:
- **API**: http://localhost:3000
- **Database**: localhost:5432

---

## 🧪 Test Aplikasi

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

**4. Test Redirect** (ganti `abc123` dengan short_code dari response)
```bash
curl -L http://localhost:3000/r/abc123
```

---

## 📋 Command Docker Compose

### Lihat Logs
```bash
# Semua services
docker-compose logs -f

# Hanya aplikasi
docker-compose logs -f app

# Hanya database
docker-compose logs -f postgres
```

### Stop Aplikasi
```bash
docker-compose down
```

### Restart Aplikasi
```bash
docker-compose restart
```

### Rebuild Aplikasi (setelah ubah code)
```bash
docker-compose up --build -d
```

### Stop + Hapus Data Database
```bash
docker-compose down -v
```

### Lihat Status
```bash
docker-compose ps
```

---

## 🔧 Troubleshooting

### Port 3000 sudah dipakai
Ubah port di `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Akses via localhost:8080
```

### Port 5432 sudah dipakai
Ubah port PostgreSQL:
```yaml
ports:
  - "5433:5432"  # Database di port 5433
```

### Lihat error di logs
```bash
docker-compose logs app
```

### Masuk ke container untuk debug
```bash
# Masuk ke aplikasi
docker exec -it url-shortener-api sh

# Masuk ke database
docker exec -it url-shortener-db psql -U postgres -d url_shortener
```

---

## 🛑 Stop & Cleanup

**Stop saja (data tetap ada):**
```bash
docker-compose down
```

**Stop + Hapus semua (termasuk data database):**
```bash
docker-compose down -v
docker system prune -a
```

---

## 📦 Struktur Docker

```
url-shortener/
├── Dockerfile              # Build aplikasi Go
├── docker-compose.yml      # Orchestration app + database
├── .dockerignore           # Files yang diabaikan saat build
└── run.sh                  # Script untuk start semuanya
```

### Apa yang Terjadi Saat `docker-compose up`:

1. ✅ Build Docker image aplikasi Go
2. ✅ Start PostgreSQL container
3. ✅ Tunggu PostgreSQL ready (health check)
4. ✅ Start aplikasi Go
5. ✅ Auto-migrate database schema
6. ✅ API ready di http://localhost:3000

**Semua otomatis!** Tidak perlu setup manual.

---

## 🎓 Development Workflow

### 1. Ubah Code
Edit file `.go` yang mau diubah

### 2. Rebuild & Restart
```bash
docker-compose up --build -d
```

### 3. Test
```bash
curl http://localhost:3000/api/urls
```

### 4. Lihat Logs
```bash
docker-compose logs -f app
```

---

## ✅ Keuntungan Pakai Docker

✔️ **No Setup Manual** - Tidak perlu install PostgreSQL, Go, dll  
✔️ **Konsisten** - Same environment di semua komputer  
✔️ **Isolated** - Tidak bentrok dengan aplikasi lain  
✔️ **Easy Cleanup** - `docker-compose down` langsung bersih  
✔️ **Production-like** - Environment mendekati production  

---

## 📝 Next Steps

Setelah aplikasi jalan:
1. ✅ Test semua endpoint dengan curl atau Postman
2. ✅ Baca kode di `cmd/api/main.go`
3. ✅ Pahami flow: Handler → Service → Repository
4. ✅ Coba ubah code dan rebuild
5. ✅ Tambah fitur baru!

**Happy Coding!** 🚀
