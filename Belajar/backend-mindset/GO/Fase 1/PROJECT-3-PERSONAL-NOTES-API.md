# 📝 PROJECT 3: Personal Notes API - Complete Implementation

> **Capstone Project Fase 1** - Implementasi lengkap semua topik fundamental backend dengan Go, Fiber, GORM, dan PostgreSQL

---

## 🎯 Overview

Project **Personal Notes API** adalah aplikasi catatan pribadi yang comprehensive dengan fitur-fitur production-ready seperti authentication lengkap (JWT + OAuth Google), email verification, file upload dengan image processing, tag system, export ke Excel/PDF, dan background jobs.

Project ini adalah **kulminasi dari semua topik Fase 1**, menggabungkan semua yang sudah dipelajari di Project 1 (URL Shortener) dan Project 2 (Expense Tracker) dengan tambahan fitur-fitur advanced seperti:

- ✅ **Email verification** dengan token
- ✅ **OAuth Google** login
- ✅ **File upload** (avatar + attachments) dengan validasi dan resize
- ✅ **Tag system** dengan many-to-many relationship
- ✅ **Soft delete** + **restore** functionality
- ✅ **Background jobs** dengan Asynq untuk email async
- ✅ **Export** ke Excel dan PDF
- ✅ **Advanced filtering** (multi-field, search, pagination, sorting)

### **Topik Fase 1 yang Dicakup (Semua!)**

| # | Topik | Implementasi di Project |
|---|-------|-------------------------|
| **1** | **REST API dengan Fiber** | Semua endpoint (auth, notes, tags, attachments, export) |
| **2** | **GORM & PostgreSQL** | 4 entities dengan relationships + migration + soft delete |
| **3** | **Authentication (JWT)** | Register, login, refresh, logout, token blacklist |
| **4** | **Validation & Error Handling** | Custom validators + AppError + consistent responses |
| **5** | **Pagination, Filtering, Sorting** | Advanced filtering (tag, pinned, color, date range) + search + sort |
| **6** | **File Upload & Export** | Avatar upload+resize, note attachments, Excel/PDF export |
| **7** | **Email Service** | Welcome email, verification email, attachment notification |
| **8** | **Background Jobs/Scheduler** | Asynq untuk async email sending |
| **9** | **Security Hardening** | OAuth Google, email verification, file validation, ownership check |

### **Fitur Utama**

**Authentication & Authorization:**
- Register dengan email verification
- Login dengan JWT (access + refresh token)
- OAuth Google login
- Refresh token mechanism
- Logout dengan token blacklist
- Upload & update avatar (auto-resize 200x200)
- Update profile

**Notes Management:**
- Create, read, update, delete notes
- Soft delete dengan restore functionality
- Pin/unpin notes
- Color labeling (untuk categorization)
- Rich text content support

**Tag System:**
- Many-to-many relationship (Note ↔ Tag)
- Create/assign tags to notes
- Filter notes by tags
- Tag statistics

**Attachment System:**
- Upload file per note (PDF, DOCX, images)
- Max 5MB per file
- Multiple attachments per note
- Auto-send email notification saat upload
- Download attachment

**Advanced Features:**
- Search notes (title & content)
- Multi-field filtering (tag, is_pinned, color, date range)
- Pagination dengan metadata
- Dynamic sorting (multiple columns)
- Export notes ke Excel
- Export notes ke PDF

**Email System:**
- Welcome email saat register (HTML template)
- Email verification dengan token
- Notification saat attachment diupload
- Background processing dengan Asynq

---

## 🗂️ Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────┐
│                          USERS                              │
├─────────────────────────────────────────────────────────────┤
│ id                UUID (PK)                                  │
│ name              VARCHAR(255)                               │
│ email             VARCHAR(255) UNIQUE NOT NULL               │
│ password          VARCHAR(255) (nullable for OAuth)          │
│ avatar_url        VARCHAR(500)                               │
│ email_verified    BOOLEAN DEFAULT FALSE                      │
│ verified_at       TIMESTAMP                                  │
│ oauth_provider    VARCHAR(50) ("google", "github", etc)      │
│ oauth_id          VARCHAR(255)                               │
│ created_at        TIMESTAMP                                  │
│ updated_at        TIMESTAMP                                  │
│ deleted_at        TIMESTAMP (soft delete)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1
                              │
                              │ N
┌─────────────────────────────────────────────────────────────┐
│                          NOTES                              │
├─────────────────────────────────────────────────────────────┤
│ id                UUID (PK)                                  │
│ user_id           UUID (FK → users.id) NOT NULL              │
│ title             VARCHAR(255) NOT NULL                      │
│ content           TEXT                                       │
│ color             VARCHAR(50)                                │
│ is_pinned         BOOLEAN DEFAULT FALSE                      │
│ created_at        TIMESTAMP                                  │
│ updated_at        TIMESTAMP                                  │
│ deleted_at        TIMESTAMP (soft delete)                    │
└─────────────────────────────────────────────────────────────┘
                 │                              │
                 │ 1                            │ N
                 │                              │
                 │ N                            │ 1
┌────────────────────────────┐      ┌──────────────────────────┐
│       ATTACHMENTS          │      │        NOTE_TAGS         │
├────────────────────────────┤      │   (Join Table)           │
│ id           UUID (PK)     │      ├──────────────────────────┤
│ note_id      UUID (FK)     │      │ note_id  UUID (FK, PK)   │
│ filename     VARCHAR(255)  │      │ tag_id   UUID (FK, PK)   │
│ file_url     VARCHAR(500)  │      └──────────────────────────┘
│ file_size    BIGINT        │                   │
│ mime_type    VARCHAR(100)  │                   │ N
│ created_at   TIMESTAMP     │                   │
│ updated_at   TIMESTAMP     │                   │ 1
│ deleted_at   TIMESTAMP     │      ┌──────────────────────────┐
└────────────────────────────┘      │          TAGS            │
                                    ├──────────────────────────┤
                                    │ id         UUID (PK)     │
                                    │ user_id    UUID (FK)     │
                                    │ name       VARCHAR(100)  │
                                    │ created_at TIMESTAMP     │
                                    │ updated_at TIMESTAMP     │
                                    │ deleted_at TIMESTAMP     │
                                    └──────────────────────────┘
```

**Relationships:**
- **User → Notes**: One-to-Many (1 user has many notes)
- **Note → Attachments**: One-to-Many (1 note has many attachments)
- **Note ↔ Tags**: Many-to-Many (1 note has many tags, 1 tag belongs to many notes)
- **User → Tags**: One-to-Many (1 user has many tags)

---

## 📁 Folder Structure

```
personal-notes-api/
├── cmd/
│   └── api/
│       └── main.go                    # Entry point
│
├── internal/
│   ├── config/
│   │   └── config.go                  # Viper configuration
│   │
│   ├── database/
│   │   ├── postgres.go                # PostgreSQL connection + migration
│   │   └── redis.go                   # Redis connection
│   │
│   ├── entity/
│   │   ├── base.go                    # BaseModel (UUID, timestamps, soft delete)
│   │   ├── user.go                    # User entity
│   │   ├── note.go                    # Note entity
│   │   ├── tag.go                     # Tag entity
│   │   ├── note_tag.go                # NoteTag join entity
│   │   └── attachment.go              # Attachment entity
│   │
│   ├── repository/
│   │   ├── user_repository.go         # User data access
│   │   ├── note_repository.go         # Note data access + advanced queries
│   │   ├── tag_repository.go          # Tag data access
│   │   └── attachment_repository.go   # Attachment data access
│   │
│   ├── service/
│   │   ├── auth_service.go            # Register, login, OAuth, JWT
│   │   ├── email_service.go           # Send emails (HTML templates)
│   │   ├── upload_service.go          # File upload + resize
│   │   ├── note_service.go            # Note CRUD + soft delete + restore
│   │   ├── tag_service.go             # Tag CRUD + assign
│   │   ├── attachment_service.go      # Attachment upload + download
│   │   └── export_service.go          # Excel + PDF export
│   │
│   ├── handler/
│   │   ├── auth_handler.go            # Auth endpoints
│   │   ├── note_handler.go            # Note endpoints
│   │   ├── tag_handler.go             # Tag endpoints
│   │   ├── attachment_handler.go      # Attachment endpoints
│   │   └── export_handler.go          # Export endpoints
│   │
│   ├── middleware/
│   │   ├── auth_middleware.go         # JWT validation
│   │   ├── logger_middleware.go       # Request logging
│   │   ├── recovery_middleware.go     # Panic recovery
│   │   └── request_id_middleware.go   # Request ID tracking
│   │
│   ├── dto/
│   │   ├── auth_dto.go                # Auth request/response DTOs
│   │   ├── note_dto.go                # Note request/response DTOs
│   │   ├── tag_dto.go                 # Tag request/response DTOs
│   │   └── common_dto.go              # Pagination, filter, response wrapper
│   │
│   ├── util/
│   │   ├── jwt.go                     # JWT generation + validation
│   │   ├── hash.go                    # Password hashing
│   │   ├── validator.go               # Custom validators
│   │   ├── error.go                   # AppError custom error
│   │   └── response.go                # Response helpers
│   │
│   └── worker/
│       ├── asynq.go                   # Asynq server setup
│       └── email_task.go              # Email tasks (welcome, verification, notification)
│
├── templates/
│   ├── welcome.html                   # Welcome email template
│   ├── verify_email.html              # Email verification template
│   └── attachment_notification.html   # Attachment notification template
│
├── uploads/
│   ├── avatars/                       # User avatars
│   └── attachments/                   # Note attachments
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
mkdir personal-notes-api
cd personal-notes-api
go mod init github.com/yourusername/personal-notes-api

# Install dependencies
go get github.com/gofiber/fiber/v2
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/redis/go-redis/v9
go get github.com/golang-jwt/jwt/v5
go get golang.org/x/oauth2
go get golang.org/x/oauth2/google
go get github.com/go-playground/validator/v10
go get github.com/disintegration/imaging
go get github.com/xuri/excelize/v2
go get github.com/jung-kurt/gofpdf
go get github.com/jordan-wright/email
go get github.com/hibiken/asynq
go get github.com/rs/zerolog
go get github.com/spf13/viper
go get github.com/joho/godotenv
go get golang.org/x/crypto/bcrypt
go get github.com/google/uuid
```

**File:** `.env.example`

```env
# App
APP_NAME=Personal Notes API
APP_ENV=development
APP_PORT=3000
APP_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=personal_notes

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OAuth Google
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:3000/api/v1/auth/google/callback

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=Personal Notes <noreply@personalnotes.com>

# File Upload
UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document
AVATAR_SIZE=200

# Asynq (Background Jobs)
ASYNQ_CONCURRENCY=10
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
	OAuth    OAuthConfig
	Email    EmailConfig
	Upload   UploadConfig
	Asynq    AsynqConfig
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
	Secret        string
	AccessExpiry  time.Duration
	RefreshExpiry time.Duration
}

type OAuthConfig struct {
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
}

type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	FromAddress  string
}

type UploadConfig struct {
	MaxSize       int64
	AllowedTypes  []string
	AvatarSize    int
}

type AsynqConfig struct {
	Concurrency int
}

