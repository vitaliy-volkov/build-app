package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"gorm.io/gorm"
)

const migrationTableName = "schema_migrations"

var skippedMigrationFiles = map[string]struct{}{
	"002_test_data.sql":              {},
	"003_supplemental_test_data.sql": {},
	"004_add_payments.sql":           {},
	"005_complete_test_data.sql":     {},
}

// RunMigrations applies SQL migrations in lexical order and skips seed/test-data files by default.
func RunMigrations(db *gorm.DB, dir string) error {
	if dir == "" {
		dir = "migrations"
	}

	if err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`).Error; err != nil {
		return fmt.Errorf("failed to ensure schema migrations table: %w", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("failed to read migrations from %q: %w", dir, err)
	}

	var migrationFiles []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if filepath.Ext(name) != ".sql" || shouldSkipMigration(name) {
			continue
		}

		migrationFiles = append(migrationFiles, name)
	}

	sort.Strings(migrationFiles)

	for _, name := range migrationFiles {
		var appliedCount int64
		if err := db.Raw("SELECT COUNT(*) FROM "+migrationTableName+" WHERE filename = ?", name).Scan(&appliedCount).Error; err != nil {
			return fmt.Errorf("failed to check migration %s: %w", name, err)
		}

		if appliedCount > 0 {
			continue
		}

		content, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", name, err)
		}

		tx := db.Begin()
		if tx.Error != nil {
			return fmt.Errorf("failed to start transaction for %s: %w", name, tx.Error)
		}

		if err := tx.Exec(string(content)).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to apply migration %s: %w", name, err)
		}

		if err := tx.Exec("INSERT INTO "+migrationTableName+" (filename) VALUES (?)", name).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("failed to record migration %s: %w", name, err)
		}

		if err := tx.Commit().Error; err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", name, err)
		}

		log.Printf("Applied migration %s", name)
	}

	return nil
}

func shouldSkipMigration(name string) bool {
	if _, exists := skippedMigrationFiles[name]; exists {
		return true
	}

	return strings.Contains(strings.ToLower(name), "test_data")
}
