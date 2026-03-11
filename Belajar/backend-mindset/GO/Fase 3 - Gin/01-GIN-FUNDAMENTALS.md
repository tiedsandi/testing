# 🍸 Go Gin Fundamentals — Pindah dari Fiber ke Gin

## 🎯 Tujuan Belajar

Setelah belajar ini, lo bisa:
- Paham perbedaan fundamental Gin vs Fiber
- Tahu kapan pilih Gin vs Fiber di dunia kerja
- Setup project Gin dari nol
- Migrate dari Fiber ke Gin dengan minimal effort
- Handle routing, middleware, error handling di Gin
- Implement clean architecture pakai Gin
- Binding & validation request di Gin
- Setup Gin mode untuk development vs production
- Bikin API RESTful lengkap dengan Gin

## 💡 Konsep + Analogi

### Gin vs Fiber — Perbandingan Lengkap

| Aspek | Fiber | Gin | Winner |
|-------|-------|-----|--------|
| **Performance** | Sangat cepat (Express-like) | Sangat cepat (40x Express) | Draw 🤝 |
| **Maturity** | Relatif baru (2020) | Mature (2014) | 🏆 Gin |
| **Ecosystem** | Growing fast | Established | 🏆 Gin |
| **API Style** | Express.js style | Idiomatic Go | Preference |
| **Learning Curve** | Mudah untuk JS dev | Mudah untuk Go dev | Draw 🤝 |
| **Documentation** | Excellent | Excellent | Draw 🤝 |
| **Community** | Active, smaller | Very active, larger | 🏆 Gin |
| **Middleware** | Rich ecosystem | Richer ecosystem | 🏆 Gin |
| **Adoption** | Startup, modern | Enterprise, legacy | 🏆 Gin |
| **Breaking Changes** | Masih sering | Jarang | 🏆 Gin |

**Analogi Sederhana:**

| Konsep | Frontend Equivalent | Penjelasan |
|--------|---------------------|------------|
| **Fiber** | Next.js (modern, opinionated) | Modern, convention over config |
| **Gin** | React (mature, flexible) | Mature, stable, widely adopted |
| **gin.Context** | `req` + `res` dalam 1 object | Semua info request & response |
| **Middleware** | Next.js middleware | Intercept request sebelum handler |
| **Route Group** | Nested routes di Next.js | `/api/v1/*` grouping |

### Kapan Pilih Gin vs Fiber?

**Pilih Gin kalau:**
- ✅ Kerja di perusahaan besar/established (Uber, Google, dll pakai Gin)
- ✅ Butuh ekosistem middleware yang mature
- ✅ Tim sudah pakai Gin (consistency)
- ✅ Prioritas: stability > cutting edge features
- ✅ Ada integration dengan tools lama yang support Gin

**Pilih Fiber kalau:**
- ✅ Startup/project baru
- ✅ Team dari background Node.js/Express
- ✅ Suka API yang mirip Express (familiar)
- ✅ Butuh performance maksimal di edge cases
- ✅ Ga masalah dengan potential breaking changes

**Fun fact:** Di dunia kerja, **Gin lebih banyak dipakai** (~70% market share untuk Go web framework). Tapi Fiber growing fast!

### Fiber vs Gin — Code Comparison

```go
// FIBER
app.Get("/users/:id", func(c *fiber.Ctx) error {
    id := c.Params("id")
    return c.JSON(fiber.Map{"id": id})
})

// GIN
r.GET("/users/:id", func(c *gin.Context) {
    id := c.Param("id")
    c.JSON(200, gin.H{"id": id})
})
```

**Perbedaan utama:**
- Fiber: `c.Params()`, `c.JSON()` return error
- Gin: `c.Param()`, `c.JSON()` void (no return error)
- Fiber: `fiber.Map` | Gin: `gin.H` (alias untuk `map[string]interface{}`)
- Fiber: HTTP method lowercase `Get()` | Gin: uppercase `GET()`

## 📝 Materi + Kode Lengkap

### 1. Setup Project Gin

```bash
# Create project
mkdir gin-example
cd gin-example
go mod init github.com/yourusername/gin-example

# Install Gin
go get -u github.com/gin-gonic/gin

# Install dependencies lain
go get -u github.com/go-playground/validator/v10
go get -u gorm.io/gorm
go get -u gorm.io/driver/postgres
go get -u golang.org/x/crypto/bcrypt
```

### 2. Hello World — Gin vs Fiber

```go
// main_fiber.go (untuk comparison)
package main

import "github.com/gofiber/fiber/v2"

func main() {
    app := fiber.New()
    
    app.Get("/", func(c *fiber.Ctx) error {
        return c.SendString("Hello from Fiber!")
    })
    
    app.Listen(":3000")
}
```