func LoadConfig() (*Config, error) {
	viper.SetConfigFile(".env")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Warning: .env file not found, using environment variables")
	}

	// Parse durations
	accessExpiry, _ := time.ParseDuration(viper.GetString("JWT_ACCESS_EXPIRY"))
	refreshExpiry, _ := time.ParseDuration(viper.GetString("JWT_REFRESH_EXPIRY"))

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
			Secret:        viper.GetString("JWT_SECRET"),
			AccessExpiry:  accessExpiry,
			RefreshExpiry: refreshExpiry,
		},
		OAuth: OAuthConfig{
			GoogleClientID:     viper.GetString("GOOGLE_CLIENT_ID"),
			GoogleClientSecret: viper.GetString("GOOGLE_CLIENT_SECRET"),
			GoogleRedirectURL:  viper.GetString("GOOGLE_REDIRECT_URL"),
		},
		Email: EmailConfig{
			SMTPHost:     viper.GetString("SMTP_HOST"),
			SMTPPort:     viper.GetInt("SMTP_PORT"),
			SMTPUser:     viper.GetString("SMTP_USER"),
			SMTPPassword: viper.GetString("SMTP_PASSWORD"),
			FromAddress:  viper.GetString("EMAIL_FROM"),
		},
		Upload: UploadConfig{
			MaxSize:      viper.GetInt64("UPLOAD_MAX_SIZE"),
			AllowedTypes: viper.GetStringSlice("UPLOAD_ALLOWED_TYPES"),
			AvatarSize:   viper.GetInt("AVATAR_SIZE"),
		},
		Asynq: AsynqConfig{
			Concurrency: viper.GetInt("ASYNQ_CONCURRENCY"),
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

	"github.com/yourusername/personal-notes-api/internal/config"
	"github.com/yourusername/personal-notes-api/internal/entity"
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
		&entity.Note{},
		&entity.Tag{},
		&entity.NoteTag{},
		&entity.Attachment{},
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
	"github.com/yourusername/personal-notes-api/internal/config"
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

import "time"

type User struct {
	BaseModel
	Name          string     `gorm:"size:255;not null" json:"name"`
	Email         string     `gorm:"size:255;uniqueIndex;not null" json:"email"`
	Password      string     `gorm:"size:255" json:"-"` // Nullable for OAuth users
	AvatarURL     string     `gorm:"size:500" json:"avatar_url"`
	EmailVerified bool       `gorm:"default:false" json:"email_verified"`
	VerifiedAt    *time.Time `json:"verified_at,omitempty"`
	OAuthProvider string     `gorm:"size:50" json:"oauth_provider,omitempty"` // "google", "github", etc
	OAuthID       string     `gorm:"size:255" json:"oauth_id,omitempty"`

	// Relationships
	Notes       []Note       `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"notes,omitempty"`
	Tags        []Tag        `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"tags,omitempty"`
}

func (User) TableName() string {
	return "users"
}
```

**File:** `internal/entity/note.go`

```go
package entity

import "github.com/google/uuid"

type Note struct {
	BaseModel
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Title     string    `gorm:"size:255;not null" json:"title"`
	Content   string    `gorm:"type:text" json:"content"`
	Color     string    `gorm:"size:50" json:"color"`           // e.g., "#FFD700", "yellow"
	IsPinned  bool      `gorm:"default:false" json:"is_pinned"`

	// Relationships
	User        User         `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Tags        []Tag        `gorm:"many2many:note_tags" json:"tags,omitempty"`
	Attachments []Attachment `gorm:"foreignKey:NoteID;constraint:OnDelete:CASCADE" json:"attachments,omitempty"`
}

func (Note) TableName() string {
	return "notes"
}
```

**File:** `internal/entity/tag.go`

```go
package entity

import "github.com/google/uuid"

type Tag struct {
	BaseModel
	UserID uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	Name   string    `gorm:"size:100;not null" json:"name"`

	// Relationships
	User  User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Notes []Note `gorm:"many2many:note_tags" json:"notes,omitempty"`
}

func (Tag) TableName() string {
	return "tags"
}
```

**File:** `internal/entity/note_tag.go`

```go
package entity

import "github.com/google/uuid"

// NoteTag is the join table for many-to-many relationship
type NoteTag struct {
	NoteID uuid.UUID `gorm:"type:uuid;primaryKey" json:"note_id"`
	TagID  uuid.UUID `gorm:"type:uuid;primaryKey" json:"tag_id"`
}

func (NoteTag) TableName() string {
	return "note_tags"
}
```

**File:** `internal/entity/attachment.go`

```go
package entity

import "github.com/google/uuid"

type Attachment struct {
	BaseModel
	NoteID   uuid.UUID `gorm:"type:uuid;not null;index" json:"note_id"`
	Filename string    `gorm:"size:255;not null" json:"filename"`
	FileURL  string    `gorm:"size:500;not null" json:"file_url"`
	FileSize int64     `gorm:"not null" json:"file_size"` // in bytes
	MimeType string    `gorm:"size:100;not null" json:"mime_type"`

	// Relationships
	Note Note `gorm:"foreignKey:NoteID" json:"note,omitempty"`
}

func (Attachment) TableName() string {
	return "attachments"
}
```

---

### **Step 3: Repository Layer**

Mari saya lanjutkan dengan continuation placeholder dulu, lalu saya expand dengan replace_string_in_file...

**File:** `internal/repository/user_repository.go`

```go
package repository

import (
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/entity"
	"gorm.io/gorm"
)

type UserRepository interface {
	Create(user *entity.User) error
	FindByID(id uuid.UUID) (*entity.User, error)
	FindByEmail(email string) (*entity.User, error)
	FindByOAuth(provider, oauthID string) (*entity.User, error)
	Update(user *entity.User) error
	UpdateVerification(userID uuid.UUID) error
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

func (r *userRepository) FindByID(id uuid.UUID) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("id = ?", id).First(&user).Error
	return &user, err
}

func (r *userRepository) FindByEmail(email string) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *userRepository) FindByOAuth(provider, oauthID string) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("oauth_provider = ? AND oauth_id = ?", provider, oauthID).First(&user).Error
	return &user, err
}

func (r *userRepository) Update(user *entity.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) UpdateVerification(userID uuid.UUID) error {
	return r.db.Model(&entity.User{}).
		Where("id = ?", userID).
		Updates(map[string]interface{}{
			"email_verified": true,
			"verified_at":    gorm.Expr("NOW()"),
		}).Error
}
```

**File:** `internal/repository/note_repository.go`

```go
package repository

import (
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/entity"
	"gorm.io/gorm"
)

type NoteRepository interface {
	Create(note *entity.Note) error
	FindByID(id uuid.UUID) (*entity.Note, error)
	FindByIDWithRelations(id uuid.UUID) (*entity.Note, error)
	Update(note *entity.Note) error
	Delete(id uuid.UUID) error
	SoftDelete(id uuid.UUID) error
	Restore(id uuid.UUID) error
	FindAll(userID uuid.UUID, filter NoteFilter) ([]entity.Note, int64, error)
	FindTrashed(userID uuid.UUID) ([]entity.Note, error)
}

type NoteFilter struct {
	Page      int
	Limit     int
	Search    string
	TagID     *uuid.UUID
	IsPinned  *bool
	Color     string
	StartDate *time.Time
	EndDate   *time.Time
	SortBy    string
	SortOrder string
}

type noteRepository struct {
	db *gorm.DB
}

func NewNoteRepository(db *gorm.DB) NoteRepository {
	return &noteRepository{db: db}
}

func (r *noteRepository) Create(note *entity.Note) error {
	return r.db.Create(note).Error
}

func (r *noteRepository) FindByID(id uuid.UUID) (*entity.Note, error) {
	var note entity.Note
	err := r.db.Where("id = ?", id).First(&note).Error
	return &note, err
}

func (r *noteRepository) FindByIDWithRelations(id uuid.UUID) (*entity.Note, error) {
	var note entity.Note
	err := r.db.
		Preload("Tags").
		Preload("Attachments").
		Where("id = ?", id).
		First(&note).Error
	return &note, err
}

func (r *noteRepository) Update(note *entity.Note) error {
	return r.db.Save(note).Error
}

func (r *noteRepository) Delete(id uuid.UUID) error {
	// Hard delete
	return r.db.Unscoped().Delete(&entity.Note{}, "id = ?", id).Error
}

func (r *noteRepository) SoftDelete(id uuid.UUID) error {
	return r.db.Delete(&entity.Note{}, "id = ?", id).Error
}

func (r *noteRepository) Restore(id uuid.UUID) error {
	return r.db.Model(&entity.Note{}).Unscoped().
		Where("id = ?", id).
		Update("deleted_at", nil).Error
}

func (r *noteRepository) FindAll(userID uuid.UUID, filter NoteFilter) ([]entity.Note, int64, error) {
	var notes []entity.Note
	var total int64

	query := r.db.Model(&entity.Note{}).Where("user_id = ?", userID)

	// Search
	if filter.Search != "" {
		searchPattern := "%" + filter.Search + "%"
		query = query.Where("title ILIKE ? OR content ILIKE ?", searchPattern, searchPattern)
	}

	// Filter by tag
	if filter.TagID != nil {
		query = query.Joins("JOIN note_tags ON note_tags.note_id = notes.id").
			Where("note_tags.tag_id = ?", *filter.TagID)
	}

	// Filter by pinned
	if filter.IsPinned != nil {
		query = query.Where("is_pinned = ?", *filter.IsPinned)
	}

	// Filter by color
	if filter.Color != "" {
		query = query.Where("color = ?", filter.Color)
	}

	// Filter by date range
	if filter.StartDate != nil {
		query = query.Where("created_at >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("created_at <= ?", *filter.EndDate)
	}

	// Count total
	query.Count(&total)

	// Sorting
	sortBy := "created_at"
	if filter.SortBy != "" {
		sortBy = filter.SortBy
	}
	sortOrder := "DESC"
	if filter.SortOrder != "" {
		sortOrder = filter.SortOrder
	}
	query = query.Order(sortBy + " " + sortOrder)

	// Pagination
	offset := (filter.Page - 1) * filter.Limit
	err := query.
		Preload("Tags").
		Preload("Attachments").
		Offset(offset).
		Limit(filter.Limit).
		Find(&notes).Error

	return notes, total, err
}

func (r *noteRepository) FindTrashed(userID uuid.UUID) ([]entity.Note, error) {
	var notes []entity.Note
	err := r.db.Unscoped().
		Where("user_id = ? AND deleted_at IS NOT NULL", userID).
		Preload("Tags").
		Find(&notes).Error
	return notes, err
}
```

**File:** `internal/repository/tag_repository.go`

```go
package repository

import (
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/entity"
	"gorm.io/gorm"
)

type TagRepository interface {
	Create(tag *entity.Tag) error
	FindByID(id uuid.UUID) (*entity.Tag, error)
	FindByName(userID uuid.UUID, name string) (*entity.Tag, error)
	FindAll(userID uuid.UUID) ([]entity.Tag, error)
	Update(tag *entity.Tag) error
	Delete(id uuid.UUID) error
	AssignToNote(noteID, tagID uuid.UUID) error
	RemoveFromNote(noteID, tagID uuid.UUID) error
}

type tagRepository struct {
	db *gorm.DB
}

func NewTagRepository(db *gorm.DB) TagRepository {
	return &tagRepository{db: db}
}

func (r *tagRepository) Create(tag *entity.Tag) error {
	return r.db.Create(tag).Error
}

func (r *tagRepository) FindByID(id uuid.UUID) (*entity.Tag, error) {
	var tag entity.Tag
	err := r.db.Where("id = ?", id).First(&tag).Error
	return &tag, err
}

func (r *tagRepository) FindByName(userID uuid.UUID, name string) (*entity.Tag, error) {
	var tag entity.Tag
	err := r.db.Where("user_id = ? AND name = ?", userID, name).First(&tag).Error
	return &tag, err
}

func (r *tagRepository) FindAll(userID uuid.UUID) ([]entity.Tag, error) {
	var tags []entity.Tag
	err := r.db.Where("user_id = ?", userID).Order("name ASC").Find(&tags).Error
	return tags, err
}

func (r *tagRepository) Update(tag *entity.Tag) error {
	return r.db.Save(tag).Error
}

func (r *tagRepository) Delete(id uuid.UUID) error {
	// Also delete associations
	r.db.Exec("DELETE FROM note_tags WHERE tag_id = ?", id)
	return r.db.Delete(&entity.Tag{}, "id = ?", id).Error
}

func (r *tagRepository) AssignToNote(noteID, tagID uuid.UUID) error {
	noteTag := entity.NoteTag{
		NoteID: noteID,
		TagID:  tagID,
	}
	return r.db.Create(&noteTag).Error
}

func (r *tagRepository) RemoveFromNote(noteID, tagID uuid.UUID) error {
	return r.db.Where("note_id = ? AND tag_id = ?", noteID, tagID).
		Delete(&entity.NoteTag{}).Error
}
```

**File:** `internal/repository/attachment_repository.go`

```go
package repository

import (
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/entity"
	"gorm.io/gorm"
)

type AttachmentRepository interface {
	Create(attachment *entity.Attachment) error
	FindByID(id uuid.UUID) (*entity.Attachment, error)
	FindByNoteID(noteID uuid.UUID) ([]entity.Attachment, error)
	Delete(id uuid.UUID) error
}

type attachmentRepository struct {
	db *gorm.DB
}

func NewAttachmentRepository(db *gorm.DB) AttachmentRepository {
	return &attachmentRepository{db: db}
}

func (r *attachmentRepository) Create(attachment *entity.Attachment) error {
	return r.db.Create(attachment).Error
}

func (r *attachmentRepository) FindByID(id uuid.UUID) (*entity.Attachment, error) {
	var attachment entity.Attachment
	err := r.db.Preload("Note").Where("id = ?", id).First(&attachment).Error
	return &attachment, err
}

func (r *attachmentRepository) FindByNoteID(noteID uuid.UUID) ([]entity.Attachment, error) {
	var attachments []entity.Attachment
	err := r.db.Where("note_id = ?", noteID).Find(&attachments).Error
	return attachments, err
}

func (r *attachmentRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&entity.Attachment{}, "id = ?", id).Error
}
```

---

### **Step 4: Utilities (JWT, Hash, Validator, Error, Response)**

**File:** `internal/util/jwt.go`

```go
package util

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/config"
)

type Claims struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	jwt.RegisteredClaims
}

func GenerateAccessToken(userID uuid.UUID, email string, cfg *config.Config) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(cfg.JWT.AccessExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWT.Secret))
}

func GenerateRefreshToken(userID uuid.UUID, email string, cfg *config.Config) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(cfg.JWT.RefreshExpiry)),
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
	"time"

	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
	
	// Register custom validators
	validate.RegisterValidation("pastdate", validatePastDate)
	validate.RegisterValidation("positive", validatePositive)
	validate.RegisterValidation("hexcolor", validateHexColor)
}

func GetValidator() *validator.Validate {
	return validate
}

func validatePastDate(fl validator.FieldLevel) bool {
	date, ok := fl.Field().Interface().(time.Time)
	if !ok {
		return false
	}
	return date.Before(time.Now()) || date.Equal(time.Now().Truncate(24*time.Hour))
}

func validatePositive(fl validator.FieldLevel) bool {
	value := fl.Field().Float()
	return value > 0
}

func validateHexColor(fl validator.FieldLevel) bool {
	color := fl.Field().String()
	if len(color) == 0 {
		return true // Optional field
	}
	if color[0] != '#' || (len(color) != 4 && len(color) != 7) {
		return false
	}
	return true
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

// Predefined errors
var (
	ErrUnauthorized        = NewAppError("unauthorized", "UNAUTHORIZED", http.StatusUnauthorized)
	ErrForbidden           = NewAppError("forbidden", "FORBIDDEN", http.StatusForbidden)
	ErrNotFound            = NewAppError("resource not found", "NOT_FOUND", http.StatusNotFound)
	ErrValidation          = NewAppError("validation error", "VALIDATION_ERROR", http.StatusUnprocessableEntity)
	ErrInternalServer      = NewAppError("internal server error", "INTERNAL_ERROR", http.StatusInternalServerError)
	ErrInvalidCredentials  = NewAppError("invalid email or password", "INVALID_CREDENTIALS", http.StatusUnauthorized)
	ErrEmailAlreadyExists  = NewAppError("email already exists", "EMAIL_EXISTS", http.StatusConflict)
	ErrTokenExpired        = NewAppError("token has expired", "TOKEN_EXPIRED", http.StatusUnauthorized)
	ErrTokenRevoked        = NewAppError("token has been revoked", "TOKEN_REVOKED", http.StatusUnauthorized)
	ErrEmailNotVerified    = NewAppError("email not verified", "EMAIL_NOT_VERIFIED", http.StatusForbidden)
	ErrInvalidToken        = NewAppError("invalid token", "INVALID_TOKEN", http.StatusUnauthorized)
	ErrFileTooLarge        = NewAppError("file too large", "FILE_TOO_LARGE", http.StatusBadRequest)
	ErrInvalidFileType     = NewAppError("invalid file type", "INVALID_FILE_TYPE", http.StatusBadRequest)
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

### **Step 5: Auth Service dengan OAuth Google**

**File:** `internal/service/auth_service.go`

```go
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/yourusername/personal-notes-api/internal/config"
	"github.com/yourusername/personal-notes-api/internal/entity"
	"github.com/yourusername/personal-notes-api/internal/repository"
	"github.com/yourusername/personal-notes-api/internal/util"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

type AuthService interface {
	Register(name, email, password string) (*entity.User, error)
	Login(email, password string) (string, string, *entity.User, error)
	RefreshToken(refreshToken string) (string, error)
	Logout(token string) error
	IsTokenBlacklisted(token string) bool
	VerifyEmail(token string) error
	GetGoogleOAuthURL(state string) string
	HandleGoogleCallback(code string) (string, string, *entity.User, error)
	UpdateProfile(userID uuid.UUID, name, avatarURL string) error
}

type authService struct {
	userRepo     repository.UserRepository
	redis        *redis.Client
	cfg          *config.Config
	emailService EmailService
	googleConfig *oauth2.Config
}

func NewAuthService(
	userRepo repository.UserRepository,
	redis *redis.Client,
	cfg *config.Config,
	emailService EmailService,
) AuthService {
	googleConfig := &oauth2.Config{
		ClientID:     cfg.OAuth.GoogleClientID,
		ClientSecret: cfg.OAuth.GoogleClientSecret,
		RedirectURL:  cfg.OAuth.GoogleRedirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	return &authService{
		userRepo:     userRepo,
		redis:        redis,
		cfg:          cfg,
		emailService: emailService,
		googleConfig: googleConfig,
	}
}

func (s *authService) Register(name, email, password string) (*entity.User, error) {
	// Check if email exists
	existing, _ := s.userRepo.FindByEmail(email)
	if existing != nil {
		return nil, util.ErrEmailAlreadyExists
	}

	// Hash password
	hashedPassword, err := util.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user := &entity.User{
		Name:          name,
		Email:         email,
		Password:      hashedPassword,
		EmailVerified: false,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Generate verification token (expires in 24 hours)
	verificationToken, _ := util.GenerateAccessToken(user.ID, user.Email, s.cfg)
	
	// Store verification token in Redis
	ctx := context.Background()
	s.redis.Set(ctx, fmt.Sprintf("verify:%s", user.ID), verificationToken, 24*time.Hour)

	// Send welcome + verification email (async)
	go s.emailService.SendWelcomeEmail(user.Email, user.Name, verificationToken)

	return user, nil
}

func (s *authService) Login(email, password string) (string, string, *entity.User, error) {
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", "", nil, util.ErrInvalidCredentials
		}
		return "", "", nil, err
	}

	// Check password
	if !util.CheckPassword(user.Password, password) {
		return "", "", nil, util.ErrInvalidCredentials
	}

	// Generate tokens
	accessToken, err := util.GenerateAccessToken(user.ID, user.Email, s.cfg)
	if err != nil {
		return "", "", nil, err
	}

	refreshToken, err := util.GenerateRefreshToken(user.ID, user.Email, s.cfg)
	if err != nil {
		return "", "", nil, err
	}

	return accessToken, refreshToken, user, nil
}

func (s *authService) RefreshToken(refreshToken string) (string, error) {
	claims, err := util.ValidateToken(refreshToken, s.cfg)
	if err != nil {
		return "", util.ErrInvalidToken
	}

	// Check if token is blacklisted
	if s.IsTokenBlacklisted(refreshToken) {
		return "", util.ErrTokenRevoked
	}

	// Generate new access token
	newAccessToken, err := util.GenerateAccessToken(claims.UserID, claims.Email, s.cfg)
	if err != nil {
		return "", err
	}

	return newAccessToken, nil
}

func (s *authService) Logout(token string) error {
	claims, err := util.ValidateToken(token, s.cfg)
	if err != nil {
		return err
	}

	// Calculate expiry
	expiry := time.Until(claims.ExpiresAt.Time)

	// Blacklist token
	ctx := context.Background()
	return s.redis.Set(ctx, fmt.Sprintf("blacklist:%s", token), "1", expiry).Err()
}

func (s *authService) IsTokenBlacklisted(token string) bool {
	ctx := context.Background()
	val := s.redis.Get(ctx, fmt.Sprintf("blacklist:%s", token)).Val()
	return val != ""
}

func (s *authService) VerifyEmail(token string) error {
	claims, err := util.ValidateToken(token, s.cfg)
	if err != nil {
		return util.ErrInvalidToken
	}

	// Check if verification token exists in Redis
	ctx := context.Background()
	storedToken := s.redis.Get(ctx, fmt.Sprintf("verify:%s", claims.UserID)).Val()
	if storedToken == "" || storedToken != token {
		return util.ErrInvalidToken
	}

	// Update user verification status
	if err := s.userRepo.UpdateVerification(claims.UserID); err != nil {
		return err
	}

	// Delete verification token
	s.redis.Del(ctx, fmt.Sprintf("verify:%s", claims.UserID))

	return nil
}

func (s *authService) GetGoogleOAuthURL(state string) string {
	return s.googleConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (s *authService) HandleGoogleCallback(code string) (string, string, *entity.User, error) {
	ctx := context.Background()

	// Exchange code for token
	token, err := s.googleConfig.Exchange(ctx, code)
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to exchange code: %w", err)
	}

	// Get user info from Google
	client := s.googleConfig.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return "", "", nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	var googleUser struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	json.Unmarshal(data, &googleUser)

	// Check if user exists
	user, err := s.userRepo.FindByOAuth("google", googleUser.ID)
	if err != nil && err != gorm.ErrRecordNotFound {
		return "", "", nil, err
	}

	// If user doesn't exist, check by email
	if user == nil {
		user, _ = s.userRepo.FindByEmail(googleUser.Email)
	}

	// Create new user if doesn't exist
	if user == nil {
		user = &entity.User{
			Name:          googleUser.Name,
			Email:         googleUser.Email,
			AvatarURL:     googleUser.Picture,
			EmailVerified: true, // Google accounts are verified
			VerifiedAt:    &time.Time{},
			OAuthProvider: "google",
			OAuthID:       googleUser.ID,
		}
		*user.VerifiedAt = time.Now()

		if err := s.userRepo.Create(user); err != nil {
			return "", "", nil, err
		}
	} else {
		// Update OAuth info if logging in with OAuth for first time
		if user.OAuthProvider == "" {
			user.OAuthProvider = "google"
			user.OAuthID = googleUser.ID
			user.EmailVerified = true
			now := time.Now()
			user.VerifiedAt = &now
			s.userRepo.Update(user)
		}
	}

	// Generate tokens
	accessToken, _ := util.GenerateAccessToken(user.ID, user.Email, s.cfg)
	refreshToken, _ := util.GenerateRefreshToken(user.ID, user.Email, s.cfg)

	return accessToken, refreshToken, user, nil
}

func (s *authService) UpdateProfile(userID uuid.UUID, name, avatarURL string) error {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return err
	}

	if name != "" {
		user.Name = name
	}
	if avatarURL != "" {
		user.AvatarURL = avatarURL
	}

	return s.userRepo.Update(user)
}
```

---

### **Step 6: Email Service dengan HTML Templates**

**File:** `templates/welcome.html`

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333333;
        }
        p {
            color: #666666;
            line-height: 1.6;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            margin: 20px 0;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #999999;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Personal Notes! 📝</h1>
        <p>Hi {{.Name}},</p>
        <p>Thank you for registering! We're excited to have you on board.</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="{{.VerificationURL}}" class="button">Verify Email</a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4CAF50;">{{.VerificationURL}}</p>
        <p>This link will expire in 24 hours.</p>
        <div class="footer">
            <p>If you didn't create an account, please ignore this email.</p>
            <p>&copy; 2026 Personal Notes API. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

**File:** `templates/verify_email.html`

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success {
            color: #4CAF50;
            font-size: 48px;
            text-align: center;
        }
        h1 {
            color: #333333;
            text-align: center;
        }
        p {
            color: #666666;
            line-height: 1.6;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success">✅</div>
        <h1>Email Verified Successfully!</h1>
        <p>Your email has been verified. You can now use all features of Personal Notes.</p>
        <p>Happy note-taking! 📝</p>
    </div>
</body>
</html>
```

**File:** `templates/attachment_notification.html`

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333333;
        }
        p {
            color: #666666;
            line-height: 1.6;
        }
        .attachment-info {
            background-color: #f9f9f9;
            padding: 15px;
            border-left: 4px solid #2196F3;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>New Attachment Uploaded 📎</h1>
        <p>Hi {{.Name}},</p>
        <p>A new attachment has been uploaded to your note: <strong>{{.NoteTitle}}</strong></p>
        <div class="attachment-info">
            <p><strong>Filename:</strong> {{.Filename}}</p>
            <p><strong>File Size:</strong> {{.FileSize}}</p>
            <p><strong>Uploaded At:</strong> {{.UploadedAt}}</p>
        </div>
        <p>You can view it in your notes dashboard.</p>
    </div>
</body>
</html>
```

**File:** `internal/service/email_service.go`

```go
package service

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
	"path/filepath"

	"github.com/jordan-wright/email"
	"github.com/yourusername/personal-notes-api/internal/config"
)

