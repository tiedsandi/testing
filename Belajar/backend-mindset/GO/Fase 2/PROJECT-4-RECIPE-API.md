# 🍳 FASE 2 - PROJECT 1: Recipe API with Security & Caching

> **Security Hardening + Redis Caching Implementation** - Build production-ready recipe API dengan fokus ke keamanan dan performa optimal

---

## 🎯 Overview

Project **Recipe API** adalah aplikasi backend untuk berbagi resep masakan dengan fokus utama pada **security hardening** dan **Redis caching** untuk performance optimization. Ini adalah project pertama di Fase 2 yang mengajarkan cara protect API dari berbagai ancaman dan optimize response time dengan caching strategy yang tepat.

### **Mengapa Project Ini Penting?**

Di Fase 1 kamu sudah belajar build API yang fungsional. Sekarang saatnya belajar:
- 🔒 **Security**: Protect API dari bot, brute force, XSS, dan serangan umum lainnya
- ⚡ **Performance**: Reduce database load dengan caching yang smart
- 📊 **Monitoring**: Track cache hit ratio dan performance metrics
- 🚀 **Production-Ready**: Deploy dengan confidence karena sudah hardened

### **Fitur Utama**

**Core Features:**
- Authentication dengan JWT (register, login)
- CRUD Recipe dengan author ownership
- Many-to-Many relationship Recipe ↔ Ingredient
- Upload foto recipe (max 3, auto-resize 800x600)
- Rating system (1-5 stars, one rating per user per recipe)
- Public endpoints untuk baca recipe yang published
- Private endpoints untuk manage recipe milik sendiri

**Security Features:**
- CORS configuration (dev vs production)
- Rate limiting (30 req/min anonymous, 200 req/min authenticated)
- Helmet security headers (XSS, CSP, HSTS, etc)
- Input sanitization dengan bluemonday
- govulncheck untuk vulnerability scanning

**Caching Features:**
- Redis cache untuk list recipe (invalidation otomatis)
- Redis cache untuk detail recipe (TTL 15 menit)
- Redis cache untuk ingredient list (TTL 1 jam)
- X-Cache header (HIT/MISS) untuk monitoring

**Advanced Features:**
- Filter by difficulty, cooking time range, minimum rating, has photo
- Search by recipe title dan ingredient name
- Pagination dengan metadata
- Dynamic sorting

---

## 📚 Materi yang Dipelajari (Fase 2 - Topik 10 & 11)

### **Topik 10: Security Hardening**

| # | Sub-Topik | Implementasi di Project |
|---|-----------|-------------------------|
| 1 | **CORS Configuration** | Dev (allow all) vs Production (whitelist domains) |
| 2 | **Rate Limiting** | Per-IP untuk anonymous, per-user untuk authenticated |
| 3 | **Security Headers** | Helmet middleware (XSS protection, CSP, HSTS, etc) |
| 4 | **Input Sanitization** | bluemonday untuk strip HTML/script dari input |
| 5 | **Vulnerability Scanning** | govulncheck sebelum deploy |
| 6 | **File Upload Security** | File type validation, size limit, safe filename |
| 7 | **SQL Injection Prevention** | GORM parameterized queries |
| 8 | **JWT Best Practices** | Strong secret, proper expiry, secure storage |

### **Topik 11: Caching dengan Redis**

| # | Sub-Topik | Implementasi di Project |
|---|-----------|-------------------------|
| 1 | **Cache Strategy** | Cache-aside pattern untuk read-heavy data |
| 2 | **TTL Management** | Different TTL untuk different data (15min vs 1 hour) |
| 3 | **Cache Invalidation** | Delete cache saat data berubah (create/update/delete) |
| 4 | **Cache Keys** | Structured keys (recipe:list, recipe:detail:{id}) |
| 5 | **Cache Headers** | X-Cache header untuk monitoring hit/miss |
| 6 | **Cache Middleware** | Reusable cache middleware untuk multiple endpoints |
| 7 | **Serialization** | JSON marshal/unmarshal untuk Redis storage |
| 8 | **Performance Monitoring** | Track cache hit ratio |

---

## 🗂️ Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────┐
│              USERS                      │
├─────────────────────────────────────────┤
│ id           UUID (PK)                  │
│ name         VARCHAR(255)               │
│ email        VARCHAR(255) UNIQUE        │
│ password     VARCHAR(255)               │
│ created_at   TIMESTAMP                  │
│ updated_at   TIMESTAMP                  │
└─────────────────────────────────────────┘
              │ 1
              │
              │ N
┌─────────────────────────────────────────┐
│             RECIPES                     │
├─────────────────────────────────────────┤
│ id               UUID (PK)              │
│ user_id          UUID (FK) NOT NULL     │
│ title            VARCHAR(255) NOT NULL  │
│ description      TEXT                   │
│ instructions     TEXT NOT NULL          │
│ cooking_time     INT (minutes)          │
│ servings         INT                    │
│ difficulty       VARCHAR(20)            │ ← easy/medium/hard
│ is_published     BOOLEAN DEFAULT false  │
│ average_rating   DECIMAL(3,2)           │ ← calculated
│ rating_count     INT DEFAULT 0          │
│ photo_urls       TEXT[] (array)         │
│ created_at       TIMESTAMP              │
│ updated_at       TIMESTAMP              │
│ deleted_at       TIMESTAMP              │
└─────────────────────────────────────────┘
       │                            │
       │ 1                          │ N
       │                            │
       │ N                          │ 1
┌──────────────────────┐   ┌────────────────────────┐
│ RECIPE_INGREDIENTS   │   │      RATINGS           │
│ (Join Table)         │   ├────────────────────────┤
├──────────────────────┤   │ id         UUID (PK)   │
│ recipe_id   UUID FK  │   │ recipe_id  UUID (FK)   │
│ ingredient_id UUID FK│   │ user_id    UUID (FK)   │
│ quantity    VARCHAR  │   │ value      INT (1-5)   │
│ unit        VARCHAR  │   │ created_at TIMESTAMP   │
└──────────────────────┘   │ updated_at TIMESTAMP   │
       │                   └────────────────────────┘
       │ N                          │
       │                            │ N
       │ 1                          │
┌──────────────────────────────────┐│
│        INGREDIENTS                ││
├──────────────────────────────────┤│
│ id         UUID (PK)              ││
│ name       VARCHAR(255) UNIQUE    ││
│ created_at TIMESTAMP              ││
│ updated_at TIMESTAMP              ││
└──────────────────────────────────┘
```

**Relationships:**
- **User → Recipes**: One-to-Many (1 user has many recipes)
- **User → Ratings**: One-to-Many (1 user has many ratings)
- **Recipe ↔ Ingredients**: Many-to-Many (via RecipeIngredient)
- **Recipe → Ratings**: One-to-Many (1 recipe has many ratings)
- **Unique Constraint**: user_id + recipe_id di Rating (one rating per user per recipe)

---

## 📁 Folder Structure

```
recipe-api/
├── cmd/
│   └── api/
│       └── main.go                    # Entry point
│
├── internal/
│   ├── config/
│   │   └── config.go                  # Viper configuration
│   │
│   ├── database/
│   │   ├── postgres.go                # PostgreSQL connection
│   │   └── redis.go                   # Redis connection
│   │
│   ├── entity/
│   │   ├── base.go                    # BaseModel
│   │   ├── user.go                    # User entity
│   │   ├── recipe.go                  # Recipe entity
│   │   ├── ingredient.go              # Ingredient entity
│   │   ├── recipe_ingredient.go       # RecipeIngredient join table
│   │   └── rating.go                  # Rating entity
│   │
│   ├── repository/
│   │   ├── user_repository.go         # User data access
│   │   ├── recipe_repository.go       # Recipe data access + filters
│   │   ├── ingredient_repository.go   # Ingredient data access
│   │   └── rating_repository.go       # Rating data access
│   │
│   ├── service/
│   │   ├── auth_service.go            # Register, login, JWT
│   │   ├── recipe_service.go          # Recipe business logic
│   │   ├── ingredient_service.go      # Ingredient business logic
│   │   ├── rating_service.go          # Rating + average calculation
│   │   ├── upload_service.go          # Photo upload + resize
│   │   └── cache_service.go           # Redis cache abstraction
│   │
│   ├── handler/
│   │   ├── auth_handler.go            # Auth endpoints
│   │   ├── recipe_handler.go          # Recipe endpoints
│   │   ├── ingredient_handler.go      # Ingredient endpoints
│   │   └── rating_handler.go          # Rating endpoints
│   │
│   ├── middleware/
│   │   ├── auth_middleware.go         # JWT validation
│   │   ├── security_middleware.go     # CORS, Helmet, Rate limit
│   │   ├── cache_middleware.go        # Cache handler
│   │   ├── sanitize_middleware.go     # Input sanitization
│   │   ├── logger_middleware.go       # Request logging
│   │   └── request_id_middleware.go   # Request ID tracking
│   │
│   ├── dto/
│   │   ├── auth_dto.go                # Auth DTOs
│   │   ├── recipe_dto.go              # Recipe DTOs
│   │   ├── ingredient_dto.go          # Ingredient DTOs
│   │   ├── rating_dto.go              # Rating DTOs
│   │   └── common_dto.go              # Common DTOs (pagination, etc)
│   │
│   └── util/
│       ├── jwt.go                     # JWT utilities
│       ├── hash.go                    # Password hashing
│       ├── validator.go               # Custom validators
│       ├── error.go                   # Custom errors
│       ├── response.go                # Response helpers
│       └── sanitizer.go               # Input sanitization
│
├── uploads/
│   └── recipes/                       # Recipe photos
│
├── .env.example
├── .gitignore
├── go.mod
├── go.sum
└── README.md
```

---

## 🚀 Step-by-Step Implementation

### **Step 1: Setup Project & Configuration**

```bash
# Initialize project
mkdir recipe-api
cd recipe-api
go mod init github.com/yourusername/recipe-api

# Install dependencies
go get github.com/gofiber/fiber/v2
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/redis/go-redis/v9

# Security & middleware
go get github.com/gofiber/contrib/helmet
go get github.com/gofiber/contrib/cors
go get github.com/gofiber/fiber/v2/middleware/limiter
go get github.com/microcosm-cc/bluemonday

# Utilities
go get github.com/golang-jwt/jwt/v5
go get github.com/go-playground/validator/v10
go get github.com/disintegration/imaging
go get github.com/rs/zerolog
go get github.com/spf13/viper
go get github.com/joho/godotenv
go get golang.org/x/crypto/bcrypt
go get github.com/google/uuid
```

**File:** `.env.example`

```env
# App
APP_NAME=Recipe API
APP_ENV=development
APP_PORT=3000
APP_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=recipe_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=24h

# Security
RATE_LIMIT_ANONYMOUS=30
RATE_LIMIT_AUTHENTICATED=200
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Upload
UPLOAD_MAX_SIZE=5242880
UPLOAD_MAX_FILES=3
PHOTO_WIDTH=800
PHOTO_HEIGHT=600

# Cache
CACHE_RECIPE_LIST_TTL=900
CACHE_RECIPE_DETAIL_TTL=900
CACHE_INGREDIENT_LIST_TTL=3600
```

**File:** `internal/config/config.go`

```go
package config

import (
	"log"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	Security SecurityConfig
	Upload   UploadConfig
	Cache    CacheConfig
}

