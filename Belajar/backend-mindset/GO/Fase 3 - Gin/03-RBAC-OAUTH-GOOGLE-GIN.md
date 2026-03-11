# 🔐 RBAC + OAuth Google di Go Gin

## 🎯 Tujuan Belajar

Setelah belajar ini, lo bisa:
- Design RBAC (Role-Based Access Control) yang scalable
- Implement permission-based authorization
- Setup role hierarchy (Admin > Manager > User)
- Embed role & permissions di JWT claims
- Handle object-level permission (IsOwner check)
- Integrate OAuth Google dengan golang.org/x/oauth2
- Setup Google OAuth Console
- Implement CSRF protection untuk OAuth
- Bikin audit log untuk tracking user actions
- Query audit log untuk compliance & security

## 💡 Konsep + Analogi

### RBAC vs Permission-Based Access Control

| Konsep | RBAC (Role-Based) | PBAC (Permission-Based) | Hybrid (Best!) |
|--------|-------------------|-------------------------|----------------|
| **Granularity** | Coarse (per role) | Fine (per permission) | Flexible |
| **Complexity** | Simple | More complex | Balanced |
| **Scalability** | Limited | Excellent | Excellent |
| **Example** | `if role == "admin"` | `if hasPermission("user:write")` | Role memiliki permissions |

**Analogi Frontend:**
- **RBAC** = Route guard berdasarkan role: `if (user.role === 'admin')`
- **Permission** = Feature flag: `if (user.hasPermission('delete_post'))`
- **Hybrid** = Role punya permissions: `admin role → ['*:*']`, `user role → ['post:read']`

### OAuth Google Flow

```
User                Browser              Your Server            Google
 |                     |                      |                    |
 |--1. Click Login---->|                      |                    |
 |                     |--2. GET /auth/google->|                   |
 |                     |<--3. Redirect---------|                   |
 |                     |--4. Google Login----->|------------------>|
 |                     |                       |                   |
 |                     |<--5. Callback---------|<---Code-----------|
 |                     |--6. GET /callback---->|                   |
 |                     |                       |--7. Exchange----->|
 |                     |                       |<--8. Token--------|
 |                     |                       |--9. UserInfo----->|
 |                     |                       |<--10. Data--------|
 |                     |<--11. JWT-------------|                   |
 |<--12. Logged In-----|                       |                   |
```

**Penjelasan:**
1. User klik "Login with Google"
2. Redirect ke Google OAuth consent screen
3. User approve permissions
4. Google redirect kembali dengan `code`
5. Server tukar `code` dengan `access_token`
6. Pakai token untuk get user info
7. Upsert user ke database
8. Return JWT ke client

## 📝 Materi + Kode Lengkap

### 1. RBAC Database Schema

```sql
-- migrations/mysql/000001_create_rbac_tables.up.sql

-- Roles table
CREATE TABLE roles (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    level INT NOT NULL DEFAULT 0,  -- For hierarchy: 100=admin, 50=manager, 10=user
    permissions JSON,               -- Array of permission strings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table dengan role
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255),          -- Nullable untuk OAuth users
    avatar VARCHAR(500),
    provider VARCHAR(20) DEFAULT 'local',  -- 'local', 'google', 'github'
    provider_id VARCHAR(100),       -- ID dari OAuth provider
    role_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_provider (provider, provider_id),
    INDEX idx_role (role_id),
    INDEX idx_deleted_at (deleted_at),
    
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit logs
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,       -- 'create', 'update', 'delete', 'login', etc
    resource_type VARCHAR(50),           -- 'user', 'post', 'product', etc
    resource_id VARCHAR(36),
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSON,                       -- Additional context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default roles
INSERT INTO roles (id, name, description, level, permissions) VALUES
('role-admin', 'admin', 'System Administrator', 100, '["*:*"]'),
('role-manager', 'manager', 'Manager', 50, '["user:read", "user:write", "post:*", "product:*"]'),
('role-user', 'user', 'Regular User', 10, '["user:read", "post:read", "post:write:own"]');
```

```sql
-- migrations/mysql/000001_create_rbac_tables.down.sql
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
```

### 2. Permission Constants & Types

```go
// internal/rbac/permission.go
package rbac

import "strings"

// Permission format: "resource:action" atau "resource:action:scope"
// Examples:
// - "user:read" - read any user
// - "user:write" - create/update any user
// - "user:delete" - delete any user
// - "post:write:own" - write own posts only
// - "*:*" - wildcard (admin)

type Permission string

const (
    // User permissions
    PermissionUserRead   Permission = "user:read"
    PermissionUserWrite  Permission = "user:write"
    PermissionUserDelete Permission = "user:delete"
    
    // Post permissions
    PermissionPostRead     Permission = "post:read"
    PermissionPostWrite    Permission = "post:write"
    PermissionPostWriteOwn Permission = "post:write:own"
    PermissionPostDelete   Permission = "post:delete"
    
    // Admin permissions
    PermissionAdminAll Permission = "*:*"
    
    // Product permissions
    PermissionProductRead   Permission = "product:read"
    PermissionProductWrite  Permission = "product:write"
    PermissionProductDelete Permission = "product:delete"
)

// HasPermission checks if user has specific permission
// Supports wildcard: "*:*" grants all permissions
// Supports resource wildcard: "post:*" grants all post permissions
func HasPermission(userPermissions []string, required Permission) bool {
    requiredStr := string(required)
    
    for _, perm := range userPermissions {
        // Exact match
        if perm == requiredStr {
            return true
        }
        
        // Wildcard: *:* grants everything
        if perm == "*:*" {
            return true
        }
        
        // Resource wildcard: post:* grants all post permissions
        if strings.HasSuffix(perm, ":*") {
            resource := strings.Split(requiredStr, ":")[0]
            if strings.HasPrefix(perm, resource+":") {
                return true
            }
        }
    }
    
    return false
}

// HasAnyPermission checks if user has at least one of the permissions
func HasAnyPermission(userPermissions []string, required ...Permission) bool {
    for _, perm := range required {
        if HasPermission(userPermissions, perm) {
            return true
        }
    }
    return false
}

// HasAllPermissions checks if user has all required permissions
func HasAllPermissions(userPermissions []string, required ...Permission) bool {
    for _, perm := range required {
        if !HasPermission(userPermissions, perm) {
            return false
        }
    }
    return true
}
```

