package repository

import (
	"errors"

	"gorm.io/gorm"

	"github.com/yourusername/url-shortener/internal/entity"
)

// ShortURLRepository interface untuk data access
type ShortURLRepository interface {
	Create(shortURL *entity.ShortURL) error
	FindAll() ([]entity.ShortURL, error)
	FindByID(id string) (*entity.ShortURL, error)
	FindByShortCode(shortCode string) (*entity.ShortURL, error)
	Update(shortURL *entity.ShortURL) error
	Delete(id string) error
	IncrementClickCount(shortCode string) error
	IsShortCodeExists(shortCode string) (bool, error)
}

type shortURLRepository struct {
	db *gorm.DB
}

// NewShortURLRepository membuat instance repository
func NewShortURLRepository(db *gorm.DB) ShortURLRepository {
	return &shortURLRepository{db: db}
}

// Create menyimpan short URL baru
func (r *shortURLRepository) Create(shortURL *entity.ShortURL) error {
	return r.db.Create(shortURL).Error
}

// FindAll mengambil semua short URLs (tidak termasuk yang di-soft delete)
func (r *shortURLRepository) FindAll() ([]entity.ShortURL, error) {
	var urls []entity.ShortURL
	err := r.db.Order("created_at DESC").Find(&urls).Error
	return urls, err
}

// FindByID mencari short URL berdasarkan ID
func (r *shortURLRepository) FindByID(id string) (*entity.ShortURL, error) {
	var url entity.ShortURL
	err := r.db.Where("id = ?", id).First(&url).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Return nil jika tidak ditemukan
		}
		return nil, err
	}
	return &url, nil
}

// FindByShortCode mencari short URL berdasarkan short_code
func (r *shortURLRepository) FindByShortCode(shortCode string) (*entity.ShortURL, error) {
	var url entity.ShortURL
	err := r.db.Where("short_code = ?", shortCode).First(&url).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &url, nil
}

// Update mengupdate short URL
func (r *shortURLRepository) Update(shortURL *entity.ShortURL) error {
	return r.db.Save(shortURL).Error
}

// Delete menghapus short URL (soft delete)
func (r *shortURLRepository) Delete(id string) error {
	return r.db.Delete(&entity.ShortURL{}, "id = ?", id).Error
}

// IncrementClickCount increment click_count secara atomic
func (r *shortURLRepository) IncrementClickCount(shortCode string) error {
	return r.db.Model(&entity.ShortURL{}).
		Where("short_code = ?", shortCode).
		Update("click_count", gorm.Expr("click_count + ?", 1)).
		Error
}

// IsShortCodeExists mengecek apakah short_code sudah ada
func (r *shortURLRepository) IsShortCodeExists(shortCode string) (bool, error) {
	var count int64
	err := r.db.Model(&entity.ShortURL{}).
		Where("short_code = ?", shortCode).
		Count(&count).
		Error
	return count > 0, err
}