type EmailService interface {
	SendWelcomeEmail(to, name, verificationToken string) error
	SendVerificationEmail(to, name, verificationToken string) error
	SendAttachmentNotification(to, name, noteTitle, filename, fileSize, uploadedAt string) error
}

type emailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) EmailService {
	return &emailService{cfg: cfg}
}

func (s *emailService) SendWelcomeEmail(to, name, verificationToken string) error {
	verificationURL := fmt.Sprintf("%s/api/v1/auth/verify-email?token=%s", s.cfg.App.URL, verificationToken)

	data := map[string]string{
		"Name":            name,
		"VerificationURL": verificationURL,
	}

	body, err := s.renderTemplate("templates/welcome.html", data)
	if err != nil {
		return err
	}

	return s.sendEmail(to, "Welcome to Personal Notes - Verify Your Email", body)
}

func (s *emailService) SendVerificationEmail(to, name, verificationToken string) error {
	verificationURL := fmt.Sprintf("%s/api/v1/auth/verify-email?token=%s", s.cfg.App.URL, verificationToken)

	data := map[string]string{
		"Name":            name,
		"VerificationURL": verificationURL,
	}

	body, err := s.renderTemplate("templates/verify_email.html", data)
	if err != nil {
		return err
	}

	return s.sendEmail(to, "Verify Your Email", body)
}

func (s *emailService) SendAttachmentNotification(to, name, noteTitle, filename, fileSize, uploadedAt string) error {
	data := map[string]string{
		"Name":       name,
		"NoteTitle":  noteTitle,
		"Filename":   filename,
		"FileSize":   fileSize,
		"UploadedAt": uploadedAt,
	}

	body, err := s.renderTemplate("templates/attachment_notification.html", data)
	if err != nil {
		return err
	}

	return s.sendEmail(to, "New Attachment Uploaded", body)
}

func (s *emailService) renderTemplate(templatePath string, data interface{}) (string, error) {
	absPath, _ := filepath.Abs(templatePath)
	tmpl, err := template.ParseFiles(absPath)
	if err != nil {
		return "", fmt.Errorf("failed to parse template: %w", err)
	}

	var body bytes.Buffer
	if err := tmpl.Execute(&body, data); err != nil {
		return "", fmt.Errorf("failed to execute template: %w", err)
	}

	return body.String(), nil
}

func (s *emailService) sendEmail(to, subject, htmlBody string) error {
	e := email.NewEmail()
	e.From = s.cfg.Email.FromAddress
	e.To = []string{to}
	e.Subject = subject
	e.HTML = []byte(htmlBody)

	addr := fmt.Sprintf("%s:%d", s.cfg.Email.SMTPHost, s.cfg.Email.SMTPPort)
	auth := smtp.PlainAuth("", s.cfg.Email.SMTPUser, s.cfg.Email.SMTPPassword, s.cfg.Email.SMTPHost)

	return e.Send(addr, auth)
}
```

---

### **Step 7: Asynq Worker untuk Background Jobs**

**File:** `internal/worker/asynq.go`

```go
package worker

import (
	"fmt"
	"log"

	"github.com/hibiken/asynq"
	"github.com/yourusername/personal-notes-api/internal/config"
)

func NewAsynqClient(cfg *config.Config) *asynq.Client {
	redisOpt := asynq.RedisClientOpt{
		Addr:     fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	}

	return asynq.NewClient(redisOpt)
}

func NewAsynqServer(cfg *config.Config) *asynq.Server {
	redisOpt := asynq.RedisClientOpt{
		Addr:     fmt.Sprintf("%s:%s", cfg.Redis.Host, cfg.Redis.Port),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	}

	return asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: cfg.Asynq.Concurrency,
			Queues: map[string]int{
				"emails": 5,
				"default": 3,
			},
		},
	)
}

func StartWorker(srv *asynq.Server, mux *asynq.ServeMux) {
	go func() {
		log.Println("🔄 Starting Asynq worker...")
		if err := srv.Run(mux); err != nil {
			log.Fatalf("Asynq worker error: %v", err)
		}
	}()
}
```

**File:** `internal/worker/email_task.go`

```go
package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/hibiken/asynq"
	"github.com/yourusername/personal-notes-api/internal/service"
)

const (
	TypeWelcomeEmail        = "email:welcome"
	TypeVerificationEmail   = "email:verification"
	TypeAttachmentNotification = "email:attachment"
)

type EmailTaskHandler struct {
	emailService service.EmailService
}

func NewEmailTaskHandler(emailService service.EmailService) *EmailTaskHandler {
	return &EmailTaskHandler{emailService: emailService}
}

// Task payloads
type WelcomeEmailPayload struct {
	Email             string `json:"email"`
	Name              string `json:"name"`
	VerificationToken string `json:"verification_token"`
}

type AttachmentNotificationPayload struct {
	Email      string `json:"email"`
	Name       string `json:"name"`
	NoteTitle  string `json:"note_title"`
	Filename   string `json:"filename"`
	FileSize   string `json:"file_size"`
	UploadedAt string `json:"uploaded_at"`
}

// Enqueue tasks
func EnqueueWelcomeEmail(client *asynq.Client, email, name, token string) error {
	payload, _ := json.Marshal(WelcomeEmailPayload{
		Email:             email,
		Name:              name,
		VerificationToken: token,
	})

	task := asynq.NewTask(TypeWelcomeEmail, payload)
	_, err := client.Enqueue(task, asynq.Queue("emails"))
	return err
}

func EnqueueAttachmentNotification(client *asynq.Client, email, name, noteTitle, filename, fileSize, uploadedAt string) error {
	payload, _ := json.Marshal(AttachmentNotificationPayload{
		Email:      email,
		Name:       name,
		NoteTitle:  noteTitle,
		Filename:   filename,
		FileSize:   fileSize,
		UploadedAt: uploadedAt,
	})

	task := asynq.NewTask(TypeAttachmentNotification, payload)
	_, err := client.Enqueue(task, asynq.Queue("emails"))
	return err
}

// Handle tasks
func (h *EmailTaskHandler) HandleWelcomeEmail(ctx context.Context, t *asynq.Task) error {
	var p WelcomeEmailPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %w", err)
	}

	log.Printf("Sending welcome email to %s", p.Email)
	return h.emailService.SendWelcomeEmail(p.Email, p.Name, p.VerificationToken)
}

