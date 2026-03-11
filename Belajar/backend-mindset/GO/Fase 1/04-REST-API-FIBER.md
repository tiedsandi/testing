# REST API Lengkap dengan Go Fiber

## 🎯 Tujuan Belajar

Setelah belajar materi ini, lo bakal:
- Kuasai routing Fiber: method, params, query, group, versioning
- Paham semua method penting di `fiber.Ctx`
- Bikin middleware chain yang bener & urutan yang tepat
- Implement custom AppError dengan HTTP status mapping
- Bikin handler yang thin & clean (single responsibility)
- Pass data antar middleware lewat `c.Locals()`
- Serve static files & file upload

## 💡 Konsep + Analogi

### Fiber vs Express.js

**Express.js (yang udah lo tau):**
```javascript
const app = express();

app.get('/users/:id', (req, res) => {
  const id = req.params.id;
  res.json({ id });
});

app.use((req, res, next) => { // middleware
  console.log(req.method);
  next();
});
```

**Go Fiber (syntax hampir identik!):**
```go
app := fiber.New()

app.Get("/users/:id", func(c *fiber.Ctx) error {
    id := c.Params("id")
    return c.JSON(fiber.Map{"id": id})
})

app.Use(func(c *fiber.Ctx) error { // middleware
    fmt.Println(c.Method())
    return c.Next()
})
```

**Fiber = Express.js di dunia Go**, syntax sangat mirip tapi lebih cepat karena built on fasthttp.

### Thin Handler Pattern

**Analogi:**
- **Handler**: Resepsionis hotel → terima tamu, arahkan ke kamar, kasih konfirmasi
- **Service**: Manager → urus semua logika operasional
- **Handler JANGAN**: Resepsionis yang juga masak, bersihin kamar, dan urus keuangan

```
Request masuk → Handler (parse input) → Service (business logic) → Handler (format output)
```

### Middleware Chain

**Analogi:** Conveyor belt di pabrik → produk (request) lewat mesin (middleware) satu per satu sebelum sampai tujuan (handler).

```
Request → [Logger] → [RequestID] → [Auth] → [RateLimit] → Handler → Response
```

Urutan sangat penting:
1. **Recovery** paling pertama (catch semua panic)
2. **Logger** kedua (log semua request)
3. **RequestID** ketiga (tiap request punya ID)
4. **CORS** sebelum auth
5. **Auth** sebelum route protected

## 📝 Materi + Kode Lengkap

### 1. Project Setup

```bash
mkdir fiber-rest-api
cd fiber-rest-api
go mod init github.com/yourusername/fiber-rest-api

go get github.com/gofiber/fiber/v2
go get github.com/golang-jwt/jwt/v5
go get github.com/google/uuid
go get github.com/go-playground/validator/v10
```

### 2. Routing Lengkap

```go
// examples/01_routing.go
package main

import (
	"github.com/gofiber/fiber/v2"
	"log"
)

func main() {
	app := fiber.New()

	// ====================
	// HTTP Methods
	// ====================
	app.Get("/resource", func(c *fiber.Ctx) error {
		return c.SendString("GET")
	})
	app.Post("/resource", func(c *fiber.Ctx) error {
		return c.SendString("POST")
	})
	app.Put("/resource/:id", func(c *fiber.Ctx) error {
		return c.SendString("PUT " + c.Params("id"))
	})
	app.Patch("/resource/:id", func(c *fiber.Ctx) error {
		return c.SendString("PATCH " + c.Params("id"))
	})
	app.Delete("/resource/:id", func(c *fiber.Ctx) error {
		return c.SendString("DELETE " + c.Params("id"))
	})

	// ====================
	// Route Parameters
	// ====================

	// Required param
	app.Get("/users/:id", func(c *fiber.Ctx) error {
		id := c.Params("id")
		return c.JSON(fiber.Map{"id": id})
	})

	// Optional param (ada tanda ?)
	app.Get("/users/:id?", func(c *fiber.Ctx) error {
		id := c.Params("id", "default-id") // default kalau kosong
		return c.JSON(fiber.Map{"id": id})
	})

	// Multiple params
	app.Get("/users/:userID/posts/:postID", func(c *fiber.Ctx) error {
		userID := c.Params("userID")
		postID := c.Params("postID")
		return c.JSON(fiber.Map{
			"user_id": userID,
			"post_id": postID,
		})
	})

	// Wildcard param
	app.Get("/files/*", func(c *fiber.Ctx) error {
		path := c.Params("*") // tangkap semua setelah /files/
		return c.JSON(fiber.Map{"path": path})
	})

	// ====================
	// Query Params
	// ====================

	// GET /search?q=golang&page=2&limit=10&active=true
	app.Get("/search", func(c *fiber.Ctx) error {
		q := c.Query("q")                          // string query
		page := c.QueryInt("page", 1)              // int query dengan default
		limit := c.QueryInt("limit", 10)           // int query dengan default
		active := c.QueryBool("active", true)      // bool query
		sort := c.Query("sort", "created_at desc") // string dengan default

		return c.JSON(fiber.Map{
			"query":  q,
			"page":   page,
			"limit":  limit,
			"active": active,
			"sort":   sort,
		})
	})

	// ====================
	// Route Grouping
	// ====================

	// /api
	api := app.Group("/api")

	// /api/v1
	v1 := api.Group("/v1")

	// /api/v1/users
	users := v1.Group("/users")
	users.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"version": "v1", "resource": "users"})
	})
	users.Post("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"action": "create user"})
	})
	users.Get("/:id", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"id": c.Params("id")})
	})

	// /api/v2
	v2 := api.Group("/v2")
	usersV2 := v2.Group("/users")
	usersV2.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"version": "v2", "resource": "users", "new_field": true})
	})

	// Middleware hanya buat group tertentu
	admin := app.Group("/admin")
	admin.Use(func(c *fiber.Ctx) error {
		// auth cek disini
		return c.Next()
	})
	admin.Get("/dashboard", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"page": "admin dashboard"})
	})

	log.Fatal(app.Listen(":3000"))
}
```

### 3. Fiber Context — Semua Method Penting

