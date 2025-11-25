package models

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// AIAnalysis represents AI analysis results
type AIAnalysis struct {
	ID             string          `json:"id" gorm:"primaryKey;type:uuid"`
	EntityType     string          `json:"entity_type" gorm:"type:varchar(50);not null;index"`
	EntityID       string          `json:"entity_id" gorm:"type:uuid;not null;index"`
	AnalysisType   string          `json:"analysis_type" gorm:"type:varchar(50);not null"`
	Result         json.RawMessage `json:"result" gorm:"type:jsonb;not null"`
	Confidence     *float64        `json:"confidence" gorm:"type:decimal(3,2)"`
	TokensUsed     int             `json:"tokens_used"`
	ProcessingTime int             `json:"processing_time_ms"`
	Provider       string          `json:"provider" gorm:"type:varchar(50);default:'openai'"`
	Model          string          `json:"model" gorm:"type:varchar(50)"`
	Cost           *float64        `json:"cost" gorm:"type:decimal(10,4)"`
	CreatedAt      time.Time       `json:"created_at" gorm:"autoCreateTime"`
	CreatedBy      string          `json:"created_by" gorm:"type:uuid;not null"`
	UpdatedAt      time.Time       `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt      gorm.DeletedAt  `json:"deleted_at,omitempty" gorm:"index"`
}

// AIRequest represents AI processing requests for logging
type AIRequest struct {
	ID           string          `json:"id" gorm:"primaryKey;type:uuid"`
	UserID       string          `json:"user_id" gorm:"type:uuid;not null;index"`
	RequestType  string          `json:"request_type" gorm:"type:varchar(50);not null;index"`
	Prompt       string          `json:"prompt" gorm:"type:text;not null"`
	Context      json.RawMessage `json:"context" gorm:"type:jsonb"`
	Result       json.RawMessage `json:"result" gorm:"type:jsonb"`
	TokensUsed   int             `json:"tokens_used"`
	Cost         *float64        `json:"cost" gorm:"type:decimal(10,4)"`
	Duration     int             `json:"duration_ms"`
	Status       string          `json:"status" gorm:"type:varchar(20);default:'completed'"`
	ErrorMessage *string         `json:"error_message"`
	CreatedAt    time.Time       `json:"created_at" gorm:"autoCreateTime"`
}

// AISettings represents AI configuration per company
type AISettings struct {
	ID        string          `json:"id" gorm:"primaryKey;type:uuid"`
	CompanyID string          `json:"company_id" gorm:"type:uuid;not null;index"`
	Feature   string          `json:"feature" gorm:"type:varchar(50);not null;index"`
	Enabled   bool            `json:"enabled" gorm:"default:true"`
	Provider  string          `json:"provider" gorm:"type:varchar(50);default:'openai'"`
	Model     string          `json:"model" gorm:"type:varchar(50);default:'gpt-4'"`
	Settings  json.RawMessage `json:"settings" gorm:"type:jsonb"`
	CreatedAt time.Time       `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time       `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt gorm.DeletedAt  `json:"deleted_at,omitempty" gorm:"index"`

	// Relations
	Company Company `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
}

