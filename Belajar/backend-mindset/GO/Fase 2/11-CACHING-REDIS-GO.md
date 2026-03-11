# BELAJAR CACHING DENGAN REDIS DI GO

## Penjelasan Konsep

**Redis Caching** adalah strategi menyimpan data yang sering diakses di in-memory database (Redis) untuk mempercepat response time dan mengurangi beban database. Redis sangat cepat karena data disimpan di RAM, bukan disk.

**Analogi TypeScript/Next.js:**
```typescript
// TypeScript dengan ioredis
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
});

// Cache-aside pattern
async function getProduct(id: string) {
  // 1. Check cache
  const cached = await redis.get(`product:${id}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 2. Query database
  const product = await db.products.findById(id);
  
  // 3. Set cache
  await redis.setex(`product:${id}`, 3600, JSON.stringify(product));
  
  return product;
}
```

**Konsep penting:**
1. **Cache-Aside**: Check cache → miss → query DB → set cache
2. **Write-Through**: Update DB dan cache bersamaan
3. **Cache Invalidation**: Hapus cache saat data berubah
4. **TTL (Time To Live)**: Cache expire otomatis setelah durasi tertentu
5. **Cache Stampede**: Banyak request hit DB bersamaan saat cache miss

**Kapan pakai caching:**
- ✅ Data yang sering dibaca, jarang berubah (product list, categories)
- ✅ Query yang expensive/lambat
- ✅ Response yang bisa stale sebentar (5-60 menit)
- ❌ Data yang harus real-time (bank balance, stock inventory)
- ❌ Data pribadi/sensitive yang beda per user

---

## Struktur Project

```
redis-caching-go/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── cache/
│   │   ├── redis.go
│   │   └── cache_service.go
│   ├── domain/
│   │   ├── product.go
│   │   └── session.go
│   ├── dto/
│   │   └── product_dto.go
│   ├── repository/
│   │   └── product_repository.go
│   ├── service/
│   │   ├── product_service.go
│   │   └── auth_service.go
│   ├── handler/
│   │   ├── product_handler.go
│   │   └── auth_handler.go
│   └── middleware/
│       ├── cache_middleware.go
│       ├── auth.go
│       └── error_handler.go
├── pkg/
│   ├── utils/
│   │   ├── hash.go
│   │   └── json.go
│   └── errors/
│       └── app_error.go
├── .env
├── docker-compose.yml
├── go.mod
└── go.sum
```

---

## 1. Setup Dependencies

```bash
# Install dependencies
go get github.com/redis/go-redis/v9
go get github.com/gofiber/fiber/v2
go get github.com/spf13/viper
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/google/uuid
go get github.com/golang-jwt/jwt/v5
go get golang.org/x/crypto/bcrypt
```

**go.mod:**
```go
module redis-caching-go

go 1.21

require (
    github.com/redis/go-redis/v9 v9.4.0
    github.com/gofiber/fiber/v2 v2.52.0
    github.com/spf13/viper v1.18.2
    github.com/google/uuid v1.5.0
    github.com/golang-jwt/jwt/v5 v5.2.0
    golang.org/x/crypto v0.17.0
    gorm.io/gorm v1.25.5
    gorm.io/driver/postgres v1.5.4
)
```

**docker-compose.yml (Redis + PostgreSQL):**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: caching_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  redis-commander:
    image: rediscommander/redis-commander:latest
    environment:
      REDIS_HOSTS: local:redis:6379:0:redis_password
    ports:
      - "8081:8081"
    depends_on:
      - redis

volumes:
  postgres_data:
  redis_data:
```

**Start services:**
```bash
docker-compose up -d

# Check Redis
redis-cli -h localhost -p 6379 -a redis_password ping
# Response: PONG
```

---

## 2. Configuration

**.env:**
```env
# Server
APP_NAME=CachingAPI
APP_ENV=development
PORT=8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=caching_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0
REDIS_POOL_SIZE=10
REDIS_MIN_IDLE_CONNS=5

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRY=24h

# Cache
CACHE_DEFAULT_TTL=3600
CACHE_ENABLED=true
```

**internal/config/config.go:**
```go
package config

import (
    "fmt"
    "time"

    "github.com/spf13/viper"
)

type Config struct {
    App      AppConfig
    Server   ServerConfig
    Database DatabaseConfig
    Redis    RedisConfig
    JWT      JWTConfig
    Cache    CacheConfig
}

type AppConfig struct {
    Name string
    Env  string
}

type ServerConfig struct {
    Port string
}

type DatabaseConfig struct {
    Host     string
    Port     string
    User     string
    Password string
    DBName   string
}

type RedisConfig struct {
    Host            string
    Port            string
    Password        string
    DB              int
    PoolSize        int
    MinIdleConns    int
    ConnMaxLifetime time.Duration
}

type JWTConfig struct {
    Secret string
    Expiry time.Duration
}

type CacheConfig struct {
    DefaultTTL time.Duration
    Enabled    bool
}

func LoadConfig() (*Config, error) {
    viper.SetConfigFile(".env")
    viper.AutomaticEnv()

    if err := viper.ReadInConfig(); err != nil {
        return nil, fmt.Errorf("failed to read config: %w", err)
    }

    jwtExpiry, _ := time.ParseDuration(viper.GetString("JWT_EXPIRY"))
    if jwtExpiry == 0 {
        jwtExpiry = 24 * time.Hour
    }

    cacheTTL := viper.GetDuration("CACHE_DEFAULT_TTL") * time.Second
    if cacheTTL == 0 {
        cacheTTL = 1 * time.Hour
    }

    return &Config{
        App: AppConfig{
            Name: viper.GetString("APP_NAME"),
            Env:  viper.GetString("APP_ENV"),
        },
        Server: ServerConfig{
            Port: viper.GetString("PORT"),
        },
        Database: DatabaseConfig{
            Host:     viper.GetString("DB_HOST"),
            Port:     viper.GetString("DB_PORT"),
            User:     viper.GetString("DB_USER"),
            Password: viper.GetString("DB_PASSWORD"),
            DBName:   viper.GetString("DB_NAME"),
        },
        Redis: RedisConfig{
            Host:            viper.GetString("REDIS_HOST"),
            Port:            viper.GetString("REDIS_PORT"),
            Password:        viper.GetString("REDIS_PASSWORD"),
            DB:              viper.GetInt("REDIS_DB"),
            PoolSize:        viper.GetInt("REDIS_POOL_SIZE"),
            MinIdleConns:    viper.GetInt("REDIS_MIN_IDLE_CONNS"),
            ConnMaxLifetime: 5 * time.Minute,
        },
        JWT: JWTConfig{
            Secret: viper.GetString("JWT_SECRET"),
            Expiry: jwtExpiry,
        },
        Cache: CacheConfig{
            DefaultTTL: cacheTTL,
            Enabled:    viper.GetBool("CACHE_ENABLED"),
        },
    }, nil
}

func (c *DatabaseConfig) DSN() string {
    return fmt.Sprintf(
        "host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
        c.Host, c.Port, c.User, c.Password, c.DBName,
    )
}

func (c *RedisConfig) Address() string {
    return fmt.Sprintf("%s:%s", c.Host, c.Port)
}
```

