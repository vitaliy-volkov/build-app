package config

import (
	"fmt"
	"log"

	"stroy-control-backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DatabaseConfig is now defined in config.go - this file uses the same type

// GetDSN возвращает строку подключения к базе данных
func (db *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		db.Host, db.Port, db.User, db.Password, db.DBName, db.SSLMode)
}

// Database структура для работы с базой данных
type Database struct {
	DB *gorm.DB
}

// ConnectDatabase устанавливает подключение к базе данных
func ConnectDatabase(cfg *Config) (*Database, error) {
	log.Println("Connecting to PostgreSQL database...")

	// Настройки GORM
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	// Создаем подключение
	db, err := gorm.Open(postgres.Open(cfg.Database.GetDSN()), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Получаем underlying *sql.DB для настройки пула соединений
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB from gorm: %w", err)
	}

	// Настройка пула соединений для production
	sqlDB.SetMaxIdleConns(25)        // Максимальное количество простаивающих соединений
	sqlDB.SetMaxOpenConns(100)       // Максимальное количество открытых соединений
	sqlDB.SetConnMaxLifetime(5 * 60) // Время жизни соединения в секундах (5 минут)

	// Проверяем подключение
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Database connection established successfully")

	// Skip AutoMigrate since we have manual schema migrations
	// if err := setupAutoMigrate(db); err != nil {
	// 	return nil, fmt.Errorf("failed to setup auto migration: %w", err)
	// }

	return &Database{DB: db}, nil
}

// setupAutoMigrate настраивает автоматическую миграцию схемы БД
func setupAutoMigrate(db *gorm.DB) error {
	log.Println("Running database auto-migration...")

	// Используем SQL миграции вместо AutoMigrate для production
	// Для совместимости можно оставить минимальные модели
	err := db.AutoMigrate(
		&models.Company{},
		&models.User{},
		&models.Project{},
	)

	if err != nil {
		return fmt.Errorf("auto migration failed: %w", err)
	}

	log.Println("Database migration completed successfully")
	return nil
}

// Close закрывает соединение с базой данных
func (d *Database) Close() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// GetDB возвращает экземпляр базы данных
func (d *Database) GetDB() *gorm.DB {
	return d.DB
}

// HealthCheck проверяет состояние подключения к базе данных
func (d *Database) HealthCheck() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get sql.DB: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("database health check failed: %w", err)
	}

	return nil
}
