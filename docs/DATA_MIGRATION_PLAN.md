# План миграции данных системы "Строй-Контроль"

## Обзор миграции данных

Данный документ описывает стратегию миграции данных для системы "Строй-Контроль", включая создание тестовых данных, миграцию от mock данных к реальным и импорт данных из внешних систем.

### Цели миграции
- 🔄 Создание полноценной базы данных с тестовыми данными
- 📊 Обеспечение реалистичных сценариев тестирования
- 🚀 Плавный переход от mock данных к API
- 📈 Создание данных для демонстрации возможностей системы
- 🔍 Настройка инструментов для управления данными

## Текущее состояние данных

### Mock данные (Frontend)
```typescript
// services/mockData.ts - Текущие данные
- Пользователи: 15+ тестовых пользователей
- Проекты: 8+ демо-проектов
- Сметы: 12+ смет с различными статусами
- Финансовые операции: 50+ транзакций
- CRM данные: 25+ лидов и контрагентов
- Документы: 30+ файлов и актов
```

### Целевое состояние
- PostgreSQL база данных с реляционной структурой
- API сервер с полным CRUD функционалом
- Реальные связи между сущностями
- Аудит и versioning для критических данных

## Стратегия миграции

### Этап 1: Создание структуры базы данных

#### Миграции PostgreSQL

```sql
-- migrations/001_create_users.sql
CREATE TYPE user_role AS ENUM (
  'admin',
  'director', 
  'project_manager',
  'foreman',
  'estimator',
  'supply_manager',
  'client'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'client',
    avatar_url VARCHAR(500),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- migrations/002_create_projects.sql
CREATE TYPE project_status AS ENUM (
  'planning',
  'in_progress', 
  'on_hold',
  'completed',
  'cancelled'
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    contract_number VARCHAR(100) NOT NULL,
    contract_date DATE NOT NULL,
    description TEXT,
    customer_id UUID REFERENCES users(id),
    general_contractor_id UUID REFERENCES users(id),
    contact_person_id UUID REFERENCES users(id),
    status project_status NOT NULL DEFAULT 'planning',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_customer ON projects(customer_id);
CREATE INDEX idx_projects_contract_date ON projects(contract_date);

-- migrations/003_create_estimates.sql
CREATE TYPE estimate_status AS ENUM (
  'draft',
  'under_review',
  'approved',
  'rejected',
  'archived'
);

CREATE TYPE vat_mode AS ENUM (
  'without_vat',
  'with_vat_included',
  'with_vat_separate'
);

CREATE TABLE estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status estimate_status NOT NULL DEFAULT 'draft',
    manager_id UUID REFERENCES users(id),
    estimator_id UUID REFERENCES users(id),
    vat_mode vat_mode NOT NULL,
    version INTEGER DEFAULT 1,
    original_estimate_id UUID REFERENCES estimates(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estimates_project ON estimates(project_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_version ON estimates(project_id, version);
```

#### Утилиты для миграции

```go
// cmd/migrate/main.go
package main

import (
    "fmt"
    "log"
    "os"

    "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/postgres"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
    dbURL := os.Getenv("DATABASE_URL")
    if dbURL == "" {
        log.Fatal("DATABASE_URL is required")
    }

    driver, err := postgres.WithInstance(/* init db connection */)
    if err != nil {
        log.Fatal(err)
    }

    m, err := migrate.NewWithDatabaseInstance(
        "file://migrations",
        "postgres", driver,
    )
    if err != nil {
        log.Fatal(err)
    }

    if err := m.Up(); err != nil && err != migrate.ErrNoChange {
        log.Fatal(err)
    }

    fmt.Println("Database migrations completed successfully")
}
```

### Этап 2: Создание тестовых данных (Seed Data)

#### Go Seed Script

