# 💰 Project 2: Expense Tracker API dengan Go + Fiber + JWT + Redis

> **Fase 1 - Project Kedua**: Bangun REST API Expense Tracker dengan JWT authentication, API Key, budget tracking, dan export Excel.

---

## 📋 Overview Project

Kita akan bangun **Expense Tracker API** untuk mencatat pengeluaran dengan fitur lengkap:
- 🔐 Authentication (JWT + refresh token + blacklist Redis)
- 🔑 API Key untuk programmatic access
- 📁 Kategori pengeluaran dengan budget limit
- 💸 Track pengeluaran + warning kalau over budget
- 📊 Summary statistik pengeluaran
- 📤 Export data ke Excel

**Project ini cocok untuk:**
- ✅ Belajar JWT authentication end-to-end
- ✅ Implementasi refresh token + blacklist
- ✅ Multi-level auth (JWT + API Key)
- ✅ Complex validation & business logic
- ✅ Aggregate queries dengan GORM
- ✅ File generation (Excel export)

**Upgrade dari Project 1:**
- ➕ Full authentication system
- ➕ Multi-entity relationships
- ➕ Redis untuk caching & blacklist
- ➕ Advanced filtering & pagination
- ➕ File export functionality

---

## 🎯 Apa yang Akan Kamu Pelajari

### **Topik 1: JWT Authentication**
- Register & login flow
- Access token & refresh token
- Token blacklist dengan Redis
- Password hashing dengan bcrypt
- Logout mechanism

### **Topik 2: API Key Authentication**
- Generate API key untuk programmatic access
- Hash & validate API key
- Support dual auth (JWT atau API Key)
- Revoke API key

### **Topik 3: Authorization & Ownership**
- Middleware auth yang flexible
- User hanya bisa akses data miliknya
- Inject user ID ke context
- Check ownership di service layer

### **Topik 4: Advanced Validation**
- Custom validators (positive number, past date)
- Nested struct validation
- Error message yang user-friendly
- Business rule validation (budget limit)

### **Topik 5: Complex Queries**
- Filter multiple fields (category, date range, amount range)
- Pagination & sorting
- Aggregate queries (SUM, COUNT, GROUP BY)
- Join tables dengan GORM

### **Topik 6: Redis Integration**
- Token blacklist
- Set with expiration
- Check exists
- Delete keys

### **Topik 7: File Generation**
- Generate Excel dengan excelize
- Dynamic columns & rows
- Format cells (currency, date)
- Download file response

### **Topik 8: Error Handling & Response**
- Consistent error format
- Business logic warnings (budget alert)
- Validation errors collection
- Logging dengan zerolog

---

## 🗂️ Struktur Folder

```
expense-tracker/
├── cmd/
│   └── api/
│       └── main.go                      # Entry point
├── internal/
│   ├── config/
│   │   └── config.go                   # Viper config
│   ├── database/
│   │   ├── postgres.go                 # GORM connection
│   │   └── redis.go                    # Redis connection
│   ├── entity/
│   │   ├── base.go                     # BaseModel
│   │   ├── user.go                     # User entity
│   │   ├── category.go                 # Category entity
│   │   ├── expense.go                  # Expense entity
│   │   └── api_key.go                  # APIKey entity
│   ├── repository/
│   │   ├── user_repository.go          # User data access
│   │   ├── category_repository.go      # Category data access
│   │   ├── expense_repository.go       # Expense data access
│   │   └── apikey_repository.go        # API Key data access
│   ├── service/
│   │   ├── auth_service.go             # Auth logic (JWT, register, login)
│   │   ├── apikey_service.go           # API Key logic
│   │   ├── category_service.go         # Category logic
│   │   └── expense_service.go          # Expense logic + summary
│   ├── handler/
│   │   ├── auth_handler.go             # Auth endpoints
│   │   ├── apikey_handler.go           # API Key endpoints
│   │   ├── category_handler.go         # Category endpoints
│   │   └── expense_handler.go          # Expense endpoints + export
│   ├── middleware/
│   │   ├── auth.go                     # Auth middleware (JWT + API Key)
│   │   ├── logger.go                   # Logger middleware
│   │   ├── recovery.go                 # Recovery middleware
│   │   └── request_id.go               # Request ID middleware
│   ├── dto/
│   │   ├── auth_dto.go                 # Auth request/response DTOs
│   │   ├── category_dto.go             # Category DTOs
│   │   └── expense_dto.go              # Expense DTOs
│   ├── validator/
│   │   └── custom_validator.go         # Custom validation rules
│   └── apperror/
│       └── error.go                    # Custom errors
├── pkg/
│   ├── jwt/
│   │   └── jwt.go                      # JWT utilities
│   ├── hash/
│   │   └── hash.go                     # Bcrypt & API key hashing
│   └── excel/
│       └── exporter.go                 # Excel export utility
├── .env
├── .env.example
├── .gitignore
├── go.mod
├── go.sum
└── README.md
```

---

## 📊 Entity Relationship Diagram

```
┌──────────────────────────────────┐
│            users                 │
├──────────────────────────────────┤
│ id           UUID        PK      │
│ name         VARCHAR              │
│ email        VARCHAR     UNIQUE   │
│ password     VARCHAR     (hash)   │
│ created_at   TIMESTAMP            │
│ updated_at   TIMESTAMP            │
│ deleted_at   TIMESTAMP   (soft)   │
└────────┬─────────────────────────┘
         │
         │ 1:N
         │
         ├────────────────────────────────────────┐
         │                                        │
         │                                        │
┌────────▼─────────────────┐          ┌──────────▼──────────────────┐
│      categories          │          │        api_keys             │
├──────────────────────────┤          ├─────────────────────────────┤
│ id         UUID     PK   │          │ id          UUID       PK   │
│ user_id    UUID     FK   │          │ user_id     UUID       FK   │
│ name       VARCHAR       │          │ name        VARCHAR         │
│ color      VARCHAR       │          │ key_hash    VARCHAR         │
│ icon       VARCHAR       │          │ prefix      VARCHAR(8)      │
│ budget     DECIMAL       │          │ last_used   TIMESTAMP       │
│ created_at TIMESTAMP     │          │ is_active   BOOLEAN         │
│ updated_at TIMESTAMP     │          │ created_at  TIMESTAMP       │
│ deleted_at TIMESTAMP     │          │ revoked_at  TIMESTAMP       │
└────┬─────────────────────┘          └─────────────────────────────┘
     │
     │ 1:N
     │
┌────▼──────────────────────┐
│       expenses            │
├───────────────────────────┤
│ id           UUID     PK  │
│ user_id      UUID     FK  │
│ category_id  UUID     FK  │
│ amount       DECIMAL      │
│ description  TEXT         │
│ expense_date DATE         │
│ receipt_note TEXT         │
│ created_at   TIMESTAMP    │
│ updated_at   TIMESTAMP    │
│ deleted_at   TIMESTAMP    │
└───────────────────────────┘

Indexes:
- users.email (UNIQUE)
- categories.user_id
- expenses.user_id
- expenses.category_id
- expenses.expense_date
- api_keys.user_id
- api_keys.prefix (untuk fast lookup API key)
```

---

## 🚀 Step-by-Step Implementation

### **Step 1: Setup Project & Configuration**

```bash
# Initialize project
mkdir expense-tracker
cd expense-tracker
go mod init github.com/yourusername/expense-tracker

# Install dependencies
go get github.com/gofiber/fiber/v2
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/go-playground/validator/v10
go get github.com/rs/zerolog
go get github.com/spf13/viper
go get github.com/google/uuid
go get github.com/golang-jwt/jwt/v5
go get github.com/redis/go-redis/v9
go get golang.org/x/crypto/bcrypt
go get github.com/xuri/excelize/v2

# Create folder structure
mkdir -p cmd/api
mkdir -p internal/{config,database,entity,repository,service,handler,middleware,dto,validator,apperror}
mkdir -p pkg/{jwt,hash,excel}

touch .env .env.example .gitignore
```

```bash
# .gitignore
.env
*.log
tmp/
vendor/
*.xlsx
```

```bash
# .env.example
APP_ENV=development
APP_PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=expense_tracker
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Jakarta

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

JWT_SECRET=your-secret-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

API_KEY_SECRET=your-api-key-secret-change-this
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
	Redis    RedisConfig
	JWT      JWTConfig
	APIKey   APIKeyConfig
}

type AppConfig struct {
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
	Timezone string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type JWTConfig struct {
	Secret        string
	AccessExpiry  time.Duration
	RefreshExpiry time.Duration
}

type APIKeyConfig struct {
	Secret string
}

func LoadConfig() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	cfg := &Config{
		App: AppConfig{
			Env:  viper.GetString("APP_ENV"),
			Port: viper.GetString("APP_PORT"),
		},
		Database: DatabaseConfig{
			Host:     viper.GetString("DB_HOST"),
			Port:     viper.GetString("DB_PORT"),
			User:     viper.GetString("DB_USER"),
			Password: viper.GetString("DB_PASSWORD"),
			Name:     viper.GetString("DB_NAME"),
			SSLMode:  viper.GetString("DB_SSLMODE"),
			Timezone: viper.GetString("DB_TIMEZONE"),
		},
		Redis: RedisConfig{
			Host:     viper.GetString("REDIS_HOST"),
			Port:     viper.GetString("REDIS_PORT"),
			Password: viper.GetString("REDIS_PASSWORD"),
			DB:       viper.GetInt("REDIS_DB"),
		},
		JWT: JWTConfig{
			Secret:        viper.GetString("JWT_SECRET"),
			AccessExpiry:  viper.GetDuration("JWT_ACCESS_EXPIRY"),
			RefreshExpiry: viper.GetDuration("JWT_REFRESH_EXPIRY"),
		},
		APIKey: APIKeyConfig{
			Secret: viper.GetString("API_KEY_SECRET"),
		},
	}

	// Defaults
	if cfg.App.Port == "" {
		cfg.App.Port = "3000"
	}
	if cfg.JWT.AccessExpiry == 0 {
		cfg.JWT.AccessExpiry = 15 * time.Minute
	}
	if cfg.JWT.RefreshExpiry == 0 {
		cfg.JWT.RefreshExpiry = 7 * 24 * time.Hour
	}

	return cfg, nil
}

func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=%s",
		c.Host, c.Port, c.User, c.Password, c.Name, c.SSLMode, c.Timezone,
	)
}
```

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

	"github.com/yourusername/expense-tracker/internal/config"
	"github.com/yourusername/expense-tracker/internal/entity"
)

func NewPostgresDB(cfg *config.DatabaseConfig) (*gorm.DB, error) {
	dsn := cfg.DSN()

	gormLogger := logger.Default
	if cfg.SSLMode == "disable" {
		gormLogger = logger.Default.LogMode(logger.Info)
	} else {
		gormLogger = logger.Default.LogMode(logger.Silent)
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info().Msg("✅ Database connected")

	if err := autoMigrate(db); err != nil {
		return nil, err
	}

	return db, nil
}

func autoMigrate(db *gorm.DB) error {
	log.Info().Msg("Running migrations...")

	if err := db.AutoMigrate(
		&entity.User{},
		&entity.Category{},
		&entity.Expense{},
		&entity.APIKey{},
	); err != nil {
		return fmt.Errorf("failed to migrate: %w", err)
	}

	log.Info().Msg("✅ Migrations completed")
	return nil
}
```

```go
// internal/database/redis.go
package database

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"github.com/yourusername/expense-tracker/internal/config"
)

func NewRedisClient(cfg *config.RedisConfig) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	// Test connection
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect redis: %w", err)
	}

	log.Info().Msg("✅ Redis connected")
	return client, nil
}
```

---

### **Step 2: Entity Definitions**

```go
// internal/entity/base.go
package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseModel adalah model dasar dengan UUID, timestamps, dan soft delete
type BaseModel struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hook untuk generate UUID
func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}
```

```go
// internal/entity/user.go
package entity

