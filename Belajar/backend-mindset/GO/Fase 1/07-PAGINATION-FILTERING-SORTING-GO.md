# 📄 Pagination + Filtering + Sorting di Go Fiber

## 🎯 Tujuan Belajar

Setelah materi ini, kamu bisa:
- ✅ Implement pagination yang reusable dan consistent
- ✅ Bikin filtering dinamis berdasarkan query params
- ✅ Handle sorting dengan whitelist kolom (prevent SQL injection)
- ✅ Implement case-insensitive search
- ✅ Kombinasikan pagination + filtering + sorting + search dalam 1 endpoint
- ✅ Bikin generic repository method untuk list data
- ✅ Auto-filter data by user (security)
- ✅ Return metadata yang informatif (total, pages, dll)

---

## 💡 Konsep + Analogi

### 1. **Pagination**

**Analogi**: Kayak halaman di Google Search (1, 2, 3, ...). Gak mungkin semua hasil ditampilkan sekaligus, jadi di-split per halaman.

Di Next.js dengan React Query:
```typescript
// TypeScript
const { data } = useQuery(['products', page], () =>
  fetch(`/api/products?page=${page}&per_page=10`)
);

// Response
{
  data: [...],
  meta: {
    total: 100,
    page: 1,
    per_page: 10,
    total_pages: 10
  }
}
```

Di Go:
```go
// Go
type PaginationQuery struct {
    Page    int `query:"page"`
    PerPage int `query:"per_page"`
}

// GORM
db.Limit(pagination.PerPage).Offset(pagination.Offset()).Find(&products)
```

**Formula**:
- Offset = (Page - 1) × PerPage
- Total Pages = Ceiling(Total ÷ PerPage)

---

### 2. **Filtering**

**Analogi**: Kayak filter di e-commerce (filter by category, price range, brand).

Di Next.js:
```typescript
// TypeScript
fetch('/api/products?category=electronics&min_price=100&max_price=500')
```

Di Go dengan GORM:
```go
// Go
query := db.Model(&Product{})

if filter.Category != "" {
    query = query.Where("category = ?", filter.Category)
}
if filter.MinPrice > 0 {
    query = query.Where("price >= ?", filter.MinPrice)
}
```

**Penting**: Selalu pakai parameterized query (`?`) untuk prevent SQL injection.

---

### 3. **Sorting**

**Analogi**: Kayak "Sort by: Price Low to High" di Tokopedia.

Di Next.js:
```typescript
// TypeScript
fetch('/api/products?sort=price&order=asc')
```

Di Go dengan Whitelist:
```go
// Go
allowedSorts := map[string]bool{
    "name": true,
    "price": true,
    "created_at": true,
}

if allowedSorts[sort] {
    db.Order(fmt.Sprintf("%s %s", sort, order))
}
```

**Security**: JANGAN langsung inject sort param ke SQL. Pakai whitelist untuk prevent injection.

---

### 4. **Search**

**Analogi**: Kayak search bar. User ketik keyword, sistem cari di beberapa field.

Di PostgreSQL:
```sql
-- Case-insensitive search
WHERE name ILIKE '%keyword%' OR description ILIKE '%keyword%'
```

Di GORM:
```go
// Go
if search != "" {
    query = query.Where(
        "name ILIKE ? OR description ILIKE ?",
        "%"+search+"%", "%"+search+"%",
    )
}
```

**ILIKE**: Case-insensitive LIKE (PostgreSQL). Di MySQL pakai `LIKE` aja (by default case-insensitive).

---

## 📝 Materi + Kode Lengkap

### Project Structure

```
.
├── main.go
├── go.mod
├── internal/
│   ├── models/
│   │   └── product.go
│   ├── dto/
│   │   ├── product.go
│   │   └── pagination.go
│   ├── utils/
│   │   ├── pagination.go
│   │   └── query_builder.go
│   └── product/
│       ├── filter.go
│       ├── handler.go
│       ├── service.go
│       └── repository.go
└── pkg/
    └── response/
        └── response.go
```

---

### Step 1: Setup Project

```bash
# Terminal
mkdir go-pagination-filter && cd go-pagination-filter
go mod init go-pagination-filter

# Install dependencies
go get github.com/gofiber/fiber/v2
go get gorm.io/gorm
go get gorm.io/driver/postgres
```

---

### Step 2: Pagination Utils

```go
// internal/utils/pagination.go
package utils

import "math"

// PaginationQuery adalah struct untuk pagination query params
type PaginationQuery struct {
	Page    int    `query:"page"`
	PerPage int    `query:"per_page"`
	Sort    string `query:"sort"`
	Order   string `query:"order"`
}

// Pagination adalah struct untuk pagination logic
type Pagination struct {
	Page      int
	PerPage   int
	Sort      string
	Order     string
	TotalRows int64
}

// PaginationMeta adalah metadata untuk response
type PaginationMeta struct {
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	PerPage    int   `json:"per_page"`
	TotalPages int   `json:"total_pages"`
}

// NewPagination create pagination instance dengan validation
func NewPagination(query PaginationQuery) *Pagination {
	page := query.Page
	perPage := query.PerPage
	sort := query.Sort
	order := query.Order

	// Validate page
	if page < 1 {
		page = 1
	}

	// Validate per_page (min: 1, max: 100, default: 10)
	if perPage < 1 {
		perPage = 10
	}
	if perPage > 100 {
		perPage = 100
	}

	// Validate order (default: DESC)
	if order != "asc" && order != "desc" {
		order = "desc"
	}

	return &Pagination{
		Page:    page,
		PerPage: perPage,
		Sort:    sort,
		Order:   order,
	}
}

// Offset calculate offset untuk SQL query
func (p *Pagination) Offset() int {
	return (p.Page - 1) * p.PerPage
}

// Limit return limit untuk SQL query
func (p *Pagination) Limit() int {
	return p.PerPage
}

// GetMeta return metadata untuk response
func (p *Pagination) GetMeta() PaginationMeta {
	totalPages := int(math.Ceil(float64(p.TotalRows) / float64(p.PerPage)))

	return PaginationMeta{
		Total:      p.TotalRows,
		Page:       p.Page,
		PerPage:    p.PerPage,
		TotalPages: totalPages,
	}
}

// SetTotalRows set total rows dari database
func (p *Pagination) SetTotalRows(total int64) {
	p.TotalRows = total
}
```