type AppConfig struct {
	Name string
	Env  string
	Port string
	URL  string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

type SecurityConfig struct {
	RateLimitAnonymous      int
	RateLimitAuthenticated  int
	AllowedOrigins          []string
}

type UploadConfig struct {
	MaxSize   int64
	MaxFiles  int
	PhotoWidth  int
	PhotoHeight int
}

type CacheConfig struct {
	RecipeListTTL   time.Duration
	RecipeDetailTTL time.Duration
	IngredientListTTL time.Duration
}

func LoadConfig() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Warning: .env file not found, using environment variables")
	}

	jwtExpiry, _ := time.ParseDuration(viper.GetString("JWT_EXPIRY"))

	config := &Config{
		App: AppConfig{
			Name: viper.GetString("APP_NAME"),
			Env:  viper.GetString("APP_ENV"),
			Port: viper.GetString("APP_PORT"),
			URL:  viper.GetString("APP_URL"),
		},
		Database: DatabaseConfig{
			Host:     viper.GetString("DB_HOST"),
			Port:     viper.GetString("DB_PORT"),
			User:     viper.GetString("DB_USER"),
			Password: viper.GetString("DB_PASSWORD"),
			Name:     viper.GetString("DB_NAME"),
		},
		Redis: RedisConfig{
			Host:     viper.GetString("REDIS_HOST"),
			Port:     viper.GetString("REDIS_PORT"),
			Password: viper.GetString("REDIS_PASSWORD"),
			DB:       viper.GetInt("REDIS_DB"),
		},
		JWT: JWTConfig{
			Secret: viper.GetString("JWT_SECRET"),
			Expiry: jwtExpiry,
		},
		Security: SecurityConfig{
			RateLimitAnonymous:     viper.GetInt("RATE_LIMIT_ANONYMOUS"),
			RateLimitAuthenticated: viper.GetInt("RATE_LIMIT_AUTHENTICATED"),
			AllowedOrigins:         viper.GetStringSlice("ALLOWED_ORIGINS"),
		},
		Upload: UploadConfig{
			MaxSize:     viper.GetInt64("UPLOAD_MAX_SIZE"),
			MaxFiles:    viper.GetInt("UPLOAD_MAX_FILES"),
			PhotoWidth:  viper.GetInt("PHOTO_WIDTH"),
			PhotoHeight: viper.GetInt("PHOTO_HEIGHT"),
		},
		Cache: CacheConfig{
			RecipeListTTL:     time.Duration(viper.GetInt("CACHE_RECIPE_LIST_TTL")) * time.Second,
			RecipeDetailTTL:   time.Duration(viper.GetInt("CACHE_RECIPE_DETAIL_TTL")) * time.Second,
			IngredientListTTL: time.Duration(viper.GetInt("CACHE_INGREDIENT_LIST_TTL")) * time.Second,
		},
	}

	return config, nil
}
```

**File:** `internal/database/postgres.go`

```go
package database

import (
	"fmt"
	"log"
	"time"

	"github.com/yourusername/recipe-api/internal/config"
	"github.com/yourusername/recipe-api/internal/entity"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func ConnectPostgres(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Name,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("✅ Database connected")

	return db, nil
}

func RunMigrations(db *gorm.DB) error {
	log.Println("Running migrations...")

	err := db.AutoMigrate(
		&entity.User{},
		&entity.Recipe{},
		&entity.Ingredient{},
		&entity.RecipeIngredient{},
		&entity.Rating{},
	)

	if err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	log.Println("✅ Migrations completed")
	return nil
}
```

**File:** `internal/database/redis.go`

```go
package database

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
	"github.com/yourusername/recipe-api/internal/config"
)

func ConnectRedis(cfg *config.Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("✅ Redis connected")
	return client, nil
}
```

---

### **Step 2: Define Entities**

**File:** `internal/entity/base.go`

```go
package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}
```

**File:** `internal/entity/user.go`

```go
package entity

type User struct {
	BaseModel
	Name     string `gorm:"size:255;not null" json:"name"`
	Email    string `gorm:"size:255;uniqueIndex;not null" json:"email"`
	Password string `gorm:"size:255;not null" json:"-"`

	// Relationships
	Recipes []Recipe `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"recipes,omitempty"`
	Ratings []Rating `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"ratings,omitempty"`
}

func (User) TableName() string {
	return "users"
}
```

**File:** `internal/entity/recipe.go`

```go
package entity

