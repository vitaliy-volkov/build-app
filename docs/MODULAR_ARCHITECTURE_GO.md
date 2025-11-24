# Модульная архитектура для Go + Gin + PostgreSQL системы

## 📋 Обзор

Данный документ описывает техническую реализацию модульной архитектуры для системы "Строй-Контроль" с учетом Go бэкенда. Фокус на гибкой системе доступа, подписках и масштабируемости.

---

## 🏗️ Концепция "Ядро + Модули"

### 🔹 Ядро (Core) - Базовая функциональность
Всегда включено, нельзя отключить. Реализовано на Go + Gin.

**Backend Core модули:**
```go
// internal/core/modules/auth.go
package modules

type AuthModule struct {
    router     *gin.Engine
    userService *services.UserService
    jwtService  *services.JWTService
}

func (m *AuthModule) RegisterRoutes() {
    auth := m.router.Group("/api/v1/auth")
    {
        auth.POST("/register", m.handleRegister)
        auth.POST("/login", m.handleLogin)
        auth.POST("/logout", m.handleLogout)
        auth.POST("/refresh", m.handleRefresh)
        auth.GET("/profile", m.authMiddleware(), m.handleProfile)
        auth.PUT("/profile", m.authMiddleware(), m.handleUpdateProfile)
    }
}

// internal/core/modules/users.go
type UsersModule struct {
    router *gin.Engine
    userService *services.UserService
}

func (m *UsersModule) RegisterRoutes() {
    users := m.router.Group("/api/v1/users")
    users.Use(m.authMiddleware())
    {
        users.GET("", m.handleGetUsers)
        users.GET("/:id", m.handleGetUser)
        users.POST("", m.handleCreateUser)
        users.PUT("/:id", m.handleUpdateUser)
        users.DELETE("/:id", m.handleDeleteUser)
    }
}
```

**Frontend Core модули:**
```typescript
// modules/core/CoreModule.tsx
export const CoreModule = {
  name: 'core',
  components: {
    AuthLayout: lazy(() => import('./auth/AuthLayout')),
    MainLayout: lazy(() => import('./layout/MainLayout')),
    Navigation: lazy(() => import('./navigation/Navigation')),
    Notifications: lazy(() => import('./notifications/Notifications')),
  },
  routes: [
    { path: '/login', component: 'LoginPage' },
    { path: '/register', component: 'RegisterPage' },
    { path: '/', component: 'DashboardPage', protected: true },
  ],
  required: true,
};
```

### 🧩 Подключаемые Модули (Business Modules)

