# 🎯 PROJECT 3: Job Board API (Comprehensive Fase 2)

> **Project Akhir Fase 2**: Menggabungkan SEMUA topik Fase 2 (Topik 10-17) dalam satu aplikasi production-ready

---

## **Overview**

Job Board API adalah platform lowongan kerja yang menghubungkan **Recruiter** (perusahaan yang membuka lowongan) dengan **JobSeeker** (pencari kerja). Project ini adalah **culmination project** yang mengintegrasikan semua pembelajaran Fase 2.

### **Fitur Utama**

**Authentication & Authorization:**
- Dual authentication: JWT token + API Key
- 2 roles: Recruiter & JobSeeker
- Object-level permissions (recruiter hanya edit job miliknya)

**Job Management (Recruiter):**
- Create, update, delete job postings
- View applicants untuk setiap job
- Export applicants ke Excel
- Dashboard stats (total jobs, applicants, etc.)

**Job Seeking (JobSeeker):**
- Browse jobs dengan advanced filters
- Apply job dengan upload CV (PDF, max 5MB)
- Save favorite jobs
- View application history

**Advanced Features:**
- Soft delete dengan GORM
- Audit logging (siapa melakukan apa, kapan)
- Background email notifications (async)
- Cron scheduler (weekly digest + cleanup expired jobs)
- Redis caching dengan smart invalidation
- Query optimization (N+1 fixes, indexing)
- Structured logging dengan request ID
- Comprehensive testing (unit + integration, 80%+ coverage)

### **Materi yang Dicakup**

| Topik | Materi | Implementasi di Project |
|-------|--------|-------------------------|
| **Topik 10** | Security Hardening | CORS, rate limiting, helmet, input sanitization, env validation |
| **Topik 11** | Caching dengan Redis | Cache list jobs, detail job, stats; invalidation saat create/update/delete |
| **Topik 12** | Background Jobs + Scheduler | Asynq: email notif pelamar; Cron: weekly digest + cleanup expired jobs |
| **Topik 13** | Database Transactions + Soft Delete | Apply job (transaction), soft delete jobs, cascade delete applications |
| **Topik 14** | Query Optimization + Indexing | N+1 fixes dengan Preload/Joins, indexes, aggregate stats, EXPLAIN ANALYZE |
| **Topik 15** | RBAC + Object-Level Permissions | Role-based access (recruiter/jobseeker), object ownership check |
| **Topik 16** | Logging & Monitoring | Zerolog structured logs, request ID middleware, correlation tracking |
| **Topik 17** | Testing (Unit + Integration) | Testify, gomock, test database, mocks, 80%+ coverage |

### **Tech Stack**

```
Backend Framework:   Go 1.21+ dengan Fiber v2
Database:            PostgreSQL 15+ dengan GORM v2
Cache:               Redis 7+
Background Jobs:     hibiken/asynq
Scheduler:           robfig/cron v3
Authentication:      golang-jwt/jwt v5
Validation:          go-playground/validator v10
File Upload:         Multipart form handler
Export:              xuri/excelize v2
Security:            microcosm-cc/bluemonday (sanitization)
Logging:             rs/zerolog
Config:              spf13/viper
Testing:             testify/suite, gomock, gofakeit
```

---

## **ERD (Entity Relationship Diagram)**

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ id (PK)         │
│ name            │
│ email (unique)  │
│ password        │
│ role            │◄────┐
│ api_key (unique)│     │
│ created_at      │     │
│ updated_at      │     │
└─────────────────┘     │
         │              │
         │              │
         │              │
    ┌────┴────┐    ┌────┴──────────┐
    │         │    │               │
    ▼         ▼    ▼               ▼
┌──────────┐  ┌──────────────┐  ┌──────────────┐
│   Job    │  │ Application  │  │  SavedJob    │
├──────────┤  ├──────────────┤  ├──────────────┤
│ id (PK)  │  │ id (PK)      │  │ id (PK)      │
│ recruiter│  │ job_id (FK)  │  │ user_id (FK) │
│   _id(FK)│──┤ user_id (FK) │  │ job_id (FK)  │
│ category │  │ cv_path      │  │ created_at   │
│   _id(FK)│  │ cover_letter │  └──────────────┘
│ title    │  │ status       │
│ desc     │  │ applied_at   │  ┌──────────────┐
│ company  │  │ created_at   │  │  Category    │
│ location │  │ updated_at   │  ├──────────────┤
│ salary_  │  │ deleted_at   │  │ id (PK)      │
│   min    │  └──────────────┘  │ name         │
│ salary_  │                    │ slug (unique)│
│   max    │                    │ created_at   │
│ job_type │                    └──────────────┘
│ expired_ │                           ▲
│   at     │                           │
│ status   │───────────────────────────┘
│ created_ │
│   at     │
│ updated_ │
│   at     │
│ deleted_ │
│   at     │
└──────────┘
      │
      ▼
┌──────────────┐
│  AuditLog    │
├──────────────┤
│ id (PK)      │
│ user_id (FK) │
│ entity_type  │
│ entity_id    │
│ action       │
│ changes      │
│ ip_address   │
│ user_agent   │
│ created_at   │
└──────────────┘
```

**Relationships:**
- User ──< Job (1 recruiter has many jobs)
- User ──< Application (1 jobseeker has many applications)
- Job ──< Application (1 job has many applications)
- User ──< SavedJob (1 jobseeker has many saved jobs)
- Job ──< SavedJob (1 job saved by many jobseekers)
- Category ──< Job (1 category has many jobs)
- User ──< AuditLog (1 user has many audit logs)

**Enums:**
- User.role: `recruiter`, `jobseeker`
- Job.job_type: `full-time`, `part-time`, `contract`, `internship`, `freelance`
- Job.status: `draft`, `open`, `closed`, `expired`
- Application.status: `pending`, `reviewed`, `accepted`, `rejected`

---

## **Struktur Folder**

```
job-board-api/
├── cmd/
│   ├── api/
│   │   └── main.go                 # API server entry point
│   ├── worker/
│   │   └── main.go                 # Background worker entry point
│   └── cli/
│       └── seed.go                 # CLI seed data
├── internal/
│   ├── config/
│   │   └── config.go               # Viper configuration
│   ├── database/
│   │   ├── postgres.go             # PostgreSQL connection
│   │   └── redis.go                # Redis connection
│   ├── entity/
│   │   ├── user.go                 # User model
│   │   ├── job.go                  # Job model
│   │   ├── category.go             # Category model
│   │   ├── application.go          # Application model
│   │   ├── saved_job.go            # SavedJob model
│   │   └── audit_log.go            # AuditLog model
│   ├── repository/
│   │   ├── user_repository.go
│   │   ├── job_repository.go
│   │   ├── category_repository.go
│   │   ├── application_repository.go
│   │   ├── saved_job_repository.go
│   │   └── audit_log_repository.go
│   ├── dto/
│   │   ├── auth_dto.go
│   │   ├── job_dto.go
│   │   ├── application_dto.go
│   │   └── stats_dto.go
│   ├── service/
│   │   ├── auth_service.go
│   │   ├── job_service.go
│   │   ├── application_service.go
│   │   ├── saved_job_service.go
│   │   ├── stats_service.go
│   │   ├── cache_service.go
│   │   ├── export_service.go
│   │   └── audit_service.go
│   ├── handler/
│   │   ├── auth_handler.go
│   │   ├── job_handler.go
│   │   ├── application_handler.go
│   │   ├── saved_job_handler.go
│   │   └── stats_handler.go
│   ├── middleware/
│   │   ├── auth_middleware.go      # JWT + API Key validation
│   │   ├── role_middleware.go      # Role-based access
│   │   ├── permission_middleware.go # Object-level permission
│   │   ├── logger_middleware.go    # Request logging + request ID
│   │   ├── security_middleware.go  # CORS, helmet, sanitization
│   │   └── rate_limit_middleware.go
│   ├── worker/
│   │   ├── client.go               # Asynq client
│   │   ├── handler.go              # Task handler mux
│   │   └── tasks/
│   │       ├── email_applicant.go  # Email notif ke recruiter
│   │       ├── weekly_digest.go    # Weekly email ke jobseeker
│   │       └── cleanup_expired.go  # Cleanup expired jobs
│   ├── scheduler/
│   │   └── cron.go                 # Cron scheduler
│   ├── util/
│   │   ├── hash.go                 # Bcrypt password hashing
│   │   ├── jwt.go                  # JWT generation & validation
│   │   ├── validator.go            # Custom validators
│   │   ├── error.go                # Custom error types
│   │   ├── response.go             # Response helpers
│   │   ├── api_key.go              # API key generator
│   │   └── sanitizer.go            # HTML sanitization
│   └── routes/
│       └── routes.go               # Route definitions
├── test/
│   ├── unit/
│   │   ├── auth_service_test.go
│   │   ├── job_service_test.go
│   │   └── application_service_test.go
│   ├── integration/
│   │   ├── auth_test.go
│   │   ├── job_test.go
│   │   └── application_test.go
│   ├── mock/
│   │   ├── repository_mock.go      # Generated mocks
│   │   └── email_mock.go
│   └── helper/
│       └── test_helper.go          # Test database setup
├── uploads/
│   └── cv/                         # CV uploads directory
├── .env.example
├── .gitignore
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

---

## **Step 1: Setup Project**

### **1.1 Initialize Project**

```bash
mkdir job-board-api
cd job-board-api
go mod init github.com/yourusername/job-board-api

# Install semua dependencies
go get -u github.com/gofiber/fiber/v2
go get -u gorm.io/gorm
go get -u gorm.io/driver/postgres
go get -u github.com/redis/go-redis/v9
go get -u github.com/spf13/viper
go get -u github.com/golang-jwt/jwt/v5
go get -u github.com/go-playground/validator/v10
go get -u golang.org/x/crypto/bcrypt
go get -u github.com/rs/zerolog/log
go get -u github.com/hibiken/asynq
go get -u github.com/robfig/cron/v3
go get -u github.com/xuri/excelize/v2
go get -u github.com/microcosm-cc/bluemonday
go get -u github.com/google/uuid

# Testing dependencies
go get -u github.com/stretchr/testify
go get -u go.uber.org/mock/mockgen
go get -u github.com/brianvoe/gofakeit/v6
go get -u github.com/DATA-DOG/go-sqlmock

# Install mockgen globally
go install go.uber.org/mock/mockgen@latest
```

### **1.2 Environment Configuration**

**File:** `.env.example`

```env
# Server
SERVER_PORT=8080
SERVER_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=job_board_db
DB_SSL_MODE=disable

# Redis
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE_HOURS=24

# Asynq
ASYNQ_REDIS_ADDR=localhost:6379
ASYNQ_CONCURRENCY=10

# SMTP (untuk email notifications)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
SMTP_FROM=noreply@jobboard.com

# Upload
UPLOAD_PATH=./uploads
UPLOAD_MAX_SIZE=5242880

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_DURATION=60

# Test Database
TEST_DB_NAME=job_board_test_db
```

### **1.3 Configuration Loader**

**File:** `internal/config/config.go`