---

## 3. Redis Client Setup

**internal/cache/redis.go:**
```go
package cache

import (
    "context"
    "fmt"
    "time"

    "redis-caching-go/internal/config"

    "github.com/redis/go-redis/v9"
)

// NewRedisClient creates a new Redis client with connection pooling
func NewRedisClient(cfg *config.Config) (*redis.Client, error) {
    client := redis.NewClient(&redis.Options{
        Addr:     cfg.Redis.Address(),
        Password: cfg.Redis.Password,
        DB:       cfg.Redis.DB,

        // Connection pool settings
        PoolSize:        cfg.Redis.PoolSize,        // Maximum number of connections
        MinIdleConns:    cfg.Redis.MinIdleConns,    // Minimum idle connections
        ConnMaxLifetime: cfg.Redis.ConnMaxLifetime, // Max lifetime of connection
        
        // Timeouts
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
        
        // Retry settings
        MaxRetries: 3,
    })

    // Test connection
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := client.Ping(ctx).Err(); err != nil {
        return nil, fmt.Errorf("failed to connect to Redis: %w", err)
    }

    return client, nil
}
```

---

## 4. Cache Service Interface

**internal/cache/cache_service.go:**
```go
package cache

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

// CacheService defines caching operations
type CacheService interface {
    Get(ctx context.Context, key string) (string, error)
    GetJSON(ctx context.Context, key string, dest interface{}) error
    Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
    SetJSON(ctx context.Context, key string, value interface{}, ttl time.Duration) error
    Delete(ctx context.Context, keys ...string) error
    DeleteByPattern(ctx context.Context, pattern string) error
    Exists(ctx context.Context, key string) (bool, error)
    TTL(ctx context.Context, key string) (time.Duration, error)
    Increment(ctx context.Context, key string) (int64, error)
    SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error)
}

type cacheService struct {
    client *redis.Client
}

// NewCacheService creates a new cache service
func NewCacheService(client *redis.Client) CacheService {
    return &cacheService{client: client}
}

// Get retrieves a string value from cache
func (s *cacheService) Get(ctx context.Context, key string) (string, error) {
    val, err := s.client.Get(ctx, key).Result()
    if err == redis.Nil {
        return "", fmt.Errorf("cache miss: key not found")
    }
    if err != nil {
        return "", fmt.Errorf("cache error: %w", err)
    }
    return val, nil
}

// GetJSON retrieves and unmarshals JSON value from cache
func (s *cacheService) GetJSON(ctx context.Context, key string, dest interface{}) error {
    val, err := s.Get(ctx, key)
    if err != nil {
        return err
    }

    if err := json.Unmarshal([]byte(val), dest); err != nil {
        return fmt.Errorf("failed to unmarshal cache value: %w", err)
    }

    return nil
}

// Set stores a value in cache with TTL
func (s *cacheService) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
    return s.client.Set(ctx, key, value, ttl).Err()
}

// SetJSON marshals and stores a value as JSON in cache
func (s *cacheService) SetJSON(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
    jsonData, err := json.Marshal(value)
    if err != nil {
        return fmt.Errorf("failed to marshal value: %w", err)
    }

    return s.Set(ctx, key, jsonData, ttl)
}

// Delete removes one or more keys from cache
func (s *cacheService) Delete(ctx context.Context, keys ...string) error {
    if len(keys) == 0 {
        return nil
    }
    return s.client.Del(ctx, keys...).Err()
}

// DeleteByPattern removes all keys matching a pattern
func (s *cacheService) DeleteByPattern(ctx context.Context, pattern string) error {
    var cursor uint64
    var deletedCount int

    for {
        // Scan for keys matching pattern
        keys, nextCursor, err := s.client.Scan(ctx, cursor, pattern, 100).Result()
        if err != nil {
            return fmt.Errorf("failed to scan keys: %w", err)
        }

        // Delete found keys
        if len(keys) > 0 {
            if err := s.client.Del(ctx, keys...).Err(); err != nil {
                return fmt.Errorf("failed to delete keys: %w", err)
            }
            deletedCount += len(keys)
        }

        cursor = nextCursor
        if cursor == 0 {
            break
        }
    }

    return nil
}

// Exists checks if a key exists in cache
func (s *cacheService) Exists(ctx context.Context, key string) (bool, error) {
    count, err := s.client.Exists(ctx, key).Result()
    if err != nil {
        return false, err
    }
    return count > 0, nil
}

// TTL returns the remaining time to live of a key
func (s *cacheService) TTL(ctx context.Context, key string) (time.Duration, error) {
    return s.client.TTL(ctx, key).Result()
}

// Increment increments the integer value of a key by 1
func (s *cacheService) Increment(ctx context.Context, key string) (int64, error) {
    return s.client.Incr(ctx, key).Result()
}

// SetNX sets a value only if the key doesn't exist (for mutex/lock)
func (s *cacheService) SetNX(ctx context.Context, key string, value interface{}, ttl time.Duration) (bool, error) {
    return s.client.SetNX(ctx, key, value, ttl).Result()
}
```

---

## 5. Cache Key Patterns

**pkg/utils/cache_keys.go:**
```go
package utils

import (
    "crypto/md5"
    "encoding/hex"
    "fmt"
)

// Cache key patterns untuk konsistensi
const (
    // Product cache keys
    ProductKey      = "product:%s"              // product:uuid
    ProductListKey  = "products:list:%s"        // products:list:hash
    ProductCountKey = "products:count"

    // Session keys
    SessionKey = "session:%s" // session:token

    // JWT blacklist
    JWTBlacklistKey = "jwt:blacklist:%s" // jwt:blacklist:token

    // Rate limiting
    RateLimitKey = "ratelimit:%s:%s" // ratelimit:ip:endpoint

    // Lock keys (untuk cache stampede prevention)
    LockKey = "lock:%s" // lock:resource
)

// BuildProductKey builds cache key for single product
func BuildProductKey(id string) string {
    return fmt.Sprintf(ProductKey, id)
}

// BuildProductListKey builds cache key for product list with filters
func BuildProductListKey(filters map[string]interface{}) string {
    hash := HashFilters(filters)
    return fmt.Sprintf(ProductListKey, hash)
}

// BuildSessionKey builds cache key for session
func BuildSessionKey(token string) string {
    return fmt.Sprintf(SessionKey, token)
}

// BuildJWTBlacklistKey builds cache key for blacklisted JWT token
func BuildJWTBlacklistKey(token string) string {
    return fmt.Sprintf(JWTBlacklistKey, token)
}

// BuildLockKey builds cache key for distributed lock
func BuildLockKey(resource string) string {
    return fmt.Sprintf(LockKey, resource)
}

// HashFilters creates a consistent hash from filters map
func HashFilters(filters map[string]interface{}) string {
    // Convert filters to consistent string representation
    str := fmt.Sprintf("%v", filters)
    
    // MD5 hash
    hash := md5.Sum([]byte(str))
    return hex.EncodeToString(hash[:])
}
```