```go
// examples/02_context.go
package main

import (
	"github.com/gofiber/fiber/v2"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func contextExamplesHandler(c *fiber.Ctx) error {
	// ====================
	// REQUEST INFO
	// ====================
	method := c.Method()             // "GET", "POST", ...
	path := c.Path()                 // "/api/users"
	baseURL := c.BaseURL()           // "http://localhost:3000"
	originalURL := c.OriginalURL()   // "/api/users?page=1"
	ip := c.IP()                     // client IP
	hostname := c.Hostname()         // "localhost"
	protocol := c.Protocol()         // "http" atau "https"
	secure := c.Secure()             // true kalau HTTPS

	// ====================
	// PARAMS & QUERY
	// ====================
	id := c.Params("id")                    // route param
	idWithDefault := c.Params("id", "0")   // dengan default
	page := c.QueryInt("page", 1)           // query int
	name := c.Query("name", "anonymous")   // query string
	isActive := c.QueryBool("active", false) // query bool

	// ====================
	// HEADERS
	// ====================
	authHeader := c.Get("Authorization")          // baca header
	contentType := c.Get("Content-Type")          // content type
	userAgent := c.Get("User-Agent")              // user agent
	acceptLang := c.Get("Accept-Language")        // accept language
	reqID := c.Get("X-Request-ID")                // custom header
	c.Set("X-Custom-Header", "custom-value")      // set response header
	c.Append("Vary", "Origin")                    // append header

	// ====================
	// BODY PARSING
	// ====================
	var body LoginRequest
	if err := c.BodyParser(&body); err != nil { // parse JSON body
		return err
	}
	rawBody := c.Body()        // raw body bytes
	bodyStr := string(rawBody) // body as string

	// Parse form data
	formField := c.FormValue("username")       // form field
	formFile, _ := c.FormFile("avatar")        // file upload
	_ = formFile

	// ====================
	// LOCALS (share data antar middleware)
	// ====================
	c.Locals("user_id", "uuid-123")           // set local
	userID := c.Locals("user_id")             // get local (returns interface{})
	userIDStr, _ := userID.(string)           // type assert

	// ====================
	// COOKIES
	// ====================
	c.Cookie(&fiber.Cookie{
		Name:     "session",
		Value:    "abc123",
		HTTPOnly: true,
		Secure:   true,
	})
	sessionCookie := c.Cookies("session")     // baca cookie
	c.ClearCookie("session")                  // hapus cookie

	// ====================
	// RESPONSE METHODS
	// ====================
	// c.Status(200)                             // set status code
	// c.JSON(fiber.Map{...})                    // send JSON
	// c.SendString("text")                      // send plain text
	// c.SendStatus(fiber.StatusNoContent)       // send status only
	// c.Send([]byte{...})                       // send bytes
	// c.Redirect("/new-path", 301)              // redirect
	// c.Download("file.pdf")                    // download file
	// c.SendFile("./static/file.pdf")           // send file

	// Dump vars (hindari "declared but not used")
	_ = method; _ = path; _ = baseURL; _ = originalURL
	_ = ip; _ = hostname; _ = protocol; _ = secure
	_ = id; _ = idWithDefault; _ = page; _ = name; _ = isActive
	_ = authHeader; _ = contentType; _ = userAgent
	_ = acceptLang; _ = reqID
	_ = body; _ = bodyStr; _ = formField
	_ = userIDStr; _ = sessionCookie

	return c.JSON(fiber.Map{
		"method":   c.Method(),
		"path":     c.Path(),
		"ip":       c.IP(),
	})
}
```

### 4. Custom AppError & Error Handler

```go
// pkg/apperror/apperror.go
package apperror

import (
	"errors"
	"net/http"
)

// ErrorCode enum
type ErrorCode string

const (
	ErrBadRequest          ErrorCode = "BAD_REQUEST"
	ErrUnauthorized        ErrorCode = "UNAUTHORIZED"
	ErrForbidden           ErrorCode = "FORBIDDEN"
	ErrNotFound            ErrorCode = "NOT_FOUND"
	ErrConflict            ErrorCode = "CONFLICT"
	ErrUnprocessable       ErrorCode = "UNPROCESSABLE_ENTITY"
	ErrTooManyRequests     ErrorCode = "TOO_MANY_REQUESTS"
	ErrInternalServerError ErrorCode = "INTERNAL_SERVER_ERROR"
)

// AppError struct (custom error type)
type AppError struct {
	Code       ErrorCode   `json:"code"`
	Message    string      `json:"message"`
	Details    interface{} `json:"details,omitempty"`
	StatusCode int         `json:"-"` // HTTP status, jangan expose ke client
}

// Error implements error interface
func (e *AppError) Error() string {
	return e.Message
}

// New — generic AppError
func New(code ErrorCode, message string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

// NewWithDetails — AppError dengan detail tambahan
func NewWithDetails(code ErrorCode, message string, statusCode int, details interface{}) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
		Details:    details,
	}
}

// ===== Shortcut Constructors =====

func BadRequest(message string) *AppError {
	return New(ErrBadRequest, message, http.StatusBadRequest)
}

func BadRequestWithDetails(message string, details interface{}) *AppError {
	return NewWithDetails(ErrBadRequest, message, http.StatusBadRequest, details)
}

func Unauthorized(message string) *AppError {
	return New(ErrUnauthorized, message, http.StatusUnauthorized)
}

func Forbidden(message string) *AppError {
	return New(ErrForbidden, message, http.StatusForbidden)
}

func NotFound(message string) *AppError {
	return New(ErrNotFound, message, http.StatusNotFound)
}

func Conflict(message string) *AppError {
	return New(ErrConflict, message, http.StatusConflict)
}

func Unprocessable(message string, details interface{}) *AppError {
	return NewWithDetails(ErrUnprocessable, message, http.StatusUnprocessableEntity, details)
}

func TooManyRequests(message string) *AppError {
	return New(ErrTooManyRequests, message, http.StatusTooManyRequests)
}

func InternalServerError(message string) *AppError {
	return New(ErrInternalServerError, message, http.StatusInternalServerError)
}

// IsAppError — cek apakah error adalah AppError
func IsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}
```

```go
// pkg/apperror/handler.go
package apperror

import (
	"errors"
	"log"

	"github.com/gofiber/fiber/v2"
)

// ErrorResponse — format JSON error ke client
type ErrorResponse struct {
	Success bool        `json:"success"`
	Error   ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    ErrorCode   `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// GlobalErrorHandler — pasang ke fiber.Config.ErrorHandler
