package project

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

// TestSetup структура для настройки тестов
type ProjectTestSetup struct {
	db          *gorm.DB
	handler     *ProjectHandler
	teamHandler *TeamHandler
	config      *config.Config
}

// SetupProjectTest настройка тестовой среды для проектов
func SetupProjectTest() *ProjectTestSetup {
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

	// Создаем обработчики
	projectHandler := NewProjectHandler(db)
	teamHandler := NewTeamHandler(db)

	return &ProjectTestSetup{
		db:          db,
		handler:     projectHandler,
		teamHandler: teamHandler,
		config:      cfg,
	}
}

// TestCreateProjectSuccess тест успешного создания проекта
func TestCreateProjectSuccess(t *testing.T) {
	setup := SetupProjectTest()

	// Создаем тестовую компанию
	company := models.Company{
		ID:      "550e8400-e29b-41d4-a716-446655440000", // Proper UUID format
		Name:    "Test Company",
		Address: "Test Address",
	}
	setup.db.Create(&company)

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "550e8400-e29b-41d4-a716-446655440001", // Proper UUID format
		Email:     "test@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&user)

	// Создаем Gin контекст с пользователем в контексте
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)

	// Устанавливаем данные запроса с proper JSON binding
	var req CreateProjectRequest
	req.CompanyID = company.ID
	req.Name = "Test Project"
	req.Address = "Test Project Address"
	req.ContractNumber = "TEST-001"
	req.ContractDate = "2024-01-01"
	req.Description = stringPtr("Test Description")
	req.Status = models.StatusDraft

	// Properly bind the request JSON
	jsonData, _ := json.Marshal(req)
	c.Request, _ = http.NewRequest("POST", "/projects", bytes.NewBuffer(jsonData))
	c.Request.Header.Set("Content-Type", "application/json")

	// Выполняем тест
	setup.handler.CreateProject(c)

	// Проверяем результаты
	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	// Проверяем, что проект создался в базе
	var project models.Project
	if err := setup.db.Where("contract_number = ?", "TEST-001").First(&project).Error; err != nil {
		t.Errorf("Project was not created in database: %v", err)
	}

	if project.Name != "Test Project" {
		t.Errorf("Project name mismatch: expected Test Project, got %s", project.Name)
	}
}

// TestCreateProjectInvalidRequest тест создания проекта с неверными данными
func TestCreateProjectInvalidRequest(t *testing.T) {
	setup := SetupProjectTest()

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "user-123",
		Email:     "test@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: "company-123",
		IsActive:  true,
	}
	setup.db.Create(&user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)

	// Неверный JSON в запросе
	c.Request, _ = http.NewRequest("POST", "/projects", nil)
	c.Request.Header.Set("Content-Type", "application/json")

	setup.handler.CreateProject(c)

	// Проверяем результаты
	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	if !containsString(w.Body.String(), `"error":"Invalid request data"`) {
		t.Errorf("Expected validation error, got: %s", w.Body.String())
	}
}

// TestCreateProjectInvalidContractDate тест создания проекта с неверной датой
func TestCreateProjectInvalidContractDate(t *testing.T) {
	setup := SetupProjectTest()

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
		Email:     "test@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)

	// Неверная дата
	var req CreateProjectRequest
	req.CompanyID = company.ID
	req.Name = "Test Project"
	req.Address = "Test Project Address"
	req.ContractNumber = "TEST-001"
	req.ContractDate = "invalid-date"
	req.Status = models.StatusDraft

	setup.handler.CreateProject(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	if !containsString(w.Body.String(), `"error":"Invalid contract date format"`) {
		t.Errorf("Expected date validation error, got: %s", w.Body.String())
	}
}

// TestGetProjectSuccess тест успешного получения проекта
func TestGetProjectSuccess(t *testing.T) {
	setup := SetupProjectTest()

	// Создаем тестовую компанию и проект
	company := models.Company{
		ID:      "company-123",
		Name:    "Test Company",
		Address: "Test Address",
	}
	setup.db.Create(&company)

	project := models.Project{
		ID:             "project-123",
		CompanyID:      company.ID,
		Name:           "Test Project",
		Address:        "Test Project Address",
		ContractNumber: "TEST-001",
		ContractDate:   time.Now(),
		Status:         models.StatusDraft,
	}
	setup.db.Create(&project)

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "user-123",
		Email:     "test@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)
	c.Params = gin.Params{{Key: "id", Value: project.ID}}

	setup.handler.GetProject(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	if !containsString(w.Body.String(), `"name":"Test Project"`) {
		t.Errorf("Expected project name in response, got: %s", w.Body.String())
	}
}

// TestGetProjectNotFound тест получения несуществующего проекта
func TestGetProjectNotFound(t *testing.T) {
	setup := SetupProjectTest()

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "user-123",
		Email:     "test@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: "company-123",
		IsActive:  true,
	}
	setup.db.Create(&user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)
	c.Params = gin.Params{{Key: "id", Value: "nonexistent-project"}}

	setup.handler.GetProject(c)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
	}

	if !containsString(w.Body.String(), `"error":"Project not found"`) {
		t.Errorf("Expected not found error, got: %s", w.Body.String())
	}
}

