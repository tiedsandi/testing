# BELAJAR QUERY OPTIMIZATION + DATABASE INDEXING POSTGRESQL DENGAN GORM

## Penjelasan Konsep

**Query Optimization** adalah teknik untuk membuat database query lebih cepat dan efisien. **Indexing** adalah struktur data yang mempercepat pencarian data.

**Analogi TypeScript/Prisma:**
```typescript
// N+1 Problem di Prisma
// ❌ BAD: N+1 queries (1 + N)
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { userId: user.id } });
  // 1 query untuk users + N queries untuk posts = N+1 problem!
}

// ✅ GOOD: Single query dengan include
const users = await prisma.user.findMany({
  include: { posts: true } // JOIN atau separate query
});

// Select specific fields
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true }
});

// Index di Prisma Schema
model User {
  id    Int    @id
  email String @unique         // Unique index
  name  String
  age   Int
  
  @@index([name])              // Single index
  @@index([name, age])         // Composite index
}
```

**Di Go GORM:**
```go
// N+1 Problem
users := []User{}
db.Find(&users)                          // 1 query
for _, user := range users {
    db.Where("user_id = ?", user.ID).Find(&user.Orders) // N queries
}

// Fix dengan Preload
db.Preload("Orders").Find(&users)        // 2 queries (optimal)

// Index di GORM
type User struct {
    Email string `gorm:"uniqueIndex"`                    // Unique
    Name  string `gorm:"index"`                          // Single
    Age   int    `gorm:"index:idx_name_age,composite:name"` // Composite
}
```

**Konsep penting:**
1. **N+1 Problem**: Query di loop → performance nightmare
2. **Preload**: Load relasi dalam separate query
3. **Joins**: Load relasi dalam single JOIN query
4. **Index**: Speed up WHERE, JOIN, ORDER BY
5. **EXPLAIN**: Analyze query execution plan
6. **Seq Scan**: Full table scan (slow)
7. **Index Scan**: Use index (fast)

**Kapan pakai index:**
- ✅ Kolom yang sering di WHERE clause
- ✅ Foreign key untuk JOIN
- ✅ Kolom untuk ORDER BY
- ✅ Kolom untuk UNIQUE constraint
- ❌ Kolom yang jarang di-query
- ❌ Table dengan data sedikit (< 1000 rows)
- ❌ Kolom dengan low cardinality (misal: boolean)

---

## Struktur Project

```
gorm-optimization-go/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── database/
│   │   ├── database.go
│   │   ├── migrations.go
│   │   └── logger.go
│   ├── model/
│   │   ├── user.go
│   │   ├── post.go
│   │   ├── comment.go
│   │   └── category.go
│   ├── repository/
│   │   ├── user_repository.go
│   │   ├── post_repository.go
│   │   └── analytics_repository.go
│   ├── service/
│   │   └── post_service.go
│   └── handler/
│       ├── post_handler.go
│       └── analytics_handler.go
├── scripts/
│   └── explain.sql
├── .env
├── docker-compose.yml
├── Makefile
├── go.mod
└── go.sum
```

---

## 1. Setup Dependencies

```bash
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/gofiber/fiber/v2
go get github.com/spf13/viper
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
      POSTGRES_DB: optimization_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command:
      - "postgres"
      - "-c"
      - "shared_preload_libraries=pg_stat_statements"
      - "-c"
      - "pg_stat_statements.track=all"
      - "-c"
      - "log_statement=all"
      - "-c"
      - "log_duration=on"
      - "-c"
      - "log_min_duration_statement=100"  # Log queries > 100ms

volumes:
  postgres_data:
```

---

## 2. Models dengan Indexing

**internal/model/user.go:**
```go
package model

import (
    "time"
    "gorm.io/gorm"
)

type User struct {
    ID        uint           `gorm:"primarykey" json:"id"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // Index untuk soft delete
    
    // Basic fields dengan berbagai jenis index
    Email    string `gorm:"type:varchar(100);uniqueIndex:idx_users_email;not null" json:"email"`
    Username string `gorm:"type:varchar(50);uniqueIndex:idx_users_username;not null" json:"username"`
    Name     string `gorm:"type:varchar(100);index:idx_users_name" json:"name"` // Single index
    Age      int    `gorm:"index:idx_users_age" json:"age"`                     // Single index
    Country  string `gorm:"type:varchar(50);index:idx_users_country_city,priority:1" json:"country"` // Composite index part 1
    City     string `gorm:"type:varchar(50);index:idx_users_country_city,priority:2" json:"city"`    // Composite index part 2
    Status   string `gorm:"type:varchar(20);default:'active';index:idx_users_status" json:"status"`
    
    // Relations
    Posts    []Post    `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"posts,omitempty"`
    Comments []Comment `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"comments,omitempty"`
}

func (User) TableName() string {
    return "users"
}
```

**internal/model/post.go:**
```go
package model

import (
    "time"
    "gorm.io/gorm"
)

type Post struct {
    ID        uint           `gorm:"primarykey" json:"id"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
    
    // Foreign key dengan index otomatis
    UserID     uint   `gorm:"not null;index:idx_posts_user_id" json:"user_id"`
    CategoryID uint   `gorm:"not null;index:idx_posts_category_id" json:"category_id"`
    
    // Fields
    Title      string `gorm:"type:varchar(200);not null;index:idx_posts_title" json:"title"`
    Slug       string `gorm:"type:varchar(200);uniqueIndex:idx_posts_slug" json:"slug"`
    Body       string `gorm:"type:text;not null" json:"body"`
    Status     string `gorm:"type:varchar(20);default:'draft';index:idx_posts_status" json:"status"`
    ViewCount  int    `gorm:"default:0;index:idx_posts_view_count" json:"view_count"`
    LikeCount  int    `gorm:"default:0" json:"like_count"`
    
    // Composite index: status + created_at (untuk filtering published posts by date)
    // Akan dibuat manual di migration
    
    // Relations
    User     *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
    Category *Category `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
    Comments []Comment `gorm:"foreignKey:PostID;constraint:OnDelete:CASCADE" json:"comments,omitempty"`
}

func (Post) TableName() string {
    return "posts"
}
```

**internal/model/comment.go:**
```go
package model

