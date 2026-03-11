# 🧪 Testing di Go: Unit Test + Integration Test

## 🎯 Tujuan Belajar

Setelah belajar ini, lo bisa:
- Nulis unit test dan integration test yang proper di Go
- Pakai testify untuk assertion yang readable
- Bikin table-driven test (pattern favorit Go developer)
- Mock dependency pakai testify/mock
- Test handler HTTP pakai httptest
- Setup database test dengan isolation sempurna
- Mock Redis dan generate fake data
- Measure coverage dan detect race condition
- Bikin benchmark test untuk performance testing

## 💡 Konsep + Analogi

### Testing di Go vs Jest/Vitest (JavaScript)

| Konsep | Jest/Vitest | Go testing |
|--------|-------------|------------|
| Test file | `*.test.ts` | `*_test.go` |
| Test function | `test('nama', () => {})` | `func TestNama(t *testing.T)` |
| Assertion | `expect(x).toBe(y)` | `assert.Equal(t, expected, actual)` |
| Mock | `jest.mock()` | `testify/mock` interface |
| HTTP test | `supertest` | `httptest` + `fiber.Test()` |
| Beforey/After | `beforeEach`, `afterEach` | `suite.SetupTest()`, `suite.TearDownTest()` |
| Coverage | `--coverage` | `-coverprofile` |
| Describe/it | `describe()`, `it()` | `t.Run()` subtests |

**Analogi sederhana:**
- **Unit test** = Test komponen React secara terpisah (mock props, mock hooks)
- **Integration test** = Test flow lengkap (klik button → call API → update state)
- **Mock** = Kayak mock fetch di frontend, tapi di backend kita mock database/service
- **Table-driven test** = Kayak lo test component dengan banyak props variation sekaligus

**Filosofi Testing di Go:**
1. **Test file sejajar dengan kode** → `user.go` + `user_test.go` di folder yang sama
2. **Interface memudahkan mock** → Dependency injection via interface
3. **Table-driven preferred** → 1 function test banyak case sekaligus
4. **Explicit better than magic** → Setup jelas, no hidden behavior

## 📝 Materi + Kode Lengkap

### 1. Setup Project Testing

```bash
# Install dependencies
go get -u github.com/stretchr/testify
go get -u github.com/brianvoe/gofakeit/v7
go get -u github.com/go-redis/redismock/v9
```

### 2. Struktur Folder Testing

```
project/
├── internal/
│   ├── user/
│   │   ├── entity.go
│   │   ├── repository.go
│   │   ├── repository_test.go
│   │   ├── service.go
│   │   ├── service_test.go
│   │   ├── handler.go
│   │   └── handler_test.go
│   └── auth/
│       ├── service.go
│       └── service_test.go
├── pkg/
│   └── testutil/
│       ├── database.go       # Helper setup DB test
│       ├── faker.go          # Helper generate fake data
│       └── http.go           # Helper test HTTP
├── mocks/                    # Generated mocks
│   ├── user_repository.go
│   └── user_service.go
└── go.mod
```

### 3. Go Testing Package Dasar

```go
// internal/user/entity.go
package user

import "time"

type User struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateUserRequest struct {
	Name     string `json:"name" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}
```

```go
// internal/user/validator.go
package user