func GlobalErrorHandler(c *fiber.Ctx, err error) error {
	// Default: 500
	statusCode := fiber.StatusInternalServerError
	code := ErrInternalServerError
	message := "An unexpected error occurred"
	var details interface{}

	// Cek tipe error
	switch {
	// AppError (custom error kita)
	case func() bool {
		var appErr *AppError
		return errors.As(err, &appErr)
	}():
		var appErr *AppError
		errors.As(err, &appErr)
		statusCode = appErr.StatusCode
		code = appErr.Code
		message = appErr.Message
		details = appErr.Details

	// Fiber built-in error (404 dari app.Use di akhir, dll)
	case func() bool {
		var fiberErr *fiber.Error
		return errors.As(err, &fiberErr)
	}():
		var fiberErr *fiber.Error
		errors.As(err, &fiberErr)
		statusCode = fiberErr.Code
		message = fiberErr.Message
		switch fiberErr.Code {
		case fiber.StatusBadRequest:
			code = ErrBadRequest
		case fiber.StatusUnauthorized:
			code = ErrUnauthorized
		case fiber.StatusForbidden:
			code = ErrForbidden
		case fiber.StatusNotFound:
			code = ErrNotFound
		default:
			code = ErrInternalServerError
		}
	}

	// Log 5xx errors
	if statusCode >= 500 {
		log.Printf("[ERROR] %d - %s | Path: %s | IP: %s | Error: %v",
			statusCode, c.Method(), c.Path(), c.IP(), err)
	}

	return c.Status(statusCode).JSON(ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}
```

### 5. Custom Middleware Lengkap

```go
// internal/middleware/request_id.go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const RequestIDKey = "request_id"
const RequestIDHeader = "X-Request-ID"

// RequestID — generate UUID untuk setiap request
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Cek kalau client sudah kirim request ID
		requestID := c.Get(RequestIDHeader)
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Simpan ke locals (buat diakses handler)
		c.Locals(RequestIDKey, requestID)

		// Set di response header juga
		c.Set(RequestIDHeader, requestID)

		return c.Next()
	}
}
```

```go
// internal/middleware/logger.go
package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
)

// Logger — custom structured logger
func Logger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Process request
		err := c.Next()

		// Log setelah handler selesai
		duration := time.Since(start)
		status := c.Response().StatusCode()
		requestID := c.Locals(RequestIDKey)

		// Color code berdasarkan status
		statusStr := colorizeStatus(status)

		fmt.Printf("[%s] %s | %s %s | %s | IP: %s | ReqID: %v\n",
			time.Now().Format("2006-01-02 15:04:05"),
			statusStr,
			c.Method(),
			c.Path(),
			duration,
			c.IP(),
			requestID,
		)

		return err
	}
}

func colorizeStatus(status int) string {
	switch {
	case status >= 500:
		return fmt.Sprintf("\033[31m%d\033[0m", status) // red
	case status >= 400:
		return fmt.Sprintf("\033[33m%d\033[0m", status) // yellow
	case status >= 300:
		return fmt.Sprintf("\033[36m%d\033[0m", status) // cyan
	default:
		return fmt.Sprintf("\033[32m%d\033[0m", status) // green
	}
}
```

```go
// internal/middleware/recovery.go
package middleware

import (
	"fmt"
	"runtime/debug"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/fiber-rest-api/pkg/apperror"
)

// Recovery — catch panic & convert ke error response
func Recovery() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				// Log stack trace
				fmt.Printf("[PANIC] Recovered: %v\n%s\n", r, debug.Stack())

				// Return 500 kepada client
				_ = c.Status(fiber.StatusInternalServerError).JSON(apperror.ErrorResponse{
					Success: false,
					Error: apperror.ErrorDetail{
						Code:    apperror.ErrInternalServerError,
						Message: "Internal server error",
					},
				})
			}
		}()

		return c.Next()
	}
}
```

```go
// internal/middleware/timeout.go
package middleware

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/fiber-rest-api/pkg/apperror"
)

// Timeout — batalkan request kalau lebih dari durasi yang ditentukan
func Timeout(duration time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Buat context dengan timeout
		ctx, cancel := context.WithTimeout(c.Context(), duration)
		defer cancel()

		// Set context ke fiber
		c.SetUserContext(ctx)

		// Channel buat hasil
		done := make(chan error, 1)

		go func() {
			done <- c.Next()
		}()

		select {
		case err := <-done:
			return err
		case <-ctx.Done():
			return apperror.New(
				apperror.ErrTooManyRequests,
				"Request timeout",
				fiber.StatusRequestTimeout,
			)
		}
	}
}
```

```go
// internal/middleware/auth.go
package middleware

import (
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/fiber-rest-api/pkg/apperror"
)

const (
	UserIDKey   = "user_id"
	UserRoleKey = "user_role"
	TokenKey    = "token"
)

// JWTClaims — custom JWT claims
type JWTClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// JWTConfig — config untuk JWT middleware
type JWTConfig struct {
	Secret        []byte
	TokenLookup   string // "header:Authorization" atau "cookie:token"
	AuthScheme    string // "Bearer"
	ContextKey    string // key buat c.Locals()
}

// DefaultJWTConfig — default config
var DefaultJWTConfig = JWTConfig{
	TokenLookup: "header:Authorization",
	AuthScheme:  "Bearer",
	ContextKey:  TokenKey,
}

// Auth — JWT authentication middleware
func Auth(secret string) fiber.Handler {
	jwtSecret := []byte(secret)

	return func(c *fiber.Ctx) error {
		// Ambil token dari Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return apperror.Unauthorized("Missing authorization header")
		}

		// Validasi format "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return apperror.Unauthorized("Invalid authorization format, expected 'Bearer <token>'")
		}

		tokenStr := parts[1]

		// Parse & validasi JWT
		token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
			// Validasi signing method
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, apperror.Unauthorized("Invalid token signing method")
			}
			return jwtSecret, nil
		})

		if err != nil {
			return apperror.Unauthorized("Invalid or expired token")
		}

		// Extract claims
		claims, ok := token.Claims.(*JWTClaims)
		if !ok || !token.Valid {
			return apperror.Unauthorized("Invalid token claims")
		}

		// Cek expiry
		if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
			return apperror.Unauthorized("Token has expired")
		}

		// Simpan ke Locals — bisa diakses handler setelahnya
		c.Locals(UserIDKey, claims.UserID)
		c.Locals(UserRoleKey, claims.Role)
		c.Locals(TokenKey, tokenStr)

		return c.Next()
	}
}

