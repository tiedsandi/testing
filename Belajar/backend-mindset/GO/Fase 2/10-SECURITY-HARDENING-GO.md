# BELAJAR SECURITY HARDENING GO FIBER API

## Penjelasan Konsep

**Security Hardening** adalah proses memperkuat keamanan aplikasi dengan menambahkan layer proteksi berlapis untuk mencegah serangan seperti XSS, SQL Injection, CSRF, DDoS, dan lainnya. Di Go Fiber, kita menggunakan berbagai middleware dan best practices untuk melindungi API.

**Analogi TypeScript/Next.js:**
```typescript
// TypeScript dengan Express + Helmet
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);
```

**Konsep penting:**
1. **Defense in Depth**: Multiple layers of security
2. **Principle of Least Privilege**: Minimal access yang dibutuhkan
3. **Fail Secure**: Kalau error, default ke deny access
4. **Input Validation**: Never trust user input
5. **Keep Dependencies Updated**: Regular security audits

---

## Struktur Project

```
secure-api-go/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/
│   │   ├── config.go
│   │   └── validator.go
│   ├── domain/
│   │   └── user.go
│   ├── dto/
│   │   └── product_dto.go
│   ├── repository/
│   │   ├── user_repository.go
│   │   └── product_repository.go
│   ├── service/
│   │   ├── auth_service.go
│   │   └── product_service.go
│   ├── handler/
│   │   ├── auth_handler.go
│   │   └── product_handler.go
│   └── middleware/
│       ├── cors.go
│       ├── rate_limiter.go
│       ├── helmet.go
│       ├── https_redirect.go
│       ├── sanitize.go
│       ├── auth.go
│       └── error_handler.go
├── pkg/
│   ├── utils/
│   │   ├── sanitizer.go
│   │   └── validator.go
│   └── errors/
│       └── app_error.go
├── .env.example
├── .env
├── go.mod
└── go.sum
```

---

## 1. Setup Dependencies

```bash
# Install dependencies
go get github.com/gofiber/fiber/v2
go get github.com/gofiber/contrib/cors
go get github.com/gofiber/contrib/helmet
go get github.com/gofiber/contrib/limiter
go get github.com/golang-jwt/jwt/v5
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/joho/godotenv
go get github.com/google/uuid
go get github.com/microcosm-cc/bluemonday
go get golang.org/x/crypto/bcrypt

# Install govulncheck untuk audit dependencies
go install golang.org/x/vuln/cmd/govulncheck@latest
```

**go.mod:**
```go
module secure-api-go

go 1.21

require (
    github.com/gofiber/fiber/v2 v2.52.0
    github.com/gofiber/contrib/cors v1.0.0
    github.com/gofiber/contrib/helmet v1.0.0
    github.com/gofiber/contrib/limiter v1.0.0
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/joho/godotenv v1.5.1
    github.com/google/uuid v1.5.0
    github.com/microcosm-cc/bluemonday v1.0.26
    golang.org/x/crypto v0.17.0
    gorm.io/gorm v1.25.5
    gorm.io/driver/postgres v1.5.4
)
```

---

## 2. Environment Configuration (Secure)

**.env.example:**
```env
# Server
APP_ENV=development
PORT=8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=secure_db

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRY=24h

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
ALLOWED_METHODS=GET,POST,PUT,DELETE,PATCH
ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_DURATION=15m

# HTTPS (production only)
FORCE_HTTPS=false
```

**.env (for development):**
```env
APP_ENV=development
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=secure_db
JWT_SECRET=dev-secret-key-change-in-production-minimum-32-chars
JWT_EXPIRY=24h
ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_METHODS=GET,POST,PUT,DELETE,PATCH
ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With
RATE_LIMIT_MAX=100
RATE_LIMIT_DURATION=15m
FORCE_HTTPS=false
```

**internal/config/config.go:**
```go
package config

import (
    "fmt"
    "os"
    "strconv"
    "strings"
    "time"

    "github.com/joho/godotenv"
)

type Config struct {
    App         AppConfig
    Server      ServerConfig
    Database    DatabaseConfig
    JWT         JWTConfig
    CORS        CORSConfig
    RateLimit   RateLimitConfig
    Security    SecurityConfig
}

type AppConfig struct {
    Env string // development, staging, production
}

type ServerConfig struct {
    Port string
}

type DatabaseConfig struct {
    Host     string
    Port     string
    User     string
    Password string
    DBName   string
}

type JWTConfig struct {
    Secret string
    Expiry time.Duration
}

type CORSConfig struct {
    AllowedOrigins []string
    AllowedMethods []string
    AllowedHeaders []string
}

type RateLimitConfig struct {
    Max      int
    Duration time.Duration
}

type SecurityConfig struct {
    ForceHTTPS bool
}

func LoadConfig() (*Config, error) {
    // Load .env file
    if err := godotenv.Load(); err != nil {
        return nil, fmt.Errorf("error loading .env file: %w", err)
    }

    // Parse JWT expiry
    jwtExpiry, err := time.ParseDuration(getEnvOrPanic("JWT_EXPIRY"))
    if err != nil {
        return nil, fmt.Errorf("invalid JWT_EXPIRY format: %w", err)
    }

    // Parse rate limit duration
    rateLimitDuration, err := time.ParseDuration(getEnvOrPanic("RATE_LIMIT_DURATION"))
    if err != nil {
        return nil, fmt.Errorf("invalid RATE_LIMIT_DURATION format: %w", err)
    }

    // Parse rate limit max
    rateLimitMax, err := strconv.Atoi(getEnvOrPanic("RATE_LIMIT_MAX"))
    if err != nil {
        return nil, fmt.Errorf("invalid RATE_LIMIT_MAX: %w", err)
    }

    // Parse FORCE_HTTPS
    forceHTTPS, _ := strconv.ParseBool(os.Getenv("FORCE_HTTPS"))

    cfg := &Config{
        App: AppConfig{
            Env: getEnvOrPanic("APP_ENV"),
        },
        Server: ServerConfig{
            Port: getEnvOrPanic("PORT"),
        },
        Database: DatabaseConfig{
            Host:     getEnvOrPanic("DB_HOST"),
            Port:     getEnvOrPanic("DB_PORT"),
            User:     getEnvOrPanic("DB_USER"),
            Password: getEnvOrPanic("DB_PASSWORD"),
            DBName:   getEnvOrPanic("DB_NAME"),
        },
        JWT: JWTConfig{
            Secret: getEnvOrPanic("JWT_SECRET"),
            Expiry: jwtExpiry,
        },
        CORS: CORSConfig{
            AllowedOrigins: strings.Split(getEnvOrPanic("ALLOWED_ORIGINS"), ","),
            AllowedMethods: strings.Split(getEnvOrPanic("ALLOWED_METHODS"), ","),
            AllowedHeaders: strings.Split(getEnvOrPanic("ALLOWED_HEADERS"), ","),
        },
        RateLimit: RateLimitConfig{
            Max:      rateLimitMax,
            Duration: rateLimitDuration,
        },
        Security: SecurityConfig{
            ForceHTTPS: forceHTTPS,
        },
    }

    // Validate config
    if err := ValidateConfig(cfg); err != nil {
        return nil, err
    }

    return cfg, nil
}

func (c *DatabaseConfig) DSN() string {
    return fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        c.Host, c.Port, c.User, c.Password, c.DBName,
    )
}

// getEnvOrPanic gets env variable or panics if not found (fail fast)
func getEnvOrPanic(key string) string {
    value := os.Getenv(key)
    if value == "" {
        panic(fmt.Sprintf("Environment variable %s is required but not set", key))
    }
    return value
}

func (c *Config) IsDevelopment() bool {
    return c.App.Env == "development"
}

func (c *Config) IsProduction() bool {
    return c.App.Env == "production"
}
```

