package auth

import (
	"stroy-control-backend/internal/email"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
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
	// Authentication routes
	authGroup := r.Group("/auth")
	{
		authGroup.POST("/register", rg.handler.Register)
		authGroup.POST("/login", rg.handler.Login)
		authGroup.POST("/refresh", rg.handler.RefreshToken)
		authGroup.POST("/forgot-password", rg.handler.RequestPasswordReset)
		authGroup.POST("/reset-password", rg.handler.ConfirmPasswordReset)
		
		// Protected routes
		protected := authGroup.Group("")
		protected.Use(rg.middleware.Protected())
		{
			protected.POST("/logout", rg.handler.Logout)
			protected.GET("/me", rg.handler.Me)
			protected.POST("/change-password", rg.handler.ChangePassword)
		}
	}
}

// GetMiddleware возвращает экземпляр middleware для использования в других роутах
func (rg *RouterGroup) GetMiddleware() *AuthMiddleware {
	return rg.middleware
}
