package finance

import (
	"net/http"
	"strconv"
	"time"

	"stroy-control-backend/internal/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type FinanceHandler struct {
	db *gorm.DB
}

func NewFinanceHandler(db *gorm.DB) *FinanceHandler {
	return &FinanceHandler{db: db}
}

type CreateTransactionRequest struct {
	ProjectID   *string                  `json:"project_id"`
	Date        string                   `json:"date" binding:"required"` // YYYY-MM-DD
	Amount      float64                  `json:"amount" binding:"required"`
	Type        models.TransactionType   `json:"type" binding:"required"`
	Status      models.TransactionStatus `json:"status"`
	Description string                   `json:"description"`
}

// GetTransactions returns list of transactions with filters
func (h *FinanceHandler) GetTransactions(c *gin.Context) {
	userID := c.GetString("user_id")
	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	projectID := c.Query("project_id")
	typeFilter := c.Query("type")

	if user.CompanyID == nil {
		c.JSON(http.StatusOK, models.NewPaginatedResponse([]models.Transaction{}, 0, page, limit))
		return
	}

	query := h.db.Model(&models.Transaction{}).Where("company_id = ?", *user.CompanyID)

	if projectID != "" {
		query = query.Where("project_id = ?", projectID)
	}
	if typeFilter != "" {
		query = query.Where("type = ?", typeFilter)
	}

	var total int64
	query.Count(&total)

	var transactions []models.Transaction
	offset := (page - 1) * limit
	if err := query.Order("date DESC, created_at DESC").Offset(offset).Limit(limit).Preload("Project").Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	c.JSON(http.StatusOK, models.NewPaginatedResponse(transactions, total, page, limit))
}

// CreateTransaction creates a new transaction
func (h *FinanceHandler) CreateTransaction(c *gin.Context) {
	var req CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetString("user_id")
	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	status := req.Status
	if status == "" {
		status = models.TransactionStatusPaid // Default
	}

	if user.CompanyID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User must belong to a company to create transactions"})
		return
	}

	tx := models.Transaction{
		CompanyID:   *user.CompanyID,
		ProjectID:   req.ProjectID,
		Date:        date,
		Amount:      req.Amount,
		Type:        req.Type,
		Status:      status,
		Description: req.Description,
		CreatedBy:   userID,
	}

	if err := h.db.Create(&tx).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "data": tx})
}

// GetStats returns financial stats for dashboard
func (h *FinanceHandler) GetStats(c *gin.Context) {
    userID := c.GetString("user_id")
	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

    type Result struct {
        Type string
        Total float64
    }

    var results []Result
    if user.CompanyID != nil {
        h.db.Model(&models.Transaction{}).
            Select("type, sum(amount) as total").
            Where("company_id = ? AND status = ?", *user.CompanyID, models.TransactionStatusPaid).
            Group("type").
            Scan(&results)
    }

    stats := gin.H{
        "income": 0.0,
        "expense": 0.0,
        "balance": 0.0,
    }

    for _, r := range results {
        if r.Type == string(models.TransactionTypeIncome) {
            stats["income"] = r.Total
        } else if r.Type == string(models.TransactionTypeExpense) {
            stats["expense"] = r.Total
        }
    }
    stats["balance"] = stats["income"].(float64) - stats["expense"].(float64)

    c.JSON(http.StatusOK, stats)
}