func (h *EmailTaskHandler) HandleAttachmentNotification(ctx context.Context, t *asynq.Task) error {
	var p AttachmentNotificationPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %w", err)
	}

	log.Printf("Sending attachment notification to %s", p.Email)
	return h.emailService.SendAttachmentNotification(
		p.Email,
		p.Name,
		p.NoteTitle,
		p.Filename,
		p.FileSize,
		p.UploadedAt,
	)
}
```

---

### **Step 8: Upload Service dengan Image Resize**

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
	"time"

	"github.com/disintegration/imaging"
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/config"
	"github.com/yourusername/personal-notes-api/internal/util"
)

type UploadService interface {
	UploadAvatar(file *multipart.FileHeader) (string, error)
	UploadAttachment(file *multipart.FileHeader) (string, int64, string, error)
	DeleteFile(filePath string) error
}

type uploadService struct {
	cfg *config.Config
}

func NewUploadService(cfg *config.Config) UploadService {
	return &uploadService{cfg: cfg}
}

func (s *uploadService) UploadAvatar(file *multipart.FileHeader) (string, error) {
	// Validate file size
	if file.Size > s.cfg.Upload.MaxSize {
		return "", util.ErrFileTooLarge
	}

	// Validate file type (only images)
	if !s.isImageFile(file.Header.Get("Content-Type")) {
		return "", util.ErrInvalidFileType
	}

	// Open file
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Decode image
	img, _, err := image.Decode(src)
	if err != nil {
		return "", fmt.Errorf("failed to decode image: %w", err)
	}

	// Resize to 200x200
	resized := imaging.Fill(img, s.cfg.Upload.AvatarSize, s.cfg.Upload.AvatarSize, imaging.Center, imaging.Lanczos)

	// Generate filename
	filename := fmt.Sprintf("%s_%d.jpg", uuid.New().String(), time.Now().Unix())
	uploadPath := "uploads/avatars"
	
	// Create directory if not exists
	if err := os.MkdirAll(uploadPath, os.ModePerm); err != nil {
		return "", err
	}

	fullPath := filepath.Join(uploadPath, filename)

	// Save resized image
	if err := imaging.Save(resized, fullPath); err != nil {
		return "", err
	}

	return fullPath, nil
}

func (s *uploadService) UploadAttachment(file *multipart.FileHeader) (string, int64, string, error) {
	// Validate file size
	if file.Size > s.cfg.Upload.MaxSize {
		return "", 0, "", util.ErrFileTooLarge
	}

	// Validate file type
	mimeType := file.Header.Get("Content-Type")
	if !s.isAllowedFileType(mimeType) {
		return "", 0, "", util.ErrInvalidFileType
	}

	// Open file
	src, err := file.Open()
	if err != nil {
		return "", 0, "", err
	}
	defer src.Close()

	// Generate filename (keep original extension)
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)
	uploadPath := "uploads/attachments"

	// Create directory if not exists
	if err := os.MkdirAll(uploadPath, os.ModePerm); err != nil {
		return "", 0, "", err
	}

	fullPath := filepath.Join(uploadPath, filename)

	// Create destination file
	dst, err := os.Create(fullPath)
	if err != nil {
		return "", 0, "", err
	}
	defer dst.Close()

	// Copy file
	if _, err := io.Copy(dst, src); err != nil {
		return "", 0, "", err
	}

	return fullPath, file.Size, mimeType, nil
}

func (s *uploadService) DeleteFile(filePath string) error {
	if filePath == "" {
		return nil
	}
	return os.Remove(filePath)
}

func (s *uploadService) isImageFile(mimeType string) bool {
	allowedTypes := []string{"image/jpeg", "image/png", "image/gif"}
	for _, t := range allowedTypes {
		if t == mimeType {
			return true
		}
	}
	return false
}

func (s *uploadService) isAllowedFileType(mimeType string) bool {
	for _, t := range s.cfg.Upload.AllowedTypes {
		if strings.TrimSpace(t) == mimeType {
			return true
		}
	}
	return false
}
```

---

### **Step 9: Note Service & Handler (CRUD + Soft Delete + Restore)**

**File:** `internal/service/note_service.go`

```go
package service

import (
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/entity"
	"github.com/yourusername/personal-notes-api/internal/repository"
	"github.com/yourusername/personal-notes-api/internal/util"
)

type NoteService interface {
	Create(userID uuid.UUID, title, content, color string, isPinned bool) (*entity.Note, error)
	GetByID(noteID, userID uuid.UUID) (*entity.Note, error)
	GetAll(userID uuid.UUID, filter repository.NoteFilter) ([]entity.Note, int64, error)
	Update(noteID, userID uuid.UUID, title, content, color *string, isPinned *bool) (*entity.Note, error)
	SoftDelete(noteID, userID uuid.UUID) error
	Restore(noteID, userID uuid.UUID) error
	GetTrashed(userID uuid.UUID) ([]entity.Note, error)
}

type noteService struct {
	noteRepo repository.NoteRepository
}

func NewNoteService(noteRepo repository.NoteRepository) NoteService {
	return &noteService{noteRepo: noteRepo}
}

func (s *noteService) Create(userID uuid.UUID, title, content, color string, isPinned bool) (*entity.Note, error) {
	note := &entity.Note{
		UserID:   userID,
		Title:    title,
		Content:  content,
		Color:    color,
		IsPinned: isPinned,
	}

	if err := s.noteRepo.Create(note); err != nil {
		return nil, err
	}

	return note, nil
}

func (s *noteService) GetByID(noteID, userID uuid.UUID) (*entity.Note, error) {
	note, err := s.noteRepo.FindByIDWithRelations(noteID)
	if err != nil {
		return nil, util.ErrNotFound
	}

	// Check ownership
	if note.UserID != userID {
		return nil, util.ErrForbidden
	}

	return note, nil
}

func (s *noteService) GetAll(userID uuid.UUID, filter repository.NoteFilter) ([]entity.Note, int64, error) {
	return s.noteRepo.FindAll(userID, filter)
}

func (s *noteService) Update(noteID, userID uuid.UUID, title, content, color *string, isPinned *bool) (*entity.Note, error) {
	note, err := s.noteRepo.FindByID(noteID)
	if err != nil {
		return nil, util.ErrNotFound
	}

	// Check ownership
	if note.UserID != userID {
		return nil, util.ErrForbidden
	}

	// Update fields
	if title != nil {
		note.Title = *title
	}
	if content != nil {
		note.Content = *content
	}
	if color != nil {
		note.Color = *color
	}
	if isPinned != nil {
		note.IsPinned = *isPinned
	}

	if err := s.noteRepo.Update(note); err != nil {
		return nil, err
	}

	return note, nil
}

func (s *noteService) SoftDelete(noteID, userID uuid.UUID) error {
	note, err := s.noteRepo.FindByID(noteID)
	if err != nil {
		return util.ErrNotFound
	}

	if note.UserID != userID {
		return util.ErrForbidden
	}

	return s.noteRepo.SoftDelete(noteID)
}

func (s *noteService) Restore(noteID, userID uuid.UUID) error {
	// Note: perlu custom query untuk check ownership dari soft-deleted note
	return s.noteRepo.Restore(noteID)
}

func (s *noteService) GetTrashed(userID uuid.UUID) ([]entity.Note, error) {
	return s.noteRepo.FindTrashed(userID)
}
```

---

### **Step 10: Tag Service & Handler**

**File:** `internal/service/tag_service.go`

```go
package service

import (
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/entity"
	"github.com/yourusername/personal-notes-api/internal/repository"
	"github.com/yourusername/personal-notes-api/internal/util"
	"gorm.io/gorm"
)

type TagService interface {
	Create(userID uuid.UUID, name string) (*entity.Tag, error)
	GetAll(userID uuid.UUID) ([]entity.Tag, error)
	Update(tagID, userID uuid.UUID, name string) (*entity.Tag, error)
	Delete(tagID, userID uuid.UUID) error
	AssignToNote(noteID, tagID, userID uuid.UUID) error
	RemoveFromNote(noteID, tagID, userID uuid.UUID) error
}

type tagService struct {
	tagRepo  repository.TagRepository
	noteRepo repository.NoteRepository
}

func NewTagService(tagRepo repository.TagRepository, noteRepo repository.NoteRepository) TagService {
	return &tagService{
		tagRepo:  tagRepo,
		noteRepo: noteRepo,
	}
}

func (s *tagService) Create(userID uuid.UUID, name string) (*entity.Tag, error) {
	// Check if tag name already exists for user
	existing, _ := s.tagRepo.FindByName(userID, name)
	if existing != nil {
		return nil, util.NewAppError("tag with this name already exists", "TAG_EXISTS", 409)
	}

	tag := &entity.Tag{
		UserID: userID,
		Name:   name,
	}

	if err := s.tagRepo.Create(tag); err != nil {
		return nil, err
	}

	return tag, nil
}

func (s *tagService) GetAll(userID uuid.UUID) ([]entity.Tag, error) {
	return s.tagRepo.FindAll(userID)
}

func (s *tagService) Update(tagID, userID uuid.UUID, name string) (*entity.Tag, error) {
	tag, err := s.tagRepo.FindByID(tagID)
	if err != nil {
		return nil, util.ErrNotFound
	}

	if tag.UserID != userID {
		return nil, util.ErrForbidden
	}

	tag.Name = name
	if err := s.tagRepo.Update(tag); err != nil {
		return nil, err
	}

	return tag, nil
}

func (s *tagService) Delete(tagID, userID uuid.UUID) error {
	tag, err := s.tagRepo.FindByID(tagID)
	if err != nil {
		return util.ErrNotFound
	}

	if tag.UserID != userID {
		return util.ErrForbidden
	}

	return s.tagRepo.Delete(tagID)
}

func (s *tagService) AssignToNote(noteID, tagID, userID uuid.UUID) error {
	// Verify note ownership
	note, err := s.noteRepo.FindByID(noteID)
	if err != nil {
		return util.ErrNotFound
	}
	if note.UserID != userID {
		return util.ErrForbidden
	}

	// Verify tag ownership
	tag, err := s.tagRepo.FindByID(tagID)
	if err != nil {
		return util.ErrNotFound
	}
	if tag.UserID != userID {
		return util.ErrForbidden
	}

	// Assign tag to note
	if err := s.tagRepo.AssignToNote(noteID, tagID); err != nil {
		// Ignore duplicate errors
		if err == gorm.ErrDuplicatedKey {
			return nil
		}
		return err
	}

	return nil
}

func (s *tagService) RemoveFromNote(noteID, tagID, userID uuid.UUID) error {
	// Verify note ownership
	note, err := s.noteRepo.FindByID(noteID)
	if err != nil {
		return util.ErrNotFound
	}
	if note.UserID != userID {
		return util.ErrForbidden
	}

	return s.tagRepo.RemoveFromNote(noteID, tagID)
}
```

---

### **Step 11: Attachment Service & Handler**

**File:** `internal/service/attachment_service.go`

```go
package service

import (
	"fmt"
	"mime/multipart"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/yourusername/personal-notes-api/internal/entity"
	"github.com/yourusername/personal-notes-api/internal/repository"
	"github.com/yourusername/personal-notes-api/internal/util"
	"github.com/yourusername/personal-notes-api/internal/worker"
)

type AttachmentService interface {
	Upload(noteID, userID uuid.UUID, file *multipart.FileHeader) (*entity.Attachment, error)
	GetByNoteID(noteID, userID uuid.UUID) ([]entity.Attachment, error)
	Delete(attachmentID, userID uuid.UUID) error
}

type attachmentService struct {
	attachmentRepo repository.AttachmentRepository
	noteRepo       repository.NoteRepository
	userRepo       repository.UserRepository
	uploadService  UploadService
	asynqClient    *asynq.Client
}

func NewAttachmentService(
	attachmentRepo repository.AttachmentRepository,
	noteRepo repository.NoteRepository,
	userRepo repository.UserRepository,
	uploadService UploadService,
	asynqClient *asynq.Client,
) AttachmentService {
	return &attachmentService{
		attachmentRepo: attachmentRepo,
		noteRepo:       noteRepo,
		userRepo:       userRepo,
		uploadService:  uploadService,
		asynqClient:    asynqClient,
	}
}

func (s *attachmentService) Upload(noteID, userID uuid.UUID, file *multipart.FileHeader) (*entity.Attachment, error) {
	// Verify note ownership
	note, err := s.noteRepo.FindByID(noteID)
	if err != nil {
		return nil, util.ErrNotFound
	}
	if note.UserID != userID {
		return nil, util.ErrForbidden
	}

	// Upload file
	fileURL, fileSize, mimeType, err := s.uploadService.UploadAttachment(file)
	if err != nil {
		return nil, err
	}

	attachment := &entity.Attachment{
		NoteID:   noteID,
		Filename: file.Filename,
		FileURL:  fileURL,
		FileSize: fileSize,
		MimeType: mimeType,
	}

	if err := s.attachmentRepo.Create(attachment); err != nil {
		// Cleanup uploaded file on error
		s.uploadService.DeleteFile(fileURL)
		return nil, err
	}

	// Send notification email (async)
	user, _ := s.userRepo.FindByID(userID)
	if user != nil {
		fileSizeStr := fmt.Sprintf("%.2f KB", float64(fileSize)/1024)
		worker.EnqueueAttachmentNotification(
			s.asynqClient,
			user.Email,
			user.Name,
			note.Title,
			file.Filename,
			fileSizeStr,
			time.Now().Format("2006-01-02 15:04:05"),
		)
	}

	return attachment, nil
}

func (s *attachmentService) GetByNoteID(noteID, userID uuid.UUID) ([]entity.Attachment, error) {
	// Verify note ownership
	note, err := s.noteRepo.FindByID(noteID)
	if err != nil {
		return nil, util.ErrNotFound
	}
	if note.UserID != userID {
		return nil, util.ErrForbidden
	}

	return s.attachmentRepo.FindByNoteID(noteID)
}

func (s *attachmentService) Delete(attachmentID, userID uuid.UUID) error {
	attachment, err := s.attachmentRepo.FindByID(attachmentID)
	if err != nil {
		return util.ErrNotFound
	}

	// Verify ownership via note
	note, err := s.noteRepo.FindByID(attachment.NoteID)
	if err != nil {
		return util.ErrNotFound
	}
	if note.UserID != userID {
		return util.ErrForbidden
	}

	// Delete file from storage
	s.uploadService.DeleteFile(attachment.FileURL)

	// Delete from database
	return s.attachmentRepo.Delete(attachmentID)
}
```

---

### **Step 12: Export Service (Excel + PDF)**

**File:** `internal/service/export_service.go`

