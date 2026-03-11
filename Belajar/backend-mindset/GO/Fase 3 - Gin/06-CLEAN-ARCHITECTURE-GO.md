# 🏗️ Clean Architecture Go yang Reusable dan Upgradeable

## 🎯 Tujuan Belajar

Setelah belajar ini, lo bisa:
- Pahami masalah yang terjadi tanpa clean architecture
- Design clean architecture dengan layers yang jelas
- Implement Entity, Repository, Service, Handler layers
- Setup dependency injection yang benar
- Design interface yang focused dan testable
- Implement repository pattern dengan transaction support
- Build service layer yang composable
- Refactor existing project ke clean architecture
- Test setiap layer secara terpisah
- Upgrade dan maintain codebase dengan mudah

## 💡 Konsep + Analogi

### Masalah Tanpa Clean Architecture

**❌ Bad Architecture (Spaghetti Code):**
```
┌─────────────────────────┐
│      HTTP Handler       │
│ - Parse request         │
│ - Query database ❌     │
│ - Business logic ❌     │
│ - Send response         │
└─────────────────────────┘
         ↓
    Database ❌
```

**Masalah:**
- Handler tahu detail database
- Tidak bisa test tanpa database
- Business logic campur dengan HTTP
- Susah ganti database
- Code duplication everywhere

**✅ Clean Architecture:**
```
┌────────────────┐
│    Handler     │  ← HTTP concerns only
└────────┬───────┘
         ↓
┌────────────────┐
│    Service     │  ← Business logic
└────────┬───────┘
         ↓
┌────────────────┐
│  Repository    │  ← Data access
└────────┬───────┘
         ↓
┌────────────────┐
│    Database    │
└────────────────┘
```

**Benefit:**
- Each layer has single responsibility
- Easy to test each layer
- Easy to swap implementations
- Business logic centralized
- Reusable components

### Analogi Frontend

| Backend Layer | Frontend Analogy | Responsibility |
|---------------|------------------|----------------|
| **Entity** | Type/Interface | Data structure only |
| **Repository** | API Service | Fetch/save data |
| **Service** | Business Logic Hook | Process data, orchestrate |
| **Handler** | Component | Render UI, handle events |

**Example di React:**
```typescript
// Entity (Type)
type User = { id: string; name: string }

// Repository (API Service)
const userAPI = {
  getAll: () => fetch('/api/users'),
  getById: (id) => fetch(`/api/users/${id}`)
}

// Service (Hook with logic)
const useUsers = () => {
  const [users, setUsers] = useState([])
  
  const loadUsers = async () => {
    const data = await userAPI.getAll()
    setUsers(data)
  }
  
  return { users, loadUsers }
}

// Handler (Component)
const UserList = () => {
  const { users, loadUsers } = useUsers()
  
  useEffect(() => { loadUsers() }, [])
  
  return <div>{users.map(u => <p>{u.name}</p>)}</div>
}
```

### Dependency Rule

```
┌─────────────────────────────────────┐
│           Outer Layer                │
│  (Framework, Database, HTTP)         │
│                                      │
│  ┌───────────────────────────────┐  │
│  │       Middle Layer            │  │
│  │  (Use Cases, Business Logic)  │  │
│  │                               │  │
│  │  ┌─────────────────────────┐ │  │
│  │  │     Inner Layer         │ │  │
│  │  │   (Entities, Domain)    │ │  │
│  │  │                         │ │  │
│  │  └─────────────────────────┘ │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                      │
└─────────────────────────────────────┘

Dependency Flow: Outer → Middle → Inner
Inner layer tidak boleh depend ke outer!
```

## 📝 Materi + Kode Lengkap

### 1. Project Structure

```
project/
├── cmd/
│   └── api/
│       └── main.go                 # Entry point, wiring
├── internal/
│   ├── domain/
│   │   └── user/
│   │       ├── entity.go           # Entity layer (pure struct)
│   │       ├── repository.go       # Repository interface
│   │       └── service.go          # Service interface
│   ├── repository/
│   │   └── mysql/
│   │       └── user_repository.go  # Repository implementation
│   ├── service/
│   │   └── user_service.go         # Service implementation
│   └── handler/
│       └── http/
│           └── user_handler.go     # HTTP handler
├── pkg/
│   ├── database/
│   │   └── mysql.go                # DB connection
│   └── errors/
│       └── errors.go               # Custom errors
├── config/
│   └── config.go                   # Configuration
└── go.mod
```

### 2. Entity Layer (Pure Domain)

```go
// internal/domain/user/entity.go
package user

import (
    "time"

    "github.com/google/uuid"
)

// User entity - pure domain model
// No database tags, no JSON tags, no external dependencies
type User struct {
    ID        string
    Email     string
    Name      string
    Password  string
    RoleID    string
    CreatedAt time.Time
    UpdatedAt time.Time
}

// NewUser creates a new user
func NewUser(email, name, password, roleID string) *User {
    return &User{
        ID:        uuid.New().String(),
        Email:     email,
        Name:      name,
        Password:  password,
        RoleID:    roleID,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }
}

// Validate validates user data
func (u *User) Validate() error {
    if u.Email == "" {
        return ErrInvalidEmail
    }
    if u.Name == "" {
        return ErrInvalidName
    }
    if len(u.Password) < 8 {
        return ErrPasswordTooShort
    }
    return nil
}

// ChangePassword changes user password
func (u *User) ChangePassword(newPassword string) error {
    if len(newPassword) < 8 {
        return ErrPasswordTooShort
    }
    u.Password = newPassword
    u.UpdatedAt = time.Now()
    return nil
}
```

