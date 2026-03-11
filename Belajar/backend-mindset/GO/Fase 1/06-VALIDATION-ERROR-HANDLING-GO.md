# ✅ Validation + Error Handling di Go

## 🎯 Tujuan Belajar

Setelah materi ini, kamu bisa:
- ✅ Implement validation dengan go-playground/validator
- ✅ Bikin custom validator function untuk business rule
- ✅ Handle validation error dengan custom message
- ✅ Bikin custom error types yang reusable
- ✅ Implement error wrapping untuk tracing error flow
- ✅ Setup global error handler di Fiber
- ✅ Return consistent error response format
- ✅ Handle panic dengan recovery middleware
- ✅ Log error dengan proper context

---

## 💡 Konsep + Analogi

### 1. **Validation dengan Struct Tags**

**Analogi**: Kayak Zod atau Yup di TypeScript, tapi validasi-nya pakai struct tags.

Di Next.js dengan Zod:
```typescript
// TypeScript
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().min(18).max(100),
});

userSchema.parse(data); // Throw error kalau invalid
```

Di Go dengan validator:
```go
// Go
type User struct {
    Email    string `validate:"required,email"`
    Password string `validate:"required,min=8"`
    Age      int    `validate:"required,min=18,max=100"`
}

validate.Struct(user) // Return error kalau invalid
```

**Perbedaan**:
- TypeScript: Runtime + compile-time type safety
- Go: Runtime validation aja, tapi struct tags lebih readable

---

### 2. **Error Types (Custom Error)**

**Analogi**: Kayak custom Error class di TypeScript/JavaScript.

Di TypeScript:
```typescript
class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

Di Go:
```go
type NotFoundError struct {
    Resource string
    ID       string
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s with id %s not found", e.Resource, e.ID)
}
```

**Di Go lebih fleksibel**: Bisa embed error interface, tambah field custom, dan tetep type-safe.

---

### 3. **Error Wrapping**

**Analogi**: Kayak error stack trace, tapi lebih explicit.

Di Next.js:
```typescript
try {
  const user = await getUser(id);
} catch (error) {
  throw new Error(`Failed to get user: ${error.message}`);
}
```

Di Go:
```go
user, err := getUser(id)
if err != nil {
    return fmt.Errorf("failed to get user: %w", err)
}
```

**`%w` itu penting**: Mempertahankan original error, jadi bisa di-unwrap pakai `errors.Is()` atau `errors.As()`.

---

### 4. **Global Error Handler**

**Analogi**: Kayak error boundary di React atau middleware error handler di Express.

Di Express:
```typescript
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    error: err.message
  });
});
```

Di Fiber:
```go
app := fiber.New(fiber.Config{
    ErrorHandler: func(c *fiber.Ctx, err error) error {
        return handleError(c, err)
    },
})
```

**Keuntungan**: Semua error handling di satu tempat, consistent response format.

---

## 📝 Materi + Kode Lengkap

### Project Structure

```
.
├── main.go
├── go.mod
├── internal/
│   ├── config/
│   │   └── validator.go
│   ├── errors/
│   │   ├── app_error.go
│   │   └── types.go
│   ├── middleware/
│   │   ├── error_handler.go
│   │   └── recovery.go
│   ├── dto/
│   │   └── user.go
│   ├── validators/
│   │   └── custom.go
│   ├── models/
│   │   └── user.go
│   └── user/
│       ├── handler.go
│       ├── service.go
│       └── repository.go
└── pkg/
    ├── response/
    │   └── response.go
    └── logger/
        └── logger.go
```

---

### Step 1: Setup Project

```bash
# Terminal
mkdir go-validation-error && cd go-validation-error
go mod init go-validation-error

# Install dependencies
go get github.com/gofiber/fiber/v2
go get github.com/go-playground/validator/v10
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/google/uuid
go get go.uber.org/zap  # For structured logging
```

---

### Step 2: Validator Config

```go
// internal/config/validator.go
package config

import (
	"go-validation-error/internal/validators"

	"github.com/go-playground/validator/v10"
)

var Validator *validator.Validate

// InitValidator inisialisasi validator instance
func InitValidator() {
	Validator = validator.New()

	// Register custom validators
	Validator.RegisterValidation("strong_password", validators.StrongPassword)
	Validator.RegisterValidation("indonesian_phone", validators.IndonesianPhone)
	Validator.RegisterValidation("alpha_space", validators.AlphaSpace)
}

// GetValidator return validator instance
func GetValidator() *validator.Validate {
	return Validator
}
```

**Analogi**: Ini kayak setup global validator instance. Di TypeScript biasanya kamu import Zod langsung, di Go kita setup singleton validator yang udah di-register custom validator.

---

### Step 3: Custom Validators

```go
// internal/validators/custom.go
package validators