type User struct {
	BaseModel
	Name     string `gorm:"type:varchar(255);not null" json:"name"`
	Email    string `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Password string `gorm:"type:varchar(255);not null" json:"-"` // Hidden dari JSON

	// Relations
	Categories []Category `gorm:"foreignKey:UserID" json:"-"`
	Expenses   []Expense  `gorm:"foreignKey:UserID" json:"-"`
	APIKeys    []APIKey   `gorm:"foreignKey:UserID" json:"-"`
}

func (User) TableName() string {
	return "users"
}
```

```go
// internal/entity/category.go
package entity

type Category struct {
	BaseModel
	UserID      uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Name        string    `gorm:"type:varchar(100);not null" json:"name"`
	Color       string    `gorm:"type:varchar(7)" json:"color"`         // Hex color #RRGGBB
	Icon        string    `gorm:"type:varchar(50)" json:"icon"`         // Icon name/emoji
	BudgetLimit float64   `gorm:"type:decimal(15,2);default:0" json:"budget_limit"`

	// Relations
	User     User      `gorm:"foreignKey:UserID" json:"-"`
	Expenses []Expense `gorm:"foreignKey:CategoryID" json:"-"`
}

func (Category) TableName() string {
	return "categories"
}
```

```go
// internal/entity/expense.go
package entity

import "time"

type Expense struct {
	BaseModel
	UserID       uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	CategoryID   uuid.UUID `gorm:"type:uuid;not null;index" json:"category_id"`
	Amount       float64   `gorm:"type:decimal(15,2);not null" json:"amount"`
	Description  string    `gorm:"type:text" json:"description"`
	ExpenseDate  time.Time `gorm:"type:date;not null;index" json:"expense_date"`
	ReceiptNote  string    `gorm:"type:text" json:"receipt_note"`

	// Relations
	User     User     `gorm:"foreignKey:UserID" json:"-"`
	Category Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
}

func (Expense) TableName() string {
	return "expenses"
}
```

```go
// internal/entity/api_key.go
package entity

import "time"

type APIKey struct {
	BaseModel
	UserID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	Name      string     `gorm:"type:varchar(100);not null" json:"name"`
	Prefix    string     `gorm:"type:varchar(8);index;not null" json:"prefix"` // First 8 chars untuk display
	KeyHash   string     `gorm:"type:varchar(255);not null" json:"-"`
	LastUsed  *time.Time `json:"last_used,omitempty"`
	IsActive  bool       `gorm:"default:true;not null" json:"is_active"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"-"`
}

func (APIKey) TableName() string {
	return "api_keys"
}
```

---

### **Step 3: Repository Layer**

```go
// internal/repository/user_repository.go
package repository

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/expense-tracker/internal/entity"
)

type UserRepository interface {
	Create(user *entity.User) error
	FindByEmail(email string) (*entity.User, error)
	FindByID(id uuid.UUID) (*entity.User, error)
	Update(user *entity.User) error
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
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) FindByID(id uuid.UUID) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Update(user *entity.User) error {
	return r.db.Save(user).Error
}
```

```go
// internal/repository/category_repository.go
package repository

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/expense-tracker/internal/entity"
)

type CategoryRepository interface {
	Create(category *entity.Category) error
	FindAllByUserID(userID uuid.UUID) ([]entity.Category, error)
	FindByID(id uuid.UUID) (*entity.Category, error)
	Update(category *entity.Category) error
	Delete(id uuid.UUID) error
}

type categoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) CategoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) Create(category *entity.Category) error {
	return r.db.Create(category).Error
}

func (r *categoryRepository) FindAllByUserID(userID uuid.UUID) ([]entity.Category, error) {
	var categories []entity.Category
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&categories).Error
	return categories, err
}

func (r *categoryRepository) FindByID(id uuid.UUID) (*entity.Category, error) {
	var category entity.Category
	err := r.db.Where("id = ?", id).First(&category).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &category, nil
}

func (r *categoryRepository) Update(category *entity.Category) error {
	return r.db.Save(category).Error
}

func (r *categoryRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&entity.Category{}, "id = ?", id).Error
}
```

```go
// internal/repository/expense_repository.go
package repository

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/expense-tracker/internal/entity"
)

type ExpenseFilter struct {
	UserID      uuid.UUID
	CategoryID  *uuid.UUID
	StartDate   *time.Time
	EndDate     *time.Time
	MinAmount   *float64
	MaxAmount   *float64
	Page        int
	Limit       int
	SortBy      string // "date", "amount", "created_at"
	SortOrder   string // "asc", "desc"
}

type ExpenseRepository interface {
	Create(expense *entity.Expense) error
	FindByID(id uuid.UUID) (*entity.Expense, error)
	FindWithFilter(filter ExpenseFilter) ([]entity.Expense, int64, error)
	Update(expense *entity.Expense) error
	Delete(id uuid.UUID) error
	GetMonthlySummary(userID uuid.UUID, year int, month int) ([]CategorySummary, error)
	GetTotalByUserID(userID uuid.UUID, startDate, endDate time.Time) (float64, error)
}

type CategorySummary struct {
	CategoryID   uuid.UUID `json:"category_id"`
	CategoryName string    `json:"category_name"`
	Total        float64   `json:"total"`
	Count        int64     `json:"count"`
	BudgetLimit  float64   `json:"budget_limit"`
}

type expenseRepository struct {
	db *gorm.DB
}

func NewExpenseRepository(db *gorm.DB) ExpenseRepository {
	return &expenseRepository{db: db}
}

func (r *expenseRepository) Create(expense *entity.Expense) error {
	return r.db.Create(expense).Error
}

func (r *expenseRepository) FindByID(id uuid.UUID) (*entity.Expense, error) {
	var expense entity.Expense
	err := r.db.Preload("Category").Where("id = ?", id).First(&expense).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &expense, nil
}

func (r *expenseRepository) FindWithFilter(filter ExpenseFilter) ([]entity.Expense, int64, error) {
	query := r.db.Model(&entity.Expense{}).Preload("Category")

	// Apply filters
	query = query.Where("user_id = ?", filter.UserID)

	if filter.CategoryID != nil {
		query = query.Where("category_id = ?", *filter.CategoryID)
	}
	if filter.StartDate != nil {
		query = query.Where("expense_date >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("expense_date <= ?", *filter.EndDate)
	}
	if filter.MinAmount != nil {
		query = query.Where("amount >= ?", *filter.MinAmount)
	}
	if filter.MaxAmount != nil {
		query = query.Where("amount <= ?", *filter.MaxAmount)
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Sorting
	sortColumn := "expense_date"
	if filter.SortBy != "" {
		switch filter.SortBy {
		case "amount":
			sortColumn = "amount"
		case "created_at":
			sortColumn = "created_at"
		default:
			sortColumn = "expense_date"
		}
	}

	sortOrder := "DESC"
	if filter.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	query = query.Order(sortColumn + " " + sortOrder)

	// Pagination
	if filter.Limit > 0 {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset).Limit(filter.Limit)
	}

	var expenses []entity.Expense
	if err := query.Find(&expenses).Error; err != nil {
		return nil, 0, err
	}

	return expenses, total, nil
}

func (r *expenseRepository) Update(expense *entity.Expense) error {
	return r.db.Save(expense).Error
}

func (r *expenseRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&entity.Expense{}, "id = ?", id).Error
}

func (r *expenseRepository) GetMonthlySummary(userID uuid.UUID, year int, month int) ([]CategorySummary, error) {
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Second)

	var results []CategorySummary
	err := r.db.Model(&entity.Expense{}).
		Select(`
			categories.id as category_id,
			categories.name as category_name,
			COALESCE(SUM(expenses.amount), 0) as total,
			COUNT(expenses.id) as count,
			categories.budget_limit
		`).
		Joins("LEFT JOIN categories ON categories.id = expenses.category_id").
		Where("expenses.user_id = ?", userID).
		Where("expenses.expense_date >= ? AND expenses.expense_date <= ?", startDate, endDate).
		Group("categories.id, categories.name, categories.budget_limit").
		Scan(&results).Error

	return results, err
}

func (r *expenseRepository) GetTotalByUserID(userID uuid.UUID, startDate, endDate time.Time) (float64, error) {
	var total float64
	err := r.db.Model(&entity.Expense{}).
		Where("user_id = ?", userID).
		Where("expense_date >= ? AND expense_date <= ?", startDate, endDate).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&total).Error
	return total, err
}
```

```go
// internal/repository/apikey_repository.go
package repository

import (
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/expense-tracker/internal/entity"
)

type APIKeyRepository interface {
	Create(apiKey *entity.APIKey) error
	FindByPrefix(prefix string) (*entity.APIKey, error)
	FindAllByUserID(userID uuid.UUID) ([]entity.APIKey, error)
	Update(apiKey *entity.APIKey) error
}

type apiKeyRepository struct {
	db *gorm.DB
}

func NewAPIKeyRepository(db *gorm.DB) APIKeyRepository {
	return &apiKeyRepository{db: db}
}

func (r *apiKeyRepository) Create(apiKey *entity.APIKey) error {
	return r.db.Create(apiKey).Error
}

func (r *apiKeyRepository) FindByPrefix(prefix string) (*entity.APIKey, error) {
	var apiKey entity.APIKey
	err := r.db.Where("prefix = ? AND is_active = ?", prefix, true).First(&apiKey).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &apiKey, nil
}

func (r *apiKeyRepository) FindAllByUserID(userID uuid.UUID) ([]entity.APIKey, error) {
	var apiKeys []entity.APIKey
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&apiKeys).Error
	return apiKeys, err
}

func (r *apiKeyRepository) Update(apiKey *entity.APIKey) error {
	return r.db.Save(apiKey).Error
}
```

---

### **Step 4: JWT & Hash Utilities**

```go
// pkg/jwt/jwt.go
package jwt

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

// GenerateToken membuat access token atau refresh token
func GenerateToken(userID uuid.UUID, email string, secret string, expiry time.Duration, tokenType string) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   tokenType, // "access" atau "refresh"
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateToken memvalidasi token dan return claims
func ValidateToken(tokenString string, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
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

```go
// pkg/hash/hash.go
package hash

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword hash password dengan bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash cek apakah password match dengan hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateAPIKey generate random API key (32 bytes = 64 hex chars)
func GenerateAPIKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// HashAPIKey hash API key dengan SHA256
func HashAPIKey(apiKey string, secret string) string {
	combined := apiKey + secret
	hash := sha256.Sum256([]byte(combined))
	return hex.EncodeToString(hash[:])
}

// GetAPIKeyPrefix get first 8 chars dari API key untuk display
func GetAPIKeyPrefix(apiKey string) string {
	if len(apiKey) < 8 {
		return apiKey
	}
	return apiKey[:8]
}
```

---

### **Step 5: Auth Service**

```go
// internal/service/auth_service.go
package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"github.com/yourusername/expense-tracker/internal/apperror"
	"github.com/yourusername/expense-tracker/internal/config"
	"github.com/yourusername/expense-tracker/internal/entity"
	"github.com/yourusername/expense-tracker/internal/repository"
	"github.com/yourusername/expense-tracker/pkg/hash"
	"github.com/yourusername/expense-tracker/pkg/jwt"
)

type AuthService interface {
	Register(name, email, password string) (*entity.User, error)
	Login(email, password string) (accessToken, refreshToken string, user *entity.User, err error)
	RefreshToken(refreshToken string) (newAccessToken string, err error)
	Logout(accessToken string) error
	GetProfile(userID uuid.UUID) (*entity.User, error)
	UpdateProfile(userID uuid.UUID, name string) (*entity.User, error)
	IsTokenBlacklisted(token string) bool
}

type authService struct {
	userRepo    repository.UserRepository
	redisClient *redis.Client
	jwtConfig   config.JWTConfig
}

func NewAuthService(userRepo repository.UserRepository, redisClient *redis.Client, jwtCfg config.JWTConfig) AuthService {
	return &authService{
		userRepo:    userRepo,
		redisClient: redisClient,
		jwtConfig:   jwtCfg,
	}
}