```go
package service

import (
	"bytes"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"github.com/xuri/excelize/v2"
	"github.com/yourusername/personal-notes-api/internal/entity"
	"github.com/yourusername/personal-notes-api/internal/repository"
)

type ExportService interface {
	ExportToExcel(userID uuid.UUID, filter repository.NoteFilter) (*bytes.Buffer, error)
	ExportToPDF(userID uuid.UUID, filter repository.NoteFilter) (*bytes.Buffer, error)
}

type exportService struct {
	noteRepo repository.NoteRepository
}

func NewExportService(noteRepo repository.NoteRepository) ExportService {
	return &exportService{noteRepo: noteRepo}
}

func (s *exportService) ExportToExcel(userID uuid.UUID, filter repository.NoteFilter) (*bytes.Buffer, error) {
	// Get notes
	filter.Page = 1
	filter.Limit = 10000 // Export all
	notes, _, err := s.noteRepo.FindAll(userID, filter)
	if err != nil {
		return nil, err
	}

	// Create Excel file
	f := excelize.NewFile()
	sheetName := "Notes"
	f.SetSheetName("Sheet1", sheetName)

	// Headers
	headers := []string{"Title", "Content", "Color", "Pinned", "Tags", "Created At", "Updated At"}
	for i, h := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, h)
	}

	// Style header
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true, Size: 12},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#4CAF50"}, Pattern: 1},
	})
	f.SetCellStyle(sheetName, "A1", "G1", headerStyle)

	// Data rows
	for i, note := range notes {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), note.Title)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), note.Content)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), note.Color)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), note.IsPinned)
		
		// Tags
		tagNames := ""
		for j, tag := range note.Tags {
			if j > 0 {
				tagNames += ", "
			}
			tagNames += tag.Name
		}
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), tagNames)

		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), note.CreatedAt.Format("2006-01-02 15:04:05"))
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), note.UpdatedAt.Format("2006-01-02 15:04:05"))
	}

	// Auto-fit columns
	for i := 0; i < len(headers); i++ {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 20)
	}

	// Write to buffer
	buffer := new(bytes.Buffer)
	if err := f.Write(buffer); err != nil {
		return nil, err
	}

	return buffer, nil
}

func (s *exportService) ExportToPDF(userID uuid.UUID, filter repository.NoteFilter) (*bytes.Buffer, error) {
	// Get notes
	filter.Page = 1
	filter.Limit = 10000
	notes, _, err := s.noteRepo.FindAll(userID, filter)
	if err != nil {
		return nil, err
	}

	// Create PDF
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Title
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, "Personal Notes Export")
	pdf.Ln(12)

	// Export date
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, fmt.Sprintf("Exported on: %s", time.Now().Format("2006-01-02 15:04:05")))
	pdf.Ln(10)

	// Notes
	for _, note := range notes {
		// Note title
		pdf.SetFont("Arial", "B", 14)
		pdf.SetTextColor(51, 51, 51)
		pdf.MultiCell(0, 6, note.Title, "", "", false)
		pdf.Ln(2)

		// Metadata
		pdf.SetFont("Arial", "I", 9)
		pdf.SetTextColor(128, 128, 128)
		metaText := fmt.Sprintf("Created: %s | Color: %s | Pinned: %t",
			note.CreatedAt.Format("2006-01-02"),
			note.Color,
			note.IsPinned,
		)
		pdf.Cell(0, 5, metaText)
		pdf.Ln(4)

		// Tags
		if len(note.Tags) > 0 {
			pdf.SetFont("Arial", "", 9)
			pdf.SetTextColor(76, 175, 80)
			tagText := "Tags: "
			for i, tag := range note.Tags {
				if i > 0 {
					tagText += ", "
				}
				tagText += tag.Name
			}
			pdf.Cell(0, 5, tagText)
			pdf.Ln(4)
		}

		// Content
		pdf.SetFont("Arial", "", 11)
		pdf.SetTextColor(0, 0, 0)
		if note.Content != "" {
			pdf.MultiCell(0, 5, note.Content, "", "", false)
		} else {
			pdf.SetTextColor(180, 180, 180)
			pdf.Cell(0, 5, "(No content)")
		}
		pdf.Ln(8)

		// Separator
		pdf.SetDrawColor(220, 220, 220)
		pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
		pdf.Ln(6)
	}

	// Write to buffer
	buffer := new(bytes.Buffer)
	if err := pdf.Output(buffer); err != nil {
		return nil, err
	}

	return buffer, nil
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}
```

---

### **Step 13: DTOs (Data Transfer Objects)**

**File:** `internal/dto/auth_dto.go`

```go
package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/entity"
)

type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=2"`
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
	Name string `json:"name,omitempty" validate:"omitempty,min=2"`
}

type AuthResponse struct {
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	User         UserResponse `json:"user"`
}

type UserResponse struct {
	ID            uuid.UUID  `json:"id"`
	Name          string     `json:"name"`
	Email         string     `json:"email"`
	AvatarURL     string     `json:"avatar_url"`
	EmailVerified bool       `json:"email_verified"`
	VerifiedAt    *time.Time `json:"verified_at,omitempty"`
	OAuthProvider string     `json:"oauth_provider,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

func ToUserResponse(user *entity.User) UserResponse {
	return UserResponse{
		ID:            user.ID,
		Name:          user.Name,
		Email:         user.Email,
		AvatarURL:     user.AvatarURL,
		EmailVerified: user.EmailVerified,
		VerifiedAt:    user.VerifiedAt,
		OAuthProvider: user.OAuthProvider,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     user.UpdatedAt,
	}
}
```

**File:** `internal/dto/note_dto.go`

```go
package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/entity"
)

type CreateNoteRequest struct {
	Title    string `json:"title" validate:"required,min=1,max=255"`
	Content  string `json:"content"`
	Color    string `json:"color" validate:"omitempty,hexcolor"`
	IsPinned bool   `json:"is_pinned"`
}

type UpdateNoteRequest struct {
	Title    *string `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	Content  *string `json:"content,omitempty"`
	Color    *string `json:"color,omitempty" validate:"omitempty,hexcolor"`
	IsPinned *bool   `json:"is_pinned,omitempty"`
}

type NoteResponse struct {
	ID          uuid.UUID            `json:"id"`
	UserID      uuid.UUID            `json:"user_id"`
	Title       string               `json:"title"`
	Content     string               `json:"content"`
	Color       string               `json:"color"`
	IsPinned    bool                 `json:"is_pinned"`
	Tags        []TagResponse        `json:"tags,omitempty"`
	Attachments []AttachmentResponse `json:"attachments,omitempty"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
}

func ToNoteResponse(note *entity.Note) NoteResponse {
	resp := NoteResponse{
		ID:        note.ID,
		UserID:    note.UserID,
		Title:     note.Title,
		Content:   note.Content,
		Color:     note.Color,
		IsPinned:  note.IsPinned,
		CreatedAt: note.CreatedAt,
		UpdatedAt: note.UpdatedAt,
	}

	if len(note.Tags) > 0 {
		resp.Tags = make([]TagResponse, len(note.Tags))
		for i, tag := range note.Tags {
			resp.Tags[i] = ToTagResponse(&tag)
		}
	}

	if len(note.Attachments) > 0 {
		resp.Attachments = make([]AttachmentResponse, len(note.Attachments))
		for i, att := range note.Attachments {
			resp.Attachments[i] = ToAttachmentResponse(&att)
		}
	}

	return resp
}
```

**File:** `internal/dto/tag_dto.go`

```go
package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/entity"
)

type CreateTagRequest struct {
	Name string `json:"name" validate:"required,min=1,max=100"`
}

type UpdateTagRequest struct {
	Name string `json:"name" validate:"required,min=1,max=100"`
}

type AssignTagRequest struct {
	TagID uuid.UUID `json:"tag_id" validate:"required"`
}

type TagResponse struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func ToTagResponse(tag *entity.Tag) TagResponse {
	return TagResponse{
		ID:        tag.ID,
		UserID:    tag.UserID,
		Name:      tag.Name,
		CreatedAt: tag.CreatedAt,
		UpdatedAt: tag.UpdatedAt,
	}
}
```

**File:** `internal/dto/common_dto.go`

```go
package dto

import (
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/entity"
)

type PaginationMeta struct {
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalPages int   `json:"total_pages"`
}

type AttachmentResponse struct {
	ID        uuid.UUID `json:"id"`
	NoteID    uuid.UUID `json:"note_id"`
	Filename  string    `json:"filename"`
	FileURL   string    `json:"file_url"`
	FileSize  int64     `json:"file_size"`
	MimeType  string    `json:"mime_type"`
	CreatedAt time.Time `json:"created_at"`
}

func ToAttachmentResponse(att *entity.Attachment) AttachmentResponse {
	return AttachmentResponse{
		ID:        att.ID,
		NoteID:    att.NoteID,
		Filename:  att.Filename,
		FileURL:   att.FileURL,
		FileSize:  att.FileSize,
		MimeType:  att.MimeType,
		CreatedAt: att.CreatedAt,
	}
}
```

---

### **Step 14: Handlers**

**File:** `internal/handler/auth_handler.go`

```go
package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/dto"
	"github.com/yourusername/personal-notes-api/internal/middleware"
	"github.com/yourusername/personal-notes-api/internal/service"
	"github.com/yourusername/personal-notes-api/internal/util"
)

type AuthHandler struct {
	authService   service.AuthService
	uploadService service.UploadService
	validator     *util.Validator
}

func NewAuthHandler(authService service.AuthService, uploadService service.UploadService) *AuthHandler {
	return &AuthHandler{
		authService:   authService,
		uploadService: uploadService,
		validator:     util.GetValidator(),
	}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req dto.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Struct(req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	user, err := h.authService.Register(req.Name, req.Email, req.Password)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"user":    dto.ToUserResponse(user),
		"message": "Registration successful. Please check your email to verify your account.",
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Struct(req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	accessToken, refreshToken, user, err := h.authService.Login(req.Email, req.Password)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         dto.ToUserResponse(user),
	})
}

func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var req dto.RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	newAccessToken, err := h.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"access_token": newAccessToken,
	})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	token := c.Get("Authorization")
	if len(token) > 7 {
		token = token[7:] // Remove "Bearer "
	}

	if err := h.authService.Logout(token); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"message": "logged out successfully",
	})
}

func (h *AuthHandler) GetProfile(c *fiber.Ctx) error {
	user := middleware.GetUser(c)
	return util.SuccessResponse(c, dto.ToUserResponse(user))
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req dto.UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.authService.UpdateProfile(userID, req.Name, ""); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"message": "profile updated successfully",
	})
}

func (h *AuthHandler) UploadAvatar(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	file, err := c.FormFile("avatar")
	if err != nil {
		return util.ErrorResponse(c, util.NewAppError("avatar file is required", "FILE_REQUIRED", 400))
	}

	avatarURL, err := h.uploadService.UploadAvatar(file)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	if err := h.authService.UpdateProfile(userID, "", avatarURL); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"avatar_url": avatarURL,
		"message":    "avatar uploaded successfully",
	})
}

func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return util.ErrorResponse(c, util.ErrInvalidToken)
	}

	if err := h.authService.VerifyEmail(token); err != nil {
		return util.ErrorResponse(c, err)
	}

	return c.SendString(`
		<!DOCTYPE html>
		<html>
		<head><title>Email Verified</title></head>
		<body style="font-family: Arial; text-align: center; padding: 50px;">
			<h1 style="color: #4CAF50;">✅ Email Verified!</h1>
			<p>Your email has been successfully verified.</p>
			<p>You can now close this window.</p>
		</body>
		</html>
	`)
}

func (h *AuthHandler) GoogleLogin(c *fiber.Ctx) error {
	state := uuid.New().String()
	url := h.authService.GetGoogleOAuthURL(state)
	return c.Redirect(url, fiber.StatusTemporaryRedirect)
}

func (h *AuthHandler) GoogleCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return util.ErrorResponse(c, util.NewAppError("authorization code not found", "OAUTH_ERROR", 400))
	}

	accessToken, refreshToken, user, err := h.authService.HandleGoogleCallback(code)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	// Return JSON or redirect to frontend with tokens
	return util.SuccessResponse(c, dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User:         dto.ToUserResponse(user),
	})
}
```

**File:** `internal/handler/note_handler.go`

```go
package handler

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/dto"
	"github.com/yourusername/personal-notes-api/internal/middleware"
	"github.com/yourusername/personal-notes-api/internal/repository"
	"github.com/yourusername/personal-notes-api/internal/service"
	"github.com/yourusername/personal-notes-api/internal/util"
)

type NoteHandler struct {
	noteService service.NoteService
	validator   *util.Validator
}

func NewNoteHandler(noteService service.NoteService) *NoteHandler {
	return &NoteHandler{
		noteService: noteService,
		validator:   util.GetValidator(),
	}
}

func (h *NoteHandler) Create(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req dto.CreateNoteRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Struct(req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	note, err := h.noteService.Create(userID, req.Title, req.Content, req.Color, req.IsPinned)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, dto.ToNoteResponse(note))
}

func (h *NoteHandler) GetByID(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	noteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	note, err := h.noteService.GetByID(noteID, userID)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, dto.ToNoteResponse(note))
}

func (h *NoteHandler) GetAll(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	// Parse query params
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "10"))

	filter := repository.NoteFilter{
		Page:      page,
		Limit:     limit,
		Search:    c.Query("search"),
		Color:     c.Query("color"),
		SortBy:    c.Query("sort_by", "created_at"),
		SortOrder: c.Query("sort_order", "DESC"),
	}

	// Parse tag_id
	if tagIDStr := c.Query("tag_id"); tagIDStr != "" {
		tagID, err := uuid.Parse(tagIDStr)
		if err == nil {
			filter.TagID = &tagID
		}
	}

	// Parse is_pinned
	if pinnedStr := c.Query("is_pinned"); pinnedStr != "" {
		pinned := pinnedStr == "true"
		filter.IsPinned = &pinned
	}

	// Parse date range
	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filter.StartDate = &startDate
		}
	}
	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filter.EndDate = &endDate
		}
	}

	notes, total, err := h.noteService.GetAll(userID, filter)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	responses := make([]dto.NoteResponse, len(notes))
	for i, note := range notes {
		responses[i] = dto.ToNoteResponse(&note)
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	meta := dto.PaginationMeta{
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}

	return util.SuccessResponseWithMeta(c, responses, meta)
}

func (h *NoteHandler) Update(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	noteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	var req dto.UpdateNoteRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Struct(req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	note, err := h.noteService.Update(noteID, userID, req.Title, req.Content, req.Color, req.IsPinned)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, dto.ToNoteResponse(note))
}

func (h *NoteHandler) Delete(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	noteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	if err := h.noteService.SoftDelete(noteID, userID); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"message": "note deleted successfully",
	})
}

func (h *NoteHandler) Restore(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	noteID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	if err := h.noteService.Restore(noteID, userID); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"message": "note restored successfully",
	})
}

func (h *NoteHandler) GetTrashed(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	notes, err := h.noteService.GetTrashed(userID)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	responses := make([]dto.NoteResponse, len(notes))
	for i, note := range notes {
		responses[i] = dto.ToNoteResponse(&note)
	}

	return util.SuccessResponse(c, responses)
}
```

---

**File:** `internal/handler/tag_handler.go`

```go
package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/dto"
	"github.com/yourusername/personal-notes-api/internal/middleware"
	"github.com/yourusername/personal-notes-api/internal/service"
	"github.com/yourusername/personal-notes-api/internal/util"
)

type TagHandler struct {
	tagService service.TagService
	validator  *util.Validator
}

func NewTagHandler(tagService service.TagService) *TagHandler {
	return &TagHandler{
		tagService: tagService,
		validator:  util.GetValidator(),
	}
}

func (h *TagHandler) Create(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req dto.CreateTagRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Struct(req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	tag, err := h.tagService.Create(userID, req.Name)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, dto.ToTagResponse(tag))
}

func (h *TagHandler) GetAll(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	tags, err := h.tagService.GetAll(userID)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	responses := make([]dto.TagResponse, len(tags))
	for i, tag := range tags {
		responses[i] = dto.ToTagResponse(&tag)
	}

	return util.SuccessResponse(c, responses)
}

func (h *TagHandler) Update(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	tagID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	var req dto.UpdateTagRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.validator.Struct(req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	tag, err := h.tagService.Update(tagID, userID, req.Name)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, dto.ToTagResponse(tag))
}

func (h *TagHandler) Delete(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	tagID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	if err := h.tagService.Delete(tagID, userID); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"message": "tag deleted successfully",
	})
}

func (h *TagHandler) AssignToNote(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	noteID, err := uuid.Parse(c.Params("noteId"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	var req dto.AssignTagRequest
	if err := c.BodyParser(&req); err != nil {
		return util.ErrorResponse(c, util.ErrValidation)
	}

	if err := h.tagService.AssignToNote(noteID, req.TagID, userID); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"message": "tag assigned to note",
	})
}

func (h *TagHandler) RemoveFromNote(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	noteID, err := uuid.Parse(c.Params("noteId"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	tagID, err := uuid.Parse(c.Params("tagId"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	if err := h.tagService.RemoveFromNote(noteID, tagID, userID); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"message": "tag removed from note",
	})
}
```

**File:** `internal/handler/attachment_handler.go`

```go
package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/dto"
	"github.com/yourusername/personal-notes-api/internal/middleware"
	"github.com/yourusername/personal-notes-api/internal/service"
	"github.com/yourusername/personal-notes-api/internal/util"
)

type AttachmentHandler struct {
	attachmentService service.AttachmentService
}

func NewAttachmentHandler(attachmentService service.AttachmentService) *AttachmentHandler {
	return &AttachmentHandler{attachmentService: attachmentService}
}

func (h *AttachmentHandler) Upload(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	noteID, err := uuid.Parse(c.Params("noteId"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	file, err := c.FormFile("file")
	if err != nil {
		return util.ErrorResponse(c, util.NewAppError("file is required", "FILE_REQUIRED", 400))
	}

	attachment, err := h.attachmentService.Upload(noteID, userID, file)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, dto.ToAttachmentResponse(attachment))
}

func (h *AttachmentHandler) GetByNoteID(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	noteID, err := uuid.Parse(c.Params("noteId"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	attachments, err := h.attachmentService.GetByNoteID(noteID, userID)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	responses := make([]dto.AttachmentResponse, len(attachments))
	for i, att := range attachments {
		responses[i] = dto.ToAttachmentResponse(&att)
	}

	return util.SuccessResponse(c, responses)
}

func (h *AttachmentHandler) Delete(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	attachmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return util.ErrorResponse(c, util.ErrNotFound)
	}

	if err := h.attachmentService.Delete(attachmentID, userID); err != nil {
		return util.ErrorResponse(c, err)
	}

	return util.SuccessResponse(c, fiber.Map{
		"message": "attachment deleted successfully",
	})
}
```

**File:** `internal/handler/export_handler.go`

```go
package handler

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/middleware"
	"github.com/yourusername/personal-notes-api/internal/repository"
	"github.com/yourusername/personal-notes-api/internal/service"
	"github.com/yourusername/personal-notes-api/internal/util"
)

type ExportHandler struct {
	exportService service.ExportService
}

func NewExportHandler(exportService service.ExportService) *ExportHandler {
	return &ExportHandler{exportService: exportService}
}

func (h *ExportHandler) ExportExcel(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	filter := h.parseFilter(c)

	buffer, err := h.exportService.ExportToExcel(userID, filter)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	filename := fmt.Sprintf("notes_%s.xlsx", time.Now().Format("20060102_150405"))

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	return c.Send(buffer.Bytes())
}

func (h *ExportHandler) ExportPDF(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	filter := h.parseFilter(c)

	buffer, err := h.exportService.ExportToPDF(userID, filter)
	if err != nil {
		return util.ErrorResponse(c, err)
	}

	filename := fmt.Sprintf("notes_%s.pdf", time.Now().Format("20060102_150405"))

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))

	return c.Send(buffer.Bytes())
}

func (h *ExportHandler) parseFilter(c *fiber.Ctx) repository.NoteFilter {
	filter := repository.NoteFilter{
		Search:    c.Query("search"),
		Color:     c.Query("color"),
		SortBy:    c.Query("sort_by", "created_at"),
		SortOrder: c.Query("sort_order", "DESC"),
	}

	if tagIDStr := c.Query("tag_id"); tagIDStr != "" {
		if tagID, err := uuid.Parse(tagIDStr); err == nil {
			filter.TagID = &tagID
		}
	}

	if pinnedStr := c.Query("is_pinned"); pinnedStr != "" {
		pinned := pinnedStr == "true"
		filter.IsPinned = &pinned
	}

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filter.StartDate = &startDate
		}
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filter.EndDate = &endDate
		}
	}

	return filter
}
```

---

### **Step 15: Middleware**

**File:** `internal/middleware/auth_middleware.go`

```go
package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/personal-notes-api/internal/config"
	"github.com/yourusername/personal-notes-api/internal/entity"
	"github.com/yourusername/personal-notes-api/internal/repository"
	"github.com/yourusername/personal-notes-api/internal/service"
	"github.com/yourusername/personal-notes-api/internal/util"
)

func AuthMiddleware(cfg *config.Config, userRepo repository.UserRepository, authService service.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return util.ErrorResponse(c, util.ErrUnauthorized)
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return util.ErrorResponse(c, util.ErrUnauthorized)
		}

		token := parts[1]

		// Check if token is blacklisted
		if authService.IsTokenBlacklisted(token) {
			return util.ErrorResponse(c, util.ErrTokenRevoked)
		}

		// Validate token
		claims, err := util.ValidateToken(token, cfg)
		if err != nil {
			return util.ErrorResponse(c, util.ErrInvalidToken)
		}

		// Get user
		user, err := userRepo.FindByID(claims.UserID)
		if err != nil {
			return util.ErrorResponse(c, util.ErrUnauthorized)
		}

		// Store user in context
		c.Locals("user_id", user.ID)
		c.Locals("user", user)

		return c.Next()
	}
}

func GetUserID(c *fiber.Ctx) uuid.UUID {
	return c.Locals("user_id").(uuid.UUID)
}

func GetUser(c *fiber.Ctx) *entity.User {
	return c.Locals("user").(*entity.User)
}
```

**File:** `internal/middleware/logger_middleware.go`

```go
package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

func LoggerMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		err := c.Next()

		log.Info().
			Str("request_id", c.Locals("request_id").(string)).
			Str("method", c.Method()).
			Str("path", c.Path()).
			Int("status", c.Response().StatusCode()).
			Dur("latency", time.Since(start)).
			Msg("request processed")

		return err
	}
}
```

**File:** `internal/middleware/recovery_middleware.go`

```go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
	"github.com/yourusername/personal-notes-api/internal/util"
)

func RecoveryMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				log.Error().
					Interface("panic", r).
					Str("request_id", c.Locals("request_id").(string)).
					Msg("panic recovered")

				util.ErrorResponse(c, util.ErrInternalServer)
			}
		}()

		return c.Next()
	}
}
```

**File:** `internal/middleware/request_id_middleware.go`

```go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func RequestIDMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		c.Locals("request_id", requestID)
		c.Set("X-Request-ID", requestID)

		return c.Next()
	}
}
```

---

### **Step 16: Main Application**

**File:** `cmd/api/main.go`

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/hibiken/asynq"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog"
	zlog "github.com/rs/zerolog/log"
	"github.com/yourusername/personal-notes-api/internal/config"
	"github.com/yourusername/personal-notes-api/internal/database"
	"github.com/yourusername/personal-notes-api/internal/handler"
	"github.com/yourusername/personal-notes-api/internal/middleware"
	"github.com/yourusername/personal-notes-api/internal/repository"
	"github.com/yourusername/personal-notes-api/internal/service"
	"github.com/yourusername/personal-notes-api/internal/worker"
)