#### Backend модули на Go
```go
// internal/modules/projects/projects.go
type ProjectsModule struct {
    router       *gin.Engine
    projectService *services.ProjectService
    permissionService *services.PermissionService
}

func (m *ProjectsModule) RegisterRoutes() {
    projects := m.router.Group("/api/v1/projects")
    projects.Use(m.authMiddleware(), m.permissionMiddleware("projects:view"))
    {
        projects.GET("", m.handleGetProjects)
        projects.POST("", m.permissionMiddleware("projects:create"), m.handleCreateProject)
        projects.GET("/:id", m.permissionMiddleware("projects:view"), m.handleGetProject)
        projects.PUT("/:id", m.permissionMiddleware("projects:update"), m.handleUpdateProject)
        projects.DELETE("/:id", m.permissionMiddleware("projects:delete"), m.handleDeleteProject)
        
        // Sub-routes
        projects.GET("/:id/estimates", m.handleGetProjectEstimates)
        projects.GET("/:id/drawings", m.handleGetProjectDrawings)
        projects.GET("/:id/team", m.handleGetProjectTeam)
    }
}

// internal/modules/estimates/estimates.go
type EstimatesModule struct {
    router        *gin.Engine
    estimateService *services.EstimateService
    aiService      *services.AIService
}

func (m *EstimatesModule) RegisterRoutes() {
    estimates := m.router.Group("/api/v1/estimates")
    estimates.Use(m.authMiddleware())
    {
        estimates.GET("", m.handleGetEstimates)
        estimates.POST("", m.permissionMiddleware("estimates:create"), m.handleCreateEstimate)
        estimates.GET("/:id", m.handleGetEstimate)
        estimates.PUT("/:id", m.permissionMiddleware("estimates:update"), m.handleUpdateEstimate)
        estimates.DELETE("/:id", m.permissionMiddleware("estimates:delete"), m.handleDeleteEstimate)
        
        // AI функции
        estimates.POST("/:id/analyze", m.permissionMiddleware("ai:use"), m.handleAnalyzeEstimate)
        estimates.POST("/:id/optimize", m.permissionMiddleware("ai:use"), m.handleOptimizeEstimate)
    }
}

// internal/modules/drawings/drawings.go  
type DrawingsModule struct {
    router         *gin.Engine
    drawingService *services.DrawingService
    fileService    *services.FileService
    aiService      *services.AIService
}

func (m *DrawingsModule) RegisterRoutes() {
    drawings := m.router.Group("/api/v1/drawings")
    drawings.Use(m.authMiddleware())
    {
        drawings.GET("", m.handleGetDrawings)
        drawings.POST("", m.permissionMiddleware("drawings:create"), m.handleUploadDrawing)
        drawings.GET("/:id", m.handleGetDrawing)
        drawings.PUT("/:id", m.permissionMiddleware("drawings:update"), m.handleUpdateDrawing)
        drawings.DELETE("/:id", m.permissionMiddleware("drawings:delete"), m.handleDeleteDrawing)
        
        // Аннотации
        drawings.GET("/:id/annotations", m.handleGetAnnotations)
        drawings.POST("/:id/annotations", m.permissionMiddleware("annotations:create"), m.handleCreateAnnotation)
        drawings.PUT("/:id/annotations/:aid", m.permissionMiddleware("annotations:update"), m.handleUpdateAnnotation)
        
        // AI функции
        drawings.POST("/:id/analyze", m.permissionMiddleware("ai:use"), m.handleAnalyzeDrawing)
        drawings.POST("/:id/detect-defects", m.permissionMiddleware("ai:use"), m.handleDetectDefects)
    }
}
```

---

## 🔐 Система прав доступа (RBAC)

### PostgreSQL схема
```sql
-- Роли и права
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Права доступа
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource, action)
);

-- Связь ролей и прав
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Роли пользователей
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Подписки компаний
CREATE TABLE company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL,
    modules JSONB NOT NULL DEFAULT '[]',
    limits JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Go модели
```go
// models/permissions.go
type Permission struct {
    ID          string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    Resource    string    `json:"resource" gorm:"not null"`
    Action      string    `json:"action" gorm:"not null"`
    Description string    `json:"description"`
    CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}

type Role struct {
    ID          string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    Name        string    `json:"name" gorm:"not null;unique"`
    Description string    `json:"description"`
    IsSystem    bool      `json:"is_system" gorm:"default:false"`
    Permissions []Permission `json:"permissions" gorm:"many2many:role_permissions;"`
    CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}

type UserRole struct {
    UserID     string    `json:"user_id" gorm:"primaryKey"`
    RoleID     string    `json:"role_id" gorm:"primaryKey"`
    AssignedAt time.Time `json:"assigned_at" gorm:"autoCreateTime"`
    AssignedBy *string   `json:"assigned_by"`
    Role       Role      `json:"role" gorm:"foreignKey:RoleID"`
}

