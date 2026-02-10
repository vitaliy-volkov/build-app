package auth

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"stroy-control-backend/internal/email"
)

// RouterGroup структура для группировки роутов
type RouterGroup struct {
	handler    *AuthHandler
	middleware *AuthMiddleware
}

// NewRouterGroup создает новую группу роутов
func NewRouterGroup(db *gorm.DB, jwtService *JWTService, emailService *email.EmailService) *RouterGroup {
	return &RouterGroup{
		handler:    NewAuthHandler(db, jwtService, emailService),
		middleware: NewAuthMiddleware(jwtService),
	}
}

// RegisterRoutes регистрирует роуты аутентификации
func (rg *RouterGroup) RegisterRoutes(r *gin.Engine) {
	registerAuthRoutes := func(group *gin.RouterGroup) {
		group.POST("/register", rg.handler.Register)
		group.POST("/login", rg.handler.Login)
		group.POST("/refresh", rg.handler.RefreshToken)
		group.POST("/forgot-password", rg.handler.RequestPasswordReset)
		group.POST("/reset-password", rg.handler.ConfirmPasswordReset)

		protected := group.Group("")
		protected.Use(rg.middleware.Protected())
		{
			protected.POST("/logout", rg.handler.Logout)
			protected.GET("/me", rg.handler.Me)
			protected.PUT("/me", rg.handler.UpdateProfile)
			protected.POST("/change-password", rg.handler.ChangePassword)
		}
	}

	// Versioned routes for unified API contract.
	registerAuthRoutes(r.Group("/api/v1/auth"))
	// Legacy routes kept for backward compatibility.
	registerAuthRoutes(r.Group("/auth"))
}

// GetMiddleware возвращает экземпляр middleware для использования в других роутах
func (rg *RouterGroup) GetMiddleware() *AuthMiddleware {
	return rg.middleware
}