import (
    "time"
    "gorm.io/gorm"
)

type Comment struct {
    ID        uint           `gorm:"primarykey" json:"id"`
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
    
    PostID uint   `gorm:"not null;index:idx_comments_post_id" json:"post_id"`
    UserID uint   `gorm:"not null;index:idx_comments_user_id" json:"user_id"`
    Body   string `gorm:"type:text;not null" json:"body"`
    
    // Relations
    Post *Post `gorm:"foreignKey:PostID" json:"post,omitempty"`
    User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Comment) TableName() string {
    return "comments"
}
```

**internal/model/category.go:**
```go
package model

import "time"

type Category struct {
    ID        uint      `gorm:"primarykey" json:"id"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    
    Name  string `gorm:"type:varchar(100);uniqueIndex:idx_categories_name;not null" json:"name"`
    Slug  string `gorm:"type:varchar(100);uniqueIndex:idx_categories_slug;not null" json:"slug"`
    Posts []Post `gorm:"foreignKey:CategoryID" json:"posts,omitempty"`
}

func (Category) TableName() string {
    return "categories"
}
```

---

## 3. Database Setup dengan Custom Logger

**internal/database/logger.go:**
```go
package database

import (
    "context"
    "fmt"
    "time"

    "gorm.io/gorm/logger"
)

// CustomLogger wraps GORM logger dengan custom formatting
type CustomLogger struct {
    logger.Interface
    SlowThreshold time.Duration
}

func NewCustomLogger(slowThreshold time.Duration) *CustomLogger {
    return &CustomLogger{
        Interface:     logger.Default.LogMode(logger.Info),
        SlowThreshold: slowThreshold,
    }
}

func (l *CustomLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
    elapsed := time.Since(begin)
    sql, rows := fc()
    
    // Color coding berdasarkan durasi
    color := "\033[32m" // Green (fast)
    if elapsed > l.SlowThreshold {
        color = "\033[31m" // Red (slow)
    } else if elapsed > l.SlowThreshold/2 {
        color = "\033[33m" // Yellow (moderate)
    }
    
    fmt.Printf("%s[%.2fms] [rows:%d]\033[0m %s\n", 
        color, 
        float64(elapsed.Microseconds())/1000.0, 
        rows, 
        sql,
    )
    
    if err != nil {
        fmt.Printf("\033[31m[ERROR]\033[0m %v\n", err)
    }
}
```

**internal/database/database.go:**
```go
package database

import (
    "fmt"
    "log"
    "os"
    "time"

    "gorm-optimization-go/internal/config"

    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

func NewDatabase(cfg *config.Config) (*gorm.DB, error) {
    var gormLogger logger.Interface
    
    if cfg.App.Env == "development" {
        // Development: Log semua query dengan warna
        gormLogger = NewCustomLogger(100 * time.Millisecond) // Slow query > 100ms
    } else {
        // Production: Log error only
        gormLogger = logger.New(
            log.New(os.Stdout, "\r\n", log.LstdFlags),
            logger.Config{
                SlowThreshold:             200 * time.Millisecond,
                LogLevel:                  logger.Warn,
                IgnoreRecordNotFoundError: true,
                Colorful:                  false,
            },
        )
    }

    db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{
        Logger:                 gormLogger,
        PrepareStmt:            true,  // Reuse prepared statements
        SkipDefaultTransaction: false,
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

    log.Println("✅ Database connected successfully")
    return db, nil
}
```

**internal/database/migrations.go:**
```go
package database

import (
    "gorm-optimization-go/internal/model"
    "log"

    "gorm.io/gorm"
)

func Migrate(db *gorm.DB) error {
    if err := db.AutoMigrate(
        &model.User{},
        &model.Category{},
        &model.Post{},
        &model.Comment{},
    ); err != nil {
        return err
    }

    // Manual indexes untuk kasus khusus
    createCustomIndexes(db)

    log.Println("✅ Database migrated successfully")
    return nil
}

func createCustomIndexes(db *gorm.DB) {
    // Composite index untuk posts: status + created_at
    // Berguna untuk query: WHERE status = 'published' ORDER BY created_at DESC
    db.Exec(`
        CREATE INDEX IF NOT EXISTS idx_posts_status_created_at 
        ON posts(status, created_at DESC)
    `)

    // Partial index: hanya index posts yang published
    db.Exec(`
        CREATE INDEX IF NOT EXISTS idx_posts_published_created_at 
        ON posts(created_at DESC) 
        WHERE status = 'published' AND deleted_at IS NULL
    `)

    // Partial unique index untuk slug (exclude soft deleted)
    db.Exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug_not_deleted 
        ON posts(slug) 
        WHERE deleted_at IS NULL
    `)

    // Index untuk full text search (PostgreSQL specific)
    db.Exec(`
        CREATE INDEX IF NOT EXISTS idx_posts_title_body_fulltext 
        ON posts USING gin(to_tsvector('english', title || ' ' || body))
    `)

    // Composite index untuk filtering + sorting
    db.Exec(`
        CREATE INDEX IF NOT EXISTS idx_posts_user_status_created 
        ON posts(user_id, status, created_at DESC)
    `)

    log.Println("✅ Custom indexes created")
}

func SeedData(db *gorm.DB) error {
    // Check if already seeded
    var count int64
    db.Model(&model.User{}).Count(&count)
    if count > 0 {
        return nil
    }

    // Create categories
    categories := []model.Category{
        {Name: "Technology", Slug: "technology"},
        {Name: "Travel", Slug: "travel"},
        {Name: "Food", Slug: "food"},
    }
    db.Create(&categories)

    // Create users
    users := []model.User{
        {Name: "Alice", Email: "alice@example.com", Username: "alice", Age: 25, Country: "Indonesia", City: "Jakarta", Status: "active"},
        {Name: "Bob", Email: "bob@example.com", Username: "bob", Age: 30, Country: "Indonesia", City: "Bandung", Status: "active"},
        {Name: "Charlie", Email: "charlie@example.com", Username: "charlie", Age: 28, Country: "Singapore", City: "Singapore", Status: "active"},
    }
    db.Create(&users)

    // Create posts
    for i := 0; i < 100; i++ {
        post := model.Post{
            UserID:     users[i%3].ID,
            CategoryID: categories[i%3].ID,
            Title:      fmt.Sprintf("Post %d", i+1),
            Slug:       fmt.Sprintf("post-%d", i+1),
            Body:       fmt.Sprintf("This is the body of post %d", i+1),
            Status:     []string{"draft", "published"}[i%2],
            ViewCount:  i * 10,
        }
        db.Create(&post)

        // Create comments for each post
        for j := 0; j < 5; j++ {
            comment := model.Comment{
                PostID: post.ID,
                UserID: users[j%3].ID,
                Body:   fmt.Sprintf("Comment %d on post %d", j+1, i+1),
            }
            db.Create(&comment)
        }
    }

    log.Println("✅ Database seeded successfully")
    return nil
}
```

---

## 4. Repository dengan Query Optimization

**internal/repository/post_repository.go:**
```go
package repository

