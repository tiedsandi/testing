# Project 2 (Fase 2): Event Management API

> **Go + Fiber + GORM + PostgreSQL + Redis + Asynq + Cron**  
> Fokus: Background Jobs, Scheduler, Database Transactions, Query Optimization

---

## 📚 **Overview**

Project ini adalah project kedua dari **Fase 2**, di mana kamu akan belajar menangani **kompleksitas real-world** seperti:

1. **Background Jobs** - Kirim email async tanpa blocking HTTP request
2. **Job Scheduler** - Automate tasks (reminder H-1, cleanup data lama)
3. **Database Transactions** - Atomic operations (beli tiket = kurangi capacity + insert ticket, rollback kalau gagal)
4. **Row Locking** - Prevent race condition saat beli tiket bersamaan
5. **Query Optimization** - Fix N+1 problem, indexing, aggregate queries

Kamu akan membangun **Event Management API** di mana:
- **Organizer** bisa buat event, lihat stats, export peserta
- **Attendee** bisa cari event, beli tiket, cancel tiket
- **System** auto kirim email konfirmasi, reminder H-1, cleanup draft, notify sold out

---

## 🎯 **Materi yang Dipelajari**

| **Topik** | **Sub-Topik** | **Implementasi di Project** |
|-----------|---------------|----------------------------|
| **10. Security Hardening** | Review dari Project 1 | CORS, Rate Limiting, Helmet, Sanitization |
| **11. Redis Caching** | Review dari Project 1 | Cache event list, invalidation |
| **12. Background Jobs & Scheduler** | Asynq task queue | Email konfirmasi, sold out notification |
| | Cron scheduler | Reminder H-1, cleanup draft event |
| | CLI commands | Seed data script |
| **13. Database Transactions** | GORM transactions | Atomic beli/cancel tiket |
| | Row-level locking | `SELECT FOR UPDATE` prevent race |
| | Rollback on error | Data consistency |
| **14. Query Optimization** | N+1 query problem | Preload vs Joins |
| | Database indexing | Index pada foreign key, status, dates |
| | Aggregate queries | Stats dengan `COUNT`, `SUM`, `GROUP BY` |
| **15. Logging & Monitoring** | Structured logging | Zerolog (JSON logs) |
| | Error tracking | Log level (info, warn, error) |

---

## 🗂️ **ERD (Entity Relationship Diagram)**

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ id (UUID)       │
│ name            │
│ email (unique)  │
│ password        │
│ role (enum)     │──┐
│ created_at      │  │
│ updated_at      │  │
│ deleted_at      │  │
└─────────────────┘  │
                     │
                     │ 1:N (organized_events)
                     │
                     ▼
               ┌─────────────────┐
               │      Event      │
               ├─────────────────┤
               │ id (UUID)       │
               │ organizer_id    │◄────┐
               │ category_id     │     │
               │ title           │     │
               │ description     │     │
               │ location        │     │
               │ start_time      │     │
               │ end_time        │     │
               │ capacity        │     │
               │ price           │     │
               │ banner_url      │     │
               │ status (enum)   │     │
               │ created_at      │     │
               │ updated_at      │     │
               │ deleted_at      │     │
               └─────────────────┘     │
                     │                 │
                     │ 1:N (tickets)   │
                     │                 │
                     ▼                 │
               ┌─────────────────┐     │
               │     Ticket      │     │
               ├─────────────────┤     │
               │ id (UUID)       │     │
               │ event_id        │─────┘
               │ user_id         │──┐
               │ code (unique)   │  │
               │ price           │  │
               │ status (enum)   │  │
               │ purchased_at    │  │
               │ created_at      │  │
               │ updated_at      │  │
               │ deleted_at      │  │
               └─────────────────┘  │
                                    │
                                    │ N:1 (buyer)
                                    │
                                    ▼
                              ┌─────────────────┐
                              │    Category     │
                              ├─────────────────┤
                              │ id (UUID)       │
                              │ name (unique)   │
                              │ slug (unique)   │
                              │ created_at      │
                              │ updated_at      │
                              └─────────────────┘

Relationships:
- User 1:N Event (as organizer)
- User 1:N Ticket (as buyer/attendee)
- Event 1:N Ticket
- Category 1:N Event
```

---

## 📁 **Struktur Folder**

```
event-management-api/
├── cmd/
│   ├── api/
│   │   └── main.go
│   ├── worker/
│   │   └── main.go
│   └── cli/
│       └── seed.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── database/
│   │   ├── postgres.go
│   │   └── redis.go
│   ├── entity/
│   │   ├── base.go
│   │   ├── user.go
│   │   ├── event.go
│   │   ├── ticket.go
│   │   └── category.go
│   ├── repository/
│   │   ├── user_repository.go
│   │   ├── event_repository.go
│   │   ├── ticket_repository.go
│   │   └── category_repository.go
│   ├── service/
│   │   ├── auth_service.go
│   │   ├── event_service.go
│   │   ├── ticket_service.go
│   │   ├── category_service.go
│   │   ├── upload_service.go
│   │   ├── export_service.go
│   │   └── cache_service.go
│   ├── handler/
│   │   ├── auth_handler.go
│   │   ├── event_handler.go
│   │   ├── ticket_handler.go
│   │   └── category_handler.go
│   ├── dto/
│   │   ├── auth_dto.go
│   │   ├── event_dto.go
│   │   ├── ticket_dto.go
│   │   └── pagination_dto.go
│   ├── middleware/
│   │   ├── auth_middleware.go
│   │   ├── role_middleware.go
│   │   ├── cors_middleware.go
│   │   ├── rate_limit_middleware.go
│   │   ├── helmet_middleware.go
│   │   ├── logger_middleware.go
│   │   └── cache_middleware.go
│   ├── util/
│   │   ├── jwt.go
│   │   ├── hash.go
│   │   ├── validator.go
│   │   ├── error.go
│   │   ├── response.go
│   │   └── ticket_code.go
│   ├── worker/
│   │   ├── tasks/
│   │   │   ├── email_confirmation.go
│   │   │   ├── email_reminder.go
│   │   │   ├── email_sold_out.go
│   │   │   └── cleanup_draft.go
│   │   ├── handler.go
│   │   └── client.go
│   ├── scheduler/
│   │   └── cron.go
│   └── routes/
│       └── routes.go
├── uploads/
├── .env.example
├── go.mod
└── go.sum
```

---

## 🚀 **Step-by-Step Implementation**

### **Step 1: Setup Project & Dependencies**

**Install dependencies:**

```bash
# Initialize project
mkdir event-management-api && cd event-management-api
go mod init github.com/yourusername/event-management-api

# Core dependencies
go get github.com/gofiber/fiber/v2
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/google/uuid

# Redis + Caching
go get github.com/redis/go-redis/v9

# Background jobs + Scheduler
go get github.com/hibiken/asynq
go get github.com/robfig/cron/v3

# JWT + Security
go get github.com/golang-jwt/jwt/v5
go get golang.org/x/crypto
go get github.com/gofiber/contrib/helmet
go get github.com/gofiber/contrib/fibercors
go get github.com/microcosm-cc/bluemonday

# File handling
go get github.com/disintegration/imaging
go get github.com/xuri/excelize/v2

# Config + Logging
go get github.com/spf13/viper
go get github.com/rs/zerolog

# Validation
go get github.com/go-playground/validator/v10

# CLI
go get github.com/spf13/cobra
```

---

**File:** `.env.example`

```env
# Server
SERVER_PORT=3000
SERVER_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=event_management_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRY=24h

# Security
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3001
RATE_LIMIT_ANONYMOUS=30
RATE_LIMIT_AUTHENTICATED=200

# Cache
CACHE_EVENT_LIST_TTL=10m
CACHE_EVENT_DETAIL_TTL=15m

# Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Asynq
ASYNQ_REDIS_ADDR=localhost:6379
ASYNQ_CONCURRENCY=10

# Email (untuk demo, bisa pakai SMTP real atau log saja)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
EMAIL_FROM=noreply@eventmanagement.com
```

---

**File:** `internal/config/config.go`

```go
package config

import (
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	Security SecurityConfig
	Cache    CacheConfig
	Upload   UploadConfig
	Asynq    AsynqConfig
	Email    EmailConfig
}

type ServerConfig struct {
	Port int
	Env  string
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

type JWTConfig struct {
	Secret string
	Expiry time.Duration
}

type SecurityConfig struct {
	Environment    string
	AllowedOrigins string
	RateLimit      RateLimitConfig
}

type RateLimitConfig struct {
	Anonymous     int
	Authenticated int
}

type CacheConfig struct {
	EventListTTL   time.Duration
	EventDetailTTL time.Duration
}

type UploadConfig struct {
	Path        string
	MaxFileSize int64
}

type AsynqConfig struct {
	RedisAddr   string
	Concurrency int
}

type EmailConfig struct {
	SMTPHost string
	SMTPPort int
	SMTPUser string
	SMTPPass string
	From     string
}

func Load() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		return nil, err
	}

	jwtExpiry, _ := time.ParseDuration(viper.GetString("JWT_EXPIRY"))
	cacheEventListTTL, _ := time.ParseDuration(viper.GetString("CACHE_EVENT_LIST_TTL"))
	cacheEventDetailTTL, _ := time.ParseDuration(viper.GetString("CACHE_EVENT_DETAIL_TTL"))

	return &Config{
		Server: ServerConfig{
			Port: viper.GetInt("SERVER_PORT"),
			Env:  viper.GetString("SERVER_ENV"),
		},
		Database: DatabaseConfig{
			Host:     viper.GetString("DB_HOST"),
			Port:     viper.GetInt("DB_PORT"),
			User:     viper.GetString("DB_USER"),
			Password: viper.GetString("DB_PASSWORD"),
			DBName:   viper.GetString("DB_NAME"),
		},
		Redis: RedisConfig{
			Host:     viper.GetString("REDIS_HOST"),
			Port:     viper.GetInt("REDIS_PORT"),
			Password: viper.GetString("REDIS_PASSWORD"),
			DB:       viper.GetInt("REDIS_DB"),
		},
		JWT: JWTConfig{
			Secret: viper.GetString("JWT_SECRET"),
			Expiry: jwtExpiry,
		},
		Security: SecurityConfig{
			Environment:    viper.GetString("SERVER_ENV"),
			AllowedOrigins: viper.GetString("CORS_ALLOWED_ORIGINS"),
			RateLimit: RateLimitConfig{
				Anonymous:     viper.GetInt("RATE_LIMIT_ANONYMOUS"),
				Authenticated: viper.GetInt("RATE_LIMIT_AUTHENTICATED"),
			},
		},
		Cache: CacheConfig{
			EventListTTL:   cacheEventListTTL,
			EventDetailTTL: cacheEventDetailTTL,
		},
		Upload: UploadConfig{
			Path:        viper.GetString("UPLOAD_PATH"),
			MaxFileSize: viper.GetInt64("MAX_FILE_SIZE"),
		},
		Asynq: AsynqConfig{
			RedisAddr:   viper.GetString("ASYNQ_REDIS_ADDR"),
			Concurrency: viper.GetInt("ASYNQ_CONCURRENCY"),
		},
		Email: EmailConfig{
			SMTPHost: viper.GetString("SMTP_HOST"),
			SMTPPort: viper.GetInt("SMTP_PORT"),
			SMTPUser: viper.GetString("SMTP_USER"),
			SMTPPass: viper.GetString("SMTP_PASSWORD"),
			From:     viper.GetString("EMAIL_FROM"),
		},
	}, nil
}
```

---

**File:** `internal/database/postgres.go`

```go
package database

import (
	"fmt"
	"log"

	"github.com/yourusername/event-management-api/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func ConnectPostgres(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		return nil, err
	}

	log.Println("✅ PostgreSQL connected")
	return db, nil
}
```

---

**File:** `internal/database/redis.go`

```go
package database

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
	"github.com/yourusername/event-management-api/internal/config"
)

