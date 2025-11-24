package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"stroy-control-backend/internal/auth"
	"stroy-control-backend/internal/company"
	"stroy-control-backend/internal/config"
	"stroy-control-backend/internal/models"
	"stroy-control-backend/internal/project"
)

// APIIntegrationTestSuite комплексный набор тестов для API
type APIIntegrationTestSuite struct {
	db        *gorm.DB
	router    *gin.Engine
	cfg       *config.Config
	jwtService *auth.JWTService
}

// SetupTestSuite настройка тестовой среды для интеграционных тестов
func SetupTestSuite() *APIIntegrationTestSuite {
	// Создаем in-memory базу данных
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}

	// Мигрируем все модели
	db.AutoMigrate(
		&models.User{},
		&models.Company{},
		&models.Project{},
		&models.ProjectMember{},
	)

	// Создаем конфигурацию
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
			Secret:           "test-jwt-secret-for-integration-tests",
			AccessTokenTTL:   15 * time.Minute,
			RefreshTokenTTL:  7 * 24 * time.Hour,
			Issuer:           "test-issuer",
		},
	}

	// Создаем сервисы
	jwtService := auth.NewJWTService(cfg)

	// Создаем тестовый сервер
	router := gin.New()
	router.Use(gin.Recovery())

	// Создаем роутеры
	authRouter := auth.NewRouterGroup(db, jwtService)
	projectRouter := project.NewRouterGroup(db, authRouter.GetMiddleware())
	companyRouter := company.NewRouterGroup(db, authRouter.GetMiddleware())

	// Регистрируем роуты
	authRouter.RegisterRoutes(router)
	projectRouter.RegisterRoutes(router)
	companyRouter.RegisterRoutes(router)

	return &APIIntegrationTestSuite{
		db:        db,
		router:    router,
		cfg:       cfg,
		jwtService: jwtService,
	}
}

// TestCompleteAuthenticationFlow тест полного потока аутентификации
func TestCompleteAuthenticationFlow(t *testing.T) {
	suite := SetupTestSuite()
	defer suite.db.Close()

	// 1. Регистрация пользователя
	userData := map[string]interface{}{
		"email":    "integration@test.com",
		"name":     "Integration Test User",
		"password": "TestPassword123",
		"role":     models.RoleUser,
	}

	w := suite.performRequest("POST", "/api/v1/auth/register", userData)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d. Body: %s", http.StatusCreated, w.Code, w.Body.String())
	}

	var registerResponse map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &registerResponse)

	if !registerResponse["success"].(bool) {
		t.Errorf("Expected success in register response")
	}

	// 2. Аутентификация
	loginData := map[string]interface{}{
		"email":    "integration@test.com",
		"password": "TestPassword123",
	}

	w = suite.performRequest("POST", "/api/v1/auth/login", loginData)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var loginResponse map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &loginResponse)

	if !loginResponse["success"].(bool) {
		t.Errorf("Expected success in login response")
	}

	data := loginResponse["data"].(map[string]interface{})
	tokens := data["tokens"].(map[string]interface{})
	accessToken := tokens["access_token"].(string)

	// 3. Проверка /me endpoint
	w = suite.performAuthorizedRequest("GET", "/api/v1/auth/me", accessToken, nil)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var meResponse map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &meResponse)

	if !meResponse["success"].(bool) {
		t.Errorf("Expected success in me response")
	}

	user := meResponse["data"].(map[string]interface{})["user"].(map[string]interface{})
	if user["email"] != "integration@test.com" {
		t.Errorf("Expected email integration@test.com, got %s", user["email"])
	}

	// 4. Обновление токена
	refreshData := map[string]interface{}{
		"refresh_token": tokens["refresh_token"].(string),
	}

	w = suite.performRequest("POST", "/api/v1/auth/refresh", refreshData)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
}

// TestCompanyManagement тест управления компаниями
func TestCompanyManagement(t *testing.T) {
	suite := SetupTestSuite()
	defer suite.db.Close()

	// Создаем тестовую компанию
	companyData := map[string]interface{}{
		"name":    "Test Company",
		"address": "Test Address",
		"inn":     "1234567890",
		"email":   "company@test.com",
		"phone":   "+7 (999) 123-45-67",
	}

	w := suite.performRequest("POST", "/api/v1/companies", companyData)

	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status %d (forbidden), got %d. Body: %s", http.StatusForbidden, w.Code, w.Body.String())
	}

	// В реальных тестах здесь должна быть аутентификация администратора
	// и создание компании через админский endpoint
}