import (
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Recipe struct {
	BaseModel
	UserID        uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Title         string         `gorm:"size:255;not null" json:"title"`
	Description   string         `gorm:"type:text" json:"description"`
	Instructions  string         `gorm:"type:text;not null" json:"instructions"`
	CookingTime   int            `gorm:"not null" json:"cooking_time"` // in minutes
	Servings      int            `gorm:"not null" json:"servings"`
	Difficulty    string         `gorm:"size:20;not null" json:"difficulty"` // easy, medium, hard
	IsPublished   bool           `gorm:"default:false" json:"is_published"`
	AverageRating float64        `gorm:"type:decimal(3,2);default:0" json:"average_rating"`
	RatingCount   int            `gorm:"default:0" json:"rating_count"`
	PhotoURLs     pq.StringArray `gorm:"type:text[]" json:"photo_urls"` // Array of URLs

	// Relationships
	User        User                `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Ingredients []RecipeIngredient  `gorm:"foreignKey:RecipeID" json:"ingredients,omitempty"`
	Ratings     []Rating            `gorm:"foreignKey:RecipeID;constraint:OnDelete:CASCADE" json:"ratings,omitempty"`
}

func (Recipe) TableName() string {
	return "recipes"
}
```

**File:** `internal/entity/ingredient.go`

```go
package entity

type Ingredient struct {
	BaseModel
	Name string `gorm:"size:255;uniqueIndex;not null" json:"name"`

	// Relationships
	Recipes []RecipeIngredient `gorm:"foreignKey:IngredientID" json:"recipes,omitempty"`
}

func (Ingredient) TableName() string {
	return "ingredients"
}
```

**File:** `internal/entity/recipe_ingredient.go`

```go
package entity

import "github.com/google/uuid"

// RecipeIngredient is the join table with additional fields
type RecipeIngredient struct {
	RecipeID     uuid.UUID `gorm:"type:uuid;primaryKey" json:"recipe_id"`
	IngredientID uuid.UUID `gorm:"type:uuid;primaryKey" json:"ingredient_id"`
	Quantity     string    `gorm:"size:50;not null" json:"quantity"` // e.g., "2", "1/2", "1.5"
	Unit         string    `gorm:"size:50;not null" json:"unit"`     // e.g., "cup", "tbsp", "g", "ml"

	// Relationships
	Recipe     Recipe     `gorm:"foreignKey:RecipeID" json:"recipe,omitempty"`
	Ingredient Ingredient `gorm:"foreignKey:IngredientID" json:"ingredient,omitempty"`
}

func (RecipeIngredient) TableName() string {
	return "recipe_ingredients"
}
```

**File:** `internal/entity/rating.go`

```go
package entity

import "github.com/google/uuid"

type Rating struct {
	BaseModel
	RecipeID uuid.UUID `gorm:"type:uuid;not null;index:idx_recipe_user" json:"recipe_id"`
	UserID   uuid.UUID `gorm:"type:uuid;not null;index:idx_recipe_user" json:"user_id"`
	Value    int       `gorm:"not null;check:value >= 1 AND value <= 5" json:"value"` // 1-5

	// Relationships
	Recipe Recipe `gorm:"foreignKey:RecipeID" json:"recipe,omitempty"`
	User   User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Rating) TableName() string {
	return "ratings"
}
```

---

### **Step 3: Utilities (JWT, Hash, Validator, Sanitizer)**

**File:** `internal/util/jwt.go`

```go
package util

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/config"
)

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uuid.UUID, email string, cfg *config.Config) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(cfg.JWT.Expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWT.Secret))
}

func ValidateToken(tokenString string, cfg *config.Config) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWT.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
```

**File:** `internal/util/hash.go`

```go
package util

import "golang.org/x/crypto/bcrypt"

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}
```

**File:** `internal/util/validator.go`

```go
package util

import (
	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
	
	// Register custom validators
	validate.RegisterValidation("difficulty", validateDifficulty)
	validate.RegisterValidation("rating", validateRating)
}

func GetValidator() *validator.Validate {
	return validate
}

func validateDifficulty(fl validator.FieldLevel) bool {
	difficulty := fl.Field().String()
	return difficulty == "easy" || difficulty == "medium" || difficulty == "hard"
}

func validateRating(fl validator.FieldLevel) bool {
	value := fl.Field().Int()
	return value >= 1 && value <= 5
}
```

**File:** `internal/util/sanitizer.go`

```go
package util

import (
	"github.com/microcosm-cc/bluemonday"
)

var policy *bluemonday.Policy

func init() {
	// Strict policy: strip all HTML
	policy = bluemonday.StrictPolicy()
}

func SanitizeString(input string) string {
	return policy.Sanitize(input)
}

func SanitizeStrings(inputs []string) []string {
	sanitized := make([]string, len(inputs))
	for i, input := range inputs {
		sanitized[i] = SanitizeString(input)
	}
	return sanitized
}
```

**File:** `internal/util/error.go`

```go
package util

import "net/http"

type AppError struct {
	Message    string `json:"message"`
	Code       string `json:"code"`
	StatusCode int    `json:"-"`
}

func (e *AppError) Error() string {
	return e.Message
}

func NewAppError(message, code string, statusCode int) *AppError {
	return &AppError{
		Message:    message,
		Code:       code,
		StatusCode: statusCode,
	}
}

var (
	ErrUnauthorized       = NewAppError("unauthorized", "UNAUTHORIZED", http.StatusUnauthorized)
	ErrForbidden          = NewAppError("forbidden", "FORBIDDEN", http.StatusForbidden)
	ErrNotFound           = NewAppError("resource not found", "NOT_FOUND", http.StatusNotFound)
	ErrValidation         = NewAppError("validation error", "VALIDATION_ERROR", http.StatusUnprocessableEntity)
	ErrInternalServer     = NewAppError("internal server error", "INTERNAL_ERROR", http.StatusInternalServerError)
	ErrInvalidCredentials = NewAppError("invalid email or password", "INVALID_CREDENTIALS", http.StatusUnauthorized)
	ErrEmailExists        = NewAppError("email already exists", "EMAIL_EXISTS", http.StatusConflict)
	ErrFileTooLarge       = NewAppError("file too large", "FILE_TOO_LARGE", http.StatusBadRequest)
	ErrInvalidFileType    = NewAppError("invalid file type", "INVALID_FILE_TYPE", http.StatusBadRequest)
	ErrTooManyFiles       = NewAppError("too many files", "TOO_MANY_FILES", http.StatusBadRequest)
	ErrRatingExists       = NewAppError("you already rated this recipe", "RATING_EXISTS", http.StatusConflict)
)
```

**File:** `internal/util/response.go`

```go
package util

import "github.com/gofiber/fiber/v2"

type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Code    string      `json:"code,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
}

func SuccessResponse(c *fiber.Ctx, data interface{}) error {
	return c.JSON(Response{
		Success: true,
		Data:    data,
	})
}

func SuccessResponseWithMeta(c *fiber.Ctx, data interface{}, meta interface{}) error {
	return c.JSON(Response{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}

func ErrorResponse(c *fiber.Ctx, err error) error {
	if appErr, ok := err.(*AppError); ok {
		return c.Status(appErr.StatusCode).JSON(Response{
			Success: false,
			Error:   appErr.Message,
			Code:    appErr.Code,
		})
	}
	
	return c.Status(500).JSON(Response{
		Success: false,
		Error:   err.Error(),
		Code:    "INTERNAL_ERROR",
	})
}
```

---

### **Step 4: Repositories**

**File:** `internal/repository/user_repository.go`

```go
package repository

import (
	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/entity"
	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *entity.User) error
	FindByEmail(email string) (*entity.User, error)
	FindByID(id uuid.UUID) (*entity.User, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(user *entity.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) FindByEmail(email string) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *userRepository) FindByID(id uuid.UUID) (*entity.User, error) {
	var user entity.User
	err := r.db.First(&user, "id = ?", id).Error
	return &user, err
}
```

**File:** `internal/repository/recipe_repository.go`

```go
package repository

import (
	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/entity"
	"gorm.io/gorm"
)

type RecipeRepository interface {
	Create(recipe *entity.Recipe) error
	Update(recipe *entity.Recipe) error
	Delete(id uuid.UUID) error
	FindByID(id uuid.UUID) (*entity.Recipe, error)
	FindAll(filter RecipeFilter) ([]entity.Recipe, int64, error)
	FindByUserID(userID uuid.UUID, page, limit int) ([]entity.Recipe, int64, error)
	FindPublic(filter RecipeFilter) ([]entity.Recipe, int64, error)
	UpdateRating(recipeID uuid.UUID, avgRating float64, count int) error
}

type RecipeFilter struct {
	Page         int
	Limit        int
	Difficulty   string  // easy, medium, hard
	MinRating    float64 // minimum average rating
	MaxCookTime  int     // maximum cooking time in minutes
	HasPhoto     *bool   // filter recipes with photos
	Search       string  // search in title
	IngredientID *uuid.UUID // filter by ingredient
}

type recipeRepository struct {
	db *gorm.DB
}

func NewRecipeRepository(db *gorm.DB) RecipeRepository {
	return &recipeRepository{db: db}
}

func (r *recipeRepository) Create(recipe *entity.Recipe) error {
	return r.db.Create(recipe).Error
}

func (r *recipeRepository) Update(recipe *entity.Recipe) error {
	return r.db.Save(recipe).Error
}

func (r *recipeRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&entity.Recipe{}, "id = ?", id).Error
}

func (r *recipeRepository) FindByID(id uuid.UUID) (*entity.Recipe, error) {
	var recipe entity.Recipe
	err := r.db.Preload("User").Preload("Ingredients.Ingredient").First(&recipe, "id = ?", id).Error
	return &recipe, err
}

func (r *recipeRepository) FindAll(filter RecipeFilter) ([]entity.Recipe, int64, error) {
	var recipes []entity.Recipe
	var total int64

	query := r.db.Model(&entity.Recipe{}).Preload("User")

	// Apply filters
	query = r.applyFilters(query, filter)

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	offset := (filter.Page - 1) * filter.Limit
	err := query.Offset(offset).Limit(filter.Limit).Order("created_at DESC").Find(&recipes).Error

	return recipes, total, err
}

func (r *recipeRepository) FindByUserID(userID uuid.UUID, page, limit int) ([]entity.Recipe, int64, error) {
	var recipes []entity.Recipe
	var total int64

	query := r.db.Model(&entity.Recipe{}).Where("user_id = ?", userID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("created_at DESC").Find(&recipes).Error

	return recipes, total, err
}

func (r *recipeRepository) FindPublic(filter RecipeFilter) ([]entity.Recipe, int64, error) {
	var recipes []entity.Recipe
	var total int64

	query := r.db.Model(&entity.Recipe{}).Where("is_published = ?", true).Preload("User")

	// Apply filters
	query = r.applyFilters(query, filter)

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	offset := (filter.Page - 1) * filter.Limit
	err := query.Offset(offset).Limit(filter.Limit).Order("created_at DESC").Find(&recipes).Error

	return recipes, total, err
}

func (r *recipeRepository) applyFilters(query *gorm.DB, filter RecipeFilter) *gorm.DB {
	// Filter by difficulty
	if filter.Difficulty != "" {
		query = query.Where("difficulty = ?", filter.Difficulty)
	}

	// Filter by minimum rating
	if filter.MinRating > 0 {
		query = query.Where("average_rating >= ?", filter.MinRating)
	}

	// Filter by max cooking time
	if filter.MaxCookTime > 0 {
		query = query.Where("cooking_time <= ?", filter.MaxCookTime)
	}

	// Filter by has photo
	if filter.HasPhoto != nil {
		if *filter.HasPhoto {
			query = query.Where("photo_urls IS NOT NULL AND array_length(photo_urls, 1) > 0")
		} else {
			query = query.Where("photo_urls IS NULL OR array_length(photo_urls, 1) = 0")
		}
	}

	// Search by title
	if filter.Search != "" {
		query = query.Where("title ILIKE ?", "%"+filter.Search+"%")
	}

	// Filter by ingredient
	if filter.IngredientID != nil {
		query = query.Joins("JOIN recipe_ingredients ON recipe_ingredients.recipe_id = recipes.id").
			Where("recipe_ingredients.ingredient_id = ?", *filter.IngredientID)
	}

	return query
}

func (r *recipeRepository) UpdateRating(recipeID uuid.UUID, avgRating float64, count int) error {
	return r.db.Model(&entity.Recipe{}).Where("id = ?", recipeID).Updates(map[string]interface{}{
		"average_rating": avgRating,
		"rating_count":   count,
	}).Error
}
```

**File:** `internal/repository/ingredient_repository.go`

```go
package repository

import (
	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/entity"
	"gorm.io/gorm"
)

type IngredientRepository interface {
	Create(ingredient *entity.Ingredient) error
	FindByID(id uuid.UUID) (*entity.Ingredient, error)
	FindByName(name string) (*entity.Ingredient, error)
	FindAll(page, limit int, search string) ([]entity.Ingredient, int64, error)
	FindOrCreate(name string) (*entity.Ingredient, error)
}

type ingredientRepository struct {
	db *gorm.DB
}

func NewIngredientRepository(db *gorm.DB) IngredientRepository {
	return &ingredientRepository{db: db}
}

func (r *ingredientRepository) Create(ingredient *entity.Ingredient) error {
	return r.db.Create(ingredient).Error
}

func (r *ingredientRepository) FindByID(id uuid.UUID) (*entity.Ingredient, error) {
	var ingredient entity.Ingredient
	err := r.db.First(&ingredient, "id = ?", id).Error
	return &ingredient, err
}

func (r *ingredientRepository) FindByName(name string) (*entity.Ingredient, error) {
	var ingredient entity.Ingredient
	err := r.db.Where("name = ?", name).First(&ingredient).Error
	return &ingredient, err
}

func (r *ingredientRepository) FindAll(page, limit int, search string) ([]entity.Ingredient, int64, error) {
	var ingredients []entity.Ingredient
	var total int64

	query := r.db.Model(&entity.Ingredient{})

	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	err := query.Offset(offset).Limit(limit).Order("name ASC").Find(&ingredients).Error

	return ingredients, total, err
}

func (r *ingredientRepository) FindOrCreate(name string) (*entity.Ingredient, error) {
	var ingredient entity.Ingredient
	
	err := r.db.Where("name = ?", name).FirstOrCreate(&ingredient, entity.Ingredient{Name: name}).Error
	return &ingredient, err
}
```

**File:** `internal/repository/recipe_ingredient_repository.go`

```go
package repository

import (
	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/entity"
	"gorm.io/gorm"
)

type RecipeIngredientRepository interface {
	CreateBulk(recipeIngredients []entity.RecipeIngredient) error
	DeleteByRecipeID(recipeID uuid.UUID) error
	FindByRecipeID(recipeID uuid.UUID) ([]entity.RecipeIngredient, error)
}

type recipeIngredientRepository struct {
	db *gorm.DB
}

func NewRecipeIngredientRepository(db *gorm.DB) RecipeIngredientRepository {
	return &recipeIngredientRepository{db: db}
}

func (r *recipeIngredientRepository) CreateBulk(recipeIngredients []entity.RecipeIngredient) error {
	return r.db.Create(&recipeIngredients).Error
}

func (r *recipeIngredientRepository) DeleteByRecipeID(recipeID uuid.UUID) error {
	return r.db.Where("recipe_id = ?", recipeID).Delete(&entity.RecipeIngredient{}).Error
}

func (r *recipeIngredientRepository) FindByRecipeID(recipeID uuid.UUID) ([]entity.RecipeIngredient, error) {
	var recipeIngredients []entity.RecipeIngredient
	err := r.db.Preload("Ingredient").Where("recipe_id = ?", recipeID).Find(&recipeIngredients).Error
	return recipeIngredients, err
}
```

**File:** `internal/repository/rating_repository.go`

```go
package repository

import (
	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/entity"
	"gorm.io/gorm"
)

type RatingRepository interface {
	Create(rating *entity.Rating) error
	Update(rating *entity.Rating) error
	Delete(id uuid.UUID) error
	FindByID(id uuid.UUID) (*entity.Rating, error)
	FindByRecipeAndUser(recipeID, userID uuid.UUID) (*entity.Rating, error)
	CalculateAverageByRecipeID(recipeID uuid.UUID) (float64, int, error)
}

type ratingRepository struct {
	db *gorm.DB
}

func NewRatingRepository(db *gorm.DB) RatingRepository {
	return &ratingRepository{db: db}
}

func (r *ratingRepository) Create(rating *entity.Rating) error {
	return r.db.Create(rating).Error
}

func (r *ratingRepository) Update(rating *entity.Rating) error {
	return r.db.Save(rating).Error
}

func (r *ratingRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&entity.Rating{}, "id = ?", id).Error
}

func (r *ratingRepository) FindByID(id uuid.UUID) (*entity.Rating, error) {
	var rating entity.Rating
	err := r.db.First(&rating, "id = ?", id).Error
	return &rating, err
}

func (r *ratingRepository) FindByRecipeAndUser(recipeID, userID uuid.UUID) (*entity.Rating, error) {
	var rating entity.Rating
	err := r.db.Where("recipe_id = ? AND user_id = ?", recipeID, userID).First(&rating).Error
	return &rating, err
}

func (r *ratingRepository) CalculateAverageByRecipeID(recipeID uuid.UUID) (float64, int, error) {
	var result struct {
		Average float64
		Count   int64
	}

	err := r.db.Model(&entity.Rating{}).
		Select("COALESCE(AVG(value), 0) as average, COUNT(*) as count").
		Where("recipe_id = ?", recipeID).
		Scan(&result).Error

	return result.Average, int(result.Count), err
}
```

---

### **Step 5: DTOs**

**File:** `internal/dto/auth_dto.go`

```go
package dto

import "github.com/google/uuid"

type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=3"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	Token string    `json:"token"`
	User  UserDTO   `json:"user"`
}

type UserDTO struct {
	ID    uuid.UUID `json:"id"`
	Name  string    `json:"name"`
	Email string    `json:"email"`
}
```

**File:** `internal/dto/recipe_dto.go`

```go
package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateRecipeRequest struct {
	Title        string               `json:"title" validate:"required,min=3"`
	Description  string               `json:"description"`
	Instructions string               `json:"instructions" validate:"required"`
	CookingTime  int                  `json:"cooking_time" validate:"required,min=1"`
	Servings     int                  `json:"servings" validate:"required,min=1"`
	Difficulty   string               `json:"difficulty" validate:"required,difficulty"`
	IsPublished  bool                 `json:"is_published"`
	Ingredients  []IngredientItemDTO  `json:"ingredients" validate:"required,min=1,dive"`
}

type UpdateRecipeRequest struct {
	Title        string               `json:"title" validate:"omitempty,min=3"`
	Description  string               `json:"description"`
	Instructions string               `json:"instructions" validate:"omitempty"`
	CookingTime  int                  `json:"cooking_time" validate:"omitempty,min=1"`
	Servings     int                  `json:"servings" validate:"omitempty,min=1"`
	Difficulty   string               `json:"difficulty" validate:"omitempty,difficulty"`
	IsPublished  *bool                `json:"is_published"`
	Ingredients  []IngredientItemDTO  `json:"ingredients" validate:"omitempty,dive"`
}

type IngredientItemDTO struct {
	Name     string `json:"name" validate:"required"`
	Quantity string `json:"quantity" validate:"required"`
	Unit     string `json:"unit" validate:"required"`
}

type RecipeResponse struct {
	ID            uuid.UUID           `json:"id"`
	UserID        uuid.UUID           `json:"user_id"`
	User          *UserDTO            `json:"user,omitempty"`
	Title         string              `json:"title"`
	Description   string              `json:"description"`
	Instructions  string              `json:"instructions"`
	CookingTime   int                 `json:"cooking_time"`
	Servings      int                 `json:"servings"`
	Difficulty    string              `json:"difficulty"`
	IsPublished   bool                `json:"is_published"`
	AverageRating float64             `json:"average_rating"`
	RatingCount   int                 `json:"rating_count"`
	PhotoURLs     []string            `json:"photo_urls"`
	Ingredients   []IngredientItemDTO `json:"ingredients,omitempty"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
}

type RecipeListResponse struct {
	ID            uuid.UUID `json:"id"`
	UserID        uuid.UUID `json:"user_id"`
	User          *UserDTO  `json:"user,omitempty"`
	Title         string    `json:"title"`
	Description   string    `json:"description"`
	CookingTime   int       `json:"cooking_time"`
	Servings      int       `json:"servings"`
	Difficulty    string    `json:"difficulty"`
	IsPublished   bool      `json:"is_published"`
	AverageRating float64   `json:"average_rating"`
	RatingCount   int       `json:"rating_count"`
	PhotoURLs     []string  `json:"photo_urls"`
	CreatedAt     time.Time `json:"created_at"`
}
```

**File:** `internal/dto/ingredient_dto.go`

```go
package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateIngredientRequest struct {
	Name string `json:"name" validate:"required,min=2"`
}

type IngredientResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}
```

**File:** `internal/dto/rating_dto.go`

```go
package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateRatingRequest struct {
	RecipeID uuid.UUID `json:"recipe_id" validate:"required"`
	Value    int       `json:"value" validate:"required,rating"`
}

type UpdateRatingRequest struct {
	Value int `json:"value" validate:"required,rating"`
}

type RatingResponse struct {
	ID        uuid.UUID `json:"id"`
	RecipeID  uuid.UUID `json:"recipe_id"`
	UserID    uuid.UUID `json:"user_id"`
	Value     int       `json:"value"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
```

**File:** `internal/dto/pagination_dto.go`

```go
package dto

type PaginationMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
}

func NewPaginationMeta(page, limit int, totalItems int64) PaginationMeta {
	totalPages := int(totalItems) / limit
	if int(totalItems)%limit != 0 {
		totalPages++
	}

	return PaginationMeta{
		Page:       page,
		Limit:      limit,
		TotalItems: totalItems,
		TotalPages: totalPages,
	}
}
```

---

### **Step 6: Services (Business Logic)**

**File:** `internal/service/auth_service.go`

```go
package service

import (
	"errors"

	"github.com/yourusername/recipe-api/internal/config"
	"github.com/yourusername/recipe-api/internal/dto"
	"github.com/yourusername/recipe-api/internal/entity"
	"github.com/yourusername/recipe-api/internal/repository"
	"github.com/yourusername/recipe-api/internal/util"
	"gorm.io/gorm"
)

type AuthService interface {
	Register(req dto.RegisterRequest) (*dto.AuthResponse, error)
	Login(req dto.LoginRequest) (*dto.AuthResponse, error)
}

type authService struct {
	userRepo repository.UserRepository
	cfg      *config.Config
}

func NewAuthService(userRepo repository.UserRepository, cfg *config.Config) AuthService {
	return &authService{
		userRepo: userRepo,
		cfg:      cfg,
	}
}

func (s *authService) Register(req dto.RegisterRequest) (*dto.AuthResponse, error) {
	// Sanitize input
	req.Name = util.SanitizeString(req.Name)
	req.Email = util.SanitizeString(req.Email)

	// Check if email exists
	existingUser, err := s.userRepo.FindByEmail(req.Email)
	if err == nil && existingUser != nil {
		return nil, util.ErrEmailExists
	}

	// Hash password
	hashedPassword, err := util.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &entity.User{
		Name:     req.Name,
		Email:    req.Email,
		Password: hashedPassword,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Generate token
	token, err := util.GenerateToken(user.ID, user.Email, s.cfg)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User: dto.UserDTO{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
		},
	}, nil
}

func (s *authService) Login(req dto.LoginRequest) (*dto.AuthResponse, error) {
	// Sanitize input
	req.Email = util.SanitizeString(req.Email)

	// Find user
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.ErrInvalidCredentials
		}
		return nil, err
	}

	// Check password
	if !util.CheckPassword(user.Password, req.Password) {
		return nil, util.ErrInvalidCredentials
	}

	// Generate token
	token, err := util.GenerateToken(user.ID, user.Email, s.cfg)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User: dto.UserDTO{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
		},
	}, nil
}
```

**File:** `internal/service/recipe_service.go`

```go
package service

