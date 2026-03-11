# GORM + PostgreSQL — Models, Migrations, Relations, CRUD

## 🎯 Tujuan Belajar

Setelah belajar materi ini, lo bakal:
- Setup PostgreSQL dengan GORM dari nol
- Paham connection pooling & konfigurasi optimal
- Bikin model dengan conventions yang benar
- Handle database relations (BelongsTo, HasMany, ManyToMany)
- Master CRUD operations dengan GORM
- Paham soft delete & hooks
- Implement repository pattern yang clean
- Bisa raw SQL dengan aman

## 💡 Konsep + Analogi

### GORM vs ORM Lain

**Kenapa GORM?**

| ORM | Kelebihan | Kekurangan |
|-----|-----------|------------|
| **GORM** | Fitur lengkap, auto migration, hooks, relations mudah | Performa agak kalah dari raw SQL |
| **sqlx** | Cepat, dekat ke raw SQL | Boilerplate banyak, no auto migration |
| **sqlc** | Type-safe, generate code dari SQL | Harus tulis SQL manual |
| **database/sql** | Standard library, kontrol penuh | Terlalu low-level, banyak boilerplate |

**GORM = Sequelize/TypeORM di Node.js, SQLAlchemy di Python**

### Connection Pooling

**Analogi Restaurant:**
- **Max Open Connections**: Total meja di restaurant (max concurrent customer)
- **Max Idle Connections**: Meja kosong yang tetap ready (idle tapi ga ditutup)
- **Conn Max Lifetime**: Berapa lama meja boleh dipake sebelum "renovasi" (recycle connection)

**Tanpa pooling:** Buka tutup koneksi tiap request → lambat!  
**Dengan pooling:** Reuse koneksi → cepat!

### Soft Delete

**Hard Delete:**
```sql
DELETE FROM users WHERE id = 1; -- Data hilang permanent!
```

**Soft Delete:**
```sql
UPDATE users SET deleted_at = NOW() WHERE id = 1; -- Data masih ada, cuma di-mark deleted
```

**Analogi:** Soft delete = pindahin file ke Recycle Bin, hard delete = shift+delete (ga bisa balik)

### Relations

**Analogi E-commerce:**
- **BelongsTo**: Product belongs to Category (banyak product punya 1 category)
- **HasMany**: User has many Orders (1 user punya banyak order)
- **HasOne**: User has one Profile (1 user punya 1 profile)
- **ManyToMany**: Post has many Tags, Tag has many Posts (banyak-ke-banyak)

## 📝 Materi + Kode Lengkap

### 1. Install Dependencies

```bash
# Install GORM + PostgreSQL driver
go get -u gorm.io/gorm
go get -u gorm.io/driver/postgres

# UUID support
go get -u github.com/google/uuid

# Config
go get -u github.com/spf13/viper
go get -u github.com/joho/godotenv
```

### 2. Setup Database Connection

```bash
# .env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=gorm_example
DB_SSL_MODE=disable

# Connection pool
DB_MAX_OPEN_CONNS=100
DB_MAX_IDLE_CONNS=10
DB_CONN_MAX_LIFETIME=1h
```

```go
// config/database.go
package config

import (
	"fmt"
	"log"
	"time"

	"github.com/spf13/viper"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type DatabaseConfig struct {
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	LogLevel        logger.LogLevel
}

// LoadDatabaseConfig - load config dari viper
func LoadDatabaseConfig() *DatabaseConfig {
	return &DatabaseConfig{
		Host:            viper.GetString("DB_HOST"),
		Port:            viper.GetString("DB_PORT"),
		User:            viper.GetString("DB_USER"),
		Password:        viper.GetString("DB_PASSWORD"),
		DBName:          viper.GetString("DB_NAME"),
		SSLMode:         viper.GetString("DB_SSL_MODE"),
		MaxOpenConns:    viper.GetInt("DB_MAX_OPEN_CONNS"),
		MaxIdleConns:    viper.GetInt("DB_MAX_IDLE_CONNS"),
		ConnMaxLifetime: viper.GetDuration("DB_CONN_MAX_LIFETIME"),
		LogLevel:        logger.Info,
	}
}

// GetDSN - build connection string
func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Host, c.Port, c.User, c.Password, c.DBName, c.SSLMode,
	)
}

// ConnectDB - create database connection
func ConnectDB(config *DatabaseConfig) (*gorm.DB, error) {
	// GORM config
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(config.LogLevel),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
		// Disable pluralization (users -> user)
		// NamingStrategy: schema.NamingStrategy{
		// 	SingularTable: true,
		// },
	}

	// Connect
	db, err := gorm.Open(postgres.Open(config.GetDSN()), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	// Get underlying sql.DB
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Connection pooling (PENTING!)
	// Recommended production values:
	// MaxOpenConns: 100 (max concurrent connections)
	// MaxIdleConns: 10 (idle connections to keep)
	// ConnMaxLifetime: 1h (recycle connection after 1 hour)
	
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
	
	log.Println("Closing database connection...")
	return sqlDB.Close()
}
```

