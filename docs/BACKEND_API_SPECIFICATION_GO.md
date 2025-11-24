# Backend API Спецификация для Go + Gin + PostgreSQL

## 🌐 Общая архитектура API

### Базовая структура URL
```
https://api.stroy-control.ru/v1/
├── /projects/{projectId}/drawings/          # Управление чертежами
├── /projects/{projectId}/annotations/       # Управление аннотациями
├── /projects/{projectId}/defects/           # Управление дефектами
├── /projects/{projectId}/versions/           # Версионирование
├── /ai/                                     # AI сервисы
├── /sync/                                   # Синхронизация
└── /analytics/                              # Аналитика
```

### Структура Go проекта
```
/cmd/
  /api/
    main.go
/internal/
    /config/
      config.go
    /models/
      user.go
      project.go
      drawing.go
      annotation.go
      defect.go
    /handlers/
      auth_handler.go
      drawing_handler.go
      annotation_handler.go
      defect_handler.go
      ai_handler.go
    /services/
      auth_service.go
      drawing_service.go
      annotation_service.go
      defect_service.go
      ai_service.go
    /middleware/
      auth_middleware.go
      cors_middleware.go
      rate_limit_middleware.go
    /repository/
      user_repository.go
      drawing_repository.go
      annotation_repository.go
    /database/
      postgres.go
      migrations.go
    /utils/
      response.go
      validation.go
      pagination.go
/pkg/
  /pdf/
    pdf_processor.go
  /canvas/
    canvas_renderer.go
  /ai/
    drawing_analyzer.go
    defect_detector.go
/migrations/
  001_create_users.sql
  002_create_projects.sql
  003_create_drawings.sql
  ...
```

## 📋 Управление чертежами (Drawings API)

### GET /api/v1/projects/{projectId}/drawings
Получение списка чертежей проекта

**Handler:**
```go
type DrawingHandler struct {
    drawingService *services.DrawingService
}

func (h *DrawingHandler) GetDrawings(c *gin.Context) {
    projectID := c.Param("projectId")
    
    var query struct {
        Page     int    `form:"page,default=1"`
        Limit    int    `form:"limit,default=20"`
        Search   string `form:"search"`
        Status   string `form:"status"`
        SortBy   string `form:"sortBy,default=name"`
        SortDesc bool   `form:"sortOrder,default=false"`
    }
    
    if err := c.ShouldBindQuery(&query); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    drawings, total, err := h.drawingService.GetDrawings(projectID, query)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "drawings": drawings,
            "meta": gin.H{
                "page":       query.Page,
                "limit":      query.Limit,
                "total":      total,
                "totalPages": (total + query.Limit - 1) / query.Limit,
            },
        },
    })
}
```

**Models:**
```go
type Drawing struct {
    ID          string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    ProjectID   string    `json:"project_id" gorm:"not null;index"`
    Name        string    `json:"name" gorm:"not null"`
    Description *string   `json:"description"`
    FilePath    string    `json:"file_path" gorm:"not null"`
    FileSize    int64     `json:"file_size" gorm:"not null"`
    MimeType    string    `json:"mime_type" gorm:"not null"`
    Version     int       `json:"version" gorm:"not null;default:1"`
    Status      string    `json:"status" gorm:"default:draft"`
    UploadedBy  string    `json:"uploaded_by" gorm:"not null"`
    UploadedAt  time.Time `json:"uploaded_at" gorm:"autoCreateTime"`
    UpdatedAt   time.Time `json:"updated_at" gorm:"autoUpdateTime"`
    ApprovedAt  *time.Time `json:"approved_at"`
    ApprovedBy  *string   `json:"approved_by"`
    
    // JSON поля
    Metadata     json.RawMessage `json:"metadata" gorm:"type:jsonb"`
    Scale        json.RawMessage `json:"scale" gorm:"type:jsonb"`
    AIAnalysis   json.RawMessage `json:"ai_analysis" gorm:"type:jsonb"`
    
    // Relations
    Project      Project        `json:"project" gorm:"foreignKey:ProjectID"`
    Uploader     User           `json:"uploader" gorm:"foreignKey:UploadedBy"`
    Approver     *User          `json:"approver" gorm:"foreignKey:ApprovedBy"`
    Pages        []DrawingPage  `json:"pages" gorm:"foreignKey:DrawingID"`
    Annotations  []Annotation   `json:"annotations" gorm:"foreignKey:DrawingID"`
    
    // Вычисляемые поля
    PageCount       int `json:"page_count" gorm:"-"`
    AnnotationCount int `json:"annotation_count" gorm:"-"`
}

type DrawingPage struct {
    ID          string         `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    DrawingID   string         `json:"drawing_id" gorm:"not null;index"`
    PageNumber  int            `json:"page_number" gorm:"not null"`
    Width       float64        `json:"width" gorm:"not null"`
    Height      float64        `json:"height" gorm:"not null"`
    Scale       float64        `json:"scale" gorm:"not null"`
    Rotation    float64        `json:"rotation" gorm:"default:0"`
    
    // URL для файлов
    OriginalURL  *string `json:"original_url"`
    ThumbnailURL *string `json:"thumbnail_url"`
    PreviewURL   *string `json:"preview_url"`
    CanvasData   *string `json:"canvas_data"` // base64 для офлайн
    
    // AI данные
    AIElements   json.RawMessage `json:"ai_elements" gorm:"type:jsonb"`
    AIText       json.RawMessage `json:"ai_text" gorm:"type:jsonb"`
    AIAnalyzedAt *time.Time      `json:"ai_analyzed_at"`
    
    CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
    UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