import (
	"errors"
	"regexp"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

func ValidateEmail(email string) error {
	if email == "" {
		return errors.New("email is required")
	}
	if !emailRegex.MatchString(email) {
		return errors.New("email format is invalid")
	}
	return nil
}

func ValidatePassword(password string) error {
	if password == "" {
		return errors.New("password is required")
	}
	if len(password) < 6 {
		return errors.New("password must be at least 6 characters")
	}
	return nil
}
```

```go
// internal/user/validator_test.go
package user

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// Test paling basic pakai testing.T
func TestValidateEmail(t *testing.T) {
	// Test valid email
	err := ValidateEmail("user@example.com")
	if err != nil {
		t.Errorf("Expected no error, got: %v", err)
	}

	// Test invalid email
	err = ValidateEmail("invalid-email")
	if err == nil {
		t.Error("Expected error, got nil")
	}
}

// Test pakai testify/assert (lebih readable)
func TestValidateEmailWithAssert(t *testing.T) {
	err := ValidateEmail("user@example.com")
	assert.NoError(t, err)

	err = ValidateEmail("invalid-email")
	assert.Error(t, err)
	assert.Equal(t, "email format is invalid", err.Error())
}

// Table-driven test (PATTERN FAVORIT DI GO!)
func TestValidateEmailTableDriven(t *testing.T) {
	// Definisikan test cases dalam slice of struct
	testCases := []struct {
		name        string
		email       string
		expectError bool
		errorMsg    string
	}{
		{
			name:        "valid email",
			email:       "user@example.com",
			expectError: false,
		},
		{
			name:        "valid email with subdomain",
			email:       "user@mail.example.com",
			expectError: false,
		},
		{
			name:        "empty email",
			email:       "",
			expectError: true,
			errorMsg:    "email is required",
		},
		{
			name:        "email without @",
			email:       "userexample.com",
			expectError: true,
			errorMsg:    "email format is invalid",
		},
		{
			name:        "email without domain",
			email:       "user@",
			expectError: true,
			errorMsg:    "email format is invalid",
		},
		{
			name:        "email without extension",
			email:       "user@example",
			expectError: true,
			errorMsg:    "email format is invalid",
		},
	}

	// Loop setiap test case
	for _, tc := range testCases {
		// t.Run() bikin subtest (mirip describe/it di Jest)
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateEmail(tc.email)

			if tc.expectError {
				assert.Error(t, err)
				assert.Equal(t, tc.errorMsg, err.Error())
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Test dengan t.Helper() - mark function sebagai helper
func TestValidatePassword(t *testing.T) {
	// Helper function untuk reduce duplication
	assertValidPassword := func(t *testing.T, password string) {
		t.Helper() // Kalau test fail, error line akan point ke caller, bukan line ini
		err := ValidatePassword(password)
		assert.NoError(t, err)
	}

	assertInvalidPassword := func(t *testing.T, password, expectedMsg string) {
		t.Helper()
		err := ValidatePassword(password)
		assert.Error(t, err)
		assert.Equal(t, expectedMsg, err.Error())
	}

	t.Run("valid passwords", func(t *testing.T) {
		assertValidPassword(t, "password123")
		assertValidPassword(t, "aB3!@#$%^&*()")
		assertValidPassword(t, "123456")
	})

	t.Run("invalid passwords", func(t *testing.T) {
		assertInvalidPassword(t, "", "password is required")
		assertInvalidPassword(t, "12345", "password must be at least 6 characters")
		assertInvalidPassword(t, "abc", "password must be at least 6 characters")
	})
}
```

### 4. Mock dengan testify/mock

```go
// internal/user/repository.go
package user

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// Interface untuk memudahkan mock
type Repository interface {
	Create(ctx context.Context, user *User) error
	FindByID(ctx context.Context, id uint) (*User, error)
	FindByEmail(ctx context.Context, email string) (*User, error)
	Update(ctx context.Context, user *User) error
	Delete(ctx context.Context, id uint) error
	List(ctx context.Context, limit, offset int) ([]User, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, user *User) error {
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
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
	user.UpdatedAt = time.Now()
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&User{}, id).Error
}

func (r *repository) List(ctx context.Context, limit, offset int) ([]User, error) {
	var users []User
	err := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&users).Error
	return users, err
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
	Register(ctx context.Context, req CreateUserRequest) (*User, error)
	GetByID(ctx context.Context, id uint) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	UpdateProfile(ctx context.Context, id uint, name string) (*User, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) Register(ctx context.Context, req CreateUserRequest) (*User, error) {
	// Validate
	if err := ValidateEmail(req.Email); err != nil {
		return nil, err
	}
	if err := ValidatePassword(req.Password); err != nil {
		return nil, err
	}

	// Check email exists
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

func (s *service) GetByEmail(ctx context.Context, email string) (*User, error) {
	return s.repo.FindByEmail(ctx, email)
}

func (s *service) UpdateProfile(ctx context.Context, id uint, name string) (*User, error) {
	user, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, errors.New("user not found")
	}

	user.Name = name
	if err := s.repo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}
```

```go
// mocks/user_repository.go
// File ini bisa di-generate otomatis, tapi kita bikin manual biar paham dulu
package mocks

import (
	"context"

	"github.com/stretchr/testify/mock"
	"your-project/internal/user"
)

// MockUserRepository adalah mock dari user.Repository
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(ctx context.Context, u *user.User) error {
	args := m.Called(ctx, u)
	return args.Error(0)
}

func (m *MockUserRepository) FindByID(ctx context.Context, id uint) (*user.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *MockUserRepository) FindByEmail(ctx context.Context, email string) (*user.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *MockUserRepository) Update(ctx context.Context, u *user.User) error {
	args := m.Called(ctx, u)
	return args.Error(0)
}

func (m *MockUserRepository) Delete(ctx context.Context, id uint) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockUserRepository) List(ctx context.Context, limit, offset int) ([]user.User, error) {
	args := m.Called(ctx, limit, offset)
	return args.Get(0).([]user.User), args.Error(1)
}
```

```go
// internal/user/service_test.go
package user

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"your-project/mocks"
)

func TestServiceRegister(t *testing.T) {
	t.Run("success register new user", func(t *testing.T) {
		// Setup mock repository
		mockRepo := new(mocks.MockUserRepository)
		service := NewService(mockRepo)

		ctx := context.Background()
		req := CreateUserRequest{
			Name:     "John Doe",
			Email:    "john@example.com",
			Password: "password123",
		}

		// Setup expectations (mirip jest.fn().mockReturnValue())
		// FindByEmail harus return nil (user belum ada)
		mockRepo.On("FindByEmail", ctx, req.Email).Return(nil, errors.New("not found"))

		// Create harus dipanggil dengan parameter yang sesuai
		// mock.MatchedBy() untuk match parameter yang kompleks
		mockRepo.On("Create", ctx, mock.MatchedBy(func(u *User) bool {
			return u.Name == req.Name && u.Email == req.Email
		})).Return(nil)

		// Execute
		user, err := service.Register(ctx, req)

		// Assert
		assert.NoError(t, err)
		assert.NotNil(t, user)
		assert.Equal(t, req.Name, user.Name)
		assert.Equal(t, req.Email, user.Email)
		assert.NotEmpty(t, user.Password) // Password harus ter-hash
		assert.NotEqual(t, req.Password, user.Password) // Password tidak boleh sama dengan input

		// Assert bahwa semua expectation terpenuhi
		mockRepo.AssertExpectations(t)
	})

	t.Run("fail - email already exists", func(t *testing.T) {
		mockRepo := new(mocks.MockUserRepository)
		service := NewService(mockRepo)

		ctx := context.Background()
		req := CreateUserRequest{
			Name:     "John Doe",
			Email:    "existing@example.com",
			Password: "password123",
		}

		// FindByEmail return existing user
		existingUser := &User{
			ID:    1,
			Email: req.Email,
		}
		mockRepo.On("FindByEmail", ctx, req.Email).Return(existingUser, nil)

		// Execute
		user, err := service.Register(ctx, req)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, "email already exists", err.Error())

		mockRepo.AssertExpectations(t)
	})

	t.Run("fail - invalid email", func(t *testing.T) {
		mockRepo := new(mocks.MockUserRepository)
		service := NewService(mockRepo)

		ctx := context.Background()
		req := CreateUserRequest{
			Name:     "John Doe",
			Email:    "invalid-email",
			Password: "password123",
		}

		// Execute
		user, err := service.Register(ctx, req)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, "email format is invalid", err.Error())

		// Mock tidak dipanggil karena validasi fail duluan
		mockRepo.AssertNotCalled(t, "FindByEmail")
		mockRepo.AssertNotCalled(t, "Create")
	})

	t.Run("fail - password too short", func(t *testing.T) {
		mockRepo := new(mocks.MockUserRepository)
		service := NewService(mockRepo)

		ctx := context.Background()
		req := CreateUserRequest{
			Name:     "John Doe",
			Email:    "john@example.com",
			Password: "12345", // < 6 characters
		}

		// Execute
		user, err := service.Register(ctx, req)

		// Assert
		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, "password must be at least 6 characters", err.Error())
	})
}

func TestServiceGetByID(t *testing.T) {
	mockRepo := new(mocks.MockUserRepository)
	service := NewService(mockRepo)

	ctx := context.Background()
	userID := uint(1)

	expectedUser := &User{
		ID:    userID,
		Name:  "John Doe",
		Email: "john@example.com",
	}

	mockRepo.On("FindByID", ctx, userID).Return(expectedUser, nil)

	// Execute
	user, err := service.GetByID(ctx, userID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, expectedUser, user)
	mockRepo.AssertExpectations(t)
}