### 3. Role & User Entities

```go
// internal/rbac/entity.go
package rbac

import (
    "time"

    "github.com/google/uuid"
    "gorm.io/datatypes"
    "gorm.io/gorm"
)

type Role struct {
    ID          string         `gorm:"type:char(36);primaryKey" json:"id"`
    Name        string         `gorm:"type:varchar(50);uniqueIndex;not null" json:"name"`
    Description string         `gorm:"type:text" json:"description"`
    Level       int            `gorm:"type:int;not null;default:0" json:"level"`
    Permissions datatypes.JSON `gorm:"type:json" json:"permissions"`
    CreatedAt   time.Time      `json:"created_at"`
    UpdatedAt   time.Time      `json:"updated_at"`
}

func (Role) TableName() string {
    return "roles"
}

// GetPermissions converts JSON to []string
func (r *Role) GetPermissions() []string {
    var perms []string
    if err := r.Permissions.Unmarshal(&perms); err != nil {
        return []string{}
    }
    return perms
}

type User struct {
    ID         string         `gorm:"type:char(36);primaryKey" json:"id"`
    Name       string         `gorm:"type:varchar(100);not null" json:"name"`
    Email      string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"email"`
    Password   string         `gorm:"type:varchar(255)" json:"-"`
    Avatar     string         `gorm:"type:varchar(500)" json:"avatar"`
    Provider   string         `gorm:"type:varchar(20);default:'local'" json:"provider"`
    ProviderID string         `gorm:"type:varchar(100)" json:"-"`
    RoleID     string         `gorm:"type:char(36)" json:"role_id"`
    Role       *Role          `gorm:"foreignKey:RoleID" json:"role,omitempty"`
    CreatedAt  time.Time      `json:"created_at"`
    UpdatedAt  time.Time      `json:"updated_at"`
    DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
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

// GetPermissions from role
func (u *User) GetPermissions() []string {
    if u.Role == nil {
        return []string{}
    }
    return u.Role.GetPermissions()
}

// HasPermission checks if user has permission
func (u *User) HasPermission(perm Permission) bool {
    return HasPermission(u.GetPermissions(), perm)
}

// IsAdmin checks if user is admin
func (u *User) IsAdmin() bool {
    return u.Role != nil && u.Role.Name == "admin"
}

// CanAccessResource checks if user can access resource based on role level
func (u *User) CanAccessResource(targetUser *User) bool {
    if u.IsAdmin() {
        return true
    }
    if u.Role == nil || targetUser.Role == nil {
        return false
    }
    // User with higher level can access lower level
    return u.Role.Level >= targetUser.Role.Level
}
```

### 4. JWT dengan Role & Permissions

```go
// pkg/auth/jwt.go
package auth

import (
    "errors"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

type Claims struct {
    UserID      string   `json:"user_id"`
    Email       string   `json:"email"`
    Role        string   `json:"role"`
    Permissions []string `json:"permissions"`
    jwt.RegisteredClaims
}

type JWTManager struct {
    secretKey     string
    tokenDuration time.Duration
}

func NewJWTManager(secretKey string, duration time.Duration) *JWTManager {
    return &JWTManager{
        secretKey:     secretKey,
        tokenDuration: duration,
    }
}

func (m *JWTManager) Generate(userID, email, role string, permissions []string) (string, error) {
    claims := Claims{
        UserID:      userID,
        Email:       email,
        Role:        role,
        Permissions: permissions,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(m.tokenDuration)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(m.secretKey))
}

func (m *JWTManager) Verify(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, errors.New("invalid token signing method")
        }
        return []byte(m.secretKey), nil
    })

    if err != nil {
        return nil, err
    }

    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, errors.New("invalid token claims")
    }

    return claims, nil
}
```

### 5. Authorization Middleware

```go
// pkg/middleware/auth.go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "your-project/pkg/auth"
    "your-project/internal/rbac"
)

type AuthMiddleware struct {
    jwtManager *auth.JWTManager
}

func NewAuthMiddleware(jwtManager *auth.JWTManager) *AuthMiddleware {
    return &AuthMiddleware{jwtManager: jwtManager}
}

// Authenticate verifies JWT and sets user info to context
func (m *AuthMiddleware) Authenticate() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Missing authorization header",
            })
            return
        }

        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid authorization header format",
            })
            return
        }

        token := parts[1]
        claims, err := m.jwtManager.Verify(token)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid token",
            })
            return
        }

        // Set claims to context
        c.Set("user_id", claims.UserID)
        c.Set("email", claims.Email)
        c.Set("role", claims.Role)
        c.Set("permissions", claims.Permissions)

        c.Next()
    }
}

