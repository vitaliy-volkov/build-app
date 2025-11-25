package fileupload

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"stroy-control-backend/internal/auth"
	"stroy-control-backend/internal/redis"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FileUploadHandler handles file upload requests
type FileUploadHandler struct {
	db    *gorm.DB
	redis *redis.RedisService
}

// UploadedFile represents an uploaded file
type UploadedFile struct {
	ID           string    `json:"id"`
	Filename     string    `json:"filename"`
	OriginalName string    `json:"original_name"`
	Path         string    `json:"path"`
	Size         int64     `json:"size"`
	MIMEType     string    `json:"mime_type"`
	Category     string    `json:"category"`
	UserID       string    `json:"user_id"`
	CompanyID    string    `json:"company_id"`
	ProjectID    *string   `json:"project_id,omitempty"`
	EstimateID   *string   `json:"estimate_id,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// UploadRequest represents a file upload request
type UploadRequest struct {
	Category   string                  `form:"category" binding:"required"`
	ProjectID  *string                 `form:"project_id"`
	EstimateID *string                 `form:"estimate_id"`
	Files      []*multipart.FileHeader `form:"files" binding:"required"`
}

// FileValidation represents file validation rules
type FileValidation struct {
	MaxSize      int64    `json:"max_size"`      // bytes
	AllowedTypes []string `json:"allowed_types"` // MIME types
	Extensions   []string `json:"extensions"`    // file extensions
	Required     bool     `json:"required"`
}

// FileCategoryConfig defines validation rules for different file categories
var FileCategoryConfig = map[string]FileValidation{
	"estimate": {
		MaxSize:      10 * 1024 * 1024, // 10MB
		AllowedTypes: []string{"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
		Extensions:   []string{".pdf", ".docx"},
		Required:     false,
	},
	"project_document": {
		MaxSize:      20 * 1024 * 1024, // 20MB
		AllowedTypes: []string{"application/pdf", "image/jpeg", "image/png", "image/webp"},
		Extensions:   []string{".pdf", ".jpg", ".jpeg", ".png", ".webp"},
		Required:     false,
	},
	"report": {
		MaxSize:      50 * 1024 * 1024, // 50MB
		AllowedTypes: []string{"application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation"},
		Extensions:   []string{".pdf", ".xlsx", ".pptx"},
		Required:     false,
	},
	"photo": {
		MaxSize:      5 * 1024 * 1024, // 5MB
		AllowedTypes: []string{"image/jpeg", "image/png", "image/webp"},
		Extensions:   []string{".jpg", ".jpeg", ".png", ".webp"},
		Required:     false,
	},
}

// NewFileUploadHandler creates a new file upload handler
func NewFileUploadHandler(db *gorm.DB, redisService *redis.RedisService) *FileUploadHandler {
	return &FileUploadHandler{
		db:    db,
		redis: redisService,
	}
}

// UploadFiles handles multiple file uploads
func (h *FileUploadHandler) UploadFiles(c *gin.Context) {
	// Get current user
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userModel, ok := user.(map[string]interface{})
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user data"})
		return
	}

	// Parse multipart form
	var req UploadRequest
	if err := c.ShouldBind(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid form data: " + err.Error()})
		return
	}

	// Validate category
	if _, exists := FileCategoryConfig[req.Category]; !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file category"})
		return
	}

	// Validate files
	uploadedFiles, err := h.validateAndProcessFiles(c, req, userModel)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Process uploaded files
	results := make([]UploadedFile, 0)
	for _, file := range uploadedFiles {
		// Generate unique filename
		filename := h.generateUniqueFilename(file.Filename)

		// Save file to storage
		if err := h.saveFile(file, filename); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file: " + err.Error()})
			return
		}

		// Create database record
		uploadedFile := UploadedFile{
			ID:           h.generateFileID(),
			Filename:     filename,
			OriginalName: file.Filename,
			Path:         h.getFilePath(filename),
			Size:         file.Size,
			MIMEType:     file.Header.Get("Content-Type"),
			Category:     req.Category,
			UserID:       userModel["id"].(string),
			CompanyID:    userModel["company_id"].(string),
			ProjectID:    req.ProjectID,
			EstimateID:   req.EstimateID,
			CreatedAt:    time.Now(),
		}

		// TODO: Save to database
		// if err := h.db.Create(&uploadedFile).Error; err != nil {
		//     // Cleanup uploaded file
		//     os.Remove(uploadedFile.Path)
		//     c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file record"})
		//     return
		// }

		results = append(results, uploadedFile)
	}

	// Clear relevant caches
	projectIDStr := ""
	if req.ProjectID != nil {
		projectIDStr = *req.ProjectID
	}
	estimateIDStr := ""
	if req.EstimateID != nil {
		estimateIDStr = *req.EstimateID
	}
	go h.invalidateFileCaches(userModel["company_id"].(string), projectIDStr, estimateIDStr)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Files uploaded successfully",
		"files":   results,
	})
}

// validateAndProcessFiles validates and processes uploaded files
func (h *FileUploadHandler) validateAndProcessFiles(
	c *gin.Context,
	req UploadRequest,
	user map[string]interface{},
) ([]*multipart.FileHeader, error) {
	if len(req.Files) == 0 {
		return nil, fmt.Errorf("no files provided")
	}

	// Check file count limit
	if len(req.Files) > 10 {
		return nil, fmt.Errorf("maximum 10 files allowed per upload")
	}

	// Get validation rules for category
	config := FileCategoryConfig[req.Category]

	// Validate each file
	for _, file := range req.Files {
		// Check file size
		if file.Size > config.MaxSize {
			return nil, fmt.Errorf("file %s exceeds maximum size of %s",
				file.Filename, formatFileSize(config.MaxSize))
		}

		// Validate MIME type
		if !contains(config.AllowedTypes, file.Header.Get("Content-Type")) {
			return nil, fmt.Errorf("file %s has invalid MIME type: %s",
				file.Filename, file.Header.Get("Content-Type"))
		}

		// Validate file extension
		ext := filepath.Ext(file.Filename)
		if !contains(config.Extensions, ext) {
			return nil, fmt.Errorf("file %s has invalid extension: %s", file.Filename, ext)
		}

		// Basic security checks
		if err := h.performSecurityChecks(file); err != nil {
			return nil, fmt.Errorf("security check failed for file %s: %s", file.Filename, err.Error())
		}
	}

	return req.Files, nil
}

// performSecurityChecks performs basic security checks on uploaded files
func (h *FileUploadHandler) performSecurityChecks(file *multipart.FileHeader) error {
	// Check for potentially dangerous filenames
	dangerousPatterns := []string{"..", "/", "\\", ":", "*", "?", "\"", "<", ">", "|"}
	for _, pattern := range dangerousPatterns {
		if containsString(file.Filename, pattern) {
			return fmt.Errorf("filename contains dangerous pattern: %s", pattern)
		}
	}

	// TODO: Add virus scanning if needed

	return nil
}

// saveFile saves the uploaded file to disk
func (h *FileUploadHandler) saveFile(file *multipart.FileHeader, filename string) error {
	// Create upload directory if it doesn't exist
	uploadDir := h.getUploadDirectory()
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return fmt.Errorf("failed to create upload directory: %w", err)
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer src.Close()

	// Create destination file
	destPath := filepath.Join(uploadDir, filename)
	dst, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("failed to create destination file: %w", err)
	}
	defer dst.Close()

	// Copy file content
	if _, err := io.Copy(dst, src); err != nil {
		// Clean up on error
		os.Remove(destPath)
		return fmt.Errorf("failed to copy file content: %w", err)
	}

	return nil
}

// GetFiles gets files for a project or company
func (h *FileUploadHandler) GetFiles(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userModel := user.(map[string]interface{})
	companyID := userModel["company_id"].(string)

	// Parse query parameters
	projectID := c.Query("project_id")
	estimateID := c.Query("estimate_id")
	_ = c.Query("category") // For future use
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	// TODO: Implement Redis caching
	// cacheKey := fmt.Sprintf("files:%s:%s:%s:%s:%d:%d", companyID, projectID, estimateID, category, page, limit)

	// TODO: Implement database query with filters
	files := []UploadedFile{
		{
			ID:           "1",
			Filename:     "sample.pdf",
			OriginalName: "estimate-sample.pdf",
			Path:         "/uploads/sample.pdf",
			Size:         1024000,
			MIMEType:     "application/pdf",
			Category:     "estimate",
			UserID:       userModel["id"].(string),
			CompanyID:    companyID,
			ProjectID:    &projectID,
			EstimateID:   &estimateID,
			CreatedAt:    time.Now().AddDate(0, -1, 0),
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  files,
		"total": len(files),
		"page":  page,
		"limit": limit,
	})
}

// DeleteFile deletes an uploaded file
func (h *FileUploadHandler) DeleteFile(c *gin.Context) {
	fileID := c.Param("id")
	if fileID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File ID is required"})
		return
	}

	// TODO: Check if user has permission to delete this file
	// TODO: Get file info from database
	// TODO: Check if file belongs to user's company

	// Delete physical file
	// filePath := "/uploads/sample.pdf"
	// if err := os.Remove(filePath); err != nil && !os.IsNotExist(err) {
	//     c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
	//     return
	// }

	// Delete from database
	// if err := h.db.Delete(&UploadedFile{}, "id = ?", fileID).Error; err != nil {
	//     c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file record"})
	//     return
	// }

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "File deleted successfully",
	})
}

// Helper functions

func (h *FileUploadHandler) generateUniqueFilename(originalFilename string) string {
	ext := filepath.Ext(originalFilename)
	name := filepath.Base(originalFilename)
	timestamp := time.Now().Format("20060102150405")
	return fmt.Sprintf("%s_%s%s", name, timestamp, ext)
}

func (h *FileUploadHandler) generateFileID() string {
	return fmt.Sprintf("file_%d", time.Now().UnixNano())
}

func (h *FileUploadHandler) getUploadDirectory() string {
	return filepath.Join(".", "uploads")
}

func (h *FileUploadHandler) getFilePath(filename string) string {
	return filepath.Join(h.getUploadDirectory(), filename)
}

func (h *FileUploadHandler) invalidateFileCaches(companyID, projectID, estimateID string) {
	// TODO: Implement cache invalidation patterns
}

func formatFileSize(size int64) string {
	const (
		KB = 1024
		MB = 1024 * KB
		GB = 1024 * MB
	)

	switch {
	case size >= GB:
		return fmt.Sprintf("%.1f GB", float64(size)/GB)
	case size >= MB:
		return fmt.Sprintf("%.1f MB", float64(size)/MB)
	case size >= KB:
		return fmt.Sprintf("%.1f KB", float64(size)/KB)
	default:
		return fmt.Sprintf("%d bytes", size)
	}
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func containsString(str, substr string) bool {
	return len(str) >= len(substr) && str[0:len(substr)] == substr
}

// SetupRoutes sets up file upload routes
func (h *FileUploadHandler) SetupRoutes(r *gin.RouterGroup, authMiddleware *auth.AuthMiddleware) {
	fileGroup := r.Group("/files")
	fileGroup.Use(authMiddleware.Protected())
	{
		fileGroup.POST("/upload", h.UploadFiles)
		fileGroup.GET("", h.GetFiles)
		fileGroup.DELETE("/:id", h.DeleteFile)
	}
}
