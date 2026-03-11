# 📁 File Upload + Export File (PDF & Excel) di Go Fiber

## 🎯 Tujuan Belajar

Setelah materi ini, kamu bisa:
- ✅ Handle file upload (single & multiple) dengan validasi
- ✅ Validasi file: MIME type, ukuran, extension
- ✅ Simpan file dengan struktur folder yang rapi
- ✅ Generate unique filename (prevent overwrite)
- ✅ Process image: resize, compress, convert format
- ✅ Serve file upload dengan aman
- ✅ Export data ke Excel dengan styling
- ✅ Export data ke PDF dengan table
- ✅ Stream file ke client dengan proper headers
- ✅ Handle file cleanup saat delete record
- ✅ Konsep upload ke cloud storage (S3/MinIO)

---

## 💡 Konsep + Analogi

### 1. **File Upload**

**Analogi**: Kayak upload foto profile di Instagram atau attachment di email.

Di Next.js dengan FormData:
```typescript
// TypeScript
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
```

Di Go Fiber:
```go
// Go
file, err := c.FormFile("file")
if err != nil {
    return err
}

// Save file
c.SaveFile(file, "./uploads/"+file.Filename)
```

**Flow**:
1. Client kirim file via multipart/form-data
2. Server receive file di memory/temp
3. Validate file (type, size)
4. Save ke storage (local/cloud)
5. Return file URL ke client

---

### 2. **File Validation**

**Analogi**: Kayak security check di airport. Gak semua barang boleh dibawa masuk.

Validasi wajib:
- **MIME type**: Pastikan file sesuai (image/jpeg, application/pdf)
- **File size**: Max 5MB untuk foto, 10MB untuk dokumen
- **Extension**: Double check extension vs MIME type (prevent bypass)

Di Next.js biasanya pakai library, di Go kita check manual:
```go
// Check MIME type
contentType := file.Header.Get("Content-Type")
allowedTypes := []string{"image/jpeg", "image/png", "image/webp"}

// Check size
maxSize := 5 * 1024 * 1024 // 5MB
if file.Size > maxSize {
    return errors.New("file too large")
}
```

---

### 3. **Unique Filename**

**Analogi**: Kayak tracking number di J&T/JNE. Harus unique supaya gak bentrok.

Masalah kalau pakai original filename:
- User upload "photo.jpg" → overwrite file lama
- User upload "../../etc/passwd" → path traversal attack

Solusi: Generate unique filename
```go
// UUID + original extension
filename := uuid.New().String() + filepath.Ext(originalFilename)
// Output: "550e8400-e29b-41d4-a716-446655440000.jpg"
```

---

### 4. **Organized Storage**

**Analogi**: Kayak filing cabinet di kantor. Gak mungkin semua dokumen ditumpuk di 1 folder.

Structure:
```
uploads/
├── 2026/
│   ├── 01/
│   │   ├── uuid1.jpg
│   │   └── uuid2.png
│   ├── 02/
│   │   └── uuid3.pdf
```

Keuntungan:
- Easy cleanup (hapus bulan lama)
- Better performance (gak ada folder dengan jutaan file)
- Easier backup (per bulan)

---

### 5. **Export Excel vs PDF**

**Analogi**: 
- **Excel**: Kayak spreadsheet, editable, bisa formula, pivot table
- **PDF**: Print-ready, consistent layout, untuk report official

Use case:
- Excel: Export data user untuk dianalisis di Excel/Google Sheets
- PDF: Export invoice, laporan keuangan, untuk print

---

## 📝 Materi + Kode Lengkap

### Project Structure

```
.
├── main.go
├── go.mod
├── uploads/          # Local file storage
├── exports/          # Temporary export files
├── internal/
│   ├── models/
│   │   └── product.go
│   ├── dto/
│   │   └── product.go
│   ├── utils/
│   │   ├── file.go
│   │   └── image.go
│   ├── services/
│   │   ├── excel.go
│   │   └── pdf.go
│   └── product/
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
mkdir go-file-upload-export && cd go-file-upload-export
go mod init go-file-upload-export

# Install dependencies
go get github.com/gofiber/fiber/v2
go get gorm.io/gorm
go get gorm.io/driver/postgres
go get github.com/google/uuid
go get github.com/disintegration/imaging      # Image processing
go get github.com/xuri/excelize/v2            # Excel export
go get github.com/jung-kurt/gofpdf            # PDF export
go get github.com/minio/minio-go/v7           # S3-compatible storage (optional)

# Create folders
mkdir -p uploads exports
```

---

### Step 2: File Utils

```go
// internal/utils/file.go
package utils

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// AllowedImageTypes MIME types untuk image
var AllowedImageTypes = []string{
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
}

// AllowedDocumentTypes MIME types untuk dokumen
var AllowedDocumentTypes = []string{
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
}

// ValidateFile validasi file upload
func ValidateFile(file *multipart.FileHeader, allowedTypes []string, maxSize int64) error {
	// Check size
	if file.Size > maxSize {
		maxMB := float64(maxSize) / (1024 * 1024)
		return fmt.Errorf("file size exceeds maximum allowed size of %.2f MB", maxMB)
	}

	// Check MIME type
	contentType := file.Header.Get("Content-Type")
	if !contains(allowedTypes, contentType) {
		return fmt.Errorf("file type %s is not allowed", contentType)
	}

	// Additional check: validate extension matches content type
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !isValidExtension(ext, contentType) {
		return errors.New("file extension does not match content type")
	}

	return nil
}

// GenerateFilename generate unique filename
func GenerateFilename(originalFilename string) string {
	ext := filepath.Ext(originalFilename)
	return uuid.New().String() + ext
}

// GetUploadPath return organized upload path: uploads/2026/02/
func GetUploadPath() string {
	now := time.Now()
	year := now.Format("2006")
	month := now.Format("01")
	return filepath.Join("uploads", year, month)
}

// SaveUploadedFile save file ke storage dengan structured path
func SaveUploadedFile(file *multipart.FileHeader, uploadPath string) (string, error) {
	// Create directory if not exists
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		return "", fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Generate unique filename
	filename := GenerateFilename(file.Filename)
	fullPath := filepath.Join(uploadPath, filename)

	// Open uploaded file
	src, err := file.Open()
	if err != nil {
		return "", fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Create destination file
	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	// Copy file
	if _, err := io.Copy(dst, src); err != nil {
		return "", fmt.Errorf("failed to save file: %w", err)
	}

	return fullPath, nil
}

// DeleteFile delete file from storage
func DeleteFile(filePath string) error {
	if filePath == "" {
		return nil
	}

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil // File doesn't exist, nothing to delete
	}

	return os.Remove(filePath)
}

// GetFileURL convert file path ke URL
func GetFileURL(filePath string, baseURL string) string {
	if filePath == "" {
		return ""
	}
	// Convert backslash to forward slash for URL
	urlPath := strings.ReplaceAll(filePath, "\\", "/")
	return baseURL + "/" + urlPath
}

// Helper functions

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func isValidExtension(ext, contentType string) bool {
	validExtensions := map[string][]string{
		"image/jpeg": {".jpg", ".jpeg"},
		"image/png":  {".png"},
		"image/webp": {".webp"},
		"image/gif":  {".gif"},
		"application/pdf": {".pdf"},
		"application/msword": {".doc"},
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {".docx"},
		"application/vnd.ms-excel": {".xls"},
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {".xlsx"},
	}

	allowedExts, ok := validExtensions[contentType]
	if !ok {
		return false
	}

	return contains(allowedExts, ext)
}
```