### 3. BaseModel dengan UUID

```go
// models/base.go
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseModel - base model dengan UUID primary key
type BaseModel struct {
	ID        uuid.UUID      `json:"id" gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"` // Soft delete
}

// BeforeCreate - GORM hook, generate UUID before insert
func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// BaseModelWithIntID - alternative dengan integer ID
type BaseModelWithIntID struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`
}
```

### 4. GORM Model Conventions & Tags

```go
// models/user.go
package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// User model
type User struct {
	BaseModel // Embed base model

	// Basic fields
	Name     string `json:"name" gorm:"type:varchar(100);not null"`
	Email    string `json:"email" gorm:"type:varchar(100);uniqueIndex;not null"`
	Password string `json:"-" gorm:"type:varchar(255);not null"` // - = exclude from JSON
	Age      int    `json:"age" gorm:"type:int;default:0"`
	IsActive bool   `json:"is_active" gorm:"default:true"`

	// Custom column name
	PhoneNumber string `json:"phone_number" gorm:"column:phone;type:varchar(20)"`

	// Index
	Username string `json:"username" gorm:"type:varchar(50);uniqueIndex:idx_username"`

	// Relations
	ProfileID uuid.UUID  `json:"profile_id" gorm:"type:uuid"`
	Profile   *Profile   `json:"profile,omitempty" gorm:"foreignKey:ProfileID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"`
	Posts     []Post     `json:"posts,omitempty" gorm:"foreignKey:UserID"`
	Roles     []Role     `json:"roles,omitempty" gorm:"many2many:user_roles"`
}

// TableName - custom table name
func (User) TableName() string {
	return "users"
}

// BeforeCreate hook - run before insert
func (u *User) BeforeCreate(tx *gorm.DB) error {
	// Generate UUID (handled by BaseModel)
	// Custom logic here
	if u.Username == "" {
		u.Username = u.Email // Default username = email
	}
	return nil
}

// AfterCreate hook - run after insert
func (u *User) AfterCreate(tx *gorm.DB) error {
	// Log, send notification, etc
	return nil
}

// BeforeSave hook - run before create/update
func (u *User) BeforeSave(tx *gorm.DB) error {
	// Validation, transformation, etc
	return nil
}

// AfterFind hook - run after query
func (u *User) AfterFind(tx *gorm.DB) error {
	// Decrypt, format, etc
	return nil
}

// Profile model (HasOne relation with User)
type Profile struct {
	BaseModel

	Bio       string    `json:"bio" gorm:"type:text"`
	Avatar    string    `json:"avatar" gorm:"type:varchar(255)"`
	BirthDate time.Time `json:"birth_date"`

	// No need UserID here karena User yang punya ProfileID
}

func (Profile) TableName() string {
	return "profiles"
}
```

### 5. Relations: BelongsTo, HasMany, HasOne, ManyToMany

```go
// models/post.go
package models

import (
	"github.com/google/uuid"
)

// Post model (BelongsTo User, HasMany Comments, ManyToMany Tags)
type Post struct {
	BaseModel

	Title   string `json:"title" gorm:"type:varchar(200);not null"`
	Content string `json:"content" gorm:"type:text;not null"`
	Slug    string `json:"slug" gorm:"type:varchar(200);uniqueIndex"`
	Status  string `json:"status" gorm:"type:varchar(20);default:'draft'"` // draft, published

	// BelongsTo User (Foreign Key)
	UserID uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	User   *User     `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	// HasMany Comments
	Comments []Comment `json:"comments,omitempty" gorm:"foreignKey:PostID"`

	// ManyToMany Tags (join table: post_tags)
	Tags []Tag `json:"tags,omitempty" gorm:"many2many:post_tags"`
}

func (Post) TableName() string {
	return "posts"
}