```go
// internal/domain/user/errors.go
package user

import "errors"

var (
    ErrUserNotFound      = errors.New("user not found")
    ErrEmailExists       = errors.New("email already exists")
    ErrInvalidEmail      = errors.New("invalid email")
    ErrInvalidName       = errors.New("invalid name")
    ErrPasswordTooShort  = errors.New("password must be at least 8 characters")
    ErrInvalidCredentials = errors.New("invalid credentials")
)
```

### 3. Repository Interface & Implementation

```go
// internal/domain/user/repository.go
package user

import "context"

// Repository defines the interface for user data access
// Define interface in domain layer (consumer side)
type Repository interface {
    Create(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id string) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    FindAll(ctx context.Context, limit, offset int) ([]*User, int64, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
    
    // Transaction support
    WithTx(tx interface{}) Repository
}
```

```go
// internal/repository/mysql/user_repository.go
package mysql

import (
    "context"
    "errors"

    "gorm.io/gorm"
    "your-project/internal/domain/user"
)

// UserModel is the database model
// Separate from domain entity to allow different representations
type UserModel struct {
    ID        string `gorm:"type:char(36);primaryKey"`
    Email     string `gorm:"type:varchar(100);uniqueIndex;not null"`
    Name      string `gorm:"type:varchar(100);not null"`
    Password  string `gorm:"type:varchar(255);not null"`
    RoleID    string `gorm:"type:char(36)"`
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (UserModel) TableName() string {
    return "users"
}

// toDomain converts database model to domain entity
func (m *UserModel) toDomain() *user.User {
    return &user.User{
        ID:        m.ID,
        Email:     m.Email,
        Name:      m.Name,
        Password:  m.Password,
        RoleID:    m.RoleID,
        CreatedAt: m.CreatedAt,
        UpdatedAt: m.UpdatedAt,
    }
}

// fromDomain converts domain entity to database model
func fromDomain(u *user.User) *UserModel {
    return &UserModel{
        ID:        u.ID,
        Email:     u.Email,
        Name:      u.Name,
        Password:  u.Password,
        RoleID:    u.RoleID,
        CreatedAt: u.CreatedAt,
        UpdatedAt: u.UpdatedAt,
    }
}

// userRepository implements user.Repository
type userRepository struct {
    db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) user.Repository {
    return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, u *user.User) error {
    model := fromDomain(u)
    
    if err := r.db.WithContext(ctx).Create(model).Error; err != nil {
        if errors.Is(err, gorm.ErrDuplicatedKey) {
            return user.ErrEmailExists
        }
        return err
    }
    
    return nil
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*user.User, error) {
    var model UserModel
    
    err := r.db.WithContext(ctx).Where("id = ?", id).First(&model).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, user.ErrUserNotFound
        }
        return nil, err
    }
    
    return model.toDomain(), nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*user.User, error) {
    var model UserModel
    
    err := r.db.WithContext(ctx).Where("email = ?", email).First(&model).Error
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, user.ErrUserNotFound
        }
        return nil, err
    }
    
    return model.toDomain(), nil
}

func (r *userRepository) FindAll(ctx context.Context, limit, offset int) ([]*user.User, int64, error) {
    var models []UserModel
    var total int64
    
    // Count total
    if err := r.db.WithContext(ctx).Model(&UserModel{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }
    
    // Get paginated data
    if err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&models).Error; err != nil {
        return nil, 0, err
    }
    
    // Convert to domain
    users := make([]*user.User, len(models))
    for i, model := range models {
        users[i] = model.toDomain()
    }
    
    return users, total, nil
}

func (r *userRepository) Update(ctx context.Context, u *user.User) error {
    model := fromDomain(u)
    
    result := r.db.WithContext(ctx).Model(&UserModel{}).Where("id = ?", u.ID).Updates(model)
    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return user.ErrUserNotFound
    }
    
    return nil
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
    result := r.db.WithContext(ctx).Delete(&UserModel{}, "id = ?", id)
    if result.Error != nil {
        return result.Error
    }
    if result.RowsAffected == 0 {
        return user.ErrUserNotFound
    }
    
    return nil
}

// WithTx creates a new repository with transaction
func (r *userRepository) WithTx(tx interface{}) user.Repository {
    gormTx, ok := tx.(*gorm.DB)
    if !ok {
        return r
    }
    
    return &userRepository{db: gormTx}
}
```

### 4. Service Interface & Implementation

```go
// internal/domain/user/service.go
package user

import "context"

// CreateUserInput is input for creating user
type CreateUserInput struct {
    Email    string
    Name     string
    Password string
    RoleID   string
}

// UpdateUserInput is input for updating user
type UpdateUserInput struct {
    Name   string
    Email  string
    RoleID string
}

// Service defines the interface for user business logic
type Service interface {
    Register(ctx context.Context, input CreateUserInput) (*User, error)
    Login(ctx context.Context, email, password string) (*User, error)
    GetByID(ctx context.Context, id string) (*User, error)
    GetAll(ctx context.Context, page, limit int) ([]*User, int64, error)
    Update(ctx context.Context, id string, input UpdateUserInput) (*User, error)
    ChangePassword(ctx context.Context, id, oldPassword, newPassword string) error
    Delete(ctx context.Context, id string) error
}
```

