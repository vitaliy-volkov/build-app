package websocket

import (
	"stroy-control-backend/internal/auth"
	"stroy-control-backend/internal/redis"

	"github.com/gin-gonic/gin"
)

// Router handles WebSocket connections
type Router struct {
	hub *WebSocketHub
}

// NewRouter creates a new WebSocket router
func NewRouter(authMiddleware *auth.AuthMiddleware, redisService *redis.RedisService) *Router {
	return &Router{
		hub: NewWebSocketHub(authMiddleware, redisService),
	}
}

// RegisterRoutes sets up WebSocket routes
func (r *Router) RegisterRoutes(engine *gin.Engine) {
	// WebSocket endpoint
	engine.GET("/ws", r.hub.ServeWebSocket)
}