---

## 6. Domain Models

**internal/domain/product.go:**
```go
package domain

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Product struct {
    ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    Name        string    `gorm:"not null" json:"name"`
    Description string    `json:"description"`
    Price       float64   `gorm:"not null" json:"price"`
    Stock       int       `gorm:"not null;default:0" json:"stock"`
    Category    string    `gorm:"index" json:"category"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

func (p *Product) BeforeCreate(tx *gorm.DB) error {
    if p.ID == uuid.Nil {
        p.ID = uuid.New()
    }
    return nil
}
```

**internal/domain/session.go:**
```go
package domain

import "time"

type Session struct {
    Token     string    `json:"token"`
    UserID    string    `json:"user_id"`
    UserEmail string    `json:"user_email"`
    CreatedAt time.Time `json:"created_at"`
    ExpiresAt time.Time `json:"expires_at"`
}
```

---

## 7. Repository with Caching

**internal/repository/product_repository.go:**
```go
package repository

import (
    "context"
    "fmt"
    "time"

    "redis-caching-go/internal/cache"
    "redis-caching-go/internal/domain"
    "redis-caching-go/pkg/utils"

    "gorm.io/gorm"
)

type ProductRepository interface {
    FindAll(ctx context.Context) ([]domain.Product, error)
    FindByID(ctx context.Context, id string) (*domain.Product, error)
    FindWithFilters(ctx context.Context, filters map[string]interface{}) ([]domain.Product, error)
    Create(ctx context.Context, product *domain.Product) error
    Update(ctx context.Context, product *domain.Product) error
    Delete(ctx context.Context, id string) error
}

type productRepository struct {
    db           *gorm.DB
    cacheService cache.CacheService
    cacheTTL     time.Duration
}

func NewProductRepository(db *gorm.DB, cacheService cache.CacheService, cacheTTL time.Duration) ProductRepository {
    return &productRepository{
        db:           db,
        cacheService: cacheService,
        cacheTTL:     cacheTTL,
    }
}

// FindAll - Cache-Aside pattern
func (r *productRepository) FindAll(ctx context.Context) ([]domain.Product, error) {
    cacheKey := "products:list:all"

    // 1. Try to get from cache
    var products []domain.Product
    err := r.cacheService.GetJSON(ctx, cacheKey, &products)
    if err == nil {
        // Cache hit
        return products, nil
    }

    // 2. Cache miss - query database
    if err := r.db.WithContext(ctx).Find(&products).Error; err != nil {
        return nil, fmt.Errorf("failed to query products: %w", err)
    }

    // 3. Set cache (fire and forget - jangan block response)
    go func() {
        bgCtx := context.Background()
        r.cacheService.SetJSON(bgCtx, cacheKey, products, r.cacheTTL)
    }()

    return products, nil
}

// FindByID - Cache-Aside with cache stampede prevention
func (r *productRepository) FindByID(ctx context.Context, id string) (*domain.Product, error) {
    cacheKey := utils.BuildProductKey(id)

    // 1. Try to get from cache
    var product domain.Product
    err := r.cacheService.GetJSON(ctx, cacheKey, &product)
    if err == nil {
        // Cache hit
        return &product, nil
    }

    // 2. Cache stampede prevention: acquire lock
    lockKey := utils.BuildLockKey(cacheKey)
    acquired, _ := r.cacheService.SetNX(ctx, lockKey, "locked", 10*time.Second)

    if !acquired {
        // Another goroutine is fetching data, wait and retry from cache
        time.Sleep(100 * time.Millisecond)
        err := r.cacheService.GetJSON(ctx, cacheKey, &product)
        if err == nil {
            return &product, nil
        }
    }

    // 3. Query database
    if err := r.db.WithContext(ctx).Where("id = ?", id).First(&product).Error; err != nil {
        r.cacheService.Delete(ctx, lockKey) // Release lock
        return nil, err
    }

    // 4. Set cache
    r.cacheService.SetJSON(ctx, cacheKey, product, r.cacheTTL)
    r.cacheService.Delete(ctx, lockKey) // Release lock

    return &product, nil
}

// FindWithFilters - Cache with filter hash
func (r *productRepository) FindWithFilters(ctx context.Context, filters map[string]interface{}) ([]domain.Product, error) {
    cacheKey := utils.BuildProductListKey(filters)

    // 1. Try cache
    var products []domain.Product
    err := r.cacheService.GetJSON(ctx, cacheKey, &products)
    if err == nil {
        return products, nil
    }

    // 2. Query database
    query := r.db.WithContext(ctx)

    if category, ok := filters["category"].(string); ok && category != "" {
        query = query.Where("category = ?", category)
    }
    if minPrice, ok := filters["min_price"].(float64); ok && minPrice > 0 {
        query = query.Where("price >= ?", minPrice)
    }
    if maxPrice, ok := filters["max_price"].(float64); ok && maxPrice > 0 {
        query = query.Where("price <= ?", maxPrice)
    }

    if err := query.Find(&products).Error; err != nil {
        return nil, err
    }

    // 3. Set cache
    go r.cacheService.SetJSON(context.Background(), cacheKey, products, r.cacheTTL)

    return products, nil
}

// Create - Write-Through pattern
func (r *productRepository) Create(ctx context.Context, product *domain.Product) error {
    // 1. Write to database
    if err := r.db.WithContext(ctx).Create(product).Error; err != nil {
        return err
    }

    // 2. Invalidate list caches (could be affected by new product)
    go r.invalidateListCaches(ctx)

    return nil
}

// Update - Write-Through pattern
func (r *productRepository) Update(ctx context.Context, product *domain.Product) error {
    // 1. Update database
    if err := r.db.WithContext(ctx).Save(product).Error; err != nil {
        return err
    }

    // 2. Invalidate cache for this product
    cacheKey := utils.BuildProductKey(product.ID.String())
    go r.cacheService.Delete(context.Background(), cacheKey)

    // 3. Invalidate list caches
    go r.invalidateListCaches(ctx)

    return nil
}