// Comment model (BelongsTo Post, BelongsTo User)
type Comment struct {
	BaseModel

	Content string `json:"content" gorm:"type:text;not null"`

	// BelongsTo Post
	PostID uuid.UUID `json:"post_id" gorm:"type:uuid;not null;index"`
	Post   *Post     `json:"post,omitempty" gorm:"foreignKey:PostID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	// BelongsTo User
	UserID uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	User   *User     `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (Comment) TableName() string {
	return "comments"
}

// Tag model (ManyToMany with Post)
type Tag struct {
	BaseModel

	Name  string `json:"name" gorm:"type:varchar(50);uniqueIndex;not null"`
	Slug  string `json:"slug" gorm:"type:varchar(50);uniqueIndex;not null"`
	Posts []Post `json:"posts,omitempty" gorm:"many2many:post_tags"`
}

func (Tag) TableName() string {
	return "tags"
}

// Role model (ManyToMany with User)
type Role struct {
	BaseModel

	Name        string `json:"name" gorm:"type:varchar(50);uniqueIndex;not null"`
	Description string `json:"description" gorm:"type:text"`
	Users       []User `json:"users,omitempty" gorm:"many2many:user_roles"`
}

func (Role) TableName() string {
	return "roles"
}

// Category model (HasMany Posts via polymorphic)
type Category struct {
	BaseModel

	Name        string `json:"name" gorm:"type:varchar(100);not null"`
	Slug        string `json:"slug" gorm:"type:varchar(100);uniqueIndex;not null"`
	Description string `json:"description" gorm:"type:text"`
	ParentID    *uuid.UUID `json:"parent_id" gorm:"type:uuid"`
	Parent      *Category  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children    []Category `json:"children,omitempty" gorm:"foreignKey:ParentID"`
}

func (Category) TableName() string {
	return "categories"
}
```

### 6. Auto Migration

```go
// database/migrate.go
package database

import (
	"log"

	"gorm.io/gorm"
	"github.com/yourusername/gorm-example/models"
)

// AutoMigrate - run auto migration
func AutoMigrate(db *gorm.DB) error {
	log.Println("Running auto migration...")

	// Migrate tables in order (parent tables first)
	err := db.AutoMigrate(
		&models.Profile{},
		&models.User{},
		&models.Role{},
		&models.Category{},
		&models.Post{},
		&models.Comment{},
		&models.Tag{},
	)

	if err != nil {
		return err
	}

	log.Println("✓ Migration completed successfully")
	return nil
}

// DropTables - drop all tables (HATI-HATI!)
func DropTables(db *gorm.DB) error {
	log.Println("Dropping all tables...")

	// Drop in reverse order
	err := db.Migrator().DropTable(
		&models.Tag{},
		&models.Comment{},
		&models.Post{},
		&models.Category{},
		&models.Role{},
		&models.User{},
		&models.Profile{},
		"post_tags",   // join table
		"user_roles",  // join table
	)

	if err != nil {
		return err
	}

	log.Println("✓ All tables dropped")
	return nil
}
```

**Kapan pakai AutoMigrate:**
- ✅ Development (prototyping cepat)
- ✅ Small project
- ❌ Production (pakai migration tool seperti golang-migrate)
- ❌ Complex schema changes

### 7. CRUD Operations Lengkap

```go
// repository/user_repository.go
package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/yourusername/gorm-example/models"
)

// UserRepository interface
type UserRepository interface {
	// Create
	Create(ctx context.Context, user *models.User) error
	CreateInBatch(ctx context.Context, users []models.User) error

	// Read
	FindByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindAll(ctx context.Context, limit, offset int) ([]models.User, error)
	FindWithPosts(ctx context.Context, id uuid.UUID) (*models.User, error)

	// Update
	Update(ctx context.Context, user *models.User) error
	UpdateField(ctx context.Context, id uuid.UUID, field string, value interface{}) error
	UpdateFields(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error

	// Delete
	Delete(ctx context.Context, id uuid.UUID) error // soft delete
	HardDelete(ctx context.Context, id uuid.UUID) error
	Restore(ctx context.Context, id uuid.UUID) error

	// Query
	Search(ctx context.Context, keyword string) ([]models.User, error)
	Count(ctx context.Context) (int64, error)
	CountActive(ctx context.Context) (int64, error)
}

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository - constructor
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

// ===== CREATE =====

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepository) CreateInBatch(ctx context.Context, users []models.User) error {
	// Insert 100 records per batch
	return r.db.WithContext(ctx).CreateInBatches(users, 100).Error
}

// ===== READ =====

func (r *userRepository) FindByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) FindAll(ctx context.Context, limit, offset int) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&users).Error

	return users, err
}

// FindWithPosts - with Preload (eager loading)
func (r *userRepository) FindWithPosts(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).
		Preload("Posts").                // Load posts
		Preload("Posts.Comments").       // Load comments of posts
		Preload("Posts.Tags").           // Load tags of posts
		Preload("Profile").              // Load profile
		Preload("Roles").                // Load roles
		First(&user, "id = ?", id).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// ===== UPDATE =====

func (r *userRepository) Update(ctx context.Context, user *models.User) error {
	// Save: update all fields (even zero values)
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *userRepository) UpdateField(ctx context.Context, id uuid.UUID, field string, value interface{}) error {
	// Update single field
	return r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", id).
		Update(field, value).Error
}

func (r *userRepository) UpdateFields(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	// Updates: update multiple fields (skip zero values)
	return r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", id).
		Updates(updates).Error
}

// ===== DELETE =====

func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	// Soft delete (set deleted_at)
	return r.db.WithContext(ctx).Delete(&models.User{}, "id = ?", id).Error
}

func (r *userRepository) HardDelete(ctx context.Context, id uuid.UUID) error {
	// Hard delete (permanent)
	return r.db.WithContext(ctx).Unscoped().Delete(&models.User{}, "id = ?", id).Error
}

func (r *userRepository) Restore(ctx context.Context, id uuid.UUID) error {
	// Restore soft deleted record
	return r.db.WithContext(ctx).
		Model(&models.User{}).
		Unscoped().
		Where("id = ?", id).
		Update("deleted_at", nil).Error
}

// ===== QUERY =====

