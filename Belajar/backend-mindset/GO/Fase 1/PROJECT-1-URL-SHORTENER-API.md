# 🔗 Project 1: URL Shortener API dengan Go + Fiber + GORM

> **Fase 1 - Project Pertama**: Bangun REST API URL Shortener dari nol untuk praktek fondasi Go, Fiber, GORM, dan PostgreSQL.

---

## 📋 Overview Project

Kita akan bangun **URL Shortener API** seperti bit.ly tapi versi simple. User bisa:
- Submit URL panjang → dapat kode pendek 6 karakter (misal: `abc123`)
- Akses `GET /r/abc123` → redirect ke URL aslinya
- Lihat statistik click count
- Update/soft delete URL

**Project ini cocok untuk:**
- ✅ Belajar REST API dari nol
- ✅ Praktek GORM dengan PostgreSQL
- ✅ Implementasi clean architecture
- ✅ Handle error dengan konsisten
- ✅ Atomic operations untuk concurrent requests

**Tidak ada di project ini:**
- ❌ Authentication (belum, nanti di project selanjutnya)
- ❌ Rate limiting
- ❌ Redis caching

---

## 🎯 Apa yang Akan Kamu Pelajari

### **Topik 1: Go Backend Fundamentals**
- Setup Go module & dependency management
- Environment variables dengan Viper
- Structured logging dengan Zerolog
- Error handling yang konsisten

### **Topik 2: Fiber Framework**
- Routing & handlers
- Middleware (logger, recovery, request ID)
- Request validation
- Custom error responses
- HTTP redirects

### **Topik 3: GORM + PostgreSQL**
- Database connection & pooling
- UUID sebagai primary key
- Soft delete pattern
- Atomic updates dengan transactions
- Auto-migrate schema

### **Topik 4: Clean Architecture**
- Separation of concerns (Entity, Repository, Service, Handler)
- Dependency injection manual
- Repository pattern
- Thin handlers

---

## 🗂️ Struktur Folder

```
url-shortener/
├── cmd/
│   └── api/
│       └── main.go                 # Entry point
├── internal/
│   ├── config/
│   │   └── config.go              # Viper config loader
│   ├── database/
│   │   └── postgres.go            # GORM connection
│   ├── entity/
│   │   └── short_url.go           # Entity model
│   ├── repository/
│   │   └── shorturl_repository.go # Data access layer
│   ├── service/
│   │   └── shorturl_service.go    # Business logic
│   ├── handler/
│   │   └── shorturl_handler.go    # HTTP handlers
│   ├── middleware/
│   │   ├── logger.go              # Logging middleware
│   │   ├── recovery.go            # Panic recovery
│   │   └── request_id.go          # Request ID injector
│   └── apperror/
│       └── error.go               # Custom error types
├── .env                           # Environment variables
├── .env.example                   # Template untuk .env
├── .gitignore
├── go.mod
├── go.sum
└── README.md
```

---

## 📊 Entity Relationship Diagram

```
┌─────────────────────────────────────────┐
│            short_urls                   │
├─────────────────────────────────────────┤
│ id             UUID        PK           │
│ original_url   VARCHAR     NOT NULL     │
│ short_code     VARCHAR(6)  UNIQUE       │
│ click_count    INTEGER     DEFAULT 0    │
│ is_active      BOOLEAN     DEFAULT true │
│ created_at     TIMESTAMP                │
│ updated_at     TIMESTAMP                │
│ deleted_at     TIMESTAMP   (soft del)   │
└─────────────────────────────────────────┘

Indexes:
- short_code (UNIQUE, untuk fast lookup redirect)
- is_active (untuk filter list)
- created_at (untuk sorting)
```

---

## 🚀 Step-by-Step Implementation

### **Step 1: Initialize Project & Dependencies**

```bash
# Buat folder project
mkdir url-shortener
cd url-shortener

# Initialize Go module
go mod init github.com/yourusername/url-shortener

# Install dependencies
go get github.com/gofiber/fiber/v2
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/go-playground/validator/v10
go get github.com/rs/zerolog
go get github.com/spf13/viper
go get github.com/joho/godotenv
go get github.com/google/uuid
```

```bash
# Buat struktur folder
mkdir -p cmd/api
mkdir -p internal/{config,database,entity,repository,service,handler,middleware,apperror}

# Buat file .env
touch .env .env.example .gitignore
```

```bash
# .gitignore
.env
*.log
tmp/
vendor/
```

---

### **Step 2: Configuration Management**

```go
// .env.example
APP_ENV=development
APP_PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=url_shortener
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Jakarta

# Connection Pool
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME=5m
```

```go
// .env (copy dari .env.example dan sesuaikan)
APP_ENV=development
APP_PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=url_shortener
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Jakarta

DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME=5m
```

