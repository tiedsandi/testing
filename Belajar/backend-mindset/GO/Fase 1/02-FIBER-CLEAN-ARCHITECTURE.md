# Setup Go Fiber + Project Structure + Clean Architecture

## 🎯 Tujuan Belajar

Setelah belajar materi ini, lo bakal:
- Bisa setup Go Fiber v2 untuk bikin REST API
- Paham kenapa Fiber jadi pilihan (fast, Express-like syntax)
- Implement Clean Architecture di Go backend project
- Bikin struktur folder yang scalable & maintainable
- Manage config dengan viper & godotenv (type-safe)
- Bikin standard response format yang konsisten
- Paham dependency injection via interface
- Apply SOLID principles di real project

## 💡 Konsep + Analogi

### Kenapa Fiber?

**Fiber vs Framework Lain:**

| Framework | Kelebihan | Kekurangan |
|-----------|-----------|------------|
| **Fiber** | Super cepat (built on fasthttp), syntax mirip Express.js, middleware ecosystem bagus | Relatif baru, dokumentasi kadang kurang detail |
| **Gin** | Populer, mature, banyak tutorial | Syntax agak beda dari Express |
| **Echo** | Minimalist, performant | Kurang middleware dibanding Fiber/Gin |
| **net/http** | Built-in, no dependency | Boilerplate banyak, fitur terbatas |

**Analogi:**
- **Fiber**: Ferrari (cepat, modern, stylish)
- **Gin**: Toyota (reliable, proven, banyak yang pakai)
- **net/http**: Sepeda motor (dasar, lo atur semua sendiri)

### Clean Architecture

**Tanpa Clean Architecture:**
```
Semua logic campur jadi satu
Handler langsung akses database
Susah di-test
Ganti database = ubah semua file
```

**Dengan Clean Architecture:**
```
Handler ← Service ← Repository ← Database
Tiap layer punya tanggung jawab jelas
Mudah di-test (pakai mock)
Ganti database = cuma ubah repository
```

**Analogi:**
- **Handler**: Kasir (terima request dari customer)
- **Service**: Manager (logic bisnis, validasi)
- **Repository**: Gudang (ambil/simpan data)
- **Database**: Storage fisik

**Dependency Injection:**
```
❌ BAD: Handler langsung create service
handler := UserHandler{service: NewUserService()}

✅ GOOD: Inject service dari luar
service := NewUserService(repo)
handler := NewUserHandler(service)
```

## 📝 Materi + Kode Lengkap

### 1. Setup Project

```bash
# Bikin folder project
mkdir fiber-clean-arch
cd fiber-clean-arch

# Init Go module
go mod init github.com/yourusername/fiber-clean-arch

# Install dependencies
go get github.com/gofiber/fiber/v2
go get github.com/spf13/viper
go get github.com/joho/godotenv
go get github.com/go-playground/validator/v10
go get gorm.io/gorm
go get gorm.io/driver/postgres
```

### 2. Hello World dengan Fiber

```go
// cmd/api/main.go
package main

import (
	"log"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName: "Fiber Clean Architecture v1.0.0",
		ErrorHandler: customErrorHandler,
	})
	
	// Global middleware
	app.Use(logger.New()) // logging
	app.Use(recover.New()) // recover from panic
	
	// Routes
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Welcome to Fiber Clean Architecture!",
		})
	})
	
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "OK",
			"message": "Server is running",
		})
	})
	
	// Start server
	port := ":3000"
	log.Printf("Server starting on port %s", port)
	if err := app.Listen(port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// Custom error handler
func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	
	// Cek kalau error dari Fiber
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error": fiber.Map{
			"code":    code,
			"message": err.Error(),
		},
	})
}
```

**Run:**
```bash
go run cmd/api/main.go
```

**Test:**
```bash
curl http://localhost:3000
curl http://localhost:3000/health
```

### 3. Config Management (Type-Safe)

```bash
# .env
APP_NAME=Fiber Clean Architecture
APP_ENV=development
APP_PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=fiber_db
DB_SSL_MODE=disable

JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRY=24h

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

```go
// config/config.go
package config