import (
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

// StrongPassword validasi password minimal:
// - 8 karakter
// - Ada huruf besar
// - Ada huruf kecil
// - Ada angka
// - Ada special character
func StrongPassword(fl validator.FieldLevel) bool {
	password := fl.Field().String()

	if len(password) < 8 {
		return false
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	hasSpecial := regexp.MustCompile(`[!@#$%^&*(),.?":{}|<>]`).MatchString(password)

	return hasUpper && hasLower && hasNumber && hasSpecial
}

// IndonesianPhone validasi nomor HP Indonesia
// Format: 08xx, +628xx, atau 628xx
func IndonesianPhone(fl validator.FieldLevel) bool {
	phone := fl.Field().String()

	// Remove spaces and dashes
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")

	patterns := []string{
		`^08[0-9]{8,11}$`,        // 08123456789
		`^\+628[0-9]{8,11}$`,     // +628123456789
		`^628[0-9]{8,11}$`,       // 628123456789
	}

	for _, pattern := range patterns {
		matched, _ := regexp.MatchString(pattern, phone)
		if matched {
			return true
		}
	}

	return false
}

// AlphaSpace hanya allow huruf dan spasi (untuk nama)
func AlphaSpace(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	matched, _ := regexp.MatchString(`^[a-zA-Z\s]+$`, value)
	return matched
}
```

**Penjelasan**:
- Custom validator itu function dengan signature `func(fl validator.FieldLevel) bool`
- Return `true` = valid, `false` = invalid
- Kamu bisa akses field value dengan `fl.Field()`

---

### Step 4: Custom Error Types

```go
// internal/errors/app_error.go
package errors

import (
	"fmt"
	"net/http"
)

// AppError adalah base error structure untuk semua error di aplikasi
type AppError struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
	Status  int               `json:"-"` // HTTP status code
	Err     error             `json:"-"` // Original error (untuk logging)
}

// Error implement error interface
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

// Unwrap implement error unwrapping
func (e *AppError) Unwrap() error {
	return e.Err
}

// NewAppError create new AppError
func NewAppError(code, message string, status int, err error) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Status:  status,
		Err:     err,
	}
}

// WithDetails tambahkan details ke error
func (e *AppError) WithDetails(details map[string]string) *AppError {
	e.Details = details
	return e
}
```

**Analogi**: 
- `AppError` ini kayak base Error class di OOP
- `Unwrap()` memungkinkan error wrapping (untuk error tracing)
- `Details` untuk validation errors atau field-specific errors

---

### Step 5: Error Types (Factory Functions)

```go
// internal/errors/types.go
package errors

import "net/http"

// NotFoundError - resource tidak ditemukan
func NotFoundError(resource, id string) *AppError {
	return &AppError{
		Code:    "NOT_FOUND",
		Message: resource + " not found",
		Status:  http.StatusNotFound,
		Details: map[string]string{
			"resource": resource,
			"id":       id,
		},
	}
}

// ValidationError - data tidak valid
func ValidationError(message string, details map[string]string) *AppError {
	return &AppError{
		Code:    "VALIDATION_ERROR",
		Message: message,
		Status:  http.StatusBadRequest,
		Details: details,
	}
}

// UnauthorizedError - user belum login atau token invalid
func UnauthorizedError(message string) *AppError {
	if message == "" {
		message = "Unauthorized"
	}
	return &AppError{
		Code:    "UNAUTHORIZED",
		Message: message,
		Status:  http.StatusUnauthorized,
	}
}

// ForbiddenError - user tidak punya akses
func ForbiddenError(message string) *AppError {
	if message == "" {
		message = "Forbidden"
	}
	return &AppError{
		Code:    "FORBIDDEN",
		Message: message,
		Status:  http.StatusForbidden,
	}
}

// ConflictError - resource sudah ada (duplicate)
func ConflictError(resource, field, value string) *AppError {
	return &AppError{
		Code:    "CONFLICT",
		Message: resource + " already exists",
		Status:  http.StatusConflict,
		Details: map[string]string{
			"resource": resource,
			"field":    field,
			"value":    value,
		},
	}
}

// InternalError - server error
func InternalError(message string, err error) *AppError {
	if message == "" {
		message = "Internal server error"
	}
	return &AppError{
		Code:    "INTERNAL_ERROR",
		Message: message,
		Status:  http.StatusInternalServerError,
		Err:     err,
	}
}

// BadRequestError - request tidak valid (generic)
func BadRequestError(message string) *AppError {
	return &AppError{
		Code:    "BAD_REQUEST",
		Message: message,
		Status:  http.StatusBadRequest,
	}
}
```

**Analogi**: Factory functions ini kayak helper untuk create specific error types. Lebih clean daripada manual create `AppError` struct setiap kali.

---

### Step 6: Response Helper

```go
// pkg/response/response.go
package response

import (
	"github.com/gofiber/fiber/v2"
)

// SuccessResponse format standard untuk response sukses
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Meta    interface{} `json:"meta,omitempty"`
}

// ErrorResponse format standard untuk error response
type ErrorResponse struct {
	Success bool               `json:"success"`
	Error   ErrorDetailResponse `json:"error"`
}

// ErrorDetailResponse detail error
type ErrorDetailResponse struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
}

// JSON return success response
func JSON(c *fiber.Ctx, status int, data interface{}) error {
	return c.Status(status).JSON(SuccessResponse{
		Success: true,
		Data:    data,
	})
}

// JSONWithMeta return success response dengan meta (pagination, dll)
func JSONWithMeta(c *fiber.Ctx, status int, data interface{}, meta interface{}) error {
	return c.Status(status).JSON(SuccessResponse{
		Success: true,
		Data:    data,
		Meta:    meta,
	})
}