// RequireRole — role-based access control middleware
func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, ok := c.Locals(UserRoleKey).(string)
		if !ok || userRole == "" {
			return apperror.Forbidden("User role not found in context")
		}

		for _, role := range roles {
			if userRole == role {
				return c.Next()
			}
		}

		return apperror.Forbidden("You don't have permission to access this resource")
	}
}

// GenerateToken — helper untuk generate JWT (di service/auth)
func GenerateToken(userID, email, role, secret string, expiry time.Duration) (string, error) {
	claims := JWTClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "fiber-rest-api",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
```

```go
// internal/middleware/cors.go
package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// CORSConfig — allowed origins per environment
type CORSConfig struct {
	AllowedOrigins string
}

// CORS — configure cross-origin resource sharing
func CORS(config CORSConfig) fiber.Handler {
	return cors.New(cors.Config{
		AllowOrigins:     config.AllowedOrigins,
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Content-Length,Accept,Authorization,X-Request-ID",
		ExposeHeaders:    "X-Request-ID",
		AllowCredentials: true,
		MaxAge:           86400, // 24 jam cache preflight
	})
}
```

### 6. Response Helper

```go
// pkg/response/response.go
package response

import "github.com/gofiber/fiber/v2"

// SuccessResp — standard success wrapper
type SuccessResp struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// PaginatedResp — success dengan pagination meta
type PaginatedResp struct {
	Success    bool        `json:"success"`
	Message    string      `json:"message"`
	Data       interface{} `json:"data"`
	Pagination Pagination  `json:"pagination"`
}

// Pagination metadata
type Pagination struct {
	Page      int   `json:"page"`
	PageSize  int   `json:"page_size"`
	Total     int64 `json:"total"`
	TotalPage int64 `json:"total_page"`
}

// OK — 200 OK
func OK(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(SuccessResp{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// Created — 201 Created
func Created(c *fiber.Ctx, message string, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(SuccessResp{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// NoContent — 204 No Content
func NoContent(c *fiber.Ctx) error {
	return c.SendStatus(fiber.StatusNoContent)
}

// Paginated — 200 OK dengan pagination
func Paginated(c *fiber.Ctx, message string, data interface{}, page, pageSize int, total int64) error {
	totalPage := total / int64(pageSize)
	if total%int64(pageSize) > 0 {
		totalPage++
	}

	return c.Status(fiber.StatusOK).JSON(PaginatedResp{
		Success: true,
		Message: message,
		Data:    data,
		Pagination: Pagination{
			Page:      page,
			PageSize:  pageSize,
			Total:     total,
			TotalPage: totalPage,
		},
	})
}
```

### 7. Handler — Thin Layer

```go
// internal/user/handler.go
package user

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/yourusername/fiber-rest-api/internal/middleware"
	"github.com/yourusername/fiber-rest-api/pkg/apperror"
	"github.com/yourusername/fiber-rest-api/pkg/response"
	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// Handler — thin HTTP handler
type Handler struct {
	service Service
}

// NewHandler — constructor dengan dependency injection
func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes — attach routes ke Fiber app
func (h *Handler) RegisterRoutes(router fiber.Router, authSecret string) {
	users := router.Group("/users")

	// Public routes
	users.Get("/", h.GetAll)
	users.Get("/:id", h.GetByID)

	// Protected routes (butuh JWT)
	protected := users.Group("/", middleware.Auth(authSecret))
	protected.Post("/", h.Create)
	protected.Put("/:id", h.Update)
	protected.Patch("/:id/status", h.UpdateStatus)
	protected.Delete("/:id", h.Delete)

	// Admin-only routes
	adminOnly := users.Group("/admin",
		middleware.Auth(authSecret),
		middleware.RequireRole("admin"),
	)
	adminOnly.Get("/", h.GetAllAdmin)
}

// GetAll — GET /users?page=1&page_size=10&q=keyword
func (h *Handler) GetAll(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("page_size", 10)
	keyword := c.Query("q", "")

	// Guard: validasi input
	if page < 1 {
		return apperror.BadRequest("page must be >= 1")
	}
	if pageSize < 1 || pageSize > 100 {
		return apperror.BadRequest("page_size must be between 1 and 100")
	}

	// Panggil service
	users, total, err := h.service.GetAll(c.Context(), page, pageSize, keyword)
	if err != nil {
		return err // di-handle GlobalErrorHandler
	}

	return response.Paginated(c, "Users retrieved successfully", users, page, pageSize, total)
}

// GetByID — GET /users/:id
func (h *Handler) GetByID(c *fiber.Ctx) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}

	user, err := h.service.GetByID(c.Context(), id)
	if err != nil {
		return err
	}

	return response.OK(c, "User retrieved successfully", user)
}

// Create — POST /users
func (h *Handler) Create(c *fiber.Ctx) error {
	var req CreateRequest

	if err := c.BodyParser(&req); err != nil {
		return apperror.BadRequest("Invalid request body: " + err.Error())
	}

	if errs := validateRequest(req); errs != nil {
		return apperror.Unprocessable("Validation failed", errs)
	}

	user, err := h.service.Create(c.Context(), req)
	if err != nil {
		return err
	}

	return response.Created(c, "User created successfully", user)
}

// Update — PUT /users/:id
func (h *Handler) Update(c *fiber.Ctx) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}

	// Cek ownership (user hanya bisa update data sendiri kecuali admin)
	callerID := c.Locals(middleware.UserIDKey).(string)
	callerRole := c.Locals(middleware.UserRoleKey).(string)

	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return apperror.BadRequest("Invalid request body")
	}

	if errs := validateRequest(req); errs != nil {
		return apperror.Unprocessable("Validation failed", errs)
	}

	user, err := h.service.Update(c.Context(), id, callerID, callerRole, req)
	if err != nil {
		return err
	}

	return response.OK(c, "User updated successfully", user)
}

// UpdateStatus — PATCH /users/:id/status
func (h *Handler) UpdateStatus(c *fiber.Ctx) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}

	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.BodyParser(&req); err != nil {
		return apperror.BadRequest("Invalid request body")
	}

	if err := h.service.UpdateStatus(c.Context(), id, req.IsActive); err != nil {
		return err
	}

	return response.OK(c, "User status updated", nil)
}

