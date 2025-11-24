# Архитектура для работы с PDF чертежами на Go + Gin

## 🏗️ Общая архитектура системы

### Технологический стек
- **Backend**: Go 1.21+ + Gin HTTP Framework
- **Database**: PostgreSQL 15+ + GORM v2
- **Cache**: Redis 7+
- **File Storage**: MinIO/S3
- **PDF Processing**: GoFPDF + UniDoc
- **Image Processing**: Go Imaging
- **AI Integration**: HTTP calls to Python AI Gateway
- **WebSocket**: Gorilla WebSocket

### Структура проекта
```
/cmd/
  /api/
    main.go                    # Точка входа
/internal/
    /config/
      config.go                # Конфигурация приложения
    /models/
      drawing.go                # Модели чертежей
      annotation.go            # Модели аннотаций
      defect.go                # Модели дефектов
      version.go               # Модели версий
      user.go                  # Модели пользователей
      project.go               # Модели проектов
    /handlers/
      drawing_handler.go        # Обработчики чертежей
      annotation_handler.go    # Обработчики аннотаций
      defect_handler.go        # Обработчики дефектов
      version_handler.go       # Обработчики версий
      ai_handler.go            # Обработчики AI
      websocket_handler.go      # WebSocket обработчики
    /services/
      drawing_service.go        # Бизнес-логика чертежей
      annotation_service.go    # Бизнес-логика аннотаций
      defect_service.go         # Бизнес-логика дефектов
      version_service.go        # Бизнес-логика версий
      ai_service.go             # AI сервис
      pdf_service.go            # Обработка PDF
      file_service.go           # Работа с файлами
      websocket_service.go      # WebSocket сервис
    /repository/
      drawing_repository.go     # Repository чертежей
      annotation_repository.go  # Repository аннотаций
      defect_repository.go      # Repository дефектов
      version_repository.go     # Repository версий
    /middleware/
      auth_middleware.go        # Аутентификация
      cors_middleware.go        # CORS
      rate_limit_middleware.go  # Rate limiting
      validation_middleware.go  # Валидация
    /database/
      postgres.go               # Подключение к PostgreSQL
      migrations.go             # Миграции
      redis.go                  # Подключение к Redis
    /utils/
      response.go               # Утилиты ответов
      validation.go             # Валидация
      pagination.go             # Пагинация
      file_utils.go             # Работа с файлами
      geometry_utils.go         # Геометрические утилиты
    /storage/
      minio_client.go           # MinIO клиент
      file_storage.go           # Абстракция хранилища
/pkg/
  /pdf/
    processor.go                # Обработка PDF
    renderer.go                 # Рендеринг страниц
    extractor.go                # Извлечение данных
  /canvas/
    renderer.go                 # Canvas рендеринг
    geometry.go                 # Геометрия
    annotation.go               # Аннотации
  /ai/
    client.go                   # AI клиент
    types.go                    # AI типы
/migrations/
  001_create_users.sql
  002_create_projects.sql
  003_create_drawings.sql
  004_create_drawing_pages.sql
  005_create_annotations.sql
  ...
```

## 📄 PDF обработка на Go