// Error return error response
func Error(c *fiber.Ctx, status int, code, message string, details map[string]string) error {
	return c.Status(status).JSON(ErrorResponse{
		Success: false,
		Error: ErrorDetailResponse{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}
```

**Analogi**: Helper functions ini bikin response format konsisten di semua endpoint. Di Next.js kamu mungkin bikin helper `sendSuccess()` dan `sendError()`.

---

### Step 7: Logger Setup

```go
// pkg/logger/logger.go
package logger

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.Logger

// InitLogger inisialisasi structured logger
func InitLogger() {
	// Config untuk development
	config := zap.NewDevelopmentConfig()
	config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	var err error
	Log, err = config.Build()
	if err != nil {
		panic(err)
	}
}

// Info log info level
func Info(msg string, fields ...zap.Field) {
	Log.Info(msg, fields...)
}

// Error log error level
func Error(msg string, fields ...zap.Field) {
	Log.Error(msg, fields...)
}

// Warn log warning level
func Warn(msg string, fields ...zap.Field) {
	Log.Warn(msg, fields...)
}

// Debug log debug level
func Debug(msg string, fields ...zap.Field) {
	Log.Debug(msg, fields...)
}

// Fatal log fatal level dan exit
func Fatal(msg string, fields ...zap.Field) {
	Log.Fatal(msg, fields...)
}

// Sync flush buffered logs
func Sync() {
	Log.Sync()
}

// GetLogger return logger instance
func GetLogger() *zap.Logger {
	if Log == nil {
		InitLogger()
	}
	return Log
}

// ForProduction switch ke production config
func ForProduction() {
	config := zap.NewProductionConfig()
	config.EncoderConfig.TimeKey = "timestamp"
	config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

	// Output ke file di production
	config.OutputPaths = []string{"stdout", "logs/app.log"}
	config.ErrorOutputPaths = []string{"stderr", "logs/error.log"}

	var err error
	Log, err = config.Build()
	if err != nil {
		panic(err)
	}
}

// Example usage:
// logger.Info("User created", zap.String("email", user.Email), zap.Uint("id", user.ID))
// logger.Error("Failed to create user", zap.Error(err), zap.String("email", email))
```

**Analogi**: Structured logging ini kayak Winston atau Pino di Node.js. Bedanya sama `fmt.Println()`:
- Structured logger: JSON format, ada level, ada field context
- Println: Plain text, susah di-parse

---

### Step 8: Error Handler Middleware

```go
// internal/middleware/error_handler.go
package middleware

import (
	"errors"
	"strings"

	customErrors "go-validation-error/internal/errors"
	"go-validation-error/pkg/logger"
	"go-validation-error/pkg/response"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ErrorHandler adalah global error handler untuk Fiber
func ErrorHandler(c *fiber.Ctx, err error) error {
	// Default error
	code := "INTERNAL_ERROR"
	message := "Internal server error"
	status := fiber.StatusInternalServerError
	var details map[string]string

	// Check error type
	var appErr *customErrors.AppError
	if errors.As(err, &appErr) {
		// Custom AppError
		code = appErr.Code
		message = appErr.Message
		status = appErr.Status
		details = appErr.Details

		// Log error dengan context
		if appErr.Err != nil {
			logger.Error("Application error",
				zap.String("code", code),
				zap.String("message", message),
				zap.Error(appErr.Err),
				zap.String("path", c.Path()),
				zap.String("method", c.Method()),
			)
		}
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		// GORM record not found
		code = "NOT_FOUND"
		message = "Resource not found"
		status = fiber.StatusNotFound

		logger.Warn("Resource not found",
			zap.String("path", c.Path()),
			zap.String("method", c.Method()),
		)
	} else if validationErrors, ok := err.(validator.ValidationErrors); ok {
		// Validator validation errors
		code = "VALIDATION_ERROR"
		message = "Validation failed"
		status = fiber.StatusBadRequest
		details = formatValidationErrors(validationErrors)

		logger.Warn("Validation failed",
			zap.Any("errors", details),
			zap.String("path", c.Path()),
		)
	} else if fiberErr, ok := err.(*fiber.Error); ok {
		// Fiber error
		code = "HTTP_ERROR"
		message = fiberErr.Message
		status = fiberErr.Code

		logger.Warn("Fiber error",
			zap.Int("status", status),
			zap.String("message", message),
		)
	} else {
		// Unknown error
		logger.Error("Unexpected error",
			zap.Error(err),
			zap.String("path", c.Path()),
			zap.String("method", c.Method()),
		)
	}

	// Return error response
	return response.Error(c, status, code, message, details)
}

// formatValidationErrors convert validator.ValidationErrors ke map
func formatValidationErrors(errs validator.ValidationErrors) map[string]string {
	out := make(map[string]string)

	for _, err := range errs {
		field := strings.ToLower(err.Field())
		
		switch err.Tag() {
		case "required":
			out[field] = field + " is required"
		case "email":
			out[field] = field + " must be a valid email"
		case "min":
			out[field] = field + " must be at least " + err.Param() + " characters"
		case "max":
			out[field] = field + " must be at most " + err.Param() + " characters"
		case "len":
			out[field] = field + " must be exactly " + err.Param() + " characters"
		case "oneof":
			out[field] = field + " must be one of: " + err.Param()
		case "url":
			out[field] = field + " must be a valid URL"
		case "uuid":
			out[field] = field + " must be a valid UUID"
		case "strong_password":
			out[field] = field + " must contain uppercase, lowercase, number, and special character"
		case "indonesian_phone":
			out[field] = field + " must be a valid Indonesian phone number"
		case "alpha_space":
			out[field] = field + " must contain only letters and spaces"
		default:
			out[field] = field + " is invalid"
		}
	}

	return out
}
```

**Highlight**:
- Error handler bisa detect berbagai tipe error (AppError, GORM, Validator, Fiber)
- Semua error di-log dengan context (path, method, dll)
- Validation errors di-format jadi user-friendly messages
- Stack trace TIDAK di-expose ke client (keamanan)

---

### Step 9: Recovery Middleware

```go
// internal/middleware/recovery.go
package middleware

import (
	"fmt"
	"runtime/debug"

	"go-validation-error/pkg/logger"
	"go-validation-error/pkg/response"

	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

// Recovery middleware untuk catch panic
func Recovery() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				// Get stack trace
				stack := string(debug.Stack())

				// Log panic
				logger.Error("Panic recovered",
					zap.Any("panic", r),
					zap.String("stack", stack),
					zap.String("path", c.Path()),
					zap.String("method", c.Method()),
				)

				// Return error response
				err := response.Error(
					c,
					fiber.StatusInternalServerError,
					"INTERNAL_ERROR",
					"Internal server error",
					nil,
				)

				if err != nil {
					logger.Error("Failed to send error response", zap.Error(err))
				}
			}
		}()

		return c.Next()
	}
}
```

**Analogi**: Recovery middleware ini kayak try-catch global. Di TypeScript/Express:
```typescript
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
});
```

Di Go, panic bisa di-recover dengan `defer recover()`. Middleware ini memastikan 1 request panic tidak crash seluruh server.

---

### Step 10: DTO dengan Validation Tags

```go
// internal/dto/user.go
package dto