// Delete — DELETE /users/:id
func (h *Handler) Delete(c *fiber.Ctx) error {
	id, err := parseUintParam(c, "id")
	if err != nil {
		return err
	}

	callerRole := c.Locals(middleware.UserRoleKey).(string)

	if err := h.service.Delete(c.Context(), id, callerRole); err != nil {
		return err
	}

	return response.NoContent(c)
}

// GetAllAdmin — GET /users/admin (admin only)
func (h *Handler) GetAllAdmin(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	pageSize := c.QueryInt("page_size", 50)

	// Admin bisa lihat deleted users juga
	includeDeleted := c.QueryBool("include_deleted", false)

	users, total, err := h.service.GetAllAdmin(c.Context(), page, pageSize, includeDeleted)
	if err != nil {
		return err
	}

	return response.Paginated(c, "Admin: users retrieved", users, page, pageSize, total)
}

// ====================
// HELPER FUNCTIONS
// ====================

// parseUintParam — parse route param ke uint, return AppError kalau invalid
func parseUintParam(c *fiber.Ctx, key string) (uint, error) {
	val, err := strconv.ParseUint(c.Params(key), 10, 64)
	if err != nil {
		return 0, apperror.BadRequest("Invalid ID format")
	}
	return uint(val), nil
}

// validateRequest — validate struct, return map error field
func validateRequest(req interface{}) map[string]string {
	err := validate.Struct(req)
	if err == nil {
		return nil
	}

	errs := make(map[string]string)
	for _, e := range err.(validator.ValidationErrors) {
		errs[e.Field()] = formatValidationMessage(e)
	}
	return errs
}

func formatValidationMessage(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return e.Field() + " is required"
	case "email":
		return e.Field() + " must be a valid email"
	case "min":
		return e.Field() + " minimum length is " + e.Param()
	case "max":
		return e.Field() + " maximum length is " + e.Param()
	default:
		return e.Field() + " is invalid"
	}
}
```

```go
// internal/user/entity.go
package user

import "time"

