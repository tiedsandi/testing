# BELAJAR LOGGING + MONITORING DI GO

## 🎯 Tujuan Belajar

Setelah belajar ini, lo bisa:
- ✅ Implement structured logging dengan zerolog (zero allocation, super cepat)
- ✅ Bikin request ID middleware untuk trace request end-to-end
- ✅ Log setiap request dengan method, path, status, latency
- ✅ Bedain log output: pretty print untuk dev, JSON untuk production
- ✅ Handle sensitive data dengan benar (JANGAN log password/token!)
- ✅ Implement file logging dengan rotation pakai lumberjack
- ✅ Bikin health check endpoint yang komprehensif
- ✅ Implement metrics dengan Prometheus untuk monitoring
- ✅ Debug production issues dengan log aggregator

---

## 💡 Konsep + Analogi

### Kenapa Butuh Logging & Monitoring?

**Logging** adalah catatan kejadian di aplikasi lo. **Monitoring** adalah mengawasi kesehatan aplikasi secara real-time.

**Analogi Real Life:**

Bayangin lo punya toko online:
- **Logging**: CCTV rekaman → bisa dilihat ulang pas ada masalah
- **Monitoring**: Security guard lihat CCTV live → langsung tahu pas ada masalah

Tanpa logging: "Eh kok order gagal?" → Gak tahu kenapa, gak ada jejak  
Dengan logging: "Oh error di payment service jam 14:23, request ID: abc-123"

**Analogi dari Next.js/TypeScript yang lo udah kenal:**

```typescript
// Next.js - console.log biasa
console.log('User created:', user.id);
console.log('Payment failed');

// Masalahnya:
// - Tidak terstruktur (susah di-parse)
// - Tidak ada level (debug vs error)
// - Tidak ada timestamp otomatis
// - Tidak ada context (request ID, user ID)
```

```typescript
// Next.js - Winston/Pino (structured logging)
logger.info('User created', { 
  userId: user.id, 
  email: user.email,
  requestId: req.id 
});

logger.error('Payment failed', { 
  userId: user.id, 
  amount: 100000,
  error: err.message,
  requestId: req.id 
});

// Output JSON, mudah di-parse oleh log aggregator
// {"level":"info","userId":123,"email":"test@test.com","requestId":"abc-123","msg":"User created"}
```

**Di Go dengan Zerolog:**

```go
// Structured logging dengan zerolog
log.Info().
    Str("user_id", userID).
    Str("email", user.Email).
    Str("request_id", requestID).
    Msg("User created")

log.Error().
    Err(err).
    Str("user_id", userID).
    Float64("amount", 100000).
    Str("request_id", requestID).
    Msg("Payment failed")

// Output JSON:
// {"level":"info","user_id":"123","email":"test@test.com","request_id":"abc-123","message":"User created"}
```

### Kenapa Zerolog?

1. **Zero Allocation**: Tidak allocate memory → super cepat
2. **JSON Output**: Native JSON → langsung ke log aggregator (ELK, Datadog, dll)
3. **Type-Safe**: Kompilasi error kalau salah type
4. **Context Logger**: Bisa inject field ke semua log dalam scope

**Perbandingan Performance:**
```
zerolog:  1,000,000 ops/sec
logrus:     100,000 ops/sec
zap:        800,000 ops/sec
```

### Log Levels

| Level | Kapan Pakai | Contoh |
|-------|-------------|--------|
| **Trace** | Detail banget, untuk debugging | SQL query parameters |
| **Debug** | Informasi development | Function entry/exit |
| **Info** | Normal operation | User login, API call |
| **Warn** | Perlu perhatian, tapi tidak error | Deprecated API used |
| **Error** | Error tapi aplikasi jalan terus | Payment failed, DB query error |
| **Fatal** | Error fatal, aplikasi exit | Tidak bisa connect ke DB |
| **Panic** | Error + panic() | Unrecoverable error |

### Request ID Pattern

Setiap HTTP request dapat unique ID untuk trace end-to-end:

```
[Client] → Request ke /api/users
         ↓ Generate request_id: "a1b2c3"
[API]    → Log: "Creating user" (request_id: a1b2c3)
         → Call DB (request_id: a1b2c3)
         → Error! Log: "DB error" (request_id: a1b2c3)
[Client] ← Return error + header: X-Request-ID: a1b2c3

Developer search log: request_id = "a1b2c3"
→ Dapat semua log untuk request itu!
```

### Health Check Pattern

Health check endpoint memberikan status kesehatan aplikasi:

```json
{
  "status": "ok",
  "timestamp": "2026-02-27T10:30:00Z",
  "components": {
    "database": {
      "status": "ok",
      "response_time_ms": 5
    },
    "redis": {
      "status": "ok",
      "response_time_ms": 2
    }
  }
}
```

Kubernetes/Docker bisa hit endpoint ini untuk tahu aplikasi healthy atau tidak.

### Prometheus Metrics Pattern

Prometheus scrape `/metrics` endpoint untuk ambil metrics:

```
# HTTP request total
http_requests_total{method="GET",path="/api/users",status="200"} 1542

# HTTP request latency
http_request_duration_seconds_bucket{le="0.1"} 1234
http_request_duration_seconds_bucket{le="0.5"} 1542
```

Grafana visualisasi metrics ini sebagai dashboard.

**Kapan pakai Logging vs Metrics:**
- **Logging**: Detail event → debugging, audit trail
- **Metrics**: Aggregated data → monitoring, alerting

---

## 📝 Materi + Kode Lengkap

### Struktur Project

```
logging-monitoring-go/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── logger/
│   │   ├── logger.go
│   │   └── context.go
│   ├── middleware/
│   │   ├── request_id.go
│   │   ├── request_logger.go
│   │   └── metrics.go
│   ├── handler/
│   │   ├── user_handler.go
│   │   ├── health_handler.go
│   │   └── metrics_handler.go
│   ├── service/
│   │   └── user_service.go
│   ├── repository/
│   │   └── user_repository.go
│   └── model/
│       └── user.go
├── pkg/
│   └── response/
│       └── response.go
├── logs/
│   └── .gitkeep
├── .env
├── docker-compose.yml
├── Makefile
├── go.mod
└── go.sum
```

---

## 1. Setup Dependencies

```bash
# Install dependencies
go mod init logging-monitoring-go

go get github.com/gofiber/fiber/v2
go get github.com/rs/zerolog
go get github.com/google/uuid
go get github.com/spf13/viper
go get gopkg.in/natefinch/lumberjack.v2
go get github.com/prometheus/client_golang/prometheus
go get github.com/prometheus/client_golang/prometheus/promhttp
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/redis/go-redis/v9
```

**go.mod:**
```go
// go.mod
module logging-monitoring-go

go 1.21

require (
    github.com/gofiber/fiber/v2 v2.52.0
    github.com/google/uuid v1.5.0
    github.com/prometheus/client_golang v1.18.0
    github.com/redis/go-redis/v9 v9.4.0
    github.com/rs/zerolog v1.31.0
    github.com/spf13/viper v1.18.2
    gopkg.in/natefinch/lumberjack.v2 v2.2.1
    gorm.io/driver/postgres v1.5.4
    gorm.io/gorm v1.25.5
)
```