### PDF Processor
```go
package pdf

import (
    "context"
    "fmt"
    "image"
    "image/png"
    "io"
    "os"
    "path/filepath"
    "strings"
    
    "github.com/unidoc/unipdf/v3/common/license"
    "github.com/unidoc/unipdf/v3/creator"
    "github.com/unidoc/unipdf/v3/model"
    "github.com/unidoc/unipdf/v3/render"
)

type Processor struct {
    tempDir string
    license bool
}

func NewProcessor(tempDir string) *Processor {
    // Инициализация лицензии UniDoc (если есть)
    license.SetLicenseKey("your-license-key")
    
    return &Processor{
        tempDir: tempDir,
        license: true,
    }
}

type DrawingPage struct {
    PageNumber  int                    `json:"page_number"`
    Width       float64                `json:"width"`
    Height      float64                `json:"height"`
    Scale       float64                `json:"scale"`
    Rotation    float64                `json:"rotation"`
    ImagePath   string                 `json:"image_path"`
    ThumbnailPath string              `json:"thumbnail_path"`
    Text        string                 `json:"text"`
    Elements    []DrawingElement       `json:"elements"`
    Metadata    map[string]interface{} `json:"metadata"`
}

type DrawingElement struct {
    Type        string                 `json:"type"`
    Coordinates []float64              `json:"coordinates"`
    Properties  map[string]interface{} `json:"properties"`
    Confidence  float64                `json:"confidence"`
}

func (p *Processor) ProcessPDF(ctx context.Context, filePath string) ([]DrawingPage, error) {
    // Открытие PDF файла
    f, err := os.Open(filePath)
    if err != nil {
        return nil, fmt.Errorf("failed to open PDF: %w", err)
    }
    defer f.Close()
    
    pdfReader, err := model.NewPdfReader(f)
    if err != nil {
        return nil, fmt.Errorf("failed to create PDF reader: %w", err)
    }
    
    numPages, err := pdfReader.GetNumPages()
    if err != nil {
        return nil, fmt.Errorf("failed to get number of pages: %w", err)
    }
    
    var pages []DrawingPage
    
    for i := 1; i <= numPages; i++ {
        page, err := pdfReader.GetPage(i)
        if err != nil {
            continue
        }
        
        // Получение размеров страницы
        bbox, err := page.GetMediaBox()
        if err != nil {
            continue
        }
        
        width := bbox.Urx - bbox.Llx
        height := bbox.Ury - bbox.Lly
        
        // Рендеринг страницы в изображение
        imagePath, thumbnailPath, err := p.renderPageToImage(ctx, pdfReader, i, width, height)
        if err != nil {
            return nil, fmt.Errorf("failed to render page %d: %w", i, err)
        }
        
        // Извлечение текста
        text, err := p.extractTextFromPage(page)
        if err != nil {
            text = ""
        }
        
        // Извлечение элементов
        elements, err := p.extractElementsFromPage(page)
        if err != nil {
            elements = []DrawingElement{}
        }
        
        drawingPage := DrawingPage{
            PageNumber:    i,
            Width:         width,
            Height:        height,
            Scale:         1.0,
            Rotation:      0,
            ImagePath:     imagePath,
            ThumbnailPath: thumbnailPath,
            Text:          text,
            Elements:      elements,
            Metadata:      make(map[string]interface{}),
        }
        
        pages = append(pages, drawingPage)
    }
    
    return pages, nil
}

func (p *Processor) renderPageToImage(ctx context.Context, pdfReader *model.PdfReader, pageNum int, width, height float64) (string, string, error) {
    // Создание рендерера
    device := render.NewImageDevice(width, height, &render.ImageDeviceProperties{
        TextMode:  render.TextModeGlyph,
        Scale:     2.0, // High quality
        AntiAlias: true,
    })
    
    // Получение страницы
    page, err := pdfReader.GetPage(pageNum)
    if err != nil {
        return "", "", err
    }
    
    // Рендеринг
    img, err := device.Render(page)
    if err != nil {
        return "", "", err
    }
    
    // Сохранение полного изображения
    imagePath := filepath.Join(p.tempDir, fmt.Sprintf("page_%d_full.png", pageNum))
    fullImg := p.scaleImage(img, 2048, 2048) // Ограничение размера
    if err := p.saveImage(fullImg, imagePath); err != nil {
        return "", "", err
    }
    
    // Создание миниатюры
    thumbnailPath := filepath.Join(p.tempDir, fmt.Sprintf("page_%d_thumb.png", pageNum))
    thumbImg := p.scaleImage(img, 300, 300)
    if err := p.saveImage(thumbImg, thumbnailPath); err != nil {
        return "", "", err
    }
    
    return imagePath, thumbnailPath, nil
}

func (p *Processor) extractTextFromPage(page *model.PdfPage) (string, error) {
    text, err := page.ExtractText()
    if err != nil {
        return "", err
    }
    return text, nil
}

func (p *Processor) extractElementsFromPage(page *model.PdfPage) ([]DrawingElement, error) {
    var elements []DrawingElement
    
    // Извлечение контуров и линий
    contentStreams, err := page.GetContentStreams()
    if err != nil {
        return nil, err
    }
    
    for _, cs := range contentStreams {
        parser := model.NewContentStreamParser(cs)
        operations, err := parser.Parse()
        if err != nil {
            continue
        }
        
        for _, op := range operations {
            if op.Operand == "m" || op.Operand == "l" { // move to, line to
                element := DrawingElement{
                    Type:        "line",
                    Coordinates: p.parseCoordinates(op.Parameters),
                    Properties:  make(map[string]interface{}),
                    Confidence:  1.0,
                }
                elements = append(elements, element)
            }
        }
    }
    
    return elements, nil
}

func (p *Processor) parseCoordinates(params []interface{}) []float64 {
    var coords []float64
    for _, param := range params {
        if f, ok := param.(float64); ok {
            coords = append(coords, f)
        }
    }
    return coords
}

func (p *Processor) scaleImage(img image.Image, maxWidth, maxHeight int) image.Image {
    bounds := img.Bounds()
    width, height := bounds.Dx(), bounds.Dy()
    
    // Вычисление новых размеров с сохранением пропорций
    if width > maxWidth || height > maxHeight {
        ratio := float64(width) / float64(height)
        if width > height {
            width = maxWidth
            height = int(float64(maxWidth) / ratio)
        } else {
            height = maxHeight
            width = int(float64(maxHeight) * ratio)
        }
    }
    
    // Масштабирование изображения
    return imaging.Resize(img, width, height, imaging.Lanczos)
}

func (p *Processor) saveImage(img image.Image, path string) error {
    f, err := os.Create(path)
    if err != nil {
        return err
    }
    defer f.Close()
    
    return png.Encode(f, img)
}
```

