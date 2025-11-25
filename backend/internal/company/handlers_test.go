package company

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"stroy-control-backend/internal/config"
	"stroy-control-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// CompanyTestSetup структура для настройки тестов
type CompanyTestSetup struct {
	db      *gorm.DB
	handler *CompanyHandler
	config  *config.Config
}

// SetupCompanyTest настройка тестовой среды для компаний
func SetupCompanyTest() *CompanyTestSetup {
	// Создаем in-memory базу данных для тестов
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
			Secret:          "test-jwt-secret",
			AccessTokenTTL:  15 * time.Minute,
			RefreshTokenTTL: 7 * 24 * time.Hour,
			Issuer:          "test-issuer",
		},
		Redis: config.RedisConfig{
			Host: "localhost",
			Port: 6379,
		},
		AI: config.AIConfig{
			GatewayURL: "https://api.openai.com/v1",
			APIKey:     "test-key",
		},
	}

	// Создаем обработчик
	companyHandler := NewCompanyHandler(db)

	return &CompanyTestSetup{
		db:      db,
		handler: companyHandler,
		config:  cfg,
	}
}

// TestCreateCompanySuccess тест успешного создания компании
func TestCreateCompanySuccess(t *testing.T) {
	setup := SetupCompanyTest()

	// Создаем тестового администратора
	hashedPassword, _ := models.HashPassword("TestPassword123")
	admin := models.User{
		ID:        "550e8400-e29b-41d4-a716-446655440001", // Proper UUID format
		Email:     "admin@example.com",
		Name:      "Admin User",
		Password:  hashedPassword,
		Role:      models.RoleAdmin,
		CompanyID: "",
		IsActive:  true,
	}
	setup.db.Create(&admin)

	// Создаем Gin контекст с пользователем в контексте
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", admin.ID)

	// Устанавливаем данные запроса с proper JSON binding
	var req CreateCompanyRequest
	req.Name = "Test Company"
	req.Address = "Test Address"
	req.INN = "1234567890"
	req.Email = "company@test.com"
	req.Phone = "+7 (999) 123-45-67"

	// Properly bind the request JSON
	jsonData, _ := json.Marshal(req)
	c.Request, _ = http.NewRequest("POST", "/companies", bytes.NewBuffer(jsonData))
	c.Request.Header.Set("Content-Type", "application/json")

	// Выполняем тест
	setup.handler.CreateCompany(c)

	// Проверяем результаты
	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	// Проверяем, что компания создалась в базе
	var company models.Company
	if err := setup.db.Where("inn = ?", "1234567890").First(&company).Error; err != nil {
		t.Errorf("Company was not created in database: %v", err)
	}

	if company.Name != "Test Company" {
		t.Errorf("Company name mismatch: expected Test Company, got %s", company.Name)
	}
}

// TestCreateCompanyForbidden тест создания компании без прав
func TestCreateCompanyForbidden(t *testing.T) {
	setup := SetupCompanyTest()

	// Создаем тестового пользователя (не админ)
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "user-123",
		Email:     "user@example.com",
		Name:      "Regular User",
		Password:  hashedPassword,
		Role:      models.RoleUser,
		CompanyID: "company-123",
		IsActive:  true,
	}
	setup.db.Create(&user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)

	// Устанавливаем данные запроса
	var req CreateCompanyRequest
	req.Name = "Test Company"
	req.Address = "Test Address"

	setup.handler.CreateCompany(c)

	// Проверяем результаты
	if w.Code != http.StatusForbidden {
		t.Errorf("Expected status %d, got %d", http.StatusForbidden, w.Code)
	}

	if !containsString(w.Body.String(), `"error":"Insufficient permissions"`) {
		t.Errorf("Expected permission error, got: %s", w.Body.String())
	}
}