func ConnectRedis(cfg *config.Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
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

---

**File:** `internal/entity/user.go`

```go
package entity

type UserRole string

const (
	RoleOrganizer UserRole = "organizer"
	RoleAttendee  UserRole = "attendee"
)

type User struct {
	BaseModel
	Name     string   `gorm:"size:255;not null" json:"name"`
	Email    string   `gorm:"size:255;uniqueIndex;not null" json:"email"`
	Password string   `gorm:"size:255;not null" json:"-"`
	Role     UserRole `gorm:"type:varchar(20);not null;default:'attendee'" json:"role"`

	// Relationships
	OrganizedEvents []Event  `gorm:"foreignKey:OrganizerID" json:"organized_events,omitempty"`
	Tickets         []Ticket `gorm:"foreignKey:UserID" json:"tickets,omitempty"`
}

func (User) TableName() string {
	return "users"
}
```

---

**File:** `internal/entity/category.go`

```go
package entity

type Category struct {
	BaseModel
	Name string `gorm:"size:100;uniqueIndex;not null" json:"name"`
	Slug string `gorm:"size:100;uniqueIndex;not null" json:"slug"`

	// Relationships
	Events []Event `gorm:"foreignKey:CategoryID" json:"events,omitempty"`
}

func (Category) TableName() string {
	return "categories"
}
```

---

**File:** `internal/entity/event.go`

```go
package entity

import (
	"time"

	"github.com/google/uuid"
)

type EventStatus string

const (
	EventStatusDraft     EventStatus = "draft"
	EventStatusPublished EventStatus = "published"
	EventStatusCancelled EventStatus = "cancelled"
	EventStatusCompleted EventStatus = "completed"
)

type Event struct {
	BaseModel
	OrganizerID uuid.UUID   `gorm:"type:uuid;not null;index" json:"organizer_id"`
	CategoryID  uuid.UUID   `gorm:"type:uuid;not null;index" json:"category_id"`
	Title       string      `gorm:"size:255;not null;index" json:"title"`
	Description string      `gorm:"type:text" json:"description"`
	Location    string      `gorm:"size:255;not null" json:"location"`
	StartTime   time.Time   `gorm:"not null;index" json:"start_time"`
	EndTime     time.Time   `gorm:"not null" json:"end_time"`
	Capacity    int         `gorm:"not null" json:"capacity"`
	Price       float64     `gorm:"type:decimal(10,2);not null" json:"price"`
	BannerURL   string      `gorm:"size:500" json:"banner_url"`
	Status      EventStatus `gorm:"type:varchar(20);not null;default:'draft';index" json:"status"`

	// Relationships
	Organizer User     `gorm:"foreignKey:OrganizerID" json:"organizer,omitempty"`
	Category  Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Tickets   []Ticket `gorm:"foreignKey:EventID" json:"tickets,omitempty"`
}

func (Event) TableName() string {
	return "events"
}

// AvailableTickets menghitung sisa kapasitas
func (e *Event) AvailableTickets() int {
	soldCount := 0
	for _, ticket := range e.Tickets {
		if ticket.Status == TicketStatusValid {
			soldCount++
		}
	}
	return e.Capacity - soldCount
}
```

---

**File:** `internal/entity/ticket.go`

```go
package entity

import (
	"time"

	"github.com/google/uuid"
)

type TicketStatus string

const (
	TicketStatusValid     TicketStatus = "valid"
	TicketStatusCancelled TicketStatus = "cancelled"
	TicketStatusUsed      TicketStatus = "used"
)

type Ticket struct {
	BaseModel
	EventID     uuid.UUID    `gorm:"type:uuid;not null;index" json:"event_id"`
	UserID      uuid.UUID    `gorm:"type:uuid;not null;index" json:"user_id"`
	Code        string       `gorm:"size:20;uniqueIndex;not null" json:"code"`
	Price       float64      `gorm:"type:decimal(10,2);not null" json:"price"`
	Status      TicketStatus `gorm:"type:varchar(20);not null;default:'valid';index" json:"status"`
	PurchasedAt time.Time    `gorm:"not null" json:"purchased_at"`

	// Relationships
	Event Event `gorm:"foreignKey:EventID" json:"event,omitempty"`
	User  User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Ticket) TableName() string {
	return "tickets"
}
```

---

### **Step 3: Repositories**

**File:** `internal/repository/user_repository.go`

```go
package repository

import (
	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/entity"
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

---

**File:** `internal/repository/category_repository.go`

```go
package repository

import (
	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/entity"
	"gorm.io/gorm"
)

type CategoryRepository interface {
	Create(category *entity.Category) error
	FindAll() ([]entity.Category, error)
	FindByID(id uuid.UUID) (*entity.Category, error)
	FindBySlug(slug string) (*entity.Category, error)
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

func (r *categoryRepository) FindAll() ([]entity.Category, error) {
	var categories []entity.Category
	err := r.db.Order("name ASC").Find(&categories).Error
	return categories, err
}

func (r *categoryRepository) FindByID(id uuid.UUID) (*entity.Category, error) {
	var category entity.Category
	err := r.db.First(&category, "id = ?", id).Error
	return &category, err
}

func (r *categoryRepository) FindBySlug(slug string) (*entity.Category, error) {
	var category entity.Category
	err := r.db.Where("slug = ?", slug).First(&category).Error
	return &category, err
}
```

---

**File:** `internal/repository/event_repository.go`

```go
package repository

import (
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/entity"
	"gorm.io/gorm"
)

type EventRepository interface {
	Create(event *entity.Event) error
	Update(event *entity.Event) error
	Delete(id uuid.UUID) error
	FindByID(id uuid.UUID) (*entity.Event, error)
	FindByIDWithLock(tx *gorm.DB, id uuid.UUID) (*entity.Event, error) // For transactions
	FindAll(filter EventFilter) ([]entity.Event, int64, error)
	GetStats(organizerID uuid.UUID) ([]EventStats, error)
	FindDraftOlderThan(days int) ([]entity.Event, error)
}

type EventFilter struct {
	Page      int
	Limit     int
	Status    string
	Location  string
	Search    string
	MinPrice  float64
	MaxPrice  float64
	StartDate *time.Time
	EndDate   *time.Time
	Available bool // Filter hanya event yang masih ada capacity
}

type EventStats struct {
	EventID      uuid.UUID `json:"event_id"`
	EventTitle   string    `json:"event_title"`
	TotalTickets int64     `json:"total_tickets"`
	TotalRevenue float64   `json:"total_revenue"`
}

type eventRepository struct {
	db *gorm.DB
}

func NewEventRepository(db *gorm.DB) EventRepository {
	return &eventRepository{db: db}
}

func (r *eventRepository) Create(event *entity.Event) error {
	return r.db.Create(event).Error
}

func (r *eventRepository) Update(event *entity.Event) error {
	return r.db.Save(event).Error
}

func (r *eventRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&entity.Event{}, "id = ?", id).Error
}

func (r *eventRepository) FindByID(id uuid.UUID) (*entity.Event, error) {
	var event entity.Event
	// FIX N+1: Preload relationships
	err := r.db.Preload("Organizer").Preload("Category").First(&event, "id = ?", id).Error
	return &event, err
}

// FindByIDWithLock untuk transaction (SELECT FOR UPDATE)
func (r *eventRepository) FindByIDWithLock(tx *gorm.DB, id uuid.UUID) (*entity.Event, error) {
	var event entity.Event
	err := tx.Clauses(gorm.Locking{Strength: "UPDATE"}).First(&event, "id = ?", id).Error
	return &event, err
}

func (r *eventRepository) FindAll(filter EventFilter) ([]entity.Event, int64, error) {
	var events []entity.Event
	var total int64

	query := r.db.Model(&entity.Event{})

	// Apply filters
	query = r.applyFilters(query, filter)

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Pagination
	offset := (filter.Page - 1) * filter.Limit

	// FIX N+1: Preload Organizer dan Category
	err := query.Preload("Organizer").Preload("Category").
		Offset(offset).Limit(filter.Limit).
		Order("start_time DESC").
		Find(&events).Error

	return events, total, err
}

func (r *eventRepository) applyFilters(query *gorm.DB, filter EventFilter) *gorm.DB {
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	if filter.Location != "" {
		query = query.Where("location ILIKE ?", "%"+filter.Location+"%")
	}

	if filter.Search != "" {
		query = query.Where("title ILIKE ?", "%"+filter.Search+"%")
	}

	if filter.MinPrice > 0 {
		query = query.Where("price >= ?", filter.MinPrice)
	}

	if filter.MaxPrice > 0 {
		query = query.Where("price <= ?", filter.MaxPrice)
	}

	if filter.StartDate != nil {
		query = query.Where("start_time >= ?", *filter.StartDate)
	}

	if filter.EndDate != nil {
		query = query.Where("end_time <= ?", *filter.EndDate)
	}

	// Filter available: hanya event dengan capacity > sold tickets
	if filter.Available {
		query = query.Where(`capacity > (
			SELECT COUNT(*) FROM tickets 
			WHERE tickets.event_id = events.id 
			AND tickets.status = 'valid'
			AND tickets.deleted_at IS NULL
		)`)
	}

	return query
}

// GetStats returns aggregate stats per event untuk organizer
func (r *eventRepository) GetStats(organizerID uuid.UUID) ([]EventStats, error) {
	var stats []EventStats

	// Single query dengan JOIN + GROUP BY + aggregate functions
	err := r.db.Table("events").
		Select(`
			events.id as event_id,
			events.title as event_title,
			COUNT(tickets.id) as total_tickets,
			COALESCE(SUM(tickets.price), 0) as total_revenue
		`).
		Joins("LEFT JOIN tickets ON tickets.event_id = events.id AND tickets.status = 'valid' AND tickets.deleted_at IS NULL").
		Where("events.organizer_id = ? AND events.deleted_at IS NULL", organizerID).
		Group("events.id, events.title").
		Scan(&stats).Error

	return stats, err
}

func (r *eventRepository) FindDraftOlderThan(days int) ([]entity.Event, error) {
	var events []entity.Event
	cutoffDate := time.Now().AddDate(0, 0, -days)

	err := r.db.Where("status = ? AND created_at < ?", entity.EventStatusDraft, cutoffDate).Find(&events).Error
	return events, err
}
```

---

**File:** `internal/repository/ticket_repository.go`

```go
package repository

import (
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/entity"
	"gorm.io/gorm"
)

type TicketRepository interface {
	Create(ticket *entity.Ticket) error
	Update(ticket *entity.Ticket) error
	FindByID(id uuid.UUID) (*entity.Ticket, error)
	FindByCode(code string) (*entity.Ticket, error)
	FindByUserID(userID uuid.UUID, page, limit int) ([]entity.Ticket, int64, error)
	FindByEventID(eventID uuid.UUID) ([]entity.Ticket, error)
	CountSoldByEventID(eventID uuid.UUID) (int64, error)
	FindTicketsForReminder(eventTime time.Time) ([]entity.Ticket, error)
}

type ticketRepository struct {
	db *gorm.DB
}

func NewTicketRepository(db *gorm.DB) TicketRepository {
	return &ticketRepository{db: db}
}

func (r *ticketRepository) Create(ticket *entity.Ticket) error {
	return r.db.Create(ticket).Error
}

func (r *ticketRepository) Update(ticket *entity.Ticket) error {
	return r.db.Save(ticket).Error
}

func (r *ticketRepository) FindByID(id uuid.UUID) (*entity.Ticket, error) {
	var ticket entity.Ticket
	// FIX N+1: Preload Event dan User
	err := r.db.Preload("Event").Preload("User").First(&ticket, "id = ?", id).Error
	return &ticket, err
}

func (r *ticketRepository) FindByCode(code string) (*entity.Ticket, error) {
	var ticket entity.Ticket
	err := r.db.Preload("Event.Organizer").Preload("User").Where("code = ?", code).First(&ticket).Error
	return &ticket, err
}

func (r *ticketRepository) FindByUserID(userID uuid.UUID, page, limit int) ([]entity.Ticket, int64, error) {
	var tickets []entity.Ticket
	var total int64

	query := r.db.Model(&entity.Ticket{}).Where("user_id = ?", userID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit

	// FIX N+1: Preload Event
	err := query.Preload("Event.Category").
		Offset(offset).Limit(limit).
		Order("purchased_at DESC").
		Find(&tickets).Error

	return tickets, total, err
}

func (r *ticketRepository) FindByEventID(eventID uuid.UUID) ([]entity.Ticket, error) {
	var tickets []entity.Ticket
	// FIX N+1: Preload User untuk export
	err := r.db.Preload("User").
		Where("event_id = ? AND status = ?", eventID, entity.TicketStatusValid).
		Order("purchased_at ASC").
		Find(&tickets).Error
	return tickets, err
}

func (r *ticketRepository) CountSoldByEventID(eventID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&entity.Ticket{}).
		Where("event_id = ? AND status = ?", eventID, entity.TicketStatusValid).
		Count(&count).Error
	return count, err
}

// FindTicketsForReminder mencari tiket untuk event yang akan dimulai dalam 24 jam
func (r *ticketRepository) FindTicketsForReminder(eventTime time.Time) ([]entity.Ticket, error) {
	var tickets []entity.Ticket

	// Cari tickets dengan event yang start_time = eventTime dan status valid
	err := r.db.Preload("Event").Preload("User").
		Joins("JOIN events ON events.id = tickets.event_id").
		Where("tickets.status = ?", entity.TicketStatusValid).
		Where("events.start_time = ? AND events.deleted_at IS NULL", eventTime).
		Find(&tickets).Error

	return tickets, err
}
```

---

### **Step 4: Utilities & DTOs**

**File:** `internal/util/ticket_code.go`

```go
package util

import (
	"fmt"
	"math/rand"
	"time"
)

func GenerateTicketCode() string {
	rand.Seed(time.Now().UnixNano())
	
	// Format: EVT-XXXXXX (6 random uppercase letters + numbers)
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, 6)
	for i := range code {
		code[i] = charset[rand.Intn(len(charset))]
	}
	
	return fmt.Sprintf("EVT-%s", string(code))
}
```

---

**File:** `internal/util/jwt.go`

```go
package util

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/config"
	"github.com/yourusername/event-management-api/internal/entity"
)