import (
    "context"
    "fmt"

    "gorm-optimization-go/internal/model"

    "gorm.io/gorm"
)

type PostRepository struct {
    db *gorm.DB
}

func NewPostRepository(db *gorm.DB) *PostRepository {
    return &PostRepository{db: db}
}

// ❌ BAD: N+1 Problem
func (r *PostRepository) FindAllWithN1Problem(ctx context.Context) ([]model.Post, error) {
    var posts []model.Post
    
    // 1 query untuk posts
    if err := r.db.WithContext(ctx).Find(&posts).Error; err != nil {
        return nil, err
    }

    // N queries untuk user (N+1 problem!)
    for i := range posts {
        var user model.User
        r.db.WithContext(ctx).First(&user, posts[i].UserID)
        posts[i].User = &user
    }

    // Total queries: 1 + N (jika 100 posts = 101 queries!)
    return posts, nil
}

// ✅ GOOD: Fix dengan Preload (2 queries)
func (r *PostRepository) FindAllWithPreload(ctx context.Context) ([]model.Post, error) {
    var posts []model.Post
    
    err := r.db.WithContext(ctx).
        Preload("User").        // Separate query: SELECT * FROM users WHERE id IN (...)
        Preload("Category").    // Separate query
        Find(&posts).Error
    
    // Total queries: 3 (1 untuk posts, 1 untuk users, 1 untuk categories)
    return posts, err
}

// ✅ GOOD: Fix dengan Joins (1 query dengan JOIN)
func (r *PostRepository) FindAllWithJoins(ctx context.Context) ([]model.Post, error) {
    var posts []model.Post
    
    err := r.db.WithContext(ctx).
        Joins("User").          // LEFT JOIN users ON posts.user_id = users.id
        Joins("Category").      // LEFT JOIN categories ON posts.category_id = categories.id
        Find(&posts).Error
    
    // Total queries: 1 (single JOIN query)
    return posts, err
}

// Preload dengan conditions
func (r *PostRepository) FindAllWithPublishedPosts(ctx context.Context) ([]model.User, error) {
    var users []model.User
    
    err := r.db.WithContext(ctx).
        Preload("Posts", "status = ?", "published"). // Only published posts
        Find(&users).Error
    
    return users, err
}

// Nested preload
func (r *PostRepository) FindAllWithNestedPreload(ctx context.Context) ([]model.Post, error) {
    var posts []model.Post
    
    err := r.db.WithContext(ctx).
        Preload("User").
        Preload("Comments").             // Load comments
        Preload("Comments.User").        // Load comment authors (nested)
        Find(&posts).Error
    
    return posts, err
}

// Select specific columns only (avoid SELECT *)
func (r *PostRepository) FindAllOptimized(ctx context.Context) ([]model.Post, error) {
    var posts []model.Post
    
    err := r.db.WithContext(ctx).
        Select("id", "title", "slug", "status", "view_count", "created_at"). // Only needed columns
        Where("status = ?", "published").
        Order("created_at DESC").
        Limit(20).
        Find(&posts).Error
    
    return posts, err
}

// Omit kolom tertentu
func (r *PostRepository) FindAllWithoutBody(ctx context.Context) ([]model.Post, error) {
    var posts []model.Post
    
    err := r.db.WithContext(ctx).
        Omit("body"). // Skip body column (large text)
        Find(&posts).Error
    
    return posts, err
}

// Pluck: ambil 1 kolom sebagai slice
func (r *PostRepository) GetAllTitles(ctx context.Context) ([]string, error) {
    var titles []string
    
    err := r.db.WithContext(ctx).
        Model(&model.Post{}).
        Where("status = ?", "published").
        Pluck("title", &titles).Error
    
    return titles, err
}

// FindByID dengan index
func (r *PostRepository) FindByID(ctx context.Context, id uint) (*model.Post, error) {
    var post model.Post
    
    err := r.db.WithContext(ctx).
        Preload("User").
        Preload("Category").
        Preload("Comments.User").
        First(&post, id).Error // Menggunakan primary key index
    
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    return &post, nil
}

// FindBySlug dengan index
func (r *PostRepository) FindBySlug(ctx context.Context, slug string) (*model.Post, error) {
    var post model.Post
    
    err := r.db.WithContext(ctx).
        Where("slug = ?", slug). // Menggunakan unique index pada slug
        Preload("User").
        Preload("Category").
        First(&post).Error
    
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    return &post, nil
}

// Increment view count (F-expression equivalent)
func (r *PostRepository) IncrementViewCount(ctx context.Context, id uint) error {
    // UPDATE posts SET view_count = view_count + 1 WHERE id = ?
    return r.db.WithContext(ctx).
        Model(&model.Post{}).
        Where("id = ?", id).
        UpdateColumn("view_count", gorm.Expr("view_count + ?", 1)).Error
}

// Batch increment
func (r *PostRepository) IncrementViewCountBatch(ctx context.Context, ids []uint) error {
    return r.db.WithContext(ctx).
        Model(&model.Post{}).
        Where("id IN ?", ids).
        UpdateColumn("view_count", gorm.Expr("view_count + ?", 1)).Error
}

