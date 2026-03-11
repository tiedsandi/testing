# 🐬 MySQL dengan GORM di Go Gin

## 🎯 Tujuan Belajar

Setelah belajar ini, lo bisa:
- Paham perbedaan MySQL vs PostgreSQL untuk Go development
- Setup MySQL dengan GORM di Gin project
- Handle data types yang berbeda di MySQL
- Implement UUID di MySQL (CHAR/BINARY)
- Pakai JSON field dengan datatypes.JSON
- Setup ENUM type di MySQL
- Implement fulltext search dengan MATCH AGAINST
- Bikin migration yang compatible dengan MySQL
- Setup multi-database (PostgreSQL + MySQL) dalam 1 project
- Optimize connection pooling untuk MySQL

## 💡 Konsep + Analogi

### MySQL vs PostgreSQL — Developer Perspective

| Aspek | PostgreSQL | MySQL | Winner |
|-------|-----------|-------|--------|
| **Data Types** | Lebih rich (JSON, UUID, Array) | Basic types, JSON sejak 5.7 | 🏆 PostgreSQL |
| **Performance Read** | Good | Excellent (MyISAM, InnoDB) | 🏆 MySQL |
| **Performance Write** | Excellent | Good | 🏆 PostgreSQL |
| **ACID Compliance** | Full ACID | ACID (InnoDB only) | 🏆 PostgreSQL |
| **Fulltext Search** | Good (tsvector) | Excellent (FULLTEXT) | 🏆 MySQL |
| **Replication** | Streaming replication | Master-slave built-in | 🏆 MySQL |
| **JSON Support** | Native JSONB (binary) | JSON (text-based) | 🏆 PostgreSQL |
| **UUID** | Native UUID type | Char(36) or Binary(16) | 🏆 PostgreSQL |
| **ENUM** | Custom ENUM type | Native ENUM | 🏆 MySQL |
| **Trigger/Stored Proc** | Advanced PL/pgSQL | Basic MySQL procedure | 🏆 PostgreSQL |
| **Learning Curve** | Steeper | Easier | 🏆 MySQL |
| **Popularity** | Growing | Still dominant | 🏆 MySQL |
| **Cloud Support** | Excellent | Excellent | Draw 🤝 |

**Analogi Sederhana:**

| Database | Framework Equivalent | Karakteristik |
|----------|---------------------|---------------|
| **PostgreSQL** | React (powerful, flexible) | Feature-rich, complex, untuk app besar |
| **MySQL** | Vue.js (simple, fast) | Simple, cepat read, untuk web app biasa |

### Kapan Pakai MySQL vs PostgreSQL?

**Pakai MySQL kalau:**
- ✅ Read-heavy application (blog, e-commerce)
- ✅ Butuh replication yang simple
- ✅ Team sudah familiar MySQL
- ✅ Fulltext search penting (artikel, product search)
- ✅ Budget cloud lebih rendah (DigitalOcean MySQL Managed)

**Pakai PostgreSQL kalau:**
- ✅ Write-heavy application
- ✅ Butuh data types advanced (JSON, Array, UUID)
- ✅ Complex query & transaction
- ✅ Data integrity critical
- ✅ Mikroservices dengan banyak join

**Fun fact:** **WordPress pakai MySQL**, **Supabase pakai PostgreSQL**. Keduanya sukses!

### Data Type Mapping — PostgreSQL vs MySQL

```go
// PostgreSQL GORM Model
type User struct {
    ID        uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid()"`
    Metadata  datatypes.JSON `gorm:"type:jsonb"`
    Tags      pq.StringArray `gorm:"type:text[]"`
}

// MySQL GORM Model (equivalent)
type User struct {
    ID        string         `gorm:"type:char(36);primaryKey"` // UUID as string
    Metadata  datatypes.JSON `gorm:"type:json"`                 // JSON (not JSONB)
    Tags      string         `gorm:"type:text"`                 // Array jadi comma-separated
}
```

## 📝 Materi + Kode Lengkap

### 1. Install MySQL & Driver

```bash
# Install MySQL di Ubuntu/Debian
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure installation
sudo mysql_secure_installation

# Create database & user
sudo mysql
```

```sql
-- Di MySQL shell
CREATE DATABASE gin_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gin_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON gin_app.* TO 'gin_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Install GORM MySQL driver
go get -u gorm.io/driver/mysql
go get -u gorm.io/gorm
go get -u gorm.io/datatypes
go get -u github.com/google/uuid
```

### 2. DSN Format & Connection Setup

```go
// config/database.go
package config