// TestUpdateProjectSuccess тест успешного обновления проекта
func TestUpdateProjectSuccess(t *testing.T) {
	setup := SetupProjectTest()

	// Создаем тестовую компанию и проект
	company := models.Company{
		ID:      "550e8400-e29b-41d4-a716-446655440000", // Proper UUID format
		Name:    "Test Company",
		Address: "Test Address",
	}
	setup.db.Create(&company)

	project := models.Project{
		ID:             "550e8400-e29b-41d4-a716-446655440002", // Proper UUID format
		CompanyID:      company.ID,
		Name:           "Old Project Name",
		Address:        "Old Address",
		ContractNumber: "TEST-001",
		ContractDate:   time.Now(),
		Status:         models.StatusDraft,
	}
	setup.db.Create(&project)

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "550e8400-e29b-41d4-a716-446655440001", // Proper UUID format
		Email:     "test@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)
	c.Params = gin.Params{{Key: "id", Value: project.ID}}

	// Данные для обновления с proper JSON binding
	var req UpdateProjectRequest
	newName := "Updated Project Name"
	req.Name = &newName

	// Properly bind the request JSON
	jsonData, _ := json.Marshal(req)
	c.Request, _ = http.NewRequest("PUT", "/projects/"+project.ID, bytes.NewBuffer(jsonData))
	c.Request.Header.Set("Content-Type", "application/json")

	setup.handler.UpdateProject(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	// Проверяем, что проект обновился в базе
	var updatedProject models.Project
	setup.db.Where("id = ?", project.ID).First(&updatedProject)
	if updatedProject.Name != "Updated Project Name" {
		t.Errorf("Project name not updated: expected Updated Project Name, got %s", updatedProject.Name)
	}
}

// TestDeleteProjectSuccess тест успешного удаления проекта
func TestDeleteProjectSuccess(t *testing.T) {
	setup := SetupProjectTest()

	// Создаем тестовую компанию и проект
	company := models.Company{
		ID:      "company-123",
		Name:    "Test Company",
		Address: "Test Address",
	}
	setup.db.Create(&company)

	project := models.Project{
		ID:             "project-123",
		CompanyID:      company.ID,
		Name:           "Test Project",
		Address:        "Test Project Address",
		ContractNumber: "TEST-001",
		ContractDate:   time.Now(),
		Status:         models.StatusDraft,
	}
	setup.db.Create(&project)

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "user-123",
		Email:     "test@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&user)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)
	c.Params = gin.Params{{Key: "id", Value: project.ID}}

	setup.handler.DeleteProject(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	// Проверяем soft delete
	var deletedProject models.Project
	err := setup.db.Unscoped().Where("id = ?", project.ID).First(&deletedProject).Error
	if err != nil {
		t.Errorf("Project should still exist as soft deleted: %v", err)
	}
	if deletedProject.DeletedAt.Time.IsZero() {
		t.Errorf("Project should be soft deleted")
	}
}

// TestListProjectsWithPagination тест получения списка проектов с пагинацией
func TestListProjectsWithPagination(t *testing.T) {
	setup := SetupProjectTest()

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
		Email:     "test@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&user)

	// Создаем несколько проектов
	for i := 1; i <= 5; i++ {
		project := models.Project{
			ID:             "project-" + string(rune('0'+i)),
			CompanyID:      company.ID,
			Name:           "Test Project " + string(rune('0'+i)),
			Address:        "Test Address " + string(rune('0'+i)),
			ContractNumber: "TEST-" + string(rune('0'+i)),
			ContractDate:   time.Now(),
			Status:         models.StatusDraft,
		}
		setup.db.Create(&project)
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)
	c.Request, _ = http.NewRequest("GET", "/projects?page=1&limit=3", nil)

	setup.handler.ListProjects(c)

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

func stringPtr(s string) *string {
	return &s
}

// Benchmark для производительности тестов
func BenchmarkCreateProject(b *testing.B) {
	setup := SetupProjectTest()

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
		Email:     "test@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&user)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("user_id", user.ID)

		var req CreateProjectRequest
		req.CompanyID = company.ID
		req.Name = "Test Project"
		req.Address = "Test Project Address"
		req.ContractNumber = "TEST-BENCHMARK"
		req.ContractDate = "2024-01-01"
		req.Status = models.StatusDraft

		setup.handler.CreateProject(c)
	}
}

// ===== Team Handler Tests =====

// TestGetProjectTeamSuccess тест успешного получения команды проекта
func TestGetProjectTeamSuccess(t *testing.T) {
	setup := SetupProjectTest()

	// Создаем тестовую компанию и проект
	company := models.Company{
		ID:      "company-123",
		Name:    "Test Company",
		Address: "Test Address",
	}
	setup.db.Create(&company)

	project := models.Project{
		ID:             "project-123",
		CompanyID:      company.ID,
		Name:           "Test Project",
		Address:        "Test Project Address",
		ContractNumber: "TEST-001",
		ContractDate:   time.Now(),
		Status:         models.StatusDraft,
	}
	setup.db.Create(&project)

	// Создаем тестового пользователя
	hashedPassword, _ := models.HashPassword("TestPassword123")
	user := models.User{
		ID:        "user-123",
		Email:     "test@example.com",
		Name:      "Test User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&user)

	// Создаем члена команды
	teamMember := models.ProjectMember{
		ProjectID: project.ID,
		UserID:    user.ID,
		Role:      "Engineer",
	}
	setup.db.Create(&teamMember)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", user.ID)
	c.Params = gin.Params{{Key: "id", Value: project.ID}}

	setup.teamHandler.GetProjectTeam(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	if !containsString(w.Body.String(), `"count":1`) {
		t.Errorf("Expected team member count, got: %s", w.Body.String())
	}
}

// TestAddTeamMemberSuccess тест успешного добавления участника команды
func TestAddTeamMemberSuccess(t *testing.T) {
	setup := SetupProjectTest()

	// Создаем тестовую компанию и проект
	company := models.Company{
		ID:      "company-123",
		Name:    "Test Company",
		Address: "Test Address",
	}
	setup.db.Create(&company)

	project := models.Project{
		ID:             "project-123",
		CompanyID:      company.ID,
		Name:           "Test Project",
		Address:        "Test Project Address",
		ContractNumber: "TEST-001",
		ContractDate:   time.Now(),
		Status:         models.StatusDraft,
	}
	setup.db.Create(&project)

	// Создаем тестового менеджера
	hashedPassword, _ := models.HashPassword("TestPassword123")
	manager := models.User{
		ID:        "manager-123",
		Email:     "manager@example.com",
		Name:      "Manager User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&manager)

	// Создаем пользователя для добавления в команду
	newMember := models.User{
		ID:        "new-member-123",
		Email:     "member@example.com",
		Name:      "New Team Member",
		Password:  hashedPassword,
		Role:      models.RoleUser,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&newMember)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", manager.ID)
	c.Params = gin.Params{{Key: "id", Value: project.ID}}

	var req AddTeamMemberRequest
	req.UserID = newMember.ID
	req.Role = "Engineer"

	setup.teamHandler.AddTeamMember(c)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	// Проверяем, что участник добавился в команду
	var teamMember models.ProjectMember
	if err := setup.db.Where("project_id = ? AND user_id = ?", project.ID, newMember.ID).First(&teamMember).Error; err != nil {
		t.Errorf("Team member was not added to project: %v", err)
	}
}

// TestUpdateMemberRoleSuccess тест успешного обновления роли участника
func TestUpdateMemberRoleSuccess(t *testing.T) {
	setup := SetupProjectTest()

	// Создаем тестовую компанию и проект
	company := models.Company{
		ID:      "company-123",
		Name:    "Test Company",
		Address: "Test Address",
	}
	setup.db.Create(&company)

	project := models.Project{
		ID:             "project-123",
		CompanyID:      company.ID,
		Name:           "Test Project",
		Address:        "Test Project Address",
		ContractNumber: "TEST-001",
		ContractDate:   time.Now(),
		Status:         models.StatusDraft,
	}
	setup.db.Create(&project)

	// Создаем тестового менеджера
	hashedPassword, _ := models.HashPassword("TestPassword123")
	manager := models.User{
		ID:        "manager-123",
		Email:     "manager@example.com",
		Name:      "Manager User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&manager)

	// Создаем участника команды
	teamMember := models.ProjectMember{
		ProjectID: project.ID,
		UserID:    manager.ID,
		Role:      "Engineer",
	}
	setup.db.Create(&teamMember)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", manager.ID)
	c.Params = gin.Params{
		{Key: "id", Value: project.ID},
		{Key: "user_id", Value: manager.ID},
	}

	var req UpdateMemberRoleRequest
	req.Role = "Lead Engineer"

	setup.teamHandler.UpdateMemberRole(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	// Проверяем, что роль обновилась
	var updatedMember models.ProjectMember
	setup.db.Where("project_id = ? AND user_id = ?", project.ID, manager.ID).First(&updatedMember)
	if updatedMember.Role != "Lead Engineer" {
		t.Errorf("Role not updated: expected Lead Engineer, got %s", updatedMember.Role)
	}
}

// TestRemoveTeamMemberSuccess тест успешного удаления участника из команды
func TestRemoveTeamMemberSuccess(t *testing.T) {
	setup := SetupProjectTest()

	// Создаем тестовую компанию и проект
	company := models.Company{
		ID:      "company-123",
		Name:    "Test Company",
		Address: "Test Address",
	}
	setup.db.Create(&company)

	project := models.Project{
		ID:             "project-123",
		CompanyID:      company.ID,
		Name:           "Test Project",
		Address:        "Test Project Address",
		ContractNumber: "TEST-001",
		ContractDate:   time.Now(),
		Status:         models.StatusDraft,
	}
	setup.db.Create(&project)

	// Создаем тестового менеджера
	hashedPassword, _ := models.HashPassword("TestPassword123")
	manager := models.User{
		ID:        "manager-123",
		Email:     "manager@example.com",
		Name:      "Manager User",
		Password:  hashedPassword,
		Role:      models.RoleManager,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&manager)

	// Создаем участника команды для удаления
	memberToRemove := models.User{
		ID:        "member-123",
		Email:     "member@example.com",
		Name:      "Member to Remove",
		Password:  hashedPassword,
		Role:      models.RoleUser,
		CompanyID: company.ID,
		IsActive:  true,
	}
	setup.db.Create(&memberToRemove)

	// Создаем запись команды
	teamMember := models.ProjectMember{
		ProjectID: project.ID,
		UserID:    memberToRemove.ID,
		Role:      "Engineer",
	}
	setup.db.Create(&teamMember)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", manager.ID)
	c.Params = gin.Params{
		{Key: "id", Value: project.ID},
		{Key: "user_id", Value: memberToRemove.ID},
	}

	setup.teamHandler.RemoveTeamMember(c)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	if !containsString(w.Body.String(), `"success":true`) {
		t.Errorf("Expected success response, got: %s", w.Body.String())
	}

	// Проверяем, что участник удален из команды
	var deletedMember models.ProjectMember
	err := setup.db.Where("project_id = ? AND user_id = ?", project.ID, memberToRemove.ID).First(&deletedMember).Error
	if err != gorm.ErrRecordNotFound {
		t.Errorf("Team member should be removed: %v", err)
	}
}