const (
    DrawingStatusDraft     = "draft"
    DrawingStatusReview    = "review"
    DrawingStatusApproved  = "approved"
    DrawingStatusRejected  = "rejected"
    DrawingStatusArchived  = "archived"
)
```

### POST /api/v1/projects/{projectId}/drawings
Загрузка нового чертежа

**Handler:**
```go
func (h *DrawingHandler) UploadDrawing(c *gin.Context) {
    projectID := c.Param("projectId")
    
    file, err := c.FormFile("file")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "File upload required"})
        return
    }
    
    // Валидация файла
    if !isValidDrawingFile(file) {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type"})
        return
    }
    
    var req struct {
        Name        string          `json:"name" form:"name"`
        Description string          `json:"description" form:"description"`
        Scale       json.RawMessage  `json:"scale" form:"scale"`
        Metadata    json.RawMessage  `json:"metadata" form:"metadata"`
    }
    
    if err := c.ShouldBind(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    userID := c.GetString("user_id")
    
    drawing, err := h.drawingService.UploadDrawing(c.Request.Context(), projectID, userID, file, req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusCreated, gin.H{
        "success": true,
        "data": gin.H{
            "drawing":           drawing,
            "processingStatus":  "queued",
            "estimatedTime":     30, // секунды
        },
    })
}
```

**Service:**
```go
type DrawingService struct {
    repo       *repository.DrawingRepository
    fileStore  storage.FileStore
    pdfProcessor *pdf.Processor
    aiClient   *ai.Client
    cache      *redis.Client
}

func (s *DrawingService) UploadDrawing(
    ctx context.Context,
    projectID, userID string,
    file *multipart.FileHeader,
    req struct {
        Name        string
        Description string
        Scale       json.RawMessage
        Metadata    json.RawMessage
    },
) (*models.Drawing, error) {
    // 1. Валидация
    if err := s.validateDrawingFile(file); err != nil {
        return nil, err
    }
    
    // 2. Сохранение файла
    filePath, err := s.fileStore.SaveFile(file, "drawings")
    if err != nil {
        return nil, err
    }
    
    // 3. Создание записи в БД
    drawing := &models.Drawing{
        ProjectID:   projectID,
        Name:        req.Name,
        Description: &req.Description,
        FilePath:    filePath,
        FileSize:    file.Size,
        MimeType:    file.Header.Get("Content-Type"),
        UploadedBy:  userID,
        Status:      models.DrawingStatusDraft,
        Scale:       req.Scale,
        Metadata:    req.Metadata,
    }
    
    if err := s.repo.Create(ctx, drawing); err != nil {
        s.fileStore.DeleteFile(filePath)
        return nil, err
    }
    
    // 4. Асинхронная обработка PDF
    go s.processDrawingAsync(context.Background(), drawing.ID)
    
    return drawing, nil
}

