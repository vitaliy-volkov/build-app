package auth

import (
	"net/http"
	"time"

	"stroy-control-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// @Summary Login user
// @Description Authenticate user with email and password
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} object{success=bool,message=string,data=object}
// @Failure 400 {object} object{error=string,code=int,details=string}
// @Failure 401 {object} object{error=string,code=int}
// @Router /auth/login [post]

// AuthRequest структуры для запросов аутентификации
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type RegisterRequest struct {
	Email     string          `json:"email" binding:"required,email"`
	Name      string          `json:"name" binding:"required,min=2,max=255"`
	Password  string          `json:"password" binding:"required,min=8"`
	Role      models.UserRole `json:"role" binding:"required"`
	CompanyID *string         `json:"company_id,omitempty"`
	Phone     *string         `json:"phone,omitempty"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// AuthHandler обработчик аутентификации
type AuthHandler struct {
	db         *gorm.DB
	jwtService *JWTService
}

// NewAuthHandler создает новый экземпляр обработчика аутентификации
func NewAuthHandler(db *gorm.DB, jwtService *JWTService) *AuthHandler {
	return &AuthHandler{
		db:         db,
		jwtService: jwtService,
	}
}

// Login endpoint - аутентификация пользователя
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Находим пользователя по email
	var user models.User
	if err := h.db.Where("email = ? AND is_active = ?", req.Email, true).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"Invalid email or password",
				http.StatusUnauthorized,
			))
			return
		}
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Database error",
			http.StatusInternalServerError,
		))
		return
	}

	// Проверяем пароль
	if err := models.VerifyPassword(req.Password, user.PasswordHash); err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"Invalid email or password",
			http.StatusUnauthorized,
		))
		return
	}

	// Генерируем токены
	tokens, err := h.jwtService.GenerateTokens(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to generate tokens",
			http.StatusInternalServerError,
		))
		return
	}

	// Обновляем время последнего входа
	now := time.Now()
	h.db.Model(&user).Update("last_login_at", now)

	// Возвращаем успешный ответ
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"data": gin.H{
			"user": gin.H{
				"id":         user.ID,
				"email":      user.Email,
				"name":       user.Name,
				"role":       user.Role,
				"company_id": user.CompanyID,
				"phone":      user.Phone,
				"avatar_url": user.AvatarURL,
			},
			"tokens": tokens,
		},
	})
}

// @Summary Register new user
// @Description Register a new user with email, name, password and role
// @Tags Authentication
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "User registration data"
// @Success 201 {object} object{success=bool,message=string,data=object}
// @Failure 400 {object} object{error=string,code=int,details=string}
// @Failure 409 {object} object{error=string,code=int}
// @Router /auth/register [post]

// Register endpoint - регистрация нового пользователя
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Валидируем пароль
	if !models.IsValidPassword(req.Password) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Password does not meet security requirements",
			http.StatusBadRequest,
			"Password must be at least 8 characters and contain at least 3 of 4: uppercase, lowercase, numbers, special characters",
		))
		return
	}

	// Проверяем, что email не занят
	var existingUser models.User
	if err := h.db.Where("email = ?", req.Email).First(&existingUser).Error; err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusConflict, models.NewErrorResponse(
			"Email already registered",
			http.StatusConflict,
		))
		return
	}

	// Если указана company_id, проверяем, что компания существует
	if req.CompanyID != nil {
		var company models.Company
		if err := h.db.Where("id = ?", *req.CompanyID).First(&company).Error; err != nil {
			c.JSON(http.StatusBadRequest, models.NewErrorResponse(
				"Invalid company_id",
				http.StatusBadRequest,
			))
			return
		}
	}

	// Хешируем пароль
	hashedPassword, err := models.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to hash password",
			http.StatusInternalServerError,
		))
		return
	}

	// Создаем пользователя
	user := models.User{
		Email:        req.Email,
		Name:         req.Name,
		PasswordHash: hashedPassword,
		Role:         req.Role,
		IsActive:     true,
	}

	// Устанавливаем CompanyID - используем компанию по умолчанию если не указана
	if req.CompanyID != nil {
		user.CompanyID = *req.CompanyID
	} else {
		user.CompanyID = "00000000-0000-0000-0000-000000000001"
	}

	// Устанавливаем Phone только если он предоставлен
	if req.Phone != nil {
		user.Phone = req.Phone
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to create user",
			http.StatusInternalServerError,
		))
		return
	}

	// Генерируем токены
	tokens, err := h.jwtService.GenerateTokens(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to generate tokens",
			http.StatusInternalServerError,
		))
		return
	}

	// Возвращаем успешный ответ
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Registration successful",
		"data": gin.H{
			"user": gin.H{
				"id":         user.ID,
				"email":      user.Email,
				"name":       user.Name,
				"role":       user.Role,
				"company_id": user.CompanyID,
				"phone":      user.Phone,
			},
			"tokens": tokens,
		},
	})
}

// RefreshToken endpoint - обновление токенов
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Валидируем refresh token
	claims, err := h.jwtService.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"Invalid or expired refresh token",
			http.StatusUnauthorized,
		))
		return
	}

	// Находим пользователя
	var user models.User
	if err := h.db.Where("id = ? AND is_active = ?", claims.Subject, true).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
				"User not found or inactive",
				http.StatusUnauthorized,
			))
			return
		}
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Database error",
			http.StatusInternalServerError,
		))
		return
	}

	// Генерируем новую пару токенов
	tokens, err := h.jwtService.RefreshTokens(req.RefreshToken, &user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"Failed to refresh tokens",
			http.StatusUnauthorized,
		))
		return
	}

	// Возвращаем новые токены
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tokens refreshed successfully",
		"data":    tokens,
	})
}

// Logout endpoint - выход из системы
func (h *AuthHandler) Logout(c *gin.Context) {
	// В реальном приложении здесь можно добавить токен в черный список
	// пока что просто возвращаем успешный ответ

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logout successful",
	})
}

// @Summary Get current user info
// @Description Get information about the currently authenticated user
// @Tags Authentication
// @Security ApiKeyAuth
// @Produce json
// @Success 200 {object} object{success=bool,data=object}
// @Failure 401 {object} object{error=string,code=int}
// @Router /auth/me [get]

// Me endpoint - получение информации о текущем пользователе
func (h *AuthHandler) Me(c *gin.Context) {
	// Получаем user_id из контекста (устанавливается middleware)
	userID, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Находим пользователя
	var user models.User
	if err := h.db.Preload("Company").Where("id = ?", userID).First(&user).Error; err != nil {
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

	// Возвращаем информацию о пользователе
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":         user.ID,
				"email":      user.Email,
				"name":       user.Name,
				"role":       user.Role,
				"company_id": user.CompanyID,
				"company": func() gin.H {
					if user.Company.ID != "" {
						return gin.H{
							"id":   user.Company.ID,
							"name": user.Company.Name,
						}
					}
					return nil
				}(),
				"phone":         user.Phone,
				"avatar_url":    user.AvatarURL,
				"last_login_at": user.LastLoginAt,
				"created_at":    user.CreatedAt,
			},
		},
	})
}

// ChangePassword endpoint - смена пароля
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Invalid request data",
			http.StatusBadRequest,
			err.Error(),
		))
		return
	}

	// Получаем user_id из контекста
	userID, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse(
			"User not authenticated",
			http.StatusUnauthorized,
		))
		return
	}

	// Находим пользователя
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

	// Проверяем текущий пароль
	if err := models.VerifyPassword(req.CurrentPassword, user.PasswordHash); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Current password is incorrect",
			http.StatusBadRequest,
		))
		return
	}

	// Валидируем новый пароль
	if !models.IsValidPassword(req.NewPassword) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"New password does not meet security requirements",
			http.StatusBadRequest,
			"Password must be at least 8 characters and contain at least 3 of 4: uppercase, lowercase, numbers, special characters",
		))
		return
	}

	// Хешируем новый пароль
	hashedPassword, err := models.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to hash password",
			http.StatusInternalServerError,
		))
		return
	}

	// Обновляем пароль
	if err := h.db.Model(&user).Update("password_hash", hashedPassword).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse(
			"Failed to update password",
			http.StatusInternalServerError,
		))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password changed successfully",
	})
}