// Delete - Write-Through pattern
func (r *productRepository) Delete(ctx context.Context, id string) error {
    // 1. Delete from database
    if err := r.db.WithContext(ctx).Delete(&domain.Product{}, "id = ?", id).Error; err != nil {
        return err
    }

    // 2. Invalidate cache
    cacheKey := utils.BuildProductKey(id)
    go r.cacheService.Delete(context.Background(), cacheKey)

    // 3. Invalidate list caches
    go r.invalidateListCaches(ctx)

    return nil
}

// invalidateListCaches invalidates all product list caches
func (r *productRepository) invalidateListCaches(ctx context.Context) {
    // Delete all product list caches
    r.cacheService.DeleteByPattern(context.Background(), "products:list:*")
}
```

---

## 8. Cache Middleware

**internal/middleware/cache_middleware.go:**
```go
package middleware

import (
    "bytes"
    "context"
    "crypto/md5"
    "encoding/hex"
    "fmt"
    "io"
    "time"

    "redis-caching-go/internal/cache"

    "github.com/gofiber/fiber/v2"
)

// CacheConfig for cache middleware
type CacheConfig struct {
    CacheService cache.CacheService
    TTL          time.Duration
    CacheControl string
}

// NewCacheMiddleware creates cache middleware for GET requests
func NewCacheMiddleware(config CacheConfig) fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Only cache GET requests
        if c.Method() != fiber.MethodGet {
            return c.Next()
        }

        // Build cache key from URL + query params
        cacheKey := buildCacheKeyFromRequest(c)
        ctx := context.Background()

        // Try to get from cache
        cached, err := config.CacheService.Get(ctx, cacheKey)
        if err == nil {
            // Cache HIT
            c.Set("X-Cache", "HIT")
            c.Set("Content-Type", "application/json")
            if config.CacheControl != "" {
                c.Set("Cache-Control", config.CacheControl)
            }
            return c.SendString(cached)
        }

        // Cache MISS - capture response
        c.Set("X-Cache", "MISS")

        // Create response recorder
        originalWriter := c.Response().BodyWriter()
        buf := new(bytes.Buffer)
        multiWriter := io.MultiWriter(originalWriter, buf)
        c.Response().SetBodyWriter(multiWriter)

        // Execute request
        if err := c.Next(); err != nil {
            return err
        }

        // Only cache successful responses (2xx)
        if c.Response().StatusCode() >= 200 && c.Response().StatusCode() < 300 {
            // Cache the response body
            go func() {
                bgCtx := context.Background()
                config.CacheService.Set(bgCtx, cacheKey, buf.String(), config.TTL)
            }()
        }

        return nil
    }
}

// buildCacheKeyFromRequest creates consistent cache key from request
func buildCacheKeyFromRequest(c *fiber.Ctx) string {
    // Include path and query string
    key := c.Path() + "?" + string(c.Request().URI().QueryString())
    
    // Hash the key to keep it short
    hash := md5.Sum([]byte(key))
    return fmt.Sprintf("response:%s", hex.EncodeToString(hash[:]))
}
```

---

## 9. Auth Service dengan Redis Session & JWT Blacklist

**internal/service/auth_service.go:**
```go
package service

import (
    "context"
    "fmt"
    "time"

    "redis-caching-go/internal/cache"
    "redis-caching-go/internal/domain"
    "redis-caching-go/pkg/utils"

    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
)

type AuthService interface {
    CreateSession(ctx context.Context, userID, userEmail string) (*domain.Session, error)
    GetSession(ctx context.Context, token string) (*domain.Session, error)
    DeleteSession(ctx context.Context, token string) error
    BlacklistJWT(ctx context.Context, token string, expiresAt time.Time) error
    IsJWTBlacklisted(ctx context.Context, token string) (bool, error)
}

type authService struct {
    cacheService cache.CacheService
    jwtSecret    string
    sessionTTL   time.Duration
}

func NewAuthService(cacheService cache.CacheService, jwtSecret string, sessionTTL time.Duration) AuthService {
    return &authService{
        cacheService: cacheService,
        jwtSecret:    jwtSecret,
        sessionTTL:   sessionTTL,
    }
}

// CreateSession creates a new session in Redis
func (s *authService) CreateSession(ctx context.Context, userID, userEmail string) (*domain.Session, error) {
    session := &domain.Session{
        Token:     uuid.New().String(),
        UserID:    userID,
        UserEmail: userEmail,
        CreatedAt: time.Now(),
        ExpiresAt: time.Now().Add(s.sessionTTL),
    }

    // Store in Redis
    cacheKey := utils.BuildSessionKey(session.Token)
    if err := s.cacheService.SetJSON(ctx, cacheKey, session, s.sessionTTL); err != nil {
        return nil, fmt.Errorf("failed to create session: %w", err)
    }

    return session, nil
}

// GetSession retrieves session from Redis
func (s *authService) GetSession(ctx context.Context, token string) (*domain.Session, error) {
    var session domain.Session
    cacheKey := utils.BuildSessionKey(token)

    if err := s.cacheService.GetJSON(ctx, cacheKey, &session); err != nil {
        return nil, fmt.Errorf("session not found or expired")
    }

    // Check if expired
    if time.Now().After(session.ExpiresAt) {
        s.cacheService.Delete(ctx, cacheKey)
        return nil, fmt.Errorf("session expired")
    }

    return &session, nil
}

// DeleteSession removes session from Redis (logout)
func (s *authService) DeleteSession(ctx context.Context, token string) error {
    cacheKey := utils.BuildSessionKey(token)
    return s.cacheService.Delete(ctx, cacheKey)
}

// BlacklistJWT adds JWT token to blacklist (for logout before expiry)
func (s *authService) BlacklistJWT(ctx context.Context, tokenString string, expiresAt time.Time) error {
    cacheKey := utils.BuildJWTBlacklistKey(tokenString)
    
    // Calculate TTL until token naturally expires
    ttl := time.Until(expiresAt)
    if ttl <= 0 {
        return nil // Already expired, no need to blacklist
    }

    // Add to blacklist with TTL
    return s.cacheService.Set(ctx, cacheKey, "blacklisted", ttl)
}

// IsJWTBlacklisted checks if JWT token is blacklisted
func (s *authService) IsJWTBlacklisted(ctx context.Context, tokenString string) (bool, error) {
    cacheKey := utils.BuildJWTBlacklistKey(tokenString)
    return s.cacheService.Exists(ctx, cacheKey)
}

// ParseJWT parses and validates JWT token
func (s *authService) ParseJWT(tokenString string) (*jwt.MapClaims, error) {
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        return []byte(s.jwtSecret), nil
    })

    if err != nil || !token.Valid {
        return nil, fmt.Errorf("invalid token")
    }

    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
        return nil, fmt.Errorf("invalid token claims")
    }

    return &claims, nil
}
```

---

## 10. Product Service

**internal/service/product_service.go:**
```go
package service