// CreateUserRequest DTO untuk create user
type CreateUserRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,strong_password"`
	Name     string `json:"name" validate:"required,alpha_space,min=3,max=100"`
	Phone    string `json:"phone" validate:"required,indonesian_phone"`
	Age      int    `json:"age" validate:"required,min=17,max=100"`
	Role     string `json:"role" validate:"required,oneof=user admin moderator"`
}

// UpdateUserRequest DTO untuk update user
type UpdateUserRequest struct {
	Name  *string `json:"name" validate:"omitempty,alpha_space,min=3,max=100"`
	Phone *string `json:"phone" validate:"omitempty,indonesian_phone"`
	Age   *int    `json:"age" validate:"omitempty,min=17,max=100"`
}

// CreateAddressRequest nested struct
type CreateAddressRequest struct {
	Street  string `json:"street" validate:"required,min=5,max=200"`
	City    string `json:"city" validate:"required,min=2,max=100"`
	State   string `json:"state" validate:"required,min=2,max=100"`
	ZipCode string `json:"zip_code" validate:"required,len=5"`
	Country string `json:"country" validate:"required,oneof=Indonesia Malaysia Singapore"`
}

// CreateUserWithAddressRequest dengan nested struct
type CreateUserWithAddressRequest struct {
	Email    string                `json:"email" validate:"required,email"`
	Password string                `json:"password" validate:"required,strong_password"`
	Name     string                `json:"name" validate:"required,alpha_space,min=3,max=100"`
	Address  CreateAddressRequest  `json:"address" validate:"required,dive"`
}

// BulkCreateUserRequest dengan slice validation
type BulkCreateUserRequest struct {
	Users []CreateUserRequest `json:"users" validate:"required,min=1,max=100,dive"`
}