type Claims struct {
	UserID uuid.UUID       `json:"user_id"`
	Email  string          `json:"email"`
	Role   entity.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uuid.UUID, email string, role entity.UserRole, cfg *config.Config) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
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

---

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

---

**File:** `internal/util/validator.go`

```go
package util

import (
	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
}

func GetValidator() *validator.Validate {
	return validate
}
```

---

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
	ErrInsufficientCapacity = NewAppError("insufficient ticket capacity", "INSUFFICIENT_CAPACITY", http.StatusBadRequest)
	ErrEventNotPublished  = NewAppError("event is not published", "EVENT_NOT_PUBLISHED", http.StatusBadRequest)
	ErrTicketAlreadyCancelled = NewAppError("ticket already cancelled", "TICKET_CANCELLED", http.StatusBadRequest)
)
```

---

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

**File:** `internal/dto/auth_dto.go`

```go
package dto

import (
	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/entity"
)

type RegisterRequest struct {
	Name     string          `json:"name" validate:"required,min=3"`
	Email    string          `json:"email" validate:"required,email"`
	Password string          `json:"password" validate:"required,min=6"`
	Role     entity.UserRole `json:"role" validate:"required,oneof=organizer attendee"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	Token string  `json:"token"`
	User  UserDTO `json:"user"`
}

type UserDTO struct {
	ID    uuid.UUID       `json:"id"`
	Name  string          `json:"name"`
	Email string          `json:"email"`
	Role  entity.UserRole `json:"role"`
}
```

---

**File:** `internal/dto/event_dto.go`

```go
package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/entity"
)

type CreateEventRequest struct {
	CategoryID  uuid.UUID `json:"category_id" validate:"required"`
	Title       string    `json:"title" validate:"required,min=3"`
	Description string    `json:"description"`
	Location    string    `json:"location" validate:"required"`
	StartTime   time.Time `json:"start_time" validate:"required"`
	EndTime     time.Time `json:"end_time" validate:"required"`
	Capacity    int       `json:"capacity" validate:"required,min=1"`
	Price       float64   `json:"price" validate:"required,min=0"`
	Status      string    `json:"status" validate:"omitempty,oneof=draft published"`
}

type UpdateEventRequest struct {
	CategoryID  *uuid.UUID `json:"category_id"`
	Title       string     `json:"title" validate:"omitempty,min=3"`
	Description string     `json:"description"`
	Location    string     `json:"location"`
	StartTime   *time.Time `json:"start_time"`
	EndTime     *time.Time `json:"end_time"`
	Capacity    *int       `json:"capacity" validate:"omitempty,min=1"`
	Price       *float64   `json:"price" validate:"omitempty,min=0"`
	Status      string     `json:"status" validate:"omitempty,oneof=draft published cancelled completed"`
}

type EventResponse struct {
	ID              uuid.UUID           `json:"id"`
	OrganizerID     uuid.UUID           `json:"organizer_id"`
	Organizer       *UserDTO            `json:"organizer,omitempty"`
	CategoryID      uuid.UUID           `json:"category_id"`
	Category        *CategoryDTO        `json:"category,omitempty"`
	Title           string              `json:"title"`
	Description     string              `json:"description"`
	Location        string              `json:"location"`
	StartTime       time.Time           `json:"start_time"`
	EndTime         time.Time           `json:"end_time"`
	Capacity        int                 `json:"capacity"`
	Price           float64             `json:"price"`
	BannerURL       string              `json:"banner_url"`
	Status          entity.EventStatus  `json:"status"`
	AvailableTickets int                `json:"available_tickets"`
	CreatedAt       time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`
}

type EventListResponse struct {
	ID              uuid.UUID           `json:"id"`
	OrganizerID     uuid.UUID           `json:"organizer_id"`
	Organizer       *UserDTO            `json:"organizer,omitempty"`
	CategoryID      uuid.UUID           `json:"category_id"`
	Category        *CategoryDTO        `json:"category,omitempty"`
	Title           string              `json:"title"`
	Location        string              `json:"location"`
	StartTime       time.Time           `json:"start_time"`
	EndTime         time.Time           `json:"end_time"`
	Capacity        int                 `json:"capacity"`
	Price           float64             `json:"price"`
	BannerURL       string              `json:"banner_url"`
	Status          entity.EventStatus  `json:"status"`
	AvailableTickets int                `json:"available_tickets"`
	CreatedAt       time.Time           `json:"created_at"`
}

type EventStatsResponse struct {
	EventID      uuid.UUID `json:"event_id"`
	EventTitle   string    `json:"event_title"`
	TotalTickets int64     `json:"total_tickets"`
	TotalRevenue float64   `json:"total_revenue"`
}
```

---

**File:** `internal/dto/ticket_dto.go`

```go
package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/entity"
)

type PurchaseTicketRequest struct {
	EventID uuid.UUID `json:"event_id" validate:"required"`
}

type TicketResponse struct {
	ID          uuid.UUID            `json:"id"`
	EventID     uuid.UUID            `json:"event_id"`
	Event       *EventResponse       `json:"event,omitempty"`
	UserID      uuid.UUID            `json:"user_id"`
	User        *UserDTO             `json:"user,omitempty"`
	Code        string               `json:"code"`
	Price       float64              `json:"price"`
	Status      entity.TicketStatus  `json:"status"`
	PurchasedAt time.Time            `json:"purchased_at"`
	CreatedAt   time.Time            `json:"created_at"`
}

type VerifyTicketResponse struct {
	Valid       bool               `json:"valid"`
	Ticket      *TicketResponse    `json:"ticket,omitempty"`
	Message     string             `json:"message,omitempty"`
}
```

---

**File:** `internal/dto/category_dto.go`

```go
package dto

import (
	"time"

	"github.com/google/uuid"
)

type CreateCategoryRequest struct {
	Name string `json:"name" validate:"required,min=2"`
	Slug string `json:"slug" validate:"required,min=2"`
}

type CategoryDTO struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	CreatedAt time.Time `json:"created_at"`
}
```

---

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

### **Step 5: Services (Business Logic dengan Transactions)**

**File:** `internal/service/auth_service.go`

```go
package service

import (
	"errors"

	"github.com/yourusername/event-management-api/internal/config"
	"github.com/yourusername/event-management-api/internal/dto"
	"github.com/yourusername/event-management-api/internal/entity"
	"github.com/yourusername/event-management-api/internal/repository"
	"github.com/yourusername/event-management-api/internal/util"
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
		Role:     req.Role,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Generate token
	token, err := util.GenerateToken(user.ID, user.Email, user.Role, s.cfg)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User: dto.UserDTO{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
			Role:  user.Role,
		},
	}, nil
}

func (s *authService) Login(req dto.LoginRequest) (*dto.AuthResponse, error) {
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
	token, err := util.GenerateToken(user.ID, user.Email, user.Role, s.cfg)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User: dto.UserDTO{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
			Role:  user.Role,
		},
	}, nil
}
```

---

**File:** `internal/service/category_service.go`

```go
package service

import (
	"github.com/yourusername/event-management-api/internal/dto"
	"github.com/yourusername/event-management-api/internal/entity"
	"github.com/yourusername/event-management-api/internal/repository"
)

type CategoryService interface {
	Create(req dto.CreateCategoryRequest) (*dto.CategoryDTO, error)
	GetAll() ([]dto.CategoryDTO, error)
}

type categoryService struct {
	categoryRepo repository.CategoryRepository
}

func NewCategoryService(categoryRepo repository.CategoryRepository) CategoryService {
	return &categoryService{
		categoryRepo: categoryRepo,
	}
}

func (s *categoryService) Create(req dto.CreateCategoryRequest) (*dto.CategoryDTO, error) {
	category := &entity.Category{
		Name: req.Name,
		Slug: req.Slug,
	}

	if err := s.categoryRepo.Create(category); err != nil {
		return nil, err
	}

	return &dto.CategoryDTO{
		ID:        category.ID,
		Name:      category.Name,
		Slug:      category.Slug,
		CreatedAt: category.CreatedAt,
	}, nil
}

func (s *categoryService) GetAll() ([]dto.CategoryDTO, error) {
	categories, err := s.categoryRepo.FindAll()
	if err != nil {
		return nil, err
	}

	var result []dto.CategoryDTO
	for _, cat := range categories {
		result = append(result, dto.CategoryDTO{
			ID:        cat.ID,
			Name:      cat.Name,
			Slug:      cat.Slug,
			CreatedAt: cat.CreatedAt,
		})
	}

	return result, nil
}
```

---

**File:** `internal/service/event_service.go`

```go
package service

import (
	"errors"

	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/dto"
	"github.com/yourusername/event-management-api/internal/entity"
	"github.com/yourusername/event-management-api/internal/repository"
	"github.com/yourusername/event-management-api/internal/util"
	"gorm.io/gorm"
)

type EventService interface {
	Create(organizerID uuid.UUID, req dto.CreateEventRequest) (*dto.EventResponse, error)
	Update(eventID, organizerID uuid.UUID, req dto.UpdateEventRequest) (*dto.EventResponse, error)
	Delete(eventID, organizerID uuid.UUID) error
	GetByID(eventID uuid.UUID) (*dto.EventResponse, error)
	GetAll(filter repository.EventFilter) ([]dto.EventListResponse, dto.PaginationMeta, error)
	GetMyEvents(organizerID uuid.UUID, page, limit int) ([]dto.EventListResponse, dto.PaginationMeta, error)
	GetStats(organizerID uuid.UUID) ([]dto.EventStatsResponse, error)
	UploadBanner(eventID, organizerID uuid.UUID, bannerURL string) (*dto.EventResponse, error)
}

type eventService struct {
	eventRepo    repository.EventRepository
	categoryRepo repository.CategoryRepository
	ticketRepo   repository.TicketRepository
}

func NewEventService(
	eventRepo repository.EventRepository,
	categoryRepo repository.CategoryRepository,
	ticketRepo repository.TicketRepository,
) EventService {
	return &eventService{
		eventRepo:    eventRepo,
		categoryRepo: categoryRepo,
		ticketRepo:   ticketRepo,
	}
}