import (
	"fmt"
	"log"
	"time"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

// Config struct (type-safe)
type Config struct {
	App      AppConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Redis    RedisConfig
}

type AppConfig struct {
	Name string
	Env  string
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
}

var AppConfig *Config

// LoadConfig - load dari .env file
func LoadConfig() (*Config, error) {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found, using environment variables")
	}
	
	// Setup viper
	viper.AutomaticEnv()
	
	// Parse config
	config := &Config{
		App: AppConfig{
			Name: viper.GetString("APP_NAME"),
			Env:  viper.GetString("APP_ENV"),
			Port: viper.GetString("APP_PORT"),
		},
		Database: DatabaseConfig{
			Host:     viper.GetString("DB_HOST"),
			Port:     viper.GetString("DB_PORT"),
			User:     viper.GetString("DB_USER"),
			Password: viper.GetString("DB_PASSWORD"),
			Name:     viper.GetString("DB_NAME"),
			SSLMode:  viper.GetString("DB_SSL_MODE"),
		},
		JWT: JWTConfig{
			Secret: viper.GetString("JWT_SECRET"),
			Expiry: viper.GetDuration("JWT_EXPIRY"),
		},
		Redis: RedisConfig{
			Host:     viper.GetString("REDIS_HOST"),
			Port:     viper.GetString("REDIS_PORT"),
			Password: viper.GetString("REDIS_PASSWORD"),
		},
	}
	
	// Validate required fields
	if err := config.Validate(); err != nil {
		return nil, err
	}
	
	// Set global config
	AppConfig = config
	
	return config, nil
}

// Validate - validasi config wajib diisi
func (c *Config) Validate() error {
	if c.App.Port == "" {
		return fmt.Errorf("APP_PORT is required")
	}
	
	if c.Database.Host == "" {
		return fmt.Errorf("DB_HOST is required")
	}
	
	if c.JWT.Secret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	
	return nil
}

// GetDSN - database connection string
func (c *Config) GetDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.SSLMode,
	)
}

// IsProduction - check production environment
func (c *Config) IsProduction() bool {
	return c.App.Env == "production"
}

// IsDevelopment - check development environment
func (c *Config) IsDevelopment() bool {
	return c.App.Env == "development"
}
```

### 4. Folder Structure Lengkap

```
fiber-clean-arch/
├── cmd/
│   └── api/
│       └── main.go                 ← entry point aplikasi
├── internal/
│   ├── user/
│   │   ├── entity.go               ← data model (struct)
│   │   ├── handler.go              ← HTTP handler (controller)
│   │   ├── service.go              ← business logic
│   │   └── repository.go           ← database access
│   ├── auth/
│   │   ├── entity.go
│   │   ├── handler.go
│   │   ├── service.go
│   │   └── repository.go
│   └── middleware/
│       ├── auth.go                 ← JWT middleware
│       └── cors.go                 ← CORS middleware
├── pkg/
│   ├── database/
│   │   └── postgres.go             ← database connection
│   ├── redis/
│   │   └── redis.go                ← Redis connection
│   ├── response/
│   │   └── response.go             ← standard response helper
│   └── validator/
│       └── validator.go            ← request validation
├── config/
│   └── config.go                   ← config management
├── .env                            ← environment variables
├── .env.example                    ← template .env
├── go.mod
├── go.sum
└── README.md
```

### 5. Standard Response Helper

```go
// pkg/response/response.go
package response

import (
	"github.com/gofiber/fiber/v2"
)

// SuccessResponse - standard success response
type SuccessResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ErrorResponse - standard error response
type ErrorResponse struct {
	Success bool       `json:"success"`
	Error   ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// Success - return success response
func Success(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// Created - return created response (201)
func Created(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// BadRequest - return bad request error (400)
func BadRequest(c *fiber.Ctx, message string, details interface{}) error {
	return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    "BAD_REQUEST",
			Message: message,
			Details: details,
		},
	})
}

// Unauthorized - return unauthorized error (401)
func Unauthorized(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    "UNAUTHORIZED",
			Message: message,
		},
	})
}