// RequireRole checks if user has specific role
func (m *AuthMiddleware) RequireRole(roles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole, exists := c.Get("role")
        if !exists {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "User role not found",
            })
            return
        }

        role := userRole.(string)
        for _, r := range roles {
            if role == r {
                c.Next()
                return
            }
        }

        c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
            "error": "Insufficient permissions - role required: " + strings.Join(roles, " or "),
        })
    }
}

// RequirePermission checks if user has specific permission
func (m *AuthMiddleware) RequirePermission(permissions ...rbac.Permission) gin.HandlerFunc {
    return func(c *gin.Context) {
        userPerms, exists := c.Get("permissions")
        if !exists {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "User permissions not found",
            })
            return
        }

        perms := userPerms.([]string)
        if rbac.HasAnyPermission(perms, permissions...) {
            c.Next()
            return
        }

        c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
            "error": "Insufficient permissions",
        })
    }
}

// RequireAllPermissions checks if user has all required permissions
func (m *AuthMiddleware) RequireAllPermissions(permissions ...rbac.Permission) gin.HandlerFunc {
    return func(c *gin.Context) {
        userPerms, exists := c.Get("permissions")
        if !exists {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "User permissions not found",
            })
            return
        }

        perms := userPerms.([]string)
        if rbac.HasAllPermissions(perms, permissions...) {
            c.Next()
            return
        }

        c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
            "error": "Insufficient permissions - all permissions required",
        })
    }
}

// GetUserID helper to get user ID from context
func GetUserID(c *gin.Context) string {
    userID, _ := c.Get("user_id")
    return userID.(string)
}

// GetPermissions helper to get permissions from context
func GetPermissions(c *gin.Context) []string {
    perms, exists := c.Get("permissions")
    if !exists {
        return []string{}
    }
    return perms.([]string)
}
```

### 6. Object-Level Permission (IsOwner)

```go
// pkg/middleware/ownership.go
package middleware

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "your-project/internal/rbac"
)

// MustBeOwner middleware untuk check ownership
// resourceUserIDKey adalah key di gin.Context untuk user ID pemilik resource
func MustBeOwner(resourceUserIDKey string) gin.HandlerFunc {
    return func(c *gin.Context) {
        currentUserID := GetUserID(c)
        resourceUserID, exists := c.Get(resourceUserIDKey)
        
        if !exists {
            c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
                "error": "Resource owner not found",
            })
            return
        }

        // Admin can bypass ownership check
        permissions := GetPermissions(c)
        if rbac.HasPermission(permissions, rbac.PermissionAdminAll) {
            c.Next()
            return
        }

        // Check ownership
        if currentUserID != resourceUserID.(string) {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
                "error": "You don't have permission to access this resource",
            })
            return
        }

        c.Next()
    }
}

// IsOwnerOrHasPermission combines ownership check with permission check
func IsOwnerOrHasPermission(resourceUserIDKey string, permission rbac.Permission) gin.HandlerFunc {
    return func(c *gin.Context) {
        currentUserID := GetUserID(c)
        permissions := GetPermissions(c)

        // Check if user has the permission (e.g., admin)
        if rbac.HasPermission(permissions, permission) {
            c.Next()
            return
        }

        // Check ownership
        resourceUserID, exists := c.Get(resourceUserIDKey)
        if !exists {
            c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
                "error": "Resource owner not found",
            })
            return
        }

        if currentUserID != resourceUserID.(string) {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
                "error": "You don't have permission to access this resource",
            })
            return
        }

        c.Next()
    }
}
```

### 7. OAuth Google Setup

```go
// config/oauth.go
package config

import (
    "os"

    "golang.org/x/oauth2"
    "golang.org/x/oauth2/google"
)

type OAuthConfig struct {
    Google *oauth2.Config
}

func NewOAuthConfig() *OAuthConfig {
    return &OAuthConfig{
        Google: &oauth2.Config{
            ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
            ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
            RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"), // http://localhost:3000/auth/google/callback
            Scopes: []string{
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
            },
            Endpoint: google.Endpoint,
        },
    }
}
```

```bash
# .env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=http://localhost:3000/auth/google/callback
JWT_SECRET=your-super-secret-key
```

### 8. Google OAuth Handler

```go
// internal/auth/service.go
package auth

import (
    "context"
    "crypto/rand"
    "encoding/base64"
    "encoding/json"
    "errors"
    "io"
    "net/http"

    "golang.org/x/oauth2"
    "your-project/internal/rbac"
    pkgauth "your-project/pkg/auth"
)

type GoogleUserInfo struct {
    ID            string `json:"id"`
    Email         string `json:"email"`
    VerifiedEmail bool   `json:"verified_email"`
    Name          string `json:"name"`
    GivenName     string `json:"given_name"`
    FamilyName    string `json:"family_name"`
    Picture       string `json:"picture"`
    Locale        string `json:"locale"`
}

type Service interface {
    GoogleLogin(state string) string
    GoogleCallback(ctx context.Context, state, code string) (string, error)
}

type service struct {
    oauthConfig *oauth2.Config
    userRepo    rbac.UserRepository
    roleRepo    rbac.RoleRepository
    jwtManager  *pkgauth.JWTManager
}

func NewService(
    oauthConfig *oauth2.Config,
    userRepo rbac.UserRepository,
    roleRepo rbac.RoleRepository,
    jwtManager *pkgauth.JWTManager,
) Service {
    return &service{
        oauthConfig: oauthConfig,
        userRepo:    userRepo,
        roleRepo:    roleRepo,
        jwtManager:  jwtManager,
    }
}