import (
	"errors"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/yourusername/recipe-api/internal/dto"
	"github.com/yourusername/recipe-api/internal/entity"
	"github.com/yourusername/recipe-api/internal/repository"
	"github.com/yourusername/recipe-api/internal/util"
	"gorm.io/gorm"
)

type RecipeService interface {
	Create(userID uuid.UUID, req dto.CreateRecipeRequest) (*dto.RecipeResponse, error)
	Update(recipeID, userID uuid.UUID, req dto.UpdateRecipeRequest) (*dto.RecipeResponse, error)
	Delete(recipeID, userID uuid.UUID) error
	GetByID(recipeID uuid.UUID) (*dto.RecipeResponse, error)
	GetMyRecipes(userID uuid.UUID, page, limit int) ([]dto.RecipeListResponse, dto.PaginationMeta, error)
	GetPublicRecipes(filter repository.RecipeFilter) ([]dto.RecipeListResponse, dto.PaginationMeta, error)
	UploadPhotos(recipeID, userID uuid.UUID, photoURLs []string) (*dto.RecipeResponse, error)
}

type recipeService struct {
	recipeRepo           repository.RecipeRepository
	ingredientRepo       repository.IngredientRepository
	recipeIngredientRepo repository.RecipeIngredientRepository
}

func NewRecipeService(
	recipeRepo repository.RecipeRepository,
	ingredientRepo repository.IngredientRepository,
	recipeIngredientRepo repository.RecipeIngredientRepository,
) RecipeService {
	return &recipeService{
		recipeRepo:           recipeRepo,
		ingredientRepo:       ingredientRepo,
		recipeIngredientRepo: recipeIngredientRepo,
	}
}

func (s *recipeService) Create(userID uuid.UUID, req dto.CreateRecipeRequest) (*dto.RecipeResponse, error) {
	// Sanitize text inputs
	req.Title = util.SanitizeString(req.Title)
	req.Description = util.SanitizeString(req.Description)
	req.Instructions = util.SanitizeString(req.Instructions)

	// Create recipe
	recipe := &entity.Recipe{
		UserID:       userID,
		Title:        req.Title,
		Description:  req.Description,
		Instructions: req.Instructions,
		CookingTime:  req.CookingTime,
		Servings:     req.Servings,
		Difficulty:   req.Difficulty,
		IsPublished:  req.IsPublished,
	}

	if err := s.recipeRepo.Create(recipe); err != nil {
		return nil, err
	}

	// Create recipe ingredients
	if err := s.createRecipeIngredients(recipe.ID, req.Ingredients); err != nil {
		return nil, err
	}

	// Load ingredients for response
	ingredients, err := s.recipeIngredientRepo.FindByRecipeID(recipe.ID)
	if err != nil {
		return nil, err
	}

	return s.toRecipeResponse(recipe, ingredients), nil
}

func (s *recipeService) Update(recipeID, userID uuid.UUID, req dto.UpdateRecipeRequest) (*dto.RecipeResponse, error) {
	// Find recipe
	recipe, err := s.recipeRepo.FindByID(recipeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.ErrNotFound
		}
		return nil, err
	}

	// Check ownership
	if recipe.UserID != userID {
		return nil, util.ErrForbidden
	}

	// Sanitize and update fields
	if req.Title != "" {
		recipe.Title = util.SanitizeString(req.Title)
	}
	if req.Description != "" {
		recipe.Description = util.SanitizeString(req.Description)
	}
	if req.Instructions != "" {
		recipe.Instructions = util.SanitizeString(req.Instructions)
	}
	if req.CookingTime > 0 {
		recipe.CookingTime = req.CookingTime
	}
	if req.Servings > 0 {
		recipe.Servings = req.Servings
	}
	if req.Difficulty != "" {
		recipe.Difficulty = req.Difficulty
	}
	if req.IsPublished != nil {
		recipe.IsPublished = *req.IsPublished
	}

	if err := s.recipeRepo.Update(recipe); err != nil {
		return nil, err
	}

	// Update ingredients if provided
	if req.Ingredients != nil {
		if err := s.recipeIngredientRepo.DeleteByRecipeID(recipe.ID); err != nil {
			return nil, err
		}
		if err := s.createRecipeIngredients(recipe.ID, req.Ingredients); err != nil {
			return nil, err
		}
	}

	// Load ingredients for response
	ingredients, err := s.recipeIngredientRepo.FindByRecipeID(recipe.ID)
	if err != nil {
		return nil, err
	}

	return s.toRecipeResponse(recipe, ingredients), nil
}

func (s *recipeService) Delete(recipeID, userID uuid.UUID) error {
	// Find recipe
	recipe, err := s.recipeRepo.FindByID(recipeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return util.ErrNotFound
		}
		return err
	}

	// Check ownership
	if recipe.UserID != userID {
		return util.ErrForbidden
	}

	return s.recipeRepo.Delete(recipeID)
}

func (s *recipeService) GetByID(recipeID uuid.UUID) (*dto.RecipeResponse, error) {
	recipe, err := s.recipeRepo.FindByID(recipeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.ErrNotFound
		}
		return nil, err
	}

	// Load ingredients
	ingredients, err := s.recipeIngredientRepo.FindByRecipeID(recipe.ID)
	if err != nil {
		return nil, err
	}

	return s.toRecipeResponse(recipe, ingredients), nil
}

func (s *recipeService) GetMyRecipes(userID uuid.UUID, page, limit int) ([]dto.RecipeListResponse, dto.PaginationMeta, error) {
	recipes, total, err := s.recipeRepo.FindByUserID(userID, page, limit)
	if err != nil {
		return nil, dto.PaginationMeta{}, err
	}

	return s.toRecipeListResponse(recipes), dto.NewPaginationMeta(page, limit, total), nil
}

func (s *recipeService) GetPublicRecipes(filter repository.RecipeFilter) ([]dto.RecipeListResponse, dto.PaginationMeta, error) {
	recipes, total, err := s.recipeRepo.FindPublic(filter)
	if err != nil {
		return nil, dto.PaginationMeta{}, err
	}

	return s.toRecipeListResponse(recipes), dto.NewPaginationMeta(filter.Page, filter.Limit, total), nil
}

func (s *recipeService) UploadPhotos(recipeID, userID uuid.UUID, photoURLs []string) (*dto.RecipeResponse, error) {
	// Find recipe
	recipe, err := s.recipeRepo.FindByID(recipeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.ErrNotFound
		}
		return nil, err
	}

	// Check ownership
	if recipe.UserID != userID {
		return nil, util.ErrForbidden
	}

	// Update photo URLs (max 3)
	if len(photoURLs) > 3 {
		photoURLs = photoURLs[:3]
	}

	recipe.PhotoURLs = pq.StringArray(photoURLs)

	if err := s.recipeRepo.Update(recipe); err != nil {
		return nil, err
	}

	// Load ingredients for response
	ingredients, err := s.recipeIngredientRepo.FindByRecipeID(recipe.ID)
	if err != nil {
		return nil, err
	}

	return s.toRecipeResponse(recipe, ingredients), nil
}

func (s *recipeService) createRecipeIngredients(recipeID uuid.UUID, ingredientItems []dto.IngredientItemDTO) error {
	var recipeIngredients []entity.RecipeIngredient

	for _, item := range ingredientItems {
		// Find or create ingredient
		sanitizedName := util.SanitizeString(item.Name)
		ingredient, err := s.ingredientRepo.FindOrCreate(sanitizedName)
		if err != nil {
			return err
		}

		recipeIngredients = append(recipeIngredients, entity.RecipeIngredient{
			RecipeID:     recipeID,
			IngredientID: ingredient.ID,
			Quantity:     util.SanitizeString(item.Quantity),
			Unit:         util.SanitizeString(item.Unit),
		})
	}

	return s.recipeIngredientRepo.CreateBulk(recipeIngredients)
}

func (s *recipeService) toRecipeResponse(recipe *entity.Recipe, ingredients []entity.RecipeIngredient) *dto.RecipeResponse {
	var ingredientItems []dto.IngredientItemDTO
	for _, ri := range ingredients {
		ingredientItems = append(ingredientItems, dto.IngredientItemDTO{
			Name:     ri.Ingredient.Name,
			Quantity: ri.Quantity,
			Unit:     ri.Unit,
		})
	}

	var photoURLs []string
	if recipe.PhotoURLs != nil {
		photoURLs = []string(recipe.PhotoURLs)
	}

	response := &dto.RecipeResponse{
		ID:            recipe.ID,
		UserID:        recipe.UserID,
		Title:         recipe.Title,
		Description:   recipe.Description,
		Instructions:  recipe.Instructions,
		CookingTime:   recipe.CookingTime,
		Servings:      recipe.Servings,
		Difficulty:    recipe.Difficulty,
		IsPublished:   recipe.IsPublished,
		AverageRating: recipe.AverageRating,
		RatingCount:   recipe.RatingCount,
		PhotoURLs:     photoURLs,
		Ingredients:   ingredientItems,
		CreatedAt:     recipe.CreatedAt,
		UpdatedAt:     recipe.UpdatedAt,
	}

	if recipe.User.ID != uuid.Nil {
		response.User = &dto.UserDTO{
			ID:    recipe.User.ID,
			Name:  recipe.User.Name,
			Email: recipe.User.Email,
		}
	}

	return response
}

func (s *recipeService) toRecipeListResponse(recipes []entity.Recipe) []dto.RecipeListResponse {
	var response []dto.RecipeListResponse

	for _, recipe := range recipes {
		var photoURLs []string
		if recipe.PhotoURLs != nil {
			photoURLs = []string(recipe.PhotoURLs)
		}

		item := dto.RecipeListResponse{
			ID:            recipe.ID,
			UserID:        recipe.UserID,
			Title:         recipe.Title,
			Description:   recipe.Description,
			CookingTime:   recipe.CookingTime,
			Servings:      recipe.Servings,
			Difficulty:    recipe.Difficulty,
			IsPublished:   recipe.IsPublished,
			AverageRating: recipe.AverageRating,
			RatingCount:   recipe.RatingCount,
			PhotoURLs:     photoURLs,
			CreatedAt:     recipe.CreatedAt,
		}

		if recipe.User.ID != uuid.Nil {
			item.User = &dto.UserDTO{
				ID:    recipe.User.ID,
				Name:  recipe.User.Name,
				Email: recipe.User.Email,
			}
		}

		response = append(response, item)
	}

	return response
}
```

**File:** `internal/service/ingredient_service.go`

```go
package service

import (
	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/dto"
	"github.com/yourusername/recipe-api/internal/entity"
	"github.com/yourusername/recipe-api/internal/repository"
	"github.com/yourusername/recipe-api/internal/util"
)