```go
// internal/service/user_service.go
package service

import (
    "context"
    "errors"

    "golang.org/x/crypto/bcrypt"
    "your-project/internal/domain/user"
)

// userService implements user.Service
type userService struct {
    userRepo user.Repository
    // You can inject other services here
    // emailService email.Service
    // auditService audit.Service
}

// NewUserService creates a new user service
func NewUserService(userRepo user.Repository) user.Service {
    return &userService{
        userRepo: userRepo,
    }
}

func (s *userService) Register(ctx context.Context, input user.CreateUserInput) (*user.User, error) {
    // Check if email already exists
    existingUser, err := s.userRepo.FindByEmail(ctx, input.Email)
    if err != nil && !errors.Is(err, user.ErrUserNotFound) {
        return nil, err
    }
    if existingUser != nil {
        return nil, user.ErrEmailExists
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    // Create user entity
    newUser := user.NewUser(input.Email, input.Name, string(hashedPassword), input.RoleID)

    // Validate
    if err := newUser.Validate(); err != nil {
        return nil, err
    }

    // Save to repository
    if err := s.userRepo.Create(ctx, newUser); err != nil {
        return nil, err
    }

    // Clear password before returning
    newUser.Password = ""

    return newUser, nil
}

func (s *userService) Login(ctx context.Context, email, password string) (*user.User, error) {
    // Find user by email
    foundUser, err := s.userRepo.FindByEmail(ctx, email)
    if err != nil {
        if errors.Is(err, user.ErrUserNotFound) {
            return nil, user.ErrInvalidCredentials
        }
        return nil, err
    }

    // Compare password
    if err := bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(password)); err != nil {
        return nil, user.ErrInvalidCredentials
    }

    // Clear password before returning
    foundUser.Password = ""

    return foundUser, nil
}

func (s *userService) GetByID(ctx context.Context, id string) (*user.User, error) {
    foundUser, err := s.userRepo.FindByID(ctx, id)
    if err != nil {
        return nil, err
    }

    // Clear password
    foundUser.Password = ""

    return foundUser, nil
}

func (s *userService) GetAll(ctx context.Context, page, limit int) ([]*user.User, int64, error) {
    offset := (page - 1) * limit

    users, total, err := s.userRepo.FindAll(ctx, limit, offset)
    if err != nil {
        return nil, 0, err
    }

    // Clear passwords
    for _, u := range users {
        u.Password = ""
    }

    return users, total, nil
}

func (s *userService) Update(ctx context.Context, id string, input user.UpdateUserInput) (*user.User, error) {
    // Find existing user
    foundUser, err := s.userRepo.FindByID(ctx, id)
    if err != nil {
        return nil, err
    }

    // Update fields
    if input.Name != "" {
        foundUser.Name = input.Name
    }
    if input.Email != "" {
        foundUser.Email = input.Email
    }
    if input.RoleID != "" {
        foundUser.RoleID = input.RoleID
    }

    // Validate
    if err := foundUser.Validate(); err != nil {
        return nil, err
    }

    // Save
    if err := s.userRepo.Update(ctx, foundUser); err != nil {
        return nil, err
    }

    // Clear password
    foundUser.Password = ""

    return foundUser, nil
}

func (s *userService) ChangePassword(ctx context.Context, id, oldPassword, newPassword string) error {
    // Find user
    foundUser, err := s.userRepo.FindByID(ctx, id)
    if err != nil {
        return err
    }

    // Verify old password
    if err := bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(oldPassword)); err != nil {
        return user.ErrInvalidCredentials
    }

    // Hash new password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
    if err != nil {
        return err
    }

    // Change password
    if err := foundUser.ChangePassword(string(hashedPassword)); err != nil {
        return err
    }

    // Save
    return s.userRepo.Update(ctx, foundUser)
}

func (s *userService) Delete(ctx context.Context, id string) error {
    return s.userRepo.Delete(ctx, id)
}
```

### 5. HTTP Handler Layer