import (
    "context"

    "redis-caching-go/internal/domain"
    "redis-caching-go/internal/dto"
    "redis-caching-go/internal/repository"
    "redis-caching-go/pkg/errors"
)

type ProductService interface {
    GetAll(ctx context.Context) ([]domain.Product, error)
    GetByID(ctx context.Context, id string) (*domain.Product, error)
    Search(ctx context.Context, req dto.SearchProductRequest) ([]domain.Product, error)
    Create(ctx context.Context, req dto.CreateProductRequest) (*domain.Product, error)
    Update(ctx context.Context, id string, req dto.UpdateProductRequest) (*domain.Product, error)
    Delete(ctx context.Context, id string) error
}

type productService struct {
    productRepo repository.ProductRepository
}

func NewProductService(productRepo repository.ProductRepository) ProductService {
    return &productService{productRepo: productRepo}
}

func (s *productService) GetAll(ctx context.Context) ([]domain.Product, error) {
    return s.productRepo.FindAll(ctx)
}

func (s *productService) GetByID(ctx context.Context, id string) (*domain.Product, error) {
    product, err := s.productRepo.FindByID(ctx, id)
    if err != nil {
        return nil, errors.NewNotFoundError("Product not found")
    }
    return product, nil
}

func (s *productService) Search(ctx context.Context, req dto.SearchProductRequest) ([]domain.Product, error) {
    filters := make(map[string]interface{})
    if req.Category != "" {
        filters["category"] = req.Category
    }
    if req.MinPrice > 0 {
        filters["min_price"] = req.MinPrice
    }
    if req.MaxPrice > 0 {
        filters["max_price"] = req.MaxPrice
    }

    return s.productRepo.FindWithFilters(ctx, filters)
}

func (s *productService) Create(ctx context.Context, req dto.CreateProductRequest) (*domain.Product, error) {
    product := &domain.Product{
        Name:        req.Name,
        Description: req.Description,
        Price:       req.Price,
        Stock:       req.Stock,
        Category:    req.Category,
    }

    if err := s.productRepo.Create(ctx, product); err != nil {
        return nil, errors.WrapError(err, "Failed to create product")
    }

    return product, nil
}

func (s *productService) Update(ctx context.Context, id string, req dto.UpdateProductRequest) (*domain.Product, error) {
    product, err := s.productRepo.FindByID(ctx, id)
    if err != nil {
        return nil, errors.NewNotFoundError("Product not found")
    }

    if req.Name != "" {
        product.Name = req.Name
    }
    if req.Description != "" {
        product.Description = req.Description
    }
    if req.Price > 0 {
        product.Price = req.Price
    }
    if req.Stock >= 0 {
        product.Stock = req.Stock
    }
    if req.Category != "" {
        product.Category = req.Category
    }

    if err := s.productRepo.Update(ctx, product); err != nil {
        return nil, errors.WrapError(err, "Failed to update product")
    }

    return product, nil
}

func (s *productService) Delete(ctx context.Context, id string) error {
    if err := s.productRepo.Delete(ctx, id); err != nil {
        return errors.WrapError(err, "Failed to delete product")
    }
    return nil
}
```

---

## 11. DTOs

**internal/dto/product_dto.go:**
```go
package dto

type CreateProductRequest struct {
    Name        string  `json:"name" validate:"required,min=3,max=100"`
    Description string  `json:"description"`
    Price       float64 `json:"price" validate:"required,gt=0"`
    Stock       int     `json:"stock" validate:"gte=0"`
    Category    string  `json:"category" validate:"required"`
}

type UpdateProductRequest struct {
    Name        string  `json:"name" validate:"omitempty,min=3,max=100"`
    Description string  `json:"description"`
    Price       float64 `json:"price" validate:"omitempty,gt=0"`
    Stock       int     `json:"stock" validate:"gte=0"`
    Category    string  `json:"category"`
}

type SearchProductRequest struct {
    Category string  `query:"category"`
    MinPrice float64 `query:"min_price"`
    MaxPrice float64 `query:"max_price"`
}
```

---

## 12. Handlers

**internal/handler/product_handler.go:**
```go
package handler

import (
    "redis-caching-go/internal/dto"
    "redis-caching-go/internal/service"
    "redis-caching-go/pkg/errors"

    "github.com/gofiber/fiber/v2"
)

type ProductHandler struct {
    productService service.ProductService
}

func NewProductHandler(productService service.ProductService) *ProductHandler {
    return &ProductHandler{productService: productService}
}

func (h *ProductHandler) GetAll(c *fiber.Ctx) error {
    products, err := h.productService.GetAll(c.Context())
    if err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "data": products,
    })
}

func (h *ProductHandler) GetByID(c *fiber.Ctx) error {
    id := c.Params("id")

    product, err := h.productService.GetByID(c.Context(), id)
    if err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "data": product,
    })
}

func (h *ProductHandler) Search(c *fiber.Ctx) error {
    var req dto.SearchProductRequest
    if err := c.QueryParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid query parameters")
    }

    products, err := h.productService.Search(c.Context(), req)
    if err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "data": products,
    })
}

func (h *ProductHandler) Create(c *fiber.Ctx) error {
    var req dto.CreateProductRequest
    if err := c.BodyParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid request body")
    }

    product, err := h.productService.Create(c.Context(), req)
    if err != nil {
        return err
    }

    return c.Status(fiber.StatusCreated).JSON(fiber.Map{
        "data": product,
    })
}

func (h *ProductHandler) Update(c *fiber.Ctx) error {
    id := c.Params("id")

    var req dto.UpdateProductRequest
    if err := c.BodyParser(&req); err != nil {
        return errors.NewBadRequestError("Invalid request body")
    }

    product, err := h.productService.Update(c.Context(), id, req)
    if err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "data": product,
    })
}

func (h *ProductHandler) Delete(c *fiber.Ctx) error {
    id := c.Params("id")

    if err := h.productService.Delete(c.Context(), id); err != nil {
        return err
    }

    return c.JSON(fiber.Map{
        "message": "Product deleted successfully",
    })
}
```

---

## 13. Main Application

**cmd/api/main.go:**
```go
package main