// GenerateStateToken creates a random state token for CSRF protection
func GenerateStateToken() string {
    b := make([]byte, 32)
    rand.Read(b)
    return base64.URLEncoding.EncodeToString(b)
}

func (s *service) GoogleLogin(state string) string {
    return s.oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (s *service) GoogleCallback(ctx context.Context, state, code string) (string, error) {
    // Exchange code for token
    token, err := s.oauthConfig.Exchange(ctx, code)
    if err != nil {
        return "", errors.New("failed to exchange token: " + err.Error())
    }

    // Get user info from Google
    userInfo, err := s.getGoogleUserInfo(ctx, token)
    if err != nil {
        return "", err
    }

    // Upsert user to database
    user, err := s.upsertUser(ctx, userInfo)
    if err != nil {
        return "", err
    }

    // Generate JWT
    jwt, err := s.jwtManager.Generate(
        user.ID,
        user.Email,
        user.Role.Name,
        user.GetPermissions(),
    )
    if err != nil {
        return "", errors.New("failed to generate JWT")
    }

    return jwt, nil
}

func (s *service) getGoogleUserInfo(ctx context.Context, token *oauth2.Token) (*GoogleUserInfo, error) {
    client := s.oauthConfig.Client(ctx, token)
    resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
    if err != nil {
        return nil, errors.New("failed to get user info from Google")
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, errors.New("failed to get user info: invalid status code")
    }

    data, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, errors.New("failed to read user info response")
    }

    var userInfo GoogleUserInfo
    if err := json.Unmarshal(data, &userInfo); err != nil {
        return nil, errors.New("failed to parse user info")
    }

    return &userInfo, nil
}

func (s *service) upsertUser(ctx context.Context, googleUser *GoogleUserInfo) (*rbac.User, error) {
    // Check if user exists by provider ID
    user, err := s.userRepo.FindByProviderID(ctx, "google", googleUser.ID)
    if err == nil {
        // User exists, update info
        user.Name = googleUser.Name
        user.Avatar = googleUser.Picture
        if err := s.userRepo.Update(ctx, user); err != nil {
            return nil, err
        }
        return user, nil
    }

    // Check if user exists by email (for account linking)
    user, err = s.userRepo.FindByEmail(ctx, googleUser.Email)
    if err == nil {
        // Link Google account to existing user
        user.Provider = "google"
        user.ProviderID = googleUser.ID
        user.Avatar = googleUser.Picture
        if err := s.userRepo.Update(ctx, user); err != nil {
            return nil, err
        }
        return user, nil
    }

    // Create new user with default role
    defaultRole, err := s.roleRepo.FindByName(ctx, "user")
    if err != nil {
        return nil, errors.New("default role not found")
    }

    user = &rbac.User{
        Name:       googleUser.Name,
        Email:      googleUser.Email,
        Avatar:     googleUser.Picture,
        Provider:   "google",
        ProviderID: googleUser.ID,
        RoleID:     defaultRole.ID,
    }

    if err := s.userRepo.Create(ctx, user); err != nil {
        return nil, err
    }

    // Load role
    user.Role = defaultRole

    return user, nil
}
```

```go
// internal/auth/handler.go
package auth

import (
    "net/http"

    "github.com/gin-contrib/sessions"
    "github.com/gin-gonic/gin"
)

type Handler struct {
    service Service
}

func NewHandler(service Service) *Handler {
    return &Handler{service: service}
}

func (h *Handler) GoogleLogin(c *gin.Context) {
    // Generate state token for CSRF protection
    state := GenerateStateToken()
    
    // Store state in session
    session := sessions.Default(c)
    session.Set("oauth_state", state)
    session.Save()

    // Redirect to Google OAuth
    url := h.service.GoogleLogin(state)
    c.Redirect(http.StatusTemporaryRedirect, url)
}

func (h *Handler) GoogleCallback(c *gin.Context) {
    // Verify state token
    session := sessions.Default(c)
    savedState := session.Get("oauth_state")
    if savedState == nil || savedState != c.Query("state") {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "Invalid state parameter",
        })
        return
    }

    // Clear state from session
    session.Delete("oauth_state")
    session.Save()

    // Get authorization code
    code := c.Query("code")
    if code == "" {
        c.JSON(http.StatusBadRequest, gin.H{
            "error": "Missing authorization code",
        })
        return
    }

    // Exchange code for token and get user info
    jwt, err := h.service.GoogleCallback(c.Request.Context(), c.Query("state"), code)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error": err.Error(),
        })
        return
    }

    // Return JWT (or redirect to frontend with token)
    c.JSON(http.StatusOK, gin.H{
        "token": jwt,
        "message": "Login successful",
    })
}
```

### 9. Audit Log Implementation

```go
// internal/audit/entity.go
package audit

import (
    "time"

    "gorm.io/datatypes"
)

type AuditLog struct {
    ID           uint           `gorm:"primaryKey;autoIncrement" json:"id"`
    UserID       string         `gorm:"type:char(36);index" json:"user_id"`
    Action       string         `gorm:"type:varchar(100);not null;index" json:"action"`
    ResourceType string         `gorm:"type:varchar(50);index" json:"resource_type"`
    ResourceID   string         `gorm:"type:varchar(36);index" json:"resource_id"`
    IPAddress    string         `gorm:"type:varchar(45)" json:"ip_address"`
    UserAgent    string         `gorm:"type:text" json:"user_agent"`
    Metadata     datatypes.JSON `gorm:"type:json" json:"metadata"`
    CreatedAt    time.Time      `json:"created_at"`
}

