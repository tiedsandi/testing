# 🔐 Authentication di Go: JWT + OAuth Google + API Key

## 🎯 Tujuan Belajar

Setelah materi ini, kamu bisa:
- ✅ Implement password hashing yang aman dengan bcrypt
- ✅ Bikin sistem JWT dengan access token + refresh token
- ✅ Implement refresh token rotation + blacklist dengan Redis
- ✅ Bikin API Key authentication dengan scope dan rate limiting
- ✅ Integrate OAuth Google login
- ✅ Bikin middleware yang support multi authentication method
- ✅ Handle role-based authorization

---

## 💡 Konsep + Analogi

### 1. **Password Hashing (bcrypt)**
**Analogi**: Kayak password manager yang ngubah password kamu jadi hash yang gak bisa di-reverse.

Di Next.js kamu mungkin pakai library kayak `bcryptjs`:
```typescript
// Next.js/Node.js
const hash = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hash);
```

Di Go konsepnya sama, tapi lebih strict soal cost factor (saltRounds):
```go
// Go
hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
err := bcrypt.CompareHashAndPassword(hash, []byte(password))
```

**Cost factor** = seberapa berat komputasi hash-nya. Higher = lebih aman tapi lebih lambat. Default 10 udah oke.

---

### 2. **JWT (JSON Web Token)**
**Analogi**: Kayak tiket konser yang ada barcode-nya. Tiket ini:
- Ada data kamu di dalamnya (claims)
- Ada tanda tangan panitia (signature) yang gak bisa dipalsuin
- Ada masa expired

Di Next.js dengan NextAuth atau manual:
```typescript
// Next.js
const token = jwt.sign({ userId: 1 }, secret, { expiresIn: '15m' });
const decoded = jwt.verify(token, secret);
```

Di Go:
```go
// Go
token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
tokenString, _ := token.SignedString([]byte(secret))
```

**Access Token** = token pendek (15 menit) untuk akses API
**Refresh Token** = token panjang (7 hari) untuk minta access token baru

Kenapa 2 token? 
- Kalo access token kecolongan, cuma bahaya 15 menit
- Refresh token disimpan lebih aman (cookies httpOnly atau secure storage)

---

### 3. **OAuth Google**
**Analogi**: Kayak "Login with Google" di Next.js pakai NextAuth.

Flow-nya sama persis:
1. User klik "Login with Google"
2. Redirect ke Google OAuth page
3. User approve
4. Google redirect balik ke app kamu dengan `code`
5. App tukar `code` dengan `access token` ke Google
6. Pakai token itu buat ambil user info dari Google
7. Simpan/update user di database
8. Return JWT kamu sendiri ke client

---

### 4. **API Key**
**Analogi**: Kayak API key di Vercel, Supabase, atau third-party service lain.

Bedanya sama JWT:
- **JWT**: untuk user manusia, ada expired, ada refresh
- **API Key**: untuk sistem/aplikasi, gak expired (kecuali di-revoke), lebih simple

API Key biasanya punya:
- **Scope**: read-only, read-write, admin
- **Rate limit**: max berapa request per menit
- **Prefix**: kayak `sk_live_...` atau `pk_test_...` (ala Stripe)

---

## 📝 Materi + Kode Lengkap

### Project Structure

```
.
├── main.go
├── .env
├── go.mod
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── database/
│   │   └── database.go
│   ├── redis/
│   │   └── redis.go
│   ├── models/
│   │   ├── user.go
│   │   └── api_key.go
│   ├── dto/
│   │   └── auth.go
│   ├── middleware/
│   │   ├── jwt.go
│   │   ├── apikey.go
│   │   └── auth.go
│   ├── utils/
│   │   ├── jwt.go
│   │   ├── password.go
│   │   └── apikey.go
│   └── auth/
│       ├── handler.go
│       ├── service.go
│       └── repository.go
└── .gitignore
```

---

### Step 1: Setup Project

```bash
# Terminal
mkdir go-auth-complete && cd go-auth-complete
go mod init go-auth-complete

# Install dependencies
go get github.com/gofiber/fiber/v2
go get github.com/golang-jwt/jwt/v5
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/redis/go-redis/v9
go get github.com/joho/godotenv
go get golang.org/x/crypto/bcrypt
go get golang.org/x/oauth2
go get golang.org/x/oauth2/google
go get github.com/google/uuid
```

---

### Step 2: Environment Variables

```bash
# .env
# Database
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=go_auth_db
DB_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:3000/api/auth/google/callback

# Server
PORT=3000
```

---

### Step 3: Config

```go
// internal/config/config.go
package config

import (
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database
	DBHost     string
	DBUser     string
	DBPassword string
	DBName     string
	DBPort     string

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string

	// JWT
	JWTSecret        string
	JWTAccessExpiry  time.Duration
	JWTRefreshExpiry time.Duration

	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	// Server
	Port string
}

func Load() (*Config, error) {
	// Load .env file (optional, bisa pakai env var langsung)
	godotenv.Load()

	cfg := &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "go_auth_db"),
		DBPort:     getEnv("DB_PORT", "5432"),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		JWTSecret:        getEnv("JWT_SECRET", "default-secret-change-me"),
		JWTAccessExpiry:  parseDuration(getEnv("JWT_ACCESS_EXPIRY", "15m")),
		JWTRefreshExpiry: parseDuration(getEnv("JWT_REFRESH_EXPIRY", "168h")),

		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:3000/api/auth/google/callback"),

		Port: getEnv("PORT", "3000"),
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		fmt.Printf("Error parsing duration %s: %v\n", s, err)
		return 15 * time.Minute
	}
	return d
}
```

**Analogi**: Ini kayak `process.env` di Next.js, tapi di-wrap dalam struct supaya type-safe dan ada default value.

---

### Step 4: Database Connection