type IngredientService interface {
	Create(req dto.CreateIngredientRequest) (*dto.IngredientResponse, error)
	GetAll(page, limit int, search string) ([]dto.IngredientResponse, dto.PaginationMeta, error)
}

type ingredientService struct {
	ingredientRepo repository.IngredientRepository
}

func NewIngredientService(ingredientRepo repository.IngredientRepository) IngredientService {
	return &ingredientService{
		ingredientRepo: ingredientRepo,
	}
}

func (s *ingredientService) Create(req dto.CreateIngredientRequest) (*dto.IngredientResponse, error) {
	// Sanitize input
	req.Name = util.SanitizeString(req.Name)

	ingredient := &entity.Ingredient{
		Name: req.Name,
	}

	if err := s.ingredientRepo.Create(ingredient); err != nil {
		return nil, err
	}

	return &dto.IngredientResponse{
		ID:        ingredient.ID,
		Name:      ingredient.Name,
		CreatedAt: ingredient.CreatedAt,
	}, nil
}

func (s *ingredientService) GetAll(page, limit int, search string) ([]dto.IngredientResponse, dto.PaginationMeta, error) {
	ingredients, total, err := s.ingredientRepo.FindAll(page, limit, search)
	if err != nil {
		return nil, dto.PaginationMeta{}, err
	}

	return s.toIngredientListResponse(ingredients), dto.NewPaginationMeta(page, limit, total), nil
}

func (s *ingredientService) toIngredientListResponse(ingredients []entity.Ingredient) []dto.IngredientResponse {
	var response []dto.IngredientResponse

	for _, ingredient := range ingredients {
		response = append(response, dto.IngredientResponse{
			ID:        ingredient.ID,
			Name:      ingredient.Name,
			CreatedAt: ingredient.CreatedAt,
		})
	}

	return response
}
```

**File:** `internal/service/rating_service.go`

```go
package service

import (
	"errors"

	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/dto"
	"github.com/yourusername/recipe-api/internal/entity"
	"github.com/yourusername/recipe-api/internal/repository"
	"github.com/yourusername/recipe-api/internal/util"
	"gorm.io/gorm"
)

type RatingService interface {
	Create(userID uuid.UUID, req dto.CreateRatingRequest) (*dto.RatingResponse, error)
	Update(ratingID, userID uuid.UUID, req dto.UpdateRatingRequest) (*dto.RatingResponse, error)
	Delete(ratingID, userID uuid.UUID) error
}

type ratingService struct {
	ratingRepo repository.RatingRepository
	recipeRepo repository.RecipeRepository
}

func NewRatingService(ratingRepo repository.RatingRepository, recipeRepo repository.RecipeRepository) RatingService {
	return &ratingService{
		ratingRepo: ratingRepo,
		recipeRepo: recipeRepo,
	}
}

func (s *ratingService) Create(userID uuid.UUID, req dto.CreateRatingRequest) (*dto.RatingResponse, error) {
	// Check if recipe exists
	recipe, err := s.recipeRepo.FindByID(req.RecipeID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.ErrNotFound
		}
		return nil, err
	}

	// Check if user is not rating their own recipe
	if recipe.UserID == userID {
		return nil, util.NewAppError("cannot rate your own recipe", "CANNOT_RATE_OWN", 400)
	}

	// Check if user already rated this recipe
	existingRating, err := s.ratingRepo.FindByRecipeAndUser(req.RecipeID, userID)
	if err == nil && existingRating != nil {
		return nil, util.ErrRatingExists
	}

	// Create rating
	rating := &entity.Rating{
		RecipeID: req.RecipeID,
		UserID:   userID,
		Value:    req.Value,
	}

	if err := s.ratingRepo.Create(rating); err != nil {
		return nil, err
	}

	// Recalculate recipe average rating
	if err := s.updateRecipeRating(req.RecipeID); err != nil {
		return nil, err
	}

	return &dto.RatingResponse{
		ID:        rating.ID,
		RecipeID:  rating.RecipeID,
		UserID:    rating.UserID,
		Value:     rating.Value,
		CreatedAt: rating.CreatedAt,
		UpdatedAt: rating.UpdatedAt,
	}, nil
}

func (s *ratingService) Update(ratingID, userID uuid.UUID, req dto.UpdateRatingRequest) (*dto.RatingResponse, error) {
	// Find rating
	rating, err := s.ratingRepo.FindByID(ratingID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.ErrNotFound
		}
		return nil, err
	}

	// Check ownership
	if rating.UserID != userID {
		return nil, util.ErrForbidden
	}

	// Update rating
	rating.Value = req.Value

	if err := s.ratingRepo.Update(rating); err != nil {
		return nil, err
	}

	// Recalculate recipe average rating
	if err := s.updateRecipeRating(rating.RecipeID); err != nil {
		return nil, err
	}

	return &dto.RatingResponse{
		ID:        rating.ID,
		RecipeID:  rating.RecipeID,
		UserID:    rating.UserID,
		Value:     rating.Value,
		CreatedAt: rating.CreatedAt,
		UpdatedAt: rating.UpdatedAt,
	}, nil
}

func (s *ratingService) Delete(ratingID, userID uuid.UUID) error {
	// Find rating
	rating, err := s.ratingRepo.FindByID(ratingID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return util.ErrNotFound
		}
		return err
	}

	// Check ownership
	if rating.UserID != userID {
		return util.ErrForbidden
	}

	recipeID := rating.RecipeID

	if err := s.ratingRepo.Delete(ratingID); err != nil {
		return err
	}

	// Recalculate recipe average rating
	return s.updateRecipeRating(recipeID)
}

func (s *ratingService) updateRecipeRating(recipeID uuid.UUID) error {
	// Calculate new average
	avgRating, count, err := s.ratingRepo.CalculateAverageByRecipeID(recipeID)
	if err != nil {
		return err
	}

	// Update recipe
	return s.recipeRepo.UpdateRating(recipeID, avgRating, count)
}
```

**File:** `internal/service/upload_service.go`

```go
package service

import (
	"fmt"
	"image"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/config"
	"github.com/yourusername/recipe-api/internal/util"
)

type UploadService interface {
	UploadRecipePhotos(files []*multipart.FileHeader) ([]string, error)
}

type uploadService struct {
	cfg *config.Config
}

func NewUploadService(cfg *config.Config) UploadService {
	return &uploadService{
		cfg: cfg,
	}
}

func (s *uploadService) UploadRecipePhotos(files []*multipart.FileHeader) ([]string, error) {
	// Max 3 photos
	if len(files) > 3 {
		return nil, util.ErrTooManyFiles
	}

	var photoURLs []string

	for _, fileHeader := range files {
		// Validate file type
		if !s.isValidImageType(fileHeader.Filename) {
			return nil, util.ErrInvalidFileType
		}

		// Validate file size (max 5MB)
		if fileHeader.Size > 5*1024*1024 {
			return nil, util.ErrFileTooLarge
		}

		// Open file
		file, err := fileHeader.Open()
		if err != nil {
			return nil, err
		}
		defer file.Close()

		// Decode image
		img, _, err := image.Decode(file)
		if err != nil {
			return nil, fmt.Errorf("failed to decode image: %w", err)
		}

		// Resize to 800x600 maintaining aspect ratio
		resizedImg := imaging.Fit(img, 800, 600, imaging.Lanczos)

		// Generate unique filename
		filename := fmt.Sprintf("%s_%s", uuid.New().String(), filepath.Base(fileHeader.Filename))
		uploadPath := filepath.Join(s.cfg.UploadPath, filename)

		// Create upload directory if not exists
		if err := os.MkdirAll(s.cfg.UploadPath, os.ModePerm); err != nil {
			return nil, err
		}

		// Save resized image
		if err := imaging.Save(resizedImg, uploadPath); err != nil {
			return nil, err
		}

		// Generate URL
		photoURL := fmt.Sprintf("/uploads/%s", filename)
		photoURLs = append(photoURLs, photoURL)
	}

	return photoURLs, nil
}

func (s *uploadService) isValidImageType(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	validExts := []string{".jpg", ".jpeg", ".png"}

	for _, validExt := range validExts {
		if ext == validExt {
			return true
		}
	}

	return false
}
```

---

### **Step 7: Cache Service**

**File:** `internal/service/cache_service.go`

```go
package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

type CacheService interface {
	Get(ctx context.Context, key string, dest interface{}) error
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, keys ...string) error
	DeletePattern(ctx context.Context, pattern string) error
}

type cacheService struct {
	redis *redis.Client
}

func NewCacheService(redis *redis.Client) CacheService {
	return &cacheService{
		redis: redis,
	}
}

func (s *cacheService) Get(ctx context.Context, key string, dest interface{}) error {
	val, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return err // redis.Nil if not found
	}

	return json.Unmarshal([]byte(val), dest)
}

func (s *cacheService) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return s.redis.Set(ctx, key, data, ttl).Err()
}

func (s *cacheService) Delete(ctx context.Context, keys ...string) error {
	return s.redis.Del(ctx, keys...).Err()
}

func (s *cacheService) DeletePattern(ctx context.Context, pattern string) error {
	// Find all keys matching pattern
	iter := s.redis.Scan(ctx, 0, pattern, 0).Iterator()
	
	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	
	if err := iter.Err(); err != nil {
		return err
	}

	if len(keys) > 0 {
		return s.redis.Del(ctx, keys...).Err()
	}

	return nil
}
```

---

### **Step 8: Handlers**

**File:** `internal/handler/auth_handler.go`

```go
package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/recipe-api/internal/dto"
	"github.com/yourusername/recipe-api/internal/service"
	"github.com/yourusername/recipe-api/internal/util"
)

type AuthHandler struct {
	authService service.AuthService
	validator   *util.Validator
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		validator:   util.GetValidator(),
	}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req dto.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Validate(req); err != nil {
		return util.ErrorResponse(c, err)
	}

	response, err := h.authService.Register(req)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(util.Response{
		Success: true,
		Data:    response,
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Validate(req); err != nil {
		return util.ErrorResponse(c, err)
	}

	response, err := h.authService.Login(req)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, response)
}
```

**File:** `internal/handler/recipe_handler.go`

```go
package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/dto"
	"github.com/yourusername/recipe-api/internal/repository"
	"github.com/yourusername/recipe-api/internal/service"
	"github.com/yourusername/recipe-api/internal/util"
)

type RecipeHandler struct {
	recipeService service.RecipeService
	uploadService service.UploadService
	validator     *util.Validator
}

func NewRecipeHandler(recipeService service.RecipeService, uploadService service.UploadService) *RecipeHandler {
	return &RecipeHandler{
		recipeService: recipeService,
		uploadService: uploadService,
		validator:     util.GetValidator(),
	}
}

func (h *RecipeHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	var req dto.CreateRecipeRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Validate(req); err != nil {
		return util.ErrorResponse(c, err)
	}

	response, err := h.recipeService.Create(userID, req)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(util.Response{
		Success: true,
		Data:    response,
	})
}

func (h *RecipeHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	recipeID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	var req dto.UpdateRecipeRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Validate(req); err != nil {
		return util.ErrorResponse(c, err)
	}

	response, err := h.recipeService.Update(recipeID, userID, req)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, response)
}

func (h *RecipeHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	recipeID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.recipeService.Delete(recipeID, userID); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{"message": "recipe deleted successfully"})
}

func (h *RecipeHandler) GetByID(c *fiber.Ctx) error {
	recipeID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	response, err := h.recipeService.GetByID(recipeID)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, response)
}

func (h *RecipeHandler) GetMyRecipes(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	recipes, meta, err := h.recipeService.GetMyRecipes(userID, page, limit)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponseWithMeta(c, recipes, meta)
}

func (h *RecipeHandler) GetPublicRecipes(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	minRating, _ := strconv.ParseFloat(c.Query("min_rating", "0"), 64)
	maxCookTime, _ := strconv.Atoi(c.Query("max_cook_time", "0"))

	var hasPhoto *bool
	if c.Query("has_photo") != "" {
		val := c.Query("has_photo") == "true"
		hasPhoto = &val
	}

	var ingredientID *uuid.UUID
	if c.Query("ingredient_id") != "" {
		id, err := uuid.Parse(c.Query("ingredient_id"))
		if err == nil {
			ingredientID = &id
		}
	}

	filter := repository.RecipeFilter{
		Page:         page,
		Limit:        limit,
		Difficulty:   c.Query("difficulty"),
		MinRating:    minRating,
		MaxCookTime:  maxCookTime,
		HasPhoto:     hasPhoto,
		Search:       c.Query("search"),
		IngredientID: ingredientID,
	}

	recipes, meta, err := h.recipeService.GetPublicRecipes(filter)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponseWithMeta(c, recipes, meta)
}