func (r *userRepository) Search(ctx context.Context, keyword string) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).
		Where("name ILIKE ? OR email ILIKE ?", "%"+keyword+"%", "%"+keyword+"%").
		Find(&users).Error

	return users, err
}

func (r *userRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.User{}).Count(&count).Error
	return count, err
}

func (r *userRepository) CountActive(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("is_active = ?", true).
		Count(&count).Error
	return count, err
}
```

### 8. Complex Queries

```go
// repository/post_repository.go
package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/yourusername/gorm-example/models"
)

type PostRepository interface {
	FindPublished(ctx context.Context, limit, offset int) ([]models.Post, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]models.Post, error)
	FindByTag(ctx context.Context, tagName string) ([]models.Post, error)
	FindWithFilters(ctx context.Context, filters PostFilters) ([]models.Post, error)
	SearchByTitle(ctx context.Context, keyword string) ([]models.Post, error)
}

type PostFilters struct {
	Status    string
	UserID    *uuid.UUID
	Tags      []string
	StartDate *time.Time
	EndDate   *time.Time
	Limit     int
	Offset    int
}

type postRepository struct {
	db *gorm.DB
}

func NewPostRepository(db *gorm.DB) PostRepository {
	return &postRepository{db: db}
}

// FindPublished - query dengan where condition
func (r *postRepository) FindPublished(ctx context.Context, limit, offset int) ([]models.Post, error) {
	var posts []models.Post
	err := r.db.WithContext(ctx).
		Where("status = ?", "published").
		Preload("User").
		Preload("Tags").
		Preload("Comments").
		Limit(limit).
		Offset(offset).
		Order("created_at DESC").
		Find(&posts).Error

	return posts, err
}

// FindByUserID - simple where
func (r *postRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]models.Post, error) {
	var posts []models.Post
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Preload("Tags").
		Order("created_at DESC").
		Find(&posts).Error

	return posts, err
}

// FindByTag - query with many-to-many relation
func (r *postRepository) FindByTag(ctx context.Context, tagName string) ([]models.Post, error) {
	var posts []models.Post
	err := r.db.WithContext(ctx).
		Joins("JOIN post_tags ON post_tags.post_id = posts.id").
		Joins("JOIN tags ON tags.id = post_tags.tag_id").
		Where("tags.name = ?", tagName).
		Preload("User").
		Preload("Tags").
		Find(&posts).Error

	return posts, err
}

// FindWithFilters - dynamic query builder
func (r *postRepository) FindWithFilters(ctx context.Context, filters PostFilters) ([]models.Post, error) {
	var posts []models.Post

	query := r.db.WithContext(ctx).Model(&models.Post{})

	// Status filter
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}

	// User filter
	if filters.UserID != nil {
		query = query.Where("user_id = ?", *filters.UserID)
	}

	// Date range filter
	if filters.StartDate != nil {
		query = query.Where("created_at >= ?", *filters.StartDate)
	}
	if filters.EndDate != nil {
		query = query.Where("created_at <= ?", *filters.EndDate)
	}

	// Tags filter (multiple tags with OR)
	if len(filters.Tags) > 0 {
		query = query.
			Joins("JOIN post_tags ON post_tags.post_id = posts.id").
			Joins("JOIN tags ON tags.id = post_tags.tag_id").
			Where("tags.name IN ?", filters.Tags)
	}

	// Pagination
	if filters.Limit > 0 {
		query = query.Limit(filters.Limit)
	}
	if filters.Offset > 0 {
		query = query.Offset(filters.Offset)
	}

	// Execute
	err := query.
		Preload("User").
		Preload("Tags").
		Order("created_at DESC").
		Find(&posts).Error

	return posts, err
}

// SearchByTitle - ILIKE search (case-insensitive)
func (r *postRepository) SearchByTitle(ctx context.Context, keyword string) ([]models.Post, error) {
	var posts []models.Post
	err := r.db.WithContext(ctx).
		Where("title ILIKE ?", "%"+keyword+"%").
		Or("content ILIKE ?", "%"+keyword+"%").
		Preload("User").
		Find(&posts).Error

	return posts, err
}
```

### 9. Preload vs Joins

```go
// examples/preload_vs_joins.go
package examples

import (
	"context"

	"gorm.io/gorm"
	"github.com/yourusername/gorm-example/models"
)

// ===== PRELOAD (Eager Loading) =====
// Multiple queries (1 + N problem solved)
// Query 1: SELECT * FROM users WHERE id = ?
// Query 2: SELECT * FROM posts WHERE user_id IN (...)

func GetUserWithPreload(db *gorm.DB, userID string) (*models.User, error) {
	var user models.User
	err := db.
		Preload("Posts").           // SELECT * FROM posts WHERE user_id = ?
		Preload("Posts.Comments").  // SELECT * FROM comments WHERE post_id IN (...)
		Preload("Profile").         // SELECT * FROM profiles WHERE id = ?
		First(&user, "id = ?", userID).Error

	return &user, err
}

// ===== JOINS (Single Query) =====
// Single query dengan JOIN
// SELECT users.*, posts.* FROM users LEFT JOIN posts ON posts.user_id = users.id