```go
// internal/handler/http/user_handler.go
package http

import (
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
    "your-project/internal/domain/user"
)

// CreateUserRequest is HTTP request for creating user
type CreateUserRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Name     string `json:"name" binding:"required"`
    Password string `json:"password" binding:"required,min=8"`
    RoleID   string `json:"role_id" binding:"required"`
}

// UpdateUserRequest is HTTP request for updating user
type UpdateUserRequest struct {
    Name   string `json:"name"`
    Email  string `json:"email"`
    RoleID string `json:"role_id"`
}

// LoginRequest is HTTP request for login
type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

// ChangePasswordRequest is HTTP request for changing password
type ChangePasswordRequest struct {
    OldPassword string `json:"old_password" binding:"required"`
    NewPassword string `json:"new_password" binding:"required,min=8"`
}

// UserResponse is HTTP response for user
type UserResponse struct {
    ID        string `json:"id"`
    Email     string `json:"email"`
    Name      string `json:"name"`
    RoleID    string `json:"role_id"`
    CreatedAt string `json:"created_at"`
}

// toResponse converts domain user to response
func toResponse(u *user.User) UserResponse {
    return UserResponse{
        ID:        u.ID,
        Email:     u.Email,
        Name:      u.Name,
        RoleID:    u.RoleID,
        CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z"),
    }
}

// UserHandler handles user HTTP requests
type UserHandler struct {
    userService user.Service
}

// NewUserHandler creates a new user handler
func NewUserHandler(userService user.Service) *UserHandler {
    return &UserHandler{
        userService: userService,
    }
}

// Register handles user registration
func (h *UserHandler) Register(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Convert to service input
    input := user.CreateUserInput{
        Email:    req.Email,
        Name:     req.Name,
        Password: req.Password,
        RoleID:   req.RoleID,
    }

    // Call service
    createdUser, err := h.userService.Register(c.Request.Context(), input)
    if err != nil {
        // Map domain errors to HTTP errors
        statusCode := h.mapErrorToStatus(err)
        c.JSON(statusCode, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, toResponse(createdUser))
}

// Login handles user login
func (h *UserHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    authenticatedUser, err := h.userService.Login(c.Request.Context(), req.Email, req.Password)
    if err != nil {
        statusCode := h.mapErrorToStatus(err)
        c.JSON(statusCode, gin.H{"error": err.Error()})
        return
    }

    // In real app, generate JWT here
    c.JSON(http.StatusOK, gin.H{
        "message": "Login successful",
        "user":    toResponse(authenticatedUser),
    })
}

// GetByID handles getting user by ID
func (h *UserHandler) GetByID(c *gin.Context) {
    id := c.Param("id")

    foundUser, err := h.userService.GetByID(c.Request.Context(), id)
    if err != nil {
        statusCode := h.mapErrorToStatus(err)
        c.JSON(statusCode, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, toResponse(foundUser))
}

// GetAll handles getting all users
func (h *UserHandler) GetAll(c *gin.Context) {
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

    users, total, err := h.userService.GetAll(c.Request.Context(), page, limit)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    // Convert to responses
    responses := make([]UserResponse, len(users))
    for i, u := range users {
        responses[i] = toResponse(u)
    }

    c.JSON(http.StatusOK, gin.H{
        "data":  responses,
        "total": total,
        "page":  page,
        "limit": limit,
    })
}

// Update handles updating user
func (h *UserHandler) Update(c *gin.Context) {
    id := c.Param("id")

    var req UpdateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    input := user.UpdateUserInput{
        Name:   req.Name,
        Email:  req.Email,
        RoleID: req.RoleID,
    }

    updatedUser, err := h.userService.Update(c.Request.Context(), id, input)
    if err != nil {
        statusCode := h.mapErrorToStatus(err)
        c.JSON(statusCode, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, toResponse(updatedUser))
}

// ChangePassword handles changing password
func (h *UserHandler) ChangePassword(c *gin.Context) {
    id := c.Param("id")

    var req ChangePasswordRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    err := h.userService.ChangePassword(c.Request.Context(), id, req.OldPassword, req.NewPassword)
    if err != nil {
        statusCode := h.mapErrorToStatus(err)
        c.JSON(statusCode, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

// Delete handles deleting user
func (h *UserHandler) Delete(c *gin.Context) {
    id := c.Param("id")

    err := h.userService.Delete(c.Request.Context(), id)
    if err != nil {
        statusCode := h.mapErrorToStatus(err)
        c.JSON(statusCode, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// mapErrorToStatus maps domain errors to HTTP status codes
func (h *UserHandler) mapErrorToStatus(err error) int {
    switch err {
    case user.ErrUserNotFound:
        return http.StatusNotFound
    case user.ErrEmailExists:
        return http.StatusConflict
    case user.ErrInvalidEmail, user.ErrInvalidName, user.ErrPasswordTooShort:
        return http.StatusBadRequest
    case user.ErrInvalidCredentials:
        return http.StatusUnauthorized
    default:
        return http.StatusInternalServerError
    }
}
```

### 6. Dependency Injection (Manual)

```go
// cmd/api/main.go
package main

import (
    "log"

    "github.com/gin-gonic/gin"
    "gorm.io/driver/mysql"
    "gorm.io/gorm"

    "your-project/internal/handler/http"
    mysqlrepo "your-project/internal/repository/mysql"
    "your-project/internal/service"
)

func main() {
    // 1. Setup database connection
    dsn := "user:password@tcp(127.0.0.1:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect database:", err)
    }

    // 2. Auto migrate
    db.AutoMigrate(&mysqlrepo.UserModel{})

    // 3. Initialize repositories
    userRepo := mysqlrepo.NewUserRepository(db)

    // 4. Initialize services (inject repositories)
    userService := service.NewUserService(userRepo)

    // 5. Initialize handlers (inject services)
    userHandler := http.NewUserHandler(userService)

    // 6. Setup routes
    r := gin.Default()

    api := r.Group("/api/v1")
    {
        users := api.Group("/users")
        {
            users.POST("/register", userHandler.Register)
            users.POST("/login", userHandler.Login)
            users.GET("", userHandler.GetAll)
            users.GET("/:id", userHandler.GetByID)
            users.PUT("/:id", userHandler.Update)
            users.PUT("/:id/password", userHandler.ChangePassword)
            users.DELETE("/:id", userHandler.Delete)
        }
    }

    log.Println("Server starting on :3000")
    r.Run(":3000")
}
```

### 7. Dependency Injection dengan Wire (Advanced)

```bash
# Install Wire
go install github.com/google/wire/cmd/wire@latest
```

```go
// cmd/api/wire.go
//go:build wireinject
// +build wireinject

package main

import (
    "github.com/google/wire"
    "gorm.io/gorm"
    
    "your-project/internal/handler/http"
    mysqlrepo "your-project/internal/repository/mysql"
    "your-project/internal/service"
)

// InitializeApp wires up all dependencies
func InitializeApp(db *gorm.DB) *http.UserHandler {
    wire.Build(
        // Repositories
        mysqlrepo.NewUserRepository,
        
        // Services
        service.NewUserService,
        
        // Handlers
        http.NewUserHandler,
    )
    
    return nil // Wire will generate this
}
```

```go
// cmd/api/main_wire.go
package main

import (
    "log"

    "github.com/gin-gonic/gin"
    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

func mainWire() {
    // Setup database
    dsn := "user:password@tcp(127.0.0.1:3306)/dbname?charset=utf8mb4&parseTime=True&loc=Local"
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect database:", err)
    }

    // Wire automatically inject all dependencies
    userHandler := InitializeApp(db)

    // Setup routes
    r := gin.Default()
    
    api := r.Group("/api/v1")
    {
        users := api.Group("/users")
        {
            users.POST("/register", userHandler.Register)
            users.POST("/login", userHandler.Login)
            users.GET("", userHandler.GetAll)
            users.GET("/:id", userHandler.GetByID)
            users.PUT("/:id", userHandler.Update)
            users.PUT("/:id/password", userHandler.ChangePassword)
            users.DELETE("/:id", userHandler.Delete)
        }
    }

    r.Run(":3000")
}
```

