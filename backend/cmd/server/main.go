package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"stroy-control-backend/internal/config"
)

func main() {
	// Load Configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize Gin
	r := gin.Default()

	// Health Check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now(),
			"service":   "stroy-control-backend",
		})
	})

	// Setup Server
	server := &http.Server{
		Addr:         ":8080",
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	log.Printf("Server starting on port %d", 8080)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Failed to start server: %v", err)
	}
}