func GetUserWithJoins(db *gorm.DB, userID string) (*models.User, error) {
	var user models.User
	err := db.
		Joins("Profile").          // LEFT JOIN profiles ON profiles.id = users.profile_id
		Joins("LEFT JOIN posts ON posts.user_id = users.id").
		Where("users.id = ?", userID).
		First(&user).Error

	return &user, err
}

// ===== KAPAN PAKAI MANA? =====

// PRELOAD:
// ✅ HasMany relation (1 user has many posts)
// ✅ Multiple relations
// ✅ Butuh semua data relation
// ❌ Kalau relation-nya banyak (bisa banyak query)

// JOINS:
// ✅ BelongsTo relation (post belongs to user)
// ✅ Filter based on relation
// ✅ Single query lebih efisien
// ❌ Complex untuk multiple nested relations

// ===== PRELOAD WITH CONDITIONS =====

func GetUserWithPublishedPosts(db *gorm.DB, userID string) (*models.User, error) {
	var user models.User
	err := db.
		Preload("Posts", "status = ?", "published"). // Filter posts
		Preload("Posts.Tags").
		First(&user, "id = ?", userID).Error

	return &user, err
}

// ===== JOINS WITH WHERE =====

func FindUsersWithPublishedPosts(db *gorm.DB) ([]models.User, error) {
	var users []models.User
	err := db.
		Joins("JOIN posts ON posts.user_id = users.id").
		Where("posts.status = ?", "published").
		Group("users.id"). // Avoid duplicate users
		Find(&users).Error

	return users, err
}
```

### 10. Raw SQL (Safe dengan Parameter Binding)

```go
// repository/raw_query.go
package repository

import (
	"context"

	"gorm.io/gorm"
	"github.com/yourusername/gorm-example/models"
)

type RawQueryRepository interface {
	ExecuteRaw(ctx context.Context, sql string, params ...interface{}) error
	QueryRaw(ctx context.Context, sql string, params ...interface{}) ([]map[string]interface{}, error)
	GetUserStats(ctx context.Context) ([]UserStats, error)
}

type UserStats struct {
	UserID     string `json:"user_id"`
	UserName   string `json:"user_name"`
	PostCount  int    `json:"post_count"`
	TotalViews int    `json:"total_views"`
}

type rawQueryRepository struct {
	db *gorm.DB
}

func NewRawQueryRepository(db *gorm.DB) RawQueryRepository {
	return &rawQueryRepository{db: db}
}

// ExecuteRaw - execute raw SQL (UPDATE, DELETE, etc)
func (r *rawQueryRepository) ExecuteRaw(ctx context.Context, sql string, params ...interface{}) error {
	return r.db.WithContext(ctx).Exec(sql, params...).Error
}

// QueryRaw - query raw SQL (SELECT)
func (r *rawQueryRepository) QueryRaw(ctx context.Context, sql string, params ...interface{}) ([]map[string]interface{}, error) {
	var results []map[string]interface{}
	err := r.db.WithContext(ctx).Raw(sql, params...).Scan(&results).Error
	return results, err
}

// GetUserStats - complex aggregation query
func (r *rawQueryRepository) GetUserStats(ctx context.Context) ([]UserStats, error) {
	var stats []UserStats

	sql := `
		SELECT 
			u.id as user_id,
			u.name as user_name,
			COUNT(p.id) as post_count,
			COALESCE(SUM(p.views), 0) as total_views
		FROM users u
		LEFT JOIN posts p ON p.user_id = u.id
		WHERE u.deleted_at IS NULL
		GROUP BY u.id, u.name
		ORDER BY post_count DESC
		LIMIT ?
	`

	err := r.db.WithContext(ctx).Raw(sql, 10).Scan(&stats).Error
	return stats, err
}

// ===== SAFE vs UNSAFE SQL =====

// ❌ UNSAFE: SQL Injection vulnerable
func UnsafeQuery(db *gorm.DB, email string) {
	sql := "SELECT * FROM users WHERE email = '" + email + "'" // DANGEROUS!
	db.Raw(sql).Scan(&models.User{})
}

// ✅ SAFE: Parameter binding
func SafeQuery(db *gorm.DB, email string) {
	sql := "SELECT * FROM users WHERE email = ?"
	db.Raw(sql, email).Scan(&models.User{}) // Escaped automatically
}
```

### 11. Transactions

```go
// repository/transaction.go
package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/yourusername/gorm-example/models"
)

type TransactionRepository interface {
	CreateUserWithProfile(ctx context.Context, user *models.User, profile *models.Profile) error
	TransferPost(ctx context.Context, postID, fromUserID, toUserID uuid.UUID) error
}

type transactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(db *gorm.DB) TransactionRepository {
	return &transactionRepository{db: db}
}

// CreateUserWithProfile - transaction example
func (r *transactionRepository) CreateUserWithProfile(ctx context.Context, user *models.User, profile *models.Profile) error {
	// Begin transaction
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Create profile first
		if err := tx.Create(profile).Error; err != nil {
			return err // Automatic rollback
		}

		// Set profile ID to user
		user.ProfileID = profile.ID

		// Create user
		if err := tx.Create(user).Error; err != nil {
			return err // Automatic rollback
		}

		// Commit (automatic if no error)
		return nil
	})
}