```bash
# Generate wire code
wire ./cmd/api
```

### 8. Interface Segregation Example

```go
// ❌ BAD: Fat interface (hard to implement, hard to mock)
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    FindByID(ctx context.Context, id string) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    FindAll(ctx context.Context, limit, offset int) ([]*User, int64, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
    BulkCreate(ctx context.Context, users []*User) error
    BulkUpdate(ctx context.Context, users []*User) error
    BulkDelete(ctx context.Context, ids []string) error
    Search(ctx context.Context, query string) ([]*User, error)
    CountByRole(ctx context.Context, roleID string) (int64, error)
    // ... 20 more methods ❌
}

// ✅ GOOD: Small, focused interfaces
type UserReader interface {
    FindByID(ctx context.Context, id string) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    FindAll(ctx context.Context, limit, offset int) ([]*User, int64, error)
}

type UserWriter interface {
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
}

type UserRepository interface {
    UserReader
    UserWriter
}

// Service only needs what it uses
type SimpleService struct {
    reader UserReader  // Only needs read operations
}

type AdminService struct {
    repo UserRepository  // Needs full access
}
```

### 9. Transaction Support

```go
// pkg/database/transaction.go
package database

import (
    "context"

    "gorm.io/gorm"
)

type TxKey struct{}

// WithTx creates a new context with transaction
func WithTx(ctx context.Context, tx *gorm.DB) context.Context {
    return context.WithValue(ctx, TxKey{}, tx)
}

// GetTx retrieves transaction from context
func GetTx(ctx context.Context) (*gorm.DB, bool) {
    tx, ok := ctx.Value(TxKey{}).(*gorm.DB)
    return tx, ok
}

// Transactional executes function within a transaction
func Transactional(db *gorm.DB, fn func(ctx context.Context) error) error {
    return db.Transaction(func(tx *gorm.DB) error {
        ctx := context.Background()
        ctx = WithTx(ctx, tx)
        return fn(ctx)
    })
}
```

```go
// internal/repository/mysql/user_repository.go (with transaction support)
func (r *userRepository) getDB(ctx context.Context) *gorm.DB {
    // Check if there's a transaction in context
    if tx, ok := database.GetTx(ctx); ok {
        return tx
    }
    return r.db
}

func (r *userRepository) Create(ctx context.Context, u *user.User) error {
    model := fromDomain(u)
    
    // Use getDB to get either transaction or normal DB
    if err := r.getDB(ctx).WithContext(ctx).Create(model).Error; err != nil {
        if errors.Is(err, gorm.ErrDuplicatedKey) {
            return user.ErrEmailExists
        }
        return err
    }
    
    return nil
}
```

```go
// internal/service/user_service.go (using transaction)
func (s *userService) RegisterWithReferral(ctx context.Context, input RegisterInput) error {
    return database.Transactional(s.db, func(txCtx context.Context) error {
        // Create user
        newUser := user.NewUser(input.Email, input.Name, input.Password, "user")
        if err := s.userRepo.Create(txCtx, newUser); err != nil {
            return err
        }

        // Give referral bonus
        if input.ReferralCode != "" {
            referrer, err := s.userRepo.FindByReferralCode(txCtx, input.ReferralCode)
            if err != nil {
                return err
            }
            
            // Give bonus points
            referrer.AddPoints(100)
            if err := s.userRepo.Update(txCtx, referrer); err != nil {
                return err
            }
        }

        return nil
    })
}
```

### 10. Testing Each Layer

```go
// internal/domain/user/entity_test.go
package user_test

import (
    "testing"

    "github.com/stretchr/testify/assert"
    "your-project/internal/domain/user"
)

func TestUserValidation(t *testing.T) {
    tests := []struct {
        name    string
        user    *user.User
        wantErr error
    }{
        {
            name: "valid user",
            user: user.NewUser("test@example.com", "Test User", "password123", "role-id"),
            wantErr: nil,
        },
        {
            name: "invalid email",
            user: &user.User{Name: "Test", Password: "password123"},
            wantErr: user.ErrInvalidEmail,
        },
        {
            name: "password too short",
            user: &user.User{Email: "test@example.com", Name: "Test", Password: "short"},
            wantErr: user.ErrPasswordTooShort,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := tt.user.Validate()
            assert.Equal(t, tt.wantErr, err)
        })
    }
}
```