```go
// internal/database/database.go
package database

import (
	"fmt"
	"log"

	"go-auth-complete/internal/config"
	"go-auth-complete/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect(cfg *config.Config) error {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort,
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect database: %w", err)
	}

	log.Println("✅ Database connected")

	// Auto migrate
	if err := DB.AutoMigrate(
		&models.User{},
		&models.APIKey{},
	); err != nil {
		return fmt.Errorf("failed to migrate: %w", err)
	}

	log.Println("✅ Database migrated")

	return nil
}

func GetDB() *gorm.DB {
	return DB
}
```

---

### Step 5: Redis Connection

```go
// internal/redis/redis.go
package redis

import (
	"context"
	"fmt"
	"log"

	"go-auth-complete/internal/config"

	"github.com/redis/go-redis/v9"
)

var Client *redis.Client

func Connect(cfg *config.Config) error {
	Client = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       0,
	})

	// Test connection
	ctx := context.Background()
	if err := Client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect redis: %w", err)
	}

	log.Println("✅ Redis connected")
	return nil
}

func GetClient() *redis.Client {
	return Client
}
```

**Analogi**: Redis ini kayak cache atau session storage. Di Next.js biasanya pakai Vercel KV atau Upstash Redis. Kita pakai ini buat blacklist refresh token.

---

### Step 6: Models

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

	Email        string  `gorm:"uniqueIndex;not null" json:"email"`
	Password     *string `json:"-"` // Pointer karena OAuth user gak punya password
	Name         string  `json:"name"`
	Role         string  `gorm:"default:user" json:"role"` // user, admin
	GoogleID     *string `gorm:"uniqueIndex" json:"-"`     // Untuk OAuth Google
	RefreshToken *string `gorm:"type:text" json:"-"`       // Simpan refresh token terakhir

	APIKeys []APIKey `gorm:"foreignKey:UserID" json:"-"`
}

// TableName override nama table
func (User) TableName() string {
	return "users"
}
```

```go
// internal/models/api_key.go
package models

import (
	"time"

	"gorm.io/gorm"
)

type APIKey struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID uint   `gorm:"not null;index" json:"user_id"`
	User   User   `gorm:"foreignKey:UserID" json:"-"`
	Name   string `json:"name"` // Nama API key, misal "Production API", "Dev API"
	Key    string `gorm:"uniqueIndex;not null" json:"key"`
	Hash   string `gorm:"not null" json:"-"` // Hash dari key
	Scope  string `gorm:"default:read" json:"scope"` // read, write, admin

	// Rate limiting
	RateLimit int `gorm:"default:100" json:"rate_limit"` // Request per menit

	LastUsedAt *time.Time `json:"last_used_at"`
	IsActive   bool       `gorm:"default:true" json:"is_active"`
}

// TableName override nama table
func (APIKey) TableName() string {
	return "api_keys"
}
```

**Analogi**: 
- `User.Password` pakai pointer karena user dari OAuth gak punya password (NULL di database)
- `Role` kayak role di RBAC (Role-Based Access Control)
- `APIKey` relationship one-to-many sama User (1 user bisa punya banyak API key)

---

### Step 7: DTO (Data Transfer Object)

```go
// internal/dto/auth.go
package dto

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name" validate:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type AuthResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"` // Dalam detik
}

type UserResponse struct {
	ID    uint   `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

type CreateAPIKeyRequest struct {
	Name      string `json:"name" validate:"required"`
	Scope     string `json:"scope" validate:"required,oneof=read write admin"`
	RateLimit int    `json:"rate_limit" validate:"required,min=1,max=1000"`
}

type APIKeyResponse struct {
	ID         uint   `json:"id"`
	Name       string `json:"name"`
	Key        string `json:"key"` // Ini HANYA dikembalikan saat create, setelah itu disimpan hash-nya
	Scope      string `json:"scope"`
	RateLimit  int    `json:"rate_limit"`
	CreatedAt  string `json:"created_at"`
	LastUsedAt string `json:"last_used_at,omitempty"`
}
```

**Analogi**: DTO ini kayak TypeScript interface buat request/response body. Di Next.js kamu bikin interface/type, di Go kita bikin struct dengan JSON tags.

---

### Step 8: Utils - Password Hashing

```go
// internal/utils/password.go
package utils

import (
	"golang.org/x/crypto/bcrypt"
)

// HashPassword meng-hash password menggunakan bcrypt
// Cost 12 = 2^12 iterations, lebih aman dari default (10) tapi masih cepat
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

// CheckPassword membandingkan password plain text dengan hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
```

**Penjelasan Cost Factor**:
- Cost 10 = ~100ms
- Cost 12 = ~400ms  ← **Kita pakai ini**
- Cost 14 = ~1.6s

Lebih tinggi = lebih aman terhadap brute force, tapi user nunggu lebih lama saat login.

---

### Step 9: Utils - JWT

```go
// internal/utils/jwt.go
package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// CustomClaims adalah struktur data yang disimpan di JWT
type CustomClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	Type   string `json:"type"` // "access" atau "refresh"
	jwt.RegisteredClaims
}