func (AuditLog) TableName() string {
    return "audit_logs"
}
```

```go
// internal/audit/repository.go
package audit

import (
    "context"

    "gorm.io/gorm"
)

type Repository interface {
    Create(ctx context.Context, log *AuditLog) error
    FindByUserID(ctx context.Context, userID string, limit, offset int) ([]AuditLog, int64, error)
    FindByResource(ctx context.Context, resourceType, resourceID string, limit, offset int) ([]AuditLog, int64, error)
    FindByAction(ctx context.Context, action string, limit, offset int) ([]AuditLog, int64, error)
}

type repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
    return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, log *AuditLog) error {
    return r.db.WithContext(ctx).Create(log).Error
}

func (r *repository) FindByUserID(ctx context.Context, userID string, limit, offset int) ([]AuditLog, int64, error) {
    var logs []AuditLog
    var total int64

    query := r.db.WithContext(ctx).Where("user_id = ?", userID)
    
    if err := query.Model(&AuditLog{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }

    err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&logs).Error
    return logs, total, err
}

func (r *repository) FindByResource(ctx context.Context, resourceType, resourceID string, limit, offset int) ([]AuditLog, int64, error) {
    var logs []AuditLog
    var total int64

    query := r.db.WithContext(ctx).Where("resource_type = ? AND resource_id = ?", resourceType, resourceID)
    
    if err := query.Model(&AuditLog{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }

    err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&logs).Error
    return logs, total, err
}

func (r *repository) FindByAction(ctx context.Context, action string, limit, offset int) ([]AuditLog, int64, error) {
    var logs []AuditLog
    var total int64

    query := r.db.WithContext(ctx).Where("action = ?", action)
    
    if err := query.Model(&AuditLog{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }

    err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&logs).Error
    return logs, total, err
}
```

```go
// internal/audit/service.go
package audit

import (
    "context"
    "encoding/json"
)

type Service interface {
    Log(ctx context.Context, log *AuditLog) error
    GetUserLogs(ctx context.Context, userID string, page, limit int) ([]AuditLog, int64, error)
    GetResourceLogs(ctx context.Context, resourceType, resourceID string, page, limit int) ([]AuditLog, int64, error)
}

type service struct {
    repo Repository
}

func NewService(repo Repository) Service {
    return &service{repo: repo}
}

func (s *service) Log(ctx context.Context, log *AuditLog) error {
    return s.repo.Create(ctx, log)
}

func (s *service) GetUserLogs(ctx context.Context, userID string, page, limit int) ([]AuditLog, int64, error) {
    offset := (page - 1) * limit
    return s.repo.FindByUserID(ctx, userID, limit, offset)
}

func (s *service) GetResourceLogs(ctx context.Context, resourceType, resourceID string, page, limit int) ([]AuditLog, int64, error) {
    offset := (page - 1) * limit
    return s.repo.FindByResource(ctx, resourceType, resourceID, limit, offset)
}
```

```go
// pkg/middleware/audit.go
package middleware

import (
    "encoding/json"

    "github.com/gin-gonic/gin"
    "gorm.io/datatypes"
    "your-project/internal/audit"
)

type AuditMiddleware struct {
    auditService audit.Service
}

func NewAuditMiddleware(auditService audit.Service) *AuditMiddleware {
    return &AuditMiddleware{auditService: auditService}
}

// LogAction creates audit log for important actions
func (m *AuditMiddleware) LogAction(action, resourceType string) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next() // Execute handler first

        // Only log if request succeeded (status < 400)
        if c.Writer.Status() >= 400 {
            return
        }

        userID := GetUserID(c)
        resourceID, _ := c.Get("resource_id") // Set by handler

        // Prepare metadata
        metadata := map[string]interface{}{
            "method": c.Request.Method,
            "path":   c.Request.URL.Path,
        }
        metadataJSON, _ := json.Marshal(metadata)

        log := &audit.AuditLog{
            UserID:       userID,
            Action:       action,
            ResourceType: resourceType,
            ResourceID:   resourceID.(string),
            IPAddress:    c.ClientIP(),
            UserAgent:    c.Request.UserAgent(),
            Metadata:     datatypes.JSON(metadataJSON),
        }

        // Log asynchronously (don't block response)
        go m.auditService.Log(c.Request.Context(), log)
    }
}
```

### 10. Complete Application Setup

```go
// cmd/api/main.go
package main

import (
    "log"
    "time"

    "github.com/gin-contrib/sessions"
    "github.com/gin-contrib/sessions/cookie"
    "github.com/gin-gonic/gin"
    "your-project/config"
    "your-project/internal/auth"
    "your-project/internal/audit"
    "your-project/internal/rbac"
    pkgauth "your-project/pkg/auth"
    "your-project/pkg/middleware"
)

