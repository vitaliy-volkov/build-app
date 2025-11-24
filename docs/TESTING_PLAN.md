# Стратегия и план тестирования системы "Строй-Контроль"

## Обзор тестирования

Данный документ описывает комплексную стратегию тестирования для системы "Строй-Контроль", включающую все уровни тестирования от unit тестов до нагрузочного тестирования.

### Цели тестирования
- ✅ Обеспечение качества и надежности системы
- ✅ Предотвращение регрессий при разработке
- ✅ Валидация функциональных требований
- ✅ Проверка производительности и масштабируемости
- ✅ Обеспечение безопасности системы

## Уровни тестирования

### 1. Модульное тестирование (Unit Testing)

#### Фронтенд (React + TypeScript)

**Инструменты:**
- **Framework**: Jest 29+ с React Testing Library
- **Coverage**: Минимум 85%
- **Покрытие**: Компоненты, хуки, утилиты, сервисы

**Структура тестов:**
```
tests/
├── components/
│   ├── Layout.test.tsx
│   ├── AIAssistant.test.tsx
│   └── ...
├── pages/
│   ├── Auth.test.tsx
│   ├── ProjectList.test.tsx
│   └── ...
├── services/
│   ├── authService.test.ts
│   ├── projectService.test.ts
│   └── ...
├── hooks/
│   ├── useAuth.test.ts
│   └── ...
└── utils/
    ├── formatters.test.ts
    └── validators.test.ts
```

**Примеры тестов:**

```typescript
// tests/components/Layout.test.tsx
import { render, screen } from '@testing-library/react';
import { Layout } from '../../components/Layout';
import { AuthProvider } from '../../contexts/AuthContext';

jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: '1', name: 'Test User', role: 'admin' },
  }),
}));

describe('Layout', () => {
  test('renders navigation menu', () => {
    render(
      <AuthProvider>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </AuthProvider>
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('shows user menu when authenticated', () => {
    render(
      <AuthProvider>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </AuthProvider>
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });
});

// tests/services/authService.test.ts
import { authService } from '../../services/authService';
import { apiClient } from '../../services/apiClient';

jest.mock('../../services/apiClient');

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should login successfully', async () => {
    const mockResponse = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      user: { id: '1', email: 'test@example.com', name: 'Test User' }
    };

    (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await authService.login({
      email: 'test@example.com',
      password: 'password123'
    });

    expect(result).toEqual(mockResponse);
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
  });

  test('should handle login error', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    await expect(authService.login({
      email: 'test@example.com',
      password: 'wrong-password'
    })).rejects.toThrow('Invalid credentials');
  });
});
```

#### Бэкенд (Go)

**Инструменты:**
- **Framework**: Testify, Ginkgo
- **Coverage**: Минимум 80%
- **Покрытие**: Хэндлеры, сервисы, репозитории, утилиты

**Структура тестов:**
```
internal/
├── handlers/
│   ├── auth_handler_test.go
│   ├── project_handler_test.go
│   └── ...
├── services/
│   ├── auth_service_test.go
│   ├── project_service_test.go
│   └── ...
├── repository/
│   ├── user_repository_test.go
│   ├── project_repository_test.go
│   └── ...
└── utils/
    ├── validators_test.go
    └── helpers_test.go
```

**Примеры тестов:**

```go
// internal/handlers/auth_handler_test.go
package handlers

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/suite"
)

type AuthHandlerTestSuite struct {
    suite.Suite
    handler *AuthHandler
    service *mockAuthService
}

func (suite *AuthHandlerTestSuite) SetupTest() {
    suite.service = &mockAuthService{}
    suite.handler = NewAuthHandler(suite.service)
}

func (suite *AuthHandlerTestSuite) TestLogin() {
    suite.service.On("Login", "test@example.com", "password123").Return(
        &models.AuthResponse{
            AccessToken:  "token",
            RefreshToken: "refresh",
            User:         &models.User{ID: "1", Email: "test@example.com"},
        }, nil,
    )

    loginRequest := LoginRequest{
        Email:    "test@example.com",
        Password: "password123",
    }

    jsonBody, _ := json.Marshal(loginRequest)
    req := httptest.NewRequest("POST", "/auth/login", bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")

    rr := httptest.NewRecorder()
    suite.handler.Login(rr, req)

    assert.Equal(suite.T(), http.StatusOK, rr.Code)

    var response AuthResponse
    json.Unmarshal(rr.Body.Bytes(), &response)

    assert.Equal(suite.T(), "token", response.AccessToken)
    assert.Equal(suite.T(), "test@example.com", response.User.Email)
}

func TestAuthHandlerSuite(t *testing.T) {
    suite.Run(t, new(AuthHandlerTestSuite))
}
```