```go
// internal/config/config.go
package config

import (
	"fmt"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
}

type AppConfig struct {
	Env  string
	Port string
}

type DatabaseConfig struct {
	Host            string
	Port            string
	User            string
	Password        string
	Name            string
	SSLMode         string
	Timezone        string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// LoadConfig membaca config dari .env file
func LoadConfig() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	var cfg Config

	// App config
	cfg.App.Env = viper.GetString("APP_ENV")
	cfg.App.Port = viper.GetString("APP_PORT")

	// Database config
	cfg.Database.Host = viper.GetString("DB_HOST")
	cfg.Database.Port = viper.GetString("DB_PORT")
	cfg.Database.User = viper.GetString("DB_USER")
	cfg.Database.Password = viper.GetString("DB_PASSWORD")
	cfg.Database.Name = viper.GetString("DB_NAME")
	cfg.Database.SSLMode = viper.GetString("DB_SSLMODE")
	cfg.Database.Timezone = viper.GetString("DB_TIMEZONE")
	cfg.Database.MaxOpenConns = viper.GetInt("DB_MAX_OPEN_CONNS")
	cfg.Database.MaxIdleConns = viper.GetInt("DB_MAX_IDLE_CONNS")
	cfg.Database.ConnMaxLifetime = viper.GetDuration("DB_CONN_MAX_LIFETIME")

	// Validation
	if cfg.App.Port == "" {
		cfg.App.Port = "3000" // default
	}
	if cfg.Database.MaxOpenConns == 0 {
		cfg.Database.MaxOpenConns = 25
	}
	if cfg.Database.MaxIdleConns == 0 {
		cfg.Database.MaxIdleConns = 5
	}
	if cfg.Database.ConnMaxLifetime == 0 {
		cfg.Database.ConnMaxLifetime = 5 * time.Minute
	}

	return &cfg, nil
}

// DSN mengembalikan connection string PostgreSQL
func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
		c.Host, c.Port, c.User, c.Password, c.Name, c.SSLMode, c.Timezone,
	)
}
```

---

### **Step 3: Database Connection Setup**

```go
// internal/database/postgres.go
package database

import (
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/yourusername/url-shortener/internal/config"
	"github.com/yourusername/url-shortener/internal/entity"
)

// NewPostgresDB membuat koneksi ke PostgreSQL
func NewPostgresDB(cfg *config.DatabaseConfig) (*gorm.DB, error) {
	dsn := cfg.DSN()

	// GORM logger config
	gormLogger := logger.Default
	if cfg.SSLMode == "disable" {
		gormLogger = logger.Default.LogMode(logger.Info) // development
	} else {
		gormLogger = logger.Default.LogMode(logger.Silent) // production
	}

	// Connect
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	// Get underlying *sql.DB
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Connection pooling
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info().Msg("✅ Database connected successfully")

	// Auto migrate
	if err := autoMigrate(db); err != nil {
		return nil, err
	}

	return db, nil
}

// autoMigrate menjalankan migrasi schema
func autoMigrate(db *gorm.DB) error {
	log.Info().Msg("Running database migrations...")

	if err := db.AutoMigrate(
		&entity.ShortURL{},
		// Tambahkan entity lain di sini nanti
	); err != nil {
		return fmt.Errorf("failed to migrate: %w", err)
	}

	log.Info().Msg("✅ Database migrations completed")
	return nil
}
```

---

### **Step 4: Entity Definition**

```go
// internal/entity/short_url.go
package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ShortURL adalah entity untuk menyimpan URL shortener
type ShortURL struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	OriginalURL string         `gorm:"type:text;not null" json:"original_url"`
	ShortCode   string         `gorm:"type:varchar(6);uniqueIndex;not null" json:"short_code"`
	ClickCount  int            `gorm:"default:0;not null" json:"click_count"`
	IsActive    bool           `gorm:"default:true;not null;index" json:"is_active"`
	CreatedAt   time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete
}

// TableName override nama tabel
func (ShortURL) TableName() string {
	return "short_urls"
}

// BeforeCreate hook untuk set ID
func (s *ShortURL) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
```

---

### **Step 5: Repository Layer**

```go
// internal/repository/shorturl_repository.go
package repository

import (
	"errors"

	"gorm.io/gorm"

	"github.com/yourusername/url-shortener/internal/entity"
)

// ShortURLRepository interface untuk data access
type ShortURLRepository interface {
	Create(shortURL *entity.ShortURL) error
	FindAll() ([]entity.ShortURL, error)
	FindByID(id string) (*entity.ShortURL, error)
	FindByShortCode(shortCode string) (*entity.ShortURL, error)
	Update(shortURL *entity.ShortURL) error
	Delete(id string) error
	IncrementClickCount(shortCode string) error
	IsShortCodeExists(shortCode string) (bool, error)
}

type shortURLRepository struct {
	db *gorm.DB
}

// NewShortURLRepository membuat instance repository
func NewShortURLRepository(db *gorm.DB) ShortURLRepository {
	return &shortURLRepository{db: db}
}

// Create menyimpan short URL baru
func (r *shortURLRepository) Create(shortURL *entity.ShortURL) error {
	return r.db.Create(shortURL).Error
}

// FindAll mengambil semua short URLs (tidak termasuk yang di-soft delete)
func (r *shortURLRepository) FindAll() ([]entity.ShortURL, error) {
	var urls []entity.ShortURL
	err := r.db.Order("created_at DESC").Find(&urls).Error
	return urls, err
}

// FindByID mencari short URL berdasarkan ID
func (r *shortURLRepository) FindByID(id string) (*entity.ShortURL, error) {
	var url entity.ShortURL
	err := r.db.Where("id = ?", id).First(&url).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Return nil jika tidak ditemukan
		}
		return nil, err
	}
	return &url, nil
}

// FindByShortCode mencari short URL berdasarkan short_code
func (r *shortURLRepository) FindByShortCode(shortCode string) (*entity.ShortURL, error) {
	var url entity.ShortURL
	err := r.db.Where("short_code = ?", shortCode).First(&url).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &url, nil
}

// Update mengupdate short URL
func (r *shortURLRepository) Update(shortURL *entity.ShortURL) error {
	return r.db.Save(shortURL).Error
}

// Delete menghapus short URL (soft delete)
func (r *shortURLRepository) Delete(id string) error {
	return r.db.Delete(&entity.ShortURL{}, "id = ?", id).Error
}

// IncrementClickCount increment click_count secara atomic
func (r *shortURLRepository) IncrementClickCount(shortCode string) error {
	return r.db.Model(&entity.ShortURL{}).
		Where("short_code = ?", shortCode).
		Update("click_count", gorm.Expr("click_count + ?", 1)).
		Error
}

// IsShortCodeExists mengecek apakah short_code sudah ada
func (r *shortURLRepository) IsShortCodeExists(shortCode string) (bool, error) {
	var count int64
	err := r.db.Model(&entity.ShortURL{}).
		Where("short_code = ?", shortCode).
		Count(&count).
		Error
	return count > 0, err
}
```