**Analogi**: File utils ini kayak helper library buat handle file operations. Di Next.js kamu mungkin bikin custom hooks atau utils functions.

---

### Step 3: Image Processing Utils

```go
// internal/utils/image.go
package utils

import (
	"fmt"
	"image"
	"path/filepath"

	"github.com/disintegration/imaging"
)

// ImageVariant size presets
type ImageVariant struct {
	Name   string
	Width  int
	Height int
}

var (
	ThumbnailVariant = ImageVariant{Name: "thumbnail", Width: 150, Height: 150}
	MediumVariant    = ImageVariant{Name: "medium", Width: 600, Height: 600}
	LargeVariant     = ImageVariant{Name: "large", Width: 1200, Height: 1200}
)

// ProcessImage resize dan optimize image
func ProcessImage(sourcePath string, variants []ImageVariant) (map[string]string, error) {
	// Open source image
	src, err := imaging.Open(sourcePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open image: %w", err)
	}

	results := make(map[string]string)
	dir := filepath.Dir(sourcePath)
	ext := filepath.Ext(sourcePath)
	baseName := filepath.Base(sourcePath[:len(sourcePath)-len(ext)])

	// Process each variant
	for _, variant := range variants {
		// Resize (maintain aspect ratio)
		resized := imaging.Fit(src, variant.Width, variant.Height, imaging.Lanczos)

		// Generate filename
		filename := fmt.Sprintf("%s_%s%s", baseName, variant.Name, ext)
		outputPath := filepath.Join(dir, filename)

		// Save with optimization
		var saveErr error
		switch ext {
		case ".jpg", ".jpeg":
			saveErr = imaging.Save(resized, outputPath, imaging.JPEGQuality(85))
		case ".png":
			saveErr = imaging.Save(resized, outputPath, imaging.PNGCompressionLevel(6))
		case ".webp":
			// WebP support depends on build tags
			saveErr = imaging.Save(resized, outputPath)
		default:
			saveErr = imaging.Save(resized, outputPath)
		}

		if saveErr != nil {
			return nil, fmt.Errorf("failed to save %s variant: %w", variant.Name, saveErr)
		}

		results[variant.Name] = outputPath
	}

	return results, nil
}

// ConvertImageFormat convert image ke format lain
func ConvertImageFormat(sourcePath, targetFormat string) (string, error) {
	// Open source
	src, err := imaging.Open(sourcePath)
	if err != nil {
		return "", fmt.Errorf("failed to open image: %w", err)
	}

	// Generate output path
	dir := filepath.Dir(sourcePath)
	ext := filepath.Ext(sourcePath)
	baseName := filepath.Base(sourcePath[:len(sourcePath)-len(ext)])
	outputPath := filepath.Join(dir, baseName+"."+targetFormat)

	// Save with new format
	if err := imaging.Save(src, outputPath); err != nil {
		return "", fmt.Errorf("failed to convert image: %w", err)
	}

	return outputPath, nil
}

// CropImage crop image ke aspect ratio tertentu
func CropImage(sourcePath string, width, height int) (string, error) {
	src, err := imaging.Open(sourcePath)
	if err != nil {
		return "", fmt.Errorf("failed to open image: %w", err)
	}

	// Crop to center
	cropped := imaging.Fill(src, width, height, imaging.Center, imaging.Lanczos)

	// Generate output path
	dir := filepath.Dir(sourcePath)
	ext := filepath.Ext(sourcePath)
	baseName := filepath.Base(sourcePath[:len(sourcePath)-len(ext)])
	outputPath := filepath.Join(dir, baseName+"_cropped"+ext)

	if err := imaging.Save(cropped, outputPath); err != nil {
		return "", fmt.Errorf("failed to save cropped image: %w", err)
	}

	return outputPath, nil
}

// OptimizeImage compress image untuk web
func OptimizeImage(sourcePath string) error {
	img, err := imaging.Open(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to open image: %w", err)
	}

	ext := filepath.Ext(sourcePath)
	switch ext {
	case ".jpg", ".jpeg":
		return imaging.Save(img, sourcePath, imaging.JPEGQuality(85))
	case ".png":
		return imaging.Save(img, sourcePath, imaging.PNGCompressionLevel(6))
	default:
		return imaging.Save(img, sourcePath)
	}
}
```

**Penjelasan**:
- **Fit**: Resize dengan maintain aspect ratio (gak distort)
- **Fill**: Crop ke ukuran exact (untuk thumbnail square)
- **JPEGQuality(85)**: Balance antara size dan quality
- **PNGCompressionLevel(6)**: Compression level 0-9, 6 adalah sweet spot

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

	Name        string  `gorm:"not null" json:"name"`
	Description string  `gorm:"type:text" json:"description"`
	Price       float64 `gorm:"not null" json:"price"`
	Stock       int     `gorm:"not null;default:0" json:"stock"`
	Category    string  `gorm:"not null;index" json:"category"`
	
	// File fields
	Image         string `json:"image"`           // Original image path
	ImageThumbnail string `json:"image_thumbnail"` // Thumbnail path
	ImageMedium    string `json:"image_medium"`    // Medium size path
	Documents     string `gorm:"type:jsonb" json:"documents"` // Array of document paths (JSON)
}

func (Product) TableName() string {
	return "products"
}
```

---

### Step 5: DTO

```go
// internal/dto/product.go
package dto

type ProductResponse struct {
	ID             uint    `json:"id"`
	Name           string  `json:"name"`
	Description    string  `json:"description"`
	Price          float64 `json:"price"`
	Stock          int     `json:"stock"`
	Category       string  `json:"category"`
	Image          string  `json:"image"`
	ImageThumbnail string  `json:"image_thumbnail"`
	ImageMedium    string  `json:"image_medium"`
	Documents      []string `json:"documents"`
	CreatedAt      string  `json:"created_at"`
}

type CreateProductRequest struct {
	Name        string  `form:"name" validate:"required,min=3,max=200"`
	Description string  `form:"description"`
	Price       float64 `form:"price" validate:"required,min=0"`
	Stock       int     `form:"stock" validate:"required,min=0"`
	Category    string  `form:"category" validate:"required"`
}
```

---

### Step 6: Excel Export Service

```go
// internal/services/excel.go
package services

import (
	"fmt"
	"time"

	"go-file-upload-export/internal/models"

	"github.com/xuri/excelize/v2"
)