func (s *authService) Register(name, email, password string) (*entity.User, error) {
	// Check email exists
	existing, err := s.userRepo.FindByEmail(email)
	if err != nil {
		log.Error().Err(err).Msg("Failed to check email")
		return nil, apperror.NewInternalError("failed to check email")
	}
	if existing != nil {
		return nil, apperror.NewBadRequestError("email already registered")
	}

	// Hash password
	hashedPassword, err := hash.HashPassword(password)
	if err != nil {
		log.Error().Err(err).Msg("Failed to hash password")
		return nil, apperror.NewInternalError("failed to hash password")
	}

	// Create user
	user := &entity.User{
		Name:     name,
		Email:    email,
		Password: hashedPassword,
	}

	if err := s.userRepo.Create(user); err != nil {
		log.Error().Err(err).Msg("Failed to create user")
		return nil, apperror.NewInternalError("failed to create user")
	}

	log.Info().Str("email", email).Msg("User registered")
	return user, nil
}

func (s *authService) Login(email, password string) (string, string, *entity.User, error) {
	// Find user
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		log.Error().Err(err).Msg("Failed to find user")
		return "", "", nil, apperror.NewInternalError("failed to find user")
	}
	if user == nil {
		return "", "", nil, apperror.NewUnauthorizedError("invalid email or password")
	}

	// Check password
	if !hash.CheckPasswordHash(password, user.Password) {
		return "", "", nil, apperror.NewUnauthorizedError("invalid email or password")
	}

	// Generate tokens
	accessToken, err := jwt.GenerateToken(user.ID, user.Email, s.jwtConfig.Secret, s.jwtConfig.AccessExpiry, "access")
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate access token")
		return "", "", nil, apperror.NewInternalError("failed to generate token")
	}

	refreshToken, err := jwt.GenerateToken(user.ID, user.Email, s.jwtConfig.Secret, s.jwtConfig.RefreshExpiry, "refresh")
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate refresh token")
		return "", "", nil, apperror.NewInternalError("failed to generate token")
	}

	log.Info().Str("email", email).Msg("User logged in")
	return accessToken, refreshToken, user, nil
}

func (s *authService) RefreshToken(refreshToken string) (string, error) {
	// Validate refresh token
	claims, err := jwt.ValidateToken(refreshToken, s.jwtConfig.Secret)
	if err != nil {
		return "", apperror.NewUnauthorizedError("invalid refresh token")
	}

	// Check token type
	if claims.Subject != "refresh" {
		return "", apperror.NewUnauthorizedError("not a refresh token")
	}

	// Check blacklist
	if s.IsTokenBlacklisted(refreshToken) {
		return "", apperror.NewUnauthorizedError("token has been revoked")
	}

	// Generate new access token
	accessToken, err := jwt.GenerateToken(claims.UserID, claims.Email, s.jwtConfig.Secret, s.jwtConfig.AccessExpiry, "access")
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate access token")
		return "", apperror.NewInternalError("failed to generate token")
	}

	return accessToken, nil
}

func (s *authService) Logout(accessToken string) error {
	// Parse token to get expiry
	claims, err := jwt.ValidateToken(accessToken, s.jwtConfig.Secret)
	if err != nil {
		// Even if token invalid, we try to blacklist it
		log.Warn().Err(err).Msg("Token validation failed during logout")
	}

	// Blacklist token di Redis
	ctx := context.Background()
	key := fmt.Sprintf("blacklist:%s", accessToken)

	var ttl time.Duration
	if claims != nil && claims.ExpiresAt != nil {
		ttl = time.Until(claims.ExpiresAt.Time)
		if ttl < 0 {
			ttl = 0 // Token already expired
		}
	} else {
		ttl = s.jwtConfig.AccessExpiry // Default TTL
	}

	if err := s.redisClient.Set(ctx, key, "1", ttl).Err(); err != nil {
		log.Error().Err(err).Msg("Failed to blacklist token")
		return apperror.NewInternalError("failed to logout")
	}

	log.Info().Msg("User logged out")
	return nil
}

func (s *authService) IsTokenBlacklisted(token string) bool {
	ctx := context.Background()
	key := fmt.Sprintf("blacklist:%s", token)

	val, err := s.redisClient.Get(ctx, key).Result()
	if err != nil {
		return false // Token not in blacklist
	}

	return val == "1"
}

func (s *authService) GetProfile(userID uuid.UUID) (*entity.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get user")
		return nil, apperror.NewInternalError("failed to get user")
	}
	if user == nil {
		return nil, apperror.NewNotFoundError("user not found")
	}
	return user, nil
}

func (s *authService) UpdateProfile(userID uuid.UUID, name string) (*entity.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get user")
		return nil, apperror.NewInternalError("failed to get user")
	}
	if user == nil {
		return nil, apperror.NewNotFoundError("user not found")
	}

	user.Name = name
	if err := s.userRepo.Update(user); err != nil {
		log.Error().Err(err).Msg("Failed to update user")
		return nil, apperror.NewInternalError("failed to update user")
	}

	return user, nil
}
```

---

### **Step 6: API Key Service**

```go
// internal/service/apikey_service.go
package service

import (
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/yourusername/expense-tracker/internal/apperror"
	"github.com/yourusername/expense-tracker/internal/config"
	"github.com/yourusername/expense-tracker/internal/entity"
	"github.com/yourusername/expense-tracker/internal/repository"
	pkghash "github.com/yourusername/expense-tracker/pkg/hash"
)

type APIKeyService interface {
	GenerateAPIKey(userID uuid.UUID, name string) (plainKey string, apiKey *entity.APIKey, err error)
	ListAPIKeys(userID uuid.UUID) ([]entity.APIKey, error)
	RevokeAPIKey(userID uuid.UUID, apiKeyID uuid.UUID) error
	ValidateAPIKey(plainKey string) (*entity.APIKey, error)
}

type apiKeyService struct {
	repo      repository.APIKeyRepository
	apiKeyCfg config.APIKeyConfig
}

func NewAPIKeyService(repo repository.APIKeyRepository, cfg config.APIKeyConfig) APIKeyService {
	return &apiKeyService{
		repo:      repo,
		apiKeyCfg: cfg,
	}
}

func (s *apiKeyService) GenerateAPIKey(userID uuid.UUID, name string) (string, *entity.APIKey, error) {
	// Generate random API key
	plainKey, err := pkghash.GenerateAPIKey()
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate API key")
		return "", nil, apperror.NewInternalError("failed to generate API key")
	}

	// Hash API key
	keyHash := pkghash.HashAPIKey(plainKey, s.apiKeyCfg.Secret)
	prefix := pkghash.GetAPIKeyPrefix(plainKey)

	// Create entity
	apiKey := &entity.APIKey{
		UserID:   userID,
		Name:     name,
		Prefix:   prefix,
		KeyHash:  keyHash,
		IsActive: true,
	}

	if err := s.repo.Create(apiKey); err != nil {
		log.Error().Err(err).Msg("Failed to save API key")
		return "", nil, apperror.NewInternalError("failed to save API key")
	}

	log.Info().Str("prefix", prefix).Msg("API key generated")

	// Return plain key (hanya sekali ini, tidak disimpan)
	return plainKey, apiKey, nil
}

func (s *apiKeyService) ListAPIKeys(userID uuid.UUID) ([]entity.APIKey, error) {
	apiKeys, err := s.repo.FindAllByUserID(userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list API keys")
		return nil, apperror.NewInternalError("failed to list API keys")
	}
	return apiKeys, nil
}

func (s *apiKeyService) RevokeAPIKey(userID uuid.UUID, apiKeyID uuid.UUID) error {
	// Get API key
	prefix := "" // We don't have prefix, need to find by ID first
	// Alternative: add FindByID method to repo
	// For simplicity, we'll get from list
	apiKeys, err := s.repo.FindAllByUserID(userID)
	if err != nil {
		return apperror.NewInternalError("failed to find API key")
	}

	var targetKey *entity.APIKey
	for i := range apiKeys {
		if apiKeys[i].ID == apiKeyID {
			targetKey = &apiKeys[i]
			break
		}
	}

	if targetKey == nil {
		return apperror.NewNotFoundError("API key not found")
	}

	// Check ownership
	if targetKey.UserID != userID {
		return apperror.NewForbiddenError("not authorized to revoke this API key")
	}

	// Revoke
	now := time.Now()
	targetKey.IsActive = false
	targetKey.RevokedAt = &now

	if err := s.repo.Update(targetKey); err != nil {
		log.Error().Err(err).Msg("Failed to revoke API key")
		return apperror.NewInternalError("failed to revoke API key")
	}

	log.Info().Str("prefix", targetKey.Prefix).Msg("API key revoked")
	return nil
}

func (s *apiKeyService) ValidateAPIKey(plainKey string) (*entity.APIKey, error) {
	// Get prefix
	prefix := pkghash.GetAPIKeyPrefix(plainKey)

	// Find by prefix
	apiKey, err := s.repo.FindByPrefix(prefix)
	if err != nil {
		log.Error().Err(err).Msg("Failed to find API key")
		return nil, apperror.NewUnauthorizedError("invalid API key")
	}
	if apiKey == nil {
		return nil, apperror.NewUnauthorizedError("invalid API key")
	}

	// Check active
	if !apiKey.IsActive {
		return nil, apperror.NewUnauthorizedError("API key has been revoked")
	}

	// Validate hash
	expectedHash := pkghash.HashAPIKey(plainKey, s.apiKeyCfg.Secret)
	if apiKey.KeyHash != expectedHash {
		return nil, apperror.NewUnauthorizedError("invalid API key")
	}

	// Update last used
	now := time.Now()
	apiKey.LastUsed = &now
	s.repo.Update(apiKey) // Fire and forget

	return apiKey, nil
}
```

---

### **Step 7: Custom Validator & Error Handling**

```go
// internal/apperror/error.go
package apperror

import (
	"net/http"
)

type AppError struct {
	StatusCode int    `json:"-"`
	Message    string `json:"message"`
	Code       string `json:"code"`
}

func (e *AppError) Error() string {
	return e.Message
}

func NewBadRequestError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusBadRequest,
		Message:    message,
		Code:       "BAD_REQUEST",
	}
}

func NewUnauthorizedError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusUnauthorized,
		Message:    message,
		Code:       "UNAUTHORIZED",
	}
}

func NewForbiddenError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusForbidden,
		Message:    message,
		Code:       "FORBIDDEN",
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

func NewValidationError(message string) *AppError {
	return &AppError{
		StatusCode: http.StatusUnprocessableEntity,
		Message:    message,
		Code:       "VALIDATION_ERROR",
	}
}

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
	return ErrorResponse{
		Success: false,
		Error:   err.Error(),
		Code:    "INTERNAL_ERROR",
	}
}

func GetStatusCode(err error) int {
	if appErr, ok := err.(*AppError); ok {
		return appErr.StatusCode
	}
	return http.StatusInternalServerError
}

func HandleError(err error) (int, ErrorResponse) {
	return GetStatusCode(err), NewErrorResponse(err)
}
```

```go
// internal/validator/custom_validator.go
package validator

import (
	"time"

	"github.com/go-playground/validator/v10"
)

// CustomValidator wraps go-playground validator
type CustomValidator struct {
	validator *validator.Validate
}

func NewCustomValidator() *CustomValidator {
	v := validator.New()

	// Register custom validations
	v.RegisterValidation("positive", validatePositive)
	v.RegisterValidation("pastdate", validatePastDate)
	v.RegisterValidation("maxamount", validateMaxAmount)

	return &CustomValidator{validator: v}
}

func (cv *CustomValidator) Validate(i interface{}) error {
	return cv.validator.Struct(i)
}

// validatePositive checks if number is positive
func validatePositive(fl validator.FieldLevel) bool {
	value := fl.Field().Float()
	return value > 0
}

// validatePastDate checks if date is not in the future
func validatePastDate(fl validator.FieldLevel) bool {
	dateValue, ok := fl.Field().Interface().(time.Time)
	if !ok {
		return false
	}
	return !dateValue.After(time.Now())
}

// validateMaxAmount checks if amount <= 999,999,999
func validateMaxAmount(fl validator.FieldLevel) bool {
	value := fl.Field().Float()
	return value <= 999_999_999
}
```

---

### **Step 8: Auth Middleware**

```go
// internal/middleware/auth.go
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/yourusername/expense-tracker/internal/apperror"
	"github.com/yourusername/expense-tracker/internal/service"
	pkgjwt "github.com/yourusername/expense-tracker/pkg/jwt"
)