// Subquery example
func (r *PostRepository) FindUsersWithManyPosts(ctx context.Context, minPosts int) ([]model.User, error) {
    var users []model.User
    
    // Subquery: SELECT user_id FROM posts GROUP BY user_id HAVING COUNT(*) >= ?
    subQuery := r.db.Model(&model.Post{}).
        Select("user_id").
        Group("user_id").
        Having("COUNT(*) >= ?", minPosts)
    
    err := r.db.WithContext(ctx).
        Where("id IN (?)", subQuery).
        Find(&users).Error
    
    return users, err
}

// Advanced filtering dengan composite index
func (r *PostRepository) FindPublishedByUser(ctx context.Context, userID uint, limit int) ([]model.Post, error) {
    var posts []model.Post
    
    // Menggunakan composite index: idx_posts_user_status_created
    err := r.db.WithContext(ctx).
        Where("user_id = ? AND status = ?", userID, "published").
        Order("created_at DESC").
        Limit(limit).
        Find(&posts).Error
    
    return posts, err
}

// Raw query untuk query kompleks
func (r *PostRepository) GetPostStatsByCategory(ctx context.Context) ([]map[string]interface{}, error) {
    var results []map[string]interface{}
    
    err := r.db.WithContext(ctx).Raw(`
        SELECT 
            c.name as category_name,
            COUNT(p.id) as post_count,
            AVG(p.view_count) as avg_views,
            MAX(p.view_count) as max_views
        FROM posts p
        JOIN categories c ON p.category_id = c.id
        WHERE p.status = 'published' AND p.deleted_at IS NULL
        GROUP BY c.id, c.name
        HAVING COUNT(p.id) > 0
        ORDER BY post_count DESC
    `).Scan(&results).Error
    
    return results, err
}
```

**internal/repository/analytics_repository.go:**
```go
package repository

import (
    "context"

    "gorm-optimization-go/internal/model"

    "gorm.io/gorm"
)

type AnalyticsRepository struct {
    db *gorm.DB
}

func NewAnalyticsRepository(db *gorm.DB) *AnalyticsRepository {
    return &AnalyticsRepository{db: db}
}

// Count total posts
func (r *AnalyticsRepository) CountPosts(ctx context.Context) (int64, error) {
    var count int64
    err := r.db.WithContext(ctx).Model(&model.Post{}).Count(&count).Error
    return count, err
}

// Count dengan conditions
func (r *AnalyticsRepository) CountPublishedPosts(ctx context.Context) (int64, error) {
    var count int64
    err := r.db.WithContext(ctx).
        Model(&model.Post{}).
        Where("status = ?", "published").
        Count(&count).Error
    return count, err
}

// Sum total views
func (r *AnalyticsRepository) SumTotalViews(ctx context.Context) (int64, error) {
    var total int64
    err := r.db.WithContext(ctx).
        Model(&model.Post{}).
        Select("COALESCE(SUM(view_count), 0)").
        Scan(&total).Error
    return total, err
}

// Average views per post
func (r *AnalyticsRepository) AvgViewsPerPost(ctx context.Context) (float64, error) {
    var avg float64
    err := r.db.WithContext(ctx).
        Model(&model.Post{}).
        Select("COALESCE(AVG(view_count), 0)").
        Scan(&avg).Error
    return avg, err
}

// Max views
func (r *AnalyticsRepository) MaxViews(ctx context.Context) (int, error) {
    var max int
    err := r.db.WithContext(ctx).
        Model(&model.Post{}).
        Select("COALESCE(MAX(view_count), 0)").
        Scan(&max).Error
    return max, err
}

// Group by with aggregations
func (r *AnalyticsRepository) PostStatsByUser(ctx context.Context) ([]map[string]interface{}, error) {
    var results []map[string]interface{}
    
    err := r.db.WithContext(ctx).
        Model(&model.Post{}).
        Select(`
            user_id,
            COUNT(*) as post_count,
            SUM(view_count) as total_views,
            AVG(view_count) as avg_views
        `).
        Group("user_id").
        Having("COUNT(*) > ?", 0).
        Scan(&results).Error
    
    return results, err
}

// Top posts by views
func (r *AnalyticsRepository) TopPostsByViews(ctx context.Context, limit int) ([]model.Post, error) {
    var posts []model.Post
    
    err := r.db.WithContext(ctx).
        Select("id", "title", "view_count", "user_id").
        Order("view_count DESC").
        Limit(limit).
        Find(&posts).Error
    
    return posts, err
}

// Complex aggregation with joins
func (r *AnalyticsRepository) UserEngagementStats(ctx context.Context) ([]map[string]interface{}, error) {
    var results []map[string]interface{}
    
    err := r.db.WithContext(ctx).Raw(`
        SELECT 
            u.id,
            u.name,
            u.email,
            COUNT(DISTINCT p.id) as post_count,
            COUNT(DISTINCT c.id) as comment_count,
            SUM(p.view_count) as total_views
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id AND p.deleted_at IS NULL
        LEFT JOIN comments c ON u.id = c.user_id AND c.deleted_at IS NULL
        WHERE u.deleted_at IS NULL
        GROUP BY u.id, u.name, u.email
        ORDER BY total_views DESC NULLS LAST
        LIMIT 10
    `).Scan(&results).Error
    
    return results, err
}
```

**internal/repository/user_repository.go:**
```go
package repository

import (
    "context"

    "gorm-optimization-go/internal/model"

    "gorm.io/gorm"
)

type UserRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
    return &UserRepository{db: db}
}

// Find by email (using unique index)
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
    var user model.User
    err := r.db.WithContext(ctx).
        Where("email = ?", email). // Uses idx_users_email
        First(&user).Error
    
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            return nil, nil
        }
        return nil, err
    }
    return &user, nil
}

// Find by country and city (using composite index)
func (r *UserRepository) FindByLocation(ctx context.Context, country, city string) ([]model.User, error) {
    var users []model.User
    
    // Uses composite index: idx_users_country_city
    err := r.db.WithContext(ctx).
        Where("country = ? AND city = ?", country, city).
        Find(&users).Error
    
    return users, err
}

