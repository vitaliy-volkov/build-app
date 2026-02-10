package auth

import (
	"net/http"
	"strings"
	"time"

	"stroy-control-backend/internal/email"
	"stroy-control-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AuthRequest structures
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

type UpdateProfileRequest struct {
	Name  *string `json:"name"`
	Email *string `json:"email" binding:"omitempty,email"`
	Phone *string `json:"phone"`
}

// AuthHandler authentication handler
type AuthHandler struct {
	db           *gorm.DB
	jwtService   *JWTService
	emailService *email.EmailService
}

// NewAuthHandler creates a new instance of AuthHandler
func NewAuthHandler(db *gorm.DB, jwtService *JWTService, emailService *email.EmailService) *AuthHandler {
	return &AuthHandler{
		db:           db,
		jwtService:   jwtService,
		emailService: emailService,
	}
}

// Login endpoint
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Invalid request data", http.StatusBadRequest, err.Error()))
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, models.NewErrorResponse("Invalid email or password", http.StatusUnauthorized))
			return
		}
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Database error", http.StatusInternalServerError))
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusForbidden, models.NewErrorResponse("Account is disabled", http.StatusForbidden))
		return
	}

	if err := models.VerifyPassword(req.Password, user.PasswordHash); err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("Invalid email or password", http.StatusUnauthorized))
		return
	}

	tokens, err := h.jwtService.GenerateTokens(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Failed to generate tokens", http.StatusInternalServerError))
		return
	}

	h.db.Model(&user).Update("last_login_at", time.Now())

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"data": gin.H{
			"user":   user,
			"tokens": tokens,
		},
	})
}

// Register endpoint
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Invalid request data", http.StatusBadRequest, err.Error()))
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	if !models.IsValidPassword(req.Password) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse(
			"Password too weak",
			http.StatusBadRequest,
			"Password must be at least 8 characters and contain mixed case, numbers, or specials.",
		))
		return
	}

	var existingUser models.User
	if err := h.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, models.NewErrorResponse("Email already registered", http.StatusConflict))
		return
	} else if err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Database error", http.StatusInternalServerError))
		return
	}

	hashedPassword, err := models.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Failed to hash password", http.StatusInternalServerError))
		return
	}

	user := models.User{
		Email:        req.Email,
		Name:         req.Name,
		PasswordHash: hashedPassword,
		Role:         req.Role,
		IsActive:     true,
		CompanyID:    req.CompanyID,
		Phone:        req.Phone,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Failed to create user", http.StatusInternalServerError, err.Error()))
		return
	}

	tokens, err := h.jwtService.GenerateTokens(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Failed to generate tokens", http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Registration successful",
		"data": gin.H{
			"user":   user,
			"tokens": tokens,
		},
	})
}

// RefreshToken endpoint
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Invalid request data", http.StatusBadRequest))
		return
	}

	claims, err := h.jwtService.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("Invalid refresh token", http.StatusUnauthorized))
		return
	}

	var user models.User
	if err := h.db.Where("id = ? AND is_active = ?", claims.Subject, true).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("User not found", http.StatusUnauthorized))
		return
	}

	tokens, err := h.jwtService.RefreshTokens(req.RefreshToken, &user)
	if err != nil {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("Failed to refresh tokens", http.StatusUnauthorized))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Tokens refreshed",
		"data":    tokens,
	})
}

// Me endpoint
func (h *AuthHandler) Me(c *gin.Context) {
	userID, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("User not authenticated", http.StatusUnauthorized))
		return
	}

	var user models.User
	// Preload Company if needed, but handle if it's nil safely by not assuming it exists in the struct method
	if err := h.db.Preload("Company").Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse("User not found", http.StatusNotFound))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": user,
		},
	})
}

// Logout endpoint
func (h *AuthHandler) Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Logout successful"})
}

// ChangePassword endpoint
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Invalid request", http.StatusBadRequest))
		return
	}

	userID, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("User not authenticated", http.StatusUnauthorized))
		return
	}

	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse("User not found", http.StatusNotFound))
		return
	}

	if err := models.VerifyPassword(req.CurrentPassword, user.PasswordHash); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Current password incorrect", http.StatusBadRequest))
		return
	}

	if !models.IsValidPassword(req.NewPassword) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("New password too weak", http.StatusBadRequest))
		return
	}

	hashed, err := models.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Hashing failed", http.StatusInternalServerError))
		return
	}

	if err := h.db.Model(&user).Update("password_hash", hashed).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Update failed", http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password changed"})
}

// UpdateProfile endpoint
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Invalid request", http.StatusBadRequest))
		return
	}

	userID, exists := GetUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.NewErrorResponse("Not authenticated", http.StatusUnauthorized))
		return
	}

	var user models.User
	if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, models.NewErrorResponse("User not found", http.StatusNotFound))
		return
	}

	if req.Email != nil && *req.Email != user.Email {
		var check models.User
		if err := h.db.Where("email = ? AND id != ?", *req.Email, userID).First(&check).Error; err == nil {
			c.JSON(http.StatusConflict, models.NewErrorResponse("Email taken", http.StatusConflict))
			return
		}
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}

	if err := h.db.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Update failed", http.StatusInternalServerError))
		return
	}

	// Reload
	h.db.Preload("Company").First(&user, "id = ?", userID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Profile updated",
		"data":    gin.H{"user": user},
	})
}