func (s *eventService) Create(organizerID uuid.UUID, req dto.CreateEventRequest) (*dto.EventResponse, error) {
	// Verify category exists
	_, err := s.categoryRepo.FindByID(req.CategoryID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.NewAppError("category not found", "CATEGORY_NOT_FOUND", 404)
		}
		return nil, err
	}

	status := entity.EventStatusDraft
	if req.Status == "published" {
		status = entity.EventStatusPublished
	}

	event := &entity.Event{
		OrganizerID: organizerID,
		CategoryID:  req.CategoryID,
		Title:       req.Title,
		Description: req.Description,
		Location:    req.Location,
		StartTime:   req.StartTime,
		EndTime:     req.EndTime,
		Capacity:    req.Capacity,
		Price:       req.Price,
		Status:      status,
	}

	if err := s.eventRepo.Create(event); err != nil {
		return nil, err
	}

	// Reload with relationships
	event, err = s.eventRepo.FindByID(event.ID)
	if err != nil {
		return nil, err
	}

	return s.toEventResponse(event), nil
}

func (s *eventService) Update(eventID, organizerID uuid.UUID, req dto.UpdateEventRequest) (*dto.EventResponse, error) {
	// Find event
	event, err := s.eventRepo.FindByID(eventID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.ErrNotFound
		}
		return nil, err
	}

	// Check ownership
	if event.OrganizerID != organizerID {
		return nil, util.ErrForbidden
	}

	// Update fields
	if req.CategoryID != nil {
		event.CategoryID = *req.CategoryID
	}
	if req.Title != "" {
		event.Title = req.Title
	}
	if req.Description != "" {
		event.Description = req.Description
	}
	if req.Location != "" {
		event.Location = req.Location
	}
	if req.StartTime != nil {
		event.StartTime = *req.StartTime
	}
	if req.EndTime != nil {
		event.EndTime = *req.EndTime
	}
	if req.Capacity != nil {
		event.Capacity = *req.Capacity
	}
	if req.Price != nil {
		event.Price = *req.Price
	}
	if req.Status != "" {
		event.Status = entity.EventStatus(req.Status)
	}

	if err := s.eventRepo.Update(event); err != nil {
		return nil, err
	}

	// Reload with relationships
	event, err = s.eventRepo.FindByID(event.ID)
	if err != nil {
		return nil, err
	}

	return s.toEventResponse(event), nil
}

func (s *eventService) Delete(eventID, organizerID uuid.UUID) error {
	// Find event
	event, err := s.eventRepo.FindByID(eventID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return util.ErrNotFound
		}
		return err
	}

	// Check ownership
	if event.OrganizerID != organizerID {
		return util.ErrForbidden
	}

	return s.eventRepo.Delete(eventID)
}

func (s *eventService) GetByID(eventID uuid.UUID) (*dto.EventResponse, error) {
	event, err := s.eventRepo.FindByID(eventID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.ErrNotFound
		}
		return nil, err
	}

	return s.toEventResponse(event), nil
}

func (s *eventService) GetAll(filter repository.EventFilter) ([]dto.EventListResponse, dto.PaginationMeta, error) {
	events, total, err := s.eventRepo.FindAll(filter)
	if err != nil {
		return nil, dto.PaginationMeta{}, err
	}

	return s.toEventListResponse(events), dto.NewPaginationMeta(filter.Page, filter.Limit, total), nil
}

func (s *eventService) GetMyEvents(organizerID uuid.UUID, page, limit int) ([]dto.EventListResponse, dto.PaginationMeta, error) {
	filter := repository.EventFilter{
		Page:  page,
		Limit: limit,
	}

	// Add custom filter for organizer (modify repository to support this)
	events, total, err := s.eventRepo.FindAll(filter)
	if err != nil {
		return nil, dto.PaginationMeta{}, err
	}

	// Filter by organizer manually (or add to repository)
	var myEvents []entity.Event
	for _, event := range events {
		if event.OrganizerID == organizerID {
			myEvents = append(myEvents, event)
		}
	}

	return s.toEventListResponse(myEvents), dto.NewPaginationMeta(page, limit, total), nil
}

func (s *eventService) GetStats(organizerID uuid.UUID) ([]dto.EventStatsResponse, error) {
	stats, err := s.eventRepo.GetStats(organizerID)
	if err != nil {
		return nil, err
	}

	var result []dto.EventStatsResponse
	for _, stat := range stats {
		result = append(result, dto.EventStatsResponse{
			EventID:      stat.EventID,
			EventTitle:   stat.EventTitle,
			TotalTickets: stat.TotalTickets,
			TotalRevenue: stat.TotalRevenue,
		})
	}

	return result, nil
}

func (s *eventService) UploadBanner(eventID, organizerID uuid.UUID, bannerURL string) (*dto.EventResponse, error) {
	// Find event
	event, err := s.eventRepo.FindByID(eventID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.ErrNotFound
		}
		return nil, err
	}

	// Check ownership
	if event.OrganizerID != organizerID {
		return nil, util.ErrForbidden
	}

	event.BannerURL = bannerURL

	if err := s.eventRepo.Update(event); err != nil {
		return nil, err
	}

	return s.toEventResponse(event), nil
}

func (s *eventService) toEventResponse(event *entity.Event) *dto.EventResponse {
	// Calculate available tickets
	soldCount, _ := s.ticketRepo.CountSoldByEventID(event.ID)
	availableTickets := event.Capacity - int(soldCount)

	response := &dto.EventResponse{
		ID:               event.ID,
		OrganizerID:      event.OrganizerID,
		CategoryID:       event.CategoryID,
		Title:            event.Title,
		Description:      event.Description,
		Location:         event.Location,
		StartTime:        event.StartTime,
		EndTime:          event.EndTime,
		Capacity:         event.Capacity,
		Price:            event.Price,
		BannerURL:        event.BannerURL,
		Status:           event.Status,
		AvailableTickets: availableTickets,
		CreatedAt:        event.CreatedAt,
		UpdatedAt:        event.UpdatedAt,
	}

	if event.Organizer.ID != uuid.Nil {
		response.Organizer = &dto.UserDTO{
			ID:    event.Organizer.ID,
			Name:  event.Organizer.Name,
			Email: event.Organizer.Email,
			Role:  event.Organizer.Role,
		}
	}

	if event.Category.ID != uuid.Nil {
		response.Category = &dto.CategoryDTO{
			ID:   event.Category.ID,
			Name: event.Category.Name,
			Slug: event.Category.Slug,
		}
	}

	return response
}

func (s *eventService) toEventListResponse(events []entity.Event) []dto.EventListResponse {
	var result []dto.EventListResponse

	for _, event := range events {
		soldCount, _ := s.ticketRepo.CountSoldByEventID(event.ID)
		availableTickets := event.Capacity - int(soldCount)

		item := dto.EventListResponse{
			ID:               event.ID,
			OrganizerID:      event.OrganizerID,
			CategoryID:       event.CategoryID,
			Title:            event.Title,
			Location:         event.Location,
			StartTime:        event.StartTime,
			EndTime:          event.EndTime,
			Capacity:         event.Capacity,
			Price:            event.Price,
			BannerURL:        event.BannerURL,
			Status:           event.Status,
			AvailableTickets: availableTickets,
			CreatedAt:        event.CreatedAt,
		}

		if event.Organizer.ID != uuid.Nil {
			item.Organizer = &dto.UserDTO{
				ID:    event.Organizer.ID,
				Name:  event.Organizer.Name,
				Email: event.Organizer.Email,
				Role:  event.Organizer.Role,
			}
		}

		if event.Category.ID != uuid.Nil {
			item.Category = &dto.CategoryDTO{
				ID:   event.Category.ID,
				Name: event.Category.Name,
				Slug: event.Category.Slug,
			}
		}

		result = append(result, item)
	}

	return result
}
```

---

**File:** `internal/service/ticket_service.go`

```go
package service

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/yourusername/event-management-api/internal/dto"
	"github.com/yourusername/event-management-api/internal/entity"
	"github.com/yourusername/event-management-api/internal/repository"
	"github.com/yourusername/event-management-api/internal/util"
	"gorm.io/gorm"
)

type TicketService interface {
	PurchaseTicket(userID uuid.UUID, req dto.PurchaseTicketRequest) (*dto.TicketResponse, error)
	CancelTicket(ticketID, userID uuid.UUID) error
	GetMyTickets(userID uuid.UUID, page, limit int) ([]dto.TicketResponse, dto.PaginationMeta, error)
	VerifyTicket(code string) (*dto.VerifyTicketResponse, error)
}

type ticketService struct {
	db          *gorm.DB
	ticketRepo  repository.TicketRepository
	eventRepo   repository.EventRepository
}

func NewTicketService(
	db *gorm.DB,
	ticketRepo repository.TicketRepository,
	eventRepo repository.EventRepository,
) TicketService {
	return &ticketService{
		db:         db,
		ticketRepo: ticketRepo,
		eventRepo:  eventRepo,
	}
}

// PurchaseTicket - ATOMIC TRANSACTION dengan ROW LOCKING
// Langkah:
// 1. Begin transaction
// 2. SELECT event FOR UPDATE (lock row to prevent race condition)
// 3. Check capacity
// 4. Decrease capacity (implicit in validation)
// 5. Create ticket
// 6. Commit (atau Rollback jika ada error)
func (s *ticketService) PurchaseTicket(userID uuid.UUID, req dto.PurchaseTicketRequest) (*dto.TicketResponse, error) {
	var ticket *entity.Ticket

	// Start transaction
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Lock event row (SELECT FOR UPDATE)
		event, err := s.eventRepo.FindByIDWithLock(tx, req.EventID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return util.ErrNotFound
			}
			return err
		}

		// 2. Validate event status
		if event.Status != entity.EventStatusPublished {
			return util.ErrEventNotPublished
		}

		// 3. Check capacity (with row lock, no race condition)
		soldCount, err := s.ticketRepo.CountSoldByEventID(event.ID)
		if err != nil {
			return err
		}

		if int(soldCount) >= event.Capacity {
			return util.ErrInsufficientCapacity
		}

		// 4. Generate unique ticket code
		ticketCode := util.GenerateTicketCode()

		// 5. Create ticket
		ticket = &entity.Ticket{
			EventID:     event.ID,
			UserID:      userID,
			Code:        ticketCode,
			Price:       event.Price,
			Status:      entity.TicketStatusValid,
			PurchasedAt: time.Now(),
		}

		if err := s.ticketRepo.Create(ticket); err != nil {
			return err
		}

		log.Info().
			Str("ticket_code", ticketCode).
			Str("event_id", event.ID.String()).
			Str("user_id", userID.String()).
			Msg("Ticket purchased successfully")

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Reload ticket with relationships
	ticket, err = s.ticketRepo.FindByID(ticket.ID)
	if err != nil {
		return nil, err
	}

	return s.toTicketResponse(ticket), nil
}

// CancelTicket - ATOMIC TRANSACTION untuk restore capacity
// Langkah:
// 1. Begin transaction
// 2. Find ticket dan validate ownership
// 3. Soft delete ticket (status = cancelled)
// 4. Capacity otomatis restored karena CountSoldByEventID hanya hitung status=valid
// 5. Commit
func (s *ticketService) CancelTicket(ticketID, userID uuid.UUID) error {
	// Start transaction
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Find ticket
		var ticket entity.Ticket
		if err := tx.First(&ticket, "id = ?", ticketID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return util.ErrNotFound
			}
			return err
		}

		// 2. Check ownership
		if ticket.UserID != userID {
			return util.ErrForbidden
		}

		// 3. Check if already cancelled
		if ticket.Status == entity.TicketStatusCancelled {
			return util.ErrTicketAlreadyCancelled
		}

		// 4. Update status to cancelled (soft cancel)
		ticket.Status = entity.TicketStatusCancelled

		if err := tx.Save(&ticket).Error; err != nil {
			return err
		}

		log.Info().
			Str("ticket_id", ticketID.String()).
			Str("user_id", userID.String()).
			Msg("Ticket cancelled successfully")

		return nil
	})
}