import (
    "fmt"
    "log"
    "os"
    "time"

    "gorm.io/driver/mysql"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

type MySQLConfig struct {
    Host     string
    Port     string
    User     string
    Password string
    DBName   string
    Charset  string
}

func NewMySQLDatabase(cfg MySQLConfig) (*gorm.DB, error) {
    // DSN Format MySQL
    // Format: user:password@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Local
    dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=%s&parseTime=True&loc=Local",
        cfg.User,
        cfg.Password,
        cfg.Host,
        cfg.Port,
        cfg.DBName,
        cfg.Charset,
    )

    // Open connection
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
        NowFunc: func() time.Time {
            // Force UTC untuk consistency
            return time.Now().UTC()
        },
    })
    if err != nil {
        return nil, fmt.Errorf("failed to connect to MySQL: %w", err)
    }

    // Get underlying *sql.DB
    sqlDB, err := db.DB()
    if err != nil {
        return nil, err
    }

    // Connection pooling settings (berbeda dari PostgreSQL!)
    sqlDB.SetMaxIdleConns(10)           // Max idle connections
    sqlDB.SetMaxOpenConns(100)          // Max open connections
    sqlDB.SetConnMaxLifetime(time.Hour) // Connection lifetime
    sqlDB.SetConnMaxIdleTime(10 * time.Minute)

    log.Println("MySQL database connected successfully")
    return db, nil
}