// ExcelService handle excel export
type ExcelService struct{}

func NewExcelService() *ExcelService {
	return &ExcelService{}
}

// ExportProducts export products ke Excel
func (s *ExcelService) ExportProducts(products []models.Product) (*excelize.File, error) {
	// Create new workbook
	f := excelize.NewFile()

	// Create sheet
	sheetName := "Products"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, fmt.Errorf("failed to create sheet: %w", err)
	}

	// Set active sheet
	f.SetActiveSheet(index)

	// Define headers
	headers := []string{"ID", "Name", "Description", "Price", "Stock", "Category", "Created At"}
	
	// Write headers
	for i, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, header)
	}

	// Style for header
	headerStyle, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold: true,
			Size: 12,
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Pattern: 1,
			Color:   []string{"#E0E0E0"},
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			Vertical:   "center",
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create header style: %w", err)
	}

	// Apply header style
	f.SetCellStyle(sheetName, "A1", fmt.Sprintf("%s1", string(rune('A'+len(headers)-1))), headerStyle)

	// Write data
	for i, product := range products {
		row := i + 2 // Start from row 2 (row 1 is header)
		
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), product.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), product.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), product.Description)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), product.Price)
		f.SetCellValue(sheetName, fmt.Sprintf("E%d", row), product.Stock)
		f.SetCellValue(sheetName, fmt.Sprintf("F%d", row), product.Category)
		f.SetCellValue(sheetName, fmt.Sprintf("G%d", row), product.CreatedAt.Format("2006-01-02 15:04:05"))
	}

	// Auto width for columns
	for i := range headers {
		col := string(rune('A' + i))
		f.SetColWidth(sheetName, col, col, 20)
	}

	// Freeze first row
	f.SetPanes(sheetName, &excelize.Panes{
		Freeze:      true,
		Split:       false,
		XSplit:      0,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	})

	return f, nil
}

// ExportProductsMultiSheet export dengan multiple sheets
func (s *ExcelService) ExportProductsMultiSheet(products []models.Product) (*excelize.File, error) {
	f := excelize.NewFile()

	// Group by category
	categoryProducts := make(map[string][]models.Product)
	for _, p := range products {
		categoryProducts[p.Category] = append(categoryProducts[p.Category], p)
	}

	// Create sheet for each category
	sheetIndex := 0
	for category, prods := range categoryProducts {
		sheetName := category
		
		// Create or rename sheet
		if sheetIndex == 0 {
			f.SetSheetName("Sheet1", sheetName)
		} else {
			_, err := f.NewSheet(sheetName)
			if err != nil {
				return nil, err
			}
		}

		// Write data
		headers := []string{"ID", "Name", "Price", "Stock"}
		for i, header := range headers {
			cell := fmt.Sprintf("%s1", string(rune('A'+i)))
			f.SetCellValue(sheetName, cell, header)
		}

		// Style header
		headerStyle, _ := f.NewStyle(&excelize.Style{
			Font: &excelize.Font{Bold: true, Size: 12},
			Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"#4CAF50"}},
		})
		f.SetCellStyle(sheetName, "A1", "D1", headerStyle)

		// Write products
		for i, prod := range prods {
			row := i + 2
			f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), prod.ID)
			f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), prod.Name)
			f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), prod.Price)
			f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), prod.Stock)
		}

		// Auto width
		f.SetColWidth(sheetName, "A", "D", 20)

		sheetIndex++
	}

	// Set active sheet to first
	f.SetActiveSheet(0)

	return f, nil
}

// ExportProductsWithFormula export dengan formula Excel
func (s *ExcelService) ExportProductsWithFormula(products []models.Product) (*excelize.File, error) {
	f := excelize.NewFile()
	sheetName := "Products"

	// Headers
	headers := []string{"ID", "Name", "Price", "Stock", "Total Value"}
	for i, header := range headers {
		cell := fmt.Sprintf("%s1", string(rune('A'+i)))
		f.SetCellValue(sheetName, cell, header)
	}

	// Data
	for i, product := range products {
		row := i + 2
		f.SetCellValue(sheetName, fmt.Sprintf("A%d", row), product.ID)
		f.SetCellValue(sheetName, fmt.Sprintf("B%d", row), product.Name)
		f.SetCellValue(sheetName, fmt.Sprintf("C%d", row), product.Price)
		f.SetCellValue(sheetName, fmt.Sprintf("D%d", row), product.Stock)
		
		// Formula: Price * Stock
		formula := fmt.Sprintf("=C%d*D%d", row, row)
		f.SetCellFormula(sheetName, fmt.Sprintf("E%d", row), formula)
	}

	// Total row
	totalRow := len(products) + 2
	f.SetCellValue(sheetName, fmt.Sprintf("A%d", totalRow), "TOTAL")
	f.SetCellFormula(sheetName, fmt.Sprintf("E%d", totalRow), fmt.Sprintf("=SUM(E2:E%d)", totalRow-1))

	// Style total row
	totalStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"#FFC107"}},
	})
	f.SetCellStyle(sheetName, fmt.Sprintf("A%d", totalRow), fmt.Sprintf("E%d", totalRow), totalStyle)

	return f, nil
}
```

**Highlight**:
- **Freeze pane**: Header tetap visible saat scroll
- **Auto width**: Kolom otomatis menyesuaikan content
- **Formula**: Excel formula untuk calculation
- **Multiple sheets**: Grouping data by category

---

### Step 7: PDF Export Service

```go
// internal/services/pdf.go
package services

import (
	"fmt"

	"go-file-upload-export/internal/models"

	"github.com/jung-kurt/gofpdf"
)

// PDFService handle PDF export
type PDFService struct{}

func NewPDFService() *PDFService {
	return &PDFService{}
}

