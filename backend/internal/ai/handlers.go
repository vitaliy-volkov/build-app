package ai

import (
	"encoding/json"
	"net/http"
	"strconv"

	"stroy-control-backend/internal/models"
	"stroy-control-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// AIRequest represents a request for AI analysis
type AIRequest struct {
	EstimateID string `json:"estimate_id" binding:"required"`
	Options    struct {
		CheckRisks     bool `json:"check_risks"`
		Optimize       bool `json:"optimize"`
		GenerateReport bool `json:"generate_report"`
	} `json:"options"`
}

// ChatAssistantRequest represents a chat assistant request
type ChatAssistantRequest struct {
	Message   string `json:"message" binding:"required"`
	SessionID string `json:"session_id"`
	Context   string `json:"context"`
}

// RiskPredictionRequest represents a risk prediction request
type RiskPredictionRequest struct {
	ProjectID string `json:"project_id" binding:"required"`
	Options   struct {
		AnalysisType string `json:"analysis_type" binding:"required"`
	} `json:"options"`
}

// AIHandler handles AI-related requests
type AIHandler struct {
	aiService *services.AIService
}

// NewAIHandler creates a new AI handler
func NewAIHandler(aiService *services.AIService) *AIHandler {
	return &AIHandler{
		aiService: aiService,
	}
}

// @Summary Analyze estimate with AI
// @Description Analyze a construction estimate using AI for risks, optimization, and recommendations
// @Tags AI
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param request body AIRequest true "Estimate analysis request"
// @Success 200 {object} object{success=bool,data=object}
// @Failure 400 {object} object{error=string,code=int}
// @Failure 500 {object} object{error=string,code=int}
// @Router /ai/estimates/analyze [post]

// AnalyzeEstimate analyzes a construction estimate with AI
func (h *AIHandler) AnalyzeEstimate(c *gin.Context) {
	var req AIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Get user ID from context
	_, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Get estimate from database (mock for now)
	estimateData := map[string]interface{}{
		"id":         req.EstimateID,
		"name":       "Test Estimate",
		"total_cost": 1500000,
		"items":      []map[string]interface{}{},
	}

	// Perform AI analysis
	result, err := h.aiService.AnalyzeEstimate(c.Request.Context(), req.EstimateID, estimateData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to perform AI analysis",
			http.StatusInternalServerError,
		))
		return
	}

	// Save analysis to database (mock)
	_ = models.AIAnalysis{
		EntityType:     "estimate",
		EntityID:       req.EstimateID,
		AnalysisType:   "risk_optimization",
		Result:         marshalJSON(result),
		Confidence:     &result.Confidence,
		TokensUsed:     150,
		ProcessingTime: 500,
		Provider:       "openai",
		Model:          "gpt-4",
		Cost:           floatPtr(0.05),
		CreatedBy:      "system",
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"analysis": result,
			"metadata": gin.H{
				"confidence":         result.Confidence,
				"tokens_used":        150,
				"processing_time_ms": 500,
				"provider":           "openai",
			},
		},
	})
}

// @Summary Chat with AI assistant
// @Description Chat with AI assistant for construction-related questions
// @Tags AI
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param request body ChatAssistantRequest true "Chat request"
// @Success 200 {object} object{success=bool,data=object}
// @Failure 400 {object} object{error=string,code=int}
// @Router /ai/chat [post]

// ChatAssistant handles chat requests with AI
func (h *AIHandler) ChatAssistant(c *gin.Context) {
	var req ChatAssistantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Get user ID from context
	_, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Prepare context data
	contextData := map[string]interface{}{
		"user_id": "system",
		"context": req.Context,
	}

	// Get or create session ID
	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = generateSessionID()
	}

	// Get AI response
	response, err := h.aiService.ChatAssistant(c.Request.Context(), req.Message, sessionID, contextData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to get AI response",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"response":   response,
			"session_id": sessionID,
			"metadata": gin.H{
				"tokens_used":        100,
				"processing_time_ms": 300,
			},
		},
	})
}

// @Summary Predict project risks
// @Description Predict risks for a construction project using AI
// @Tags AI
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param request body RiskPredictionRequest true "Risk prediction request"
// @Success 200 {object} object{success=bool,data=object}
// @Failure 400 {object} object{error=string,code=int}
// @Router /ai/risks/predict [post]

// PredictRisks predicts project risks using AI
func (h *AIHandler) PredictRisks(c *gin.Context) {
	var req RiskPredictionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Get user ID from context
	_, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Get project data (mock for now)
	projectData := map[string]interface{}{
		"id":       req.ProjectID,
		"name":     "Test Project",
		"status":   "active",
		"budget":   2000000,
		"timeline": "6 months",
	}

	// Get AI risk prediction
	result, err := h.aiService.PredictProjectRisks(c.Request.Context(), req.ProjectID, projectData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to predict risks",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"risk_analysis": result,
			"metadata": gin.H{
				"analysis_type":      req.Options.AnalysisType,
				"tokens_used":        200,
				"processing_time_ms": 800,
			},
		},
	})
}

// @Summary Get AI usage metrics
// @Description Get AI service usage metrics for the company
// @Tags AI
// @Security ApiKeyAuth
// @Produce json
// @Success 200 {object} object{success=bool,data=object}
// @Failure 401 {object} object{error=string,code=int}
// @Router /ai/metrics [get]

// GetMetrics retrieves AI usage metrics
func (h *AIHandler) GetMetrics(c *gin.Context) {
	// Get user ID from context
	_, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Get user's company ID
	// TODO: Get user from database
	_ = models.User{} // Placeholder for user data
	companyID := "mock-company-id"

	// Get AI metrics
	metrics, err := h.aiService.GetAIMetrics(c.Request.Context(), companyID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to get AI metrics",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"metrics": metrics,
		},
	})
}

// @Summary Get AI analysis history
// @Description Get history of AI analyses for a specific entity
// @Tags AI
// @Security ApiKeyAuth
// @Produce json
// @Param entity_type query string true "Entity type (estimate, project, etc.)"
// @Param entity_id query string true "Entity ID"
// @Success 200 {object} object{success=bool,data=object}
// @Failure 400 {object} object{error=string,code=int}
// @Router /ai/history [get]

// GetAnalysisHistory retrieves AI analysis history
func (h *AIHandler) GetAnalysisHistory(c *gin.Context) {
	entityType := c.Query("entity_type")
	entityID := c.Query("entity_id")

	if entityType == "" || entityID == "" {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Entity type and ID are required",
			http.StatusBadRequest,
		))
		return
	}

	// Get user ID from context
	_, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Mock analysis history
	history := []gin.H{
		{
			"id":            "analysis-1",
			"analysis_type": "risk_optimization",
			"created_at":    "2024-01-15T10:30:00Z",
			"confidence":    0.85,
			"summary":       "Проведен анализ рисков и оптимизация сметы",
		},
		{
			"id":            "analysis-2",
			"analysis_type": "cost_optimization",
			"created_at":    "2024-01-10T14:20:00Z",
			"confidence":    0.92,
			"summary":       "Найдены возможности для снижения стоимости на 15%",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"entity_type": entityType,
			"entity_id":   entityID,
			"analyses":    history,
		},
	})
}

// Helper functions

func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", false
	}
	return userID.(string), true
}

func generateSessionID() string {
	// Simple session ID generation
	return "session_" + strconv.FormatInt(1546300800, 10) // Unix timestamp
}

func marshalJSON(data interface{}) []byte {
	jsonData, _ := json.Marshal(data)
	return jsonData
}

func floatPtr(f float64) *float64 {
	return &f
}
