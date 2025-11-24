package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"stroy-control-backend/internal/auth"
	"stroy-control-backend/internal/company"
	"stroy-control-backend/internal/config"
	"stroy-control-backend/internal/project"
)

func main() {
	// Load Configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize Database Connection
	db, err := config.ConnectDatabase(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize JWT Service
	jwtService := auth.NewJWTService(cfg)
	
	// Initialize Authentication Router
	authRouter := auth.NewRouterGroup(db.GetDB(), jwtService)

	// Initialize Project Router
	projectRouter := project.NewRouterGroup(db.GetDB(), authRouter.GetMiddleware())

	// Initialize Company Router
	companyRouter := company.NewRouterGroup(db.GetDB(), authRouter.GetMiddleware())

	// Set up Gin router with CORS middleware
	r := gin.Default()
	
	// Enable CORS for frontend integration
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Allow-Credentials", "true")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		
		c.Next()
	})

	// Register authentication routes
	authRouter.RegisterRoutes(r)

	// Register project routes
	projectRouter.RegisterRoutes(r)

	// Register company routes
	companyRouter.RegisterRoutes(r)

	// Health Check with Database
	r.GET("/health", func(c *gin.Context) {
		// Check database connection
		if err := db.HealthCheck(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "error",
				"message": "Database connection failed",
				"time":    time.Now(),
			})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"database":  "connected",
			"timestamp": time.Now(),
			"service":   "stroy-control-backend",
		})
	})

	// Database info endpoint
	r.GET("/api/v1/health/database", func(c *gin.Context) {
		if err := db.HealthCheck(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "error",
				"message": err.Error(),
				"time":    time.Now(),
			})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
			"time":   time.Now(),
		})
	})

	// Setup Server
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Server starting on port %d", cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	log.Println("Shutting down server...")
	
	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	
	log.Println("Server exited")
}