// Forbidden - return forbidden error (403)
func Forbidden(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusForbidden).JSON(ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    "FORBIDDEN",
			Message: message,
		},
	})
}

// NotFound - return not found error (404)
func NotFound(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    "NOT_FOUND",
			Message: message,
		},
	})
}

// InternalServerError - return internal server error (500)
func InternalServerError(c *fiber.Ctx, message string, details interface{}) error {
	return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    "INTERNAL_SERVER_ERROR",
			Message: message,
			Details: details,
		},
	})
}

// ValidationError - return validation error (422)
func ValidationError(c *fiber.Ctx, details interface{}) error {
	return c.Status(fiber.StatusUnprocessableEntity).JSON(ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    "VALIDATION_ERROR",
			Message: "Validation failed",
			Details: details,
		},
	})
}
```

### 6. Database Connection

```go
// pkg/database/postgres.go
package database

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DBConfig struct {
	DSN             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	LogLevel        logger.LogLevel
}

// NewPostgresDB - create new PostgreSQL connection
func NewPostgresDB(config DBConfig) (*gorm.DB, error) {
	// Set defaults
	if config.MaxOpenConns == 0 {
		config.MaxOpenConns = 100
	}
	if config.MaxIdleConns == 0 {
		config.MaxIdleConns = 10
	}
	if config.ConnMaxLifetime == 0 {
		config.ConnMaxLifetime = time.Hour
	}
	
	// GORM config
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(config.LogLevel),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	}
	
	// Connect
	db, err := gorm.Open(postgres.Open(config.DSN), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}
	
	// Get underlying sql.DB
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}
	
	// Set connection pool
	sqlDB.SetMaxOpenConns(config.MaxOpenConns)
	sqlDB.SetMaxIdleConns(config.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(config.ConnMaxLifetime)
	
	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}
	
	log.Println("✓ Database connected successfully")
	
	return db, nil
}

// CloseDB - close database connection
func CloseDB(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
```

### 7. Request Validator

```go
// pkg/validator/validator.go
package validator

import (
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
}

// ValidateStruct - validate struct dengan custom error message
func ValidateStruct(data interface{}) error {
	err := validate.Struct(data)
	if err == nil {
		return nil
	}
	
	// Parse validation errors
	validationErrors := err.(validator.ValidationErrors)
	errorMessages := make([]string, 0)
	
	for _, e := range validationErrors {
		errorMessages = append(errorMessages, formatValidationError(e))
	}
	
	return fmt.Errorf(strings.Join(errorMessages, "; "))
}

// formatValidationError - format error message
func formatValidationError(e validator.FieldError) string {
	field := e.Field()
	
	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", field)
	case "email":
		return fmt.Sprintf("%s must be a valid email", field)
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", field, e.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", field, e.Param())
	case "gte":
		return fmt.Sprintf("%s must be greater than or equal to %s", field, e.Param())
	case "lte":
		return fmt.Sprintf("%s must be less than or equal to %s", field, e.Param())
	default:
		return fmt.Sprintf("%s is invalid", field)
	}
}

// ValidateVar - validate single variable
func ValidateVar(field interface{}, tag string) error {
	return validate.Var(field, tag)
}
```

### 8. Entity (Data Model)

```go
// internal/user/entity.go
package user

import (
	"time"
)

// User entity
type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"type:varchar(100);not null"`
	Email     string    `json:"email" gorm:"type:varchar(100);uniqueIndex;not null"`
	Password  string    `json:"-" gorm:"type:varchar(255);not null"` // - = exclude dari JSON
	IsActive  bool      `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName - custom table name
func (User) TableName() string {
	return "users"
}