// Search by name (uses index)
func (r *UserRepository) SearchByName(ctx context.Context, name string) ([]model.User, error) {
    var users []model.User
    
    // Uses index: idx_users_name
    // For LIKE queries, index works for prefix match (name LIKE 'Alice%')
    err := r.db.WithContext(ctx).
        Where("name LIKE ?", name+"%").
        Find(&users).Error
    
    return users, err
}
```

---

## 5. Handlers & Service

**internal/handler/post_handler.go:**
```go
package handler

import (
    "gorm-optimization-go/internal/repository"

    "github.com/gofiber/fiber/v2"
)

type PostHandler struct {
    postRepo *repository.PostRepository
}

func NewPostHandler(postRepo *repository.PostRepository) *PostHandler {
    return &PostHandler{postRepo: postRepo}
}

// Demo N+1 problem (slow)
func (h *PostHandler) GetPostsN1Problem(c *fiber.Ctx) error {
    posts, err := h.postRepo.FindAllWithN1Problem(c.Context())
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": posts, "method": "N+1 Problem (slow)"})
}

// Demo Preload (optimized)
func (h *PostHandler) GetPostsWithPreload(c *fiber.Ctx) error {
    posts, err := h.postRepo.FindAllWithPreload(c.Context())
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": posts, "method": "Preload (2-3 queries)"})
}

// Demo Joins (most optimized)
func (h *PostHandler) GetPostsWithJoins(c *fiber.Ctx) error {
    posts, err := h.postRepo.FindAllWithJoins(c.Context())
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": posts, "method": "Joins (1 query)"})
}

// Optimized query
func (h *PostHandler) GetPostsOptimized(c *fiber.Ctx) error {
    posts, err := h.postRepo.FindAllOptimized(c.Context())
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": posts})
}

// Get post by slug (uses index)
func (h *PostHandler) GetPostBySlug(c *fiber.Ctx) error {
    slug := c.Params("slug")
    post, err := h.postRepo.FindBySlug(c.Context(), slug)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    if post == nil {
        return c.Status(404).JSON(fiber.Map{"error": "Post not found"})
    }
    return c.JSON(fiber.Map{"data": post})
}

// Increment view count
func (h *PostHandler) IncrementViews(c *fiber.Ctx) error {
    id, err := c.ParamsInt("id")
    if err != nil {
        return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
    }
    
    if err := h.postRepo.IncrementViewCount(c.Context(), uint(id)); err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    
    return c.JSON(fiber.Map{"message": "View count incremented"})
}

// Get stats
func (h *PostHandler) GetStats(c *fiber.Ctx) error {
    stats, err := h.postRepo.GetPostStatsByCategory(c.Context())
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": stats})
}
```

**internal/handler/analytics_handler.go:**
```go
package handler

import (
    "gorm-optimization-go/internal/repository"

    "github.com/gofiber/fiber/v2"
)

type AnalyticsHandler struct {
    analyticsRepo *repository.AnalyticsRepository
}

func NewAnalyticsHandler(analyticsRepo *repository.AnalyticsRepository) *AnalyticsHandler {
    return &AnalyticsHandler{analyticsRepo: analyticsRepo}
}

func (h *AnalyticsHandler) GetOverview(c *fiber.Ctx) error {
    totalPosts, _ := h.analyticsRepo.CountPosts(c.Context())
    publishedPosts, _ := h.analyticsRepo.CountPublishedPosts(c.Context())
    totalViews, _ := h.analyticsRepo.SumTotalViews(c.Context())
    avgViews, _ := h.analyticsRepo.AvgViewsPerPost(c.Context())
    maxViews, _ := h.analyticsRepo.MaxViews(c.Context())
    
    return c.JSON(fiber.Map{
        "total_posts":     totalPosts,
        "published_posts": publishedPosts,
        "total_views":     totalViews,
        "avg_views":       avgViews,
        "max_views":       maxViews,
    })
}

func (h *AnalyticsHandler) GetUserStats(c *fiber.Ctx) error {
    stats, err := h.analyticsRepo.UserEngagementStats(c.Context())
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": stats})
}

func (h *AnalyticsHandler) GetTopPosts(c *fiber.Ctx) error {
    limit := c.QueryInt("limit", 10)
    posts, err := h.analyticsRepo.TopPostsByViews(c.Context(), limit)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"data": posts})
}
```

---

## 6. Main Application

**cmd/api/main.go:**
```go
package main

import (
    "log"

    "gorm-optimization-go/internal/config"
    "gorm-optimization-go/internal/database"
    "gorm-optimization-go/internal/handler"
    "gorm-optimization-go/internal/repository"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }

    db, err := database.NewDatabase(cfg)
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    if err := database.Migrate(db); err != nil {
        log.Fatal("Failed to migrate:", err)
    }

    if err := database.SeedData(db); err != nil {
        log.Fatal("Failed to seed data:", err)
    }

    // Repositories
    postRepo := repository.NewPostRepository(db)
    analyticsRepo := repository.NewAnalyticsRepository(db)

    // Handlers
    postHandler := handler.NewPostHandler(postRepo)
    analyticsHandler := handler.NewAnalyticsHandler(analyticsRepo)

    app := fiber.New()
    app.Use(logger.New())

    api := app.Group("/api")

    // Post routes
    posts := api.Group("/posts")
    {
        posts.Get("/n1-problem", postHandler.GetPostsN1Problem)
        posts.Get("/preload", postHandler.GetPostsWithPreload)
        posts.Get("/joins", postHandler.GetPostsWithJoins)
        posts.Get("/optimized", postHandler.GetPostsOptimized)
        posts.Get("/slug/:slug", postHandler.GetPostBySlug)
        posts.Post("/:id/view", postHandler.IncrementViews)
        posts.Get("/stats", postHandler.GetStats)
    }

    // Analytics routes
    analytics := api.Group("/analytics")
    {
        analytics.Get("/overview", analyticsHandler.GetOverview)
        analytics.Get("/users", analyticsHandler.GetUserStats)
        analytics.Get("/top-posts", analyticsHandler.GetTopPosts)
    }

    port := cfg.Server.Port
    log.Printf("🚀 Server running on port %s\n", port)
    log.Printf("📊 Watch query logs in terminal (color-coded by speed)\n")
    log.Fatal(app.Listen(":" + port))
}
```

---

## 7. EXPLAIN ANALYZE Scripts

**scripts/explain.sql:**
```sql
-- Connect to database
\c optimization_db