---

### **Step 6: Service Layer**

```go
// internal/service/shorturl_service.go
package service

import (
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"net/url"

	"github.com/rs/zerolog/log"

	"github.com/yourusername/url-shortener/internal/apperror"
	"github.com/yourusername/url-shortener/internal/entity"
	"github.com/yourusername/url-shortener/internal/repository"
)

// ShortURLService interface untuk business logic
type ShortURLService interface {
	CreateShortURL(originalURL string) (*entity.ShortURL, error)
	GetAllURLs() ([]entity.ShortURL, error)
	GetURLByID(id string) (*entity.ShortURL, error)
	GetURLByShortCode(shortCode string) (*entity.ShortURL, error)
	UpdateURL(id string, originalURL *string, isActive *bool) (*entity.ShortURL, error)
	DeleteURL(id string) error
	RedirectAndCount(shortCode string) (string, error)
}

type shortURLService struct {
	repo repository.ShortURLRepository
}

// NewShortURLService membuat instance service
func NewShortURLService(repo repository.ShortURLRepository) ShortURLService {
	return &shortURLService{repo: repo}
}

// CreateShortURL membuat short URL baru dengan generate short_code otomatis
func (s *shortURLService) CreateShortURL(originalURL string) (*entity.ShortURL, error) {
	// Validasi URL
	if !isValidURL(originalURL) {
		return nil, apperror.NewBadRequestError("invalid URL format")
	}

	// Generate short code yang unik
	shortCode, err := s.generateUniqueShortCode()
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate short code")
		return nil, apperror.NewInternalError("failed to generate short code")
	}

	// Buat entity
	shortURL := &entity.ShortURL{
		OriginalURL: originalURL,
		ShortCode:   shortCode,
		ClickCount:  0,
		IsActive:    true,
	}

	// Save ke database
	if err := s.repo.Create(shortURL); err != nil {
		log.Error().Err(err).Msg("Failed to create short URL")
		return nil, apperror.NewInternalError("failed to create short URL")
	}

	log.Info().
		Str("short_code", shortCode).
		Str("original_url", originalURL).
		Msg("Short URL created")

	return shortURL, nil
}

// GetAllURLs mengambil semua URLs
func (s *shortURLService) GetAllURLs() ([]entity.ShortURL, error) {
	urls, err := s.repo.FindAll()
	if err != nil {
		log.Error().Err(err).Msg("Failed to get all URLs")
		return nil, apperror.NewInternalError("failed to get URLs")
	}
	return urls, nil
}

// GetURLByID mengambil URL by ID
func (s *shortURLService) GetURLByID(id string) (*entity.ShortURL, error) {
	url, err := s.repo.FindByID(id)
	if err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to get URL by ID")
		return nil, apperror.NewInternalError("failed to get URL")
	}
	if url == nil {
		return nil, apperror.NewNotFoundError("URL not found")
	}
	return url, nil
}

// GetURLByShortCode mengambil URL by short_code
func (s *shortURLService) GetURLByShortCode(shortCode string) (*entity.ShortURL, error) {
	url, err := s.repo.FindByShortCode(shortCode)
	if err != nil {
		log.Error().Err(err).Str("short_code", shortCode).Msg("Failed to get URL by short code")
		return nil, apperror.NewInternalError("failed to get URL")
	}
	if url == nil {
		return nil, apperror.NewNotFoundError("short URL not found")
	}
	return url, nil
}

// UpdateURL mengupdate original_url atau is_active
func (s *shortURLService) UpdateURL(id string, originalURL *string, isActive *bool) (*entity.ShortURL, error) {
	// Get existing URL
	url, err := s.repo.FindByID(id)
	if err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to get URL")
		return nil, apperror.NewInternalError("failed to get URL")
	}
	if url == nil {
		return nil, apperror.NewNotFoundError("URL not found")
	}

	// Update fields
	if originalURL != nil {
		if !isValidURL(*originalURL) {
			return nil, apperror.NewBadRequestError("invalid URL format")
		}
		url.OriginalURL = *originalURL
	}
	if isActive != nil {
		url.IsActive = *isActive
	}

	// Save
	if err := s.repo.Update(url); err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to update URL")
		return nil, apperror.NewInternalError("failed to update URL")
	}

	log.Info().Str("id", id).Msg("URL updated")
	return url, nil
}

// DeleteURL soft delete URL
func (s *shortURLService) DeleteURL(id string) error {
	// Check existence
	url, err := s.repo.FindByID(id)
	if err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to get URL")
		return apperror.NewInternalError("failed to get URL")
	}
	if url == nil {
		return apperror.NewNotFoundError("URL not found")
	}

	// Delete
	if err := s.repo.Delete(id); err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to delete URL")
		return apperror.NewInternalError("failed to delete URL")
	}

	log.Info().Str("id", id).Msg("URL deleted")
	return nil
}

// RedirectAndCount mendapatkan original URL dan increment click count
func (s *shortURLService) RedirectAndCount(shortCode string) (string, error) {
	// Get URL
	url, err := s.repo.FindByShortCode(shortCode)
	if err != nil {
		log.Error().Err(err).Str("short_code", shortCode).Msg("Failed to get URL")
		return "", apperror.NewInternalError("failed to get URL")
	}
	if url == nil {
		return "", apperror.NewNotFoundError("short URL not found")
	}

	// Check if active
	if !url.IsActive {
		return "", apperror.NewGoneError("this short URL is no longer active")
	}

	// Increment click count (atomic)
	if err := s.repo.IncrementClickCount(shortCode); err != nil {
		// Log error tapi tetap redirect (jangan fail karena counter)
		log.Error().Err(err).Str("short_code", shortCode).Msg("Failed to increment click count")
	}

	log.Info().
		Str("short_code", shortCode).
		Str("original_url", url.OriginalURL).
		Msg("Redirecting")

	return url.OriginalURL, nil
}

// generateUniqueShortCode generate random 6-char code yang unik
func (s *shortURLService) generateUniqueShortCode() (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const codeLength = 6
	const maxRetries = 10

	for i := 0; i < maxRetries; i++ {
		code := make([]byte, codeLength)
		for j := 0; j < codeLength; j++ {
			num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
			if err != nil {
				return "", err
			}
			code[j] = charset[num.Int64()]
		}

		shortCode := string(code)

		// Check uniqueness
		exists, err := s.repo.IsShortCodeExists(shortCode)
		if err != nil {
			return "", err
		}
		if !exists {
			return shortCode, nil
		}

		// Collision, retry
		log.Warn().Str("short_code", shortCode).Msg("Short code collision, retrying")
	}

	return "", errors.New("failed to generate unique short code after max retries")
}

// isValidURL validasi format URL
func isValidURL(str string) bool {
	u, err := url.ParseRequestURI(str)
	if err != nil {
		return false
	}
	return u.Scheme != "" && u.Host != ""
}
```