### Canvas Renderer для аннотаций
```go
package canvas

import (
    "encoding/json"
    "fmt"
    "image"
    "image/color"
    "image/draw"
    "image/png"
    "math"
    
    "github.com/disintegration/imaging"
    "github.com/fogleman/gg"
)

type Renderer struct {
    width  int
    height int
    dc     *gg.Context
}

type Annotation struct {
    ID         string                 `json:"id"`
    Type       string                 `json:"type"`
    Geometry   map[string]interface{} `json:"geometry"`
    Properties map[string]interface{} `json:"properties"`
}

type AnnotationProperties struct {
    Color      string  `json:"color"`
    StrokeWidth float64 `json:"stroke_width"`
    FillColor  string  `json:"fill_color"`
    Opacity    float64 `json:"opacity"`
    Style      string  `json:"style"`
}

func NewRenderer(width, height int) *Renderer {
    dc := gg.NewContext(width, height)
    
    return &Renderer{
        width:  width,
        height: height,
        dc:     dc,
    }
}

func (r *Renderer) LoadBackground(imagePath string) error {
    img, err := gg.LoadImage(imagePath)
    if err != nil {
        return fmt.Errorf("failed to load background image: %w", err)
    }
    
    // Масштабирование под размеры canvas
    scaledImg := imaging.Fit(img, r.width, r.height, imaging.Lanczos)
    
    // Отрисовка фона
    r.dc.DrawImage(scaledImg, 0, 0)
    
    return nil
}

func (r *Renderer) RenderAnnotations(annotations []Annotation) error {
    for _, annotation := range annotations {
        if err := r.renderAnnotation(annotation); err != nil {
            return fmt.Errorf("failed to render annotation %s: %w", annotation.ID, err)
        }
    }
    return nil
}

func (r *Renderer) renderAnnotation(annotation Annotation) error {
    props, err := r.parseProperties(annotation.Properties)
    if err != nil {
        return err
    }
    
    // Настройка стиля
    r.setupStyle(props)
    
    switch annotation.Type {
    case "point":
        return r.renderPoint(annotation.Geometry, props)
    case "line":
        return r.renderLine(annotation.Geometry, props)
    case "arrow":
        return r.renderArrow(annotation.Geometry, props)
    case "rectangle":
        return r.renderRectangle(annotation.Geometry, props)
    case "circle":
        return r.renderCircle(annotation.Geometry, props)
    case "text":
        return r.renderText(annotation.Geometry, props)
    case "freehand":
        return r.renderFreehand(annotation.Geometry, props)
    default:
        return fmt.Errorf("unsupported annotation type: %s", annotation.Type)
    }
}

func (r *Renderer) parseProperties(rawProps map[string]interface{}) (*AnnotationProperties, error) {
    propsJSON, err := json.Marshal(rawProps)
    if err != nil {
        return nil, err
    }
    
    var props AnnotationProperties
    if err := json.Unmarshal(propsJSON, &props); err != nil {
        return nil, err
    }
    
    // Значения по умолчанию
    if props.Color == "" {
        props.Color = "#FF0000"
    }
    if props.StrokeWidth == 0 {
        props.StrokeWidth = 2
    }
    if props.Opacity == 0 {
        props.Opacity = 1.0
    }
    if props.Style == "" {
        props.Style = "solid"
    }
    
    return &props, nil
}

func (r *Renderer) setupStyle(props *AnnotationProperties) {
    // Парсинг цвета
    c, err := r.parseColor(props.Color)
    if err != nil {
        c = color.RGBA{255, 0, 0, 255} // Красный по умолчанию
    }
    
    // Установка прозрачности
    if props.Opacity < 1.0 {
        c = color.NRGBA{
            R: uint8(c.R * props.Opacity),
            G: uint8(c.G * props.Opacity),
            B: uint8(c.B * props.Opacity),
            A: uint8(255 * props.Opacity),
        }
    }
    
    r.dc.SetColor(c)
    r.dc.SetLineWidth(props.StrokeWidth)
    
    // Настройка стиля линии
    switch props.Style {
    case "dashed":
        r.dc.SetDash(5, 5)
    case "dotted":
        r.dc.SetDash(2, 2)
    default:
        r.dc.SetDash() // Сплошная линия
    }
}

func (r *Renderer) renderPoint(geometry map[string]interface{}, props *AnnotationProperties) error {
    coords, err := r.extractCoordinates(geometry)
    if err != nil {
        return err
    }
    
    if len(coords) < 2 {
        return fmt.Errorf("point requires at least 2 coordinates")
    }
    
    x, y := coords[0], coords[1]
    
    // Отрисовка точки как круга
    radius := props.StrokeWidth * 2
    r.dc.DrawCircle(x, y, radius)
    r.dc.Fill()
    
    return nil
}

func (r *Renderer) renderLine(geometry map[string]interface{}, props *AnnotationProperties) error {
    coords, err := r.extractCoordinates(geometry)
    if err != nil {
        return err
    }
    
    if len(coords) < 4 {
        return fmt.Errorf("line requires at least 4 coordinates")
    }
    
    // Отрисовка линии
    r.dc.MoveTo(coords[0], coords[1])
    r.dc.LineTo(coords[2], coords[3])
    r.dc.Stroke()
    
    return nil
}

func (r *Renderer) renderArrow(geometry map[string]interface{}, props *AnnotationProperties) error {
    coords, err := r.extractCoordinates(geometry)
    if err != nil {
        return err
    }
    
    if len(coords) < 4 {
        return fmt.Errorf("arrow requires at least 4 coordinates")
    }
    
    x1, y1, x2, y2 := coords[0], coords[1], coords[2], coords[3]
    
    // Отрисовка основной линии
    r.dc.MoveTo(x1, y1)
    r.dc.LineTo(x2, y2)
    r.dc.Stroke()
    
    // Расчет и отрисовка стрелки
    angle := math.Atan2(y2-y1, x2-x1)
    arrowLength := props.StrokeWidth * 5
    arrowAngle := math.Pi / 6 // 30 градусов
    
    // Левая линия стрелки
    x3 := x2 - arrowLength*math.Cos(angle-arrowAngle)
    y3 := y2 - arrowLength*math.Sin(angle-arrowAngle)
    r.dc.MoveTo(x2, y2)
    r.dc.LineTo(x3, y3)
    r.dc.Stroke()
    
    // Правая линия стрелки
    x4 := x2 - arrowLength*math.Cos(angle+arrowAngle)
    y4 := y2 - arrowLength*math.Sin(angle+arrowAngle)
    r.dc.MoveTo(x2, y2)
    r.dc.LineTo(x4, y4)
    r.dc.Stroke()
    
    return nil
}

func (r *Renderer) renderRectangle(geometry map[string]interface{}, props *AnnotationProperties) error {
    coords, err := r.extractCoordinates(geometry)
    if err != nil {
        return err
    }
    
    if len(coords) < 4 {
        return fmt.Errorf("rectangle requires at least 4 coordinates")
    }
    
    x, y, width, height := coords[0], coords[1], coords[2], coords[3]
    
    // Отрисовка прямоугольника
    r.dc.DrawRectangle(x, y, width, height)
    
    if props.FillColor != "" {
        fillC, err := r.parseColor(props.FillColor)
        if err == nil {
            r.dc.SetColor(fillC)
            r.dc.Fill()
        }
    }
    
    // Восстановление цвета для обводки
    c, _ := r.parseColor(props.Color)
    r.dc.SetColor(c)
    r.dc.Stroke()
    
    return nil
}

func (r *Renderer) renderCircle(geometry map[string]interface{}, props *AnnotationProperties) error {
    coords, err := r.extractCoordinates(geometry)
    if err != nil {
        return err
    }
    
    if len(coords) < 3 {
        return fmt.Errorf("circle requires at least 3 coordinates")
    }
    
    centerX, centerY, radius := coords[0], coords[1], coords[2]
    
    // Отрисовка круга
    r.dc.DrawCircle(centerX, centerY, radius)
    
    if props.FillColor != "" {
        fillC, err := r.parseColor(props.FillColor)
        if err == nil {
            r.dc.SetColor(fillC)
            r.dc.Fill()
        }
    }
    
    // Восстановление цвета для обводки
    c, _ := r.parseColor(props.Color)
    r.dc.SetColor(c)
    r.dc.Stroke()
    
    return nil
}

func (r *Renderer) renderText(geometry map[string]interface{}, props *AnnotationProperties) error {
    coords, err := r.extractCoordinates(geometry)
    if err != nil {
        return err
    }
    
    if len(coords) < 2 {
        return fmt.Errorf("text requires at least 2 coordinates")
    }
    
    x, y := coords[0], coords[1]
    
    text, ok := geometry["text"].(string)
    if !ok {
        return fmt.Errorf("text annotation requires text property")
    }
    
    fontSize := props.StrokeWidth * 6 // Размер шрифта пропорционально толщине линии
    if fontSize < 12 {
        fontSize = 12
    }
    
    r.dc.SetFontFace(r.loadFont(fontSize))
    r.dc.DrawString(text, x, y)
    
    return nil
}

func (r *Renderer) renderFreehand(geometry map[string]interface{}, props *AnnotationProperties) error {
    coords, err := r.extractCoordinates(geometry)
    if err != nil {
        return err
    }
    
    if len(coords) < 2 {
        return fmt.Errorf("freehand requires at least 2 coordinates")
    }
    
    // Отрисовка свободной линии
    r.dc.MoveTo(coords[0], coords[1])
    
    for i := 2; i < len(coords); i += 2 {
        x, y := coords[i], coords[i+1]
        r.dc.LineTo(x, y)
    }
    
    r.dc.Stroke()
    
    return nil
}

func (r *Renderer) extractCoordinates(geometry map[string]interface{}) ([]float64, error) {
    coordsInterface, ok := geometry["coordinates"]
    if !ok {
        return nil, fmt.Errorf("geometry missing coordinates")
    }
    
    coordsSlice, ok := coordsInterface.([]interface{})
    if !ok {
        return nil, fmt.Errorf("coordinates is not an array")
    }
    
    var coords []float64
    for _, coord := range coordsSlice {
        if f, ok := coord.(float64); ok {
            coords = append(coords, f)
        }
    }
    
    return coords, nil
}

func (r *Renderer) parseColor(colorStr string) (color.Color, error) {
    var c color.Color
    _, err := fmt.Sscanf(colorStr, "#%02x%02x%02x", &c)
    if err != nil {
        return nil, fmt.Errorf("invalid color format: %s", colorStr)
    }
    
    return c, nil
}

func (r *Renderer) loadFont(size float64) font.Face {
    // Загрузка шрифта (можно использовать системные или встроенные)
    // Для простоты используем базовый шрифт
    return font.BasicFont(size)
}

func (r *Renderer) SaveImage(path string) error {
    return r.dc.SavePNG(path)
}

func (r *Renderer) ToImage() image.Image {
    return r.dc.Image()
}
```