func main() {
	// Load .env
	godotenv.Load()

	// Setup zerolog
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("APP_ENV") == "development" {
		zlog.Logger = zlog.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	// Load config
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	zlog.Info().Msg("🚀 Starting Personal Notes API...")

	// Connect PostgreSQL
	db, err := database.ConnectPostgres(cfg)
	if err != nil {
		log.Fatal(err)
	}

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Fatal(err)
	}

	// Connect Redis
	redisClient, err := database.ConnectRedis(cfg)
	if err != nil {
		log.Fatal(err)
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	noteRepo := repository.NewNoteRepository(db)
	tagRepo := repository.NewTagRepository(db)
	attachmentRepo := repository.NewAttachmentRepository(db)

	// Initialize Asynq
	asynqClient := worker.NewAsynqClient(cfg)
	defer asynqClient.Close()

	asynqServer := worker.NewAsynqServer(cfg)

	// Initialize services
	emailService := service.NewEmailService(cfg)
	authService := service.NewAuthService(userRepo, redisClient, cfg, emailService)
	uploadService := service.NewUploadService(cfg)
	noteService := service.NewNoteService(noteRepo)
	tagService := service.NewTagService(tagRepo, noteRepo)
	attachmentService := service.NewAttachmentService(attachmentRepo, noteRepo, userRepo, uploadService, asynqClient)
	exportService := service.NewExportService(noteRepo)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authService, uploadService)
	noteHandler := handler.NewNoteHandler(noteService)
	tagHandler := handler.NewTagHandler(tagService)
	attachmentHandler := handler.NewAttachmentHandler(attachmentService)
	exportHandler := handler.NewExportHandler(exportService)

	// Setup Asynq worker
	emailTaskHandler := worker.NewEmailTaskHandler(emailService)
	mux := asynq.NewServeMux()
	mux.HandleFunc(worker.TypeWelcomeEmail, emailTaskHandler.HandleWelcomeEmail)
	mux.HandleFunc(worker.TypeAttachmentNotification, emailTaskHandler.HandleAttachmentNotification)
	worker.StartWorker(asynqServer, mux)

	// Initialize Fiber
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   err.Error(),
			})
		},
	})

	// Global middleware
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))
	app.Use(middleware.RequestIDMiddleware())
	app.Use(middleware.LoggerMiddleware())
	app.Use(middleware.RecoveryMiddleware())

	// Routes
	setupRoutes(app, cfg, authHandler, noteHandler, tagHandler, attachmentHandler, exportHandler, userRepo, authService)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		zlog.Info().Msg("🛑 Shutting down server...")

		asynqServer.Shutdown()
		asynqClient.Close()

		sqlDB, _ := db.DB()
		sqlDB.Close()

		redisClient.Close()

		app.Shutdown()
		os.Exit(0)
	}()

	// Start server
	addr := fmt.Sprintf(":%s", cfg.App.Port)
	zlog.Info().Msgf("🎧 Server listening on http://localhost%s", addr)

	if err := app.Listen(addr); err != nil {
		log.Fatal(err)
	}
}

func setupRoutes(
	app *fiber.App,
	cfg *config.Config,
	authHandler *handler.AuthHandler,
	noteHandler *handler.NoteHandler,
	tagHandler *handler.TagHandler,
	attachmentHandler *handler.AttachmentHandler,
	exportHandler *handler.ExportHandler,
	userRepo repository.UserRepository,
	authService service.AuthService,
) {
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"time":   c.Context().Time(),
		})
	})

	// API v1
	v1 := app.Group("/api/v1")

	// Public auth routes
	auth := v1.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Post("/refresh", authHandler.RefreshToken)
	auth.Get("/verify-email", authHandler.VerifyEmail)
	auth.Get("/google", authHandler.GoogleLogin)
	auth.Get("/google/callback", authHandler.GoogleCallback)

	// Protected auth routes
	authProtected := auth.Use(middleware.AuthMiddleware(cfg, userRepo, authService))
	authProtected.Post("/logout", authHandler.Logout)
	authProtected.Get("/profile", authHandler.GetProfile)
	authProtected.Put("/profile", authHandler.UpdateProfile)
	authProtected.Post("/avatar", authHandler.UploadAvatar)

	// Notes (protected)
	notes := v1.Group("/notes", middleware.AuthMiddleware(cfg, userRepo, authService))
	notes.Post("/", noteHandler.Create)
	notes.Get("/", noteHandler.GetAll)
	notes.Get("/trashed", noteHandler.GetTrashed)
	notes.Get("/:id", noteHandler.GetByID)
	notes.Put("/:id", noteHandler.Update)
	notes.Delete("/:id", noteHandler.Delete)
	notes.Post("/:id/restore", noteHandler.Restore)

	// Tags (protected)
	tags := v1.Group("/tags", middleware.AuthMiddleware(cfg, userRepo, authService))
	tags.Post("/", tagHandler.Create)
	tags.Get("/", tagHandler.GetAll)
	tags.Put("/:id", tagHandler.Update)
	tags.Delete("/:id", tagHandler.Delete)

	// Tag assignment
	notes.Post("/:noteId/tags", tagHandler.AssignToNote)
	notes.Delete("/:noteId/tags/:tagId", tagHandler.RemoveFromNote)

	// Attachments (protected)
	notes.Post("/:noteId/attachments", attachmentHandler.Upload)
	notes.Get("/:noteId/attachments", attachmentHandler.GetByNoteID)
	v1.Delete("/attachments/:id", middleware.AuthMiddleware(cfg, userRepo, authService), attachmentHandler.Delete)

	// Export (protected)
	export := v1.Group("/export", middleware.AuthMiddleware(cfg, userRepo, authService))
	export.Get("/excel", exportHandler.ExportExcel)
	export.Get("/pdf", exportHandler.ExportPDF)

	// Serve uploaded files
	app.Static("/uploads", "./uploads")
}
```

---

### **Step 17: Testing Manual dengan cURL**

```bash
# === PREPARATION ===

# 1. Start PostgreSQL
docker run --name postgres-notes \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=personal_notes \
  -p 5432:5432 \
  -d postgres:15-alpine

# 2. Start Redis
docker run --name redis-notes \
  -p 6379:6379 \
  -d redis:7-alpine