---

## 2. Configuration

**.env:**
```env
# Server
PORT=3000
APP_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=logging_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=debug
LOG_FILE_ENABLED=true
LOG_FILE_PATH=./logs/app.log
LOG_MAX_SIZE=100
LOG_MAX_BACKUPS=5
LOG_MAX_AGE=30
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: logging_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**internal/config/config.go:**
```go
// internal/config/config.go
package config

import (
    "fmt"

    "github.com/spf13/viper"
)

type Config struct {
    Server   ServerConfig
    Database DatabaseConfig
    Redis    RedisConfig
    Logging  LoggingConfig
}

type ServerConfig struct {
    Port   string
    AppEnv string
}

type DatabaseConfig struct {
    Host     string
    Port     string
    User     string
    Password string
    DBName   string
}

type RedisConfig struct {
    Host     string
    Port     string
    Password string
    DB       int
}

type LoggingConfig struct {
    Level          string
    FileEnabled    bool
    FilePath       string
    MaxSize        int
    MaxBackups     int
    MaxAge         int
}

func LoadConfig() (*Config, error) {
    viper.SetConfigFile(".env")
    viper.AutomaticEnv()

    if err := viper.ReadInConfig(); err != nil {
        return nil, fmt.Errorf("failed to read config: %w", err)
    }

    return &Config{
        Server: ServerConfig{
            Port:   viper.GetString("PORT"),
            AppEnv: viper.GetString("APP_ENV"),
        },
        Database: DatabaseConfig{
            Host:     viper.GetString("DB_HOST"),
            Port:     viper.GetString("DB_PORT"),
            User:     viper.GetString("DB_USER"),
            Password: viper.GetString("DB_PASSWORD"),
            DBName:   viper.GetString("DB_NAME"),
        },
        Redis: RedisConfig{
            Host:     viper.GetString("REDIS_HOST"),
            Port:     viper.GetString("REDIS_PORT"),
            Password: viper.GetString("REDIS_PASSWORD"),
            DB:       viper.GetInt("REDIS_DB"),
        },
        Logging: LoggingConfig{
            Level:       viper.GetString("LOG_LEVEL"),
            FileEnabled: viper.GetBool("LOG_FILE_ENABLED"),
            FilePath:    viper.GetString("LOG_FILE_PATH"),
            MaxSize:     viper.GetInt("LOG_MAX_SIZE"),
            MaxBackups:  viper.GetInt("LOG_MAX_BACKUPS"),
            MaxAge:      viper.GetInt("LOG_MAX_AGE"),
        },
    }, nil
}

func (c *DatabaseConfig) DSN() string {
    return fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        c.Host, c.Port, c.User, c.Password, c.DBName,
    )
}
```

---

## 3. Logger Setup

**internal/logger/logger.go:**
```go
// internal/logger/logger.go
package logger

import (
    "fmt"
    "io"
    "os"
    "strings"
    "time"

    "logging-monitoring-go/internal/config"

    "github.com/rs/zerolog"
    "gopkg.in/natefinch/lumberjack.v2"
)

var log zerolog.Logger

// InitLogger initializes the global logger
func InitLogger(cfg *config.Config) {
    // Parse log level
    level := parseLogLevel(cfg.Logging.Level)
    zerolog.SetGlobalLevel(level)

    // Set timestamp format
    zerolog.TimeFieldFormat = time.RFC3339

    var writers []io.Writer

    // Console writer (pretty print untuk development)
    if cfg.Server.AppEnv == "development" {
        consoleWriter := zerolog.ConsoleWriter{
            Out:        os.Stdout,
            TimeFormat: "15:04:05",
            NoColor:    false,
        }
        writers = append(writers, consoleWriter)
    } else {
        // Production: JSON ke stdout
        writers = append(writers, os.Stdout)
    }

    // File writer dengan rotation (lumberjack)
    if cfg.Logging.FileEnabled {
        fileWriter := &lumberjack.Logger{
            Filename:   cfg.Logging.FilePath,
            MaxSize:    cfg.Logging.MaxSize,    // MB
            MaxBackups: cfg.Logging.MaxBackups, // Jumlah file backup
            MaxAge:     cfg.Logging.MaxAge,     // Days
            Compress:   true,                   // Compress rotated files
        }
        writers = append(writers, fileWriter)
    }

    // Multi writer (console + file)
    multi := io.MultiWriter(writers...)

    // Create logger dengan caller info
    log = zerolog.New(multi).
        With().
        Timestamp().
        Caller(). // Menambahkan file:line info
        Logger()

    log.Info().
        Str("env", cfg.Server.AppEnv).
        Str("level", level.String()).
        Bool("file_logging", cfg.Logging.FileEnabled).
        Msg("Logger initialized")
}

// parseLogLevel converts string to zerolog.Level
func parseLogLevel(level string) zerolog.Level {
    switch strings.ToLower(level) {
    case "trace":
        return zerolog.TraceLevel
    case "debug":
        return zerolog.DebugLevel
    case "info":
        return zerolog.InfoLevel
    case "warn":
        return zerolog.WarnLevel
    case "error":
        return zerolog.ErrorLevel
    case "fatal":
        return zerolog.FatalLevel
    case "panic":
        return zerolog.PanicLevel
    default:
        return zerolog.InfoLevel
    }
}

// Get returns the global logger
func Get() *zerolog.Logger {
    return &log
}

// Convenience methods untuk global logger

func Trace() *zerolog.Event {
    return log.Trace()
}

func Debug() *zerolog.Event {
    return log.Debug()
}

func Info() *zerolog.Event {
    return log.Info()
}

func Warn() *zerolog.Event {
    return log.Warn()
}

func Error() *zerolog.Event {
    return log.Error()
}

func Fatal() *zerolog.Event {
    return log.Fatal()
}

func Panic() *zerolog.Event {
    return log.Panic()
}

// SanitizePassword removes sensitive data from logs
func SanitizePassword(s string) string {
    if s == "" {
        return ""
    }
    return "***REDACTED***"
}

// SanitizeEmail partial hide email
func SanitizeEmail(email string) string {
    if email == "" {
        return ""
    }
    parts := strings.Split(email, "@")
    if len(parts) != 2 {
        return email
    }
    
    username := parts[0]
    if len(username) <= 2 {
        return "***@" + parts[1]
    }
    
    return username[:2] + "***@" + parts[1]
}
```

**internal/logger/context.go:**
```go
// internal/logger/context.go
package logger

import (
    "github.com/rs/zerolog"
)

// ContextLogger wraps zerolog.Logger with additional context
type ContextLogger struct {
    logger *zerolog.Logger
}

// NewContextLogger creates a new context logger
func NewContextLogger(requestID string, userID *string) *ContextLogger {
    ctx := log.With().
        Str("request_id", requestID)
    
    if userID != nil {
        ctx = ctx.Str("user_id", *userID)
    }
    
    logger := ctx.Logger()
    return &ContextLogger{logger: &logger}
}