### 2. Интеграционное тестирование (Integration Testing)

#### API Integration Tests

```typescript
// tests/integration/auth.integration.test.ts
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../src/app';
import { createTestUser, cleanupTestData } from '../helpers/test-utils';

describe('Authentication Integration', () => {
  let testUser: any;

  beforeAll(async () => {
    testUser = await createTestUser({
      email: 'test@example.com',
      password: 'testpass123',
      role: 'user'
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  test('POST /auth/login - should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpass123'
      })
      .expect(200);

    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
    expect(response.body.user).toHaveProperty('id');
  });

  test('POST /auth/login - should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
      .expect(401);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error.message).toBe('Invalid credentials');
  });

  test('GET /auth/profile - should return user profile', async () => {
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpass123'
      });

    const token = loginResponse.body.access_token;

    const profileResponse = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(profileResponse.body).toHaveProperty('email', 'test@example.com');
  });
});
```

#### Database Integration Tests

```go
// internal/repository/user_repository_integration_test.go
package repository

import (
    "testing"
    "context"

    "github.com/stretchr/testify/suite"
    "github.com/stretchr/testify/assert"
)

type UserRepositoryIntegrationSuite struct {
    suite.Suite
    db     *sql.DB
    repo   *UserRepository
}

func (suite *UserRepositoryIntegrationSuite) SetupSuite() {
    // Подключение к тестовой БД
    db, err := sql.Open("postgres", "postgres://test:test@localhost:5432/test_db")
    if err != nil {
        suite.T().Fatal(err)
    }
    
    suite.db = db
    suite.repo = NewUserRepository(db)
}

func (suite *UserRepositoryIntegrationSuite) TestCreateUser() {
    user := &models.User{
        Email: "integration@test.com",
        Name:  "Integration Test User",
        Role:  models.UserRoleUser,
    }

    createdUser, err := suite.repo.Create(context.Background(), user)
    
    suite.NoError(err)
    suite.NotEmpty(createdUser.ID)
    suite.Equal("integration@test.com", createdUser.Email)
}

func (suite *UserRepositoryIntegrationSuite) TestFindUserByEmail() {
    // Предварительно создаем пользователя
    user := &models.User{
        Email: "find@test.com",
        Name:  "Find Test User",
        Role:  models.UserRoleUser,
    }
    
    created, _ := suite.repo.Create(context.Background(), user)

    // Тестируем поиск
    found, err := suite.repo.FindByEmail(context.Background(), "find@test.com")
    
    suite.NoError(err)
    suite.NotNil(found)
    suite.Equal(created.ID, found.ID)
}

func TestUserRepositoryIntegration(t *testing.T) {
    suite.Run(t, new(UserRepositoryIntegrationSuite))
}
```

### 3. End-to-End тестирование (E2E Testing)

#### Frontend E2E Tests (Cypress)

```typescript
// cypress/e2e/auth.cy.ts
describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/auth/login');
  });

  it('should login successfully with valid credentials', () => {
    cy.get('[data-cy=email-input]').type('test@example.com');
    cy.get('[data-cy=password-input]').type('testpass123');
    cy.get('[data-cy=login-button]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-cy=user-menu]').should('be.visible');
  });

  it('should show error with invalid credentials', () => {
    cy.get('[data-cy=email-input]').type('test@example.com');
    cy.get('[data-cy=password-input]').type('wrongpassword');
    cy.get('[data-cy=login-button]').click();

    cy.get('[data-cy=error-message]').should('be.visible');
    cy.get('[data-cy=error-message]').should('contain', 'Invalid credentials');
  });
});

// cypress/e2e/project-management.cy.ts
describe('Project Management', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'testpass123');
    cy.visit('/projects');
  });

  it('should create a new project', () => {
    cy.get('[data-cy=create-project-button]').click();
    
    cy.get('[data-cy=project-name-input]').type('Test Project');
    cy.get('[data-cy=project-address-input]').type('123 Test St');
    cy.get('[data-cy=contract-number-input]').type('CONTRACT-001');
    
    cy.get('[data-cy=create-project-submit]').click();

    cy.url().should('include', '/projects/');
    cy.get('[data-cy=project-header]').should('contain', 'Test Project');
  });

  it('should edit project details', () => {
    cy.get('[data-cy=edit-project-button]').first().click();
    
    cy.get('[data-cy=project-name-input]').clear().type('Updated Project Name');
    cy.get('[data-cy=save-project-button]').click();

    cy.get('[data-cy=project-header]').should('contain', 'Updated Project Name');
  });
});
```

### 4. Нагрузочное тестирование (Performance Testing)

#### API Load Testing (k6)

