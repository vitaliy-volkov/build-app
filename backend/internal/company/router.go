package company

import (
	"stroy-control-backend/internal/auth"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RouterGroup группа роутов для компаний
type RouterGroup struct {
	companyHandler *CompanyHandler
	middleware     *auth.AuthMiddleware
}

// NewRouterGroup создает новую группу роутов компаний
func NewRouterGroup(db *gorm.DB, authMiddleware *auth.AuthMiddleware) *RouterGroup {
	return &RouterGroup{
		companyHandler: NewCompanyHandler(db),
		middleware:     authMiddleware,
	}
}

// RegisterRoutes регистрирует роуты компаний
func (rg *RouterGroup) RegisterRoutes(r *gin.Engine) {
	// Группа роутов для компаний
	companyGroup := r.Group("/api/v1/companies")
	companyGroup.Use(rg.middleware.Protected())
	{
		// CRUD операции с компаниями
		companyGroup.GET("", rg.companyHandler.ListCompanies)
		// CreateCompany is special: it allows users without a company to create one
		// So we handle auth check inside or use a looser middleware if needed.
		// But here we use Protected() because we need the user_id to link the company.
		companyGroup.POST("", rg.companyHandler.CreateCompany) 
		
		companyGroup.GET("/:id", rg.companyHandler.GetCompany)
		companyGroup.PUT("/:id", rg.companyHandler.UpdateCompany)
	}
}