// Load config dari environment
func LoadMySQLConfig() MySQLConfig {
    return MySQLConfig{
        Host:     getEnv("MYSQL_HOST", "localhost"),
        Port:     getEnv("MYSQL_PORT", "3306"),
        User:     getEnv("MYSQL_USER", "gin_user"),
        Password: getEnv("MYSQL_PASSWORD", "secure_password"),
        DBName:   getEnv("MYSQL_DATABASE", "gin_app"),
        Charset:  getEnv("MYSQL_CHARSET", "utf8mb4"), // ALWAYS utf8mb4 for emoji support!
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

### 3. MySQL-Specific GORM Models

```go
// internal/product/entity.go
package product

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/datatypes"
    "gorm.io/gorm"
)

// Status ENUM
type ProductStatus string

const (
    ProductStatusActive   ProductStatus = "active"
    ProductStatusInactive ProductStatus = "inactive"
    ProductStatusDraft    ProductStatus = "draft"
)

type Product struct {
    // MySQL tidak punya native UUID, pakai CHAR(36) atau BINARY(16)
    ID string `gorm:"type:char(36);primaryKey" json:"id"`
    
    // Basic fields
    Name        string  `gorm:"type:varchar(255);not null;index:idx_name" json:"name"`
    Description string  `gorm:"type:text" json:"description"`
    Price       float64 `gorm:"type:decimal(10,2);not null" json:"price"`
    Stock       int     `gorm:"type:int;not null;default:0" json:"stock"`
    
    // ENUM di MySQL (native support!)
    Status ProductStatus `gorm:"type:enum('active','inactive','draft');default:'draft'" json:"status"`
    
    // JSON field di MySQL (pakai datatypes.JSON)
    Specifications datatypes.JSON `gorm:"type:json" json:"specifications"`
    
    // Fulltext search field
    SearchText string `gorm:"type:text" json:"-"` // Combine fields untuk search
    
    // Timestamps
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete
}

// TableName override
func (Product) TableName() string {
    return "products"
}

// BeforeCreate hook untuk generate UUID
func (p *Product) BeforeCreate(tx *gorm.DB) error {
    if p.ID == "" {
        // Generate UUID v4
        p.ID = uuid.New().String()
    }
    
    // Update search text untuk fulltext
    p.SearchText = p.Name + " " + p.Description
    
    return nil
}

// BeforeUpdate hook
func (p *Product) BeforeUpdate(tx *gorm.DB) error {
    // Update search text
    p.SearchText = p.Name + " " + p.Description
    return nil
}
```

```go
// internal/user/entity.go
package user

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/datatypes"
    "gorm.io/gorm"
)

type UserRole string

const (
    UserRoleAdmin  UserRole = "admin"
    UserRoleUser   UserRole = "user"
    UserRoleGuest  UserRole = "guest"
)

type User struct {
    // UUID di MySQL pakai CHAR(36)
    ID string `gorm:"type:char(36);primaryKey" json:"id"`
    
    // Basic fields
    Name     string `gorm:"type:varchar(100);not null" json:"name"`
    Email    string `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
    Password string `gorm:"type:varchar(255);not null" json:"-"`
    
    // ENUM role
    Role UserRole `gorm:"type:enum('admin','user','guest');default:'user'" json:"role"`
    
    // JSON field untuk preferences
    Preferences datatypes.JSON `gorm:"type:json" json:"preferences"`
    
    // JSON field untuk metadata
    Metadata datatypes.JSON `gorm:"type:json" json:"metadata"`
    
    Timestamps
}

type Timestamps struct {
    CreatedAt time.Time      `json:"created_at"`
    UpdatedAt time.Time      `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (User) TableName() string {
    return "users"
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
    if u.ID == "" {
        u.ID = uuid.New().String()
    }
    return nil
}
```

### 4. Working with UUID di MySQL

```go
// pkg/utils/uuid.go
package utils

import (
    "database/sql/driver"
    "fmt"

    "github.com/google/uuid"
)

// UUIDBinary untuk store UUID sebagai BINARY(16) (lebih efisien!)
type UUIDBinary [16]byte

func NewUUIDBinary() UUIDBinary {
    return UUIDBinary(uuid.New())
}

func (u UUIDBinary) String() string {
    return uuid.UUID(u).String()
}

// Scan implements sql.Scanner
func (u *UUIDBinary) Scan(value interface{}) error {
    bytes, ok := value.([]byte)
    if !ok {
        return fmt.Errorf("failed to scan UUIDBinary")
    }
    if len(bytes) != 16 {
        return fmt.Errorf("invalid UUID binary length")
    }
    copy(u[:], bytes)
    return nil
}

// Value implements driver.Valuer
func (u UUIDBinary) Value() (driver.Value, error) {
    return u[:], nil
}

// MarshalJSON implements json.Marshaler
func (u UUIDBinary) MarshalJSON() ([]byte, error) {
    return []byte(`"` + u.String() + `"`), nil
}

// UnmarshalJSON implements json.Unmarshaler
func (u *UUIDBinary) UnmarshalJSON(data []byte) error {
    str := string(data)
    str = str[1 : len(str)-1] // Remove quotes
    
    parsed, err := uuid.Parse(str)
    if err != nil {
        return err
    }
    
    *u = UUIDBinary(parsed)
    return nil
}
```

```go
// Example entity dengan UUIDBinary
type Order struct {
    ID     UUIDBinary `gorm:"type:binary(16);primaryKey" json:"id"`
    UserID UUIDBinary `gorm:"type:binary(16);not null;index" json:"user_id"`
    Total  float64    `gorm:"type:decimal(10,2)" json:"total"`
    
    CreatedAt time.Time `json:"created_at"`
}

func (o *Order) BeforeCreate(tx *gorm.DB) error {
    if o.ID == [16]byte{} {
        o.ID = NewUUIDBinary()
    }
    return nil
}
```

### 5. Working with JSON Fields

```go
// internal/product/dto.go
package product

type ProductSpecifications struct {
    Weight     float64           `json:"weight"`
    Dimensions map[string]string `json:"dimensions"`
    Color      string            `json:"color"`
    Material   string            `json:"material"`
    Features   []string          `json:"features"`
}

type CreateProductRequest struct {
    Name           string                 `json:"name" binding:"required"`
    Description    string                 `json:"description"`
    Price          float64                `json:"price" binding:"required,gt=0"`
    Stock          int                    `json:"stock" binding:"required,gte=0"`
    Status         ProductStatus          `json:"status" binding:"required,oneof=active inactive draft"`
    Specifications ProductSpecifications  `json:"specifications"`
}
```

```go
// internal/product/service.go
package product

import (
    "context"
    "encoding/json"
    "errors"

    "gorm.io/datatypes"
)

type Service interface {
    Create(ctx context.Context, req CreateProductRequest) (*Product, error)
    GetByID(ctx context.Context, id string) (*Product, error)
    UpdateSpecifications(ctx context.Context, id string, specs ProductSpecifications) error
}

type service struct {
    repo Repository
}

func NewService(repo Repository) Service {
    return &service{repo: repo}
}

func (s *service) Create(ctx context.Context, req CreateProductRequest) (*Product, error) {
    // Convert specifications to JSON
    specsJSON, err := json.Marshal(req.Specifications)
    if err != nil {
        return nil, err
    }

    product := &Product{
        Name:           req.Name,
        Description:    req.Description,
        Price:          req.Price,
        Stock:          req.Stock,
        Status:         req.Status,
        Specifications: datatypes.JSON(specsJSON),
    }

    if err := s.repo.Create(ctx, product); err != nil {
        return nil, err
    }

    return product, nil
}

func (s *service) GetByID(ctx context.Context, id string) (*Product, error) {
    return s.repo.FindByID(ctx, id)
}

func (s *service) UpdateSpecifications(ctx context.Context, id string, specs ProductSpecifications) error {
    product, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return errors.New("product not found")
    }

    specsJSON, err := json.Marshal(specs)
    if err != nil {
        return err
    }

    product.Specifications = datatypes.JSON(specsJSON)
    return s.repo.Update(ctx, product)
}
```

### 6. Fulltext Search di MySQL

```go
// Migration file: 001_create_products_table.up.sql
CREATE TABLE products (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive', 'draft') DEFAULT 'draft',
    specifications JSON,
    search_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_name (name),
    INDEX idx_status (status),
    INDEX idx_deleted_at (deleted_at),
    
    -- Fulltext index untuk search
    FULLTEXT INDEX idx_search (name, description, search_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

```go
// internal/product/repository.go
package product

import (
    "context"

    "gorm.io/gorm"
)

type Repository interface {
    Create(ctx context.Context, product *Product) error
    FindByID(ctx context.Context, id string) (*Product, error)
    Update(ctx context.Context, product *Product) error
    Delete(ctx context.Context, id string) error
    Search(ctx context.Context, query string, limit, offset int) ([]Product, int64, error)
    List(ctx context.Context, limit, offset int) ([]Product, int64, error)
}

type repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
    return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, product *Product) error {
    return r.db.WithContext(ctx).Create(product).Error
}

func (r *repository) FindByID(ctx context.Context, id string) (*Product, error) {
    var product Product
    err := r.db.WithContext(ctx).First(&product, "id = ?", id).Error
    if err != nil {
        return nil, err
    }
    return &product, nil
}

func (r *repository) Update(ctx context.Context, product *Product) error {
    return r.db.WithContext(ctx).Save(product).Error
}

func (r *repository) Delete(ctx context.Context, id string) error {
    return r.db.WithContext(ctx).Delete(&Product{}, "id = ?", id).Error
}

// Fulltext search dengan MATCH AGAINST
func (r *repository) Search(ctx context.Context, query string, limit, offset int) ([]Product, int64, error) {
    var products []Product
    var total int64

    // MySQL Fulltext search dengan MATCH AGAINST
    // Mode: NATURAL LANGUAGE, BOOLEAN, atau QUERY EXPANSION
    
    // Raw SQL untuk MATCH AGAINST
    searchQuery := r.db.WithContext(ctx).
        Where("MATCH(name, description, search_text) AGAINST(? IN NATURAL LANGUAGE MODE)", query).
        Where("status = ?", ProductStatusActive)

    // Count total
    if err := searchQuery.Model(&Product{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // Get results dengan relevance score
    err := searchQuery.
        Select("*, MATCH(name, description, search_text) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance", query).
        Order("relevance DESC").
        Limit(limit).
        Offset(offset).
        Find(&products).Error

    if err != nil {
        return nil, 0, err
    }

    return products, total, nil
}

// Boolean mode search (dengan +, -, ")
func (r *repository) BooleanSearch(ctx context.Context, query string, limit, offset int) ([]Product, int64, error) {
    var products []Product
    var total int64

    // Boolean mode: +word (must have), -word (must not), "phrase" (exact)
    // Example: "+laptop -gaming" atau '+"macbook pro"'
    
    searchQuery := r.db.WithContext(ctx).
        Where("MATCH(name, description, search_text) AGAINST(? IN BOOLEAN MODE)", query).
        Where("status = ?", ProductStatusActive)

    if err := searchQuery.Model(&Product{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }

    err := searchQuery.
        Limit(limit).
        Offset(offset).
        Find(&products).Error

    return products, total, err
}

func (r *repository) List(ctx context.Context, limit, offset int) ([]Product, int64, error) {
    var products []Product
    var total int64

    query := r.db.WithContext(ctx).Model(&Product{})

    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    err := query.Limit(limit).Offset(offset).Find(&products).Error
    return products, total, err
}
```

```go
// internal/product/handler.go
package product

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

type Handler struct {
    service Service
}

func NewHandler(service Service) *Handler {
    return &Handler{service: service}
}

func (h *Handler) Search(c *gin.Context) {
    query := c.Query("q")
    if query == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
        return
    }

    page := 1
    limit := 20
    offset := (page - 1) * limit

    products, total, err := h.service.Search(c.Request.Context(), query, limit, offset)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "data": products,
        "meta": gin.H{
            "total": total,
            "page":  page,
            "limit": limit,
        },
    })
}
```

### 7. MySQL Migration Setup

```bash
# Install golang-migrate
go install -tags 'mysql' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Create migration
migrate create -ext sql -dir migrations/mysql -seq create_users_table
```

```sql
-- migrations/mysql/000001_create_users_table.up.sql
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user', 'guest') DEFAULT 'user',
    preferences JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

```sql
-- migrations/mysql/000001_create_users_table.down.sql
DROP TABLE IF EXISTS users;
```

```sql
-- migrations/mysql/000002_create_products_table.up.sql
CREATE TABLE products (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive', 'draft') DEFAULT 'draft',
    specifications JSON,
    search_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_name (name),
    INDEX idx_status (status),
    INDEX idx_price (price),
    INDEX idx_deleted_at (deleted_at),
    FULLTEXT INDEX idx_search (name, description, search_text)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

```sql
-- migrations/mysql/000002_create_products_table.down.sql
DROP TABLE IF EXISTS products;
```

```bash
# Run migration
migrate -path migrations/mysql -database "mysql://gin_user:secure_password@tcp(localhost:3306)/gin_app" up

# Rollback
migrate -path migrations/mysql -database "mysql://gin_user:secure_password@tcp(localhost:3306)/gin_app" down

# Check version
migrate -path migrations/mysql -database "mysql://gin_user:secure_password@tcp(localhost:3306)/gin_app" version
```

### 8. Multi-Database Setup (PostgreSQL + MySQL)

```go
// config/database.go
package config

import (
    "fmt"
    "log"
    "time"

    "gorm.io/driver/mysql"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

type DatabaseConfig struct {
    PostgreSQL *gorm.DB
    MySQL      *gorm.DB
}

func NewMultiDatabase() (*DatabaseConfig, error) {
    // PostgreSQL connection (primary)
    pgDSN := "host=localhost user=postgres password=postgres dbname=main_db port=5432 sslmode=disable"
    pg, err := gorm.Open(postgres.Open(pgDSN), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
    })
    if err != nil {
        return nil, fmt.Errorf("failed to connect PostgreSQL: %w", err)
    }

    pgSQL, _ := pg.DB()
    pgSQL.SetMaxIdleConns(10)
    pgSQL.SetMaxOpenConns(100)
    pgSQL.SetConnMaxLifetime(time.Hour)

    log.Println("PostgreSQL connected (primary)")

    // MySQL connection (secondary, untuk product catalog)
    mysqlDSN := "gin_user:secure_password@tcp(localhost:3306)/product_db?charset=utf8mb4&parseTime=True&loc=Local"
    mysql, err := gorm.Open(mysql.Open(mysqlDSN), &gorm.Config{
        Logger: logger.Default.LogMode(logger.Info),
    })
    if err != nil {
        return nil, fmt.Errorf("failed to connect MySQL: %w", err)
    }

    mysqlSQL, _ := mysql.DB()
    mysqlSQL.SetMaxIdleConns(10)
    mysqlSQL.SetMaxOpenConns(100)
    mysqlSQL.SetConnMaxLifetime(time.Hour)

    log.Println("MySQL connected (secondary)")

    return &DatabaseConfig{
        PostgreSQL: pg,
        MySQL:      mysql,
    }, nil
}

func (d *DatabaseConfig) Close() error {
    if d.PostgreSQL != nil {
        db, _ := d.PostgreSQL.DB()
        db.Close()
    }
    if d.MySQL != nil {
        db, _ := d.MySQL.DB()
        db.Close()
    }
    return nil
}
```

```go
// cmd/api/main.go
package main

import (
    "log"

    "github.com/gin-gonic/gin"
    "your-project/config"
    "your-project/internal/user"
    "your-project/internal/product"
)

func main() {
    // Setup multi-database
    dbs, err := config.NewMultiDatabase()
    if err != nil {
        log.Fatal("Failed to connect databases:", err)
    }
    defer dbs.Close()

    // Auto migrate
    dbs.PostgreSQL.AutoMigrate(&user.User{})  // Users di PostgreSQL
    dbs.MySQL.AutoMigrate(&product.Product{})  // Products di MySQL

    // Setup Gin
    r := gin.Default()

    // API v1
    v1 := r.Group("/api/v1")
    {
        // User service pakai PostgreSQL
        userRepo := user.NewRepository(dbs.PostgreSQL)
        userService := user.NewService(userRepo)
        userHandler := user.NewHandler(userService)
        
        users := v1.Group("/users")
        {
            users.POST("", userHandler.Create)
            users.GET("/:id", userHandler.GetByID)
        }

        // Product service pakai MySQL
        productRepo := product.NewRepository(dbs.MySQL)
        productService := product.NewService(productRepo)
        productHandler := product.NewHandler(productService)
        
        products := v1.Group("/products")
        {
            products.POST("", productHandler.Create)
            products.GET("", productHandler.List)
            products.GET("/search", productHandler.Search)
            products.GET("/:id", productHandler.GetByID)
        }
    }

    log.Println("Server starting on :3000")
    r.Run(":3000")
}
```

### 9. Connection Pooling Optimization

```go
// config/pool.go
package config

import (
    "time"
    
    "gorm.io/gorm"
)

type PoolConfig struct {
    MaxIdleConns    int
    MaxOpenConns    int
    ConnMaxLifetime time.Duration
    ConnMaxIdleTime time.Duration
}

// Production settings
func ProductionPoolConfig() PoolConfig {
    return PoolConfig{
        MaxIdleConns:    25,
        MaxOpenConns:    200,
        ConnMaxLifetime: 1 * time.Hour,
        ConnMaxIdleTime: 10 * time.Minute,
    }
}

// Development settings
func DevelopmentPoolConfig() PoolConfig {
    return PoolConfig{
        MaxIdleConns:    5,
        MaxOpenConns:    25,
        ConnMaxLifetime: 30 * time.Minute,
        ConnMaxIdleTime: 5 * time.Minute,
    }
}

func ApplyPoolConfig(db *gorm.DB, cfg PoolConfig) error {
    sqlDB, err := db.DB()
    if err != nil {
        return err
    }

    sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
    sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
    sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)
    sqlDB.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

    return nil
}
```

### 10. Environment Configuration

```bash
# .env
# PostgreSQL (primary database)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DATABASE=main_db

