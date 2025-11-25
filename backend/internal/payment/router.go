package payment

import (
	"stroy-control-backend/internal/auth"
	"stroy-control-backend/internal/redis"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RouterGroup represents the payment router group
type RouterGroup struct {
	handlers   *PaymentHandler
	middleware *auth.AuthMiddleware
}

// NewRouterGroup creates a new payment router group
func NewRouterGroup(db *gorm.DB, redisService *redis.RedisService, authMiddleware *auth.AuthMiddleware) *RouterGroup {
	return &RouterGroup{
		handlers:   NewPaymentHandler(db, redisService),
		middleware: authMiddleware,
	}
}

// RegisterRoutes registers payment routes
func (r *RouterGroup) RegisterRoutes(engine *gin.Engine) {
	// Group all payment routes under /api/v1
	payment := engine.Group("/api/v1")
	{
		// Setup payment schedule routes
		r.handlers.SetupPaymentScheduleRoutes(payment, r.middleware)
	}
}
