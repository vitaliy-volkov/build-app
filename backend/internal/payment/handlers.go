package payment

import (
	"net/http"
	"strconv"
	"time"

	"stroy-control-backend/internal/auth"
	"stroy-control-backend/internal/redis"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PaymentHandler handles payment-related HTTP requests
type PaymentHandler struct {
	db    *gorm.DB
	redis *redis.RedisService
}

// NewPaymentHandler creates a new payment handler
func NewPaymentHandler(db *gorm.DB, redisService *redis.RedisService) *PaymentHandler {
	return &PaymentHandler{
		db:    db,
		redis: redisService,
	}
}

// PaymentScheduleRequest represents a payment schedule request
type PaymentScheduleRequest struct {
	EstimateID  string                       `json:"estimate_id" binding:"required"`
	Payments    []PaymentScheduleItemRequest `json:"payments" binding:"required,dive"`
	AutoExecute bool                         `json:"auto_execute" binding:"required"`
	AIConfig    map[string]interface{}       `json:"ai_config"`
}

// PaymentScheduleItemRequest represents a payment schedule item
type PaymentScheduleItemRequest struct {
	Date        string  `json:"date" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	Percent     float64 `json:"percent" binding:"required,gt=0"`
	Description string  `json:"description" binding:"required"`
	IsPaid      bool    `json:"is_paid"`
}

// PaymentScheduleResponse represents a payment schedule response
type PaymentScheduleResponse struct {
	ID          string                        `json:"id"`
	EstimateID  string                        `json:"estimate_id"`
	Status      string                        `json:"status"`
	TotalAmount float64                       `json:"total_amount"`
	CreatedAt   time.Time                     `json:"created_at"`
	Payments    []PaymentScheduleItemResponse `json:"payments"`
}

// PaymentScheduleItemResponse represents a payment schedule item response
type PaymentScheduleItemResponse struct {
	ID          string   `json:"id"`
	Date        string   `json:"date"`
	Amount      float64  `json:"amount"`
	Percent     float64  `json:"percent"`
	Description string   `json:"description"`
	Status      string   `json:"status"`
	IsPaid      bool     `json:"is_paid"`
	AIScore     *float64 `json:"ai_score,omitempty"`
	RiskFactors []string `json:"risk_factors,omitempty"`
}

// PaymentExecutionRequest represents a payment execution request
type PaymentExecutionRequest struct {
	PaymentScheduleID string `json:"payment_schedule_id" binding:"required"`
	AccountToID       string `json:"account_to_id"`
}

// GetPaymentSchedules gets all payment schedules for a company
func (h *PaymentHandler) GetPaymentSchedules(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company ID not found"})
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// TODO: Implement caching with Redis
	// cacheKey := fmt.Sprintf("payment_schedules:%s:%d:%d", companyID, page, limit)

	// TODO: Implement actual database query
	// For now, return mock data
	schedules := []PaymentScheduleResponse{
		{
			ID:          "1",
			EstimateID:  "est-1",
			Status:      "active",
			TotalAmount: 500000.0,
			CreatedAt:   time.Now().AddDate(0, -1, 0),
			Payments: []PaymentScheduleItemResponse{
				{
					ID:          "pay-1",
					Date:        "2024-01-15",
					Amount:      150000.0,
					Percent:     30.0,
					Description: "Аванс",
					Status:      "completed",
					IsPaid:      true,
					AIScore:     float64Ptr(95.0),
				},
				{
					ID:          "pay-2",
					Date:        "2024-02-15",
					Amount:      200000.0,
					Percent:     40.0,
					Description: "Промежуточный расчет",
					Status:      "pending",
					IsPaid:      false,
					AIScore:     float64Ptr(85.0),
				},
				{
					ID:          "pay-3",
					Date:        "2024-03-15",
					Amount:      150000.0,
					Percent:     30.0,
					Description: "Финальный расчет",
					Status:      "scheduled",
					IsPaid:      false,
				},
			},
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  schedules,
		"total": len(schedules),
		"page":  page,
		"limit": limit,
	})
}

// GetPaymentSchedule gets a specific payment schedule
func (h *PaymentHandler) GetPaymentSchedule(c *gin.Context) {
	scheduleID := c.Param("id")
	companyID := c.GetString("company_id")

	if scheduleID == "" || companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required parameters"})
		return
	}

	// TODO: Implement actual database query
	// For now, return mock data
	schedule := PaymentScheduleResponse{
		ID:          scheduleID,
		EstimateID:  "est-1",
		Status:      "active",
		TotalAmount: 500000.0,
		CreatedAt:   time.Now().AddDate(0, -1, 0),
		Payments: []PaymentScheduleItemResponse{
			{
				ID:          "pay-1",
				Date:        "2024-01-15",
				Amount:      150000.0,
				Percent:     30.0,
				Description: "Аванс",
				Status:      "completed",
				IsPaid:      true,
				AIScore:     float64Ptr(95.0),
			},
		},
	}

	c.JSON(http.StatusOK, schedule)
}

// CreatePaymentSchedule creates a new payment schedule
func (h *PaymentHandler) CreatePaymentSchedule(c *gin.Context) {
	var req PaymentScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Validate estimate exists and belongs to user's company
	// TODO: Implement AI analysis for payment items if requested
	// TODO: Save to database

	// For now, return mock response
	schedule := PaymentScheduleResponse{
		ID:          "new-schedule-id",
		EstimateID:  req.EstimateID,
		Status:      "active",
		TotalAmount: 500000.0,
		CreatedAt:   time.Now(),
		Payments: []PaymentScheduleItemResponse{
			{
				ID:          "new-pay-1",
				Date:        req.Payments[0].Date,
				Amount:      req.Payments[0].Amount,
				Percent:     req.Payments[0].Percent,
				Description: req.Payments[0].Description,
				Status:      "pending",
				IsPaid:      req.Payments[0].IsPaid,
				AIScore:     float64Ptr(87.5),
			},
		},
	}

	c.JSON(http.StatusCreated, schedule)
}

// ExecutePayment executes a scheduled payment
func (h *PaymentHandler) ExecutePayment(c *gin.Context) {
	var req PaymentExecutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement actual payment execution
	// TODO: Create transaction record
	// TODO: Update payment schedule status
	// TODO: Send notifications

	// For now, return success
	c.JSON(http.StatusOK, gin.H{
		"message":    "Payment executed successfully",
		"payment_id": "exec-" + time.Now().Format("20060102150405"),
	})
}

// GetPaymentScheduleAnalytics gets analytics for payment schedules
func (h *PaymentHandler) GetPaymentScheduleAnalytics(c *gin.Context) {
	companyID := c.GetString("company_id")
	if companyID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Company ID not found"})
		return
	}

	// TODO: Implement actual analytics calculation
	analytics := gin.H{
		"total_schedules":     25,
		"active_schedules":    18,
		"completed_schedules": 7,
		"total_amount":        12500000.0,
		"pending_amount":      8750000.0,
		"overdue_payments":    3,
		"risk_analysis": gin.H{
			"high_risk":   2,
			"medium_risk": 8,
			"low_risk":    15,
		},
		"monthly_trend": []gin.H{
			{"month": "2024-01", "schedules": 8, "amount": 4000000},
			{"month": "2024-02", "schedules": 6, "amount": 3200000},
			{"month": "2024-03", "schedules": 11, "amount": 5300000},
		},
	}

	c.JSON(http.StatusOK, analytics)
}

// GetPaymentScheduleCalendar gets payment schedule for calendar view
func (h *PaymentHandler) GetPaymentScheduleCalendar(c *gin.Context) {
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	if startDate == "" || endDate == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "start_date and end_date are required"})
		return
	}

	// TODO: Implement actual calendar data query
	calendarData := []gin.H{
		{
			"date":     "2024-01-15",
			"amount":   150000.0,
			"type":     "income",
			"status":   "completed",
			"project":  "ТЦ Мега",
			"estimate": "Смета №001",
		},
		{
			"date":     "2024-02-15",
			"amount":   200000.0,
			"type":     "income",
			"status":   "pending",
			"project":  "ЖК Радужный",
			"estimate": "Смета №002",
		},
	}

	c.JSON(http.StatusOK, gin.H{"data": calendarData})
}

// SetupPaymentScheduleRoutes sets up payment schedule routes
func (h *PaymentHandler) SetupPaymentScheduleRoutes(r *gin.RouterGroup, authMiddleware *auth.AuthMiddleware) {
	paymentGroup := r.Group("/payment-schedules")
	paymentGroup.Use(authMiddleware.Protected())
	{
		paymentGroup.GET("", h.GetPaymentSchedules)
		paymentGroup.POST("", h.CreatePaymentSchedule)
		paymentGroup.GET("/analytics", h.GetPaymentScheduleAnalytics)
		paymentGroup.GET("/calendar", h.GetPaymentScheduleCalendar)

		paymentGroup.Group(":id")
		{
			paymentGroup.GET("", h.GetPaymentSchedule)
			paymentGroup.POST("/execute", h.ExecutePayment)
		}
	}
}

// Helper function to convert float64 to pointer
func float64Ptr(f float64) *float64 {
	return &f
}