// TestCreateCompanyInvalidData тест создания компании с неверными данными
func TestCreateCompanyInvalidData(t *testing.T) {
	setup := SetupCompanyTest()

	// Создаем тестового администратора
	hashedPassword, _ := models.HashPassword("TestPassword123")
	admin := models.User{
		ID:        "admin-123",
		Email:     "admin@example.com",
		Name:      "Admin User",
		Password:  hashedPassword,
		Role:      models.RoleAdmin,
		CompanyID: "",
		IsActive:  true,
	}
	setup.db.Create(&admin)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", admin.ID)

	// Неверный email
	var req CreateCompanyRequest
	req.Name = "Test Company"
	req.Email = "invalid-email"

	setup.handler.CreateCompany(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	if !containsString(w.Body.String(), `"error":"Invalid request data"`) {
		t.Errorf("Expected validation error, got: %s", w.Body.String())
	}
}

// TestCreateCompanyINNConflict тест создания компании с дублирующимся INN
func TestCreateCompanyINNConflict(t *testing.T) {
	setup := SetupCompanyTest()

	// Создаем тестового администратора
	hashedPassword, _ := models.HashPassword("TestPassword123")
	admin := models.User{
		ID:        "admin-123",
		Email:     "admin@example.com",
		Name:      "Admin User",
		Password:  hashedPassword,
		Role:      models.RoleAdmin,
		CompanyID: "",
		IsActive:  true,
	}
	setup.db.Create(&admin)

	// Создаем существующую компанию
	existingCompany := models.Company{
		ID:      "company-123",
		Name:    "Existing Company",
		INN:     "1234567890",
		Address: "Existing Address",
	}
	setup.db.Create(&existingCompany)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", admin.ID)

	// Компания с таким же INN
	var req CreateCompanyRequest
	req.Name = "New Company"
	req.INN = "1234567890"

	setup.handler.CreateCompany(c)

	if w.Code != http.StatusConflict {
		t.Errorf("Expected status %d, got %d", http.StatusConflict, w.Code)
	}

	if !containsString(w.Body.String(), `"error":"Company with this INN already exists"`) {
		t.Errorf("Expected INN conflict error, got: %s", w.Body.String())
	}
}

// TestGetCompanySuccess тест успешного получения компании
func TestGetCompanySuccess(t *testing.T) {
	setup := SetupCompanyTest()

	// Создаем тестовую компанию
	company := models.Company{
		ID:      "company-123",
		Name:    "Test Company",
		Address: "Test Address",
		INN:     "1234567890",
	}
	setup.db.Create(&company)

	// Создаем тестового пользователя из этой компании
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "user-123",
		Email:     "user@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleUser,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)
	c.Params = gin.Params{{Key: "id", Value: company.ID}}

	setup.handler.GetCompany(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	if !containsString(w.Body.String(), `"name":"Test Company"`) {
		t.Errorf("Expected company name in response, got: %s", w.Body.String())
	}
}

// TestGetCompanyNotFound тест получения несуществующей компании
func TestGetCompanyNotFound(t *testing.T) {
	setup := SetupCompanyTest()

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "user-123",
		Email:     "user@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleUser,
		CompanyID: "company-123",
		IsActive:  true,
	}
	setup.db.Create(&user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)
	c.Params = gin.Params{{Key: "id", Value: "nonexistent-company"}}

	setup.handler.GetCompany(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}

	if !containsString(w.Body.String(), `"error":"Company not found"`) {
		t.Errorf("Expected not found error, got: %s", w.Body.String())
	}
}

// TestUpdateCompanySuccess тест успешного обновления компании
func TestUpdateCompanySuccess(t *testing.T) {
	setup := SetupCompanyTest()

	// Создаем тестовую компанию
	company := models.Company{
		ID:      "company-123",
		Name:    "Old Company Name",
		Address: "Old Address",
		INN:     "1234567890",
	}
	setup.db.Create(&company)

	// Создаем тестового администратора
	hashedPassword, _ := models.HashPassword("TestPassword123")
	admin := models.User{
		ID:        "admin-123",
		Email:     "admin@example.com",
		Name:      "Admin User",
		Password:  hashedPassword,
		Role:      models.RoleAdmin,
		CompanyID: "",
		IsActive:  true,
	}
	setup.db.Create(&admin)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", admin.ID)
	c.Params = gin.Params{{Key: "id", Value: company.ID}}

	// Данные для обновления
	var req UpdateCompanyRequest
	newName := "Updated Company Name"
	req.Name = &newName

	setup.handler.UpdateCompany(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	// Проверяем, что компания обновилась в базе
	var updatedCompany models.Company
	setup.db.Where("id = ?", company.ID).First(&updatedCompany)
	if updatedCompany.Name != "Updated Company Name" {
		t.Errorf("Company name not updated: expected Updated Company Name, got %s", updatedCompany.Name)
	}
}

// TestListCompaniesWithPagination тест получения списка компаний с пагинацией
func TestListCompaniesWithPagination(t *testing.T) {
	setup := SetupCompanyTest()

	// Создаем тестового администратора
	hashedPassword, _ := models.HashPassword("TestPassword123")
	admin := models.User{
		ID:        "admin-123",
		Email:     "admin@example.com",
		Name:      "Admin User",
		Password:  hashedPassword,
		Role:      models.RoleAdmin,
		CompanyID: "",
		IsActive:  true,
	}
	setup.db.Create(&admin)

	// Создаем несколько компаний
	for i := 1; i <= 5; i++ {
		company := models.Company{
			ID:      "company-" + string(rune('0'+i)),
			Name:    "Company " + string(rune('0'+i)),
			Address: "Address " + string(rune('0'+i)),
		}
		setup.db.Create(&company)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", admin.ID)
	c.Request, _ = http.NewRequest("GET", "/companies?page=1&limit=3", nil)

	setup.handler.ListCompanies(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	// Проверяем, что возвращается пагинированный ответ
	if !containsString(w.Body.String(), `"total":5`) {
		t.Errorf("Expected total count in response, got: %s", w.Body.String())
	}

	if !containsString(w.Body.String(), `"page":1`) {
		t.Errorf("Expected page number in response, got: %s", w.Body.String())
	}
}

// TestListCompaniesNonAdmin тест получения списка компаний для обычного пользователя
func TestListCompaniesNonAdmin(t *testing.T) {
	setup := SetupCompanyTest()

	// Создаем тестовую компанию
	company := models.Company{
		ID:      "company-123",
		Name:    "Test Company",
		Address: "Test Address",
	}
	setup.db.Create(&company)

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "user-123",
		Email:     "user@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleUser,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&user)

	// Создаем еще одну компанию, которая не должна отображаться
	otherCompany := models.Company{
		ID:      "company-456",
		Name:    "Other Company",
		Address: "Other Address",
	}
	setup.db.Create(&otherCompany)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)

	setup.handler.ListCompanies(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	// Обычный пользователь должен видеть только свою компанию
	if !containsString(w.Body.String(), `"name":"Test Company"`) {
		t.Errorf("Expected own company in response, got: %s", w.Body.String())
	}

	// Должен увидеть только свою компанию
	if containsString(w.Body.String(), `"name":"Other Company"`) {
		t.Errorf("Should not see other companies, got: %s", w.Body.String())
	}
}

// Helper функция для проверки содержимого строки
func containsString(str, substr string) bool {
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
func BenchmarkCreateCompany(b *testing.B) {
	setup := SetupCompanyTest()

	// Создаем тестового администратора
	hashedPassword, _ := models.HashPassword("TestPassword123")
	admin := models.User{
		ID:        "admin-123",
		Email:     "admin@example.com",
		Name:      "Admin User",
		Password:  hashedPassword,
		Role:      models.RoleAdmin,
		CompanyID: "",
		IsActive:  true,
	}
	setup.db.Create(&admin)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", admin.ID)

		var req CreateCompanyRequest
		req.Name = "Benchmark Company"
		req.Address = "Benchmark Address"
		req.INN = "1234567890"

		setup.handler.CreateCompany(c)
	}
}