// AuthMiddleware supports both JWT and API Key authentication
func AuthMiddleware(authService service.AuthService, apiKeyService service.APIKeyService, jwtSecret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Try JWT first
		authHeader := c.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			token := strings.TrimPrefix(authHeader, "Bearer ")

			// Validate JWT
			claims, err := pkgjwt.ValidateToken(token, jwtSecret)
			if err != nil {
				return c.Status(fiber.StatusUnauthorized).JSON(apperror.ErrorResponse{
					Success: false,
					Error:   "invalid or expired token",
					Code:    "UNAUTHORIZED",
				})
			}

			// Check token type
			if claims.Subject != "access" {
				return c.Status(fiber.StatusUnauthorized).JSON(apperror.ErrorResponse{
					Success: false,
					Error:   "not an access token",
					Code:    "UNAUTHORIZED",
				})
			}

			// Check blacklist
			if authService.IsTokenBlacklisted(token) {
				return c.Status(fiber.StatusUnauthorized).JSON(apperror.ErrorResponse{
					Success: false,
					Error:   "token has been revoked",
					Code:    "UNAUTHORIZED",
				})
			}

			// Store user ID in locals
			c.Locals("userID", claims.UserID)
			c.Locals("authType", "jwt")
			return c.Next()
		}

		// Try API Key
		apiKey := c.Get("X-API-Key")
		if apiKey != "" {
			// Validate API Key
			validatedKey, err := apiKeyService.ValidateAPIKey(apiKey)
			if err != nil {
				statusCode, errResp := apperror.HandleError(err)
				return c.Status(statusCode).JSON(errResp)
			}

			// Store user ID in locals
			c.Locals("userID", validatedKey.UserID)
			c.Locals("authType", "apikey")
			return c.Next()
		}

		// No auth provided
		return c.Status(fiber.StatusUnauthorized).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "missing authentication",
			Code:    "UNAUTHORIZED",
		})
	}
}

// GetUserID helper to get user ID from context
func GetUserID(c *fiber.Ctx) uuid.UUID {
	userID, ok := c.Locals("userID").(uuid.UUID)
	if !ok {
		return uuid.Nil
	}
	return userID
}
```

---

### **Step 9: DTOs (Data Transfer Objects)**

```go
// internal/dto/auth_dto.go
package dto

import (
	"github.com/yourusername/expense-tracker/internal/entity"
)

type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=255"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type UpdateProfileRequest struct {
	Name string `json:"name" validate:"required,min=2,max=255"`
}

type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         *entity.User `json:"user"`
}
```

```go
// internal/dto/category_dto.go
package dto

type CreateCategoryRequest struct {
	Name        string  `json:"name" validate:"required,min=1,max=100"`
	Color       string  `json:"color" validate:"omitempty,len=7"` // #RRGGBB
	Icon        string  `json:"icon" validate:"omitempty,max=50"`
	BudgetLimit float64 `json:"budget_limit" validate:"omitempty,positive,maxamount"`
}

type UpdateCategoryRequest struct {
	Name        *string  `json:"name,omitempty" validate:"omitempty,min=1,max=100"`
	Color       *string  `json:"color,omitempty" validate:"omitempty,len=7"`
	Icon        *string  `json:"icon,omitempty" validate:"omitempty,max=50"`
	BudgetLimit *float64 `json:"budget_limit,omitempty" validate:"omitempty,positive,maxamount"`
}
```

```go
// internal/dto/expense_dto.go
package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateExpenseRequest struct {
	CategoryID  uuid.UUID `json:"category_id" validate:"required"`
	Amount      float64   `json:"amount" validate:"required,positive,maxamount"`
	Description string    `json:"description" validate:"required,max=500"`
	ExpenseDate time.Time `json:"expense_date" validate:"required,pastdate"`
	ReceiptNote string    `json:"receipt_note,omitempty" validate:"omitempty,max=1000"`
}

type UpdateExpenseRequest struct {
	CategoryID  *uuid.UUID `json:"category_id,omitempty"`
	Amount      *float64   `json:"amount,omitempty" validate:"omitempty,positive,maxamount"`
	Description *string    `json:"description,omitempty" validate:"omitempty,max=500"`
	ExpenseDate *time.Time `json:"expense_date,omitempty" validate:"omitempty,pastdate"`
	ReceiptNote *string    `json:"receipt_note,omitempty" validate:"omitempty,max=1000"`
}

type ExpenseResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Warning *string     `json:"warning,omitempty"` // Budget warning
}
```

---

### **Step 10: Category Service & Handler**

```go
// internal/service/category_service.go
package service

import (
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/yourusername/expense-tracker/internal/apperror"
	"github.com/yourusername/expense-tracker/internal/entity"
	"github.com/yourusername/expense-tracker/internal/repository"
)

type CategoryService interface {
	CreateCategory(userID uuid.UUID, name, color, icon string, budgetLimit float64) (*entity.Category, error)
	GetAllCategories(userID uuid.UUID) ([]entity.Category, error)
	GetCategoryByID(id, userID uuid.UUID) (*entity.Category, error)
	UpdateCategory(id, userID uuid.UUID, name, color, icon *string, budgetLimit *float64) (*entity.Category, error)
	DeleteCategory(id, userID uuid.UUID) error
}

type categoryService struct {
	repo repository.CategoryRepository
}

func NewCategoryService(repo repository.CategoryRepository) CategoryService {
	return &categoryService{repo: repo}
}

func (s *categoryService) CreateCategory(userID uuid.UUID, name, color, icon string, budgetLimit float64) (*entity.Category, error) {
	category := &entity.Category{
		UserID:      userID,
		Name:        name,
		Color:       color,
		Icon:        icon,
		BudgetLimit: budgetLimit,
	}

	if err := s.repo.Create(category); err != nil {
		log.Error().Err(err).Msg("Failed to create category")
		return nil, apperror.NewInternalError("failed to create category")
	}

	log.Info().Str("name", name).Msg("Category created")
	return category, nil
}

func (s *categoryService) GetAllCategories(userID uuid.UUID) ([]entity.Category, error) {
	categories, err := s.repo.FindAllByUserID(userID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get categories")
		return nil, apperror.NewInternalError("failed to get categories")
	}
	return categories, nil
}

func (s *categoryService) GetCategoryByID(id, userID uuid.UUID) (*entity.Category, error) {
	category, err := s.repo.FindByID(id)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get category")
		return nil, apperror.NewInternalError("failed to get category")
	}
	if category == nil {
		return nil, apperror.NewNotFoundError("category not found")
	}

	// Check ownership
	if category.UserID != userID {
		return nil, apperror.NewForbiddenError("not authorized to access this category")
	}

	return category, nil
}

func (s *categoryService) UpdateCategory(id, userID uuid.UUID, name, color, icon *string, budgetLimit *float64) (*entity.Category, error) {
	category, err := s.GetCategoryByID(id, userID)
	if err != nil {
		return nil, err
	}

	// Update fields
	if name != nil {
		category.Name = *name
	}
	if color != nil {
		category.Color = *color
	}
	if icon != nil {
		category.Icon = *icon
	}
	if budgetLimit != nil {
		category.BudgetLimit = *budgetLimit
	}

	if err := s.repo.Update(category); err != nil {
		log.Error().Err(err).Msg("Failed to update category")
		return nil, apperror.NewInternalError("failed to update category")
	}

	log.Info().Str("id", id.String()).Msg("Category updated")
	return category, nil
}

func (s *categoryService) DeleteCategory(id, userID uuid.UUID) error {
	category, err := s.GetCategoryByID(id, userID)
	if err != nil {
		return err
	}

	if err := s.repo.Delete(category.ID); err != nil {
		log.Error().Err(err).Msg("Failed to delete category")
		return apperror.NewInternalError("failed to delete category")
	}

	log.Info().Str("id", id.String()).Msg("Category deleted")
	return nil
}
```

```go
// internal/handler/category_handler.go
package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/yourusername/expense-tracker/internal/apperror"
	"github.com/yourusername/expense-tracker/internal/dto"
	"github.com/yourusername/expense-tracker/internal/middleware"
	"github.com/yourusername/expense-tracker/internal/service"
	customValidator "github.com/yourusername/expense-tracker/internal/validator"
)

type CategoryHandler struct {
	service   service.CategoryService
	validator *customValidator.CustomValidator
}

func NewCategoryHandler(service service.CategoryService) *CategoryHandler {
	return &CategoryHandler{
		service:   service,
		validator: customValidator.NewCustomValidator(),
	}
}

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
}

func (h *CategoryHandler) CreateCategory(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req dto.CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.validator.Validate(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	category, err := h.service.CreateCategory(userID, req.Name, req.Color, req.Icon, req.BudgetLimit)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Success: true,
		Data:    category,
	})
}

func (h *CategoryHandler) GetAllCategories(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	categories, err := h.service.GetAllCategories(userID)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    categories,
	})
}

func (h *CategoryHandler) GetCategoryByID(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid ID format",
			Code:    "BAD_REQUEST",
		})
	}

	category, err := h.service.GetCategoryByID(id, userID)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    category,
	})
}

func (h *CategoryHandler) UpdateCategory(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid ID format",
			Code:    "BAD_REQUEST",
		})
	}

	var req dto.UpdateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.validator.Validate(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	category, err := h.service.UpdateCategory(id, userID, req.Name, req.Color, req.Icon, req.BudgetLimit)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    category,
	})
}

func (h *CategoryHandler) DeleteCategory(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid ID format",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.service.DeleteCategory(id, userID); err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    fiber.Map{"message": "category deleted successfully"},
	})
}
```

---

### **Step 11: Expense Service & Handler (dengan Budget Warning)**

```go
// internal/service/expense_service.go
package service

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/yourusername/expense-tracker/internal/apperror"
	"github.com/yourusername/expense-tracker/internal/entity"
	"github.com/yourusername/expense-tracker/internal/repository"
)

type ExpenseService interface {
	CreateExpense(userID, categoryID uuid.UUID, amount float64, description string, expenseDate time.Time, receiptNote string) (*entity.Expense, *string, error)
	GetAllExpenses(userID uuid.UUID, filter repository.ExpenseFilter) ([]entity.Expense, int64, error)
	GetExpenseByID(id, userID uuid.UUID) (*entity.Expense, error)
	UpdateExpense(id, userID uuid.UUID, categoryID *uuid.UUID, amount *float64, description *string, expenseDate *time.Time, receiptNote *string) (*entity.Expense, *string, error)
	DeleteExpense(id, userID uuid.UUID) error
	GetMonthlySummary(userID uuid.UUID, year, month int) (*MonthlySummary, error)
}

type MonthlySummary struct {
	TotalExpense     float64                          `json:"total_expense"`
	TotalCategories  int                              `json:"total_categories"`
	CategorySummary  []repository.CategorySummary     `json:"category_summary"`
	LargestExpense   *entity.Expense                  `json:"largest_expense,omitempty"`
	BudgetPercentage []CategoryBudgetPercentage       `json:"budget_percentage"`
}

type CategoryBudgetPercentage struct {
	CategoryID   uuid.UUID `json:"category_id"`
	CategoryName string    `json:"category_name"`
	Total        float64   `json:"total"`
	BudgetLimit  float64   `json:"budget_limit"`
	Percentage   float64   `json:"percentage"` // 0-100+
	IsOverBudget bool      `json:"is_over_budget"`
}

type expenseService struct {
	expenseRepo  repository.ExpenseRepository
	categoryRepo repository.CategoryRepository
}

func NewExpenseService(expenseRepo repository.ExpenseRepository, categoryRepo repository.CategoryRepository) ExpenseService {
	return &expenseService{
		expenseRepo:  expenseRepo,
		categoryRepo: categoryRepo,
	}
}