-- 1. Show all indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 2. EXPLAIN ANALYZE untuk query tanpa index (Seq Scan)
EXPLAIN ANALYZE
SELECT * FROM posts WHERE title = 'Post 50';

-- 3. EXPLAIN ANALYZE untuk query dengan index (Index Scan)
EXPLAIN ANALYZE
SELECT * FROM posts WHERE id = 50;

-- 4. EXPLAIN ANALYZE untuk query dengan composite index
EXPLAIN ANALYZE
SELECT * FROM posts 
WHERE user_id = 1 AND status = 'published'
ORDER BY created_at DESC
LIMIT 10;

-- 5. EXPLAIN ANALYZE untuk JOIN query
EXPLAIN ANALYZE
SELECT p.*, u.name, c.name as category_name
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN categories c ON p.category_id = c.id
WHERE p.status = 'published'
LIMIT 20;

-- 6. Seq Scan example (slow without index)
EXPLAIN ANALYZE
SELECT * FROM posts WHERE body LIKE '%post%';

-- 7. Index Scan example (fast with index)
EXPLAIN ANALYZE
SELECT * FROM posts WHERE slug = 'post-50';

-- 8. Bitmap Scan example
EXPLAIN ANALYZE
SELECT * FROM posts WHERE view_count > 500;

-- 9. Check query statistics
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 10. Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 11. Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 12. Find unused indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexname NOT LIKE '%pkey%';
```

---

## Testing & Performance Analysis

### 1. Start Services
```bash
docker-compose up -d
go run cmd/api/main.go
```

### 2. Test N+1 Problem vs Optimized
```bash
# N+1 Problem (slow - 101 queries)
time curl http://localhost:3000/api/posts/n1-problem

# Watch terminal logs - you'll see:
# [0.xx ms] SELECT * FROM posts
# [0.xx ms] SELECT * FROM users WHERE id = 1
# [0.xx ms] SELECT * FROM users WHERE id = 2
# ... (100 more queries!)

# Preload (fast - 3 queries)
time curl http://localhost:3000/api/posts/preload

# Terminal logs:
# [0.xx ms] SELECT * FROM posts
# [0.xx ms] SELECT * FROM users WHERE id IN (1,2,3)
# [0.xx ms] SELECT * FROM categories WHERE id IN (1,2,3)

# Joins (fastest - 1 query)
time curl http://localhost:3000/api/posts/joins

# Terminal logs:
# [1.xx ms] SELECT posts.*, users.*, categories.* FROM posts 
#           LEFT JOIN users ON posts.user_id = users.id
#           LEFT JOIN categories ON posts.category_id = categories.id
```

### 3. Test Index Performance
```bash
# Query by slug (uses unique index - fast)
time curl http://localhost:3000/api/posts/slug/post-50

# Terminal log:
# [0.12ms] SELECT * FROM posts WHERE slug = 'post-50'
# Index Scan using idx_posts_slug
```

### 4. EXPLAIN ANALYZE dalam PostgreSQL
```bash
# Connect ke PostgreSQL
docker exec -it <container_id> psql -U postgres -d optimization_db

# Run EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM posts WHERE slug = 'post-50';

# Output:
# Index Scan using idx_posts_slug on posts  (cost=0.28..8.29 rows=1 width=XXX) (actual time=0.023..0.024 rows=1 loops=1)
#   Index Cond: ((slug)::text = 'post-50'::text)
# Planning Time: 0.123 ms
# Execution Time: 0.048 ms

# Compare dengan query tanpa index:
EXPLAIN ANALYZE SELECT * FROM posts WHERE body LIKE '%test%';

# Output:
# Seq Scan on posts  (cost=0.00..XX.XX rows=X width=XXX) (actual time=X..X rows=X loops=1)
#   Filter: (body ~~ '%test%'::text)
#   Rows Removed by Filter: XX
# Planning Time: 0.XXX ms
# Execution Time: XX.XXX ms  (SLOW!)
```

### 5. Membaca EXPLAIN ANALYZE Output

**Index Scan** (FAST ✅):
```
Index Scan using idx_posts_slug on posts (cost=0.28..8.29 rows=1)
  -> Menggunakan index
  -> Cost rendah
  -> Execution time < 1ms
```

**Seq Scan** (SLOW ❌):
```
Seq Scan on posts (cost=0.00..35.50 rows=2550)
  -> Full table scan
  -> Cost tinggi
  -> Execution time tinggi
  -> Perlu index!
```

**Bitmap Scan** (MEDIUM ⚠️):
```
Bitmap Heap Scan on posts
  -> Scan multiple index entries
  -> Medium performance
  -> OK untuk range queries
```

### 6. Test Aggregations
```bash
# Analytics overview
curl http://localhost:3000/api/analytics/overview

# User stats
curl http://localhost:3000/api/analytics/users

# Top posts
curl "http://localhost:3000/api/analytics/top-posts?limit=5"
```

### 7. Monitor Query Performance
```bash
# Terminal akan menampilkan query dengan color coding:
# 🟢 Green: < 50ms (fast)
# 🟡 Yellow: 50-100ms (moderate)
# 🔴 Red: > 100ms (slow - perlu optimization!)

# Example output:
# [0.45ms] [rows:100] SELECT * FROM posts
# [0.12ms] [rows:3] SELECT * FROM users WHERE id IN (1,2,3)
# [125.50ms] [rows:5000] SELECT * FROM huge_table  # SLOW!
```

---

## 8 Kesalahan Umum & Solusinya

### 1. **N+1 Problem yang tidak disadari**
**Masalah:**
```go
// ❌ BAHAYA: Terlihat innocent tapi N+1 problem
posts := []Post{}
db.Find(&posts)
for _, post := range posts {
    // Di template/handler, akses post.User
    fmt.Println(post.User.Name) // Trigger lazy load = N queries!
}
```

**Solusi:**
```go
// ✅ AMAN: Preload di awal
db.Preload("User").Find(&posts)
for _, post := range posts {
    fmt.Println(post.User.Name) // No additional query
}
```

---

### 2. **SELECT * alih-alih kolom yang dibutuhkan**
**Masalah:**
```go
// ❌ LAMBAT: Ambil semua kolom termasuk BLOB/TEXT besar
db.Find(&posts) // SELECT * (termasuk body yang 10KB+)
```

**Solusi:**
```go
// ✅ CEPAT: Hanya kolom yang dibutuhkan
db.Select("id", "title", "slug", "created_at").Find(&posts)
```

---

### 3. **Lupa index untuk kolom yang sering di-query**
**Masalah:**
```go
// ❌ LAMBAT: Query tanpa index
type User struct {
    Email string // No index!
}