---

### **Step 7: Custom Error Handling**

```go
// internal/apperror/error.go
package apperror

import (
	"fmt"
	"net/http"
)

// AppError adalah custom error dengan status code
type AppError struct {
	StatusCode int    `json:"-"`
	Message    string `json:"message"`
	Code       string `json:"code"`
}

func (e *AppError) Error() string {
	return e.Message
}

// Constructor functions untuk berbagai jenis error

func NewBadRequestError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusBadRequest,
		Message:    message,
		Code:       "BAD_REQUEST",
	}
}

func NewNotFoundError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusNotFound,
		Message:    message,
		Code:       "NOT_FOUND",
	}
}

func NewInternalError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusInternalServerError,
		Message:    message,
		Code:       "INTERNAL_ERROR",
	}
}

func NewGoneError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusGone, // 410
		Message:    message,
		Code:       "GONE",
	}
}

func NewValidationError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusUnprocessableEntity, // 422
		Message:    message,
		Code:       "VALIDATION_ERROR",
	}
}

// ErrorResponse adalah struktur response error yang konsisten
type ErrorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Code    string `json:"code"`
}

func NewErrorResponse(err error) ErrorResponse {
	if appErr, ok := err.(*AppError); ok {
		return ErrorResponse{
			Success: false,
			Error:   appErr.Message,
			Code:    appErr.Code,
		}
	}

	// Generic error
	return ErrorResponse{
		Success: false,
		Error:   err.Error(),
		Code:    "INTERNAL_ERROR",
	}
}

// GetStatusCode mendapatkan status code dari error
func GetStatusCode(err error) int {
	if appErr, ok := err.(*AppError); ok {
		return appErr.StatusCode
	}
	return http.StatusInternalServerError
}

// HandleError helper untuk handle error di handler
func HandleError(err error) (int, ErrorResponse) {
	statusCode := GetStatusCode(err)
	errResp := NewErrorResponse(err)
	return statusCode, errResp
}
```

---

### **Step 8: HTTP Handlers**

```go
// internal/handler/shorturl_handler.go
package handler

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"

	"github.com/yourusername/url-shortener/internal/apperror"
	"github.com/yourusername/url-shortener/internal/service"
)

// ShortURLHandler handles HTTP requests
type ShortURLHandler struct {
	service  service.ShortURLService
	validate *validator.Validate
}

// NewShortURLHandler membuat instance handler
func NewShortURLHandler(service service.ShortURLService) *ShortURLHandler {
	return &ShortURLHandler{
		service:  service,
		validate: validator.New(),
	}
}

// Request DTOs

type CreateShortURLRequest struct {
	OriginalURL string `json:"original_url" validate:"required,url"`
}

type UpdateShortURLRequest struct {
	OriginalURL *string `json:"original_url,omitempty" validate:"omitempty,url"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