```go
package config

import (
	"fmt"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	Asynq    AsynqConfig
	SMTP     SMTPConfig
	Upload   UploadConfig
	RateLimit RateLimitConfig
	Test     TestConfig
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
	SSLMode  string
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

type JWTConfig struct {
	Secret       string
	ExpireHours  int
	ExpireDuration time.Duration
}

type AsynqConfig struct {
	RedisAddr   string
	Concurrency int
}

type SMTPConfig struct {
	Host string
	Port int
	User string
	Pass string
	From string
}

type UploadConfig struct {
	Path    string
	MaxSize int64
}

type RateLimitConfig struct {
	Requests int
	Duration int
}

type TestConfig struct {
	DBName string
}

func Load() (*Config, error) {
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		// Jika tidak ada file .env, gunakan environment variables
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config: %w", err)
		}
	}

	// Set defaults
	viper.SetDefault("SERVER_PORT", 8080)
	viper.SetDefault("SERVER_ENV", "development")
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", 5432)
	viper.SetDefault("REDIS_DB", 0)
	viper.SetDefault("JWT_EXPIRE_HOURS", 24)
	viper.SetDefault("ASYNQ_CONCURRENCY", 10)
	viper.SetDefault("UPLOAD_MAX_SIZE", 5242880)
	viper.SetDefault("RATE_LIMIT_REQUESTS", 100)
	viper.SetDefault("RATE_LIMIT_DURATION", 60)

	expireHours := viper.GetInt("JWT_EXPIRE_HOURS")

	cfg := &Config{
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
			SSLMode:  viper.GetString("DB_SSL_MODE"),
		},
		Redis: RedisConfig{
			Addr:     viper.GetString("REDIS_ADDR"),
			Password: viper.GetString("REDIS_PASSWORD"),
			DB:       viper.GetInt("REDIS_DB"),
		},
		JWT: JWTConfig{
			Secret:         viper.GetString("JWT_SECRET"),
			ExpireHours:    expireHours,
			ExpireDuration: time.Duration(expireHours) * time.Hour,
		},
		Asynq: AsynqConfig{
			RedisAddr:   viper.GetString("ASYNQ_REDIS_ADDR"),
			Concurrency: viper.GetInt("ASYNQ_CONCURRENCY"),
		},
		SMTP: SMTPConfig{
			Host: viper.GetString("SMTP_HOST"),
			Port: viper.GetInt("SMTP_PORT"),
			User: viper.GetString("SMTP_USER"),
			Pass: viper.GetString("SMTP_PASS"),
			From: viper.GetString("SMTP_FROM"),
		},
		Upload: UploadConfig{
			Path:    viper.GetString("UPLOAD_PATH"),
			MaxSize: viper.GetInt64("UPLOAD_MAX_SIZE"),
		},
		RateLimit: RateLimitConfig{
			Requests: viper.GetInt("RATE_LIMIT_REQUESTS"),
			Duration: viper.GetInt("RATE_LIMIT_DURATION"),
		},
		Test: TestConfig{
			DBName: viper.GetString("TEST_DB_NAME"),
		},
	}

	// Validate critical config
	if cfg.JWT.Secret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	if cfg.Database.DBName == "" {
		return nil, fmt.Errorf("DB_NAME is required")
	}

	return cfg, nil
}
```

### **1.4 Database Connection**

**File:** `internal/database/postgres.go`

```go
package database

import (
	"fmt"
	"log"
	"time"

	"github.com/yourusername/job-board-api/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func ConnectPostgres(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.DBName,
		cfg.Database.SSLMode,
	)

	gormConfig := &gorm.Config{}

	// Enable query logging di development
	if cfg.Server.Env == "development" {
		gormConfig.Logger = logger.Default.LogMode(logger.Info)
	} else {
		gormConfig.Logger = logger.Default.LogMode(logger.Silent)
	}

	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	log.Println("✅ PostgreSQL connected")
	return db, nil
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
	"github.com/yourusername/job-board-api/internal/config"
)

func ConnectRedis(cfg *config.Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr,
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

## **Step 2: Entities (Models)**

### **File:** `internal/entity/user.go`

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

type UserRole string

const (
	RoleRecruiter UserRole = "recruiter"
	RoleJobSeeker UserRole = "jobseeker"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:100;not null" json:"name"`
	Email     string         `gorm:"size:100;uniqueIndex;not null" json:"email"`
	Password  string         `gorm:"not null" json:"-"`
	Role      UserRole       `gorm:"type:varchar(20);not null;index" json:"role"`
	APIKey    string         `gorm:"size:64;uniqueIndex" json:"api_key,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Jobs         []Job         `gorm:"foreignKey:RecruiterID" json:"-"`
	Applications []Application `gorm:"foreignKey:UserID" json:"-"`
	SavedJobs    []SavedJob    `gorm:"foreignKey:UserID" json:"-"`
	AuditLogs    []AuditLog    `gorm:"foreignKey:UserID" json:"-"`
}
```

### **File:** `internal/entity/category.go`

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

type Category struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Name      string         `gorm:"size:50;not null" json:"name"`
	Slug      string         `gorm:"size:50;uniqueIndex;not null" json:"slug"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Jobs []Job `gorm:"foreignKey:CategoryID" json:"-"`
}
```

### **File:** `internal/entity/job.go`

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

type JobType string
type JobStatus string

const (
	JobTypeFullTime  JobType = "full-time"
	JobTypePartTime  JobType = "part-time"
	JobTypeContract  JobType = "contract"
	JobTypeInternship JobType = "internship"
	JobTypeFreelance JobType = "freelance"
)

const (
	JobStatusDraft   JobStatus = "draft"
	JobStatusOpen    JobStatus = "open"
	JobStatusClosed  JobStatus = "closed"
	JobStatusExpired JobStatus = "expired"
)

type Job struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	RecruiterID uint           `gorm:"not null;index" json:"recruiter_id"`
	CategoryID  uint           `gorm:"not null;index" json:"category_id"`
	Title       string         `gorm:"size:200;not null;index" json:"title"`
	Description string         `gorm:"type:text;not null" json:"description"`
	Company     string         `gorm:"size:100;not null;index" json:"company"`
	Location    string         `gorm:"size:100;not null;index" json:"location"`
	SalaryMin   int64          `gorm:"default:0" json:"salary_min"`
	SalaryMax   int64          `gorm:"default:0" json:"salary_max"`
	JobType     JobType        `gorm:"type:varchar(20);not null;index" json:"job_type"`
	Status      JobStatus      `gorm:"type:varchar(20);not null;index;default:'draft'" json:"status"`
	ExpiredAt   *time.Time     `gorm:"index" json:"expired_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Recruiter    User          `gorm:"foreignKey:RecruiterID" json:"recruiter,omitempty"`
	Category     Category      `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Applications []Application `gorm:"foreignKey:JobID" json:"-"`
	SavedJobs    []SavedJob    `gorm:"foreignKey:JobID" json:"-"`
}
```

### **File:** `internal/entity/application.go`

```go
package entity

import (
	"time"

	"gorm.io/gorm"
)

type ApplicationStatus string

const (
	ApplicationStatusPending  ApplicationStatus = "pending"
	ApplicationStatusReviewed ApplicationStatus = "reviewed"
	ApplicationStatusAccepted ApplicationStatus = "accepted"
	ApplicationStatusRejected ApplicationStatus = "rejected"
)

type Application struct {
	ID          uint              `gorm:"primaryKey" json:"id"`
	JobID       uint              `gorm:"not null;index" json:"job_id"`
	UserID      uint              `gorm:"not null;index" json:"user_id"`
	CVPath      string            `gorm:"size:255;not null" json:"cv_path"`
	CoverLetter string            `gorm:"type:text" json:"cover_letter"`
	Status      ApplicationStatus `gorm:"type:varchar(20);not null;default:'pending';index" json:"status"`
	AppliedAt   time.Time         `gorm:"not null" json:"applied_at"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	DeletedAt   gorm.DeletedAt    `gorm:"index" json:"-"`

	// Relationships
	Job  Job  `gorm:"foreignKey:JobID" json:"job,omitempty"`
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
```

### **File:** `internal/entity/saved_job.go`

```go
package entity

import (
	"time"
)

type SavedJob struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	JobID     uint      `gorm:"not null;index" json:"job_id"`
	CreatedAt time.Time `json:"created_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
	Job  Job  `gorm:"foreignKey:JobID" json:"job,omitempty"`
}

// Composite unique index: one user can save one job only once
func (SavedJob) TableName() string {
	return "saved_jobs"
}
```

### **File:** `internal/entity/audit_log.go`

```go
package entity

import (
	"time"
)

type AuditLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"index" json:"user_id"`
	EntityType string    `gorm:"size:50;not null;index" json:"entity_type"` // "job", "application"
	EntityID   uint      `gorm:"index" json:"entity_id"`
	Action     string    `gorm:"size:50;not null;index" json:"action"` // "create", "update", "delete", "apply"
	Changes    string    `gorm:"type:jsonb" json:"changes"`            // JSON field untuk detail perubahan
	IPAddress  string    `gorm:"size:50" json:"ip_address"`
	UserAgent  string    `gorm:"size:255" json:"user_agent"`
	CreatedAt  time.Time `json:"created_at"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}
```

---

## **Step 3: Repository Layer**

### **File:** `internal/repository/user_repository.go`

```go
package repository

import (
	"github.com/yourusername/job-board-api/internal/entity"
	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *entity.User) error
	FindByEmail(email string) (*entity.User, error)
	FindByID(id uint) (*entity.User, error)
	FindByAPIKey(apiKey string) (*entity.User, error)
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
	return &user, err
}

func (r *userRepository) FindByID(id uint) (*entity.User, error) {
	var user entity.User
	err := r.db.First(&user, id).Error
	return &user, err
}

func (r *userRepository) FindByAPIKey(apiKey string) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("api_key = ?", apiKey).First(&user).Error
	return &user, err
}

func (r *userRepository) Update(user *entity.User) error {
	return r.db.Save(user).Error
}
```

### **File:** `internal/repository/category_repository.go`

```go
package repository

import (
	"github.com/yourusername/job-board-api/internal/entity"
	"gorm.io/gorm"
)

type CategoryRepository interface {
	Create(category *entity.Category) error
	FindAll() ([]entity.Category, error)
	FindByID(id uint) (*entity.Category, error)
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
	err := r.db.Find(&categories).Error
	return categories, err
}

func (r *categoryRepository) FindByID(id uint) (*entity.Category, error) {
	var category entity.Category
	err := r.db.First(&category, id).Error
	return &category, err
}

func (r *categoryRepository) FindBySlug(slug string) (*entity.Category, error) {
	var category entity.Category
	err := r.db.Where("slug = ?", slug).First(&category).Error
	return &category, err
}
```

### **File:** `internal/repository/job_repository.go`

```go
package repository

import (
	"time"

	"github.com/yourusername/job-board-api/internal/entity"
	"gorm.io/gorm"
)

type JobFilter struct {
	Status     string
	CategoryID *uint
	Location   string
	JobType    string
	Company    string
	Search     string
	MinSalary  *int64
	MaxSalary  *int64
}

type JobRepository interface {
	Create(job *entity.Job) error
	Update(job *entity.Job) error
	Delete(id uint) error
	FindByID(id uint) (*entity.Job, error)
	FindByIDWithRelations(id uint) (*entity.Job, error)
	FindAll(filter JobFilter, page, limit int) ([]entity.Job, int64, error)
	FindByRecruiterID(recruiterID uint, page, limit int) ([]entity.Job, int64, error)
	CountByStatus(status entity.JobStatus) (int64, error)
	FindExpiredJobs() ([]entity.Job, error)
	GetJobsByCategory() (map[string]int64, error)
	GetTopCompanies(limit int) ([]map[string]interface{}, error)
}

type jobRepository struct {
	db *gorm.DB
}

func NewJobRepository(db *gorm.DB) JobRepository {
	return &jobRepository{db: db}
}

func (r *jobRepository) Create(job *entity.Job) error {
	return r.db.Create(job).Error
}

func (r *jobRepository) Update(job *entity.Job) error {
	return r.db.Save(job).Error
}

func (r *jobRepository) Delete(id uint) error {
	return r.db.Delete(&entity.Job{}, id).Error
}

func (r *jobRepository) FindByID(id uint) (*entity.Job, error) {
	var job entity.Job
	err := r.db.First(&job, id).Error
	return &job, err
}

func (r *jobRepository) FindByIDWithRelations(id uint) (*entity.Job, error) {
	var job entity.Job
	err := r.db.Preload("Recruiter").Preload("Category").First(&job, id).Error
	return &job, err
}