```go
// internal/service/user_service_test.go
package service_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "your-project/internal/domain/user"
    "your-project/internal/service"
)

// Mock repository
type MockUserRepository struct {
    mock.Mock
}

func (m *MockUserRepository) Create(ctx context.Context, u *user.User) error {
    args := m.Called(ctx, u)
    return args.Error(0)
}

func (m *MockUserRepository) FindByEmail(ctx context.Context, email string) (*user.User, error) {
    args := m.Called(ctx, email)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*user.User), args.Error(1)
}

// Add other methods...

func TestRegister(t *testing.T) {
    mockRepo := new(MockUserRepository)
    userService := service.NewUserService(mockRepo)

    t.Run("successful registration", func(t *testing.T) {
        input := user.CreateUserInput{
            Email:    "test@example.com",
            Name:     "Test User",
            Password: "password123",
            RoleID:   "role-id",
        }

        // Setup mock expectations
        mockRepo.On("FindByEmail", mock.Anything, input.Email).Return(nil, user.ErrUserNotFound)
        mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*user.User")).Return(nil)

        // Execute
        createdUser, err := userService.Register(context.Background(), input)

        // Assert
        assert.NoError(t, err)
        assert.NotNil(t, createdUser)
        assert.Equal(t, input.Email, createdUser.Email)
        mockRepo.AssertExpectations(t)
    })

    t.Run("email already exists", func(t *testing.T) {
        input := user.CreateUserInput{
            Email:    "existing@example.com",
            Name:     "Test User",
            Password: "password123",
            RoleID:   "role-id",
        }

        existingUser := &user.User{Email: input.Email}
        mockRepo.On("FindByEmail", mock.Anything, input.Email).Return(existingUser, nil)

        // Execute
        createdUser, err := userService.Register(context.Background(), input)

        // Assert
        assert.Error(t, err)
        assert.Equal(t, user.ErrEmailExists, err)
        assert.Nil(t, createdUser)
    })
}
```

### 11. Refactoring Guide: Step by Step

```go
// STEP 1: Existing Bad Code (Before Refactor)
// handler/user_handler_old.go

type OldUserHandler struct {
    db *gorm.DB  // ❌ Handler directly uses DB
}

func (h *OldUserHandler) CreateUser(c *gin.Context) {
    var req CreateUserRequest
    c.ShouldBindJSON(&req)

    // ❌ Business logic in handler
    hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)

    // ❌ Direct database access
    user := User{
        Email:    req.Email,
        Name:     req.Name,
        Password: string(hashedPassword),
    }
    h.db.Create(&user)

    c.JSON(200, user)
}
```

```go
// STEP 2: Extract Entity
// Create domain/user/entity.go
type User struct {
    ID        string
    Email     string
    Name      string
    Password  string
    CreatedAt time.Time
}

func NewUser(email, name, password string) *User {
    return &User{
        ID:        uuid.New().String(),
        Email:     email,
        Name:      name,
        Password:  password,
        CreatedAt: time.Now(),
    }
}
```

```go
// STEP 3: Create Repository Interface
// domain/user/repository.go
type Repository interface {
    Create(ctx context.Context, user *User) error
    FindByEmail(ctx context.Context, email string) (*User, error)
}
```

```go
// STEP 4: Implement Repository
// repository/mysql/user_repository.go
type userRepository struct {
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) user.Repository {
    return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, u *user.User) error {
    // Implementation
}
```

```go
// STEP 5: Create Service
// service/user_service.go
type userService struct {
    userRepo user.Repository
}

func NewUserService(userRepo user.Repository) user.Service {
    return &userService{userRepo: userRepo}
}

func (s *userService) Register(ctx context.Context, input CreateUserInput) (*user.User, error) {
    // Business logic here
    hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
    
    newUser := user.NewUser(input.Email, input.Name, string(hashedPassword))
    
    if err := s.userRepo.Create(ctx, newUser); err != nil {
        return nil, err
    }
    
    return newUser, nil
}
```

```go
// STEP 6: Refactor Handler
// handler/http/user_handler.go
type UserHandler struct {
    userService user.Service  // ✅ Only depends on service
}

func NewUserHandler(userService user.Service) *UserHandler {
    return &UserHandler{userService: userService}
}

func (h *UserHandler) Register(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    input := user.CreateUserInput{
        Email:    req.Email,
        Name:     req.Name,
        Password: req.Password,
    }

    createdUser, err := h.userService.Register(c.Request.Context(), input)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    c.JSON(201, toResponse(createdUser))
}
```

```go
// STEP 7: Wire Dependencies in main.go
func main() {
    db := setupDatabase()
    
    // Old way: handler := NewOldUserHandler(db)
    
    // New way: wire dependencies
    userRepo := mysqlrepo.NewUserRepository(db)
    userService := service.NewUserService(userRepo)
    userHandler := http.NewUserHandler(userService)
    
    // Setup routes
    r := gin.Default()
    r.POST("/users", userHandler.Register)
    r.Run()
}
```

### 12. Composable Services Example

```go
// internal/domain/order/service.go
package order

import (
    "context"
    
    "your-project/internal/domain/user"
    "your-project/internal/domain/product"
    "your-project/internal/domain/payment"
)

// Service composes multiple services
type Service interface {
    CreateOrder(ctx context.Context, input CreateOrderInput) (*Order, error)
}

type service struct {
    orderRepo      Repository
    userService    user.Service     // Inject user service
    productService product.Service  // Inject product service
    paymentService payment.Service  // Inject payment service
}

func NewService(
    orderRepo Repository,
    userService user.Service,
    productService product.Service,
    paymentService payment.Service,
) Service {
    return &service{
        orderRepo:      orderRepo,
        userService:    userService,
        productService: productService,
        paymentService: paymentService,
    }
}

func (s *service) CreateOrder(ctx context.Context, input CreateOrderInput) (*Order, error) {
    // Use user service
    user, err := s.userService.GetByID(ctx, input.UserID)
    if err != nil {
        return nil, err
    }

    // Use product service to check stock
    product, err := s.productService.GetByID(ctx, input.ProductID)
    if err != nil {
        return nil, err
    }

    if product.Stock < input.Quantity {
        return nil, ErrInsufficientStock
    }

    // Create order
    order := NewOrder(user.ID, product.ID, input.Quantity, product.Price)

    // Save order
    if err := s.orderRepo.Create(ctx, order); err != nil {
        return nil, err
    }

    // Process payment via payment service
    if err := s.paymentService.ProcessPayment(ctx, order.ID, order.Total); err != nil {
        return nil, err
    }

    // Update product stock
    if err := s.productService.DecreaseStock(ctx, product.ID, input.Quantity); err != nil {
        return nil, err
    }

    return order, nil
}
```