```go
// main_gin.go
package main

import (
    "github.com/gin-gonic/gin"
)

func main() {
    // Create router (equivalent fiber.New())
    r := gin.Default() // Includes Logger & Recovery middleware
    
    // Define route
    r.GET("/", func(c *gin.Context) {
        c.String(200, "Hello from Gin!")
    })
    
    // Start server
    r.Run(":3000") // Listen on 0.0.0.0:3000
}
```

**Perbedaan:**
- Fiber: `fiber.New()` → Gin: `gin.Default()` atau `gin.New()`
- Fiber: `app.Listen()` → Gin: `r.Run()`
- Fiber: `c.SendString()` return error → Gin: `c.String()` no return

### 3. gin.Context vs fiber.Ctx — Cheat Sheet

| Task | Fiber | Gin |
|------|-------|-----|
| **Path param** | `c.Params("id")` | `c.Param("id")` |
| **Query param** | `c.Query("name")` | `c.Query("name")` |
| **Query default** | `c.Query("name", "default")` | `c.DefaultQuery("name", "default")` |
| **Parse JSON** | `c.BodyParser(&req)` | `c.ShouldBindJSON(&req)` |
| **Return JSON** | `c.JSON(fiber.Map{...})` | `c.JSON(200, gin.H{...})` |
| **Status code** | `c.Status(200).JSON(...)` | `c.JSON(200, ...)` |
| **Get header** | `c.Get("Authorization")` | `c.GetHeader("Authorization")` |
| **Set header** | `c.Set("X-Custom", "value")` | `c.Header("X-Custom", "value")` |
| **Store data** | `c.Locals("user", user)` | `c.Set("user", user)` |
| **Retrieve data** | `c.Locals("user")` | `c.Get("user")` |
| **Abort** | `return c.Status(401).JSON(...)` | `c.AbortWithStatusJSON(401, ...)` |

### 4. Routing di Gin — Lengkap

```go
// cmd/api/main.go
package main

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()

    // ==================== BASIC ROUTES ====================
    
    // GET
    r.GET("/ping", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "pong",
        })
    })

    // POST
    r.POST("/users", func(c *gin.Context) {
        c.JSON(http.StatusCreated, gin.H{
            "message": "User created",
        })
    })

    // PUT
    r.PUT("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{
            "message": "User updated",
            "id":      id,
        })
    })

    // PATCH
    r.PATCH("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{
            "message": "User partially updated",
            "id":      id,
        })
    })

    // DELETE
    r.DELETE("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{
            "message": "User deleted",
            "id":      id,
        })
    })

    // ==================== PATH PARAMS ====================
    
    // Single param
    r.GET("/users/:id", func(c *gin.Context) {
        id := c.Param("id")
        c.JSON(http.StatusOK, gin.H{"user_id": id})
    })

    // Multiple params
    r.GET("/posts/:postId/comments/:commentId", func(c *gin.Context) {
        postID := c.Param("postId")
        commentID := c.Param("commentId")
        c.JSON(http.StatusOK, gin.H{
            "post_id":    postID,
            "comment_id": commentID,
        })
    })

    // Wildcard (catch all)
    r.GET("/files/*filepath", func(c *gin.Context) {
        filepath := c.Param("filepath")
        c.JSON(http.StatusOK, gin.H{"filepath": filepath})
    })

    // ==================== QUERY PARAMS ====================
    
    r.GET("/search", func(c *gin.Context) {
        // Query with no default (return empty string if not exist)
        query := c.Query("q")
        
        // Query with default value
        page := c.DefaultQuery("page", "1")
        limit := c.DefaultQuery("limit", "10")
        
        // Check if param exists
        sort, exists := c.GetQuery("sort")
        
        c.JSON(http.StatusOK, gin.H{
            "query":       query,
            "page":        page,
            "limit":       limit,
            "sort":        sort,
            "sort_exists": exists,
        })
    })

    // ==================== ROUTE GROUPS ====================
    
    // API v1
    v1 := r.Group("/api/v1")
    {
        v1.GET("/users", func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{"version": "v1", "users": []string{}})
        })
        
        v1.POST("/users", func(c *gin.Context) {
            c.JSON(http.StatusCreated, gin.H{"version": "v1", "message": "created"})
        })
    }

    // API v2
    v2 := r.Group("/api/v2")
    {
        v2.GET("/users", func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{"version": "v2", "users": []string{}})
        })
    }

    // Nested groups
    api := r.Group("/api")
    {
        admin := api.Group("/admin")
        {
            admin.GET("/dashboard", func(c *gin.Context) {
                c.JSON(http.StatusOK, gin.H{"page": "admin dashboard"})
            })
        }
        
        public := api.Group("/public")
        {
            public.GET("/about", func(c *gin.Context) {
                c.JSON(http.StatusOK, gin.H{"page": "about"})
            })
        }
    }

    r.Run(":3000")
}
```

### 5. Request Binding & Validation