// GenerateAccessToken membuat JWT access token (short-lived)
func GenerateAccessToken(userID uint, email, role, secret string, expiry time.Duration) (string, error) {
	claims := CustomClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		Type:   "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GenerateRefreshToken membuat JWT refresh token (long-lived)
func GenerateRefreshToken(userID uint, email, role, secret string, expiry time.Duration) (string, error) {
	claims := CustomClaims{
		UserID: userID,
		Email:  email,
		Role:   role,
		Type:   "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateToken memvalidasi dan parse JWT token
func ValidateToken(tokenString, secret string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &CustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Pastikan signing method adalah HMAC
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
```

**Analogi**: 
- `CustomClaims` kayak payload JWT di TypeScript
- `RegisteredClaims` itu standard JWT claims (iat, exp, nbf)
- Kita tambahin custom fields: `UserID`, `Email`, `Role`, `Type`

---

### Step 10: Utils - API Key

```go
// internal/utils/apikey.go
package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// GenerateAPIKey membuat API key random yang aman
// Format: sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
func GenerateAPIKey(prefix string) (string, error) {
	// Generate 32 bytes random
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	// Encode ke hex
	key := hex.EncodeToString(bytes)

	// Tambahkan prefix
	if prefix == "" {
		prefix = "sk_live"
	}

	return fmt.Sprintf("%s_%s", prefix, key), nil
}

// HashAPIKey meng-hash API key untuk disimpan di database
// Konsepnya sama kayak password, jangan simpan plain text
func HashAPIKey(key string) string {
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}

// CompareAPIKey membandingkan API key plain dengan hash
func CompareAPIKey(key, hash string) bool {
	keyHash := HashAPIKey(key)
	return keyHash == hash
}
```

**Analogi**:
- API Key kayak password, tapi untuk machine-to-machine
- Kita pakai `crypto/rand` untuk generate random bytes yang secure
- Prefix `sk_live` kayak convention dari Stripe, OpenAI, dll
- Hash pakai SHA-256 (bukan bcrypt) karena gak perlu cost factor, API key udah random enough

---

### Step 11: Repository Layer

```go
// internal/auth/repository.go
package auth

import (
	"context"
	"go-auth-complete/internal/models"

	"gorm.io/gorm"
)

type Repository interface {
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, id uint) (*models.User, error)
	GetUserByGoogleID(ctx context.Context, googleID string) (*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
	CreateAPIKey(ctx context.Context, apiKey *models.APIKey) error
	GetAPIKeyByHash(ctx context.Context, hash string) (*models.APIKey, error)
	GetActiveAPIKeysByUserID(ctx context.Context, userID uint) ([]models.APIKey, error)
	UpdateAPIKey(ctx context.Context, apiKey *models.APIKey) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateUser(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *repository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) GetUserByID(ctx context.Context, id uint) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) GetUserByGoogleID(ctx context.Context, googleID string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("google_id = ?", googleID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) UpdateUser(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *repository) CreateAPIKey(ctx context.Context, apiKey *models.APIKey) error {
	return r.db.WithContext(ctx).Create(apiKey).Error
}

func (r *repository) GetAPIKeyByHash(ctx context.Context, hash string) (*models.APIKey, error) {
	var apiKey models.APIKey
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("hash = ? AND is_active = ?", hash, true).
		First(&apiKey).Error
	if err != nil {
		return nil, err
	}
	return &apiKey, nil
}

func (r *repository) GetActiveAPIKeysByUserID(ctx context.Context, userID uint) ([]models.APIKey, error) {
	var apiKeys []models.APIKey
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND is_active = ?", userID, true).
		Order("created_at DESC").
		Find(&apiKeys).Error
	return apiKeys, err
}

func (r *repository) UpdateAPIKey(ctx context.Context, apiKey *models.APIKey) error {
	return r.db.WithContext(ctx).Save(apiKey).Error
}
```

**Analogi**: Repository pattern ini kayak Prisma client di Next.js. Kita pisahin database logic dari business logic.

---

### Step 12: Service Layer

```go
// internal/auth/service.go
package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go-auth-complete/internal/config"
	"go-auth-complete/internal/dto"
	"go-auth-complete/internal/models"
	redisClient "go-auth-complete/internal/redis"
	"go-auth-complete/internal/utils"

	"github.com/redis/go-redis/v9"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

type Service interface {
	Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error)
	Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error)
	RefreshToken(ctx context.Context, req *dto.RefreshTokenRequest) (*dto.AuthResponse, error)
	Logout(ctx context.Context, userID uint, refreshToken string) error
	GetGoogleOAuthURL(state string) string
	GoogleCallback(ctx context.Context, code string) (*dto.AuthResponse, error)
	CreateAPIKey(ctx context.Context, userID uint, req *dto.CreateAPIKeyRequest) (*dto.APIKeyResponse, error)
	GetUserAPIKeys(ctx context.Context, userID uint) ([]dto.APIKeyResponse, error)
}

type service struct {
	repo         Repository
	cfg          *config.Config
	oauth2Config *oauth2.Config
	redis        *redis.Client
}

func NewService(repo Repository, cfg *config.Config) Service {
	// Setup Google OAuth2 config
	oauth2Cfg := &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.GoogleRedirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	return &service{
		repo:         repo,
		cfg:          cfg,
		oauth2Config: oauth2Cfg,
		redis:        redisClient.GetClient(),
	}
}

// Register user baru
func (s *service) Register(ctx context.Context, req *dto.RegisterRequest) (*dto.AuthResponse, error) {
	// Check apakah email sudah terdaftar
	existingUser, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("error checking email: %w", err)
	}
	if existingUser != nil {
		return nil, errors.New("email already registered")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("error hashing password: %w", err)
	}

	// Create user
	user := &models.User{
		Email:    req.Email,
		Password: &hashedPassword,
		Name:     req.Name,
		Role:     "user",
	}

	if err := s.repo.CreateUser(ctx, user); err != nil {
		return nil, fmt.Errorf("error creating user: %w", err)
	}

	// Generate tokens
	return s.generateTokens(user)
}

// Login user
func (s *service) Login(ctx context.Context, req *dto.LoginRequest) (*dto.AuthResponse, error) {
	// Get user by email
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid email or password")
		}
		return nil, fmt.Errorf("error getting user: %w", err)
	}

	// Check password (user dari OAuth gak punya password)
	if user.Password == nil {
		return nil, errors.New("this account uses OAuth login")
	}

	if !utils.CheckPassword(req.Password, *user.Password) {
		return nil, errors.New("invalid email or password")
	}

	// Generate tokens
	return s.generateTokens(user)
}