func (r *jobRepository) FindAll(filter JobFilter, page, limit int) ([]entity.Job, int64, error) {
	var jobs []entity.Job
	var total int64

	query := r.db.Model(&entity.Job{})

	// Apply filters
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	if filter.CategoryID != nil {
		query = query.Where("category_id = ?", *filter.CategoryID)
	}

	if filter.Location != "" {
		query = query.Where("location ILIKE ?", "%"+filter.Location+"%")
	}

	if filter.JobType != "" {
		query = query.Where("job_type = ?", filter.JobType)
	}

	if filter.Company != "" {
		query = query.Where("company ILIKE ?", "%"+filter.Company+"%")
	}

	if filter.Search != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?", "%"+filter.Search+"%", "%"+filter.Search+"%")
	}

	if filter.MinSalary != nil {
		query = query.Where("salary_max >= ?", *filter.MinSalary)
	}

	if filter.MaxSalary != nil {
		query = query.Where("salary_min <= ?", *filter.MaxSalary)
	}

	// Count total
	query.Count(&total)

	// Pagination
	offset := (page - 1) * limit
	err := query.
		Preload("Recruiter").
		Preload("Category").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&jobs).Error

	return jobs, total, err
}

func (r *jobRepository) FindByRecruiterID(recruiterID uint, page, limit int) ([]entity.Job, int64, error) {
	var jobs []entity.Job
	var total int64

	query := r.db.Model(&entity.Job{}).Where("recruiter_id = ?", recruiterID)

	query.Count(&total)

	offset := (page - 1) * limit
	err := query.
		Preload("Category").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&jobs).Error

	return jobs, total, err
}

func (r *jobRepository) CountByStatus(status entity.JobStatus) (int64, error) {
	var count int64
	err := r.db.Model(&entity.Job{}).Where("status = ?", status).Count(&count).Error
	return count, err
}

func (r *jobRepository) FindExpiredJobs() ([]entity.Job, error) {
	var jobs []entity.Job
	now := time.Now()
	err := r.db.Where("status = ? AND expired_at < ?", entity.JobStatusOpen, now).Find(&jobs).Error
	return jobs, err
}

// GetJobsByCategory - Aggregate query untuk stats
func (r *jobRepository) GetJobsByCategory() (map[string]int64, error) {
	type Result struct {
		CategoryName string
		Count        int64
	}

	var results []Result
	err := r.db.Model(&entity.Job{}).
		Select("categories.name as category_name, COUNT(jobs.id) as count").
		Joins("JOIN categories ON categories.id = jobs.category_id").
		Where("jobs.deleted_at IS NULL").
		Group("categories.name").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	stats := make(map[string]int64)
	for _, r := range results {
		stats[r.CategoryName] = r.Count
	}

	return stats, nil
}

// GetTopCompanies - Top 5 companies by job count
func (r *jobRepository) GetTopCompanies(limit int) ([]map[string]interface{}, error) {
	type Result struct {
		Company  string
		JobCount int64
	}

	var results []Result
	err := r.db.Model(&entity.Job{}).
		Select("company, COUNT(id) as job_count").
		Where("deleted_at IS NULL AND status = ?", entity.JobStatusOpen).
		Group("company").
		Order("job_count DESC").
		Limit(limit).
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	companies := make([]map[string]interface{}, len(results))
	for i, r := range results {
		companies[i] = map[string]interface{}{
			"company":   r.Company,
			"job_count": r.JobCount,
		}
	}

	return companies, nil
}
```

### **File:** `internal/repository/application_repository.go`

```go
package repository

import (
	"github.com/yourusername/job-board-api/internal/entity"
	"gorm.io/gorm"
)

type ApplicationRepository interface {
	Create(application *entity.Application) error
	Update(application *entity.Application) error
	FindByID(id uint) (*entity.Application, error)
	FindByJobAndUser(jobID, userID uint) (*entity.Application, error)
	FindByUserID(userID uint, page, limit int) ([]entity.Application, int64, error)
	FindByJobID(jobID uint) ([]entity.Application, error)
	CountByJobID(jobID uint) (int64, error)
	HasApplied(jobID, userID uint) (bool, error)
}

type applicationRepository struct {
	db *gorm.DB
}

func NewApplicationRepository(db *gorm.DB) ApplicationRepository {
	return &applicationRepository{db: db}
}

func (r *applicationRepository) Create(application *entity.Application) error {
	return r.db.Create(application).Error
}

func (r *applicationRepository) Update(application *entity.Application) error {
	return r.db.Save(application).Error
}

func (r *applicationRepository) FindByID(id uint) (*entity.Application, error) {
	var application entity.Application
	err := r.db.Preload("Job").Preload("User").First(&application, id).Error
	return &application, err
}

func (r *applicationRepository) FindByJobAndUser(jobID, userID uint) (*entity.Application, error) {
	var application entity.Application
	err := r.db.Where("job_id = ? AND user_id = ?", jobID, userID).First(&application).Error
	return &application, err
}

func (r *applicationRepository) FindByUserID(userID uint, page, limit int) ([]entity.Application, int64, error) {
	var applications []entity.Application
	var total int64

	query := r.db.Model(&entity.Application{}).Where("user_id = ?", userID)
	query.Count(&total)

	offset := (page - 1) * limit
	err := query.
		Preload("Job").
		Preload("Job.Category").
		Order("applied_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&applications).Error

	return applications, total, err
}

func (r *applicationRepository) FindByJobID(jobID uint) ([]entity.Application, error) {
	var applications []entity.Application
	err := r.db.Where("job_id = ?", jobID).
		Preload("User").
		Order("applied_at DESC").
		Find(&applications).Error
	return applications, err
}

func (r *applicationRepository) CountByJobID(jobID uint) (int64, error) {
	var count int64
	err := r.db.Model(&entity.Application{}).Where("job_id = ?", jobID).Count(&count).Error
	return count, err
}

func (r *applicationRepository) HasApplied(jobID, userID uint) (bool, error) {
	var count int64
	err := r.db.Model(&entity.Application{}).
		Where("job_id = ? AND user_id = ?", jobID, userID).
		Count(&count).Error
	return count > 0, err
}
```

### **File:** `internal/repository/saved_job_repository.go`

```go
package repository

import (
	"github.com/yourusername/job-board-api/internal/entity"
	"gorm.io/gorm"
)

type SavedJobRepository interface {
	Save(savedJob *entity.SavedJob) error
	Unsave(userID, jobID uint) error
	FindByUserID(userID uint, page, limit int) ([]entity.SavedJob, int64, error)
	IsSaved(userID, jobID uint) (bool, error)
}

type savedJobRepository struct {
	db *gorm.DB
}

func NewSavedJobRepository(db *gorm.DB) SavedJobRepository {
	return &savedJobRepository{db: db}
}

func (r *savedJobRepository) Save(savedJob *entity.SavedJob) error {
	return r.db.Create(savedJob).Error
}

func (r *savedJobRepository) Unsave(userID, jobID uint) error {
	return r.db.Where("user_id = ? AND job_id = ?", userID, jobID).
		Delete(&entity.SavedJob{}).Error
}

func (r *savedJobRepository) FindByUserID(userID uint, page, limit int) ([]entity.SavedJob, int64, error) {
	var savedJobs []entity.SavedJob
	var total int64

	query := r.db.Model(&entity.SavedJob{}).Where("user_id = ?", userID)
	query.Count(&total)

	offset := (page - 1) * limit
	err := query.
		Preload("Job").
		Preload("Job.Recruiter").
		Preload("Job.Category").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&savedJobs).Error

	return savedJobs, total, err
}

func (r *savedJobRepository) IsSaved(userID, jobID uint) (bool, error) {
	var count int64
	err := r.db.Model(&entity.SavedJob{}).
		Where("user_id = ? AND job_id = ?", userID, jobID).
		Count(&count).Error
	return count > 0, err
}
```

### **File:** `internal/repository/audit_log_repository.go`

```go
package repository

import (
	"github.com/yourusername/job-board-api/internal/entity"
	"gorm.io/gorm"
)

type AuditLogRepository interface {
	Create(log *entity.AuditLog) error
	FindByEntityType(entityType string, page, limit int) ([]entity.AuditLog, int64, error)
	FindByUserID(userID uint, page, limit int) ([]entity.AuditLog, int64, error)
}

type auditLogRepository struct {
	db *gorm.DB
}

func NewAuditLogRepository(db *gorm.DB) AuditLogRepository {
	return &auditLogRepository{db: db}
}

func (r *auditLogRepository) Create(log *entity.AuditLog) error {
	return r.db.Create(log).Error
}

func (r *auditLogRepository) FindByEntityType(entityType string, page, limit int) ([]entity.AuditLog, int64, error) {
	var logs []entity.AuditLog
	var total int64

	query := r.db.Model(&entity.AuditLog{}).Where("entity_type = ?", entityType)
	query.Count(&total)

	offset := (page - 1) * limit
	err := query.
		Preload("User").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs).Error

	return logs, total, err
}

func (r *auditLogRepository) FindByUserID(userID uint, page, limit int) ([]entity.AuditLog, int64, error) {
	var logs []entity.AuditLog
	var total int64

	query := r.db.Model(&entity.AuditLog{}).Where("user_id = ?", userID)
	query.Count(&total)

	offset := (page - 1) * limit
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs).Error

	return logs, total, err
}
```

---

## **Step 4: DTOs (Data Transfer Objects)**

### **File:** `internal/dto/auth_dto.go`

```go
package dto

type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=3,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Role     string `json:"role" validate:"required,oneof=recruiter jobseeker"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	Token  string      `json:"token"`
	User   UserSummary `json:"user"`
	APIKey string      `json:"api_key,omitempty"`
}

type UserSummary struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}
```

###**File:** `internal/dto/job_dto.go`

```go
package dto

import "time"

type CreateJobRequest struct {
	CategoryID  uint   `json:"category_id" validate:"required"`
	Title       string `json:"title" validate:"required,min=10,max=200"`
	Description string `json:"description" validate:"required,min=50"`
	Company     string `json:"company" validate:"required,min=2,max=100"`
	Location    string `json:"location" validate:"required,min=2,max=100"`
	SalaryMin   int64  `json:"salary_min" validate:"gte=0"`
	SalaryMax   int64  `json:"salary_max" validate:"gte=0,gtefield=SalaryMin"`
	JobType     string `json:"job_type" validate:"required,oneof=full-time part-time contract internship freelance"`
	Status      string `json:"status" validate:"required,oneof=draft open closed"`
	ExpiredAt   string `json:"expired_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}

type UpdateJobRequest struct {
	CategoryID  *uint   `json:"category_id"`
	Title       *string `json:"title" validate:"omitempty,min=10,max=200"`
	Description *string `json:"description" validate:"omitempty,min=50"`
	Company     *string `json:"company" validate:"omitempty,min=2,max=100"`
	Location    *string `json:"location" validate:"omitempty,min=2,max=100"`
	SalaryMin   *int64  `json:"salary_min" validate:"omitempty,gte=0"`
	SalaryMax   *int64  `json:"salary_max" validate:"omitempty,gte=0"`
	JobType     *string `json:"job_type" validate:"omitempty,oneof=full-time part-time contract internship freelance"`
	Status      *string `json:"status" validate:"omitempty,oneof=draft open closed"`
	ExpiredAt   *string `json:"expired_at" validate:"omitempty,datetime=2006-01-02T15:04:05Z07:00"`
}

