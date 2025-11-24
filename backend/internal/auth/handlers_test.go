package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"stroy-control-backend/internal/config"
	"stroy-control-backend/internal/models"
)

// TestSetup структура для настройки тестов
type TestSetup struct {
	db     *gorm.DB
	auth   *AuthHandler
	config *config.Config
}

// SetupTest настройка тестовой среды
func SetupTest() *TestSetup {
	// Создаем in-memory базу данных для тестов
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	// Мигрируем модели
	db.AutoMigrate(&models.User{})

	// Создаем тестовую конфигурацию
	cfg := &config.Config{
		Server: config.ServerConfig{
			Port:         8080,
			ReadTimeout:  10 * time.Second,
			WriteTimeout: 10 * time.Second,
		},
		Database: config.DatabaseConfig{
			Host:     "localhost",
			Port:     5432,
			User:     "test_user",
			Password: "test_password",
			DBName:   "test_db",
			SSLMode:  "disable",
		},
		JWT: config.JWTConfig{
			Secret:           "test-jwt-secret",
			AccessTokenTTL:   15 * time.Minute,
			RefreshTokenTTL:  7 * 24 * time.Hour,
			Issuer:           "test-issuer",
		},
		Redis: config.RedisConfig{
			Host: "localhost",
			Port: 6379,
		},
	}

	// Создаем JWT сервис
	jwtService := NewJWTService(cfg)

	// Создаем auth handler
	authHandler := NewAuthHandler(db, jwtService)

	return &TestSetup{
		db:     db,
		auth:   authHandler,
		config: cfg,
	}
}