```go
// internal/user/dto.go
package user

type CreateUserRequest struct {
    Name     string `json:"name" binding:"required,min=3,max=100"`
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=6"`
    Age      int    `json:"age" binding:"required,gte=18,lte=100"`
}

type UpdateUserRequest struct {
    Name string `json:"name" binding:"omitempty,min=3,max=100"`
    Age  int    `json:"age" binding:"omitempty,gte=18,lte=100"`
}

type UserQueryParams struct {
    Page   int    `form:"page" binding:"omitempty,gte=1"`
    Limit  int    `form:"limit" binding:"omitempty,gte=1,lte=100"`
    Sort   string `form:"sort" binding:"omitempty,oneof=name email created_at"`
    Order  string `form:"order" binding:"omitempty,oneof=asc desc"`
    Search string `form:"search" binding:"omitempty,max=100"`
}

type UserPathParams struct {
    ID uint `uri:"id" binding:"required,gte=1"`
}
```

```go
// internal/user/handler.go
package user

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

// Create user dengan ShouldBindJSON
func (h *Handler) Create(c *gin.Context) {
    var req CreateUserRequest
    
    // Bind JSON body dan validate
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": err.Error(),
        })
        return
    }

    user, err := h.service.Create(c.Request.Context(), req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusCreated, gin.H{
        "message": "User created successfully",
        "data":    user,
    })
}

// Update user dengan path params
func (h *Handler) Update(c *gin.Context) {
    // Bind URI params
    var params UserPathParams
    if err := c.ShouldBindUri(&params); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": err.Error(),
        })
        return
    }

    // Bind JSON body
    var req UpdateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": err.Error(),
        })
        return
    }

    user, err := h.service.Update(c.Request.Context(), params.ID, req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "User updated successfully",
        "data":    user,
    })
}

// List users dengan query params
func (h *Handler) List(c *gin.Context) {
    var params UserQueryParams
    
    // Bind query params
    if err := c.ShouldBindQuery(&params); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": err.Error(),
        })
        return
    }

    // Set default values kalau kosong
    if params.Page == 0 {
        params.Page = 1
    }
    if params.Limit == 0 {
        params.Limit = 10
    }
    if params.Sort == "" {
        params.Sort = "created_at"
    }
    if params.Order == "" {
        params.Order = "desc"
    }

    users, total, err := h.service.List(c.Request.Context(), params)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "data": users,
        "meta": gin.H{
            "page":  params.Page,
            "limit": params.Limit,
            "total": total,
        },
    })
}

// Get user by ID
func (h *Handler) GetByID(c *gin.Context) {
    var params UserPathParams
    if err := c.ShouldBindUri(&params); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": err.Error(),
        })
        return
    }

    user, err := h.service.GetByID(c.Request.Context(), params.ID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{
            "error": "User not found",
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "data": user,
    })
}

// Delete user
func (h *Handler) Delete(c *gin.Context) {
    var params UserPathParams
    if err := c.ShouldBindUri(&params); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": err.Error(),
        })
        return
    }

    if err := h.service.Delete(c.Request.Context(), params.ID); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "message": "User deleted successfully",
    })
}
```

### 6. Response Types di Gin

```go
// pkg/response/response.go
package response

import (
    "net/http"

    "github.com/gin-gonic/gin"
)

// JSON response
func JSON(c *gin.Context, code int, data interface{}) {
    c.JSON(code, gin.H{
        "data": data,
    })
}

// Success response
func Success(c *gin.Context, message string, data interface{}) {
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": message,
        "data":    data,
    })
}

// Error response
func Error(c *gin.Context, code int, message string) {
    c.JSON(code, gin.H{
        "success": false,
        "error":   message,
    })
}

// Paginated response
func Paginated(c *gin.Context, data interface{}, page, limit, total int) {
    c.JSON(http.StatusOK, gin.H{
        "data": data,
        "meta": gin.H{
            "page":        page,
            "limit":       limit,
            "total":       total,
            "total_pages": (total + limit - 1) / limit,
        },
    })
}

// File download
func File(c *gin.Context, filepath string) {
    c.File(filepath)
}

// Stream response
func Stream(c *gin.Context, contentType string, data []byte) {
    c.Data(http.StatusOK, contentType, data)
}

// Redirect
func Redirect(c *gin.Context, url string) {
    c.Redirect(http.StatusFound, url)
}

// No content (204)
func NoContent(c *gin.Context) {
    c.Status(http.StatusNoContent)
}
```

### 7. Middleware di Gin

```go
// pkg/middleware/logger.go
package middleware

import (
    "time"

    "github.com/gin-gonic/gin"
    "github.com/sirupsen/logrus"
)