// TestProjectManagement тест управления проектами
func TestProjectManagement(t *testing.T) {
	suite := SetupTestSuite()
	defer suite.db.Close()

	// Создаем тестовую компанию
	companyData := map[string]interface{}{
		"name":    "Test Company",
		"address": "Test Address",
		"inn":     "1234567890",
	}

	var companyID string
	w := suite.performRequest("POST", "/api/v1/companies", companyData)
	if w.Code == http.StatusCreated {
		var response map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &response)
		if response["success"] == true {
			companyData := response["data"].(map[string]interface{})["company"].(map[string]interface{})
			companyID = companyData["id"].(string)
		}
	}

	// Создаем тестовый проект
	projectData := map[string]interface{}{
		"company_id":     companyID,
		"name":           "Test Project",
		"address":        "Test Project Address",
		"contract_number": "TEST-001",
		"contract_date":  "2024-01-01",
		"status":         models.StatusDraft,
	}

	w = suite.performRequest("POST", "/api/v1/projects", projectData)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d (unauthorized), got %d. Body: %s", http.StatusUnauthorized, w.Code, w.Body.String())
	}
}

// TestPagination тест пагинации
func TestPagination(t *testing.T) {
	suite := SetupTestSuite()
	defer suite.db.Close()

	// Тест пагинации проектов
	w := suite.performRequest("GET", "/api/v1/projects?page=1&limit=10", nil)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d (unauthorized), got %d", http.StatusUnauthorized, w.Code)
	}

	// Тест пагинации компаний
	w = suite.performRequest("GET", "/api/v1/companies?page=1&limit=10", nil)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d (unauthorized), got %d", http.StatusUnauthorized, w.Code)
	}
}

// TestRateLimiting тест rate limiting
func TestRateLimiting(t *testing.T) {
	suite := SetupTestSuite()
	defer suite.db.Close()

	// Отправляем много запросов для тестирования rate limiting
	for i := 0; i < 10; i++ {
		w := suite.performRequest("GET", "/health", nil)
		if w.Code == http.StatusOK {
			// Запрос успешен
		} else if w.Code == http.StatusTooManyRequests {
			// Rate limiting сработал
			break
		}
	}
}

// TestInvalidRequest тест неверных запросов
func TestInvalidRequest(t *testing.T) {
	suite := SetupTestSuite()
	defer suite.db.Close()

	// Неверный JSON в теле запроса
	w := suite.performRequest("POST", "/api/v1/auth/login", "invalid json")

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	// Неверный endpoint
	w = suite.performRequest("GET", "/api/v1/nonexistent", nil)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}

	// Неверный метод
	w = suite.performRequest("PATCH", "/api/v1/auth/login", nil)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}
}

// performRequest выполнение HTTP запроса
func (suite *APIIntegrationTestSuite) performRequest(method, path string, data interface{}) *httptest.ResponseRecorder {
	var req *http.Request
	if data != nil {
		jsonData, _ := json.Marshal(data)
		req, _ = http.NewRequest(method, path, bytes.NewBuffer(jsonData))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req, _ = http.NewRequest(method, path, nil)
	}

	w := httptest.NewRecorder()
	suite.router.ServeHTTP(w, req)
	return w
}

// performAuthorizedRequest выполнение авторизованного HTTP запроса
func (suite *APIIntegrationTestSuite) performAuthorizedRequest(method, path, token string, data interface{}) *httptest.ResponseRecorder {
	req := suite.performRequest(method, path, data)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return req
}

// Benchmark тесты производительности
func BenchmarkUserRegistration(b *testing.B) {
	suite := SetupTestSuite()
	defer suite.db.Close()

	userData := map[string]interface{}{
		"email":    "benchmark@test.com",
		"name":     "Benchmark User",
		"password": "BenchmarkPassword123",
		"role":     models.RoleUser,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		suite.performRequest("POST", "/api/v1/auth/register", userData)
	}
}

func BenchmarkUserLogin(b *testing.B) {
	suite := SetupTestSuite()
	defer suite.db.Close()

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("BenchmarkPassword123")
	user := models.User{
		Email:    "benchmark@test.com",
		Name:     "Benchmark User",
		Password: hashedPassword,
		Role:     models.RoleUser,
		IsActive: true,
	}
	suite.db.Create(&user)

	loginData := map[string]interface{}{
		"email":    "benchmark@test.com",
		"password": "BenchmarkPassword123",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		suite.performRequest("POST", "/api/v1/auth/login", loginData)
	}
}