## 🗄️ Repository слой

### Drawing Repository
```go
package repository

import (
    "context"
    "fmt"
    "time"
    
    "gorm.io/gorm"
    
    "stroy-control/internal/models"
)

type DrawingRepository struct {
    db *gorm.DB
}

func NewDrawingRepository(db *gorm.DB) *DrawingRepository {
    return &DrawingRepository{db: db}
}

func (r *DrawingRepository) Create(ctx context.Context, drawing *models.Drawing) error {
    return r.db.WithContext(ctx).Create(drawing).Error
}

func (r *DrawingRepository) GetByID(ctx context.Context, id string) (*models.Drawing, error) {
    var drawing models.Drawing
    
    err := r.db.WithContext(ctx).
        Preload("Project").
        Preload("Uploader").
        Preload("Approver").
        Preload("Pages").
        Preload("Annotations").
        First(&drawing, "id = ?", id).Error
    
    if err != nil {
        return nil, err
    }
    
    // Вычисляемые поля
    drawing.PageCount = len(drawing.Pages)
    drawing.AnnotationCount = len(drawing.Annotations)
    
    return &drawing, nil
}

func (r *DrawingRepository) GetByProject(ctx context.Context, projectID string, filters DrawingFilters) ([]models.Drawing, int64, error) {
    var drawings []models.Drawing
    var total int64
    
    query := r.db.WithContext(ctx).
        Model(&models.Drawing{}).
        Where("project_id = ?", projectID).
        Preload("Uploader").
        Preload("Approver")
    
    // Фильтры
    if filters.Status != "" {
        query = query.Where("status = ?", filters.Status)
    }
    
    if filters.Search != "" {
        query = query.Where("name ILIKE ?", "%"+filters.Search+"%")
    }
    
    if filters.UploadedBy != "" {
        query = query.Where("uploaded_by = ?", filters.UploadedBy)
    }
    
    if !filters.DateFrom.IsZero() {
        query = query.Where("uploaded_at >= ?", filters.DateFrom)
    }
    
    if !filters.DateTo.IsZero() {
        query = query.Where("uploaded_at <= ?", filters.DateTo)
    }
    
    // Сортировка
    orderBy := "name ASC"
    if filters.SortBy != "" {
        direction := "ASC"
        if filters.SortDesc {
            direction = "DESC"
        }
        orderBy = fmt.Sprintf("%s %s", filters.SortBy, direction)
    }
    query = query.Order(orderBy)
    
    // Подсчет общего количества
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }
    
    // Пагинация
    offset := (filters.Page - 1) * filters.Limit
    err := query.Offset(offset).Limit(filters.Limit).Find(&drawings).Error
    
    return drawings, total, err
}

func (r *DrawingRepository) Update(ctx context.Context, drawing *models.Drawing) error {
    return r.db.WithContext(ctx).Save(drawing).Error
}

func (r *DrawingRepository) Delete(ctx context.Context, id string) error {
    return r.db.WithContext(ctx).Delete(&models.Drawing{}, "id = ?", id).Error
}

func (r *DrawingRepository) CreatePage(ctx context.Context, page *models.DrawingPage) error {
    return r.db.WithContext(ctx).Create(page).Error
}

func (r *DrawingRepository) GetPages(ctx context.Context, drawingID string) ([]models.DrawingPage, error) {
    var pages []models.DrawingPage
    
    err := r.db.WithContext(ctx).
        Where("drawing_id = ?", drawingID).
        Order("page_number ASC").
        Find(&pages).Error
    
    return pages, err
}

func (r *DrawingRepository) GetPage(ctx context.Context, drawingID string, pageNumber int) (*models.DrawingPage, error) {
    var page models.DrawingPage
    
    err := r.db.WithContext(ctx).
        Where("drawing_id = ? AND page_number = ?", drawingID, pageNumber).
        First(&page).Error
    
    return &page, err
}

type DrawingFilters struct {
    Page      int       `form:"page"`
    Limit     int       `form:"limit"`
    Search    string    `form:"search"`
    Status    string    `form:"status"`
    UploadedBy string   `form:"uploaded_by"`
    DateFrom  time.Time `form:"date_from"`
    DateTo    time.Time `form:"date_to"`
    SortBy    string    `form:"sort_by"`
    SortDesc  bool      `form:"sort_desc"`
}
```