func (h *RecipeHandler) UploadPhotos(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	recipeID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	// Parse multipart form
	form, err := c.MultipartForm()
	if err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	files := form.File["photos"]
	if len(files) == 0 {
		return util.ErrorResponse(c, util.NewAppError("no files provided", "NO_FILES", 400))
	}

	// Upload photos
	photoURLs, err := h.uploadService.UploadRecipePhotos(files)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	// Update recipe
	response, err := h.recipeService.UploadPhotos(recipeID, userID, photoURLs)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, response)
}
```

**File:** `internal/handler/ingredient_handler.go`

```go
package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/recipe-api/internal/dto"
	"github.com/yourusername/recipe-api/internal/service"
	"github.com/yourusername/recipe-api/internal/util"
)

type IngredientHandler struct {
	ingredientService service.IngredientService
	validator         *util.Validator
}

func NewIngredientHandler(ingredientService service.IngredientService) *IngredientHandler {
	return &IngredientHandler{
		ingredientService: ingredientService,
		validator:         util.GetValidator(),
	}
}

func (h *IngredientHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateIngredientRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Validate(req); err != nil {
		return util.ErrorResponse(c, err)
	}

	response, err := h.ingredientService.Create(req)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(util.Response{
		Success: true,
		Data:    response,
	})
}

func (h *IngredientHandler) GetAll(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	search := c.Query("search", "")

	ingredients, meta, err := h.ingredientService.GetAll(page, limit, search)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponseWithMeta(c, ingredients, meta)
}
```

**File:** `internal/handler/rating_handler.go`

```go
package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/recipe-api/internal/dto"
	"github.com/yourusername/recipe-api/internal/service"
	"github.com/yourusername/recipe-api/internal/util"
)

type RatingHandler struct {
	ratingService service.RatingService
	validator     *util.Validator
}

func NewRatingHandler(ratingService service.RatingService) *RatingHandler {
	return &RatingHandler{
		ratingService: ratingService,
		validator:     util.GetValidator(),
	}
}

func (h *RatingHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	var req dto.CreateRatingRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Validate(req); err != nil {
		return util.ErrorResponse(c, err)
	}

	response, err := h.ratingService.Create(userID, req)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(util.Response{
		Success: true,
		Data:    response,
	})
}

func (h *RatingHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	ratingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	var req dto.UpdateRatingRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Validate(req); err != nil {
		return util.ErrorResponse(c, err)
	}

	response, err := h.ratingService.Update(ratingID, userID, req)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, response)
}

func (h *RatingHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	ratingID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.ratingService.Delete(ratingID, userID); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{"message": "rating deleted successfully"})
}
```

---

### **Step 9: Security Middleware**

**File:** `internal/middleware/auth_middleware.go`

```go
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/recipe-api/internal/config"
	"github.com/yourusername/recipe-api/internal/util"
)

func AuthMiddleware(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return util.ErrorResponse(c, util.ErrUnauthorized)
		}

		// Check Bearer format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return util.ErrorResponse(c, util.ErrUnauthorized)
		}

		tokenString := parts[1]

		// Validate token
		claims, err := util.ValidateToken(tokenString, cfg)
		if err != nil {
			return util.ErrorResponse(c, util.ErrUnauthorized)
		}

		// Set user info in context
		c.Locals("userID", claims.UserID)
		c.Locals("email", claims.Email)

		return c.Next()
	}
}
```

**File:** `internal/middleware/cors_middleware.go`

```go
package middleware

import (
	"github.com/gofiber/contrib/fibercors"
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/recipe-api/internal/config"
)

// NewCORSMiddleware creates CORS middleware with environment-specific configuration
// Development: Allow all origins for easier testing
// Production: Strict whitelist of allowed origins
func NewCORSMiddleware(cfg *config.Config) fiber.Handler {
	corsConfig := fibercors.Config{
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}

	if cfg.Security.Environment == "production" {
		// Production: whitelist specific origins
		corsConfig.AllowOrigins = cfg.Security.AllowedOrigins
		corsConfig.AllowCredentials = true
	} else {
		// Development: allow all origins
		corsConfig.AllowOrigins = "*"
	}

	return fibercors.New(corsConfig)
}
```

**File:** `internal/middleware/rate_limit_middleware.go`

```go
package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/yourusername/recipe-api/internal/config"
)

// NewRateLimitMiddleware creates rate limiter with different limits for authenticated vs anonymous users
// Anonymous users: 30 requests/minute (stricter to prevent abuse)
// Authenticated users: 200 requests/minute (more generous for legitimate users)
func NewRateLimitMiddleware(cfg *config.Config) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        cfg.Security.RateLimit.Anonymous, // Default limit for anonymous
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			// Use IP address as key for anonymous users
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   "rate limit exceeded",
				"code":    "RATE_LIMIT_EXCEEDED",
			})
		},
		SkipFailedRequests: false,
		SkipSuccessfulRequests: false,
		// Dynamic limit based on authentication
		Next: func(c *fiber.Ctx) bool {
			// Check if user is authenticated
			userID := c.Locals("userID")
			if userID != nil {
				// For authenticated users, use higher limit
				// We need to update the Max value dynamically
				c.Locals("rateLimitMax", cfg.Security.RateLimit.Authenticated)
				return false
			}
			// For anonymous users, use default (lower) limit
			c.Locals("rateLimitMax", cfg.Security.RateLimit.Anonymous)
			return false
		},
	})
}

// NewAuthenticatedRateLimitMiddleware creates a rate limiter specifically for authenticated routes
func NewAuthenticatedRateLimitMiddleware(cfg *config.Config) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        cfg.Security.RateLimit.Authenticated,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			// Use user ID as key for authenticated users
			userID := c.Locals("userID")
			if userID != nil {
				return fmt.Sprintf("user:%s", userID)
			}
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"success": false,
				"error":   "rate limit exceeded",
				"code":    "RATE_LIMIT_EXCEEDED",
			})
		},
	})
}
```

**File:** `internal/middleware/helmet_middleware.go`

```go
package middleware

import (
	"github.com/gofiber/contrib/helmet"
	"github.com/gofiber/fiber/v2"
)

// NewHelmetMiddleware adds security headers to protect against common vulnerabilities
// - XSS Protection: Prevents cross-site scripting attacks
// - Content Security Policy: Controls which resources can be loaded
// - HSTS: Forces HTTPS connections
// - X-Frame-Options: Prevents clickjacking
// - X-Content-Type-Options: Prevents MIME-sniffing
func NewHelmetMiddleware() fiber.Handler {
	return helmet.New(helmet.Config{
		XSSProtection:             "1; mode=block",
		ContentTypeNosniff:        "nosniff",
		XFrameOptions:             "DENY",
		HSTSMaxAge:                31536000,
		HSTSExcludeSubdomains:     false,
		ContentSecurityPolicy:     "default-src 'self'",
		CSPReportOnly:             false,
		HSTSPreloadEnabled:        false,
		ReferrerPolicy:            "no-referrer",
		PermissionPolicy:          "geolocation=(self), microphone=()",
		CrossOriginEmbedderPolicy: "require-corp",
		CrossOriginOpenerPolicy:   "same-origin",
		CrossOriginResourcePolicy: "same-origin",
		OriginAgentCluster:        "?1",
		XDNSPrefetchControl:       "off",
		XDownloadOptions:          "noopen",
		XPermittedCrossDomain:     "none",
	})
}
```

**File:** `internal/middleware/sanitize_middleware.go`

```go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/recipe-api/internal/util"
)

// SanitizeMiddleware strips HTML and scripts from request body to prevent XSS attacks
// Uses bluemonday strict policy which removes ALL HTML tags
func SanitizeMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Only sanitize for JSON requests
		contentType := c.Get("Content-Type")
		if contentType != "application/json" {
			return c.Next()
		}

		// Get body
		body := c.Body()
		if len(body) == 0 {
			return c.Next()
		}

		// Parse body as map
		var data map[string]interface{}
		if err := c.BodyParser(&data); err != nil {
			return c.Next() // Skip sanitization if parsing fails
		}

		// Recursively sanitize all string values
		sanitizeMap(data)

		// Update body with sanitized data
		c.Locals("sanitizedBody", data)

		return c.Next()
	}
}

func sanitizeMap(data map[string]interface{}) {
	for key, value := range data {
		switch v := value.(type) {
		case string:
			data[key] = util.SanitizeString(v)
		case map[string]interface{}:
			sanitizeMap(v)
		case []interface{}:
			sanitizeArray(v)
		}
	}
}

func sanitizeArray(arr []interface{}) {
	for i, item := range arr {
		switch v := item.(type) {
		case string:
			arr[i] = util.SanitizeString(v)
		case map[string]interface{}:
			sanitizeMap(v)
		case []interface{}:
			sanitizeArray(v)
		}
	}
}
```

**File:** `internal/middleware/logger_middleware.go`

```go
package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func NewLoggerMiddleware() fiber.Handler {
	return logger.New(logger.Config{
		Format:     "${time} | ${status} | ${latency} | ${method} | ${path}\n",
		TimeFormat: time.RFC3339,
		TimeZone:   "Local",
	})
}
```

**File:** `internal/middleware/recovery_middleware.go`

```go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func NewRecoveryMiddleware() fiber.Handler {
	return recover.New(recover.Config{
		EnableStackTrace: true,
	})
}
```

---

### **Step 10: Cache Middleware & Invalidation**

**File:** `internal/middleware/cache_middleware.go`

```go
package middleware

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"github.com/yourusername/recipe-api/internal/config"
	"github.com/yourusername/recipe-api/internal/service"
)

// CacheMiddleware caches GET requests and adds X-Cache header
// Only caches successful responses (200 OK)
func NewCacheMiddleware(cacheService service.CacheService, cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Only cache GET requests
		if c.Method() != fiber.MethodGet {
			return c.Next()
		}

		// Generate cache key from route and query params
		cacheKey := generateCacheKey(c)

		// Try to get from cache
		var cachedResponse CachedResponse
		ctx := context.Background()
		err := cacheService.Get(ctx, cacheKey, &cachedResponse)

		if err == nil {
			// Cache HIT
			c.Set("X-Cache", "HIT")
			c.Set("X-Cache-Key", cacheKey)
			return c.Status(cachedResponse.Status).JSON(cachedResponse.Body)
		}

		// Cache MISS - proceed with request
		c.Set("X-Cache", "MISS")
		c.Set("X-Cache-Key", cacheKey)

		// Continue to handler
		if err := c.Next(); err != nil {
			return err
		}

		// Only cache successful responses
		if c.Response().StatusCode() == fiber.StatusOK {
			// Store response in cache
			cachedResponse = CachedResponse{
				Status: c.Response().StatusCode(),
				Body:   c.Response().Body(),
			}

			// Determine TTL based on route
			ttl := determineTTL(c, cfg)

			// Save to cache (ignore errors)
			_ = cacheService.Set(ctx, cacheKey, cachedResponse, ttl)
		}

		return nil
	}
}

type CachedResponse struct {
	Status int         `json:"status"`
	Body   interface{} `json:"body"`
}

func generateCacheKey(c *fiber.Ctx) string {
	// Include route, query params, and user ID for personalized caching
	userID := c.Locals("userID")
	if userID != nil {
		return fmt.Sprintf("cache:%s:%s:user:%v", c.Route().Path, c.Request().URI().QueryArgs().String(), userID)
	}
	return fmt.Sprintf("cache:%s:%s", c.Route().Path, c.Request().URI().QueryArgs().String())
}

func determineTTL(c *fiber.Ctx, cfg *config.Config) time.Duration {
	path := c.Route().Path

	// Detail endpoints: 15 minutes
	if path == "/api/recipes/:id" {
		return cfg.Cache.RecipeDetailTTL
	}

	// List endpoints: 1 hour
	if path == "/api/ingredients" {
		return cfg.Cache.IngredientListTTL
	}

	// Default: 5 minutes
	return 5 * time.Minute
}
```

**File:** `internal/repository/hooks.go`

```go
package repository

import (
	"context"
	"log"

	"github.com/yourusername/recipe-api/internal/entity"
	"github.com/yourusername/recipe-api/internal/service"
	"gorm.io/gorm"
)