// TransferPost - complex transaction
func (r *transactionRepository) TransferPost(ctx context.Context, postID, fromUserID, toUserID uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Find post
		var post models.Post
		if err := tx.First(&post, "id = ?", postID).Error; err != nil {
			return err
		}

		// Verify ownership
		if post.UserID != fromUserID {
			return errors.New("user is not the owner")
		}

		// Verify target user exists
		var toUser models.User
		if err := tx.First(&toUser, "id = ?", toUserID).Error; err != nil {
			return errors.New("target user not found")
		}

		// Transfer ownership
		post.UserID = toUserID
		if err := tx.Save(&post).Error; err != nil {
			return err
		}

		// Log transfer (example)
		// ...

		return nil
	})
}

// Manual transaction control (advanced)
func ManualTransaction(db *gorm.DB) error {
	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Error; err != nil {
		return err
	}

	// Do stuff
	if err := tx.Create(&models.User{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// More stuff
	if err := tx.Create(&models.Post{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Commit
	return tx.Commit().Error
}
```

### 12. Complete Example: Main Application

```go
// main.go
package main

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/spf13/viper"
	"golang.org/x/crypto/bcrypt"

	"github.com/yourusername/gorm-example/config"
	"github.com/yourusername/gorm-example/database"
	"github.com/yourusername/gorm-example/models"
	"github.com/yourusername/gorm-example/repository"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found")
	}

	// Setup viper
	viper.AutomaticEnv()

	// Load database config
	dbConfig := config.LoadDatabaseConfig()

	// Connect database
	db, err := config.ConnectDB(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}
	defer config.CloseDB(db)

	// Auto migrate
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}

	// Create repositories
	userRepo := repository.NewUserRepository(db)
	postRepo := repository.NewPostRepository(db)
	txRepo := repository.NewTransactionRepository(db)

	ctx := context.Background()

	// ===== CREATE EXAMPLES =====

	// Create user
	password, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := &models.User{
		Name:     "Budi Santoso",
		Email:    "budi@example.com",
		Password: string(password),
		Username: "budisan",
		IsActive: true,
	}

	if err := userRepo.Create(ctx, user); err != nil {
		log.Printf("Failed to create user: %v", err)
	} else {
		log.Printf("✓ User created: %s (ID: %s)", user.Name, user.ID)
	}

	// Create user with profile (transaction)
	profile := &models.Profile{
		Bio:       "Software Developer",
		Avatar:    "https://example.com/avatar.jpg",
		BirthDate: time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC),
	}

	user2 := &models.User{
		Name:     "Agus Setiawan",
		Email:    "agus@example.com",
		Password: string(password),
		Username: "agusset",
	}

	if err := txRepo.CreateUserWithProfile(ctx, user2, profile); err != nil {
		log.Printf("Failed to create user with profile: %v", err)
	} else {
		log.Printf("✓ User with profile created: %s", user2.Name)
	}

	// Create posts
	post1 := &models.Post{
		Title:   "Getting Started with GORM",
		Content: "GORM is an awesome ORM library for Go...",
		Slug:    "getting-started-with-gorm",
		Status:  "published",
		UserID:  user.ID,
	}

	post2 := &models.Post{
		Title:   "Advanced GORM Techniques",
		Content: "Learn advanced techniques in GORM...",
		Slug:    "advanced-gorm-techniques",
		Status:  "draft",
		UserID:  user.ID,
	}

	if err := db.Create([]*models.Post{post1, post2}).Error; err != nil {
		log.Printf("Failed to create posts: %v", err)
	} else {
		log.Printf("✓ Posts created")
	}

	// Create tags
	tag1 := &models.Tag{Name: "Go", Slug: "go"}
	tag2 := &models.Tag{Name: "GORM", Slug: "gorm"}
	tag3 := &models.Tag{Name: "Database", Slug: "database"}

	if err := db.Create([]*models.Tag{tag1, tag2, tag3}).Error; err != nil {
		log.Printf("Failed to create tags: %v", err)
	}

	// Associate tags with post
	if err := db.Model(post1).Association("Tags").Append([]*models.Tag{tag1, tag2, tag3}); err != nil {
		log.Printf("Failed to associate tags: %v", err)
	} else {
		log.Printf("✓ Tags associated with post")
	}

	// ===== READ EXAMPLES =====

	// Find user by ID
	foundUser, err := userRepo.FindByID(ctx, user.ID)
	if err != nil {
		log.Printf("User not found: %v", err)
	} else {
		log.Printf("✓ Found user: %s (%s)", foundUser.Name, foundUser.Email)
	}

	// Find user with relations (Preload)
	userWithPosts, err := userRepo.FindWithPosts(ctx, user.ID)
	if err != nil {
		log.Printf("Failed to load user with posts: %v", err)
	} else {
		log.Printf("✓ User with %d posts loaded", len(userWithPosts.Posts))
		for _, post := range userWithPosts.Posts {
			log.Printf("  - %s (%d tags)", post.Title, len(post.Tags))
		}
	}

	// Find published posts
	publishedPosts, err := postRepo.FindPublished(ctx, 10, 0)
	if err != nil {
		log.Printf("Failed to find published posts: %v", err)
	} else {
		log.Printf("✓ Found %d published posts", len(publishedPosts))
	}

	// Search users
	searchResults, err := userRepo.Search(ctx, "budi")
	if err != nil {
		log.Printf("Search failed: %v", err)
	} else {
		log.Printf("✓ Search found %d users", len(searchResults))
	}

	// ===== UPDATE EXAMPLES =====

	// Update single field
	if err := userRepo.UpdateField(ctx, user.ID, "age", 30); err != nil {
		log.Printf("Failed to update age: %v", err)
	} else {
		log.Printf("✓ User age updated")
	}

	// Update multiple fields
	updates := map[string]interface{}{
		"name":     "Budi Santoso Updated",
		"is_active": true,
	}
	if err := userRepo.UpdateFields(ctx, user.ID, updates); err != nil {
		log.Printf("Failed to update fields: %v", err)
	} else {
		log.Printf("✓ User fields updated")
	}

	// ===== DELETE EXAMPLES =====

	// Soft delete
	if err := userRepo.Delete(ctx, user2.ID); err != nil {
		log.Printf("Failed to delete user: %v", err)
	} else {
		log.Printf("✓ User soft deleted")
	}

	// Verify soft delete (user.ID won't be found in normal query)
	_, err = userRepo.FindByID(ctx, user2.ID)
	if err != nil {
		log.Printf("✓ Soft deleted user not found in normal query")
	}

	// Restore
	if err := userRepo.Restore(ctx, user2.ID); err != nil {
		log.Printf("Failed to restore user: %v", err)
	} else {
		log.Printf("✓ User restored")
	}

	// Count users
	totalUsers, _ := userRepo.Count(ctx)
	activeUsers, _ := userRepo.CountActive(ctx)
	log.Printf("✓ Total users: %d, Active: %d", totalUsers, activeUsers)

	log.Println("\n🎉 All examples executed successfully!")
}
```

### 13. Testing Repository

```go
// repository/user_repository_test.go
package repository_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"github.com/yourusername/gorm-example/models"
	"github.com/yourusername/gorm-example/repository"
)