func TestServiceUpdateProfile(t *testing.T) {
	t.Run("success update profile", func(t *testing.T) {
		mockRepo := new(mocks.MockUserRepository)
		service := NewService(mockRepo)

		ctx := context.Background()
		userID := uint(1)
		newName := "Jane Doe"

		existingUser := &User{
			ID:    userID,
			Name:  "John Doe",
			Email: "john@example.com",
		}

		mockRepo.On("FindByID", ctx, userID).Return(existingUser, nil)
		mockRepo.On("Update", ctx, mock.MatchedBy(func(u *User) bool {
			return u.ID == userID && u.Name == newName
		})).Return(nil)

		// Execute
		user, err := service.UpdateProfile(ctx, userID, newName)

		// Assert
		assert.NoError(t, err)
		assert.Equal(t, newName, user.Name)
		mockRepo.AssertExpectations(t)
	})

	t.Run("fail - user not found", func(t *testing.T) {
		mockRepo := new(mocks.MockUserRepository)
		service := NewService(mockRepo)

		ctx := context.Background()
		userID := uint(999)

		mockRepo.On("FindByID", ctx, userID).Return(nil, errors.New("not found"))

		// Execute
		user, err := service.UpdateProfile(ctx, userID, "New Name")

		// Assert
		assert.Error(t, err)
		assert.Nil(t, user)
		assert.Equal(t, "user not found", err.Error())
	})
}
```

### 5. Test Suite dengan Setup/Teardown

```go
// internal/user/handler.go
package user

import (
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Register(c *fiber.Ctx) error {
	var req CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	user, err := h.service.Register(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "User created successfully",
		"data":    user,
	})
}

func (h *Handler) GetProfile(c *fiber.Ctx) error {
	// Ambil user ID dari context (dari middleware auth)
	userID := c.Locals("user_id").(uint)

	user, err := h.service.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	return c.JSON(fiber.Map{
		"data": user,
	})
}
```

```go
// internal/user/handler_test.go
package user

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"
	"your-project/mocks"
)

// Test Suite (mirip describe di Jest)
type HandlerTestSuite struct {
	suite.Suite
	app         *fiber.App
	mockService *mocks.MockUserService
	handler     *Handler
}

// SetupSuite dipanggil sekali sebelum semua test di suite ini
func (s *HandlerTestSuite) SetupSuite() {
	// Setup yang heavy bisa di sini (misal: koneksi DB)
}

// SetupTest dipanggil sebelum SETIAP test (mirip beforeEach)
func (s *HandlerTestSuite) SetupTest() {
	// Reset mock setiap test
	s.mockService = new(mocks.MockUserService)
	s.handler = NewHandler(s.mockService)

	// Setup fiber app baru setiap test
	s.app = fiber.New()
	s.app.Post("/register", s.handler.Register)
	s.app.Get("/profile", func(c *fiber.Ctx) error {
		// Mock middleware auth
		c.Locals("user_id", uint(1))
		return c.Next()
	}, s.handler.GetProfile)
}

// TearDownTest dipanggil setelah setiap test (mirip afterEach)
func (s *HandlerTestSuite) TearDownTest() {
	// Cleanup
	s.mockService = nil
	s.handler = nil
}

// TearDownSuite dipanggil sekali setelah semua test
func (s *HandlerTestSuite) TearDownSuite() {
	// Cleanup resources
}

func (s *HandlerTestSuite) TestRegisterSuccess() {
	req := CreateUserRequest{
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "password123",
	}

	expectedUser := &User{
		ID:    1,
		Name:  req.Name,
		Email: req.Email,
	}

	s.mockService.On("Register", mock.Anything, req).Return(expectedUser, nil)

	// Prepare request
	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequest("POST", "/register", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	// Execute
	resp, err := s.app.Test(httpReq)

	// Assert
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusCreated, resp.StatusCode)

	// Parse response body
	var responseBody map[string]interface{}
	bodyBytes, _ := io.ReadAll(resp.Body)
	json.Unmarshal(bodyBytes, &responseBody)

	assert.Equal(s.T(), "User created successfully", responseBody["message"])
	assert.NotNil(s.T(), responseBody["data"])

	s.mockService.AssertExpectations(s.T())
}

func (s *HandlerTestSuite) TestRegisterFail_InvalidEmail() {
	req := CreateUserRequest{
		Name:     "John Doe",
		Email:    "invalid-email",
		Password: "password123",
	}

	s.mockService.On("Register", mock.Anything, req).Return(nil, errors.New("email format is invalid"))

	body, _ := json.Marshal(req)
	httpReq, _ := http.NewRequest("POST", "/register", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.app.Test(httpReq)

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusBadRequest, resp.StatusCode)

	var responseBody map[string]interface{}
	bodyBytes, _ := io.ReadAll(resp.Body)
	json.Unmarshal(bodyBytes, &responseBody)

	assert.Equal(s.T(), "email format is invalid", responseBody["error"])
}

func (s *HandlerTestSuite) TestGetProfile() {
	expectedUser := &User{
		ID:    1,
		Name:  "John Doe",
		Email: "john@example.com",
	}

	s.mockService.On("GetByID", mock.Anything, uint(1)).Return(expectedUser, nil)

	httpReq, _ := http.NewRequest("GET", "/profile", nil)
	resp, err := s.app.Test(httpReq)

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusOK, resp.StatusCode)

	var responseBody map[string]interface{}
	bodyBytes, _ := io.ReadAll(resp.Body)
	json.Unmarshal(bodyBytes, &responseBody)

	data := responseBody["data"].(map[string]interface{})
	assert.Equal(s.T(), expectedUser.Name, data["name"])
	assert.Equal(s.T(), expectedUser.Email, data["email"])
}

// Jalankan test suite
func TestHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(HandlerTestSuite))
}
```

```go
// mocks/user_service.go
package mocks

import (
	"context"

	"github.com/stretchr/testify/mock"
	"your-project/internal/user"
)

type MockUserService struct {
	mock.Mock
}

func (m *MockUserService) Register(ctx context.Context, req user.CreateUserRequest) (*user.User, error) {
	args := m.Called(ctx, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *MockUserService) GetByID(ctx context.Context, id uint) (*user.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *MockUserService) GetByEmail(ctx context.Context, email string) (*user.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}

func (m *MockUserService) UpdateProfile(ctx context.Context, id uint, name string) (*user.User, error) {
	args := m.Called(ctx, id, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*user.User), args.Error(1)
}
```

### 6. Test Database dengan Setup/Teardown

```go
// pkg/testutil/database.go
package testutil

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type TestDatabase struct {
	DB *gorm.DB
}

func SetupTestDB() *TestDatabase {
	// Database test terpisah dari production!
	dsn := "host=localhost user=postgres password=postgres dbname=test_db port=5432 sslmode=disable"

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), // Matikan log saat test
	})
	if err != nil {
		log.Fatalf("Failed to connect to test database: %v", err)
	}

	return &TestDatabase{DB: db}
}