// ExportProducts export products ke PDF
func (s *PDFService) ExportProducts(products []models.Product) (*gofpdf.Fpdf, error) {
	// Create new PDF
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Set font
	pdf.SetFont("Arial", "B", 16)

	// Title
	pdf.Cell(0, 10, "Product List Report")
	pdf.Ln(15)

	// Table header
	pdf.SetFont("Arial", "B", 12)
	pdf.SetFillColor(200, 200, 200)
	
	// Define column widths
	colWidths := []float64{15, 60, 30, 25, 30}
	headers := []string{"ID", "Name", "Price", "Stock", "Category"}
	
	// Draw header
	for i, header := range headers {
		pdf.CellFormat(colWidths[i], 10, header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// Table data
	pdf.SetFont("Arial", "", 10)
	pdf.SetFillColor(240, 240, 240)
	fill := false

	for _, product := range products {
		pdf.CellFormat(colWidths[0], 8, fmt.Sprintf("%d", product.ID), "1", 0, "C", fill, 0, "")
		pdf.CellFormat(colWidths[1], 8, product.Name, "1", 0, "L", fill, 0, "")
		pdf.CellFormat(colWidths[2], 8, fmt.Sprintf("%.2f", product.Price), "1", 0, "R", fill, 0, "")
		pdf.CellFormat(colWidths[3], 8, fmt.Sprintf("%d", product.Stock), "1", 0, "C", fill, 0, "")
		pdf.CellFormat(colWidths[4], 8, product.Category, "1", 0, "C", fill, 0, "")
		pdf.Ln(-1)
		fill = !fill
	}

	// Footer
	pdf.Ln(10)
	pdf.SetFont("Arial", "I", 8)
	pdf.Cell(0, 10, fmt.Sprintf("Generated: %s", products[0].CreatedAt.Format("2006-01-02 15:04:05")))

	return pdf, nil
}

// ExportProductsWithHeader PDF dengan header dan footer
func (s *PDFService) ExportProductsWithHeader(products []models.Product) (*gofpdf.Fpdf, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")

	// Header function
	pdf.SetHeaderFunc(func() {
		pdf.SetFont("Arial", "B", 14)
		pdf.Cell(0, 10, "Company Name - Product Report")
		pdf.Ln(5)
		pdf.SetFont("Arial", "I", 10)
		pdf.Cell(0, 5, "Generated on: "+products[0].CreatedAt.Format("2006-01-02"))
		pdf.Ln(10)
		pdf.SetLineWidth(0.5)
		pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
		pdf.Ln(5)
	})

	// Footer function
	pdf.SetFooterFunc(func() {
		pdf.SetY(-15)
		pdf.SetFont("Arial", "I", 8)
		pdf.Cell(0, 10, fmt.Sprintf("Page %d", pdf.PageNo()))
	})

	pdf.AddPage()

	// Content
	pdf.SetFont("Arial", "", 10)
	
	// Summary
	totalValue := 0.0
	totalStock := 0
	for _, p := range products {
		totalValue += p.Price * float64(p.Stock)
		totalStock += p.Stock
	}

	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(0, 8, "Summary")
	pdf.Ln(8)
	
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(50, 6, "Total Products:")
	pdf.Cell(0, 6, fmt.Sprintf("%d", len(products)))
	pdf.Ln(6)
	
	pdf.Cell(50, 6, "Total Stock:")
	pdf.Cell(0, 6, fmt.Sprintf("%d", totalStock))
	pdf.Ln(6)
	
	pdf.Cell(50, 6, "Total Value:")
	pdf.Cell(0, 6, fmt.Sprintf("Rp %.2f", totalValue))
	pdf.Ln(15)

	// Product table
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(0, 8, "Product Details")
	pdf.Ln(10)

	// Table
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(52, 152, 219)
	pdf.SetTextColor(255, 255, 255)
	
	colWidths := []float64{15, 70, 35, 25, 35}
	headers := []string{"ID", "Name", "Price", "Stock", "Category"}
	
	for i, header := range headers {
		pdf.CellFormat(colWidths[i], 8, header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// Reset text color
	pdf.SetTextColor(0, 0, 0)
	pdf.SetFont("Arial", "", 9)
	fill := false
	pdf.SetFillColor(240, 240, 240)

	for _, product := range products {
		pdf.CellFormat(colWidths[0], 7, fmt.Sprintf("%d", product.ID), "1", 0, "C", fill, 0, "")
		
		// Truncate long names
		name := product.Name
		if len(name) > 35 {
			name = name[:32] + "..."
		}
		pdf.CellFormat(colWidths[1], 7, name, "1", 0, "L", fill, 0, "")
		pdf.CellFormat(colWidths[2], 7, fmt.Sprintf("Rp %.0f", product.Price), "1", 0, "R", fill, 0, "")
		pdf.CellFormat(colWidths[3], 7, fmt.Sprintf("%d", product.Stock), "1", 0, "C", fill, 0, "")
		pdf.CellFormat(colWidths[4], 7, product.Category, "1", 0, "C", fill, 0, "")
		pdf.Ln(-1)
		fill = !fill
	}

	return pdf, nil
}

// ExportInvoice export invoice PDF
func (s *PDFService) ExportInvoice(product models.Product, quantity int) (*gofpdf.Fpdf, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Invoice header
	pdf.SetFont("Arial", "B", 20)
	pdf.Cell(0, 15, "INVOICE")
	pdf.Ln(20)

	// Company info
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(100, 6, "Company Name")
	pdf.Ln(5)
	pdf.Cell(100, 6, "Address Line 1")
	pdf.Ln(5)
	pdf.Cell(100, 6, "City, State, ZIP")
	pdf.Ln(15)

	// Invoice info
	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(40, 6, "Invoice No:")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, "INV-2026-001")
	pdf.Ln(6)

	pdf.SetFont("Arial", "B", 10)
	pdf.Cell(40, 6, "Date:")
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(0, 6, product.CreatedAt.Format("2006-01-02"))
	pdf.Ln(15)

	// Items table
	pdf.SetFont("Arial", "B", 11)
	pdf.SetFillColor(200, 200, 200)
	
	colWidths := []float64{80, 30, 30, 40}
	headers := []string{"Item", "Quantity", "Price", "Total"}
	
	for i, header := range headers {
		pdf.CellFormat(colWidths[i], 8, header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	// Item
	pdf.SetFont("Arial", "", 10)
	total := product.Price * float64(quantity)
	
	pdf.CellFormat(colWidths[0], 8, product.Name, "1", 0, "L", false, 0, "")
	pdf.CellFormat(colWidths[1], 8, fmt.Sprintf("%d", quantity), "1", 0, "C", false, 0, "")
	pdf.CellFormat(colWidths[2], 8, fmt.Sprintf("Rp %.2f", product.Price), "1", 0, "R", false, 0, "")
	pdf.CellFormat(colWidths[3], 8, fmt.Sprintf("Rp %.2f", total), "1", 0, "R", false, 0, "")
	pdf.Ln(-1)

	// Total
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(140, 8, "TOTAL", "1", 0, "R")
	pdf.Cell(40, 8, fmt.Sprintf("Rp %.2f", total), "1", 0, "R")

	return pdf, nil
}
```

**Highlight**:
- **Header & Footer**: Consistent di setiap page
- **Zebra striping**: Alternating row colors untuk readability
- **Summary section**: Total, average, dll
- **Invoice format**: Template untuk invoice/nota

---

### Step 8: Repository Layer

```go
// internal/product/repository.go
package product

import (
	"context"
	"encoding/json"

	"go-file-upload-export/internal/models"

	"gorm.io/gorm"
)

type Repository interface {
	Create(ctx context.Context, product *models.Product) error
	FindByID(ctx context.Context, id uint) (*models.Product, error)
	FindAll(ctx context.Context) ([]models.Product, error)
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

func (r *repository) FindAll(ctx context.Context) ([]models.Product, error) {
	var products []models.Product
	err := r.db.WithContext(ctx).Order("created_at DESC").Find(&products).Error
	return products, err
}

func (r *repository) Update(ctx context.Context, product *models.Product) error {
	return r.db.WithContext(ctx).Save(product).Error
}

func (r *repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&models.Product{}, id).Error
}
```

---

### Step 9: Service Layer

```go
// internal/product/service.go
package product

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"go-file-upload-export/internal/dto"
	"go-file-upload-export/internal/models"
	"go-file-upload-export/internal/utils"

	"gorm.io/gorm"
)

type Service interface {
	CreateProduct(ctx context.Context, req *dto.CreateProductRequest, imagePath string, imagePaths map[string]string, documents []string) (*dto.ProductResponse, error)
	GetProduct(ctx context.Context, id uint) (*dto.ProductResponse, error)
	ListProducts(ctx context.Context) ([]dto.ProductResponse, error)
	DeleteProduct(ctx context.Context, id uint) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateProduct(ctx context.Context, req *dto.CreateProductRequest, imagePath string, imagePaths map[string]string, documents []string) (*dto.ProductResponse, error) {
	// Convert documents to JSON
	documentsJSON, _ := json.Marshal(documents)

	product := &models.Product{
		Name:           req.Name,
		Description:    req.Description,
		Price:          req.Price,
		Stock:          req.Stock,
		Category:       req.Category,
		Image:          imagePath,
		ImageThumbnail: imagePaths["thumbnail"],
		ImageMedium:    imagePaths["medium"],
		Documents:      string(documentsJSON),
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

func (s *service) ListProducts(ctx context.Context) ([]dto.ProductResponse, error) {
	products, err := s.repo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list products: %w", err)
	}

	responses := make([]dto.ProductResponse, len(products))
	for i, product := range products {
		responses[i] = *s.toProductResponse(&product)
	}

	return responses, nil
}

func (s *service) DeleteProduct(ctx context.Context, id uint) error {
	// Get product untuk delete files
	product, err := s.repo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("product not found")
		}
		return fmt.Errorf("failed to get product: %w", err)
	}

	// Delete files
	utils.DeleteFile(product.Image)
	utils.DeleteFile(product.ImageThumbnail)
	utils.DeleteFile(product.ImageMedium)

	// Delete documents
	var documents []string
	if err := json.Unmarshal([]byte(product.Documents), &documents); err == nil {
		for _, doc := range documents {
			utils.DeleteFile(doc)
		}
	}

	// Delete record
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete product: %w", err)
	}

	return nil
}

// Helper
func (s *service) toProductResponse(product *models.Product) *dto.ProductResponse {
	var documents []string
	json.Unmarshal([]byte(product.Documents), &documents)

	return &dto.ProductResponse{
		ID:             product.ID,
		Name:           product.Name,
		Description:    product.Description,
		Price:          product.Price,
		Stock:          product.Stock,
		Category:       product.Category,
		Image:          utils.GetFileURL(product.Image, "http://localhost:3000"),
		ImageThumbnail: utils.GetFileURL(product.ImageThumbnail, "http://localhost:3000"),
		ImageMedium:    utils.GetFileURL(product.ImageMedium, "http://localhost:3000"),
		Documents:      documents,
		CreatedAt:      product.CreatedAt.Format("2006-01-02 15:04:05"),
	}
}
```

---

### Step 10: Handler Layer (PART 1 - Upload)

```go
// internal/product/handler.go
package product

import (
	"encoding/json"
	"fmt"
	"strconv"

	"go-file-upload-export/internal/dto"
	"go-file-upload-export/internal/models"
	"go-file-upload-export/internal/services"
	"go-file-upload-export/internal/utils"
	"go-file-upload-export/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service      Service
	excelService *services.ExcelService
	pdfService   *services.PDFService
}

func NewHandler(service Service) *Handler {
	return &Handler{
		service:      service,
		excelService: services.NewExcelService(),
		pdfService:   services.NewPDFService(),
	}
}

// CreateProduct dengan image dan documents upload
func (h *Handler) CreateProduct(c *fiber.Ctx) error {
	// Parse form data
	var req dto.CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// === Upload Image ===
	imageFile, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Image is required",
		})
	}

	// Validate image
	maxImageSize := int64(5 * 1024 * 1024) // 5MB
	if err := utils.ValidateFile(imageFile, utils.AllowedImageTypes, maxImageSize); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Image validation failed: %v", err),
		})
	}

	// Save image
	uploadPath := utils.GetUploadPath()
	imagePath, err := utils.SaveUploadedFile(imageFile, uploadPath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to save image: %v", err),
		})
	}

	// Process image (create variants)
	imagePaths, err := utils.ProcessImage(imagePath, []utils.ImageVariant{
		utils.ThumbnailVariant,
		utils.MediumVariant,
	})
	if err != nil {
		// Rollback: delete uploaded image
		utils.DeleteFile(imagePath)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to process image: %v", err),
		})
	}

	// === Upload Multiple Documents (optional) ===
	var documentPaths []string
	form, err := c.MultipartForm()
	if err == nil {
		files := form.File["documents"]
		maxDocSize := int64(10 * 1024 * 1024) // 10MB

		for _, file := range files {
			// Validate document
			if err := utils.ValidateFile(file, utils.AllowedDocumentTypes, maxDocSize); err != nil {
				// Cleanup uploaded files
				utils.DeleteFile(imagePath)
				for _, path := range imagePaths {
					utils.DeleteFile(path)
				}
				for _, path := range documentPaths {
					utils.DeleteFile(path)
				}
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": fmt.Sprintf("Document validation failed: %v", err),
				})
			}

			// Save document
			docPath, err := utils.SaveUploadedFile(file, uploadPath)
			if err != nil {
				continue // Skip failed uploads
			}
			documentPaths = append(documentPaths, docPath)
		}
	}

	// Create product
	product, err := h.service.CreateProduct(c.Context(), &req, imagePath, imagePaths, documentPaths)
	if err != nil {
		// Cleanup files
		utils.DeleteFile(imagePath)
		for _, path := range imagePaths {
			utils.DeleteFile(path)
		}
		for _, path := range documentPaths {
			utils.DeleteFile(path)
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return response.JSON(c, fiber.StatusCreated, product)
}

// GetProduct by ID
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

// ListProducts
func (h *Handler) ListProducts(c *fiber.Ctx) error {
	products, err := h.service.ListProducts(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return response.JSON(c, fiber.StatusOK, products)
}

// DeleteProduct
func (h *Handler) DeleteProduct(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
		})
	}

	if err := h.service.DeleteProduct(c.Context(), uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return response.JSON(c, fiber.StatusOK, fiber.Map{
		"message": "Product deleted successfully",
	})
}