// RefreshToken generate access token baru dari refresh token
func (s *service) RefreshToken(ctx context.Context, req *dto.RefreshTokenRequest) (*dto.AuthResponse, error) {
	// Validate refresh token
	claims, err := utils.ValidateToken(req.RefreshToken, s.cfg.JWTSecret)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// Check type
	if claims.Type != "refresh" {
		return nil, errors.New("token is not a refresh token")
	}

	// Check apakah refresh token di-blacklist
	isBlacklisted, err := s.isTokenBlacklisted(ctx, req.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("error checking blacklist: %w", err)
	}
	if isBlacklisted {
		return nil, errors.New("refresh token has been revoked")
	}

	// Get user
	user, err := s.repo.GetUserByID(ctx, claims.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	// Blacklist refresh token lama (refresh token rotation)
	if err := s.blacklistToken(ctx, req.RefreshToken); err != nil {
		return nil, fmt.Errorf("error blacklisting token: %w", err)
	}

	// Generate tokens baru
	return s.generateTokens(user)
}

// Logout user dan blacklist refresh token
func (s *service) Logout(ctx context.Context, userID uint, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}

	// Blacklist refresh token
	return s.blacklistToken(ctx, refreshToken)
}

// GetGoogleOAuthURL return URL untuk redirect ke Google OAuth
func (s *service) GetGoogleOAuthURL(state string) string {
	return s.oauth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

// GoogleCallback handle callback dari Google OAuth
func (s *service) GoogleCallback(ctx context.Context, code string) (*dto.AuthResponse, error) {
	// Tukar authorization code dengan token
	token, err := s.oauth2Config.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("error exchanging code: %w", err)
	}

	// Get user info dari Google
	client := s.oauth2Config.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("error getting user info: %w", err)
	}
	defer resp.Body.Close()

	var googleUser struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		return nil, fmt.Errorf("error decoding user info: %w", err)
	}

	// Check apakah user sudah ada berdasarkan Google ID
	user, err := s.repo.GetUserByGoogleID(ctx, googleUser.ID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("error checking google id: %w", err)
	}

	// Kalau user belum ada, check by email
	if user == nil {
		user, err = s.repo.GetUserByEmail(ctx, googleUser.Email)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("error checking email: %w", err)
		}
	}

	// Kalau user belum ada sama sekali, create baru
	if user == nil {
		user = &models.User{
			Email:    googleUser.Email,
			Name:     googleUser.Name,
			GoogleID: &googleUser.ID,
			Role:     "user",
		}
		if err := s.repo.CreateUser(ctx, user); err != nil {
			return nil, fmt.Errorf("error creating user: %w", err)
		}
	} else {
		// Update Google ID jika belum ada
		if user.GoogleID == nil {
			user.GoogleID = &googleUser.ID
			if err := s.repo.UpdateUser(ctx, user); err != nil {
				return nil, fmt.Errorf("error updating user: %w", err)
			}
		}
	}

	// Generate tokens
	return s.generateTokens(user)
}

// CreateAPIKey generate API key baru untuk user
func (s *service) CreateAPIKey(ctx context.Context, userID uint, req *dto.CreateAPIKeyRequest) (*dto.APIKeyResponse, error) {
	// Generate API key
	key, err := utils.GenerateAPIKey("sk_live")
	if err != nil {
		return nil, fmt.Errorf("error generating api key: %w", err)
	}

	// Hash API key
	hash := utils.HashAPIKey(key)

	// Create API key record
	apiKey := &models.APIKey{
		UserID:    userID,
		Name:      req.Name,
		Key:       key, // Temporary, akan di-clear setelah response
		Hash:      hash,
		Scope:     req.Scope,
		RateLimit: req.RateLimit,
		IsActive:  true,
	}

	if err := s.repo.CreateAPIKey(ctx, apiKey); err != nil {
		return nil, fmt.Errorf("error creating api key: %w", err)
	}

	// Return response (ini SATU-SATUNYA kesempatan user lihat key-nya)
	return &dto.APIKeyResponse{
		ID:        apiKey.ID,
		Name:      apiKey.Name,
		Key:       key, // Plain key, HANYA dikembalikan saat create
		Scope:     apiKey.Scope,
		RateLimit: apiKey.RateLimit,
		CreatedAt: apiKey.CreatedAt.Format(time.RFC3339),
	}, nil
}

// GetUserAPIKeys return semua API keys milik user
func (s *service) GetUserAPIKeys(ctx context.Context, userID uint) ([]dto.APIKeyResponse, error) {
	apiKeys, err := s.repo.GetActiveAPIKeysByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("error getting api keys: %w", err)
	}

	responses := make([]dto.APIKeyResponse, len(apiKeys))
	for i, apiKey := range apiKeys {
		lastUsed := ""
		if apiKey.LastUsedAt != nil {
			lastUsed = apiKey.LastUsedAt.Format(time.RFC3339)
		}

		responses[i] = dto.APIKeyResponse{
			ID:         apiKey.ID,
			Name:       apiKey.Name,
			Key:        "sk_live_••••••••", // Mask key
			Scope:      apiKey.Scope,
			RateLimit:  apiKey.RateLimit,
			CreatedAt:  apiKey.CreatedAt.Format(time.RFC3339),
			LastUsedAt: lastUsed,
		}
	}

	return responses, nil
}

// === Helper Functions ===