**Analogi**: Helper ini kayak custom hooks di React yang handle pagination logic. Semua validation dan calculation di satu tempat.

---

### Step 3: Response Helper

```go
// pkg/response/response.go
package response

import (
	"go-pagination-filter/internal/utils"

	"github.com/gofiber/fiber/v2"
)

// SuccessResponse format standard untuk response sukses
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Meta    interface{} `json:"meta,omitempty"`
}

// JSON return success response
func JSON(c *fiber.Ctx, status int, data interface{}) error {
	return c.Status(status).JSON(SuccessResponse{
		Success: true,
		Data:    data,
	})
}

// JSONWithPagination return response dengan pagination meta
func JSONWithPagination(c *fiber.Ctx, status int, data interface{}, pagination *utils.Pagination) error {
	return c.Status(status).JSON(SuccessResponse{
		Success: true,
		Data:    data,
		Meta:    pagination.GetMeta(),
	})
}
```

---

### Step 4: Models

```go
// internal/models/product.go
package models

import (
	"time"

	"gorm.io/gorm"
)

type Product struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Name        string  `gorm:"not null;index" json:"name"`
	Description string  `gorm:"type:text" json:"description"`
	Price       float64 `gorm:"not null;index" json:"price"`
	Stock       int     `gorm:"not null;default:0" json:"stock"`
	Category    string  `gorm:"not null;index" json:"category"`
	Brand       string  `gorm:"index" json:"brand"`
	IsActive    bool    `gorm:"default:true;index" json:"is_active"`
	UserID      uint    `gorm:"not null;index" json:"user_id"` // Owner dari product

	// Untuk full-text search (optional)
	// SearchVector tsvector `gorm:"type:tsvector;index:,type:gin"`
}

// TableName override table name
func (Product) TableName() string {
	return "products"
}
```

---

### Step 5: Filter Struct

```go
// internal/product/filter.go
package product

// ProductFilter adalah struct untuk filtering products
type ProductFilter struct {
	// String filters
	Category string `query:"category"`
	Brand    string `query:"brand"`

	// Number range filters
	MinPrice float64 `query:"min_price"`
	MaxPrice float64 `query:"max_price"`
	MinStock int     `query:"min_stock"`
	MaxStock int     `query:"max_stock"`

	// Boolean filter
	IsActive *bool `query:"is_active"` // Pointer untuk distinguish false vs not set

	// Date range filter
	CreatedAfter  string `query:"created_after"`  // Format: 2006-01-02
	CreatedBefore string `query:"created_before"` // Format: 2006-01-02

	// Search (multi-field)
	Search string `query:"search"`

	// Filter by user (auto set dari middleware, bukan dari query)
	UserID uint `query:"-"`
}

// IsEmpty check apakah filter kosong
func (f *ProductFilter) IsEmpty() bool {
	return f.Category == "" &&
		f.Brand == "" &&
		f.MinPrice == 0 &&
		f.MaxPrice == 0 &&
		f.MinStock == 0 &&
		f.MaxStock == 0 &&
		f.IsActive == nil &&
		f.CreatedAfter == "" &&
		f.CreatedBefore == "" &&
		f.Search == "" &&
		f.UserID == 0
}
```

**Analogi**: Filter struct ini kayak TypeScript interface untuk query params. Kita define semua possible filters di sini.

---

### Step 6: DTO

```go
// internal/dto/product.go
package dto

type ProductResponse struct {
	ID          uint    `json:"id"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	Category    string  `json:"category"`
	Brand       string  `json:"brand"`
	IsActive    bool    `json:"is_active"`
	UserID      uint    `json:"user_id"`
	CreatedAt   string  `json:"created_at"`
}

type CreateProductRequest struct {
	Name        string  `json:"name" validate:"required,min=3,max=200"`
	Description string  `json:"description" validate:"max=1000"`
	Price       float64 `json:"price" validate:"required,min=0"`
	Stock       int     `json:"stock" validate:"required,min=0"`
	Category    string  `json:"category" validate:"required,oneof=electronics fashion food books"`
	Brand       string  `json:"brand" validate:"required,min=2,max=100"`
	IsActive    bool    `json:"is_active"`
}
```

---

### Step 7: Repository Layer

```go
// internal/product/repository.go
package product

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go-pagination-filter/internal/models"
	"go-pagination-filter/internal/utils"

	"gorm.io/gorm"
)