// CONTINUE TO PART 2...
```

---

### Step 11: Handler Layer (PART 2 - Export)

```go
// internal/product/handler.go (continuation)

// ExportExcel export products ke Excel
func (h *Handler) ExportExcel(c *fiber.Ctx) error {
	// Get all products
	productsDTO, err := h.service.ListProducts(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get products",
		})
	}

	// Convert to models (for export)
	var products []models.Product
	for _, p := range productsDTO {
		var docs []byte
		if len(p.Documents) > 0 {
			docs, _ = json.Marshal(p.Documents)
		}
		products = append(products, models.Product{
			ID:          p.ID,
			Name:        p.Name,
			Description: p.Description,
			Price:       p.Price,
			Stock:       p.Stock,
			Category:    p.Category,
			Documents:   string(docs),
		})
	}

	// Generate Excel
	excelFile, err := h.excelService.ExportProducts(products)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate Excel",
		})
	}

	// Set headers
	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=products.xlsx")

	// Write to response
	return excelFile.Write(c.Response().BodyWriter())
}

// ExportExcelMultiSheet export dengan multiple sheets
func (h *Handler) ExportExcelMultiSheet(c *fiber.Ctx) error {
	productsDTO, err := h.service.ListProducts(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get products",
		})
	}

	var products []models.Product
	for _, p := range productsDTO {
		products = append(products, models.Product{
			ID:       p.ID,
			Name:     p.Name,
			Price:    p.Price,
			Stock:    p.Stock,
			Category: p.Category,
		})
	}

	excelFile, err := h.excelService.ExportProductsMultiSheet(products)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate Excel",
		})
	}

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=products_by_category.xlsx")

	return excelFile.Write(c.Response().BodyWriter())
}

