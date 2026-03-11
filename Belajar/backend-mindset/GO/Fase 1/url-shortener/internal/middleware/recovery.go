package middleware

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"

	"github.com/yourusername/url-shortener/internal/apperror"
)

// Recovery middleware untuk recover dari panic
func Recovery() fiber.Handler {
	return func(c *fiber.Ctx) error {
		defer func() {
			if r := recover(); r != nil {
				// Get request ID with type assertion safety
				requestID := ""
				if rid, ok := c.Locals("requestID").(string); ok {
					requestID = rid
				}

				log.Error().
					Str("request_id", requestID).
					Interface("panic", r).
					Str("path", c.Path()).
					Msg("Panic recovered")

				err := c.Status(fiber.StatusInternalServerError).JSON(apperror.ErrorResponse{
					Success: false,
					Error:   fmt.Sprintf("internal server error: %v", r),
					Code:    "INTERNAL_ERROR",
				})

				if err != nil {
					log.Error().Err(err).Msg("Failed to send error response")
				}
			}
		}()

		return c.Next()
	}
}