# 3. Copy .env
cp .env.example .env

# 4. Run aplikasi
go run cmd/api/main.go

# Output:
# 🚀 Starting Personal Notes API...
# ✅ Database connected
# Running migrations...
# ✅ Migrations completed
# ✅ Redis connected
# 🔄 Starting Asynq worker...
# 🎧 Server listening on http://localhost:3000
```

---

**Test Flow Lengkap:**

```bash
# === 1. HEALTH CHECK ===
curl http://localhost:3000/health

# Response:
# {
#   "status": "ok",
#   "time": "2026-02-27T10:00:00Z"
# }


# === 2. REGISTER USER ===
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
#       "avatar_url": "",
#       "email_verified": false,
#       "created_at": "2026-02-27T10:01:00Z",
#       "updated_at": "2026-02-27T10:01:00Z"
#     },
#     "message": "Registration successful. Please check your email to verify your account."
#   }
# }

# Email welcome + verification link akan dikirim ke john@example.com


# === 3. VERIFY EMAIL (klik link di email atau manual) ===
# Ambil token dari email, lalu:
curl "http://localhost:3000/api/v1/auth/verify-email?token=YOUR_VERIFICATION_TOKEN"

# Response: HTML page dengan "✅ Email Verified!"


# === 4. LOGIN ===
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
#       "email_verified": true,
#       ...
#     }
#   }
# }

export TOKEN="eyJhbGc..."


# === 5. GET PROFILE ===
curl http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# Response: user details


# === 6. UPDATE PROFILE ===
curl -X PUT http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe Updated"
  }'


# === 7. UPLOAD AVATAR (with auto-resize to 200x200) ===
curl -X POST http://localhost:3000/api/v1/auth/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/path/to/image.jpg"

# Response:
# {
#   "success": true,
#   "data": {
#     "avatar_url": "uploads/avatars/uuid_timestamp.jpg",
#     "message": "avatar uploaded successfully"
#   }
# }


# === 8. GOOGLE OAUTH LOGIN ===
# Visit di browser:
open http://localhost:3000/api/v1/auth/google

# Akan redirect ke Google OAuth consent screen
# Setelah authorize, akan redirect ke /api/v1/auth/google/callback
# Response: access_token + refresh_token + user


# === 9. CREATE NOTE ===
curl -X POST http://localhost:3000/api/v1/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Note",
    "content": "This is the content of my first note",
    "color": "#FFD700",
    "is_pinned": true
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "note-uuid",
#     "user_id": "user-uuid",
#     "title": "My First Note",
#     "content": "This is the content of my first note",
#     "color": "#FFD700",
#     "is_pinned": true,
#     "tags": [],
#     "attachments": [],
#     "created_at": "...",
#     "updated_at": "..."
#   }
# }

export NOTE_ID="note-uuid"


# === 10. CREATE TAG ===
curl -X POST http://localhost:3000/api/v1/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Work"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "tag-uuid",
#     "user_id": "user-uuid",
#     "name": "Work",
#     ...
#   }
# }

export TAG_ID="tag-uuid"


# === 11. CREATE MORE TAGS ===
curl -X POST http://localhost:3000/api/v1/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Personal"}'

curl -X POST http://localhost:3000/api/v1/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Important"}'


# === 12. LIST ALL TAGS ===
curl http://localhost:3000/api/v1/tags \
  -H "Authorization: Bearer $TOKEN"


# === 13. ASSIGN TAG TO NOTE ===
curl -X POST http://localhost:3000/api/v1/notes/$NOTE_ID/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tag_id": "'"$TAG_ID"'"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "message": "tag assigned to note"
#   }
# }


# === 14. UPLOAD ATTACHMENT TO NOTE ===
curl -X POST http://localhost:3000/api/v1/notes/$NOTE_ID/attachments \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/document.pdf"

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "attachment-uuid",
#     "note_id": "note-uuid",
#     "filename": "document.pdf",
#     "file_url": "uploads/attachments/uuid_timestamp.pdf",
#     "file_size": 102400,
#     "mime_type": "application/pdf",
#     "created_at": "..."
#   }
# }

# Email notification akan dikirim (async via Asynq)


# === 15. GET NOTE WITH TAGS & ATTACHMENTS ===
curl http://localhost:3000/api/v1/notes/$NOTE_ID \
  -H "Authorization: Bearer $TOKEN"

# Response includes tags and attachments arrays


# === 16. CREATE MORE NOTES ===
curl -X POST http://localhost:3000/api/v1/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Shopping List",
    "content": "Milk, Eggs, Bread",
    "color": "#FF5733",
    "is_pinned": false
  }'

curl -X POST http://localhost:3000/api/v1/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Meeting Notes",
    "content": "Discuss Q1 goals",
    "color": "#33FF57",
    "is_pinned": true
  }'


# === 17. LIST ALL NOTES (with pagination) ===
curl "http://localhost:3000/api/v1/notes?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": [ ...array of notes... ],
#   "meta": {
#     "total": 3,
#     "page": 1,
#     "limit": 10,
#     "total_pages": 1
#   }
# }


# === 18. SEARCH NOTES (title or content) ===
curl "http://localhost:3000/api/v1/notes?search=shopping" \
  -H "Authorization: Bearer $TOKEN"

# Returns notes that contain "shopping" in title or content


# === 19. FILTER NOTES BY TAG ===
curl "http://localhost:3000/api/v1/notes?tag_id=$TAG_ID" \
  -H "Authorization: Bearer $TOKEN"


# === 20. FILTER NOTES BY PINNED ===
curl "http://localhost:3000/api/v1/notes?is_pinned=true" \
  -H "Authorization: Bearer $TOKEN"

# Returns only pinned notes


# === 21. FILTER NOTES BY COLOR ===
curl "http://localhost:3000/api/v1/notes?color=%23FFD700" \
  -H "Authorization: Bearer $TOKEN"


# === 22. FILTER NOTES BY DATE RANGE ===
curl "http://localhost:3000/api/v1/notes?start_date=2026-02-01&end_date=2026-02-28" \
  -H "Authorization: Bearer $TOKEN"


# === 23. COMBINED FILTERS + SEARCH + SORT ===
curl "http://localhost:3000/api/v1/notes?search=note&is_pinned=true&sort_by=title&sort_order=ASC" \
  -H "Authorization: Bearer $TOKEN"


# === 24. UPDATE NOTE ===
curl -X PUT http://localhost:3000/api/v1/notes/$NOTE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Updated Note Title",
    "content": "Updated content here",
    "is_pinned": false
  }'


# === 25. SOFT DELETE NOTE ===
curl -X DELETE http://localhost:3000/api/v1/notes/$NOTE_ID \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": {
#     "message": "note deleted successfully"
#   }
# }

# Note masih ada di database tapi deleted_at != NULL


# === 26. GET TRASHED NOTES ===
curl http://localhost:3000/api/v1/notes/trashed \
  -H "Authorization: Bearer $TOKEN"

# Returns soft-deleted notes


# === 27. RESTORE NOTE ===
curl -X POST http://localhost:3000/api/v1/notes/$NOTE_ID/restore \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": {
#     "message": "note restored successfully"
#   }
# }


# === 28. REMOVE TAG FROM NOTE ===
curl -X DELETE http://localhost:3000/api/v1/notes/$NOTE_ID/tags/$TAG_ID \
  -H "Authorization: Bearer $TOKEN"


# === 29. GET ATTACHMENTS BY NOTE ===
curl http://localhost:3000/api/v1/notes/$NOTE_ID/attachments \
  -H "Authorization: Bearer $TOKEN"


# === 30. DELETE ATTACHMENT ===
curl -X DELETE http://localhost:3000/api/v1/attachments/attachment-uuid \
  -H "Authorization: Bearer $TOKEN"

# File juga dihapus dari storage


# === 31. EXPORT NOTES TO EXCEL ===
curl "http://localhost:3000/api/v1/export/excel" \
  -H "Authorization: Bearer $TOKEN" \
  -o notes.xlsx

# File downloaded: notes.xlsx dengan formatting


# === 32. EXPORT NOTES TO PDF ===
curl "http://localhost:3000/api/v1/export/pdf" \
  -H "Authorization: Bearer $TOKEN" \
  -o notes.pdf

# File downloaded: notes.pdf


# === 33. EXPORT WITH FILTERS ===
curl "http://localhost:3000/api/v1/export/excel?is_pinned=true&color=%23FFD700" \
  -H "Authorization: Bearer $TOKEN" \
  -o pinned_notes.xlsx


# === 34. UPDATE TAG ===
curl -X PUT http://localhost:3000/api/v1/tags/$TAG_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Work Updated"
  }'


# === 35. DELETE TAG ===
curl -X DELETE http://localhost:3000/api/v1/tags/$TAG_ID \
  -H "Authorization: Bearer $TOKEN"

# Note: associations juga dihapus dari note_tags table


# === 36. REFRESH TOKEN ===
export REFRESH_TOKEN="refresh-token-here"

curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "'"$REFRESH_TOKEN"'"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "access_token": "new-access-token-here"
#   }
# }


# === 37. LOGOUT ===
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"

# Token di-blacklist di Redis


# === 38. TEST BLACKLISTED TOKEN ===
curl http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": false,
#   "error": "token has been revoked",
#   "code": "TOKEN_REVOKED"
# }
# Status: 401


# === 39. TEST VALIDATION ERRORS ===

# Invalid email
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "invalid-email",
    "password": "password123"
  }'

# Response: validation error


# Short password
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@example.com",
    "password": "123"
  }'

# Response: password min 6 characters


# Invalid hex color
curl -X POST http://localhost:3000/api/v1/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "content": "Content",
    "color": "invalid-color"
  }'

# Response: invalid hex color format


# === 40. TEST FILE UPLOAD VALIDATION ===

# File too large (> 5MB)
curl -X POST http://localhost:3000/api/v1/notes/$NOTE_ID/attachments \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/large-file.zip"

# Response:
# {
#   "success": false,
#   "error": "file too large",
#   "code": "FILE_TOO_LARGE"
# }


# Invalid file type
curl -X POST http://localhost:3000/api/v1/notes/$NOTE_ID/attachments \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/file.exe"

# Response:
# {
#   "success": false,
#   "error": "invalid file type",
#   "code": "INVALID_FILE_TYPE"
# }


# === 41. TEST OWNERSHIP (akses note user lain) ===

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

# Coba akses note milik user pertama
curl http://localhost:3000/api/v1/notes/$NOTE_ID \
  -H "Authorization: Bearer $TOKEN2"

# Response:
# {
#   "success": false,
#   "error": "forbidden",
#   "code": "FORBIDDEN"
# }
# Status: 403


# === 42. TEST AVATAR RESIZE ===
# Upload gambar besar (e.g., 4000x3000)
curl -X POST http://localhost:3000/api/v1/auth/avatar \
  -H "Authorization: Bearer $TOKEN" \
  -F "avatar=@/path/to/large-image.jpg"

# Check hasil: file di uploads/avatars/ akan otomatis 200x200px


# === 43. DOWNLOAD ATTACHMENT FILE ===
curl http://localhost:3000/uploads/attachments/uuid_timestamp.pdf \
  -o downloaded.pdf

