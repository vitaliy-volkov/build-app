package ai

import (
	"stroy-control-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// RouterGroup represents the AI router group
type RouterGroup struct {
	handlers   *AIHandler
	middleware gin.HandlerFunc
}

// NewRouterGroup creates a new AI router group
func NewRouterGroup(aiService *services.AIService, authMiddleware gin.HandlerFunc) *RouterGroup {
	return &RouterGroup{
		handlers:   NewAIHandler(aiService),
		middleware: authMiddleware,
	}
}

// RegisterRoutes registers AI routes
func (r *RouterGroup) RegisterRoutes(engine *gin.Engine) {
	// Group all AI routes under /api/v1/ai
	ai := engine.Group("/api/v1/ai")
	{
		// Public routes (if any)
		ai.GET("/health", r.healthCheck)

		// Protected routes - require authentication
		protected := ai.Group("")
		protected.Use(r.middleware)
		{
			// Estimate analysis
			protected.POST("/estimates/analyze", r.handlers.AnalyzeEstimate)

			// Chat assistant
			protected.POST("/chat", r.handlers.ChatAssistant)

			// Risk prediction
			protected.POST("/risks/predict", r.handlers.PredictRisks)

			// Metrics and history
			protected.GET("/metrics", r.handlers.GetMetrics)
			protected.GET("/history", r.handlers.GetAnalysisHistory)
		}
	}
}

// healthCheck provides health check endpoint for AI service
func (r *RouterGroup) healthCheck(c *gin.Context) {
	c.JSON(200, gin.H{
		"status":  "ok",
		"service": "ai-service",
		"version": "1.0.0",
	})
}