// generateTokens generate access token + refresh token
func (s *service) generateTokens(user *models.User) (*dto.AuthResponse, error) {
	accessToken, err := utils.GenerateAccessToken(
		user.ID,
		user.Email,
		user.Role,
		s.cfg.JWTSecret,
		s.cfg.JWTAccessExpiry,
	)
	if err != nil {
		return nil, fmt.Errorf("error generating access token: %w", err)
	}

	refreshToken, err := utils.GenerateRefreshToken(
		user.ID,
		user.Email,
		user.Role,
		s.cfg.JWTSecret,
		s.cfg.JWTRefreshExpiry,
	)
	if err != nil {
		return nil, fmt.Errorf("error generating refresh token: %w", err)
	}

	return &dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int(s.cfg.JWTAccessExpiry.Seconds()),
	}, nil
}

// blacklistToken tambahkan refresh token ke blacklist di Redis
func (s *service) blacklistToken(ctx context.Context, token string) error {
	// Parse token untuk dapat expiry time
	claims, err := utils.ValidateToken(token, s.cfg.JWTSecret)
	if err != nil {
		return err
	}

	// Hitung TTL (time to live) sampai token expired
	ttl := time.Until(claims.ExpiresAt.Time)
	if ttl <= 0 {
		return nil // Token sudah expired, gak perlu di-blacklist
	}

	// Simpan ke Redis dengan TTL
	key := fmt.Sprintf("blacklist:%s", token)
	return s.redis.Set(ctx, key, "1", ttl).Err()
}

// isTokenBlacklisted check apakah token ada di blacklist
func (s *service) isTokenBlacklisted(ctx context.Context, token string) (bool, error) {
	key := fmt.Sprintf("blacklist:%s", token)
	result, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return false, nil // Token tidak di-blacklist
		}
		return false, err
	}
	return result == "1", nil
}
```

Tambahkan import yang kurang di bagian atas:

```go
import (
	"encoding/json"
	// ... imports lainnya
)
```

**Analogi Service Layer**: Kayak API route handler di Next.js yang udah di-extract jadi functions. Semua business logic ada di sini.

**Highlight**:
- **Refresh Token Rotation**: Setiap kali refresh, token lama di-blacklist dan generate yang baru
- **OAuth Upsert**: Kalau user login Google pertama kali, auto create. Kalau udah ada, update Google ID
- **API Key**: Plain key HANYA dikembalikan saat create, setelah itu disimpan hash-nya aja

---

### Step 13: Handler Layer

```go
// internal/auth/handler.go
package auth

import (
	"go-auth-complete/internal/dto"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// Register godoc
// @Summary Register new user
// @Tags auth
// @Accept json
// @Produce json
// @Param request body dto.RegisterRequest true "Register request"
// @Success 201 {object} dto.AuthResponse
// @Router /auth/register [post]
func (h *Handler) Register(c *fiber.Ctx) error {
	var req dto.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	response, err := h.service.Register(c.Context(), &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// Login godoc
// @Summary Login user
// @Tags auth
// @Accept json
// @Produce json
// @Param request body dto.LoginRequest true "Login request"
// @Success 200 {object} dto.AuthResponse
// @Router /auth/login [post]
func (h *Handler) Login(c *fiber.Ctx) error {
	var req dto.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	response, err := h.service.Login(c.Context(), &req)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// RefreshToken godoc
// @Summary Refresh access token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body dto.RefreshTokenRequest true "Refresh token request"
// @Success 200 {object} dto.AuthResponse
// @Router /auth/refresh [post]
func (h *Handler) RefreshToken(c *fiber.Ctx) error {
	var req dto.RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	response, err := h.service.RefreshToken(c.Context(), &req)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// Logout godoc
// @Summary Logout user
// @Tags auth
// @Accept json
// @Produce json
// @Param request body dto.RefreshTokenRequest true "Refresh token to revoke"
// @Success 200 {object} map[string]string
// @Router /auth/logout [post]
func (h *Handler) Logout(c *fiber.Ctx) error {
	var req dto.RefreshTokenRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Get user ID dari middleware (jika sudah login)
	userID := c.Locals("userID")
	if userID == nil {
		// Jika belum ada di locals, parse dari refresh token
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "Logged out successfully",
		})
	}

	err := h.service.Logout(c.Context(), userID.(uint), req.RefreshToken)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Logged out successfully",
	})
}

// GoogleLogin godoc
// @Summary Get Google OAuth URL
// @Tags auth
// @Produce json
// @Success 200 {object} map[string]string
// @Router /auth/google [get]
func (h *Handler) GoogleLogin(c *fiber.Ctx) error {
	// Generate random state untuk CSRF protection
	state := uuid.New().String()

	// Di production, simpan state di session/cookie dan validasi di callback
	// Untuk simplicity, kita skip validasi state di tutorial ini

	url := h.service.GetGoogleOAuthURL(state)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"url": url,
	})
}

// GoogleCallback godoc
// @Summary Handle Google OAuth callback
// @Tags auth
// @Produce json
// @Param code query string true "Authorization code from Google"
// @Param state query string true "State for CSRF protection"
// @Success 200 {object} dto.AuthResponse
// @Router /auth/google/callback [get]
func (h *Handler) GoogleCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Missing authorization code",
		})
	}

	// Di production, validasi state untuk CSRF protection

	response, err := h.service.GoogleCallback(c.Context(), code)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// CreateAPIKey godoc
