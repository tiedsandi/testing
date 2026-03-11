package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/yourusername/url-shortener/internal/config"
	"github.com/yourusername/url-shortener/internal/database"
	"github.com/yourusername/url-shortener/internal/handler"
	"github.com/yourusername/url-shortener/internal/middleware"
	"github.com/yourusername/url-shortener/internal/repository"
	"github.com/yourusername/url-shortener/internal/service"
)

func main() {
	// Setup logger
	setupLogger()

	log.Info().Msg("🚀 Starting URL Shortener API...")

	// Load config
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load config")
	}

	// Connect database
	db, err := database.NewPostgresDB(&cfg.Database)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect database")
	}

	// Setup layers (Dependency Injection)
	shortURLRepo := repository.NewShortURLRepository(db)
	shortURLService := service.NewShortURLService(shortURLRepo)
	shortURLHandler := handler.NewShortURLHandler(shortURLService)

	// Setup Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "URL Shortener API",
		ErrorHandler: customErrorHandler,
	})

	// Global middleware
	app.Use(cors.New())
	app.Use(middleware.RequestID())
	app.Use(middleware.Logger())
	app.Use(middleware.Recovery())

	// Routes
	setupRoutes(app, shortURLHandler)

	// Graceful shutdown
	go func() {
		port := fmt.Sprintf(":%s", cfg.App.Port)
		log.Info().Msgf("🎧 Server listening on http://localhost%s", port)
		if err := app.Listen(port); err != nil {
			log.Fatal().Err(err).Msg("Failed to start server")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Info().Msg("🛑 Shutting down server...")

	// Shutdown with timeout
	if err := app.ShutdownWithTimeout(30 * time.Second); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown")
	}

	// Close database
	sqlDB, _ := db.DB()
	if sqlDB != nil {
		sqlDB.Close()
	}

	log.Info().Msg("✅ Server shutdown complete")
}

func setupLogger() {
	// Console writer untuk development
	output := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339}
	log.Logger = zerolog.New(output).With().Timestamp().Caller().Logger()

	// Set level
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
}

func setupRoutes(app *fiber.App, h *handler.ShortURLHandler) {
	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"time":   time.Now(),
		})
	})

	// API routes
	api := app.Group("/api")
	{
		urls := api.Group("/urls")
		{
			urls.Post("/", h.CreateShortURL)      // Create
			urls.Get("/", h.GetAllURLs)           // List all
			urls.Get("/:id", h.GetURLByID)        // Get by ID
			urls.Put("/:id", h.UpdateURL)         // Update
			urls.Delete("/:id", h.DeleteURL)      // Delete
		}
	}

	// Redirect route (public, short path)
	app.Get("/r/:short_code", h.RedirectToOriginal)
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "Internal Server Error"

	// Check Fiber error
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	}

	log.Error().
		Err(err).
		Int("status", code).
		Str("path", c.Path()).
		Msg("Error handled")

	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   message,
		"code":    "ERROR",
	})
}