type CompanySubscription struct {
    ID       string         `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    CompanyID string         `json:"company_id" gorm:"not null;index"`
    Plan     string         `json:"plan" gorm:"not null"`
    Modules  pq.StringArray `json:"modules" gorm:"type:text[]"`
    Limits   json.RawMessage `json:"limits" gorm:"type:jsonb"`
    ExpiresAt *time.Time     `json:"expires_at"`
    CreatedAt time.Time      `json:"created_at" gorm:"autoCreateTime"`
    UpdatedAt time.Time      `json:"updated_at" gorm:"autoUpdateTime"`
}
```

### Middleware для проверки прав
```go
// middleware/permission.go
func (s *Server) permissionMiddleware(requiredPermission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID := c.GetString("user_id")
        companyID := c.GetString("company_id")
        
        // Проверка подписки компании
        subscription, err := s.getCompanySubscription(companyID)
        if err != nil {
            c.JSON(403, gin.H{"error": "Subscription check failed"})
            c.Abort()
            return
        }
        
        // Проверка доступа к модулю
        if !s.hasModuleAccess(subscription, requiredPermission) {
            c.JSON(403, gin.H{"error": "Module not available in current plan"})
            c.Abort()
            return
        }
        
        // Проверка прав пользователя
        hasPermission, err := s.userService.HasPermission(userID, requiredPermission)
        if err != nil || !hasPermission {
            c.JSON(403, gin.H{"error": "Insufficient permissions"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}

func (s *Server) hasModuleAccess(subscription *models.CompanySubscription, permission string) bool {
    // Извлечение модуля из права (projects:view -> projects)
    parts := strings.Split(permission, ":")
    if len(parts) < 2 {
        return false
    }
    module := parts[0]
    
    // Проверка наличия модуля в подписке
    for _, availableModule := range subscription.Modules {
        if availableModule == module {
            return true
        }
    }
    
    return false
}
```

---

## 💳 Система подписок и тарифов

### Тарифные планы
```go
// types/subscription.go
type SubscriptionPlan struct {
    Name        string                 `json:"name"`
    Price       float64                `json:"price"`
    Duration    time.Duration          `json:"duration"`
    Modules     []string               `json:"modules"`
    Limits      map[string]interface{} `json:"limits"`
    Features    []string               `json:"features"`
}

var SubscriptionPlans = map[string]SubscriptionPlan{
    "free": {
        Name:     "Бесплатный",
        Price:    0,
        Duration: 30 * 24 * time.Hour, // 30 дней
        Modules:  []string{"projects", "estimates"},
        Limits: map[string]interface{}{
            "projects":     1,
            "users":        3,
            "storage_mb":   100,
            "ai_requests":  0,
        },
        Features: []string{"basic_features"},
    },
    "professional": {
        Name:     "Профессиональный",
        Price:    4990,
        Duration: 30 * 24 * time.Hour,
        Modules:  []string{"projects", "estimates", "finance", "crm", "documents"},
        Limits: map[string]interface{}{
            "projects":     10,
            "users":        10,
            "storage_mb":   1000,
            "ai_requests":  100,
        },
        Features: []string{"basic_features", "ai_assistant", "reports"},
    },
    "business": {
        Name:     "Бизнес",
        Price:    14990,
        Duration: 30 * 24 * time.Hour,
        Modules:  []string{"projects", "estimates", "finance", "crm", "documents", "drawings", "ai_assistant"},
        Limits: map[string]interface{}{
            "projects":     -1, // безлимит
            "users":        50,
            "storage_mb":   10000,
            "ai_requests":  1000,
        },
        Features: []string{"basic_features", "ai_assistant", "reports", "api_access", "priority_support"},
    },
    "enterprise": {
        Name:     "Корпоративный",
        Price:    49990,
        Duration: 30 * 24 * time.Hour,
        Modules:  []string{"all"},
        Limits: map[string]interface{}{
            "projects":     -1,
            "users":        -1,
            "storage_mb":   -1,
            "ai_requests":  -1,
        },
        Features: []string{"all_features", "custom_integration", "dedicated_support", "white_label"},
    },
}
```

### Service для управления подписками
```go
// services/subscription_service.go
type SubscriptionService struct {
    db          *gorm.DB
    paymentService *PaymentService
}

func (s *SubscriptionService) CreateSubscription(companyID, planName string) (*models.CompanySubscription, error) {
    plan, exists := SubscriptionPlans[planName]
    if !exists {
        return nil, fmt.Errorf("plan %s not found", planName)
    }
    
    subscription := &models.CompanySubscription{
        CompanyID: companyID,
        Plan:      planName,
        Modules:   pq.StringArray(plan.Modules),
        Limits:    s.marshalLimits(plan.Limits),
        ExpiresAt: s.calculateExpiry(plan.Duration),
    }
    
    if err := s.db.Create(subscription).Error; err != nil {
        return nil, err
    }
    
    return subscription, nil
}

func (s *SubscriptionService) CheckLimits(companyID, resource string, count int) error {
    var subscription models.CompanySubscription
    if err := s.db.Where("company_id = ?", companyID).First(&subscription).Error; err != nil {
        return fmt.Errorf("subscription not found")
    }
    
    limits := s.unmarshalLimits(subscription.Limits)
    limit, exists := limits[resource]
    if !exists {
        return nil // нет лимита
    }
    
    if limitInt, ok := limit.(float64); ok && limitInt > 0 {
        var currentCount int64
        switch resource {
        case "projects":
            s.db.Model(&models.Project{}).Where("company_id = ?", companyID).Count(&currentCount)
        case "users":
            s.db.Model(&models.User{}).Where("company_id = ?", companyID).Count(&currentCount)
        }
        
        if int(currentCount)+count > int(limitInt) {
            return fmt.Errorf("limit exceeded for %s", resource)
        }
    }
    
    return nil
}

func (s *SubscriptionService) GetAvailableModules(companyID string) ([]string, error) {
    var subscription models.CompanySubscription
    if err := s.db.Where("company_id = ?", companyID).First(&subscription).Error; err != nil {
        return nil, err
    }
    
    return subscription.Modules, nil
}
```

---

## 🔄 Module Registry (Backend)

### Go реализация реестра модулей
```go
// internal/registry/module_registry.go
type Module interface {
    Name() string
    Required() bool
    Dependencies() []string
    RegisterRoutes()
    Init() error
    Shutdown() error
}

type ModuleRegistry struct {
    modules map[string]Module
    router  *gin.Engine
    db      *gorm.DB
    config  *config.Config
}

func NewModuleRegistry(router *gin.Engine, db *gorm.DB, config *config.Config) *ModuleRegistry {
    return &ModuleRegistry{
        modules: make(map[string]Module),
        router:  router,
        db:      db,
        config:  config,
    }
}

func (r *ModuleRegistry) RegisterModule(module Module) error {
    name := module.Name()
    if _, exists := r.modules[name]; exists {
        return fmt.Errorf("module %s already registered", name)
    }
    
    // Проверка зависимостей
    for _, dep := range module.Dependencies() {
        if _, exists := r.modules[dep]; !exists {
            return fmt.Errorf("dependency %s not found for module %s", dep, name)
        }
    }
    
    r.modules[name] = module
    return nil
}

func (r *ModuleRegistry) InitializeModules(subscription *models.CompanySubscription) error {
    // Сначала обязательные модули
    for _, module := range r.modules {
        if module.Required() {
            if err := module.Init(); err != nil {
                return fmt.Errorf("failed to init required module %s: %w", module.Name(), err)
            }
            module.RegisterRoutes()
        }
    }
    
    // Затем модули из подписки
    for _, moduleName := range subscription.Modules {
        if module, exists := r.modules[moduleName]; exists {
            if err := module.Init(); err != nil {
                return fmt.Errorf("failed to init module %s: %w", moduleName, err)
            }
            module.RegisterRoutes()
        }
    }
    
    return nil
}

func (r *ModuleRegistry) GetAvailableModules(companyID string) ([]string, error) {
    // Получение подписки компании
    var subscription models.CompanySubscription
    if err := r.db.Where("company_id = ?", companyID).First(&subscription).Error; err != nil {
        return nil, err
    }
    
    var availableModules []string
    
    // Обязательные модули
    for _, module := range r.modules {
        if module.Required() {
            availableModules = append(availableModules, module.Name())
        }
    }
    
    // Модули из подписки
    for _, moduleName := range subscription.Modules {
        if _, exists := r.modules[moduleName]; exists {
            availableModules = append(availableModules, moduleName)
        }
    }
    
    return availableModules, nil
}
```

---

## 🎨 Module Registry (Frontend)

### TypeScript реализация
```typescript
// lib/module-registry.ts
interface ModuleConfig {
  name: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  required: boolean;
  permissions: string[];
  routes: RouteConfig[];
  dependencies?: string[];
  icon?: React.ComponentType;
  description?: string;
}

class FrontendModuleRegistry {
  private modules = new Map<string, ModuleConfig>();
  private loadedModules = new Set<string>();
  private loadingPromises = new Map<string, Promise<void>>();

  register(config: ModuleConfig) {
    this.modules.set(config.name, config);
  }

  getAvailableModules(userPermissions: string[], subscriptionModules: string[]): ModuleConfig[] {
    return Array.from(this.modules.values()).filter(module => 
      module.required || 
      (this.hasPermissions(module.permissions, userPermissions) && 
       subscriptionModules.includes(module.name))
    );
  }

  async loadModule(moduleName: string): Promise<void> {
    if (this.loadedModules.has(moduleName)) {
      return;
    }

    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    const module = this.modules.get(moduleName);
    if (!module) {
      throw new Error(`Module ${moduleName} not found`);
    }

    const loadPromise = this.doLoadModule(module);
    this.loadingPromises.set(moduleName, loadPromise);

    try {
      await loadPromise;
      this.loadedModules.add(moduleName);
    } finally {
      this.loadingPromises.delete(moduleName);
    }
  }

  private async doLoadModule(module: ModuleConfig): Promise<void> {
    // Загрузка зависимостей
    if (module.dependencies) {
      await Promise.all(
        module.dependencies.map(dep => this.loadModule(dep))
      );
    }

    // Предзагрузка компонента
    await module.component;
  }

  private hasPermissions(required: string[], userPermissions: string[]): boolean {
    return required.every(permission => userPermissions.includes(permission));
  }
}

export const frontendModuleRegistry = new FrontendModuleRegistry();
```

---

## 🚀 Пример использования

### Backend инициализация
```go
// cmd/server/main.go
func main() {
    // Инициализация
    config := config.Load()
    db := database.New(config.Database)
    router := gin.New()
    
    // Registry модулей
    registry := registry.NewModuleRegistry(router, db, config)
    
    // Регистрация модулей
    registry.RegisterModule(&modules.AuthModule{})
    registry.RegisterModule(&modules.UsersModule{})
    registry.RegisterModule(&modules.ProjectsModule{})
    registry.RegisterModule(&modules.EstimatesModule{})
    registry.RegisterModule(&modules.DrawingsModule{})
    registry.RegisterModule(&modules.FinanceModule{})
    registry.RegisterModule(&modules.CRMModule{})
    
    // Middleware
    router.Use(middleware.CORS())
    router.Use(middleware.Logger())
    router.Use(middleware.Recovery())
    
    // Для каждой компании инициализируем свои модули
    router.Use(func(c *gin.Context) {
        companyID := c.GetString("company_id")
        subscription, _ := getSubscription(companyID)
        registry.InitializeModules(subscription)
        c.Next()
    })
    
    // Запуск
    router.Run(":8080")
}
```

### Frontend инициализация
```typescript
// App.tsx
export function App() {
  const { user, subscription } = useAuthStore();
  
  useEffect(() => {
    // Регистрация модулей
    frontendModuleRegistry.register(CoreModule);
    frontendModuleRegistry.register(ProjectsModule);
    frontendModuleRegistry.register(EstimatesModule);
    frontendModuleRegistry.register(DrawingsModule);
    frontendModuleRegistry.register(FinanceModule);
    frontendModuleRegistry.register(CRMModule);
    frontendModuleRegistry.register(AIModule);
  }, []);

  const availableModules = useMemo(() => {
    if (!user || !subscription) return [];
    return frontendModuleRegistry.getAvailableModules(
      user.permissions,
      subscription.modules
    );
  }, [user, subscription]);

  return (
    <Router>
      <Routes>
        {availableModules.map(module => 
          module.routes.map(route => (
            <Route
              key={`${module.name}-${route.path}`}
              path={route.path}
              element={
                <ModuleGuard module={module.name}>
                  <Suspense fallback={<Loading />}>
                    {React.createElement(module.component, route.props)}
                  </Suspense>
                </ModuleGuard>
              }
            />
          ))
        )}
      </Routes>
    </Router>
  );
}
```

---

## 📊 Преимущества архитектуры

### 🎯 Для бизнеса
- **Гибкие тарифы** - настройка функционала под бюджет клиента
- **Масштабируемость** - легкое добавление новых модулей
- **Монетизация** - плата за конкретные функции

### 👨‍💻 Для разработчиков
- **Изоляция** - модули независимы
- **Тестирование** - модульное тестирование
- **Поддержка** - легкое внесение изменений

### 👥 Для пользователей
- **Персонализация** - настройка под нужды компании
- **Производительность** - загружаются только нужные модули
- **Простой интерфейс** - нет лишних функций

---

**🎯 Результат**: Полностью модульная система с гибкой системой подписок, готовая к масштабированию и монетизации.
