package middleware

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

// Logger middleware untuk log setiap request
func Logger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Process request
		err := c.Next()

		// Log after request
		duration := time.Since(start)
		
		// Get request ID with type assertion safety
		requestID := ""
		if rid, ok := c.Locals("requestID").(string); ok {
			requestID = rid
		}

		logEvent := log.Info().
			Str("request_id", requestID).
			Str("method", c.Method()).
			Str("path", c.Path()).
			Int("status", c.Response().StatusCode()).
			Dur("duration_ms", duration).
			Str("ip", c.IP())

		if err != nil {
			logEvent = log.Error().
				Err(err).
				Str("request_id", requestID).
				Str("method", c.Method()).
				Str("path", c.Path()).
				Int("status", c.Response().StatusCode()).
				Dur("duration_ms", duration).
				Str("ip", c.IP())
		}

		logEvent.Msg("Request completed")

		return err
	}
}
