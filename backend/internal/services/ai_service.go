package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"stroy-control-backend/internal/models"

	"github.com/go-redis/redis/v8"
)

// AIRequest represents a request to the AI service
type AIRequest struct {
	Type    string                 `json:"type"`
	Prompt  string                 `json:"prompt"`
	Context map[string]interface{} `json:"context"`
	Options map[string]interface{} `json:"options"`
}

// AIResponse represents a response from the AI service
type AIResponse struct {
	Result     interface{}       `json:"result"`
	Confidence float64           `json:"confidence"`
	Tokens     int               `json:"tokens"`
	Duration   time.Duration     `json:"duration"`
	Cost       *float64          `json:"cost,omitempty"`
	Metadata   map[string]string `json:"metadata,omitempty"`
}

// AIService handles AI operations
type AIService struct {
	gatewayURL string
	apiKey     string
	redis      *redis.Client
}

// NewAIService creates a new AI service
func NewAIService(gatewayURL, apiKey string, redis *redis.Client) *AIService {
	return &AIService{
		gatewayURL: gatewayURL,
		apiKey:     apiKey,
		redis:      redis,
	}
}

// ProcessRequest processes an AI request with caching
func (s *AIService) ProcessRequest(ctx context.Context, req AIRequest) (*AIResponse, error) {
	// Generate cache key
	cacheKey := s.generateCacheKey(req)

	// Check cache first
	if cached, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
		var cachedResponse AIResponse
		if err := json.Unmarshal([]byte(cached), &cachedResponse); err == nil {
			return &cachedResponse, nil
		}
	}

	// Send to AI gateway
	resp, err := s.sendToGateway(ctx, req)
	if err != nil {
		return nil, err
	}

	// Cache the result
	if data, err := json.Marshal(resp); err == nil {
		s.redis.Set(ctx, cacheKey, data, time.Hour)
	}

	return resp, nil
}

// sendToGateway sends request to the Python AI gateway
func (s *AIService) sendToGateway(ctx context.Context, req AIRequest) (*AIResponse, error) {
	// Check if we should use real gateway or mock
	if s.gatewayURL == "" {
		return s.getMockResponse(req.Type)
	}

	// TODO: Implement real HTTP call to Python AI Gateway
	// This will be implemented when gateway is fully deployed
	return s.getMockResponse(req.Type)
}

// getMockResponse returns mock response for development
func (s *AIService) getMockResponse(requestType string) (*AIResponse, error) {
	switch requestType {
	case "estimate_analysis":
		return &AIResponse{
			Result: map[string]interface{}{
				"status":        "success",
				"analysis_id":   "mock-analysis-123",
				"overall_score": 85.5,
				"risk_level":    "medium",
				"risk_factors":  []string{"Возможные задержки поставок", "Сезонные колебания цен"},
				"optimization_suggestions": []map[string]interface{}{
					{"type": "material", "description": "Замена плитки на аналог", "savings": 75000},
					{"type": "labor", "description": "Оптимизация графика работ", "savings": 50000},
				},
				"recommendations": []string{"Проверить альтернативные поставщики", "Создать резерв времени"},
				"confidence":      0.87,
			},
			Confidence: 0.87,
			Tokens:     850,
			Duration:   time.Second * 2,
		}, nil

	case "chat_assistant":
		return &AIResponse{
			Result: map[string]interface{}{
				"status":      "success",
				"response":    "Спасибо за ваш вопрос! Я AI ассистент для строительной компании 'Строй-Контроль'. Я могу помочь с расчетом смет, анализом рисков и оптимизацией затрат.",
				"session_id":  "mock-session-456",
				"suggestions": []string{"Как рассчитать стоимость ремонта?", "Как оптимизировать расходы?"},
				"confidence":  0.85,
			},
			Confidence: 0.85,
			Tokens:     420,
			Duration:   time.Second * 1,
		}, nil

	case "vision_analysis":
		return &AIResponse{
			Result: map[string]interface{}{
				"status":      "success",
				"analysis_id": "mock-vision-789",
				"detected_objects": []map[string]interface{}{
					{"type": "crack", "confidence": 0.95, "location": map[string]int{"x": 120, "y": 80}},
				},
				"defects": []map[string]interface{}{
					{"type": "structural_crack", "severity": "medium", "description": "Трещина в стене"},
				},
				"quality_score": 78.5,
				"confidence":    0.85,
			},
			Confidence: 0.85,
			Tokens:     0,
			Duration:   time.Millisecond * 500,
		}, nil

	default:
		return &AIResponse{
			Result: map[string]interface{}{
				"status":     "success",
				"message":    "Mock AI response for " + requestType,
				"confidence": 0.8,
			},
			Confidence: 0.8,
			Tokens:     100,
			Duration:   time.Second,
		}, nil
	}
}

// generateCacheKey generates a cache key for the request
func (s *AIService) generateCacheKey(req AIRequest) string {
	// Simple hash of type + prompt for cache key
	return fmt.Sprintf("ai:%s:%x", req.Type, []byte(req.Prompt))
}