import (
    "log"
    "time"

    "redis-caching-go/internal/cache"
    "redis-caching-go/internal/config"
    "redis-caching-go/internal/domain"
    "redis-caching-go/internal/handler"
    "redis-caching-go/internal/middleware"
    "redis-caching-go/internal/repository"
    "redis-caching-go/internal/service"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

func main() {
    // Load config
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatal("Failed to load config:", err)
    }

    // Connect to PostgreSQL
    db, err := gorm.Open(postgres.Open(cfg.Database.DSN()), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect database:", err)
    }

    // Auto migrate
    if err := db.AutoMigrate(&domain.Product{}); err != nil {
        log.Fatal("Failed to migrate database:", err)
    }

    // Connect to Redis
    redisClient, err := cache.NewRedisClient(cfg)
    if err != nil {
        log.Fatal("Failed to connect to Redis:", err)
    }
    defer redisClient.Close()

    log.Println("✅ Redis connected successfully")

    // Initialize cache service
    cacheService := cache.NewCacheService(redisClient)

    // Initialize repositories
    productRepo := repository.NewProductRepository(db, cacheService, cfg.Cache.DefaultTTL)

    // Initialize services
    productService := service.NewProductService(productRepo)
    authService := service.NewAuthService(cacheService, cfg.JWT.Secret, cfg.JWT.Expiry)

    // Initialize handlers
    productHandler := handler.NewProductHandler(productService)

    // Create Fiber app
    app := fiber.New(fiber.Config{
        ErrorHandler: middleware.ErrorHandler,
    })

    // Global middleware
    app.Use(recover.New())
    app.Use(logger.New())

    // Routes
    api := app.Group("/api")

    // Products (dengan cache middleware untuk GET requests)
    products := api.Group("/products")
    {
        // Cache middleware untuk list dan search
        cacheMiddleware := middleware.NewCacheMiddleware(middleware.CacheConfig{
            CacheService: cacheService,
            TTL:          5 * time.Minute,
            CacheControl: "public, max-age=300",
        })

        products.Get("/", cacheMiddleware, productHandler.GetAll)
        products.Get("/search", cacheMiddleware, productHandler.Search)
        products.Get("/:id", productHandler.GetByID) // Individual cache handled in repository
        products.Post("/", productHandler.Create)
        products.Put("/:id", productHandler.Update)
        products.Delete("/:id", productHandler.Delete)
    }

    // Health check
    app.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{
            "status": "ok",
            "cache":  "enabled",
        })
    })

    // Cache stats endpoint
    app.Get("/cache/stats", func(c *fiber.Ctx) error {
        info := redisClient.Info(c.Context(), "stats").Val()
        return c.SendString(info)
    })

    // Clear cache endpoint (development only)
    if cfg.App.Env == "development" {
        app.Delete("/cache/clear", func(c *fiber.Ctx) error {
            pattern := c.Query("pattern", "*")
            if err := cacheService.DeleteByPattern(c.Context(), pattern); err != nil {
                return err
            }
            return c.JSON(fiber.Map{
                "message": "Cache cleared",
                "pattern": pattern,
            })
        })
    }

    // Start server
    port := cfg.Server.Port
    log.Printf("🚀 Server running on port %s", port)
    log.Printf("📊 Redis Dashboard: http://localhost:8081")
    log.Printf("💾 Cache TTL: %s", cfg.Cache.DefaultTTL)

    // Store auth service for future use
    _ = authService

    if err := app.Listen(":" + port); err != nil {
        log.Fatal(err)
    }
}
```

---

## 14. Redis Pipeline & Transaction

**Example usage:**
```go
package examples

import (
    "context"
    "fmt"

    "github.com/redis/go-redis/v9"
)

// Pipeline: batch multiple commands for better performance
func PipelineExample(client *redis.Client) error {
    ctx := context.Background()

    // Create pipeline
    pipe := client.Pipeline()

    // Queue commands (not executed yet)
    pipe.Set(ctx, "key1", "value1", 0)
    pipe.Set(ctx, "key2", "value2", 0)
    pipe.Incr(ctx, "counter")
    pipe.Get(ctx, "key1")

    // Execute all commands at once
    cmds, err := pipe.Exec(ctx)
    if err != nil {
        return err
    }

    fmt.Printf("Executed %d commands\n", len(cmds))
    return nil
}

// Transaction: atomic execution (all or nothing)
func TransactionExample(client *redis.Client) error {
    ctx := context.Background()

    // Watch keys for changes
    err := client.Watch(ctx, func(tx *redis.Tx) error {
        // Get current value
        val, err := tx.Get(ctx, "balance").Int()
        if err != nil && err != redis.Nil {
            return err
        }

        // Check business logic
        if val < 100 {
            return fmt.Errorf("insufficient balance")
        }

        // Transaction pipeline
        _, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
            pipe.Decrby(ctx, "balance", 100)
            pipe.Incr(ctx, "transactions")
            return nil
        })

        return err
    }, "balance")

    return err
}

// Bulk operations with pipeline
func BulkSetProducts(client *redis.Client, products map[string]interface{}) error {
    ctx := context.Background()

    pipe := client.Pipeline()
    for key, value := range products {
        pipe.Set(ctx, key, value, 0)
    }

    _, err := pipe.Exec(ctx)
    return err
}
```

---

## Testing & Monitoring

### 1. Test Cache Hit/Miss
```bash
# First request (cache miss)
curl -i http://localhost:8080/api/products
# Headers:
# X-Cache: MISS

# Second request (cache hit)
curl -i http://localhost:8080/api/products
# Headers:
# X-Cache: HIT
```

### 2. Monitor Redis
```bash
# Redis CLI
redis-cli -h localhost -p 6379 -a redis_password

# Monitor all commands in real-time
MONITOR

# Get info and stats
INFO stats
INFO memory

# Check keys
KEYS *
KEYS products:*

# Get key value
GET product:some-uuid

# Check TTL
TTL product:some-uuid

# Delete pattern
KEYS products:list:* | xargs redis-cli -a redis_password DEL
```

### 3. Clear Cache
```bash
# Clear all product caches
curl -X DELETE "http://localhost:8080/cache/clear?pattern=products:*"

# Clear all caches
curl -X DELETE "http://localhost:8080/cache/clear?pattern=*"
```

### 4. View Redis Dashboard
```
Open browser: http://localhost:8081
```

---

## 8 Kesalahan Umum & Solusinya

### 1. **Cache stampede - banyak request hit DB bersamaan**
**Masalah:**
```go
// ❌ BAHAYA: Saat cache expire, banyak request query DB bersamaan
func GetProduct(id string) (*Product, error) {
    cached, err := cache.Get(key)
    if err != nil {
        // 1000 concurrent requests semua hit DB!
        product := db.Query(id)
        cache.Set(key, product)
        return product
    }
    return cached
}
```

**Solusi:**
```go
// ✅ AMAN: Gunakan distributed lock dengan SETNX
lockKey := "lock:" + key
acquired, _ := cache.SetNX(lockKey, "locked", 10*time.Second)

if !acquired {
    // Wait dan retry dari cache
    time.Sleep(100 * time.Millisecond)
    return cache.Get(key)
}