type Repository interface {
	Create(ctx context.Context, product *models.Product) error
	FindByID(ctx context.Context, id uint) (*models.Product, error)
	FindAll(ctx context.Context, filter ProductFilter, pagination *utils.Pagination) ([]models.Product, error)
	Count(ctx context.Context, filter ProductFilter) (int64, error)
	Update(ctx context.Context, product *models.Product) error
	Delete(ctx context.Context, id uint) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, product *models.Product) error {
	return r.db.WithContext(ctx).Create(product).Error
}

func (r *repository) FindByID(ctx context.Context, id uint) (*models.Product, error) {
	var product models.Product
	err := r.db.WithContext(ctx).First(&product, id).Error
	return &product, err
}

// FindAll dengan filtering, sorting, dan pagination
func (r *repository) FindAll(ctx context.Context, filter ProductFilter, pagination *utils.Pagination) ([]models.Product, error) {
	var products []models.Product

	query := r.db.WithContext(ctx).Model(&models.Product{})

	// Apply filters
	query = r.applyFilters(query, filter)

	// Apply sorting
	query = r.applySorting(query, pagination)

	// Execute query dengan pagination
	err := query.
		Limit(pagination.Limit()).
		Offset(pagination.Offset()).
		Find(&products).Error

	return products, err
}

// Count total rows dengan filter
func (r *repository) Count(ctx context.Context, filter ProductFilter) (int64, error) {
	var count int64

	query := r.db.WithContext(ctx).Model(&models.Product{})

	// Apply filters (sama kayak FindAll)
	query = r.applyFilters(query, filter)

	err := query.Count(&count).Error
	return count, err
}

func (r *repository) Update(ctx context.Context, product *models.Product) error {
	return r.db.WithContext(ctx).Save(product).Error
}

func (r *repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Product{}, id).Error
}

// applyFilters apply all filters ke query
func (r *repository) applyFilters(query *gorm.DB, filter ProductFilter) *gorm.DB {
	// Filter by user (IMPORTANT: security)
	if filter.UserID > 0 {
		query = query.Where("user_id = ?", filter.UserID)
	}

	// String filters (exact match)
	if filter.Category != "" {
		query = query.Where("category = ?", filter.Category)
	}

	if filter.Brand != "" {
		query = query.Where("brand = ?", filter.Brand)
	}

	// Number range filters
	if filter.MinPrice > 0 {
		query = query.Where("price >= ?", filter.MinPrice)
	}
	if filter.MaxPrice > 0 {
		query = query.Where("price <= ?", filter.MaxPrice)
	}

	if filter.MinStock > 0 {
		query = query.Where("stock >= ?", filter.MinStock)
	}
	if filter.MaxStock > 0 {
		query = query.Where("stock <= ?", filter.MaxStock)
	}

	// Boolean filter
	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}

	// Date range filters
	if filter.CreatedAfter != "" {
		if t, err := time.Parse("2006-01-02", filter.CreatedAfter); err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if filter.CreatedBefore != "" {
		if t, err := time.Parse("2006-01-02", filter.CreatedBefore); err == nil {
			// Add 1 day untuk include semua data di tanggal tersebut
			t = t.AddDate(0, 0, 1)
			query = query.Where("created_at < ?", t)
		}
	}

	// Search (multi-field, case-insensitive)
	if filter.Search != "" {
		searchPattern := "%" + filter.Search + "%"
		query = query.Where(
			"name ILIKE ? OR description ILIKE ? OR brand ILIKE ?",
			searchPattern, searchPattern, searchPattern,
		)
	}

	return query
}

// applySorting apply sorting dengan whitelist
func (r *repository) applySorting(query *gorm.DB, pagination *utils.Pagination) *gorm.DB {
	// Whitelist kolom yang boleh di-sort
	allowedSorts := map[string]bool{
		"id":         true,
		"name":       true,
		"price":      true,
		"stock":      true,
		"category":   true,
		"brand":      true,
		"created_at": true,
		"updated_at": true,
	}

	sortColumn := pagination.Sort
	sortOrder := pagination.Order

	// Validate sort column
	if sortColumn == "" || !allowedSorts[sortColumn] {
		// Default sort
		sortColumn = "created_at"
	}

	// Normalize order
	sortOrder = strings.ToUpper(sortOrder)
	if sortOrder != "ASC" && sortOrder != "DESC" {
		sortOrder = "DESC"
	}

	// Apply sorting
	orderClause := fmt.Sprintf("%s %s", sortColumn, sortOrder)
	return query.Order(orderClause)
}
```

**Highlight**:
- **Dynamic filtering**: Build query berdasarkan filter yang ada
- **Whitelist sorting**: Prevent SQL injection di ORDER BY
- **Parameterized queries**: Semua pakai `?` placeholder
- **Auto-filter by user**: Security measure (user hanya lihat produk miliknya)

---

### Step 8: Service Layer

```go
// internal/product/service.go
package product

import (
	"context"
	"errors"
	"fmt"

	"go-pagination-filter/internal/dto"
	"go-pagination-filter/internal/models"
	"go-pagination-filter/internal/utils"

	"gorm.io/gorm"
)