// UserResponse DTO untuk response
type UserResponse struct {
	ID    uint   `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Phone string `json:"phone"`
	Age   int    `json:"age"`
	Role  string `json:"role"`
}
```

**Penjelasan Validation Tags**:
- `required` - field wajib diisi
- `email` - format email
- `min=x` - minimal x karakter/value
- `max=x` - maksimal x karakter/value
- `len=x` - panjang tepat x karakter
- `oneof=a b c` - value harus salah satu dari: a, b, atau c
- `omitempty` - skip validasi kalau field kosong (untuk optional field)
- `dive` - validasi nested struct/slice
- `strong_password` - custom validator kita
- `indonesian_phone` - custom validator kita
- `alpha_space` - custom validator kita

---

### Step 11: Models

```go
// internal/models/user.go
package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Email    string `gorm:"uniqueIndex;not null" json:"email"`
	Password string `gorm:"not null" json:"-"`
	Name     string `gorm:"not null" json:"name"`
	Phone    string `gorm:"not null" json:"phone"`
	Age      int    `gorm:"not null" json:"age"`
	Role     string `gorm:"default:user" json:"role"`
}
```

---

### Step 12: Repository Layer

```go
// internal/user/repository.go
package user

import (
	"context"
	"go-validation-error/internal/models"

	"gorm.io/gorm"
)

type Repository interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id uint) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, limit, offset int) ([]models.User, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *repository) GetByID(ctx context.Context, id uint) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).First(&user, id).Error
	return &user, err
}

func (r *repository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *repository) Update(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.User{}, id).Error
}

func (r *repository) List(ctx context.Context, limit, offset int) ([]models.User, error) {
	var users []models.User
	err := r.db.WithContext(ctx).
		Limit(limit).
		Offset(offset).
		Find(&users).Error
	return users, err
}
```

---

### Step 13: Service Layer (dengan Error Handling)

```go
// internal/user/service.go
package user

import (
	"context"
	"errors"
	"fmt"

	"go-validation-error/internal/dto"
	customErrors "go-validation-error/internal/errors"
	"go-validation-error/internal/models"
	"go-validation-error/pkg/logger"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Service interface {
	CreateUser(ctx context.Context, req *dto.CreateUserRequest) (*dto.UserResponse, error)
	GetUser(ctx context.Context, id uint) (*dto.UserResponse, error)
	UpdateUser(ctx context.Context, id uint, req *dto.UpdateUserRequest) (*dto.UserResponse, error)
	DeleteUser(ctx context.Context, id uint) error
	ListUsers(ctx context.Context, limit, offset int) ([]dto.UserResponse, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateUser(ctx context.Context, req *dto.CreateUserRequest) (*dto.UserResponse, error) {
	// Business rule validation: check email uniqueness
	existingUser, err := s.repo.GetByEmail(ctx, req.Email)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		// Database error
		logger.Error("Failed to check email",
			zap.Error(err),
			zap.String("email", req.Email),
		)
		return nil, customErrors.InternalError("Failed to check email", err)
	}

	if existingUser != nil && existingUser.ID > 0 {
		// Email already exists
		return nil, customErrors.ConflictError("User", "email", req.Email)
	}

	// Business rule validation: age must be >= 17
	if req.Age < 17 {
		return nil, customErrors.ValidationError(
			"User must be at least 17 years old",
			map[string]string{
				"age": "Must be at least 17 years old",
			},
		)
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		logger.Error("Failed to hash password", zap.Error(err))
		return nil, customErrors.InternalError("Failed to hash password", err)
	}

	// Create user
	user := &models.User{
		Email:    req.Email,
		Password: string(hashedPassword),
		Name:     req.Name,
		Phone:    req.Phone,
		Age:      req.Age,
		Role:     req.Role,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		logger.Error("Failed to create user",
			zap.Error(err),
			zap.String("email", req.Email),
		)
		return nil, customErrors.InternalError("Failed to create user", err)
	}

	logger.Info("User created successfully",
		zap.Uint("user_id", user.ID),
		zap.String("email", user.Email),
	)

	return s.toUserResponse(user), nil
}

func (s *service) GetUser(ctx context.Context, id uint) (*dto.UserResponse, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, customErrors.NotFoundError("User", fmt.Sprint(id))
		}
		logger.Error("Failed to get user",
			zap.Error(err),
			zap.Uint("user_id", id),
		)
		return nil, customErrors.InternalError("Failed to get user", err)
	}

	return s.toUserResponse(user), nil
}

func (s *service) UpdateUser(ctx context.Context, id uint, req *dto.UpdateUserRequest) (*dto.UserResponse, error) {
	// Get existing user
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, customErrors.NotFoundError("User", fmt.Sprint(id))
		}
		logger.Error("Failed to get user",
			zap.Error(err),
			zap.Uint("user_id", id),
		)
		return nil, customErrors.InternalError("Failed to get user", err)
	}

	// Update fields (only if provided)
	if req.Name != nil {
		user.Name = *req.Name
	}
	if req.Phone != nil {
		user.Phone = *req.Phone
	}
	if req.Age != nil {
		// Business rule: age must be >= 17
		if *req.Age < 17 {
			return nil, customErrors.ValidationError(
				"User must be at least 17 years old",
				map[string]string{
					"age": "Must be at least 17 years old",
				},
			)
		}
		user.Age = *req.Age
	}

	if err := s.repo.Update(ctx, user); err != nil {
		logger.Error("Failed to update user",
			zap.Error(err),
			zap.Uint("user_id", id),
		)
		return nil, customErrors.InternalError("Failed to update user", err)
	}

	logger.Info("User updated successfully",
		zap.Uint("user_id", user.ID),
	)

	return s.toUserResponse(user), nil
}

func (s *service) DeleteUser(ctx context.Context, id uint) error {
	// Check if user exists
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return customErrors.NotFoundError("User", fmt.Sprint(id))
		}
		logger.Error("Failed to get user",
			zap.Error(err),
			zap.Uint("user_id", id),
		)
		return customErrors.InternalError("Failed to get user", err)
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		logger.Error("Failed to delete user",
			zap.Error(err),
			zap.Uint("user_id", id),
		)
		return customErrors.InternalError("Failed to delete user", err)
	}

	logger.Info("User deleted successfully",
		zap.Uint("user_id", id),
	)

	return nil
}

func (s *service) ListUsers(ctx context.Context, limit, offset int) ([]dto.UserResponse, error) {
	users, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		logger.Error("Failed to list users", zap.Error(err))
		return nil, customErrors.InternalError("Failed to list users", err)
	}

	responses := make([]dto.UserResponse, len(users))
	for i, user := range users {
		responses[i] = *s.toUserResponse(&user)
	}

	return responses, nil
}

// Helper function
func (s *service) toUserResponse(user *models.User) *dto.UserResponse {
	return &dto.UserResponse{
		ID:    user.ID,
		Email: user.Email,
		Name:  user.Name,
		Phone: user.Phone,
		Age:   user.Age,
		Role:  user.Role,
	}
}
```

**Highlight**:
- Error di-wrap dengan context: `fmt.Errorf("failed to get user: %w", err)`
- Custom error types dipakai di business logic layer
- Semua error di-log SEBELUM return (dengan context)
- Business rule validation di service, bukan di handler

---

### Step 14: Handler Layer (dengan Validation)

```go
// internal/user/handler.go
package user

import (
	"strconv"

	"go-validation-error/internal/config"
	"go-validation-error/internal/dto"
	customErrors "go-validation-error/internal/errors"
	"go-validation-error/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// CreateUser godoc
// @Summary Create new user
// @Tags users
// @Accept json
// @Produce json
// @Param request body dto.CreateUserRequest true "Create user request"
// @Success 201 {object} response.SuccessResponse{data=dto.UserResponse}
// @Failure 400 {object} response.ErrorResponse
// @Router /users [post]
func (h *Handler) CreateUser(c *fiber.Ctx) error {
	var req dto.CreateUserRequest

	// Parse request body
	if err := c.BodyParser(&req); err != nil {
		return customErrors.BadRequestError("Invalid request body")
	}

	// Validate request
	if err := config.GetValidator().Struct(&req); err != nil {
		return err // Error handler akan tangkap dan format
	}

	// Call service
	user, err := h.service.CreateUser(c.Context(), &req)
	if err != nil {
		return err // Error handler akan tangkap
	}

	return response.JSON(c, fiber.StatusCreated, user)
}

// GetUser godoc
// @Summary Get user by ID
// @Tags users
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} response.SuccessResponse{data=dto.UserResponse}
// @Failure 404 {object} response.ErrorResponse
// @Router /users/{id} [get]
func (h *Handler) GetUser(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return customErrors.BadRequestError("Invalid user ID")
	}

	user, err := h.service.GetUser(c.Context(), uint(id))
	if err != nil {
		return err
	}

	return response.JSON(c, fiber.StatusOK, user)
}

// UpdateUser godoc
// @Summary Update user
// @Tags users
// @Accept json
// @Produce json
// @Param id path int true "User ID"
// @Param request body dto.UpdateUserRequest true "Update user request"
// @Success 200 {object} response.SuccessResponse{data=dto.UserResponse}
// @Failure 400 {object} response.ErrorResponse
// @Router /users/{id} [put]
func (h *Handler) UpdateUser(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return customErrors.BadRequestError("Invalid user ID")
	}

	var req dto.UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return customErrors.BadRequestError("Invalid request body")
	}

	// Validate request
	if err := config.GetValidator().Struct(&req); err != nil {
		return err
	}

	user, err := h.service.UpdateUser(c.Context(), uint(id), &req)
	if err != nil {
		return err
	}

	return response.JSON(c, fiber.StatusOK, user)
}

// DeleteUser godoc
// @Summary Delete user
// @Tags users
// @Produce json
// @Param id path int true "User ID"
// @Success 200 {object} response.SuccessResponse{data=map[string]string}
// @Failure 404 {object} response.ErrorResponse
// @Router /users/{id} [delete]
func (h *Handler) DeleteUser(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return customErrors.BadRequestError("Invalid user ID")
	}

	if err := h.service.DeleteUser(c.Context(), uint(id)); err != nil {
		return err
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{
		"message": "User deleted successfully",
	})
}

// ListUsers godoc
// @Summary List users
// @Tags users
// @Produce json
// @Param limit query int false "Limit" default(10)
// @Param offset query int false "Offset" default(0)
// @Success 200 {object} response.SuccessResponse{data=[]dto.UserResponse}
// @Router /users [get]
func (h *Handler) ListUsers(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "10"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	// Validate limits
	if limit < 1 || limit > 100 {
		limit = 10
	}
	if offset < 0 {
		offset = 0
	}

	users, err := h.service.ListUsers(c.Context(), limit, offset)
	if err != nil {
		return err
	}

	return response.JSON(c, fiber.StatusOK, users)
}
```

**Highlight**:
- Handler HANYA validate request format (parsing, validation tags)
- Business logic error langsung di-return (error handler yang handle)
- Gak perlu check error tipe di handler, global error handler yang urus

---

### Step 15: Main Application

```go
// main.go
package main

import (
	"fmt"
	"log"

	"go-validation-error/internal/config"
	"go-validation-error/internal/middleware"
	"go-validation-error/internal/models"
	"go-validation-error/internal/user"
	"go-validation-error/pkg/logger"
	"go-validation-error/pkg/response"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberLogger "github.com/gofiber/fiber/v2/middleware/logger"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

func main() {
	// Init logger
	logger.InitLogger()
	defer logger.Sync()

	// Init validator
	config.InitValidator()

	// Connect database
	dsn := "host=localhost user=postgres password=postgres dbname=go_validation_db port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// Auto migrate
	if err := db.AutoMigrate(&models.User{}); err != nil {
		log.Fatal("Failed to migrate:", err)
	}

	// Create Fiber app dengan custom error handler
	app := fiber.New(fiber.Config{
		ErrorHandler: middleware.ErrorHandler,
	})

	// Global middleware
	app.Use(middleware.Recovery())
	app.Use(fiberLogger.New())
	app.Use(cors.New())

	// Setup routes
	setupRoutes(app, db)

	// Start server
	port := 3000
	logger.Info(fmt.Sprintf("Server running on http://localhost:%d", port))
	log.Fatal(app.Listen(fmt.Sprintf(":%d", port)))
}

func setupRoutes(app *fiber.App, db *gorm.DB) {
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return response.JSON(c, fiber.StatusOK, fiber.Map{
			"status": "ok",
		})
	})

	// Initialize layers
	userRepo := user.NewRepository(db)
	userService := user.NewService(userRepo)
	userHandler := user.NewHandler(userService)

	// User routes
	api := app.Group("/api")
	users := api.Group("/users")

	users.Post("/", userHandler.CreateUser)
	users.Get("/", userHandler.ListUsers)
	users.Get("/:id", userHandler.GetUser)
	users.Put("/:id", userHandler.UpdateUser)
	users.Delete("/:id", userHandler.DeleteUser)

	// Error example routes (untuk testing)
	api.Get("/error/panic", func(c *fiber.Ctx) error {
		panic("This is a test panic!")
	})

	api.Get("/error/validation", func(c *fiber.Ctx) error {
		type TestValidation struct {
			Email string `validate:"required,email"`
		}
		test := TestValidation{Email: "invalid-email"}
		return config.GetValidator().Struct(&test)
	})
}
```

---

### Step 16: go.mod

```go
// go.mod
module go-validation-error

go 1.21

require (
	github.com/go-playground/validator/v10 v10.19.0
	github.com/gofiber/fiber/v2 v2.52.0
	github.com/google/uuid v1.6.0
	go.uber.org/zap v1.27.0
	golang.org/x/crypto v0.19.0
	gorm.io/driver/postgres v1.5.6
	gorm.io/gorm v1.25.7
)
```

---

## ❌ Common Mistakes + Fix

### 1. **Validasi di Layer yang Salah**

❌ **Salah**:
```go
// Di service layer, validate format email
if !strings.Contains(req.Email, "@") {
    return errors.New("invalid email")
}
```

✅ **Benar**:
```go
// Format validation di DTO/handler
type CreateUserRequest struct {
    Email string `validate:"required,email"`
}

// Business rule validation di service
existingUser, _ := s.repo.GetByEmail(ctx, req.Email)
if existingUser != nil {
    return customErrors.ConflictError("User", "email", req.Email)
}
```

**Solusi**:
- **Format validation** (email, min, max) → DTO tags + handler
- **Business rule** (unique email, age >= 17) → Service layer

---

### 2. **Langsung Return Error dari Repository**

❌ **Salah**:
```go
func (s *service) GetUser(id uint) (*User, error) {
    return s.repo.GetByID(id) // Error gorm.ErrRecordNotFound langsung ke handler
}
```

✅ **Benar**:
```go
func (s *service) GetUser(id uint) (*User, error) {
    user, err := s.repo.GetByID(id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, customErrors.NotFoundError("User", fmt.Sprint(id))
        }
        return nil, customErrors.InternalError("Failed to get user", err)
    }
    return user, nil
}
```

**Solusi**: Wrap error dari repository dengan custom error di service layer.

---

### 3. **Expose Stack Trace ke Client**

❌ **Salah**:
```go
return c.Status(500).JSON(fiber.Map{
    "error": err.Error(), // Bisa expose path, query, dll
    "stack": string(debug.Stack()), // Security risk!
})
```

✅ **Benar**:
```go
// Log stack trace
logger.Error("Error occurred", zap.Error(err), zap.String("stack", stack))

// Return generic message ke client
return response.Error(c, 500, "INTERNAL_ERROR", "Internal server error", nil)
```

**Solusi**: Log detail error di server, return generic message ke client.

---

### 4. **Gak Pakai Error Wrapping**

❌ **Salah**:
```go
if err != nil {
    return fmt.Errorf("failed to get user") // Original error hilang
}
```

✅ **Benar**:
```go
if err != nil {
    return fmt.Errorf("failed to get user: %w", err) // %w preserves error
}
```

**Solusi**: Pakai `%w` untuk error wrapping, jadi bisa di-unwrap dengan `errors.Is()` atau `errors.As()`.

---

### 5. **Log di Handler, Bukan di Service**

❌ **Salah**:
```go
// Handler
user, err := h.service.GetUser(id)
if err != nil {
    logger.Error("Failed to get user", zap.Error(err)) // Log di handler
    return err
}
```

✅ **Benar**:
```go
// Service
user, err := s.repo.GetByID(id)
if err != nil {
    logger.Error("Failed to get user", zap.Error(err)) // Log di service
    return customErrors.InternalError("Failed to get user", err)
}
```

**Solusi**: Log error di service layer (yang punya context lengkap), bukan di handler.

---

### 6. **Validation Error Message Gak User-Friendly**

❌ **Salah**:
```go
// Return raw validator error
return err // "Field validation for 'Email' failed on the 'email' tag"
```

✅ **Benar**:
```go
// Format ke user-friendly message
func formatValidationErrors(errs validator.ValidationErrors) map[string]string {
    out := make(map[string]string)
    for _, err := range errs {
        switch err.Tag() {
        case "email":
            out[err.Field()] = "must be a valid email"
        // ... dst
        }
    }
    return out
}
```

**Solusi**: Transform validation errors jadi map dengan custom messages.

---

### 7. **Gak Handle Panic**

❌ **Salah**:
```go
// Gak ada recovery middleware
app := fiber.New()
```

✅ **Benar**:
```go
app := fiber.New(fiber.Config{
    ErrorHandler: middleware.ErrorHandler,
})
app.Use(middleware.Recovery()) // Catch panic
```

**Solusi**: Selalu pakai recovery middleware untuk prevent server crash.

---

### 8. **Pointer Field di Update Request Tanpa omitempty**

❌ **Salah**:
```go
type UpdateUserRequest struct {
    Name string `validate:"min=3"` // Gak bisa distinguish antara "" dan field tidak diisi
}
```

✅ **Benar**:
```go
type UpdateUserRequest struct {
    Name *string `validate:"omitempty,min=3"` // Pointer + omitempty = optional
}
```

**Solusi**: Pakai pointer untuk optional field di update request, tambah `omitempty` di validation tag.

---

## ✅ Checklist Akhir

### Testing Validation

**1. Create User dengan Valid Data**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "phone": "081234567890",
    "age": 25,
    "role": "user"
  }'

