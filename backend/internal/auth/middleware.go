package auth

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"stroy-control-backend/internal/models"
)

// Middleware для JWT аутентификации
type AuthMiddleware struct {
	jwtService *JWTService
}

// NewAuthMiddleware создает новый экземпляр middleware
func NewAuthMiddleware(jwtService *JWTService) *AuthMiddleware {
	return &AuthMiddleware{
		jwtService: jwtService,
	}
}

// Protected middleware для защищенных роутов
func (m *AuthMiddleware) Protected() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Получаем токен из заголовка
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"Authorization header is required",
				http.StatusUnauthorized,
			))
			c.Abort()
			return
		}

		// Извлекаем токен
		tokenString, err := m.jwtService.ExtractTokenFromHeader(authHeader)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"Invalid authorization header format",
				http.StatusUnauthorized,
			))
			c.Abort()
			return
		}

		// Валидируем токен
		claims, err := m.jwtService.ValidateAccessToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"Invalid or expired token",
				http.StatusUnauthorized,
			))
			c.Abort()
			return
		}

		// Сохраняем claims в контекст для использования в обработчиках
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		if claims.CompanyID != nil {
			c.Set("user_company_id", *claims.CompanyID)
		}
		c.Set("token_claims", claims)

		c.Next()
	}
}

// OptionalAuth middleware для опциональной аутентификации
func (m *AuthMiddleware) OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// Если заголовка нет, продолжаем без аутентификации
			c.Next()
			return
		}

		// Извлекаем токен
		tokenString, err := m.jwtService.ExtractTokenFromHeader(authHeader)
		if err != nil {
			// Если ошибка в формате, продолжаем без аутентификации
			c.Next()
			return
		}

		// Валидируем токен
		claims, err := m.jwtService.ValidateAccessToken(tokenString)
		if err != nil {
			// Если токен невалидный, продолжаем без аутентификации
			c.Next()
			return
		}

		// Сохраняем claims в контекст
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		if claims.CompanyID != nil {
			c.Set("user_company_id", *claims.CompanyID)
		}
		c.Set("token_claims", claims)

		c.Next()
	}
}

// RoleMiddleware middleware для проверки ролей пользователя
func (m *AuthMiddleware) RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"User not authenticated",
				http.StatusUnauthorized,
			))
			c.Abort()
			return
		}

		userRoleStr, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"Invalid user role",
				http.StatusUnauthorized,
			))
			c.Abort()
			return
		}

		// Проверяем, есть ли роль пользователя в списке разрешенных ролей
		allowed := false
		for _, requiredRole := range roles {
			if userRoleStr == requiredRole {
				allowed = true
				break
			}
		}

		if !allowed {
			c.JSON(http.StatusForbidden, models.NewErrorResponse(
				"Insufficient permissions",
				http.StatusForbidden,
			))
			c.Abort()
			return
		}

		c.Next()
	}
}

// AdminOnly middleware только для администраторов
func (m *AuthMiddleware) AdminOnly() gin.HandlerFunc {
	return m.RequireRole(string(models.RoleAdmin))
}

// AdminOrDirector middleware для администраторов или директоров
func (m *AuthMiddleware) AdminOrDirector() gin.HandlerFunc {
	return m.RequireRole(string(models.RoleAdmin), string(models.RoleDirector))
}

// ProjectAccess middleware для проверки доступа к проектам
func (m *AuthMiddleware) ProjectAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"User not authenticated",
				http.StatusUnauthorized,
			))
			c.Abort()
			return
		}

		userRoleStr, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"Invalid user role",
				http.StatusUnauthorized,
			))
			c.Abort()
			return
		}

		// Роли с полным доступом к проектам
		fullAccessRoles := []string{
			string(models.RoleAdmin),
			string(models.RoleDirector),
			string(models.RoleProjectManager),
		}

		// Роли с ограниченным доступом
		limitedAccessRoles := []string{
			string(models.RoleForeman),
			string(models.RoleEstimator),
			string(models.RoleSupplyManager),
		}

		// Клиенты могут просматривать только свои проекты
		isClient := userRoleStr == string(models.RoleClient)

		// Проверяем тип доступа
		hasAccess := false
		accessType := "none"

		for _, role := range fullAccessRoles {
			if userRoleStr == role {
				hasAccess = true
				accessType = "full"
				break
			}
		}

		if !hasAccess {
			for _, role := range limitedAccessRoles {
				if userRoleStr == role {
					hasAccess = true
					accessType = "limited"
					break
				}
			}
		}

		if isClient {
			hasAccess = true
			accessType = "client"
		}

		if !hasAccess {
			c.JSON(http.StatusForbidden, models.NewErrorResponse(
				"Insufficient permissions to access projects",
				http.StatusForbidden,
			))
			c.Abort()
			return
		}

		// Сохраняем тип доступа в контекст
		c.Set("project_access_type", accessType)

		c.Next()
	}
}

// CompanyIsolation middleware для изоляции по компаниям
func (m *AuthMiddleware) CompanyIsolation() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Для админов и директоров разрешаем доступ ко всем компаниям
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"User not authenticated",
				http.StatusUnauthorized,
			))
			c.Abort()
			return
		}

		userRoleStr, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"Invalid user role",
				http.StatusUnauthorized,
			))
			c.Abort()
			return
		}

		// Роли с полным доступом ко всем компаниям
		fullCompanyAccess := []string{
			string(models.RoleAdmin),
			string(models.RoleDirector),
		}

		// Проверяем, есть ли у пользователя полный доступ
		hasFullAccess := false
		for _, role := range fullCompanyAccess {
			if userRoleStr == role {
				hasFullAccess = true
				break
			}
		}

		if !hasFullAccess {
			// Для остальных ролей проверяем соответствие компании
			companyID, exists := c.Get("user_company_id")
			if !exists {
				c.JSON(http.StatusForbidden, models.NewErrorResponse(
					"Company access required",
					http.StatusForbidden,
				))
				c.Abort()
				return
			}

			// Сохраняем company ID для дальнейшего использования
			c.Set("allowed_company_id", companyID)
		}

		c.Next()
	}
}

// Helper функция для получения ID пользователя из контекста
func GetUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("user_id")
	if !exists {
		return "", false
	}
	
	userIDStr, ok := userID.(string)
	if !ok {
		return "", false
	}
	
	return userIDStr, true
}

// Helper функция для получения роли пользователя из контекста
func GetUserRole(c *gin.Context) (string, bool) {
	userRole, exists := c.Get("user_role")
	if !exists {
		return "", false
	}
	
	userRoleStr, ok := userRole.(string)
	if !ok {
		return "", false
	}
	
	return userRoleStr, true
}

// Helper функция для получения Company ID пользователя из контекста
func GetUserCompanyID(c *gin.Context) (*string, bool) {
	companyID, exists := c.Get("user_company_id")
	if !exists {
		return nil, false
	}
	
	companyIDStr, ok := companyID.(string)
	if !ok {
		return nil, false
	}
	
	return &companyIDStr, true
}

// Helper функция для получения разрешенного Company ID из контекста
func GetAllowedCompanyID(c *gin.Context) (*string, bool) {
	companyID, exists := c.Get("allowed_company_id")
	if !exists {
		return nil, false
	}
	
	companyIDStr, ok := companyID.(string)
	if !ok {
		return nil, false
	}
	
	return &companyIDStr, true
}