func (s *DrawingService) processDrawingAsync(ctx context.Context, drawingID string) {
    // Получение чертежа
    drawing, err := s.repo.GetByID(ctx, drawingID)
    if err != nil {
        log.Printf("Error getting drawing: %v", err)
        return
    }
    
    // Обработка PDF
    pages, err := s.pdfProcessor.ProcessPDF(drawing.FilePath)
    if err != nil {
        log.Printf("Error processing PDF: %v", err)
        return
    }
    
    // Сохранение страниц
    for _, page := range pages {
        page.DrawingID = drawingID
        if err := s.repo.CreatePage(ctx, &page); err != nil {
            log.Printf("Error creating page: %v", err)
        }
    }
    
    // AI анализ
    aiAnalysis, err := s.aiClient.AnalyzeDrawing(ctx, drawingID)
    if err != nil {
        log.Printf("Error in AI analysis: %v", err)
    } else {
        drawing.AIAnalysis = aiAnalysis
        drawing.Status = models.DrawingStatusReview
        s.repo.Update(ctx, drawing)
    }
}
```

## 🎨 Управление аннотациями (Annotations API)

### Models:
```go
type Annotation struct {
    ID          string         `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    DrawingID   string         `json:"drawing_id" gorm:"not null;index"`
    PageNumber  int            `json:"page_number" gorm:"not null"`
    Type        string         `json:"type" gorm:"not null"`
    Geometry    json.RawMessage `json:"geometry" gorm:"type:jsonb;not null"`
    Properties  json.RawMessage `json:"properties" gorm:"type:jsonb;not null"`
    
    // Метаданные
    CreatedBy   string     `json:"created_by" gorm:"not null"`
    CreatedAt   time.Time  `json:"created_at" gorm:"autoCreateTime"`
    UpdatedBy   string     `json:"updated_by" gorm:"not null"`
    UpdatedAt   time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
    Version     int        `json:"version" gorm:"not null;default:1"`
    
    // AI данные
    AISuggested bool       `json:"ai_suggested" gorm:"default:false"`
    AIConfidence *float64  `json:"ai_confidence"`
    AIType      *string    `json:"ai_type"`
    
    // Статус
    Status      string     `json:"status" gorm:"default:active"`
    ApprovedAt  *time.Time `json:"approved_at"`
    ApprovedBy  *string    `json:"approved_by"`
    
    // Relations
    Drawing     Drawing              `json:"drawing" gorm:"foreignKey:DrawingID"`
    Creator     User                 `json:"creator" gorm:"foreignKey:CreatedBy"`
    Updater     User                 `json:"updater" gorm:"foreignKey:UpdatedBy"`
    Approver    *User                `json:"approver" gorm:"foreignKey:ApprovedBy"`
    
    // Связи многие-ко-многим
    Defects     []Defect             `json:"defects" gorm:"many2many:annotation_defects;"`
    Photos      []AnnotationPhoto    `json:"photos" gorm:"foreignKey:AnnotationID"`
    History     []AnnotationHistory `json:"history" gorm:"foreignKey:AnnotationID"`
}

type AnnotationPhoto struct {
    ID           string         `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    AnnotationID string         `json:"annotation_id" gorm:"not null;index"`
    FilePath     string         `json:"file_path" gorm:"not null"`
    ThumbnailPath string        `json:"thumbnail_path" gorm:"not null"`
    OriginalName string         `json:"original_name" gorm:"not null"`
    FileSize     int64          `json:"file_size" gorm:"not null"`
    MimeType     string         `json:"mime_type" gorm:"not null"`
    
    // Метаданные
    Coordinates  json.RawMessage `json:"coordinates" gorm:"type:jsonb"`
    Description  *string        `json:"description"`
    ExifData     json.RawMessage `json:"exif_data" gorm:"type:jsonb"`
    
    // AI анализ
    AIAnalysis   json.RawMessage `json:"ai_analysis" gorm:"type:jsonb"`
    AIDefects    json.RawMessage `json:"ai_defects" gorm:"type:jsonb"`
    
    CreatedAt    time.Time       `json:"created_at" gorm:"autoCreateTime"`
    UploadedBy   string          `json:"uploaded_by" gorm:"not null"`
    
    // Relations
    Annotation   Annotation      `json:"annotation" gorm:"foreignKey:AnnotationID"`
    Uploader     User            `json:"uploader" gorm:"foreignKey:UploadedBy"`
}