# Expected: 201 Created
# {
#   "success": true,
#   "data": {
#     "id": 1,
#     "email": "test@example.com",
#     "name": "John Doe",
#     "phone": "081234567890",
#     "age": 25,
#     "role": "user"
#   }
# }
```

**2. Create User dengan Invalid Email**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "SecurePass123!",
    "name": "John Doe",
    "phone": "081234567890",
    "age": 25,
    "role": "user"
  }'

# Expected: 400 Bad Request
# {
#   "success": false,
#   "error": {
#     "code": "VALIDATION_ERROR",
#     "message": "Validation failed",
#     "details": {
#       "email": "email must be a valid email"
#     }
#   }
# }
```

**3. Create User dengan Weak Password**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "weak",
    "name": "John Doe",
    "phone": "081234567890",
    "age": 25,
    "role": "user"
  }'

# Expected: 400 Bad Request
# {
#   "success": false,
#   "error": {
#     "code": "VALIDATION_ERROR",
#     "message": "Validation failed",
#     "details": {
#       "password": "password must contain uppercase, lowercase, number, and special character"
#     }
#   }
# }
```

**4. Create User dengan Multiple Validation Errors**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid",
    "password": "weak",
    "name": "AB",
    "phone": "123",
    "age": 10,
    "role": "invalid"
  }'

# Expected: 400 Bad Request dengan multiple errors di details
```