// Response DTOs

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
}

// CreateShortURL creates a new short URL
// POST /api/urls
func (h *ShortURLHandler) CreateShortURL(c *fiber.Ctx) error {
	var req CreateShortURLRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	// Validation
	if err := h.validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	// Call service
	url, err := h.service.CreateShortURL(req.OriginalURL)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Success: true,
		Data:    url,
	})
}

// GetAllURLs retrieves all short URLs
// GET /api/urls
func (h *ShortURLHandler) GetAllURLs(c *fiber.Ctx) error {
	urls, err := h.service.GetAllURLs()
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    urls,
	})
}

// GetURLByID retrieves URL by ID
// GET /api/urls/:id
func (h *ShortURLHandler) GetURLByID(c *fiber.Ctx) error {
	id := c.Params("id")

	url, err := h.service.GetURLByID(id)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    url,
	})
}

// UpdateURL updates a short URL
// PUT /api/urls/:id
func (h *ShortURLHandler) UpdateURL(c *fiber.Ctx) error {
	id := c.Params("id")

	var req UpdateShortURLRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	// Validation
	if err := h.validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	// Call service
	url, err := h.service.UpdateURL(id, req.OriginalURL, req.IsActive)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    url,
	})
}

// DeleteURL soft deletes a URL
// DELETE /api/urls/:id
func (h *ShortURLHandler) DeleteURL(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.service.DeleteURL(id); err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    fiber.Map{"message": "URL deleted successfully"},
	})
}

// RedirectToOriginal redirects to original URL and increments click count
// GET /r/:short_code
func (h *ShortURLHandler) RedirectToOriginal(c *fiber.Ctx) error {
	shortCode := c.Params("short_code")

	originalURL, err := h.service.RedirectAndCount(shortCode)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	// Redirect dengan 302 Found (temporary redirect)
	return c.Redirect(originalURL, fiber.StatusFound)
}
```

---

### **Step 9: Middleware**

```go
// internal/middleware/request_id.go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// RequestID middleware menambahkan unique request ID ke setiap request
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check if request ID already exists
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Set request ID di header response
		c.Set("X-Request-ID", requestID)

		// Store di locals untuk diakses handler lain
		c.Locals("requestID", requestID)

		return c.Next()
	}
}
```

```go
// internal/middleware/logger.go
package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// Logger middleware untuk log setiap request
func Logger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Process request
		err := c.Next()

		// Log after request
		duration := time.Since(start)
		requestID := c.Locals("requestID").(string)

		logEvent := log.Info().
			Str("request_id", requestID).
			Str("method", c.Method()).
			Str("path", c.Path()).
			Int("status", c.Response().StatusCode()).
			Dur("duration_ms", duration).
			Str("ip", c.IP())

		if err != nil {
			logEvent = log.Error().
				Err(err).
				Str("request_id", requestID).
				Str("method", c.Method()).
				Str("path", c.Path()).
				Int("status", c.Response().StatusCode()).
				Dur("duration_ms", duration).
				Str("ip", c.IP())
		}

		logEvent.Msg("Request completed")

		return err
	}
}
```

```go
// internal/middleware/recovery.go
package middleware

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/yourusername/url-shortener/internal/apperror"
)

// Recovery middleware untuk recover dari panic
func Recovery() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				requestID := c.Locals("requestID").(string)

				log.Error().
					Str("request_id", requestID).
					Interface("panic", r).
					Str("path", c.Path()).
					Msg("Panic recovered")

				err := c.Status(fiber.StatusInternalServerError).JSON(apperror.ErrorResponse{
					Success: false,
					Error:   fmt.Sprintf("internal server error: %v", r),
					Code:    "INTERNAL_ERROR",
				})

				if err != nil {
					log.Error().Err(err).Msg("Failed to send error response")
				}
			}
		}()

		return c.Next()
	}
}
```

---

### **Step 10: Routing & Main Entry Point**

```go
// cmd/api/main.go
package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/yourusername/url-shortener/internal/config"
	"github.com/yourusername/url-shortener/internal/database"
	"github.com/yourusername/url-shortener/internal/handler"
	"github.com/yourusername/url-shortener/internal/middleware"
	"github.com/yourusername/url-shortener/internal/repository"
	"github.com/yourusername/url-shortener/internal/service"
)

func main() {
	// Setup logger
	setupLogger()

	log.Info().Msg("🚀 Starting URL Shortener API...")

	// Load config
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load config")
	}

	// Connect database
	db, err := database.NewPostgresDB(&cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect database")
	}

	// Setup layers (Dependency Injection)
	shortURLRepo := repository.NewShortURLRepository(db)
	shortURLService := service.NewShortURLService(shortURLRepo)
	shortURLHandler := handler.NewShortURLHandler(shortURLService)

	// Setup Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "URL Shortener API",
		ErrorHandler: customErrorHandler,
	})

	// Global middleware
	app.Use(cors.New())
	app.Use(middleware.RequestID())
	app.Use(middleware.Logger())
	app.Use(middleware.Recovery())

	// Routes
	setupRoutes(app, shortURLHandler)

	// Graceful shutdown
	go func() {
		port := fmt.Sprintf(":%s", cfg.App.Port)
		log.Info().Msgf("🎧 Server listening on http://localhost%s", port)
		if err := app.Listen(port); err != nil {
			log.Fatal().Err(err).Msg("Failed to start server")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Info().Msg("🛑 Shutting down server...")

	// Shutdown with timeout
	if err := app.ShutdownWithTimeout(30 * time.Second); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	// Close database
	sqlDB, _ := db.DB()
	if sqlDB != nil {
		sqlDB.Close()
	}

	log.Info().Msg("✅ Server shutdown complete")
}

func setupLogger() {
	// Console writer untuk development
	output := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}
	log.Logger = zerolog.New(output).With().Timestamp().Caller().Logger()

	// Set level
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
}