type JobResponse struct {
	ID               uint      `json:"id"`
	RecruiterID      uint      `json:"recruiter_id"`
	RecruiterName    string    `json:"recruiter_name"`
	CategoryID       uint      `json:"category_id"`
	CategoryName     string    `json:"category_name"`
	Title            string    `json:"title"`
	Description      string    `json:"description"`
	Company          string    `json:"company"`
	Location         string    `json:"location"`
	SalaryMin        int64     `json:"salary_min"`
	SalaryMax        int64     `json:"salary_max"`
	JobType          string    `json:"job_type"`
	Status           string    `json:"status"`
	ExpiredAt        *time.Time `json:"expired_at"`
	ApplicationCount int64     `json:"application_count"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type PaginatedJobsResponse struct {
	Data       []JobResponse `json:"data"`
	Pagination PaginationMeta `json:"pagination"`
}
```

### **File:** `internal/dto/application_dto.go`

```go
package dto

import "time"

type ApplyJobRequest struct {
	CoverLetter string `json:"cover_letter" validate:"omitempty,max=1000"`
}

type ApplicationResponse struct {
	ID          uint      `json:"id"`
	JobID       uint      `json:"job_id"`
	JobTitle    string    `json:"job_title"`
	Company     string    `json:"company"`
	UserID      uint      `json:"user_id"`
	UserName    string    `json:"user_name"`
	UserEmail   string    `json:"user_email"`
	CVPath      string    `json:"cv_path"`
	CoverLetter string    `json:"cover_letter"`
	Status      string    `json:"status"`
	AppliedAt   time.Time `json:"applied_at"`
}

type PaginatedApplicationsResponse struct {
	Data       []ApplicationResponse `json:"data"`
	Pagination PaginationMeta        `json:"pagination"`
}
```

### **File:** `internal/dto/stats_dto.go`

```go
package dto

type JobStatsResponse struct {
	TotalJobs       int64                    `json:"total_jobs"`
	OpenJobs        int64                    `json:"open_jobs"`
	ClosedJobs      int64                    `json:"closed_jobs"`
	DraftJobs       int64                    `json:"draft_jobs"`
	JobsByCategory  map[string]int64         `json:"jobs_by_category"`
	TopCompanies    []map[string]interface{} `json:"top_companies"`
}

type PaginationMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
}
```

---

## **Step 5: Utilities**

### **File:** `internal/util/hash.go`

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

### **File:** `internal/util/jwt.go`

```go
package util

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/yourusername/job-board-api/internal/config"
	"github.com/yourusername/job-board-api/internal/entity"
)

type Claims struct {
	UserID uint             `json:"user_id"`
	Email  string           `json:"email"`
	Role   entity.UserRole  `json:"role"`
	jwt.RegisteredClaims
}

func GenerateJWT(userID uint, email string, role entity.UserRole, cfg *config.Config) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(cfg.JWT.ExpireDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWT.Secret))
}

func ValidateJWT(tokenString string, cfg *config.Config) (*Claims, error) {
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

### **File:** `internal/util/api_key.go`

```go
package util

import (
	"crypto/rand"
	"encoding/hex"
)

func GenerateAPIKey() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
```

### **File:** `internal/util/validator.go`

```go
package util

import (
	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
}

func ValidateStruct(s interface{}) error {
	return validate.Struct(s)
}
```

### **File:** `internal/util/sanitizer.go`

```go
package util

import (
	"github.com/microcosm-cc/bluemonday"
)

var policy *bluemonday.Policy

func init() {
	policy = bluemonday.StrictPolicy()
}

func Sanitize(input string) string {
	return policy.Sanitize(input)
}
```

### **File:** `internal/util/response.go`

```go
package util

import "github.com/gofiber/fiber/v2"

type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func SuccessResponse(c *fiber.Ctx, status int, message string, data interface{}) error {
	return c.Status(status).JSON(Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func ErrorResponse(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(Response{
		Success: false,
		Error:   message,
	})
}
```

### **File:** `internal/util/error.go`

```go
package util

import "errors"

var (
	ErrUnauthorized     = errors.New("unauthorized")
	ErrForbidden        = errors.New("forbidden")
	ErrNotFound         = errors.New("not found")
	ErrBadRequest       = errors.New("bad request")
	ErrInternalServer   = errors.New("internal server error")
	ErrAlreadyExists    = errors.New("already exists")
	ErrAlreadyApplied   = errors.New("already applied to this job")
	ErrJobExpired       = errors.New("job has expired")
	ErrInvalidFile      = errors.New("invalid file")
)
```

---

## **Step 6: Auth Service & Middleware**

### **File:** `internal/service/auth_service.go`

```go
package service

import (
	"errors"

	"github.com/yourusername/job-board-api/internal/config"
	"github.com/yourusername/job-board-api/internal/dto"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/repository"
	"github.com/yourusername/job-board-api/internal/util"
	"gorm.io/gorm"
)

type AuthService interface {
	Register(req dto.RegisterRequest) (*dto.AuthResponse, error)
	Login(req dto.LoginRequest) (*dto.AuthResponse, error)
	GenerateAPIKey(userID uint) (string, error)
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
	_, err := s.userRepo.FindByEmail(req.Email)
	if err == nil {
		return nil, util.ErrAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
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
		Role:     entity.UserRole(req.Role),
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Generate JWT
	token, err := util.GenerateJWT(user.ID, user.Email, user.Role, s.cfg)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User: dto.UserSummary{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
			Role:  string(user.Role),
		},
	}, nil
}

func (s *authService) Login(req dto.LoginRequest) (*dto.AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, util.ErrUnauthorized
		}
		return nil, err
	}

	// Check password
	if !util.CheckPassword(user.Password, req.Password) {
		return nil, util.ErrUnauthorized
	}

	// Generate JWT
	token, err := util.GenerateJWT(user.ID, user.Email, user.Role, s.cfg)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		Token: token,
		User: dto.UserSummary{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
			Role:  string(user.Role),
		},
		APIKey: user.APIKey,
	}, nil
}

func (s *authService) GenerateAPIKey(userID uint) (string, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return "", err
	}

	apiKey, err := util.GenerateAPIKey()
	if err != nil {
		return "", err
	}

	user.APIKey = apiKey
	if err := s.userRepo.Update(user); err != nil {
		return "", err
	}

	return apiKey, nil
}
```

### **File:** `internal/middleware/auth_middleware.go`

```go
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/job-board-api/internal/config"
	"github.com/yourusername/job-board-api/internal/repository"
	"github.com/yourusername/job-board-api/internal/util"
)

func AuthMiddleware(cfg *config.Config, userRepo repository.UserRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check for API Key first (header: X-API-Key)
		apiKey := c.Get("X-API-Key")
		if apiKey != "" {
			user, err := userRepo.FindByAPIKey(apiKey)
			if err == nil {
				c.Locals("userID", user.ID)
				c.Locals("email", user.Email)
				c.Locals("role", string(user.Role))
				return c.Next()
			}
		}

		// Check for JWT token
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return util.ErrorResponse(c, fiber.StatusUnauthorized, "missing authorization header")
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return util.ErrorResponse(c, fiber.StatusUnauthorized, "invalid authorization header")
		}

		tokenString := parts[1]
		claims, err := util.ValidateJWT(tokenString, cfg)
		if err != nil {
			return util.ErrorResponse(c, fiber.StatusUnauthorized, "invalid token")
		}

		// Set user info ke context
		c.Locals("userID", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", string(claims.Role))

		return c.Next()
	}
}
```

### **File:** `internal/middleware/role_middleware.go`

```go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/util"
)

func RequireRole(roles ...entity.UserRole) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole := c.Locals("role").(string)

		for _, role := range roles {
			if userRole == string(role) {
				return c.Next()
			}
		}

		return util.ErrorResponse(c, fiber.StatusForbidden, "insufficient permissions")
	}
}
```

### **File:** `internal/middleware/permission_middleware.go`

```go
package middleware

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/repository"
	"github.com/yourusername/job-board-api/internal/util"
)

// CheckJobOwnership - middleware untuk cek apakah recruiter adalah owner job
func CheckJobOwnership(jobRepo repository.JobRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID").(uint)
		role := c.Locals("role").(string)

		// Jika bukan recruiter, skip (akan ditangani di handler)
		if role != string(entity.RoleRecruiter) {
			return c.Next()
		}

		jobIDStr := c.Params("id")
		jobID, err := strconv.ParseUint(jobIDStr, 10, 32)
		if err != nil {
			return util.ErrorResponse(c, fiber.StatusBadRequest, "invalid job ID")
		}

		job, err := jobRepo.FindByID(uint(jobID))
		if err != nil {
			return util.ErrorResponse(c, fiber.StatusNotFound, "job not found")
		}

		if job.RecruiterID != userID {
			return util.ErrorResponse(c, fiber.StatusForbidden, "you don't have permission to modify this job")
		}

		// Store job di context untuk reuse di handler
		c.Locals("job", job)
		return c.Next()
	}
}
```

### **File:** `internal/middleware/logger_middleware.go`

```go
package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

func LoggerMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Generate request ID
		requestID := uuid.New().String()
		c.Locals("requestID", requestID)
		c.Set("X-Request-ID", requestID)

		start := time.Now()

		// Process request
		err := c.Next()

		duration := time.Since(start)

		// Log request
		log.Info().
			Str("request_id", requestID).
			Str("method", c.Method()).
			Str("path", c.Path()).
			Int("status", c.Response().StatusCode()).
			Dur("duration", duration).
			Str("ip", c.IP()).
			Msg("HTTP request")

		return err
	}
}
```

### **File:** `internal/middleware/security_middleware.go`

```go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/yourusername/job-board-api/internal/config"
	"time"
)

func SetupSecurity(app *fiber.App, cfg *config.Config) {
	// Recovery middleware
	app.Use(recover.New())

	// CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,PATCH",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization,X-API-Key",
	}))

	// Helmet (security headers)
	app.Use(helmet.New())

	// Rate limiting
	app.Use(limiter.New(limiter.Config{
		Max:        cfg.RateLimit.Requests,
		Expiration: time.Duration(cfg.RateLimit.Duration) * time.Second,
	}))
}
```

---

## **Step 7: Business Services**

### **File:** `internal/service/job_service.go`

```go
package service

import (
	"time"

	"github.com/yourusername/job-board-api/internal/dto"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/repository"
	"github.com/yourusername/job-board-api/internal/util"
)

type JobService interface {
	Create(recruiterID uint, req dto.CreateJobRequest) (*dto.JobResponse, error)
	Update(jobID uint, req dto.UpdateJobRequest) (*dto.JobResponse, error)
	Delete(jobID uint) error
	GetByID(jobID uint) (*dto.JobResponse, error)
	GetAll(filter repository.JobFilter, page, limit int) (*dto.PaginatedJobsResponse, error)
	GetMyJobs(recruiterID uint, page, limit int) (*dto.PaginatedJobsResponse, error)
}

type jobService struct {
	jobRepo         repository.JobRepository
	categoryRepo    repository.CategoryRepository
	applicationRepo repository.ApplicationRepository
}

func NewJobService(
	jobRepo repository.JobRepository,
	categoryRepo repository.CategoryRepository,
	applicationRepo repository.ApplicationRepository,
) JobService {
	return &jobService{
		jobRepo:         jobRepo,
		categoryRepo:    categoryRepo,
		applicationRepo: applicationRepo,
	}
}

func (s *jobService) Create(recruiterID uint, req dto.CreateJobRequest) (*dto.JobResponse, error) {
	// Validate category exists
	if _, err := s.categoryRepo.FindByID(req.CategoryID); err != nil {
		return nil, util.ErrNotFound
	}

	// Parse expired_at
	var expiredAt *time.Time
	if req.ExpiredAt != "" {
		t, err := time.Parse(time.RFC3339, req.ExpiredAt)
		if err != nil {
			return nil, util.ErrBadRequest
		}
		expiredAt = &t
	}

	job := &entity.Job{
		RecruiterID: recruiterID,
		CategoryID:  req.CategoryID,
		Title:       util.Sanitize(req.Title),
		Description: util.Sanitize(req.Description),
		Company:     util.Sanitize(req.Company),
		Location:    util.Sanitize(req.Location),
		SalaryMin:   req.SalaryMin,
		SalaryMax:   req.SalaryMax,
		JobType:     entity.JobType(req.JobType),
		Status:      entity.JobStatus(req.Status),
		ExpiredAt:   expiredAt,
	}

	if err := s.jobRepo.Create(job); err != nil {
		return nil, err
	}

	return s.GetByID(job.ID)
}