func (s *ticketService) GetMyTickets(userID uuid.UUID, page, limit int) ([]dto.TicketResponse, dto.PaginationMeta, error) {
	tickets, total, err := s.ticketRepo.FindByUserID(userID, page, limit)
	if err != nil {
		return nil, dto.PaginationMeta{}, err
	}

	var result []dto.TicketResponse
	for _, ticket := range tickets {
		result = append(result, *s.toTicketResponse(&ticket))
	}

	return result, dto.NewPaginationMeta(page, limit, total), nil
}

func (s *ticketService) VerifyTicket(code string) (*dto.VerifyTicketResponse, error) {
	ticket, err := s.ticketRepo.FindByCode(code)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &dto.VerifyTicketResponse{
				Valid:   false,
				Message: "Ticket not found",
			}, nil
		}
		return nil, err
	}

	// Check if ticket is valid
	if ticket.Status != entity.TicketStatusValid {
		return &dto.VerifyTicketResponse{
			Valid:   false,
			Ticket:  s.toTicketResponse(ticket),
			Message: "Ticket is " + string(ticket.Status),
		}, nil
	}

	// Check if event has started
	if time.Now().After(ticket.Event.EndTime) {
		return &dto.VerifyTicketResponse{
			Valid:   false,
			Ticket:  s.toTicketResponse(ticket),
			Message: "Event has ended",
		}, nil
	}

	return &dto.VerifyTicketResponse{
		Valid:   true,
		Ticket:  s.toTicketResponse(ticket),
		Message: "Ticket is valid",
	}, nil
}

func (s *ticketService) toTicketResponse(ticket *entity.Ticket) *dto.TicketResponse {
	response := &dto.TicketResponse{
		ID:          ticket.ID,
		EventID:     ticket.EventID,
		UserID:      ticket.UserID,
		Code:        ticket.Code,
		Price:       ticket.Price,
		Status:      ticket.Status,
		PurchasedAt: ticket.PurchasedAt,
		CreatedAt:   ticket.CreatedAt,
	}

	if ticket.Event.ID != uuid.Nil {
		event := &dto.EventResponse{
			ID:          ticket.Event.ID,
			Title:       ticket.Event.Title,
			Location:    ticket.Event.Location,
			StartTime:   ticket.Event.StartTime,
			EndTime:     ticket.Event.EndTime,
			Status:      ticket.Event.Status,
		}
		response.Event = event
	}

	if ticket.User.ID != uuid.Nil {
		user := &dto.UserDTO{
			ID:    ticket.User.ID,
			Name:  ticket.User.Name,
			Email: ticket.User.Email,
			Role:  ticket.User.Role,
		}
		response.User = user
	}

	return response
}
```

---

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
		return err
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

**File:** `internal/service/upload_service.go`

```go
package service

import (
	"fmt"
	"image"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/config"
	"github.com/yourusername/event-management-api/internal/util"
)

type UploadService interface {
	UploadBanner(fileHeader *multipart.FileHeader) (string, error)
}

type uploadService struct {
	cfg *config.Config
}

func NewUploadService(cfg *config.Config) UploadService {
	return &uploadService{
		cfg: cfg,
	}
}

func (s *uploadService) UploadBanner(fileHeader *multipart.FileHeader) (string, error) {
	// Validate file type
	if !s.isValidImageType(fileHeader.Filename) {
		return "", util.ErrInvalidFileType
	}

	// Validate file size
	if fileHeader.Size > s.cfg.Upload.MaxFileSize {
		return "", util.ErrFileTooLarge
	}

	// Open file
	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	// Decode image
	img, _, err := image.Decode(file)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %w", err)
	}

	// Resize to 1200x630 (optimal for banner)
	resizedImg := imaging.Fill(img, 1200, 630, imaging.Center, imaging.Lanczos)

	// Generate unique filename
	filename := fmt.Sprintf("%s_%s", uuid.New().String(), filepath.Base(fileHeader.Filename))
	uploadPath := filepath.Join(s.cfg.Upload.Path, filename)

	// Create upload directory if not exists
	if err := os.MkdirAll(s.cfg.Upload.Path, os.ModePerm); err != nil {
		return "", err
	}

	// Save resized image
	if err := imaging.Save(resizedImg, uploadPath); err != nil {
		return "", err
	}

	// Generate URL
	bannerURL := fmt.Sprintf("/uploads/%s", filename)
	return bannerURL, nil
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

**File:** `internal/service/export_service.go`

```go
package service

import (
	"fmt"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
	"github.com/yourusername/event-management-api/internal/repository"
)

type ExportService interface {
	ExportAttendees(eventID uuid.UUID) (string, error)
}

type exportService struct {
	ticketRepo repository.TicketRepository
	eventRepo  repository.EventRepository
}

func NewExportService(ticketRepo repository.TicketRepository, eventRepo repository.EventRepository) ExportService {
	return &exportService{
		ticketRepo: ticketRepo,
		eventRepo:  eventRepo,
	}
}

func (s *exportService) ExportAttendees(eventID uuid.UUID) (string, error) {
	// Get event
	event, err := s.eventRepo.FindByID(eventID)
	if err != nil {
		return "", err
	}

	// Get all tickets for this event
	tickets, err := s.ticketRepo.FindByEventID(eventID)
	if err != nil {
		return "", err
	}

	// Create Excel file
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Attendees"
	index, _ := f.NewSheet(sheetName)

	// Set headers
	f.SetCellValue(sheetName, "A1", "No")
	f.SetCellValue(sheetName, "B1", "Name")
	f.SetCellValue(sheetName, "C1", "Email")
	f.SetCellValue(sheetName, "D1", "Ticket Code")
	f.SetCellValue(sheetName, "E1", "Price")
	f.SetCellValue(sheetName, "F1", "Purchased At")

	// Fill data
	for i, ticket := range tickets {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), ticket.User.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), ticket.User.Email)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), ticket.Code)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), ticket.Price)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), ticket.PurchasedAt.Format("2006-01-02 15:04:05"))
	}

	f.SetActiveSheet(index)

	// Save file
	filename := fmt.Sprintf("attendees_%s_%s.xlsx", event.Title, uuid.New().String())
	filepath := fmt.Sprintf("./uploads/%s", filename)

	if err := f.SaveAs(filepath); err != nil {
		return "", err
	}

	return fmt.Sprintf("/uploads/%s", filename), nil
}
```

---

### **Step 6: Handlers**

Karena handlers cukup panjang dan struktur mirip dengan Project 1, saya akan fokus ke **handlers unik untuk project ini** (event, ticket, stats).

**File:** `internal/handler/event_handler.go`

```go
package handler

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/dto"
	"github.com/yourusername/event-management-api/internal/repository"
	"github.com/yourusername/event-management-api/internal/service"
	"github.com/yourusername/event-management-api/internal/util"
)

type EventHandler struct {
	eventService  service.EventService
	uploadService service.UploadService
	exportService service.ExportService
}

func NewEventHandler(
	eventService service.EventService,
	uploadService service.UploadService,
	exportService service.ExportService,
) *EventHandler {
	return &EventHandler{
		eventService:  eventService,
		uploadService: uploadService,
		exportService: exportService,
	}
}

func (h *EventHandler) Create(c *fiber.Ctx) error {
	organizerID := c.Locals("userID").(uuid.UUID)

	var req dto.CreateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	response, err := h.eventService.Create(organizerID, req)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(util.Response{
		Success: true,
		Data:    response,
	})
}

func (h *EventHandler) Update(c *fiber.Ctx) error {
	organizerID := c.Locals("userID").(uuid.UUID)
	eventID, _ := uuid.Parse(c.Params("id"))

	var req dto.UpdateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	response, err := h.eventService.Update(eventID, organizerID, req)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, response)
}

func (h *EventHandler) Delete(c *fiber.Ctx) error {
	organizerID := c.Locals("userID").(uuid.UUID)
	eventID, _ := uuid.Parse(c.Params("id"))

	if err := h.eventService.Delete(eventID, organizerID); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{"message": "event deleted"})
}

func (h *EventHandler) GetByID(c *fiber.Ctx) error {
	eventID, _ := uuid.Parse(c.Params("id"))

	response, err := h.eventService.GetByID(eventID)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, response)
}

func (h *EventHandler) GetAll(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	minPrice, _ := strconv.ParseFloat(c.Query("min_price", "0"), 64)
	maxPrice, _ := strconv.ParseFloat(c.Query("max_price", "0"), 64)
	available := c.Query("available") == "true"

	var startDate, endDate *time.Time
	if c.Query("start_date") != "" {
		parsed, _ := time.Parse("2006-01-02", c.Query("start_date"))
		startDate = &parsed
	}
	if c.Query("end_date") != "" {
		parsed, _ := time.Parse("2006-01-02", c.Query("end_date"))
		endDate = &parsed
	}

	filter := repository.EventFilter{
		Page:      page,
		Limit:     limit,
		Status:    c.Query("status"),
		Location:  c.Query("location"),
		Search:    c.Query("search"),
		MinPrice:  minPrice,
		MaxPrice:  maxPrice,
		StartDate: startDate,
		EndDate:   endDate,
		Available: available,
	}

	events, meta, err := h.eventService.GetAll(filter)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponseWithMeta(c, events, meta)
}

func (h *EventHandler) GetMyEvents(c *fiber.Ctx) error {
	organizerID := c.Locals("userID").(uuid.UUID)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	events, meta, err := h.eventService.GetMyEvents(organizerID, page, limit)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponseWithMeta(c, events, meta)
}

func (h *EventHandler) GetStats(c *fiber.Ctx) error {
	organizerID := c.Locals("userID").(uuid.UUID)

	stats, err := h.eventService.GetStats(organizerID)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, stats)
}

func (h *EventHandler) UploadBanner(c *fiber.Ctx) error {
	organizerID := c.Locals("userID").(uuid.UUID)
	eventID, _ := uuid.Parse(c.Params("id"))

	fileHeader, err := c.FormFile("banner")
	if err != nil {
		return util.ErrorResponse(c, util.NewAppError("no file provided", "NO_FILE", 400))
	}

	bannerURL, err := h.uploadService.UploadBanner(fileHeader)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	response, err := h.eventService.UploadBanner(eventID, organizerID, bannerURL)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, response)
}

func (h *EventHandler) ExportAttendees(c *fiber.Ctx) error {
	eventID, _ := uuid.Parse(c.Params("id"))

	fileURL, err := h.exportService.ExportAttendees(eventID)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"file_url": fileURL,
	})
}
```

---

**File:** `internal/handler/ticket_handler.go`

```go
package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/event-management-api/internal/dto"
	"github.com/yourusername/event-management-api/internal/service"
	"github.com/yourusername/event-management-api/internal/util"
)

type TicketHandler struct {
	ticketService service.TicketService
}

func NewTicketHandler(ticketService service.TicketService) *TicketHandler {
	return &TicketHandler{
		ticketService: ticketService,
	}
}

func (h *TicketHandler) Purchase(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)

	var req dto.PurchaseTicketRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	response, err := h.ticketService.PurchaseTicket(userID, req)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(util.Response{
		Success: true,
		Data:    response,
	})
}

func (h *TicketHandler) Cancel(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	ticketID, _ := uuid.Parse(c.Params("id"))

	if err := h.ticketService.CancelTicket(ticketID, userID); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{"message": "ticket cancelled"})
}

func (h *TicketHandler) GetMyTickets(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uuid.UUID)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	tickets, meta, err := h.ticketService.GetMyTickets(userID, page, limit)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponseWithMeta(c, tickets, meta)
}

func (h *TicketHandler) Verify(c *fiber.Ctx) error {
	code := c.Params("code")

	response, err := h.ticketService.VerifyTicket(code)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, response)
}
```

---

### **Step 7: Middleware (Auth + Role)**

Auth middleware sudah ada di Project 1, sekarang tambahkan **role middleware**:

**File:** `internal/middleware/role_middleware.go`

```go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/event-management-api/internal/entity"
	"github.com/yourusername/event-management-api/internal/util"
)

func RequireRole(roles ...entity.UserRole) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole := c.Locals("role").(entity.UserRole)

		for _, role := range roles {
			if userRole == role {
				return c.Next()
			}
		}

		return util.ErrorResponse(c, util.ErrForbidden)
	}
}
```