# MySQL (product catalog)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=gin_user
MYSQL_PASSWORD=secure_password
MYSQL_DATABASE=product_db
MYSQL_CHARSET=utf8mb4

# App config
APP_ENV=development
PORT=3000
```

```go
// config/env.go
package config

import (
    "log"
    "os"

    "github.com/joho/godotenv"
)

type Config struct {
    PostgreSQL DatabaseInfo
    MySQL      DatabaseInfo
    App        AppInfo
}

type DatabaseInfo struct {
    Host     string
    Port     string
    User     string
    Password string
    Database string
    Charset  string
}

type AppInfo struct {
    Environment string
    Port        string
}

func LoadConfig() *Config {
    // Load .env file
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found, using environment variables")
    }

    return &Config{
        PostgreSQL: DatabaseInfo{
            Host:     getEnv("POSTGRES_HOST", "localhost"),
            Port:     getEnv("POSTGRES_PORT", "5432"),
            User:     getEnv("POSTGRES_USER", "postgres"),
            Password: getEnv("POSTGRES_PASSWORD", "postgres"),
            Database: getEnv("POSTGRES_DATABASE", "main_db"),
        },
        MySQL: DatabaseInfo{
            Host:     getEnv("MYSQL_HOST", "localhost"),
            Port:     getEnv("MYSQL_PORT", "3306"),
            User:     getEnv("MYSQL_USER", "gin_user"),
            Password: getEnv("MYSQL_PASSWORD", "secure_password"),
            Database: getEnv("MYSQL_DATABASE", "product_db"),
            Charset:  getEnv("MYSQL_CHARSET", "utf8mb4"),
        },
        App: AppInfo{
            Environment: getEnv("APP_ENV", "development"),
            Port:        getEnv("PORT", "3000"),
        },
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

### 11. Complete Project Structure

```
gin-mysql-example/
├── cmd/
│   └── api/
│       └── main.go
├── config/
│   ├── database.go         # Multi-database setup
│   ├── pool.go            # Connection pool config
│   └── env.go             # Environment config
├── internal/
│   ├── user/              # PostgreSQL entities
│   │   ├── entity.go
│   │   ├── repository.go
│   │   ├── service.go
│   │   └── handler.go
│   └── product/           # MySQL entities
│       ├── entity.go
│       ├── dto.go
│       ├── repository.go
│       ├── service.go
│       └── handler.go
├── pkg/
│   └── utils/
│       └── uuid.go        # UUID helpers
├── migrations/
│   ├── postgres/
│   │   ├── 000001_create_users.up.sql
│   │   └── 000001_create_users.down.sql
│   └── mysql/
│       ├── 000001_create_products.up.sql
│       └── 000001_create_products.down.sql
├── .env
├── go.mod
└── go.sum
```

## ❌ Common Mistakes + Fix

### 1. ❌ Tidak pakai utf8mb4 (emoji tidak support)

```go
// ❌ SALAH — utf8 legacy (max 3 bytes, emoji fail!)
dsn := "user:pass@tcp(localhost:3306)/db?charset=utf8"
```

```go
// ✅ BENAR — utf8mb4 (4 bytes, support emoji 😎)
dsn := "user:pass@tcp(localhost:3306)/db?charset=utf8mb4&parseTime=True&loc=Local"
```

### 2. ❌ Pakai UUID type seperti PostgreSQL

```go
// ❌ SALAH — MySQL tidak punya UUID type
type User struct {
    ID uuid.UUID `gorm:"type:uuid;primaryKey"`
}
```

```go
// ✅ BENAR — Pakai CHAR(36) atau BINARY(16)
type User struct {
    ID string `gorm:"type:char(36);primaryKey"` // atau
    ID UUIDBinary `gorm:"type:binary(16);primaryKey"`
}
```

### 3. ❌ Lupa parseTime=True di DSN

```go
// ❌ SALAH — time.Time scan error!
dsn := "user:pass@tcp(localhost:3306)/db?charset=utf8mb4"
```

```go
// ✅ BENAR — parseTime=True untuk scan time.Time
dsn := "user:pass@tcp(localhost:3306)/db?charset=utf8mb4&parseTime=True&loc=Local"
```

### 4. ❌ Pakai JSONB di MySQL

```go
// ❌ SALAH — MySQL tidak punya JSONB
type Product struct {
    Metadata datatypes.JSON `gorm:"type:jsonb"`
}
```

```go
// ✅ BENAR — MySQL pakai JSON (bukan JSONB)
type Product struct {
    Metadata datatypes.JSON `gorm:"type:json"`
}
```

### 5. ❌ Fulltext search tanpa FULLTEXT index

```go
// ❌ SALAH — LIKE slow untuk large dataset
db.Where("name LIKE ?", "%"+query+"%").Find(&products)
```

```go
// ✅ BENAR — Pakai FULLTEXT index + MATCH AGAINST
db.Where("MATCH(name, description) AGAINST(? IN NATURAL LANGUAGE MODE)", query).Find(&products)

// Jangan lupa create FULLTEXT index di migration:
// FULLTEXT INDEX idx_search (name, description)
```

### 6. ❌ ENUM values tidak match dengan database

```go
// ❌ SALAH — Mismatch ENUM values
type User struct {
    Role string `gorm:"type:enum('admin','user')"`
}

user.Role = "superadmin" // Error! Value tidak ada di ENUM
```

```go
// ✅ BENAR — Define constants untuk ENUM
type UserRole string

const (
    UserRoleAdmin UserRole = "admin"
    UserRoleUser  UserRole = "user"
)

type User struct {
    Role UserRole `gorm:"type:enum('admin','user')"`
}

user.Role = UserRoleAdmin // Type-safe!
```

### 7. ❌ Timezone tidak konsisten

```go
// ❌ SALAH — Timezone tidak di-set
dsn := "user:pass@tcp(localhost:3306)/db"
```

```go
// ✅ BENAR — Set timezone di DSN dan GORM config
dsn := "user:pass@tcp(localhost:3306)/db?charset=utf8mb4&parseTime=True&loc=Local"

db, _ := gorm.Open(mysql.Open(dsn), &gorm.Config{
    NowFunc: func() time.Time {
        return time.Now().UTC() // Force UTC
    },
})
```

### 8. ❌ Migration dengan syntax PostgreSQL

```sql
-- ❌ SALAH — PostgreSQL syntax di MySQL
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- UUID tidak ada
    metadata JSONB,                                  -- JSONB tidak ada
    tags TEXT[]                                      -- Array tidak ada
);
```

```sql
-- ✅ BENAR — MySQL syntax
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    metadata JSON,
    tags TEXT,  -- Store as comma-separated atau JSON array
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 9. ❌ Connection pool terlalu kecil

```go
// ❌ SALAH — Default pool terlalu kecil untuk production
db, _ := gorm.Open(mysql.Open(dsn), &gorm.Config{})
// MaxIdleConns: 2, MaxOpenConns: unlimited (bahaya!)
```

```go
// ✅ BENAR — Set connection pool yang proper
sqlDB, _ := db.DB()
sqlDB.SetMaxIdleConns(25)               // Idle connections
sqlDB.SetMaxOpenConns(200)              // Maximum open connections
sqlDB.SetConnMaxLifetime(1 * time.Hour) // Connection lifetime
sqlDB.SetConnMaxIdleTime(10 * time.Minute)
```

### 10. ❌ Tidak specify ENGINE dan CHARSET

```sql
-- ❌ SALAH — Default MyISAM (tidak support transaction!)
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY
);
```

```sql
-- ✅ BENAR — Explicit ENGINE=InnoDB dan CHARSET
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## ✅ Checklist Akhir