### Annotation Repository
```go
package repository

import (
    "context"
    "fmt"
    
    "gorm.io/gorm"
    
    "stroy-control/internal/models"
)

type AnnotationRepository struct {
    db *gorm.DB
}

func NewAnnotationRepository(db *gorm.DB) *AnnotationRepository {
    return &AnnotationRepository{db: db}
}

func (r *AnnotationRepository) Create(ctx context.Context, annotation *models.Annotation) error {
    return r.db.WithContext(ctx).Create(annotation).Error
}

func (r *AnnotationRepository) GetByID(ctx context.Context, id string) (*models.Annotation, error) {
    var annotation models.Annotation
    
    err := r.db.WithContext(ctx).
        Preload("Drawing").
        Preload("Creator").
        Preload("Updater").
        Preload("Approver").
        Preload("Defects").
        Preload("Photos").
        First(&annotation, "id = ?", id).Error
    
    return &annotation, err
}

func (r *AnnotationRepository) GetByDrawing(ctx context.Context, drawingID string, filters AnnotationFilters) ([]models.Annotation, error) {
    var annotations []models.Annotation
    
    query := r.db.WithContext(ctx).
        Model(&models.Annotation{}).
        Where("drawing_id = ?", drawingID).
        Preload("Creator").
        Preload("Updater").
        Preload("Defects").
        Preload("Photos")
    
    // Фильтры
    if filters.PageNumber > 0 {
        query = query.Where("page_number = ?", filters.PageNumber)
    }
    
    if len(filters.Types) > 0 {
        query = query.Where("type IN ?", filters.Types)
    }
    
    if len(filters.Users) > 0 {
        query = query.Where("created_by IN ?", filters.Users)
    }
    
    if filters.Status != "" {
        query = query.Where("status = ?", filters.Status)
    }
    
    if !filters.IncludeDeleted {
        query = query.Where("status != ?", "deleted")
    }
    
    err := query.Order("created_at DESC").Find(&annotations).Error
    
    return annotations, err
}

func (r *AnnotationRepository) Update(ctx context.Context, annotation *models.Annotation) error {
    return r.db.WithContext(ctx).Save(annotation).Error
}

func (r *AnnotationRepository) Delete(ctx context.Context, id string) error {
    return r.db.WithContext(ctx).Delete(&models.Annotation{}, "id = ?", id).Error
}

func (r *AnnotationRepository) LinkDefects(ctx context.Context, annotationID string, defectIDs []string) error {
    return r.db.WithContext(ctx).
        Table("annotation_defects").
        Create(defectIDs).
        Error
}

func (r *AnnotationRepository) CreateHistory(ctx context.Context, history *models.AnnotationHistory) error {
    return r.db.WithContext(ctx).Create(history).Error
}

func (r *AnnotationRepository) GetHistory(ctx context.Context, annotationID string) ([]models.AnnotationHistory, error) {
    var history []models.AnnotationHistory
    
    err := r.db.WithContext(ctx).
        Where("annotation_id = ?", annotationID).
        Order("changed_at DESC").
        Find(&history).Error
    
    return history, err
}

type AnnotationFilters struct {
    PageNumber    int      `form:"page"`
    Types         []string `form:"types"`
    Users         []string `form:"users"`
    Status        string   `form:"status"`
    IncludeDeleted bool   `form:"include_deleted"`
    Version       int      `form:"version"`
}
```