```go
// cmd/seed/main.go
package main

import (
    "context"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "log"
    "time"

    "github.com/joho/godotenv"
    "gorm.io/gorm"
    "gorm.io/driver/postgres"
)

type User struct {
    ID     string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    Email  string `gorm:"uniqueIndex;size:255;not null"`
    Name   string `gorm:"size:255;not null"`
    Role   string `gorm:"size:50;not null"`
    Phone  *string
    Avatar *string
    gorm.Model
}

type Project struct {
    ID               string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    Name             string    `gorm:"size:255;not null"`
    Address          string    `gorm:"size:500;not null"`
    ContractNumber   string    `gorm:"size:100;not null"`
    ContractDate     time.Time `gorm:"not null"`
    Description      *string
    CustomerID       *string
    Status           string    `gorm:"size:50;not null"`
    gorm.Model
}

type Estimate struct {
    ID           string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
    ProjectID    string    `gorm:"not null"`
    Name         string    `gorm:"size:255;not null"`
    Status       string    `gorm:"size:50;not null"`
    VatMode      string    `gorm:"size:50;not null"`
    Version      int       `gorm:"default:1"`
    gorm.Model
}

func main() {
    godotenv.Load()
    dbURL := "postgres://postgres:password@localhost:5432/stroy_control_dev"
    
    db, err := gorm.Open(postgres.Open(dbURL), &gorm.Config{})
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }

    // Create tables
    db.AutoMigrate(&User{}, &Project{}, &Estimate{})

    // Seed users
    users := createMockUsers()
    for _, user := range users {
        if err := db.Create(&user).Error; err != nil {
            log.Printf("Failed to create user %s: %v", user.Name, err)
        }
    }

    // Seed projects
    projects := createMockProjects()
    for _, project := range projects {
        if err := db.Create(&project).Error; err != nil {
            log.Printf("Failed to create project %s: %v", project.Name, err)
        }
    }

    // Seed estimates
    estimates := createMockEstimates()
    for _, estimate := range estimates {
        if err := db.Create(&estimate).Error; err != nil {
            log.Printf("Failed to create estimate %s: %v", estimate.Name, err)
        }
    }

    fmt.Println("Database seeded successfully!")
}

func createMockUsers() []User {
    return []User{
        {Email: "admin@stroy-control.ru", Name: "Администратор Системы", Role: "admin", Phone: stringPtr("+7-900-123-4567")},
        {Email: "director@stroy-control.ru", Name: "Иванов Иван Иванович", Role: "director", Phone: stringPtr("+7-900-234-5678")},
        {Email: "pm1@stroy-control.ru", Name: "Петров Петр Петрович", Role: "project_manager", Phone: stringPtr("+7-900-345-6789")},
        {Email: "pm2@stroy-control.ru", Name: "Сидорова Анна Сергеевна", Role: "project_manager", Phone: stringPtr("+7-900-456-7890")},
        {Email: "estimator1@stroy-control.ru", Name: "Козлов Дмитрий Алексеевич", Role: "estimator", Phone: stringPtr("+7-900-567-8901")},
        {Email: "estimator2@stroy-control.ru", Name: "Новикова Елена Владимировна", Role: "estimator", Phone: stringPtr("+7-900-678-9012")},
        {Email: "foreman1@stroy-control.ru", Name: "Морозов Александр Викторович", Role: "foreman", Phone: stringPtr("+7-900-789-0123")},
        {Email: "client1@stroy-control.ru", Name: "ООО СтройМастер", Role: "client"},
        {Email: "client2@stroy-control.ru", Name: "ООО Домострой", Role: "client"},
        {Email: "client3@stroy-control.ru", Name: "ИП Смирнов", Role: "client"},
    }
}

func createMockProjects() []Project {
    baseDate := time.Now().AddDate(0, -6, 0)
    
    return []Project{
        {
            Name:            "Жилой комплекс 'Северный'",
            Address:         "г. Москва, ул. Северная, д. 25",
            ContractNumber:  "КД-2024-001",
            ContractDate:    baseDate,
            Description:     stringPtr("Строительство 5-этажного жилого комплекса с подземной парковкой"),
            CustomerID:      stringPtr("client1-id"),
            Status:          "in_progress",
        },
        {
            Name:            "Офисный центр 'Деловой'", 
            Address:         "г. Москва, ул. Тверская, д. 10",
            ContractNumber:  "КД-2024-002",
            ContractDate:    baseDate.AddDate(0, 2, 0),
            Description:     stringPtr("Реконструкция здания под офисный центр класса А"),
            CustomerID:      stringPtr("client2-id"),
            Status:          "planning",
        },
        {
            Name:            "Складской комплекс",
            Address:         "Московская область, г. Химки, пр. Ленинградский, д. 15",
            ContractNumber:  "КД-2024-003", 
            ContractDate:    baseDate.AddDate(0, 1, 0),
            Description:     stringPtr("Строительство складского комплекса класса А"),
            CustomerID:      stringPtr("client3-id"),
            Status:          "completed",
        },
    }
}

func createMockEstimates() []Estimate {
    return []Estimate{
        {
            ProjectID: "project1-id",
            Name:      "Смета на общестроительные работы",
            Status:    "approved",
            VatMode:   "with_vat_included",
            Version:   1,
        },
        {
            ProjectID: "project1-id", 
            Name:      "Смета на инженерные системы",
            Status:    "draft",
            VatMode:   "with_vat_separate",
            Version:   2,
        },
        {
            ProjectID: "project2-id",
            Name:      "Полная смета проекта",
            Status:    "under_review",
            VatMode:   "without_vat",
            Version:   1,
        },
    }
}

func stringPtr(s string) *string {
    return &s
}
```