// Custom logger middleware
func Logger(logger *logrus.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Start timer
        startTime := time.Now()

        // Process request
        c.Next()

        // Calculate latency
        latency := time.Since(startTime)

        // Get status code
        statusCode := c.Writer.Status()

        // Log request
        logger.WithFields(logrus.Fields{
            "method":     c.Request.Method,
            "path":       c.Request.URL.Path,
            "status":     statusCode,
            "latency":    latency,
            "ip":         c.ClientIP(),
            "user_agent": c.Request.UserAgent(),
        }).Info("Request processed")
    }
}
```

```go
// pkg/middleware/cors.go
package middleware

import (
    "github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
        c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
        c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
        c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }

        c.Next()
    }
}
```

```go
// pkg/middleware/auth.go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
)

func Auth() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Get Authorization header
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Missing authorization header",
            })
            return
        }

        // Parse Bearer token
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid authorization header format",
            })
            return
        }

        token := parts[1]

        // Verify token (simplified, gunakan JWT di production)
        if token == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid token",
            })
            return
        }

        // Set user ID to context (equivalent c.Locals di Fiber)
        c.Set("user_id", uint(1))
        
        // Continue to next handler
        c.Next()
    }
}

// Get user ID from context
func GetUserID(c *gin.Context) uint {
    userID, exists := c.Get("user_id")
    if !exists {
        return 0
    }
    return userID.(uint)
}
```

```go
// pkg/middleware/rate_limit.go
package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

type RateLimiter struct {
    requests map[string][]time.Time
    mu       sync.Mutex
    limit    int
    window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
    return &RateLimiter{
        requests: make(map[string][]time.Time),
        limit:    limit,
        window:   window,
    }
}

func (rl *RateLimiter) Middleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        ip := c.ClientIP()
        
        rl.mu.Lock()
        defer rl.mu.Unlock()

        now := time.Now()
        
        // Clean old requests
        if timestamps, exists := rl.requests[ip]; exists {
            var valid []time.Time
            for _, ts := range timestamps {
                if now.Sub(ts) < rl.window {
                    valid = append(valid, ts)
                }
            }
            rl.requests[ip] = valid
        }

        // Check limit
        if len(rl.requests[ip]) >= rl.limit {
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                "error": "Rate limit exceeded",
            })
            return
        }

        // Add current request
        rl.requests[ip] = append(rl.requests[ip], now)
        
        c.Next()
    }
}
```

```go
// pkg/middleware/request_id.go
package middleware

import (
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

func RequestID() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Generate unique request ID
        requestID := uuid.New().String()
        
        // Set to context
        c.Set("request_id", requestID)
        
        // Set to response header
        c.Header("X-Request-ID", requestID)
        
        c.Next()
    }
}

func GetRequestID(c *gin.Context) string {
    if requestID, exists := c.Get("request_id"); exists {
        return requestID.(string)
    }
    return ""
}
```

### 8. Clean Architecture dengan Gin

```go
// internal/user/entity.go
package user

import "time"