func (s *jobService) Update(jobID uint, req dto.UpdateJobRequest) (*dto.JobResponse, error) {
	job, err := s.jobRepo.FindByID(jobID)
	if err != nil {
		return nil, util.ErrNotFound
	}

	// Update fields if provided
	if req.CategoryID != nil {
		if _, err := s.categoryRepo.FindByID(*req.CategoryID); err != nil {
			return nil, util.ErrNotFound
		}
		job.CategoryID = *req.CategoryID
	}

	if req.Title != nil {
		job.Title = util.Sanitize(*req.Title)
	}

	if req.Description != nil {
		job.Description = util.Sanitize(*req.Description)
	}

	if req.Company != nil {
		job.Company = util.Sanitize(*req.Company)
	}

	if req.Location != nil {
		job.Location = util.Sanitize(*req.Location)
	}

	if req.SalaryMin != nil {
		job.SalaryMin = *req.SalaryMin
	}

	if req.SalaryMax != nil {
		job.SalaryMax = *req.SalaryMax
	}

	if req.JobType != nil {
		job.JobType = entity.JobType(*req.JobType)
	}

	if req.Status != nil {
		job.Status = entity.JobStatus(*req.Status)
	}

	if req.ExpiredAt != nil {
		t, err := time.Parse(time.RFC3339, *req.ExpiredAt)
		if err != nil {
			return nil, util.ErrBadRequest
		}
		job.ExpiredAt = &t
	}

	if err := s.jobRepo.Update(job); err != nil {
		return nil, err
	}

	return s.GetByID(jobID)
}

func (s *jobService) Delete(jobID uint) error {
	return s.jobRepo.Delete(jobID)
}

func (s *jobService) GetByID(jobID uint) (*dto.JobResponse, error) {
	job, err := s.jobRepo.FindByIDWithRelations(jobID)
	if err != nil {
		return nil, util.ErrNotFound
	}

	count, _ := s.applicationRepo.CountByJobID(jobID)

	return &dto.JobResponse{
		ID:               job.ID,
		RecruiterID:      job.RecruiterID,
		RecruiterName:    job.Recruiter.Name,
		CategoryID:       job.CategoryID,
		CategoryName:     job.Category.Name,
		Title:            job.Title,
		Description:      job.Description,
		Company:          job.Company,
		Location:         job.Location,
		SalaryMin:        job.SalaryMin,
		SalaryMax:        job.SalaryMax,
		JobType:          string(job.JobType),
		Status:           string(job.Status),
		ExpiredAt:        job.ExpiredAt,
		ApplicationCount: count,
		CreatedAt:        job.CreatedAt,
		UpdatedAt:        job.UpdatedAt,
	}, nil
}

func (s *jobService) GetAll(filter repository.JobFilter, page, limit int) (*dto.PaginatedJobsResponse, error) {
	jobs, total, err := s.jobRepo.FindAll(filter, page, limit)
	if err != nil {
		return nil, err
	}

	jobResponses := make([]dto.JobResponse, len(jobs))
	for i, job := range jobs {
		count, _ := s.applicationRepo.CountByJobID(job.ID)
		jobResponses[i] = dto.JobResponse{
			ID:               job.ID,
			RecruiterID:      job.RecruiterID,
			RecruiterName:    job.Recruiter.Name,
			CategoryID:       job.CategoryID,
			CategoryName:     job.Category.Name,
			Title:            job.Title,
			Description:      job.Description,
			Company:          job.Company,
			Location:         job.Location,
			SalaryMin:        job.SalaryMin,
			SalaryMax:        job.SalaryMax,
			JobType:          string(job.JobType),
			Status:           string(job.Status),
			ExpiredAt:        job.ExpiredAt,
			ApplicationCount: count,
			CreatedAt:        job.CreatedAt,
			UpdatedAt:        job.UpdatedAt,
		}
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}

	return &dto.PaginatedJobsResponse{
		Data: jobResponses,
		Pagination: dto.PaginationMeta{
			Page:       page,
			Limit:      limit,
			TotalItems: total,
			TotalPages: totalPages,
		},
	}, nil
}

func (s *jobService) GetMyJobs(recruiterID uint, page, limit int) (*dto.PaginatedJobsResponse, error) {
	jobs, total, err := s.jobRepo.FindByRecruiterID(recruiterID, page, limit)
	if err != nil {
		return nil, err
	}

	jobResponses := make([]dto.JobResponse, len(jobs))
	for i, job := range jobs {
		count, _ := s.applicationRepo.CountByJobID(job.ID)
		jobResponses[i] = dto.JobResponse{
			ID:               job.ID,
			RecruiterID:      job.RecruiterID,
			RecruiterName:    "",
			CategoryID:       job.CategoryID,
			CategoryName:     job.Category.Name,
			Title:            job.Title,
			Description:      job.Description,
			Company:          job.Company,
			Location:         job.Location,
			SalaryMin:        job.SalaryMin,
			SalaryMax:        job.SalaryMax,
			JobType:          string(job.JobType),
			Status:           string(job.Status),
			ExpiredAt:        job.ExpiredAt,
			ApplicationCount: count,
			CreatedAt:        job.CreatedAt,
			UpdatedAt:        job.UpdatedAt,
		}
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}

	return &dto.PaginatedJobsResponse{
		Data: jobResponses,
		Pagination: dto.PaginationMeta{
			Page:       page,
			Limit:      limit,
			TotalItems: total,
			TotalPages: totalPages,
		},
	}, nil
}
```

### **File:** `internal/service/application_service.go`

```go
package service

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"

	"github.com/yourusername/job-board-api/internal/config"
	"github.com/yourusername/job-board-api/internal/dto"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/repository"
	"github.com/yourusername/job-board-api/internal/util"
	"gorm.io/gorm"
)

type ApplicationService interface {
	Apply(userID, jobID uint, cvFile *multipart.FileHeader, coverLetter string) (*dto.ApplicationResponse, error)
	GetMyApplications(userID uint, page, limit int) (*dto.PaginatedApplicationsResponse, error)
	GetJobApplications(jobID uint) ([]dto.ApplicationResponse, error)
	UpdateStatus(applicationID uint, status string) error
}

type applicationService struct {
	db              *gorm.DB
	applicationRepo repository.ApplicationRepository
	jobRepo         repository.JobRepository
	cfg             *config.Config
}

func NewApplicationService(
	db *gorm.DB,
	applicationRepo repository.ApplicationRepository,
	jobRepo repository.JobRepository,
	cfg *config.Config,
) ApplicationService {
	return &applicationService{
		db:              db,
		applicationRepo: applicationRepo,
		jobRepo:         jobRepo,
		cfg:             cfg,
	}
}

func (s *applicationService) Apply(userID, jobID uint, cvFile *multipart.FileHeader, coverLetter string) (*dto.ApplicationResponse, error) {
	// Validate file
	if cvFile == nil {
		return nil, util.ErrInvalidFile
	}

	// Check file type (hanya PDF)
	if filepath.Ext(cvFile.Filename) != ".pdf" {
		return nil, util.ErrInvalidFile
	}

	// Check file size (max 5MB)
	if cvFile.Size > s.cfg.Upload.MaxSize {
		return nil, util.ErrInvalidFile
	}

	// Check if already applied
	hasApplied, err := s.applicationRepo.HasApplied(jobID, userID)
	if err != nil {
		return nil, err
	}
	if hasApplied {
		return nil, util.ErrAlreadyApplied
	}

	// Check if job exists and open
	job, err := s.jobRepo.FindByID(jobID)
	if err != nil {
		return nil, util.ErrNotFound
	}

	if job.Status != entity.JobStatusOpen {
		return nil, util.ErrBadRequest
	}

	// Check if expired
	if job.ExpiredAt != nil && time.Now().After(*job.ExpiredAt) {
		return nil, util.ErrJobExpired
	}

	// Transaction: save file + create application
	var application *entity.Application
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Save file
		cvPath, err := s.saveCV(cvFile, userID, jobID)
		if err != nil {
			return err
		}

		// Create application
		application = &entity.Application{
			JobID:       jobID,
			UserID:      userID,
			CVPath:      cvPath,
			CoverLetter: util.Sanitize(coverLetter),
			Status:      entity.ApplicationStatusPending,
			AppliedAt:   time.Now(),
		}

		return s.applicationRepo.Create(application)
	})

	if err != nil {
		return nil, err
	}

	// Reload with relations
	application, err = s.applicationRepo.FindByID(application.ID)
	if err != nil {
		return nil, err
	}

	return &dto.ApplicationResponse{
		ID:          application.ID,
		JobID:       application.JobID,
		JobTitle:    application.Job.Title,
		Company:     application.Job.Company,
		UserID:      application.UserID,
		UserName:    application.User.Name,
		UserEmail:   application.User.Email,
		CVPath:      application.CVPath,
		CoverLetter: application.CoverLetter,
		Status:      string(application.Status),
		AppliedAt:   application.AppliedAt,
	}, nil
}

func (s *applicationService) saveCV(file *multipart.FileHeader, userID, jobID uint) (string, error) {
	// Create uploads/cv directory if not exists
	uploadDir := filepath.Join(s.cfg.Upload.Path, "cv")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", err
	}

	// Generate unique filename
	filename := fmt.Sprintf("cv_user%d_job%d_%d.pdf", userID, jobID, time.Now().Unix())
	filePath := filepath.Join(uploadDir, filename)

	// Open source file
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Create destination file
	dst, err := os.Create(filePath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	// Copy file
	if _, err := io.Copy(dst, src); err != nil {
		return "", err
	}

	return filePath, nil
}

func (s *applicationService) GetMyApplications(userID uint, page, limit int) (*dto.PaginatedApplicationsResponse, error) {
	applications, total, err := s.applicationRepo.FindByUserID(userID, page, limit)
	if err != nil {
		return nil, err
	}

	appResponses := make([]dto.ApplicationResponse, len(applications))
	for i, app := range applications {
		appResponses[i] = dto.ApplicationResponse{
			ID:          app.ID,
			JobID:       app.JobID,
			JobTitle:    app.Job.Title,
			Company:     app.Job.Company,
			UserID:      app.UserID,
			CVPath:      app.CVPath,
			CoverLetter: app.CoverLetter,
			Status:      string(app.Status),
			AppliedAt:   app.AppliedAt,
		}
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}

	return &dto.PaginatedApplicationsResponse{
		Data: appResponses,
		Pagination: dto.PaginationMeta{
			Page:       page,
			Limit:      limit,
			TotalItems: total,
			TotalPages: totalPages,
		},
	}, nil
}

func (s *applicationService) GetJobApplications(jobID uint) ([]dto.ApplicationResponse, error) {
	applications, err := s.applicationRepo.FindByJobID(jobID)
	if err != nil {
		return nil, err
	}

	appResponses := make([]dto.ApplicationResponse, len(applications))
	for i, app := range applications {
		appResponses[i] = dto.ApplicationResponse{
			ID:          app.ID,
			JobID:       app.JobID,
			UserID:      app.UserID,
			UserName:    app.User.Name,
			UserEmail:   app.User.Email,
			CVPath:      app.CVPath,
			CoverLetter: app.CoverLetter,
			Status:      string(app.Status),
			AppliedAt:   app.AppliedAt,
		}
	}

	return appResponses, nil
}

func (s *applicationService) UpdateStatus(applicationID uint, status string) error {
	application, err := s.applicationRepo.FindByID(applicationID)
	if err != nil {
		return util.ErrNotFound
	}

	application.Status = entity.ApplicationStatus(status)
	return s.applicationRepo.Update(application)
}
```

### **File:** `internal/service/saved_job_service.go`

```go
package service

import (
	"github.com/yourusername/job-board-api/internal/dto"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/repository"
	"github.com/yourusername/job-board-api/internal/util"
)