---

**File:** `internal/middleware/auth_middleware.go`

```go
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/event-management-api/internal/config"
	"github.com/yourusername/event-management-api/internal/util"
)

func AuthMiddleware(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return util.ErrorResponse(c, util.ErrUnauthorized)
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return util.ErrorResponse(c, util.ErrUnauthorized)
		}

		tokenString := parts[1]

		claims, err := util.ValidateToken(tokenString, cfg)
		if err != nil {
			return util.ErrorResponse(c, util.ErrUnauthorized)
		}

		c.Locals("userID", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}
```

---

### **Step 8: Background Jobs dengan Asynq**

**File:** `internal/worker/client.go`

```go
package worker

import (
	"github.com/hibiken/asynq"
	"github.com/yourusername/event-management-api/internal/config"
)

func NewAsynqClient(cfg *config.Config) *asynq.Client {
	return asynq.NewClient(asynq.RedisClientOpt{
		Addr: cfg.Asynq.RedisAddr,
	})
}
```

---

**File:** `internal/worker/tasks/email_confirmation.go`

```go
package tasks

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
)

const (
	TypeEmailConfirmation = "email:confirmation"
)

type EmailConfirmationPayload struct {
	UserEmail  string  `json:"user_email"`
	UserName   string  `json:"user_name"`
	EventTitle string  `json:"event_title"`
	TicketCode string  `json:"ticket_code"`
	Price      float64 `json:"price"`
}

// NewEmailConfirmationTask creates a new task untuk kirim email konfirmasi
func NewEmailConfirmationTask(payload EmailConfirmationPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return asynq.NewTask(TypeEmailConfirmation, data), nil
}

// HandleEmailConfirmationTask processes email confirmation task
func HandleEmailConfirmationTask(ctx context.Context, t *asynq.Task) error {
	var payload EmailConfirmationPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return err
	}

	log.Info().
		Str("email", payload.UserEmail).
		Str("ticket_code", payload.TicketCode).
		Msg("Processing email confirmation task")

	// TODO: Integration dengan SMTP real (untuk demo, kita log saja)
	emailContent := fmt.Sprintf(`
		Hi %s,

		Your ticket purchase is successful!

		Event: %s
		Ticket Code: %s
		Price: $%.2f

		Thank you for using our service.
	`, payload.UserName, payload.EventTitle, payload.TicketCode, payload.Price)

	log.Info().Str("email_content", emailContent).Msg("Email sent successfully")

	return nil
}
```

---

**File:** `internal/worker/tasks/email_reminder.go`

```go
package tasks

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
)

const (
	TypeEmailReminder = "email:reminder"
)

type EmailReminderPayload struct {
	UserEmail  string    `json:"user_email"`
	UserName   string    `json:"user_name"`
	EventTitle string    `json:"event_title"`
	StartTime  time.Time `json:"start_time"`
	Location   string    `json:"location"`
}

func NewEmailReminderTask(payload EmailReminderPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return asynq.NewTask(TypeEmailReminder, data), nil
}

func HandleEmailReminderTask(ctx context.Context, t *asynq.Task) error {
	var payload EmailReminderPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return err
	}

	log.Info().
		Str("email", payload.UserEmail).
		Str("event", payload.EventTitle).
		Msg("Processing reminder email task")

	emailContent := fmt.Sprintf(`
		Hi %s,

		Reminder: Your event is starting tomorrow!

		Event: %s
		Start Time: %s
		Location: %s

		Don't forget to bring your ticket!
	`, payload.UserName, payload.EventTitle, payload.StartTime.Format("2006-01-02 15:04"), payload.Location)

	log.Info().Str("email_content", emailContent).Msg("Reminder email sent")

	return nil
}
```

---

**File:** `internal/worker/tasks/email_sold_out.go`

```go
package tasks

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
)

const (
	TypeEmailSoldOut = "email:sold_out"
)

type EmailSoldOutPayload struct {
	OrganizerEmail string `json:"organizer_email"`
	OrganizerName  string `json:"organizer_name"`
	EventTitle     string `json:"event_title"`
	TotalSold      int    `json:"total_sold"`
}

func NewEmailSoldOutTask(payload EmailSoldOutPayload) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return asynq.NewTask(TypeEmailSoldOut, data), nil
}

func HandleEmailSoldOutTask(ctx context.Context, t *asynq.Task) error {
	var payload EmailSoldOutPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return err
	}

	log.Info().
		Str("email", payload.OrganizerEmail).
		Str("event", payload.EventTitle).
		Msg("Processing sold out notification")

	emailContent := fmt.Sprintf(`
		Hi %s,

		Congratulations! Your event is SOLD OUT!

		Event: %s
		Total Tickets Sold: %d

		Great job!
	`, payload.OrganizerName, payload.EventTitle, payload.TotalSold)

	log.Info().Str("email_content", emailContent).Msg("Sold out email sent")

	return nil
}
```

---

**File:** `internal/worker/tasks/cleanup_draft.go`

```go
package tasks

import (
	"context"
	"encoding/json"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
	"github.com/yourusername/event-management-api/internal/repository"
)

const (
	TypeCleanupDraft = "cleanup:draft"
)

type CleanupDraftPayload struct {
	DaysOld int `json:"days_old"`
}

func NewCleanupDraftTask(daysOld int) (*asynq.Task, error) {
	payload := CleanupDraftPayload{DaysOld: daysOld}
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	return asynq.NewTask(TypeCleanupDraft, data), nil
}

// HandleCleanupDraftTask akan dipanggil dari worker handler
// Repository perlu di-inject dari main worker
func HandleCleanupDraftTask(eventRepo repository.EventRepository) func(context.Context, *asynq.Task) error {
	return func(ctx context.Context, t *asynq.Task) error {
		var payload CleanupDraftPayload
		if err := json.Unmarshal(t.Payload(), &payload); err != nil {
			return err
		}

		log.Info().Int("days_old", payload.DaysOld).Msg("Processing draft cleanup task")

		// Find draft events older than X days
		events, err := eventRepo.FindDraftOlderThan(payload.DaysOld)
		if err != nil {
			return err
		}

		// Delete old drafts
		for _, event := range events {
			if err := eventRepo.Delete(event.ID); err != nil {
				log.Error().Err(err).Str("event_id", event.ID.String()).Msg("Failed to delete draft event")
				continue
			}

			log.Info().
				Str("event_id", event.ID.String()).
				Str("title", event.Title).
				Msg("Draft event deleted")
		}

		log.Info().Int("count", len(events)).Msg("Draft cleanup completed")
		return nil
	}
}
```

---

**File:** `internal/worker/handler.go`

```go
package worker

import (
	"github.com/hibiken/asynq"
	"github.com/yourusername/event-management-api/internal/repository"
	"github.com/yourusername/event-management-api/internal/worker/tasks"
)

func NewTaskHandler(eventRepo repository.EventRepository) *asynq.ServeMux {
	mux := asynq.NewServeMux()

	mux.HandleFunc(tasks.TypeEmailConfirmation, tasks.HandleEmailConfirmationTask)
	mux.HandleFunc(tasks.TypeEmailReminder, tasks.HandleEmailReminderTask)
	mux.HandleFunc(tasks.TypeEmailSoldOut, tasks.HandleEmailSoldOutTask)
	mux.HandleFunc(tasks.TypeCleanupDraft, tasks.HandleCleanupDraftTask(eventRepo))

	return mux
}
```

---

### **Step 9: Cron Scheduler**

**File:** `internal/scheduler/cron.go`

```go
package scheduler

import (
	"time"

	"github.com/hibiken/asynq"
	"github.com/robfig/cron/v3"
	"github.com/rs/zerolog/log"
	"github.com/yourusername/event-management-api/internal/repository"
	"github.com/yourusername/event-management-api/internal/worker/tasks"
)

type Scheduler struct {
	cron        *cron.Cron
	asynqClient *asynq.Client
	ticketRepo  repository.TicketRepository
}

func NewScheduler(asynqClient *asynq.Client, ticketRepo repository.TicketRepository) *Scheduler {
	return &Scheduler{
		cron:        cron.New(),
		asynqClient: asynqClient,
		ticketRepo:  ticketRepo,
	}
}

func (s *Scheduler) Start() {
	// Job 1: Reminder H-1 (cek setiap jam)
	s.cron.AddFunc("0 * * * *", s.sendEventReminders)

	// Job 2: Cleanup draft event (setiap tengah malam)
	s.cron.AddFunc("0 0 * * *", s.cleanupDraftEvents)

	s.cron.Start()
	log.Info().Msg("Cron scheduler started")
}

func (s *Scheduler) Stop() {
	s.cron.Stop()
	log.Info().Msg("Cron scheduler stopped")
}

// sendEventReminders mencari event yang akan dimulai dalam 24 jam
func (s *Scheduler) sendEventReminders() {
	log.Info().Msg("Running event reminder job")

	// Cari event yang start_time = besok
	tomorrow := time.Now().Add(24 * time.Hour)
	tomorrowDate := time.Date(tomorrow.Year(), tomorrow.Month(), tomorrow.Day(), 0, 0, 0, 0, tomorrow.Location())

	// Find all tickets untuk event besok
	tickets, err := s.ticketRepo.FindTicketsForReminder(tomorrowDate)
	if err != nil {
		log.Error().Err(err).Msg("Failed to find tickets for reminder")
		return
	}

	log.Info().Int("count", len(tickets)).Msg("Found tickets for reminder")

	// Enqueue reminder tasks
	for _, ticket := range tickets {
		payload := tasks.EmailReminderPayload{
			UserEmail:  ticket.User.Email,
			UserName:   ticket.User.Name,
			EventTitle: ticket.Event.Title,
			StartTime:  ticket.Event.StartTime,
			Location:   ticket.Event.Location,
		}

		task, err := tasks.NewEmailReminderTask(payload)
		if err != nil {
			log.Error().Err(err).Msg("Failed to create reminder task")
			continue
		}

		if _, err := s.asynqClient.Enqueue(task); err != nil {
			log.Error().Err(err).Msg("Failed to enqueue reminder task")
			continue
		}

		log.Info().Str("email", ticket.User.Email).Msg("Reminder task enqueued")
	}
}

// cleanupDraftEvents menghapus draft > 30 hari
func (s *Scheduler) cleanupDraftEvents() {
	log.Info().Msg("Running draft cleanup job")

	task, err := tasks.NewCleanupDraftTask(30)
	if err != nil {
		log.Error().Err(err).Msg("Failed to create cleanup task")
		return
	}

	if _, err := s.asynqClient.Enqueue(task); err != nil {
		log.Error().Err(err).Msg("Failed to enqueue cleanup task")
		return
	}

	log.Info().Msg("Cleanup task enqueued")
}
```

---

### **Step 10: Routes**

**File:** `internal/routes/routes.go`

```go
package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/event-management-api/internal/config"
	"github.com/yourusername/event-management-api/internal/entity"
	"github.com/yourusername/event-management-api/internal/handler"
	"github.com/yourusername/event-management-api/internal/middleware"
)

func SetupRoutes(
	app *fiber.App,
	cfg *config.Config,
	authHandler *handler.AuthHandler,
	eventHandler *handler.EventHandler,
	ticketHandler *handler.TicketHandler,
	categoryHandler *handler.CategoryHandler,
) {
	api := app.Group("/api/v1")

	// Public routes
	api.Post("/auth/register", authHandler.Register)
	api.Post("/auth/login", authHandler.Login)

	// Public event routes
	api.Get("/events", eventHandler.GetAll)
	api.Get("/events/:id", eventHandler.GetByID)

	// Public categories
	api.Get("/categories", categoryHandler.GetAll)

	// Public ticket verification
	api.Get("/tickets/:code/verify", ticketHandler.Verify)

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(cfg))

	// Attendee routes (beli & cancel tiket)
	protected.Post("/tickets", ticketHandler.Purchase)
	protected.Delete("/tickets/:id", ticketHandler.Cancel)
	protected.Get("/my-tickets", ticketHandler.GetMyTickets)

	// Organizer routes
	organizer := protected.Group("")
	organizer.Use(middleware.RequireRole(entity.RoleOrganizer))

	organizer.Post("/events", eventHandler.Create)
	organizer.Put("/events/:id", eventHandler.Update)
	organizer.Delete("/events/:id", eventHandler.Delete)
	organizer.Get("/my-events", eventHandler.GetMyEvents)
	organizer.Get("/events/stats", eventHandler.GetStats)
	organizer.Post("/events/:id/banner", eventHandler.UploadBanner)
	organizer.Get("/events/:id/export", eventHandler.ExportAttendees)

	organizer.Post("/categories", categoryHandler.Create)

	// Static files
	app.Static("/uploads", cfg.Upload.Path)
}
```

