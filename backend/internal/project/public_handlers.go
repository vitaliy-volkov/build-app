package project

import (
	"net/http"
	"stroy-control-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// PublicHandler обработчик для публичных эндпоинтов
type PublicHandler struct {
	db *gorm.DB
}

// NewPublicHandler создает новый публичный обработчик
func NewPublicHandler(db *gorm.DB) *PublicHandler {
	return &PublicHandler{
		db: db,
	}
}

// ListProjectsPublic возвращает список проектов без авторизации
func (h *PublicHandler) ListProjectsPublic(c *gin.Context) {
	var projects []models.Project

	// Получаем проекты без фильтрации по пользователю
	if err := h.db.Where("deleted_at IS NULL").Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to fetch projects",
			http.StatusInternalServerError,
		))
		return
	}

	// Формируем ответ
	response := models.NewPaginatedResponse(projects, int64(len(projects)), 1, len(projects))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}