// CreateUserRequest - request DTO
type CreateUserRequest struct {
	Name     string `json:"name" validate:"required,min=3,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

// UpdateUserRequest - request DTO
type UpdateUserRequest struct {
	Name  string `json:"name" validate:"omitempty,min=3,max=100"`
	Email string `json:"email" validate:"omitempty,email"`
}

// UserResponse - response DTO (exclude sensitive data)
type UserResponse struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// ToResponse - convert entity to response DTO
func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Name:      u.Name,
		Email:     u.Email,
		IsActive:  u.IsActive,
		CreatedAt: u.CreatedAt,
	}
}
```

### 9. Repository (Database Access)

```go
// internal/user/repository.go
package user

import (
	"context"
	"errors"

	"gorm.io/gorm"
)

// UserRepository interface (contract)
type UserRepository interface {
	Create(ctx context.Context, user *User) error
	FindByID(ctx context.Context, id uint) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindAll(ctx context.Context, limit, offset int) ([]User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id uint) error
	Count(ctx context.Context) (int64, error)
}

// userRepository implementation
type userRepository struct {
	db *gorm.DB
}

// NewUserRepository - constructor
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

// Create - insert new user
func (r *userRepository) Create(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// FindByID - find user by ID
func (r *userRepository) FindByID(ctx context.Context, id uint) (*User, error) {
	var user User
	err := r.db.WithContext(ctx).First(&user, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// FindByEmail - find user by email
func (r *userRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// FindAll - get all users with pagination
func (r *userRepository) FindAll(ctx context.Context, limit, offset int) ([]User, error) {
	var users []User
	err := r.db.WithContext(ctx).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&users).Error
	
	return users, err
}

// Update - update user
func (r *userRepository) Update(ctx context.Context, user *User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

// Delete - soft delete user
func (r *userRepository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&User{}, id).Error
}

// Count - count total users
func (r *userRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&User{}).Count(&count).Error
	return count, err
}
```

### 10. Service (Business Logic)

```go
// internal/user/service.go
package user

import (
	"context"
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// UserService interface (contract)
type UserService interface {
	Create(ctx context.Context, req CreateUserRequest) (*UserResponse, error)
	GetByID(ctx context.Context, id uint) (*UserResponse, error)
	GetAll(ctx context.Context, page, pageSize int) ([]UserResponse, int64, error)
	Update(ctx context.Context, id uint, req UpdateUserRequest) (*UserResponse, error)
	Delete(ctx context.Context, id uint) error
}

// userService implementation
type userService struct {
	repo UserRepository
}

// NewUserService - constructor (dependency injection)
func NewUserService(repo UserRepository) UserService {
	return &userService{repo: repo}
}

// Create - create new user
func (s *userService) Create(ctx context.Context, req CreateUserRequest) (*UserResponse, error) {
	// Check if email already exists
	existingUser, _ := s.repo.FindByEmail(ctx, req.Email)
	if existingUser != nil {
		return nil, errors.New("email already registered")
	}
	
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}
	
	// Create user entity
	user := &User{
		Name:     req.Name,
		Email:    req.Email,
		Password: string(hashedPassword),
		IsActive: true,
	}
	
	// Save to database
	if err := s.repo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	
	// Convert to response
	response := user.ToResponse()
	return &response, nil
}

// GetByID - get user by ID
func (s *userService) GetByID(ctx context.Context, id uint) (*UserResponse, error) {
	user, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	
	response := user.ToResponse()
	return &response, nil
}

// GetAll - get all users with pagination
func (s *userService) GetAll(ctx context.Context, page, pageSize int) ([]UserResponse, int64, error) {
	// Calculate offset
	offset := (page - 1) * pageSize
	
	// Get users
	users, err := s.repo.FindAll(ctx, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get users: %w", err)
	}
	
	// Get total count
	total, err := s.repo.Count(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}
	
	// Convert to response
	responses := make([]UserResponse, len(users))
	for i, user := range users {
		responses[i] = user.ToResponse()
	}
	
	return responses, total, nil
}

// Update - update user
func (s *userService) Update(ctx context.Context, id uint, req UpdateUserRequest) (*UserResponse, error) {
	// Find existing user
	user, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	
	// Check if email changed and already exists
	if req.Email != "" && req.Email != user.Email {
		existingUser, _ := s.repo.FindByEmail(ctx, req.Email)
		if existingUser != nil {
			return nil, errors.New("email already registered")
		}
		user.Email = req.Email
	}
	
	// Update fields
	if req.Name != "" {
		user.Name = req.Name
	}
	
	// Save
	if err := s.repo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	
	response := user.ToResponse()
	return &response, nil
}

// Delete - delete user
func (s *userService) Delete(ctx context.Context, id uint) error {
	// Check if user exists
	_, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	
	// Delete
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	
	return nil
}
```

### 11. Handler (HTTP Controller)

```go
// internal/user/handler.go
package user

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/fiber-clean-arch/pkg/response"
	customValidator "github.com/yourusername/fiber-clean-arch/pkg/validator"
)

// UserHandler - HTTP handler
type UserHandler struct {
	service UserService
}

// NewUserHandler - constructor (dependency injection)
func NewUserHandler(service UserService) *UserHandler {
	return &UserHandler{service: service}
}

// RegisterRoutes - register user routes
func (h *UserHandler) RegisterRoutes(app *fiber.App) {
	users := app.Group("/api/users")
	
	users.Post("/", h.Create)
	users.Get("/", h.GetAll)
	users.Get("/:id", h.GetByID)
	users.Put("/:id", h.Update)
	users.Delete("/:id", h.Delete)
}

// Create - POST /api/users
func (h *UserHandler) Create(c *fiber.Ctx) error {
	var req CreateUserRequest
	
	// Parse body
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body", err.Error())
	}
	
	// Validate
	if err := customValidator.ValidateStruct(req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	
	// Create user
	user, err := h.service.Create(c.Context(), req)
	if err != nil {
		return response.BadRequest(c, err.Error(), nil)
	}
	
	return response.Created(c, "User created successfully", user)
}

// GetAll - GET /api/users
func (h *UserHandler) GetAll(c *fiber.Ctx) error {
	// Parse query params
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))
	
	// Validate pagination
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	
	// Get users
	users, total, err := h.service.GetAll(c.Context(), page, pageSize)
	if err != nil {
		return response.InternalServerError(c, "Failed to get users", err.Error())
	}
	
	// Response with pagination meta
	return response.Success(c, "Users retrieved successfully", fiber.Map{
		"users": users,
		"pagination": fiber.Map{
			"page":       page,
			"page_size":  pageSize,
			"total":      total,
			"total_page": (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// GetByID - GET /api/users/:id
func (h *UserHandler) GetByID(c *fiber.Ctx) error {
	// Parse ID
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return response.BadRequest(c, "Invalid user ID", err.Error())
	}
	
	// Get user
	user, err := h.service.GetByID(c.Context(), uint(id))
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	
	return response.Success(c, "User retrieved successfully", user)
}

// Update - PUT /api/users/:id
func (h *UserHandler) Update(c *fiber.Ctx) error {
	// Parse ID
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return response.BadRequest(c, "Invalid user ID", err.Error())
	}
	
	var req UpdateUserRequest
	
	// Parse body
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body", err.Error())
	}
	
	// Validate
	if err := customValidator.ValidateStruct(req); err != nil {
		return response.ValidationError(c, err.Error())
	}
	
	// Update user
	user, err := h.service.Update(c.Context(), uint(id), req)
	if err != nil {
		return response.BadRequest(c, err.Error(), nil)
	}
	
	return response.Success(c, "User updated successfully", user)
}

// Delete - DELETE /api/users/:id
func (h *UserHandler) Delete(c *fiber.Ctx) error {
	// Parse ID
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return response.BadRequest(c, "Invalid user ID", err.Error())
	}
	
	// Delete user
	if err := h.service.Delete(c.Context(), uint(id)); err != nil {
		return response.BadRequest(c, err.Error(), nil)
	}
	
	return response.Success(c, "User deleted successfully", nil)
}
```

### 12. Custom Middleware

```go
// internal/middleware/auth.go
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/fiber-clean-arch/pkg/response"
)

// AuthMiddleware - JWT authentication middleware
func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get token from header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return response.Unauthorized(c, "Missing authorization header")
		}
		
		// Check Bearer prefix
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return response.Unauthorized(c, "Invalid authorization format")
		}
		
		token := parts[1]
		
		// TODO: Verify JWT token
		// user, err := verifyToken(token)
		// if err != nil {
		//     return response.Unauthorized(c, "Invalid token")
		// }
		
		// Store user in context (Locals)
		c.Locals("token", token)
		// c.Locals("user_id", user.ID)
		
		return c.Next()
	}
}

// RoleMiddleware - check user role
func RoleMiddleware(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get user role from context
		userRole := c.Locals("user_role")
		if userRole == nil {
			return response.Forbidden(c, "User role not found")
		}
		
		// Check if role is allowed
		role := userRole.(string)
		for _, allowedRole := range allowedRoles {
			if role == allowedRole {
				return c.Next()
			}
		}
		
		return response.Forbidden(c, "Insufficient permissions")
	}
}
```

```go
// internal/middleware/cors.go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// CORSMiddleware - CORS configuration
func CORSMiddleware() fiber.Handler {
	return cors.New(cors.Config{
		AllowOrigins:     "http://localhost:3000, http://localhost:5173",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowCredentials: true,
		MaxAge:           300,
	})
}
```

```go
// internal/middleware/logger.go
package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

// LoggerMiddleware - custom logger
func LoggerMiddleware() fiber.Handler {
	return logger.New(logger.Config{
		Format:     "[${time}] ${status} - ${method} ${path} (${latency})\n",
		TimeFormat: time.RFC3339,
		TimeZone:   "UTC",
	})
}
```

```go
// internal/middleware/request_id.go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/requestid"
)

// RequestIDMiddleware - add unique request ID
func RequestIDMiddleware() fiber.Handler {
	return requestid.New()
}
```

### 13. Main Application (Wiring Everything)

```go
// cmd/api/main.go
package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"gorm.io/gorm/logger"

	"github.com/yourusername/fiber-clean-arch/config"
	"github.com/yourusername/fiber-clean-arch/internal/middleware"
	"github.com/yourusername/fiber-clean-arch/internal/user"
	"github.com/yourusername/fiber-clean-arch/pkg/database"
	"github.com/yourusername/fiber-clean-arch/pkg/response"
)

func main() {
	// Load config
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	
	log.Printf("✓ Config loaded: %s (%s)", cfg.App.Name, cfg.App.Env)
	
	// Connect database
	logLevel := logger.Info
	if cfg.IsDevelopment() {
		logLevel = logger.Info
	}
	
	db, err := database.NewPostgresDB(database.DBConfig{
		DSN:      cfg.GetDSN(),
		LogLevel: logLevel,
	})
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}
	defer database.CloseDB(db)
	
	// Auto migrate
	if err := db.AutoMigrate(&user.User{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	log.Println("✓ Database migrated")
	
	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:      cfg.App.Name,
		ErrorHandler: customErrorHandler,
	})
	
	// Global middleware
	app.Use(recover.New())
	app.Use(middleware.RequestIDMiddleware())
	app.Use(middleware.LoggerMiddleware())
	app.Use(middleware.CORSMiddleware())
	
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return response.Success(c, "Server is healthy", fiber.Map{
			"app":     cfg.App.Name,
			"version": "1.0.0",
			"env":     cfg.App.Env,
		})
	})
	
	// Dependency Injection
	// Repository layer
	userRepo := user.NewUserRepository(db)
	
	// Service layer (inject repository)
	userService := user.NewUserService(userRepo)
	
	// Handler layer (inject service)
	userHandler := user.NewUserHandler(userService)
	
	// Register routes
	userHandler.RegisterRoutes(app)
	
	// Protected routes example
	api := app.Group("/api/protected")
	api.Use(middleware.AuthMiddleware()) // Apply auth middleware
	api.Get("/profile", func(c *fiber.Ctx) error {
		token := c.Locals("token")
		return response.Success(c, "Protected route", fiber.Map{
			"token": token,
		})
	})
	
	// 404 handler
	app.Use(func(c *fiber.Ctx) error {
		return response.NotFound(c, "Route not found")
	})
	
	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		
		log.Println("Shutting down server...")
		_ = app.Shutdown()
	}()
	
	// Start server
	port := ":" + cfg.App.Port
	log.Printf("🚀 Server running on http://localhost%s", port)
	if err := app.Listen(port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// customErrorHandler - global error handler
func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	
	return c.Status(code).JSON(response.ErrorResponse{
		Success: false,
		Error: response.ErrorDetail{
			Code:    "SERVER_ERROR",
			Message: err.Error(),
		},
	})
}
```

### 14. Testing dengan cURL

```bash
# Health check
curl http://localhost:3000/health

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "password": "password123"
  }'

# Get all users
curl http://localhost:3000/api/users

# Get all users with pagination
curl "http://localhost:3000/api/users?page=1&page_size=10"

# Get user by ID
curl http://localhost:3000/api/users/1

# Update user
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Budi Updated"
  }'

# Delete user
curl -X DELETE http://localhost:3000/api/users/1

# Protected route (tanpa token, akan error)
curl http://localhost:3000/api/protected/profile

# Protected route (dengan token)
curl http://localhost:3000/api/protected/profile \
  -H "Authorization: Bearer your-token-here"
```

## ❌ Common Mistakes + Fix

### Mistake 1: Handler Langsung Akses Database

```go
// ❌ BAD: Handler langsung query database
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
    var user User
    db.First(&user, c.Params("id")) // BAD!
    return c.JSON(user)
}

// ✅ GOOD: Handler pakai service, service pakai repository
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
    id, _ := strconv.ParseUint(c.Params("id"), 10, 32)
    user, err := h.service.GetByID(c.Context(), uint(id))
    if err != nil {
        return response.NotFound(c, err.Error())
    }
    return response.Success(c, "User retrieved", user)
}
```

### Mistake 2: Hardcode Config di Kode

```go
// ❌ BAD
db, _ := gorm.Open(postgres.Open("host=localhost user=postgres..."))

// ✅ GOOD
cfg, _ := config.LoadConfig()
db, _ := database.NewPostgresDB(database.DBConfig{
    DSN: cfg.GetDSN(),
})
```

### Mistake 3: Ga Pakai Interface untuk Repository

```go
// ❌ BAD: Service depend on concrete struct
type UserService struct {
    repo *userRepository // concrete type
}

// ✅ GOOD: Service depend on interface
type UserService struct {
    repo UserRepository // interface
}
```

**Kenapa penting?**
- Bisa ganti implementation tanpa ubah service
- Mudah bikin mock untuk testing
- Follow Dependency Inversion Principle

### Mistake 4: Return Entity Langsung ke Client

```go
// ❌ BAD: Return entity with password
func (s *userService) GetByID(id uint) (*User, error) {
    return s.repo.FindByID(id) // User entity punya password!
}

// ✅ GOOD: Convert ke DTO/Response
func (s *userService) GetByID(id uint) (*UserResponse, error) {
    user, err := s.repo.FindByID(id)
    if err != nil {
        return nil, err
    }
    response := user.ToResponse() // Exclude sensitive data
    return &response, nil
}
```

### Mistake 5: Middleware Order Salah

```go
// ❌ BAD: Logger setelah routes
app.Get("/users", handler)
app.Use(logger.New()) // Ga ke-log request di atas!

// ✅ GOOD: Middleware sebelum routes
app.Use(logger.New())
app.Use(recover.New())
app.Use(cors.New())
app.Get("/users", handler)
```

### Mistake 6: Lupa Context Propagation

```go
// ❌ BAD: Ga pakai context
func (r *userRepository) FindByID(id uint) (*User, error) {
    var user User
    r.db.First(&user, id) // No context!
    return &user, nil
}

// ✅ GOOD: Pakai context (buat timeout, cancellation)
func (r *userRepository) FindByID(ctx context.Context, id uint) (*User, error) {
    var user User
    err := r.db.WithContext(ctx).First(&user, id).Error
    return &user, err
}
```

### Mistake 7: Panic di Production

```go
// ❌ BAD: Panic crash server
if err != nil {
    panic(err)
}

// ✅ GOOD: Return error, pakai error handler
if err != nil {
    return response.InternalServerError(c, "Error occurred", err.Error())
}
```

## ✅ Checklist Akhir

**Setup & Dependencies:**
- [ ] Install Fiber v2 dengan benar
- [ ] Setup viper + godotenv untuk config
- [ ] Buat `.env` file & load config type-safe
- [ ] Connect database dengan GORM
- [ ] Setup validator untuk request validation

**Clean Architecture:**
- [ ] Paham layer: Handler → Service → Repository
- [ ] Implement dependency injection via interface
- [ ] Bikin interface untuk repository & service
- [ ] Separate entity vs DTO (request/response)

**Project Structure:**
- [ ] Folder structure sesuai best practice
- [ ] Package naming yang benar
- [ ] Separation of concerns jelas

**Response & Error Handling:**
- [ ] Bikin standard response helper
- [ ] Consistent error response format
- [ ] Handle validation error dengan proper message
- [ ] Global error handler di Fiber

**Middleware:**
- [ ] Paham urutan middleware yang benar
- [ ] Bikin custom middleware (auth, logger, dll)
- [ ] Pakai Locals() untuk pass data antar middleware
- [ ] Configure CORS dengan benar

**SOLID Principles:**
- [ ] Single Responsibility: tiap layer fokus 1 hal
- [ ] Dependency Inversion: depend on interface
- [ ] Interface Segregation: interface kecil & fokus

## 💭 Ide Pengembangan Mandiri

### Project 1: Authentication System
Extend project ini dengan:
- JWT token generation & validation
- Login & register endpoints
- Refresh token mechanism
- Password reset flow
- Email verification

**Skills yang dipelajari:**
- JWT library (github.com/golang-jwt/jwt)
- Token generation & parsing
- Middleware authentication
- Email service integration

### Project 2: Role-Based Access Control (RBAC)
Tambahkan:
- User roles (admin, user, moderator)
- Permission system
- Role middleware
- Admin-only endpoints

**Skills yang dipelajari:**
- Authorization vs authentication
- Role-based middleware
- Permission checking logic

### Project 3: Complete E-commerce Backend
Bikin:
- Product management (CRUD)
- Order management
- Shopping cart
- Payment integration (Midtrans/Xendit)
- Image upload (AWS S3 / Cloudinary)

**Skills yang dipelajari:**
- Multi-table relationships (GORM)
- File upload handling
- Third-party API integration
- Transaction management

### Project 4: Real-time Features
Tambahkan:
- WebSocket untuk chat/notification
- Redis untuk caching & pub/sub
- Rate limiting dengan Redis
- Background jobs dengan worker

**Skills yang dipelajari:**
- WebSocket dengan Fiber
- Redis integration
- Job queue pattern
- Concurrency handling

### Tools & Libraries Penting:

**Database:**
- GORM: ORM terbaik di Go
- golang-migrate: database migration
- sqlx: SQL builder (alternative GORM)

**Validation:**
- go-playground/validator: struct validation
- ozzo-validation: fluent validation

**Testing:**
- testify: assertion library
- gomock: mocking framework
- httptest: HTTP testing

**Security:**
- bcrypt: password hashing
- jwt-go: JWT token
- cors: CORS middleware

**Monitoring:**
- prometheus: metrics
- sentry: error tracking
- logrus/zap: structured logging

### Best Practices:

1. **Always use interface** untuk dependency injection
2. **Validate semua input** dari user
3. **Context propagation** untuk timeout & cancellation
4. **Error wrapping** dengan `fmt.Errorf` dan `%w`
5. **DTO pattern** untuk request/response (jangan return entity langsung)
6. **Database transaction** untuk operation yang butuh atomicity
7. **Graceful shutdown** untuk cleanup resource
8. **Environment-based config** jangan hardcode

---

**Selamat belajar Clean Architecture dengan Go Fiber! Struktur ini bakal bikin codebase lo scalable & maintainable. Tulis ulang semua kode sampai hafal dependency flow-nya!** 🚀💪