// AnalyzeEstimate performs AI analysis on an estimate
func (s *AIService) AnalyzeEstimate(ctx context.Context, estimateID string, estimateData interface{}) (*models.EstimateAnalysisResult, error) {
	req := AIRequest{
		Type:   "estimate_analysis",
		Prompt: "Проанализируй строительную смету на предмет рисков, оптимизации и рекомендаций",
		Context: map[string]interface{}{
			"estimate_id":   estimateID,
			"estimate_data": estimateData,
		},
		Options: map[string]interface{}{
			"check_risks":     true,
			"optimize":        true,
			"generate_report": true,
		},
	}

	resp, err := s.ProcessRequest(ctx, req)
	if err != nil {
		return nil, err
	}

	// Parse response into EstimateAnalysisResult
	var result models.EstimateAnalysisResult
	if data, ok := resp.Result.(map[string]interface{}); ok {
		if analysis, ok := data["analysis"].(map[string]interface{}); ok {
			if confidence, ok := analysis["confidence"].(float64); ok {
				result.Confidence = confidence
			}
			if recommendations, ok := analysis["recommendations"].([]interface{}); ok {
				result.Recommendations = make([]string, len(recommendations))
				for i, r := range recommendations {
					if rStr, ok := r.(string); ok {
						result.Recommendations[i] = rStr
					}
				}
			}
		}

		// Set default values for demo
		result.OverallScore = 0.85
		result.RiskLevel = "medium"
		result.RiskFactors = []string{
			"Возможные задержки поставок",
			"Сезонные колебания цен",
			"Сложность выполнения работ",
		}
		result.Optimization = []models.OptimizationSuggestion{
			{
				Type:        "material",
				Description: "Замена дорогих материалов на аналогичные более дешевые",
				Savings:     50000,
				Impact:      "medium",
				Category:    "materials",
			},
		}
		result.MarketComparison = models.MarketComparison{
			AveragePrice:  1000000,
			YourPrice:     950000,
			Deviation:     -5.0,
			Percentile:    75,
			MarketInsight: "Цена ниже среднего по рынку на 5%",
		}
		result.TimelineAnalysis = models.TimelineAnalysis{
			Duration:     "4 месяца",
			RiskLevel:    "realistic",
			Bottlenecks:  []string{"Поставка отделочных материалов"},
			CriticalPath: []string{"Демонтаж", "Черновые работы", "Чистовые работы"},
			BufferTime:   14,
		}
		result.QualityIndicators = models.QualityIndicators{
			Completeness: 0.9,
			Accuracy:     0.85,
			Consistency:  0.8,
			Compliance:   0.95,
			OverallGrade: "B",
		}
	}

	return &result, nil
}

// ChatAssistant handles chat assistant requests
func (s *AIService) ChatAssistant(ctx context.Context, message, sessionID string, contextData map[string]interface{}) (*string, error) {
	req := AIRequest{
		Type:   "chat_assistant",
		Prompt: message,
		Context: map[string]interface{}{
			"session_id": sessionID,
			"context":    contextData,
		},
		Options: map[string]interface{}{
			"max_tokens":  500,
			"temperature": 0.7,
		},
	}

	resp, err := s.ProcessRequest(ctx, req)
	if err != nil {
		return nil, err
	}

	// Extract response text
	if result, ok := resp.Result.(map[string]interface{}); ok {
		if response, ok := result["response"].(string); ok {
			return &response, nil
		}
	}

	// Default response
	defaultResponse := "Спасибо за ваш вопрос. Я анализирую информацию и подготовлю ответ."
	return &defaultResponse, nil
}

// PredictProjectRisks predicts risks for a project
func (s *AIService) PredictProjectRisks(ctx context.Context, projectID string, projectData interface{}) (*map[string]interface{}, error) {
	req := AIRequest{
		Type:   "risk_prediction",
		Prompt: "Проанализируй риски строительного проекта",
		Context: map[string]interface{}{
			"project_id":   projectID,
			"project_data": projectData,
		},
		Options: map[string]interface{}{
			"analysis_type": "comprehensive",
		},
	}

	resp, err := s.ProcessRequest(ctx, req)
	if err != nil {
		return nil, err
	}

	// Parse response into risk prediction
	result := make(map[string]interface{})
	if data, ok := resp.Result.(map[string]interface{}); ok {
		result = data
	}

	// Set default risk analysis
	result["risk_score"] = 65
	result["risk_level"] = "medium"
	result["main_risks"] = []string{
		"Погодные условия могут повлиять на график работ",
		"Возможны задержки с поставками материалов",
		"Необходимо учитывать сезонные колебания цен",
	}
	result["mitigation_strategies"] = []string{
		"Создать буфер времени в графике",
		"Заключить договоры с несколькими поставщиками",
		"Мониторить изменения цен на рынке",
	}

	return &result, nil
}

// GetAIMetrics retrieves AI usage metrics
func (s *AIService) GetAIMetrics(ctx context.Context, companyID string) (*map[string]interface{}, error) {
	// This would typically query the database for actual metrics
	// For now, return mock metrics

	metrics := map[string]interface{}{
		"total_requests":    150,
		"successful":        142,
		"failed":            8,
		"success_rate":      94.7,
		"total_tokens":      25000,
		"total_cost":        12.50,
		"avg_response_time": 850,
		"most_used_features": []string{
			"estimate_analysis",
			"chat_assistant",
			"risk_prediction",
		},
	}

	return &metrics, nil
}

// Helper function to get pointer to float64
func floatPtr(f float64) *float64 {
	return &f
}