func (td *TestDatabase) TearDown() {
	sqlDB, _ := td.DB.DB()
	sqlDB.Close()
}

// Truncate all tables (clean data setelah test)
func (td *TestDatabase) TruncateTable(tableName string) {
	td.DB.Exec(fmt.Sprintf("TRUNCATE TABLE %s RESTART IDENTITY CASCADE", tableName))
}

// BeginTransaction untuk isolation sempurna
func (td *TestDatabase) BeginTransaction() *gorm.DB {
	return td.DB.Begin()
}
```

```go
// internal/user/repository_test.go
package user

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
	"your-project/pkg/testutil"
)

type RepositoryTestSuite struct {
	suite.Suite
	testDB *testutil.TestDatabase
	repo   Repository
	tx     *gorm.DB // Transaction untuk isolasi
}

func (s *RepositoryTestSuite) SetupSuite() {
	// Setup database sekali untuk semua test
	s.testDB = testutil.SetupTestDB()

	// Migrate schema
	s.testDB.DB.AutoMigrate(&User{})
}

func (s *RepositoryTestSuite) SetupTest() {
	// Begin transaction sebelum setiap test
	s.tx = s.testDB.BeginTransaction()
	s.repo = NewRepository(s.tx)
}

func (s *RepositoryTestSuite) TearDownTest() {
	// Rollback transaction setelah setiap test
	// Ini bikin data test tidak tersimpan ke DB (isolation sempurna!)
	s.tx.Rollback()
}

func (s *RepositoryTestSuite) TearDownSuite() {
	// Cleanup database
	s.testDB.TearDown()
}

func (s *RepositoryTestSuite) TestCreate() {
	ctx := context.Background()
	user := &User{
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "hashed_password",
	}

	err := s.repo.Create(ctx, user)

	assert.NoError(s.T(), err)
	assert.NotZero(s.T(), user.ID) // ID ter-generate
	assert.NotZero(s.T(), user.CreatedAt)
	assert.NotZero(s.T(), user.UpdatedAt)
}

func (s *RepositoryTestSuite) TestFindByID() {
	ctx := context.Background()

	// Create test data
	user := &User{
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "hashed_password",
	}
	s.repo.Create(ctx, user)

	// Test
	found, err := s.repo.FindByID(ctx, user.ID)

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), user.ID, found.ID)
	assert.Equal(s.T(), user.Email, found.Email)
}

func (s *RepositoryTestSuite) TestFindByEmail() {
	ctx := context.Background()

	user := &User{
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "hashed_password",
	}
	s.repo.Create(ctx, user)

	found, err := s.repo.FindByEmail(ctx, "john@example.com")

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), user.ID, found.ID)
	assert.Equal(s.T(), user.Email, found.Email)
}

func (s *RepositoryTestSuite) TestUpdate() {
	ctx := context.Background()

	user := &User{
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "hashed_password",
	}
	s.repo.Create(ctx, user)

	// Update
	user.Name = "Jane Doe"
	err := s.repo.Update(ctx, user)

	assert.NoError(s.T(), err)

	// Verify
	updated, _ := s.repo.FindByID(ctx, user.ID)
	assert.Equal(s.T(), "Jane Doe", updated.Name)
}

func (s *RepositoryTestSuite) TestDelete() {
	ctx := context.Background()

	user := &User{
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "hashed_password",
	}
	s.repo.Create(ctx, user)

	err := s.repo.Delete(ctx, user.ID)
	assert.NoError(s.T(), err)

	// Verify
	_, err = s.repo.FindByID(ctx, user.ID)
	assert.Error(s.T(), err) // Should be not found
}

func (s *RepositoryTestSuite) TestList() {
	ctx := context.Background()

	// Create multiple users
	users := []User{
		{Name: "User 1", Email: "user1@example.com", Password: "pass"},
		{Name: "User 2", Email: "user2@example.com", Password: "pass"},
		{Name: "User 3", Email: "user3@example.com", Password: "pass"},
	}

	for i := range users {
		s.repo.Create(ctx, &users[i])
	}

	// Test pagination
	result, err := s.repo.List(ctx, 2, 0) // limit 2, offset 0

	assert.NoError(s.T(), err)
	assert.Len(s.T(), result, 2)
}

func TestRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(RepositoryTestSuite))
}
```

### 7. Integration Test untuk Auth Flow

```go
// internal/auth/service.go
package auth

import (
	"context"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"
	"your-project/internal/user"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string     `json:"token"`
	User  *user.User `json:"user"`
}

type Service interface {
	Login(ctx context.Context, req LoginRequest) (*LoginResponse, error)
	VerifyToken(token string) (uint, error)
}

type service struct {
	userRepo user.Repository
}

func NewService(userRepo user.Repository) Service {
	return &service{userRepo: userRepo}
}

func (s *service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	// Find user by email
	u, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Generate token (simplified, gunakan JWT di production)
	token := generateToken(u.ID)

	return &LoginResponse{
		Token: token,
		User:  u,
	}, nil
}

func (s *service) VerifyToken(token string) (uint, error) {
	// Simplified token verification
	// Di production, gunakan JWT library
	if token == "" {
		return 0, errors.New("invalid token")
	}
	return 1, nil // Return user ID
}

func generateToken(userID uint) string {
	// Simplified token generation
	return "token_" + string(rune(userID)) + "_" + time.Now().Format("20060102150405")
}
```

```go
// internal/auth/handler.go
package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	authService Service
}

func NewHandler(authService Service) *Handler {
	return &Handler{authService: authService}
}

func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	resp, err := h.authService.Login(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Login successful",
		"data":    resp,
	})
}

// Middleware untuk protect routes
func (h *Handler) AuthMiddleware(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing authorization header",
		})
	}

	// Format: "Bearer <token>"
	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid authorization header",
		})
	}

	token := parts[1]
	userID, err := h.authService.VerifyToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid token",
		})
	}

	// Set user ID to context
	c.Locals("user_id", userID)
	return c.Next()
}
```

```go
// internal/auth/integration_test.go
package auth

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"golang.org/x/crypto/bcrypt"
	"your-project/internal/user"
	"your-project/pkg/testutil"
)