// ExportPDF export products ke PDF
func (h *Handler) ExportPDF(c *fiber.Ctx) error {
	productsDTO, err := h.service.ListProducts(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get products",
		})
	}

	var products []models.Product
	for _, p := range productsDTO {
		products = append(products, models.Product{
			ID:       p.ID,
			Name:     p.Name,
			Price:    p.Price,
			Stock:    p.Stock,
			Category: p.Category,
		})
	}

	pdf, err := h.pdfService.ExportProductsWithHeader(products)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate PDF",
		})
	}

	// Set headers
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "attachment; filename=products.pdf")

	// Write PDF
	return pdf.Output(c.Response().BodyWriter())
}

// DownloadFile serve uploaded file
func (h *Handler) DownloadFile(c *fiber.Ctx) error {
	// Get filepath from query
	filepath := c.Query("path")
	if filepath == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "File path is required",
		})
	}

	// Security: validate path (prevent directory traversal)
	// In production, implement proper validation

	return c.SendFile(filepath)
}
```

---

### Step 12: Main Application

```go
// main.go
package main

import (
	"fmt"
	"log"

	"go-file-upload-export/internal/models"
	"go-file-upload-export/internal/product"
	"go-file-upload-export/pkg/response"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormLogger "gorm.io/gorm/logger"
)