**internal/config/validator.go:**
```go
package config

import (
    "fmt"
    "strings"
)

// ValidateConfig validates all configuration values
func ValidateConfig(cfg *Config) error {
    // Validate JWT Secret length (minimum 32 characters)
    if len(cfg.JWT.Secret) < 32 {
        return fmt.Errorf("JWT_SECRET must be at least 32 characters long for security")
    }

    // Validate APP_ENV
    validEnvs := []string{"development", "staging", "production"}
    if !contains(validEnvs, cfg.App.Env) {
        return fmt.Errorf("APP_ENV must be one of: %s", strings.Join(validEnvs, ", "))
    }

    // Validate CORS origins
    if len(cfg.CORS.AllowedOrigins) == 0 {
        return fmt.Errorf("ALLOWED_ORIGINS must not be empty")
    }

    // Production-specific validations
    if cfg.IsProduction() {
        // In production, JWT secret should not contain "dev" or "test"
        if strings.Contains(strings.ToLower(cfg.JWT.Secret), "dev") ||
            strings.Contains(strings.ToLower(cfg.JWT.Secret), "test") {
            return fmt.Errorf("JWT_SECRET appears to be a development/test secret in production")
        }

        // In production, CORS should not allow all origins
        for _, origin := range cfg.CORS.AllowedOrigins {
            if origin == "*" {
                return fmt.Errorf("CORS AllowedOrigins should not use '*' in production")
            }
        }

        // In production, should use HTTPS
        if !cfg.Security.ForceHTTPS {
            fmt.Println("WARNING: FORCE_HTTPS is false in production. Consider enabling it.")
        }
    }

    return nil
}

func contains(slice []string, item string) bool {
    for _, s := range slice {
        if s == item {
            return true
        }
    }
    return false
}
```

---

## 3. CORS Middleware

**internal/middleware/cors.go:**
```go
package middleware

import (
    "secure-api-go/internal/config"
    "strings"

    "github.com/gofiber/contrib/cors"
    "github.com/gofiber/fiber/v2"
)

func NewCORS(cfg *config.Config) fiber.Handler {
    // Development config - more permissive
    if cfg.IsDevelopment() {
        return cors.New(cors.Config{
            AllowOrigins:     strings.Join(cfg.CORS.AllowedOrigins, ","),
            AllowMethods:     strings.Join(cfg.CORS.AllowedMethods, ","),
            AllowHeaders:     strings.Join(cfg.CORS.AllowedHeaders, ","),
            AllowCredentials: true,
            MaxAge:           300, // 5 minutes
        })
    }

    // Production config - strict
    return cors.New(cors.Config{
        AllowOrigins:     strings.Join(cfg.CORS.AllowedOrigins, ","),
        AllowMethods:     strings.Join(cfg.CORS.AllowedMethods, ","),
        AllowHeaders:     strings.Join(cfg.CORS.AllowedHeaders, ","),
        AllowCredentials: true,
        MaxAge:           3600,           // 1 hour
        ExposeHeaders:    "Content-Length", // Headers yang bisa diakses client
    })
}
```

---

## 4. Rate Limiting Middleware

**internal/middleware/rate_limiter.go:**
```go
package middleware

import (
    "fmt"
    "secure-api-go/internal/config"
    "strings"
    "time"

    "github.com/gofiber/contrib/limiter"
    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
)

// NewIPRateLimiter creates rate limiter based on IP address
func NewIPRateLimiter(cfg *config.Config) fiber.Handler {
    return limiter.New(limiter.Config{
        Max:        cfg.RateLimit.Max,
        Expiration: cfg.RateLimit.Duration,
        
        // Key generator: rate limit per IP
        KeyGenerator: func(c *fiber.Ctx) string {
            return c.IP()
        },
        
        // Custom response when limit exceeded
        LimitReached: func(c *fiber.Ctx) error {
            return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
                "error":   true,
                "message": "Too many requests. Please try again later.",
                "retry_after": cfg.RateLimit.Duration.Seconds(),
            })
        },
        
        // Storage: In-memory (production: gunakan Redis)
        // Storage: limiter.ConfigDefault.Storage,
    })
}

// NewUserRateLimiter creates rate limiter based on authenticated user
func NewUserRateLimiter(cfg *config.Config, jwtSecret string) fiber.Handler {
    return limiter.New(limiter.Config{
        Max:        cfg.RateLimit.Max * 2, // Authenticated users get higher limit
        Expiration: cfg.RateLimit.Duration,
        
        // Custom key extractor: rate limit per user ID from JWT
        KeyGenerator: func(c *fiber.Ctx) string {
            // Extract user ID from JWT
            userID := extractUserIDFromJWT(c, jwtSecret)
            if userID == "" {
                // Fallback to IP if no valid JWT
                return "ip:" + c.IP()
            }
            return "user:" + userID
        },
        
        LimitReached: func(c *fiber.Ctx) error {
            return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
                "error":   true,
                "message": "Rate limit exceeded for your account.",
                "retry_after": cfg.RateLimit.Duration.Seconds(),
            })
        },
    })
}

// NewAPIKeyRateLimiter creates rate limiter for API endpoints with different limits
func NewAPIKeyRateLimiter(maxRequests int, duration time.Duration) fiber.Handler {
    return limiter.New(limiter.Config{
        Max:        maxRequests,
        Expiration: duration,
        
        KeyGenerator: func(c *fiber.Ctx) string {
            // Custom key: combine IP + endpoint
            return c.IP() + ":" + c.Path()
        },
        
        LimitReached: func(c *fiber.Ctx) error {
            return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
                "error":   true,
                "message": fmt.Sprintf("Rate limit exceeded for endpoint %s", c.Path()),
                "retry_after": duration.Seconds(),
            })
        },
    })
}

// extractUserIDFromJWT extracts user ID from JWT token
func extractUserIDFromJWT(c *fiber.Ctx, jwtSecret string) string {
    authHeader := c.Get("Authorization")
    if authHeader == "" {
        return ""
    }

    // Extract token from "Bearer <token>"
    parts := strings.Split(authHeader, " ")
    if len(parts) != 2 || parts[0] != "Bearer" {
        return ""
    }

    tokenString := parts[1]

    // Parse JWT
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        return []byte(jwtSecret), nil
    })

    if err != nil || !token.Valid {
        return ""
    }

    // Extract user ID from claims
    if claims, ok := token.Claims.(jwt.MapClaims); ok {
        if userID, ok := claims["user_id"].(string); ok {
            return userID
        }
    }

    return ""
}
```

