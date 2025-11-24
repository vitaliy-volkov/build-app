package main

import (
	"log"
	"net/http"

	"stroy-control-backend/internal/config"
	"stroy-control-backend/internal/server"
)

func main() {
	// Load Configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize Server
	srv := server.NewServer(cfg)

	log.Printf("Server starting on port %d", cfg.Server.Port)
	if err := srv.Run(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Failed to start server: %v", err)
	}
}
