package database

import (
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/yourusername/url-shortener/internal/config"
	"github.com/yourusername/url-shortener/internal/entity"
)

// NewPostgresDB membuat koneksi ke PostgreSQL
func NewPostgresDB(cfg *config.DatabaseConfig) (*gorm.DB, error) {
	dsn := cfg.DSN()

	// GORM logger config
	gormLogger := logger.Default
	if cfg.SSLMode == "disable" {
		gormLogger = logger.Default.LogMode(logger.Info) // development
	} else {
		gormLogger = logger.Default.LogMode(logger.Silent) // production
	}

	// Connect
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	// Get underlying *sql.DB
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Connection pooling
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Test connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info().Msg("✅ Database connected successfully")

	// Auto migrate
	if err := autoMigrate(db); err != nil {
		return nil, err
	}

	return db, nil
}

// autoMigrate menjalankan migrasi schema
func autoMigrate(db *gorm.DB) error {
	log.Info().Msg("Running database migrations...")

	if err := db.AutoMigrate(
		&entity.ShortURL{},
		// Tambahkan entity lain di sini nanti
	); err != nil {
		return fmt.Errorf("failed to migrate: %w", err)
	}

	log.Info().Msg("✅ Database migrations completed")
	return nil
}