---

## 5. Helmet Middleware (Security Headers)

**internal/middleware/helmet.go:**
```go
package middleware

import (
    "secure-api-go/internal/config"

    "github.com/gofiber/contrib/helmet"
    "github.com/gofiber/fiber/v2"
)

func NewHelmet(cfg *config.Config) fiber.Handler {
    helmetConfig := helmet.Config{
        // X-Content-Type-Options: prevent MIME sniffing
        XContentTypeOptions: "nosniff",
        
        // X-Frame-Options: prevent clickjacking
        XFrameOptions: "DENY",
        
        // X-XSS-Protection: enable XSS filter (legacy, CSP is better)
        XXSSProtection: "1; mode=block",
        
        // Content-Security-Policy: prevent XSS, injection attacks
        ContentSecurityPolicy: buildCSP(cfg),
        
        // Referrer-Policy: control referer header
        ReferrerPolicy: "strict-origin-when-cross-origin",
        
        // Permissions-Policy: control browser features
        PermissionsPolicy: "geolocation=(), microphone=(), camera=()",
    }

    // Production-only headers
    if cfg.IsProduction() {
        // HSTS: force HTTPS for 1 year
        helmetConfig.HSTSMaxAge = 31536000 // 1 year in seconds
        helmetConfig.HSTSIncludeSubdomains = true
        helmetConfig.HSTSPreload = true
    }

    return helmet.New(helmetConfig)
}

// buildCSP builds Content-Security-Policy based on environment
func buildCSP(cfg *config.Config) string {
    if cfg.IsDevelopment() {
        // Development: more permissive for hot reload, etc
        return "default-src 'self' http://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    }

    // Production: strict policy
    return "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
}
```

---

## 6. Input Sanitization

**pkg/utils/sanitizer.go:**
```go
package utils

import (
    "bytes"
    "fmt"
    "strings"

    "github.com/microcosm-cc/bluemonday"
)

var (
    // StrictPolicy: strip all HTML
    StrictPolicy = bluemonday.StrictPolicy()
    
    // UGCPolicy: allow safe HTML for user-generated content
    UGCPolicy = bluemonday.UGCPolicy()
)

// SanitizeString removes all HTML tags and trims whitespace
func SanitizeString(input string) string {
    // Strip HTML
    sanitized := StrictPolicy.Sanitize(input)
    
    // Trim whitespace
    sanitized = strings.TrimSpace(sanitized)
    
    // Remove null bytes
    sanitized = strings.ReplaceAll(sanitized, "\x00", "")
    
    return sanitized
}

// SanitizeHTML allows safe HTML for user content (comments, posts, etc)
func SanitizeHTML(input string) string {
    // Allow safe HTML tags: <p>, <a>, <strong>, <em>, etc
    sanitized := UGCPolicy.Sanitize(input)
    
    // Remove null bytes
    sanitized = strings.ReplaceAll(sanitized, "\x00", "")
    
    return sanitized
}

// ValidateNoNullBytes checks if string contains null bytes
func ValidateNoNullBytes(input string) error {
    if bytes.ContainsRune([]byte(input), '\x00') {
        return fmt.Errorf("input contains null bytes")
    }
    return nil
}

// SanitizeEmail removes potentially dangerous characters from email
func SanitizeEmail(email string) string {
    email = strings.TrimSpace(email)
    email = strings.ToLower(email)
    
    // Remove null bytes
    email = strings.ReplaceAll(email, "\x00", "")
    
    return email
}

// TrimAllStrings trims whitespace from all string values in a map
func TrimAllStrings(data map[string]interface{}) map[string]interface{} {
    for key, value := range data {
        if str, ok := value.(string); ok {
            data[key] = strings.TrimSpace(str)
        }
    }
    return data
}
```

**internal/middleware/sanitize.go:**
```go
package middleware

import (
    "secure-api-go/pkg/utils"

    "github.com/gofiber/fiber/v2"
)

// SanitizeInput is middleware to sanitize all input
func SanitizeInput() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Check for null bytes in request body
        bodyBytes := c.Body()
        if len(bodyBytes) > 0 {
            if err := utils.ValidateNoNullBytes(string(bodyBytes)); err != nil {
                return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                    "error":   true,
                    "message": "Invalid input: contains null bytes",
                })
            }
        }

        // Check for null bytes in query parameters
        c.Request().URI().QueryArgs().VisitAll(func(key, value []byte) {
            if err := utils.ValidateNoNullBytes(string(value)); err != nil {
                c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                    "error":   true,
                    "message": "Invalid query parameter: contains null bytes",
                })
                return
            }
        })

        return c.Next()
    }
}
```

---

## 7. SQL Injection Prevention