db.Where("email = ?", email).First(&user) // Seq Scan!
```

**Solusi:**
```go
// ✅ CEPAT: Tambah index
type User struct {
    Email string `gorm:"uniqueIndex"`
}
// Index Scan!
```

---

### 4. **LIKE query yang tidak optimal**
**Masalah:**
```go
// ❌ LAMBAT: % di awal = index tidak terpakai
db.Where("name LIKE ?", "%John%").Find(&users) // Seq Scan
```

**Solusi:**
```go
// ✅ CEPAT: % di akhir = index terpakai
db.Where("name LIKE ?", "John%").Find(&users) // Index Scan

// Atau gunakan full-text search untuk search di tengah
db.Where("to_tsvector(name) @@ to_tsquery(?)", "John").Find(&users)
```

---

### 5. **Tidak pakai Limit untuk large dataset**
**Masalah:**
```go
// ❌ BAHAYA: Load semua data (bisa OOM kalau jutaan rows)
db.Find(&posts) // SELECT * FROM posts (1,000,000 rows!)
```

**Solusi:**
```go
// ✅ AMAN: Pakai limit + pagination
db.Limit(20).Offset(page * 20).Find(&posts)
```

---

### 6. **Index yang tidak terpakai**
**Masalah:**
```go
// ❌ INDEX TIDAK TERPAKAI: Query pakai OR
type Post struct {
    Status string `gorm:"index"`
    Type   string `gorm:"index"`
}

db.Where("status = ? OR type = ?", "published", "article").Find(&posts)
// PostgreSQL tidak bisa pakai index dengan OR
```

**Solusi:**
```go
// ✅ INDEX TERPAKAI: Pakai UNION atau IN
db.Where("status = ?", "published").
   Or("type = ?", "article").
   Find(&posts)

// Atau buat composite index
```

---

### 7. **Aggregate tanpa index**
**Masalah:**
```go
// ❌ LAMBAT: COUNT(*) di table besar tanpa WHERE
db.Model(&Post{}).Count(&count) // Seq Scan entire table
```

**Solusi:**
```go
// ✅ CEPAT: Tambah WHERE dengan indexed column
db.Model(&Post{}).
   Where("status = ?", "published"). // Uses index
   Count(&count)
```

---

### 8. **Composite index dengan urutan salah**
**Masalah:**
```go
// ❌ INDEX TIDAK OPTIMAL
type Post struct {
    CreatedAt time.Time `gorm:"index:idx_created_status,priority:1"`
    Status    string    `gorm:"index:idx_created_status,priority:2"`
}

// Query ini tidak bisa pakai index:
db.Where("status = ?", "published").Find(&posts)
// Karena status bukan kolom pertama di composite index
```

**Solusi:**
```go
// ✅ INDEX OPTIMAL: Kolom yang paling sering di WHERE dulu
type Post struct {
    Status    string    `gorm:"index:idx_status_created,priority:1"`
    CreatedAt time.Time `gorm:"index:idx_status_created,priority:2"`
}

// Sekarang bisa pakai index
db.Where("status = ?", "published").Order("created_at DESC").Find(&posts)
```

---

## 10 Ide Pengembangan

### 1. **Query result caching dengan Redis**
```go
func (r *PostRepository) FindAllCached(ctx context.Context) ([]Post, error) {
    cacheKey := "posts:all"
    
    // Try cache
    var posts []Post
    if cached, err := redis.Get(ctx, cacheKey).Result(); err == nil {
        json.Unmarshal([]byte(cached), &posts)
        return posts, nil
    }
    
    // Cache miss, query DB
    if err := r.db.Find(&posts).Error; err != nil {
        return nil, err
    }
    
    // Set cache
    data, _ := json.Marshal(posts)
    redis.Set(ctx, cacheKey, data, 5*time.Minute)
    
    return posts, nil
}
```

---

### 2. **Automatic query logging untuk slow queries**
```go
// Custom callback untuk detect slow queries
func RegisterSlowQueryLogger(db *gorm.DB, threshold time.Duration) {
    db.Callback().Query().After("gorm:query").Register("slow_query_logger", func(db *gorm.DB) {
        elapsed := time.Since(db.Statement.Context.Value("start_time").(time.Time))
        
        if elapsed > threshold {
            log.Printf("🐌 SLOW QUERY [%.2fms]: %s", 
                float64(elapsed.Milliseconds()), 
                db.Statement.SQL.String())
        }
    })
}
```

---

### 3. **Database connection pooling monitoring**
```go
func MonitorConnectionPool(db *gorm.DB) {
    sqlDB, _ := db.DB()
    stats := sqlDB.Stats()
    
    log.Printf(`
        📊 Connection Pool Stats:
        - Open Connections: %d
        - In Use: %d
        - Idle: %d
        - Wait Count: %d
        - Wait Duration: %s
    `, 
        stats.OpenConnections,
        stats.InUse,
        stats.Idle,
        stats.WaitCount,
        stats.WaitDuration,
    )
}
```

---

### 4. **Batch loading untuk avoid N+1 dengan custom loader**
```go
type PostLoader struct {
    db *gorm.DB
}

func (l *PostLoader) LoadUsers(userIDs []uint) (map[uint]User, error) {
    var users []User
    l.db.Where("id IN ?", userIDs).Find(&users)
    
    userMap := make(map[uint]User)
    for _, user := range users {
        userMap[user.ID] = user
    }
    return userMap, nil
}

// Usage
userIDs := extractUserIDs(posts)
userMap, _ := loader.LoadUsers(userIDs)
for i := range posts {
    posts[i].User = &userMap[posts[i].UserID]
}
```

---

### 5. **Query builder untuk complex queries**
```go
type PostQueryBuilder struct {
    db *gorm.DB
}