type SavedJobService interface {
	Save(userID, jobID uint) error
	Unsave(userID, jobID uint) error
	GetMySavedJobs(userID uint, page, limit int) (*dto.PaginatedJobsResponse, error)
}

type savedJobService struct {
	savedJobRepo    repository.SavedJobRepository
	jobRepo         repository.JobRepository
	applicationRepo repository.ApplicationRepository
}

func NewSavedJobService(
	savedJobRepo repository.SavedJobRepository,
	jobRepo repository.JobRepository,
	applicationRepo repository.ApplicationRepository,
) SavedJobService {
	return &savedJobService{
		savedJobRepo:    savedJobRepo,
		jobRepo:         jobRepo,
		applicationRepo: applicationRepo,
	}
}

func (s *savedJobService) Save(userID, jobID uint) error {
	// Check if job exists
	if _, err := s.jobRepo.FindByID(jobID); err != nil {
		return util.ErrNotFound
	}

	// Check if already saved
	isSaved, err := s.savedJobRepo.IsSaved(userID, jobID)
	if err != nil {
		return err
	}
	if isSaved {
		return util.ErrAlreadyExists
	}

	savedJob := &entity.SavedJob{
		UserID: userID,
		JobID:  jobID,
	}

	return s.savedJobRepo.Save(savedJob)
}

func (s *savedJobService) Unsave(userID, jobID uint) error {
	return s.savedJobRepo.Unsave(userID, jobID)
}

func (s *savedJobService) GetMySavedJobs(userID uint, page, limit int) (*dto.PaginatedJobsResponse, error) {
	savedJobs, total, err := s.savedJobRepo.FindByUserID(userID, page, limit)
	if err != nil {
		return nil, err
	}

	jobResponses := make([]dto.JobResponse, len(savedJobs))
	for i, savedJob := range savedJobs {
		job := savedJob.Job
		count, _ := s.applicationRepo.CountByJobID(job.ID)

		jobResponses[i] = dto.JobResponse{
			ID:               job.ID,
			RecruiterID:      job.RecruiterID,
			RecruiterName:    job.Recruiter.Name,
			CategoryID:       job.CategoryID,
			CategoryName:     job.Category.Name,
			Title:            job.Title,
			Description:      job.Description,
			Company:          job.Company,
			Location:         job.Location,
			SalaryMin:        job.SalaryMin,
			SalaryMax:        job.SalaryMax,
			JobType:          string(job.JobType),
			Status:           string(job.Status),
			ExpiredAt:        job.ExpiredAt,
			ApplicationCount: count,
			CreatedAt:        job.CreatedAt,
			UpdatedAt:        job.UpdatedAt,
		}
	}

	totalPages := int(total) / limit
	if int(total)%limit != 0 {
		totalPages++
	}

	return &dto.PaginatedJobsResponse{
		Data: jobResponses,
		Pagination: dto.PaginationMeta{
			Page:       page,
			Limit:      limit,
			TotalItems: total,
			TotalPages: totalPages,
		},
	}, nil
}
```

### **File:** `internal/service/stats_service.go`

```go
package service

import (
	"github.com/yourusername/job-board-api/internal/dto"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/repository"
)

type StatsService interface {
	GetJobStats() (*dto.JobStatsResponse, error)
}

type statsService struct {
	jobRepo repository.JobRepository
}

func NewStatsService(jobRepo repository.JobRepository) StatsService {
	return &statsService{jobRepo: jobRepo}
}

func (s *statsService) GetJobStats() (*dto.JobStatsResponse, error) {
	// Count by status
	openJobs, _ := s.jobRepo.CountByStatus(entity.JobStatusOpen)
	closedJobs, _ := s.jobRepo.CountByStatus(entity.JobStatusClosed)
	draftJobs, _ := s.jobRepo.CountByStatus(entity.JobStatusDraft)
	totalJobs := openJobs + closedJobs + draftJobs

	// Jobs by category (aggregate query)
	jobsByCategory, err := s.jobRepo.GetJobsByCategory()
	if err != nil {
		return nil, err
	}

	// Top companies
	topCompanies, err := s.jobRepo.GetTopCompanies(5)
	if err != nil {
		return nil, err
	}

	return &dto.JobStatsResponse{
		TotalJobs:      totalJobs,
		OpenJobs:       openJobs,
		ClosedJobs:     closedJobs,
		DraftJobs:      draftJobs,
		JobsByCategory: jobsByCategory,
		TopCompanies:   topCompanies,
	}, nil
}
```

### **File:** `internal/service/audit_service.go`

```go
package service

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/repository"
)

type AuditService interface {
	Log(userID uint, entityType string, entityID uint, action string, changes interface{}, c *fiber.Ctx)
}

type auditService struct {
	auditRepo repository.AuditLogRepository
}

func NewAuditService(auditRepo repository.AuditLogRepository) AuditService {
	return &auditService{auditRepo: auditRepo}
}

func (s *auditService) Log(userID uint, entityType string, entityID uint, action string, changes interface{}, c *fiber.Ctx) {
	changesJSON, _ := json.Marshal(changes)

	log := &entity.AuditLog{
		UserID:     userID,
		EntityType: entityType,
		EntityID:   entityID,
		Action:     action,
		Changes:    string(changesJSON),
		IPAddress:  c.IP(),
		UserAgent:  c.Get("User-Agent"),
	}

	s.auditRepo.Create(log)
}
```

### **File:** `internal/service/cache_service.go`

```go
package service

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

type CacheService interface {
	Get(key string, dest interface{}) error
	Set(key string, value interface{}, ttl time.Duration) error
	Delete(key string) error
	DeletePattern(pattern string) error
}

type cacheService struct {
	redis *redis.Client
}

func NewCacheService(redis *redis.Client) CacheService {
	return &cacheService{redis: redis}
}

func (s *cacheService) Get(key string, dest interface{}) error {
	ctx := context.Background()
	val, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		return err
	}

	return json.Unmarshal([]byte(val), dest)
}

func (s *cacheService) Set(key string, value interface{}, ttl time.Duration) error {
	ctx := context.Background()
	jsonVal, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return s.redis.Set(ctx, key, jsonVal, ttl).Err()
}

func (s *cacheService) Delete(key string) error {
	ctx := context.Background()
	return s.redis.Del(ctx, key).Err()
}

func (s *cacheService) DeletePattern(pattern string) error {
	ctx := context.Background()
	keys, err := s.redis.Keys(ctx, pattern).Result()
	if err != nil {
		return err
	}

	if len(keys) > 0 {
		return s.redis.Del(ctx, keys...).Err()
	}

	return nil
}
```

### **File:** `internal/service/export_service.go`

```go
package service

import (
	"fmt"

	"github.com/xuri/excelize/v2"
	"github.com/yourusername/job-board-api/internal/repository"
)

type ExportService interface {
	ExportApplicants(jobID uint) (*excelize.File, error)
}

type exportService struct {
	applicationRepo repository.ApplicationRepository
}

func NewExportService(applicationRepo repository.ApplicationRepository) ExportService {
	return &exportService{applicationRepo: applicationRepo}
}

func (s *exportService) ExportApplicants(jobID uint) (*excelize.File, error) {
	applications, err := s.applicationRepo.FindByJobID(jobID)
	if err != nil {
		return nil, err
	}

	file := excelize.NewFile()
	sheetName := "Applicants"
	index, _ := file.NewSheet(sheetName)
	file.SetActiveSheet(index)

	// Headers
	headers := []string{"No", "Name", "Email", "Status", "Applied At", "Cover Letter"}
	for i, header := range headers {
		cell := fmt.Sprintf("%c1", 'A'+i)
		file.SetCellValue(sheetName, cell, header)
	}

	// Data
	for i, app := range applications {
		row := i + 2
		file.SetCellValue(sheetName, fmt.Sprintf("A%d", row), i+1)
		file.SetCellValue(sheetName, fmt.Sprintf("B%d", row), app.User.Name)
		file.SetCellValue(sheetName, fmt.Sprintf("C%d", row), app.User.Email)
		file.SetCellValue(sheetName, fmt.Sprintf("D%d", row), app.Status)
		file.SetCellValue(sheetName, fmt.Sprintf("E%d", row), app.AppliedAt.Format("2006-01-02 15:04:05"))
		file.SetCellValue(sheetName, fmt.Sprintf("F%d", row), app.CoverLetter)
	}

	return file, nil
}
```

---

## **Step 8: Handlers**

Karena handlers cukup panjang, berikut ringkasan struktur handler utama:

### **File:** `internal/handler/auth_handler.go`

```go
package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/job-board-api/internal/dto"
	"github.com/yourusername/job-board-api/internal/service"
	"github.com/yourusername/job-board-api/internal/util"
)

type AuthHandler struct {
	authService service.AuthService
}

func NewAuthHandler(authService service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req dto.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, "invalid request")
	}

	if err := util.ValidateStruct(&req); err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, err.Error())
	}

	resp, err := h.authService.Register(req)
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, err.Error())
	}

	return util.SuccessResponse(c, fiber.StatusCreated, "registration successful", resp)
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, "invalid request")
	}

	if err := util.ValidateStruct(&req); err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, err.Error())
	}

	resp, err := h.authService.Login(req)
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusUnauthorized, "invalid credentials")
	}

	return util.SuccessResponse(c, fiber.StatusOK, "login successful", resp)
}

func (h *AuthHandler) GenerateAPIKey(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	apiKey, err := h.authService.GenerateAPIKey(userID)
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, "failed to generate API key")
	}

	return util.SuccessResponse(c, fiber.StatusOK, "API key generated", fiber.Map{"api_key": apiKey})
}
```

### **File:** `internal/handler/job_handler.go`

```go
package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/job-board-api/internal/dto"
	"github.com/yourusername/job-board-api/internal/repository"
	"github.com/yourusername/job-board-api/internal/service"
	"github.com/yourusername/job-board-api/internal/util"
)

type JobHandler struct {
	jobService    service.JobService
	auditService  service.AuditService
	cacheService  service.CacheService
	exportService service.ExportService
}

func NewJobHandler(
	jobService service.JobService,
	auditService service.AuditService,
	cacheService service.CacheService,
	exportService service.ExportService,
) *JobHandler {
	return &JobHandler{
		jobService:    jobService,
		auditService:  auditService,
		cacheService:  cacheService,
		exportService: exportService,
	}
}

func (h *JobHandler) Create(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	var req dto.CreateJobRequest

	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, "invalid request")
	}

	if err := util.ValidateStruct(&req); err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, err.Error())
	}

	job, err := h.jobService.Create(userID, req)
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	// Audit log
	h.auditService.Log(userID, "job", job.ID, "create", req, c)

	// Invalidate cache
	h.cacheService.DeletePattern("jobs:*")

	return util.SuccessResponse(c, fiber.StatusCreated, "job created", job)
}

func (h *JobHandler) Update(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	jobID, _ := strconv.ParseUint(c.Params("id"), 10, 32)
	var req dto.UpdateJobRequest

	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, "invalid request")
	}

	if err := util.ValidateStruct(&req); err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, err.Error())
	}

	job, err := h.jobService.Update(uint(jobID), req)
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	// Audit log
	h.auditService.Log(userID, "job", uint(jobID), "update", req, c)

	// Invalidate cache
	h.cacheService.Delete("job:" + c.Params("id"))
	h.cacheService.DeletePattern("jobs:*")

	return util.SuccessResponse(c, fiber.StatusOK, "job updated", job)
}

func (h *JobHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	jobID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

	if err := h.jobService.Delete(uint(jobID)); err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	// Audit log
	h.auditService.Log(userID, "job", uint(jobID), "delete", nil, c)

	// Invalidate cache
	h.cacheService.Delete("job:" + c.Params("id"))
	h.cacheService.DeletePattern("jobs:*")

	return util.SuccessResponse(c, fiber.StatusOK, "job deleted", nil)
}