// RegisterCacheInvalidationHooks registers GORM hooks to invalidate cache on mutations
func RegisterCacheInvalidationHooks(db *gorm.DB, cacheService service.CacheService) {
	// Recipe hooks
	db.Callback().Create().After("gorm:create").Register("cache:invalidate_recipe_create", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "recipes" {
			invalidateRecipeCache(cacheService)
		}
	})

	db.Callback().Update().After("gorm:update").Register("cache:invalidate_recipe_update", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "recipes" {
			invalidateRecipeCache(cacheService)
		}
	})

	db.Callback().Delete().After("gorm:delete").Register("cache:invalidate_recipe_delete", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "recipes" {
			invalidateRecipeCache(cacheService)
		}
	})

	// Ingredient hooks
	db.Callback().Create().After("gorm:create").Register("cache:invalidate_ingredient_create", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "ingredients" {
			invalidateIngredientCache(cacheService)
		}
	})

	// Rating hooks
	db.Callback().Create().After("gorm:create").Register("cache:invalidate_rating_create", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "ratings" {
			if rating, ok := tx.Statement.Dest.(*entity.Rating); ok {
				invalidateRecipeCacheByID(cacheService, rating.RecipeID.String())
			}
			invalidateRecipeCache(cacheService)
		}
	})

	db.Callback().Update().After("gorm:update").Register("cache:invalidate_rating_update", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "ratings" {
			if rating, ok := tx.Statement.Dest.(*entity.Rating); ok {
				invalidateRecipeCacheByID(cacheService, rating.RecipeID.String())
			}
			invalidateRecipeCache(cacheService)
		}
	})

	db.Callback().Delete().After("gorm:delete").Register("cache:invalidate_rating_delete", func(tx *gorm.DB) {
		if tx.Statement.Schema != nil && tx.Statement.Schema.Table == "ratings" {
			invalidateRecipeCache(cacheService)
		}
	})
}

func invalidateRecipeCache(cacheService service.CacheService) {
	ctx := context.Background()
	
	// Invalidate all recipe list caches
	if err := cacheService.DeletePattern(ctx, "cache:/api/recipes*"); err != nil {
		log.Printf("Failed to invalidate recipe cache: %v", err)
	}
}

func invalidateRecipeCacheByID(cacheService service.CacheService, recipeID string) {
	ctx := context.Background()
	
	// Invalidate specific recipe detail cache
	pattern := "cache:/api/recipes/" + recipeID + "*"
	if err := cacheService.DeletePattern(ctx, pattern); err != nil {
		log.Printf("Failed to invalidate recipe detail cache: %v", err)
	}
}

func invalidateIngredientCache(cacheService service.CacheService) {
	ctx := context.Background()
	
	// Invalidate all ingredient caches
	if err := cacheService.DeletePattern(ctx, "cache:/api/ingredients*"); err != nil {
		log.Printf("Failed to invalidate ingredient cache: %v", err)
	}
}
```

---

### **Step 11: Routes & Main.go**

**File:** `internal/routes/routes.go`

```go
package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/recipe-api/internal/config"
	"github.com/yourusername/recipe-api/internal/handler"
	"github.com/yourusername/recipe-api/internal/middleware"
	"github.com/yourusername/recipe-api/internal/service"
)

func SetupRoutes(
	app *fiber.App,
	cfg *config.Config,
	authHandler *handler.AuthHandler,
	recipeHandler *handler.RecipeHandler,
	ingredientHandler *handler.IngredientHandler,
	ratingHandler *handler.RatingHandler,
	cacheService service.CacheService,
) {
	// API group
	api := app.Group("/api")

	// Public routes (with anonymous rate limiting)
	api.Post("/auth/register", authHandler.Register)
	api.Post("/auth/login", authHandler.Login)

	// Public recipe routes (cached)
	api.Get("/recipes", 
		middleware.NewCacheMiddleware(cacheService, cfg),
		recipeHandler.GetPublicRecipes,
	)
	api.Get("/recipes/:id", 
		middleware.NewCacheMiddleware(cacheService, cfg),
		recipeHandler.GetByID,
	)

	// Public ingredient routes (cached)
	api.Get("/ingredients", 
		middleware.NewCacheMiddleware(cacheService, cfg),
		ingredientHandler.GetAll,
	)

	// Protected routes (require authentication + authenticated rate limiting)
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(cfg))
	protected.Use(middleware.NewAuthenticatedRateLimitMiddleware(cfg))

	// My recipes
	protected.Get("/my-recipes", recipeHandler.GetMyRecipes)
	protected.Post("/recipes", recipeHandler.Create)
	protected.Put("/recipes/:id", recipeHandler.Update)
	protected.Delete("/recipes/:id", recipeHandler.Delete)
	protected.Post("/recipes/:id/photos", recipeHandler.UploadPhotos)

	// Ingredients
	protected.Post("/ingredients", ingredientHandler.Create)

	// Ratings
	protected.Post("/ratings", ratingHandler.Create)
	protected.Put("/ratings/:id", ratingHandler.Update)
	protected.Delete("/ratings/:id", ratingHandler.Delete)

	// Static files (uploads)
	app.Static("/uploads", cfg.UploadPath)
}
```

**File:** `cmd/main.go`

```go
package main

import (
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/recipe-api/internal/config"
	"github.com/yourusername/recipe-api/internal/database"
	"github.com/yourusername/recipe-api/internal/entity"
	"github.com/yourusername/recipe-api/internal/handler"
	"github.com/yourusername/recipe-api/internal/middleware"
	"github.com/yourusername/recipe-api/internal/repository"
	"github.com/yourusername/recipe-api/internal/routes"
	"github.com/yourusername/recipe-api/internal/service"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to PostgreSQL
	db, err := database.ConnectPostgres(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}

	// Auto migrate
	if err := db.AutoMigrate(
		&entity.User{},
		&entity.Recipe{},
		&entity.Ingredient{},
		&entity.RecipeIngredient{},
		&entity.Rating{},
	); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Add unique constraint for ratings (one rating per user per recipe)
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_recipe_rating 
		ON ratings (recipe_id, user_id) WHERE deleted_at IS NULL
	`).Error; err != nil {
		log.Printf("Warning: Failed to create unique index for ratings: %v", err)
	}

	// Connect to Redis
	redisClient, err := database.ConnectRedis(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	// Initialize cache service
	cacheService := service.NewCacheService(redisClient)

	// Register cache invalidation hooks
	repository.RegisterCacheInvalidationHooks(db, cacheService)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	recipeRepo := repository.NewRecipeRepository(db)
	ingredientRepo := repository.NewIngredientRepository(db)
	recipeIngredientRepo := repository.NewRecipeIngredientRepository(db)
	ratingRepo := repository.NewRatingRepository(db)

	// Initialize services
	authService := service.NewAuthService(userRepo, cfg)
	recipeService := service.NewRecipeService(recipeRepo, ingredientRepo, recipeIngredientRepo)
	ingredientService := service.NewIngredientService(ingredientRepo)
	ratingService := service.NewRatingService(ratingRepo, recipeRepo)
	uploadService := service.NewUploadService(cfg)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	recipeHandler := handler.NewRecipeHandler(recipeService, uploadService)
	ingredientHandler := handler.NewIngredientHandler(ingredientService)
	ratingHandler := handler.NewRatingHandler(ratingService)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
				"code":    "INTERNAL_ERROR",
			})
		},
	})

	// Global middleware
	app.Use(middleware.NewRecoveryMiddleware())
	app.Use(middleware.NewLoggerMiddleware())
	app.Use(middleware.NewCORSMiddleware(cfg))
	app.Use(middleware.NewHelmetMiddleware())
	app.Use(middleware.SanitizeMiddleware())
	app.Use(middleware.NewRateLimitMiddleware(cfg))

	// Setup routes
	routes.SetupRoutes(app, cfg, authHandler, recipeHandler, ingredientHandler, ratingHandler, cacheService)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"cache":  "enabled",
		})
	})

	// Start server
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("🚀 Server running on http://localhost%s", addr)
	log.Printf("🔒 Security: CORS=%s, RateLimit=%dauth/%danon, Helmet=enabled, Sanitize=enabled",
		cfg.Security.Environment,
		cfg.Security.RateLimit.Authenticated,
		cfg.Security.RateLimit.Anonymous,
	)
	log.Printf("⚡ Cache: Redis enabled, RecipeDetail=%s, IngredientList=%s",
		cfg.Cache.RecipeDetailTTL,
		cfg.Cache.IngredientListTTL,
	)

	if err := app.Listen(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
```

---

### **Step 12: Testing Manual & Performance**

Buat file `API_TESTING.md`:

```markdown
# Recipe API - Testing Manual

## 1. Security Testing

### 1.1 CORS Testing

**Test preflight request:**
```bash
curl -X OPTIONS http://localhost:3000/api/recipes \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

**Expected:** Headers `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`

### 1.2 Rate Limiting Testing

**Test anonymous rate limit (30 req/min):**
```bash
for i in {1..35}; do
  curl http://localhost:3000/api/recipes
  echo "Request $i"
done
```

**Expected:** Requests 31-35 return `429 Too Many Requests`

**Test authenticated rate limit (200 req/min):**
```bash
TOKEN="your_jwt_token"

for i in {1..205}; do
  curl http://localhost:3000/api/my-recipes \
    -H "Authorization: Bearer $TOKEN"
  echo "Request $i"
done
```

**Expected:** Requests 201-205 return `429`

### 1.3 Helmet Security Headers

**Test security headers:**
```bash
curl -I http://localhost:3000/api/recipes
```

**Expected headers:**
```
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
Referrer-Policy: no-referrer
```

### 1.4 Input Sanitization Testing

**Test XSS prevention:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<script>alert('XSS')</script>John",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Expected:** Name stored as "John" (script tags stripped)

**Test SQL injection prevention (handled by GORM):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com' OR '1'='1",
    "password": "anything"
  }'
```

**Expected:** Login fails (SQL injection prevented)

### 1.5 Vulnerability Scanning

**Run govulncheck:**
```bash
govulncheck ./...
```

**Expected:** No known vulnerabilities

---

## 2. Caching Testing

### 2.1 Cache HIT/MISS Testing

**First request (MISS):**
```bash
curl -v http://localhost:3000/api/recipes
```

**Check headers:**
```
X-Cache: MISS
X-Cache-Key: cache:/api/recipes:...
```

**Second request (HIT):**
```bash
curl -v http://localhost:3000/api/recipes
```

**Check headers:**
```
X-Cache: HIT
X-Cache-Key: cache:/api/recipes:...
```

**Expected:** Second request is faster

### 2.2 Cache Invalidation Testing

**Create a new recipe:**
```bash
TOKEN="your_jwt_token"

curl -X POST http://localhost:3000/api/recipes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nasi Goreng",
    "description": "Indonesian fried rice",
    "instructions": "Cook rice with spices",
    "cooking_time": 20,
    "servings": 2,
    "difficulty": "easy",
    "is_published": true,
    "ingredients": [
      {"name": "Rice", "quantity": "2", "unit": "cups"},
      {"name": "Garlic", "quantity": "3", "unit": "cloves"}
    ]
  }'
```

**Fetch recipes again:**
```bash
curl -v http://localhost:3000/api/recipes
```

**Check headers:**
```
X-Cache: MISS
```

**Expected:** Cache was invalidated after recipe creation

### 2.3 Different TTL Testing

**Test recipe detail cache (15 min):**
```bash
RECIPE_ID="recipe_uuid_here"

curl -v http://localhost:3000/api/recipes/$RECIPE_ID
```

**Test ingredient list cache (1 hour):**
```bash
curl -v http://localhost:3000/api/ingredients
```

**Expected:** Different `X-Cache-Key` patterns

### 2.4 Performance Comparison

**Without cache (first request):**
```bash
time curl http://localhost:3000/api/recipes?limit=50
```

**With cache (second request):**
```bash
time curl http://localhost:3000/api/recipes?limit=50
```

**Expected:** Cached request is significantly faster (e.g., 150ms → 5ms)

---

## 3. Functional Testing

### 3.1 Auth Testing

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Expected:** Returns JWT token

### 3.2 Recipe CRUD Testing

**Create recipe:**
```bash
TOKEN="your_jwt_token"

curl -X POST http://localhost:3000/api/recipes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Rendang",
    "description": "Spicy beef stew",
    "instructions": "Slow cook beef with spices for 4 hours",
    "cooking_time": 240,
    "servings": 6,
    "difficulty": "hard",
    "is_published": true,
    "ingredients": [
      {"name": "Beef", "quantity": "1", "unit": "kg"},
      {"name": "Coconut milk", "quantity": "500", "unit": "ml"},
      {"name": "Lemongrass", "quantity": "3", "unit": "stalks"}
    ]
  }'
```

**Get recipe by ID:**
```bash
RECIPE_ID="recipe_uuid_here"