#### TypeScript Seed Script

```typescript
// scripts/seed-data.ts
interface MockUser {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
}

interface MockProject {
  id: string;
  name: string;
  address: string;
  contract_number: string;
  contract_date: string;
  description?: string;
  customer_id: string;
  status: string;
}

export const mockUsers: MockUser[] = [
  {
    id: 'admin-id',
    email: 'admin@stroy-control.ru',
    name: 'Администратор Системы',
    role: 'admin',
    phone: '+7-900-123-4567'
  },
  {
    id: 'director-id',
    email: 'director@stroy-control.ru', 
    name: 'Иванов Иван Иванович',
    role: 'director',
    phone: '+7-900-234-5678'
  },
  {
    id: 'pm1-id',
    email: 'pm1@stroy-control.ru',
    name: 'Петров Петр Петрович',
    role: 'project_manager',
    phone: '+7-900-345-6789'
  },
  {
    id: 'estimator1-id',
    email: 'estimator1@stroy-control.ru',
    name: 'Козлов Дмитрий Алексеевич', 
    role: 'estimator',
    phone: '+7-900-567-8901'
  },
  {
    id: 'client1-id',
    email: 'client1@stroy-control.ru',
    name: 'ООО СтройМастер',
    role: 'client'
  }
];

export const mockProjects: MockProject[] = [
  {
    id: 'project1-id',
    name: 'Жилой комплекс "Северный"',
    address: 'г. Москва, ул. Северная, д. 25',
    contract_number: 'КД-2024-001',
    contract_date: '2024-06-01',
    description: 'Строительство 5-этажного жилого комплекса с подземной парковкой',
    customer_id: 'client1-id',
    status: 'in_progress'
  },
  {
    id: 'project2-id',
    name: 'Офисный центр "Деловой"',
    address: 'г. Москва, ул. Тверская, д. 10', 
    contract_number: 'КД-2024-002',
    contract_date: '2024-08-01',
    description: 'Реконструкция здания под офисный центр класса А',
    customer_id: 'client1-id',
    status: 'planning'
  }
];

export const generateMockEstimates = (): any[] => [
  {
    id: 'estimate1-id',
    project_id: 'project1-id',
    name: 'Смета на общестроительные работы',
    status: 'approved',
    vat_mode: 'with_vat_included',
    version: 1,
    items: generateMockEstimateItems()
  },
  {
    id: 'estimate2-id', 
    project_id: 'project1-id',
    name: 'Смета на инженерные системы',
    status: 'draft',
    vat_mode: 'with_vat_separate', 
    version: 2,
    items: generateMockEstimateItems()
  }
];

function generateMockEstimateItems(): any[] {
  return [
    {
      id: 'item1-id',
      estimate_id: 'estimate1-id',
      item_type: 'group',
      name: 'Земляные работы',
      order: 1,
      items: [
        {
          id: 'item1-1-id',
          estimate_id: 'estimate1-id',
          parent_id: 'item1-id',
          item_type: 'item',
          name: 'Разработка котлована',
          unit: 'м3',
          quantity: 1500,
          cost_price: 850,
          markup: 15,
          order: 1
        },
        {
          id: 'item1-2-id', 
          estimate_id: 'estimate1-id',
          parent_id: 'item1-id',
          item_type: 'item',
          name: 'Вывоз грунта',
          unit: 'м3',
          quantity: 1200,
          cost_price: 650,
          markup: 15,
          order: 2
        }
      ]
    },
    {
      id: 'item2-id',
      estimate_id: 'estimate1-id',
      item_type: 'group',
      name: 'Бетонные работы',
      order: 2,
      items: [
        {
          id: 'item2-1-id',
          estimate_id: 'estimate1-id',
          parent_id: 'item2-id',
          item_type: 'item',
          name: 'Устройство фундаментной плиты',
          unit: 'м3',
          quantity: 300,
          cost_price: 4200,
          markup: 20,
          order: 1
        }
      ]
    }
  ];
}
```

### Этап 3: Миграция Frontend к API

#### Обновление сервисов