func setupRoutes(app *fiber.App, h *handler.ShortURLHandler) {
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"time":   time.Now(),
		})
	})

	// API routes
	api := app.Group("/api")
	{
		urls := api.Group("/urls")
		{
			urls.Post("/", h.CreateShortURL)      // Create
			urls.Get("/", h.GetAllURLs)           // List all
			urls.Get("/:id", h.GetURLByID)        // Get by ID
			urls.Put("/:id", h.UpdateURL)         // Update
			urls.Delete("/:id", h.DeleteURL)      // Delete
		}
	}

	// Redirect route (public, short path)
	app.Get("/r/:short_code", h.RedirectToOriginal)
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	// Check Fiber error
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	log.Error().
		Err(err).
		Int("status", code).
		Str("path", c.Path()).
		Msg("Error handled")

	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   message,
		"code":    "ERROR",
	})
}
```

---

### **Step 11: Testing Manual dengan cURL**

Sekarang kita test API yang sudah dibuat:

```bash
# 1. Start PostgreSQL (pakai Docker)
docker run --name postgres-shortener \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=url_shortener \
  -p 5432:5432 \
  -d postgres:15-alpine

# 2. Copy .env.example ke .env dan sesuaikan
cp .env.example .env

# 3. Run aplikasi
go run cmd/api/main.go

# Output:
# 🚀 Starting URL Shortener API...
# ✅ Database connected successfully
# Running database migrations...
# ✅ Database migrations completed
# 🎧 Server listening on http://localhost:3000
```

**Test dengan cURL:**

```bash
# === 1. Health Check ===
curl http://localhost:3000/health

# Response:
# {
#   "status": "ok",
#   "time": "2026-02-27T10:00:00Z"
# }


# === 2. Create Short URL ===
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{
    "original_url": "https://www.google.com/search?q=golang"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "d7a8f3e2-...",
#     "original_url": "https://www.google.com/search?q=golang",
#     "short_code": "aB3xYz",
#     "click_count": 0,
#     "is_active": true,
#     "created_at": "2026-02-27T10:01:00Z",
#     "updated_at": "2026-02-27T10:01:00Z"
#   }
# }


# === 3. Create beberapa URL lagi ===
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"original_url": "https://github.com/gofiber/fiber"}'

curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"original_url": "https://gorm.io/docs/"}'


# === 4. Get All URLs ===
curl http://localhost:3000/api/urls

# Response:
# {
#   "success": true,
#   "data": [
#     {
#       "id": "...",
#       "original_url": "https://gorm.io/docs/",
#       "short_code": "mN9pQr",
#       "click_count": 0,
#       "is_active": true,
#       "created_at": "2026-02-27T10:03:00Z",
#       "updated_at": "2026-02-27T10:03:00Z"
#     },
#     {
#       "id": "...",
#       "original_url": "https://github.com/gofiber/fiber",
#       "short_code": "kL2mOp",
#       "click_count": 0,
#       "is_active": true,
#       "created_at": "2026-02-27T10:02:00Z",
#       "updated_at": "2026-02-27T10:02:00Z"
#     },
#     {
#       "id": "d7a8f3e2-...",
#       "original_url": "https://www.google.com/search?q=golang",
#       "short_code": "aB3xYz",
#       "click_count": 0,
#       "is_active": true,
#       "created_at": "2026-02-27T10:01:00Z",
#       "updated_at": "2026-02-27T10:01:00Z"
#     }
#   ]
# }


# === 5. Get URL by ID ===
curl http://localhost:3000/api/urls/d7a8f3e2-...

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "d7a8f3e2-...",
#     "original_url": "https://www.google.com/search?q=golang",
#     "short_code": "aB3xYz",
#     "click_count": 0,
#     "is_active": true,
#     ...
#   }
# }


# === 6. Test Redirect (Browser atau curl -L) ===
curl -L http://localhost:3000/r/aB3xYz

# Akan redirect ke: https://www.google.com/search?q=golang
# Click count otomatis increment


# === 7. Check click count bertambah ===
curl http://localhost:3000/api/urls/d7a8f3e2-...

# Response:
# {
#   "success": true,
#   "data": {
#     ...
#     "click_count": 1,  // <- Bertambah!
#     ...
#   }
# }


# === 8. Update URL (ganti original_url) ===
curl -X PUT http://localhost:3000/api/urls/d7a8f3e2-... \
  -H "Content-Type: application/json" \
  -d '{
    "original_url": "https://go.dev"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "d7a8f3e2-...",
#     "original_url": "https://go.dev",  // <- Updated
#     "short_code": "aB3xYz",
#     ...
#   }
# }


# === 9. Toggle is_active (non-aktifkan URL) ===
curl -X PUT http://localhost:3000/api/urls/d7a8f3e2-... \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false
  }'


