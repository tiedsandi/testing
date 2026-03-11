package handler

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"

	"github.com/yourusername/url-shortener/internal/apperror"
	"github.com/yourusername/url-shortener/internal/service"
)

// ShortURLHandler handles HTTP requests
type ShortURLHandler struct {
	service  service.ShortURLService
	validate *validator.Validate
}

// NewShortURLHandler membuat instance handler
func NewShortURLHandler(service service.ShortURLService) *ShortURLHandler {
	return &ShortURLHandler{
		service:  service,
		validate: validator.New(),
	}
}

// Request DTOs

type CreateShortURLRequest struct {
	OriginalURL string `json:"original_url" validate:"required,url"`
}

type UpdateShortURLRequest struct {
	OriginalURL *string `json:"original_url,omitempty" validate:"omitempty,url"`
	IsActive    *bool   `json:"is_active,omitempty"`
}

// Response DTOs

type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
}

// CreateShortURL creates a new short URL
// POST /api/urls
func (h *ShortURLHandler) CreateShortURL(c *fiber.Ctx) error {
	var req CreateShortURLRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	// Validation
	if err := h.validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	// Call service
	url, err := h.service.CreateShortURL(req.OriginalURL)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Success: true,
		Data:    url,
	})
}

// GetAllURLs retrieves all short URLs
// GET /api/urls
func (h *ShortURLHandler) GetAllURLs(c *fiber.Ctx) error {
	urls, err := h.service.GetAllURLs()
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    urls,
	})
}

// GetURLByID retrieves URL by ID
// GET /api/urls/:id
func (h *ShortURLHandler) GetURLByID(c *fiber.Ctx) error {
	id := c.Params("id")

	url, err := h.service.GetURLByID(id)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    url,
	})
}

// UpdateURL updates a short URL
// PUT /api/urls/:id
func (h *ShortURLHandler) UpdateURL(c *fiber.Ctx) error {
	id := c.Params("id")

	var req UpdateShortURLRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   "invalid request body",
			Code:    "BAD_REQUEST",
		})
	}

	// Validation
	if err := h.validate.Struct(&req); err != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(apperror.ErrorResponse{
			Success: false,
			Error:   err.Error(),
			Code:    "VALIDATION_ERROR",
		})
	}

	// Call service
	url, err := h.service.UpdateURL(id, req.OriginalURL, req.IsActive)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    url,
	})
}

// DeleteURL soft deletes a URL
// DELETE /api/urls/:id
func (h *ShortURLHandler) DeleteURL(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := h.service.DeleteURL(id); err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	return c.JSON(SuccessResponse{
		Success: true,
		Data:    fiber.Map{"message": "URL deleted successfully"},
	})
}

// RedirectToOriginal redirects to original URL and increments click count
// GET /r/:short_code
func (h *ShortURLHandler) RedirectToOriginal(c *fiber.Ctx) error {
	shortCode := c.Params("short_code")

	originalURL, err := h.service.RedirectAndCount(shortCode)
	if err != nil {
		statusCode, errResp := apperror.HandleError(err)
		return c.Status(statusCode).JSON(errResp)
	}

	// Redirect dengan 302 Found (temporary redirect)
	return c.Redirect(originalURL, fiber.StatusFound)
}
