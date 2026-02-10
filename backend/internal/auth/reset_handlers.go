package auth

import (
	"log"
	"net/http"
	"strings"
	"time"

	"stroy-control-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Password Reset Request
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Code        string `json:"code" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

// RequestPasswordReset generates a code and logs it (mock email)
func (h *AuthHandler) RequestPasswordReset(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Invalid request data", http.StatusBadRequest, err.Error()))
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Do not reveal user existence
		c.JSON(http.StatusOK, gin.H{"message": "If this email exists, a reset code has been sent."})
		return
	}

	// Generate 6-digit code
	code, err := models.GenerateSecureToken(3) // 3 bytes = 6 hex chars
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Failed to generate code", http.StatusInternalServerError))
		return
	}

	// Save to DB (expires in 15 minutes)
	expires := time.Now().Add(15 * time.Minute)

	// Update user with raw SQL or map to avoid strict struct constraints if fields are missing in struct
	if err := h.db.Model(&user).Updates(map[string]interface{}{
		"reset_token":            code,
		"reset_token_expires_at": expires,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Database error", http.StatusInternalServerError))
		return
	}

	// Send Email
	go func() {
		if err := h.emailService.SendPasswordResetEmail(user.Email, code); err != nil {
			log.Printf("Failed to send reset email to %s: %v", user.Email, err)
		} else {
			log.Printf("Reset email sent to %s", user.Email)
		}
	}()

	c.JSON(http.StatusOK, gin.H{"message": "If this email exists, a reset code has been sent."})
}

// ConfirmPasswordReset resets the password using the code
func (h *AuthHandler) ConfirmPasswordReset(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Invalid request data", http.StatusBadRequest, err.Error()))
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Code = strings.TrimSpace(req.Code)

	var user models.User
	if err := h.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Invalid request", http.StatusBadRequest))
		return
	}

	// Verify Code and Expiration
	// Note: reset_token field needs to be added to User struct model for GORM access,
	// or we use raw SQL/map. Let's use map/scan for safety if struct isn't updated yet.
	var storedToken string
	var expiresAt time.Time

	// Using Raw query to ensure we get the values even if model struct isn't fully synced yet in runtime
	row := h.db.Model(&models.User{}).Where("id = ?", user.ID).Select("reset_token, reset_token_expires_at").Row()
	if err := row.Scan(&storedToken, &expiresAt); err != nil {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Invalid or expired code", http.StatusBadRequest))
		return
	}

	if storedToken != req.Code || time.Now().After(expiresAt) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Invalid or expired code", http.StatusBadRequest))
		return
	}

	// Validate new password
	if !models.IsValidPassword(req.NewPassword) {
		c.JSON(http.StatusBadRequest, models.NewErrorResponse("Password must be strong", http.StatusBadRequest))
		return
	}

	// Hash new password
	hashedPassword, err := models.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Failed to process password", http.StatusInternalServerError))
		return
	}

	// Update password and clear token
	if err := h.db.Model(&user).Updates(map[string]interface{}{
		"password_hash":          hashedPassword,
		"reset_token":            gorm.Expr("NULL"),
		"reset_token_expires_at": gorm.Expr("NULL"),
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, models.NewErrorResponse("Failed to update password", http.StatusInternalServerError))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully. You can now login."})
}
