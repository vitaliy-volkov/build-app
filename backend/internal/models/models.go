package models

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// BaseModel contains common fields for all models
type BaseModel struct {
	ID        string     `json:"id" gorm:"primaryKey;type:uuid"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// BeforeCreate universal hook for UUID generation
func (b *BaseModel) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = generateUUID()
	}
	return nil
}

// generateUUID generates UUID v4
func generateUUID() string {
	bytes := make([]byte, 16)
	_, err := rand.Read(bytes)
	if err != nil {
		panic("failed to generate UUID: " + err.Error())
	}
	bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10

	return fmt.Sprintf("%x-%x-%x-%x-%x", bytes[0:4], bytes[4:6], bytes[6:8], bytes[8:10], bytes[10:16])
}

// PaginatedRequest structure for paginated requests
type PaginatedRequest struct {
	Page     int    `json:"page" form:"page" binding:"min=1"`
	Limit    int    `json:"limit" form:"limit" binding:"min=1,max=100"`
	SortBy   string `json:"sort_by" form:"sort_by"`
	SortDesc bool   `json:"sort_desc" form:"sort_desc"`
}

// GetDefaultPage returns default values for page
func (p *PaginatedRequest) GetDefaultPage() {
	if p.Page == 0 {
		p.Page = 1
	}
	if p.Limit == 0 {
		p.Limit = 20
	}
}

// GetOffset returns offset for query
func (p *PaginatedRequest) GetOffset() int {
	return (p.Page - 1) * p.Limit
}

// GetLimit returns limit for query
func (p *PaginatedRequest) GetLimit() int {
	return p.Limit
}

// PaginatedResponse structure for paginated response
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
	HasNext    bool        `json:"has_next"`
	HasPrev    bool        `json:"has_prev"`
}

// NewPaginatedResponse creates new paginated response
func NewPaginatedResponse(data interface{}, total int64, page, limit int) *PaginatedResponse {
	totalPages := int((total + int64(limit) - 1) / int64(limit))

	return &PaginatedResponse{
		Data:       data,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}
}

// ErrorResponse structure for API errors
type ErrorResponse struct {
	Error   string `json:"error"`
	Code    int    `json:"code"`
	Details string `json:"details,omitempty"`
}

// NewErrorResponse creates new error response
func NewErrorResponse(message string, code int, details ...string) *ErrorResponse {
	errResp := &ErrorResponse{
		Error: message,
		Code:  code,
	}
	if len(details) > 0 {
		errResp.Details = details[0]
	}
	return errResp
}

// ValidationError structure for validation errors
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ValidationResponse structure for response with validation errors
type ValidationResponse struct {
	Errors []ValidationError `json:"errors"`
}

// AddError adds validation error
func (v *ValidationResponse) AddError(field, message string) {
	v.Errors = append(v.Errors, ValidationError{
		Field:   field,
		Message: message,
	})
}

// IsValid checks for validation errors
func (v *ValidationResponse) IsValid() bool {
	return len(v.Errors) == 0
}

// StringSliceContains checks if string is contained in slice
func StringSliceContains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// StringPtr returns pointer to string
func StringPtr(s string) *string {
	return &s
}

// TimePtr returns pointer to time
func TimePtr(t time.Time) *time.Time {
	return &t
}

// FormatDate formats date to string
func FormatDate(t time.Time) string {
	return t.Format("2006-01-02")
}

// ParseDate parses date from string
func ParseDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", dateStr)
}

// IntPtr returns pointer to int
func IntPtr(i int) *int {
	return &i
}

// BoolPtr returns pointer to bool
func BoolPtr(b bool) *bool {
	return &b
}

// IsValidEmail checks email validity
func IsValidEmail(email string) bool {
	if len(email) < 5 || len(email) > 254 {
		return false
	}

	atCount := 0
	for _, char := range email {
		if char == '@' {
			atCount++
		}
	}

	return atCount == 1
}

// HashPassword hashes password using bcrypt
func HashPassword(password string) (string, error) {
	// Minimal password requirements
	if len(password) < 8 {
		return "", fmt.Errorf("password must be at least 8 characters long")
	}

	// Hash password with cost factor 12 (balance between security and performance)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}

	return string(hashedPassword), nil
}

// VerifyPassword verifies password against hash
func VerifyPassword(password, hashedPassword string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

// IsValidPassword checks if password meets security requirements
func IsValidPassword(password string) bool {
	if len(password) < 8 {
		return false
	}

	// Check for different character types
	hasUpper := false
	hasLower := false
	hasDigit := false
	hasSpecial := false

	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			hasUpper = true
		case char >= 'a' && char <= 'z':
			hasLower = true
		case char >= '0' && char <= '9':
			hasDigit = true
		case char == '!' || char == '@' || char == '#' || char == '$' || char == '%' || char == '^' || char == '&' || char == '*':
			hasSpecial = true
		}
	}

	// Password must contain at least 3 of 4 character types
	characterTypes := 0
	if hasUpper {
		characterTypes++
	}
	if hasLower {
		characterTypes++
	}
	if hasDigit {
		characterTypes++
	}
	if hasSpecial {
		characterTypes++
	}

	return characterTypes >= 3
}

// GenerateSecureToken generates cryptographically secure token
func GenerateSecureToken(length int) (string, error) {
	if length <= 0 {
		return "", fmt.Errorf("token length must be positive")
	}

	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate secure token: %w", err)
	}

	return hex.EncodeToString(bytes), nil
}