```typescript
// services/dataMigrationService.ts
class DataMigrationService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  async migrateMockData(): Promise<void> {
    console.log('Starting mock data migration...');

    try {
      // 1. Создание пользователей
      await this.migrateUsers();
      
      // 2. Создание проектов  
      await this.migrateProjects();
      
      // 3. Создание смет
      await this.migrateEstimates();
      
      // 4. Создание финансовых данных
      await this.migrateFinancialData();
      
      // 5. Создание CRM данных
      await this.migrateCRMData();

      console.log('Mock data migration completed successfully!');
    } catch (error) {
      console.error('Mock data migration failed:', error);
      throw error;
    }
  }

  private async migrateUsers(): Promise<void> {
    const mockUsers = getMockUsers();
    
    for (const user of mockUsers) {
      try {
        await this.apiClient.post('/auth/register', {
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone
        });
      } catch (error) {
        // Пользователь может уже существовать
        console.log(`User ${user.email} might already exist`);
      }
    }
  }

  private async migrateProjects(): Promise<void> {
    const mockProjects = getMockProjects();
    
    for (const project of mockProjects) {
      try {
        await this.apiClient.post('/projects', project);
      } catch (error) {
        console.error(`Failed to create project ${project.name}:`, error);
      }
    }
  }

  private async migrateEstimates(): Promise<void> {
    const mockEstimates = getMockEstimates();
    
    for (const estimate of mockEstimates) {
      try {
        const createdEstimate = await this.apiClient.post('/estimates', {
          project_id: estimate.project_id,
          name: estimate.name,
          status: estimate.status,
          vat_mode: estimate.vat_mode
        });

        // Создание позиций сметы
        if (estimate.items) {
          await this.migrateEstimateItems(createdEstimate.id, estimate.items);
        }
      } catch (error) {
        console.error(`Failed to create estimate ${estimate.name}:`, error);
      }
    }
  }

  private async migrateEstimateItems(estimateId: string, items: any[]): Promise<void> {
    for (const item of items) {
      try {
        await this.apiClient.post(`/estimates/${estimateId}/items`, {
          parent_id: item.parent_id,
          item_type: item.item_type,
          name: item.name,
          unit: item.unit,
          quantity: item.quantity,
          cost_price: item.cost_price,
          markup: item.markup,
          order: item.order
        });
      } catch (error) {
        console.error(`Failed to create estimate item ${item.name}:`, error);
      }
    }
  }

  // Дополнительные методы миграции...
}
```

### Этап 4: Создание инструментов управления данными

#### Админ панель для данных

```typescript
// pages/AdminDataManagement.tsx
import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';

export const AdminDataManagement: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminService.getDataStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleMigrateMockData = async () => {
    setIsLoading(true);
    try {
      await adminService.migrateMockData();
      await loadStats();
      alert('Миграция mock данных завершена успешно!');
    } catch (error) {
      alert('Ошибка при миграции данных');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async (format: 'json' | 'csv') => {
    try {
      const data = await adminService.exportData(format);
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stroy-control-export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      alert('Ошибка при экспорте данных');
    }
  };

  return (
    <div className="admin-data-management">
      <h1>Управление данными</h1>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Пользователи</h3>
          <p className="stat-number">{stats.users || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Проекты</h3>
          <p className="stat-number">{stats.projects || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Сметы</h3>
          <p className="stat-number">{stats.estimates || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Транзакции</h3>
          <p className="stat-number">{stats.transactions || 0}</p>
        </div>
      </div>

      <div className="actions-section">
        <h2>Действия с данными</h2>
        
        <div className="action-buttons">
          <button 
            onClick={handleMigrateMockData}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Миграция...' : 'Мигрировать mock данные'}
          </button>
          
          <button 
            onClick={() => handleExportData('json')}
            className="btn btn-secondary"
          >
            Экспорт в JSON
          </button>
          
          <button 
            onClick={() => handleExportData('csv')}
            className="btn btn-secondary"
          >
            Экспорт в CSV
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Этап 5: Валидация и тестирование данных

#### Скрипт валидации

```bash
#!/bin/bash
# scripts/validate-data.sh

set -e

echo "Validating database integrity..."

# Проверка связей между таблицами
echo "Checking foreign key relationships..."
psql $DATABASE_URL -c "
  SELECT 
    'Users with invalid project assignments' as check_name,
    COUNT(*) as issues
  FROM projects p 
  LEFT JOIN users u ON p.customer_id = u.id 
  WHERE p.customer_id IS NOT NULL AND u.id IS NULL;
"

psql $DATABASE_URL -c "
  SELECT 
    'Estimates with invalid project assignments' as check_name, 
    COUNT(*) as issues
  FROM estimates e
  LEFT JOIN projects p ON e.project_id = p.id
  WHERE p.id IS NULL;
"

# Проверка целостности финансовых данных
echo "Validating financial data integrity..."
psql $DATABASE_URL -c "
  SELECT 
    'Transactions without accounts' as check_name,
    COUNT(*) as issues
  FROM transactions t
  LEFT JOIN accounts a ON t.account_id = a.id
  WHERE a.id IS NULL;