**internal/repository/product_repository.go:**
```go
package repository

import (
    "fmt"
    "secure-api-go/internal/domain"

    "gorm.io/gorm"
)

type ProductRepository interface {
    FindAll() ([]domain.Product, error)
    FindByID(id string) (*domain.Product, error)
    Search(query string) ([]domain.Product, error)
    SearchUnsafe(query string) ([]domain.Product, error) // DANGEROUS - for demo only
    Create(product *domain.Product) error
    Update(product *domain.Product) error
    Delete(id string) error
}

type productRepository struct {
    db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ProductRepository {
    return &productRepository{db: db}
}

// FindAll - SAFE: GORM uses parameterized queries
func (r *productRepository) FindAll() ([]domain.Product, error) {
    var products []domain.Product
    if err := r.db.Find(&products).Error; err != nil {
        return nil, err
    }
    return products, nil
}

// FindByID - SAFE: GORM uses parameterized queries
func (r *productRepository) FindByID(id string) (*domain.Product, error) {
    var product domain.Product
    // SAFE: GORM automatically uses parameterized query
    if err := r.db.Where("id = ?", id).First(&product).Error; err != nil {
        return nil, err
    }
    return &product, nil
}

// Search - SAFE: Uses parameterized query with placeholder
func (r *productRepository) Search(query string) ([]domain.Product, error) {
    var products []domain.Product
    
    // ✅ SAFE: Using ? placeholder
    if err := r.db.Where("name ILIKE ?", "%"+query+"%").Find(&products).Error; err != nil {
        return nil, err
    }
    
    return products, nil
}

// SearchWithRaw - SAFE: Raw query with placeholder
func (r *productRepository) SearchWithRaw(query string) ([]domain.Product, error) {
    var products []domain.Product
    
    // ✅ SAFE: Using ? placeholder in raw query
    sql := "SELECT * FROM products WHERE name ILIKE ?"
    if err := r.db.Raw(sql, "%"+query+"%").Scan(&products).Error; err != nil {
        return nil, err
    }
    
    return products, nil
}

// SearchUnsafe - DANGEROUS: String concatenation (for demo only)
func (r *productRepository) SearchUnsafe(query string) ([]domain.Product, error) {
    var products []domain.Product
    
    // ❌ DANGEROUS: SQL Injection vulnerable!
    // Jika query = "'; DROP TABLE products; --"
    // SQL jadi: SELECT * FROM products WHERE name ILIKE '%'; DROP TABLE products; --%'
    sql := fmt.Sprintf("SELECT * FROM products WHERE name ILIKE '%%%s%%'", query)
    
    if err := r.db.Raw(sql).Scan(&products).Error; err != nil {
        return nil, err
    }
    
    return products, nil
}

// Create - SAFE: GORM uses parameterized queries
func (r *productRepository) Create(product *domain.Product) error {
    return r.db.Create(product).Error
}

// Update - SAFE: GORM uses parameterized queries
func (r *productRepository) Update(product *domain.Product) error {
    return r.db.Save(product).Error
}

// Delete - SAFE: GORM uses parameterized queries
func (r *productRepository) Delete(id string) error {
    return r.db.Delete(&domain.Product{}, "id = ?", id).Error
}

// Advanced: Dynamic query builder - SAFE way
func (r *productRepository) SearchWithFilters(filters map[string]interface{}) ([]domain.Product, error) {
    var products []domain.Product
    
    query := r.db.Model(&domain.Product{})
    
    // ✅ SAFE: Build query dynamically with parameterized conditions
    for key, value := range filters {
        switch key {
        case "name":
            query = query.Where("name ILIKE ?", "%"+value.(string)+"%")
        case "category":
            query = query.Where("category = ?", value)
        case "min_price":
            query = query.Where("price >= ?", value)
        case "max_price":
            query = query.Where("price <= ?", value)
        }
    }
    
    if err := query.Find(&products).Error; err != nil {
        return nil, err
    }
    
    return products, nil
}
```

---

## 8. HTTPS Redirect Middleware

**internal/middleware/https_redirect.go:**
```go
package middleware

import (
    "secure-api-go/internal/config"

    "github.com/gofiber/fiber/v2"
)

// NewHTTPSRedirect redirects HTTP to HTTPS in production
func NewHTTPSRedirect(cfg *config.Config) fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Only enforce HTTPS in production
        if !cfg.Security.ForceHTTPS {
            return c.Next()
        }

        // Check if request is already HTTPS
        if c.Protocol() == "https" {
            return c.Next()
        }

        // Check X-Forwarded-Proto header (for proxies/load balancers)
        if c.Get("X-Forwarded-Proto") == "https" {
            return c.Next()
        }

        // Redirect to HTTPS
        return c.Redirect("https://"+c.Hostname()+c.OriginalURL(), fiber.StatusMovedPermanently)
    }
}
```

---

## 9. Hide Server Headers

**internal/middleware/hide_headers.go:**
```go
package middleware

import (
    "github.com/gofiber/fiber/v2"
)

// HideServerHeaders removes/modifies headers that reveal server info
func HideServerHeaders() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Execute request first
        err := c.Next()

        // Remove/modify headers that reveal server information
        c.Response().Header.Del("Server")           // Remove "Fiber" header
        c.Response().Header.Del("X-Powered-By")     // Remove framework info
        
        // Optionally set generic server header
        // c.Set("Server", "WebServer")

        return err
    }
}
```

---

## 10. Domain & DTOs