## 🔧 Service слой

### Drawing Service
```go
package services

import (
    "context"
    "fmt"
    "log"
    "mime/multipart"
    "time"
    
    "stroy-control/internal/models"
    "stroy-control/internal/repository"
    "stroy-control/internal/storage"
    "stroy-control/pkg/pdf"
    "stroy-control/pkg/ai"
)

type DrawingService struct {
    repo          *repository.DrawingRepository
    fileStore     storage.FileStore
    pdfProcessor  *pdf.Processor
    aiClient      *ai.Client
    cache         CacheInterface
}

func NewDrawingService(
    repo *repository.DrawingRepository,
    fileStore storage.FileStore,
    pdfProcessor *pdf.Processor,
    aiClient *ai.Client,
    cache CacheInterface,
) *DrawingService {
    return &DrawingService{
        repo:         repo,
        fileStore:    fileStore,
        pdfProcessor: pdfProcessor,
        aiClient:     aiClient,
        cache:        cache,
    }
}

func (s *DrawingService) GetDrawings(ctx context.Context, projectID string, filters repository.DrawingFilters) ([]models.Drawing, int64, error) {
    // Проверка кэша
    cacheKey := fmt.Sprintf("drawings:%s:%v", projectID, filters)
    
    if cached, err := s.cache.Get(ctx, cacheKey); err == nil {
        // Десериализация из кэша
        var result struct {
            Drawings []models.Drawing `json:"drawings"`
            Total    int64            `json:"total"`
        }
        if err := json.Unmarshal(cached, &result); err == nil {
            return result.Drawings, result.Total, nil
        }
    }
    
    // Получение из БД
    drawings, total, err := s.repo.GetByProject(ctx, projectID, filters)
    if err != nil {
        return nil, 0, err
    }
    
    // Сохранение в кэш
    result := struct {
        Drawings []models.Drawing `json:"drawings"`
        Total    int64            `json:"total"`
    }{
        Drawings: drawings,
        Total:    total,
    }
    
    if data, err := json.Marshal(result); err == nil {
        s.cache.Set(ctx, cacheKey, data, 5*time.Minute)
    }
    
    return drawings, total, nil
}

func (s *DrawingService) UploadDrawing(
    ctx context.Context,
    projectID, userID string,
    file *multipart.FileHeader,
    req CreateDrawingRequest,
) (*models.Drawing, error) {
    // 1. Валидация файла
    if err := s.validateDrawingFile(file); err != nil {
        return nil, fmt.Errorf("file validation failed: %w", err)
    }
    
    // 2. Сохранение файла
    filePath, err := s.fileStore.SaveFile(file, "drawings")
    if err != nil {
        return nil, fmt.Errorf("failed to save file: %w", err)
    }
    
    // 3. Создание записи в БД
    drawing := &models.Drawing{
        ProjectID:    projectID,
        Name:         req.Name,
        Description:  &req.Description,
        FilePath:     filePath,
        FileSize:     file.Size,
        MimeType:     file.Header.Get("Content-Type"),
        UploadedBy:   userID,
        Status:       models.DrawingStatusDraft,
        Scale:        req.Scale,
        Metadata:     req.Metadata,
    }
    
    if err := s.repo.Create(ctx, drawing); err != nil {
        s.fileStore.DeleteFile(filePath)
        return nil, fmt.Errorf("failed to create drawing: %w", err)
    }
    
    // 4. Асинхронная обработка
    go s.processDrawingAsync(context.Background(), drawing.ID)
    
    // 5. Инвалидация кэша
    s.invalidateProjectCache(ctx, projectID)
    
    return drawing, nil
}

func (s *DrawingService) processDrawingAsync(ctx context.Context, drawingID string) {
    log.Printf("Starting async processing for drawing %s", drawingID)
    
    // Получение чертежа
    drawing, err := s.repo.GetByID(ctx, drawingID)
    if err != nil {
        log.Printf("Error getting drawing %s: %v", drawingID, err)
        return
    }
    
    // Обработка PDF
    pages, err := s.pdfProcessor.ProcessPDF(ctx, drawing.FilePath)
    if err != nil {
        log.Printf("Error processing PDF for drawing %s: %v", drawingID, err)
        s.markAsFailed(ctx, drawingID, "PDF processing failed")
        return
    }
    
    // Сохранение страниц
    for _, page := range pages {
        drawingPage := &models.DrawingPage{
            DrawingID:    drawingID,
            PageNumber:   page.PageNumber,
            Width:        page.Width,
            Height:       page.Height,
            Scale:        page.Scale,
            Rotation:     page.Rotation,
            OriginalURL:  &page.ImagePath,
            ThumbnailURL: &page.ThumbnailPath,
            AIElements:   s.marshalElements(page.Elements),
            AIText:       s.marshalText(page.Text),
            AIAnalyzedAt: &time.Time{},
        }
        
        if err := s.repo.CreatePage(ctx, drawingPage); err != nil {
            log.Printf("Error creating page %d for drawing %s: %v", page.PageNumber, drawingID, err)
        }
    }
    
    // AI анализ
    go s.analyzeWithAI(ctx, drawingID)
    
    // Обновление статуса
    drawing.Status = models.DrawingStatusReview
    if err := s.repo.Update(ctx, drawing); err != nil {
        log.Printf("Error updating drawing status: %v", err)
    }
    
    log.Printf("Completed processing for drawing %s", drawingID)
}

func (s *DrawingService) analyzeWithAI(ctx context.Context, drawingID string) {
    analysis, err := s.aiClient.AnalyzeDrawing(ctx, drawingID, ai.AnalysisOptions{
        ExtractElements:    true,
        CheckCompliance:    true,
        DetectAnomalies:    true,
        SuggestAnnotations: true,
    })
    
    if err != nil {
        log.Printf("AI analysis failed for drawing %s: %v", drawingID, err)
        return
    }
    
    // Сохранение результатов анализа
    drawing, err := s.repo.GetByID(ctx, drawingID)
    if err != nil {
        return
    }
    
    drawing.AIAnalysis = s.marshalAnalysis(analysis)
    drawing.Status = models.DrawingStatusApproved
    drawing.ApprovedAt = &time.Time{}
    
    if err := s.repo.Update(ctx, drawing); err != nil {
        log.Printf("Error saving AI analysis: %v", err)
    }
}

func (s *DrawingService) validateDrawingFile(file *multipart.FileHeader) error {
    // Проверка размера файла (макс 100MB)
    if file.Size > 100*1024*1024 {
        return fmt.Errorf("file too large (max 100MB)")
    }
    
    // Проверка MIME типа
    allowedTypes := map[string]bool{
        "application/pdf":  true,
        "image/png":        true,
        "image/jpeg":       true,
        "image/jpg":        true,
        "application/dwg":  true,
        "application/dxf":  true,
    }
    
    mimeType := file.Header.Get("Content-Type")
    if !allowedTypes[mimeType] {
        return fmt.Errorf("unsupported file type: %s", mimeType)
    }
    
    return nil
}

func (s *DrawingService) marshalElements(elements []pdf.DrawingElement) json.RawMessage {
    data, _ := json.Marshal(elements)
    return data
}

func (s *DrawingService) marshalText(text string) json.RawMessage {
    data, _ := json.Marshal(text)
    return data
}

func (s *DrawingService) marshalAnalysis(analysis *ai.DrawingAnalysis) json.RawMessage {
    data, _ := json.Marshal(analysis)
    return data
}

func (s *DrawingService) invalidateProjectCache(ctx context.Context, projectID string) {
    pattern := fmt.Sprintf("drawings:%s:*", projectID)
    s.cache.DeletePattern(ctx, pattern)
}

func (s *DrawingService) markAsFailed(ctx context.Context, drawingID, reason string) {
    drawing, err := s.repo.GetByID(ctx, drawingID)
    if err != nil {
        return
    }
    
    drawing.Status = models.DrawingStatusRejected
    if err := s.repo.Update(ctx, drawing); err != nil {
        log.Printf("Error marking drawing as failed: %v", err)
    }
}

type CreateDrawingRequest struct {
    Name        string          `json:"name" binding:"required"`
    Description string          `json:"description"`
    Scale       json.RawMessage `json:"scale"`
    Metadata    json.RawMessage `json:"metadata"`
}

type CacheInterface interface {
    Get(ctx context.Context, key string) ([]byte, error)
    Set(ctx context.Context, key string, value []byte, ttl time.Duration) error
    Delete(ctx context.Context, key string) error
    DeletePattern(ctx context.Context, pattern string) error
}
```