// @Summary Create new API key
// @Tags api-keys
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body dto.CreateAPIKeyRequest true "Create API key request"
// @Success 201 {object} dto.APIKeyResponse
// @Router /api-keys [post]
func (h *Handler) CreateAPIKey(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req dto.CreateAPIKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	response, err := h.service.CreateAPIKey(c.Context(), userID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}

// GetAPIKeys godoc
// @Summary Get all user's API keys
// @Tags api-keys
// @Produce json
// @Security BearerAuth
// @Success 200 {array} dto.APIKeyResponse
// @Router /api-keys [get]
func (h *Handler) GetAPIKeys(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	response, err := h.service.GetUserAPIKeys(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// Me godoc
// @Summary Get current user info
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} dto.UserResponse
// @Router /auth/me [get]
func (h *Handler) Me(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	email := c.Locals("email").(string)
	role := c.Locals("role").(string)

	return c.Status(fiber.StatusOK).JSON(dto.UserResponse{
		ID:    userID,
		Email: email,
		Role:  role,
	})
}
```

**Analogi**: Handler ini kayak API route di Next.js App Router (`app/api/auth/login/route.ts`). Tugas handler cuma:
1. Parse request
2. Call service
3. Return response

---

### Step 14: JWT Middleware

```go
// internal/middleware/jwt.go
package middleware

import (
	"go-auth-complete/internal/config"
	"go-auth-complete/internal/utils"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// JWTMiddleware validasi JWT token dari Authorization header
func JWTMiddleware(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing authorization header",
			})
		}

		// Check format: "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid authorization header format",
			})
		}

		tokenString := parts[1]

		// Validate token
		claims, err := utils.ValidateToken(tokenString, cfg.JWTSecret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid or expired token",
			})
		}

		// Check token type
		if claims.Type != "access" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token type",
			})
		}

		// Inject user data ke context
		c.Locals("userID", claims.UserID)
		c.Locals("email", claims.Email)
		c.Locals("role", claims.Role)

		return c.Next()
	}
}

// RequireRole middleware untuk check role user
func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole := c.Locals("role")
		if userRole == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		// Check apakah user role ada di allowed roles
		roleStr := userRole.(string)
		for _, role := range roles {
			if roleStr == role {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Insufficient permissions",
		})
	}
}
```

**Analogi**: Middleware ini kayak middleware di Next.js yang check token di `headers()`. Di Fiber, middleware bisa di-chain dan next handler akses data via `c.Locals()`.

---

### Step 15: API Key Middleware

```go
// internal/middleware/apikey.go
package middleware

import (
	"context"
	"fmt"
	"go-auth-complete/internal/database"
	"go-auth-complete/internal/models"
	redisClient "go-auth-complete/internal/redis"
	"go-auth-complete/internal/utils"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

// APIKeyMiddleware validasi API key dari X-API-Key header
func APIKeyMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Get API key dari header
		apiKey := c.Get("X-API-Key")
		if apiKey == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing API key",
			})
		}

		// Hash API key
		hash := utils.HashAPIKey(apiKey)

		// Check di cache Redis dulu (performance optimization)
		ctx := c.Context()
		redis := redisClient.GetClient()
		cacheKey := fmt.Sprintf("apikey:%s", hash)

		var apiKeyRecord *models.APIKey

		// Try get from cache
		cachedData, err := redis.Get(ctx, cacheKey).Result()
		if err == nil {
			// Found in cache, decode
			// Untuk simplicity, kita skip caching dan langsung query DB
			// Di production, implement proper cache serialization
		}

		// Get from database
		db := database.GetDB()
		err = db.WithContext(ctx).
			Preload("User").
			Where("hash = ? AND is_active = ?", hash, true).
			First(&apiKeyRecord).Error

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Invalid API key",
				})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Internal server error",
			})
		}

		// Check rate limit
		if !checkRateLimit(ctx, redis, apiKeyRecord.ID, apiKeyRecord.RateLimit) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Rate limit exceeded",
			})
		}

		// Update last used
		go updateLastUsed(apiKeyRecord.ID)

		// Inject data ke context
		c.Locals("userID", apiKeyRecord.UserID)
		c.Locals("email", apiKeyRecord.User.Email)
		c.Locals("role", apiKeyRecord.User.Role)
		c.Locals("apiKeyID", apiKeyRecord.ID)
		c.Locals("apiKeyScope", apiKeyRecord.Scope)
		c.Locals("authMethod", "apikey")

		return c.Next()
	}
}

// RequireScope middleware untuk check scope API key
func RequireScope(scopes ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authMethod := c.Locals("authMethod")
		if authMethod != "apikey" {
			// Jika pakai JWT, skip scope check
			return c.Next()
		}

		apiKeyScope := c.Locals("apiKeyScope")
		if apiKeyScope == nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Missing scope",
			})
		}

		// Check apakah scope API key ada di allowed scopes
		scopeStr := apiKeyScope.(string)
		for _, scope := range scopes {
			if scopeStr == scope || scopeStr == "admin" {
				return c.Next()
			}
		}

		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Insufficient permissions",
		})
	}
}

// checkRateLimit check apakah API key melebihi rate limit
func checkRateLimit(ctx context.Context, redis *redis.Client, apiKeyID uint, limit int) bool {
	key := fmt.Sprintf("ratelimit:apikey:%d", apiKeyID)

	// Get current count
	count, err := redis.Get(ctx, key).Int()
	if err != nil && err != redis.Nil {
		return false
	}

	// Check limit
	if count >= limit {
		return false
	}

	// Increment counter
	pipe := redis.Pipeline()
	pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, 1*time.Minute)
	_, err = pipe.Exec(ctx)

	return err == nil
}

// updateLastUsed update last_used_at field (async)
func updateLastUsed(apiKeyID uint) {
	db := database.GetDB()
	now := time.Now()
	db.Model(&models.APIKey{}).
		Where("id = ?", apiKeyID).
		Update("last_used_at", now)
}
```

**Penjelasan Rate Limit**:
- Rate limit per menit
- Counter disimpan di Redis dengan TTL 1 menit
- Setiap request increment counter
- Kalau counter >= limit, reject request

---

### Step 16: Combined Auth Middleware

```go
// internal/middleware/auth.go
package middleware