// Convenience methods
func (l *ContextLogger) Trace() *zerolog.Event {
    return l.logger.Trace()
}

func (l *ContextLogger) Debug() *zerolog.Event {
    return l.logger.Debug()
}

func (l *ContextLogger) Info() *zerolog.Event {
    return l.logger.Info()
}

func (l *ContextLogger) Warn() *zerolog.Event {
    return l.logger.Warn()
}

func (l *ContextLogger) Error() *zerolog.Event {
    return l.logger.Error()
}

func (l *ContextLogger) Fatal() *zerolog.Event {
    return l.logger.Fatal()
}

func (l *ContextLogger) Panic() *zerolog.Event {
    return l.logger.Panic()
}

// Get returns the underlying logger
func (l *ContextLogger) Get() *zerolog.Logger {
    return l.logger
}
```

---

## 4. Middleware

**internal/middleware/request_id.go:**
```go
// internal/middleware/request_id.go
package middleware

import (
    "github.com/gofiber/fiber/v2"
    "github.com/google/uuid"
)

const RequestIDKey = "request_id"

// RequestID generates a unique request ID for each request
func RequestID() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Check if request ID already exists in header
        requestID := c.Get("X-Request-ID")
        
        // Generate new if not exists
        if requestID == "" {
            requestID = uuid.New().String()
        }
        
        // Store in context
        c.Locals(RequestIDKey, requestID)
        
        // Set response header
        c.Set("X-Request-ID", requestID)
        
        return c.Next()
    }
}

// GetRequestID retrieves request ID from context
func GetRequestID(c *fiber.Ctx) string {
    requestID, ok := c.Locals(RequestIDKey).(string)
    if !ok {
        return ""
    }
    return requestID
}
```

**internal/middleware/request_logger.go:**
```go
// internal/middleware/request_logger.go
package middleware

import (
    "time"

    "logging-monitoring-go/internal/logger"

    "github.com/gofiber/fiber/v2"
)

// RequestLogger logs every HTTP request
func RequestLogger() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Skip health check endpoints
        if c.Path() == "/health" || c.Path() == "/metrics" {
            return c.Next()
        }

        start := time.Now()
        requestID := GetRequestID(c)

        // Log incoming request
        logger.Info().
            Str("request_id", requestID).
            Str("method", c.Method()).
            Str("path", c.Path()).
            Str("ip", c.IP()).
            Str("user_agent", c.Get("User-Agent")).
            Msg("Incoming request")

        // Process request
        err := c.Next()

        // Calculate latency
        latency := time.Since(start)
        status := c.Response().StatusCode()

        // Log response
        event := logger.Info()
        if status >= 500 {
            event = logger.Error()
        } else if status >= 400 {
            event = logger.Warn()
        }

        event.
            Str("request_id", requestID).
            Str("method", c.Method()).
            Str("path", c.Path()).
            Int("status", status).
            Dur("latency", latency).
            Int("bytes_sent", len(c.Response().Body())).
            Msg("Request completed")

        return err
    }
}
```

**internal/middleware/metrics.go:**
```go
// internal/middleware/metrics.go
package middleware

import (
    "strconv"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    // HTTP request total counter
    httpRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "path", "status"},
    )

    // HTTP request duration histogram
    httpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request latency in seconds",
            Buckets: prometheus.DefBuckets, // Default: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10
        },
        []string{"method", "path", "status"},
    )

    // Active requests gauge
    httpRequestsInFlight = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "http_requests_in_flight",
            Help: "Current number of HTTP requests being processed",
        },
    )
)

// MetricsMiddleware collects Prometheus metrics
func MetricsMiddleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Skip metrics endpoint itself
        if c.Path() == "/metrics" {
            return c.Next()
        }

        start := time.Now()
        httpRequestsInFlight.Inc()
        defer httpRequestsInFlight.Dec()

        // Process request
        err := c.Next()

        // Collect metrics
        duration := time.Since(start).Seconds()
        status := strconv.Itoa(c.Response().StatusCode())
        method := c.Method()
        path := c.Path()

        // Normalize path (group dynamic routes)
        path = normalizePath(path)

        httpRequestsTotal.WithLabelValues(method, path, status).Inc()
        httpRequestDuration.WithLabelValues(method, path, status).Observe(duration)

        return err
    }
}

// normalizePath groups dynamic routes
func normalizePath(path string) string {
    // Example: /api/users/123 -> /api/users/:id
    // Implement based on your route patterns
    // For simplicity, return as-is
    return path
}

// Custom business metrics
var (
    UserRegistrationsTotal = promauto.NewCounter(
        prometheus.CounterOpts{
            Name: "user_registrations_total",
            Help: "Total number of user registrations",
        },
    )

    ActiveUsersGauge = promauto.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_users",
            Help: "Current number of active users",
        },
    )

    DatabaseQueryDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "database_query_duration_seconds",
            Help:    "Database query latency in seconds",
            Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1},
        },
        []string{"query_type"},
    )
)
```

---

## 5. Models

**internal/model/user.go:**
```go
// internal/model/user.go
package model

import (
    "time"

    "gorm.io/gorm"
)

