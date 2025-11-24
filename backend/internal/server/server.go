package server

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"stroy-control-backend/internal/config"
)

type Server struct {
	httpServer *http.Server
}

func NewServer(cfg *config.Config) *Server {
	r := gin.Default()

	// Health Check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now(),
			"service":   "stroy-control-backend",
		})
	})

	s := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	return &Server{
		httpServer: s,
	}
}

func (s *Server) Run() error {
	return s.httpServer.ListenAndServe()
}
