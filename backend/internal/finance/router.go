package finance

import (
	"stroy-control-backend/internal/auth"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func RegisterRoutes(r *gin.RouterGroup, db *gorm.DB, authMiddleware *auth.AuthMiddleware) {
	h := NewFinanceHandler(db)
	routes := r.Group("/finance")
	routes.Use(authMiddleware.Protected())
	{
		routes.GET("/transactions", h.GetTransactions)
		routes.POST("/transactions", h.CreateTransaction)
		routes.GET("/stats", h.GetStats)
	}
}