type User struct {
    ID        uint           `gorm:"primarykey" json:"id"`
    Name      string         `gorm:"type:varchar(100);not null" json:"name"`
    Email     string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
    Password  string         `gorm:"type:varchar(255);not null" json:"-"` // Never expose in JSON
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

type CreateUserRequest struct {
    Name     string `json:"name" validate:"required,min=3,max=100"`
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8"`
}

type UserResponse struct {
    ID        uint      `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
}
```

---

## 6. Repository Layer

**internal/repository/user_repository.go:**
```go
// internal/repository/user_repository.go
package repository

import (
    "context"
    "time"

    "logging-monitoring-go/internal/logger"
    "logging-monitoring-go/internal/middleware"
    "logging-monitoring-go/internal/model"

    "gorm.io/gorm"
)

type UserRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
    return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *model.User) error {
    start := time.Now()
    defer func() {
        duration := time.Since(start).Seconds()
        middleware.DatabaseQueryDuration.WithLabelValues("create_user").Observe(duration)
    }()

    // Get context logger from request
    requestID := ctx.Value("request_id").(string)
    log := logger.NewContextLogger(requestID, nil)

    log.Debug().
        Str("email", logger.SanitizeEmail(user.Email)).
        Msg("Creating user in database")

    if err := r.db.WithContext(ctx).Create(user).Error; err != nil {
        log.Error().
            Err(err).
            Str("email", logger.SanitizeEmail(user.Email)).
            Msg("Failed to create user")
        return err
    }

    log.Info().
        Uint("user_id", user.ID).
        Str("email", logger.SanitizeEmail(user.Email)).
        Msg("User created successfully")

    return nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
    start := time.Now()
    defer func() {
        duration := time.Since(start).Seconds()
        middleware.DatabaseQueryDuration.WithLabelValues("find_user_by_email").Observe(duration)
    }()

    var user model.User
    if err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error; err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id uint) (*model.User, error) {
    start := time.Now()
    defer func() {
        duration := time.Since(start).Seconds()
        middleware.DatabaseQueryDuration.WithLabelValues("find_user_by_id").Observe(duration)
    }()

    var user model.User
    if err := r.db.WithContext(ctx).First(&user, id).Error; err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *UserRepository) CountActive(ctx context.Context) (int64, error) {
    var count int64
    if err := r.db.WithContext(ctx).Model(&model.User{}).Count(&count).Error; err != nil {
        return 0, err
    }
    return count, nil
}
```

---

## 7. Service Layer

**internal/service/user_service.go:**
```go
// internal/service/user_service.go
package service

import (
    "context"
    "errors"
    "fmt"
    "time"

    "logging-monitoring-go/internal/logger"
    "logging-monitoring-go/internal/middleware"
    "logging-monitoring-go/internal/model"
    "logging-monitoring-go/internal/repository"

    "golang.org/x/crypto/bcrypt"
    "gorm.io/gorm"
)

type UserService struct {
    repo *repository.UserRepository
}

func NewUserService(repo *repository.UserRepository) *UserService {
    return &UserService{repo: repo}
}

func (s *UserService) CreateUser(ctx context.Context, req *model.CreateUserRequest) (*model.UserResponse, error) {
    requestID := ctx.Value("request_id").(string)
    log := logger.NewContextLogger(requestID, nil)

    // Log dengan structured fields (JANGAN log password!)
    log.Info().
        Str("email", logger.SanitizeEmail(req.Email)).
        Str("name", req.Name).
        Msg("Creating new user")

    // Check if email exists
    existingUser, err := s.repo.FindByEmail(ctx, req.Email)
    if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
        log.Error().
            Err(err).
            Str("email", logger.SanitizeEmail(req.Email)).
            Msg("Failed to check existing user")
        return nil, fmt.Errorf("failed to check existing user: %w", err)
    }

    if existingUser != nil {
        log.Warn().
            Str("email", logger.SanitizeEmail(req.Email)).
            Msg("Email already exists")
        return nil, errors.New("email already exists")
    }

    // Hash password (JANGAN log password asli!)
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        log.Error().
            Err(err).
            Msg("Failed to hash password")
        return nil, fmt.Errorf("failed to hash password: %w", err)
    }

    // Create user
    user := &model.User{
        Name:     req.Name,
        Email:    req.Email,
        Password: string(hashedPassword),
    }

    if err := s.repo.Create(ctx, user); err != nil {
        // Error sudah di-log di repository
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    // Increment metrics
    middleware.UserRegistrationsTotal.Inc()

    log.Info().
        Uint("user_id", user.ID).
        Str("email", logger.SanitizeEmail(user.Email)).
        Msg("User created successfully")

    return &model.UserResponse{
        ID:        user.ID,
        Name:      user.Name,
        Email:     user.Email,
        CreatedAt: user.CreatedAt,
    }, nil
}

func (s *UserService) GetUser(ctx context.Context, id uint) (*model.UserResponse, error) {
    requestID := ctx.Value("request_id").(string)
    log := logger.NewContextLogger(requestID, nil)

    log.Debug().
        Uint("user_id", id).
        Msg("Fetching user")

    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            log.Warn().
                Uint("user_id", id).
                Msg("User not found")
            return nil, errors.New("user not found")
        }

        log.Error().
            Err(err).
            Uint("user_id", id).
            Msg("Failed to fetch user")
        return nil, fmt.Errorf("failed to fetch user: %w", err)
    }

    return &model.UserResponse{
        ID:        user.ID,
        Name:      user.Name,
        Email:     user.Email,
        CreatedAt: user.CreatedAt,
    }, nil
}

func (s *UserService) UpdateActiveUsersMetric(ctx context.Context) error {
    count, err := s.repo.CountActive(ctx)
    if err != nil {
        return err
    }
    middleware.ActiveUsersGauge.Set(float64(count))
    return nil
}
```

**Tambahan: golang.org/x/crypto/bcrypt**
```bash
go get golang.org/x/crypto/bcrypt
```

---

## 8. Handlers

**pkg/response/response.go:**
```go
// pkg/response/response.go
package response

import "github.com/gofiber/fiber/v2"

type Response struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

func Success(c *fiber.Ctx, data interface{}) error {
    return c.JSON(Response{
        Success: true,
        Data:    data,
    })
}

func Error(c *fiber.Ctx, status int, err error) error {
    return c.Status(status).JSON(Response{
        Success: false,
        Error:   err.Error(),
    })
}
```

**internal/handler/user_handler.go:**
```go
// internal/handler/user_handler.go
package handler

import (
    "context"
    "strconv"
    "time"

    "logging-monitoring-go/internal/logger"
    "logging-monitoring-go/internal/middleware"
    "logging-monitoring-go/internal/model"
    "logging-monitoring-go/internal/service"
    "logging-monitoring-go/pkg/response"

    "github.com/gofiber/fiber/v2"
)

type UserHandler struct {
    service *service.UserService
}

func NewUserHandler(service *service.UserService) *UserHandler {
    return &UserHandler{service: service}
}

func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
    requestID := middleware.GetRequestID(c)
    log := logger.NewContextLogger(requestID, nil)

    var req model.CreateUserRequest
    if err := c.BodyParser(&req); err != nil {
        log.Warn().
            Err(err).
            Msg("Invalid request body")
        return response.Error(c, fiber.StatusBadRequest, err)
    }

    // Create context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Add request ID to context
    ctx = context.WithValue(ctx, "request_id", requestID)

    user, err := h.service.CreateUser(ctx, &req)
    if err != nil {
        // Error sudah di-log di service layer
        return response.Error(c, fiber.StatusBadRequest, err)
    }

    return response.Success(c, user)
}

func (h *UserHandler) GetUser(c *fiber.Ctx) error {
    requestID := middleware.GetRequestID(c)
    log := logger.NewContextLogger(requestID, nil)

    idParam := c.Params("id")
    id, err := strconv.ParseUint(idParam, 10, 32)
    if err != nil {
        log.Warn().
            Str("id_param", idParam).
            Err(err).
            Msg("Invalid user ID")
        return response.Error(c, fiber.StatusBadRequest, err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    ctx = context.WithValue(ctx, "request_id", requestID)

    user, err := h.service.GetUser(ctx, uint(id))
    if err != nil {
        return response.Error(c, fiber.StatusNotFound, err)
    }

    return response.Success(c, user)
}
```

**internal/handler/health_handler.go:**
```go
// internal/handler/health_handler.go
package handler

import (
    "context"
    "time"

    "logging-monitoring-go/internal/logger"

    "github.com/gofiber/fiber/v2"
    "github.com/redis/go-redis/v9"
    "gorm.io/gorm"
)

type HealthHandler struct {
    db    *gorm.DB
    redis *redis.Client
}

func NewHealthHandler(db *gorm.DB, redis *redis.Client) *HealthHandler {
    return &HealthHandler{
        db:    db,
        redis: redis,
    }
}

type HealthResponse struct {
    Status     string                       `json:"status"`
    Timestamp  time.Time                    `json:"timestamp"`
    Components map[string]ComponentStatus   `json:"components"`
}

type ComponentStatus struct {
    Status       string  `json:"status"`
    ResponseTime float64 `json:"response_time_ms"`
    Error        string  `json:"error,omitempty"`
}

func (h *HealthHandler) Check(c *fiber.Ctx) error {
    ctx := context.Background()
    response := HealthResponse{
        Timestamp:  time.Now().UTC(),
        Components: make(map[string]ComponentStatus),
    }

    overallStatus := "ok"

    // Check PostgreSQL
    dbStatus := h.checkDatabase(ctx)
    response.Components["database"] = dbStatus
    if dbStatus.Status != "ok" {
        overallStatus = "degraded"
        logger.Error().
            Str("component", "database").
            Str("error", dbStatus.Error).
            Msg("Database health check failed")
    }

    // Check Redis
    redisStatus := h.checkRedis(ctx)
    response.Components["redis"] = redisStatus
    if redisStatus.Status != "ok" {
        overallStatus = "degraded"
        logger.Error().
            Str("component", "redis").
            Str("error", redisStatus.Error).
            Msg("Redis health check failed")
    }

    response.Status = overallStatus

    // Return 503 if any component is down
    statusCode := fiber.StatusOK
    if overallStatus == "degraded" {
        statusCode = fiber.StatusServiceUnavailable
    }

    return c.Status(statusCode).JSON(response)
}

func (h *HealthHandler) checkDatabase(ctx context.Context) ComponentStart := time.Now()
    
    sqlDB, err := h.db.DB()
    if err != nil {
        return ComponentStatus{
            Status:       "error",
            ResponseTime: time.Since(start).Milliseconds() / 1000.0,
            Error:        err.Error(),
        }
    }

    if err := sqlDB.PingContext(ctx); err != nil {
        return ComponentStatus{
            Status:       "error",
            ResponseTime: float64(time.Since(start).Milliseconds()),
            Error:        err.Error(),
        }
    }

    return ComponentStatus{
        Status:       "ok",
        ResponseTime: float64(time.Since(start).Milliseconds()),
    }
}

func (h *HealthHandler) checkRedis(ctx context.Context) ComponentStatus {
    start := time.Now()
    
    if err := h.redis.Ping(ctx).Err(); err != nil {
        return ComponentStatus{
            Status:       "error",
            ResponseTime: float64(time.Since(start).Milliseconds()),
            Error:        err.Error(),
        }
    }

    return ComponentStatus{
        Status:       "ok",
        ResponseTime: float64(time.Since(start).Milliseconds()),
    }
}
```

**internal/handler/metrics_handler.go:**
```go
// internal/handler/metrics_handler.go
package handler

import (
    "github.com/gofiber/fiber/v2"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "github.com/valyala/fasthttp/fasthttpadaptor"
)

type MetricsHandler struct{}

func NewMetricsHandler() *MetricsHandler {
    return &MetricsHandler{}
}

func (h *MetricsHandler) Metrics(c *fiber.Ctx) error {
    // Adapt promhttp.Handler() untuk Fiber
    handler := fasthttpadaptor.NewFastHTTPHandler(promhttp.Handler())
    handler(c.Context())
    return nil
}
```

---

## 9. Database & Redis Setup

**internal/database/database.go:**
```go
// internal/database/database.go
package database

import (
    "fmt"
    "time"

    "logging-monitoring-go/internal/config"
    "logging-monitoring-go/internal/logger"
    "logging-monitoring-go/internal/model"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

func NewDatabase(cfg *config.Config) (*gorm.DB, error) {
    db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{
        NowFunc: func() time.Time {
            return time.Now().UTC()
        },
    })

    if err != nil {
        return nil, fmt.Errorf("failed to connect to database: %w", err)
    }

    sqlDB, err := db.DB()
    if err != nil {
        return nil, fmt.Errorf("failed to get sql.DB: %w", err)
    }

    sqlDB.SetMaxOpenConns(100)
    sqlDB.SetMaxIdleConns(10)
    sqlDB.SetConnMaxLifetime(time.Hour)

    logger.Info().Msg("Database connected successfully")
    return db, nil
}

func Migrate(db *gorm.DB) error {
    logger.Info().Msg("Running database migrations")
    
    if err := db.AutoMigrate(
        &model.User{},
    ); err != nil {
        return fmt.Errorf("migration failed: %w", err)
    }

    logger.Info().Msg("Database migrations completed")
    return nil
}
```

**internal/database/redis.go:**
```go
// internal/database/redis.go
package database

import (
    "context"
    "fmt"

    "logging-monitoring-go/internal/config"
    "logging-monitoring-go/internal/logger"

    "github.com/redis/go-redis/v9"
)

func NewRedis(cfg *config.Config) (*redis.Client, error) {
    client := redis.NewClient(&redis.Options{
        Addr:     fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
        Password: cfg.Redis.Password,
        DB:       cfg.Redis.DB,
    })

    // Test connection
    ctx := context.Background()
    if err := client.Ping(ctx).Err(); err != nil {
        return nil, fmt.Errorf("failed to connect to redis: %w", err)
    }

    logger.Info().Msg("Redis connected successfully")
    return client, nil
}
```

**Tambahan dependency:**
```bash
# Buat directory untuk database code
mkdir -p internal/database
```

---

## 10. Main Application

**cmd/api/main.go:**
```go
// cmd/api/main.go
package main

import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "syscall"
    "time"

    "logging-monitoring-go/internal/config"
    "logging-monitoring-go/internal/database"
    "logging-monitoring-go/internal/handler"
    "logging-monitoring-go/internal/logger"
    "logging-monitoring-go/internal/middleware"
    "logging-monitoring-go/internal/repository"
    "logging-monitoring-go/internal/service"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
    // Load configuration
    cfg, err := config.LoadConfig()
    if err != nil {
        panic(fmt.Sprintf("Failed to load config: %v", err))
    }

    // Initialize logger
    logger.InitLogger(cfg)
    logger.Info().Msg("Starting application...")

    // Connect to database
    db, err := database.NewDatabase(cfg)
    if err != nil {
        logger.Fatal().Err(err).Msg("Failed to connect to database")
    }

    // Run migrations
    if err := database.Migrate(db); err != nil {
        logger.Fatal().Err(err).Msg("Failed to run migrations")
    }

    // Connect to Redis
    redisClient, err := database.NewRedis(cfg)
    if err != nil {
        logger.Fatal().Err(err).Msg("Failed to connect to Redis")
    }
    defer redisClient.Close()

    // Initialize repositories
    userRepo := repository.NewUserRepository(db)

    // Initialize services
    userService := service.NewUserService(userRepo)

    // Initialize handlers
    userHandler := handler.NewUserHandler(userService)
    healthHandler := handler.NewHealthHandler(db, redisClient)
    metricsHandler := handler.NewMetricsHandler()

    // Create Fiber app
    app := fiber.New(fiber.Config{
        DisableStartupMessage: true,
        ErrorHandler: func(c *fiber.Ctx, err error) error {
            requestID := middleware.GetRequestID(c)
            log := logger.NewContextLogger(requestID, nil)

            log.Error().
                Err(err).
                Str("method", c.Method()).
                Str("path", c.Path()).
                Msg("Unhandled error")

            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "success": false,
                "error":   "Internal server error",
            })
        },
    })

    // Global middleware
    app.Use(recover.New()) // Panic recovery
    app.Use(cors.New())
    app.Use(middleware.RequestID())
    app.Use(middleware.MetricsMiddleware())
    app.Use(middleware.RequestLogger())

    // Routes
    app.Get("/health", healthHandler.Check)
    app.Get("/metrics", metricsHandler.Metrics)

    api := app.Group("/api")
    api.Post("/users", userHandler.CreateUser)
    api.Get("/users/:id", userHandler.GetUser)

    // Update active users metric periodically
    go func() {
        ticker := time.NewTicker(30 * time.Second)
        defer ticker.Stop()

        for range ticker.C {
            ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
            if err := userService.UpdateActiveUsersMetric(ctx); err != nil {
                logger.Error().Err(err).Msg("Failed to update active users metric")
            }
            cancel()
        }
    }()

    // Graceful shutdown
    go func() {
        sigChan := make(chan os.Signal, 1)
        signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
        <-sigChan

        logger.Info().Msg("Shutting down server...")

        if err := app.Shutdown(); err != nil {
            logger.Error().Err(err).Msg("Server shutdown error")
        }
    }()

    // Start server
    addr := fmt.Sprintf(":%s", cfg.Server.Port)
    logger.Info().
        Str("port", cfg.Server.Port).
        Str("env", cfg.Server.AppEnv).
        Msg("Server is running")

    if err := app.Listen(addr); err != nil {
        logger.Fatal().Err(err).Msg("Failed to start server")
    }
}
```

---

## 11. Makefile

**Makefile:**
```makefile
.PHONY: help run build test docker-up docker-down clean logs

help:
	@echo "Available commands:"
	@echo "  make run          - Run the application"
	@echo "  make build        - Build the application"
	@echo "  make test         - Run tests"
	@echo "  make docker-up    - Start Docker services"
	@echo "  make docker-down  - Stop Docker services"
	@echo "  make logs         - View application logs"
	@echo "  make clean        - Clean build artifacts"

run:
	@echo "Starting application..."
	@go run cmd/api/main.go

build:
	@echo "Building application..."
	@go build -o bin/api cmd/api/main.go

test:
	@echo "Running tests..."
	@go test -v ./...

docker-up:
	@echo "Starting Docker services..."
	@docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 5
	@docker-compose ps

docker-down:
	@echo "Stopping Docker services..."
	@docker-compose down

logs:
	@echo "Viewing logs..."
	@tail -f logs/app.log

clean:
	@echo "Cleaning..."
	@rm -rf bin/
	@rm -rf logs/*.log
	@go clean
```

---

## 12. Testing

### Manual Testing

```bash
# 1. Start Docker services
make docker-up

# 2. Run application
make run

# 3. Test health check
curl http://localhost:3000/health

# Expected output:
# {
#   "status": "ok",
#   "timestamp": "2026-02-27T10:30:00Z",
#   "components": {
#     "database": {
#       "status": "ok",
#       "response_time_ms": 5.2
#     },
#     "redis": {
#       "status": "ok",
#       "response_time_ms": 1.8
#     }
#   }
# }
```

### Test User Creation

```bash
# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "password": "password123"
  }'

# Check logs di console (development mode):
# 10:30:15 INF Incoming request request_id=a1b2c3... method=POST path=/api/users
# 10:30:15 INF Creating new user email=al***@example.com name=Alice request_id=a1b2c3...
# 10:30:15 DBG Creating user in database email=al***@example.com request_id=a1b2c3...
# 10:30:15 INF User created successfully user_id=1 email=al***@example.com request_id=a1b2c3...
# 10:30:15 INF Request completed request_id=a1b2c3... method=POST path=/api/users status=200 latency=45ms

# Check file logs:
tail -f logs/app.log

# JSON format:
# {"level":"info","request_id":"a1b2c3...","method":"POST","path":"/api/users","message":"Incoming request"}
```

### Test Metrics

```bash
# Get Prometheus metrics
curl http://localhost:3000/metrics

# Expected output:
# # HELP http_requests_total Total number of HTTP requests
# # TYPE http_requests_total counter
# http_requests_total{method="POST",path="/api/users",status="200"} 1
#
# # HELP http_request_duration_seconds HTTP request latency in seconds
# # TYPE http_request_duration_seconds histogram
# http_request_duration_seconds_bucket{method="POST",path="/api/users",status="200",le="0.005"} 0
# http_request_duration_seconds_bucket{method="POST",path="/api/users",status="200",le="0.01"} 0
# http_request_duration_seconds_bucket{method="POST",path="/api/users",status="200",le="0.025"} 0
# http_request_duration_seconds_bucket{method="POST",path="/api/users",status="200",le="0.05"} 1
# http_request_duration_seconds_sum{method="POST",path="/api/users",status="200"} 0.045
# http_request_duration_seconds_count{method="POST",path="/api/users",status="200"} 1
#
# # HELP user_registrations_total Total number of user registrations
# # TYPE user_registrations_total counter
# user_registrations_total 1
#
# # HELP active_users Current number of active users
# # TYPE active_users gauge
# active_users 1
```

### Test Error Logging

```bash
# Try to create user with existing email
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob",
    "email": "alice@example.com",
    "password": "password123"
  }'

# Check logs:
# 10:31:20 WRN Email already exists email=al***@example.com request_id=xyz789...
# 10:31:20 WRN Request completed request_id=xyz789... method=POST path=/api/users status=400 latency=12ms
```

### Test Request ID Tracking

```bash
# Send request dengan custom Request ID
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: my-custom-id-123" \
  -d '{
    "name": "Charlie",
    "email": "charlie@example.com",
    "password": "password123"
  }'

# Semua log akan punya request_id yang sama:
# request_id=my-custom-id-123

# Response header juga return Request ID:
# X-Request-ID: my-custom-id-123
```

---

## ❌ Common Mistakes + Fix

### 1. Log password atau sensitive data

**Masalah:**
```go
// ❌ BAHAYA: Password di-log!
logger.Info().
    Str("email", user.Email).
    Str("password", req.Password). // JANGAN!
    Msg("Creating user")
```

**Solusi:**
```go
// ✅ AMAN: JANGAN log password
logger.Info().
    Str("email", logger.SanitizeEmail(user.Email)).
    // Str("password", ...) // NO!
    Msg("Creating user")

// Kalau memang harus log (debugging), sanitize:
logger.Debug().
    Str("password_length", strconv.Itoa(len(req.Password))).
    Bool("password_has_number", hasNumber(req.Password)).
    Msg("Password validation")
```

---

### 2. Tidak pakai structured logging

**Masalah:**
```go
// ❌ BURUK: String concatenation, susah di-parse
logger.Info().Msg(fmt.Sprintf("User %s created with email %s", user.ID, user.Email))
```

**Solusi:**
```go
// ✅ BAIK: Structured fields
logger.Info().
    Uint("user_id", user.ID).
    Str("email", user.Email).
    Msg("User created")

// JSON output:
// {"level":"info","user_id":123,"email":"test@test.com","message":"User created"}
// Mudah di-query di log aggregator!
```

---

### 3. Tidak pakai log levels yang tepat

**Masalah:**
```go
// ❌ SALAH: Semua pakai Info
logger.Info().Msg("Starting function")  // Seharusnya Debug
logger.Info().Err(err).Msg("DB error")  // Seharusnya Error
logger.Info().Msg("Deprecated API")     // Seharusnya Warn
```

**Solusi:**
```go
// ✅ BENAR: Pakai level yang tepat
logger.Debug().Msg("Starting function")          // Development only
logger.Info().Msg("User logged in")              // Normal operation
logger.Warn().Msg("Using deprecated API")        // Warning
logger.Error().Err(err).Msg("DB query failed")   // Error
logger.Fatal().Err(err).Msg("Cannot connect DB") // Fatal + exit
```

---

### 4. Log di layer yang salah

**Masalah:**
```go
// ❌ BURUK: Handler log internal error
func (h *Handler) CreateUser(c *fiber.Ctx) error {
    user, err := h.service.CreateUser(ctx, req)
    if err != nil {
        logger.Error().Err(err).Msg("Error")  // Too generic!
        return err
    }
}
```

**Solusi:**
```go
// ✅ BAIK: Service layer log detail error
func (s *Service) CreateUser(ctx context.Context, req *Request) (*User, error) {
    hashedPw, err := bcrypt.GenerateFromPassword(req.Password)
    if err != nil {
        logger.Error().
            Err(err).
            Str("email", req.Email).
            Msg("Failed to hash password")  // Detail!
        return nil, err
    }
}

// Handler hanya log high-level
func (h *Handler) CreateUser(c *fiber.Ctx) error {
    user, err := h.service.CreateUser(ctx, req)
    if err != nil {
        return response.Error(c, 400, err)  // Error sudah di-log di service
    }
}
```

---

### 5. Tidak rotate log files

**Masalah:**
```go
// ❌ BAHAYA: File log bisa jadi GB-an!
file, _ := os.OpenFile("app.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
log := zerolog.New(file)
```

**Solusi:**
```go
// ✅ AMAN: Pakai lumberjack untuk rotation
fileWriter := &lumberjack.Logger{
    Filename:   "./logs/app.log",
    MaxSize:    100,  // MB
    MaxBackups: 5,    // Keep 5 old files
    MaxAge:     30,   // Days
    Compress:   true, // Compress rotated files
}

log := zerolog.New(fileWriter)
```

---

### 6. Tidak include request ID dalam log

**Masalah:**
```go
// ❌ BURUK: Susah trace request end-to-end
logger.Error().Err(err).Msg("Payment failed")
// Log mana yang dari request mana?
```

**Solusi:**
```go
// ✅ BAIK: Selalu include request ID
requestID := middleware.GetRequestID(c)
log := logger.NewContextLogger(requestID, &userID)

log.Error().Err(err).Msg("Payment failed")
// {"level":"error","request_id":"abc-123","user_id":"456","message":"Payment failed"}

// Bisa search semua log dengan request_id yang sama!
```

---

### 7. Metrics name tidak follow convention

**Masalah:**
```go
// ❌ BURUK: Tidak konsisten
prometheus.NewCounter(prometheus.CounterOpts{
    Name: "UserRegistration",  // PascalCase
})

prometheus.NewCounter(prometheus.CounterOpts{
    Name: "total-http-requests",  // kebab-case
})
```

**Solusi:**
```go
// ✅ BAIK: snake_case with suffix
prometheus.NewCounter(prometheus.CounterOpts{
    Name: "user_registrations_total",  // _total untuk counter
})

prometheus.NewHistogram(prometheus.HistogramOpts{
    Name: "http_request_duration_seconds",  // _seconds untuk duration
})

prometheus.NewGauge(prometheus.GaugeOpts{
    Name: "active_users",  // No suffix untuk gauge
})
```

---

### 8. Health check tidak comprehensive

**Masalah:**
```go
// ❌ BURUK: Hanya return OK
func Health(c *fiber.Ctx) error {
    return c.JSON(fiber.Map{"status": "ok"})
}
// Padahal DB atau Redis bisa down!
```

**Solusi:**
```go
// ✅ BAIK: Check semua dependencies
func (h *HealthHandler) Check(c *fiber.Ctx) error {
    response := HealthResponse{
        Timestamp: time.Now(),
        Components: map[string result := h.checkDatabase()
        response.Components["database"] = result
        if result.Status != "ok" {
            overallStatus = "degraded"
        }

        redisResult := h.checkRedis()
        response.Components["redis"] = redisResult
        if redisResult.Status != "ok" {
            overallStatus = "degraded"
        }
        
        response.Status = overallStatus
        
        // Return 503 if degraded
        if overallStatus == "degraded" {
            return c.Status(503).JSON(response)
        }
        
        return c.JSON(response)
    }
}
```

---

## ✅ Checklist Akhir

**Setelah belajar ini, lo harus bisa:**

### Konsep
- [ ] Jelasin perbedaan logging vs monitoring
- [ ] Paham kenapa structured logging lebih baik dari string
- [ ] Paham kapan pakai log level apa (Debug, Info, Warn, Error, Fatal)
- [ ] Jelasin kegunaan request ID untuk tracing
- [ ] Paham perbedaan metrics counter, gauge, histogram

### Implementation
- [ ] Setup zerolog dengan console writer (dev) dan JSON (prod)
- [ ] Implement request ID middleware dengan UUID
- [ ] Implement request logging middleware dengan latency tracking
- [ ] Implement context logger yang inject request ID ke semua log
- [ ] Implement file logging dengan rotation (lumberjack)
- [ ] Sanitize sensitive data (password, token) dari log
- [ ] Implement comprehensive health check (DB + Redis)
- [ ] Implement Prometheus metrics endpoint
- [ ] Create custom business metrics (user registrations, etc)

### Production Readiness
- [ ] Log output JSON untuk production
- [ ] File rotation configured (max size, max age, max backups)
- [ ] Health check return 503 kalau ada component down
- [ ] Metrics follow Prometheus naming convention
- [ ] Request ID returned sebagai header X-Request-ID
- [ ] Error logging include stack trace atau context
- [ ] Metrics histogram with appropriate buckets

### Testing Commands

```bash
# Start services
make docker-up
make run

# Test health check
curl http://localhost:3000/health

# Expected:
# {
#   "status": "ok",
#   "timestamp": "2026-02-27T10:00:00Z",
#   "components": {
#     "database": {"status": "ok", "response_time_ms": 5.2},
#     "redis": {"status": "ok", "response_time_ms": 1.8}
#   }
# }

# Test create user (check logs)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-123" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "password": "password123"
  }'

# Check response header for Request ID
# X-Request-ID: test-123

# View console logs (development)
# Colored, pretty-printed logs

# View file logs (JSON format)
tail -f logs/app.log

# Test metrics
curl http://localhost:3000/metrics

# Expected: Prometheus format
# http_requests_total{method="POST",path="/api/users",status="200"} 1
# user_registrations_total 1
# active_users 1

# Test with siege (load testing)
siege -c 10 -r 100 http://localhost:3000/api/users/1

# Check metrics after load test
curl http://localhost:3000/metrics | grep http_request_duration
```

**Key Points yang Harus Lo Inget:**

1. 📝 **Structured Logging** → JSON fields, bukan string concatenation
2. 🔒 **Never Log Sensitive Data** → Password, token, credit card = NO!
3. 🎯 **Request ID** → Trace request end-to-end di distributed system
4. 📊 **Metrics ≠ Logs** → Metrics untuk monitoring, logs untuk debugging
5. 🏥 **Health Check** → Must check ALL dependencies (DB, Redis, etc)

**Rumus Gampang:**
- Development → **Pretty print** (zerolog.ConsoleWriter)
- Production → **JSON to stdout** (collected by log aggregator)
- Sensitive data? → **SANITIZE atau JANGAN LOG**
- Need to trace request? → **ALWAYS use Request ID**
- Need monitoring? → **Metrics, bukan logs**

**Best Practices:**
```go
// ✅ GOOD
logger.Info().
    Str("request_id", requestID).
    Str("user_id", userID).
    Str("email", logger.SanitizeEmail(email)).
    Dur("latency", latency).
    Msg("User created")

// ❌ BAD
logger.Info().Msg(fmt.Sprintf("User %s created", email))
logger.Info().Str("password", password).Msg("Login") // NEVER!
fmt.Println("Error:", err) // Unstructured, no timestamp
```

Happy logging & monitoring! 🚀📊

---

## 💭 Ide Pengembangan Mandiri

### 1. Log Aggregation dengan ELK Stack

Setup Elasticsearch + Logstash + Kibana untuk centralized logging:

```yaml
# docker-compose.yml - tambahkan
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
  environment:
    - discovery.type=single-node
  ports:
    - "9200:9200"

kibana:
  image: docker.elastic.co/kibana/kibana:8.11.0
  ports:
    - "5601:5601"
  depends_on:
    - elasticsearch
```

```go
// Send logs to Elasticsearch
import "github.com/elastic/go-elasticsearch/v8"

func sendToElasticsearch(log string) {
    es, _ := elasticsearch.NewDefaultClient()
    es.Index("app-logs", strings.NewReader(log))
}
```

---

### 2. Distributed Tracing dengan OpenTelemetry

Trace request across multiple services:

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
)

func (s *Service) CreateUser(ctx context.Context) {
    tracer := otel.Tracer("user-service")
    ctx, span := tracer.Start(ctx, "CreateUser")
    defer span.End()
    
    // Nested span
    _, dbSpan := tracer.Start(ctx, "database.insert")
    s.repo.Create(ctx, user)
    dbSpan.End()
}
```

---

### 3. Alerting dengan Prometheus Alertmanager

Setup alert rules:

```yaml
# prometheus-alerts.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "95th percentile latency > 1s"
```

---

### 4. Custom Log Hooks (Slack/Discord Notification)

Send error logs to Slack:

```go
type SlackHook struct {
    webhookURL string
}

func (h *SlackHook) Run(e *zerolog.Event, level zerolog.Level, msg string) {
    if level >= zerolog.ErrorLevel {
        payload := map[string]interface{}{
            "text": fmt.Sprintf("🚨 Error: %s", msg),
        }
        
        json, _ := json.Marshal(payload)
        http.Post(h.webhookURL, "application/json", bytes.NewBuffer(json))
    }
}

// Attach hook
log := zerolog.New(os.Stdout).Hook(SlackHook{webhookURL: "..."})
```

---

### 5. Performance Profiling dengan pprof

```go
import _ "net/http/pprof"

func main() {
    // Enable pprof endpoint
    go func() {
        http.ListenAndServe(":6060", nil)
    }()
}

// Access profiling:
// http://localhost:6060/debug/pprof/
// go tool pprof http://localhost:6060/debug/pprof/heap
// go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
```

---

### 6. Log Sampling untuk High-Traffic Endpoints

Reduce log volume by sampling:

```go
sampler := &zerolog.BurstSampler{
    Burst:       10,   // Log first 10
    Period:      time.Second,
    NextSampler: &zerolog.BasicSampler{N: 100}, // Then 1 in 100
}

log := zerolog.New(os.Stdout).Sample(sampler)

// High-traffic endpoint: log di-sample
// Low-traffic endpoint: log semua
```

---

### 7. Custom Metrics Exporter

Export metrics ke services lain:

```go
// Export ke Datadog
import "github.com/DataDog/datadog-go/v5/statsd"

func sendToDatadog() {
    statsd, _ := statsd.New("127.0.0.1:8125")
    
    statsd.Incr("user.registration", nil, 1)
    statsd.Histogram("request.duration", duration, nil, 1)
    statsd.Gauge("active.users", count, nil, 1)
}
```

---

### 8. Correlation ID untuk Microservices

Pass correlation ID across services:

```go
// Service A
func callServiceB(ctx context.Context) {
    correlationID := ctx.Value("correlation_id").(string)
    
    req, _ := http.NewRequest("GET", "http://service-b/api", nil)
    req.Header.Set("X-Correlation-ID", correlationID)
    
    client.Do(req)
}

// Service B
func handler(c *fiber.Ctx) error {
    correlationID := c.Get("X-Correlation-ID")
    
    log := logger.NewContextLogger(requestID, nil).
        With().
        Str("correlation_id", correlationID).
        Logger()
}
```

---

### 9. Log Query API

Build API to query logs:

```go
// GET /api/logs?request_id=abc-123&level=error&from=2024-01-01
func (h *LogHandler) Query(c *fiber.Ctx) error {
    requestID := c.Query("request_id")
    level := c.Query("level")
    from := c.Query("from")
    
    // Query dari Elasticsearch atau file
    logs := queryLogs(requestID, level, from)
    
    return c.JSON(logs)
}
```

---

### 10. Grafana Dashboard untuk Metrics

Setup Grafana dashboard:

```yaml
# docker-compose.yml
grafana:
  image: grafana/grafana:latest
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
  volumes:
    - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    - ./grafana/datasources:/etc/grafana/provisioning/datasources
```

```json
// grafana/datasources/prometheus.yml
{
  "name": "Prometheus",
  "type": "prometheus",
  "url": "http://prometheus:9090",
  "access": "proxy"
}
```

Create dashboard panels:
- HTTP request rate (requests/sec)
- HTTP latency percentiles (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active users gauge
- Database query duration

---