type UserRepositoryTestSuite struct {
	suite.Suite
	db   *gorm.DB
	repo repository.UserRepository
}

// SetupSuite - run once before all tests
func (suite *UserRepositoryTestSuite) SetupSuite() {
	// Use in-memory SQLite for testing
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(suite.T(), err)

	// Auto migrate
	err = db.AutoMigrate(&models.User{}, &models.Profile{})
	assert.NoError(suite.T(), err)

	suite.db = db
	suite.repo = repository.NewUserRepository(db)
}

// TearDownSuite - run once after all tests
func (suite *UserRepositoryTestSuite) TearDownSuite() {
	sqlDB, _ := suite.db.DB()
	sqlDB.Close()
}

// TearDownTest - run after each test (cleanup)
func (suite *UserRepositoryTestSuite) TearDownTest() {
	suite.db.Exec("DELETE FROM users")
}

// Test Create
func (suite *UserRepositoryTestSuite) TestCreate() {
	ctx := context.Background()

	user := &models.User{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password",
	}

	err := suite.repo.Create(ctx, user)
	assert.NoError(suite.T(), err)
	assert.NotEmpty(suite.T(), user.ID)
}

// Test FindByID
func (suite *UserRepositoryTestSuite) TestFindByID() {
	ctx := context.Background()

	// Create user first
	user := &models.User{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password",
	}
	suite.repo.Create(ctx, user)

	// Find
	found, err := suite.repo.FindByID(ctx, user.ID)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), user.Email, found.Email)
}

// Test FindByEmail
func (suite *UserRepositoryTestSuite) TestFindByEmail() {
	ctx := context.Background()

	user := &models.User{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password",
	}
	suite.repo.Create(ctx, user)

	found, err := suite.repo.FindByEmail(ctx, "test@example.com")
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), user.ID, found.ID)
}

// Test Delete (Soft Delete)
func (suite *UserRepositoryTestSuite) TestDelete() {
	ctx := context.Background()

	user := &models.User{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: "password",
	}
	suite.repo.Create(ctx, user)

	// Delete
	err := suite.repo.Delete(ctx, user.ID)
	assert.NoError(suite.T(), err)

	// Should not be found
	_, err = suite.repo.FindByID(ctx, user.ID)
	assert.Error(suite.T(), err)
}

// Run test suite
func TestUserRepository(t *testing.T) {
	suite.Run(t, new(UserRepositoryTestSuite))
}
```

## ❌ Common Mistakes + Fix

### Mistake 1: Lupa Preload Relations

```go
// ❌ BAD: Posts will be empty
var user models.User
db.First(&user, id)
// user.Posts is empty!

