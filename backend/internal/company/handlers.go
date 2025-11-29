package company

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"stroy-control-backend/internal/models"
)

// CompanyRequest структуры для запросов компании
type CreateCompanyRequest struct {
	Name    string `json:"name" binding:"required,min=2,max=255"`
	Address string `json:"address"`
	INN     string `json:"inn" binding:"omitempty,len=10"`
	KPP     string `json:"kpp" binding:"omitempty,len=9"`
	OGRN    string `json:"ogrn" binding:"omitempty,len=13"`
	Email   string `json:"email" binding:"omitempty,email"`
	Phone   string `json:"phone"`
	Website string `json:"website"`
}

type UpdateCompanyRequest struct {
	Name    *string `json:"name,omitempty"`
	Address *string `json:"address,omitempty"`
	INN     *string `json:"inn,omitempty"`
	KPP     *string `json:"kpp,omitempty"`
	OGRN    *string `json:"ogrn,omitempty"`
	Email   *string `json:"email,omitempty"`
	Phone   *string `json:"phone,omitempty"`
	Website *string `json:"website,omitempty"`
}

// CompanyHandler обработчик компаний
type CompanyHandler struct {
	db *gorm.DB
}

// NewCompanyHandler создает новый экземпляр обработчика компаний
func NewCompanyHandler(db *gorm.DB) *CompanyHandler {
	return &CompanyHandler{
		db: db,
	}
}

// ListCompanies получить список компаний с пагинацией
func (h *CompanyHandler) ListCompanies(c *gin.Context) {
	// Получаем параметры пагинации
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	sortBy := c.DefaultQuery("sort_by", "name")
	sortDesc := c.DefaultQuery("sort_desc", "false") == "true"

	// Получаем user_id из контекста пользователя
	userID := c.GetString("user_id")
	
	// Получаем пользователя для определения доступа
	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				"User not found",
				http.StatusNotFound,
			))
			return
		}
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Database error",
			http.StatusInternalServerError,
		))
		return
	}

	// Базовый запрос
	query := h.db.Model(&models.Company{}).Where("deleted_at IS NULL")

	// Если пользователь не админ, показываем только его компанию
	if user.Role != models.RoleAdmin {
		query = query.Where("id = ?", user.CompanyID)
	}

	// Применяем сортировку
	if sortDesc {
		query = query.Order(sortBy + " DESC")
	} else {
		query = query.Order(sortBy + " ASC")
	}

	// Получаем общее количество записей
	var total int64
	query.Count(&total)

	// Выполняем запрос с пагинацией
	var companies []models.Company
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Find(&companies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to fetch companies",
			http.StatusInternalServerError,
		))
		return
	}

	// Возвращаем пагинированный ответ
	c.JSON(http.StatusOK, models.NewPaginatedResponse(
		gin.H{
			"companies": companies,
		},
		total,
		page,
		limit,
	))
}