func (s *expenseService) CreateExpense(userID, categoryID uuid.UUID, amount float64, description string, expenseDate time.Time, receiptNote string) (*entity.Expense, *string, error) {
	// Validate category ownership
	category, err := s.categoryRepo.FindByID(categoryID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to find category")
		return nil, nil, apperror.NewInternalError("failed to find category")
	}
	if category == nil {
		return nil, nil, apperror.NewNotFoundError("category not found")
	}
	if category.UserID != userID {
		return nil, nil, apperror.NewForbiddenError("not authorized to use this category")
	}

	// Create expense
	expense := &entity.Expense{
		UserID:      userID,
		CategoryID:  categoryID,
		Amount:      amount,
		Description: description,
		ExpenseDate: expenseDate,
		ReceiptNote: receiptNote,
	}

	if err := s.expenseRepo.Create(expense); err != nil {
		log.Error().Err(err).Msg("Failed to create expense")
		return nil, nil, apperror.NewInternalError("failed to create expense")
	}

	// Load category untuk response
	expense.Category = *category

	// Check budget warning
	warning := s.checkBudgetWarning(userID, categoryID, category.BudgetLimit, expenseDate)

	log.Info().Float64("amount", amount).Msg("Expense created")
	return expense, warning, nil
}

func (s *expenseService) GetAllExpenses(userID uuid.UUID, filter repository.ExpenseFilter) ([]entity.Expense, int64, error) {
	filter.UserID = userID

	expenses, total, err := s.expenseRepo.FindWithFilter(filter)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get expenses")
		return nil, 0, apperror.NewInternalError("failed to get expenses")
	}

	return expenses, total, nil
}

func (s *expenseService) GetExpenseByID(id, userID uuid.UUID) (*entity.Expense, error) {
	expense, err := s.expenseRepo.FindByID(id)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get expense")
		return nil, apperror.NewInternalError("failed to get expense")
	}
	if expense == nil {
		return nil, apperror.NewNotFoundError("expense not found")
	}

	// Check ownership
	if expense.UserID != userID {
		return nil, apperror.NewForbiddenError("not authorized to access this expense")
	}

	return expense, nil
}

func (s *expenseService) UpdateExpense(id, userID uuid.UUID, categoryID *uuid.UUID, amount *float64, description *string, expenseDate *time.Time, receiptNote *string) (*entity.Expense, *string, error) {
	expense, err := s.GetExpenseByID(id, userID)
	if err != nil {
		return nil, nil, err
	}

	// Validate category if changed
	if categoryID != nil && *categoryID != expense.CategoryID {
		category, err := s.categoryRepo.FindByID(*categoryID)
		if err != nil || category == nil {
			return nil, nil, apperror.NewNotFoundError("category not found")
		}
		if category.UserID != userID {
			return nil, nil, apperror.NewForbiddenError("not authorized to use this category")
		}
		expense.CategoryID = *categoryID
	}

	// Update fields
	if amount != nil {
		expense.Amount = *amount
	}
	if description != nil {
		expense.Description = *description
	}
	if expenseDate != nil {
		expense.ExpenseDate = *expenseDate
	}
	if receiptNote != nil {
		expense.ReceiptNote = *receiptNote
	}

	if err := s.expenseRepo.Update(expense); err != nil {
		log.Error().Err(err).Msg("Failed to update expense")
		return nil, nil, apperror.NewInternalError("failed to update expense")
	}

	// Reload with category
	expense, _ = s.expenseRepo.FindByID(expense.ID)

	// Check budget warning
	var warning *string
	if categoryID != nil || amount != nil {
		category, _ := s.categoryRepo.FindByID(expense.CategoryID)
		if category != nil {
			warning = s.checkBudgetWarning(userID, expense.CategoryID, category.BudgetLimit, expense.ExpenseDate)
		}
	}

	log.Info().Str("id", id.String()).Msg("Expense updated")
	return expense, warning, nil
}

func (s *expenseService) DeleteExpense(id, userID uuid.UUID) error {
	expense, err := s.GetExpenseByID(id, userID)
	if err != nil {
		return err
	}

	if err := s.expenseRepo.Delete(expense.ID); err != nil {
		log.Error().Err(err).Msg("Failed to delete expense")
		return apperror.NewInternalError("failed to delete expense")
	}

	log.Info().Str("id", id.String()).Msg("Expense deleted")
	return nil
}

func (s *expenseService) GetMonthlySummary(userID uuid.UUID, year, month int) (*MonthlySummary, error) {
	// Get category summary
	categorySummary, err := s.expenseRepo.GetMonthlySummary(userID, year, month)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get monthly summary")
		return nil, apperror.NewInternalError("failed to get summary")
	}

	// Calculate total
	var totalExpense float64
	budgetPercentages := make([]CategoryBudgetPercentage, 0)

	for _, cat := range categorySummary {
		totalExpense += cat.Total

		percentage := 0.0
		if cat.BudgetLimit > 0 {
			percentage = (cat.Total / cat.BudgetLimit) * 100
		}

		budgetPercentages = append(budgetPercentages, CategoryBudgetPercentage{
			CategoryID:   cat.CategoryID,
			CategoryName: cat.CategoryName,
			Total:        cat.Total,
			BudgetLimit:  cat.BudgetLimit,
			Percentage:   percentage,
			IsOverBudget: cat.BudgetLimit > 0 && cat.Total > cat.BudgetLimit,
		})
	}

	// Get largest expense
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Second)

	filter := repository.ExpenseFilter{
		UserID:    userID,
		StartDate: &startDate,
		EndDate:   &endDate,
		SortBy:    "amount",
		SortOrder: "desc",
		Limit:     1,
		Page:      1,
	}

	expenses, _, _ := s.expenseRepo.FindWithFilter(filter)
	var largestExpense *entity.Expense
	if len(expenses) > 0 {
		largestExpense = &expenses[0]
	}

	summary := &MonthlySummary{
		TotalExpense:     totalExpense,
		TotalCategories:  len(categorySummary),
		CategorySummary:  categorySummary,
		LargestExpense:   largestExpense,
		BudgetPercentage: budgetPercentages,
	}

	return summary, nil
}

// checkBudgetWarning mengecek apakah total expense di kategori melebihi budget limit
func (s *expenseService) checkBudgetWarning(userID, categoryID uuid.UUID, budgetLimit float64, expenseDate time.Time) *string {
	if budgetLimit <= 0 {
		return nil // No budget limit set
	}

	// Get total expense untuk kategori ini di bulan yang sama
	year, month, _ := expenseDate.Date()
	startDate := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Second)

	total, err := s.expenseRepo.GetTotalByUserID(userID, startDate, endDate)
	if err != nil {
		return nil
	}

	// Filter by category (manual, bisa optimize dengan query khusus)
	filter := repository.ExpenseFilter{
		UserID:     userID,
		CategoryID: &categoryID,
		StartDate:  &startDate,
		EndDate:    &endDate,
	}
	expenses, _, _ := s.expenseRepo.FindWithFilter(filter)

	var categoryTotal float64
	for _, e := range expenses {
		categoryTotal += e.Amount
	}

	if categoryTotal > budgetLimit {
		percentage := (categoryTotal / budgetLimit) * 100
		warning := fmt.Sprintf("⚠️ Budget exceeded! You've spent %.2f (%.0f%%) of your %.2f budget for this category this month.",
			categoryTotal, percentage, budgetLimit)
		return &warning
	}

	if categoryTotal > budgetLimit*0.8 {
		percentage := (categoryTotal / budgetLimit) * 100
		warning := fmt.Sprintf("⚠️ Budget warning! You've spent %.2f (%.0f%%) of your %.2f budget for this category this month.",
			categoryTotal, percentage, budgetLimit)
		return &warning
	}

	return nil
}
```

```go
// internal/handler/expense_handler.go
package handler

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/yourusername/expense-tracker/internal/apperror"
	"github.com/yourusername/expense-tracker/internal/dto"
	"github.com/yourusername/expense-tracker/internal/middleware"
	"github.com/yourusername/expense-tracker/internal/repository"
	"github.com/yourusername/expense-tracker/internal/service"
	customValidator "github.com/yourusername/expense-tracker/internal/validator"
)

type ExpenseHandler struct {
	service   service.ExpenseService
	validator *customValidator.CustomValidator
}

func NewExpenseHandler(service service.ExpenseService) *ExpenseHandler {
	return &ExpenseHandler{
		service:   service,
		validator: customValidator.NewCustomValidator(),
	}
}

func (h *ExpenseHandler) CreateExpense(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req dto.CreateExpenseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.validator.Validate(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	expense, warning, err := h.service.CreateExpense(
		userID,
		req.CategoryID,
		req.Amount,
		req.Description,
		req.ExpenseDate,
		req.ReceiptNote,
	)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.Status(fiber.StatusCreated).JSON(dto.ExpenseResponse{
		Success: true,
		Data:    expense,
		Warning: warning,
	})
}

func (h *ExpenseHandler) GetAllExpenses(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	// Parse filters
	filter := repository.ExpenseFilter{
		UserID:    userID,
		Page:      c.QueryInt("page", 1),
		Limit:     c.QueryInt("limit", 20),
		SortBy:    c.Query("sort_by", "expense_date"),
		SortOrder: c.Query("sort_order", "desc"),
	}

	// Category filter
	if categoryIDStr := c.Query("category_id"); categoryIDStr != "" {
		categoryID, err := uuid.Parse(categoryIDStr)
		if err == nil {
			filter.CategoryID = &categoryID
		}
	}

	// Date range filter
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err == nil {
			filter.StartDate = &startDate
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err == nil {
			filter.EndDate = &endDate
		}
	}

	// Amount range filter
	if minAmountStr := c.Query("min_amount"); minAmountStr != "" {
		minAmount, err := strconv.ParseFloat(minAmountStr, 64)
		if err == nil {
			filter.MinAmount = &minAmount
		}
	}
	if maxAmountStr := c.Query("max_amount"); maxAmountStr != "" {
		maxAmount, err := strconv.ParseFloat(maxAmountStr, 64)
		if err == nil {
			filter.MaxAmount = &maxAmount
		}
	}

	expenses, total, err := h.service.GetAllExpenses(userID, filter)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	totalPages := int(total) / filter.Limit
	if int(total)%filter.Limit > 0 {
		totalPages++
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    expenses,
		"meta": fiber.Map{
			"total":       total,
			"page":        filter.Page,
			"limit":       filter.Limit,
			"total_pages": totalPages,
		},
	})
}

func (h *ExpenseHandler) GetExpenseByID(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid ID format",
			Code:    "BAD_REQUEST",
		})
	}

	expense, err := h.service.GetExpenseByID(id, userID)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    expense,
	})
}

func (h *ExpenseHandler) UpdateExpense(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid ID format",
			Code:    "BAD_REQUEST",
		})
	}

	var req dto.UpdateExpenseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.validator.Validate(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	expense, warning, err := h.service.UpdateExpense(
		id,
		userID,
		req.CategoryID,
		req.Amount,
		req.Description,
		req.ExpenseDate,
		req.ReceiptNote,
	)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(dto.ExpenseResponse{
		Success: true,
		Data:    expense,
		Warning: warning,
	})
}

func (h *ExpenseHandler) DeleteExpense(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid ID format",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.service.DeleteExpense(id, userID); err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    fiber.Map{"message": "expense deleted successfully"},
	})
}

func (h *ExpenseHandler) GetMonthlySummary(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	// Default: current month
	now := time.Now()
	year := c.QueryInt("year", now.Year())
	month := c.QueryInt("month", int(now.Month()))

	// Validate month
	if month < 1 || month > 12 {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid month (must be 1-12)",
			Code:    "BAD_REQUEST",
		})
	}

	summary, err := h.service.GetMonthlySummary(userID, year, month)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    summary,
	})
}
```

---

### **Step 12: Export Excel**

```go
// pkg/excel/exporter.go
package excel

import (
	"fmt"
	"time"

	"github.com/xuri/excelize/v2"

	"github.com/yourusername/expense-tracker/internal/entity"
)