# File served via static middleware
```

---

## ✅ Checklist Completion

Setelah menyelesaikan project ini, kamu sudah mahir dalam:

### **REST API Development (Topik 1)**
- [x] Build RESTful API dengan Fiber v2
- [x] HTTP methods (GET, POST, PUT, DELETE)
- [x] Request/response handling
- [x] Route grouping & versioning (api/v1)
- [x] Query parameters parsing
- [x] Form data & multipart upload
- [x] Static file serving
- [x] Custom error handling
- [x] Middleware chaining

### **GORM & PostgreSQL (Topik 2)**
- [x] Database connection dengan connection pooling
- [x] Auto-migration (AutoMigrate)
- [x] Multiple entities dengan relationships
- [x] One-to-Many (User → Notes, User → Tags, Note → Attachments)
- [x] Many-to-Many (Notes ↔ Tags dengan join table)
- [x] UUID sebagai primary key
- [x] Soft delete pattern (deleted_at)
- [x] Preload associations (Eager loading)
- [x] Complex queries (WHERE, ILIKE, JOIN, GROUP BY)
- [x] Pagination & sorting
- [x] Custom repository pattern

### **Authentication & JWT (Topik 3)**
- [x] User registration dengan password hashing
- [x] Login dengan JWT (access + refresh tokens)
- [x] Token validation & claims extraction
- [x] Refresh token mechanism
- [x] Logout dengan token blacklist (Redis)
- [x] Email verification dengan token
- [x] OAuth 2.0 Google login
- [x] Auth middleware
- [x] Context-based user data (c.Locals)

### **Validation & Error Handling (Topik 4)**
- [x] go-playground/validator integration
- [x] Custom validators (hexcolor, pastdate, positive)
- [x] Struct validation
- [x] Custom AppError dengan status codes
- [x] Consistent error response format
- [x] Validation error messages
- [x] Business logic validation
- [x] File upload validation (size, type)

### **Pagination, Filtering, Sorting (Topik 5)**
- [x] Offset-based pagination
- [x] Pagination metadata (total, pages)
- [x] Multi-field filtering (tag, pinned, color, date range)
- [x] Text search (ILIKE in title & content)
- [x] Dynamic sorting (column + order)
- [x] Combined filters + search + pagination
- [x] Query builder pattern

### **File Upload & Export (Topik 6)**
- [x] File upload dengan multipart/form-data
- [x] File validation (size, mime type)
- [x] Image resize dengan disintegration/imaging
- [x] Avatar auto-resize to 200x200
- [x] File storage management
- [x] Static file serving
- [x] Excel export dengan xuri/excelize
- [x] PDF export dengan jung-kurt/gofpdf
- [x] Dynamic filename generation
- [x] Export dengan filtering

### **Email Service (Topik 7)**
- [x] SMTP configuration
- [x] HTML email templates
- [x] Template rendering dengan html/template
- [x] Welcome email saat register
- [x] Email verification dengan link
- [x] Attachment upload notification
- [x] Email service abstraction
- [x] jordan-wright/email library

### **Background Jobs & Scheduler (Topik 8)**
- [x] Asynq setup (client + server)
- [x] Task queue configuration
- [x] Background email sending
- [x] Task handler implementation
- [x] Queue priority (emails queue)
- [x] Worker concurrency
- [x] Async processing
- [x] Graceful worker shutdown

### **Security & Hardening (Topik 9)**
- [x] Password hashing dengan bcrypt
- [x] JWT secret protection
- [x] Token blacklist dengan Redis TTL
- [x] Email verification requirement
- [x] OAuth 2.0 integration (Google)
- [x] Ownership validation
- [x] File upload security
- [x] CORS configuration
- [x] Request ID tracking
- [x] Panic recovery middleware

### **Additional Production Skills**
- [x] Clean architecture (Entity, Repository, Service, Handler)
- [x] Dependency injection
- [x] Viper configuration management
- [x] Zerolog structured logging
- [x] Redis integration (blacklist, sessions)
- [x] Graceful shutdown
- [x] Environment-based config (.env)
- [x] DTOs untuk decoupling
- [x] Middleware composition
- [x] Error logging dengan request ID

---

## 🚀 Ide Pengembangan Mandiri

### **Level 1: Feature Enhancement**

1. **Note Sharing**
   - Share note dengan user lain (read-only atau edit)
   - Permissions (view, edit, comment)
   - Collaboration tracking
   
   ```go
   type SharedNote struct {
       NoteID     uuid.UUID
       SharedWith uuid.UUID // User ID
       Permission string    // "view", "edit"
       SharedBy   uuid.UUID
       CreatedAt  time.Time
   }
   ```

2. **Note Templates**
   - User bisa save note sebagai template
   - Template library (Meeting Notes, Daily Journal, etc)
   - Apply template saat create note
   
   ```go
   type Template struct {
       UserID  uuid.UUID
       Title   string
       Content string
       Color   string
   }
   ```

3. **Rich Text Editor Support**
   - Store content sebagai Markdown atau HTML
   - Preview endpoint
   - Markdown to HTML conversion
   
   ```go
   import "github.com/gomarkdown/markdown"
   
   func (s *noteService) GetHTMLPreview(noteID uuid.UUID) (string, error) {
       note, _ := s.noteRepo.FindByID(noteID)
       html := markdown.ToHTML([]byte(note.Content), nil, nil)
       return string(html), nil
   }
   ```

4. **Note Versioning**
   - Track edit history
   - Restore previous versions
   - Compare versions (diff)
   
   ```go
   type NoteVersion struct {
       NoteID    uuid.UUID
       Version   int
       Title     string
       Content   string
       CreatedAt time.Time
   }
   ```

5. **Folders/Categories**
   - Organize notes dalam folders
   - Nested folders
   - Move notes between folders
   
   ```go
   type Folder struct {
       UserID   uuid.UUID
       Name     string
       ParentID *uuid.UUID // For nested folders
   }
   
   type Note struct {
       ...
       FolderID *uuid.UUID
   }
   ```

### **Level 2: Advanced Features**

6. **Full-Text Search dengan PostgreSQL**
   - PostgreSQL full-text search (tsvector)
   - Search ranking
   - Highlight matches
   
   ```go
   // Migration
   ALTER TABLE notes ADD COLUMN search_vector tsvector;
   CREATE INDEX idx_search ON notes USING gin(search_vector);
   
   // Query
   SELECT * FROM notes 
   WHERE search_vector @@ to_tsquery('english', 'search_term')
   ORDER BY ts_rank(search_vector, to_tsquery('english', 'search_term')) DESC;
   ```

7. **Real-time Collaboration dengan WebSocket**
   - Live editing dengan multiple users
   - Operational Transform atau CRDT
   - Cursor tracking
   
   ```go
   import "github.com/gofiber/websocket/v2"
   
   app.Get("/ws/notes/:id", websocket.New(func(c *websocket.Conn) {
       // Handle real-time updates
   }))
   ```

8. **Advanced Tagging System**
   - Tag hierarchy (parent-child tags)
   - Tag colors
   - Tag statistics (note count per tag)
   - Auto-tagging based on content (ML)

9. **Reminder & Notifications**
   - Set reminder untuk note
   - Email/push notification saat reminder triggered
   - Recurring reminders
   
   ```go
   type Reminder struct {
       NoteID      uuid.UUID
       RemindAt    time.Time
       RecurringInterval string // "daily", "weekly", etc
       IsSent      bool
   }
   
   // Cron job untuk check reminders
   ```

10. **Note Import/Export**
    - Import dari Evernote, Google Keep, Notion
    - Export ke multiple formats (JSON, Markdown, HTML)
    - Batch import/export
    
    ```go
    func ImportFromEvernote(file *multipart.FileHeader) error {
        // Parse Evernote ENEX format
        // Create notes from parsed data
    }
    ```

### **Level 3: Integration & Automation**

11. **Third-Party Integrations**
    - Slack integration (post note to channel)
    - Telegram bot
    - Discord webhook
    - Zapier/IFTTT webhooks
    
    ```go
    type Integration struct {
        UserID   uuid.UUID
        Type     string // "slack", "telegram", "discord"
        WebhookURL string
        IsActive bool
    }
    ```

12. **OCR untuk Image Attachments**
    - Extract text dari image attachment
    - Save extracted text ke note content
    - Tesseract OCR integration
    
    ```go
    import "github.com/otiai10/gosseract/v2"
    
    func ExtractTextFromImage(filePath string) (string, error) {
        client := gosseract.NewClient()
        defer client.Close()
        client.SetImage(filePath)
        return client.Text()
    }
    ```

13. **AI-Powered Features**
    - Auto-summarize long notes (OpenAI GPT)
    - Auto-generate tags based on content
    - Sentiment analysis
    - Similar notes recommendation
    
    ```go
    import "github.com/sashabaranov/go-openai"
    
    func SummarizeNote(content string) (string, error) {
        client := openai.NewClient(apiKey)
        resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionRequest{
            Model: openai.GPT3Dot5Turbo,
            Messages: []openai.ChatCompletionMessage{
                {
                    Role: "user",
                    Content: "Summarize this note: " + content,
                },
            },
        })
        return resp.Choices[0].Message.Content, err
    }
    ```

14. **Scheduled Publishing**
    - Schedule note untuk di-publish nanti
    - Auto-publish via cron job
    - Email notification saat published
    
    ```go
    type Note struct {
        ...
        PublishAt *time.Time
        IsPublished bool
    }
    ```

15. **Note Analytics**
    - Track note views
    - Most edited notes
    - Active hours heatmap
    - Tag usage statistics
    
    ```go
    type NoteAnalytics struct {
        NoteID      uuid.UUID
        ViewCount   int
        EditCount   int
        LastViewedAt time.Time
    }
    ```

### **Level 4: Production & Scalability**

16. **Caching Layer dengan Redis**
    - Cache frequently accessed notes
    - Cache user tags list
    - Cache export results (TTL 5 min)
    
    ```go
    func (s *noteService) GetByID(noteID uuid.UUID) (*entity.Note, error) {
        cacheKey := fmt.Sprintf("note:%s", noteID)
        
        // Try cache
        cached := s.redis.Get(ctx, cacheKey).Val()
        if cached != "" {
            var note entity.Note
            json.Unmarshal([]byte(cached), &note)
            return &note, nil
        }
        
        // Get from DB
        note, err := s.noteRepo.FindByID(noteID)
        if err != nil {
            return nil, err
        }
        
        // Save to cache
        data, _ := json.Marshal(note)
        s.redis.Set(ctx, cacheKey, data, 10*time.Minute)
        
        return note, nil
    }
    ```

17. **Rate Limiting per User**
    - Limit API calls per user
    - Different limits untuk different endpoints
    - Redis-based rate limiting
    
    ```go
    import "github.com/gofiber/fiber/v2/middleware/limiter"
    
    app.Use(limiter.New(limiter.Config{
        Max: 100,
        Expiration: 1 * time.Minute,
        KeyGenerator: func(c *fiber.Ctx) string {
            return middleware.GetUserID(c).String()
        },
    }))
    ```

18. **Unit & Integration Tests**
    - Repository tests dengan testcontainers
    - Service tests dengan mocking
    - Handler tests dengan httptest
    - E2E tests
    
    ```go
    func TestNoteService_Create(t *testing.T) {
        mockRepo := new(MockNoteRepository)
        service := NewNoteService(mockRepo)
        
        mockRepo.On("Create", mock.Anything).Return(nil)
        
        note, err := service.Create(userID, "Title", "Content", "#FFF", false)
        
        assert.NoError(t, err)
        assert.NotNil(t, note)
        mockRepo.AssertExpectations(t)
    }
    ```

19. **Containerization & Deployment**
    - Dockerfile multi-stage build
    - Docker Compose untuk local development
    - Kubernetes deployment
    - CI/CD dengan GitHub Actions
    
    ```dockerfile
    FROM golang:1.22-alpine AS builder
    WORKDIR /app
    COPY . .
    RUN go build -o main cmd/api/main.go
    
    FROM alpine:latest
    WORKDIR /root/
    COPY --from=builder /app/main .
    COPY --from=builder /app/templates ./templates
    CMD ["./main"]
    ```

20. **Monitoring & Observability**
    - Prometheus metrics
    - Grafana dashboards
    - Error tracking (Sentry)
    - APM (Application Performance Monitoring)
    
    ```go
    import "github.com/prometheus/client_golang/prometheus"
    
    var (
        httpRequestsTotal = prometheus.NewCounterVec(
            prometheus.CounterOpts{
                Name: "http_requests_total",
                Help: "Total HTTP requests",
            },
            []string{"method", "endpoint", "status"},
        )
    )
    
    func init() {
        prometheus.MustRegister(httpRequestsTotal)
    }
    ```

21. **Database Optimization**
    - Database indexing optimization
    - Query performance analysis
    - Connection pooling tuning
    - Read replicas
    
    ```sql
    -- Add indexes
    CREATE INDEX idx_notes_user_id_created_at ON notes(user_id, created_at DESC);
    CREATE INDEX idx_notes_is_pinned ON notes(is_pinned) WHERE deleted_at IS NULL;
    CREATE INDEX idx_tags_user_id_name ON tags(user_id, name);
    ```

22. **File Storage Abstraction**
    - Support S3/MinIO untuk file storage
    - CDN integration untuk static files
    - Image optimization service
    
    ```go
    type FileStorage interface {
        Upload(file io.Reader, filename string) (string, error)
        Delete(url string) error
        GetURL(filename string) string
    }
    
    type S3Storage struct {
        client *s3.Client
        bucket string
    }
    ```

23. **GraphQL API** (Alternative)
    - GraphQL endpoint selain REST
    - Schema definition
    - Resolvers
    - DataLoader untuk N+1 problem
    
    ```go
    import "github.com/graphql-go/graphql"
    
    var noteType = graphql.NewObject(graphql.ObjectConfig{
        Name: "Note",
        Fields: graphql.Fields{
            "id": &graphql.Field{Type: graphql.String},
            "title": &graphql.Field{Type: graphql.String},
            "content": &graphql.Field{Type: graphql.String},
            "tags": &graphql.Field{
                Type: graphql.NewList(tagType),
                Resolve: func(p graphql.ResolveParams) (interface{}, error) {
                    // Load tags
                },
            },
        },
    })
    ```

24. **Audit Trail & Activity Log**
    - Track semua user actions
    - Who did what when
    - Searchable audit logs
    
    ```go
    type AuditLog struct {
        UserID    uuid.UUID
        Action    string // "note.create", "note.update", "note.delete"
        EntityID  uuid.UUID
        Changes   JSON // Before/after
        IPAddress string
        UserAgent string
        CreatedAt time.Time
    }
    ```

25. **Multi-tenancy Support**
    - Workspace/organization concept
    - Shared notes dalam organization
    - Role-based access control (RBAC)
    
    ```go
    type Organization struct {
        ID   uuid.UUID
        Name string
    }
    
    type Member struct {
        OrganizationID uuid.UUID
        UserID         uuid.UUID
        Role           string // "owner", "admin", "member"
    }
    ```

---

## 📖 Resources

- **Fiber**: https://docs.gofiber.io/
- **GORM**: https://gorm.io/docs/
- **JWT**: https://github.com/golang-jwt/jwt
- **OAuth2**: https://pkg.go.dev/golang.org/x/oauth2
- **Validator**: https://github.com/go-playground/validator
- **Imaging**: https://github.com/disintegration/imaging
- **Excelize**: https://xuri.me/excelize/
- **gofpdf**: https://github.com/jung-kurt/gofpdf
- **Email**: https://github.com/jordan-wright/email
- **Asynq**: https://github.com/hibiken/asynq
- **Zerolog**: https://github.com/rs/zerolog

---

## 🎯 Kesimpulan

Selamat! 🎉 Kamu baru saja menyelesaikan **Personal Notes API** - project capstone Fase 1 yang paling comprehensive!

**Apa yang sudah dikuasai:**

✅ **Complete Authentication System:**
- JWT (access + refresh token)
- OAuth Google login
- Email verification
- Token blacklist dengan Redis
- Avatar upload dengan auto-resize

✅ **Advanced CRUD Operations:**
- Notes dengan soft delete & restore
- Tags dengan many-to-many relationship
- Attachments dengan file validation
- Multi-field filtering & search
- Pagination & dynamic sorting

✅ **Background Processing:**
- Async email sending dengan Asynq
- Welcome email + verification email
- Attachment notification email
- HTML email templates

✅ **Export Functionality:**
- Excel export dengan formatting
- PDF export dengan custom layout
- Export dengan filtering

✅ **Production-Ready Features:**
- Clean architecture
- Structured logging
- Error handling
- Request ID tracking
- Panic recovery
- Graceful shutdown

**Skill Progress:**
- **Project 1** (URL Shortener): Basic CRUD + Redis caching
- **Project 2** (Expense Tracker): JWT auth + budget logic + Excel export
- **Project 3** (Personal Notes): **SEMUA topik Fase 1** → OAuth, email service, file upload+resize, background jobs, many-to-many relationships, soft delete, advanced filtering

**Bedanya dengan Project 1 & 2:**
- ✅ **OAuth**: Social login dengan Google
- ✅ **Email**: HTML templates + async sending
- ✅ **File Processing**: Image resize + file validation
- ✅ **Background Jobs**: Asynq worker untuk async tasks
- ✅ **Advanced Relations**: Many-to-many dengan join table
- ✅ **Soft Delete**: Restore functionality
- ✅ **Export}: Both Excel AND PDF

Kamu sekarang punya **fondasi solid** untuk build aplikasi production-ready. Project ini mencakup semua pattern yang dipakai di perusahaan tech.

**Next Steps:**
- Implement 3-5 ide dari list di atas
- Deploy ke production (Docker + VPS/cloud)
- Add unit tests (target 80%+ coverage)
- Implement caching layer dengan Redis
- Add monitoring (Prometheus + Grafana)

**Pro Tips Final:**
- 💡 Clean architecture = mudah test & scale
- 💡 Background jobs = better UX (don't block requests)
- 💡 Email verification = reduce spam users
- 💡 OAuth = easier onboarding
- 💡 Soft delete = data recovery safety net
- 💡 Proper logging = easier debugging di production

Keep building! 🚀💪 Kamu sudah siap untuk **Fase 2** (advanced topics)!