func (h *JobHandler) GetByID(c *fiber.Ctx) error {
	jobID := c.Params("id")
	cacheKey := "job:" + jobID

	// Try cache first
	var cachedJob dto.JobResponse
	if err := h.cacheService.Get(cacheKey, &cachedJob); err == nil {
		return util.SuccessResponse(c, fiber.StatusOK, "job found (cached)", cachedJob)
	}

	id, _ := strconv.ParseUint(jobID, 10, 32)
	job, err := h.jobService.GetByID(uint(id))
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusNotFound, "job not found")
	}

	// Cache for 15 minutes
	h.cacheService.Set(cacheKey, job, 15*60*1000000000)

	return util.SuccessResponse(c, fiber.StatusOK, "job found", job)
}

func (h *JobHandler) GetAll(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	filter := repository.JobFilter{
		Status:   c.Query("status"),
		Location: c.Query("location"),
		JobType:  c.Query("job_type"),
		Company:  c.Query("company"),
		Search:   c.Query("search"),
	}

	if catID := c.Query("category_id"); catID != "" {
		id, _ := strconv.ParseUint(catID, 10, 32)
		uid := uint(id)
		filter.CategoryID = &uid
	}

	jobs, err := h.jobService.GetAll(filter, page, limit)
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	return util.SuccessResponse(c, fiber.StatusOK, "jobs retrieved", jobs)
}

func (h *JobHandler) GetMyJobs(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	jobs, err := h.jobService.GetMyJobs(userID, page, limit)
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	return util.SuccessResponse(c, fiber.StatusOK, "my jobs retrieved", jobs)
}

func (h *JobHandler) ExportApplicants(c *fiber.Ctx) error {
	jobID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

	file, err := h.exportService.ExportApplicants(uint(jobID))
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=applicants.xlsx")

	return file.Write(c.Response().BodyWriter())
}
```

### **File:** `internal/handler/application_handler.go`

```go
package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/job-board-api/internal/service"
	"github.com/yourusername/job-board-api/internal/util"
)

type ApplicationHandler struct {
	applicationService service.ApplicationService
	auditService       service.AuditService
}

func NewApplicationHandler(
	applicationService service.ApplicationService,
	auditService service.AuditService,
) *ApplicationHandler {
	return &ApplicationHandler{
		applicationService: applicationService,
		auditService:       auditService,
	}
}

func (h *ApplicationHandler) Apply(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	jobID, _ := strconv.ParseUint(c.FormValue("job_id"), 10, 32)
	coverLetter := c.FormValue("cover_letter")

	// Get CV file
	cvFile, err := c.FormFile("cv")
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, "CV file is required")
	}

	application, err := h.applicationService.Apply(userID, uint(jobID), cvFile, coverLetter)
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, err.Error())
	}

	// Audit log
	h.auditService.Log(userID, "application", application.ID, "apply", fiber.Map{
		"job_id": jobID,
	}, c)

	return util.SuccessResponse(c, fiber.StatusCreated, "application submitted", application)
}

func (h *ApplicationHandler) GetMyApplications(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	applications, err := h.applicationService.GetMyApplications(userID, page, limit)
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	return util.SuccessResponse(c, fiber.StatusOK, "applications retrieved", applications)
}

func (h *ApplicationHandler) GetJobApplications(c *fiber.Ctx) error {
	jobID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

	applications, err := h.applicationService.GetJobApplications(uint(jobID))
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	return util.SuccessResponse(c, fiber.StatusOK, "job applications retrieved", applications)
}
```

### **File:** `internal/handler/saved_job_handler.go`

```go
package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/job-board-api/internal/service"
	"github.com/yourusername/job-board-api/internal/util"
)

type SavedJobHandler struct {
	savedJobService service.SavedJobService
}

func NewSavedJobHandler(savedJobService service.SavedJobService) *SavedJobHandler {
	return &SavedJobHandler{savedJobService: savedJobService}
}

func (h *SavedJobHandler) Save(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	jobID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

	if err := h.savedJobService.Save(userID, uint(jobID)); err != nil {
		return util.ErrorResponse(c, fiber.StatusBadRequest, err.Error())
	}

	return util.SuccessResponse(c, fiber.StatusOK, "job saved", nil)
}

func (h *SavedJobHandler) Unsave(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	jobID, _ := strconv.ParseUint(c.Params("id"), 10, 32)

	if err := h.savedJobService.Unsave(userID, uint(jobID)); err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	return util.SuccessResponse(c, fiber.StatusOK, "job unsaved", nil)
}

func (h *SavedJobHandler) GetMySavedJobs(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	jobs, err := h.savedJobService.GetMySavedJobs(userID, page, limit)
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	return util.SuccessResponse(c, fiber.StatusOK, "saved jobs retrieved", jobs)
}
```

### **File:** `internal/handler/stats_handler.go`

```go
package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/job-board-api/internal/service"
	"github.com/yourusername/job-board-api/internal/util"
)

type StatsHandler struct {
	statsService service.StatsService
	cacheService service.CacheService
}

func NewStatsHandler(
	statsService service.StatsService,
	cacheService service.CacheService,
) *StatsHandler {
	return &StatsHandler{
		statsService: statsService,
		cacheService: cacheService,
	}
}

func (h *StatsHandler) GetJobStats(c *fiber.Ctx) error {
	cacheKey := "stats:jobs"

	// Try cache
	var cachedStats dto.JobStatsResponse
	if err := h.cacheService.Get(cacheKey, &cachedStats); err == nil {
		return util.SuccessResponse(c, fiber.StatusOK, "stats retrieved (cached)", cachedStats)
	}

	stats, err := h.statsService.GetJobStats()
	if err != nil {
		return util.ErrorResponse(c, fiber.StatusInternalServerError, err.Error())
	}

	// Cache for 5 minutes
	h.cacheService.Set(cacheKey, stats, 5*60*1000000000)

	return util.SuccessResponse(c, fiber.StatusOK, "stats retrieved", stats)
}
```

---

## **Step 9: Routes**

### **File:** `internal/routes/routes.go`

```go
package routes

import (
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/job-board-api/internal/config"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/handler"
	"github.com/yourusername/job-board-api/internal/middleware"
	"github.com/yourusername/job-board-api/internal/repository"
)

type Handlers struct {
	Auth        *handler.AuthHandler
	Job         *handler.JobHandler
	Application *handler.ApplicationHandler
	SavedJob    *handler.SavedJobHandler
	Stats       *handler.StatsHandler
}

func SetupRoutes(
	app *fiber.App,
	cfg *config.Config,
	userRepo repository.UserRepository,
	jobRepo repository.JobRepository,
	handlers *Handlers,
) {
	api := app.Group("/api/v1")

	// Public routes
	api.Post("/auth/register", handlers.Auth.Register)
	api.Post("/auth/login", handlers.Auth.Login)

	// Public jobs (browse)
	api.Get("/jobs", handlers.Job.GetAll)
	api.Get("/jobs/:id", handlers.Job.GetByID)

	// Stats (public)
	api.Get("/stats/jobs", handlers.Stats.GetJobStats)

	// Protected routes
	protected := api.Group("", middleware.AuthMiddleware(cfg, userRepo))

	// Generate API Key
	protected.Post("/auth/api-key", handlers.Auth.GenerateAPIKey)

	// JobSeeker routes
	jobseeker := protected.Group("", middleware.RequireRole(entity.RoleJobSeeker))
	jobseeker.Post("/applications", handlers.Application.Apply)
	jobseeker.Get("/applications/me", handlers.Application.GetMyApplications)
	jobseeker.Post("/jobs/:id/save", handlers.SavedJob.Save)
	jobseeker.Delete("/jobs/:id/save", handlers.SavedJob.Unsave)
	jobseeker.Get("/saved-jobs", handlers.SavedJob.GetMySavedJobs)

	// Recruiter routes
	recruiter := protected.Group("", middleware.RequireRole(entity.RoleRecruiter))
	recruiter.Post("/jobs", handlers.Job.Create)
	recruiter.Get("/jobs/me", handlers.Job.GetMyJobs)

	// Job ownership required
	recruiter.Put("/jobs/:id", middleware.CheckJobOwnership(jobRepo), handlers.Job.Update)
	recruiter.Delete("/jobs/:id", middleware.CheckJobOwnership(jobRepo), handlers.Job.Delete)
	recruiter.Get("/jobs/:id/applications", middleware.CheckJobOwnership(jobRepo), handlers.Application.GetJobApplications)
	recruiter.Get("/jobs/:id/export", middleware.CheckJobOwnership(jobRepo), handlers.Job.ExportApplicants)

	// Static files
	app.Static("/uploads", cfg.Upload.Path)
}
```

---

## **Step 10: Background Worker (Asynq)**

### **File:** `internal/worker/client.go`

```go
package worker

import (
	"github.com/hibiken/asynq"
	"github.com/yourusername/job-board-api/internal/config"
)

func NewAsynqClient(cfg *config.Config) *asynq.Client {
	return asynq.NewClient(asynq.RedisClientOpt{
		Addr: cfg.Asynq.RedisAddr,
	})
}
```

### **File:** `internal/worker/tasks/email_applicant.go`

```go
package tasks

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
	"github.com/rs/zerolog/log"
)

const TypeEmailApplicant = "email:applicant"

type EmailApplicantPayload struct {
	RecruiterEmail string `json:"recruiter_email"`
	JobTitle       string `json:"job_title"`
	ApplicantName  string `json:"applicant_name"`
	ApplicantEmail string `json:"applicant_email"`
}

func HandleEmailApplicantTask(ctx context.Context, t *asynq.Task) error {
	var payload EmailApplicantPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return err
	}

	log.Info().
		Str("task", TypeEmailApplicant).
		Str("recruiter", payload.RecruiterEmail).
		Msg("Processing email")

	// TODO: Replace with real SMTP
	fmt.Printf("[EMAIL] New applicant (%s) for job: %s\n", payload.ApplicantName, payload.JobTitle)
	return nil
}
```

### **File:** `internal/worker/tasks/weekly_digest.go`, `cleanup_expired.go`, `handler.go`

_(Implementasi serupa seperti contoh Event Management API - untuk lengkapnya lihat pattern di project sebelumnya)_

---

## **Step 11: Scheduler & Main Servers**

### **File:** `internal/scheduler/cron.go`

```go
package scheduler

import (
	"github.com/hibiken/asynq"
	"github.com/robfig/cron/v3"
	"github.com/rs/zerolog/log"
)

type Scheduler struct {
	cron        *cron.Cron
	asynqClient *asynq.Client
}

func NewScheduler(asynqClient *asynq.Client) *Scheduler {
	return &Scheduler{
		cron:        cron.New(),
		asynqClient: asynqClient,
	}
}

func (s *Scheduler) Start() {
	// Weekly digest (every Monday 9am)
	s.cron.AddFunc("0 9 * * 1", s.sendWeeklyDigest)
	
	// Cleanup expired jobs (daily midnight)
	s.cron.AddFunc("0 0 * * *", s.cleanupExpiredJobs)

	s.cron.Start()
	log.Info().Msg("Scheduler started")
}

func (s *Scheduler) Stop() {
	s.cron.Stop()
}

func (s *Scheduler) sendWeeklyDigest() {
	log.Info().Msg("[CRON] Sending weekly digest")
	// Enqueue tasks...
}

func (s *Scheduler) cleanupExpiredJobs() {
	log.Info().Msg("[CRON] Cleanup expired jobs")
	// Enqueue tasks...
}
```

### **File:** `cmd/api/main.go` & `cmd/worker/main.go`

_(Implementasi lengkap seperti Event Management API - setup dependencies, middleware, routes, start server)_

### **File:** `cmd/cli/seed.go`

```go
package main

import (
	"fmt"
	"time"
	"github.com/yourusername/job-board-api/internal/config"
	"github.com/yourusername/job-board-api/internal/database"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/util"
)

