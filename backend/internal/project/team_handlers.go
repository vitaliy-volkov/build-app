package project

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"stroy-control-backend/internal/models"
)

// TeamRequest структуры для запросов управления командой
type AddTeamMemberRequest struct {
	UserID string `json:"user_id" binding:"required,uuid"`
	Role   string `json:"role" binding:"required,min=2,max=100"`
}

type UpdateMemberRoleRequest struct {
	Role string `json:"role" binding:"required,min=2,max=100"`
}

// TeamHandler обработчик управления командой проекта
type TeamHandler struct {
	db *gorm.DB
}

// NewTeamHandler создает новый экземпляр обработчика команды
func NewTeamHandler(db *gorm.DB) *TeamHandler {
	return &TeamHandler{
		db: db,
	}
}

// GetProjectTeam получить команду проекта
func (h *TeamHandler) GetProjectTeam(c *gin.Context) {
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

	// Проверяем существование проекта и доступ
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

	// Получаем команду проекта
	var teamMembers []models.ProjectMember
	if err := h.db.Preload("User").Where("project_id = ?", projectID).Find(&teamMembers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to fetch team members",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"project_id": projectID,
			"team_members": teamMembers,
			"count": len(teamMembers),
		},
	})
}

// AddTeamMember добавить члена команды в проект
func (h *TeamHandler) AddTeamMember(c *gin.Context) {
	projectID := c.Param("id")
	var req AddTeamMemberRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Получаем user_id из контекста пользователя
	currentUserID := c.GetString("user_id")
	
	// Получаем текущего пользователя для определения доступа
	var currentUser models.User
	if err := h.db.Where("id = ?", currentUserID).First(&currentUser).Error; err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Проверяем существование проекта
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

	// Проверяем доступ к проекту (только админы и менеджеры могут добавлять участников)
	if project.CompanyID != currentUser.CompanyID && currentUser.Role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions",
			http.StatusForbidden,
		))
		return
	}

	if currentUser.Role != models.RoleAdmin && currentUser.Role != models.RoleManager {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions - only admins and managers can add team members",
			http.StatusForbidden,
		))
		return
	}

	// Проверяем, что добавляемый пользователь существует
	var newMember models.User
	if err := h.db.Where("id = ? AND is_active = ?", req.UserID, true).First(&newMember).Error; err != nil {
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

	// Проверяем, что пользователь из той же компании
	if newMember.CompanyID != project.CompanyID && currentUser.Role != models.RoleAdmin {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Cannot add users from other companies",
			http.StatusBadRequest,
		))
		return
	}

	// Проверяем, что пользователь уже не состоит в команде
	var existingMember models.ProjectMember
	if err := h.db.Where("project_id = ? AND user_id = ?", projectID, req.UserID).First(&existingMember).Error; err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusConflict, models.NewErrorResponse(
			"User is already a member of this project",
			http.StatusConflict,
		))
		return
	}

	// Добавляем пользователя в команду
	teamMember := models.ProjectMember{
		ProjectID: projectID,
		UserID:    req.UserID,
		Role:      req.Role,
	}

	if err := h.db.Create(&teamMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to add team member",
			http.StatusInternalServerError,
		))
		return
	}

	// Загружаем связанные данные
	if err := h.db.Preload("User").First(&teamMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to load team member details",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Team member added successfully",
		"data": gin.H{
			"team_member": teamMember,
		},
	})
}

// UpdateMemberRole обновить роль участника команды
func (h *TeamHandler) UpdateMemberRole(c *gin.Context) {
	projectID := c.Param("id")
	userID := c.Param("user_id")
	var req UpdateMemberRoleRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Получаем user_id из контекста пользователя
	currentUserID := c.GetString("user_id")
	
	// Получаем текущего пользователя для определения доступа
	var currentUser models.User
	if err := h.db.Where("id = ?", currentUserID).First(&currentUser).Error; err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Проверяем существование проекта
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
	if project.CompanyID != currentUser.CompanyID && currentUser.Role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions",
			http.StatusForbidden,
		))
		return
	}

	if currentUser.Role != models.RoleAdmin && currentUser.Role != models.RoleManager {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions - only admins and managers can update team member roles",
			http.StatusForbidden,
		))
		return
	}

	// Получаем участника команды
	var teamMember models.ProjectMember
	if err := h.db.Preload("User").Where("project_id = ? AND user_id = ?", projectID, userID).First(&teamMember).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				"Team member not found",
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

	// Обновляем роль
	if err := h.db.Model(&teamMember).Update("role", req.Role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to update member role",
			http.StatusInternalServerError,
		))
		return
	}

	// Загружаем обновленные данные
	if err := h.db.Preload("User").First(&teamMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to load updated team member",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Member role updated successfully",
		"data": gin.H{
			"team_member": teamMember,
		},
	})
}

// RemoveTeamMember удалить участника из команды
func (h *TeamHandler) RemoveTeamMember(c *gin.Context) {
	projectID := c.Param("id")
	userID := c.Param("user_id")

	// Получаем user_id из контекста пользователя
	currentUserID := c.GetString("user_id")
	
	// Получаем текущего пользователя для определения доступа
	var currentUser models.User
	if err := h.db.Where("id = ?", currentUserID).First(&currentUser).Error; err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Проверяем существование проекта
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
	if project.CompanyID != currentUser.CompanyID && currentUser.Role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions",
			http.StatusForbidden,
		))
		return
	}

	if currentUser.Role != models.RoleAdmin && currentUser.Role != models.RoleManager {
		c.JSON(http.StatusForbidden, models.NewErrorResponse(
			"Insufficient permissions - only admins and managers can remove team members",
			http.StatusForbidden,
		))
		return
	}

	// Получаем участника команды
	var teamMember models.ProjectMember
	if err := h.db.Where("project_id = ? AND user_id = ?", projectID, userID).First(&teamMember).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, models.NewErrorResponse(
				"Team member not found",
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

	// Удаляем участника из команды
	if err := h.db.Delete(&teamMember).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to remove team member",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Team member removed successfully",
	})
}