// AIMetrics represents AI usage metrics
type AIMetrics struct {
	ID              string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	CompanyID       string    `json:"company_id" gorm:"type:uuid;not null;index"`
	Date            time.Time `json:"date" gorm:"type:date;not null;index"`
	TotalRequests   int       `json:"total_requests"`
	Successful      int       `json:"successful"`
	Failed          int       `json:"failed"`
	TotalTokens     int       `json:"total_tokens"`
	TotalCost       float64   `json:"total_cost" gorm:"type:decimal(10,4)"`
	AvgResponseTime float64   `json:"avg_response_time" gorm:"type:decimal(8,2)"`
	CreatedAt       time.Time `json:"created_at" gorm:"autoCreateTime"`

	// Relations
	Company Company `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
}

// EstimateAnalysisResult represents the result of AI estimate analysis
type EstimateAnalysisResult struct {
	OverallScore      float64                  `json:"overall_score"`
	RiskLevel         string                   `json:"risk_level"` // low, medium, high
	RiskFactors       []string                 `json:"risk_factors"`
	Optimization      []OptimizationSuggestion `json:"optimization"`
	MarketComparison  MarketComparison         `json:"market_comparison"`
	Recommendations   []string                 `json:"recommendations"`
	TimelineAnalysis  TimelineAnalysis         `json:"timeline_analysis"`
	QualityIndicators QualityIndicators        `json:"quality_indicators"`
	Confidence        float64                  `json:"confidence"`
}

// OptimizationSuggestion represents a cost optimization suggestion
type OptimizationSuggestion struct {
	Type        string  `json:"type"` // material, labor, equipment, etc.
	Description string  `json:"description"`
	Savings     float64 `json:"savings"`
	Impact      string  `json:"impact"` // high, medium, low
	Category    string  `json:"category"`
}

// MarketComparison represents comparison with market data
type MarketComparison struct {
	AveragePrice  float64 `json:"average_price"`
	YourPrice     float64 `json:"your_price"`
	Deviation     float64 `json:"deviation"`  // percentage
	Percentile    int     `json:"percentile"` // 1-100
	MarketInsight string  `json:"market_insight"`
}

// TimelineAnalysis represents timeline risk analysis
type TimelineAnalysis struct {
	Duration     string   `json:"duration"`
	RiskLevel    string   `json:"risk_level"` // optimistic, realistic, pessimistic
	Bottlenecks  []string `json:"bottlenecks"`
	CriticalPath []string `json:"critical_path"`
	BufferTime   float64  `json:"buffer_time_days"`
}

// QualityIndicators represents quality assessment
type QualityIndicators struct {
	Completeness float64 `json:"completeness"`  // 0-1
	Accuracy     float64 `json:"accuracy"`      // 0-1
	Consistency  float64 `json:"consistency"`   // 0-1
	Compliance   float64 `json:"compliance"`    // 0-1
	OverallGrade string  `json:"overall_grade"` // A, B, C, D, F
}

// ChatAssistantMessage represents a chat message with AI
type ChatAssistantMessage struct {
	ID        string          `json:"id" gorm:"primaryKey;type:uuid"`
	UserID    string          `json:"user_id" gorm:"type:uuid;not null;index"`
	SessionID string          `json:"session_id" gorm:"type:uuid;not null;index"`
	Role      string          `json:"role" gorm:"type:varchar(20);not null"` // user, assistant, system
	Content   string          `json:"content" gorm:"type:text;not null"`
	Context   json.RawMessage `json:"context" gorm:"type:jsonb"`
	Tokens    int             `json:"tokens"`
	Cost      *float64        `json:"cost" gorm:"type:decimal(10,4)"`
	CreatedAt time.Time       `json:"created_at" gorm:"autoCreateTime"`
}

// ChatAssistantSession represents a chat session
type ChatAssistantSession struct {
	ID           string     `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	UserID       string     `json:"user_id" gorm:"type:uuid;not null;index"`
	ProjectID    *string    `json:"project_id" gorm:"type:uuid;index"`
	Title        string     `json:"title" gorm:"type:varchar(255)"`
	Status       string     `json:"status" gorm:"type:varchar(20);default:'active'"`
	MessageCount int        `json:"message_count"`
	CreatedAt    time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	EndedAt      *time.Time `json:"ended_at"`

	// Relations
	User     User                   `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Project  *Project               `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
	Messages []ChatAssistantMessage `json:"messages,omitempty" gorm:"foreignKey:SessionID"`
}

// BeforeCreate hook for AIAnalysis
func (a *AIAnalysis) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = generateUUID()
	}
	return nil
}

// BeforeCreate hook for AIRequest
func (r *AIRequest) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = generateUUID()
	}
	return nil
}

// BeforeCreate hook for AISettings
func (s *AISettings) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = generateUUID()
	}
	return nil
}

// BeforeCreate hook for AIMetrics
func (m *AIMetrics) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = generateUUID()
	}
	return nil
}

// BeforeCreate hook for ChatAssistantMessage
func (m *ChatAssistantMessage) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = generateUUID()
	}
	return nil
}

// BeforeCreate hook for ChatAssistantSession
func (s *ChatAssistantSession) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = generateUUID()
	}
	return nil
}

// TableName returns the table name for AIAnalysis
func (AIAnalysis) TableName() string {
	return "ai_analyses"
}

// TableName returns the table name for AIRequest
func (AIRequest) TableName() string {
	return "ai_requests"
}

// TableName returns the table name for AISettings
func (AISettings) TableName() string {
	return "ai_settings"
}

// TableName returns the table name for AIMetrics
func (AIMetrics) TableName() string {
	return "ai_metrics"
}

// TableName returns the table name for ChatAssistantMessage
func (ChatAssistantMessage) TableName() string {
	return "chat_assistant_messages"
}

// TableName returns the table name for ChatAssistantSession
func (ChatAssistantSession) TableName() string {
	return "chat_assistant_sessions"
}