func (b *PostQueryBuilder) WithStatus(status string) *PostQueryBuilder {
    b.db = b.db.Where("status = ?", status)
    return b
}

func (b *PostQueryBuilder) WithUser(userID uint) *PostQueryBuilder {
    b.db = b.db.Where("user_id = ?", userID)
    return b
}

func (b *PostQueryBuilder) SortBy(field string, desc bool) *PostQueryBuilder {
    order := field
    if desc {
        order += " DESC"
    }
    b.db = b.db.Order(order)
    return b
}

func (b *PostQueryBuilder) Execute() ([]Post, error) {
    var posts []Post
    err := b.db.Find(&posts).Error
    return posts, err
}

// Usage
posts, _ := NewPostQueryBuilder(db).
    WithStatus("published").
    WithUser(1).
    SortBy("created_at", true).
    Execute()
```

---

### 6. **Index suggestion tool**
```go
func SuggestIndexes(db *gorm.DB) {
    // Analyze pg_stat_statements
    var stats []struct {
        Query     string
        Calls     int
        MeanTime  float64
    }
    
    db.Raw(`
        SELECT query, calls, mean_exec_time
        FROM pg_stat_statements
        WHERE mean_exec_time > 100
        ORDER BY mean_exec_time DESC
        LIMIT 10
    `).Scan(&stats)
    
    for _, stat := range stats {
        // Parse query, suggest index
        log.Printf("💡 Slow query: %s\n   Suggestion: Add index on WHERE columns", stat.Query)
    }
}
```

---

### 7. **Materialized view untuk complex aggregations**
```go
// Create materialized view
func CreatePostStatsMV(db *gorm.DB) {
    db.Exec(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS post_stats_mv AS
        SELECT 
            user_id,
            COUNT(*) as post_count,
            SUM(view_count) as total_views,
            AVG(view_count) as avg_views
        FROM posts
        WHERE deleted_at IS NULL
        GROUP BY user_id
    `)
}

// Refresh materialized view (cron job)
func RefreshPostStatsMV(db *gorm.DB) {
    db.Exec("REFRESH MATERIALIZED VIEW post_stats_mv")
}

// Query dari materialized view (super fast)
func GetPostStats(db *gorm.DB) ([]PostStats, error) {
    var stats []PostStats
    db.Raw("SELECT * FROM post_stats_mv").Scan(&stats)
    return stats, nil
}
```

---

### 8. **Automatic index creation berdasarkan query patterns**
```go
func AutoCreateIndexes(db *gorm.DB) {
    // Analyze most queried columns
    var columns []struct {
        Table  string
        Column string
        Count  int
    }
    
    db.Raw(`
        SELECT 
            schemaname || '.' || tablename as table,
            attname as column,
            n_distinct as count
        FROM pg_stats
        WHERE schemaname = 'public'
        AND n_distinct > 10
        ORDER BY n_distinct DESC
    `).Scan(&columns)
    
    for _, col := range columns {
        indexName := fmt.Sprintf("idx_auto_%s_%s", col.Table, col.Column)
        db.Exec(fmt.Sprintf("CREATE INDEX IF NOT EXISTS %s ON %s(%s)", 
            indexName, col.Table, col.Column))
    }
}
```

---

### 9. **Query performance comparison tool**
```go
func CompareQueries(db *gorm.DB, queries map[string]func()) {
    for name, query := range queries {
        start := time.Now()
        query()
        elapsed := time.Since(start)
        
        log.Printf("⏱️  %s: %.2fms", name, float64(elapsed.Microseconds())/1000.0)
    }
}

// Usage
CompareQueries(db, map[string]func(){
    "N+1 Problem": func() { repo.FindAllWithN1Problem(ctx) },
    "Preload":     func() { repo.FindAllWithPreload(ctx) },
    "Joins":       func() { repo.FindAllWithJoins(ctx) },
})
```

---

### 10. **Database profiling middleware**
```go
func ProfilingMiddleware(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        queryCount := 0
        totalDuration := time.Duration(0)
        
        // Count queries
        db.Callback().Query().Before("gorm:query").Register("profiling_before", func(db *gorm.DB) {
            db.InstanceSet("query_start", time.Now())
        })
        
        db.Callback().Query().After("gorm:query").Register("profiling_after", func(db *gorm.DB) {
            start, _ := db.InstanceGet("query_start")
            duration := time.Since(start.(time.Time))
            queryCount++
            totalDuration += duration
        })
        
        err := c.Next()
        
        // Log stats
        c.Set("X-Query-Count", fmt.Sprintf("%d", queryCount))
        c.Set("X-Query-Duration", fmt.Sprintf("%.2fms", float64(totalDuration.Microseconds())/1000.0))
        
        return err
    }
}
```

---

## Kesimpulan

**Query Optimization & Indexing** adalah kunci untuk performance database. Key points:

1. **N+1 Problem**: Deteksi dengan logger, fix dengan Preload/Joins
2. **Indexing**: Tambah index untuk kolom WHERE, JOIN, ORDER BY
3. **EXPLAIN**: Analisis query plan, cari Seq Scan yang bisa di-optimize
4. **Select Specific**: Hindari SELECT *, ambil kolom yang dibutuhkan
5. **Composite Index**: Urutan kolom penting (most queried first)

**Production Checklist:**
- ✅ Enable query logger di development
- ✅ Set slow query threshold (100ms)
- ✅ Review EXPLAIN ANALYZE untuk critical queries
- ✅ Monitor index usage dengan pg_stat_user_indexes
- ✅ Remove unused indexes
- ✅ Use Preload untuk relasi
- ✅ Add index untuk foreign keys
- ✅ Test query performance dengan realistic data volume

**Commands:**
```bash
# Start & seed with 100+ records
docker-compose up -d
go run cmd/api/main.go

# Test N+1 vs optimized
curl http://localhost:3000/api/posts/n1-problem
curl http://localhost:3000/api/posts/preload

# EXPLAIN in PostgreSQL
docker exec -it <container> psql -U postgres -d optimization_db
\i scripts/explain.sql
```

Happy optimizing! 🚀