## ❌ Common Mistakes + Fix

### 1. ❌ Entity tergantung ke framework

```go
// ❌ SALAH — Entity punya dependency ke GORM
type User struct {
    ID        string `gorm:"primaryKey"`
    Email     string `gorm:"uniqueIndex"`
    CreatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`  // ❌ GORM dependency
}
```

```go
// ✅ BENAR — Entity pure, no external dependencies
type User struct {
    ID        string
    Email     string
    CreatedAt time.Time
}

// Database model separate
type UserModel struct {
    ID        string `gorm:"primaryKey"`
    Email     string `gorm:"uniqueIndex"`
    CreatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`
}
```

### 2. ❌ Service return HTTP errors

```go
// ❌ SALAH — Service return HTTP status code
func (s *service) GetByID(ctx context.Context, id string) (*User, int, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, 404, err  // ❌ HTTP concern in service!
    }
    return user, 200, nil
}
```

```go
// ✅ BENAR — Service return domain errors
func (s *service) GetByID(ctx context.Context, id string) (*User, error) {
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, err  // Return domain error
    }
    return user, nil
}

// Handler maps to HTTP status
func (h *handler) GetByID(c *gin.Context) {
    user, err := h.service.GetByID(c, id)
    if err != nil {
        if errors.Is(err, domain.ErrNotFound) {
            c.JSON(404, gin.H{"error": err.Error()})
            return
        }
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    c.JSON(200, user)
}
```

### 3. ❌ Interface di provider side

```go
// ❌ SALAH — Interface di implementation package
// repository/mysql/user_repository.go
type UserRepository interface {  // ❌ Wrong place!
    Create(ctx context.Context, user *User) error
}

type mysqlUserRepository struct {
    db *gorm.DB
}
```

```go
// ✅ BENAR — Interface di consumer side (domain)
// domain/user/repository.go
type Repository interface {  // ✅ In domain layer
    Create(ctx context.Context, user *User) error
}

// repository/mysql/user_repository.go
type userRepository struct {  // Just implementation
    db *gorm.DB
}

func NewUserRepository(db *gorm.DB) user.Repository {
    return &userRepository{db: db}
}
```

### 4. ❌ Fat service dengan terlalu banyak dependency

```go
// ❌ SALAH — Service dengan 10+ dependencies
type service struct {
    userRepo    Repository
    emailSvc    EmailService
    smsSvc      SMSService
    paymentSvc  PaymentService
    auditSvc    AuditService
    cacheSvc    CacheService
    loggerSvc   LoggerService
    metricsSvc  MetricsService
    // ... 10 more ❌
}
```

```go
// ✅ BENAR — Split into smaller services
type UserRegistrationService struct {
    userRepo  Repository
    emailSvc  EmailService
}

type UserProfileService struct {
    userRepo Repository
    cacheSvc CacheService
}

type UserPaymentService struct {
    userRepo    Repository
    paymentSvc  PaymentService
}
```

### 5. ❌ Handler langsung pakai repository

```go
// ❌ SALAH — Handler bypass service layer
type Handler struct {
    userRepo user.Repository  // ❌ Direct repository access
}

func (h *Handler) Create(c *gin.Context) {
    // Business logic in handler ❌
    hashedPassword := hashPassword(req.Password)
    
    user := &user.User{
        Email:    req.Email,
        Password: hashedPassword,
    }
    
    h.userRepo.Create(c, user)  // ❌ Skip service layer
}
```

```go
// ✅ BENAR — Always go through service layer
type Handler struct {
    userService user.Service  // ✅ Only service
}

func (h *Handler) Create(c *gin.Context) {
    input := user.CreateUserInput{
        Email:    req.Email,
        Password: req.Password,
    }
    
    user, err := h.userService.Create(c, input)  // ✅ Use service
}
```

### 6. ❌ Tidak propagate context

```go
// ❌ SALAH — Create new context
func (s *service) Create(ctx context.Context, input Input) error {
    newCtx := context.Background()  // ❌ Lost parent context!
    return s.repo.Create(newCtx, data)
}
```

```go
// ✅ BENAR — Propagate context
func (s *service) Create(ctx context.Context, input Input) error {
    return s.repo.Create(ctx, data)  // ✅ Pass context through
}
```

### 7. ❌ Test dengan real database

```go
// ❌ SALAH — Integration test di unit test
func TestUserService_Create(t *testing.T) {
    db := setupRealDatabase()  // ❌ Real DB connection
    repo := NewUserRepository(db)
    service := NewUserService(repo)
    
    user, err := service.Create(...)
    // Slow, brittle, needs DB running
}
```

```go
// ✅ BENAR — Mock dependencies
func TestUserService_Create(t *testing.T) {
    mockRepo := new(MockUserRepository)  // ✅ Mock
    service := NewUserService(mockRepo)
    
    mockRepo.On("Create", mock.Anything, mock.Anything).Return(nil)
    
    user, err := service.Create(...)
    // Fast, isolated, no DB needed
}
```

### 8. ❌ Domain entity tahu tentang JSON/HTTP

```go
// ❌ SALAH — Domain entity dengan JSON tags
type User struct {
    ID    string `json:"id"`           // ❌ JSON concern
    Email string `json:"email"`
    Name  string `json:"name"`
}
```

```go
// ✅ BENAR — Separate response DTO
// domain/user/entity.go
type User struct {  // Pure domain
    ID    string
    Email string
    Name  string
}

// handler/http/user_response.go
type UserResponse struct {  // HTTP representation
    ID    string `json:"id"`
    Email string `json:"email"`
    Name  string `json:"name"`
}

func toResponse(u *user.User) UserResponse {
    return UserResponse{
        ID:    u.ID,
        Email: u.Email,
        Name:  u.Name,
    }
}
```

### 9. ❌ Circular dependency

```go
// ❌ SALAH — Service A import Service B, B import A
// service/user_service.go
import "your-project/service/order"

type UserService struct {
    orderService order.Service  // ❌ Circular dependency!
}

// service/order_service.go
import "your-project/service/user"

type OrderService struct {
    userService user.Service  // ❌ Circular dependency!
}
```

```go
// ✅ BENAR — Use interface or event-driven
// domain/user/service.go
type OrderNotifier interface {  // Interface in domain
    NotifyOrderCreated(userID string) error
}

type UserService struct {
    orderNotifier OrderNotifier  // ✅ Depend on interface
}

// OR: Event-driven approach
type UserService struct {
    eventBus EventBus
}

func (s *UserService) DoSomething() {
    s.eventBus.Publish("user.created", event)  // ✅ Decoupled
}
```

### 10. ❌ Tidak handle transaction rollback

```go
// ❌ SALAH — Manual transaction tanpa defer
func (s *service) Transfer(ctx context.Context, from, to string, amount float64) error {
    tx := s.db.Begin()
    
    // Withdraw from sender
    s.repo.Withdraw(tx, from, amount)
    
    // Error here → transaction not rolled back! ❌
    if amount > 1000 {
        return errors.New("amount too large")
    }
    
    // Deposit to receiver
    s.repo.Deposit(tx, to, amount)
    
    tx.Commit()
    return nil
}
```

```go
// ✅ BENAR — Use helper atau defer
func (s *service) Transfer(ctx context.Context, from, to string, amount float64) error {
    return database.Transactional(s.db, func(txCtx context.Context) error {
        // Withdraw
        if err := s.repo.Withdraw(txCtx, from, amount); err != nil {
            return err  // ✅ Auto rollback on error
        }
        
        if amount > 1000 {
            return errors.New("amount too large")  // ✅ Auto rollback
        }
        
        // Deposit
        if err := s.repo.Deposit(txCtx, to, amount); err != nil {
            return err  // ✅ Auto rollback
        }
        
        return nil  // ✅ Auto commit
    })
}
```

## ✅ Checklist Akhir

Setelah belajar ini, pastikan lo bisa:

- [ ] Identify masalah tanpa clean architecture
- [ ] Design clean architecture layers (Entity, Repository, Service, Handler)
- [ ] Create pure domain entities tanpa dependency
- [ ] Define repository interfaces di domain layer
- [ ] Implement repository dengan database
- [ ] Separate database model dari domain entity
- [ ] Create service dengan business logic
- [ ] Build HTTP handler yang thin
- [ ] Setup manual dependency injection
- [ ] Use Google Wire untuk DI (optional)
- [ ] Design focused interfaces (ISP)
- [ ] Define interfaces di consumer side
- [ ] Implement transaction support
- [ ] Propagate context properly
- [ ] Mock dependencies untuk testing
- [ ] Test each layer independently
- [ ] Map domain errors to HTTP status
- [ ] Compose services (service inject service)
- [ ] Refactor existing code ke clean architecture
- [ ] Avoid circular dependencies

## 💭 Ide Pengembangan Mandiri

Setelah paham Clean Architecture, coba kembangkan:

1. **Event-Driven Architecture:**
   - Domain events (UserCreated, OrderPlaced)
   - Event bus/dispatcher
   - Event handlers
   - Async event processing

2. **CQRS Pattern:**
   - Command (write) side
   - Query (read) side
   - Separate read/write models
   - Event sourcing

3. **Hexagonal Architecture:**
   - Ports (interfaces)
   - Adapters (implementations)
   - Application core
   - Multiple adapters (HTTP, gRPC, CLI)

4. **Onion Architecture:**
   - Domain model (center)
   - Domain services
   - Application services
   - Infrastructure (outer)

5. **Repository Patterns:**
   - Generic repository
   - Specification pattern
   - Unit of work
   - Query object pattern

6. **Advanced DI:**
   - DI container (dig, fx)
   - Lifecycle management
   - Singleton vs transient
   - Factory pattern

7. **Domain-Driven Design:**
   - Aggregates
   - Value objects
   - Domain services
   - Bounded contexts

8. **Microservices:**
   - Service per bounded context
   - Inter-service communication
   - Shared kernel
   - Anti-corruption layer

9. **Testing Strategies:**
   - Unit tests (domain, service)
   - Integration tests (repository)
   - E2E tests (API)
   - Contract testing

10. **Documentation:**
    - Architecture Decision Records (ADR)
    - Dependency diagrams
    - Component diagrams
    - API documentation

---

**Tips Pro:**
- **Start small** → Implement clean arch untuk 1-2 features dulu
- **Interface di consumer** → Define interface di yang pakai, bukan yang implement
- **Keep entities pure** → No framework dependencies di domain
- **Service orchestrate** → Service coordinate multiple repos
- **Handler thin** → Handler only handle HTTP, delegate to service
- **Mock for tests** → Use mock repositories untuk service tests
- **Propagate context** → Always pass context through layers
- **Transaction helper** → Use helper function untuk transaction management
- **Refactor gradually** → Don't rewrite everything at once
- **Document decisions** → Write ADR untuk arsitektur choices

**Clean Architecture = Maintainable Code!** Separation of concerns makes code testable, upgradeable, dan reusable. 🏗️