// ExportExpenses membuat file Excel dari list expenses
func ExportExpenses(expenses []entity.Expense, year, month int) (*excelize.File, error) {
	f := excelize.NewFile()
	sheet := "Expenses"

	// Create sheet
	index, err := f.NewSheet(sheet)
	if err != nil {
		return nil, err
	}
	f.SetActiveSheet(index)

	// Set headers
	headers := []string{"Date", "Category", "Description", "Amount", "Receipt Note"}
	for i, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheet, cell, header)
	}

	// Style header
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold: true,
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"#D3D3D3"},
			Pattern: 1,
		},
	})
	f.SetCellStyle(sheet, "A1", "E1", headerStyle)

	// Fill data
	for i, expense := range expenses {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), expense.ExpenseDate.Format("2006-01-02"))
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), expense.Category.Name)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), expense.Description)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), expense.Amount)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), expense.ReceiptNote)
	}

	// Format amount column as currency
	currencyStyle, _ := f.NewStyle(&excelize.Style{
		CustomNumFmt: stringPtr("#,##0.00"),
	})
	lastRow := len(expenses) + 1
	f.SetCellStyle(sheet, "D2", fmt.Sprintf("D%d", lastRow), currencyStyle)

	// Auto-fit columns
	f.SetColWidth(sheet, "A", "A", 12)
	f.SetColWidth(sheet, "B", "B", 15)
	f.SetColWidth(sheet, "C", "C", 35)
	f.SetColWidth(sheet, "D", "D", 12)
	f.SetColWidth(sheet, "E", "E", 30)

	// Add total row
	totalRow := lastRow + 1
	f.SetCellValue(sheet, fmt.Sprintf("C%d", totalRow), "TOTAL")
	f.SetCellFormula(sheet, fmt.Sprintf("D%d", totalRow), fmt.Sprintf("SUM(D2:D%d)", lastRow))

	totalStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold: true,
		},
		CustomNumFmt: stringPtr("#,##0.00"),
	})
	f.SetCellStyle(sheet, fmt.Sprintf("C%d", totalRow), fmt.Sprintf("D%d", totalRow), totalStyle)

	return f, nil
}

func stringPtr(s string) *string {
	return &s
}
```

```go
// internal/handler/expense_handler.go (tambahkan method)

func (h *ExpenseHandler) ExportExpenses(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	// Parse filters (sama seperti GetAllExpenses)
	filter := repository.ExpenseFilter{
		UserID:    userID,
		Page:      1,
		Limit:     10000, // Get all
		SortBy:    c.Query("sort_by", "expense_date"),
		SortOrder: c.Query("sort_order", "desc"),
	}

	// Category filter
	if categoryIDStr := c.Query("category_id"); categoryIDStr != "" {
		categoryID, err := uuid.Parse(categoryIDStr)
		if err == nil {
			filter.CategoryID = &categoryID
		}
	}

	// Date range filter
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		startDate, err := time.Parse("2006-01-02", startDateStr)
		if err == nil {
			filter.StartDate = &startDate
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		endDate, err := time.Parse("2006-01-02", endDateStr)
		if err == nil {
			filter.EndDate = &endDate
		}
	}

	// Amount range
	if minAmountStr := c.Query("min_amount"); minAmountStr != "" {
		minAmount, err := strconv.ParseFloat(minAmountStr, 64)
		if err == nil {
			filter.MinAmount = &minAmount
		}
	}
	if maxAmountStr := c.Query("max_amount"); maxAmountStr != "" {
		maxAmount, err := strconv.ParseFloat(maxAmountStr, 64)
		if err == nil {
			filter.MaxAmount = &maxAmount
		}
	}

	expenses, _, err := h.service.GetAllExpenses(userID, filter)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	// Generate Excel
	now := time.Now()
	year := c.QueryInt("year", now.Year())
	month := c.QueryInt("month", int(now.Month()))

	excelFile, err := excel.ExportExpenses(expenses, year, month)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "failed to generate Excel file",
			Code:    "INTERNAL_ERROR",
		})
	}

	// Write to buffer
	buffer, err := excelFile.WriteToBuffer()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "failed to write Excel file",
			Code:    "INTERNAL_ERROR",
		})
	}

	// Set headers untuk download
	filename := fmt.Sprintf("expenses_%d_%02d.xlsx", year, month)
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	return c.Send(buffer.Bytes())
}
```

---

### **Step 13: Auth & API Key Handlers**

```go
// internal/handler/auth_handler.go
package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/yourusername/expense-tracker/internal/apperror"
	"github.com/yourusername/expense-tracker/internal/dto"
	"github.com/yourusername/expense-tracker/internal/middleware"
	"github.com/yourusername/expense-tracker/internal/service"
	customValidator "github.com/yourusername/expense-tracker/internal/validator"
)

type AuthHandler struct {
	service   service.AuthService
	validator *customValidator.CustomValidator
}

func NewAuthHandler(service service.AuthService) *AuthHandler {
	return &AuthHandler{
		service:   service,
		validator: customValidator.NewCustomValidator(),
	}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req dto.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.validator.Validate(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	user, err := h.service.Register(req.Name, req.Email, req.Password)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Success: true,
		Data: fiber.Map{
			"user": user,
		},
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.validator.Validate(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	accessToken, refreshToken, user, err := h.service.Login(req.Email, req.Password)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data: dto.AuthResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			User:         user,
		},
	})
}

func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var req dto.RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	accessToken, err := h.service.RefreshToken(req.RefreshToken)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data: fiber.Map{
			"access_token": accessToken,
		},
	})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	// Get token from header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "missing authorization header",
			Code:    "BAD_REQUEST",
		})
	}

	token := authHeader[7:] // Remove "Bearer "

	if err := h.service.Logout(token); err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    fiber.Map{"message": "logged out successfully"},
	})
}

func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	user, err := h.service.GetProfile(userID)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    user,
	})
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req dto.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.validator.Validate(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	user, err := h.service.UpdateProfile(userID, req.Name)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    user,
	})
}
```

```go
// internal/handler/apikey_handler.go
package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/yourusername/expense-tracker/internal/apperror"
	"github.com/yourusername/expense-tracker/internal/middleware"
	"github.com/yourusername/expense-tracker/internal/service"
	customValidator "github.com/yourusername/expense-tracker/internal/validator"
)

type APIKeyHandler struct {
	service   service.APIKeyService
	validator *customValidator.CustomValidator
}

func NewAPIKeyHandler(service service.APIKeyService) *APIKeyHandler {
	return &APIKeyHandler{
		service:   service,
		validator: customValidator.NewCustomValidator(),
	}
}

type GenerateAPIKeyRequest struct {
	Name string `json:"name" validate:"required,min=1,max=100"`
}

func (h *APIKeyHandler) GenerateAPIKey(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req GenerateAPIKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.validator.Validate(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	plainKey, apiKey, err := h.service.GenerateAPIKey(userID, req.Name)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"api_key": plainKey, // Only shown once
			"key_info": apiKey,
		},
		"message": "⚠️ Save this API key securely! It won't be shown again.",
	})
}

func (h *APIKeyHandler) ListAPIKeys(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	apiKeys, err := h.service.ListAPIKeys(userID)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    apiKeys,
	})
}

func (h *APIKeyHandler) RevokeAPIKey(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	apiKeyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid ID format",
			Code:    "BAD_REQUEST",
		})
	}

	if err := h.service.RevokeAPIKey(userID, apiKeyID); err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    fiber.Map{"message": "API key revoked successfully"},
	})
}
```

---

### **Step 14: Middleware (Logger, Recovery, Request ID)**

```go
// internal/middleware/logger.go
package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

func Logger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

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

	"github.com/yourusername/expense-tracker/internal/apperror"
)

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

```go
// internal/middleware/request_id.go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		c.Set("X-Request-ID", requestID)
		c.Locals("requestID", requestID)

		return c.Next()
	}
}
```

---

### **Step 15: Main Entry Point & Routing**

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

	"github.com/yourusername/expense-tracker/internal/config"
	"github.com/yourusername/expense-tracker/internal/database"
	"github.com/yourusername/expense-tracker/internal/handler"
	"github.com/yourusername/expense-tracker/internal/middleware"
	"github.com/yourusername/expense-tracker/internal/repository"
	"github.com/yourusername/expense-tracker/internal/service"
)

func main() {
	setupLogger()

	log.Info().Msg("🚀 Starting Expense Tracker API...")

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

	// Connect Redis
	redisClient, err := database.NewRedisClient(&cfg.Redis)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect Redis")
	}

	// Setup repositories
	userRepo := repository.NewUserRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	expenseRepo := repository.NewExpenseRepository(db)
	apiKeyRepo := repository.NewAPIKeyRepository(db)

	// Setup services
	authService := service.NewAuthService(userRepo, redisClient, cfg.JWT)
	apiKeyService := service.NewAPIKeyService(apiKeyRepo, cfg.APIKey)
	categoryService := service.NewCategoryService(categoryRepo)
	expenseService := service.NewExpenseService(expenseRepo, categoryRepo)

	// Setup handlers
	authHandler := handler.NewAuthHandler(authService)
	apiKeyHandler := handler.NewAPIKeyHandler(apiKeyService)
	categoryHandler := handler.NewCategoryHandler(categoryService)
	expenseHandler := handler.NewExpenseHandler(expenseService)

	// Setup Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "Expense Tracker API",
		ErrorHandler: customErrorHandler,
	})

	// Global middleware
	app.Use(cors.New())
	app.Use(middleware.RequestID())
	app.Use(middleware.Logger())
	app.Use(middleware.Recovery())

	// Setup routes
	setupRoutes(app, authHandler, apiKeyHandler, categoryHandler, expenseHandler, authService, apiKeyService, cfg.JWT.Secret)

	// Graceful shutdown
	go func() {
		port := fmt.Sprintf(":%s", cfg.App.Port)
		log.Info().Msgf("🎧 Server listening on http://localhost%s", port)
		if err := app.Listen(port); err != nil {
			log.Fatal().Err(err).Msg("Failed to start server")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Info().Msg("🛑 Shutting down server...")

	if err := app.ShutdownWithTimeout(30 * time.Second); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	sqlDB, _ := db.DB()
	if sqlDB != nil {
		sqlDB.Close()
	}
	redisClient.Close()

	log.Info().Msg("✅ Server shutdown complete")
}

func setupLogger() {
	output := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}
	log.Logger = zerolog.New(output).With().Timestamp().Caller().Logger()
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
}

func setupRoutes(
	app *fiber.App,
	authHandler *handler.AuthHandler,
	apiKeyHandler *handler.APIKeyHandler,
	categoryHandler *handler.CategoryHandler,
	expenseHandler *handler.ExpenseHandler,
	authService service.AuthService,
	apiKeyService service.APIKeyService,
	jwtSecret string,
) {
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"time":   time.Now(),
		})
	})

	// API v1
	v1 := app.Group("/api/v1")

	// Public routes (no auth)
	auth := v1.Group("/auth")
	{
		auth.Post("/register", authHandler.Register)
		auth.Post("/login", authHandler.Login)
		auth.Post("/refresh", authHandler.RefreshToken)
	}

	// Protected routes (require auth: JWT or API Key)
	authMiddleware := middleware.AuthMiddleware(authService, apiKeyService, jwtSecret)

	// Auth routes (protected)
	authProtected := v1.Group("/auth", authMiddleware)
	{
		authProtected.Post("/logout", authHandler.Logout)
		authProtected.Get("/profile", authHandler.GetProfile)
		authProtected.Put("/profile", authHandler.UpdateProfile)
	}

	// API Keys routes
	apiKeys := v1.Group("/api-keys", authMiddleware)
	{
		apiKeys.Post("/", apiKeyHandler.GenerateAPIKey)
		apiKeys.Get("/", apiKeyHandler.ListAPIKeys)
		apiKeys.Delete("/:id", apiKeyHandler.RevokeAPIKey)
	}

	// Categories routes
	categories := v1.Group("/categories", authMiddleware)
	{
		categories.Post("/", categoryHandler.CreateCategory)
		categories.Get("/", categoryHandler.GetAllCategories)
		categories.Get("/:id", categoryHandler.GetCategoryByID)
		categories.Put("/:id", categoryHandler.UpdateCategory)
		categories.Delete("/:id", categoryHandler.DeleteCategory)
	}

	// Expenses routes
	expenses := v1.Group("/expenses", authMiddleware)
	{
		expenses.Post("/", expenseHandler.CreateExpense)
		expenses.Get("/", expenseHandler.GetAllExpenses)
		expenses.Get("/summary", expenseHandler.GetMonthlySummary)
		expenses.Get("/export", expenseHandler.ExportExpenses)
		expenses.Get("/:id", expenseHandler.GetExpenseByID)
		expenses.Put("/:id", expenseHandler.UpdateExpense)
		expenses.Delete("/:id", expenseHandler.DeleteExpense)
	}
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

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