type AuthIntegrationTestSuite struct {
	suite.Suite
	testDB      *testutil.TestDatabase
	app         *fiber.App
	userRepo    user.Repository
	authService Service
	authHandler *Handler
	userHandler *user.Handler
}

func (s *AuthIntegrationTestSuite) SetupSuite() {
	// Setup test database
	s.testDB = testutil.SetupTestDB()
	s.testDB.DB.AutoMigrate(&user.User{})
}

func (s *AuthIntegrationTestSuite) SetupTest() {
	// Begin transaction
	tx := s.testDB.BeginTransaction()

	// Setup dependencies
	s.userRepo = user.NewRepository(tx)
	userService := user.NewService(s.userRepo)
	s.authService = NewService(s.userRepo)

	s.authHandler = NewHandler(s.authService)
	s.userHandler = user.NewHandler(userService)

	// Setup routes
	s.app = fiber.New()
	s.app.Post("/auth/register", s.userHandler.Register)
	s.app.Post("/auth/login", s.authHandler.Login)
	s.app.Get("/profile", s.authHandler.AuthMiddleware, s.userHandler.GetProfile)
}

func (s *AuthIntegrationTestSuite) TearDownTest() {
	// Rollback transaction
	sqlDB, _ := s.testDB.DB.DB()
	sqlDB.Exec("ROLLBACK")
}

func (s *AuthIntegrationTestSuite) TearDownSuite() {
	s.testDB.TearDown()
}

func (s *AuthIntegrationTestSuite) TestCompleteAuthFlow() {
	// Step 1: Register
	registerReq := user.CreateUserRequest{
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "password123",
	}

	body, _ := json.Marshal(registerReq)
	httpReq, _ := http.NewRequest("POST", "/auth/register", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.app.Test(httpReq)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusCreated, resp.StatusCode)

	// Step 2: Login
	loginReq := LoginRequest{
		Email:    "john@example.com",
		Password: "password123",
	}

	body, _ = json.Marshal(loginReq)
	httpReq, _ = http.NewRequest("POST", "/auth/login", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err = s.app.Test(httpReq)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusOK, resp.StatusCode)

	// Parse login response
	var loginResp map[string]interface{}
	bodyBytes, _ := io.ReadAll(resp.Body)
	json.Unmarshal(bodyBytes, &loginResp)

	data := loginResp["data"].(map[string]interface{})
	token := data["token"].(string)
	assert.NotEmpty(s.T(), token)

	// Step 3: Access protected route with token
	httpReq, _ = http.NewRequest("GET", "/profile", nil)
	httpReq.Header.Set("Authorization", "Bearer "+token)

	resp, err = s.app.Test(httpReq)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusOK, resp.StatusCode)

	var profileResp map[string]interface{}
	bodyBytes, _ = io.ReadAll(resp.Body)
	json.Unmarshal(bodyBytes, &profileResp)

	profileData := profileResp["data"].(map[string]interface{})
	assert.Equal(s.T(), "John Doe", profileData["name"])
	assert.Equal(s.T(), "john@example.com", profileData["email"])
}

func (s *AuthIntegrationTestSuite) TestLoginWithInvalidCredentials() {
	// Create user dulu
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	s.userRepo.Create(s.app.UserContext(), &user.User{
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: string(hashedPassword),
	})

	// Test login dengan password salah
	loginReq := LoginRequest{
		Email:    "john@example.com",
		Password: "wrongpassword",
	}

	body, _ := json.Marshal(loginReq)
	httpReq, _ := http.NewRequest("POST", "/auth/login", bytes.NewReader(body))
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.app.Test(httpReq)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusUnauthorized, resp.StatusCode)
}

func (s *AuthIntegrationTestSuite) TestAccessProtectedRouteWithoutToken() {
	httpReq, _ := http.NewRequest("GET", "/profile", nil)

	resp, err := s.app.Test(httpReq)
	assert.NoError(s.T(), err)
	assert.Equal(s.T(), fiber.StatusUnauthorized, resp.StatusCode)
}

func TestAuthIntegrationTestSuite(t *testing.T) {
	suite.Run(t, new(AuthIntegrationTestSuite))
}
```

### 8. Mock Redis dengan redismock

```go
// internal/session/service.go
package session

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type Service interface {
	Set(ctx context.Context, key, value string, expiration time.Duration) error
	Get(ctx context.Context, key string) (string, error)
	Delete(ctx context.Context, key string) error
}

type service struct {
	redis *redis.Client
}

func NewService(redis *redis.Client) Service {
	return &service{redis: redis}
}

func (s *service) Set(ctx context.Context, key, value string, expiration time.Duration) error {
	return s.redis.Set(ctx, key, value, expiration).Err()
}

func (s *service) Get(ctx context.Context, key string) (string, error) {
	return s.redis.Get(ctx, key).Result()
}

func (s *service) Delete(ctx context.Context, key string) error {
	return s.redis.Del(ctx, key).Err()
}
```

```go
// internal/session/service_test.go
package session

import (
	"context"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/go-redis/redismock/v9"
	"github.com/stretchr/testify/assert"
)