// Only one request queries DB
product := db.Query(id)
cache.Set(key, product, ttl)
cache.Delete(lockKey)
```

---

### 2. **Lupa invalidate cache saat data berubah**
**Masalah:**
```go
// ❌ BAHAYA: Update DB tapi cache masih punya data lama
func UpdateProduct(product *Product) error {
    db.Save(product)
    // Lupa invalidate cache!
    return nil
}
// User masih lihat data lama sampai cache expire
```

**Solusi:**
```go
// ✅ AMAN: Write-Through pattern
func UpdateProduct(product *Product) error {
    // 1. Update DB
    db.Save(product)
    
    // 2. Invalidate cache
    cache.Delete("product:" + product.ID)
    cache.DeleteByPattern("products:list:*")
    
    return nil
}
```

---

### 3. **TTL terlalu panjang untuk data yang sering berubah**
**Masalah:**
```go
// ❌ BAHAYA: Stock berubah cepat tapi cache 1 jam
cache.Set("product:stock:" + id, stock, 1*time.Hour)
// Stock sold out tapi user masih lihat available
```

**Solusi:**
```go
// ✅ AMAN: TTL pendek untuk data volatile
cache.Set("product:stock:" + id, stock, 30*time.Second)

// Atau gunakan Write-Through (invalidate saat update)
func UpdateStock(id string, newStock int) {
    db.UpdateStock(id, newStock)
    cache.Delete("product:stock:" + id)
}
```

---

### 4. **Tidak handle JSON marshal error**
**Masalah:**
```go
// ❌ BAHAYA: Panic jika struct punya field yang tidak bisa di-marshal
data, _ := json.Marshal(product) // Ignore error
cache.Set(key, data, ttl)
```

**Solusi:**
```go
// ✅ AMAN: Handle error
data, err := json.Marshal(product)
if err != nil {
    return fmt.Errorf("failed to marshal: %w", err)
}

if err := cache.Set(key, data, ttl); err != nil {
    // Log error tapi jangan fail request
    log.Printf("Cache set failed: %v", err)
}
```

---

### 5. **Cache key collision**
**Masalah:**
```go
// ❌ BAHAYA: Key tidak unique, data tercampur
cache.Set("list", products, ttl)     // Produk apa?
cache.Set("123", product, ttl)       // ID produk atau user?
```

**Solusi:**
```go
// ✅ AMAN: Gunakan namespace dan consistent pattern
cache.Set("products:list:all", products, ttl)
cache.Set("product:123", product, ttl)
cache.Set("user:123", user, ttl)

// Atau buat helper function
func BuildProductKey(id string) string {
    return fmt.Sprintf("product:%s", id)
}
```

---

### 6. **Blocking main goroutine untuk cache operation**
**Masalah:**
```go
// ❌ LAMBAT: Cache operation block response
func GetProducts() ([]Product, error) {
    products := db.FindAll()
    
    // Block sampai cache set selesai
    cache.Set("products:list", products, ttl)
    
    return products
}
```

**Solusi:**
```go
// ✅ CEPAT: Fire and forget untuk set cache
func GetProducts() ([]Product, error) {
    products := db.FindAll()
    
    // Async cache set (jangan block response)
    go cache.Set("products:list", products, ttl)
    
    return products
}
```

---

### 7. **Memory leak: cache tanpa TTL**
**Masalah:**
```go
// ❌ BAHAYA: Cache tidak pernah expire, Redis memory penuh
cache.Set(key, value, 0) // TTL = 0 means no expiration!
```

**Solusi:**
```go
// ✅ AMAN: Selalu set TTL
cache.Set(key, value, 1*time.Hour)

// Monitor Redis memory
redis-cli INFO memory
# maxmemory_policy: allkeys-lru (evict least recently used)
```

---

### 8. **Tidak gunakan connection pooling**
**Masalah:**
```go
// ❌ LAMBAT: Buat koneksi baru setiap request
func GetFromCache(key string) string {
    client := redis.NewClient(&redis.Options{...})
    defer client.Close()
    return client.Get(ctx, key).Val()
}
```

**Solusi:**
```go
// ✅ CEPAT: Gunakan connection pool (reuse connections)
var redisClient *redis.Client // Global client

func init() {
    redisClient = redis.NewClient(&redis.Options{
        PoolSize:     10,           // Max connections
        MinIdleConns: 5,            // Min idle connections
        PoolTimeout:  4 * time.Second,
    })
}
```

---

## 10 Ide Pengembangan

### 1. **Cache Warming: Pre-populate cache saat startup**
```go
func WarmCache(db *gorm.DB, cache CacheService) {
    log.Println("Warming cache...")
    
    // Load popular products
    var products []Product
    db.Order("view_count DESC").Limit(100).Find(&products)
    
    for _, product := range products {
        key := BuildProductKey(product.ID)
        cache.SetJSON(context.Background(), key, product, 1*time.Hour)
    }
    
    log.Println("Cache warmed successfully")
}
```

---

### 2. **Multi-level Caching: Local cache + Redis**
```go
type MultiLevelCache struct {
    localCache  *sync.Map  // In-memory local cache
    redisCache  CacheService
    localTTL    time.Duration
    redisTTL    time.Duration
}

func (m *MultiLevelCache) Get(key string) (interface{}, error) {
    // L1: Check local cache (fastest)
    if val, ok := m.localCache.Load(key); ok {
        return val, nil
    }
    
    // L2: Check Redis
    var data interface{}
    if err := m.redisCache.GetJSON(context.Background(), key, &data); err == nil {
        // Store in local cache
        m.localCache.Store(key, data)
        return data, nil
    }
    
    return nil, fmt.Errorf("cache miss")
}
```

---

### 3. **Cache Tags: Group invalidation**
```go
type TaggedCache struct {
    cache CacheService
}

func (t *TaggedCache) SetWithTags(key string, value interface{}, ttl time.Duration, tags []string) error {
    // Set main cache
    if err := t.cache.SetJSON(context.Background(), key, value, ttl); err != nil {
        return err
    }
    
    // Associate with tags
    for _, tag := range tags {
        tagKey := "tag:" + tag
        t.cache.SAdd(context.Background(), tagKey, key)
    }
    
    return nil
}

func (t *TaggedCache) InvalidateTag(tag string) error {
    tagKey := "tag:" + tag
    
    // Get all keys for this tag
    keys := t.cache.SMembers(context.Background(), tagKey)
    
    // Delete all keys
    return t.cache.Delete(context.Background(), keys...)
}

// Usage:
cache.SetWithTags("product:123", product, ttl, []string{"products", "electronics"})
cache.InvalidateTag("electronics") // Invalidate all electronics
```

---

### 4. **Cache Metrics & Analytics**
```go
type CacheMetrics struct {
    Hits   int64
    Misses int64
    Sets   int64
    Deletes int64
}

type MeteredCache struct {
    cache   CacheService
    metrics *CacheMetrics
    mu      sync.Mutex
}