"

# Проверка уникальности данных
echo "Checking data uniqueness..."
psql $DATABASE_URL -c "
  SELECT 
    'Duplicate email addresses' as check_name,
    COUNT(*) - COUNT(DISTINCT email) as duplicates
  FROM users;
"

echo "Data validation completed!"
```

## Сценарии миграции

### Сценарий 1: Разработка (Development)
```yaml
phase: development
environment: local
data_volume: small
duration: 1-2 hours
steps:
  - Run database migrations
  - Execute seed script
  - Start with minimal dataset
  - Use for feature development and testing
```

### Сценарий 2: Staging
```yaml
phase: staging  
environment: staging
data_volume: medium
duration: 2-4 hours
steps:
  - Create production-like data structure
  - Generate realistic test datasets
  - Include edge cases and error scenarios
  - Use for integration testing
```

### Сценарий 3: Production
```yaml
phase: production
environment: production
data_volume: full
duration: 4-8 hours
steps:
  - Final data structure deployment
  - Import existing customer data (if any)
  - Set up data retention policies
  - Configure backup and recovery procedures
```

## Резервное копирование и восстановление

### Стратегия резервного копирования

```bash
#!/bin/bash
# scripts/backup-strategy.sh

# Daily incremental backups
0 2 * * * /scripts/incremental-backup.sh

# Weekly full backups  
0 3 * * 0 /scripts/full-backup.sh

# Monthly archival backups
0 4 1 * * /scripts/archive-backup.sh
```

### Восстановление данных

```bash
#!/bin/bash
# scripts/restore-data.sh

BACKUP_FILE=$1
TARGET_DB=$2

if [ -z "$BACKUP_FILE" ] || [ -z "$TARGET_DB" ]; then
  echo "Usage: $0 <backup_file> <target_database>"
  exit 1
fi

echo "Restoring from $BACKUP_FILE to $TARGET_DB..."

# Stop application services
docker-compose stop backend frontend

# Restore database
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | psql $TARGET_DB
else
  psql $TARGET_DB < $BACKUP_FILE
fi

# Start application services
docker-compose start backend frontend

echo "Data restoration completed!"
```

## Мониторинг качества данных

### Data Quality Metrics

```sql
-- Data completeness check
CREATE VIEW data_quality_metrics AS
SELECT 
  'users' as table_name,
  COUNT(*) as total_records,
  COUNT(email) as email_populated,
  COUNT(name) as name_populated,
  COUNT(phone) as phone_populated,
  ROUND(COUNT(email) * 100.0 / COUNT(*), 2) as email_completeness,
  ROUND(COUNT(name) * 100.0 / COUNT(*), 2) as name_completeness
FROM users

UNION ALL

SELECT 
  'projects' as table_name,
  COUNT(*) as total_records,
  COUNT(name) as name_populated,
  COUNT(address) as address_populated,
  COUNT(contract_number) as contract_populated,
  ROUND(COUNT(name) * 100.0 / COUNT(*), 2) as name_completeness,
  ROUND(COUNT(address) * 100.0 / COUNT(*), 2) as address_completeness
FROM projects;

-- Data consistency check
CREATE VIEW data_consistency_checks AS
SELECT 
  'orphaned_estimates' as check_name,
  COUNT(*) as issues
FROM estimates e
LEFT JOIN projects p ON e.project_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 
  'negative_amounts' as check_name,
  COUNT(*) as issues
FROM transactions
WHERE amount < 0;
```

## План выполнения

### Этап 1 (Недели 1-2): Подготовка структуры
- [ ] Создание миграций для всех таблиц
- [ ] Настройка constraints и индексов
- [ ] Создание скриптов seed данных
- [ ] Базовое тестирование структуры

### Этап 2 (Недели 3-4): Заполнение данными
- [ ] Создание полного набора тестовых данных
- [ ] Миграция mock данных в реальную БД
- [ ] Создание инструментов администрирования
- [ ] Валидация целостности данных

### Этап 3 (Недели 5-6): Интеграция с Frontend
- [ ] Обновление фронтенд сервисов
- [ ] Тестирование интеграции
- [ ] Создание инструментов миграции
- [ ] Документирование процесса

### Этап 4 (Недели 7-8): Оптимизация и мониторинг
- [ ] Настройка мониторинга качества данных
- [ ] Оптимизация производительности БД
- [ ] Автоматизация backup процедур
- [ ] Финальное тестирование

---

*План миграции данных создан: 24.11.2024*
*Версия: 1.0*
*Следующий обзор: 01.12.2024*