**5. Create Duplicate User**
```bash
# Create user pertama
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "phone": "081234567890",
    "age": 25,
    "role": "user"
  }'

# Create user kedua dengan email sama
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Jane Doe",
    "phone": "081234567891",
    "age": 25,
    "role": "user"
  }'

# Expected: 409 Conflict
# {
#   "success": false,
#   "error": {
#     "code": "CONFLICT",
#     "message": "User already exists",
#     "details": {
#       "resource": "User",
#       "field": "email",
#       "value": "test@example.com"
#     }
#   }
# }
```

**6. Get Non-existent User**
```bash
curl http://localhost:3000/api/users/999

# Expected: 404 Not Found
# {
#   "success": false,
#   "error": {
#     "code": "NOT_FOUND",
#     "message": "User not found",
#     "details": {
#       "resource": "User",
#       "id": "999"
#     }
#   }
# }
```

**7. Update User dengan Partial Data**
```bash
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name"
  }'

# Expected: 200 OK (hanya name yang di-update)
```

**8. Test Panic Recovery**
```bash
curl http://localhost:3000/api/error/panic

# Expected: 500 Internal Server Error
# Server TIDAK crash, return error response
# Log di terminal ada panic stack trace
```

---

### Checking Logs

Setelah testing, check log output:

```bash
# Log format (structured JSON di production)
{
  "level": "error",
  "timestamp": "2026-02-26T10:30:00Z",
  "msg": "Failed to create user",
  "error": "database connection lost",
  "email": "test@example.com",
  "path": "/api/users",
  "method": "POST"
}
```