import (
	"go-auth-complete/internal/config"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// AuthMiddleware support JWT dan API Key
// Priority: JWT > API Key
func AuthMiddleware(cfg *config.Config) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check Authorization header (JWT)
		authHeader := c.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			// Use JWT middleware
			return JWTMiddleware(cfg)(c)
		}

		// Check X-API-Key header
		apiKey := c.Get("X-API-Key")
		if apiKey != "" {
			// Use API Key middleware
			return APIKeyMiddleware()(c)
		}

		// No authentication provided
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing authentication credentials",
		})
	}
}
```

**Analogi**: Middleware ini kayak `middleware.ts` di Next.js yang bisa handle multiple auth method. Client bisa pilih pakai JWT atau API Key.

---

### Step 17: Main Application

```go
// main.go
package main

import (
	"fmt"
	"log"

	"go-auth-complete/internal/auth"
	"go-auth-complete/internal/config"
	"go-auth-complete/internal/database"
	"go-auth-complete/internal/middleware"
	redisClient "go-auth-complete/internal/redis"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	// Connect database
	if err := database.Connect(cfg); err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// Connect Redis
	if err := redisClient.Connect(cfg); err != nil {
		log.Fatal("Failed to connect redis:", err)
	}

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: customErrorHandler,
	})

	// Global middlewares
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-API-Key",
	}))

	// Setup routes
	setupRoutes(app, cfg)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("🚀 Server running on http://localhost%s\n", addr)
	log.Fatal(app.Listen(addr))
}

func setupRoutes(app *fiber.App, cfg *config.Config) {
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"message": "Server is running",
		})
	})

	// Initialize layers
	db := database.GetDB()
	authRepo := auth.NewRepository(db)
	authService := auth.NewService(authRepo, cfg)
	authHandler := auth.NewHandler(authService)

	// API routes
	api := app.Group("/api")

	// Auth routes (public)
	authGroup := api.Group("/auth")
	authGroup.Post("/register", authHandler.Register)
	authGroup.Post("/login", authHandler.Login)
	authGroup.Post("/refresh", authHandler.RefreshToken)
	authGroup.Post("/logout", authHandler.Logout)
	authGroup.Get("/google", authHandler.GoogleLogin)
	authGroup.Get("/google/callback", authHandler.GoogleCallback)

	// Protected routes (JWT atau API Key)
	authGroup.Get("/me", middleware.AuthMiddleware(cfg), authHandler.Me)

	// API Key routes (JWT only)
	apiKeyGroup := api.Group("/api-keys")
	apiKeyGroup.Use(middleware.JWTMiddleware(cfg))
	apiKeyGroup.Post("/", authHandler.CreateAPIKey)
	apiKeyGroup.Get("/", authHandler.GetAPIKeys)

	// Example protected route dengan scope
	exampleGroup := api.Group("/example")
	exampleGroup.Use(middleware.AuthMiddleware(cfg))

	exampleGroup.Get("/read", middleware.RequireScope("read", "write", "admin"), func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "This is a read endpoint",
			"user_id": c.Locals("userID"),
		})
	})

	exampleGroup.Post("/write", middleware.RequireScope("write", "admin"), func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "This is a write endpoint",
			"user_id": c.Locals("userID"),
		})
	})

	exampleGroup.Delete("/admin", middleware.RequireScope("admin"), func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "This is an admin endpoint",
			"user_id": c.Locals("userID"),
		})
	})
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	return c.Status(code).JSON(fiber.Map{
		"error": message,
	})
}
```

---

### Step 18: .gitignore

```
# .gitignore
.env
*.log
tmp/
vendor/
```

---

## ❌ Common Mistakes + Fix

### 1. **Simpan JWT Secret di Hardcode**

❌ **Salah**:
```go
secret := "my-secret-key"
```

✅ **Benar**:
```go
secret := os.Getenv("JWT_SECRET")
```

**Solusi**: Selalu pakai environment variable untuk secret keys.

---

### 2. **Simpan API Key Plain Text di Database**

❌ **Salah**:
```go
apiKey := &models.APIKey{
    Key: plainKey,
}
```

✅ **Benar**:
```go
apiKey := &models.APIKey{
    Hash: utils.HashAPIKey(plainKey),
}
```

**Solusi**: Simpan hash-nya, bukan plain text. Konsepnya sama kayak password.

---

### 3. **Gak Validate Token Type**

❌ **Salah**:
```go
claims, _ := utils.ValidateToken(token, secret)
// Langsung pakai tanpa check type
```

✅ **Benar**:
```go
claims, _ := utils.ValidateToken(token, secret)
if claims.Type != "access" {
    return errors.New("invalid token type")
}
```

**Solusi**: Refresh token beda fungsinya sama access token, harus di-validate type-nya.

---

### 4. **Gak Implement Refresh Token Rotation**

❌ **Salah**:
```go
// Pakai refresh token berkali-kali tanpa revoke
```

✅ **Benar**:
```go
// Blacklist refresh token lama setiap refresh
s.blacklistToken(ctx, oldRefreshToken)
// Generate token baru
newTokens := s.generateTokens(user)
```

**Solusi**: Refresh token rotation mencegah token yang leaked dipakai berkali-kali.

---

### 5. **Rate Limit Gak Pakai TTL di Redis**

❌ **Salah**:
```go
redis.Incr(ctx, key) // Tanpa TTL, counter gak pernah reset
```

✅ **Benar**:
```go
pipe.Incr(ctx, key)
pipe.Expire(ctx, key, 1*time.Minute) // Set TTL
```

**Solusi**: Rate limit counter harus auto-reset setiap menit.

---

### 6. **OAuth State Gak Di-validate (CSRF Attack)**

❌ **Salah**:
```go
// Terima callback tanpa validate state
```

✅ **Benar** (Production):
```go
// Saat generate URL
state := uuid.New().String()
session.Set("oauth_state", state)