func TestSessionSet(t *testing.T) {
	// Create mock Redis client
	db, mock := redismock.NewClientMock()
	service := NewService(db)

	ctx := context.Background()
	key := "session:user:1"
	value := "token_12345"
	expiration := 1 * time.Hour

	// Setup expectation
	mock.ExpectSet(key, value, expiration).SetVal("OK")

	// Execute
	err := service.Set(ctx, key, value, expiration)

	// Assert
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSessionGet(t *testing.T) {
	db, mock := redismock.NewClientMock()
	service := NewService(db)

	ctx := context.Background()
	key := "session:user:1"
	expectedValue := "token_12345"

	mock.ExpectGet(key).SetVal(expectedValue)

	value, err := service.Get(ctx, key)

	assert.NoError(t, err)
	assert.Equal(t, expectedValue, value)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSessionGetNotFound(t *testing.T) {
	db, mock := redismock.NewClientMock()
	service := NewService(db)

	ctx := context.Background()
	key := "session:user:999"

	mock.ExpectGet(key).RedisNil()

	value, err := service.Get(ctx, key)

	assert.Error(t, err)
	assert.Equal(t, redis.Nil, err)
	assert.Empty(t, value)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestSessionDelete(t *testing.T) {
	db, mock := redismock.NewClientMock()
	service := NewService(db)

	ctx := context.Background()
	key := "session:user:1"

	mock.ExpectDel(key).SetVal(1) // 1 key deleted

	err := service.Delete(ctx, key)

	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}
```

### 9. Faker Data dengan gofakeit

```go
// pkg/testutil/faker.go
package testutil

import (
	"time"

	"github.com/brianvoe/gofakeit/v7"
	"your-project/internal/user"
)

func FakeUser() *user.User {
	return &user.User{
		ID:        uint(gofakeit.Number(1, 1000)),
		Name:      gofakeit.Name(),
		Email:     gofakeit.Email(),
		Password:  gofakeit.Password(true, true, true, false, false, 10),
		CreatedAt: gofakeit.DateRange(time.Now().AddDate(-1, 0, 0), time.Now()),
		UpdatedAt: time.Now(),
	}
}

func FakeUsers(count int) []user.User {
	users := make([]user.User, count)
	for i := 0; i < count; i++ {
		users[i] = *FakeUser()
	}
	return users
}

func FakeCreateUserRequest() user.CreateUserRequest {
	return user.CreateUserRequest{
		Name:     gofakeit.Name(),
		Email:    gofakeit.Email(),
		Password: gofakeit.Password(true, true, true, false, false, 10),
	}
}
```

```go
// internal/user/faker_test.go
package user

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"your-project/pkg/testutil"
)

func TestFakerIntegration(t *testing.T) {
	t.Run("generate fake user", func(t *testing.T) {
		user := testutil.FakeUser()

		assert.NotZero(t, user.ID)
		assert.NotEmpty(t, user.Name)
		assert.NotEmpty(t, user.Email)
		assert.NotEmpty(t, user.Password)
		assert.NotZero(t, user.CreatedAt)
	})

	t.Run("generate multiple fake users", func(t *testing.T) {
		users := testutil.FakeUsers(5)

		assert.Len(t, users, 5)

		// Pastikan setiap user punya data unique
		emailMap := make(map[string]bool)
		for _, u := range users {
			assert.NotEmpty(t, u.Email)
			emailMap[u.Email] = true
		}
		assert.Len(t, emailMap, 5) // Semua email unique
	})

	t.Run("use fake data in repository test", func(t *testing.T) {
		// Ini contoh pakai faker di test yang sesungguhnya
		// Setup mock atau test DB dulu
		mockRepo := new(mocks.MockUserRepository)
		service := NewService(mockRepo)

		fakeReq := testutil.FakeCreateUserRequest()
		fakeUser := testutil.FakeUser()

		mockRepo.On("FindByEmail", mock.Anything, fakeReq.Email).Return(nil, errors.New("not found"))
		mockRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

		user, err := service.Register(context.Background(), fakeReq)

		assert.NoError(t, err)
		assert.NotNil(t, user)
	})
}
```

### 10. Test Helper Functions

```go
// pkg/testutil/http.go
package testutil

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

// MakeRequest helper untuk bikin HTTP request
func MakeRequest(method, url string, body interface{}) (*http.Request, error) {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, err
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return req, nil
}

// MakeAuthRequest helper untuk request dengan auth header
func MakeAuthRequest(method, url, token string, body interface{}) (*http.Request, error) {
	req, err := MakeRequest(method, url, body)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	return req, nil
}

// ParseResponse helper untuk parse JSON response
func ParseResponse(t *testing.T, resp *http.Response, target interface{}) {
	bodyBytes, err := io.ReadAll(resp.Body)
	assert.NoError(t, err)

	err = json.Unmarshal(bodyBytes, target)
	assert.NoError(t, err)
}

// AssertJSONResponse helper untuk assert response JSON
func AssertJSONResponse(t *testing.T, resp *http.Response, expectedStatus int, expectedBody map[string]interface{}) {
	assert.Equal(t, expectedStatus, resp.StatusCode)

	var actualBody map[string]interface{}
	ParseResponse(t, resp, &actualBody)

	for key, expectedValue := range expectedBody {
		assert.Equal(t, expectedValue, actualBody[key])
	}
}

// TestApp helper untuk bikin fiber app untuk testing
func TestApp(routes func(*fiber.App)) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	routes(app)
	return app
}
```

```go
// pkg/testutil/http_test.go
package testutil

import (
	"net/http"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func TestMakeRequest(t *testing.T) {
	body := map[string]string{
		"name":  "John Doe",
		"email": "john@example.com",
	}

	req, err := MakeRequest("POST", "/users", body)

	assert.NoError(t, err)
	assert.Equal(t, "POST", req.Method)
	assert.Equal(t, "/users", req.URL.Path)
	assert.Equal(t, "application/json", req.Header.Get("Content-Type"))
}

func TestMakeAuthRequest(t *testing.T) {
	token := "test_token_123"
	req, err := MakeAuthRequest("GET", "/profile", token, nil)

	assert.NoError(t, err)
	assert.Equal(t, "Bearer test_token_123", req.Header.Get("Authorization"))
}

func TestTestApp(t *testing.T) {
	app := TestApp(func(app *fiber.App) {
		app.Get("/test", func(c *fiber.Ctx) error {
			return c.JSON(fiber.Map{"message": "test"})
		})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)

	assert.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, resp.StatusCode)
}
```

### 11. Coverage & Race Detection

```bash
# Running tests
go test ./...                                    # Test semua package
go test ./internal/user/...                      # Test specific package
go test -v ./...                                 # Verbose output
go test -run TestRegister ./internal/user/...    # Test specific function

# Test coverage
go test ./... -coverprofile=coverage.out         # Generate coverage report
go tool cover -html=coverage.out                 # View di browser
go tool cover -func=coverage.out                 # View di terminal

# Race detection (detect race condition)
go test -race ./...                              # Jalankan dengan race detector

# Benchmark
go test -bench=. ./...                           # Run all benchmarks
go test -bench=BenchmarkRegister ./internal/user/... # Run specific benchmark

# Test dengan timeout
go test -timeout 30s ./...                       # Set timeout 30 detik

# Kombinasi flags
go test -v -race -coverprofile=coverage.out ./...
```

### 12. Benchmark Test

```go
// internal/user/benchmark_test.go
package user

import (
	"context"
	"testing"

	"your-project/mocks"
	"github.com/stretchr/testify/mock"
)

// Benchmark test untuk measure performance
func BenchmarkServiceRegister(b *testing.B) {
	mockRepo := new(mocks.MockUserRepository)
	service := NewService(mockRepo)

	ctx := context.Background()
	req := CreateUserRequest{
		Name:     "John Doe",
		Email:    "john@example.com",
		Password: "password123",
	}

	mockRepo.On("FindByEmail", ctx, req.Email).Return(nil, errors.New("not found"))
	mockRepo.On("Create", ctx, mock.Anything).Return(nil)

	// b.ResetTimer() untuk reset timer setelah setup
	b.ResetTimer()

	// Loop sebanyak b.N kali (ditentukan otomatis oleh Go)
	for i := 0; i < b.N; i++ {
		service.Register(ctx, req)
	}
}

// Benchmark dengan sub-benchmarks
func BenchmarkValidateEmail(b *testing.B) {
	testCases := []struct {
		name  string
		email string
	}{
		{"valid email", "user@example.com"},
		{"long email", "very.long.email.address.with.many.dots@subdomain.example.com"},
		{"invalid email", "invalid-email"},
	}

	for _, tc := range testCases {
		b.Run(tc.name, func(b *testing.B) {
			for i := 0; i < b.N; i++ {
				ValidateEmail(tc.email)
			}
		})
	}
}

// Benchmark dengan paralel test
func BenchmarkValidateEmailParallel(b *testing.B) {
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			ValidateEmail("user@example.com")
		}
	})
}
```

### 13. Makefile untuk Running Tests

```makefile
# Makefile
.PHONY: test test-unit test-integration test-coverage test-race test-bench