---

### **Step 11: Main API Server**

**File:** `cmd/api/main.go`

```go
package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog"
	zlog "github.com/rs/zerolog/log"
	"github.com/yourusername/event-management-api/internal/config"
	"github.com/yourusername/event-management-api/internal/database"
	"github.com/yourusername/event-management-api/internal/entity"
	"github.com/yourusername/event-management-api/internal/handler"
	"github.com/yourusername/event-management-api/internal/middleware"
	"github.com/yourusername/event-management-api/internal/repository"
	"github.com/yourusername/event-management-api/internal/routes"
	"github.com/yourusername/event-management-api/internal/scheduler"
	"github.com/yourusername/event-management-api/internal/service"
	"github.com/yourusername/event-management-api/internal/worker"
)

func main() {
	// Setup zerolog
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zlog.Logger = zlog.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect databases
	db, err := database.ConnectPostgres(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}

	redisClient, err := database.ConnectRedis(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	// Auto migrate
	if err := db.AutoMigrate(
		&entity.User{},
		&entity.Category{},
		&entity.Event{},
		&entity.Ticket{},
	); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Create indexes untuk query optimization
	createIndexes(db)

	// Initialize Asynq client
	asynqClient := worker.NewAsynqClient(cfg)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	eventRepo := repository.NewEventRepository(db)
	ticketRepo := repository.NewTicketRepository(db)

	// Initialize services
	authService := service.NewAuthService(userRepo, cfg)
	categoryService := service.NewCategoryService(categoryRepo)
	eventService := service.NewEventService(eventRepo, categoryRepo, ticketRepo)
	ticketService := service.NewTicketService(db, ticketRepo, eventRepo)
	uploadService := service.NewUploadService(cfg)
	exportService := service.NewExportService(ticketRepo, eventRepo)
	cacheService := service.NewCacheService(redisClient)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService)
	categoryHandler := handler.NewCategoryHandler(categoryService)
	eventHandler := handler.NewEventHandler(eventService, uploadService, exportService)
	ticketHandler := handler.NewTicketHandler(ticketService)

	// Initialize scheduler
	schedulerSvc := scheduler.NewScheduler(asynqClient, ticketRepo)
	schedulerSvc.Start()
	defer schedulerSvc.Stop()

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		},
	})

	// Global middleware
	app.Use(middleware.NewRecoveryMiddleware())
	app.Use(middleware.NewLoggerMiddleware())

	// Setup routes
	routes.SetupRoutes(app, cfg, authHandler, eventHandler, ticketHandler, categoryHandler)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":    "ok",
			"scheduler": "running",
		})
	})

	// Start server
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	zlog.Info().Msgf("🚀 API Server running on http://localhost%s", addr)
	zlog.Info().Msg("🕐 Cron scheduler is active")

	if err := app.Listen(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func createIndexes(db *gorm.DB) {
	// Event indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id) WHERE deleted_at IS NULL")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_events_category_id ON events(category_id) WHERE deleted_at IS NULL")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_events_status ON events(status) WHERE deleted_at IS NULL")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time) WHERE deleted_at IS NULL")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_events_title ON events(title) WHERE deleted_at IS NULL")

	// Ticket indexes
	db.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id) WHERE deleted_at IS NULL")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id) WHERE deleted_at IS NULL")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code) WHERE deleted_at IS NULL")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status) WHERE deleted_at IS NULL")

	zlog.Info().Msg("✅ Database indexes created")
}
```

---

### **Step 12: Main Worker Server**

**File:** `cmd/worker/main.go`

```go
package main

import (
	"log"
	"os"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog"
	zlog "github.com/rs/zerolog/log"
	"github.com/yourusername/event-management-api/internal/config"
	"github.com/yourusername/event-management-api/internal/database"
	"github.com/yourusername/event-management-api/internal/repository"
	"github.com/yourusername/event-management-api/internal/worker"
)

func main() {
	// Setup zerolog
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zlog.Logger = zlog.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database (for cleanup task)
	db, err := database.ConnectPostgres(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}

	// Initialize repositories
	eventRepo := repository.NewEventRepository(db)

	// Create Asynq server
	server := asynq.NewServer(
		asynq.RedisClientOpt{Addr: cfg.Asynq.RedisAddr},
		asynq.Config{
			Concurrency: cfg.Asynq.Concurrency,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
		},
	)

	// Create task handler
	mux := worker.NewTaskHandler(eventRepo)

	zlog.Info().Msg("🔧 Asynq worker started")
	zlog.Info().Int("concurrency", cfg.Asynq.Concurrency).Msg("Worker configuration")

	// Start worker
	if err := server.Run(mux); err != nil {
		log.Fatalf("Failed to start worker: %v", err)
	}
}
```

---

### **Step 13: CLI Seed Data**

**File:** `cmd/cli/seed.go`

```go
package main

import (
	"fmt"
	"log"
	"time"

	"github.com/yourusername/event-management-api/internal/config"
	"github.com/yourusername/event-management-api/internal/database"
	"github.com/yourusername/event-management-api/internal/entity"
	"github.com/yourusername/event-management-api/internal/util"
)

func main() {
	fmt.Println("🌱 Seeding database...")

	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	db, err := database.ConnectPostgres(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL: %v", err)
	}

	// Seed users
	hashedPassword, _ := util.HashPassword("password123")

	organizer := &entity.User{
		Name:     "John Organizer",
		Email:    "organizer@example.com",
		Password: hashedPassword,
		Role:     entity.RoleOrganizer,
	}

	attendee := &entity.User{
		Name:     "Jane Attendee",
		Email:    "attendee@example.com",
		Password: hashedPassword,
		Role:     entity.RoleAttendee,
	}

	db.Create(organizer)
	db.Create(attendee)
	fmt.Println("✅ Users created")

	// Seed categories
	techCategory := &entity.Category{
		Name: "Technology",
		Slug: "technology",
	}

	musicCategory := &entity.Category{
		Name: "Music",
		Slug: "music",
	}

	db.Create(techCategory)
	db.Create(musicCategory)
	fmt.Println("✅ Categories created")

	// Seed events
	event1 := &entity.Event{
		OrganizerID: organizer.ID,
		CategoryID:  techCategory.ID,
		Title:       "Go Conference 2026",
		Description: "The biggest Go conference in Indonesia",
		Location:    "Jakarta Convention Center",
		StartTime:   time.Now().Add(30 * 24 * time.Hour), // 30 days from now
		EndTime:     time.Now().Add(31 * 24 * time.Hour),
		Capacity:    100,
		Price:       250000,
		Status:      entity.EventStatusPublished,
	}

	event2 := &entity.Event{
		OrganizerID: organizer.ID,
		CategoryID:  musicCategory.ID,
		Title:       "Jazz Night",
		Description: "An evening of smooth jazz",
		Location:    "Blue Note Jazz Club",
		StartTime:   time.Now().Add(7 * 24 * time.Hour), // 7 days from now
		EndTime:     time.Now().Add(7 * 24 * time.Hour).Add(4 * time.Hour),
		Capacity:    50,
		Price:       150000,
		Status:      entity.EventStatusPublished,
	}

	event3 := &entity.Event{
		OrganizerID: organizer.ID,
		CategoryID:  techCategory.ID,
		Title:       "Draft Event (will be cleaned)",
		Description: "This is a draft event",
		Location:    "TBD",
		StartTime:   time.Now().Add(60 * 24 * time.Hour),
		EndTime:     time.Now().Add(61 * 24 * time.Hour),
		Capacity:    200,
		Price:       100000,
		Status:      entity.EventStatusDraft,
	}

	// Set created_at to 40 days ago (untuk testing cleanup)
	db.Create(event3)
	db.Model(event3).Update("created_at", time.Now().Add(-40*24*time.Hour))

	db.Create(event1)
	db.Create(event2)
	fmt.Println("✅ Events created")

	// Seed tickets
	ticket1 := &entity.Ticket{
		EventID:     event1.ID,
		UserID:      attendee.ID,
		Code:        util.GenerateTicketCode(),
		Price:       event1.Price,
		Status:      entity.TicketStatusValid,
		PurchasedAt: time.Now(),
	}

	ticket2 := &entity.Ticket{
		EventID:     event2.ID,
		UserID:      attendee.ID,
		Code:        util.GenerateTicketCode(),
		Price:       event2.Price,
		Status:      entity.TicketStatusValid,
		PurchasedAt: time.Now(),
	}

	db.Create(ticket1)
	db.Create(ticket2)
	fmt.Println("✅ Tickets created")

	fmt.Println("\n🎉 Seeding completed!")
	fmt.Println("\n📊 Summary:")
	fmt.Printf("- Organizer: %s (password: password123)\n", organizer.Email)
	fmt.Printf("- Attendee: %s (password: password123)\n", attendee.Email)
	fmt.Printf("- Categories: %d\n", 2)
	fmt.Printf("- Events: %d\n", 3)
	fmt.Printf("- Tickets: %d\n", 2)
}
```

**Cara run seed:**

```bash
go run cmd/cli/seed.go
```

---

[Continuation - Step 14: Testing & Checklist akan dilanjutkan...]

---

### **Step 14: Manual Testing Guide**

#### **14.1 Setup & Run**

```bash
# Terminal 1: Run API server
go run cmd/api/main.go

# Terminal 2: Run worker
go run cmd/worker/main.go

# Terminal 3: Seed data
go run cmd/cli/seed.go
```

#### **14.2 Authentication Testing**

**Register Organizer:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Organizer",
    "email": "alice@example.com",
    "password": "password123",
    "role": "organizer"
  }'
```

**Register Attendee:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob Attendee",
    "email": "bob@example.com",
    "password": "password123",
    "role": "attendee"
  }'
```

**Login:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }'

# Simpan token dari response untuk request selanjutnya
export TOKEN="<token-dari-response>"
```

#### **14.3 Event CRUD Testing**

**Create Event:**

```bash
curl -X POST http://localhost:8080/api/v1/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "title": "Docker Workshop",
    "description": "Learn containerization from scratch",
    "location": "Online",
    "start_time": "2026-05-15T10:00:00Z",
    "end_time": "2026-05-15T16:00:00Z",
    "capacity": 50,
    "price": 100000,
    "status": "published"
  }'
```

**Update Event:**

```bash
curl -X PUT http://localhost:8080/api/v1/events/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Docker Advanced Workshop"
  }'
```

**Delete Event:**

```bash
curl -X DELETE http://localhost:8080/api/v1/events/1 \
  -H "Authorization: Bearer $TOKEN"
```

#### **14.4 Advanced Filtering Testing**

**Get All Events dengan Filter:**

```bash
# Filter by status
curl "http://localhost:8080/api/v1/events?status=published"

# Filter by location
curl "http://localhost:8080/api/v1/events?location=jakarta"

# Filter by price range
curl "http://localhost:8080/api/v1/events?min_price=100000&max_price=500000"

# Filter by date range
curl "http://localhost:8080/api/v1/events?start_date=2026-05-01&end_date=2026-06-01"

# Filter by available capacity (only events with tickets available)
curl "http://localhost:8080/api/v1/events?available=true"

# Search by title
curl "http://localhost:8080/api/v1/events?search=docker"

# Combine multiple filters + pagination
curl "http://localhost:8080/api/v1/events?status=published&location=jakarta&min_price=100000&page=1&limit=10"
```

#### **14.5 Transaction Testing (CRITICAL)**

**Scenario 1: Normal Purchase**

```bash
# Login as attendee
export ATTENDEE_TOKEN="<token-attendee>"