# === 10. Test redirect URL yang tidak aktif ===
curl http://localhost:3000/r/aB3xYz

# Response:
# {
#   "success": false,
#   "error": "this short URL is no longer active",
#   "code": "GONE"
# }
# Status: 410 Gone


# === 11. Soft Delete URL ===
curl -X DELETE http://localhost:3000/api/urls/d7a8f3e2-...

# Response:
# {
#   "success": true,
#   "data": {
#     "message": "URL deleted successfully"
#   }
# }


# === 12. Get URL yang sudah di-delete ===
curl http://localhost:3000/api/urls/d7a8f3e2-...

# Response:
# {
#   "success": false,
#   "error": "URL not found",
#   "code": "NOT_FOUND"
# }
# Status: 404


# === 13. Test redirect short_code yang tidak ada ===
curl http://localhost:3000/r/xxxyyy

# Response:
# {
#   "success": false,
#   "error": "short URL not found",
#   "code": "NOT_FOUND"
# }
# Status: 404


# === 14. Test validation error (URL tidak valid) ===
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{
    "original_url": "bukan-url-valid"
  }'

# Response:
# {
#   "success": false,
#   "error": "Key: 'CreateShortURLRequest.OriginalURL' Error:Field validation...",
#   "code": "VALIDATION_ERROR"
# }
# Status: 422
```

---

## ✅ Checklist Completion

Setelah menyelesaikan project ini, kamu sudah bisa:

### **Backend Fundamentals**
- [x] Setup Go module & manage dependencies
- [x] Load environment variables dengan Viper
- [x] Structured logging dengan Zerolog
- [x] Graceful shutdown dengan signal handling

### **Fiber Framework**
- [x] Routing (GET, POST, PUT, DELETE)
- [x] Request body parsing & validation
- [x] Custom error handler
- [x] Middleware (logger, recovery, request ID)
- [x] HTTP redirect (302)

### **GORM + PostgreSQL**
- [x] Database connection dengan connection pooling
- [x] Auto-migrate schema
- [x] UUID sebagai primary key
- [x] Soft delete
- [x] Atomic update (increment click_count)
- [x] Check existence sebelum insert

### **Clean Architecture**
- [x] Separation of concerns (Entity, Repository, Service, Handler)
- [x] Thin handlers (hanya handle HTTP)
- [x] Business logic di service layer
- [x] Data access di repository layer
- [x] Dependency injection manual

### **Error Handling**
- [x] Custom AppError dengan status code
- [x] Konsisten error response format
- [x] Handle berbagai HTTP status (400, 404, 410, 422, 500)
- [x] Validation errors

### **Best Practices**
- [x] Environment-based config
- [x] Request ID untuk tracing
- [x] Structured logging
- [x] Graceful shutdown
- [x] Atomic operations untuk concurrent requests

---

## 🚀 Ide Pengembangan Mandiri

Setelah menguasai project ini, coba kembangkan fitur-fitur berikut:

### **Level 1: Basic Enhancements**

1. **Custom Short Code**
   - User bisa input short_code sendiri (opsional)
   - Validasi: min 4 karakter, alphanumeric only
   - Check uniqueness
   
   ```go
   type CreateShortURLRequest struct {
       OriginalURL string  `json:"original_url" validate:"required,url"`
       CustomCode  *string `json:"custom_code,omitempty" validate:"omitempty,min=4,alphanum"`
   }
   ```

2. **Expiration Date**
   - Tambah field `expires_at` di entity
   - Check expiration saat redirect
   - Return 410 Gone kalau sudah expired
   
   ```go
   ExpiresAt *time.Time `gorm:"index" json:"expires_at,omitempty"`
   ```

3. **Pagination untuk List URLs**
   - Query params: `?page=1&limit=10`
   - Response include metadata (total, page, limit)
   
   ```go
   type PaginationMeta struct {
       Total       int64 `json:"total"`
       Page        int   `json:"page"`
       Limit       int   `json:"limit"`
       TotalPages  int   `json:"total_pages"`
   }
   ```

4. **Search & Filter**
   - Search by original_url: `?search=google`
   - Filter by is_active: `?is_active=true`
   - Sort by created_at, click_count: `?sort_by=click_count&order=desc`

### **Level 2: Intermediate Features**

5. **Analytics Dashboard Endpoint**
   - GET `/api/analytics/summary`
   - Total URLs, total clicks, most clicked URLs
   
   ```go
   type AnalyticsSummary struct {
       TotalURLs      int64  `json:"total_urls"`
       TotalClicks    int64  `json:"total_clicks"`
       ActiveURLs     int64  `json:"active_urls"`
       MostClickedURL *ShortURL `json:"most_clicked_url"`
   }
   ```

6. **Click Analytics per URL**
   - Tabel baru: `url_clicks` (id, short_url_id, ip_address, user_agent, referer, clicked_at)
   - Track setiap click dengan detail
   - Endpoint: GET `/api/urls/:id/clicks`

7. **QR Code Generator**
   - Generate QR code untuk short URL
   - Library: `github.com/skip2/go-qrcode`
   - Endpoint: GET `/api/urls/:id/qr`
   
   ```go
   import "github.com/skip2/go-qrcode"
   
   qr, _ := qrcode.Encode(shortURL, qrcode.Medium, 256)
   c.Set("Content-Type", "image/png")
   return c.Send(qr)
   ```

8. **Bulk Create URLs**
   - POST `/api/urls/bulk`
   - Accept array of URLs
   - Return array of generated short URLs
   
   ```go
   type BulkCreateRequest struct {
       URLs []string `json:"urls" validate:"required,dive,url"`
   }
   ```

### **Level 3: Advanced Features**

9. **Rate Limiting**
   - Limit create URL: max 10 per minute per IP
   - Middleware dengan in-memory counter atau Redis
   - Library: `github.com/ulule/limiter`
   
   ```go
   import "github.com/gofiber/fiber/v2/middleware/limiter"
   
   app.Use(limiter.New(limiter.Config{
       Max:        10,
       Expiration: 1 * time.Minute,
   }))
   ```

10. **Redis Caching**
    - Cache short_code → original_url mapping
    - TTL 1 hour
    - Invalidate saat update/delete
    
    ```go
    // Pseudo code
    cachedURL := redis.Get("short:" + shortCode)
    if cachedURL != "" {
        return cachedURL
    }
    
    url := repo.FindByShortCode(shortCode)
    redis.Set("short:" + shortCode, url.OriginalURL, 1*time.Hour)
    ```

11. **Background Job untuk Cleanup**
    - Hapus expired URLs setiap hari
    - Library: `github.com/robfig/cron`
    
    ```go
    c := cron.New()
    c.AddFunc("0 0 * * *", func() {
        // Delete expired URLs
        db.Where("expires_at < ?", time.Now()).Delete(&ShortURL{})
    })
    c.Start()
    ```

12. **API Versioning**
    - `/api/v1/urls` vs `/api/v2/urls`
    - v2 bisa tambah fitur baru tanpa break v1
    
    ```go
    v1 := app.Group("/api/v1")
    v1.Post("/urls", handlerV1.CreateShortURL)
    
    v2 := app.Group("/api/v2")
    v2.Post("/urls", handlerV2.CreateShortURL) // With custom code
    ```

### **Level 4: Production-Ready**

13. **Authentication & Authorization**
    - User bisa register/login
    - Setiap short URL punya owner
    - Hanya owner yang bisa update/delete
    - Public bisa list & redirect

14. **Unit Tests**
    - Test service layer dengan mock repository
    - Test repository dengan in-memory SQLite
    - Coverage minimal 80%
    
    ```go
    func TestCreateShortURL(t *testing.T) {
        mockRepo := new(MockRepository)
        service := NewShortURLService(mockRepo)
        
        mockRepo.On("Create", mock.Anything).Return(nil)
        mockRepo.On("IsShortCodeExists", mock.Anything).Return(false, nil)
        
        url, err := service.CreateShortURL("https://example.com")
        assert.NoError(t, err)
        assert.NotEmpty(t, url.ShortCode)
    }
    ```

15. **Integration Tests**
    - Test full flow dengan Testcontainers
    - Spin up PostgreSQL container untuk test
    - Reset database tiap test

16. **Docker & Docker Compose**
    - Dockerfile multi-stage
    - docker-compose.yml dengan app + postgres
    - Health checks
    
    ```yaml
    version: '3.8'
    services:
      app:
        build: .
        ports:
          - "3000:3000"
        depends_on:
          - postgres
      postgres:
        image: postgres:15-alpine
        environment:
          POSTGRES_DB: url_shortener
    ```

17. **CI/CD Pipeline**
    - GitHub Actions
    - Run tests on PR
    - Auto deploy on merge to main
    
    ```yaml
    name: CI
    on: [push, pull_request]
    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - uses: actions/setup-go@v4
          - run: go test ./...
    ```

18. **Monitoring & Logging**
    - Prometheus metrics
    - Grafana dashboard
    - Structured logging ke file/Elasticsearch

---

## 📖 Referensi

- **Fiber Documentation**: https://docs.gofiber.io/
- **GORM Documentation**: https://gorm.io/docs/
- **Zerolog**: https://github.com/rs/zerolog
- **Viper**: https://github.com/spf13/viper
- **Go Validator**: https://github.com/go-playground/validator
- **PostgreSQL**: https://www.postgresql.org/docs/

---

## 🎯 Kesimpulan

Selamat! 🎉 Kamu baru saja menyelesaikan project URL Shortener API dari nol dengan:
- ✅ Go + Fiber + GORM + PostgreSQL
- ✅ Clean Architecture (Entity, Repository, Service, Handler)
- ✅ Custom error handling yang konsisten
- ✅ Middleware (logger, recovery, request ID)
- ✅ Validation & structured logging
- ✅ Atomic operations untuk concurrent requests
- ✅ Soft delete & graceful shutdown

**Key Takeaways:**
1. **Clean Architecture** → Separation of concerns, maintainable code
2. **Repository Pattern** → Data access abstraction, easy to test
3. **Service Layer** → Business logic terpisah dari HTTP layer
4. **Error Handling** → Konsisten format, mudah di-debug
5. **Atomic Update** → Prevent race condition di click counter

Project ini adalah **fondasi** untuk project-project selanjutnya. Tech stack dan pattern yang sama akan kamu pakai terus di project berikutnya, cuma dengan fitur yang makin kompleks.

**Next Steps:**
- Coba kembangkan fitur dari ide di atas
- Tambahkan authentication (JWT)
- Deploy ke production
- Implement caching dengan Redis
- Write unit tests

Keep coding! 🚀💪