# Test all
test:
	go test -v ./...

# Test unit saja (exclude integration test)
test-unit:
	go test -v -short ./...

# Test integration saja
test-integration:
	go test -v -run Integration ./...

# Test dengan coverage
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

# Test dengan race detector
test-race:
	go test -race -v ./...

# Run benchmarks
test-bench:
	go test -bench=. -benchmem ./...

# Test specific package
test-user:
	go test -v ./internal/user/...

# Test dengan coverage minimal 80%
test-coverage-check:
	go test -coverprofile=coverage.out ./...
	@go tool cover -func=coverage.out | grep total | awk '{if ($$3+0 < 80) {print "Coverage below 80%"; exit 1}}'

# Clean test cache
test-clean:
	go clean -testcache
```

### 14. CI/CD GitHub Actions untuk Testing

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Cache Go modules
        uses: actions/cache@v3
        with:
          path: ~/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
          restore-keys: |
            ${{ runner.os }}-go-

      - name: Install dependencies
        run: go mod download

      - name: Run tests
        run: go test -v -race -coverprofile=coverage.out ./...
        env:
          DATABASE_URL: "host=localhost user=postgres password=postgres dbname=test_db port=5432 sslmode=disable"
          REDIS_URL: "localhost:6379"

      - name: Check coverage
        run: |
          go tool cover -func=coverage.out
          go tool cover -func=coverage.out | grep total | awk '{if ($3+0 < 80) {print "Coverage below 80%"; exit 1}}'

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.out
          flags: unittests
          name: codecov-umbrella
```

### 15. Contoh Real-World Test Structure

```
project/
├── internal/
│   ├── user/
│   │   ├── entity.go
│   │   ├── repository.go
│   │   ├── repository_test.go          # Unit test repository
│   │   ├── service.go
│   │   ├── service_test.go             # Unit test service (mock repo)
│   │   ├── handler.go
│   │   ├── handler_test.go             # Unit test handler (mock service)
│   │   ├── integration_test.go         # Integration test (real DB)
│   │   └── benchmark_test.go           # Benchmark test
│   ├── auth/
│   │   ├── service.go
│   │   ├── service_test.go
│   │   ├── handler.go
│   │   ├── handler_test.go
│   │   └── integration_test.go
│   └── session/
│       ├── service.go
│       └── service_test.go             # Mock Redis
├── mocks/
│   ├── user_repository.go              # Mock interface
│   ├── user_service.go
│   └── auth_service.go
├── pkg/
│   └── testutil/
│       ├── database.go                 # DB test helper
│       ├── faker.go                    # Fake data generator
│       └── http.go                     # HTTP test helper
├── coverage.out
├── coverage.html
├── Makefile
└── .github/
    └── workflows/
        └── test.yml
```

## ❌ Common Mistakes + Fix

### 1. ❌ Test file tidak di-suffix `_test.go`

```go
// ❌ SALAH
// user_tests.go
package user

func TestRegister(t *testing.T) {}
```

```go
// ✅ BENAR
// user_test.go
package user

func TestRegister(t *testing.T) {}
```

**Penjelasan:** Go hanya recognize file dengan suffix `_test.go` sebagai test file.

### 2. ❌ Test function tidak prefix `Test`

```go
// ❌ SALAH
func RegisterTest(t *testing.T) {}
func testRegister(t *testing.T) {}  // lowercase
```

```go
// ✅ BENAR
func TestRegister(t *testing.T) {}
func TestUserRegister(t *testing.T) {}
```

### 3. ❌ Tidak isolate test data (pakai DB production)

```go
// ❌ SALAH - Pakai DB production
dsn := "host=localhost dbname=production_db ..."
```

```go
// ✅ BENAR - Pakai DB test terpisah
dsn := "host=localhost dbname=test_db ..."

// Atau lebih baik, pakai environment variable
dbName := os.Getenv("TEST_DB_NAME")
if dbName == "" {
    dbName = "test_db"
}
```

### 4. ❌ Tidak rollback transaction (data test numpuk)

```go
// ❌ SALAH
func (s *Suite) SetupTest() {
    s.repo = NewRepository(s.db)
}

func (s *Suite) TearDownTest() {
    // Tidak ada cleanup
}
```

```go
// ✅ BENAR
func (s *Suite) SetupTest() {
    s.tx = s.db.Begin()  // Begin transaction
    s.repo = NewRepository(s.tx)
}

func (s *Suite) TearDownTest() {
    s.tx.Rollback()  // Rollback semua perubahan
}
```

### 5. ❌ Mock tidak di-assert

```go
// ❌ SALAH
mockRepo.On("Create", ctx, mock.Anything).Return(nil)
service.Register(ctx, req)
// Tidak verify apakah Create dipanggil
```

```go
// ✅ BENAR
mockRepo.On("Create", ctx, mock.Anything).Return(nil)
service.Register(ctx, req)
mockRepo.AssertExpectations(t)  // Verify semua expectation terpenuhi
```

### 6. ❌ Test tidak independent (bergantung urutan)

