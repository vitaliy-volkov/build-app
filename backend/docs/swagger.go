package docs

import (
	"stroy-control-backend/internal/auth"
	"stroy-control-backend/internal/company"
	"stroy-control-backend/internal/config"
	"stroy-control-backend/internal/project"

	"github.com/gin-gonic/gin"
	// swaggerFiles "github.com/swaggo/files"
	// ginSwagger "github.com/swaggo/gin-swagger"
)

// @title Construction Control API
// @version 1.0
// @description This is a construction control system backend API with JWT authentication, project management, team management, and company management.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@stroy-control.ru
// @contact.url http://www.example.com/support

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name Authorization

// @schemes http https

// InitSwagger инициализирует Swagger документацию
func InitSwagger(r *gin.Engine) {
	// Swagger documentation route
	// r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
}

// InitAPIHandlers регистрирует API handlers для генерации документации
func InitAPIHandlers(
	authRouter *auth.RouterGroup,
	projectRouter *project.RouterGroup,
	companyRouter *company.RouterGroup,
) {
	// This function is used to ensure all handlers are imported
	// and available for Swagger documentation generation
	authRouter.RegisterRoutes(&gin.Engine{})
	projectRouter.RegisterRoutes(&gin.Engine{})
	companyRouter.RegisterRoutes(&gin.Engine{})
}

// LoadConfig загружает конфигурацию для Swagger
func LoadConfig() *config.Config {
	cfg, err := config.Load()
	if err != nil {
		panic("Failed to load config for Swagger: " + err.Error())
	}
	return cfg
}