// ✅ GOOD: Preload relations
var user models.User
db.Preload("Posts").First(&user, id)
// user.Posts loaded!
```

### Mistake 2: N+1 Query Problem

```go
// ❌ BAD: N+1 queries (1 + 100 queries!)
var posts []models.Post
db.Find(&posts) // 1 query
for _, post := range posts {
    db.Model(&post).Association("User").Find(&post.User) // N queries!
}

// ✅ GOOD: Single query with Preload
var posts []models.Post
db.Preload("User").Find(&posts) // 2 queries total
```

### Mistake 3: Update Zero Values

```go
// ❌ BAD: Updates skip zero values
user.Age = 0
db.Model(&user).Updates(user) // Age NOT updated!

// ✅ GOOD: Use map or Select
db.Model(&user).Select("Age").Updates(user)
// OR
db.Model(&user).Updates(map[string]interface{}{"age": 0})
```

### Mistake 4: SQL Injection

```go
// ❌ DANGEROUS: SQL Injection!
email := "user@example.com' OR '1'='1"
db.Where("email = '" + email + "'").Find(&users)

// ✅ SAFE: Parameter binding
db.Where("email = ?", email).Find(&users)
```

### Mistake 5: Lupa Context

```go
// ❌ BAD: No context (can't cancel)
db.Find(&users)

// ✅ GOOD: WithContext
db.WithContext(ctx).Find(&users)
```

### Mistake 6: Hard Delete Kalau Ada Soft Delete

```go
// ❌ BAD: Intend to hard delete but still soft delete
db.Delete(&user) // This is soft delete if User has DeletedAt!

// ✅ GOOD: Use Unscoped for hard delete
db.Unscoped().Delete(&user)
```

### Mistake 7: Transaction Tanpa Defer

```go
// ❌ BAD: Panic could leave transaction open
tx := db.Begin()
// ... some code that might panic
tx.Commit()

// ✅ GOOD: Defer rollback
tx := db.Begin()
defer func() {
    if r := recover(); r != nil {
        tx.Rollback()
    }
}()
// ... code
tx.Commit()

// ✅ BETTER: Use db.Transaction()
db.Transaction(func(tx *gorm.DB) error {
    // Auto rollback on error, auto commit on success
    return nil
})
```

## ✅ Checklist Akhir

**Setup & Connection:**
- [ ] Install GORM + PostgreSQL driver
- [ ] Setup connection pooling dengan nilai optimal
- [ ] Load config dari environment variable
- [ ] Test connection dengan Ping()

**Models & Migrations:**
- [ ] Bikin BaseModel dengan UUID
- [ ] Paham GORM field tags (column, index, unique, etc)
- [ ] Setup model dengan relations
- [ ] Run auto migration dengan benar

**Relations:**
- [ ] Implement BelongsTo relation
- [ ] Implement HasMany relation
- [ ] Implement HasOne relation
- [ ] Implement ManyToMany relation
- [ ] Paham kapan pakai Preload vs Joins

**CRUD Operations:**
- [ ] Create single & batch insert
- [ ] Read dengan Where, Find, First
- [ ] Update dengan Save, Updates, Update
- [ ] Delete (soft delete) vs hard delete
- [ ] Restore soft deleted records

**Advanced:**
- [ ] Implement GORM hooks (BeforeCreate, AfterFind, etc)
- [ ] Use transactions untuk atomic operations
- [ ] Query dengan dynamic filters
- [ ] Raw SQL dengan parameter binding
- [ ] Repository pattern dengan interface

**Testing:**
- [ ] Setup test database (SQLite in-memory)
- [ ] Write repository unit tests
- [ ] Test CRUD operations
- [ ] Test transactions

## 💭 Ide Pengembangan Mandiri

### Project 1: Blog System
Implement full blog dengan:
- User authentication
- Posts with categories & tags (ManyToMany)
- Comments (nested comments / replies)
- Likes/reactions
- Search functionality

### Project 2: E-commerce Backend
Bikin:
- Products with categories (tree structure)
- Orders & order items (transactions)
- Shopping cart
- Inventory management
- Payment history

### Project 3: Social Media API
Features:
- User profiles dengan follower/following (self-referential)
- Posts with media attachments
- Comments & nested replies
- Likes & reactions
- Timeline/feed generation

### Advanced Topics:

**Database Optimization:**
- Indexing strategy
- Query optimization (EXPLAIN ANALYZE)
- Database sharding
- Read replicas

**Migration Tools:**
- golang-migrate/migrate
- Versioned migrations
- Rollback strategy
- Seed data

**Advanced GORM:**
- Custom data types
- Composite primary keys
- Polymorphic associations
- Database views

**Tools & Libraries:**
- golang-migrate: Database migration
- faker: Generate fake data
- go-sqlmock: Mock database for testing
- pgx: High-performance PostgreSQL driver

---

**Selamat belajar GORM! Tulis ulang semua kode examples sampai hafal pattern-nya. GORM bakal jadi senjata utama lo buat handle database di Go!** 🚀💾
