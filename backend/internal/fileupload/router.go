package fileupload

import (
	"stroy-control-backend/internal/auth"
	"stroy-control-backend/internal/redis"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RouterGroup represents the file upload router group
type RouterGroup struct {
	handlers   *FileUploadHandler
	middleware *auth.AuthMiddleware
}

// NewRouterGroup creates a new file upload router group
func NewRouterGroup(db *gorm.DB, redisService *redis.RedisService, authMiddleware *auth.AuthMiddleware) *RouterGroup {
	return &RouterGroup{
		handlers:   NewFileUploadHandler(db, redisService),
		middleware: authMiddleware,
	}
}

// RegisterRoutes registers file upload routes
func (r *RouterGroup) RegisterRoutes(engine *gin.Engine) {
	// Group all file upload routes under /api/v1
	file := engine.Group("/api/v1")
	{
		// Setup file upload routes
		r.handlers.SetupRoutes(file, r.middleware)
	}
}