// TestLoginSuccess тест успешной аутентификации
func TestLoginSuccess(t *testing.T) {
	setup := SetupTest()
	defer setup.db.Close()

	// Создаем тестового пользователя
	hashedPassword, err := models.HashPassword("TestPassword123")
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	user := models.User{
		Email:    "test@example.com",
		Name:     "Test User",
		Password: hashedPassword,
		Role:     models.RoleUser,
		IsActive: true,
	}

	if err := setup.db.Create(&user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Создаем тестовый запрос
	reqBody := `{"email":"test@example.com","password":"TestPassword123"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", nil)
	req.Header.Set("Content-Type", "application/json")
	req.Body = http.NoBody // Mocking - в реальном тесте нужно использовать http.Request.Body

	// Создаем Gin контекст для тестирования
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	// Устанавливаем JSON данные в контекст
	var loginReq LoginRequest
	if err := c.ShouldBindJSON(&loginReq); err != nil {
		t.Errorf("ShouldBindJSON failed: %v", err)
	}

	// Устанавливаем правильные данные
	loginReq.Email = "test@example.com"
	loginReq.Password = "TestPassword123"

	// Выполняем тест
	setup.auth.Login(c)

	// Проверяем результаты
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if !Contains(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}
}

// TestLoginInvalidCredentials тест аутентификации с неверными данными
func TestLoginInvalidCredentials(t *testing.T) {
	setup := SetupTest()
	defer setup.db.Close()

	// Создаем тестового пользователя
	hashedPassword, err := models.HashPassword("CorrectPassword123")
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	user := models.User{
		Email:    "test@example.com",
		Name:     "Test User",
		Password: hashedPassword,
		Role:     models.RoleUser,
		IsActive: true,
	}

	if err := setup.db.Create(&user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Создаем тестовый запрос с неверным паролем
	reqBody := `{"email":"test@example.com","password":"WrongPassword123"}`
	req, _ := http.NewRequest("POST", "/api/v1/auth/login", nil)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	var loginReq LoginRequest
	loginReq.Email = "test@example.com"
	loginReq.Password = "WrongPassword123"

	setup.auth.Login(c)

	// Проверяем результаты
	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}

	if !Contains(w.Body.String(), `"error":"Invalid email or password"`) {
		t.Errorf("Expected invalid credentials error, got: %s", w.Body.String())
	}
}

// TestRegisterSuccess тест успешной регистрации
func TestRegisterSuccess(t *testing.T) {
	setup := SetupTest()
	defer setup.db.Close()

	// Создаем тестовый запрос регистрации
	reqBody := `{
		"email":"newuser@example.com",
		"name":"New User",
		"password":"NewPassword123",
		"role":"user"
	}`

	req, _ := http.NewRequest("POST", "/api/v1/auth/register", nil)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	var registerReq RegisterRequest
	registerReq.Email = "newuser@example.com"
	registerReq.Name = "New User"
	registerReq.Password = "NewPassword123"
	registerReq.Role = models.RoleUser

	setup.auth.Register(c)

	// Проверяем результаты
	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	if !Contains(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	// Проверяем, что пользователь создался в базе
	var user models.User
	if err := setup.db.Where("email = ?", "newuser@example.com").First(&user).Error; err != nil {
		t.Errorf("User was not created in database: %v", err)
	}

	if user.Email != "newuser@example.com" {
		t.Errorf("User email mismatch: expected newuser@example.com, got %s", user.Email)
	}
}

// TestRegisterInvalidEmail тест регистрации с неверным email
func TestRegisterInvalidEmail(t *testing.T) {
	setup := SetupTest()
	defer setup.db.Close()

	// Создаем тестовый запрос с неверным email
	reqBody := `{
		"email":"invalid-email",
		"name":"New User",
		"password":"NewPassword123",
		"role":"user"
	}`

	req, _ := http.NewRequest("POST", "/api/v1/auth/register", nil)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	var registerReq RegisterRequest
	registerReq.Email = "invalid-email"
	registerReq.Name = "New User"
	registerReq.Password = "NewPassword123"
	registerReq.Role = models.RoleUser

	setup.auth.Register(c)

	// Проверяем результаты
	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	if !Contains(w.Body.String(), `"error":"Invalid request data"`) {
		t.Errorf("Expected validation error, got: %s", w.Body.String())
	}
}

// TestRegisterWeakPassword тест регистрации со слабым паролем
func TestRegisterWeakPassword(t *testing.T) {
	setup := SetupTest()
	defer setup.db.Close()

	// Создаем тестовый запрос со слабым паролем
	reqBody := `{
		"email":"test@example.com",
		"name":"New User",
		"password":"weak",
		"role":"user"
	}`

	req, _ := http.NewRequest("POST", "/api/v1/auth/register", nil)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	var registerReq RegisterRequest
	registerReq.Email = "test@example.com"
	registerReq.Name = "New User"
	registerReq.Password = "weak"
	registerReq.Role = models.RoleUser

	setup.auth.Register(c)

	// Проверяем результаты
	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	if !Contains(w.Body.String(), `"error":"Password does not meet security requirements"`) {
		t.Errorf("Expected password validation error, got: %s", w.Body.String())
	}
}

// Helper функция для проверки содержимого строки
func Contains(str, substr string) bool {
	return len(str) >= len(substr) && (len(substr) == 0 || str != "" && substr != "" && len(str) >= len(substr) && 
		(str == substr || len(str) > len(substr) && (str[:len(substr)] == substr || str[len(str)-len(substr):] == substr || 
		containsInMiddle(str, substr))))
}

func containsInMiddle(str, substr string) bool {
	for i := 0; i <= len(str)-len(substr); i++ {
		if str[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Benchmark для производительности тестов
func BenchmarkLogin(b *testing.B) {
	setup := SetupTest()
	defer setup.db.Close()

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		Email:    "test@example.com",
		Name:     "Test User",
		Password: hashedPassword,
		Role:     models.RoleUser,
		IsActive: true,
	}
	setup.db.Create(&user)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		var loginReq LoginRequest
		loginReq.Email = "test@example.com"
		loginReq.Password = "TestPassword123"

		setup.auth.Login(c)
	}
}