type Service interface {
	CreateProduct(ctx context.Context, userID uint, req *dto.CreateProductRequest) (*dto.ProductResponse, error)
	GetProduct(ctx context.Context, id uint) (*dto.ProductResponse, error)
	ListProducts(ctx context.Context, filter ProductFilter, pagination *utils.Pagination) ([]dto.ProductResponse, error)
	UpdateProduct(ctx context.Context, id, userID uint, req *dto.CreateProductRequest) (*dto.ProductResponse, error)
	DeleteProduct(ctx context.Context, id, userID uint) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateProduct(ctx context.Context, userID uint, req *dto.CreateProductRequest) (*dto.ProductResponse, error) {
	product := &models.Product{
		Name:        req.Name,
		Description: req.Description,
		Price:       req.Price,
		Stock:       req.Stock,
		Category:    req.Category,
		Brand:       req.Brand,
		IsActive:    req.IsActive,
		UserID:      userID,
	}

	if err := s.repo.Create(ctx, product); err != nil {
		return nil, fmt.Errorf("failed to create product: %w", err)
	}

	return s.toProductResponse(product), nil
}

func (s *service) GetProduct(ctx context.Context, id uint) (*dto.ProductResponse, error) {
	product, err := s.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("product not found")
		}
		return nil, fmt.Errorf("failed to get product: %w", err)
	}

	return s.toProductResponse(product), nil
}

func (s *service) ListProducts(ctx context.Context, filter ProductFilter, pagination *utils.Pagination) ([]dto.ProductResponse, error) {
	// Get total count (untuk metadata)
	total, err := s.repo.Count(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to count products: %w", err)
	}

	// Set total rows untuk pagination
	pagination.SetTotalRows(total)

	// Get products
	products, err := s.repo.FindAll(ctx, filter, pagination)
	if err != nil {
		return nil, fmt.Errorf("failed to list products: %w", err)
	}

	// Convert to response
	responses := make([]dto.ProductResponse, len(products))
	for i, product := range products {
		responses[i] = *s.toProductResponse(&product)
	}

	return responses, nil
}

func (s *service) UpdateProduct(ctx context.Context, id, userID uint, req *dto.CreateProductRequest) (*dto.ProductResponse, error) {
	// Get existing product
	product, err := s.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("product not found")
		}
		return nil, fmt.Errorf("failed to get product: %w", err)
	}

	// Check ownership
	if product.UserID != userID {
		return nil, fmt.Errorf("forbidden: not the owner")
	}

	// Update fields
	product.Name = req.Name
	product.Description = req.Description
	product.Price = req.Price
	product.Stock = req.Stock
	product.Category = req.Category
	product.Brand = req.Brand
	product.IsActive = req.IsActive

	if err := s.repo.Update(ctx, product); err != nil {
		return nil, fmt.Errorf("failed to update product: %w", err)
	}

	return s.toProductResponse(product), nil
}

func (s *service) DeleteProduct(ctx context.Context, id, userID uint) error {
	// Get existing product
	product, err := s.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("product not found")
		}
		return fmt.Errorf("failed to get product: %w", err)
	}

	// Check ownership
	if product.UserID != userID {
		return fmt.Errorf("forbidden: not the owner")
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete product: %w", err)
	}

	return nil
}

// Helper
func (s *service) toProductResponse(product *models.Product) *dto.ProductResponse {
	return &dto.ProductResponse{
		ID:          product.ID,
		Name:        product.Name,
		Description: product.Description,
		Price:       product.Price,
		Stock:       product.Stock,
		Category:    product.Category,
		Brand:       product.Brand,
		IsActive:    product.IsActive,
		UserID:      product.UserID,
		CreatedAt:   product.CreatedAt.Format("2006-01-02 15:04:05"),
	}
}
```

---

### Step 9: Handler Layer

```go
// internal/product/handler.go
package product

import (
	"strconv"

	"go-pagination-filter/internal/dto"
	"go-pagination-filter/internal/utils"
	"go-pagination-filter/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// CreateProduct godoc
// @Summary Create product
// @Tags products
// @Accept json
// @Produce json
// @Param request body dto.CreateProductRequest true "Create product request"
// @Success 201 {object} response.SuccessResponse{data=dto.ProductResponse}
// @Router /products [post]
func (h *Handler) CreateProduct(c *fiber.Ctx) error {
	// Get user ID dari middleware (mock)
	userID := uint(1) // Di production, ambil dari c.Locals("userID") hasil JWT middleware

	var req dto.CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	product, err := h.service.CreateProduct(c.Context(), userID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return response.JSON(c, fiber.StatusCreated, product)
}

// GetProduct godoc
// @Summary Get product by ID
// @Tags products
// @Produce json
// @Param id path int true "Product ID"
// @Success 200 {object} response.SuccessResponse{data=dto.ProductResponse}
// @Router /products/{id} [get]
func (h *Handler) GetProduct(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	product, err := h.service.GetProduct(c.Context(), uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return response.JSON(c, fiber.StatusOK, product)
}

// ListProducts godoc
// @Summary List products dengan pagination, filtering, sorting
// @Tags products
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param per_page query int false "Items per page" default(10)
// @Param sort query string false "Sort by column" Enums(id, name, price, stock, category, brand, created_at)
// @Param order query string false "Sort order" Enums(asc, desc) default(desc)
// @Param category query string false "Filter by category"
// @Param brand query string false "Filter by brand"
// @Param min_price query number false "Minimum price"
// @Param max_price query number false "Maximum price"
// @Param min_stock query int false "Minimum stock"
// @Param max_stock query int false "Maximum stock"
// @Param is_active query boolean false "Filter by active status"
// @Param created_after query string false "Created after date (YYYY-MM-DD)"
// @Param created_before query string false "Created before date (YYYY-MM-DD)"
// @Param search query string false "Search in name, description, brand"
// @Success 200 {object} response.SuccessResponse{data=[]dto.ProductResponse}
// @Router /products [get]
func (h *Handler) ListProducts(c *fiber.Ctx) error {
	// Parse pagination query
	var paginationQuery utils.PaginationQuery
	if err := c.QueryParser(&paginationQuery); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid pagination params",
		})
	}

	// Parse filter query
	var filter ProductFilter
	if err := c.QueryParser(&filter); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid filter params",
		})
	}

	// Set user ID dari middleware (auto-filter by user)
	// Di production, uncomment ini untuk security
	// userID := c.Locals("userID").(uint)
	// filter.UserID = userID

	// Create pagination instance
	pagination := utils.NewPagination(paginationQuery)

	// Get products
	products, err := h.service.ListProducts(c.Context(), filter, pagination)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return response.JSONWithPagination(c, fiber.StatusOK, products, pagination)
}