// Saat callback
if c.Query("state") != session.Get("oauth_state") {
    return errors.New("invalid state")
}
```

**Solusi**: Validate state parameter untuk prevent CSRF attack di OAuth flow.

---

### 7. **Bcrypt Cost Factor Terlalu Rendah/Tinggi**

❌ **Salah**:
```go
bcrypt.GenerateFromPassword([]byte(password), 4) // Terlalu rendah, gampang di-crack
bcrypt.GenerateFromPassword([]byte(password), 16) // Terlalu tinggi, user nunggu lama
```

✅ **Benar**:
```go
bcrypt.GenerateFromPassword([]byte(password), 12) // Sweet spot
```

**Solusi**: Cost 12 balance antara security dan performance (~400ms).

---

### 8. **Gak Handle OAuth User Yang Sudah Ada (Email Conflict)**

❌ **Salah**:
```go
// Langsung create user dari Google tanpa check email
```

✅ **Benar**:
```go
// Check by Google ID dulu
user := s.repo.GetUserByGoogleID(ctx, googleID)
if user == nil {
    // Check by email
    user = s.repo.GetUserByEmail(ctx, email)
    if user != nil {
        // Update Google ID
        user.GoogleID = &googleID
    }
}
```

**Solusi**: Handle case kalau user register manual dulu, baru OAuth. Link account-nya.

---

## ✅ Checklist Akhir

Setelah implementation, test semua flow:

### Authentication Testing

**1. Register + Login**
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**2. Access Protected Route**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**3. Refresh Token**
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

**4. Logout**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

---

### OAuth Google Testing

**1. Get OAuth URL**
```bash
curl http://localhost:3000/api/auth/google
```

**2. Open URL di browser, approve Google**

**3. Redirect ke callback akan return tokens**

---

### API Key Testing

**1. Create API Key (butuh JWT)**
```bash
curl -X POST http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key",
    "scope": "read",
    "rate_limit": 100
  }'
```

**2. Use API Key**
```bash
curl http://localhost:3000/api/example/read \
  -H "X-API-Key: sk_live_xxxxxxxxxxxxx"
```

**3. Test Rate Limit**
```bash
# Hit endpoint 100x dalam 1 menit
for i in {1..101}; do
  curl http://localhost:3000/api/example/read -H "X-API-Key: YOUR_KEY"
done
# Request ke-101 harus return 429 Too Many Requests
```

**4. Test Scope**
```bash
# With read scope, ini harus forbidden
curl -X POST http://localhost:3000/api/example/write \
  -H "X-API-Key: YOUR_READ_KEY"
```

---

### Database Check

```bash
# Masuk ke PostgreSQL
psql -U postgres -d go_auth_db

# Check users
SELECT id, email, name, role, google_id IS NOT NULL as has_google FROM users;

# Check API keys (password field harus NULL untuk OAuth user)
SELECT id, user_id, name, scope, rate_limit, is_active FROM api_keys;
```

---

### Redis Check

```bash
# Masuk ke Redis CLI
redis-cli

# Check blacklisted tokens
KEYS blacklist:*

# Check rate limits
KEYS ratelimit:*

# Check TTL
TTL ratelimit:apikey:1
```

---

## 💭 Ide Pengembangan Mandiri

Setelah paham konsep dasar, coba extend dengan fitur berikut:

### 1. **Email Verification**
- Kirim email verification saat register
- User harus verify email dulu sebelum bisa login
- Implement dengan service kayak SendGrid, Resend, atau SMTP

### 2. **Password Reset**
- Forgot password endpoint
- Generate reset token (JWT dengan type "reset")
- Kirim email dengan link reset
- Validate reset token dan update password

### 3. **Two-Factor Authentication (2FA)**
- TOTP dengan library `pquerna/otp`
- Generate QR code buat scan di Google Authenticator
- Validate 6-digit code saat login

### 4. **Session Management**
- Simpan active sessions di Redis
- Force logout dari semua device
- Revoke specific session

### 5. **OAuth Multi Provider**
- GitHub OAuth
- Facebook OAuth
- Twitter OAuth
- Abstract OAuth logic jadi generic

### 6. **API Key Prefix Strategy**
- `pk_test_` = public key for test
- `sk_test_` = secret key for test
- `pk_live_` = public key for production
- `sk_live_` = secret key for production

### 7. **Audit Log**
- Log semua authentication events
- Login attempts (success/failed)
- Token refresh
- API key usage
- Simpan di database atau service kayak Elasticsearch

### 8. **IP Whitelist untuk API Key**
- API key hanya bisa dipakai dari IP tertentu
- Validation di middleware

### 9. **Webhook Signature**
- Generate signature untuk webhook calls
- Client validate signature pakai API key

### 10. **Advanced Rate Limiting**
- Rate limit per endpoint
- Sliding window algorithm
- Different limit untuk different plans/roles

---

## 🎓 Poin Penting yang Harus Diingat

### JWT
- Access token pendek (15 menit)
- Refresh token panjang (7 hari)
- Implement refresh token rotation
- Blacklist refresh token di Redis

### Password
- Hash dengan bcrypt cost 12
- Jangan simpan plain text
- Compare dengan bcrypt.CompareHashAndPassword

### API Key
- Generate dengan crypto/rand
- Simpan hash di database
- Return plain key HANYA saat create
- Implement rate limiting

### OAuth
- Validate state untuk CSRF protection
- Handle account linking (email conflict)
- User OAuth gak punya password (NULL)

### Middleware
- JWT dari Authorization: Bearer <token>
- API Key dari X-API-Key: <key>
- Combined middleware support keduanya
- Inject user data ke c.Locals()

### Security
- Jangan expose internal error ke client
- Validate semua input
- Use HTTPS di production
- Rotate secrets regularly

---

Selamat belajar! Materi ini best practice di industry. Kalau udah paham semua konsep di sini, kamu siap implement authentication di production-grade apps. 🚀

Ada yang mau ditanyakan?