// User entity
type User struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateRequest — POST body
type CreateRequest struct {
	Name     string `json:"name" validate:"required,min=3,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Role     string `json:"role" validate:"omitempty,oneof=admin user"`
}

// UpdateRequest — PUT body
type UpdateRequest struct {
	Name  string `json:"name" validate:"omitempty,min=3,max=100"`
	Email string `json:"email" validate:"omitempty,email"`
}
```

```go
// internal/user/service.go
package user

import (
	"context"
	"errors"
	"fmt"

	"github.com/yourusername/fiber-rest-api/pkg/apperror"
)

// Service interface
type Service interface {
	GetAll(ctx context.Context, page, pageSize int, keyword string) ([]User, int64, error)
	GetByID(ctx context.Context, id uint) (*User, error)
	Create(ctx context.Context, req CreateRequest) (*User, error)
	Update(ctx context.Context, id uint, callerID, callerRole string, req UpdateRequest) (*User, error)
	UpdateStatus(ctx context.Context, id uint, isActive bool) error
	Delete(ctx context.Context, id uint, callerRole string) error
	GetAllAdmin(ctx context.Context, page, pageSize int, includeDeleted bool) ([]User, int64, error)
}

// Repository interface
type Repository interface {
	FindAll(ctx context.Context, limit, offset int, keyword string) ([]User, int64, error)
	FindAllIncludeDeleted(ctx context.Context, limit, offset int) ([]User, int64, error)
	FindByID(ctx context.Context, id uint) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	Create(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id uint) error
}

type service struct {
	repo Repository
}

// NewService — constructor
func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetAll(ctx context.Context, page, pageSize int, keyword string) ([]User, int64, error) {
	offset := (page - 1) * pageSize
	users, total, err := s.repo.FindAll(ctx, pageSize, offset, keyword)
	if err != nil {
		return nil, 0, apperror.InternalServerError("Failed to retrieve users")
	}
	return users, total, nil
}

func (s *service) GetByID(ctx context.Context, id uint) (*User, error) {
	user, err := s.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil, apperror.NotFound(fmt.Sprintf("User with ID %d not found", id))
		}
		return nil, apperror.InternalServerError("Failed to retrieve user")
	}
	return user, nil
}

func (s *service) Create(ctx context.Context, req CreateRequest) (*User, error) {
	// Cek duplikat email
	existing, _ := s.repo.FindByEmail(ctx, req.Email)
	if existing != nil {
		return nil, apperror.Conflict("Email already registered")
	}

	role := req.Role
	if role == "" {
		role = "user"
	}

	user := &User{
		Name:     req.Name,
		Email:    req.Email,
		Role:     role,
		IsActive: true,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, apperror.InternalServerError("Failed to create user")
	}

	return user, nil
}

func (s *service) Update(ctx context.Context, id uint, callerID, callerRole string, req UpdateRequest) (*User, error) {
	user, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, apperror.NotFound(fmt.Sprintf("User with ID %d not found", id))
	}

	// Cek permission: hanya admin atau owner yang bisa update
	if callerRole != "admin" && fmt.Sprintf("%d", user.ID) != callerID {
		return nil, apperror.Forbidden("You can only update your own account")
	}

	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Email != "" {
		// Cek duplikat email
		existing, _ := s.repo.FindByEmail(ctx, req.Email)
		if existing != nil && existing.ID != user.ID {
			return nil, apperror.Conflict("Email already registered")
		}
		user.Email = req.Email
	}

	if err := s.repo.Update(ctx, user); err != nil {
		return nil, apperror.InternalServerError("Failed to update user")
	}

	return user, nil
}

func (s *service) UpdateStatus(ctx context.Context, id uint, isActive bool) error {
	user, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return apperror.NotFound(fmt.Sprintf("User with ID %d not found", id))
	}

	user.IsActive = isActive
	return s.repo.Update(ctx, user)
}

func (s *service) Delete(ctx context.Context, id uint, callerRole string) error {
	if callerRole != "admin" {
		return apperror.Forbidden("Only admin can delete users")
	}

	_, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return apperror.NotFound(fmt.Sprintf("User with ID %d not found", id))
	}

	return s.repo.Delete(ctx, id)
}

func (s *service) GetAllAdmin(ctx context.Context, page, pageSize int, includeDeleted bool) ([]User, int64, error) {
	offset := (page - 1) * pageSize
	if includeDeleted {
		return s.repo.FindAllIncludeDeleted(ctx, pageSize, offset)
	}
	return s.repo.FindAll(ctx, pageSize, offset, "")
}

// Sentinel errors
var ErrNotFound = errors.New("record not found")
```

### 8. Static Files & File Upload

```go
// internal/upload/handler.go
package upload

import (
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/yourusername/fiber-rest-api/pkg/apperror"
	"github.com/yourusername/fiber-rest-api/pkg/response"
)

const (
	MaxFileSize      = 5 * 1024 * 1024  // 5MB
	UploadDir        = "./uploads"
)

var allowedMimeTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
}

var allowedExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".gif":  true,
}

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	uploads := router.Group("/uploads")
	uploads.Post("/image", h.UploadImage)
	uploads.Post("/multiple", h.UploadMultiple)
}

// UploadImage — single file upload
func (h *Handler) UploadImage(c *fiber.Ctx) error {
	file, err := c.FormFile("image")
	if err != nil {
		return apperror.BadRequest("No file uploaded")
	}

	// Validasi ukuran
	if file.Size > MaxFileSize {
		return apperror.BadRequest(fmt.Sprintf("File too large. Max size is %dMB", MaxFileSize/1024/1024))
	}

	// Validasi extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExtensions[ext] {
		return apperror.BadRequest("File type not allowed. Allowed: jpg, png, webp, gif")
	}

	// Generate unique filename
	uniqueName := fmt.Sprintf("%s_%d%s",
		uuid.New().String(),
		time.Now().Unix(),
		ext,
	)
	savePath := filepath.Join(UploadDir, uniqueName)

	// Simpan file
	if err := c.SaveFile(file, savePath); err != nil {
		return apperror.InternalServerError("Failed to save file")
	}

	fileURL := fmt.Sprintf("/static/%s", uniqueName)

	return response.Created(c, "File uploaded successfully", fiber.Map{
		"filename":   uniqueName,
		"url":        fileURL,
		"size":       file.Size,
		"mime_type":  file.Header.Get("Content-Type"),
	})
}

// UploadMultiple — multiple files upload
func (h *Handler) UploadMultiple(c *fiber.Ctx) error {
	form, err := c.MultipartForm()
	if err != nil {
		return apperror.BadRequest("Invalid multipart form")
	}

	files := form.File["images"]
	if len(files) == 0 {
		return apperror.BadRequest("No files uploaded")
	}

	if len(files) > 5 {
		return apperror.BadRequest("Maximum 5 files allowed")
	}

	var uploadedFiles []fiber.Map

	for _, file := range files {
		if file.Size > MaxFileSize {
			return apperror.BadRequest(fmt.Sprintf("File %s too large", file.Filename))
		}

		ext := strings.ToLower(filepath.Ext(file.Filename))
		if !allowedExtensions[ext] {
			return apperror.BadRequest(fmt.Sprintf("File type not allowed: %s", file.Filename))
		}

		uniqueName := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().UnixNano(), ext)
		savePath := filepath.Join(UploadDir, uniqueName)

		if err := c.SaveFile(file, savePath); err != nil {
			return apperror.InternalServerError("Failed to save file: " + file.Filename)
		}

		uploadedFiles = append(uploadedFiles, fiber.Map{
			"filename": uniqueName,
			"url":      fmt.Sprintf("/static/%s", uniqueName),
			"size":     file.Size,
		})
	}

	return response.Created(c, "Files uploaded successfully", uploadedFiles)
}
```

### 9. Main Application — Full Wiring

```go
// cmd/api/main.go
package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"

	"github.com/yourusername/fiber-rest-api/internal/middleware"
	"github.com/yourusername/fiber-rest-api/internal/upload"
	"github.com/yourusername/fiber-rest-api/internal/user"
	"github.com/yourusername/fiber-rest-api/pkg/apperror"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println(".env file not found, using environment variables")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "default-secret-change-in-production"
	}
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "3000"
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		AppName:           "Fiber REST API v1.0",
		ErrorHandler:      apperror.GlobalErrorHandler,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		BodyLimit:         10 * 1024 * 1024, // 10MB
		EnablePrintRoutes: true,
	})

	// ====================
	// MIDDLEWARE CHAIN
	// Urutan ini penting!
	// ====================

	// 1. Recovery paling pertama (catch semua panic)
	app.Use(middleware.Recovery())

	// 2. Request ID (generate UUID per request)
	app.Use(middleware.RequestID())

	// 3. Logger (pakai request ID yang sudah di-generate)
	app.Use(middleware.Logger())

	// 4. CORS (sebelum auth)
	app.Use(middleware.CORS(middleware.CORSConfig{
		AllowedOrigins: "http://localhost:3000,http://localhost:5173",
	}))

	// 5. Timeout (default 15 detik per request)
	app.Use(middleware.Timeout(15 * time.Second))

	// ====================
	// STATIC FILES
	// ====================

	// Serve uploaded files: GET /static/filename.jpg
	app.Static("/static", "./uploads", fiber.Static{
		Compress:      true,
		Browse:        false,
		CacheDuration: 24 * time.Hour,
	})

	// Serve public folder
	app.Static("/public", "./public")

	// ====================
	// HEALTH CHECK
	// ====================

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"success":    true,
			"status":     "healthy",
			"request_id": c.Locals(middleware.RequestIDKey),
		})
	})

	// ====================
	// API ROUTES
	// ====================

	// In-memory repository untuk demo (bisa diganti GORM)
	userRepo := user.NewInMemoryRepository()

	// Dependency injection
	userService := user.NewService(userRepo)
	userHandler := user.NewHandler(userService)
	uploadHandler := upload.NewHandler()

	// API groups
	api := app.Group("/api")
	v1 := api.Group("/v1")
	v2 := api.Group("/v2")

	// v1 routes
	userHandler.RegisterRoutes(v1, jwtSecret)
	uploadHandler.RegisterRoutes(v1)

	// v2 routes (misal ada perubahan)
	v2.Get("/users", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"version": "v2",
			"notice":  "This is v2 API with breaking changes",
		})
	})

	// Demo auth endpoint
	api.Post("/auth/login", func(c *fiber.Ctx) error {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
		}

		if err := c.BodyParser(&req); err != nil {
			return apperror.BadRequest("Invalid request body")
		}

		// Simulasi login (di realnya: cek DB, hash password)
		if req.Email == "" || req.Password == "" {
			return apperror.BadRequest("Email and password required")
		}

		// Generate token
		token, err := middleware.GenerateToken(
			"1",
			req.Email,
			"user",
			jwtSecret,
			24*time.Hour,
		)
		if err != nil {
			return apperror.InternalServerError("Failed to generate token")
		}

		return c.JSON(fiber.Map{
			"success": true,
			"message": "Login successful",
			"data": fiber.Map{
				"token":      token,
				"token_type": "Bearer",
				"expires_in": 86400,
			},
		})
	})

	// 404 handler (harus paling terakhir!)
	app.Use(func(c *fiber.Ctx) error {
		return apperror.NotFound(
			fmt.Sprintf("Route '%s %s' not found", c.Method(), c.Path()),
		)
	})

	// ====================
	// GRACEFUL SHUTDOWN
	// ====================

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		sig := <-sigChan

		log.Printf("Received signal: %v. Shutting down...", sig)
		if err := app.Shutdown(); err != nil {
			log.Printf("Error during shutdown: %v", err)
		}
	}()

	// Start server
	log.Printf("🚀 Server running on http://localhost:%s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Server error: %v", err)
	}

	log.Println("Server stopped gracefully")
}
```

```go
// internal/user/repository_inmemory.go
package user

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"
)

// InMemoryRepository — implementasi pakai map (untuk demo tanpa DB)
type InMemoryRepository struct {
	mu      sync.RWMutex
	users   map[uint]*User
	counter uint
}

// NewInMemoryRepository — constructor
func NewInMemoryRepository() Repository {
	repo := &InMemoryRepository{
		users:   make(map[uint]*User),
		counter: 0,
	}

	// Seed data awal
	repo.users[1] = &User{ID: 1, Name: "Admin User", Email: "admin@example.com", Role: "admin", IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	repo.users[2] = &User{ID: 2, Name: "Regular User", Email: "user@example.com", Role: "user", IsActive: true, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	repo.counter = 2

	return repo
}

func (r *InMemoryRepository) FindAll(ctx context.Context, limit, offset int, keyword string) ([]User, int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []User
	for _, u := range r.users {
		if keyword == "" ||
			strings.Contains(strings.ToLower(u.Name), strings.ToLower(keyword)) ||
			strings.Contains(strings.ToLower(u.Email), strings.ToLower(keyword)) {
			result = append(result, *u)
		}
	}

	total := int64(len(result))

	// Pagination
	if offset >= len(result) {
		return []User{}, total, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], total, nil
}

func (r *InMemoryRepository) FindAllIncludeDeleted(ctx context.Context, limit, offset int) ([]User, int64, error) {
	return r.FindAll(ctx, limit, offset, "")
}

func (r *InMemoryRepository) FindByID(ctx context.Context, id uint) (*User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if u, ok := r.users[id]; ok {
		return u, nil
	}
	return nil, ErrNotFound
}

func (r *InMemoryRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, u := range r.users {
		if strings.EqualFold(u.Email, email) {
			return u, nil
		}
	}
	return nil, ErrNotFound
}

func (r *InMemoryRepository) Create(ctx context.Context, user *User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.counter++
	user.ID = r.counter
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	r.users[user.ID] = user
	return nil
}

func (r *InMemoryRepository) Update(ctx context.Context, user *User) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.users[user.ID]; !ok {
		return errors.New("user not found")
	}

	user.UpdatedAt = time.Now()
	r.users[user.ID] = user
	return nil
}

func (r *InMemoryRepository) Delete(ctx context.Context, id uint) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.users[id]; !ok {
		return ErrNotFound
	}

	delete(r.users, id)
	return nil
}
```

### 10. Testing dengan cURL

```bash
# ===== HEALTH CHECK =====
curl http://localhost:3000/health

# ===== AUTH =====
# Login (simulasi)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# Simpan token dari response
TOKEN="eyJhbGci..." # paste token dari response login

# ===== USERS (PUBLIC) =====
# Get all users
curl "http://localhost:3000/api/v1/users"

# Get all with pagination
curl "http://localhost:3000/api/v1/users?page=1&page_size=5"

# Search users
curl "http://localhost:3000/api/v1/users?q=budi"

# Get by ID
curl http://localhost:3000/api/v1/users/1

# ===== USERS (PROTECTED) =====
# Create user (butuh token)
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "password": "password123",
    "role": "user"
  }'

# Update user
curl -X PUT http://localhost:3000/api/v1/users/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Budi Updated"}'

# Patch status
curl -X PATCH http://localhost:3000/api/v1/users/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"is_active": false}'

# Delete user (admin only)
curl -X DELETE http://localhost:3000/api/v1/users/2 \
  -H "Authorization: Bearer $TOKEN"

# ===== FILE UPLOAD =====
# Upload single image
curl -X POST http://localhost:3000/api/v1/uploads/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@/path/to/photo.jpg"

# Upload multiple
curl -X POST http://localhost:3000/api/v1/uploads/multiple \
  -H "Authorization: Bearer $TOKEN" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg"

# ===== ERROR CASES =====
# 404 not found
curl http://localhost:3000/api/v1/nonexistent

# 401 unauthorized (no token)
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'

# 422 validation error
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "A", "email": "invalid-email"}'

# ===== API v2 =====
curl http://localhost:3000/api/v2/users
```

### 11. fmt import di main.go

```go
// Tambahkan import ini di cmd/api/main.go jika belum ada
import "fmt"
```

## ❌ Common Mistakes + Fix

### Mistake 1: Middleware Order Salah

```go
// ❌ BAD: Logger setelah routes (request ga ke-log)
app.Get("/users", handler)
app.Use(middleware.Logger()) // terlalu telat!

// ✅ GOOD: Middleware global dulu, routes belakangan
app.Use(middleware.Recovery())
app.Use(middleware.Logger())
app.Get("/users", handler)
```

### Mistake 2: Handler Terlalu Gemuk (Fat Handler)

```go
// ❌ BAD: Business logic di handler
func (h *Handler) Create(c *fiber.Ctx) error {
    var req CreateRequest
    c.BodyParser(&req)
    
    // Logic validasi duplikat email langsung di handler
    var user User
    db.Where("email = ?", req.Email).First(&user)
    if user.ID != 0 {
        return c.Status(400).JSON(...)
    }
    
    // Hash password di handler
    hashed, _ := bcrypt.GenerateFromPassword(...)
    
    // Insert ke DB di handler
    db.Create(&User{Email: req.Email, Password: string(hashed)})
    
    return c.JSON(...)
}

// ✅ GOOD: Handler hanya parse & delegate ke service
func (h *Handler) Create(c *fiber.Ctx) error {
    var req CreateRequest
    if err := c.BodyParser(&req); err != nil {
        return apperror.BadRequest("Invalid body")
    }
    if errs := validateRequest(req); errs != nil {
        return apperror.Unprocessable("Validation failed", errs)
    }
    user, err := h.service.Create(c.Context(), req)
    if err != nil {
        return err // GlobalErrorHandler handle ini
    }
    return response.Created(c, "Success", user)
}
```

### Mistake 3: Tidak Menggunakan c.Next() di Middleware

```go
// ❌ BAD: Lupa c.Next(), request berhenti di sini
app.Use(func(c *fiber.Ctx) error {
    log.Println("request received")
    // handler ga pernah dipanggil!
    return nil
})

// ✅ GOOD: Selalu panggil c.Next()
app.Use(func(c *fiber.Ctx) error {
    log.Println("request received")
    return c.Next() // lanjut ke middleware/handler berikutnya
})
```

### Mistake 4: c.Locals() Tanpa Type Check

```go
// ❌ BAD: Panic kalau Locals nil atau tipe salah
userID := c.Locals("user_id").(string) // panic kalau nil!

// ✅ GOOD: Gunakan comma-ok pattern
userID, ok := c.Locals("user_id").(string)
if !ok || userID == "" {
    return apperror.Unauthorized("User not authenticated")
}
```

### Mistake 5: Return Error Langsung dari Handler (bukan AppError)

```go
// ❌ BAD: Generic error, tidak ada info HTTP status
func (h *Handler) GetByID(c *fiber.Ctx) error {
    user, err := h.service.GetByID(c.Context(), id)
    if err != nil {
        return err // GlobalErrorHandler tidak tau status code-nya apa
    }
    return response.OK(c, "Success", user)
}

// ✅ GOOD: Service wrap error jadi AppError
// Di service:
func (s *service) GetByID(ctx context.Context, id uint) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, apperror.NotFound("User not found") // AppError dengan 404
    }
    return user, nil
}
// Handler cukup return err, GlobalErrorHandler sisanya
```

### Mistake 6: BodyParser + Validate Terpisah

```go
// ❌ RIBET: Parse dan validasi manual di tiap handler
func (h *Handler) Create(c *fiber.Ctx) error {
    var req CreateRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(400).JSON(...)
    }
    if req.Name == "" {
        return c.Status(400).JSON(...)
    }
    if req.Email == "" {
        return c.Status(400).JSON(...)
    }
    // ...dan seterusnya tiap field
}

// ✅ CLEAN: Pakai struct tag + validator sekali jalan
type CreateRequest struct {
    Name  string `json:"name" validate:"required,min=3"`
    Email string `json:"email" validate:"required,email"`
}

func (h *Handler) Create(c *fiber.Ctx) error {
    var req CreateRequest
    if err := c.BodyParser(&req); err != nil {
        return apperror.BadRequest("Invalid body")
    }
    if errs := validateRequest(req); errs != nil {
        return apperror.Unprocessable("Validation failed", errs)
    }
    // ...
}
```

## ✅ Checklist Akhir

**Routing:**
- [ ] Paham HTTP method: Get, Post, Put, Patch, Delete
- [ ] Bisa ambil route params: `c.Params("id")`
- [ ] Bisa ambil query params: `c.Query()`, `c.QueryInt()`, `c.QueryBool()`
- [ ] Bisa grouping routes & API versioning (/api/v1, /api/v2)
- [ ] Middleware per-group vs global

**Context (c *fiber.Ctx):**
- [ ] Parse request body: `c.BodyParser()`
- [ ] Akses headers: `c.Get()`, `c.Set()`
- [ ] Baca & simpan locals: `c.Locals()`
- [ ] Response: `c.JSON()`, `c.Status()`, `c.SendString()`

**Middleware:**
- [ ] Paham urutan middleware yang benar (Recovery → Logger → RequestID → CORS → Auth)
- [ ] Selalu panggil `c.Next()` kecuali mau stop request
- [ ] Pass data dari middleware ke handler dengan `c.Locals()`
- [ ] Bikin middleware yang bisa di-compose (Auth + RequireRole)

**Error Handling:**
- [ ] Custom AppError struct dengan code & statusCode
- [ ] Global error handler di Fiber config
- [ ] Map error ke HTTP status yang tepat
- [ ] Service selalu return AppError

**Handler Pattern:**
- [ ] Handler hanya: parse → validate → call service → response
- [ ] No business logic di handler
- [ ] No database access di handler

**File Handling:**
- [ ] Serve static files dengan `app.Static()`
- [ ] Upload single & multiple files
- [ ] Validasi file size & type

## 💭 Ide Pengembangan Mandiri

### Level 1: Tambahkan ke Project Ini
- Rate limiting middleware (pakai `limiter` package dari fiber)
- Request body size limit per endpoint
- API key authentication (alternatif JWT)
- Response compression (gzip)
- Health check dengan DB ping

### Level 2: Fitur Baru
- WebSocket endpoint untuk real-time notification
- Server-Sent Events (SSE) untuk live updates
- Swagger/OpenAPI documentation (`fiber-swagger`)
- Request & response logging ke file
- Metrics endpoint (Prometheus)

### Level 3: Production-Ready
- Graceful shutdown dengan cleanup semua resource
- Circuit breaker untuk external API calls
- Distributed tracing (OpenTelemetry)
- Redis rate limiting (distributed)
- Blue-green deployment strategy

### Referensi Middleware Fiber Resmi:
- `github.com/gofiber/fiber/v2/middleware/cache` — response caching
- `github.com/gofiber/fiber/v2/middleware/limiter` — rate limiting
- `github.com/gofiber/fiber/v2/middleware/compress` — gzip compression
- `github.com/gofiber/fiber/v2/middleware/monitor` — live metrics dashboard
- `github.com/gofiber/fiber/v2/middleware/pprof` — profiling

---

**Selamat belajar REST API dengan Fiber! Fokus ke thin handler pattern dan middleware chain dulu — dua konsep itu yang paling sering salah di real project. Tulis ulang sampai hafal!** 🚀💪