const (
    AnnotationTypePoint      = "point"
    AnnotationTypeLine       = "line"
    AnnotationTypeArrow      = "arrow"
    AnnotationTypeRectangle  = "rectangle"
    AnnotationTypeCircle     = "circle"
    AnnotationTypeText       = "text"
    AnnotationTypeFreehand   = "freehand"
    AnnotationTypePhoto      = "photo"
    AnnotationTypeDimension  = "dimension"
    
    AnnotationStatusActive    = "active"
    AnnotationStatusDeleted   = "deleted"
    AnnotationStatusApproved  = "approved"
    AnnotationStatusRejected  = "rejected"
    
    AnnotationOperationCreate  = "create"
    AnnotationOperationUpdate  = "update"
    AnnotationOperationDelete  = "delete"
    AnnotationOperationApprove = "approve"
    AnnotationOperationReject  = "reject"
)
```

### POST /api/v1/projects/{projectId}/drawings/{drawingId}/annotations
Создание аннотации

**Handler:**
```go
func (h *AnnotationHandler) CreateAnnotation(c *gin.Context) {
    drawingID := c.Param("drawingId")
    userID := c.GetString("user_id")
    
    var req struct {
        Type          string          `json:"type" binding:"required"`
        Geometry      json.RawMessage `json:"geometry" binding:"required"`
        Properties    json.RawMessage `json:"properties" binding:"required"`
        PageNumber    int             `json:"page_number" binding:"required"`
        LinkedDefects []string        `json:"linked_defects"`
        AISuggested   bool            `json:"ai_suggested"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // Валидация геометрии
    if !isValidGeometry(req.Type, req.Geometry) {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid geometry"})
        return
    }
    
    annotation, err := h.annotationService.CreateAnnotation(c.Request.Context(), drawingID, userID, req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusCreated, gin.H{
        "success": true,
        "data": gin.H{
            "annotation": annotation,
        },
    })
}
```

**Service:**
```go
func (s *AnnotationService) CreateAnnotation(
    ctx context.Context,
    drawingID, userID string,
    req struct {
        Type          string
        Geometry      json.RawMessage
        Properties    json.RawMessage
        PageNumber    int
        LinkedDefects []string
        AISuggested   bool
    },
) (*models.Annotation, error) {
    // 1. Проверка прав доступа
    if !s.hasPermission(ctx, userID, drawingID, "annotation:create") {
        return nil, errors.New("permission denied")
    }
    
    // 2. Создание аннотации
    annotation := &models.Annotation{
        DrawingID:   drawingID,
        PageNumber:  req.PageNumber,
        Type:        req.Type,
        Geometry:    req.Geometry,
        Properties:  req.Properties,
        CreatedBy:   userID,
        UpdatedBy:   userID,
        Status:      models.AnnotationStatusActive,
        AISuggested: req.AISuggested,
    }
    
    if err := s.repo.Create(ctx, annotation); err != nil {
        return nil, err
    }
    
    // 3. Связь с дефектами
    if len(req.LinkedDefects) > 0 {
        if err := s.repo.LinkDefects(ctx, annotation.ID, req.LinkedDefects); err != nil {
            log.Printf("Error linking defects: %v", err)
        }
    }
    
    // 4. AI предложения (если не AI suggested)
    if !req.AISuggested {
        go s.generateAISuggestions(context.Background(), annotation.ID)
    }
    
    // 5. Уведомление через WebSocket
    s.notifyAnnotationCreated(ctx, annotation)
    
    return annotation, nil
}
```

## 🐛 Управление дефектами (Defects API)

### Models:
```go
type Defect struct {
    ID          string         `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    ProjectID   string         `json:"project_id" gorm:"not null;index"`
    Title       string         `json:"title" gorm:"not null"`
    Description string         `json:"description" gorm:"not null"`
    Severity    string         `json:"severity" gorm:"not null"`
    Status      string         `json:"status" gorm:"default:open"`
    
    // Привязка к чертежу
    DrawingID   *string        `json:"drawing_id" gorm:"index"`
    PageNumber  *int           `json:"page_number"`
    Location    json.RawMessage `json:"location" gorm:"type:jsonb"`
    
    // Ответственный
    AssignedTo  *string        `json:"assigned_to" gorm:"index"`
    DueDate     *time.Time     `json:"due_date"`
    
    // Стоимость
    EstimatedCost *float64     `json:"estimated_cost"`
    ActualCost    *float64     `json:"actual_cost"`
    
    // Разрешение
    Resolution   *string       `json:"resolution"`
    ResolvedAt   *time.Time    `json:"resolved_at"`
    ResolvedBy   *string       `json:"resolved_by"`
    
    // Метаданные
    CreatedBy    string        `json:"created_by" gorm:"not null"`
    CreatedAt    time.Time     `json:"created_at" gorm:"autoCreateTime"`
    UpdatedAt    time.Time     `json:"updated_at" gorm:"autoUpdateTime"`
    
    // AI данные
    AIAutoDetected bool          `json:"ai_auto_detected" gorm:"default:false"`
    AIConfidence   *float64      `json:"ai_confidence"`
    AIRiskFactors  json.RawMessage `json:"ai_risk_factors" gorm:"type:jsonb"`
    
    // Relations
    Project      Project        `json:"project" gorm:"foreignKey:ProjectID"`
    Drawing      *Drawing       `json:"drawing" gorm:"foreignKey:DrawingID"`
    Creator      User           `json:"creator" gorm:"foreignKey:CreatedBy"`
    Assignee     *User          `json:"assignee" gorm:"foreignKey:AssignedTo"`
    Resolver     *User          `json:"resolver" gorm:"foreignKey:ResolvedBy"`
    
    // Связи
    Annotations  []Annotation   `json:"annotations" gorm:"many2many:annotation_defects;"`
    Photos       []DefectPhoto  `json:"photos" gorm:"foreignKey:DefectID"`
    History      []DefectHistory `json:"history" gorm:"foreignKey:DefectID"`
}

type DefectPhoto struct {
    ID           string         `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    DefectID     string         `json:"defect_id" gorm:"not null;index"`
    FilePath     string         `json:"file_path" gorm:"not null"`
    ThumbnailPath string        `json:"thumbnail_path" gorm:"not null"`
    OriginalName string         `json:"original_name" gorm:"not null"`
    FileSize     int64          `json:"file_size" gorm:"not null"`
    MimeType     string         `json:"mime_type" gorm:"not null"`
    Description  *string        `json:"description"`
    CreatedAt    time.Time      `json:"created_at" gorm:"autoCreateTime"`
    UploadedBy   string         `json:"uploaded_by" gorm:"not null"`
    
    // AI анализ
    AIAnalysis   json.RawMessage `json:"ai_analysis" gorm:"type:jsonb"`
    AIDefects    json.RawMessage `json:"ai_defects" gorm:"type:jsonb"`
    
    // Relations
    Defect       Defect         `json:"defect" gorm:"foreignKey:DefectID"`
    Uploader     User           `json:"uploader" gorm:"foreignKey:UploadedBy"`
}

const (
    DefectSeverityLow      = "low"
    DefectSeverityMedium   = "medium"
    DefectSeverityHigh     = "high"
    DefectSeverityCritical = "critical"
    
    DefectStatusOpen      = "open"
    DefectStatusInProgress = "in_progress"
    DefectStatusResolved  = "resolved"
    DefectStatusRejected  = "rejected"
    DefectStatusClosed    = "closed"
)
```

## 🔄 Управление версиями (Versions API)

### Models:
```go
type DrawingVersion struct {
    ID              string         `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    DrawingID       string         `json:"drawing_id" gorm:"not null;index"`
    VersionNumber   int            `json:"version_number" gorm:"not null"`
    
    // Файлы
    FilePath       string         `json:"file_path" gorm:"not null"`
    FileSize       int64          `json:"file_size" gorm:"not null"`
    FileHash       string         `json:"file_hash" gorm:"not null;index"`
    
    // Изменения
    ChangesSummary string         `json:"changes_summary"`
    Changes        json.RawMessage `json:"changes" gorm:"type:jsonb"`
    ChangeStats    json.RawMessage `json:"change_statistics" gorm:"type:jsonb"`
    
    // AI сравнение
    AIComparison   json.RawMessage `json:"ai_comparison" gorm:"type:jsonb"`
    SimilarityScore *float64      `json:"similarity_score"`
    
    // Метаданные
    CreatedBy      string         `json:"created_by" gorm:"not null"`
    CreatedAt      time.Time      `json:"created_at" gorm:"autoCreateTime"`
    ApprovedAt     *time.Time     `json:"approved_at"`
    ApprovedBy     *string        `json:"approved_by"`
    ApprovalStatus string         `json:"approval_status" gorm:"default:pending"`
    
    // Relations
    Drawing        Drawing        `json:"drawing" gorm:"foreignKey:DrawingID"`
    Creator        User           `json:"creator" gorm:"foreignKey:CreatedBy"`
    Approver       *User          `json:"approver" gorm:"foreignKey:ApprovedBy"`
}

const (
    VersionApprovalPending  = "pending"
    VersionApprovalApproved = "approved"
    VersionApprovalRejected = "rejected"
)
```

## 🤖 AI сервисы (AI API)

### Gateway для AI сервисов
```go
type AIHandler struct {
    aiClient *ai.Client
}

func (h *AIHandler) AnalyzeDrawing(c *gin.Context) {
    var req struct {
        DrawingID string `json:"drawing_id" binding:"required"`
        Options   struct {
            ExtractElements    bool `json:"extract_elements"`
            CheckCompliance    bool `json:"check_compliance"`
            DetectAnomalies    bool `json:"detect_anomalies"`
            SuggestAnnotations bool `json:"suggest_annotations"`
        } `json:"options"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    analysis, err := h.aiClient.AnalyzeDrawing(c.Request.Context(), req.DrawingID, req.Options)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "analysis":        analysis,
            "confidence":      analysis.Confidence,
            "processing_time":  analysis.ProcessingTime,
            "suggestions":     analysis.Suggestions,
        },
    })
}

func (h *AIHandler) DetectDefects(c *gin.Context) {
    file, err := c.FormFile("image")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Image file required"})
        return
    }
    
    var drawingContext struct {
        DrawingID   string  `json:"drawing_id" form:"drawing_id"`
        PageNumber  int     `json:"page_number" form:"page_number"`
        Coordinates string  `json:"coordinates" form:"coordinates"`
    }
    
    c.ShouldBind(&drawingContext)
    
    defects, err := h.aiClient.DetectDefects(c.Request.Context(), file, drawingContext)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "defects":      defects.DetectedDefects,
            "confidence":   defects.Confidence,
            "suggestions":  defects.Suggestions,
        },
    })
}
```

## 🔐 Middleware для безопасности

### Auth Middleware:
```go
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
            c.Abort()
            return
        }
        
        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
            }
            return []byte(jwtSecret), nil
        })
        
        if err != nil || !token.Valid {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            c.Abort()
            return
        }
        
        claims, ok := token.Claims.(jwt.MapClaims)
        if !ok {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
            c.Abort()
            return
        }
        
        c.Set("user_id", claims["sub"])
        c.Set("user_role", claims["role"])
        c.Set("permissions", claims["permissions"])
        
        c.Next()
    }
}
```

### Rate Limiting Middleware:
```go
func RateLimitMiddleware(redisClient *redis.Client) gin.HandlerFunc {
    return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
        if err, ok := recovered.(string); ok {
            c.JSON(http.StatusTooManyRequests, gin.H{"error": err})
        }
        c.Abort()
    })
}

func RateLimitMiddleware(redisClient *redis.Client) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetString("user_id")
        if userID == "" {
            userID = c.ClientIP()
        }
        
        key := fmt.Sprintf("rate_limit:%s", userID)
        
        // Проверка лимита
        count, err := redisClient.Incr(c.Request.Context(), key).Result()
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Rate limit error"})
            c.Abort()
            return
        }
        
        if count == 1 {
            redisClient.Expire(c.Request.Context(), key, time.Hour)
        }
        
        if count > 1000 { // 1000 запросов в час
            c.JSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded"})
            c.Abort()
            return
        }
        
        c.Header("X-RateLimit-Limit", "1000")
        c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", 1000-count))
        
        c.Next()
    }
}
```

## 📊 WebSocket для real-time обновлений

### WebSocket Handler:
```go
type WebSocketHandler struct {
    hub *websocket.Hub
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
    userID := c.GetString("user_id")
    if userID == "" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }
    
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        log.Printf("WebSocket upgrade error: %v", err)
        return
    }
    
    client := &websocket.Client{
        Hub:    h.hub,
        Conn:   conn,
        Send:   make(chan []byte, 256),
        UserID: userID,
    }
    
    client.Hub.Register <- client
    
    go client.WritePump()
    go client.ReadPump()
}

type Hub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
    rooms      map[string]map[*Client]bool // project_id -> clients
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.clients[client] = true
            
        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.Send)
            }
            
        case message := <-h.broadcast:
            for client := range h.clients {
                select {
                case client.Send <- message:
                default:
                    close(client.Send)
                    delete(h.clients, client)
                }
            }
        }
    }
}
```

## 🗄️ Database Migrations

### Миграции для чертежей и аннотаций:
```sql
-- 001_create_drawings_table.sql
CREATE TABLE IF NOT EXISTS drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    
    metadata JSONB DEFAULT '{}',
    scale JSONB,
    ai_analysis JSONB,
    ai_processed_at TIMESTAMP WITH TIME ZONE,
    ai_confidence DECIMAL(3,2),
    
    parent_drawing_id UUID REFERENCES drawings(id),
    is_latest BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT drawings_unique_latest UNIQUE (project_id, name, is_latest) 
        WHERE is_latest = TRUE
);

-- 002_create_drawing_pages_table.sql
CREATE TABLE IF NOT EXISTS drawing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    width DECIMAL(10,2) NOT NULL,
    height DECIMAL(10,2) NOT NULL,
    scale DECIMAL(10,4) NOT NULL,
    rotation DECIMAL(5,2) DEFAULT 0,
    
    original_url TEXT,
    thumbnail_url TEXT,
    preview_url TEXT,
    canvas_data TEXT,
    
    ai_elements JSONB,
    ai_text JSONB,
    ai_analyzed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(drawing_id, page_number)
);

-- 003_create_annotations_table.sql
CREATE TABLE IF NOT EXISTS annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    
    type VARCHAR(50) NOT NULL,
    geometry JSONB NOT NULL,
    properties JSONB NOT NULL,
    
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID NOT NULL REFERENCES users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    
    ai_suggested BOOLEAN DEFAULT FALSE,
    ai_confidence DECIMAL(3,2),
    ai_type VARCHAR(50),
    
    status VARCHAR(50) DEFAULT 'active',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id)
);

-- 004_create_annotation_defects_table.sql
CREATE TABLE IF NOT EXISTS annotation_defects (
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    defect_id UUID NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    link_type VARCHAR(50) DEFAULT 'manual',
    PRIMARY KEY (annotation_id, defect_id)
);

-- 005_create_annotation_photos_table.sql
CREATE TABLE IF NOT EXISTS annotation_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    coordinates JSONB,
    description TEXT,
    exif_data JSONB,
    
    ai_analysis JSONB,
    ai_defects JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID NOT NULL REFERENCES users(id)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_drawings_project_id ON drawings(project_id);
CREATE INDEX IF NOT EXISTS idx_drawings_status ON drawings(status);
CREATE INDEX IF NOT EXISTS idx_drawings_uploaded_by ON drawings(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_drawings_file_hash ON drawings(file_hash);

CREATE INDEX IF NOT EXISTS idx_drawing_pages_drawing_id ON drawing_pages(drawing_id);
CREATE INDEX IF NOT EXISTS idx_drawing_pages_page_number ON drawing_pages(drawing_id, page_number);

CREATE INDEX IF NOT EXISTS idx_annotations_drawing_id ON annotations(drawing_id);
CREATE INDEX IF NOT EXISTS idx_annotations_page_number ON annotations(drawing_id, page_number);
CREATE INDEX IF NOT EXISTS idx_annotations_created_by ON annotations(created_by);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);
CREATE INDEX IF NOT EXISTS idx_annotations_geometry ON annotations USING GIN(geometry);

CREATE INDEX IF NOT EXISTS idx_annotation_photos_annotation_id ON annotation_photos(annotation_id);
CREATE INDEX IF NOT EXISTS idx_annotation_photos_uploaded_by ON annotation_photos(uploaded_by);
```

---

Эта спецификация адаптирована для Go + Gin + PostgreSQL стека и обеспечивает полный функционал для работы с PDF чертежами, аннотациями, дефектами и AI-анализом в системе технического надзора.
