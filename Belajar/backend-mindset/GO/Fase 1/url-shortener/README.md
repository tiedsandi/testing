# 🔗 URL Shortener API

URL Shortener API built with Go, Fiber, GORM, and PostgreSQL.

## 🚀 Features

- Create short URLs from long URLs
- Auto-generate 6-character short codes
- Redirect to original URLs
- Track click counts
- Update and soft delete URLs
- Clean architecture with separation of concerns

## 🛠️ Tech Stack

- **Go 1.21+**
- **Fiber** - Web framework
- **GORM** - ORM
- **PostgreSQL** - Database
- **Zerolog** - Structured logging
- **Viper** - Configuration management

## 📋 Prerequisites

- Go 1.21 or higher
- PostgreSQL 15 or higher
- Docker (optional, for running PostgreSQL)

## 🔧 Setup

1. **Clone the repository**
```bash
cd url-shortener
```

2. **Install dependencies**
```bash
go mod download
```

3. **Setup PostgreSQL**

Using Docker:
```bash
docker run --name postgres-shortener \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=url_shortener \
  -p 5432:5432 \
  -d postgres:15-alpine
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env if needed
```

5. **Run the application**
```bash
go run cmd/api/main.go
```

The server will start at `http://localhost:3000`

## 📚 API Endpoints

### Health Check
```
GET /health
```

### URL Management

**Create Short URL**
```
POST /api/urls
Content-Type: application/json

{
  "original_url": "https://example.com/very-long-url"
}
```

**Get All URLs**
```
GET /api/urls
```

**Get URL by ID**
```
GET /api/urls/:id
```

**Update URL**
```
PUT /api/urls/:id
Content-Type: application/json

{
  "original_url": "https://new-url.com",
  "is_active": true
}
```

**Delete URL (Soft Delete)**
```
DELETE /api/urls/:id
```

### Redirect

**Redirect to Original URL**
```
GET /r/:short_code
```

## 🧪 Testing with cURL

```bash
# Create a short URL
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"original_url": "https://google.com"}'

# Test redirect (replace aB3xYz with your short_code)
curl -L http://localhost:3000/r/aB3xYz

# Get all URLs
curl http://localhost:3000/api/urls
```

## 📁 Project Structure

```
url-shortener/
├── cmd/
│   └── api/
│       └── main.go                 # Entry point
├── internal/
│   ├── config/
│   │   └── config.go              # Configuration management
│   ├── database/
│   │   └── postgres.go            # Database connection
│   ├── entity/
│   │   └── short_url.go           # Entity model
│   ├── repository/
│   │   └── shorturl_repository.go # Data access layer
│   ├── service/
│   │   └── shorturl_service.go    # Business logic
│   ├── handler/
│   │   └── shorturl_handler.go    # HTTP handlers
│   ├── middleware/
│   │   ├── logger.go              # Request logging
│   │   ├── recovery.go            # Panic recovery
│   │   └── request_id.go          # Request ID tracking
│   └── apperror/
│       └── error.go               # Custom error types
├── .env                           # Environment variables
├── .env.example                   # Example environment file
├── .gitignore
├── go.mod
├── go.sum
└── README.md
```

## 🏗️ Architecture

This application follows **Clean Architecture** principles:

- **Entity Layer**: Domain models
- **Repository Layer**: Data access abstraction
- **Service Layer**: Business logic
- **Handler Layer**: HTTP request handling
- **Middleware**: Cross-cutting concerns

## 📝 License

MIT