Log yang baik harus punya:
- ✅ Level (info, warn, error)
- ✅ Timestamp
- ✅ Message
- ✅ Context (email, user_id, path, method)
- ✅ Original error

---

### Database Check

```sql
-- Check data
SELECT * FROM users;

-- Check validation (email unique)
INSERT INTO users (email, password, name, phone, age, role, created_at, updated_at)
VALUES ('test@example.com', 'hash', 'Test', '08123456789', 25, 'user', NOW(), NOW());
-- Harus error: duplicate key
```

---

## 💭 Ide Pengembangan Mandiri

### 1. **Field-Level Custom Error Messages**
```go
type CreateUserRequest struct {
    Email string `validate:"required,email" error:"Email wajib diisi dengan format yang benar"`
}

// Custom tag untuk custom error message
```

### 2. **Cross-Field Validation**
```go
// Password dan ConfirmPassword harus sama
type RegisterRequest struct {
    Password        string `validate:"required,strong_password"`
    ConfirmPassword string `validate:"required,eqfield=Password"`
}
```

### 3. **Conditional Validation**
```go
// Phone required kalau email kosong
type ContactRequest struct {
    Email string `validate:"required_without=Phone,omitempty,email"`
    Phone string `validate:"required_without=Email,omitempty,indonesian_phone"`
}
```

### 4. **Custom Validator untuk Database Lookup**
```go
// Validate apakah category_id exists di database
func CategoryExists(fl validator.FieldLevel) bool {
    categoryID := fl.Field().Uint()
    var count int64
    db.Model(&Category{}).Where("id = ?", categoryID).Count(&count)
    return count > 0
}
```

### 5. **Internationalization (i18n) Error Messages**
```go
// Error message dalam bahasa Indonesia
func formatValidationErrors(errs validator.ValidationErrors, lang string) map[string]string {
    messages := map[string]map[string]string{
        "en": {
            "required": "is required",
            "email": "must be a valid email",
        },
        "id": {
            "required": "wajib diisi",
            "email": "harus berupa email yang valid",
        },
    }
    // Format based on lang
}
```

### 6. **Validation Groups**
```go
// Different validation rules untuk create vs update
type User struct {
    Email    string `validate:"required,email" groups:"create"`
    Password string `validate:"required,strong_password" groups:"create"`
    Name     string `validate:"required" groups:"create,update"`
}
```

### 7. **Error Code Constants**
```go
// Error codes sebagai constants
const (
    ErrCodeValidation   = "VALIDATION_ERROR"
    ErrCodeNotFound     = "NOT_FOUND"
    ErrCodeUnauthorized = "UNAUTHORIZED"
    // ... dst
)
```

### 8. **Request ID untuk Error Tracing**
```go
// Generate request ID, log dengan ID, return ke client
func ErrorHandler(c *fiber.Ctx, err error) error {
    requestID := c.Locals("requestID").(string)
    
    logger.Error("Request failed",
        zap.String("request_id", requestID),
        zap.Error(err),
    )
    
    return c.JSON(fiber.Map{
        "error": "Internal server error",
        "request_id": requestID, // Client bisa kasih ke support
    })
}
```

### 9. **Sentry/Error Tracking Integration**
```go
// Send critical errors ke Sentry
func ErrorHandler(c *fiber.Ctx, err error) error {
    if isInternalError(err) {
        sentry.CaptureException(err)
    }
    return handleError(c, err)
}
```

### 10. **Validation Middleware**
```go
// Middleware untuk auto-validate request
func ValidateRequest(dto interface{}) fiber.Handler {
    return func(c *fiber.Ctx) error {
        if err := c.BodyParser(dto); err != nil {
            return err
        }
        if err := validator.Struct(dto); err != nil {
            return err
        }
        c.Locals("validatedData", dto)
        return c.Next()
    }
}

// Usage
app.Post("/users", ValidateRequest(&CreateUserRequest{}), handler.CreateUser)
```

---

## 🎓 Poin Penting yang Harus Diingat

### Validation
- Pakai struct tags untuk format validation
- Custom validator untuk business-specific rules
- Nested struct pakai tag `dive`
- Slice validation pakai tag `dive`
- Optional field pakai pointer + `omitempty`

### Error Handling
- Buat custom error types (NotFoundError, ValidationError, dll)
- Wrap error dengan `fmt.Errorf("%w", err)`
- Log error di service layer dengan context
- Return generic error message ke client
- Handle panic dengan recovery middleware

### Error Handler
- Global error handler di Fiber config
- Detect error type dengan `errors.As()` dan `errors.Is()`
- Format validation errors jadi user-friendly
- JANGAN expose stack trace ke client
- Return consistent error format

### Logging
- Pakai structured logging (zap, zerolog)
- Log dengan context (user_id, request_id, path)
- Level: debug, info, warn, error, fatal
- Production: log ke file atau external service

### Best Practices
- Validation di layer yang tepat (format di handler, business di service)
- Consistent error response format
- Error wrapping untuk traceability
- Panic recovery untuk resilience

---

Selamat belajar! Dengan validation dan error handling yang proper, aplikasi kamu jadi lebih robust, maintainable, dan production-ready. 🚀

Ada yang mau ditanyakan?