func main() {
    // Load config
    cfg := config.LoadConfig()

    // Setup database
    db, err := config.NewMySQLDatabase(cfg.MySQL)
    if err != nil {
        log.Fatal("Failed to connect database:", err)
    }

    // Auto migrate
    db.AutoMigrate(&rbac.Role{}, &rbac.User{}, &audit.AuditLog{})

    // Setup OAuth
    oauthConfig := config.NewOAuthConfig()

    // Setup JWT
    jwtManager := pkgauth.NewJWTManager(cfg.App.JWTSecret, 24*time.Hour)

    // Setup repositories
    roleRepo := rbac.NewRoleRepository(db)
    userRepo := rbac.NewUserRepository(db)
    auditRepo := audit.NewRepository(db)

    // Setup services
    authService := auth.NewService(oauthConfig.Google, userRepo, roleRepo, jwtManager)
    auditService := audit.NewService(auditRepo)

    // Setup handlers
    authHandler := auth.NewHandler(authService)

    // Setup middleware
    authMiddleware := middleware.NewAuthMiddleware(jwtManager)
    auditMiddleware := middleware.NewAuditMiddleware(auditService)

    // Setup Gin
    r := gin.Default()

    // Session middleware for OAuth state
    store := cookie.NewStore([]byte(cfg.App.SessionSecret))
    r.Use(sessions.Sessions("session", store))

    // Public routes
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })

    // Auth routes
    authGroup := r.Group("/auth")
    {
        authGroup.GET("/google", authHandler.GoogleLogin)
        authGroup.GET("/google/callback", authHandler.GoogleCallback)
    }

    // Protected routes
    api := r.Group("/api/v1")
    api.Use(authMiddleware.Authenticate())
    {
        // User management - Admin only
        users := api.Group("/users")
        users.Use(authMiddleware.RequirePermission(rbac.PermissionUserRead))
        {
            users.GET("", userHandler.List)
            users.GET("/:id", userHandler.GetByID)
            
            // Write operations require write permission
            users.POST("", 
                authMiddleware.RequirePermission(rbac.PermissionUserWrite),
                auditMiddleware.LogAction("create_user", "user"),
                userHandler.Create,
            )
            
            users.PUT("/:id",
                authMiddleware.RequirePermission(rbac.PermissionUserWrite),
                auditMiddleware.LogAction("update_user", "user"),
                userHandler.Update,
            )
            
            users.DELETE("/:id",
                authMiddleware.RequirePermission(rbac.PermissionUserDelete),
                auditMiddleware.LogAction("delete_user", "user"),
                userHandler.Delete,
            )
        }

        // Posts - Owner can edit own posts, admin can edit all
        posts := api.Group("/posts")
        {
            posts.GET("", postHandler.List)
            posts.GET("/:id", postHandler.GetByID)
            
            posts.POST("",
                authMiddleware.RequirePermission(rbac.PermissionPostWrite, rbac.PermissionPostWriteOwn),
                auditMiddleware.LogAction("create_post", "post"),
                postHandler.Create,
            )
            
            posts.PUT("/:id",
                middleware.IsOwnerOrHasPermission("post_user_id", rbac.PermissionPostWrite),
                auditMiddleware.LogAction("update_post", "post"),
                postHandler.Update,
            )
            
            posts.DELETE("/:id",
                middleware.IsOwnerOrHasPermission("post_user_id", rbac.PermissionPostDelete),
                auditMiddleware.LogAction("delete_post", "post"),
                postHandler.Delete,
            )
        }

        // Audit logs - Admin only
        auditGroup := api.Group("/audit")
        auditGroup.Use(authMiddleware.RequireRole("admin"))
        {
            auditGroup.GET("/users/:id", auditHandler.GetUserLogs)
            auditGroup.GET("/resources/:type/:id", auditHandler.GetResourceLogs)
        }
    }

    log.Println("Server starting on :3000")
    r.Run(":3000")
}
```

### 11. Example: Post Handler dengan Ownership Check

```go
// internal/post/handler.go
package post

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "your-project/pkg/middleware"
)

type Handler struct {
    service Service
}

func NewHandler(service Service) *Handler {
    return &Handler{service: service}
}

func (h *Handler) Update(c *gin.Context) {
    postID := c.Param("id")
    
    // Get post to check ownership
    post, err := h.service.GetByID(c.Request.Context(), postID)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
        return
    }

    // Set post owner ID for ownership middleware
    c.Set("post_user_id", post.UserID)

    // Parse request
    var req UpdatePostRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Update post
    userID := middleware.GetUserID(c)
    updatedPost, err := h.service.Update(c.Request.Context(), postID, userID, req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    // Set resource ID for audit log
    c.Set("resource_id", postID)

    c.JSON(http.StatusOK, gin.H{
        "message": "Post updated successfully",
        "data":    updatedPost,
    })
}
```

### 12. Google OAuth Console Setup Guide

```markdown
# Setup Google OAuth Console

1. **Go to Google Cloud Console**
   https://console.cloud.google.com/

2. **Create New Project**
   - Click "Select a project" → "New Project"
   - Name: "Your App Name"
   - Click "Create"

3. **Enable Google+ API**
   - Navigation menu → "APIs & Services" → "Library"
   - Search "Google+ API"
   - Click "Enable"

4. **Create OAuth Credentials**
   - Navigation menu → "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Your App OAuth"
   
5. **Configure OAuth Consent Screen**
   - User Type: External
   - App name: Your App Name
   - User support email: your@email.com
   - Developer contact: your@email.com
   - Scopes: Add email and profile
   - Test users: Add your test emails

6. **Set Authorized Redirect URIs**
   - Development: http://localhost:3000/auth/google/callback
   - Production: https://yourdomain.com/auth/google/callback

7. **Copy Credentials**
   - Copy "Client ID"
   - Copy "Client Secret"
   - Add to .env file

8. **Test OAuth Flow**
   - Visit: http://localhost:3000/auth/google
   - Sign in with Google
   - Approve permissions
   - Should redirect to callback with JWT
