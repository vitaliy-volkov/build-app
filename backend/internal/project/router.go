package project

import (
	"stroy-control-backend/internal/auth"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RouterGroup группа роутов для проектов
type RouterGroup struct {
	projectHandler *ProjectHandler
	teamHandler    *TeamHandler
	middleware     *auth.AuthMiddleware
}

// NewRouterGroup создает новую группу роутов проектов
func NewRouterGroup(db *gorm.DB, authMiddleware *auth.AuthMiddleware) *RouterGroup {
	return &RouterGroup{
		projectHandler: NewProjectHandler(db),
		teamHandler:    NewTeamHandler(db),
		middleware:     authMiddleware,
	}
}

// RegisterRoutes регистрирует роуты проектов
func (rg *RouterGroup) RegisterRoutes(r *gin.Engine) {
	// Временный публичный эндпоинт для тестирования
	publicHandler := NewPublicHandler(rg.projectHandler.db)
	r.GET("/api/v1/public/projects", publicHandler.ListProjectsPublic)

	// Группа роутов для проектов
	projectGroup := r.Group("/api/v1/projects")
	projectGroup.Use(rg.middleware.Protected())
	{
		// CRUD операции с проектами
		projectGroup.GET("", rg.projectHandler.ListProjects)
		projectGroup.POST("", rg.projectHandler.CreateProject)
		projectGroup.GET("/:id", rg.projectHandler.GetProject)
		projectGroup.PUT("/:id", rg.projectHandler.UpdateProject)
		projectGroup.DELETE("/:id", rg.projectHandler.DeleteProject)

		// Управление командой проекта
		teamGroup := projectGroup.Group("/:id/team")
		{
			teamGroup.GET("", rg.teamHandler.GetProjectTeam)
			teamGroup.POST("", rg.teamHandler.AddTeamMember)
			teamGroup.PUT("/:user_id", rg.teamHandler.UpdateMemberRole)
			teamGroup.DELETE("/:user_id", rg.teamHandler.RemoveTeamMember)
		}
	}
}