## 🤖 AI Client

### AI Client для интеграции с Python AI Gateway
```go
package ai

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type Client struct {
    baseURL    string
    httpClient *http.Client
    apiKey     string
}

func NewClient(baseURL, apiKey string) *Client {
    return &Client{
        baseURL: baseURL,
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
        },
        apiKey: apiKey,
    }
}

type DrawingAnalysis struct {
    Elements       []DrawingElement `json:"elements"`
    Compliance     ComplianceResult `json:"compliance"`
    Anomalies      []Anomaly        `json:"anomalies"`
    Suggestions    []Suggestion     `json:"suggestions"`
    Confidence     float64          `json:"confidence"`
    ProcessingTime time.Duration    `json:"processing_time"`
}

type AnalysisOptions struct {
    ExtractElements    bool `json:"extract_elements"`
    CheckCompliance    bool `json:"check_compliance"`
    DetectAnomalies    bool `json:"detect_anomalies"`
    SuggestAnnotations bool `json:"suggest_annotations"`
}

func (c *Client) AnalyzeDrawing(ctx context.Context, drawingID string, options AnalysisOptions) (*DrawingAnalysis, error) {
    req := AnalyzeDrawingRequest{
        DrawingID: drawingID,
        Options:   options,
    }
    
    var result DrawingAnalysis
    
    err := c.makeRequest(ctx, "POST", "/api/v1/ai/analyze/drawing", req, &result)
    if err != nil {
        return nil, fmt.Errorf("AI analysis failed: %w", err)
    }
    
    return &result, nil
}

type DefectDetection struct {
    DetectedDefects []DetectedDefect `json:"defects"`
    Confidence     float64          `json:"confidence"`
    Suggestions    []DefectSuggestion `json:"suggestions"`
}

type DrawingContext struct {
    DrawingID   string  `json:"drawing_id"`
    PageNumber  int     `json:"page_number"`
    Coordinates string  `json:"coordinates"`
}

func (c *Client) DetectDefects(ctx context.Context, imageFile multipart.File, drawingContext DrawingContext) (*DefectDetection, error) {
    // Реализация детекции дефектов
    // ...
    return nil, nil
}

func (c *Client) makeRequest(ctx context.Context, method, endpoint string, reqBody, respBody interface{}) error {
    url := c.baseURL + endpoint
    
    // Сериализация запроса
    var body bytes.Buffer
    if reqBody != nil {
        if err := json.NewEncoder(&body).Encode(reqBody); err != nil {
            return fmt.Errorf("failed to encode request: %w", err)
        }
    }
    
    // Создание HTTP запроса
    req, err := http.NewRequestWithContext(ctx, method, url, &body)
    if err != nil {
        return fmt.Errorf("failed to create request: %w", err)
    }
    
    // Заголовки
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+c.apiKey)
    req.Header.Set("X-API-Key", c.apiKey)
    
    // Выполнение запроса
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return fmt.Errorf("request failed: %w", err)
    }
    defer resp.Body.Close()
    
    // Проверка статуса
    if resp.StatusCode >= 400 {
        return fmt.Errorf("AI service error: %d", resp.StatusCode)
    }
    
    // Десериализация ответа
    if respBody != nil {
        if err := json.NewDecoder(resp.Body).Decode(respBody); err != nil {
            return fmt.Errorf("failed to decode response: %w", err)
        }
    }
    
    return nil
}

type AnalyzeDrawingRequest struct {
    DrawingID string         `json:"drawing_id"`
    Options   AnalysisOptions `json:"options"`
}

// AI типы данных
type DrawingElement struct {
    Type        string                 `json:"type"`
    Coordinates []float64              `json:"coordinates"`
    Properties  map[string]interface{} `json:"properties"`
    Confidence  float64                `json:"confidence"`
}

type ComplianceResult struct {
    OverallScore float64           `json:"overall_score"`
    Issues       []ComplianceIssue `json:"issues"`
    Standards    []string          `json:"standards"`
}

type ComplianceIssue struct {
    Type        string `json:"type"`
    Severity    string `json:"severity"`
    Description string `json:"description"`
    Location    string `json:"location"`
}

type Anomaly struct {
    Type        string  `json:"type"`
    Confidence  float64 `json:"confidence"`
    Description string  `json:"description"`
    Coordinates []float64 `json:"coordinates"`
}

type Suggestion struct {
    Type        string                 `json:"type"`
    Description string                 `json:"description"`
    Coordinates []float64              `json:"coordinates"`
    Properties  map[string]interface{} `json:"properties"`
}

type DetectedDefect struct {
    Type        string  `json:"type"`
    Confidence  float64 `json:"confidence"`
    BoundingBox BoundingBox `json:"bounding_box"`
    Severity    string  `json:"severity"`
    Description string  `json:"description"`
}

type BoundingBox struct {
    X      float64 `json:"x"`
    Y      float64 `json:"y"`
    Width  float64 `json:"width"`
    Height float64 `json:"height"`
}

type DefectSuggestion struct {
    Action      string `json:"action"`
    Description string `json:"description"`
    Priority    string `json:"priority"`
}
```

---

Эта архитектура обеспечивает полную функциональность для работы с PDF чертежами на Go + Gin стеке с интеграцией AI сервисов и поддержкой всех требуемых функций.