# Purchase ticket
curl -X POST http://localhost:8080/api/v1/tickets \
  -H "Authorization: Bearer $ATTENDEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1
  }'

# ✅ Expected: Ticket created, capacity decreased, email task enqueued
# Check worker logs untuk email confirmation
```

**Scenario 2: Race Condition Test (Concurrent Purchases)**

```bash
# Buat event dengan capacity kecil (misal 2)
# Simulasi 5 concurrent requests
for i in {1..5}; do
  curl -X POST http://localhost:8080/api/v1/tickets \
    -H "Authorization: Bearer $ATTENDEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"event_id": 1}' &
done
wait

# ✅ Expected: Hanya 2 tickets yang berhasil (sesuai capacity)
# 3 requests lain dapat error "event is sold out"
```

**Scenario 3: Cancel Ticket**

```bash
curl -X DELETE http://localhost:8080/api/v1/tickets/1 \
  -H "Authorization: Bearer $ATTENDEE_TOKEN"

# ✅ Expected: Ticket status = cancelled, capacity restored
```

**Scenario 4: Rollback Test**

```bash
# Coba beli tiket untuk event yang sudah sold out
curl -X POST http://localhost:8080/api/v1/tickets \
  -H "Authorization: Bearer $ATTENDEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_id": 999}'

# ✅ Expected: Error response, NO ticket record created (rollback)
```

#### **14.6 Background Jobs Testing**

**Test Email Confirmation:**

```bash
# Purchase ticket
curl -X POST http://localhost:8080/api/v1/tickets \
  -H "Authorization: Bearer $ATTENDEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_id": 1}'

# ✅ Check worker logs:
# [WORKER] Processing task: email:confirmation
# [EMAIL] Sending confirmation to bob@example.com
# Ticket Code: EVT-XXXXXX, Price: Rp 250,000
```

**Test Email Sold Out:**

```bash
# Beli semua tiket sampai capacity = 0
# Beli tiket terakhir

# ✅ Check worker logs:
# [WORKER] Processing task: email:sold_out
# [EMAIL] Event SOLD OUT - Organizer: alice@example.com
# Total tickets sold: 50
```

**Test Email Reminder (Manual Trigger):**

```bash
# Buat event yang start_time = besok (tomorrow)
# Tunggu cron job berjalan (every hour)

# ✅ Check worker logs setelah cron trigger:
# [CRON] Sending reminders for 5 tickets
# [WORKER] Processing task: email:reminder
# [EMAIL] Reminder: Your event "Go Conference" starts tomorrow!
```

**Test Cleanup Draft:**

```bash
# Seed sudah create draft event dengan created_at 40 hari lalu
# Tunggu midnight cron job (atau trigger manual)

# ✅ Check worker logs:
# [CRON] Cleanup draft events older than 30 days
# [WORKER] Processing task: cleanup:draft
# [CLEANUP] Deleted 1 draft events
```

#### **14.7 Stats & Optimization Testing**

**Get Event Stats:**

```bash
curl "http://localhost:8080/api/v1/events/stats?organizer_id=1" \
  -H "Authorization: Bearer $TOKEN"

# ✅ Expected: Aggregate stats dengan SINGLE QUERY
# {
#   "total_events": 3,
#   "published_events": 2,
#   "total_tickets_sold": 15,
#   "total_revenue": 3750000,
#   "events": [
#     {
#       "event_id": 1,
#       "event_title": "Go Conference 2026",
#       "tickets_sold": 10,
#       "revenue": 2500000
#     }
#   ]
# }
```

**Query Performance Check:**

```bash
# Enable GORM query logging di config
# Lihat generated SQL untuk Preload vs tanpa Preload

# Tanpa Preload (N+1 problem):
# SELECT * FROM events;          -- 1 query
# SELECT * FROM users WHERE id=1; -- N queries (per event)
# SELECT * FROM categories WHERE id=1; -- N queries

# Dengan Preload (optimized):
# SELECT * FROM events;
# SELECT * FROM users WHERE id IN (1,2,3);      -- 1 query
# SELECT * FROM categories WHERE id IN (1,2);  -- 1 query
```

#### **14.8 Export Testing**

**Export Attendees to Excel:**

```bash
curl "http://localhost:8080/api/v1/events/1/export" \
  -H "Authorization: Bearer $TOKEN" \
  --output attendees.xlsx

# Open attendees.xlsx di Excel/LibreOffice
# ✅ Expected: Headers + list of attendees dengan ticket info
```

#### **14.9 Ticket Verification**

**Verify Valid Ticket:**

```bash
curl "http://localhost:8080/api/v1/tickets/EVT-ABC123/verify"

# ✅ Expected:
# {
#   "valid": true,
#   "message": "Ticket is valid",
#   "ticket": { ... }
# }
```

**Verify Cancelled/Used Ticket:**

```bash
curl "http://localhost:8080/api/v1/tickets/EVT-XYZ789/verify"

# ✅ Expected:
# {
#   "valid": false,
#   "message": "Ticket has been cancelled"
# }
```

---

### **Step 15: Checklist Pembelajaran**

#### **Database Transactions (Topik 13)**

- [ ] Pahami konsep ACID (Atomicity, Consistency, Isolation, Durability)
- [ ] Implementasi `db.Transaction()` untuk operasi atomik
- [ ] Gunakan `SELECT FOR UPDATE` untuk row-level locking
- [ ] Handle rollback otomatis saat error di dalam transaction
- [ ] Test race condition dengan concurrent requests
- [ ] Implementasi retry logic untuk deadlock scenarios
- [ ] Monitor transaction performance (tidak terlalu lama hold lock)
- [ ] Dokumentasi kapan pakai transaction vs tidak
- [ ] Implementasi nested transactions dengan savepoints (advanced)
- [ ] Test rollback behavior di berbagai error scenarios

#### **Background Jobs dengan Asynq (Topik 12)**

- [ ] Setup Asynq client dan server (Redis sebagai message broker)
- [ ] Buat task types dengan payload JSON
- [ ] Implementasi task handlers (process logic)
- [ ] Register handlers ke ServeMux
- [ ] Configure queue priorities (critical > default > low)
- [ ] Set concurrency untuk worker pool
- [ ] Implementasi retry policy dengan exponential backoff
- [ ] Handle task errors dengan dead letter queue
- [ ] Monitor task processing dengan Asynq Web UI
- [ ] Deploy API server dan worker server secara terpisah

#### **Cron Scheduler (Topik 12)**

- [ ] Pahami cron syntax (minute, hour, day, month, weekday)
- [ ] Implementasi recurring jobs dengan robfig/cron
- [ ] Enqueue Asynq tasks dari cron jobs
- [ ] Handle timezone untuk scheduled tasks
- [ ] Test cron expression dengan https://crontab.guru
- [ ] Implementasi graceful shutdown untuk cron
- [ ] Monitor missed jobs (jika server down saat schedule)
- [ ] Implementasi idempotent jobs (aman kalau run 2x)

#### **Query Optimization (Topik 14)**

- [ ] Identifikasi N+1 query problem dengan GORM logger
- [ ] Gunakan `Preload()` untuk eager loading
- [ ] Gunakan `Joins()` untuk complex queries
- [ ] Implementasi aggregate queries (COUNT, SUM, AVG, GROUP BY)
- [ ] Buat database indexes pada foreign keys
- [ ] Index kolom yang sering di-filter (status, dates)
- [ ] Measure query performance dengan `EXPLAIN ANALYZE`
- [ ] Gunakan partial indexes (WHERE deleted_at IS NULL)
- [ ] Optimize pagination queries (cursor-based vs offset)
- [ ] Monitor slow queries di production

#### **Security & Caching (Review - Topik 10-11)**

- [ ] JWT authentication dengan role-based access
- [ ] Password hashing dengan bcrypt
- [ ] Input validation dengan go-playground/validator
- [ ] Error handling yang proper (tidak expose sensitive info)
- [ ] CORS configuration
- [ ] Rate limiting
- [ ] helmet headers
- [ ] Input sanitization
- [ ] Redis caching dengan TTL
- [ ] Cache invalidation strategy

#### **File Upload & Export (Review - Topik 9)**

- [ ] Image upload dengan size limit
- [ ] Image resize dengan disintegration/imaging
- [ ] Serve static files dengan Fiber
- [ ] Generate Excel dengan excelize
- [ ] Set Excel headers dan formatting

#### **Production Skills**

- [ ] Environment variables dengan Viper
- [ ] Structured logging dengan Zerolog
- [ ] Graceful shutdown
- [ ] Health check endpoint
- [ ] Deploy API dan Worker di containers terpisah
- [ ] Monitor background job metrics

---

### **Development Ideas**

#### **Level 1: Enhancement**

1. **QR Code Tickets**: Generate QR code untuk setiap ticket (pakai go-qrcode)
2. **Payment Gateway**: Integrate dengan Midtrans/Xendit
3. **Waitlist**: Tambah waitlist ketika event sold out
4. **Promo Codes**: Diskon dengan promo code
5. **Event Categories**: Nested categories (Technology > Web Development)
6. **Rating & Reviews**: Attendees bisa rate event setelah selesai
7. **Refund Policy**: Auto refund jika event cancelled
8. **Multi-currency**: Support USD, IDR, etc.

#### **Level 2: Advanced Features**

1. **Webhook Notifications**: Send webhook ke third-party saat ticket purchased
2. **Analytics Dashboard**: Visualisasi revenue, attendees growth
3. **Seat Selection**: Interactive seat map untuk cinema/theater events
4. **Recurring Events**: Event yang berulang setiap minggu/bulan
5. **Team Management**: Organizer punya multiple team members
6. **Custom Email Templates**: Rich HTML email templates
7. **SMS Notifications**: Reminder via SMS (pakai Twilio)
8. **Push Notifications**: Mobile push notification

#### **Level 3: Scalability**

1. **Database Sharding**: Split events by region/date
2. **Read Replicas**: Separate read/write databases
3. **Event Sourcing**: Store all events sebagai event stream
4. **CQRS Pattern**: Separate command and query models
5. **Message Queue**: Ganti Asynq dengan RabbitMQ/Kafka
6. **CDN Integration**: Upload images ke S3 + CloudFront
7. **Elasticsearch**: Full-text search untuk events
8. **GraphQL API**: Alternative API dengan GraphQL

#### **Level 4: Production Ready**

1. **Observability**: Metrics (Prometheus), Traces (Jaeger), Logs (ELK)
2. **Load Testing**: Test dengan k6 atau Locust
3. **Disaster Recovery**: Backup strategy, point-in-time recovery
4. **Multi-region Deployment**: Deploy di berbagai regions
5. **API Versioning**: Support multiple API versions
6. **OpenAPI Spec**: Generate Swagger docs
7. **E2E Testing**: Automated testing dengan Playwright
8. **CI/CD Pipeline**: GitHub Actions untuk auto deploy

---

## **Kesimpulan**

Project Event Management API ini mengajarkan:

✅ **Database Transactions**: Atomic operations, row locking, rollback handling  
✅ **Background Jobs**: Async task processing dengan Asynq (email, notifications)  
✅ **Cron Scheduler**: Recurring tasks (reminders, cleanup)  
✅ **Query Optimization**: N+1 fixes, indexes, aggregate queries  
✅ **Security**: JWT auth, validation, caching  
✅ **Real-world patterns**: Dual-process architecture (API + Worker)

**Key Learning Points:**

1. **Transactions mencegah race conditions** – beli tiket concurrent tidak melebihi capacity
2. **Background jobs** – email tidak block HTTP request
3. **Cron scheduler** – automation untuk reminder & cleanup
4. **Query optimization** – 1 query vs 100 queries (N+1 problem)

**Next Steps:**

1. Implement semua code di document ini step-by-step
2. Test setiap scenario (terutama race condition)
3. Monitor worker logs untuk background jobs
4. Experiment dengan development ideas
5. Deploy ke production dengan separate containers

🎉 **Selamat belajar backend development dengan Go!**

---