// UpdateProduct godoc
// @Summary Update product
// @Tags products
// @Accept json
// @Produce json
// @Param id path int true "Product ID"
// @Param request body dto.CreateProductRequest true "Update product request"
// @Success 200 {object} response.SuccessResponse{data=dto.ProductResponse}
// @Router /products/{id} [put]
func (h *Handler) UpdateProduct(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	userID := uint(1) // Mock, di production ambil dari JWT

	var req dto.CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	product, err := h.service.UpdateProduct(c.Context(), uint(id), userID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return response.JSON(c, fiber.StatusOK, product)
}

// DeleteProduct godoc
// @Summary Delete product
// @Tags products
// @Produce json
// @Param id path int true "Product ID"
// @Success 200 {object} response.SuccessResponse{data=map[string]string}
// @Router /products/{id} [delete]
func (h *Handler) DeleteProduct(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	userID := uint(1) // Mock

	if err := h.service.DeleteProduct(c.Context(), uint(id), userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{
		"message": "Product deleted successfully",
	})
}
```

**Highlight**: Handler ini combine semua query params (pagination, filter, sort, search) dalam 1 endpoint yang powerful.

---

### Step 10: Main Application

```go
// main.go
package main

import (
	"fmt"
	"log"

	"go-pagination-filter/internal/models"
	"go-pagination-filter/internal/product"
	"go-pagination-filter/pkg/response"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

func main() {
	// Connect database
	dsn := "host=localhost user=postgres password=postgres dbname=go_pagination_db port=5432 sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger.Default.LogMode(gormLogger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// Auto migrate
	if err := db.AutoMigrate(&models.Product{}); err != nil {
		log.Fatal("Failed to migrate:", err)
	}

	// Seed data (optional, untuk testing)
	seedProducts(db)

	// Create Fiber app
	app := fiber.New()

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// Setup routes
	setupRoutes(app, db)

	// Start server
	port := 3000
	log.Printf("🚀 Server running on http://localhost:%d\n", port)
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
	productRepo := product.NewRepository(db)
	productService := product.NewService(productRepo)
	productHandler := product.NewHandler(productService)

	// Product routes
	api := app.Group("/api")
	products := api.Group("/products")

	products.Post("/", productHandler.CreateProduct)
	products.Get("/", productHandler.ListProducts)
	products.Get("/:id", productHandler.GetProduct)
	products.Put("/:id", productHandler.UpdateProduct)
	products.Delete("/:id", productHandler.DeleteProduct)
}

// seedProducts insert dummy data untuk testing
func seedProducts(db *gorm.DB) {
	// Check if already seeded
	var count int64
	db.Model(&models.Product{}).Count(&count)
	if count > 0 {
		return
	}

	products := []models.Product{
		{Name: "iPhone 14 Pro", Description: "Latest Apple smartphone", Price: 15000000, Stock: 50, Category: "electronics", Brand: "Apple", IsActive: true, UserID: 1},
		{Name: "Samsung Galaxy S23", Description: "Flagship Android phone", Price: 12000000, Stock: 30, Category: "electronics", Brand: "Samsung", IsActive: true, UserID: 1},
		{Name: "MacBook Pro 14", Description: "Professional laptop", Price: 30000000, Stock: 20, Category: "electronics", Brand: "Apple", IsActive: true, UserID: 1},
		{Name: "Dell XPS 13", Description: "Ultrabook laptop", Price: 18000000, Stock: 15, Category: "electronics", Brand: "Dell", IsActive: true, UserID: 2},
		{Name: "Sony WH-1000XM5", Description: "Noise cancelling headphones", Price: 5000000, Stock: 100, Category: "electronics", Brand: "Sony", IsActive: true, UserID: 1},
		{Name: "Nike Air Max", Description: "Running shoes", Price: 2000000, Stock: 80, Category: "fashion", Brand: "Nike", IsActive: true, UserID: 2},
		{Name: "Adidas Ultraboost", Description: "Comfort running shoes", Price: 2500000, Stock: 60, Category: "fashion", Brand: "Adidas", IsActive: true, UserID: 1},
		{Name: "Levi's 501", Description: "Classic jeans", Price: 1200000, Stock: 120, Category: "fashion", Brand: "Levis", IsActive: true, UserID: 2},
		{Name: "The Pragmatic Programmer", Description: "Software engineering book", Price: 500000, Stock: 40, Category: "books", Brand: "Addison-Wesley", IsActive: true, UserID: 1},
		{Name: "Clean Code", Description: "Code quality book", Price: 450000, Stock: 35, Category: "books", Brand: "Prentice Hall", IsActive: true, UserID: 1},
		{Name: "Kopi Arabica Premium", Description: "Premium coffee beans", Price: 150000, Stock: 200, Category: "food", Brand: "Local Roaster", IsActive: true, UserID: 2},
		{Name: "Organic Green Tea", Description: "Healthy tea leaves", Price: 100000, Stock: 150, Category: "food", Brand: "Tea House", IsActive: true, UserID: 1},
		{Name: "Out of Stock Product", Description: "This product is not available", Price: 1000000, Stock: 0, Category: "electronics", Brand: "Samsung", IsActive: false, UserID: 1},
	}

	db.Create(&products)
	log.Println("✅ Seeded", len(products), "products")
}
```

---

### Step 11: go.mod

```go
// go.mod
module go-pagination-filter

go 1.21

require (
	github.com/gofiber/fiber/v2 v2.52.0
	gorm.io/driver/postgres v1.5.6
	gorm.io/gorm v1.25.7
)
```

---

## ❌ Common Mistakes + Fix

### 1. **SQL Injection di Sorting**

❌ **Salah**:
```go
// Langsung inject sort param ke query
sortColumn := c.Query("sort")
db.Order(sortColumn + " " + c.Query("order"))
// Attacker bisa inject: ?sort=name; DROP TABLE products;--
```

✅ **Benar**:
```go
// Pakai whitelist
allowedSorts := map[string]bool{
    "name": true,
    "price": true,
}

if allowedSorts[sortColumn] {
    db.Order(fmt.Sprintf("%s %s", sortColumn, order))
}
```

**Solusi**: Selalu whitelist kolom yang boleh di-sort.

---

### 2. **Lupa Count Total Before Pagination**

❌ **Salah**:
```go
// Count setelah limit/offset
db.Limit(10).Offset(0).Find(&products).Count(&total)
// Total akan selalu <= 10
```

✅ **Benar**:
```go
// Count dulu (tanpa limit/offset)
db.Where(filter).Count(&total)

// Baru apply pagination
db.Where(filter).Limit(10).Offset(0).Find(&products)
```

**Solusi**: Count total rows SEBELUM apply limit/offset.

---

### 3. **Gak Validate Pagination Params**

❌ **Salah**:
```go
page := c.QueryInt("page") // Bisa 0, -1, atau sangat besar
perPage := c.QueryInt("per_page") // Bisa 999999 (kill database)
```

✅ **Benar**:
```go
page := c.QueryInt("page", 1)
if page < 1 {
    page = 1
}

perPage := c.QueryInt("per_page", 10)
if perPage < 1 {
    perPage = 10
}
if perPage > 100 {
    perPage = 100 // Max limit
}
```

**Solusi**: Validate dan set min/max limits.

---

### 4. **LIKE tanpa Wildcard**

❌ **Salah**:
```go
// Hanya match exact string
db.Where("name LIKE ?", search)
```

✅ **Benar**:
```go
// Partial match
db.Where("name ILIKE ?", "%"+search+"%")
```

**Solusi**: Pakai `%keyword%` untuk partial match, `ILIKE` untuk case-insensitive (PostgreSQL).

---

### 5. **Boolean Filter Gak Pakai Pointer**

❌ **Salah**:
```go
type Filter struct {
    IsActive bool `query:"is_active"` // Default false, gak bisa distinguish antara false input vs not set
}

if filter.IsActive {
    query = query.Where("is_active = ?", true)
}
// Kalau user mau filter IsActive=false, gak bisa!
```

✅ **Benar**:
```go
type Filter struct {
    IsActive *bool `query:"is_active"` // Pointer: nil = not set, false = false, true = true
}

if filter.IsActive != nil {
    query = query.Where("is_active = ?", *filter.IsActive)
}
```

**Solusi**: Pakai pointer untuk boolean filter.

---

### 6. **Lupa Escape Search Input**

❌ **Salah**:
```go
// Input: search = "50%"
// Query: WHERE name LIKE '%50%%'
// 50% jadi wildcard, bukan literal %
```

✅ **Benar**:
```go
import "strings"

search = strings.ReplaceAll(search, "%", "\\%")
search = strings.ReplaceAll(search, "_", "\\_")
db.Where("name ILIKE ?", "%"+search+"%")
```

**Solusi**: Escape special characters (`%`, `_`) di search input. ATAU pakai parameterized query (GORM otomatis escape).

---

### 7. **Gak Apply Filter ke Count Query**

❌ **Salah**:
```go
// Count all (tanpa filter)
db.Model(&Product{}).Count(&total)

// Find dengan filter
db.Where("category = ?", category).Limit(10).Find(&products)

// Total pages salah!
```

✅ **Benar**:
```go
// Build query
query := db.Model(&Product{}).Where("category = ?", category)

// Count dengan filter yang sama
query.Count(&total)

// Find dengan filter yang sama
query.Limit(10).Find(&products)
```

**Solusi**: Apply filter yang SAMA ke count dan find query.

---

### 8. **Order Before vs After Where**

❌ **Salah** (Performance issue):
```go
// Tidak optimal: sort dulu, baru filter
db.Order("created_at DESC").Where("category = ?", category).Find(&products)
```

✅ **Benar**:
```go
// Filter dulu (index), baru sort
db.Where("category = ?", category).Order("created_at DESC").Find(&products)
```

**Solusi**: WHERE dulu (pakai index), baru ORDER BY. Lebih optimal.

---

## ✅ Checklist Akhir

### Testing Pagination

**1. Basic Pagination**
```bash
# Page 1, 10 items per page
curl "http://localhost:3000/api/products?page=1&per_page=10"

# Expected response:
# {
#   "success": true,
#   "data": [...10 items...],
#   "meta": {
#     "total": 13,
#     "page": 1,
#     "per_page": 10,
#     "total_pages": 2
#   }
# }

# Page 2
curl "http://localhost:3000/api/products?page=2&per_page=10"

# Expected: 3 items (sisa dari 13 total)
```

**2. Different Page Sizes**
```bash
# 5 items per page
curl "http://localhost:3000/api/products?per_page=5"

# 20 items per page
curl "http://localhost:3000/api/products?per_page=20"

# Invalid: per_page > 100 (should cap to 100)
curl "http://localhost:3000/api/products?per_page=200"
```

---

### Testing Filtering

**3. Filter by Category**
```bash
curl "http://localhost:3000/api/products?category=electronics"

# Expected: hanya products dengan category=electronics
```

**4. Filter by Price Range**
```bash
# Products dengan harga 1jt - 5jt
curl "http://localhost:3000/api/products?min_price=1000000&max_price=5000000"

# Expected: iPhone, Samsung, Sony headphones
```

**5. Filter by Stock**
```bash
# Products dengan stock > 50
curl "http://localhost:3000/api/products?min_stock=50"
```

**6. Filter by Boolean**
```bash
# Hanya active products
curl "http://localhost:3000/api/products?is_active=true"

# Hanya inactive products
curl "http://localhost:3000/api/products?is_active=false"
```

**7. Filter by Date Range**
```bash
# Products created after 2026-01-01
curl "http://localhost:3000/api/products?created_after=2026-01-01"

# Products created in January 2026
curl "http://localhost:3000/api/products?created_after=2026-01-01&created_before=2026-02-01"
```

**8. Multiple Filters**
```bash
# Electronics, Apple brand, harga > 10jt
curl "http://localhost:3000/api/products?category=electronics&brand=Apple&min_price=10000000"

# Expected: iPhone, MacBook
```

---

### Testing Sorting

**9. Sort by Price (Ascending)**
```bash
curl "http://localhost:3000/api/products?sort=price&order=asc"

# Expected: Termurah dulu (Organic Tea, Kopi, dll)
```

**10. Sort by Price (Descending)**
```bash
curl "http://localhost:3000/api/products?sort=price&order=desc"

# Expected: Termahal dulu (MacBook, iPhone, Dell)
```

**11. Sort by Name**
```bash
curl "http://localhost:3000/api/products?sort=name&order=asc"

# Expected: Alphabetical order
```

**12. Sort by Created Date**
```bash
curl "http://localhost:3000/api/products?sort=created_at&order=desc"

# Expected: Terbaru dulu (default)
```

**13. Invalid Sort Column**
```bash
curl "http://localhost:3000/api/products?sort=invalid_column"

# Expected: Fallback ke default sort (created_at DESC)
```

---

### Testing Search

**14. Search by Name**
```bash
curl "http://localhost:3000/api/products?search=iPhone"

# Expected: iPhone 14 Pro
```

**15. Search Case-Insensitive**
```bash
curl "http://localhost:3000/api/products?search=iphone"
curl "http://localhost:3000/api/products?search=IPHONE"

# Expected: iPhone 14 Pro (keduanya)
```

**16. Search Multi-Field**
```bash
curl "http://localhost:3000/api/products?search=Apple"

# Expected: iPhone (brand), MacBook (brand)
```

**17. Search Partial Match**
```bash
curl "http://localhost:3000/api/products?search=book"

# Expected: MacBook, The Pragmatic Programmer, Clean Code
```

---

### Testing Kombinasi

**18. Filter + Sort + Pagination**
```bash
curl "http://localhost:3000/api/products?category=electronics&sort=price&order=asc&page=1&per_page=5"

# Expected: 5 electronics termurah, page 1
```

**19. Search + Filter + Sort**
```bash
curl "http://localhost:3000/api/products?search=phone&category=electronics&sort=price&order=desc"

# Expected: Phones di electronics, termahal dulu
```

**20. All Combined**
```bash
curl "http://localhost:3000/api/products?search=Apple&category=electronics&min_price=10000000&sort=price&order=asc&page=1&per_page=10"

# Expected: Apple electronics > 10jt, sorted by price ascending
```

---

### Edge Cases

**21. Page Out of Range**
```bash
curl "http://localhost:3000/api/products?page=999"

# Expected: Empty array, total_pages masih correct
```

**22. Zero Results**
```bash
curl "http://localhost:3000/api/products?category=nonexistent"

# Expected:
# {
#   "success": true,
#   "data": [],
#   "meta": {
#     "total": 0,
#     "page": 1,
#     "per_page": 10,
#     "total_pages": 0
#   }
# }
```

**23. Negative Page**
```bash
curl "http://localhost:3000/api/products?page=-1"

# Expected: Fallback to page 1
```

**24. Invalid PerPage**
```bash
curl "http://localhost:3000/api/products?per_page=0"
curl "http://localhost:3000/api/products?per_page=1000"

# Expected: Fallback to default (10) atau cap to max (100)
```

---

### Database Check

```sql
-- Check total products
SELECT COUNT(*) FROM products;

-- Check products by category
SELECT category, COUNT(*) FROM products GROUP BY category;

-- Check price range
SELECT MIN(price), MAX(price), AVG(price) FROM products;

-- Check filter by user
SELECT user_id, COUNT(*) FROM products GROUP BY user_id;
```

---

### Performance Check

```bash
# Install pgbench atau k6 untuk load testing

# Benchmark pagination
for i in {1..100}; do
  curl "http://localhost:3000/api/products?page=$i&per_page=10" &
done

# Check query performance di PostgreSQL
# EXPLAIN ANALYZE SELECT * FROM products WHERE category = 'electronics' ORDER BY price DESC LIMIT 10;
```

**Optimize**:
- Add index ke kolom yang sering di-filter/sort:
  ```sql
  CREATE INDEX idx_products_category ON products(category);
  CREATE INDEX idx_products_price ON products(price);
  CREATE INDEX idx_products_created_at ON products(created_at);
  CREATE INDEX idx_products_user_id ON products(user_id);
  ```

---

## 💭 Ide Pengembangan Mandiri

### 1. **Cursor-Based Pagination**
```go
// Untuk infinite scroll, lebih efficient dari offset
type CursorPagination struct {
    Cursor string `query:"cursor"` // Last item ID
    Limit  int    `query:"limit"`
}

// Query
db.Where("id > ?", lastID).Limit(limit).Find(&products)
```

**Keuntungan**: Gak ada masalah kalau ada insert/delete saat user scroll (consistent).

---

### 2. **Full-Text Search dengan PostgreSQL**
```sql
-- Add tsvector column
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Create index
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- Update search vector (trigger)
CREATE TRIGGER products_search_update
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', name, description, brand);
```

```go
// GORM query
db.Where("search_vector @@ plainto_tsquery('english', ?)", search)
```

---

### 3. **Redis Cache untuk Popular Filters**
```go
// Cache popular query combinations
key := fmt.Sprintf("products:category:%s:page:%d", category, page)

// Try get from cache
cached, err := redis.Get(ctx, key).Result()
if err == nil {
    return cached // Hit
}

// Miss: query database, then cache
products := queryDatabase()
redis.Set(ctx, key, products, 5*time.Minute)
```

---

### 4. **Faceted Search (Aggregations)**
```go
// Return filter counts
type FacetResponse struct {
    Categories map[string]int64 `json:"categories"` // electronics: 5, fashion: 3
    Brands     map[string]int64 `json:"brands"`
    PriceRanges map[string]int64 `json:"price_ranges"` // 0-1M: 10, 1M-5M: 20
}

// Query
db.Model(&Product{}).
    Select("category, COUNT(*) as count").
    Group("category").
    Scan(&facets)
```

**Use case**: Sidebar filter counts (kayak Tokopedia/Shopee).

---

### 5. **Export to CSV/Excel**
```go
// Endpoint untuk export filtered results
GET /api/products/export?category=electronics&format=csv

// Generate CSV dari query yang sama
```

---

### 6. **Saved Filters (User Preferences)**
```go
type SavedFilter struct {
    ID     uint
    UserID uint
    Name   string // "My Favorite Products"
    Filter ProductFilter `gorm:"type:jsonb"`
}

// Apply saved filter
GET /api/products?saved_filter_id=123
```

---

### 7. **GraphQL-style Field Selection**
```go
// Client bisa pilih field yang mau di-return
GET /api/products?fields=id,name,price

// Optimize query
db.Select("id", "name", "price").Find(&products)
```

---

### 8. **Nested Filtering (Relations)**
```go
// Filter products by related user properties
type ProductFilter struct {
    UserCountry string `query:"user_country"`
}

// Query
db.Joins("JOIN users ON users.id = products.user_id").
    Where("users.country = ?", filter.UserCountry).
    Find(&products)
```

---

### 9. **Dynamic Sort Priority**
```go
// Sort by multiple columns
GET /api/products?sort=category,price&order=asc,desc

// Query
db.Order("category ASC, price DESC")
```

---

### 10. **Rate Limit per User untuk Expensive Queries**
```go
// Limit user hanya bisa request 100x per menit
// Untuk prevent abuse (export all, scraping, dll)

func RateLimitMiddleware() fiber.Handler {
    limiter := redis_rate.NewLimiter(redis)
    
    return func(c *fiber.Ctx) error {
        userID := c.Locals("userID")
        
        allowed := limiter.Allow(userID, 100, time.Minute)
        if !allowed {
            return c.Status(429).JSON(fiber.Map{
                "error": "Rate limit exceeded",
            })
        }
        
        return c.Next()
    }
}
```

---

## 🎓 Poin Penting yang Harus Diingat

### Pagination
- Validate page (min: 1) dan per_page (min: 1, max: 100)
- Offset = (Page - 1) × PerPage
- Count total rows SEBELUM apply limit/offset
- Return metadata: total, page, per_page, total_pages

### Filtering
- Build query dinamis dengan kondisi
- Selalu pakai parameterized query (`?`) untuk prevent SQL injection
- Boolean filter pakai pointer (untuk distinguish false vs not set)
- Date range: parse string ke time.Time, validate format

### Sorting
- WAJIB pakai whitelist kolom
- Validate order (asc/desc)
- Default sort kalau param invalid
- JANGAN langsung inject sort param ke SQL

### Search
- ILIKE untuk case-insensitive (PostgreSQL)
- LIKE untuk MySQL (default case-insensitive)
- Pakai `%keyword%` untuk partial match
- Search di multiple fields dengan OR

### Performance
- Add index ke kolom yang sering di-filter/sort
- Count dan Find pakai query builder yang sama
- Consider caching untuk popular queries
- Limit max per_page untuk protect database

### Security
- Auto-filter by user (user hanya lihat data miliknya)
- Whitelist sort columns
- Parameterized queries everywhere
- Validate semua input

---

Selamat belajar! Dengan pagination, filtering, dan sorting yang proper, API kamu jadi scalable dan user-friendly. 🚀

Ada yang mau ditanyakan?
