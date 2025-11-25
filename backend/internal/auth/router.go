package auth

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RouterGroup группа роутов для аутентификации
type RouterGroup struct {
	authHandler *AuthHandler
	middleware  *AuthMiddleware
}

// NewRouterGroup создает новую группу роутов аутентификации
func NewRouterGroup(db *gorm.DB, jwtService *JWTService) *RouterGroup {
	return &RouterGroup{
		authHandler: NewAuthHandler(db, jwtService),
		middleware:  NewAuthMiddleware(jwtService),
	}
}

// RegisterRoutes регистрирует роуты аутентификации
func (rg *RouterGroup) RegisterRoutes(r *gin.Engine) {
	// Группа роутов для аутентификации
	authGroup := r.Group("/api/v1/auth")
	{
		// Публичные роуты (не требуют аутентификации)
		authGroup.POST("/login", rg.authHandler.Login)
		authGroup.POST("/register", rg.authHandler.Register)
		authGroup.POST("/refresh", rg.authHandler.RefreshToken)

		// Защищенные роуты (требуют аутентификации)
		protected := authGroup.Group("/")
		protected.Use(rg.middleware.Protected())
		{
			protected.GET("/me", rg.authHandler.Me)
			protected.POST("/logout", rg.authHandler.Logout)
			protected.PUT("/change-password", rg.authHandler.ChangePassword)
		}
	}
}

// GetMiddleware возвращает экземпляр middleware для использования в других роутах
func (rg *RouterGroup) GetMiddleware() *AuthMiddleware {
	return rg.middleware
}
