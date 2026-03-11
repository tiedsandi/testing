package entity

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ShortURL adalah entity untuk menyimpan URL shortener
type ShortURL struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	OriginalURL string         `gorm:"type:text;not null" json:"original_url"`
	ShortCode   string         `gorm:"type:varchar(6);uniqueIndex;not null" json:"short_code"`
	ClickCount  int            `gorm:"default:0;not null" json:"click_count"`
	IsActive    bool           `gorm:"default:true;not null;index" json:"is_active"`
	CreatedAt   time.Time      `gorm:"index" json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete
}

// TableName override nama tabel
func (ShortURL) TableName() string {
	return "short_urls"
}

// BeforeCreate hook untuk set ID
func (s *ShortURL) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}