Setelah belajar ini, pastikan lo bisa:

- [ ] Paham perbedaan MySQL vs PostgreSQL
- [ ] Setup MySQL driver untuk GORM
- [ ] Connect ke MySQL dengan DSN yang benar
- [ ] Pakai charset utf8mb4 (support emoji)
- [ ] Implement UUID di MySQL (CHAR/BINARY)
- [ ] Pakai JSON field dengan datatypes.JSON
- [ ] Setup ENUM type di MySQL model
- [ ] Implement fulltext search dengan MATCH AGAINST
- [ ] Create FULLTEXT index di migration
- [ ] Bikin migration yang compatible MySQL
- [ ] Setup multi-database (PostgreSQL + MySQL)
- [ ] Configure connection pooling untuk MySQL
- [ ] Handle timezone dengan parseTime=True
- [ ] Pakai InnoDB engine untuk transaction support
- [ ] Query optimization dengan proper indexing

## 💭 Ide Pengembangan Mandiri

Setelah paham MySQL dengan GORM, coba kembangkan:

1. **Read Replica Setup:**
   - Master-slave replication MySQL
   - Write ke master, read dari slave
   - GORM dengan multiple DB connections

2. **Database Sharding:**
   - Horizontal sharding berdasarkan user_id
   - Multiple MySQL instances
   - Shard routing logic