func main() {
	fmt.Println("🌱 Seeding database...")

	cfg, _ := config.Load()
	db, _ := database.ConnectPostgres(cfg)

	// Create users
	hashedPassword, _ := util.HashPassword("password123")

	recruiter := &entity.User{
		Name:     "John Recruiter",
		Email:    "recruiter@example.com",
		Password: hashedPassword,
		Role:     entity.RoleRecruiter,
	}

	jobseeker := &entity.User{
		Name:     "Jane JobSeeker",
		Email:    "jobseeker@example.com",
		Password: hashedPassword,
		Role:     entity.RoleJobSeeker,
	}

	db.Create(recruiter)
	db.Create(jobseeker)

	// Create categories
	categories := []entity.Category{
		{Name: "Software Engineering", Slug: "software-engineering"},
		{Name: "Data Science", Slug: "data-science"},
		{Name: "DevOps", Slug: "devops"},
	}
	for _, cat := range categories {
		db.Create(&cat)
	}

	// Create jobs
	expiredAt := time.Now().Add(30 * 24 * time.Hour)
	jobs := []entity.Job{
		{
			RecruiterID: recruiter.ID,
			CategoryID:  1,
			Title:       "Senior Go Developer",
			Description: "Build scalable backend systems with Go, PostgreSQL, Redis",
			Company:     "Tech Corp",
			Location:    "Jakarta",
			SalaryMin:   15000000,
			SalaryMax:   25000000,
			JobType:     entity.JobTypeFullTime,
			Status:      entity.JobStatusOpen,
			ExpiredAt:   &expiredAt,
		},
	}
	for _, job := range jobs {
		db.Create(&job)
	}

	fmt.Println("✅ Done!")
	fmt.Printf("Recruiter: %s / password123\n", recruiter.Email)
	fmt.Printf("JobSeeker: %s / password123\n", jobseeker.Email)
}
```

---

## **Step 12-15: Testing Framework**

### **Test Database Setup**

**File:** `test/helper/test_helper.go`

```go
package helper

import (
	"fmt"
	"github.com/yourusername/job-board-api/internal/config"
	"github.com/yourusername/job-board-api/internal/entity"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func SetupTestDB(cfg *config.Config) *gorm.DB {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Test.DBName,
		cfg.Database.SSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	// Drop all tables for clean test
	db.Migrator().DropTable(
		&entity.User{},
		&entity.Category{},
		&entity.Job{},
		&entity.Application{},
		&entity.SavedJob{},
		&entity.AuditLog{},
	)

	// Migrate
	db.AutoMigrate(
		&entity.User{},
		&entity.Category{},
		&entity.Job{},
		&entity.Application{},
		&entity.SavedJob{},
		&entity.AuditLog{},
	)

	return db
}
```

### **Unit Test Example**

**File:** `test/unit/auth_service_test.go`

```go
package unit

import (
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/yourusername/job-board-api/internal/dto"
	"github.com/yourusername/job-board-api/internal/entity"
	"github.com/yourusername/job-board-api/internal/service"
	"github.com/yourusername/job-board-api/internal/config"
)

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(user *entity.User) error {
	args := m.Called(user)
	return args.Error(0)
}

func (m *MockUserRepository) FindByEmail(email string) (*entity.User, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entity.User), args.Error(1)
}

// Implement other interface methods...

func TestAuthService_Register_Success(t *testing.T) {
	mockRepo := new(MockUserRepository)
	cfg := &config.Config{
		JWT: config.JWTConfig{Secret: "test-secret", ExpireHours: 24},
	}

	authService := service.NewAuthService(mockRepo, cfg)

	req := dto.RegisterRequest{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password123",
		Role:     "jobseeker",
	}

	mockRepo.On("FindByEmail", req.Email).Return(nil, gorm.ErrRecordNotFound)
	mockRepo.On("Create", mock.Anything).Return(nil)

	resp, err := authService.Register(req)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.NotEmpty(t, resp.Token)
	assert.Equal(t, req.Email, resp.User.Email)

	mockRepo.AssertExpectations(t)
}
```

### **Integration Test Example**

**File:** `test/integration/job_test.go`

```go
package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/suite"
	"github.com/yourusername/job-board-api/internal/config"
	"github.com/yourusername/job-board-api/internal/dto"
	"github.com/yourusername/job-board-api/test/helper"
)

type JobTestSuite struct {
	suite.Suite
	app   *fiber.App
	token string
}

func (s *JobTestSuite) SetupTest() {
	cfg, _ := config.Load()
	db := helper.SetupTestDB(cfg)

	// Setup app with all dependencies...
	s.app = fiber.New()

	// Create test user & get token
	// ...
}

func (s *JobTestSuite) TestCreateJob_Success() {
	reqBody := dto.CreateJobRequest{
		CategoryID:  1,
		Title:       "Test Job",
		Description: "This is a test job description with minimum 50 characters requirement",
		Company:     "Test Company",
		Location:    "Jakarta",
		SalaryMin:   10000000,
		SalaryMax:   15000000,
		JobType:     "full-time",
		Status:      "open",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/jobs", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.token)

	resp, _ := s.app.Test(req)

	s.Equal(http.StatusCreated, resp.StatusCode)

	var response map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&response)

	s.True(response["success"].(bool))
	s.NotNil(response["data"])
}

func TestJobTestSuite(t *testing.T) {
	suite.Run(t, new(JobTestSuite))
}
```

### **Makefile untuk Testing**

**File:** `Makefile`

```makefile
.PHONY: test test-unit test-integration coverage

test:
	go test ./test/... -v

test-unit:
	go test ./test/unit/... -v

test-integration:
	go test ./test/integration/... -v

coverage:
	go test ./test/... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

run-api:
	go run cmd/api/main.go

run-worker:
	go run cmd/worker/main.go

seed:
	go run cmd/cli/seed.go

.DEFAULT_GOAL := test
```

---

## **Checklist Pembelajaran Project 3**

### **Security (Topik 10)**
- [ ] Dual authentication: JWT + API Key
- [ ] CORS configuration
- [ ] Rate limiting per endpoint
- [ ] Helmet security headers
- [ ] HTML sanitization (bluemonday)
- [ ] Input validation (go-playground/validator)
- [ ] Environment variable validation
- [ ] Password hashing (bcrypt)

### **Caching (Topik 11)**
- [ ] Redis connection setup
- [ ] Cache job list dengan filter
- [ ] Cache job detail
- [ ] Cache stats dengan TTL 5 menit
- [ ] Invalidation saat create/update/delete job
- [ ] Pattern-based cache deletion

### **Background Jobs & Scheduler (Topik 12)**
- [ ] Asynq client & server setup
- [ ] Email notification task (new applicant)
- [ ] Weekly digest task (cron-triggered)
- [ ] Cleanup expired jobs task
- [ ] Queue priorities (critical/default/low)
- [ ] Robfig/cron scheduler integration
- [ ] Graceful shutdown scheduler

### **Database Transactions & Soft Delete (Topik 13)**
- [ ] Apply job dengan transaction (save file + create application)
- [ ] Soft delete jobs (GORM DeletedAt)
- [ ] Cascade considerations untuk applications
- [ ] Transaction rollback pada error

### **Query Optimization (Topik 14)**
- [ ] N+1 fix dengan Preload (job dengan recruiter + category)
- [ ] Aggregate query (jobs by category, top companies)
- [ ] Database indexes (recruiter_id, category_id, status, etc.)
- [ ] Composite unique index (saved_jobs: user_id + job_id)
- [ ] EXPLAIN ANALYZE untuk audit query performance
- [ ] Pagination efisien

### **RBAC & Object-Level Permissions (Topik 15)**
- [ ] 2 roles: Recruiter & JobSeeker
- [ ] RequireRole middleware
- [ ] CheckJobOwnership middleware (recruiter hanya edit job miliknya)
- [ ] Role-based route separation
- [ ] Permission check di service layer

### **Logging & Monitoring (Topik 16)**
- [ ] Zerolog structured logging
- [ ] Request ID middleware (correlation tracking)
- [ ] Logger middleware (log semua HTTP requests)
- [ ] Log level berbeda (info, error, debug)
- [ ] Audit logging (siapa melakukan apa)
- [ ] IP address & user agent tracking

### **Testing (Topik 17)**
- [ ] Unit test dengan testify
- [ ] Mock repositories dengan gomock/testify mock
- [ ] Integration test dengan test database
- [ ] Test fixtures dengan gofakeit
- [ ] Test coverage 80%+
- [ ] Table-driven tests
- [ ] Test HTTP handlers dengan httptest
- [ ] Clean test database setiap run

---

## **Development Ideas**

### **Level 1: Enhancements**
1. **Email Templates**: Rich HTML email dengan template engine
2. **File Upload Validation**: Check MIME type, virus scan
3. **Job Expiration Notification**: Email ke recruiter 3 hari sebelum expired
4. **Application Status Workflow**: Tambah "interview_scheduled", "offer_sent"
5. **Search Autocomplete**: Redis-based autocomplete untuk job titles
6. **Bookmark Categories**: Organize saved jobs dengan tags
7. **Resume Parsing**: Extract info dari PDF CV (nama, skills, email)
8. **Job Alerts**: Subscribe ke kategori tertentu, email saat ada job baru

### **Level 2: Advanced Features**
1. **Real-time Notifications**: WebSocket untuk notif real-time
2. **Analytics Dashboard**: Charts untuk recruiter (views, applications over time)
3. **AI Job Matching**: Recommend jobs berdasarkan CV + history
4. **Video Interviews**: Integrate dengan Zoom/Google Meet
5. **Applicant Tracking System**: Full ATS dengan stages, notes, scores
6. **Company Pages**: Profile page untuk setiap company
7. **Job Recommendations Feed**: Personalized feed untuk jobseeker
8. **Multi-language Support**: i18n untuk berbagai bahasa

### **Level 3: Scalability & Production**
1. **Elasticsearch Integration**: Full-text search + faceted search
2. **S3 Upload**: Store CV files di S3/MinIO
3. **CDN**: Serve static assets via CDN
4. **Read Replicas**: Separate read/write databases
5. **Event Sourcing**: Track semua perubahan sebagai events
6. **API Gateway**: Kong/Traefik untuk routing
7. **Observability**: Prometheus metrics + Grafana dashboards + Jaeger tracing
8. **Multi-region Deployment**: Deploy di berbagai regions
9. **Load Balancing**: HAProxy/Nginx load balancer
10. **Blue-Green Deployment**: Zero-downtime deployments

---

## **Kesimpulan**

**Job Board API** adalah **comprehensive project** yang menggabungkan **SEMUA materi Fase 2**:

✅ **Security**: Dual auth, CORS, rate limiting, sanitization  
✅ **Caching**: Redis dengan smart invalidation  
✅ **Background Jobs**: Asynq untuk async tasks  
✅ **Scheduler**: Cron untuk recurring jobs  
✅ **Transactions**: Safe apply job dengan rollback  
✅ **Soft Delete**: GORM soft deletes  
✅ **Query Optimization**: N+1 fixes, indexes, aggregate queries  
✅ **RBAC**: Role-based + object-level permissions  
✅ **Logging**: Structured logs + request ID tracking  
✅ **Testing**: Unit + integration tests, 80%+ coverage  

### **Key Takeaways**

1. **Dual Authentication** → Flexibility (JWT untuk web, API Key untuk integrations)
2. **Object-Level Permissions** → Beyond roles (user can only edit **their own** resources)
3. **Audit Logging** → Track who did what, when (compliance & debugging)
4. **Query Optimization** → 1 query vs 100 queries (aggregate patterns)
5. **Testing** → Confidence in refactoring, catch bugs early

### **Next Steps**

1. Implement semua code step-by-step
2. Run tests: `make test` & aim for 80%+ coverage
3. Test manual dengan Postman/curl
4. Deploy API server & worker sebagai separate services
5. Monitor logs & metrics di production
6. Iterate dengan development ideas

🎉 **Selamat! Kamu sudah menguasai backend development dengan Go!**

---