type User struct {
    ID        uint      `json:"id" gorm:"primaryKey"`
    Name      string    `json:"name" gorm:"type:varchar(100);not null"`
    Email     string    `json:"email" gorm:"type:varchar(100);uniqueIndex;not null"`
    Password  string    `json:"-" gorm:"type:varchar(255);not null"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}
```

```go
// internal/user/repository.go
package user

import (
    "context"

    "gorm.io/gorm"
)

type Repository interface {
    Create(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id uint) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id uint) error
    List(ctx context.Context, params UserQueryParams) ([]User, int64, error)
}

type repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
    return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, user *User) error {
    return r.db.WithContext(ctx).Create(user).Error
}

func (r *repository) FindByID(ctx context.Context, id uint) (*User, error) {
    var user User
    err := r.db.WithContext(ctx).First(&user, id).Error
    if err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *repository) FindByEmail(ctx context.Context, email string) (*User, error) {
    var user User
    err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
    if err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *repository) Update(ctx context.Context, user *User) error {
    return r.db.WithContext(ctx).Save(user).Error
}

func (r *repository) Delete(ctx context.Context, id uint) error {
    return r.db.WithContext(ctx).Delete(&User{}, id).Error
}

func (r *repository) List(ctx context.Context, params UserQueryParams) ([]User, int64, error) {
    var users []User
    var total int64

    query := r.db.WithContext(ctx).Model(&User{})

    // Search
    if params.Search != "" {
        query = query.Where("name ILIKE ? OR email ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
    }

    // Count total
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }

    // Sort
    orderClause := params.Sort + " " + params.Order
    query = query.Order(orderClause)

    // Pagination
    offset := (params.Page - 1) * params.Limit
    if err := query.Limit(params.Limit).Offset(offset).Find(&users).Error; err != nil {
        return nil, 0, err
    }

    return users, total, nil
}
```

```go
// internal/user/service.go
package user

import (
    "context"
    "errors"

    "golang.org/x/crypto/bcrypt"
)

type Service interface {
    Create(ctx context.Context, req CreateUserRequest) (*User, error)
    GetByID(ctx context.Context, id uint) (*User, error)
    Update(ctx context.Context, id uint, req UpdateUserRequest) (*User, error)
    Delete(ctx context.Context, id uint) error
    List(ctx context.Context, params UserQueryParams) ([]User, int64, error)
}

type service struct {
    repo Repository
}

func NewService(repo Repository) Service {
    return &service{repo: repo}
}

func (s *service) Create(ctx context.Context, req CreateUserRequest) (*User, error) {
    // Check if email exists
    existing, _ := s.repo.FindByEmail(ctx, req.Email)
    if existing != nil {
        return nil, errors.New("email already exists")
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    user := &User{
        Name:     req.Name,
        Email:    req.Email,
        Password: string(hashedPassword),
    }

    if err := s.repo.Create(ctx, user); err != nil {
        return nil, err
    }

    return user, nil
}

func (s *service) GetByID(ctx context.Context, id uint) (*User, error) {
    return s.repo.FindByID(ctx, id)
}

func (s *service) Update(ctx context.Context, id uint, req UpdateUserRequest) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, errors.New("user not found")
    }

    if req.Name != "" {
        user.Name = req.Name
    }
    if req.Age != 0 {
        // Update age field if exists
    }

    if err := s.repo.Update(ctx, user); err != nil {
        return nil, err
    }

    return user, nil
}

func (s *service) Delete(ctx context.Context, id uint) error {
    _, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return errors.New("user not found")
    }

    return s.repo.Delete(ctx, id)
}

func (s *service) List(ctx context.Context, params UserQueryParams) ([]User, int64, error) {
    return s.repo.List(ctx, params)
}
```

### 9. Route Setup dengan Clean Architecture

```go
// internal/user/routes.go
package user

import (
    "github.com/gin-gonic/gin"
    "your-project/pkg/middleware"
)

func SetupRoutes(r *gin.RouterGroup, handler *Handler) {
    users := r.Group("/users")
    {
        // Public routes
        users.POST("", handler.Create)
        users.GET("", handler.List)
        users.GET("/:id", handler.GetByID)

        // Protected routes
        protected := users.Group("")
        protected.Use(middleware.Auth())
        {
            protected.PUT("/:id", handler.Update)
            protected.DELETE("/:id", handler.Delete)
        }
    }
}
```

```go
// cmd/api/main.go
package main

import (
    "log"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/sirupsen/logrus"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"

    "your-project/internal/user"
    "your-project/pkg/middleware"
)

func main() {
    // Setup logger
    logger := logrus.New()
    logger.SetFormatter(&logrus.JSONFormatter{})

    // Setup database
    dsn := "host=localhost user=postgres password=postgres dbname=mydb port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect database:", err)
    }

    // Auto migrate
    db.AutoMigrate(&user.User{})

    // Setup Gin
    gin.SetMode(gin.ReleaseMode) // or gin.DebugMode for development

    r := gin.New() // Create new router without default middleware

    // Global middleware
    r.Use(middleware.RequestID())
    r.Use(middleware.Logger(logger))
    r.Use(gin.Recovery()) // Bawaan Gin untuk recover dari panic
    r.Use(middleware.CORS())
    
    // Rate limiter (100 requests per minute)
    rateLimiter := middleware.NewRateLimiter(100, 1*time.Minute)
    r.Use(rateLimiter.Middleware())

    // Health check
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{
            "status": "ok",
            "time":   time.Now(),
        })
    })

    // API v1
    v1 := r.Group("/api/v1")
    {
        // User module
        userRepo := user.NewRepository(db)
        userService := user.NewService(userRepo)
        userHandler := user.NewHandler(userService)
        user.SetupRoutes(v1, userHandler)
    }

    // Start server
    log.Println("Server starting on :3000")
    if err := r.Run(":3000"); err != nil {
        log.Fatal("Failed to start server:", err)
    }
}
```

### 10. Gin Mode — Development vs Production

```go
// config/config.go
package config

import (
    "os"

    "github.com/gin-gonic/gin"
)

type Config struct {
    Environment string
    Port        string
    DatabaseURL string
    JWTSecret   string
}

func Load() *Config {
    env := os.Getenv("APP_ENV")
    if env == "" {
        env = "development"
    }

    // Set Gin mode based on environment
    switch env {
    case "production":
        gin.SetMode(gin.ReleaseMode)
    case "test":
        gin.SetMode(gin.TestMode)
    default:
        gin.SetMode(gin.DebugMode)
    }

    return &Config{
        Environment: env,
        Port:        getEnv("PORT", "3000"),
        DatabaseURL: getEnv("DATABASE_URL", "host=localhost user=postgres password=postgres dbname=mydb port=5432 sslmode=disable"),
        JWTSecret:   getEnv("JWT_SECRET", "your-secret-key"),
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
```

```bash
# .env.development
APP_ENV=development
PORT=3000
DATABASE_URL=host=localhost user=postgres password=postgres dbname=dev_db port=5432 sslmode=disable
JWT_SECRET=dev-secret-key

# .env.production
APP_ENV=production
PORT=8080
DATABASE_URL=host=prod-db user=postgres password=secure-password dbname=prod_db port=5432 sslmode=require
JWT_SECRET=prod-super-secret-key

# .env.test
APP_ENV=test
PORT=3001
DATABASE_URL=host=localhost user=postgres password=postgres dbname=test_db port=5432 sslmode=disable
JWT_SECRET=test-secret-key
```

### 11. Custom Error Handler

```go
// pkg/errors/errors.go
package errors

import "net/http"

type AppError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
}

func (e *AppError) Error() string {
    return e.Message
}

func NewBadRequestError(message string) *AppError {
    return &AppError{
        Code:    http.StatusBadRequest,
        Message: message,
    }
}

func NewUnauthorizedError(message string) *AppError {
    return &AppError{
        Code:    http.StatusUnauthorized,
        Message: message,
    }
}

func NewNotFoundError(message string) *AppError {
    return &AppError{
        Code:    http.StatusNotFound,
        Message: message,
    }
}

func NewInternalServerError(message string) *AppError {
    return &AppError{
        Code:    http.StatusInternalServerError,
        Message: message,
    }
}
```

```go
// pkg/middleware/error_handler.go
package middleware

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "your-project/pkg/errors"
)

func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()

        // Check if there are any errors
        if len(c.Errors) > 0 {
            err := c.Errors.Last().Err

            // Check if it's custom app error
            if appErr, ok := err.(*errors.AppError); ok {
                c.JSON(appErr.Code, gin.H{
                    "error": appErr.Message,
                })
                return
            }

            // Generic error
            c.JSON(http.StatusInternalServerError, gin.H{
                "error": err.Error(),
            })
        }
    }
}
```

```go
// Usage in handler
func (h *Handler) GetByID(c *gin.Context) {
    var params UserPathParams
    if err := c.ShouldBindUri(&params); err != nil {
        c.Error(errors.NewBadRequestError("Invalid user ID"))
        return
    }

    user, err := h.service.GetByID(c.Request.Context(), params.ID)
    if err != nil {
        c.Error(errors.NewNotFoundError("User not found"))
        return
    }

    c.JSON(http.StatusOK, gin.H{"data": user})
}
```

### 12. Complete Project Structure

```
gin-example/
├── cmd/
│   └── api/
│       └── main.go                 # Entry point
├── internal/
│   ├── user/
│   │   ├── entity.go              # Domain model
│   │   ├── dto.go                 # Request/Response DTOs
│   │   ├── repository.go          # Data layer interface
│   │   ├── service.go             # Business logic interface
│   │   ├── handler.go             # HTTP handlers
│   │   └── routes.go              # Route definitions
│   └── auth/
│       ├── entity.go
│       ├── service.go
│       └── handler.go
├── pkg/
│   ├── middleware/
│   │   ├── auth.go
│   │   ├── cors.go
│   │   ├── logger.go
│   │   ├── rate_limit.go
│   │   ├── request_id.go
│   │   └── error_handler.go
│   ├── response/
│   │   └── response.go            # Response helpers
│   └── errors/
│       └── errors.go              # Custom errors
├── config/
│   └── config.go                  # Configuration
├── .env.development
├── .env.production
├── .env.test
├── go.mod
└── go.sum
```

### 13. Comparison — Migration Guide Fiber → Gin

```go
// ==================== FIBER CODE ====================
package main

import (
    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
    app := fiber.New()
    
    app.Use(logger.New())
    app.Use(cors.New())
    
    app.Get("/users/:id", func(c *fiber.Ctx) error {
        id := c.Params("id")
        name := c.Query("name")
        
        var req CreateUserRequest
        if err := c.BodyParser(&req); err != nil {
            return c.Status(400).JSON(fiber.Map{
                "error": err.Error(),
            })
        }
        
        c.Locals("user_id", 123)
        userID := c.Locals("user_id").(int)
        
        return c.JSON(fiber.Map{
            "id": id,
            "name": name,
            "user_id": userID,
        })
    })
    
    app.Listen(":3000")
}

// ==================== EQUIVALENT GIN CODE ====================
package main

import (
    "net/http"
    
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default() // Already includes Logger & Recovery
    
    // CORS middleware (need custom or third-party)
    r.Use(CORSMiddleware())
    
    r.GET("/users/:id", func(c *gin.Context) {
        id := c.Param("id")              // Params vs Param
        name := c.Query("name")          // Same
        
        var req CreateUserRequest
        if err := c.ShouldBindJSON(&req); err != nil {   // BodyParser vs ShouldBindJSON
            c.JSON(http.StatusBadRequest, gin.H{         // Status().JSON() vs JSON()
                "error": err.Error(),
            })
            return                                        // return vs return error
        }
        
        c.Set("user_id", 123)                            // Locals vs Set
        userID, _ := c.Get("user_id")                    // Get returns (interface{}, bool)
        
        c.JSON(http.StatusOK, gin.H{                     // fiber.Map vs gin.H
            "id": id,
            "name": name,
            "user_id": userID,
        })
    })
    
    r.Run(":3000")                                        // Listen vs Run
}
```

### 14. Testing dengan Gin

```go
// internal/user/handler_test.go
package user

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
)

func TestCreateUser(t *testing.T) {
    // Setup
    gin.SetMode(gin.TestMode)
    
    r := gin.New()
    handler := NewHandler(mockService)
    r.POST("/users", handler.Create)

    // Prepare request
    reqBody := CreateUserRequest{
        Name:     "John Doe",
        Email:    "john@example.com",
        Password: "password123",
        Age:      25,
    }
    jsonBody, _ := json.Marshal(reqBody)

    req, _ := http.NewRequest("POST", "/users", bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")

    // Create response recorder
    w := httptest.NewRecorder()

    // Execute request
    r.ServeHTTP(w, req)

    // Assert
    assert.Equal(t, http.StatusCreated, w.Code)

    var response map[string]interface{}
    json.Unmarshal(w.Body.Bytes(), &response)
    assert.Equal(t, "User created successfully", response["message"])
}
```

## ❌ Common Mistakes + Fix

### 1. ❌ Lupa return setelah c.JSON()

```go
// ❌ SALAH — Code setelah c.JSON() masih execute
func (h *Handler) GetByID(c *gin.Context) {
    user, err := h.service.GetByID(c.Request.Context(), 1)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
        // LUPA RETURN!
    }
    c.JSON(http.StatusOK, gin.H{"data": user}) // Ini masih execute!
}
```

```go
// ✅ BENAR
func (h *Handler) GetByID(c *gin.Context) {
    user, err := h.service.GetByID(c.Request.Context(), 1)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
        return // WAJIB return
    }
    c.JSON(http.StatusOK, gin.H{"data": user})
}
```

**Penjelasan:** Di Fiber, `return c.JSON()` adalah pattern standar. Di Gin, `c.JSON()` void, jadi harus manual `return`.

### 2. ❌ Pakai c.Query() untuk path params

```go
// ❌ SALAH
r.GET("/users/:id", func(c *gin.Context) {
    id := c.Query("id") // SALAH! Ini untuk query params
})
```

```go
// ✅ BENAR
r.GET("/users/:id", func(c *gin.Context) {
    id := c.Param("id") // c.Param untuk path params
})

r.GET("/users", func(c *gin.Context) {
    page := c.Query("page") // c.Query untuk query params
})
```

### 3. ❌ Gin mode tidak di-set untuk production

```go
// ❌ SALAH — Default debug mode di production
func main() {
    r := gin.Default()
    r.Run(":8080")
}
```

```go
// ✅ BENAR
func main() {
    gin.SetMode(gin.ReleaseMode) // Set ke release mode
    r := gin.Default()
    r.Run(":8080")
}
```

### 4. ❌ Binding validation tanpa check error

```go
// ❌ SALAH
var req CreateUserRequest
c.ShouldBindJSON(&req) // Tidak check error
// req bisa jadi zero value kalau binding fail!
```

```go
// ✅ BENAR
var req CreateUserRequest
if err := c.ShouldBindJSON(&req); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
}
```

### 5. ❌ Pakai c.BindJSON() instead of c.ShouldBindJSON()

```go
// ❌ KURANG BAIK — c.BindJSON() auto return 400 kalau fail
var req CreateUserRequest
if err := c.BindJSON(&req); err != nil {
    // Error handler di sini tidak execute karena sudah di-handle Gin
    c.JSON(http.StatusBadRequest, gin.H{"error": "custom message"})
    return
}
```

```go
// ✅ BENAR — Pakai ShouldBindJSON untuk kontrol penuh
var req CreateUserRequest
if err := c.ShouldBindJSON(&req); err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": "custom message"})
    return
}
```

**Penjelasan:** `c.BindJSON()` otomatis return 400 kalau fail. `c.ShouldBindJSON()` lebih flexible.

### 6. ❌ Tidak pakai c.AbortWithStatusJSON() di middleware

```go
// ❌ SALAH — c.Next() masih dipanggil
func Auth() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
            return // Handler selanjutnya masih execute!
        }
        c.Next()
    }
}
```

```go
// ✅ BENAR
func Auth() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
            return // c.Abort() mencegah handler selanjutnya
        }
        c.Next()
    }
}
```

### 7. ❌ Type assertion tanpa check

```go
// ❌ SALAH — Bisa panic kalau type salah
userID := c.Get("user_id").(uint) // Panic kalau bukan uint!
```

```go
// ✅ BENAR
userID, exists := c.Get("user_id")
if !exists {
    c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
    return
}
uid := userID.(uint)
```

### 8. ❌ Route path tanpa leading slash

```go
// ❌ SALAH
r.GET("users", handler) // Tanpa /
```

```go
// ✅ BENAR
r.GET("/users", handler)
```

### 9. ❌ Middleware order salah

```go
// ❌ SALAH — Recovery setelah route
r.GET("/users", handler)
r.Use(gin.Recovery()) // Terlambat!
```

```go
// ✅ BENAR — Middleware sebelum route
r.Use(gin.Recovery())
r.Use(gin.Logger())
r.GET("/users", handler)
```

### 10. ❌ Tidak set Content-Type untuk JSON

```go
// ❌ KURANG OPTIMAL — Gin auto set Content-Type, tapi explicit lebih baik
c.JSON(http.StatusOK, data)
```

```go
// ✅ BENAR (optional, tapi good practice)
c.Header("Content-Type", "application/json")
c.JSON(http.StatusOK, data)
// Atau biarkan Gin handle otomatis
```

## ✅ Checklist Akhir

Setelah belajar ini, pastikan lo bisa:

- [ ] Paham perbedaan Gin vs Fiber
- [ ] Tahu kapan pilih Gin vs Fiber
- [ ] Setup project Gin dari nol
- [ ] Bikin route dengan GET, POST, PUT, PATCH, DELETE
- [ ] Pakai path params dengan `c.Param()`
- [ ] Pakai query params dengan `c.Query()` dan `c.DefaultQuery()`
- [ ] Binding JSON dengan `c.ShouldBindJSON()`
- [ ] Binding query params dengan `c.ShouldBindQuery()`
- [ ] Binding URI params dengan `c.ShouldBindUri()`
- [ ] Return JSON response dengan `c.JSON()`
- [ ] Pakai route grouping untuk API versioning
- [ ] Bikin custom middleware
- [ ] Pakai `c.Set()` dan `c.Get()` untuk pass data
- [ ] Pakai `c.AbortWithStatusJSON()` di middleware
- [ ] Setup Gin mode (debug/release/test)
- [ ] Implement clean architecture dengan Gin
- [ ] Handle error dengan custom error handler
- [ ] Setup CORS middleware
- [ ] Setup authentication middleware
- [ ] Setup rate limiting middleware

## 💭 Ide Pengembangan Mandiri

Setelah paham Gin basics, coba kembangkan:

1. **Gin + JWT Authentication:**
   - Implement JWT dengan github.com/golang-jwt/jwt
   - Refresh token mechanism
   - Token blacklist dengan Redis

2. **Gin + File Upload:**
   - Single file upload dengan `c.FormFile()`
   - Multiple files dengan `c.MultipartForm()`
   - Save ke S3/MinIO

3. **Gin + WebSocket:**
   - Integrate dengan gorilla/websocket
   - Real-time notification
   - Chat application

4. **Gin + GraphQL:**
   - Integrate dengan gqlgen
   - GraphQL playground
   - Subscription support

5. **Gin + gRPC:**
   - REST + gRPC dalam satu app
   - grpc-gateway untuk reverse proxy
   - Protocol buffers

6. **Advanced Middleware:**
   - Compression middleware
   - Circuit breaker
   - Metrics & monitoring dengan Prometheus
   - Distributed tracing dengan OpenTelemetry

7. **Gin + Swagger:**
   - Auto-generate API documentation
   - swaggo/gin-swagger
   - API versioning docs

8. **Performance Optimization:**
   - Connection pooling
   - Response caching
   - Database query optimization
   - Load testing dengan k6

9. **Security Hardening:**
   - Helmet equivalent untuk Gin
   - CSRF protection
   - XSS prevention
   - SQL injection prevention
   - Rate limiting per user

10. **Migration Strategy:**
    - Fiber → Gin migration script
    - Parallel running (canary deployment)
    - A/B testing

---

**Tips Pro:**
- **Gin lebih idiomatic Go** → Kalau lo pengen jadi Go expert, Gin better
- **Fiber lebih familiar untuk JS dev** → Tapi learning curve Gin ga susah
- **Di production, Gin lebih proven** → Uber, Alibaba, dll pakai Gin
- **Middleware selalu return `gin.HandlerFunc`** → Bukan `func(c *gin.Context)`
- **c.Next() optional di akhir middleware** → Tapi explicit better
- **Gin mode penting!** → Debug mode leak info di production
- **c.AbortWithStatusJSON() vs c.JSON() + return** → Abort lebih aman
- **gin.H adalah alias** → Sama aja dengan `map[string]interface{}`

**Migration Fiber → Gin biasanya smooth** karena konsep sama. Yang beda cuma syntax! 🍸