3. **Full-text Search Advanced:**
   - Query expansion mode
   - Weighted search (name 2x, description 1x)
   - Highlight matching results
   - Autocomplete dengan LIKE prefix

4. **Stored Procedures:**
   - Complex business logic di DB
   - Call dari GORM dengan db.Raw()
   - Transaction management

5. **Triggers & Events:**
   - Auto-update search_text dengan trigger
   - Scheduled cleanup dengan events
   - Audit log dengan triggers

6. **Performance Monitoring:**
   - Slow query log analysis
   - EXPLAIN untuk query optimization
   - Index usage statistics
   - Connection pool monitoring

7. **Backup & Recovery:**
   - mysqldump automation
   - Point-in-time recovery
   - Binary log setup
   - Automated backup to S3

8. **Migration dari PostgreSQL:**
   - Schema conversion tool
   - Data migration script
   - Dual-write strategy
   - Gradual migration plan

9. **Advanced Indexing:**
   - Composite index optimization
   - Covering index untuk query
   - Index hint dengan GORM
   - Analyze index cardinality

10. **Cloud MySQL:**
    - AWS RDS MySQL setup
    - Google Cloud SQL
    - DigitalOcean Managed MySQL
    - Connection pooling di cloud

---

**Tips Pro:**
- **UTF8MB4 is a MUST** → Default utf8 di MySQL hanya 3 bytes (emoji fail!)
- **CHAR(36) vs BINARY(16)** → BINARY(16) 50% lebih kecil, tapi debugging susah
- **FULLTEXT lebih cepat dari LIKE** → Tapi perlu rebuild index kalau data besar
- **InnoDB only** → MyISAM tidak support transaction & foreign key
- **parseTime=True wajib** → Kalau tidak, time.Time scan error
- **loc=Local vs loc=UTC** → Konsisten di semua service!
- **Connection pool penting!** → Default MySQL timeout 8 jam, set ConnMaxLifetime
- **ENUM performance bagus** → Tapi schema change lebih ribet (harus ALTER)
- **JSON query slower** → Index dengan virtual column kalau sering query
- **MATCH AGAINST punya minimum word length** → Default 4 chars (ft_min_word_len)

**MySQL perfect untuk read-heavy apps** (e-commerce, blog, content site). PostgreSQL better untuk write-heavy & complex transactions! 🐬