```

### 13. Complete Project Structure

```
project/
├── cmd/
│   └── api/
│       └── main.go
├── config/
│   ├── database.go
│   ├── oauth.go
│   └── env.go
├── internal/
│   ├── rbac/
│   │   ├── entity.go           # Role, User entities
│   │   ├── permission.go       # Permission constants & checkers
│   │   ├── role_repository.go
│   │   └── user_repository.go
│   ├── auth/
│   │   ├── service.go          # OAuth service
│   │   └── handler.go          # OAuth handlers
│   ├── audit/
│   │   ├── entity.go           # AuditLog entity
│   │   ├── repository.go
│   │   ├── service.go
│   │   └── handler.go
│   └── post/
│       ├── entity.go
│       ├── repository.go
│       ├── service.go
│       └── handler.go
├── pkg/
│   ├── auth/
│   │   └── jwt.go              # JWT manager
│   └── middleware/
│       ├── auth.go             # Auth middleware
│       ├── ownership.go        # Ownership checker
│       └── audit.go            # Audit logger
├── migrations/
│   └── mysql/
│       └── 000001_create_rbac_tables.up.sql
├── .env
├── go.mod
└── go.sum
```

## ❌ Common Mistakes + Fix

### 1. ❌ Permission di JWT tidak update saat role berubah

```go
// ❌ SALAH — JWT masih valid dengan old permissions
// User role changed dari user → admin, tapi JWT masih punya permissions lama
```

```go
// ✅ BENAR — Implement token refresh mechanism
type Service struct {
    tokenBlacklist map[string]bool // Or use Redis
}

func (s *Service) InvalidateUserTokens(userID string) {
    // Add current tokens to blacklist
    // Force user to re-login untuk get new permissions
}

// Atau set JWT expiry pendek (15 menit) dan implement refresh token
```

### 2. ❌ OAuth state tidak di-verify (CSRF vulnerable)

```go
// ❌ SALAH — Tidak verify state parameter
func (h *Handler) GoogleCallback(c *gin.Context) {
    code := c.Query("code")
    // Langsung exchange code tanpa verify state
}
```

```go
// ✅ BENAR — Verify state untuk CSRF protection
func (h *Handler) GoogleCallback(c *gin.Context) {
    session := sessions.Default(c)
    savedState := session.Get("oauth_state")
    
    if savedState == nil || savedState != c.Query("state") {
        c.JSON(400, gin.H{"error": "Invalid state"})
        return
    }
    
    // Continue with code exchange
}
```

### 3. ❌ Hardcode permission check di handler

```go
// ❌ SALAH — Permission logic di handler (hard to maintain)
func (h *Handler) Delete(c *gin.Context) {
    permissions := middleware.GetPermissions(c)
    if !contains(permissions, "post:delete") {
        c.JSON(403, gin.H{"error": "Forbidden"})
        return
    }
    // Delete logic
}
```

```go
// ✅ BENAR — Pakai middleware untuk permission check
r.DELETE("/posts/:id",
    authMiddleware.RequirePermission(rbac.PermissionPostDelete),
    postHandler.Delete,
)
```

### 4. ❌ Tidak log OAuth events

```go
// ❌ SALAH — OAuth login tidak di-audit
func (s *service) GoogleCallback(...) (string, error) {
    // Create/update user
    // Return JWT
    // Tidak ada audit log!
}
```

```go
// ✅ BENAR — Log OAuth events
func (s *service) GoogleCallback(...) (string, error) {
    user, err := s.upsertUser(ctx, googleUser)
    
    // Log OAuth login
    s.auditService.Log(ctx, &audit.AuditLog{
        UserID:       user.ID,
        Action:       "oauth_login",
        ResourceType: "auth",
        IPAddress:    ipAddress,
        Metadata:     datatypes.JSON(`{"provider": "google"}`),
    })
    
    return jwt, nil
}
```

### 5. ❌ Permission wildcard tidak handle dengan benar

```go
// ❌ SALAH — Wildcard tidak di-check
func HasPermission(userPerms []string, required string) bool {
    for _, perm := range userPerms {
        if perm == required {
            return true
        }
    }
    return false
    // Admin dengan "*:*" tidak bisa akses!
}
```

```go
// ✅ BENAR — Handle wildcard properly
func HasPermission(userPerms []string, required string) bool {
    for _, perm := range userPerms {
        if perm == required || perm == "*:*" {
            return true
        }
        // Check resource wildcard: post:*
        if strings.HasSuffix(perm, ":*") {
            resource := strings.Split(required, ":")[0]
            if strings.HasPrefix(perm, resource+":") {
                return true
            }
        }
    }
    return false
}
```

### 6. ❌ Ownership check setelah operation

```go
// ❌ SALAH — Check ownership SETELAH delete (too late!)
func (h *Handler) Delete(c *gin.Context) {
    postID := c.Param("id")
    h.service.Delete(ctx, postID) // Deleted!
    
    // Check ownership (too late!)
    if post.UserID != currentUserID {
        c.JSON(403, gin.H{"error": "Forbidden"})
        return
    }
}
```

```go
// ✅ BENAR — Check ownership SEBELUM operation
func (h *Handler) Delete(c *gin.Context) {
    postID := c.Param("id")
    
    // Get post first
    post, err := h.service.GetByID(ctx, postID)
    if err != nil {
        c.JSON(404, gin.H{"error": "Not found"})
        return
    }
    
    // Set for middleware
    c.Set("post_user_id", post.UserID)
    
    // Middleware will check ownership before this point
    h.service.Delete(ctx, postID)
}
```

### 7. ❌ Audit log blocking request

```go
// ❌ SALAH — Audit log synchronous (slow response)
func (m *AuditMiddleware) LogAction(...) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()
        m.auditService.Log(ctx, log) // Blocking!
    }
}
```

```go
// ✅ BENAR — Audit log asynchronous
func (m *AuditMiddleware) LogAction(...) gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()
        go m.auditService.Log(ctx, log) // Non-blocking!
    }
}
```

### 8. ❌ Expose permissions di API response

```go
// ❌ SALAH — Leak internal permissions
type UserResponse struct {
    ID          string   `json:"id"`
    Email       string   `json:"email"`
    Permissions []string `json:"permissions"` // Security risk!
}
```

```go
// ✅ BENAR — Jangan expose permissions detail
type UserResponse struct {
    ID    string `json:"id"`
    Email string `json:"email"`
    Role  string `json:"role"` // Only role name
}