```javascript
// tests/load/auth-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up to 200 users
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
};

export default function () {
  const loginData = {
    email: 'test@example.com',
    password: 'testpass123',
  };

  const loginResponse = http.post(
    'http://localhost:8080/api/v1/auth/login',
    JSON.stringify(loginData),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
    'response has access token': (r) => JSON.parse(r.body).access_token !== undefined,
  });

  sleep(1);
}

// tests/load/project-api-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
    },
  },
};

export default function () {
  // Аутентификация
  const loginData = {
    email: 'test@example.com',
    password: 'testpass123',
  };

  const loginResponse = http.post(
    'http://localhost:8080/api/v1/auth/login',
    JSON.stringify(loginData),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const token = JSON.parse(loginResponse.body).access_token;

  if (token) {
    // Тестирование API проектов
    const projectsResponse = http.get(
      'http://localhost:8080/api/v1/projects',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    check(projectsResponse, {
      'get projects status is 200': (r) => r.status === 200,
      'get projects response time < 200ms': (r) => r.timings.duration < 200,
    });
  }

  sleep(1);
}
```

#### Frontend Performance Testing (Lighthouse CI)

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/projects",
        "http://localhost:3000/estimates"
      ],
      "startServerCommand": "npm run start"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:best-practices": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.9}]
      }
    }
  }
}
```

### 5. Тестирование безопасности (Security Testing)

#### Проверка уязвимостей (OWASP ZAP)

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run OWASP ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

#### Проверка зависимостей (npm audit, Snyk)

```bash
# Backend security check
go list -json -m all | nancy sleuth

# Frontend security check
npm audit --audit-level moderate
snyk test
```

### 6. Тестирование совместимости (Compatibility Testing)

#### Browser Testing (BrowserStack)

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
  },
  env: {
    // BrowserStack configuration
    browserstack_username: process.env.BROWSERSTACK_USERNAME,
    browserstack_access_key: process.env.BROWSERSTACK_ACCESS_KEY,
  },
  video: true,
  screenshotOnRunFailure: true,
});
```

## Автоматизация тестирования

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit -- --coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Go
        uses: actions/setup-go@v3
        with:
          go-version: '1.21'
          
      - name: Run backend tests
        run: go test -v ./... -coverprofile=coverage.out
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start application
        run: |
          docker-compose up -d postgres redis
          npm run build
          npm run start:test &
          
      - name: Wait for app
        run: npx wait-on http://localhost:3000
        
      - name: Run E2E tests
        run: npm run test:e2e
        
  load-tests:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Run k6 tests
        run: |
          curl -s https://raw.githubusercontent.com/grafana/k6/master/install.sh | sh
          k6 run tests/load/auth-load-test.js
```

### Отчеты о тестировании

#### Coverage Reports

```bash
# Frontend coverage
npm run test:coverage

# Backend coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

#### Test Results Dashboard

```typescript
// reports/test-report.ts
interface TestReport {
  timestamp: string;
  suite: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  coverage: {
    frontend: number;
    backend: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  };
}
```

## Критерии качества

### Покрытие кода
- **Фронтенд**: > 85%
- **Бэкенд**: > 80%
- **Критические пути**: 100%

### Производительность
- **API Response Time**: < 200ms (P95)
- **Frontend Load Time**: < 3 секунды
- **Database Query Time**: < 100ms

### Безопасность
- **OWASP Top 10**: 0 уязвимостей
- **Dependencies**: Все обновлены
- **SSL/TLS**: A+ рейтинг

### Доступность
- **WCAG 2.1**: AA соответствие
- **Локализация**: Поддержка русского языка

## План выполнения

### Фаза 1 (Недели 1-2): Настройка
- [ ] Настройка тестовых фреймворков
- [ ] Создание базовых тестовых утилит
- [ ] Настройка CI/CD pipeline
- [ ] Покрытие критических компонентов

### Фаза 2 (Недели 3-6): Основное тестирование
- [ ] Unit тесты для всех модулей
- [ ] Интеграционные тесты для API
- [ ] E2E тесты для основных пользовательских сценариев
- [ ] Начальное нагрузочное тестирование

### Фаза 3 (Недели 7-8): Расширенное тестирование
- [ ] Security тестирование
- [ ] Cross-browser тестирование
- [ ] Производительное тестирование
- [ ] Accessibility тестирование

### Фаза 4 (Недели 9-10): Финальная валидация
- [ ] Полное регрессионное тестирование
- [ ] Нагрузочные тесты с реальными данными
- [ ] User acceptance testing
- [ ] Подготовка к продакшену

---

*План тестирования создан: 24.11.2024*
*Версия: 1.0*
*Обновлено: 24.11.2024*