func main() {
	// Connect database
	dsn := "host=localhost user=postgres password=postgres dbname=go_file_db port=5432 sslmode=disable"
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

	// Create Fiber app
	app := fiber.New(fiber.Config{
		BodyLimit: 10 * 1024 * 1024, // 10MB max body size
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// Serve static files (uploaded files)
	app.Static("/uploads", "./uploads")

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
	api := app.Group("/api/v1")
	products := api.Group("/products")

	// CRUD
	products.Post("/", productHandler.CreateProduct)
	products.Get("/", productHandler.ListProducts)
	products.Get("/:id", productHandler.GetProduct)
	products.Delete("/:id", productHandler.DeleteProduct)

	// Export
	products.Get("/export/excel", productHandler.ExportExcel)
	products.Get("/export/excel-multisheet", productHandler.ExportExcelMultiSheet)
	products.Get("/export/pdf", productHandler.ExportPDF)

	// Download file
	api.Get("/download", productHandler.DownloadFile)
}
```

---

### Step 13: Response Helper

```go
// pkg/response/response.go
package response

import (
	"github.com/gofiber/fiber/v2"
)

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
}

func JSON(c *fiber.Ctx, status int, data interface{}) error {
	return c.Status(status).JSON(SuccessResponse{
		Success: true,
		Data:    data,
	})
}
```

---

### Step 14: Cloud Storage Concept (MinIO/S3)

```go
// internal/services/storage.go (KONSEP - tidak dipakai di main)
package services

import (
	"context"
	"fmt"
	"io"
	"path/filepath"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// StorageService handle cloud storage operations
type StorageService struct {
	client     *minio.Client
	bucketName string
	baseURL    string
}

// NewStorageService create storage service
func NewStorageService(endpoint, accessKey, secretKey, bucketName, baseURL string, useSSL bool) (*StorageService, error) {
	// Initialize MinIO client
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create minio client: %w", err)
	}

	return &StorageService{
		client:     client,
		bucketName: bucketName,
		baseURL:    baseURL,
	}, nil
}

// UploadFile upload file ke S3/MinIO
func (s *StorageService) UploadFile(ctx context.Context, filename string, reader io.Reader, size int64, contentType string) (string, error) {
	// Upload ke bucket
	_, err := s.client.PutObject(ctx, s.bucketName, filename, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload file: %w", err)
	}

	// Return public URL
	url := fmt.Sprintf("%s/%s/%s", s.baseURL, s.bucketName, filename)
	return url, nil
}

// DeleteFile delete file dari S3/MinIO
func (s *StorageService) DeleteFile(ctx context.Context, filename string) error {
	return s.client.RemoveObject(ctx, s.bucketName, filename, minio.RemoveObjectOptions{})
}

// GetPresignedURL get temporary download URL (for private files)
func (s *StorageService) GetPresignedURL(ctx context.Context, filename string, expiry int) (string, error) {
	// Generate presigned URL (valid for expiry seconds)
	url, err := s.client.PresignedGetObject(ctx, s.bucketName, filename, expiry, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return url.String(), nil
}

// Example usage:
/*
storageService, _ := NewStorageService(
	"play.min.io:9000",     // MinIO endpoint
	"minioadmin",           // Access key
	"minioadmin",           // Secret key
	"uploads",              // Bucket name
	"https://cdn.example.com", // Base URL
	true,                   // Use SSL
)

// Upload file
file, _ := os.Open("image.jpg")
defer file.Close()

stat, _ := file.Stat()
url, err := storageService.UploadFile(
	context.Background(),
	"products/image.jpg",
	file,
	stat.Size(),
	"image/jpeg",
)

// Delete file
err = storageService.DeleteFile(context.Background(), "products/image.jpg")

// Get presigned URL (for private files)
downloadURL, err := storageService.GetPresignedURL(
	context.Background(),
	"products/image.jpg",
	3600, // 1 hour
)
*/
```

**Penjelasan**:
- **MinIO**: S3-compatible object storage (bisa self-hosted atau pakai cloud)
- **Presigned URL**: Temporary URL untuk download private files
- **CDN**: Base URL bisa pakai CloudFront, CloudFlare, dll

---

## ❌ Common Mistakes + Fix

### 1. **Gak Validate File Type**

❌ **Salah**:
```go
// Langsung save tanpa validasi
c.SaveFile(file, "./uploads/"+file.Filename)
```

✅ **Benar**:
```go
// Validate MIME type dan extension
if err := utils.ValidateFile(file, allowedTypes, maxSize); err != nil {
    return err
}
```

**Solusi**: Selalu validate MIME type DAN extension. User bisa rename `virus.exe` jadi `virus.jpg`.

---

### 2. **Pakai Original Filename**

❌ **Salah**:
```go
// File bisa overwrite atau path traversal attack
filename := file.Filename // "../../etc/passwd"
```

✅ **Benar**:
```go
// Generate unique filename
filename := uuid.New().String() + filepath.Ext(file.Filename)
```

**Solusi**: Generate unique filename dengan UUID.

---

### 3. **Lupa Cleanup Files Saat Error**

❌ **Salah**:
```go
// Upload image
imagePath, _ := SaveFile(imageFile)

// Error di sini
if err := CreateProduct(); err != nil {
    return err // Image sudah kesimpan, tapi product gak jadi
}
```

✅ **Benar**:
```go
imagePath, _ := SaveFile(imageFile)

if err := CreateProduct(); err != nil {
    utils.DeleteFile(imagePath) // Cleanup
    return err
}
```

**Solusi**: Cleanup uploaded files kalau terjadi error di middle of process.

---

### 4. **Gak Set Content-Type untuk Download**

❌ **Salah**:
```go
// Browser gak tau file type apa
return c.SendFile("file.pdf")
```

✅ **Benar**:
```go
c.Set("Content-Type", "application/pdf")
c.Set("Content-Disposition", "attachment; filename=report.pdf")
return c.SendFile("file.pdf")
```

**Solusi**: Set proper Content-Type dan Content-Disposition.

---

### 5. **Excel/PDF Gak Di-stream Langsung**

❌ **Salah**:
```go
// Save ke file dulu, baru serve
pdf.OutputFileAndClose("temp.pdf")
return c.SendFile("temp.pdf")
```

✅ **Benar**:
```go
// Stream langsung ke response
c.Set("Content-Type", "application/pdf")
return pdf.Output(c.Response().BodyWriter())
```

**Solusi**: Stream langsung ke response, gak perlu save temporary file.

---

### 6. **Body Limit Terlalu Kecil**

❌ **Salah**:
```go
// Default Fiber body limit 4MB
app := fiber.New()
// User upload file 5MB → error
```

✅ **Benar**:
```go
app := fiber.New(fiber.Config{
    BodyLimit: 10 * 1024 * 1024, // 10MB
})
```

**Solusi**: Set body limit sesuai kebutuhan.

---

### 7. **Image Processing Blocking**

❌ **Salah**:
```go
// Process di main goroutine (blocking)
imagePaths, _ := utils.ProcessImage(imagePath, variants)
// User nunggu lama
```

✅ **Benar**:
```go
// Process async (untuk large images)
go func() {
    imagePaths, _ := utils.ProcessImage(imagePath, variants)
    // Update database dengan image paths
}()
// Return response immediately
```

**Solusi**: Process image async untuk non-blocking response.

---

### 8. **Serve Files Tanpa Security Check**

❌ **Salah**:
```go
// Serve any file yang user minta
filepath := c.Query("path")
return c.SendFile(filepath) // User bisa request "/etc/passwd"
```

✅ **Benar**:
```go
// Validate path
if !strings.HasPrefix(filepath, "uploads/") {
    return errors.New("invalid path")
}
// Check file exists
if _, err := os.Stat(filepath); os.IsNotExist(err) {
    return errors.New("file not found")
}
return c.SendFile(filepath)
```

**Solusi**: Validate path untuk prevent directory traversal.

---

## ✅ Checklist Akhir

### Testing File Upload

**1. Single Image Upload**
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -F "name=Test Product" \
  -F "description=Test Description" \
  -F "price=100000" \
  -F "stock=10" \
  -F "category=electronics" \
  -F "image=@path/to/image.jpg"

# Expected: 201 Created
# Response includes:
# - image: full size URL
# - image_thumbnail: thumbnail URL
# - image_medium: medium size URL
```

**2. Multiple Documents Upload**
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -F "name=Product with Docs" \
  -F "price=100000" \
  -F "stock=10" \
  -F "category=books" \
  -F "image=@image.jpg" \
  -F "documents=@doc1.pdf" \
  -F "documents=@doc2.pdf"

# Expected: documents array in response
```

**3. Invalid File Type**
```bash
curl -X POST http://localhost:3000/api/v1/products \
  -F "name=Test" \
  -F "price=100000" \
  -F "stock=10" \
  -F "category=electronics" \
  -F "image=@script.exe"

# Expected: 400 Bad Request
# Error: "file type application/x-msdownload is not allowed"
```

**4. File Too Large**
```bash
# Upload file > 5MB
curl -X POST http://localhost:3000/api/v1/products \
  -F "name=Test" \
  -F "price=100000" \
  -F "stock=10" \
  -F "category=electronics" \
  -F "image=@large_image.jpg"

# Expected: 400 Bad Request
# Error: "file size exceeds maximum allowed size"
```

---

### Testing File Serve

**5. Access Uploaded Image**
```bash
# Get image URL from create response
curl http://localhost:3000/uploads/2026/02/uuid.jpg

# Expected: Image file
```

**6. Access Thumbnail**
```bash
curl http://localhost:3000/uploads/2026/02/uuid_thumbnail.jpg

# Expected: Smaller image (150x150)
```

---

### Testing Excel Export

**7. Export to Excel**
```bash
curl http://localhost:3000/api/v1/products/export/excel \
  -o products.xlsx

# Expected: Excel file downloaded
# Open in Excel/LibreOffice:
# - Header row bold dengan background color
# - First row frozen
# - Auto column width
```

**8. Export Multi-Sheet**
```bash
curl http://localhost:3000/api/v1/products/export/excel-multisheet \
  -o products_multisheet.xlsx

# Expected: Excel dengan multiple sheets (per category)
```

---

### Testing PDF Export

**9. Export to PDF**
```bash
curl http://localhost:3000/api/v1/products/export/pdf \
  -o products.pdf

# Expected: PDF file downloaded
# Check:
# - Header pada setiap page
# - Footer dengan page number
# - Table dengan zebra striping
# - Summary section
```

---

### Testing File Deletion

**10. Delete Product (dengan files)**
```bash
# Create product
PRODUCT_ID=$(curl -X POST http://localhost:3000/api/v1/products \
  -F "name=To Delete" \
  -F "price=100000" \
  -F "stock=10" \
  -F "category=electronics" \
  -F "image=@image.jpg" \
  | jq -r '.data.id')

# Delete product
curl -X DELETE http://localhost:3000/api/v1/products/$PRODUCT_ID

# Expected: 200 OK
# Files harus terhapus dari uploads/ folder
```

---

### Folder Structure Check

```bash
# Check uploads folder structure
tree uploads/

# Expected:
# uploads/
# ├── 2026/
# │   └── 02/
# │       ├── uuid1.jpg
# │       ├── uuid1_thumbnail.jpg
# │       ├── uuid1_medium.jpg
# │       ├── uuid2.pdf
# │       └── ...
```

---

### Database Check

```sql
-- Check products with files
SELECT id, name, image, image_thumbnail, image_medium, documents 
FROM products;

-- Check file paths consistency
SELECT id, name, 
  CASE WHEN image IS NOT NULL THEN 'Yes' ELSE 'No' END as has_image,
  CASE WHEN image_thumbnail IS NOT NULL THEN 'Yes' ELSE 'No' END as has_thumbnail
FROM products;
```

---

## 💭 Ide Pengembangan Mandiri

### 1. **Async Image Processing dengan Queue**
```go
// Pakai Redis Queue atau RabbitMQ
type ImageProcessJob struct {
    ProductID uint
    ImagePath string
}

// Worker process images in background
func ProcessImagesWorker() {
    for job := range imageQueue {
        variants, _ := utils.ProcessImage(job.ImagePath, allVariants)
        // Update database
    }
}
```

---

### 2. **Image Watermark**
```go
// Add watermark ke uploaded images
func AddWatermark(imagePath, watermarkPath string) error {
    img := imaging.Open(imagePath)
    watermark := imaging.Open(watermarkPath)
    
    // Overlay watermark
    result := imaging.Overlay(img, watermark, image.Pt(10, 10), 0.5)
    
    return imaging.Save(result, imagePath)
}
```

---

### 3. **Virus Scan untuk Uploaded Files**
```go
// Integrate dengan ClamAV
import "github.com/dutchcoders/go-clamd"

func ScanFile(filePath string) error {
    c := clamd.NewClamd("/var/run/clamav/clamd.sock")
    
    response, err := c.ScanFile(filePath)
    if err != nil {
        return err
    }
    
    if response.Status == clamd.RES_FOUND {
        return errors.New("virus detected: " + response.Description)
    }
    
    return nil
}
```

---

### 4. **Automatic Image Optimization**
```go
// Auto convert to WebP untuk web
func OptimizeForWeb(imagePath string) (string, error) {
    // Convert ke WebP
    webpPath := strings.TrimSuffix(imagePath, filepath.Ext(imagePath)) + ".webp"
    
    img := imaging.Open(imagePath)
    // Save as WebP with quality 80
    imaging.Save(img, webpPath)
    
    return webpPath, nil
}
```

---

### 5. **Excel Template-Based Export**
```go
// Load existing template Excel
func ExportWithTemplate(products []Product) (*excelize.File, error) {
    f, err := excelize.OpenFile("template.xlsx")
    if err != nil {
        return nil, err
    }
    
    // Fill data starting from row 2
    for i, p := range products {
        row := i + 2
        f.SetCellValue("Sheet1", fmt.Sprintf("A%d", row), p.Name)
        f.SetCellValue("Sheet1", fmt.Sprintf("B%d", row), p.Price)
    }
    
    return f, nil
}
```

---

### 6. **PDF dengan Chart/Graph**
```go
// Include chart in PDF
import "github.com/wcharczuk/go-chart/v2"

func ExportPDFWithChart(products []Product) {
    // Generate chart image
    graph := chart.BarChart{
        Title: "Products by Category",
        // ... data
    }
    
    // Save chart as image
    f, _ := os.Create("chart.png")
    graph.Render(chart.PNG, f)
    f.Close()
    
    // Include in PDF
    pdf := gofpdf.New("P", "mm", "A4", "")
    pdf.AddPage()
    pdf.Image("chart.png", 10, 10, 190, 0, false, "", 0, "")
}
```

---

### 7. **Signed URLs untuk Private Files**
```go
// Generate signed URL dengan expiry
func GenerateSignedURL(filePath string, expiryHours int) (string, error) {
    // Create HMAC signature
    h := hmac.New(sha256.New, []byte(secretKey))
    expiry := time.Now().Add(time.Hour * time.Duration(expiryHours))
    
    data := fmt.Sprintf("%s|%d", filePath, expiry.Unix())
    h.Write([]byte(data))
    signature := hex.EncodeToString(h.Sum(nil))
    
    url := fmt.Sprintf("/download?path=%s&expires=%d&signature=%s", 
        filePath, expiry.Unix(), signature)
    
    return url, nil
}
```

---

### 8. **Bulk Upload menggunakan ZIP**
```go
// Upload ZIP, extract, process each file
func HandleBulkUpload(zipFile *multipart.FileHeader) error {
    // Unzip
    files := UnzipFile(zipFile)
    
    for _, file := range files {
        // Validate dan process each file
        if IsImage(file) {
            ProcessImage(file)
        }
    }
    
    return nil
}
```

---

### 9. **Image CDN Integration**
```go
// Upload ke ImageKit, Cloudinary, dll
func UploadToCDN(imagePath string) (string, error) {
    // Cloudinary example
    cld, _ := cloudinary.NewFromParams(cloudName, apiKey, apiSecret)
    
    result, err := cld.Upload.Upload(
        context.Background(),
        imagePath,
        uploader.UploadParams{},
    )
    
    return result.SecureURL, err
}
```

---

### 10. **Export Scheduling (Cron Job)**
```go
// Auto generate monthly report
func ScheduleMonthlyReport() {
    c := cron.New()
    
    c.AddFunc("0 0 1 * *", func() { // Every 1st of month
        products := GetAllProducts()
        pdf, _ := GenerateReport(products)
        
        // Send via email
        SendEmail("report@company.com", "Monthly Report", pdf)
    })
    
    c.Start()
}
```

---

## 🎓 Poin Penting yang Harus Diingat

### File Upload
- Selalu validate: MIME type, extension, size
- Generate unique filename (UUID)
- Organized folder structure (year/month)
- Cleanup files on error
- Set proper body limit

### Image Processing
- Resize untuk multiple variants (thumbnail, medium, large)
- Optimize quality (JPEG: 85, PNG: level 6)
- Process async untuk large images
- Consider WebP format untuk web

### File Security
- Whitelist MIME types
- Validate extension matches content type
- Prevent directory traversal (path validation)
- Scan for virus (production)
- Use signed URLs untuk private files

### Export Excel
- Style header (bold, background color)
- Freeze first row
- Auto column width
- Use formula untuk calculation
- Multiple sheets untuk grouping

### Export PDF
- Set proper font dan page size
- Header & footer untuk consistency
- Table dengan zebra striping
- Truncate long text
- Summary section

### Response Headers
- Content-Type: application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Content-Disposition: attachment; filename=file.ext
- Stream langsung ke response (gak perlu temp file)

### Cloud Storage
- S3/MinIO untuk scalability
- Presigned URL untuk temporary access
- CDN untuk faster delivery
- Lifecycle policy untuk auto cleanup

---

Selamat belajar! Dengan file handling yang proper, aplikasi kamu bisa handle upload, processing, dan export dengan aman dan efficient. 🚀

Ada yang mau ditanyakan?