**internal/domain/user.go:**
```go
package domain

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

type User struct {
    ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    Name      string    `gorm:"not null" json:"name"`
    Email     string    `gorm:"uniqueIndex;not null" json:"email"`
    Password  string    `gorm:"not null" json:"-"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
    if u.ID == uuid.Nil {
        u.ID = uuid.New()
    }
    return nil
}
```

**internal/domain/product.go:**
```go
package domain

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Product struct {
    ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    Name        string    `gorm:"not null" json:"name"`
    Description string    `json:"description"`
    Price       float64   `gorm:"not null" json:"price"`
    Category    string    `json:"category"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

func (p *Product) BeforeCreate(tx *gorm.DB) error {
    if p.ID == uuid.Nil {
        p.ID = uuid.New()
    }
    return nil
}
```

**internal/dto/product_dto.go:**
```go
package dto

type CreateProductRequest struct {
    Name        string  `json:"name" validate:"required,min=3,max=100"`
    Description string  `json:"description" validate:"max=500"`
    Price       float64 `json:"price" validate:"required,gt=0"`
    Category    string  `json:"category" validate:"required"`
}

type UpdateProductRequest struct {
    Name        string  `json:"name" validate:"omitempty,min=3,max=100"`
    Description string  `json:"description" validate:"max=500"`
    Price       float64 `json:"price" validate:"omitempty,gt=0"`
    Category    string  `json:"category"`
}

type SearchProductRequest struct {
    Query    string  `query:"q"`
    Category string  `query:"category"`
    MinPrice float64 `query:"min_price"`
    MaxPrice float64 `query:"max_price"`
}
```

---

## 11. Services & Handlers

**internal/service/product_service.go:**
```go
package service

import (
    "secure-api-go/internal/domain"
    "secure-api-go/internal/dto"
    "secure-api-go/internal/repository"
    "secure-api-go/pkg/errors"
    "secure-api-go/pkg/utils"
)

type ProductService interface {
    GetAll() ([]domain.Product, error)
    GetByID(id string) (*domain.Product, error)
    Search(req dto.SearchProductRequest) ([]domain.Product, error)
    Create(req dto.CreateProductRequest) (*domain.Product, error)
    Update(id string, req dto.UpdateProductRequest) (*domain.Product, error)
    Delete(id string) error
}

type productService struct {
    productRepo repository.ProductRepository
}

func NewProductService(productRepo repository.ProductRepository) ProductService {
    return &productService{productRepo: productRepo}
}

func (s *productService) GetAll() ([]domain.Product, error) {
    return s.productRepo.FindAll()
}

func (s *productService) GetByID(id string) (*domain.Product, error) {
    // Sanitize input
    id = utils.SanitizeString(id)
    
    product, err := s.productRepo.FindByID(id)
    if err != nil {
        return nil, errors.NewNotFoundError("Product not found")
    }
    return product, nil
}

func (s *productService) Search(req dto.SearchProductRequest) ([]domain.Product, error) {
    // Sanitize search query
    req.Query = utils.SanitizeString(req.Query)
    req.Category = utils.SanitizeString(req.Category)
    
    // Build filters
    filters := make(map[string]interface{})
    if req.Query != "" {
        filters["name"] = req.Query
    }
    if req.Category != "" {
        filters["category"] = req.Category
    }
    if req.MinPrice > 0 {
        filters["min_price"] = req.MinPrice
    }
    if req.MaxPrice > 0 {
        filters["max_price"] = req.MaxPrice
    }
    
    return s.productRepo.SearchWithFilters(filters)
}

func (s *productService) Create(req dto.CreateProductRequest) (*domain.Product, error) {
    // Sanitize input
    req.Name = utils.SanitizeString(req.Name)
    req.Description = utils.SanitizeHTML(req.Description) // Allow safe HTML
    req.Category = utils.SanitizeString(req.Category)
    
    product := &domain.Product{
        Name:        req.Name,
        Description: req.Description,
        Price:       req.Price,
        Category:    req.Category,
    }
    
    if err := s.productRepo.Create(product); err != nil {
        return nil, errors.WrapError(err, "Failed to create product")
    }
    
    return product, nil
}

func (s *productService) Update(id string, req dto.UpdateProductRequest) (*domain.Product, error) {
    // Sanitize input
    id = utils.SanitizeString(id)
    
    product, err := s.productRepo.FindByID(id)
    if err != nil {
        return nil, errors.NewNotFoundError("Product not found")
    }
    
    // Update fields
    if req.Name != "" {
        product.Name = utils.SanitizeString(req.Name)
    }
    if req.Description != "" {
        product.Description = utils.SanitizeHTML(req.Description)
    }
    if req.Price > 0 {
        product.Price = req.Price
    }
    if req.Category != "" {
        product.Category = utils.SanitizeString(req.Category)
    }
    
    if err := s.productRepo.Update(product); err != nil {
        return nil, errors.WrapError(err, "Failed to update product")
    }
    
    return product, nil
}

func (s *productService) Delete(id string) error {
    id = utils.SanitizeString(id)
    
    if err := s.productRepo.Delete(id); err != nil {
        return errors.WrapError(err, "Failed to delete product")
    }
    return nil
}
```

**internal/handler/product_handler.go:**
```go
package handler

import (
    "secure-api-go/internal/dto"
    "secure-api-go/internal/service"
    "secure-api-go/pkg/errors"

    "github.com/gofiber/fiber/v2"
)

type ProductHandler struct {
    productService service.ProductService
}

func NewProductHandler(productService service.ProductService) *ProductHandler {
    return &ProductHandler{productService: productService}
}

func (h *ProductHandler) GetAll(c *fiber.Ctx) error {
    products, err := h.productService.GetAll()
    if err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "data": products,
    })
}

func (h *ProductHandler) GetByID(c *fiber.Ctx) error {
    id := c.Params("id")
    
    product, err := h.productService.GetByID(id)
    if err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "data": product,
    })
}

func (h *ProductHandler) Search(c *fiber.Ctx) error {
    var req dto.SearchProductRequest
    if err := c.QueryParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid query parameters")
    }
    
    products, err := h.productService.Search(req)
    if err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "data": products,
    })
}

func (h *ProductHandler) Create(c *fiber.Ctx) error {
    var req dto.CreateProductRequest
    if err := c.BodyParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid request body")
    }

    product, err := h.productService.Create(req)
    if err != nil {
        return err
    }

    return c.Status(fiber.StatusCreated).JSON(fiber.Map{
        "data": product,
    })
}

func (h *ProductHandler) Update(c *fiber.Ctx) error {
    id := c.Params("id")
    
    var req dto.UpdateProductRequest
    if err := c.BodyParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid request body")
    }

    product, err := h.productService.Update(id, req)
    if err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "data": product,
    })
}

func (h *ProductHandler) Delete(c *fiber.Ctx) error {
    id := c.Params("id")
    
    if err := h.productService.Delete(id); err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "message": "Product deleted successfully",
    })
}
```

---

## 12. Main Application

**cmd/api/main.go:**
```go
package main

import (
    "log"
    "time"

    "secure-api-go/internal/config"
    "secure-api-go/internal/domain"
    "secure-api-go/internal/handler"
    "secure-api-go/internal/middleware"
    "secure-api-go/internal/repository"
    "secure-api-go/internal/service"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

func main() {
    // Load config (will panic if required env vars missing - fail fast)
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }

    log.Printf("Starting server in %s mode", cfg.App.Env)

    // Connect to database
    db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect database:", err)
    }

    // Auto migrate
    if err := db.AutoMigrate(&domain.User{}, &domain.Product{}); err != nil {
        log.Fatal("Failed to migrate database:", err)
    }

    // Initialize repositories
    productRepo := repository.NewProductRepository(db)

    // Initialize services
    productService := service.NewProductService(productRepo)

    // Initialize handlers
    productHandler := handler.NewProductHandler(productService)

    // Create Fiber app
    app := fiber.New(fiber.Config{
        // Hide server header
        ServerHeader: "",
        
        // Custom error handler
        ErrorHandler: middleware.ErrorHandler,
        
        // Body limit
        BodyLimit: 4 * 1024 * 1024, // 4MB
        
        // Read/Write timeout
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
    })

    // Global middleware (order matters!)
    app.Use(recover.New())                         // Recover from panics
    app.Use(middleware.HideServerHeaders())         // Hide server info
    app.Use(middleware.NewHTTPSRedirect(cfg))      // Redirect HTTP to HTTPS
    app.Use(logger.New())                          // Request logger
    app.Use(middleware.NewCORS(cfg))               // CORS
    app.Use(middleware.NewHelmet(cfg))             // Security headers
    app.Use(middleware.SanitizeInput())            // Input sanitization
    app.Use(middleware.NewIPRateLimiter(cfg))      // Global rate limiting

    // Routes
    api := app.Group("/api")
    
    // Public routes
    products := api.Group("/products")
    {
        products.Get("/", productHandler.GetAll)
        products.Get("/search", productHandler.Search)
        products.Get("/:id", productHandler.GetByID)
        
        // Protected routes with stricter rate limit
        products.Post("/", 
            middleware.NewAPIKeyRateLimiter(20, 1*time.Minute),
            productHandler.Create,
        )
        products.Put("/:id", 
            middleware.NewAPIKeyRateLimiter(20, 1*time.Minute),
            productHandler.Update,
        )
        products.Delete("/:id", 
            middleware.NewAPIKeyRateLimiter(10, 1*time.Minute),
            productHandler.Delete,
        )
    }

    // Health check
    app.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "status": "ok",
            "env":    cfg.App.Env,
        })
    })

    // 404 handler
    app.Use(func(c *fiber.Ctx) error {
        return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
            "error":   true,
            "message": "Route not found",
        })
    })

    // Start server
    port := cfg.Server.Port
    log.Printf("Server running on port %s", port)
    log.Printf("Environment: %s", cfg.App.Env)
    log.Printf("CORS Origins: %v", cfg.CORS.AllowedOrigins)
    log.Printf("Rate Limit: %d requests per %s", cfg.RateLimit.Max, cfg.RateLimit.Duration)
    log.Printf("HTTPS Redirect: %v", cfg.Security.ForceHTTPS)
    
    if err := app.Listen(":" + port); err != nil {
        log.Fatal(err)
    }
}
```

---

## 13. Dependency Audit dengan govulncheck

**Makefile:**
```makefile
.PHONY: vuln-check deps-upgrade security-audit

# Check for known vulnerabilities
vuln-check:
	@echo "Running vulnerability check..."
	govulncheck ./...

# Upgrade dependencies
deps-upgrade:
	@echo "Upgrading dependencies..."
	go get -u ./...
	go mod tidy

# Full security audit
security-audit:
	@echo "=== Security Audit ==="
	@echo "\n1. Checking for vulnerabilities..."
	govulncheck ./...
	@echo "\n2. Checking for outdated dependencies..."
	go list -u -m all
	@echo "\n3. Running go vet..."
	go vet ./...
	@echo "\n4. Checking module dependencies..."
	go mod verify
	@echo "\n=== Audit Complete ==="

# Run tests
test:
	go test -v -race -cover ./...

# Build for production
build:
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/api cmd/api/main.go

# Run locally
run:
	go run cmd/api/main.go
```

**Cara pakai:**
```bash
# Install govulncheck
go install golang.org/x/vuln/cmd/govulncheck@latest

# Run vulnerability check
make vuln-check

# Output example:
# govulncheck ./...
# Scanning your code and 52 packages across 1 dependent module for known vulnerabilities...
# No vulnerabilities found.

# Or jika ada vulnerability:
# Vulnerability #1: GO-2023-1234
#   A timing attack vulnerability exists in golang.org/x/crypto/ssh
#   More info: https://pkg.go.dev/vuln/GO-2023-1234
#   Module: golang.org/x/crypto
#   Found in: golang.org/x/crypto@v0.0.0-20220525230936-793ad666bf5e
#   Fixed in: golang.org/x/crypto@v0.1.0

# Upgrade vulnerable dependency
go get golang.org/x/crypto@v0.1.0
go mod tidy

# Full security audit
make security-audit
```

---

## Testing Security Features

### 1. Test CORS
```bash
# Test CORS from allowed origin
curl -X OPTIONS http://localhost:8080/api/products \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Should see:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH

# Test from disallowed origin
curl -X OPTIONS http://localhost:8080/api/products \
  -H "Origin: http://evil.com" \
  -v

# Should NOT see Access-Control-Allow-Origin header
```

### 2. Test Rate Limiting
```bash
# Send 101 requests quickly (limit is 100)
for i in {1..101}; do
  curl -X GET http://localhost:8080/api/products -w "\nStatus: %{http_code}\n"
done

# Request 101 should return:
# Status: 429
# {
#   "error": true,
#   "message": "Too many requests. Please try again later.",
#   "retry_after": 900
# }
```

### 3. Test Security Headers
```bash
curl -I http://localhost:8080/api/products

# Should see headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-Xss-Protection: 1; mode=block
# Content-Security-Policy: default-src 'self'; ...
# Referrer-Policy: strict-origin-when-cross-origin
```

### 4. Test Input Sanitization
```bash
# Test XSS attempt
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert(\"XSS\")</script>Product",
    "description": "<b>Bold</b> text with <script>bad()</script>",
    "price": 100,
    "category": "Electronics"
  }'

# Response should have sanitized HTML:
# {
#   "data": {
#     "name": "Product",  // <script> stripped
#     "description": "<b>Bold</b> text with ",  // safe HTML kept, script removed
#     "price": 100,
#     "category": "Electronics"
#   }
# }
```

### 5. Test SQL Injection Prevention
```bash
# Attempt SQL injection in search
curl "http://localhost:8080/api/products/search?q='; DROP TABLE products; --"

# Should return empty results, NOT drop table
# {
#   "data": []
# }

# Test with null byte
curl "http://localhost:8080/api/products/search?q=test%00DROP"

# Should return 400 Bad Request:
# {
#   "error": true,
#   "message": "Invalid query parameter: contains null bytes"
# }
```

### 6. Test HTTPS Redirect (in production)
```bash
# Set FORCE_HTTPS=true in .env
curl -X GET http://localhost:8080/api/products -v

# Should redirect:
# HTTP/1.1 301 Moved Permanently
# Location: https://localhost:8080/api/products
```

---

## 8 Kesalahan Umum & Solusinya

### 1. **Hardcode secrets di code**
**Masalah:**
```go
// ❌ BAHAYA: Secret di code
const jwtSecret = "my-secret-key"
const dbPassword = "postgres123"
```

**Solusi:**
```go
// ✅ AMAN: Load dari environment variable
jwtSecret := os.Getenv("JWT_SECRET")
if jwtSecret == "" {
    panic("JWT_SECRET is required")
}
```

---

### 2. **CORS allow all origins di production**
**Masalah:**
```go
// ❌ BAHAYA: Allow semua origin
AllowOrigins: "*"
```

**Solusi:**
```go
// ✅ AMAN: Specify allowed origins
if cfg.IsProduction() {
    AllowOrigins: "https://myapp.com,https://www.myapp.com"
} else {
    AllowOrigins: "http://localhost:3000"
}
```

---

### 3. **Tidak validate/sanitize input**
**Masalah:**
```go
// ❌ BAHAYA: Langsung pakai input user
product.Name = req.Name
product.Description = req.Description
```

**Solusi:**
```go
// ✅ AMAN: Sanitize dulu
product.Name = utils.SanitizeString(req.Name)
product.Description = utils.SanitizeHTML(req.Description)
```

---

### 4. **String concatenation di SQL query**
**Masalah:**
```go
// ❌ BAHAYA: SQL Injection vulnerable
sql := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)
db.Raw(sql).Scan(&user)
```

**Solusi:**
```go
// ✅ AMAN: Use placeholder
db.Raw("SELECT * FROM users WHERE email = ?", email).Scan(&user)

// Atau gunakan GORM method (already safe)
db.Where("email = ?", email).First(&user)
```

---

### 5. **Tidak set rate limiting**
**Masalah:**
```go
// ❌ BAHAYA: No rate limiting = vulnerable to DDoS
app.Post("/api/login", loginHandler)
```

**Solusi:**
```go
// ✅ AMAN: Add rate limiting
app.Post("/api/login",
    middleware.NewAPIKeyRateLimiter(5, 1*time.Minute), // 5 login attempts per minute
    loginHandler,
)
```

---

### 6. **Expose server info di headers**
**Masalah:**
```go
// Default Fiber mengirim "Server: Fiber" header
// Membocorkan framework yang dipakai
```

**Solusi:**
```go
// ✅ AMAN: Hide server header
app := fiber.New(fiber.Config{
    ServerHeader: "", // Empty = no Server header
})

// Atau via middleware
app.Use(func(c *fiber.Ctx) error {
    c.Response().Header.Del("Server")
    c.Response().Header.Del("X-Powered-By")
    return c.Next()
})
```

---

### 7. **Tidak check dependency vulnerabilities**
**Masalah:**
```go
// Pakai dependencies lama dengan known vulnerabilities
// Tidak pernah audit atau update
```

**Solusi:**
```bash
# ✅ AMAN: Regular vulnerability checks
govulncheck ./...

# Update dependencies
go get -u ./...
go mod tidy

# Add to CI/CD pipeline
# .github/workflows/security.yml
```

---

### 8. **Tidak set HSTS header di production**
**Masalah:**
```go
// Tidak set HSTS = browser bisa access via HTTP
// Vulnerable to MITM attack
```

**Solusi:**
```go
// ✅ AMAN: Set HSTS di production
if cfg.IsProduction() {
    helmetConfig.HSTSMaxAge = 31536000 // 1 year
    helmetConfig.HSTSIncludeSubdomains = true
}
```

---

## 10 Ide Pengembangan

### 1. **Redis-based Rate Limiting**
```go
import "github.com/gofiber/storage/redis"

func NewRedisRateLimiter(cfg *config.Config) fiber.Handler {
    storage := redis.New(redis.Config{
        Host:     cfg.Redis.Host,
        Port:     cfg.Redis.Port,
        Password: cfg.Redis.Password,
    })

    return limiter.New(limiter.Config{
        Max:        cfg.RateLimit.Max,
        Expiration: cfg.RateLimit.Duration,
        Storage:    storage, // Persistent rate limiting
    })
}
```

---

### 2. **IP Whitelist/Blacklist**
```go
type IPFilter struct {
    Whitelist []string
    Blacklist []string
}

func (f *IPFilter) Middleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        ip := c.IP()
        
        // Check blacklist
        if f.isBlacklisted(ip) {
            return c.Status(403).JSON(fiber.Map{
                "error": "Access denied",
            })
        }
        
        // If whitelist exists, only allow whitelisted IPs
        if len(f.Whitelist) > 0 && !f.isWhitelisted(ip) {
            return c.Status(403).JSON(fiber.Map{
                "error": "Access denied",
            })
        }
        
        return c.Next()
    }
}
```

---

### 3. **Request ID Tracing**
```go
func RequestID() fiber.Handler {
    return func(c *fiber.Ctx) error {
        requestID := c.Get("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        
        // Set di response header
        c.Set("X-Request-ID", requestID)
        
        // Store di context untuk logging
        c.Locals("request_id", requestID)
        
        return c.Next()
    }
}

// Usage di logger:
log.Printf("[%s] Request: %s %s", requestID, c.Method(), c.Path())
```

---

### 4. **API Key Authentication**
```go
type APIKeyValidator struct {
    ValidKeys map[string]string // key -> user_id
}

func (v *APIKeyValidator) Middleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        apiKey := c.Get("X-API-Key")
        if apiKey == "" {
            return c.Status(401).JSON(fiber.Map{
                "error": "API key required",
            })
        }
        
        userID, valid := v.ValidKeys[apiKey]
        if !valid {
            return c.Status(401).JSON(fiber.Map{
                "error": "Invalid API key",
            })
        }
        
        c.Locals("user_id", userID)
        return c.Next()
    }
}
```

---

### 5. **Geo-blocking**
```go
import "github.com/oschwald/geoip2-golang"

type GeoBlocker struct {
    db            *geoip2.Reader
    BlockedCountries []string
}

func (g *GeoBlocker) Middleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        ip := net.ParseIP(c.IP())
        
        record, err := g.db.Country(ip)
        if err != nil {
            return c.Next()
        }
        
        // Block if from restricted country
        for _, blocked := range g.BlockedCountries {
            if record.Country.IsoCode == blocked {
                return c.Status(403).JSON(fiber.Map{
                    "error": "Access from your country is restricted",
                })
            }
        }
        
        return c.Next()
    }
}
```

---

### 6. **Audit Logging**
```go
type AuditLog struct {
    db *gorm.DB
}

func (a *AuditLog) Middleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        start := time.Now()
        
        // Process request
        err := c.Next()
        
        // Log after response
        go func() {
            a.db.Create(&AuditLogEntry{
                UserID:       c.Locals("user_id").(string),
                IP:           c.IP(),
                Method:       c.Method(),
                Path:         c.Path(),
                StatusCode:   c.Response().StatusCode(),
                UserAgent:    c.Get("User-Agent"),
                Duration:     time.Since(start),
                RequestBody:  string(c.Body()),
                ResponseBody: string(c.Response().Body()),
            })
        }()
        
        return err
    }
}
```

---

### 7. **Content Security Policy Reporter**
```go
// CSP violation reporter endpoint
func CSPReportHandler(c *fiber.Ctx) error {
    var report struct {
        CSPReport struct {
            DocumentURI        string `json:"document-uri"`
            Violated Directive string `json:"violated-directive"`
            BlockedURI         string `json:"blocked-uri"`
        } `json:"csp-report"`
    }
    
    if err := c.BodyParser(&report); err != nil {
        return err
    }
    
    // Log CSP violation
    log.Printf("CSP Violation: %+v", report.CSPReport)
    
    // Save to database for analysis
    // ...
    
    return c.SendStatus(204)
}

// Add to CSP header:
// Content-Security-Policy: default-src 'self'; report-uri /api/csp-report
```

---

### 8. **Automated Security Tests**
```go
// security_test.go
package main_test

import (
    "testing"
    "net/http/httptest"
)

func TestSecurityHeaders(t *testing.T) {
    app := setupApp()
    
    req := httptest.NewRequest("GET", "/api/products", nil)
    resp, _ := app.Test(req)
    
    tests := []struct {
        header   string
        expected string
    }{
        {"X-Content-Type-Options", "nosniff"},
        {"X-Frame-Options", "DENY"},
        {"X-Xss-Protection", "1; mode=block"},
    }
    
    for _, tt := range tests {
        got := resp.Header.Get(tt.header)
        if got != tt.expected {
            t.Errorf("Header %s = %s; want %s", tt.header, got, tt.expected)
        }
    }
}

func TestRateLimiting(t *testing.T) {
    app := setupApp()
    
    // Send 101 requests
    for i := 0; i < 101; i++ {
        req := httptest.NewRequest("GET", "/api/products", nil)
        resp, _ := app.Test(req)
        
        if i < 100 && resp.StatusCode == 429 {
            t.Error("Rate limited before threshold")
        }
        if i == 100 && resp.StatusCode != 429 {
            t.Error("Not rate limited after threshold")
        }
    }
}
```

---

### 9. **Dependency Scanning in CI/CD**
```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Install govulncheck
        run: go install golang.org/x/vuln/cmd/govulncheck@latest
      
      - name: Run vulnerability check
        run: govulncheck ./...
      
      - name: Run go vet
        run: go vet ./...
      
      - name: Run tests with race detector
        run: go test -race -v ./...
```

---

### 10. **WAF (Web Application Firewall) Integration**
```go
type WAF struct {
    rules []WAFRule
}

type WAFRule struct {
    Name    string
    Pattern *regexp.Regexp
    Action  string // block, log, alert
}

func (w *WAF) Middleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Check request against rules
        for _, rule := range w.rules {
            // Check URL
            if rule.Pattern.MatchString(c.Path()) {
                return w.handleViolation(c, rule)
            }
            
            // Check body
            if rule.Pattern.Match(c.Body()) {
                return w.handleViolation(c, rule)
            }
        }
        
        return c.Next()
    }
}

// Example rules:
var commonWAFRules = []WAFRule{
    {
        Name:    "SQL Injection",
        Pattern: regexp.MustCompile(`(?i)(union|select|insert|update|delete|drop|create|alter|exec|script)`),
        Action:  "block",
    },
    {
        Name:    "XSS Attempt",
        Pattern: regexp.MustCompile(`(?i)(<script|javascript:|onerror|onload)`),
        Action:  "block",
    },
    {
        Name:    "Path Traversal",
        Pattern: regexp.MustCompile(`\.\./`),
        Action:  "block",
    },
}
```

---

## Kesimpulan

**Security Hardening** adalah proses ongoing, bukan one-time task. Key points:

1. **Defense in Depth**: Multiple security layers
2. **Fail Secure**: Default to deny access
3. **Input Validation**: Never trust user input
4. **Regular Audits**: Check dependencies regularly
5. **Environment Security**: No hardcoded secrets

**Production Security Checklist:**
- ✅ All secrets in environment variables
- ✅ HTTPS enabled with HSTS
- ✅ CORS properly configured
- ✅ Rate limiting per IP and user
- ✅ All security headers set (Helmet)
- ✅ Input sanitization enabled
- ✅ SQL injection protection (parameterized queries)
- ✅ Regular dependency audits (govulncheck)
- ✅ Server headers hidden
- ✅ Audit logging enabled

**Regular Security Tasks:**
```bash
# Weekly: Check for vulnerabilities
make vuln-check

# Monthly: Update dependencies
make deps-upgrade

# Before each release: Full security audit
make security-audit
```

Happy securing! 🔒
