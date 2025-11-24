package project

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"stroy-control-backend/internal/models"
)

// @Summary List projects
// @Description Get list of projects with pagination
// @Tags Projects
// @Security ApiKeyAuth
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Param sort_by query string false "Sort field" default(created_at)
// @Param sort_desc query bool false "Sort descending" default(false)
// @Success 200 {object} PaginatedResponse
// @Failure 401 {object} object{error=string,code=int}
// @Router /projects [get]

// ProjectRequest структуры для запросов проекта
type CreateProjectRequest struct {
	CompanyID           string                    `json:"company_id" binding:"required,uuid"`
	Name                string                    `json:"name" binding:"required,min=2,max=255"`
	Address             string                    `json:"address" binding:"required,min=5"`
	ContractNumber      string                    `json:"contract_number" binding:"required,min=3,max=100"`
	ContractDate        string                    `json:"contract_date" binding:"required,datetime=2006-01-02"`
	Description         *string                   `json:"description,omitempty"`
	CustomerID          *string                   `json:"customer_id,omitempty"`
	GeneralContractorID *string                   `json:"general_contractor_id,omitempty"`
	ContactPersonID     *string                   `json:"contact_person_id,omitempty"`
	Status              models.ProjectStatus      `json:"status" binding:"required"`
}

type UpdateProjectRequest struct {
	Name                *string                   `json:"name,omitempty"`
	Address             *string                   `json:"address,omitempty"`
	ContractNumber      *string                   `json:"contract_number,omitempty"`
	ContractDate        *string                   `json:"contract_date,omitempty"`
	Description         *string                   `json:"description,omitempty"`
	CustomerID          *string                   `json:"customer_id,omitempty"`
	GeneralContractorID *string                   `json:"general_contractor_id,omitempty"`
	ContactPersonID     *string                   `json:"contact_person_id,omitempty"`
	Status              *models.ProjectStatus     `json:"status,omitempty"`
}

// ProjectHandler обработчик проектов
type ProjectHandler struct {
	db *gorm.DB
}

// NewProjectHandler создает новый экземпляр обработчика проектов
func NewProjectHandler(db *gorm.DB) *ProjectHandler {
	return &ProjectHandler{
		db: db,
	}
}

// ListProjects получить список проектов с пагинацией
func (h *ProjectHandler) ListProjects(c *gin.Context) {
	// Получаем параметры пагинации
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortDesc := c.DefaultQuery("sort_desc", "false") == "true"

	// Получаем company_id из контекста пользователя
	userID := c.GetString("user_id")
	
	// Получаем пользователя для определения company_id
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
	query := h.db.Model(&models.Project{}).
		Preload("Company").
		Preload("Customer").
		Preload("Team.User").
		Where("company_id = ? AND deleted_at IS NULL", user.CompanyID)

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
	var projects []models.Project
	offset := (page - 1) * limit
	if err := query.Offset(offset).Limit(limit).Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to fetch projects",
			http.StatusInternalServerError,
		))
		return
	}

	// Возвращаем пагинированный ответ
	c.JSON(http.StatusOK, models.NewPaginatedResponse(
		gin.H{
			"projects": projects,
		},
		total,
		page,
		limit,
	))
}

// @Summary Create new project
// @Description Create a new construction project
// @Tags Projects
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param request body CreateProjectRequest true "Project data"
// @Success 201 {object} object{success=bool,message=string,data=object}
// @Failure 400 {object} object{error=string,code=int,details=string}
// @Failure 403 {object} object{error=string,code=int}
// @Router /projects [post]

// CreateProject создать новый проект
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var req CreateProjectRequest
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
	
	// Получаем пользователя для проверки компании
	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Проверяем, что пользователь имеет доступ к указанной компании
	if user.CompanyID != req.CompanyID && user.Role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions",
			http.StatusForbidden,
		))
		return
	}

	// Парсим дату контракта
	contractDate, err := models.ParseDate(req.ContractDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid contract date format",
			http.StatusBadRequest,
			"Expected format: YYYY-MM-DD",
		))
		return
	}

	// Создаем проект
	project := models.Project{
		CompanyID:            req.CompanyID,
		Name:                 req.Name,
		Address:              req.Address,
		ContractNumber:       req.ContractNumber,
		ContractDate:         contractDate,
		Description:          req.Description,
		CustomerID:           req.CustomerID,
		GeneralContractorID:  req.GeneralContractorID,
		ContactPersonID:      req.ContactPersonID,
		Status:               req.Status,
	}

	if err := h.db.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to create project",
			http.StatusInternalServerError,
		))
		return
	}

	// Загружаем связанные данные
	if err := h.db.Preload("Company").Preload("Customer").First(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to load project details",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Project created successfully",
		"data": gin.H{
			"project": project,
		},
	})
}

// GetProject получить детали проекта
func (h *ProjectHandler) GetProject(c *gin.Context) {
	projectID := c.Param("id")

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

	// Получаем проект
	var project models.Project
	if err := h.db.Preload("Company").Preload("Customer").Preload("Team.User").Where("id = ? AND deleted_at IS NULL", projectID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				"Project not found",
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

	// Проверяем доступ к проекту
	if project.CompanyID != user.CompanyID && user.Role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions",
			http.StatusForbidden,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"project": project,
		},
	})
}

// UpdateProject обновить проект
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	projectID := c.Param("id")
	var req UpdateProjectRequest

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

	// Получаем существующий проект
	var project models.Project
	if err := h.db.Where("id = ? AND deleted_at IS NULL", projectID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				"Project not found",
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

	// Проверяем доступ к проекту
	if project.CompanyID != user.CompanyID && user.Role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions",
			http.StatusForbidden,
		))
		return
	}

	// Обновляем поля
	updates := make(map[string]interface{})
	updates["updated_at"] = time.Now()

	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.ContractNumber != nil {
		updates["contract_number"] = *req.ContractNumber
	}
	if req.ContractDate != nil {
		contractDate, err := models.ParseDate(*req.ContractDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				"Invalid contract date format",
				http.StatusBadRequest,
				"Expected format: YYYY-MM-DD",
			))
			return
		}
		updates["contract_date"] = contractDate
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.CustomerID != nil {
		updates["customer_id"] = *req.CustomerID
	}
	if req.GeneralContractorID != nil {
		updates["general_contractor_id"] = *req.GeneralContractorID
	}
	if req.ContactPersonID != nil {
		updates["contact_person_id"] = *req.ContactPersonID
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	// Выполняем обновление
	if err := h.db.Model(&project).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to update project",
			http.StatusInternalServerError,
		))
		return
	}

	// Загружаем обновленный проект с связанными данными
	if err := h.db.Preload("Company").Preload("Customer").Preload("Team.User").First(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to load updated project",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Project updated successfully",
		"data": gin.H{
			"project": project,
		},
	})
}

// DeleteProject удалить проект (soft delete)
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	projectID := c.Param("id")

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

	// Получаем существующий проект
	var project models.Project
	if err := h.db.Where("id = ? AND deleted_at IS NULL", projectID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				"Project not found",
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

	// Проверяем доступ к проекту
	if project.CompanyID != user.CompanyID && user.Role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions",
			http.StatusForbidden,
		))
		return
	}

	// Выполняем soft delete
	if err := h.db.Delete(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to delete project",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Project deleted successfully",
	})
}