func (m *MeteredCache) Get(key string) (string, error) {
    val, err := m.cache.Get(context.Background(), key)
    
    m.mu.Lock()
    if err == nil {
        m.metrics.Hits++
    } else {
        m.metrics.Misses++
    }
    m.mu.Unlock()
    
    return val, err
}

func (m *MeteredCache) GetHitRate() float64 {
    total := m.metrics.Hits + m.metrics.Misses
    if total == 0 {
        return 0
    }
    return float64(m.metrics.Hits) / float64(total) * 100
}
```

---

### 5. **Distributed Lock Pattern**
```go
type DistributedLock struct {
    cache    CacheService
    key      string
    value    string
    ttl      time.Duration
}

func (l *DistributedLock) Acquire(ctx context.Context) (bool, error) {
    acquired, err := l.cache.SetNX(ctx, l.key, l.value, l.ttl)
    return acquired, err
}

func (l *DistributedLock) Release(ctx context.Context) error {
    // Only delete if value matches (prevent deleting someone else's lock)
    script := `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
    `
    // Execute Lua script atomically
    return l.cache.Eval(ctx, script, []string{l.key}, l.value)
}

// Usage:
lock := &DistributedLock{
    cache: cacheService,
    key:   "lock:expensive_operation",
    value: uuid.New().String(),
    ttl:   10 * time.Second,
}

if acquired, _ := lock.Acquire(ctx); acquired {
    defer lock.Release(ctx)
    // Do expensive operation
}
```

---

### 6. **Cache-Aside with Single Flight**
```go
import "golang.org/x/sync/singleflight"

type SingleFlightCache struct {
    cache CacheService
    group singleflight.Group
}

func (s *SingleFlightCache) GetOrLoad(key string, loader func() (interface{}, error)) (interface{}, error) {
    // Check cache
    var data interface{}
    if err := s.cache.GetJSON(context.Background(), key, &data); err == nil {
        return data, nil
    }
    
    // Use singleflight to prevent stampede
    val, err, _ := s.group.Do(key, func() (interface{}, error) {
        // Check cache again (maybe another request loaded it)
        if err := s.cache.GetJSON(context.Background(), key, &data); err == nil {
            return data, nil
        }
        
        // Load from source
        result, err := loader()
        if err != nil {
            return nil, err
        }
        
        // Set cache
        s.cache.SetJSON(context.Background(), key, result, 1*time.Hour)
        return result, nil
    })
    
    return val, err
}
```

---

### 7. **Adaptive TTL based on access frequency**
```go
type AdaptiveTTLCache struct {
    cache CacheService
}

func (a *AdaptiveTTLCache) Set(key string, value interface{}) error {
    // Track access count
    countKey := "access_count:" + key
    count, _ := a.cache.Increment(context.Background(), countKey)
    
    // Calculate TTL based on access frequency
    var ttl time.Duration
    switch {
    case count > 1000:
        ttl = 24 * time.Hour // Very popular: cache longer
    case count > 100:
        ttl = 6 * time.Hour  // Popular
    case count > 10:
        ttl = 1 * time.Hour  // Moderate
    default:
        ttl = 15 * time.Minute // Unpopular: cache shorter
    }
    
    return a.cache.SetJSON(context.Background(), key, value, ttl)
}
```

---

### 8. **Cache Preloader Worker**
```go
func StartCachePreloader(db *gorm.DB, cache CacheService) {
    ticker := time.NewTicker(10 * time.Minute)
    
    go func() {
        for range ticker.C {
            // Preload trending products
            var products []Product
            db.Where("created_at > ?", time.Now().Add(-24*time.Hour)).
               Order("view_count DESC").
               Limit(50).
               Find(&products)
            
            // Cache them
            for _, p := range products {
                key := BuildProductKey(p.ID)
                cache.SetJSON(context.Background(), key, p, 1*time.Hour)
            }
            
            log.Println("Cache preloaded:", len(products), "products")
        }
    }()
}
```

---

### 9. **Cache Aside with Probabilistic Expiry**
```go
// Prevent cache stampede dengan probabilistic early expiry
func (r *Repository) GetWithProbabilisticExpiry(key string, ttl time.Duration) (*Product, error) {
    var product Product
    
    // Get from cache
    err := cache.GetJSON(context.Background(), key, &product)
    if err == nil {
        // Check remaining TTL
        remaining, _ := cache.TTL(context.Background(), key)
        
        // Probabilistic early refresh
        // If TTL < 20% of original, 20% chance to refresh early
        if remaining < ttl/5 {
            if rand.Float64() < 0.2 {
                go r.refreshCache(key, ttl)
            }
        }
        
        return &product, nil
    }
    
    // Cache miss: load from DB
    return r.loadFromDB(key, ttl)
}
```

---

### 10. **Redis Pub/Sub for Cache Invalidation**
```go
// Multi-instance cache invalidation via pub/sub
type PubSubCache struct {
    cache     CacheService
    pubsub    *redis.PubSub
    localCache *sync.Map
}

func (p *PubSubCache) Subscribe() {
    ch := p.pubsub.Channel()
    
    go func() {
        for msg := range ch {
            // Invalidate local cache when Redis publishes
            p.localCache.Delete(msg.Payload)
            log.Printf("Invalidated local cache: %s", msg.Payload)
        }
    }()
}

func (p *PubSubCache) Delete(key string) error {
    // Delete from Redis
    if err := p.cache.Delete(context.Background(), key); err != nil {
        return err
    }
    
    // Publish to all instances
    return p.cache.Publish(context.Background(), "cache:invalidate", key)
}
```

---

## Kesimpulan

**Redis Caching** adalah strategi essential untuk scaling aplikasi. Key points:

1. **Cache-Aside Pattern**: Check cache → miss → query DB → set cache
2. **Write-Through Pattern**: Update DB dan invalidate/update cache bersamaan
3. **Cache Stampede Prevention**: Gunakan distributed lock (SETNX)
4. **Cache Invalidation**: Hapus cache saat data berubah
5. **Connection Pooling**: Reuse connections untuk performance

**Production Checklist:**
- ✅ Set TTL untuk semua cache keys
- ✅ Implement cache invalidation strategy
- ✅ Use connection pooling
- ✅ Monitor cache hit rate (target > 80%)
- ✅ Handle cache failures gracefully
- ✅ Use consistent cache key patterns
- ✅ Implement cache stampede prevention
- ✅ Set Redis maxmemory-policy (allkeys-lru)

**Redis Commands:**
```bash
# Monitor cache
redis-cli MONITOR

# Check memory
redis-cli INFO memory

# View all keys
redis-cli KEYS "*"

# Clear cache
redis-cli FLUSHDB
```

Happy caching! 🚀