### **Step 16: Testing Manual dengan cURL**

Sekarang mari test semua endpoint yang sudah dibuat:

```bash
# === PREPARATION ===

# 1. Start PostgreSQL
docker run --name postgres-expense \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=expense_tracker \
  -p 5432:5432 \
  -d postgres:15-alpine

# 2. Start Redis
docker run --name redis-expense \
  -p 6379:6379 \
  -d redis:7-alpine

# 3. Copy .env
cp .env.example .env

# 4. Run aplikasi
go run cmd/api/main.go

# Output:
# 🚀 Starting Expense Tracker API...
# ✅ Database connected
# ✅ Redis connected
# Running migrations...
# ✅ Migrations completed
# 🎧 Server listening on http://localhost:3000
```

**Test Flow:**

```bash
# === 1. HEALTH CHECK ===
curl http://localhost:3000/health

# Response:
# {
#   "status": "ok",
#   "time": "2026-02-27T10:00:00Z"
# }


# === 2. REGISTER ===
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "user": {
#       "id": "uuid-here",
#       "name": "John Doe",
#       "email": "john@example.com",
#       "created_at": "2026-02-27T10:01:00Z",
#       "updated_at": "2026-02-27T10:01:00Z"
#     }
#   }
# }


# === 3. LOGIN ===
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "access_token": "eyJhbGc...",
#     "refresh_token": "eyJhbGc...",
#     "user": {
#       "id": "uuid-here",
#       "name": "John Doe",
#       "email": "john@example.com",
#       ...
#     }
#   }
# }

# Save access_token untuk request selanjutnya
export TOKEN="eyJhbGc..."


# === 4. GET PROFILE (dengan JWT) ===
curl http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "uuid-here",
#     "name": "John Doe",
#     "email": "john@example.com",
#     ...
#   }
# }


# === 5. UPDATE PROFILE ===
curl -X PUT http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated"
  }'


# === 6. GENERATE API KEY ===
curl -X POST http://localhost:3000/api/v1/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App API Key"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "api_key": "a1b2c3d4e5f67890...",  // Save this!
#     "key_info": {
#       "id": "uuid-here",
#       "name": "My App API Key",
#       "prefix": "a1b2c3d4",
#       "is_active": true,
#       ...
#     }
#   },
#   "message": "⚠️ Save this API key securely! It won't be shown again."
# }

# Save API key
export API_KEY="a1b2c3d4e5f67890..."


# === 7. LIST API KEYS ===
curl http://localhost:3000/api/v1/api-keys \
  -H "Authorization: Bearer $TOKEN"


# === 8. CREATE CATEGORY (dengan JWT) ===
curl -X POST http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Food & Dining",
    "color": "#FF5733",
    "icon": "🍔",
    "budget_limit": 500000
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "category-uuid",
#     "user_id": "user-uuid",
#     "name": "Food & Dining",
#     "color": "#FF5733",
#     "icon": "🍔",
#     "budget_limit": 500000,
#     "created_at": "...",
#     "updated_at": "..."
#   }
# }

# Save category ID
export CATEGORY_ID="category-uuid"


# === 9. CREATE CATEGORY menggunakan API KEY ===
curl -X POST http://localhost:3000/api/v1/categories \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Transportation",
    "color": "#3366FF",
    "icon": "🚗",
    "budget_limit": 300000
  }'

# Berhasil! API Key works


# === 10. LIST CATEGORIES ===
curl http://localhost:3000/api/v1/categories \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": [
#     {
#       "id": "...",
#       "name": "Transportation",
#       "color": "#3366FF",
#       "icon": "🚗",
#       "budget_limit": 300000,
#       ...
#     },
#     {
#       "id": "category-uuid",
#       "name": "Food & Dining",
#       "color": "#FF5733",
#       "icon": "🍔",
#       "budget_limit": 500000,
#       ...
#     }
#   ]
# }


# === 11. CREATE EXPENSE (normal, tidak over budget) ===
curl -X POST http://localhost:3000/api/v1/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "'"$CATEGORY_ID"'",
    "amount": 150000,
    "description": "Lunch at restaurant",
    "expense_date": "2026-02-27",
    "receipt_note": "Paid with credit card"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "expense-uuid",
#     "user_id": "user-uuid",
#     "category_id": "category-uuid",
#     "amount": 150000,
#     "description": "Lunch at restaurant",
#     "expense_date": "2026-02-27T00:00:00Z",
#     "receipt_note": "Paid with credit card",
#     "category": {
#       "id": "category-uuid",
#       "name": "Food & Dining",
#       ...
#     },
#     ...
#   }
# }


# === 12. CREATE EXPENSE (melebihi 80% budget) ===
curl -X POST http://localhost:3000/api/v1/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "'"$CATEGORY_ID"'",
    "amount": 300000,
    "description": "Dinner with friends",
    "expense_date": "2026-02-27"
  }'

# Response:
# {
#   "success": true,
#   "data": { ... },
#   "warning": "⚠️ Budget warning! You've spent 450000.00 (90%) of your 500000.00 budget for this category this month."
# }


# === 13. CREATE EXPENSE (over budget) ===
curl -X POST http://localhost:3000/api/v1/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "'"$CATEGORY_ID"'",
    "amount": 200000,
    "description": "Another meal",
    "expense_date": "2026-02-27"
  }'

# Response dengan warning:
# {
#   "success": true,
#   "data": { ... },
#   "warning": "⚠️ Budget exceeded! You've spent 650000.00 (130%) of your 500000.00 budget for this category this month."
# }


# === 14. LIST EXPENSES (with pagination) ===
curl "http://localhost:3000/api/v1/expenses?page=1&limit=10&sort_by=expense_date&sort_order=desc" \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": [ ... ],
#   "meta": {
#     "total": 3,
#     "page": 1,
#     "limit": 10,
#     "total_pages": 1
#   }
# }


# === 15. FILTER EXPENSES (by category) ===
curl "http://localhost:3000/api/v1/expenses?category_id=$CATEGORY_ID" \
  -H "Authorization: Bearer $TOKEN"


# === 16. FILTER EXPENSES (by date range) ===
curl "http://localhost:3000/api/v1/expenses?start_date=2026-02-01&end_date=2026-02-28" \
  -H "Authorization: Bearer $TOKEN"


# === 17. FILTER EXPENSES (by amount range) ===
curl "http://localhost:3000/api/v1/expenses?min_amount=100000&max_amount=300000" \
  -H "Authorization: Bearer $TOKEN"


# === 18. GET MONTHLY SUMMARY ===
curl "http://localhost:3000/api/v1/expenses/summary?year=2026&month=2" \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": {
#     "total_expense": 650000,
#     "total_categories": 1,
#     "category_summary": [
#       {
#         "category_id": "category-uuid",
#         "category_name": "Food & Dining",
#         "total": 650000,
#         "count": 3,
#         "budget_limit": 500000
#       }
#     ],
#     "largest_expense": {
#       "id": "...",
#       "amount": 300000,
#       "description": "Dinner with friends",
#       ...
#     },
#     "budget_percentage": [
#       {
#         "category_id": "category-uuid",
#         "category_name": "Food & Dining",
#         "total": 650000,
#         "budget_limit": 500000,
#         "percentage": 130,
#         "is_over_budget": true
#       }
#     ]
#   }
# }


# === 19. UPDATE EXPENSE ===
curl -X PUT http://localhost:3000/api/v1/expenses/expense-uuid \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 125000,
    "description": "Lunch at restaurant (updated)"
  }'


# === 20. DELETE EXPENSE (soft delete) ===
curl -X DELETE http://localhost:3000/api/v1/expenses/expense-uuid \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": {
#     "message": "expense deleted successfully"
#   }
# }


# === 21. EXPORT EXPENSES TO EXCEL ===
curl "http://localhost:3000/api/v1/expenses/export?year=2026&month=2" \
  -H "Authorization: Bearer $TOKEN" \
  -o expenses_2026_02.xlsx

# File downloaded: expenses_2026_02.xlsx


# === 22. EXPORT dengan FILTER ===
curl "http://localhost:3000/api/v1/expenses/export?category_id=$CATEGORY_ID&start_date=2026-02-01&end_date=2026-02-28" \
  -H "Authorization: Bearer $TOKEN" \
  -o filtered_expenses.xlsx


# === 23. REFRESH TOKEN ===
export REFRESH_TOKEN="eyJhbGc..."

curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "'"$REFRESH_TOKEN"'"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "access_token": "new-token-here"
#   }
# }


# === 24. REVOKE API KEY ===
curl -X DELETE http://localhost:3000/api/v1/api-keys/api-key-uuid \
  -H "Authorization: Bearer $TOKEN"


# === 25. LOGOUT ===
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": {
#     "message": "logged out successfully"
#   }
# }


# === 26. TEST dengan token yang sudah di-logout (should fail) ===
curl http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": false,
#   "error": "token has been revoked",
#   "code": "UNAUTHORIZED"
# }
# Status: 401


# === 27. TEST VALIDATION ERRORS ===

# Amount negatif
curl -X POST http://localhost:3000/api/v1/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "'"$CATEGORY_ID"'",
    "amount": -100,
    "description": "Test",
    "expense_date": "2026-02-27"
  }'

# Response:
# {
#   "success": false,
#   "error": "Key: 'CreateExpenseRequest.Amount' Error:Field validation for 'Amount' failed on the 'positive' tag",
#   "code": "VALIDATION_ERROR"
# }
# Status: 422


# Future date
curl -X POST http://localhost:3000/api/v1/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "'"$CATEGORY_ID"'",
    "amount": 100000,
    "description": "Test",
    "expense_date": "2027-01-01"
  }'

# Response:
# {
#   "success": false,
#   "error": "... failed on the 'pastdate' tag",
#   "code": "VALIDATION_ERROR"
# }


# Amount terlalu besar (> 999,999,999)
curl -X POST http://localhost:3000/api/v1/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "'"$CATEGORY_ID"'",
    "amount": 1000000000,
    "description": "Test",
    "expense_date": "2026-02-27"
  }'

# Response:
# {
#   "success": false,
#   "error": "... failed on the 'maxamount' tag",
#   "code": "VALIDATION_ERROR"
# }


# === 28. TEST OWNERSHIP (akses data user lain) ===

# Register user kedua
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "password123"
  }'

# Login user kedua
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "password123"
  }'

export TOKEN2="token-user-2"

# Coba akses category milik user pertama
curl http://localhost:3000/api/v1/categories/$CATEGORY_ID \
  -H "Authorization: Bearer $TOKEN2"

# Response:
# {
#   "success": false,
#   "error": "not authorized to access this category",
#   "code": "FORBIDDEN"
# }
# Status: 403
```

---

## ✅ Checklist Completion

Setelah menyelesaikan project ini, kamu sudah bisa:

### **Authentication & Authorization**
- [x] Register user dengan password hashing (bcrypt)
- [x] Login dengan JWT (access token + refresh token)
- [x] Refresh token mechanism
- [x] Logout dengan token blacklist di Redis
- [x] Generate API Key untuk programmatic access
- [x] Validate API Key
- [x] Revoke API Key
- [x] Dual authentication (JWT atau API Key)
- [x] Check ownership di service layer

### **JWT & Security**
- [x] Generate JWT dengan claims (user_id, email, expiry)
- [x] Validate JWT dan extract claims
- [x] Token blacklist dengan Redis TTL
- [x] Password hashing dengan bcrypt
- [x] API Key hashing dengan SHA256 + secret
- [x] Protect routes dengan auth middleware