// CreateCompany создать новую компанию
func (h *CompanyHandler) CreateCompany(c *gin.Context) {
	var req CreateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Получаем user_id из контекста пользователя
	userID := c.GetString("user_id")
	
	// Получаем пользователя
	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

    // Check if user already has a company (optional, but good for onboarding)
    // If CompanyID is set and not the default/empty one
    if user.CompanyID != "" && user.CompanyID != "00000000-0000-0000-0000-000000000001" {
         c.JSON(http.StatusConflict, models.NewErrorResponse(
            "User already belongs to a company",
            http.StatusConflict,
         ))
         return
    }

	// Проверяем уникальность INN (если указан)
	if req.INN != "" {
		var existingCompany models.Company
		if err := h.db.Where("inn = ? AND deleted_at IS NULL", req.INN).First(&existingCompany).Error; err != gorm.ErrRecordNotFound {
			c.JSON(http.StatusConflict, models.NewErrorResponse(
				"Company with this INN already exists",
				http.StatusConflict,
			))
			return
		}
	}

	// Start Transaction
    tx := h.db.Begin()
    defer func() {
        if r := recover(); r != nil {
            tx.Rollback()
        }
    }()

	// Создаем компанию
	company := models.Company{
		Name:    req.Name,
		Address: req.Address,
		INN:     req.INN,
		KPP:     req.KPP,
		OGRN:    req.OGRN,
		Email:   req.Email,
		Phone:   req.Phone,
		Website: req.Website,
	}

	if err := tx.Create(&company).Error; err != nil {
        tx.Rollback()
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to create company",
			http.StatusInternalServerError,
		))
		return
	}

    // Link user to company and make them Director
    updates := map[string]interface{}{
        "company_id": company.ID,
        "role":       models.RoleDirector,
    }
    if err := tx.Model(&user).Updates(updates).Error; err != nil {
        tx.Rollback()
        c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
            "Failed to link user to company",
            http.StatusInternalServerError,
        ))
        return
    }

    if err := tx.Commit().Error; err != nil {
         c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
            "Transaction failed",
            http.StatusInternalServerError,
        ))
        return
    }

    // Return updated user info alongside company
    user.CompanyID = company.ID
    user.Role = models.RoleDirector

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Company created successfully",
		"data": gin.H{
			"company": company,
            "user": user, // Return updated user so frontend can update context
		},
	})
}

// GetCompany получить детали компании
func (h *CompanyHandler) GetCompany(c *gin.Context) {
	companyID := c.Param("id")

	// Получаем user_id из контекста пользователя
	userID := c.GetString("user_id")
	
	// Получаем пользователя для определения доступа
	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Получаем компанию
	var company models.Company
	if err := h.db.Where("id = ? AND deleted_at IS NULL", companyID).First(&company).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				"Company not found",
				http.StatusNotFound,
			))
			return
		}
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Database error",
			http.StatusInternalServerError,
		))
		return
	}

	// Проверяем доступ к компании
	if company.ID != user.CompanyID && user.Role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions",
			http.StatusForbidden,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"company": company,
		},
	})
}

// UpdateCompany обновить компанию
func (h *CompanyHandler) UpdateCompany(c *gin.Context) {
	companyID := c.Param("id")
	var req UpdateCompanyRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Получаем user_id из контекста пользователя
	userID := c.GetString("user_id")
	
	// Получаем пользователя для определения доступа
	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Получаем существующую компанию
	var company models.Company
	if err := h.db.Where("id = ? AND deleted_at IS NULL", companyID).First(&company).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				"Company not found",
				http.StatusNotFound,
			))
			return
		}
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Database error",
			http.StatusInternalServerError,
		))
		return
	}

	// Проверяем доступ к компании
	if company.ID != user.CompanyID && user.Role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions",
			http.StatusForbidden,
		))
		return
	}

	// Проверяем уникальность INN (если изменяется)
	if req.INN != nil && *req.INN != company.INN {
		var existingCompany models.Company
		if err := h.db.Where("inn = ? AND id != ? AND deleted_at IS NULL", *req.INN, companyID).First(&existingCompany).Error; err != gorm.ErrRecordNotFound {
			c.JSON(http.StatusConflict, models.NewErrorResponse(
				"Company with this INN already exists",
				http.StatusConflict,
			))
			return
		}
	}

	// Обновляем поля
	updates := make(map[string]interface{})

	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.INN != nil {
		updates["inn"] = *req.INN
	}
	if req.KPP != nil {
		updates["kpp"] = *req.KPP
	}
	if req.OGRN != nil {
		updates["ogrn"] = *req.OGRN
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Website != nil {
		updates["website"] = *req.Website
	}

	// Выполняем обновление
	if err := h.db.Model(&company).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to update company",
			http.StatusInternalServerError,
		))
		return
	}

	// Загружаем обновленную компанию
	if err := h.db.First(&company).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to load updated company",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Company updated successfully",
		"data": gin.H{
			"company": company,
		},
	})
}