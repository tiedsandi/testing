package service

import (
	"crypto/rand"
	"errors"
	"math/big"
	"net/url"

	"github.com/rs/zerolog/log"

	"github.com/yourusername/url-shortener/internal/apperror"
	"github.com/yourusername/url-shortener/internal/entity"
	"github.com/yourusername/url-shortener/internal/repository"
)

// ShortURLService interface untuk business logic
type ShortURLService interface {
	CreateShortURL(originalURL string) (*entity.ShortURL, error)
	GetAllURLs() ([]entity.ShortURL, error)
	GetURLByID(id string) (*entity.ShortURL, error)
	GetURLByShortCode(shortCode string) (*entity.ShortURL, error)
	UpdateURL(id string, originalURL *string, isActive *bool) (*entity.ShortURL, error)
	DeleteURL(id string) error
	RedirectAndCount(shortCode string) (string, error)
}

type shortURLService struct {
	repo repository.ShortURLRepository
}

// NewShortURLService membuat instance service
func NewShortURLService(repo repository.ShortURLRepository) ShortURLService {
	return &shortURLService{repo: repo}
}

// CreateShortURL membuat short URL baru dengan generate short_code otomatis
func (s *shortURLService) CreateShortURL(originalURL string) (*entity.ShortURL, error) {
	// Validasi URL
	if !isValidURL(originalURL) {
		return nil, apperror.NewBadRequestError("invalid URL format")
	}

	// Generate short code yang unik
	shortCode, err := s.generateUniqueShortCode()
	if err != nil {
		log.Error().Err(err).Msg("Failed to generate short code")
		return nil, apperror.NewInternalError("failed to generate short code")
	}

	// Buat entity
	shortURL := &entity.ShortURL{
		OriginalURL: originalURL,
		ShortCode:   shortCode,
		ClickCount:  0,
		IsActive:    true,
	}

	// Save ke database
	if err := s.repo.Create(shortURL); err != nil {
		log.Error().Err(err).Msg("Failed to create short URL")
		return nil, apperror.NewInternalError("failed to create short URL")
	}

	log.Info().
		Str("short_code", shortCode).
		Str("original_url", originalURL).
		Msg("Short URL created")

	return shortURL, nil
}

// GetAllURLs mengambil semua URLs
func (s *shortURLService) GetAllURLs() ([]entity.ShortURL, error) {
	urls, err := s.repo.FindAll()
	if err != nil {
		log.Error().Err(err).Msg("Failed to get all URLs")
		return nil, apperror.NewInternalError("failed to get URLs")
	}
	return urls, nil
}

// GetURLByID mengambil URL by ID
func (s *shortURLService) GetURLByID(id string) (*entity.ShortURL, error) {
	url, err := s.repo.FindByID(id)
	if err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to get URL by ID")
		return nil, apperror.NewInternalError("failed to get URL")
	}
	if url == nil {
		return nil, apperror.NewNotFoundError("URL not found")
	}
	return url, nil
}

// GetURLByShortCode mengambil URL by short_code
func (s *shortURLService) GetURLByShortCode(shortCode string) (*entity.ShortURL, error) {
	url, err := s.repo.FindByShortCode(shortCode)
	if err != nil {
		log.Error().Err(err).Str("short_code", shortCode).Msg("Failed to get URL by short code")
		return nil, apperror.NewInternalError("failed to get URL")
	}
	if url == nil {
		return nil, apperror.NewNotFoundError("short URL not found")
	}
	return url, nil
}

// UpdateURL mengupdate original_url atau is_active
func (s *shortURLService) UpdateURL(id string, originalURL *string, isActive *bool) (*entity.ShortURL, error) {
	// Get existing URL
	url, err := s.repo.FindByID(id)
	if err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to get URL")
		return nil, apperror.NewInternalError("failed to get URL")
	}
	if url == nil {
		return nil, apperror.NewNotFoundError("URL not found")
	}

	// Update fields
	if originalURL != nil {
		if !isValidURL(*originalURL) {
			return nil, apperror.NewBadRequestError("invalid URL format")
		}
		url.OriginalURL = *originalURL
	}
	if isActive != nil {
		url.IsActive = *isActive
	}

	// Save
	if err := s.repo.Update(url); err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to update URL")
		return nil, apperror.NewInternalError("failed to update URL")
	}

	log.Info().Str("id", id).Msg("URL updated")
	return url, nil
}

// DeleteURL soft delete URL
func (s *shortURLService) DeleteURL(id string) error {
	// Check existence
	url, err := s.repo.FindByID(id)
	if err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to get URL")
		return apperror.NewInternalError("failed to get URL")
	}
	if url == nil {
		return apperror.NewNotFoundError("URL not found")
	}

	// Delete
	if err := s.repo.Delete(id); err != nil {
		log.Error().Err(err).Str("id", id).Msg("Failed to delete URL")
		return apperror.NewInternalError("failed to delete URL")
	}

	log.Info().Str("id", id).Msg("URL deleted")
	return nil
}

// RedirectAndCount mendapatkan original URL dan increment click count
func (s *shortURLService) RedirectAndCount(shortCode string) (string, error) {
	// Get URL
	url, err := s.repo.FindByShortCode(shortCode)
	if err != nil {
		log.Error().Err(err).Str("short_code", shortCode).Msg("Failed to get URL")
		return "", apperror.NewInternalError("failed to get URL")
	}
	if url == nil {
		return "", apperror.NewNotFoundError("short URL not found")
	}

	// Check if active
	if !url.IsActive {
		return "", apperror.NewGoneError("this short URL is no longer active")
	}

	// Increment click count (atomic)
	if err := s.repo.IncrementClickCount(shortCode); err != nil {
		// Log error tapi tetap redirect (jangan fail karena counter)
		log.Error().Err(err).Str("short_code", shortCode).Msg("Failed to increment click count")
	}

	log.Info().
		Str("short_code", shortCode).
		Str("original_url", url.OriginalURL).
		Msg("Redirecting")

	return url.OriginalURL, nil
}

// generateUniqueShortCode generate random 6-char code yang unik
func (s *shortURLService) generateUniqueShortCode() (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const codeLength = 6
	const maxRetries = 10

	for i := 0; i < maxRetries; i++ {
		code := make([]byte, codeLength)
		for j := 0; j < codeLength; j++ {
			num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
			if err != nil {
				return "", err
			}
			code[j] = charset[num.Int64()]
		}

		shortCode := string(code)

		// Check uniqueness
		exists, err := s.repo.IsShortCodeExists(shortCode)
		if err != nil {
			return "", err
		}
		if !exists {
			return shortCode, nil
		}

		// Collision, retry
		log.Warn().Str("short_code", shortCode).Msg("Short code collision, retrying")
	}

	return "", errors.New("failed to generate unique short code after max retries")
}

// isValidURL validasi format URL
func isValidURL(str string) bool {
	u, err := url.ParseRequestURI(str)
	if err != nil {
		return false
	}
	return u.Scheme != "" && u.Host != ""
}