### **Database & GORM**
- [x] Multi-entity relationships (User → Categories → Expenses)
- [x] Foreign keys dan indexes
- [x] Soft delete pattern
- [x] Aggregate queries (SUM, COUNT, GROUP BY)
- [x] Complex filtering (multiple fields)
- [x] Pagination & sorting
- [x] Preload associations

### **Business Logic**
- [x] Budget limit tracking
- [x] Budget warning (80% dan over budget)
- [x] Monthly summary dengan statistics
- [x] Category summary dengan percentages
- [x] Largest expense tracking
- [x] Budget percentage calculation

### **Validation**
- [x] Custom validators (positive, pastdate, maxamount)
- [x] Nested struct validation
- [x] Field-level validation rules
- [x] Validation error messages
- [x] Business rule validation

### **Error Handling**
- [x] Custom AppError dengan status codes
- [x] Consistent error response format
- [x] Error logging dengan zerolog
- [x] Panic recovery middleware
- [x] Validation errors handling

### **Advanced Features**
- [x] Filter multi-field (category, date range, amount range)
- [x] Pagination dengan metadata (total, pages)
- [x] Sorting multiple columns
- [x] Excel export dengan formatting
- [x] Dynamic filename untuk download
- [x] Warning response untuk budget alert

### **Redis Integration**
- [x] Token blacklist dengan expiry
- [x] Set/Get operations
- [x] TTL management
- [x] Connection testing

### **Clean Architecture**
- [x] Separation of concerns (Entity, Repository, Service, Handler)
- [x] Dependency injection
- [x] Repository pattern
- [x] DTOs untuk request/response
- [x] Thin handlers (no business logic)
- [x] Service layer untuk business logic

### **API Design**
- [x] RESTful endpoints
- [x] Versioning (api/v1)
- [x] Consistent response format
- [x] Query parameters untuk filter/pagination
- [x] Request/Response DTOs
- [x] File download endpoints

---

## 🚀 Ide Pengembangan Mandiri

### **Level 1: Enhancement Features**

1. **Password Reset**
   - Send email dengan reset token
   - Verify token dan update password
   - Token expiry handling
   
   ```go
   type PasswordResetRequest struct {
       Email string `json:"email" validate:"required,email"`
   }
   
   // Generate reset token, save to Redis dengan expiry 1 hour
   // Send email dengan link reset
   ```

2. **Email Verification**
   - Send verification email saat register
   - Verify email dengan token
   - Block unverified users dari akses tertentu
   
   ```go
   type User struct {
       ...
       EmailVerified bool       `gorm:"default:false"`
       VerifiedAt    *time.Time
   }
   ```

3. **Recurring Expenses**
   - Set expense sebagai recurring (daily, weekly, monthly)
   - Auto-create expense berdasarkan schedule
   - Cron job untuk process recurring
   
   ```go
   type RecurringExpense struct {
       CategoryID  uuid.UUID
       Amount      float64
       Description string
       Frequency   string // "daily", "weekly", "monthly"
       NextDate    time.Time
   }
   ```

4. **Expense Tags**
   - Multi-tag per expense (business, personal, travel, etc)
   - Filter by tags
   - Tag statistics
   
   ```go
   type Tag struct {
       ID   uuid.UUID
       Name string
   }
   
   type ExpenseTag struct {
       ExpenseID uuid.UUID
       TagID     uuid.UUID
   }
   ```

### **Level 2: Advanced Analytics**

5. **Dashboard Endpoint**
   - Total expense last 6 months (trend)
   - Top 5 categories by spending
   - Average expense per day/month
   - Spending vs Budget chart data
   
   ```go
   type DashboardStats struct {
       Last6MonthsTotal []MonthlyTotal
       TopCategories    []CategorySpending
       AverageDaily     float64
       AverageMonthly   float64
       BudgetUtilization float64
   }
   ```

6. **Comparison Report**
   - Compare month-to-month
   - Compare category spending year-over-year
   - Percentage change indicators
   
   ```go
   type ComparisonReport struct {
       CurrentMonth  float64
       PreviousMonth float64
       Change        float64  // Amount
       ChangePercent float64  // Percentage
       Trend         string   // "up", "down", "stable"
   }
   ```

7. **Budget Alerts Notification**
   - Email/webhook saat mendekati budget limit
   - Daily/weekly summary email
   - Redis pub/sub untuk real-time alerts

8. **Multi-Currency Support**
   - Store currency per expense
   - Convert to base currency untuk summary
   - API untuk exchange rates
   
   ```go
   type Expense struct {
       ...
       Amount       float64
       Currency     string  // "IDR", "USD", "EUR"
       AmountInBase float64 // Converted
   }
   ```

### **Level 3: Collaboration & Sharing**

9. **Shared Budgets**
   - User bisa share budget dengan user lain
   - Permissions (view, edit, manage)
   - Invite via email
   
   ```go
   type SharedBudget struct {
       ID         uuid.UUID
       OwnerID    uuid.UUID
       SharedWith uuid.UUID
       Permission string // "view", "edit", "manage"
   }
   ```

10. **Expense Splitting**
    - Split expense dengan multiple users
    - Track "who owes who"
    - Settlement tracking
    
    ```go
    type ExpenseSplit struct {
        ExpenseID uuid.UUID
        UserID    uuid.UUID
        Amount    float64
        IsPaid    bool
    }
    ```

11. **Receipt Upload**
    - Upload image receipt
    - Store di S3/local storage
    - OCR untuk extract amount (optional)
    
    ```go
    type Expense struct {
        ...
        ReceiptURL string
    }
    
    // Upload endpoint
    POST /api/v1/expenses/:id/receipt
    ```

12. **Export PDF**
    - Generate PDF report selain Excel
    - Custom template dengan logo
    - Charts dan graphs
    
    ```go
    import "github.com/jung-kurt/gofpdf"
    
    func GeneratePDFReport(expenses []Expense) (*bytes.Buffer, error) {
        pdf := gofpdf.New("P", "mm", "A4", "")
        // Generate PDF
        return buffer, nil
    }
    ```

### **Level 4: Production Ready**

13. **Rate Limiting per Endpoint**
    - Different limits untuk different endpoints
    - Per-user rate limiting
    - API Key quota management
    
    ```go
    rateLimiter := limiter.New(limiter.Config{
        Max:        100,
        Expiration: 1 * time.Minute,
        KeyGenerator: func(c *fiber.Ctx) string {
            userID := middleware.GetUserID(c)
            return userID.String()
        },
    })
    ```

14. **Caching dengan Redis**
    - Cache monthly summary (invalidate on create/update)
    - Cache category list
    - Cache key: `summary:user:{id}:year:month`
    
    ```go
    cacheKey := fmt.Sprintf("summary:%s:%d:%d", userID, year, month)
    cached := redis.Get(ctx, cacheKey).Val()
    if cached != "" {
        // Return from cache
    }
    // Get from DB, cache it
    redis.Set(ctx, cacheKey, data, 1*time.Hour)
    ```

15. **Background Jobs**
    - Send monthly summary email
    - Cleanup old blacklisted tokens
    - Generate daily/weekly reports
    - Use Asynq atau similar
    
    ```go
    import "github.com/hibiken/asynq"
    
    client := asynq.NewClient(redisOpt)
    task := asynq.NewTask("email:monthly-summary", payload)
    client.Enqueue(task, asynq.ProcessIn(1*time.Hour))
    ```

16. **Webhooks**
    - Trigger webhook saat expense created
    - Trigger saat budget exceeded
    - Configurable webhook URLs
    
    ```go
    type Webhook struct {
        URL        string
        Events     []string // ["expense.created", "budget.exceeded"]
        Secret     string
        IsActive   bool
    }
    
    // Send webhook
    go sendWebhook(webhook.URL, event, payload, webhook.Secret)
    ```

17. **Audit Logging**
    - Track all CRUD operations
    - WHO did WHAT WHEN
    - Queryable audit logs
    
    ```go
    type AuditLog struct {
        ID         uuid.UUID
        UserID     uuid.UUID
        Action     string // "expense.create", "category.delete"
        EntityType string
        EntityID   uuid.UUID
        Changes    JSON   // Before/after
        IPAddress  string
        CreatedAt  time.Time
    }
    ```

18. **GraphQL API** (Alternative/Tambahan)
    - GraphQL endpoint selain REST
    - Flexible queries
    - Reduce over-fetching
    
    ```go
    import "github.com/graphql-go/graphql"
    
    // Define schema
    expenseType := graphql.NewObject(...)
    queryType := graphql.NewObject(...)
    ```

19. **Microservices Split** (Advanced)
    - Auth Service (register, login, JWT)
    - Expense Service (CRUD expenses)
    - Notification Service (emails, webhooks)
    - API Gateway
    
    ```
    API Gateway
    ├── Auth Service (Port 3001)
    ├── Expense Service (Port 3002)
    └── Notification Service (Port 3003)
    ```

20. **Monitoring & Metrics**
    - Prometheus metrics
    - Grafana dashboards
    - Request duration tracking
    - Error rate monitoring
    
    ```go
    import "github.com/prometheus/client_golang/prometheus"
    
    httpRequestsTotal := prometheus.NewCounterVec(...)
    httpRequestDuration := prometheus.NewHistogramVec(...)
    ```

---

## 📖 Resources

- **Fiber Documentation**: https://docs.gofiber.io/
- **GORM Documentation**: https://gorm.io/docs/
- **JWT (golang-jwt)**: https://github.com/golang-jwt/jwt
- **Redis Client**: https://github.com/redis/go-redis
- **Excelize (Excel)**: https://xuri.me/excelize/
- **Zerolog**: https://github.com/rs/zerolog
- **Validator**: https://github.com/go-playground/validator

---

## 🎯 Kesimpulan

Selamat! 🎉 Kamu baru saja menyelesaikan project **Expense Tracker API** yang sangat comprehensive dengan:

**✅ Full Authentication System:**
- JWT (access + refresh token)
- Token blacklist dengan Redis
- API Key generation & validation
- Dual auth support (JWT or API Key)

**✅ Complex Business Logic:**
- Multi-entity relationships
- Budget tracking & warnings
- Monthly summary dengan statistics
- Budget percentage calculation

**✅ Advanced Features:**
- Multi-field filtering
- Pagination & sorting
- Excel export dengan formatting
- Custom validation rules

**✅ Production-grade Code:**
- Clean architecture
- Comprehensive error handling
- Structured logging
- Input validation
- Soft delete pattern

**Key Takeaways:**
1. **JWT Authentication** → Access token untuk API, refresh untuk renewal, blacklist untuk logout
2. **API Key** → Alternative auth untuk programmatic access, hash dengan salt
3. **Budget Logic** → Track spending, warn user, calculate percentages
4. **Aggregate Queries** → SUM, COUNT, GROUP BY untuk statistics
5. **Excel Export** → Generate formatted Excel dengan excelize

**Bedanya dengan Project 1:**
- ✅ **Auth**: Tidak ada → Full JWT + API Key
- ✅ **Redis**: Tidak ada → Token blacklist + (future) caching
- ✅ **Validation**: Basic → Custom validators + business rules
- ✅ **Business Logic**: Simple CRUD → Complex budget tracking + warnings
- ✅ **Export**: Tidak ada → Excel export dengan filtering

Project ini adalah **fondasi solid** untuk aplikasi production. Kamu sudah belajar pattern yang dipakai di startup/perusahaan nyata.

**Next Steps:**
- Implement ide-ide di atas (pilih yang menarik bagimu)
- Deploy ke production (Docker + VPS)
- Add unit tests & integration tests
- Optimize dengan caching Redis
- Add monitoring & logging

**Pro Tips:**
- 💡 Jangan skip error handling, walaupun cuma return fmt.Errorf
- 💡 Validasi di DTO level, business rule di service level
- 💡 Gunakan repository pattern untuk gampang switch database
- 💡 Pisahkan JWT logic ke pkg terpisah untuk reusability
- 💡 Redis TTL = token expiry untuk auto-cleanup

Keep building! 🚀💪 Project berikutnya akan lebih advanced lagi!

