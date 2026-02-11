package websocket

import (
	"stroy-control-backend/internal/auth"
	"stroy-control-backend/internal/redis"

	"github.com/gin-gonic/gin"
)

// Router handles WebSocket connections
type Router struct {
	hub        *WebSocketHub
	middleware *auth.AuthMiddleware
}

// NewRouter creates a new WebSocket router
func NewRouter(authMiddleware *auth.AuthMiddleware, redisService *redis.RedisService) *Router {
	return &Router{
		hub:        NewWebSocketHub(authMiddleware, redisService),
		middleware: authMiddleware,
	}
}

// RegisterRoutes sets up WebSocket routes
func (r *Router) RegisterRoutes(engine *gin.Engine) {
	// WebSocket endpoint (protected)
	wsGroup := engine.Group("")
	wsGroup.Use(r.middleware.Protected())
	wsGroup.GET("/ws", r.hub.ServeWebSocket)
}