// Permissions hanya di JWT claims (server-side validation)
```

### 9. ❌ OAuth redirect URL tidak di-whitelist

```go
// ❌ SALAH — Accept any redirect URL (open redirect vulnerability)
redirect := c.Query("redirect_url")
c.Redirect(302, redirect) // Dangerous!
```

```go
// ✅ BENAR — Whitelist redirect URLs
var allowedRedirects = []string{
    "http://localhost:3000",
    "https://yourdomain.com",
}

func isAllowedRedirect(url string) bool {
    for _, allowed := range allowedRedirects {
        if strings.HasPrefix(url, allowed) {
            return true
        }
    }
    return false
}
```

### 10. ❌ JWT secret weak atau hardcoded

```go
// ❌ SALAH — Weak or hardcoded secret
jwtManager := pkgauth.NewJWTManager("secret123", 24*time.Hour)
```

```go
// ✅ BENAR — Strong secret dari environment
secret := os.Getenv("JWT_SECRET")
if secret == "" || len(secret) < 32 {
    log.Fatal("JWT_SECRET must be at least 32 characters")
}
jwtManager := pkgauth.NewJWTManager(secret, 24*time.Hour)
```

## ✅ Checklist Akhir

Setelah belajar ini, pastikan lo bisa:

- [ ] Design RBAC dengan Role + Permissions
- [ ] Define permission constants dengan naming convention
- [ ] Implement permission checker dengan wildcard support
- [ ] Setup role hierarchy dengan level
- [ ] Embed role & permissions di JWT claims
- [ ] Bikin auth middleware untuk verify JWT
- [ ] Bikin authorization middleware RequireRole()
- [ ] Bikin authorization middleware RequirePermission()
- [ ] Handle object-level permission dengan IsOwner check
- [ ] Setup Google OAuth Console
- [ ] Implement OAuth Google flow dengan state verification
- [ ] Exchange code untuk access token
- [ ] Get user info dari Google API
- [ ] Upsert user dengan provider linking
- [ ] Return JWT setelah OAuth success
- [ ] Create audit log model
- [ ] Implement audit log middleware
- [ ] Log important actions (create, update, delete, login)
- [ ] Query audit log per user atau resource
- [ ] Handle CSRF attack dengan state parameter

## 💭 Ide Pengembangan Mandiri

Setelah paham RBAC + OAuth, coba kembangkan:

1. **Refresh Token Mechanism:**
   - Short-lived access token (15 min)
   - Long-lived refresh token (7 days)
   - Token rotation untuk security
   - Refresh token blacklist

2. **Multi-Provider OAuth:**
   - GitHub OAuth
   - Facebook OAuth
   - Twitter OAuth
   - Provider switching/linking

3. **Advanced RBAC:**
   - Dynamic permissions (store di database)
   - Permission groups
   - Temporary permissions (time-limited)
   - Context-based permissions

4. **Attribute-Based Access Control (ABAC):**
   - Permission based on user attributes
   - Time-based permissions
   - Location-based permissions
   - Conditional permissions

5. **Token Management:**
   - Active session management
   - Force logout dari semua device
   - Device fingerprinting
   - Suspicious login detection

6. **Advanced Audit:**
   - Real-time audit stream
   - Audit alert untuk suspicious activity
   - Audit retention policy
   - Export audit untuk compliance

7. **Security Enhancements:**
   - Rate limiting per user/IP
   - Brute force protection
   - Account lockout policy
   - 2FA/MFA integration

8. **Permission Analytics:**
   - Permission usage statistics
   - Unused permissions detection
   - Role optimization recommendations
   - Access pattern analysis

9. **Microservices RBAC:**
   - Centralized permission service
   - Permission cache dengan Redis
   - Permission sync across services
   - Service-to-service auth

10. **Admin Dashboard:**
    - Role management UI
    - Permission assignment UI
    - Audit log viewer
    - User activity monitoring

---

**Tips Pro:**
- **Permission granular tapi jangan berlebihan** → `user:read`, `user:write` cukup, ga perlu `user:read:name`
- **Admin selalu punya `*:*`** → Wildcard permission untuk superuser
- **JWT expiry pendek!** → 15-30 menit, pakai refresh token untuk long session
- **State parameter wajib** → CSRF protection untuk OAuth flow
- **Audit log asynchronous** → Jangan block response time
- **Permission di JWT, bukan query DB** → Faster authorization check
- **Ownership check before operation** → Prevent unauthorized delete/update
- **OAuth provider linking** → Allow user link multiple providers ke 1 account
- **Role hierarchy useful** → Admin > Manager > User untuk cascading permissions
- **Whitelist redirect URLs** → Prevent open redirect vulnerability

**RBAC + OAuth adalah foundation untuk production app!** Security harus jadi prioritas, bukan afterthought. 🔐