```go
// ❌ SALAH
var globalUser *User

func TestCreate(t *testing.T) {
    globalUser = &User{Name: "John"}
    repo.Create(globalUser)
}

func TestUpdate(t *testing.T) {
    // Bergantung pada TestCreate
    globalUser.Name = "Jane"
    repo.Update(globalUser)
}
```

```go
// ✅ BENAR - Setiap test independent
func TestCreate(t *testing.T) {
    user := &User{Name: "John"}
    repo.Create(user)
}

func TestUpdate(t *testing.T) {
    // Setup data sendiri
    user := &User{Name: "John"}
    repo.Create(user)
    
    user.Name = "Jane"
    repo.Update(user)
}
```

### 7. ❌ Tidak test error case

```go
// ❌ SALAH - Hanya test happy path
func TestRegister(t *testing.T) {
    user, err := service.Register(ctx, validReq)
    assert.NoError(t, err)
}
```

```go
// ✅ BENAR - Test happy path + error cases
func TestRegister(t *testing.T) {
    t.Run("success", func(t *testing.T) {
        user, err := service.Register(ctx, validReq)
        assert.NoError(t, err)
    })

    t.Run("invalid email", func(t *testing.T) {
        user, err := service.Register(ctx, invalidReq)
        assert.Error(t, err)
    })

    t.Run("email already exists", func(t *testing.T) {
        // ...
    })
}
```

### 8. ❌ Mock return value salah tipe

```go
// ❌ SALAH
mockRepo.On("FindByID", ctx, uint(1)).Return("not a user", nil)
```

```go
// ✅ BENAR
mockRepo.On("FindByID", ctx, uint(1)).Return(&User{ID: 1}, nil)
// Atau untuk error case
mockRepo.On("FindByID", ctx, uint(999)).Return(nil, errors.New("not found"))
```

### 9. ❌ Hardcode expected value yang seharusnya dynamic

```go
// ❌ SALAH
assert.Equal(t, "2024-01-01 12:00:00", user.CreatedAt.String())
```

```go
// ✅ BENAR
assert.NotZero(t, user.CreatedAt)
assert.WithinDuration(t, time.Now(), user.CreatedAt, 1*time.Second)
```

### 10. ❌ Tidak pakai table-driven test untuk banyak case

```go
// ❌ SALAH - Repetitive
func TestValidateEmail1(t *testing.T) {
    err := ValidateEmail("valid@example.com")
    assert.NoError(t, err)
}

func TestValidateEmail2(t *testing.T) {
    err := ValidateEmail("invalid")
    assert.Error(t, err)
}

func TestValidateEmail3(t *testing.T) {
    err := ValidateEmail("")
    assert.Error(t, err)
}
```

```go
// ✅ BENAR - Table-driven
func TestValidateEmail(t *testing.T) {
    testCases := []struct {
        name        string
        email       string
        expectError bool
    }{
        {"valid email", "valid@example.com", false},
        {"invalid format", "invalid", true},
        {"empty email", "", true},
    }

    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            err := ValidateEmail(tc.email)
            if tc.expectError {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```

## ✅ Checklist Akhir

Setelah belajar ini, pastikan lo bisa:

- [ ] Nulis unit test dengan `testing.T` dan testify
- [ ] Pakai `t.Run()` untuk subtest
- [ ] Bikin table-driven test dengan loop
- [ ] Pakai `t.Helper()` untuk test helper function
- [ ] Mock interface dengan `testify/mock`
- [ ] Setup expectation dengan `mock.On()` dan `mock.Return()`
- [ ] Assert mock dengan `AssertExpectations()`
- [ ] Mock repository untuk test service
- [ ] Mock service untuk test handler
- [ ] Setup test suite dengan `suite.SetupTest()` dan `TearDownTest()`
- [ ] Test database dengan transaction rollback
- [ ] Test HTTP endpoint dengan `httptest` dan `fiber.Test()`
- [ ] Parse dan assert JSON response
- [ ] Test auth flow lengkap (register → login → protected route)
- [ ] Mock Redis dengan `go-redis/redismock`
- [ ] Generate fake data dengan `gofakeit`
- [ ] Measure coverage dengan `-coverprofile`
- [ ] View coverage di browser dengan `go tool cover -html`
- [ ] Detect race condition dengan `-race`
- [ ] Bikin benchmark test dengan `testing.B`
- [ ] Bikin test helper function yang reusable
- [ ] Organize test files dengan proper structure
- [ ] Jalankan test dengan Makefile
- [ ] Setup CI/CD untuk automated testing

## 💭 Ide Pengembangan Mandiri

Setelah paham basic testing, coba kembangkan:

1. **Advanced Mock:**
   - Generate mock otomatis dengan `mockery`
   - Mock external API dengan `httpmock`
   - Mock file system dengan `afero`

2. **Test Fixtures:**
   - Bikin fixture loader dari JSON/YAML
   - Seed data test dari file
   - Shared fixtures antar test

3. **Integration Test Advanced:**
   - Test dengan Docker container (testcontainers-go)
   - Test queue/background jobs
   - Test WebSocket connections

4. **Performance Testing:**
   - Load testing dengan `vegeta`
   - Stress testing
   - Memory profiling dengan `pprof`

5. **E2E Testing:**
   - Test full flow dengan Selenium/Playwright
   - Test email delivery dengan MailHog
   - Test S3 upload dengan MinIO

6. **Testing Best Practices:**
   - AAA pattern (Arrange, Act, Assert)
   - Given-When-Then structure
   - Test pyramid (lebih banyak unit test daripada integration)

7. **Snapshot Testing:**
   - Implement snapshot testing untuk JSON response
   - Golden file testing untuk complex output

8. **Mutation Testing:**
   - Pakai `go-mutesting` untuk cek quality test
   - Measure test effectiveness

9. **Property-Based Testing:**
   - Pakai `gopter` untuk property-based testing
   - Generate random input untuk find edge cases

10. **Test Documentation:**
    - Generate test documentation dari code
    - Test coverage badge di README
    - Document test strategy

---

**Tips Pro:**
- Target minimal **80% coverage**, tapi jangan obsesi 100% (diminishing returns)
- **Test behavior, bukan implementation** (jangan test private function)
- **Fast test is good test** (kalau test lambat, developer males jalanin)
- **Test name harus deskriptif**: `TestRegisterWithInvalidEmail` bukan `TestRegister1`
- **1 assertion per test case** (kalau bisa, pakai table-driven)
- **Mock eksternal dependency, test internal logic**
- **Integration test untuk happy path, unit test untuk edge cases**

**Jalankan test sebelum commit!** Bikin git hook biar auto test sebelum push. 🚀