curl http://localhost:3000/api/recipes/$RECIPE_ID
```

**Update recipe:**
```bash
curl -X PUT http://localhost:3000/api/recipes/$RECIPE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cooking_time": 300,
    "servings": 8
  }'
```

**Delete recipe:**
```bash
curl -X DELETE http://localhost:3000/api/recipes/$RECIPE_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 3.3 Advanced Filtering Testing

**Filter by difficulty:**
```bash
curl "http://localhost:3000/api/recipes?difficulty=easy"
```

**Filter by max cooking time:**
```bash
curl "http://localhost:3000/api/recipes?max_cook_time=30"
```

**Filter by minimum rating:**
```bash
curl "http://localhost:3000/api/recipes?min_rating=4.0"
```

**Filter recipes with photos:**
```bash
curl "http://localhost:3000/api/recipes?has_photo=true"
```

**Search by title:**
```bash
curl "http://localhost:3000/api/recipes?search=nasi"
```

**Filter by ingredient:**
```bash
INGREDIENT_ID="ingredient_uuid_here"

curl "http://localhost:3000/api/recipes?ingredient_id=$INGREDIENT_ID"
```

**Combined filters:**
```bash
curl "http://localhost:3000/api/recipes?difficulty=easy&max_cook_time=30&min_rating=4.0&has_photo=true&search=fried"
```

### 3.4 Photo Upload Testing

**Upload recipe photos (max 3):**
```bash
RECIPE_ID="recipe_uuid_here"
TOKEN="your_jwt_token"

curl -X POST http://localhost:3000/api/recipes/$RECIPE_ID/photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "photos=@/path/to/photo1.jpg" \
  -F "photos=@/path/to/photo2.jpg" \
  -F "photos=@/path/to/photo3.jpg"
```

**Expected:** Photos resized to 800x600, max 3 files

**Test file size limit (max 5MB):**
```bash
curl -X POST http://localhost:3000/api/recipes/$RECIPE_ID/photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "photos=@/path/to/large_file.jpg"
```

**Expected:** Error if > 5MB

**Test file type validation:**
```bash
curl -X POST http://localhost:3000/api/recipes/$RECIPE_ID/photos \
  -H "Authorization: Bearer $TOKEN" \
  -F "photos=@/path/to/document.pdf"
```

**Expected:** Error "invalid file type"

### 3.5 Rating Testing

**Create rating:**
```bash
TOKEN="your_jwt_token"
RECIPE_ID="recipe_uuid_here"

curl -X POST http://localhost:3000/api/ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipe_id": "'$RECIPE_ID'",
    "value": 5
  }'
```

**Expected:** Recipe average_rating and rating_count updated

**Test duplicate rating prevention:**
```bash
curl -X POST http://localhost:3000/api/ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipe_id": "'$RECIPE_ID'",
    "value": 4
  }'
```

**Expected:** Error "you already rated this recipe"

**Update rating:**
```bash
RATING_ID="rating_uuid_here"

curl -X PUT http://localhost:3000/api/ratings/$RATING_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": 4
  }'
```

**Expected:** Recipe average_rating updated

**Delete rating:**
```bash
curl -X DELETE http://localhost:3000/api/ratings/$RATING_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Recipe average_rating and rating_count updated

**Test rating own recipe (should fail):**
```bash
# Create own recipe first, then try to rate it
curl -X POST http://localhost:3000/api/ratings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipe_id": "'$OWN_RECIPE_ID'",
    "value": 5
  }'
```

**Expected:** Error "cannot rate your own recipe"

---

## 4. Performance Testing

### 4.1 Load Testing with Apache Bench

**Test public endpoint (anonymous rate limit):**
```bash
ab -n 100 -c 10 http://localhost:3000/api/recipes
```

**Expected:** Some requests fail after hitting rate limit

**Test authenticated endpoint:**
```bash
ab -n 500 -c 20 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/my-recipes
```

**Expected:** Higher throughput with authenticated rate limit

### 4.2 Cache Performance Metrics

**Measure cache hit ratio:**
```bash
# Make 100 requests to the same endpoint
for i in {1..100}; do
  CACHE_STATUS=$(curl -s -I http://localhost:3000/api/recipes | grep X-Cache | awk '{print $2}')
  echo "$CACHE_STATUS" >> cache_results.txt
done

# Count hits vs misses
echo "Cache HITs: $(grep -c 'HIT' cache_results.txt)"
echo "Cache MISSes: $(grep -c 'MISS' cache_results.txt)"
```

**Expected:** High hit ratio (>90%) for repeated requests

---

## 5. Production Checklist

- [ ] Run `govulncheck ./...` - no vulnerabilities
- [ ] All tests passing
- [ ] Environment variables configured for production
- [ ] CORS configured with production origins only
- [ ] Rate limits configured appropriately
- [ ] Security headers enabled (Helmet)
- [ ] Input sanitization working
- [ ] Cache invalidation working correctly
- [ ] Database indexes created
- [ ] Error logging configured
- [ ] Upload directory permissions set
- [ ] Redis persistence enabled
- [ ] PostgreSQL connection pooling configured
- [ ] SSL/TLS configured for production
```

---

## ✅ **Checklist Learning**

### **Topik 10: Security Hardening**

- [ ] **CORS Configuration**
  - [ ] Memahami konsep Same-Origin Policy
  - [ ] Konfigurasi CORS untuk development (allow all)
  - [ ] Konfigurasi CORS untuk production (whitelist origins)
  - [ ] Testing preflight OPTIONS requests
  - [ ] Memahami Allow-Credentials vs Allow-Origin *

- [ ] **Rate Limiting**
  - [ ] Implementasi rate limiter berbasis IP
  - [ ] Implementasi rate limiter berbasis user ID
  - [ ] Konfigurasi limit berbeda untuk anonymous vs authenticated
  - [ ] Testing rate limit dengan multiple requests
  - [ ] Memahami sliding window vs fixed window

- [ ] **Helmet Security Headers**
  - [ ] XSS Protection header
  - [ ] Content Security Policy (CSP)
  - [ ] HTTP Strict Transport Security (HSTS)
  - [ ] X-Frame-Options (clickjacking prevention)
  - [ ] X-Content-Type-Options (MIME-sniffing prevention)
  - [ ] Referrer-Policy
  - [ ] Permission-Policy
  - [ ] Testing security headers dengan curl -I

- [ ] **Input Sanitization**
  - [ ] Implementasi bluemonday strict policy
  - [ ] Sanitize string inputs (strip HTML/scripts)
  - [ ] Recursive sanitization untuk nested objects
  - [ ] Testing XSS prevention
  - [ ] Memahami kapan perlu sanitization vs validation

- [ ] **Vulnerability Scanning**
  - [ ] Install dan run govulncheck
  - [ ] Memahami Go vulnerability database
  - [ ] Update dependencies secara berkala
  - [ ] Monitor CVE untuk dependencies

---

### **Topik 11: Redis Caching**

- [ ] **Cache Strategy**
  - [ ] Memahami cache-aside (lazy loading) pattern
  - [ ] Implementasi Get-Set-Delete cache flow
  - [ ] Memahami kapan cache vs kapan database
  - [ ] Memahami cache stampede problem

- [ ] **Cache Configuration**
  - [ ] Set TTL berbeda untuk data berbeda
  - [ ] Configure cache key naming convention
  - [ ] JSON serialization/deserialization
  - [ ] Configure Redis eviction policy

- [ ] **Cache Invalidation**
  - [ ] Implementasi GORM hooks (AfterCreate, AfterUpdate, AfterDelete)
  - [ ] Invalidate by key
  - [ ] Invalidate by pattern (SCAN + DEL)
  - [ ] Testing cache invalidation otomatis
  - [ ] Memahami eventual consistency

- [ ] **Cache Monitoring**
  - [ ] Implementasi X-Cache header (HIT/MISS)
  - [ ] Display cache key untuk debugging
  - [ ] Measure cache hit ratio
  - [ ] Measure response time improvement

- [ ] **Cache Middleware**
  - [ ] Middleware untuk GET requests only
  - [ ] Generate cache key dari route + query + userID
  - [ ] Store response body di cache
  - [ ] Conditional caching (status 200 only)

---

### **Additional Skills**

- [ ] **Clean Architecture**
  - [ ] Separation of concerns (entity, repo, service, handler)
  - [ ] Dependency injection
  - [ ] Interface abstraction
  - [ ] Testable code structure

- [ ] **Error Handling**
  - [ ] Custom error types dengan status code
  - [ ] Consistent error response format
  - [ ] Recovery middleware untuk panic
  - [ ] Validation errors dengan go-playground/validator

- [ ] **File Upload**
  - [ ] Multipart form handling
  - [ ] File type validation
  - [ ] File size validation
  - [ ] Image resizing dengan disintegration/imaging
  - [ ] Array of photos (max 3)

- [ ] **Advanced Filtering**
  - [ ] Query parameter parsing
  - [ ] Dynamic GORM query building
  - [ ] Filter by enum (difficulty)
  - [ ] Filter by range (max_cook_time, min_rating)
  - [ ] Filter by boolean (has_photo)
  - [ ] Filter by relationship (ingredient_id)
  - [ ] Search by text (ILIKE)
  - [ ] Combine multiple filters

- [ ] **Many-to-Many Relationships**
  - [ ] Join table dengan additional fields (quantity, unit)
  - [ ] GORM Preload untuk nested data
  - [ ] Bulk insert join table records
  - [ ] Cascade delete handling

- [ ] **Rating System**
  - [ ] Aggregate calculation (AVG, COUNT)
  - [ ] Update parent entity on child mutation
  - [ ] Unique constraint (one rating per user per recipe)
  - [ ] Prevent self-rating

- [ ] **Production Readiness**
  - [ ] Environment-based configuration
  - [ ] Graceful shutdown
  - [ ] Logging middleware
  - [ ] Health check endpoint
  - [ ] Static file serving
  - [ ] Database connection pooling

---

## 💡 **Development Ideas**

### **Level 1: Enhancement**

1. **Email Notifications**
   - Kirim email saat recipe dibuat
   - Kirim email saat rating diterima

2. **Bookmark/Favorite System**
   - User bisa bookmark recipe
   - Endpoint `/api/my-bookmarks`

3. **Recipe Comments**
   - User bisa comment di recipe
   - Nested comments (replies)

4. **Recipe Categories**
   - Add category field (breakfast, lunch, dinner, dessert)
   - Filter by category

5. **Pagination Improvement**
   - Add `next` and `prev` URLs di meta
   - Cursor-based pagination untuk performa

6. **Search Enhancement**
   - Full-text search dengan PostgreSQL `tsvector`
   - Search di description dan instructions

---

### **Level 2: Advanced Security**

7. **API Key Authentication**
   - Untuk public API access
   - Rate limit berbeda untuk API key vs JWT

8. **OAuth2 Integration**
   - Login dengan Google/GitHub
   - Social auth tokens

9. **Two-Factor Authentication (2FA)**
   - TOTP dengan Google Authenticator
   - Backup codes

10. **Audit Logging**
    - Log semua mutations (create, update, delete)
    - Track IP address dan user agent
    - Endpoint untuk view audit logs

11. **Content Moderation**
    - Flag inappropriate content
    - Admin approval system

---

### **Level 3: Advanced Caching**

12. **Cache Warming**
    - Pre-populate popular recipes di cache
    - Background job untuk refresh cache

13. **Cache Tiering**
    - In-memory cache (local) + Redis (distributed)
    - Faster for frequently accessed data

14. **Cache Analytics**
    - Track hit/miss ratio per endpoint
    - Dashboard untuk monitoring cache performance

15. **Smart Cache Invalidation**
    - Only invalidate affected cache keys
    - Tag-based invalidation

---

### **Level 4: Advanced Features**

16. **Recipe Recommendations**
    - Suggest recipes based on user history
    - Collaborative filtering

17. **Nutrition Calculator**
    - Calculate calories, protein, carbs per serving
    - Ingredient nutrition database

18. **Shopping List Generator**
    - Generate shopping list dari multiple recipes
    - Aggregate quantities automatically

19. **Meal Planner**
    - Plan meals untuk seminggu
    - Auto-calculate total ingredients

20. **Video Upload**
    - Support video tutorial untuk recipe
    - Video transcoding dengan FFmpeg
    - Cache video thumbnails

---

## 🎯 **Next Steps (Fase 2 Projects)**

- **Project 2:** Logging & Monitoring (ELK Stack, Prometheus, Grafana)
- **Project 3:** Background Jobs & Scheduler (Advanced Asynq patterns)
- **Project 4:** Advanced Database Techniques (Sharding, Replication, Views)

---

**Selamat belajar! Fokus pada security dan caching adalah fondasi aplikasi production-ready.** 🚀🔒⚡

