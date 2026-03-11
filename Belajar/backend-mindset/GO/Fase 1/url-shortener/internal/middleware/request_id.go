package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// RequestID middleware menambahkan unique request ID ke setiap request
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check if request ID already exists
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Set request ID di header response
		c.Set("X-Request-ID", requestID)

		// Store di locals untuk diakses handler lain
		c.Locals("requestID", requestID)

		return c.Next()
	}
}
